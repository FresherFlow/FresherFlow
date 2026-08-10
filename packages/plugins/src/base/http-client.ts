import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';
import { HttpsProxyAgent } from 'https-proxy-agent';
import { SocksProxyAgent } from 'socks-proxy-agent';

export interface HttpClientOptions {
  proxies?: string[];
  caCert?: string;
  userAgent?: string;
  retries?: number;
  retryDelay?: number;
  retryBackoff?: 'linear' | 'exponential';
  retryMaxDelay?: number;
  timeout?: number;
  rateDelayMin?: number;
  rateDelayMax?: number;
}

export class HttpClient {
  private readonly client: AxiosInstance;
  private readonly proxies: string[];
  private proxyIndex = 0;
  private readonly maxRetries: number;
  private readonly retryDelay: number;
  private readonly retryBackoff: 'linear' | 'exponential';
  private readonly retryMaxDelay: number;
  private readonly rateDelayMin: number;
  private readonly rateDelayMax: number;
  private lastRequestTime = 0;

  constructor(options: HttpClientOptions = {}) {
    this.proxies = options.proxies ?? [];
    this.maxRetries = options.retries ?? 3;
    this.retryDelay = options.retryDelay ?? 1000;
    this.retryBackoff = options.retryBackoff ?? 'linear';
    this.retryMaxDelay = options.retryMaxDelay ?? 30000;
    this.rateDelayMin = (options.rateDelayMin ?? 0) * 1000; // convert to ms
    this.rateDelayMax = (options.rateDelayMax ?? 0) * 1000;

    this.client = axios.create({
      timeout: (options.timeout ?? 60) * 1000,
      headers: {
        'User-Agent':
          options.userAgent ??
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      },
    });
  }

  private getNextProxy(): string | null {
    if (this.proxies.length === 0) return null;
    const proxy = this.proxies[this.proxyIndex % this.proxies.length];
    this.proxyIndex++;
    return proxy;
  }

  private createAgent(proxy: string): HttpsProxyAgent<string> | SocksProxyAgent {
    if (proxy.startsWith('socks5://') || proxy.startsWith('socks4://')) {
      return new SocksProxyAgent(proxy);
    }
    const proxyUrl = proxy.startsWith('http') ? proxy : `http://${proxy}`;
    return new HttpsProxyAgent(proxyUrl);
  }

  private async enforceRateDelay(): Promise<void> {
    if (this.rateDelayMin <= 0) return;

    const now = Date.now();
    const elapsed = now - this.lastRequestTime;
    const delay = this.rateDelayMax > this.rateDelayMin
      ? this.rateDelayMin + Math.random() * (this.rateDelayMax - this.rateDelayMin)
      : this.rateDelayMin;

    if (this.lastRequestTime > 0 && elapsed < delay) {
      const wait = delay - elapsed;
      await this.sleep(wait);
    }

    this.lastRequestTime = Date.now();
  }

  async get<T = any>(url: string, config?: AxiosRequestConfig): Promise<AxiosResponse<T>> {
    return this.request<T>({ ...config, method: 'GET', url });
  }

  async post<T = any>(
    url: string,
    data?: any,
    config?: AxiosRequestConfig,
  ): Promise<AxiosResponse<T>> {
    return this.request<T>({ ...config, method: 'POST', url, data });
  }

  async request<T = any>(config: AxiosRequestConfig): Promise<AxiosResponse<T>> {
    await this.enforceRateDelay();

    const proxy = this.getNextProxy();
    if (proxy && proxy !== 'localhost') {
      const agent = this.createAgent(proxy);
      config.httpAgent = agent;
      config.httpsAgent = agent;
    }

    let lastError: Error | null = null;
    for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
      try {
        return await this.client.request<T>(config);
      } catch (error: any) {
        lastError = error;
        const status = error.response?.status;
        if (status && [500, 502, 503, 504, 429].includes(status) && attempt < this.maxRetries) {
          const delay = this.retryBackoff === 'exponential'
            ? Math.min(this.retryMaxDelay, this.retryDelay * Math.pow(2, attempt))
            : Math.min(this.retryMaxDelay, this.retryDelay * (attempt + 1));
          
          await this.sleep(delay);
          continue;
        }
        throw error;
      }
    }
    throw lastError;
  }

  setHeaders(headers: Record<string, string>): void {
    Object.assign(this.client.defaults.headers.common, headers);
  }

  getAxiosInstance(): AxiosInstance {
    return this.client;
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

export function createHttpClient(options?: HttpClientOptions | any): HttpClient {
  return new HttpClient(options as HttpClientOptions);
}
