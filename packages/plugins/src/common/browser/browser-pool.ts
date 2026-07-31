import type { Browser, Page, LaunchOptions, BrowserContextOptions } from 'playwright';
import { STEALTH_INIT_SCRIPT, USER_AGENT_POOL, VIEWPORT_POOL } from './stealth-scripts';

/** Options passed to `BrowserPool.getPage()`. */
export interface BrowserPageOptions {
  /** Proxy server URL (e.g. `http://proxy:8080` or `socks5://proxy:1080`). */
  proxy?: string;
  /** Navigation timeout in seconds (used by the caller, not the pool). */
  timeout?: number;
  /**
   * Enable stealth mode for anti-bot evasion.
   * When true, injects scripts to mask webdriver detection, randomizes
   * UA/viewport, and patches browser fingerprinting APIs.
   * Default: false (backwards-compatible).
   */
  stealth?: boolean;
}

/**
 * Shared singleton browser pool for headless Chromium scraping.
 *
 * Usage:
 *   const page = await BrowserPool.getPage();
 *   try { ... } finally { await page.close(); }
 *
 * For anti-bot protected sites:
 *   const page = await BrowserPool.getPage({ stealth: true, proxy });
 *
 * Call `BrowserPool.close()` on app shutdown (e.g. `onModuleDestroy`).
 */
export class BrowserPool {
  private static browser: Browser | null = null;
  private static launching: Promise<Browser> | null = null;
  private static readonly logger = console;

  /** Default Chromium launch options. */
  private static readonly DEFAULT_OPTS: LaunchOptions = {
    headless: process.env.PLAYWRIGHT_HEADLESS !== 'false',
    args: [
      '--disable-blink-features=AutomationControlled',
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
    ],
  };

  /** Default (non-stealth) User-Agent string. */
  private static readonly DEFAULT_USER_AGENT = USER_AGENT_POOL[0];

  /** Pick a random element from an array. */
  private static pick<T>(arr: readonly T[]): T {
    return arr[Math.floor(Math.random() * arr.length)];
  }

  /**
   * Get (or lazily launch) a shared Chromium browser instance.
   */
  static async getBrowser(): Promise<Browser> {
    if (this.browser?.isConnected()) return this.browser;

    // Prevent multiple concurrent launches
    if (this.launching) return this.launching;

    this.launching = (async () => {
      try {
        this.logger.log('Launching headless Chromium…');
        // Dynamic import — playwright may not be installed in all environments
        const { chromium } = await import('playwright');
        const browser = await chromium.launch(this.DEFAULT_OPTS);
        this.browser = browser;
        this.logger.log('Chromium launched');
        return browser;
      } catch (err) {
        // Reset the guard so subsequent calls can retry the launch
        this.launching = null;
        throw err;
      }
    })();

    return this.launching;
  }

  /**
   * Create a fresh page with configurable stealth level.
   * The caller is responsible for closing the page when done.
   *
   * @param opts.proxy    — route all traffic through this proxy server
   * @param opts.stealth  — enable anti-bot evasion (UA/viewport rotation, JS patches)
   */
  static async getPage(opts?: BrowserPageOptions): Promise<Page> {
    const browser = await this.getBrowser();
    const stealth = opts?.stealth ?? false;

    const ctxOpts: BrowserContextOptions = {
      userAgent: stealth ? this.pick(USER_AGENT_POOL) : this.DEFAULT_USER_AGENT,
      viewport: stealth ? this.pick(VIEWPORT_POOL) : { width: 1440, height: 900 },
      locale: 'en-US',
      timezoneId: 'America/New_York',
      javaScriptEnabled: true,
    };

    if (opts?.proxy) {
      ctxOpts.proxy = { server: opts.proxy };
    }

    const context = await browser.newContext(ctxOpts);

    if (stealth) {
      await context.addInitScript(STEALTH_INIT_SCRIPT);
    }

    return context.newPage();
  }

  /**
   * Gracefully shut down the browser.
   * Safe to call multiple times.
   */
  static async close(): Promise<void> {
    if (this.browser) {
      this.logger.log('Closing Chromium…');
      await this.browser.close().catch(() => {});
      this.browser = null;
    }
  }
}
