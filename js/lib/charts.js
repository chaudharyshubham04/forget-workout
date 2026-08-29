/* Hand-rolled SVG charts. Responsive via viewBox, themed via CSS variables. */
import { h, mount } from './dom.js';
import { compactNum, fmtNum, parseDay, MON, throttle } from './utils.js';

const PAD = { l: 34, r: 10, t: 12, b: 22 };

/**
 * Charts are drawn at the container's real pixel width, so the viewBox maps
 * 1:1 to CSS pixels. Scaling a fixed viewBox with preserveAspectRatio="none"
 * would stretch text and strokes on wide screens.
 */
function responsive(build) {
  const wrap = h('.chart-wrap');
  let lastW = 0;
  const paint = () => {
    const w = Math.max(240, Math.round(wrap.clientWidth || 320));
    if (w === lastW) return;
    lastW = w;
    mount(wrap, build(w));
  };
  mount(wrap, build(320));           // sensible first paint before measurement
  if (typeof requestAnimationFrame === 'function') requestAnimationFrame(paint);
  if (typeof ResizeObserver !== 'undefined') {
    const ro = new ResizeObserver(throttle(paint, 120));
    ro.observe(wrap);
  }
  return wrap;
}

const niceStep = (range, ticks = 4) => {
  if (!range) return 1;
  const raw = range / ticks, mag = 10 ** Math.floor(Math.log10(raw)), n = raw / mag;
  return (n >= 5 ? 10 : n >= 2 ? 5 : n >= 1 ? 2 : 1) * mag;
};

function axes(w, hgt, min, max, fmt) {
  const step = niceStep(max - min);
  const lines = [];
  const start = Math.floor(min / step) * step;
  for (let v = start; v <= max + step * 0.001; v += step) {
    if (v < min - step * 0.001) continue;
    const y = PAD.t + (hgt - PAD.t - PAD.b) * (1 - (v - min) / (max - min || 1));
    if (y < PAD.t - 1 || y > hgt - PAD.b + 1) continue;
    lines.push(h('line', { x1: PAD.l, x2: w - PAD.r, y1: y, y2: y, stroke: 'var(--line)', 'stroke-width': 1, 'stroke-dasharray': '3 4' }));
    lines.push(h('text', { x: PAD.l - 6, y: y + 3.5, 'text-anchor': 'end', 'font-size': 9,
      fill: 'var(--ink-3)', 'font-weight': 600 }, (fmt || compactNum)(v)));
  }
  return lines;
}

const empty = (msg) => h('.chart-empty', h('div', msg));

/**
 * Line / area chart.
 * @param {{date:string,value:number}[]} points
 */
export function lineChart(points, opts = {}) {
  const { height = 190, fmt = compactNum, color = 'var(--accent)', area = true,
    showDots = true, yMinZero = false, label = 'value', emptyMsg = 'No data yet' } = opts;
  if (!points || points.length === 0) return empty(emptyMsg);
  return responsive((W) => buildLine(points, { ...opts, W }));
}

function buildLine(points, opts) {
  const { height = 190, fmt = compactNum, color = 'var(--accent)', area = true,
    showDots = true, yMinZero = false, label = 'value', W } = opts;
  const H = height;
  const vals = points.map((p) => p.value);
  let min = Math.min(...vals), max = Math.max(...vals);
  if (yMinZero) min = 0;
  if (min === max) { min = min === 0 ? 0 : min * 0.94; max = max === 0 ? 1 : max * 1.06; }
  else { const pad = (max - min) * 0.12; min -= pad; max += pad; if (yMinZero) min = 0; }

  const iw = W - PAD.l - PAD.r, ih = H - PAD.t - PAD.b;
  const X = (i) => PAD.l + (points.length === 1 ? iw / 2 : (i / (points.length - 1)) * iw);
  const Y = (v) => PAD.t + ih * (1 - (v - min) / (max - min || 1));

  const d = points.map((p, i) => `${i ? 'L' : 'M'}${X(i).toFixed(2)} ${Y(p.value).toFixed(2)}`).join('');
  const gid = `g${Math.random().toString(36).slice(2, 8)}`;

  /* Anchor the first label to the start and the last to the end so neither
     is clipped by the chart edge. */
  const xLabels = [];
  const step = Math.max(1, Math.ceil(points.length / 4));
  const idxs = [];
  for (let i = 0; i < points.length; i += step) idxs.push(i);
  if (idxs[idxs.length - 1] !== points.length - 1) {
    if (points.length - 1 - idxs[idxs.length - 1] < step / 2) idxs.pop();
    idxs.push(points.length - 1);
  }
  for (const i of idxs) {
    const dt = parseDay(points[i].date);
    xLabels.push(h('text', { x: X(i), y: H - 6,
      'text-anchor': i === 0 ? 'start' : i === points.length - 1 ? 'end' : 'middle',
      'font-size': 9, fill: 'var(--ink-3)', 'font-weight': 600 }, `${MON[dt.getMonth()]} ${dt.getDate()}`));
  }

  return h('svg', { viewBox: `0 0 ${W} ${H}`, width: W, height: H,
    preserveAspectRatio: 'xMidYMid meet', role: 'img', 'aria-label': `${label} chart` },
    h('defs', h('linearGradient', { id: gid, x1: '0', y1: '0', x2: '0', y2: '1' },
      h('stop', { offset: '0', 'stop-color': color, 'stop-opacity': '.28' }),
      h('stop', { offset: '1', 'stop-color': color, 'stop-opacity': '0' }))),
    ...axes(W, H, min, max, fmt),
    area && points.length > 1
      ? h('path', { d: `${d}L${X(points.length - 1)} ${H - PAD.b}L${X(0)} ${H - PAD.b}Z`, fill: `url(#${gid})` })
      : null,
    h('path', { d, fill: 'none', stroke: color, 'stroke-width': 2.4, 'stroke-linejoin': 'round', 'stroke-linecap': 'round',
      'vector-effect': 'non-scaling-stroke' }),
    showDots ? points.map((p, i) => h('circle', {
      cx: X(i), cy: Y(p.value), r: points.length > 30 ? 0 : (i === points.length - 1 ? 4 : 2.8),
      fill: i === points.length - 1 ? color : 'var(--surface)', stroke: color, 'stroke-width': 2,
      'vector-effect': 'non-scaling-stroke' })) : null,
    ...xLabels,
  );
}

/** Vertical bar chart. items: [{label, value, highlight?}] */
export function barChart(items, opts = {}) {
  const { height = 180, fmt = compactNum, color = 'var(--accent)', emptyMsg = 'No data yet', showValues = false } = opts;
  if (!items || !items.length) return empty(emptyMsg);
  return responsive((W) => buildBars(items, { ...opts, W }));
}

function buildBars(items, opts) {
  const { height = 180, fmt = compactNum, color = 'var(--accent)', showValues = false, W } = opts;
  const H = height;
  const max = Math.max(...items.map((i) => i.value), 1);
  const iw = W - PAD.l - PAD.r, ih = H - PAD.t - PAD.b;
  const bw = Math.min(30, (iw / items.length) * 0.62);
  const gap = iw / items.length;

  return h('svg', { viewBox: `0 0 ${W} ${H}`, width: W, height: H,
    preserveAspectRatio: 'xMidYMid meet', role: 'img', 'aria-label': 'bar chart' },
    ...axes(W, H, 0, max, fmt),
    ...items.flatMap((it, i) => {
      const x = PAD.l + gap * i + (gap - bw) / 2;
      const bh = Math.max(it.value > 0 ? 2 : 0, (it.value / max) * ih);
      const y = PAD.t + ih - bh;
      return [
        h('rect', { x, y, width: bw, height: bh, rx: Math.min(5, bw / 2.4),
          fill: it.highlight ? color : (it.color || 'var(--accent)'),
          opacity: it.highlight === false ? 0.35 : (it.highlight ? 1 : 0.75) }),
        showValues && it.value > 0 ? h('text', { x: x + bw / 2, y: y - 4, 'text-anchor': 'middle',
          'font-size': 8.5, fill: 'var(--ink-2)', 'font-weight': 700 }, fmt(it.value)) : null,
        h('text', { x: x + bw / 2, y: H - 6, 'text-anchor': 'middle', 'font-size': 9,
          fill: it.highlight ? 'var(--ink)' : 'var(--ink-3)', 'font-weight': 700 }, it.label),
      ];
    }));
}

/** Horizontal bars, good for muscle-group volume. */
export function hBarChart(items, opts = {}) {
  const { fmt = compactNum, emptyMsg = 'No data yet', showTarget = false } = opts;
  if (!items || !items.length) return empty(emptyMsg);
  const max = Math.max(...items.map((i) => Math.max(i.value, i.target || 0)), 1);
  return h('.stack.stack-10',
    ...items.map((it) => h('div',
      h('.row-between', { style: { marginBottom: '4px' } },
        h('span.t-sm.sb', it.label),
        h('span.t-sm.mono', { style: { color: 'var(--ink-2)' } },
          showTarget && it.target ? `${fmt(it.value)} / ${fmt(it.target)}` : fmt(it.value))),
      h('.bar.bar-lg', { style: { position: 'relative' } },
        h('i', { style: { width: `${Math.min(100, (it.value / max) * 100)}%`, background: it.color || 'var(--accent)' } }),
        showTarget && it.target
          ? h('span', { style: { position: 'absolute', left: `${Math.min(100, (it.target / max) * 100)}%`,
              top: '-3px', bottom: '-3px', width: '2px', background: 'var(--ink-3)', borderRadius: '2px' } })
          : null))));
}

/** Progress ring. */
export function ring(value, max, opts = {}) {
  const { size = 84, stroke = 9, color = 'var(--accent)', track = 'var(--surface-3)', children } = opts;
  const r = (size - stroke) / 2, c = 2 * Math.PI * r;
  const p = Math.max(0, Math.min(1, max ? value / max : 0));
  return h('.ring', { style: { width: `${size}px`, height: `${size}px` } },
    h('svg', { width: size, height: size, viewBox: `0 0 ${size} ${size}` },
      h('circle', { cx: size / 2, cy: size / 2, r, fill: 'none', stroke: track, 'stroke-width': stroke }),
      h('circle', { cx: size / 2, cy: size / 2, r, fill: 'none', stroke: color, 'stroke-width': stroke,
        'stroke-linecap': 'round', 'stroke-dasharray': `${c}`, 'stroke-dashoffset': `${c * (1 - p)}`,
        style: { transition: 'stroke-dashoffset .6s cubic-bezier(.16,1,.3,1)' } })),
    children ? h('.ring-label', children) : null);
}

/** GitHub-style contribution heatmap of training days. */
export function heatmap(dayMap, opts = {}) {
  const { weeks = 20, weekStart = 1, max = 4, onPick } = opts;
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const end = new Date(today);
  end.setDate(end.getDate() + ((7 - ((end.getDay() - weekStart + 7) % 7) - 1)));
  const cells = [];
  const total = weeks * 7;
  for (let i = total - 1; i >= 0; i--) {
    const d = new Date(end); d.setDate(d.getDate() - i);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    const v = dayMap[key] || 0;
    const future = d > today;
    const alpha = v ? 0.28 + 0.72 * Math.min(1, v / max) : 0;
    cells.push(h('i', {
      title: `${key}${v ? ` — ${v} workout${v > 1 ? 's' : ''}` : ''}`,
      style: {
        background: v ? `hsl(var(--accent-h) var(--accent-s) var(--accent-l) / ${alpha.toFixed(2)})` : undefined,
        opacity: future ? 0.28 : 1,
        outline: key === `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}` ? '1.5px solid var(--accent)' : undefined,
        cursor: onPick ? 'pointer' : undefined,
      },
      onclick: onPick ? () => onPick(key) : undefined,
    }));
  }
  return h('.heat', ...cells);
}

/** Inline sparkline for list rows. */
export function sparkline(values, opts = {}) {
  const { width = 72, height = 24, color = 'var(--accent)' } = opts;
  if (!values || values.length < 2) return h('svg', { width, height, 'aria-hidden': 'true' });
  const min = Math.min(...values), max = Math.max(...values);
  const rng = max - min || 1;
  const d = values.map((v, i) =>
    `${i ? 'L' : 'M'}${((i / (values.length - 1)) * (width - 3) + 1.5).toFixed(1)} ${(height - 2 - ((v - min) / rng) * (height - 4)).toFixed(1)}`).join('');
  return h('svg', { width, height, viewBox: `0 0 ${width} ${height}`, 'aria-hidden': 'true' },
    h('path', { d, fill: 'none', stroke: color, 'stroke-width': 1.8, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }),
    h('circle', { cx: width - 1.5, cy: height - 2 - ((values[values.length - 1] - min) / rng) * (height - 4), r: 2.2, fill: color }));
}

/** Multi-series comparison — used for week vs week. */
export function groupedBars(groups, series, opts = {}) {
  const { height = 180, fmt = compactNum } = opts;
  if (!groups.length) return empty('No data yet');
  return h('div',
    responsive((W) => buildGrouped(groups, series, { ...opts, W })),
    h('.legend', { style: { marginTop: '8px' } },
      ...series.map((s) => h('span', h('i', { style: { background: s.color } }), s.label))));
}

function buildGrouped(groups, series, opts) {
  const { height = 180, fmt = compactNum, W } = opts;
  const H = height;
  const max = Math.max(...groups.flatMap((g) => series.map((s) => g[s.key] || 0)), 1);
  const iw = W - PAD.l - PAD.r, ih = H - PAD.t - PAD.b;
  const gap = iw / groups.length;
  const bw = Math.min(16, (gap * 0.7) / series.length);
  return h('svg', { viewBox: `0 0 ${W} ${H}`, width: W, height: H, preserveAspectRatio: 'xMidYMid meet' },
      ...axes(W, H, 0, max, fmt),
      ...groups.flatMap((g, i) => series.map((s, j) => {
        const bh = Math.max(0, ((g[s.key] || 0) / max) * ih);
        const x = PAD.l + gap * i + (gap - bw * series.length) / 2 + j * bw;
        return h('rect', { x: x + 1, y: PAD.t + ih - bh, width: bw - 2, height: bh, rx: 3, fill: s.color });
      })),
      ...groups.map((g, i) => h('text', { x: PAD.l + gap * i + gap / 2, y: H - 6, 'text-anchor': 'middle',
        'font-size': 9, fill: 'var(--ink-3)', 'font-weight': 700 }, g.label)));
}
