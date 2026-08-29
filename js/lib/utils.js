/* ---- ids ---- */
let seq = 0;
export const uid = (p = 'x') =>
  `${p}_${Date.now().toString(36)}${(seq = (seq + 1) % 1296).toString(36).padStart(2, '0')}${Math.random().toString(36).slice(2, 6)}`;
export const slug = (s) => String(s).toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

/* ---- dates (local-time day keys, never UTC-shifted) ---- */
export const todayKey = () => dayKey(new Date());
export function dayKey(d) {
  const x = d instanceof Date ? d : new Date(d);
  return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, '0')}-${String(x.getDate()).padStart(2, '0')}`;
}
export function parseDay(key) {
  const [y, m, d] = String(key).split('-').map(Number);
  return new Date(y, (m || 1) - 1, d || 1);
}
export const addDays = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };
export const startOfDay = (d) => { const x = new Date(d); x.setHours(0, 0, 0, 0); return x; };
export function startOfWeek(d, weekStart = 1) {
  const x = startOfDay(d);
  const diff = (x.getDay() - weekStart + 7) % 7;
  return addDays(x, -diff);
}
export const daysBetween = (a, b) =>
  Math.round((startOfDay(b) - startOfDay(a)) / 86400000);
export const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
export const MON = MONTHS.map((m) => m.slice(0, 3));
export const DAYS = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
export const DAY_ABBR = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
export const DAY_MIN = ['S','M','T','W','T','F','S'];

export function fmtDate(d, style = 'med') {
  const x = d instanceof Date ? d : parseDay(d);
  if (style === 'short') return `${MON[x.getMonth()]} ${x.getDate()}`;
  if (style === 'med') return `${DAY_ABBR[x.getDay()]}, ${MON[x.getMonth()]} ${x.getDate()}`;
  if (style === 'long') return `${DAYS[x.getDay()]}, ${MONTHS[x.getMonth()]} ${x.getDate()}, ${x.getFullYear()}`;
  if (style === 'ym') return `${MONTHS[x.getMonth()]} ${x.getFullYear()}`;
  return x.toLocaleDateString();
}
export function relDay(key) {
  const n = daysBetween(parseDay(key), new Date());
  if (n === 0) return 'Today';
  if (n === 1) return 'Yesterday';
  if (n === -1) return 'Tomorrow';
  if (n > 1 && n < 7) return `${n} days ago`;
  if (n < -1 && n > -7) return `in ${-n} days`;
  if (n >= 7 && n < 14) return 'Last week';
  return fmtDate(key, 'short');
}
export function fmtClock(sec) {
  sec = Math.max(0, Math.round(sec));
  const h = Math.floor(sec / 3600), m = Math.floor((sec % 3600) / 60), s = sec % 60;
  return h ? `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
           : `${m}:${String(s).padStart(2, '0')}`;
}
export function fmtDuration(sec) {
  const m = Math.round(sec / 60);
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  return m % 60 ? `${h}h ${m % 60}m` : `${h}h`;
}

/* ---- numbers ---- */
export const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
export const round = (v, step = 1) => Math.round(v / step) * step;
export const sum = (a) => a.reduce((x, y) => x + (Number(y) || 0), 0);
export const avg = (a) => (a.length ? sum(a) / a.length : 0);
export const maxBy = (a, f) => a.reduce((b, x) => (b === null || f(x) > f(b) ? x : b), null);
export const minBy = (a, f) => a.reduce((b, x) => (b === null || f(x) < f(b) ? x : b), null);
export const uniq = (a) => [...new Set(a)];
export function groupBy(arr, f) {
  const m = new Map();
  for (const x of arr) { const k = f(x); if (!m.has(k)) m.set(k, []); m.get(k).push(x); }
  return m;
}
export function fmtNum(n, dp = 0) {
  if (n === null || n === undefined || Number.isNaN(n)) return '—';
  const v = Number(n);
  if (dp === 'auto') dp = Math.abs(v) >= 100 ? 0 : Math.abs(v) >= 10 ? 1 : Math.round(v) === v ? 0 : 1;
  return v.toLocaleString(undefined, { minimumFractionDigits: dp, maximumFractionDigits: dp });
}
export function compactNum(n) {
  const v = Math.abs(Number(n) || 0);
  if (v >= 1e6) return (n / 1e6).toFixed(v >= 1e7 ? 0 : 1).replace(/\.0$/, '') + 'M';
  if (v >= 1e4) return Math.round(n / 1e3) + 'k';
  if (v >= 1e3) return (n / 1e3).toFixed(1).replace(/\.0$/, '') + 'k';
  return fmtNum(n, v % 1 === 0 ? 0 : 1);
}

/* ---- units ---- */
export const KG_PER_LB = 0.45359237;
export const toKg = (v, unit) => (unit === 'lb' ? v * KG_PER_LB : v);
export const fromKg = (v, unit) => (unit === 'lb' ? v / KG_PER_LB : v);
/** Display a weight stored in kg, in the user's unit. */
export function fmtWeight(kg, unit = 'kg', withUnit = true) {
  if (kg === null || kg === undefined || Number.isNaN(kg)) return '—';
  const v = fromKg(kg, unit);
  const s = fmtNum(v, Math.abs(v % 1) < 0.001 ? 0 : Math.abs(v) < 10 ? 2 : 1);
  return withUnit ? `${s} ${unit}` : s;
}
export const fmtVolume = (kg, unit = 'kg') => `${compactNum(fromKg(kg, unit))} ${unit}`;
export const cmToIn = (cm) => cm / 2.54;
export const fmtLength = (cm, unit = 'cm') =>
  unit === 'in' ? `${fmtNum(cmToIn(cm), 1)} in` : `${fmtNum(cm, 1)} cm`;

/* ---- 1RM estimation (Epley, capped — reliability degrades past ~12 reps) ---- */
export function e1rm(weightKg, reps) {
  if (!weightKg || !reps || reps < 1) return 0;
  if (reps === 1) return weightKg;
  return weightKg * (1 + Math.min(reps, 15) / 30);
}
/** Inverse: load predicted to be movable for `reps` given an e1RM. */
export const loadForReps = (oneRm, reps) => oneRm / (1 + Math.min(reps, 15) / 30);

/* ---- misc ---- */
export const debounce = (fn, ms = 220) => { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); }; };
export const throttle = (fn, ms = 100) => { let last = 0, t; return (...a) => {
  const now = Date.now();
  if (now - last >= ms) { last = now; fn(...a); }
  else { clearTimeout(t); t = setTimeout(() => { last = Date.now(); fn(...a); }, ms - (now - last)); }
}; };
export const deepClone = (o) => (typeof structuredClone === 'function' ? structuredClone(o) : JSON.parse(JSON.stringify(o)));
export const pct = (a, b) => (b ? (a / b) * 100 : 0);
export function trend(prev, cur) {
  if (!prev) return null;
  return ((cur - prev) / Math.abs(prev)) * 100;
}
/** Fuzzy-ish scoring search: exact > prefix > word-prefix > substring > subsequence. */
export function matchScore(text, q) {
  if (!q) return 1;
  const t = text.toLowerCase(), s = q.toLowerCase().trim();
  if (!s) return 1;
  if (t === s) return 1000;
  if (t.startsWith(s)) return 600 - t.length * 0.1;
  const words = t.split(/[^a-z0-9]+/);
  if (words.some((w) => w.startsWith(s))) return 400 - t.length * 0.1;
  const i = t.indexOf(s);
  if (i >= 0) return 250 - i;
  let j = 0;
  for (const ch of t) { if (ch === s[j]) j++; if (j === s.length) return 80 - t.length * 0.05; }
  return 0;
}
export const vibrate = (p) => { try { navigator.vibrate && navigator.vibrate(p); } catch {} };
export const escapeHtml = (s) => String(s).replace(/[&<>"']/g, (c) =>
  ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
/** "front-delts" -> "Front Delts" */
export const prettify = (id) => String(id ?? '').replace(/[-_]/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
export function ordinal(n) {
  const s = ['th', 'st', 'nd', 'rd'], v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}
