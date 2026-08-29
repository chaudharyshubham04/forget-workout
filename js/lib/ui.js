/* Shared UI primitives: toasts, bottom sheets, dialogs, confirms, celebrations. */
import { h, mount, clear, icon } from './dom.js';
import { vibrate } from './utils.js';

/* ---------- toast ---------- */
export function toast(msg, kind = '', ms = 2600) {
  const host = document.getElementById('toast-host');
  if (!host) return;
  const el = h(`.toast${kind ? `.toast-${kind}` : ''}`,
    kind === 'good' ? icon('check') : kind === 'bad' ? icon('alert') : null,
    h('span', msg));
  host.appendChild(el);
  setTimeout(() => {
    el.classList.add('out');
    setTimeout(() => el.remove(), 240);
  }, ms);
  return el;
}

/* ---------- bottom sheet / modal ---------- */
let openCount = 0;
/**
 * @param {{title?:string, body:Node|(()=>Node), foot?:Node, onClose?:Function,
 *          actions?:Node, dismissible?:boolean}} o
 */
export function sheet(o) {
  const host = document.getElementById('sheet-host');
  const scrim = h('.scrim');
  const bodyNode = typeof o.body === 'function' ? o.body() : o.body;
  const el = h('.sheet', { role: 'dialog', 'aria-modal': 'true', 'aria-label': o.title || 'Dialog' },
    h('.sheet-grab'),
    o.title !== undefined
      ? h('.sheet-head',
          h('h2', o.title),
          o.actions || null,
          h('button.iconbtn', { onclick: () => close(), 'aria-label': 'Close' }, icon('x')))
      : null,
    h('.sheet-body', bodyNode),
    o.foot ? h('.sheet-foot', o.foot) : null);

  host.appendChild(scrim); host.appendChild(el);
  host.style.pointerEvents = 'auto';
  openCount++;
  document.body.style.overflow = 'hidden';
  requestAnimationFrame(() => { scrim.classList.add('in'); el.classList.add('in'); });

  let closed = false;
  function close(result) {
    if (closed) return; closed = true;
    scrim.classList.remove('in'); el.classList.remove('in');
    setTimeout(() => {
      scrim.remove(); el.remove();
      if (--openCount <= 0) { openCount = 0; host.style.pointerEvents = 'none'; document.body.style.overflow = ''; }
    }, 300);
    o.onClose && o.onClose(result);
  }
  if (o.dismissible !== false) {
    scrim.addEventListener('click', () => close());
    const esc = (ev) => { if (ev.key === 'Escape') { close(); document.removeEventListener('keydown', esc); } };
    document.addEventListener('keydown', esc);
  }
  /* Drag-to-dismiss on touch devices. */
  let sy = null;
  el.addEventListener('touchstart', (ev) => {
    const b = el.querySelector('.sheet-body');
    if (b && b.scrollTop > 0) return;
    sy = ev.touches[0].clientY;
  }, { passive: true });
  el.addEventListener('touchmove', (ev) => {
    if (sy === null) return;
    const dy = ev.touches[0].clientY - sy;
    if (dy > 0) el.style.transform = `translateY(${dy}px)`;
  }, { passive: true });
  el.addEventListener('touchend', (ev) => {
    if (sy === null) return;
    const dy = (ev.changedTouches[0].clientY - sy);
    el.style.transform = '';
    if (dy > 110) close();
    sy = null;
  });
  return { el, close, body: el.querySelector('.sheet-body') };
}

/* ---------- dialog ---------- */
export function dialog({ title, message, confirmText = 'Confirm', cancelText = 'Cancel',
  danger = false, iconName = 'alert', onConfirm, extra }) {
  return new Promise((resolve) => {
    const host = document.getElementById('modal-host');
    const scrim = h('.scrim');
    const el = h('.dialog', { role: 'alertdialog', 'aria-modal': 'true' },
      h('.dialog-icon', { style: {
        background: danger ? 'var(--bad-soft)' : 'var(--accent-soft)',
        color: danger ? 'var(--bad)' : 'var(--accent)' } }, icon(iconName)),
      h('h2', { style: { marginBottom: '6px' } }, title),
      message ? h('p.muted.t-sm', { style: { lineHeight: 1.6 } }, message) : null,
      extra || null,
      h('.row', { style: { marginTop: '18px', gap: '10px' } },
        h('button.btn.grow', { onclick: () => done(false) }, cancelText),
        h(`button.btn.grow.${danger ? 'btn-danger' : 'btn-primary'}`,
          { onclick: () => done(true) }, confirmText)));
    host.appendChild(scrim); host.appendChild(el);
    host.style.pointerEvents = 'auto';
    document.body.style.overflow = 'hidden';
    requestAnimationFrame(() => { scrim.classList.add('in'); el.classList.add('in'); });
    const esc = (ev) => { if (ev.key === 'Escape') done(false); };
    document.addEventListener('keydown', esc);
    scrim.addEventListener('click', () => done(false));
    function done(v) {
      document.removeEventListener('keydown', esc);
      scrim.classList.remove('in'); el.classList.remove('in');
      setTimeout(() => { scrim.remove(); el.remove(); host.style.pointerEvents = 'none'; document.body.style.overflow = ''; }, 220);
      if (v && onConfirm) onConfirm();
      resolve(v);
    }
  });
}

export const confirmDelete = (what, detail) => dialog({
  title: `Delete ${what}?`, message: detail || 'This cannot be undone.',
  confirmText: 'Delete', danger: true, iconName: 'trash' });

/* ---------- PR celebration ---------- */
export function celebrate(count = 30) {
  const host = document.getElementById('confetti-host');
  if (!host) return;
  if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const colors = ['#ff5a2c', '#ffb547', '#31d07a', '#5aa2ff', '#a06bff', '#ff5d8f'];
  for (let i = 0; i < count; i++) {
    const el = h('.confetti', { style: {
      left: `${Math.random() * 100}%`, top: `${-10 - Math.random() * 20}px`,
      background: colors[i % colors.length],
      '--dx': `${(Math.random() - 0.5) * 260}px`,
      '--rot': `${Math.random() * 1080 - 540}deg`,
      animationDuration: `${1.6 + Math.random() * 1.4}s`,
      animationDelay: `${Math.random() * 0.35}s`,
      opacity: 0.9,
    } });
    host.appendChild(el);
    setTimeout(() => el.remove(), 3600);
  }
  vibrate([18, 40, 18, 40, 40]);
}

/* ---------- states ---------- */
export const emptyState = ({ iconName = 'folder', title, message, action }) =>
  h('.empty', h('.empty-art', icon(iconName)), h('h3', title),
    message ? h('p', message) : null, action || null);

export const skeleton = (n = 3, height = 74) =>
  h('.stack.stack-10', ...Array.from({ length: n }, () =>
    h('.skel', { style: { height: `${height}px` } })));

/* ---------- small helpers ---------- */
export const segmented = (options, value, onPick) =>
  h('.seg', ...options.map((o) =>
    h(`button${o.value === value ? '.on' : ''}`, { onclick: () => onPick(o.value) }, o.label)));

export const switchToggle = (on, onToggle, label) =>
  h(`button.switch${on ? '.on' : ''}`, { role: 'switch', 'aria-checked': String(!!on),
    'aria-label': label || 'Toggle', onclick: () => onToggle(!on) });

export function stepper(value, onChange, { step = 1, min = 0, max = Infinity, dp = 0, width } = {}) {
  const inp = h('input', { type: 'number', inputmode: 'decimal', value: value ?? '',
    style: width ? { width } : null,
    onchange: (e) => onChange(clampNum(parseFloat(e.target.value), min, max, dp)) });
  const bump = (d) => {
    const cur = parseFloat(inp.value) || 0;
    const next = clampNum(cur + d * step, min, max, dp);
    inp.value = next; onChange(next);
  };
  return h('.stepper',
    h('button', { type: 'button', 'aria-label': 'Decrease', onclick: () => bump(-1) }, '−'),
    inp,
    h('button', { type: 'button', 'aria-label': 'Increase', onclick: () => bump(1) }, '+'));
}
const clampNum = (v, min, max, dp) => {
  if (Number.isNaN(v)) return min === -Infinity ? 0 : min;
  const c = Math.max(min, Math.min(max, v));
  return Number(c.toFixed(dp));
};

/** Reorderable list: pointer-drag on desktop, long-press-drag on touch. */
export function makeSortable(container, { handle = '.drag-handle', onReorder }) {
  let dragEl = null, startY = 0, placeholderIdx = -1;
  const rows = () => [...container.children];

  container.addEventListener('pointerdown', (e) => {
    const hnd = e.target.closest(handle);
    if (!hnd || !container.contains(hnd)) return;
    const row = hnd.closest('[data-sort-id]');
    if (!row) return;
    e.preventDefault();
    dragEl = row; startY = e.clientY; placeholderIdx = rows().indexOf(row);
    row.classList.add('dragging');
    row.setPointerCapture?.(e.pointerId);
  });
  container.addEventListener('pointermove', (e) => {
    if (!dragEl) return;
    const all = rows();
    for (const r of all) {
      if (r === dragEl) continue;
      const box = r.getBoundingClientRect();
      if (e.clientY > box.top && e.clientY < box.bottom) {
        const before = e.clientY < box.top + box.height / 2;
        container.insertBefore(dragEl, before ? r : r.nextSibling);
        break;
      }
    }
  });
  const end = () => {
    if (!dragEl) return;
    dragEl.classList.remove('dragging');
    const ids = rows().map((r) => r.dataset.sortId);
    dragEl = null;
    if (ids[placeholderIdx] !== undefined) onReorder(ids);
  };
  container.addEventListener('pointerup', end);
  container.addEventListener('pointercancel', end);
}
