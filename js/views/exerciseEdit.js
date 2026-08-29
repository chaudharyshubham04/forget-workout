import { h, icon, mount, append } from '../lib/dom.js';
import * as S from '../store.js';
import { DIFFICULTIES, MECHANICS, MOVEMENTS, TRACKING_TYPES } from '../data/taxonomy.js';
import { demoSVG, poseIds } from '../lib/motion.js';
import { toast, sheet, emptyState, confirmDelete } from '../lib/ui.js';
import { prettify } from '../lib/utils.js';

export const title = (ctx) => (ctx.params.id ? 'Edit exercise' : 'New exercise');

export function render({ params, navigate }) {
  const editing = !!params.id;
  const source = editing ? S.exerciseById(params.id) : null;
  if (editing && !source) return emptyState({ iconName: 'search', title: 'Exercise not found' });

  const d = {
    name: source?.name || '',
    description: source?.description || '',
    primaryMuscles: [...(source?.primaryMuscles || [])],
    secondaryMuscles: [...(source?.secondaryMuscles || [])],
    categories: [...(source?.categories || [])],
    equipment: [...(source?.equipment || [])],
    difficulty: source?.difficulty || 'beginner',
    mechanic: source?.mechanic || 'compound',
    movement: source?.movement || 'push',
    force: source?.force || 'push',
    tracking: source?.tracking || 'weight_reps',
    pose: source?.pose || 'generic',
    unilateral: !!source?.unilateral,
    instructions: [...(source?.instructions || [])],
    mistakes: [...(source?.mistakes || [])],
    tips: [...(source?.tips || [])],
    cues: [...(source?.cues || [])],
    tags: [...(source?.tags || [])],
  };

  const root = h('.stack.stack-20', { style: { maxWidth: '640px', margin: '0 auto' } });

  const chipGroup = (items, selected, onToggle, getId = (x) => x.id, getName = (x) => x.name) => {
    const wrap = h('.row.wrap', { style: { gap: '7px' } });
    const draw = () => mount(wrap, ...items.map((it) => {
      const id = getId(it), on = selected().includes(id);
      return h(`button.chip${on ? '.on' : ''}`, { type: 'button', onclick: () => { onToggle(id); draw(); } }, getName(it));
    }));
    draw();
    return wrap;
  };

  const listEditor = (label, key, placeholder) => {
    const wrap = h('.stack.stack-8');
    const draw = () => mount(wrap, ...d[key].map((val, i) =>
      h('.row', { style: { gap: '8px' } },
        h('span.t-xs.dim', { style: { width: '18px', flex: 'none', paddingTop: '12px' } }, `${i + 1}`),
        h('input.input.grow', { value: val, oninput: (e) => { d[key][i] = e.target.value; } }),
        h('button.btn.btn-icon.btn-ghost', { type: 'button', 'aria-label': 'Remove',
          onclick: () => { d[key].splice(i, 1); draw(); } }, icon('x')))),
      h('button.btn.btn-sm', { type: 'button', onclick: () => { d[key].push(''); draw(); } },
        icon('plus'), `Add ${label.toLowerCase().replace(/s$/, '')}`));
    draw();
    return h('.field', h('label.label', label), wrap);
  };

  const preview = h('.demo', demoSVG(d.pose, { highlight: d.primaryMuscles }));
  const redrawPreview = () => mount(preview, demoSVG(d.pose, { highlight: d.primaryMuscles }));

  const musclesByRegion = {};
  for (const m of S.muscles()) (musclesByRegion[m.region] ||= []).push(m);

  append(root, [
    h('.card.card-pad.stack.stack-14',
      h('.field', h('label.label', 'Name'),
        h('input.input', { value: d.name, placeholder: 'e.g. Landmine Press', autofocus: !editing,
          oninput: (e) => { d.name = e.target.value; } })),
      h('.field', h('label.label', 'Description'),
        h('textarea.textarea', { placeholder: 'What it trains and why you use it',
          oninput: (e) => { d.description = e.target.value; } }, d.description))),

    h('.card.card-pad.stack.stack-14',
      h('div.sb', 'Animation'),
      h('.t-xs.dim', 'Pick the movement pattern whose animated demo best matches this exercise.'),
      preview,
      h('select.select', { onchange: (e) => { d.pose = e.target.value; redrawPreview(); } },
        ...poseIds().sort().map((p) => h('option', { value: p, selected: p === d.pose }, prettify(p))))),

    h('.card.card-pad.stack.stack-14',
      h('div.sb', 'Muscles'),
      ...Object.entries(musclesByRegion).map(([region, ms]) => h('.field',
        h('label.label', `${region} — primary`),
        chipGroup(ms, () => d.primaryMuscles, (id) => {
          const i = d.primaryMuscles.indexOf(id);
          if (i >= 0) d.primaryMuscles.splice(i, 1);
          else { d.primaryMuscles.push(id); d.secondaryMuscles = d.secondaryMuscles.filter((x) => x !== id); }
        }))),
      h('.divider'),
      h('.field', h('label.label', 'Secondary muscles'),
        chipGroup(S.muscles(), () => d.secondaryMuscles, (id) => {
          const i = d.secondaryMuscles.indexOf(id);
          if (i >= 0) d.secondaryMuscles.splice(i, 1);
          else { d.secondaryMuscles.push(id); d.primaryMuscles = d.primaryMuscles.filter((x) => x !== id); }
        }))),

    h('.card.card-pad.stack.stack-14',
      h('.row-between', h('div.sb', 'Categories'),
        h('button.link', { onclick: () => navigate('/taxonomy') }, 'Manage')),
      h('.t-xs.dim', 'An exercise can belong to as many categories as you like.'),
      chipGroup(S.categories(), () => d.categories, (id) => {
        const i = d.categories.indexOf(id);
        if (i >= 0) d.categories.splice(i, 1); else d.categories.push(id);
      })),

    h('.card.card-pad.stack.stack-14',
      h('.row-between', h('div.sb', 'Equipment'),
        h('button.link', { onclick: () => addEquipment(() => navigate(location.hash.slice(1))) }, '+ Custom')),
      chipGroup(S.equipmentList(), () => d.equipment, (id) => {
        const i = d.equipment.indexOf(id);
        if (i >= 0) d.equipment.splice(i, 1); else d.equipment.push(id);
      })),

    h('.card.card-pad.stack.stack-14',
      h('div.sb', 'Classification'),
      h('.grid.grid-2',
        h('.field', h('label.label', 'Difficulty'),
          h('select.select', { onchange: (e) => { d.difficulty = e.target.value; } },
            ...DIFFICULTIES.map((x) => h('option', { value: x.id, selected: x.id === d.difficulty }, x.name)))),
        h('.field', h('label.label', 'Mechanic'),
          h('select.select', { onchange: (e) => { d.mechanic = e.target.value; } },
            ...MECHANICS.map((x) => h('option', { value: x.id, selected: x.id === d.mechanic }, x.name)))),
        h('.field', h('label.label', 'Movement'),
          h('select.select', { onchange: (e) => { d.movement = e.target.value; } },
            ...MOVEMENTS.map((x) => h('option', { value: x.id, selected: x.id === d.movement }, x.name)))),
        h('.field', h('label.label', 'Force'),
          h('select.select', { onchange: (e) => { d.force = e.target.value; } },
            ...['push', 'pull', 'static'].map((x) => h('option', { value: x, selected: x === d.force }, prettify(x)))))),
      h('.field', h('label.label', 'How sets are logged'),
        h('select.select', { onchange: (e) => { d.tracking = e.target.value; } },
          ...TRACKING_TYPES.map((x) => h('option', { value: x.id, selected: x.id === d.tracking }, x.name)))),
      h('.row-between',
        h('div', h('div.sb', 'Unilateral'), h('.t-xs.dim', 'Performed one side at a time')),
        h(`button.switch${d.unilateral ? '.on' : ''}`, { type: 'button', role: 'switch',
          onclick: (e) => { d.unilateral = !d.unilateral; e.currentTarget.classList.toggle('on', d.unilateral); } }))),

    h('.card.card-pad.stack.stack-14',
      h('div.sb', 'Guide'),
      listEditor('Instructions', 'instructions'),
      listEditor('Common mistakes', 'mistakes'),
      listEditor('Tips', 'tips'),
      listEditor('Form cues', 'cues')),

    h('.row', { style: { gap: '10px', paddingBottom: '10px' } },
      h('button.btn.grow', { onclick: () => history.back() }, 'Cancel'),
      h('button.btn.btn-primary.grow.btn-lg', { onclick: save }, icon('check'), 'Save exercise')),

    editing && source.custom ? h('button.btn.btn-danger.btn-block', { onclick: async () => {
      if (await confirmDelete('this exercise')) { S.deleteExercise(source.id); navigate('/exercises'); }
    } }, icon('trash'), 'Delete exercise') : null]);

  function save() {
    if (!d.name.trim()) { toast('Give the exercise a name', 'bad'); return; }
    d.instructions = d.instructions.filter((x) => x.trim());
    d.mistakes = d.mistakes.filter((x) => x.trim());
    d.tips = d.tips.filter((x) => x.trim());
    d.cues = d.cues.filter((x) => x.trim());
    if (editing) { S.updateExercise(source.id, d); toast('Exercise saved', 'good'); navigate(`/exercise/${source.id}`); }
    else { const ex = S.createExercise(d); toast('Exercise created', 'good'); navigate(`/exercise/${ex.id}`); }
  }

  return root;
}

function addEquipment(after) {
  let name = '';
  const ref = sheet({ title: 'Custom equipment',
    body: h('.field', h('label.label', 'Name'),
      h('input.input', { autofocus: true, placeholder: 'e.g. Landmine',
        oninput: (e) => { name = e.target.value; } })),
    foot: h('button.btn.btn-primary.btn-block', { onclick: () => {
      if (!name.trim()) return;
      S.createEquipment(name.trim()); ref.close(); toast('Equipment added', 'good'); after && after();
    } }, 'Add') });
}
