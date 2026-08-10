import { createHttpClient } from '../../base/http-client.js';

export type HttpClient = ReturnType<typeof createHttpClient>;

export interface LivenessCheckOptions {
  timeoutMs?: number;
  minContentLength?: number;
  proxies?: string[];
}

export interface LivenessBatchOptions extends LivenessCheckOptions {
  concurrency?: number;
  throttleMs?: number;
}

export interface LivenessVerdict {
  url: string;
  result: 'active' | 'expired' | 'uncertain';
  code: string;
  httpStatus?: number;
  checkedAt: string;
}

export interface ILivenessChecker {
  check(url: string, options?: LivenessCheckOptions): Promise<LivenessVerdict>;
  checkBatch(urls: string[], options?: LivenessBatchOptions): Promise<LivenessVerdict[]>;
}

import {
  HeuristicOutcome,
  classifyBody,
  classifyHttpStatus,
  hasExpiredUrlMarker,
} from './liveness-heuristics';
import {
  DEFAULT_BATCH_CONCURRENCY,
  DEFAULT_MIN_CONTENT_LENGTH,
  DEFAULT_TIMEOUT_MS,
  LIVENESS_ACCEPT_HEADER,
  LIVENESS_USER_AGENT,
} from './liveness-http.constants';

/**
 * HTTP-based job-posting liveness checker — Spec 721.
 *
 * One GET per URL, then a strict priority cascade: HTTP status
 * (FR-1..FR-4) → post-redirect `error=true` marker (FR-5) → pure body
 * heuristics (FR-6..FR-12, see {@link classifyBody}).
 *
 * Transport notes:
 *   - non-2xx statuses are captured for classification via a per-request
 *     `validateStatus: () => true` override (D-04); the catch path still
 *     reads axios-style `err.response?.status` as a defensive fallback
 *   - retries are disabled — a liveness probe wants one cheap verdict,
 *     not a retry storm against an already-suspect host
 *   - redirects follow the client default; the final URL is read from the
 *     Node adapter's `request.res.responseUrl`
 *
 * `check()` never throws (FR-4) and `checkBatch()` isolates per-URL
 * failures (FR-14) — callers always get one verdict per input URL, in
 * input order.
 */

export class LivenessHttpService implements ILivenessChecker {
  

  async check(url: string, options?: LivenessCheckOptions): Promise<LivenessVerdict> {
    const client = this.createClient(options);
    return this.checkWithClient(client, url, options);
  }

  /**
   * Probe many URLs with a shared-cursor worker pool (FR-13/FR-14):
   * `min(concurrency, N)` workers pull the next index, optionally sleep a
   * jittered `[throttleMs, 2·throttleMs]` delay between request starts,
   * and write verdicts by input index so order is preserved. One HTTP
   * client is shared across the batch (D-05) so proxy rotation in the
   * underlying client remains meaningful.
   */
  async checkBatch(urls: string[], options?: LivenessBatchOptions): Promise<LivenessVerdict[]> {
    const concurrency = Math.max(1, options?.concurrency ?? DEFAULT_BATCH_CONCURRENCY);
    const throttleMs = options?.throttleMs ?? 0;
    const client = this.createClient(options);
    const results: LivenessVerdict[] = new Array(urls.length);
    let cursor = 0;

    const worker = async (): Promise<void> => {
      let first = true;
      for (;;) {
        const index = cursor++;
        if (index >= urls.length) {
          return;
        }
        if (!first && throttleMs > 0) {
          // Jittered politeness delay in [throttleMs, 2·throttleMs).
          await this.sleep(throttleMs + Math.random() * throttleMs);
        }
        first = false;
        const url = urls[index];
        try {
          results[index] = await this.checkWithClient(client, url, options);
        } catch (err: any) {
          // checkWithClient never throws by contract, but a batch must
          // survive even a broken implementation detail (FR-14).
          console.warn(`liveness: unexpected batch failure for ${url}: ${err?.message ?? err}`);
          results[index] = this.verdict(url, { result: 'uncertain', code: 'fetch_failed' });
        }
      }
    };

    const workers = Array.from({ length: Math.min(concurrency, urls.length) }, () => worker());
    await Promise.allSettled(workers);

    console.debug(`liveness: batch of ${urls.length} url(s) complete`);
    return results;
  }

  private async checkWithClient(
    client: HttpClient,
    url: string,
    options?: LivenessCheckOptions,
  ): Promise<LivenessVerdict> {
    const timeoutMs = options?.timeoutMs ?? DEFAULT_TIMEOUT_MS;
    const minContentLength = options?.minContentLength ?? DEFAULT_MIN_CONTENT_LENGTH;

    try {
      const response = await client.get<string>(url, {
        timeout: timeoutMs,
        responseType: 'text',
        headers: { Accept: LIVENESS_ACCEPT_HEADER },
        // D-04: capture 4xx/5xx for classification instead of throwing.
        validateStatus: () => true,
      });

      const httpStatus = response.status;
      const statusOutcome = classifyHttpStatus(httpStatus);
      if (statusOutcome) {
        console.debug(`liveness: ${url} -> HTTP ${httpStatus} (${statusOutcome.code})`);
        return this.verdict(url, statusOutcome, httpStatus);
      }

      // FR-5: dead postings often redirect back to the board with error=true.
      const finalUrl = this.resolveFinalUrl(response, url);
      if (hasExpiredUrlMarker(finalUrl)) {
        console.debug(`liveness: ${url} -> redirected to ${finalUrl} (expired_url)`);
        return this.verdict(url, { result: 'expired', code: 'expired_url' }, httpStatus);
      }

      const body = typeof response.data === 'string' ? response.data : String(response.data ?? '');
      const bodyOutcome = classifyBody(body, minContentLength);
      console.debug(`liveness: ${url} -> ${bodyOutcome.result} (${bodyOutcome.code})`);
      return this.verdict(url, bodyOutcome, httpStatus);
    } catch (err: any) {
      // Defensive fallback: some client configurations still throw on
      // non-2xx — classify from the axios-style error response if present.
      const httpStatus: number | undefined = err?.response?.status;
      if (typeof httpStatus === 'number') {
        const statusOutcome = classifyHttpStatus(httpStatus);
        if (statusOutcome) {
          console.warn(`liveness: ${url} -> HTTP ${httpStatus} (${statusOutcome.code})`);
          return this.verdict(url, statusOutcome, httpStatus);
        }
      }
      console.warn(`liveness: fetch failed for ${url}: ${err?.message ?? err}`);
      return this.verdict(url, { result: 'uncertain', code: 'fetch_failed' }, httpStatus);
    }
  }

  private createClient(options?: LivenessCheckOptions): HttpClient {
    return createHttpClient({
      proxies: options?.proxies,
      // The shared client's constructor timeout is second-based; the
      // millisecond-precise per-request timeout is set in checkWithClient.
      requestTimeout: (options?.timeoutMs ?? DEFAULT_TIMEOUT_MS) / 1000,
      retries: 0,
      userAgent: LIVENESS_USER_AGENT,
    });
  }

  private resolveFinalUrl(response: { request?: any }, requestUrl: string): string {
    // Node http adapter exposes the post-redirect URL here.
    return response.request?.res?.responseUrl ?? requestUrl;
  }

  private verdict(url: string, outcome: HeuristicOutcome, httpStatus?: number): LivenessVerdict {
    return {
      url,
      result: outcome.result,
      code: outcome.code,
      ...(httpStatus !== undefined ? { httpStatus } : {}),
      checkedAt: new Date().toISOString(),
    };
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
