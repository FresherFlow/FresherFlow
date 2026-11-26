import { App } from '@modelcontextprotocol/ext-apps';
import { safeHttpsUrl } from './guards.js';
import { asJobs, parseWidgetMessage, type WidgetMessage } from './widget-data.js';
import { renderCards, renderCompany, renderDetail, renderFallback, renderSubmission } from './render/index.js';

const app = new App({ name: 'FresherFlow job cards', version: '1.0.0' }, {});
const root = document.getElementById('root');
const status = document.getElementById('status');
// The method exists on every App instance; only the host capability says whether
// messages are actually accepted. Never show a dead action button.
let canAsk = false;

/** The host's theme is authoritative, never the OS setting alone. */
function applyTheme(theme: unknown): void {
  document.documentElement.dataset.theme = theme === 'dark' ? 'dark' : 'light';
}
applyTheme(matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');

function setStatus(message: string): void {
  if (status) status.textContent = message;
}

async function open(url: unknown): Promise<boolean> {
  const href = safeHttpsUrl(url);
  if (!href) {
    setStatus('That link is not a safe https URL.');
    return false;
  }
  try {
    const result = await app.openLink({ url: href });
    if (result.isError) {
      setStatus('The host could not open this link. Copy the URL below.');
      return false;
    }
    return true;
  } catch {
    setStatus('The host could not open this link. Copy the URL below.');
    return false;
  }
}

function ask(message: string): void {
  if (!canAsk) return;
  void app
    .sendMessage({ role: 'user', content: [{ type: 'text', text: message }] })
    .then((result) => {
      if (result.isError) {
        canAsk = false;
        setStatus('This host cannot send follow-up requests.');
      }
    })
    .catch(() => {
      canAsk = false;
      setStatus('This host cannot send follow-up requests.');
    });
}

function toolText(result: unknown): string {
  const content = (result as { content?: unknown })?.content;
  if (!Array.isArray(content)) return '';
  const first = content[0] as { text?: unknown } | undefined;
  return typeof first?.text === 'string' ? first.text : '';
}

function dispatch(message: WidgetMessage): HTMLElement {
  const { view, kind, data } = message;
  if (view === 'cards') {
    const jobs = asJobs(data);
    return jobs ? renderCards(jobs, open, canAsk ? ask : undefined) : renderFallback(toolText(message));
  }
  if (view === 'detail') return renderDetail(data, open);
  if (view === 'company') return renderCompany(data);
  if (kind === 'error') return renderSubmission(data, open, canAsk ? ask : undefined);
  return renderSubmission(data, open, canAsk ? ask : undefined);
}

function render(element: HTMLElement): void {
  if (!root) return;
  root.replaceChildren(element);
  void app
    .sendSizeChanged({
      width: document.documentElement.scrollWidth,
      height: document.documentElement.scrollHeight,
    })
    .catch(() => undefined);
}

app.addEventListener('hostcontextchanged', (context) => {
  applyTheme(context.theme);
});

app.addEventListener('toolresult', (result) => {
  setStatus('');
  const meta = (result as { _meta?: Record<string, unknown> })._meta;
  const message = parseWidgetMessage(meta?.fresherflowWidget);
  if (!message) {
    render(renderFallback(toolText(result)));
    return;
  }
  try {
    render(dispatch(message));
  } catch {
    render(renderFallback(toolText(result)));
  }
});

app.addEventListener('toolcancelled', () => {
  setStatus('That request was cancelled.');
});

if (root) {
  const waiting = document.createElement('p');
  waiting.className = 'empty';
  waiting.textContent = 'Waiting for results…';
  waiting.setAttribute('aria-busy', 'true');
  root.append(waiting);
}

void app.connect().then(() => {
  canAsk = Boolean(app.getHostCapabilities()?.message && typeof app.sendMessage === 'function');
  applyTheme(app.getHostContext()?.theme);
}).catch(() => {
  setStatus('Could not connect to the host. Open this app from an MCP client.');
});
