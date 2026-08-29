/* Minimal element factory. h(tag, props, ...children) with `.cls#id` shorthand. */
const SVG_NS = 'http://www.w3.org/2000/svg';
const SVG_TAGS = new Set(['svg','g','path','circle','rect','line','polyline','polygon','text','tspan','defs',
  'linearGradient','radialGradient','stop','clipPath','ellipse','animate','animateTransform','animateMotion',
  'mask','filter','feGaussianBlur','use','tspan','title','foreignObject','pattern','marker','textPath']);

/** True only for a plain props object — not a Node, array, string or number. */
const isProps = (v) =>
  v !== null && typeof v === 'object' && !Array.isArray(v) &&
  v.nodeType === undefined && !(typeof Node !== 'undefined' && v instanceof Node);

export function h(spec, props, ...children) {
  /* Allow h(tag, child, ...) — anything that is not a plain props object is a child. */
  if (props !== undefined && !isProps(props)) { children.unshift(props); props = null; }
  if (typeof spec === 'function') return spec({ ...(props || {}), children });
  let tag = spec, cls = [], id = null;
  const m = String(spec).match(/^([a-zA-Z][\w-]*)?((?:[.#][\w-]+)*)$/);
  if (m) {
    tag = m[1] || 'div';
    (m[2] || '').split(/(?=[.#])/).filter(Boolean).forEach((tok) => {
      if (tok[0] === '.') cls.push(tok.slice(1)); else id = tok.slice(1);
    });
  }
  const isSvg = SVG_TAGS.has(tag);
  const el = isSvg ? document.createElementNS(SVG_NS, tag) : document.createElement(tag);
  if (cls.length) el.setAttribute('class', cls.join(' '));
  if (id) el.id = id;

  if (props) for (const [k, v] of Object.entries(props)) {
    if (v === null || v === undefined || v === false) continue;
    if (k === 'class' || k === 'className') {
      const extra = Array.isArray(v) ? v.filter(Boolean).join(' ') : String(v);
      el.setAttribute('class', [...cls, extra].filter(Boolean).join(' '));
    } else if (k === 'style' && typeof v === 'object') {
      for (const [p, val] of Object.entries(v)) {
        if (val === null || val === undefined) continue;
        if (p.startsWith('--')) el.style.setProperty(p, String(val)); else el.style[p] = val;
      }
    } else if (k === 'dataset') {
      for (const [p, val] of Object.entries(v)) if (val != null) el.dataset[p] = val;
    } else if (k.startsWith('on') && typeof v === 'function') {
      el.addEventListener(k.slice(2).toLowerCase(), v);
    } else if (k === 'html') {
      el.innerHTML = v;
    } else if (k === 'ref' && typeof v === 'function') {
      v(el);
    } else if (!isSvg && k in el && k !== 'list' && k !== 'form' && typeof v !== 'object') {
      try { el[k] = v; } catch { el.setAttribute(k, String(v)); }
    } else {
      el.setAttribute(k, v === true ? '' : String(v));
    }
  }
  append(el, children);
  return el;
}

export function append(parent, kids) {
  for (const c of kids.flat(Infinity)) {
    if (c === null || c === undefined || c === false || c === true) continue;
    parent.appendChild(c instanceof Node ? c : document.createTextNode(String(c)));
  }
  return parent;
}

export const frag = (...kids) => append(document.createDocumentFragment(), kids);
export const clear = (el) => { while (el.firstChild) el.removeChild(el.firstChild); return el; };
export const mount = (el, ...kids) => append(clear(el), kids);
export const qs = (sel, root = document) => root.querySelector(sel);
export const qsa = (sel, root = document) => [...root.querySelectorAll(sel)];

/* Icon set — stroke icons on a 24px grid. */
const P = {
  home:'M3 10.4 12 3l9 7.4M5.5 9.2V20a1 1 0 0 0 1 1H9.5v-5.5h5V21h3a1 1 0 0 0 1-1V9.2',
  dumbbell:'M6.5 8v8M3.5 10v4M17.5 8v8M20.5 10v4M6.5 12h11',
  library:'M4 5.5A1.5 1.5 0 0 1 5.5 4H9v16H5.5A1.5 1.5 0 0 1 4 18.5zM11 4h3.5A1.5 1.5 0 0 1 16 5.5v13a1.5 1.5 0 0 1-1.5 1.5H11zM18.2 5.6l1.9 13.2',
  chart:'M4 20V10M10 20V4M16 20v-7M22 20H2',
  chartline:'M3 17.5 9 11l4 4 8-8.5M21 6.5h-4.5M21 6.5V11',
  history:'M3.5 12a8.5 8.5 0 1 0 2.6-6.1M3.5 5v4h4M12 7.5V12l3 2',
  calendar:'M3.5 8.5h17M7 3.5v3M17 3.5v3M4.5 6h15a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1h-15a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1z',
  layers:'m12 3 8.5 4.5L12 12 3.5 7.5zM3.5 12 12 16.5 20.5 12M3.5 16.5 12 21l8.5-4.5',
  settings:'M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z M19.4 15a1.6 1.6 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.6 1.6 0 0 0-1.8-.3 1.6 1.6 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1A1.6 1.6 0 0 0 9 19.4a1.6 1.6 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.6 1.6 0 0 0 .3-1.8 1.6 1.6 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1A1.6 1.6 0 0 0 4.6 9a1.6 1.6 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.6 1.6 0 0 0 1.8.3H9a1.6 1.6 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.6 1.6 0 0 0 1 1.5 1.6 1.6 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.6 1.6 0 0 0-.3 1.8V9a1.6 1.6 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.6 1.6 0 0 0-1.5 1z',
  plus:'M12 5v14M5 12h14', minus:'M5 12h14',
  check:'m4.5 12.5 5 5 10-11', x:'M6 6l12 12M18 6L6 18',
  chevronRight:'m9 5 7 7-7 7', chevronLeft:'m15 5-7 7 7 7',
  chevronDown:'m6 9 6 6 6-6', chevronUp:'m6 15 6-6 6 6',
  search:'M11 19a8 8 0 1 0 0-16 8 8 0 0 0 0 16zM21 21l-4.3-4.3',
  filter:'M3 5.5h18M6.5 12h11M10 18.5h4',
  star:'m12 3.5 2.6 5.6 6 .8-4.4 4.2 1.1 6-5.3-2.9-5.3 2.9 1.1-6L3.4 9.9l6-.8z',
  heart:'M12 20.5S3.5 15 3.5 9.2A4.7 4.7 0 0 1 12 6.5a4.7 4.7 0 0 1 8.5 2.7C20.5 15 12 20.5 12 20.5z',
  play:'M7 4.5 19.5 12 7 19.5z', pause:'M9 4.5v15M15 4.5v15',
  stop:'M6.5 6.5h11v11h-11z',
  timer:'M12 21a8 8 0 1 0 0-16 8 8 0 0 0 0 16zM12 9.5V13l2.2 2.2M9 2.5h6',
  edit:'m4 20 .8-4.2L16 4.6a2 2 0 0 1 2.8 0l.6.6a2 2 0 0 1 0 2.8L8.2 19.2 4 20z',
  trash:'M4.5 7h15M9.5 7V5a1 1 0 0 1 1-1h3a1 1 0 0 1 1 1v2M6.5 7l.8 12.1a1 1 0 0 0 1 .9h7.4a1 1 0 0 0 1-.9L17.5 7M10 11v5.5M14 11v5.5',
  copy:'M8.5 8.5V5a1 1 0 0 1 1-1H19a1 1 0 0 1 1 1v9.5a1 1 0 0 1-1 1h-3.5M5 8.5h9.5a1 1 0 0 1 1 1V19a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V9.5a1 1 0 0 1 1-1z',
  drag:'M9 6h.01M9 12h.01M9 18h.01M15 6h.01M15 12h.01M15 18h.01',
  flame:'M12 21c3.6 0 6-2.4 6-5.6 0-3.9-3.4-5.2-3-9.4-2.2.7-3.4 2.6-3.4 4.4 0 1-.6 1.7-1.3 1.7-.8 0-1.3-.7-1.3-1.9-1.7 1.3-3 3.2-3 5.4C6 18.6 8.4 21 12 21z',
  trophy:'M7 4.5h10v4a5 5 0 0 1-10 0zM7 6H4.5v1.5A3.5 3.5 0 0 0 8 11M17 6h2.5v1.5A3.5 3.5 0 0 1 16 11M12 13.5V17M8.5 20h7',
  target:'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM12 16.5a4.5 4.5 0 1 0 0-9 4.5 4.5 0 0 0 0 9zM12 13.5a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3z',
  user:'M12 12.5a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM4.5 20.5a7.5 7.5 0 0 1 15 0',
  scale:'M12 3.5a8.5 8.5 0 1 0 0 17 8.5 8.5 0 0 0 0-17zM12 12l3.5-3.5',
  info:'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM12 11v5.5M12 7.6v.01',
  alert:'M12 8.5v4.8M12 17.2v.01M10.3 3.9 2.6 17.4A2 2 0 0 0 4.3 20.4h15.4a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z',
  bolt:'M13.5 2.5 4 13.5h6.5L10 21.5l9.5-11H13z',
  refresh:'M20.5 12a8.5 8.5 0 1 1-2.5-6M20.5 4v4.5H16',
  download:'M12 3.5v11M7.5 10.5 12 15l4.5-4.5M4.5 19.5h15',
  upload:'M12 15.5v-11M7.5 8.5 12 4l4.5 4.5M4.5 19.5h15',
  bell:'M18 8.5a6 6 0 1 0-12 0c0 5-2 6.5-2 6.5h16s-2-1.5-2-6.5zM10.3 19a2 2 0 0 0 3.4 0',
  moon:'M20 14.5A8.5 8.5 0 1 1 9.5 4a6.6 6.6 0 0 0 10.5 10.5z',
  sun:'M12 16.5a4.5 4.5 0 1 0 0-9 4.5 4.5 0 0 0 0 9zM12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4',
  more:'M12 6.5h.01M12 12h.01M12 17.5h.01',
  grid:'M4 4.5h6v6H4zM14 4.5h6v6h-6zM4 13.5h6v6H4zM14 13.5h6v6h-6z',
  list:'M8 6.5h12M8 12h12M8 17.5h12M4 6.5h.01M4 12h.01M4 17.5h.01',
  ruler:'M4.5 14.8 14.8 4.5a1 1 0 0 1 1.4 0l3.3 3.3a1 1 0 0 1 0 1.4L9.2 19.5a1 1 0 0 1-1.4 0l-3.3-3.3a1 1 0 0 1 0-1.4zM9 10l2 2M12 7l2 2M6 13l2 2',
  camera:'M4.5 8.5h2.8l1.4-2.2h6.6l1.4 2.2h2.8a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1h-15a1 1 0 0 1-1-1v-9a1 1 0 0 1 1-1zM12 17a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7z',
  run:'M13.5 5.5a1.6 1.6 0 1 0 0-3.2 1.6 1.6 0 0 0 0 3.2zM10 21.5l2-5.5-2.5-2.5.8-4.5L7 11l-1.5 3M12.3 9 16 11.5l1 4M9.3 8.5l4-1.5 2.7 2.5 3 .5',
  repeat:'M17 2.5 20.5 6 17 9.5M20.5 6H7A3.5 3.5 0 0 0 3.5 9.5v1M7 21.5 3.5 18 7 14.5M3.5 18H17a3.5 3.5 0 0 0 3.5-3.5v-1',
  clock:'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM12 7v5.2l3.2 2',
  arrowUp:'M12 19V5M6 11l6-6 6 6', arrowDown:'M12 5v14M6 13l6 6 6-6',
  arrowRight:'M5 12h14M13 6l6 6-6 6', arrowLeft:'M19 12H5M11 18l-6-6 6-6',
  book:'M4 5.5A2.5 2.5 0 0 1 6.5 3H20v14.5H6.5A2.5 2.5 0 0 0 4 20zM4 20a2.5 2.5 0 0 1 2.5-2.5H20V21H6.5A2.5 2.5 0 0 1 4 18.5z',
  sparkle:'m12 3 1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9zM19 16l.8 2.2L22 19l-2.2.8L19 22l-.8-2.2L16 19l2.2-.8z',
  link:'M10 13.5a4 4 0 0 0 5.7 0l2.8-2.8a4 4 0 0 0-5.7-5.7L11.4 6.4M14 10.5a4 4 0 0 0-5.7 0l-2.8 2.8a4 4 0 0 0 5.7 5.7l1.4-1.4',
  shield:'M12 21s7-3 7-9V5.8l-7-2.8-7 2.8V12c0 6 7 9 7 9z',
  eye:'M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12zM12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z',
  folder:'M3.5 7a1.5 1.5 0 0 1 1.5-1.5h4l2 2.5h8a1.5 1.5 0 0 1 1.5 1.5v8.5a1.5 1.5 0 0 1-1.5 1.5H5a1.5 1.5 0 0 1-1.5-1.5z',
  note:'M6 3.5h8.5L19.5 8.5V20a1 1 0 0 1-1 1h-12a1 1 0 0 1-1-1V4.5a1 1 0 0 1 1-1zM14 3.5v5h5M8.5 13h7M8.5 16.5h4',
  swap:'M7 4.5v13M3.5 14 7 17.5 10.5 14M17 19.5v-13M13.5 10 17 6.5 20.5 10',
};
/* Always give icons an intrinsic size. Without width/height an inline SVG
   stretches to fill its container, which silently breaks any layout that has
   not set an explicit size in CSS. CSS rules still override these. */
export function icon(name, size = 20) {
  const d = P[name] || P.info;
  return h('svg', { class: 'ic', viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor',
    'stroke-width': 2, 'stroke-linecap': 'round', 'stroke-linejoin': 'round',
    width: size, height: size, 'aria-hidden': 'true' },
    ...d.split(' M').map((seg, i) => h('path', { d: i === 0 ? seg : 'M' + seg })));
}
export const hasIcon = (n) => !!P[n];
export const iconNames = () => Object.keys(P);
