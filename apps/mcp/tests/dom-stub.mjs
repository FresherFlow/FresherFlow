/** Minimal DOM used by renderer tests. Serializes text so escaping is testable. */
function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

class StubElement {
  constructor(tag) {
    this.tagName = tag.toUpperCase();
    this.className = '';
    this._text = '';
    this.children = [];
    this.attributes = {};
    this.listeners = new Map();
    this.value = '';
  }

  set textContent(value) {
    this._text = String(value ?? '');
    this.children = [];
  }

  get textContent() {
    return this._text + this.children.map((c) => c.textContent).join('');
  }

  get childElementCount() {
    return this.children.length;
  }

  append(...nodes) {
    for (const node of nodes) if (node) this.children.push(node);
  }

  setAttribute(name, value) {
    this.attributes[name] = String(value);
    if (name === 'value') this.value = String(value);
  }

  addEventListener(type, fn) {
    this.listeners.set(type, [...(this.listeners.get(type) ?? []), fn]);
  }

  async dispatch(type) {
    for (const fn of this.listeners.get(type) ?? []) await fn();
  }

  async click() {
    await this.dispatch('click');
  }

  querySelector(selector) {
    const match = (el) => {
      const attr = /^(?:[a-z]+)?\[([\w-]+)\]$/i.exec(selector);
      if (attr) {
        const tag = /^([a-z]+)\[/i.exec(selector);
        return Object.hasOwn(el.attributes, attr[1]) && (!tag || el.tagName === tag[1].toUpperCase());
      }
      if (selector.startsWith('.')) return el.className.split(/\s+/).includes(selector.slice(1));
      return el.tagName === selector.toUpperCase();
    };
    for (const child of this.children) {
      if (match(child)) return child;
      const found = child.querySelector(selector);
      if (found) return found;
    }
    return null;
  }

  querySelectorAll(selector) {
    const found = [];
    const visit = (el) => {
      for (const child of el.children) {
        if (
          (selector.startsWith('.') && child.className.split(/\s+/).includes(selector.slice(1)))
          || child.tagName === selector.toUpperCase()
        ) found.push(child);
        visit(child);
      }
    };
    visit(this);
    return found;
  }

  get outerHTML() {
    const attrs = Object.entries(this.attributes)
      .map(([k, v]) => ` ${k}="${escapeHtml(v)}"`)
      .join('');
    const cls = this.className ? ` class="${escapeHtml(this.className)}"` : '';
    const inner = escapeHtml(this._text) + this.children.map((c) => c.outerHTML).join('');
    return `<${this.tagName.toLowerCase()}${cls}${attrs}>${inner}</${this.tagName.toLowerCase()}>`;
  }
}

export function installDomStub() {
  globalThis.document = {
    createElement: (tag) => new StubElement(tag),
    documentElement: { dataset: {}, setAttribute() {} },
  };
  return globalThis.document;
}
