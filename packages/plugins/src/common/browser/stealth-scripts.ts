/**
 * JavaScript to inject via `context.addInitScript()` for anti-bot evasion.
 * These patches make headless Chromium harder to fingerprint by popular
 * bot-detection services (DataDome, Cloudflare, PerimeterX, etc.).
 *
 * Inspired by puppeteer-extra-plugin-stealth but implemented as a plain
 * string for Playwright's `addInitScript()` — no extra dependencies.
 */
export const STEALTH_INIT_SCRIPT = `
(() => {
  // 1. Hide navigator.webdriver
  Object.defineProperty(navigator, 'webdriver', { get: () => undefined });

  // 2. Fake window.chrome runtime (present in real Chrome, absent in headless)
  if (!window.chrome) {
    window.chrome = {};
  }
  if (!window.chrome.runtime) {
    window.chrome.runtime = {};
  }

  // 3. Override navigator.plugins to return a non-empty PluginArray
  Object.defineProperty(navigator, 'plugins', {
    get: () => {
      const plugins = [
        { name: 'Chrome PDF Plugin', description: 'Portable Document Format', filename: 'internal-pdf-viewer', length: 1 },
        { name: 'Chrome PDF Viewer', description: '', filename: 'mhjfbmdgcfjbbpaeojofohoefgiehjai', length: 1 },
        { name: 'Native Client', description: '', filename: 'internal-nacl-plugin', length: 2 },
      ];
      plugins.length = 3;
      return plugins;
    },
  });

  // 4. Override navigator.languages
  Object.defineProperty(navigator, 'languages', {
    get: () => ['en-US', 'en'],
  });

  // 5. Patch navigator.permissions.query for notifications
  if (navigator.permissions) {
    const originalQuery = navigator.permissions.query.bind(navigator.permissions);
    navigator.permissions.query = (parameters) => {
      if (parameters.name === 'notifications') {
        return Promise.resolve({ state: Notification.permission, onchange: null });
      }
      return originalQuery(parameters);
    };
  }

  // 6. Canvas fingerprint noise — add imperceptible pixel variation
  const origToDataURL = HTMLCanvasElement.prototype.toDataURL;
  HTMLCanvasElement.prototype.toDataURL = function(type) {
    const ctx = this.getContext('2d');
    if (ctx) {
      const style = ctx.fillStyle;
      ctx.fillStyle = 'rgba(0,0,1,0.01)';
      ctx.fillRect(0, 0, 1, 1);
      ctx.fillStyle = style;
    }
    return origToDataURL.apply(this, arguments);
  };

  // 7. Patch WebGL renderer info to avoid headless detection
  const getParameter = WebGLRenderingContext.prototype.getParameter;
  WebGLRenderingContext.prototype.getParameter = function(parameter) {
    if (parameter === 37445) return 'Intel Inc.';         // UNMASKED_VENDOR_WEBGL
    if (parameter === 37446) return 'Intel Iris OpenGL Engine'; // UNMASKED_RENDERER_WEBGL
    return getParameter.apply(this, arguments);
  };
})();
`;

/** Pool of recent Chrome User-Agent strings for rotation. */
export const USER_AGENT_POOL = [
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36',
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
];

/** Pool of common viewport sizes for randomization. */
export const VIEWPORT_POOL = [
  { width: 1920, height: 1080 },
  { width: 1440, height: 900 },
  { width: 1536, height: 864 },
  { width: 1366, height: 768 },
  { width: 1680, height: 1050 },
];
