import { h, icon, mount } from '../lib/dom.js';
import * as S from '../store.js';
import { LEVELS, GOALS, EQUIPMENT_PROFILES, EQUIPMENT } from '../data/taxonomy.js';
import { recommendSplits } from '../data/splits.js';
import { toast } from '../lib/ui.js';

export const title = 'Welcome';

export function render({ navigate }) {
  const draft = {
    name: '', level: 'beginner', goal: 'hypertrophy',
    daysPerWeek: 4, sessionMin: 60,
    equipmentProfile: 'full-gym',
    equipment: EQUIPMENT.map((e) => e.id),
    unit: 'kg',
  };
  let step = 0;
  const root = h('.stack.stack-20', { style: { maxWidth: '560px', margin: '0 auto', paddingTop: '8px' } });

  const STEPS = [welcome, unitStep, levelStep, goalStep, daysStep, durationStep, equipStep, planStep];

  const progress = () => h('.row', { style: { gap: '5px' } },
    ...STEPS.map((_, i) => h('div', { style: {
      flex: 1, height: '4px', borderRadius: '99px',
      background: i <= step ? 'var(--accent)' : 'var(--surface-3)',
      transition: 'background .3s' } })));

  const go = (n) => { step = Math.max(0, Math.min(STEPS.length - 1, n)); draw(); };

  function nav(nextLabel = 'Continue', onNext) {
    return h('.row', { style: { marginTop: '8px', gap: '10px' } },
      step > 0 ? h('button.btn.btn-lg', { onclick: () => go(step - 1), 'aria-label': 'Back' },
        icon('chevronLeft')) : null,
      h('button.btn.btn-primary.btn-lg.grow', { onclick: onNext || (() => go(step + 1)) },
        nextLabel, icon('arrowRight')));
  }

  const pickCard = (on, onClick, ...kids) =>
    h('button.card.card-pad.card-hover', {
      onclick: onClick,
      style: { textAlign: 'left', width: '100%', cursor: 'pointer',
        borderColor: on ? 'var(--accent)' : undefined,
        background: on ? 'var(--accent-soft)' : undefined,
        borderWidth: '1.5px' } }, ...kids);

  function welcome() {
    return [
      h('div', { style: { textAlign: 'center', padding: '20px 0 6px' } },
        h('div', { style: { width: '76px', height: '76px', borderRadius: '24px', margin: '0 auto 18px',
          background: 'linear-gradient(135deg,#ff5a2c,#ffb547)', display: 'grid', placeItems: 'center',
          color: '#fff', boxShadow: '0 12px 30px -10px #ff7a2c' } }, icon('dumbbell', 38)),
        h('h1', { style: { fontSize: '1.9rem', marginBottom: '8px' } }, 'Welcome to Forge'),
        h('p.muted', { style: { lineHeight: 1.6, maxWidth: '380px', margin: '0 auto' } },
          'Track every set you lift, see whether you are actually getting stronger, and get progressive-overload suggestions built from your own history.')),
      h('.stack.stack-10', { style: { marginTop: '18px' } },
        ...[
          ['library', `${S.exercises().length} exercises`, 'Animated demos, instructions and muscle maps'],
          ['chartline', 'Set-level history', 'Every set stored, so every chart is accurate'],
          ['bolt', 'Progression engine', 'Concrete suggestions for your next session'],
          ['shield', 'Works offline', 'Your data stays on this device'],
        ].map(([ic, t, d]) => h('.row', { style: { gap: '13px' } },
          h('div', { style: { width: '38px', height: '38px', borderRadius: '12px', flex: 'none',
            background: 'var(--accent-soft)', color: 'var(--accent)', display: 'grid', placeItems: 'center' } }, icon(ic)),
          h('div', h('div.sb', t), h('.t-sm.dim', d))))),
      h('.field', { style: { marginTop: '20px' } },
        h('label.label', 'What should we call you? (optional)'),
        h('input.input', { placeholder: 'Your name', value: draft.name,
          oninput: (e) => { draft.name = e.target.value; } })),
      nav('Get started'),
    ];
  }

  function unitStep() {
    return [
      head('Units', 'Which unit do you train in? You can switch at any time.'),
      h('.grid.grid-2',
        ...[['kg', 'Kilograms', 'Plates in 1.25 / 2.5 kg jumps'], ['lb', 'Pounds', 'Plates in 2.5 / 5 lb jumps']]
          .map(([id, name, sub]) => pickCard(draft.unit === id, () => { draft.unit = id; draw(); },
            h('.stat-v', { style: { fontSize: '1.4rem' } }, id.toUpperCase()),
            h('div.sb', name), h('.t-sm.dim', sub)))),
      nav(),
    ];
  }

  function levelStep() {
    return [
      head('Experience', 'This shapes which splits we recommend and the starting volume.'),
      h('.stack.stack-10', ...LEVELS.map((l) =>
        pickCard(draft.level === l.id, () => { draft.level = l.id; draw(); },
          h('.row-between', h('div', h('div.sb', l.name), h('.t-sm.dim', l.desc)),
            draft.level === l.id ? icon('check', 20) : null)))),
      nav(),
    ];
  }

  function goalStep() {
    return [
      head('Your main goal', 'Everything from rep ranges to rest times starts from here.'),
      h('.grid.grid-2', ...GOALS.map((g) =>
        pickCard(draft.goal === g.id, () => { draft.goal = g.id; draw(); },
          h('div', { style: { color: 'var(--accent)', marginBottom: '8px' } }, icon(g.icon, 22)),
          h('div.sb', g.name), h('.t-xs.dim', { style: { marginTop: '2px' } }, g.desc)))),
      nav(),
    ];
  }

  function daysStep() {
    return [
      head('Days per week', 'How many days can you realistically train?'),
      h('.grid', { style: { gridTemplateColumns: 'repeat(3,1fr)' } },
        ...[2, 3, 4, 5, 6, 7].map((n) =>
          pickCard(draft.daysPerWeek === n, () => { draft.daysPerWeek = n; draw(); },
            h('div', { style: { textAlign: 'center' } },
              h('.stat-v', String(n)),
              h('.t-xs.dim', n === 1 ? 'day' : 'days'))))),
      h('.card.card-pad', { style: { background: 'var(--surface-2)' } },
        h('.row', { style: { gap: '10px', alignItems: 'flex-start' } },
          h('span', { style: { color: 'var(--accent)' } }, icon('info', 18)),
          h('.t-sm.muted', draft.daysPerWeek <= 2
            ? 'Two days is enough to build strength if every session is full body. Consistency beats frequency.'
            : draft.daysPerWeek >= 6
              ? 'Six or seven days demands real recovery. Make sure sleep and nutrition can support it.'
              : 'A solid frequency. Every muscle can be trained at least twice a week at this level.'))),
      nav(),
    ];
  }

  function durationStep() {
    return [
      head('Session length', 'How long do you want a typical workout to run?'),
      h('.grid.grid-2', ...[30, 45, 60, 90].map((n) =>
        pickCard(draft.sessionMin === n, () => { draft.sessionMin = n; draw(); },
          h('.stat-v', `${n}`), h('.t-sm.dim', 'minutes')))),
      nav(),
    ];
  }

  function equipStep() {
    return [
      head('Equipment', 'We use this to suggest exercises you can actually do.'),
      h('.stack.stack-10', ...EQUIPMENT_PROFILES.map((p) =>
        pickCard(draft.equipmentProfile === p.id, () => {
          draft.equipmentProfile = p.id; draft.equipment = [...p.equipment]; draw();
        }, h('.row-between', h('div', h('div.sb', p.name), h('.t-sm.dim', p.desc)),
          draft.equipmentProfile === p.id ? icon('check', 20) : null)))),
      h('.t-xs.dim', { style: { textAlign: 'center' } }, 'You can fine-tune individual equipment in Settings.'),
      nav(),
    ];
  }

  function planStep() {
    const recs = recommendSplits({ goal: draft.goal, daysPerWeek: draft.daysPerWeek,
      level: draft.level, sessionMin: draft.sessionMin }).slice(0, 3);
    let chosen = recs[0]?.split.id;
    const list = h('.stack.stack-10');
    const drawList = () => list.replaceChildren(...recs.map(({ split, reasons }) =>
      pickCard(chosen === split.id, () => { chosen = split.id; drawList(); },
        h('.row-between', { style: { marginBottom: '4px' } },
          h('div.sb', split.name),
          h('span.tag.tag-accent', `${split.daysPerWeek}×/week`)),
        h('.t-sm.dim', { style: { marginBottom: '8px' } }, split.tagline),
        h('.row.wrap', { style: { gap: '6px' } },
          ...reasons.slice(0, 2).map((r) => h('span.tag', r))))));
    drawList();

    return [
      head('Your recommended plan', `Based on ${draft.daysPerWeek} days a week for ${GOALS.find((g) => g.id === draft.goal).name.toLowerCase()}.`),
      list,
      h('.t-xs.dim', { style: { textAlign: 'center' } },
        'You can change, edit or build your own split at any time.'),
      h('.row', { style: { marginTop: '8px', gap: '10px' } },
        h('button.btn.btn-lg', { onclick: () => go(step - 1), 'aria-label': 'Back' }, icon('chevronLeft')),
        h('button.btn.btn-primary.btn-lg.grow', { onclick: () => finish(chosen) },
          'Start training', icon('arrowRight'))),
      h('button.btn.btn-ghost.btn-block', { onclick: () => finish(null) }, 'Skip for now'),
    ];
  }

  function finish(splitId) {
    S.patchProfile({ name: draft.name, level: draft.level, goal: draft.goal,
      daysPerWeek: draft.daysPerWeek, sessionMin: draft.sessionMin, equipment: draft.equipment });
    S.patchSettings({ unit: draft.unit, defaultRestSec: (GOALS.find((g) => g.id === draft.goal) || {}).restSec || 90 });
    if (splitId) S.activateSplit(splitId);
    S.completeOnboarding();
    toast(splitId ? 'Plan activated — your first workout is on the home screen' : 'Setup complete', 'good');
    navigate('/');
  }

  const head = (t, sub) => h('div', { style: { paddingTop: '10px' } },
    h('h1', { style: { marginBottom: '6px' } }, t),
    h('p.muted', { style: { lineHeight: 1.55 } }, sub));

  function draw() {
    mount(root, progress(), ...STEPS[step]());
    window.scrollTo({ top: 0 });
  }
  draw();
  return root;
}
