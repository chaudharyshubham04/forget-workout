import { h, icon, mount } from '../lib/dom.js';
import * as S from '../store.js';
import { exercisePicker } from '../lib/components.js';
import { emptyState, sheet, toast, confirmDelete } from '../lib/ui.js';
import { exercisePRs, weeklyBuckets, streaks, bodySeries } from '../lib/stats.js';
import { fmtDate, daysBetween, parseDay, todayKey, fmtWeight, fmtNum, addDays, dayKey } from '../lib/utils.js';
import { ring } from '../lib/charts.js';

export const title = 'Goals';
export const actions = () => [
  h('button.iconbtn', { 'aria-label': 'New goal', onclick: () => goalSheet(null) }, icon('plus')),
];

const KINDS = [
  { id: 'body-weight', name: 'Reach a body weight', unit: 'weight', icon: 'scale',
    desc: 'Gain or lose to a target weight' },
  { id: 'lift', name: 'Increase a lift', unit: 'weight', icon: 'dumbbell',
    desc: 'Hit a target weight or estimated 1RM on an exercise' },
  { id: 'frequency', name: 'Train X times a week', unit: 'workouts', icon: 'calendar',
    desc: 'Build the habit with a weekly session target' },
  { id: 'volume', name: 'Weekly volume target', unit: 'volume', icon: 'chart',
    desc: 'Hit a total training volume each week' },
  { id: 'streak', name: 'Build a streak', unit: 'sessions', icon: 'flame',
    desc: 'Keep training without long gaps' },
  { id: 'custom', name: 'Custom goal', unit: '', icon: 'target',
    desc: 'Anything you want to track yourself' },
];

/** Current value for a goal, derived live from logged data where possible. */
export function goalProgress(g) {
  const st = S.get();
  const done = S.completedSessions();
  switch (g.kind) {
    case 'body-weight': {
      const bw = bodySeries(st.bodyEntries, 'weight');
      return bw.length ? bw[bw.length - 1].value : (st.profile.bodyWeightKg ?? g.startValue);
    }
    case 'lift': {
      const prs = g.exerciseId ? exercisePRs(done, g.exerciseId) : null;
      if (!prs) return g.startValue;
      return g.metric === 'e1rm' ? (prs.bestE1rm?.value || 0) : (prs.heaviest?.weight || 0);
    }
    case 'frequency': {
      const w = weeklyBuckets(done, 1, st.settings.weekStart)[0];
      return w ? w.count : 0;
    }
    case 'volume': {
      const w = weeklyBuckets(done, 1, st.settings.weekStart)[0];
      return w ? w.volume : 0;
    }
    case 'streak': return streaks(done).current;
    default: return g.currentValue ?? g.startValue;
  }
}

export function render({ navigate }) {
  const st = S.get();
  const unit = st.settings.unit;
  const goals = st.goals;
  const listEl = h('.stack.stack-12');

  const draw = () => {
    const active = goals.filter((g) => !g.done);
    const complete = goals.filter((g) => g.done);
    if (!goals.length) {
      mount(listEl, emptyState({ iconName: 'target', title: 'No goals yet',
        message: 'Set a target — a body weight, a lift, a weekly frequency — and Forge tracks the progress from your logged data automatically.',
        action: h('button.btn.btn-primary', { onclick: () => goalSheet(null, draw) }, icon('plus'), 'Create a goal') }));
      return;
    }
    mount(listEl,
      ...active.map((g) => goalCard(g, unit, draw)),
      complete.length ? h('h2', { style: { marginTop: '8px' } }, 'Completed') : null,
      ...complete.map((g) => goalCard(g, unit, draw)));
  };
  draw();

  return h('.stack.stack-16',
    listEl,
    h('button.btn.btn-primary.btn-block', { onclick: () => goalSheet(null, draw) },
      icon('plus'), 'New goal'));
}

function goalCard(g, unit, refresh) {
  const cur = goalProgress(g);
  const span = (g.targetValue - g.startValue) || 1;
  const raw = (cur - g.startValue) / span;
  const p = Math.max(0, Math.min(1, raw));
  const reached = p >= 1;
  const kind = KINDS.find((k) => k.id === g.kind) || KINDS[5];
  const daysLeft = g.targetDate ? daysBetween(new Date(), parseDay(g.targetDate)) : null;
  const fmt = (v) => (kind.unit === 'weight' ? fmtWeight(v, unit)
    : kind.unit === 'volume' ? `${fmtNum(unit === 'lb' ? v / 0.45359237 : v, 0)} ${unit}`
    : `${fmtNum(v, v % 1 ? 1 : 0)}${g.unit ? ` ${g.unit}` : ''}`);

  return h('.card.card-pad.stack.stack-12', { style: g.done ? { opacity: .62 } : null },
    h('.row', { style: { gap: '14px' } },
      ring(p, 1, { size: 62, stroke: 7, color: reached ? 'var(--good)' : 'var(--accent)',
        children: h('div', { style: { fontSize: '13px', fontWeight: 800, fontFamily: 'var(--ff-num)' } },
          `${Math.round(p * 100)}%`) }),
      h('.grow',
        h('.row', { style: { gap: '7px', flexWrap: 'wrap' } },
          h('div.sb', g.title),
          reached && !g.done ? h('span.tag.tag-good', 'Reached') : null,
          g.done ? h('span.tag.tag-good', icon('check', 10), 'Done') : null),
        h('.t-xs.dim', { style: { marginTop: '3px' } },
          `${fmt(cur)} of ${fmt(g.targetValue)}${g.startValue ? ` · started at ${fmt(g.startValue)}` : ''}`),
        g.targetDate ? h('.t-xs.dim', { style: { marginTop: '2px' } },
          daysLeft >= 0 ? `${daysLeft} days left · target ${fmtDate(g.targetDate, 'short')}`
            : `Target date passed (${fmtDate(g.targetDate, 'short')})`) : null),
      h('button.iconbtn', { 'aria-label': 'Options', onclick: () => menu(g, refresh) }, icon('more'))),
    h('.bar.bar-lg', h('i', { style: { width: `${p * 100}%`,
      background: reached ? 'var(--good)' : 'var(--accent)' } })),
    reached && !g.done ? h('button.btn.btn-sm.btn-primary', { onclick: () => {
      S.updateGoal(g.id, { done: true }); toast('Goal completed', 'good'); refresh();
    } }, icon('check'), 'Mark complete') : null,
    g.kind === 'custom' && !g.done ? h('.row', { style: { gap: '8px' } },
      h('input.input.input-inline.grow', { type: 'number', placeholder: 'Update current value',
        onchange: (e) => { S.updateGoal(g.id, { currentValue: parseFloat(e.target.value) || 0 }); refresh(); } })) : null);
}

function menu(g, refresh) {
  const ref = sheet({ title: g.title, body: h('.stack',
    h('button.listrow', { onclick: () => { ref.close(); goalSheet(g, refresh); } },
      icon('edit'), h('.grow.sb', 'Edit goal'), icon('chevronRight')),
    h('button.listrow', { onclick: () => { S.updateGoal(g.id, { done: !g.done }); ref.close(); refresh(); } },
      icon('check'), h('.grow.sb', g.done ? 'Mark as active' : 'Mark complete')),
    h('button.listrow', { style: { color: 'var(--bad)' }, onclick: async () => {
      ref.close();
      if (await confirmDelete('this goal')) { S.deleteGoal(g.id); refresh(); }
    } }, icon('trash'), h('.grow.sb', 'Delete goal')),
  ) });
}

function goalSheet(existing, refresh) {
  const unit = S.settings().unit;
  const d = existing ? { ...existing } : {
    kind: 'lift', title: '', exerciseId: null, metric: 'weight',
    startValue: 0, targetValue: 0, currentValue: 0, unit: '', targetDate: null,
  };
  const body = h('.stack.stack-16');

  const draw = () => {
    const kind = KINDS.find((k) => k.id === d.kind);
    const isWeight = kind.unit === 'weight';
    const conv = (v) => (isWeight && unit === 'lb' ? +(v / 0.45359237).toFixed(1) : v);
    const unconv = (v) => (isWeight && unit === 'lb' ? v * 0.45359237 : v);

    mount(body,
      h('.field', h('label.label', 'Goal type'),
        h('.stack.stack-8', ...KINDS.map((k) =>
          h('button.suggest-opt', { style: {
            borderColor: d.kind === k.id ? 'var(--accent)' : undefined,
            background: d.kind === k.id ? 'var(--accent-soft)' : undefined },
            onclick: () => { d.kind = k.id; if (!existing) d.title = ''; draw(); } },
            h('span', { style: { color: 'var(--accent)', flex: 'none' } }, icon(k.icon, 18)),
            h('.grow', h('div.sb', k.name), h('.t-xs.dim', k.desc)),
            d.kind === k.id ? icon('check') : null)))),

      d.kind === 'lift' ? h('.field', h('label.label', 'Exercise'),
        h('button.btn', { style: { width: '100%', justifyContent: 'space-between' },
          onclick: () => exercisePicker({ title: 'Pick an exercise', onPick: (ex) => {
            d.exerciseId = ex.id;
            if (!d.title) d.title = `${ex.name} target`;
            const prs = exercisePRs(S.completedSessions(), ex.id);
            d.startValue = prs?.heaviest?.weight || 0;
            draw();
          } }) },
          h('span', d.exerciseId ? (S.exerciseById(d.exerciseId)?.name || 'Choose') : 'Choose an exercise'),
          icon('chevronRight', 15))) : null,

      d.kind === 'lift' ? h('.field', h('label.label', 'Measured by'),
        h('.seg', ...[['weight', 'Heaviest weight'], ['e1rm', 'Estimated 1RM']].map(([id, l]) =>
          h(`button${d.metric === id ? '.on' : ''}`, { onclick: () => { d.metric = id; draw(); } }, l)))) : null,

      h('.field', h('label.label', 'Title'),
        h('input.input', { value: d.title, placeholder: goalPlaceholder(d.kind),
          oninput: (e) => { d.title = e.target.value; } })),

      h('.grid.grid-2',
        h('.field', h('label.label', `Starting value${isWeight ? ` (${unit})` : ''}`),
          h('input.input', { type: 'number', step: 'any', value: conv(d.startValue) || '',
            oninput: (e) => { d.startValue = unconv(parseFloat(e.target.value) || 0); } })),
        h('.field', h('label.label', `Target${isWeight ? ` (${unit})` : ''}`),
          h('input.input', { type: 'number', step: 'any', value: conv(d.targetValue) || '',
            oninput: (e) => { d.targetValue = unconv(parseFloat(e.target.value) || 0); } }))),

      d.kind === 'custom' ? h('.field', h('label.label', 'Unit label'),
        h('input.input', { value: d.unit || '', placeholder: 'e.g. steps, km, sessions',
          oninput: (e) => { d.unit = e.target.value; } })) : null,

      h('.field', h('label.label', 'Target date (optional)'),
        h('input.input', { type: 'date', value: d.targetDate || '',
          oninput: (e) => { d.targetDate = e.target.value || null; } })),

      h('.card.card-pad', { style: { background: 'var(--surface-2)' } },
        h('.t-xs.muted', { style: { lineHeight: 1.55 } },
          d.kind === 'custom'
            ? 'You update the current value yourself for custom goals.'
            : 'Progress is calculated automatically from your logged workouts and body entries.')));
  };
  draw();

  const ref = sheet({ title: existing ? 'Edit goal' : 'New goal', body,
    foot: h('button.btn.btn-primary.btn-block', { onclick: () => {
      if (!d.title.trim()) d.title = goalPlaceholder(d.kind);
      if (!d.targetValue) { toast('Set a target value', 'bad'); return; }
      if (existing) S.updateGoal(existing.id, d); else S.createGoal(d);
      ref.close(); toast(existing ? 'Goal updated' : 'Goal created', 'good');
      refresh ? refresh() : (location.hash = '#/goals');
    } }, existing ? 'Save changes' : 'Create goal') });
}

const goalPlaceholder = (kind) => ({
  'body-weight': 'Reach my target weight',
  lift: 'Increase my lift',
  frequency: 'Train consistently each week',
  volume: 'Hit my weekly volume',
  streak: 'Build a training streak',
  custom: 'My goal',
}[kind] || 'My goal');
