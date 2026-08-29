import { h, icon, mount, append } from '../lib/dom.js';
import * as S from '../store.js';
import { exercisePicker, exerciseThumb, lastPerfLine } from '../lib/components.js';
import { sheet, toast, confirmDelete, emptyState, makeSortable, dialog } from '../lib/ui.js';
import { lastPerformance } from '../lib/stats.js';
import { fmtWeight, uid, prettify } from '../lib/utils.js';
import { SET_TYPES } from '../data/taxonomy.js';

export const title = (ctx) => (ctx.params.id ? 'Edit workout' : 'New workout');

const BLOCK_KINDS = [
  { id: 'single', name: 'Straight sets', desc: 'One exercise at a time' },
  { id: 'superset', name: 'Superset', desc: 'Alternate between exercises with no rest' },
  { id: 'circuit', name: 'Circuit', desc: 'Round-robin through every exercise' },
  { id: 'dropset', name: 'Drop set group', desc: 'Reduce the weight and continue' },
];

export function render({ params, navigate }) {
  let t = params.id ? S.templateById(params.id) : null;
  if (!t) { t = S.createTemplate(); history.replaceState(null, '', `#/builder/${t.id}`); }

  const unit = S.settings().unit;
  const sessions = S.completedSessions();
  const root = h('.stack.stack-16', { style: { maxWidth: '760px', margin: '0 auto' } });
  const blocksEl = h('.stack.stack-12');

  const save = (patch) => { S.updateTemplate(t.id, patch); t = S.templateById(t.id); };
  const commitBlocks = () => save({ blocks: t.blocks });

  const totalEx = () => (t.blocks || []).reduce((n, b) => n + b.entries.length, 0);
  const totalSets = () => (t.blocks || []).reduce((n, b) =>
    n + b.entries.reduce((m, e) => m + e.sets.length, 0), 0);
  const estMinutes = () => Math.round((t.blocks || []).reduce((n, b) =>
    n + b.entries.reduce((m, e) => m + e.sets.length * ((e.rest || 90) + 40), 0), 0) / 60);

  /* ---------- set row ---------- */
  function setRow(entry, set, i, redraw) {
    const st = SET_TYPES.find((x) => x.id === set.type) || SET_TYPES[0];
    return h('.row', { style: { gap: '8px' } },
      h(`.set-num${st.cls ? `.${st.cls}` : ''}`, {
        title: st.name,
        onclick: () => cycleType(entry, set, redraw) }, st.id === 'normal' ? String(i + 1) : st.short),
      h('.row.grow', { style: { gap: '6px' } },
        h('input.set-input', { type: 'number', inputmode: 'numeric', min: 1, value: set.targetReps?.[0] ?? '',
          placeholder: 'min', 'aria-label': 'Minimum reps',
          onchange: (e) => { set.targetReps = [+e.target.value || 0, set.targetReps?.[1] ?? 0]; commitBlocks(); } }),
        h('span.dim', '–'),
        h('input.set-input', { type: 'number', inputmode: 'numeric', min: 1, value: set.targetReps?.[1] ?? '',
          placeholder: 'max', 'aria-label': 'Maximum reps',
          onchange: (e) => { set.targetReps = [set.targetReps?.[0] ?? 0, +e.target.value || 0]; commitBlocks(); } }),
        h('input.set-input', { type: 'number', inputmode: 'decimal', step: 'any',
          value: set.weight != null ? (unit === 'lb' ? +(set.weight / 0.45359237).toFixed(2) : set.weight) : '',
          placeholder: unit, 'aria-label': 'Target weight',
          onchange: (e) => {
            const v = parseFloat(e.target.value);
            set.weight = Number.isNaN(v) ? null : (unit === 'lb' ? v * 0.45359237 : v);
            commitBlocks();
          } })),
      h('button.iconbtn', { 'aria-label': 'Remove set', onclick: () => {
        entry.sets = entry.sets.filter((x) => x.id !== set.id); commitBlocks(); redraw();
      } }, icon('minus')));
  }

  function cycleType(entry, set, redraw) {
    const i = SET_TYPES.findIndex((x) => x.id === set.type);
    set.type = SET_TYPES[(i + 1) % SET_TYPES.length].id;
    commitBlocks(); redraw();
  }

  /* ---------- entry card ---------- */
  function entryCard(block, entry) {
    const ex = S.exerciseById(entry.exerciseId);
    if (!ex) return h('.card.card-pad', h('.t-sm.dim', 'Missing exercise'));
    const perf = lastPerformance(sessions, ex.id);
    const setsEl = h('.stack', { style: { gap: '5px' } });
    const redraw = () => mount(setsEl,
      h('.row.t-xs.dim', { style: { gap: '8px', padding: '0 2px 2px' } },
        h('span', { style: { width: '32px', flex: 'none', textAlign: 'center' } }, 'SET'),
        h('span.grow', { style: { textAlign: 'center' } }, 'TARGET REPS · WEIGHT'),
        h('span', { style: { width: '38px' } })),
      ...entry.sets.map((s, i) => setRow(entry, s, i, redraw)),
      h('.row', { style: { gap: '8px', marginTop: '4px' } },
        h('button.btn.btn-sm.grow', { onclick: () => {
          const prev = entry.sets[entry.sets.length - 1];
          entry.sets.push({ id: uid('s'), type: 'normal',
            targetReps: prev ? [...(prev.targetReps || [8, 12])] : [8, 12],
            weight: prev ? prev.weight : null });
          commitBlocks(); redraw();
        } }, icon('plus'), 'Add set'),
        h('button.btn.btn-sm', { onclick: () => {
          entry.sets.unshift({ id: uid('s'), type: 'warmup', targetReps: [8, 10], weight: null });
          commitBlocks(); redraw();
        } }, 'Warm-up')));
    redraw();

    return h('.card.card-pad.stack.stack-10', { dataset: { sortId: entry.id } },
      h('.row', { style: { gap: '10px' } },
        h('span.drag-handle', { title: 'Drag to reorder' }, icon('drag')),
        exerciseThumb(ex),
        h('.grow',
          h('.row', { style: { gap: '6px' } },
            h('button.ex-name', { style: { background: 'none', border: 'none', padding: 0, textAlign: 'left', cursor: 'pointer' },
              onclick: () => navigate(`/exercise/${ex.id}`) }, ex.name)),
          h('.ex-meta', h('span', (ex.primaryMuscles || []).map((m) => S.muscleName(m)).join(', '))),
          h('div', { style: { marginTop: '3px' } }, lastPerfLine(perf, ex, unit))),
        h('button.iconbtn', { 'aria-label': 'Exercise options',
          onclick: () => entryMenu(block, entry, ex) }, icon('more'))),
      setsEl,
      h('.row', { style: { gap: '8px' } },
        h('.field.grow', h('label.label', 'Rest between sets'),
          h('select.select.input-inline', { onchange: (e) => { entry.rest = +e.target.value; commitBlocks(); } },
            ...[30, 45, 60, 75, 90, 120, 150, 180, 210, 240, 300].map((v) =>
              h('option', { value: v, selected: (entry.rest ?? 90) === v },
                v >= 60 ? `${Math.floor(v / 60)}:${String(v % 60).padStart(2, '0')}` : `${v}s`)))),
        h('.field.grow', h('label.label', 'Progression'),
          h('button.btn.btn-sm', { style: { width: '100%', justifyContent: 'space-between' },
            onclick: () => openEntryProgression(entry, ex, commitBlocks) },
            h('span', `${entry.progression?.targetSets ?? 3} × ${entry.progression?.repRange?.[0] ?? 8}–${entry.progression?.repRange?.[1] ?? 12}`),
            icon('chevronRight', 15)))),
      entry.notes !== undefined ? h('input.input.input-inline', { placeholder: 'Notes for this exercise…',
        value: entry.notes || '', oninput: (e) => { entry.notes = e.target.value; S.updateTemplate(t.id, { blocks: t.blocks }); } }) : null);
  }

  function entryMenu(block, entry, ex) {
    const ref = sheet({ title: ex.name, body: h('.stack',
      h('button.listrow', { onclick: () => { ref.close(); navigate(`/exercise/${ex.id}`); } },
        icon('info'), h('.grow.sb', 'Exercise details'), icon('chevronRight')),
      h('button.listrow', { onclick: () => { ref.close();
        exercisePicker({ title: 'Replace with', onPick: (n) => {
          entry.exerciseId = n.id; commitBlocks(); drawBlocks(); toast(`Replaced with ${n.name}`);
        } }); } }, icon('swap'), h('.grow.sb', 'Replace exercise'), icon('chevronRight')),
      h('button.listrow', { onclick: () => {
        const copy = { ...JSON.parse(JSON.stringify(entry)), id: uid('en') };
        copy.sets = copy.sets.map((s) => ({ ...s, id: uid('s') }));
        block.entries.splice(block.entries.indexOf(entry) + 1, 0, copy);
        commitBlocks(); drawBlocks(); ref.close();
      } }, icon('copy'), h('.grow.sb', 'Duplicate')),
      h('button.listrow', { style: { color: 'var(--bad)' }, onclick: () => {
        block.entries = block.entries.filter((e) => e.id !== entry.id);
        t.blocks = t.blocks.filter((b) => b.entries.length || b.id !== block.id);
        commitBlocks(); drawBlocks(); ref.close();
      } }, icon('trash'), h('.grow.sb', 'Remove from workout')),
    ) });
  }

  /* ---------- block ---------- */
  function blockCard(block, bi) {
    const kind = BLOCK_KINDS.find((k) => k.id === block.kind) || BLOCK_KINDS[0];
    const entriesEl = h('.stack.stack-10');
    mount(entriesEl, ...block.entries.map((en) => entryCard(block, en)));
    makeSortable(entriesEl, { onReorder: (ids) => {
      const map = new Map(block.entries.map((e) => [e.id, e]));
      block.entries = ids.map((id) => map.get(id)).filter(Boolean);
      commitBlocks();
    } });

    const isGrouped = block.kind !== 'single';
    return h('div', { style: isGrouped ? {
      border: '1.5px dashed var(--accent-line)', borderRadius: 'var(--r-lg)', padding: '12px', background: 'var(--accent-soft)',
    } : null },
      isGrouped ? h('.row-between', { style: { marginBottom: '10px' } },
        h('.row', { style: { gap: '8px' } },
          h('span.tag.tag-accent', kind.name.toUpperCase()),
          block.kind === 'circuit' ? h('span.t-xs.dim', `${block.rounds} rounds`) : null),
        h('.row', { style: { gap: '4px' } },
          block.kind === 'circuit' ? h('.stepper', { style: { height: '30px' } },
            h('button', { onclick: () => { block.rounds = Math.max(1, block.rounds - 1); commitBlocks(); drawBlocks(); } }, '−'),
            h('input', { value: block.rounds, readonly: true, style: { width: '34px', height: '30px' } }),
            h('button', { onclick: () => { block.rounds += 1; commitBlocks(); drawBlocks(); } }, '+')) : null,
          h('button.iconbtn', { 'aria-label': 'Ungroup', onclick: () => {
            block.kind = 'single'; commitBlocks(); drawBlocks();
          } }, icon('x')))) : null,
      entriesEl,
      h('.row', { style: { gap: '8px', marginTop: '10px' } },
        h('button.btn.btn-sm.grow', { onclick: () => exercisePicker({ multi: true,
          title: `Add to ${isGrouped ? kind.name.toLowerCase() : 'workout'}`,
          onPick: (ex) => { block.entries.push(S.newEntry(ex.id)); commitBlocks(); drawBlocks(); } }) },
          icon('plus'), 'Add exercise'),
        !isGrouped && block.entries.length > 1 ? h('button.btn.btn-sm', {
          onclick: () => groupSheet(block, commitBlocks, drawBlocks) }, icon('link'), 'Group') : null));
  }

  function drawBlocks() {
    t = S.templateById(t.id);
    if (!t.blocks?.length) {
      mount(blocksEl, emptyState({ iconName: 'dumbbell', title: 'No exercises yet',
        message: 'Add your first exercise to start building this workout.',
        action: h('button.btn.btn-primary', { onclick: addExercises }, icon('plus'), 'Add exercises') }));
    } else {
      mount(blocksEl, ...t.blocks.map(blockCard));
    }
    mount(summaryEl,
      h('span', `${totalEx()} exercises`), h('i.dot'),
      h('span', `${totalSets()} sets`), h('i.dot'),
      h('span', `~${estMinutes()} min`));
  }

  function addExercises() {
    exercisePicker({ multi: true, title: 'Add exercises', onPick: (ex) => {
      if (!t.blocks.length) t.blocks.push(S.blockOf([]));
      t.blocks[t.blocks.length - 1].entries.push(S.newEntry(ex.id));
      commitBlocks(); drawBlocks();
    } });
  }

  const summaryEl = h('.ex-meta');

  append(root, [
    h('.card.card-pad.stack.stack-12',
      h('.field', h('label.label', 'Workout name'),
        h('input.input', { value: t.name, placeholder: 'e.g. Upper A',
          oninput: (e) => save({ name: e.target.value }) })),
      h('.grid.grid-2',
        h('.field', h('label.label', 'Type / tag'),
          h('input.input', { value: t.type || '', placeholder: 'Push, Upper, Legs…',
            oninput: (e) => save({ type: e.target.value }) })),
        h('.field', h('label.label', 'Focus'),
          h('button.btn', { style: { width: '100%', justifyContent: 'space-between' },
            onclick: () => focusSheet(t, save, () => { location.hash = location.hash; }) },
            h('span.t-sm', (t.targetMuscles || []).length
              ? `${t.targetMuscles.length} muscle${t.targetMuscles.length > 1 ? 's' : ''}` : 'Any'),
            icon('chevronRight', 15)))),
      h('.field', h('label.label', 'Notes'),
        h('textarea.textarea', { placeholder: 'Anything you want to remember for this session',
          style: { minHeight: '60px' }, oninput: (e) => save({ notes: e.target.value }) }, t.notes || '')),
      summaryEl),

    blocksEl,

    h('.row', { style: { gap: '10px' } },
      h('button.btn.grow', { onclick: addExercises }, icon('plus'), 'Add exercise'),
      h('button.btn.grow', { onclick: () => {
        t.blocks.push(S.blockOf([], 'superset')); commitBlocks(); drawBlocks();
      } }, icon('link'), 'New superset')),

    h('.row', { style: { gap: '10px', paddingTop: '4px' } },
      h('button.btn.btn-lg.btn-primary.grow', { onclick: () => {
        if (!totalEx()) { toast('Add at least one exercise first', 'bad'); return; }
        if (S.activeSession()) { navigate('/active'); return; }
        S.startSession({ templateId: t.id, name: t.name });
        navigate('/active');
      } }, icon('play'), 'Start this workout'),
      h('button.btn.btn-lg', { onclick: () => navigate('/workouts') }, 'Done')),

    h('button.btn.btn-danger.btn-block', { onclick: async () => {
      if (await confirmDelete('this workout')) { S.deleteTemplate(t.id); navigate('/workouts'); }
    } }, icon('trash'), 'Delete workout')]);

  drawBlocks();
  return root;
}

function groupSheet(block, commit, redraw) {
  const ref = sheet({ title: 'Group exercises', body: h('.stack',
    ...BLOCK_KINDS.filter((k) => k.id !== 'single').map((k) =>
      h('button.listrow', { onclick: () => {
        block.kind = k.id; if (k.id === 'circuit') block.rounds = block.rounds || 3;
        commit(); redraw(); ref.close();
      } }, h('.grow', h('div.sb', k.name), h('.t-xs.dim', k.desc)), icon('chevronRight')))) });
}

function focusSheet(t, save, redraw) {
  const sel = new Set(t.targetMuscles || []);
  const byRegion = {};
  for (const m of S.muscles()) (byRegion[m.region] ||= []).push(m);
  const wrap = h('.stack.stack-16');
  const draw = () => mount(wrap, ...Object.entries(byRegion).map(([r, ms]) =>
    h('.field', h('label.label', r), h('.row.wrap', { style: { gap: '7px' } },
      ...ms.map((m) => h(`button.chip${sel.has(m.id) ? '.on' : ''}`, { onclick: () => {
        sel.has(m.id) ? sel.delete(m.id) : sel.add(m.id); draw();
      } }, m.name))))));
  draw();
  const ref = sheet({ title: 'Target muscles', body: wrap,
    foot: h('button.btn.btn-primary.btn-block', { onclick: () => {
      save({ targetMuscles: [...sel] }); ref.close(); redraw();
    } }, 'Save') });
}

function openEntryProgression(entry, ex, commit) {
  const r = { ...(entry.progression || S.ruleFor(ex.id)) };
  const unit = S.settings().unit;
  const ref = sheet({ title: `Progression — ${ex.name}`, body: h('.stack.stack-14',
    h('.grid.grid-2',
      h('.field', h('label.label', 'Target sets'),
        h('input.input', { type: 'number', min: 1, value: r.targetSets,
          oninput: (e) => { r.targetSets = Math.max(1, +e.target.value || 1); } })),
      h('.field', h('label.label', `Increment (${unit})`),
        h('input.input', { type: 'number', step: '0.25', value: unit === 'lb' ? +(r.incrementKg / 0.45359237).toFixed(1) : r.incrementKg,
          oninput: (e) => { const v = +e.target.value || 0; r.incrementKg = unit === 'lb' ? v * 0.45359237 : v; } }))),
    h('.grid.grid-2',
      h('.field', h('label.label', 'Min reps'),
        h('input.input', { type: 'number', min: 1, value: r.repRange[0],
          oninput: (e) => { r.repRange = [+e.target.value || 1, r.repRange[1]]; } })),
      h('.field', h('label.label', 'Max reps'),
        h('input.input', { type: 'number', min: 1, value: r.repRange[1],
          oninput: (e) => { r.repRange = [r.repRange[0], +e.target.value || 1]; } }))),
    h('.t-xs.dim', 'This overrides the exercise-level rule for this workout only.')),
    foot: h('button.btn.btn-primary.btn-block', { onclick: () => {
      entry.progression = r;
      entry.sets.forEach((s) => { s.targetReps = [...r.repRange]; });
      while (entry.sets.filter((s) => s.type !== 'warmup').length < r.targetSets) {
        entry.sets.push({ id: uid('s'), type: 'normal', targetReps: [...r.repRange], weight: null });
      }
      commit(); ref.close(); toast('Progression updated', 'good');
      location.hash = location.hash;
    } }, 'Save') });
}
