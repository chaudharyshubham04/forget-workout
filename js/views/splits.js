import { h, icon, mount } from '../lib/dom.js';
import * as S from '../store.js';
import { recommendSplits, GOAL_GUIDANCE } from '../data/splits.js';
import { GOALS, LEVELS } from '../data/taxonomy.js';
import { sectionTitle } from '../lib/components.js';
import { emptyState, sheet, toast, segmented } from '../lib/ui.js';

export const title = 'Splits';
export const actions = () => [
  h('button.iconbtn', { 'aria-label': 'New split', onclick: () => {
    const s = S.createSplit(); location.hash = `#/split/${s.id}`;
  } }, icon('plus')),
];

export function render({ navigate }) {
  const p = S.profile();
  const plan = S.get().activePlan;
  const all = S.splits();
  const recs = recommendSplits({ goal: p.goal, daysPerWeek: p.daysPerWeek, level: p.level, sessionMin: p.sessionMin });
  const top = recs.slice(0, 3);
  const guidance = GOAL_GUIDANCE[p.goal]?.[p.daysPerWeek];

  const card = (split, extra) => {
    const isActive = plan?.splitId === split.id;
    return h('.card.card-pad.card-hover', {
      style: isActive ? { borderColor: 'var(--accent)', borderWidth: '1.5px' } : null,
      onclick: () => navigate(`/split/${split.id}`) },
      h('.row-between', { style: { alignItems: 'flex-start' } },
        h('.grow',
          h('.row', { style: { gap: '7px', flexWrap: 'wrap' } },
            h('div.sb', split.name),
            isActive ? h('span.tag.tag-accent', 'ACTIVE') : null,
            split.custom ? h('span.tag.tag-info', 'CUSTOM') : null),
          h('.t-sm.dim', { style: { marginTop: '3px' } }, split.tagline || `${split.daysPerWeek} days a week`),
          h('.row.wrap', { style: { gap: '5px', marginTop: '9px' } },
            h('span.tag', `${split.daysPerWeek}×/week`),
            h('span.tag', `~${split.sessionMin} min`),
            h('span.tag', LEVELS.find((l) => l.id === split.level)?.name || split.level))),
        icon('chevronRight')),
      extra || null);
  };

  return h('.stack.stack-20',
    plan ? (() => {
      const sp = S.splitById(plan.splitId);
      return sp ? h('.card.card-pad.stack.stack-10', { style: { borderColor: 'var(--accent)' } },
        h('.row-between',
          h('.row', { style: { gap: '8px' } },
            h('span', { style: { color: 'var(--accent)' } }, icon('check', 17)),
            h('div.sb', 'Your active plan')),
          h('button.link', { onclick: () => navigate(`/split/${sp.id}`) }, 'View')),
        h('div', h('div.sb', sp.name), h('.t-sm.dim', sp.tagline)),
        h('.row', { style: { gap: '5px' } },
          ...sp.days.map((d, i) => h('div', { style: {
            flex: 1, padding: '7px 2px', borderRadius: '9px', textAlign: 'center',
            fontSize: '10px', fontWeight: 700,
            background: d.rest ? 'var(--surface-3)' : 'var(--accent-soft)',
            color: d.rest ? 'var(--ink-3)' : 'var(--accent)' } },
            d.rest ? 'REST' : (d.name || '').split(' ').map((w) => w[0]).join('').slice(0, 3).toUpperCase()))),
        h('button.btn.btn-sm', { onclick: () => { S.clearPlan(); toast('Plan cleared'); navigate('/splits'); } },
          'Stop following')) : null;
    })() : h('.card.card-pad.stack.stack-10',
      h('.row', { style: { gap: '10px', alignItems: 'flex-start' } },
        h('span', { style: { color: 'var(--accent)' } }, icon('info', 18)),
        h('.grow',
          h('div.sb', 'No active plan'),
          h('.t-sm.muted', { style: { marginTop: '3px', lineHeight: 1.5 } },
            'Activate a split to schedule your week and generate a workout template for every training day.')))),

    h('.card.card-pad.stack.stack-12',
      h('.row-between',
        h('div.sb', 'Recommended for you'),
        h('button.link', { onclick: () => prefsSheet(navigate) }, 'Change')),
      h('.row.wrap', { style: { gap: '6px' } },
        h('span.tag.tag-accent', GOALS.find((g) => g.id === p.goal)?.name || p.goal),
        h('span.tag', `${p.daysPerWeek} days/week`),
        h('span.tag', LEVELS.find((l) => l.id === p.level)?.name),
        h('span.tag', `~${p.sessionMin} min`)),
      guidance ? h('.t-sm.muted', { style: { lineHeight: 1.5 } },
        `For ${GOALS.find((g) => g.id === p.goal)?.name.toLowerCase()} on ${p.daysPerWeek} days a week, the usual recommendation is ${guidance}.`) : null),

    h('.stack.stack-10',
      ...top.map(({ split, reasons }) => card(split,
        h('.row.wrap', { style: { gap: '5px', marginTop: '9px', paddingTop: '9px', borderTop: '1px solid var(--line)' } },
          ...reasons.slice(0, 3).map((r) => h('span.tag.tag-good', icon('check', 10), r)))))),

    S.get().customSplits.length ? h('.stack.stack-10',
      sectionTitle('My splits'),
      ...S.get().customSplits.map((s) => card(s))) : null,

    h('.stack.stack-10',
      sectionTitle('All splits', h('button.link', { onclick: () => {
        const s = S.createSplit(); navigate(`/split/${s.id}`);
      } }, '+ Build your own')),
      ...all.filter((s) => !top.some((t) => t.split.id === s.id) && !s.custom).map((s) => card(s))));
}

function prefsSheet(navigate) {
  const p = { ...S.profile() };
  const body = h('.stack.stack-16');
  const draw = () => mount(body,
    h('.field', h('label.label', 'Goal'),
      h('.row.wrap', { style: { gap: '7px' } }, ...GOALS.map((g) =>
        h(`button.chip${p.goal === g.id ? '.on' : ''}`, { onclick: () => { p.goal = g.id; draw(); } }, g.name)))),
    h('.field', h('label.label', 'Experience'),
      h('.row.wrap', { style: { gap: '7px' } }, ...LEVELS.map((l) =>
        h(`button.chip${p.level === l.id ? '.on' : ''}`, { onclick: () => { p.level = l.id; draw(); } }, l.name)))),
    h('.field', h('label.label', 'Days per week'),
      h('.row.wrap', { style: { gap: '7px' } }, ...[2, 3, 4, 5, 6, 7].map((n) =>
        h(`button.chip${p.daysPerWeek === n ? '.on' : ''}`, { onclick: () => { p.daysPerWeek = n; draw(); } }, String(n))))),
    h('.field', h('label.label', 'Session length'),
      h('.row.wrap', { style: { gap: '7px' } }, ...[30, 45, 60, 75, 90].map((n) =>
        h(`button.chip${p.sessionMin === n ? '.on' : ''}`, { onclick: () => { p.sessionMin = n; draw(); } }, `${n} min`)))));
  draw();
  const ref = sheet({ title: 'Training preferences', body,
    foot: h('button.btn.btn-primary.btn-block', { onclick: () => {
      S.patchProfile(p); ref.close(); navigate('/splits'); toast('Recommendations updated', 'good');
    } }, 'Update recommendations') });
}
