/* Minimal DOM shim so view/render modules can be smoke-tested in Node. */
class CL {
  constructor(el) { this.el = el; }
  add(...c) { c.forEach((x) => this.el._cls.add(x)); }
  remove(...c) { c.forEach((x) => this.el._cls.delete(x)); }
  toggle(c, f) { f === undefined ? (this.el._cls.has(c) ? this.el._cls.delete(c) : this.el._cls.add(c)) : (f ? this.el._cls.add(c) : this.el._cls.delete(c)); }
  contains(c) { return this.el._cls.has(c); }
}
class El {
  constructor(tag, ns) {
    this.tagName = String(tag).toUpperCase(); this.namespaceURI = ns || null;
    this.childNodes = []; this.attributes = {}; this._cls = new Set();
    this.style = new Proxy({}, { set: (t, k, v) => { t[k] = v; return true; }, get: (t, k) => (k === 'setProperty' ? () => {} : t[k]) });
    this.dataset = {}; this._listeners = {}; this.parentNode = null;
    this.id = ''; this.value = ''; this.checked = false; this.disabled = false;
    this.hidden = false; this.isConnected = true;
  }
  get classList() { return new CL(this); }
  get className() { return [...this._cls].join(' '); }
  set className(v) { this._cls = new Set(String(v).split(/\s+/).filter(Boolean)); }
  setAttribute(k, v) {
    if (k === 'class') { this.className = v; return; }
    if (k === 'id') { this.id = String(v); return; }
    this.attributes[k] = String(v);
  }
  getAttribute(k) {
    if (k === 'class') return this.className;
    if (k === 'id') return this.id || null;
    return this.attributes[k] ?? null;
  }
  removeAttribute(k) { delete this.attributes[k]; }
  hasAttribute(k) { return k === 'class' ? this._cls.size > 0 : k in this.attributes; }
  appendChild(n) { n.parentNode = this; this.childNodes.push(n); return n; }
  insertBefore(n, ref) { const i = this.childNodes.indexOf(ref); this.childNodes.splice(i < 0 ? this.childNodes.length : i, 0, n); n.parentNode = this; return n; }
  /* Matches the real DOM: non-Node values are stringified, so append(null)
     inserts the text "null" rather than being silently skipped. */
  append(...ns) { for (const n of ns) this.appendChild(n instanceof El || n instanceof Txt ? n : new Txt(String(n))); }
  prepend(...ns) { for (const n of ns.reverse()) this.insertBefore(n instanceof El || n instanceof Txt ? n : new Txt(String(n)), this.firstChild); }
  replaceChildren(...ns) { this.childNodes = []; this.append(...ns.filter((x) => x != null && x !== false)); }
  removeChild(n) { const i = this.childNodes.indexOf(n); if (i >= 0) this.childNodes.splice(i, 1); n.parentNode = null; return n; }
  remove() { this.parentNode && this.parentNode.removeChild(this); }
  get firstChild() { return this.childNodes[0] || null; }
  get children() { return this.childNodes.filter((c) => c instanceof El); }
  addEventListener(t, f) { (this._listeners[t] ||= []).push(f); }
  removeEventListener() {}
  dispatchEvent(e) { (this._listeners[e.type] || []).forEach((f) => f(e)); return true; }
  querySelector() { return null; }
  querySelectorAll() { return []; }
  closest() { return null; }
  contains() { return false; }
  focus() {} blur() {} scrollIntoView() {} click() { this.dispatchEvent({ type: 'click', target: this }); }
  getBoundingClientRect() { return { top: 0, left: 0, width: 100, height: 100, bottom: 100, right: 100 }; }
  pauseAnimations() {} unpauseAnimations() {}
  set innerHTML(v) { this._html = v; } get innerHTML() { return this._html || ''; }
  get textContent() { return this.childNodes.map((c) => c.textContent ?? c.data ?? '').join(''); }
  set textContent(v) { this.childNodes = []; this.appendChild(new Txt(v)); }
}
class Txt { constructor(d) { this.data = String(d); this.nodeType = 3; } get textContent() { return this.data; } }
class Frag extends El { constructor() { super('#fragment'); } }

export function installDOM() {
  if (globalThis.document) return;
  const byId = new Map();
  const doc = {
    createElement: (t) => new El(t),
    createElementNS: (ns, t) => new El(t, ns),
    createTextNode: (t) => new Txt(t),
    createDocumentFragment: () => new Frag(),
    documentElement: new El('html'),
    body: new El('body'),
    head: new El('head'),
    getElementById: (id) => { if (!byId.has(id)) byId.set(id, new El('div')); return byId.get(id); },
    querySelector: () => null,
    querySelectorAll: () => [],
    addEventListener: () => {}, removeEventListener: () => {},
    hidden: false, visibilityState: 'visible',
  };
  globalThis.document = doc;
  globalThis.Node = El;
  globalThis.Element = El;
  globalThis.requestAnimationFrame = (f) => setTimeout(() => f(0), 0);
  globalThis.cancelAnimationFrame = (id) => clearTimeout(id);
  globalThis.matchMedia = () => ({ matches: false, addEventListener: () => {}, removeEventListener: () => {} });
  const store = new Map();
  globalThis.localStorage = {
    getItem: (k) => (store.has(k) ? store.get(k) : null),
    setItem: (k, v) => store.set(k, String(v)),
    removeItem: (k) => store.delete(k),
    clear: () => store.clear(),
    key: (i) => [...store.keys()][i] ?? null,
    get length() { return store.size; },
  };
  globalThis.window = {
    addEventListener: () => {}, removeEventListener: () => {},
    location: { hash: '', href: 'http://localhost/' },
    matchMedia: globalThis.matchMedia, localStorage: globalThis.localStorage,
    navigator: { onLine: true }, scrollTo: () => {}, scrollY: 0,
    getComputedStyle: () => ({ getPropertyValue: () => '' }),
    setTimeout: globalThis.setTimeout, clearTimeout: globalThis.clearTimeout,
  };
  globalThis.scrollTo = () => {};
  /* Relative fetch() resolves against the repo root so modules that load data
     files (the imported exercise library) follow their real code path. */
  const nodeFetch = globalThis.fetch;
  globalThis.fetch = async (url, init) => {
    const u = String(url);
    if (/^https?:/.test(u)) return nodeFetch ? nodeFetch(url, init) : Promise.reject(new Error('no network'));
    const { readFile } = await import('node:fs/promises');
    try {
      const buf = await readFile(u.replace(/^\.?\//, ''));
      const text = buf.toString('utf8');
      return { ok: true, status: 200, async json() { return JSON.parse(text); }, async text() { return text; } };
    } catch {
      return { ok: false, status: 404, async json() { return null; }, async text() { return ''; } };
    }
  };
  globalThis.Blob = globalThis.Blob || class { constructor(p) { this.size = (p || []).join('').length; } };
  globalThis.navigator = globalThis.navigator || { onLine: true, vibrate: () => {}, serviceWorker: undefined };
  globalThis.Node = El;
}
export { El, Txt };
