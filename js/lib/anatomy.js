/* Front/back body maps with per-muscle highlighting.
   Geometric-anatomical style: each muscle is its own shape so it can be
   individually filled, tinted by intensity, or made interactive. */
import { h } from './dom.js';

const VB = '0 0 120 250';

/* shape helpers */
const E = (cx, cy, rx, ry, rot) => ({ t: 'e', cx, cy, rx, ry, rot: rot || 0 });
const R = (x, y, w, hh, r) => ({ t: 'r', x, y, w, h: hh, r: r ?? 4 });
const P = (d) => ({ t: 'p', d });
const mirror = (s) => {
  if (s.t === 'e') return { ...s, cx: 120 - s.cx, rot: -s.rot };
  if (s.t === 'r') return { ...s, x: 120 - s.x - s.w };
  return null;
};

/* ---------- FRONT ---------- */
const FRONT = {
  neck:         [R(53, 30, 14, 10, 5)],
  traps:        [P('M46 40 L60 36 L74 40 L70 47 L60 43 L50 47 Z')],
  'front-delts':[E(35, 53, 10.5, 10), E(85, 53, 10.5, 10)],
  'side-delts': [E(29, 50, 7, 9.5, -12), E(91, 50, 7, 9.5, 12)],
  'upper-chest':[P('M44 46 L58.5 48 L58.5 57 L42 55 Z'), P('M76 46 L61.5 48 L61.5 57 L78 55 Z')],
  chest:        [P('M42 56 L58.5 58 L58.5 74 Q50 76 43 70 Z'), P('M78 56 L61.5 58 L61.5 74 Q70 76 77 70 Z')],
  'lower-chest':[P('M43.5 71 L58.5 75 L58.5 81 Q49 80 44 76 Z'), P('M76.5 71 L61.5 75 L61.5 81 Q71 80 76 76 Z')],
  serratus:     [P('M41 74 l4 2 l-1 5 l-4 -2 Z'), P('M79 74 l-4 2 l1 5 l4 -2 Z')],
  biceps:       [E(26, 74, 6.5, 13, -6), E(94, 74, 6.5, 13, 6)],
  triceps:      [E(33, 74, 4.5, 12, -5), E(87, 74, 4.5, 12, 5)],
  forearms:     [E(22, 104, 6, 16, -5), E(98, 104, 6, 16, 5)],
  abs:          [R(51, 84, 8, 10), R(61, 84, 8, 10), R(51, 96, 8, 10), R(61, 96, 8, 10),
                 R(51, 108, 8, 10), R(61, 108, 8, 10), P('M51 120 h8 l-2 10 h-6 Z'), P('M69 120 h-8 l2 10 h6 Z')],
  obliques:     [P('M43 84 Q40 100 46 124 L50 122 Q46 100 48 86 Z'), P('M77 84 Q80 100 74 124 L70 122 Q74 100 72 86 Z')],
  core:         [P('M50 118 Q60 126 70 118 L68 130 Q60 134 52 130 Z')],
  'hip-flexors':[E(50, 134, 6, 7, 8), E(70, 134, 6, 7, -8)],
  adductors:    [P('M55 136 Q58 158 57 172 L52 168 Q50 150 52 138 Z'), P('M65 136 Q62 158 63 172 L68 168 Q70 150 68 138 Z')],
  abductors:    [E(41, 140, 6, 9, -6), E(79, 140, 6, 9, 6)],
  quads:        [P('M44 133 Q40 160 46 186 L57 186 Q59 158 56 133 Z'), P('M76 133 Q80 160 74 186 L63 186 Q61 158 64 133 Z')],
  calves:       [E(49, 208, 7.5, 20, -2), E(71, 208, 7.5, 20, 2)],
  glutes:       [],
  'full-body':  [], cardio: [],
};

/* ---------- BACK ---------- */
const BACK = {
  neck:         [R(53, 30, 14, 10, 5)],
  traps:        [P('M45 40 Q60 34 75 40 L72 62 Q60 70 48 62 Z')],
  'rear-delts': [E(34, 53, 10.5, 10), E(86, 53, 10.5, 10)],
  'side-delts': [E(28, 50, 7, 9.5, -12), E(92, 50, 7, 9.5, 12)],
  'rotator-cuff':[E(40, 60, 5, 5), E(80, 60, 5, 5)],
  rhomboids:    [P('M48 60 L60 56 L72 60 L69 76 L60 80 L51 76 Z')],
  lats:         [P('M41 62 Q37 88 47 106 L58 96 Q55 76 52 62 Z'), P('M79 62 Q83 88 73 106 L62 96 Q65 76 68 62 Z')],
  'lower-back': [R(53.5, 92, 6, 30, 3), R(60.5, 92, 6, 30, 3)],
  triceps:      [E(27, 74, 6.5, 13.5, -6), E(93, 74, 6.5, 13.5, 6)],
  biceps:       [E(34, 74, 4.5, 11, -5), E(86, 74, 4.5, 11, 5)],
  forearms:     [E(22, 104, 6, 16, -5), E(98, 104, 6, 16, 5)],
  glutes:       [E(50, 134, 12, 12.5, -8), E(70, 134, 12, 12.5, 8)],
  abductors:    [E(40, 130, 6.5, 8, -10), E(80, 130, 6.5, 8, 10)],
  hamstrings:   [P('M44 148 Q41 172 47 190 L57 190 Q58 168 55 148 Z'), P('M76 148 Q79 172 73 190 L63 190 Q62 168 65 148 Z')],
  adductors:    [P('M56 148 Q58 168 57 182 L52 180 Q51 162 53 149 Z'), P('M64 148 Q62 168 63 182 L68 180 Q69 162 67 149 Z')],
  calves:       [E(49, 206, 8, 21, -2), E(71, 206, 8, 21, 2)],
  obliques:     [P('M42 86 Q40 100 45 116 L49 113 Q45 100 46 88 Z'), P('M78 86 Q80 100 75 116 L71 113 Q75 100 74 88 Z')],
  'full-body':  [], cardio: [], abs: [], chest: [], 'front-delts': [],
};

/* Silhouette outline — drawn behind the muscle shapes. */
const SILHOUETTE = 'M60 8 c-7 0-12 5-12 12 0 5 2 8 5 10 l0 4 c-9 2-18 5-23 9 -5 4-6 10-7 16 l-3 22 c-1 6-2 9-4 14 l-6 15 c-1 3 3 5 4 2 l7 -15 -2 18 c0 3 4 3 4 0 l3 -19 1 -10 2 26 c0 8-1 14 0 21 l2 26 c0 6 1 12 2 18 l3 30 c0 4 6 4 6 0 l-1 -30 2 -26 3 -22 3 22 2 26 -1 30 c0 4 6 4 6 0 l3 -30 c1-6 2-12 2-18 l2 -26 c1-7 0-13 0-21 l2 -26 1 10 3 19 c0 3 4 3 4 0 l-2 -18 7 15 c1 3 5 1 4-2 l-6 -15 c-2-5-3-8-4-14 l-3 -22 c-1-6-2-12-7-16 -5-4-14-7-23-9 l0 -4 c3-2 5-5 5-10 0-7-5-12-12-12 z';

function shape(s, cls, extra) {
  if (s.t === 'e') return h('ellipse', { cx: s.cx, cy: s.cy, rx: s.rx, ry: s.ry, class: cls,
    transform: s.rot ? `rotate(${s.rot} ${s.cx} ${s.cy})` : null, ...extra });
  if (s.t === 'r') return h('rect', { x: s.x, y: s.y, width: s.w, height: s.h, rx: s.r, class: cls, ...extra });
  return h('path', { d: s.d, class: cls, ...extra });
}

/**
 * Render one body view.
 * @param {'front'|'back'} side
 * @param {{primary?:string[], secondary?:string[], intensity?:Record<string,number>,
 *          onPick?:(muscleId:string)=>void, label?:boolean}} opts
 */
export function bodyMap(side, opts = {}) {
  const set = side === 'back' ? BACK : FRONT;
  const primary = new Set(opts.primary || []);
  const secondary = new Set(opts.secondary || []);
  const intensity = opts.intensity || null;

  const nodes = [];
  for (const [mid, shapes] of Object.entries(set)) {
    for (const s of shapes) {
      let cls = 'muscle-shape';
      const attrs = { 'data-muscle': mid };
      if (intensity) {
        const v = intensity[mid] || 0;
        if (v > 0) attrs.style = { fill: `hsl(var(--accent-h) var(--accent-s) var(--accent-l) / ${(0.18 + 0.8 * Math.min(1, v)).toFixed(2)})` };
      } else if (primary.has(mid)) cls += ' primary';
      else if (secondary.has(mid)) cls += ' secondary';
      if (opts.onPick) { attrs.style = { ...(attrs.style || {}), cursor: 'pointer' }; attrs.onclick = () => opts.onPick(mid); }
      nodes.push(shape(s, cls, attrs));
    }
  }
  return h('svg', { viewBox: VB, class: 'body-svg', role: 'img',
    'aria-label': `${side === 'back' ? 'Back' : 'Front'} view muscle map`,
    preserveAspectRatio: 'xMidYMid meet' },
    h('path', { d: SILHOUETTE, class: 'body-outline' }),
    ...nodes,
    opts.label !== false ? h('text', { x: 60, y: 246, 'text-anchor': 'middle',
      'font-size': 9, fill: 'var(--ink-3)', 'font-weight': 700,
      style: { letterSpacing: '.08em' } }, side === 'back' ? 'BACK' : 'FRONT') : null,
  );
}

/** Both views side by side. */
export function bodyMapPair(opts = {}) {
  return h('.body-map', bodyMap('front', opts), bodyMap('back', opts));
}

/** Which views actually contain a given muscle (used to avoid empty panels). */
export function musclePresence(mid) {
  return { front: (FRONT[mid] || []).length > 0, back: (BACK[mid] || []).length > 0 };
}

/** Tiny inline body glyph with one muscle lit — used on chips and list rows. */
export function muscleGlyph(mid, size = 22) {
  const side = musclePresence(mid).front ? 'front' : 'back';
  const set = side === 'back' ? BACK : FRONT;
  return h('svg', { viewBox: VB, width: size, height: size * (250 / 120) / 2.08,
    'aria-hidden': 'true', preserveAspectRatio: 'xMidYMid meet',
    style: { width: `${size}px`, height: `${size}px` } },
    h('path', { d: SILHOUETTE, fill: 'var(--surface-3)', stroke: 'none' }),
    ...(set[mid] || []).map((s) => shape(s, '', { fill: 'var(--accent)' })));
}

export const MUSCLE_SHAPE_IDS = [...new Set([...Object.keys(FRONT), ...Object.keys(BACK)])];
