import { h, icon, mount } from '../lib/dom.js';
import * as S from '../store.js';
import { exercisePicker, exerciseThumb } from '../lib/components.js';
import { emptyState, sheet, toast, dialog, confirmDelete, makeSortable } from '../lib/ui.js';
import { LEVELS, GOALS } from '../data/taxonomy.js';
import { deepClone, DAY_ABBR, todayKey } from '../lib/utils.js';

export const title = (ctx) => S.splitById(ctx.params.id)?.name || 'Split';

export const actions = (ctx) => {
  const sp = S.splitById(ctx.params.id);
  if (!sp) return [];
  return [h('button.iconbtn', { 'aria-label': 'Options', onclick: () => menu(sp, ctx) }, icon('more'))];
};

export function render({ params, navigate, refresh }) {
  const split = S.splitById(params.id);
  if (!split) return emptyState({ iconName: 'search', title: 'Split not found' });

  const plan = S.get().activePlan;
  const isActive = plan?.splitId === split.id;
  const editable = !!split.custom;
  const idx = S.exerciseIndex();

  const patch = (p) => { S.updateSplit(split.id, p); };

  const dayCard = (day, i) => {
    const workoutCount = split.days.filter((d) => !d.rest).length;
    return h('.card.card-pad.stack.stack-10', { dataset: { sortId: String(i) } },
      h('.row-between',
        h('.row', { style: { gap: '10px' } },
          h('div', { style: { width: '34px', height: '34px', borderRadius: '11px', flex: 'none',
            display: 'grid', placeItems: 'center', fontSize: '11px', fontWeight: 800,
            background: day.rest ? 'var(--surface-3)' : 'var(--accent-soft)',
            color: day.rest ? 'var(--ink-3)' : 'var(--accent)' } }, `D${i + 1}`),
          h('div',
            editable
              ? h('input.input.input-inline', { value: day.name, style: { fontWeight: 650, padding: '0 8px' },
                  onchange: (e) => { day.name = e.target.value; patch({ days: split.days }); } })
              : h('div.sb', day.name),
            h('.t-xs.dim', { style: { marginTop: '2px' } },
              day.rest ? 'Rest & recovery'
                : `${(day.exercises || []).length} exercises${(day.focus || []).length ? ` · ${day.focus.map((m) => S.muscleName(m)).join(', ')}` : ''}`))),
        h('.row', { style: { gap: '4px' } },
          editable ? h('button.iconbtn', { 'aria-label': 'Day options',
            onclick: () => dayMenu(split, day, i, refresh) }, icon('more')) : null,
          !day.rest && isActive && plan.templateIds?.[i]
            ? h('button.btn.btn-sm.btn-primary', { onclick: () => {
                if (S.activeSession()) { navigate('/active'); return; }
                S.startSession({ templateId: plan.templateIds[i], splitId: split.id, dayIndex: i });
                navigate('/active');
              } }, icon('play', 14), 'Start') : null)),
      !day.rest && (day.exercises || []).length ? h('.stack', { style: { gap: '6px' } },
        ...day.exercises.map((x, k) => {
          const ex = idx[x.exerciseId];
          return h('.row', { style: { gap: '10px', padding: '4px 0' } },
            ex ? exerciseThumb(ex) : null,
            h('.grow',
              h('.t-sm.sb', ex?.name || 'Unknown exercise'),
              h('.t-xs.dim', `${x.sets} × ${x.repRange[0]}–${x.repRange[1]}${x.rest ? ` · ${x.rest}s rest` : ''}`)),
            editable ? h('button.iconbtn', { 'aria-label': 'Remove', onclick: () => {
              day.exercises.splice(k, 1); patch({ days: split.days }); refresh();
            } }, icon('x')) : ex ? h('button.iconbtn', { onclick: () => navigate(`/exercise/${ex.id}`) }, icon('chevronRight')) : null);
        })) : null,
      editable && !day.rest ? h('button.btn.btn-sm', { onclick: () => {
        exercisePicker({ multi: true, title: `Add to ${day.name}`, onPick: (ex) => {
          const rule = S.ruleFor(ex.id);
          day.exercises = day.exercises || [];
          day.exercises.push({ exerciseId: ex.id, sets: rule.targetSets, repRange: [...rule.repRange],
            rest: S.settings().defaultRestSec });
          patch({ days: split.days }); refresh();
        } });
      } }, icon('plus'), 'Add exercise') : null);
  };

  const daysEl = h('.stack.stack-12');
  mount(daysEl, ...split.days.map(dayCard));

  return h('.stack.stack-16',
    h('div',
      h('h1', split.name),
      h('.t-sm.muted', { style: { marginTop: '4px' } }, split.tagline || '')),
    h('.row.wrap', { style: { gap: '6px' } },
      h('span.tag.tag-accent', `${split.daysPerWeek}×/week`),
      h('span.tag', `~${split.sessionMin} min`),
      h('span.tag', LEVELS.find((l) => l.id === split.level)?.name || split.level),
      ...(split.goals || []).map((g) => h('span.tag', GOALS.find((x) => x.id === g)?.name || g)),
      split.custom ? h('span.tag.tag-info', 'Custom') : null),
    split.desc ? h('p.muted', { style: { lineHeight: 1.65 } }, split.desc) : null,
    split.notes ? h('.card.card-pad', { style: { background: 'var(--surface-2)' } },
      h('.row', { style: { gap: '10px', alignItems: 'flex-start' } },
        h('span', { style: { color: 'var(--accent)' } }, icon('info', 17)),
        h('.t-sm.muted', { style: { lineHeight: 1.55 } }, split.notes))) : null,

    isActive
      ? h('.card.card-pad', { style: { borderColor: 'var(--accent)' } },
          h('.row-between',
            h('.row', { style: { gap: '8px' } },
              h('span', { style: { color: 'var(--accent)' } }, icon('check', 17)),
              h('div.sb', 'Following this split')),
            h('button.btn.btn-sm', { onclick: () => { S.clearPlan(); toast('Stopped following'); refresh(); } }, 'Stop')))
      : h('button.btn.btn-lg.btn-primary.btn-block', { onclick: async () => {
          if (S.get().activePlan) {
            const ok = await dialog({ title: 'Replace your current plan?',
              message: 'Workout templates generated by the previous split are replaced. Your logged history is untouched.',
              confirmText: 'Switch', iconName: 'refresh' });
            if (!ok) return;
          }
          S.activateSplit(split.id);
          toast(`${split.name} activated — templates created`, 'good');
          refresh();
        } }, icon('check'), 'Use this split'),

    h('.row-between', h('h2', 'Weekly structure'),
      editable ? h('span.t-xs.dim', 'Drag to reorder') : null),
    daysEl,

    editable ? h('.row', { style: { gap: '10px' } },
      h('button.btn.grow', { onclick: () => {
        split.days.push({ name: `Day ${split.days.length + 1}`, focus: [], exercises: [] });
        patch({ days: split.days }); refresh();
      } }, icon('plus'), 'Add training day'),
      h('button.btn.grow', { onclick: () => {
        split.days.push({ name: 'Rest', rest: true });
        patch({ days: split.days }); refresh();
      } }, 'Add rest day')) : null,

    !editable ? h('button.btn.btn-block', { onclick: () => {
      const c = S.duplicateSplit(split.id); navigate(`/split/${c.id}`);
      toast('Copy created — edit it however you like', 'good');
    } }, icon('copy'), 'Duplicate and customise') : null);
}

function dayMenu(split, day, i, refresh) {
  const ref = sheet({ title: day.name, body: h('.stack',
    h('button.listrow', { onclick: () => {
      day.rest = !day.rest;
      if (day.rest) { day.name = 'Rest'; delete day.exercises; }
      else { day.name = `Day ${i + 1}`; day.exercises = []; day.focus = []; }
      S.updateSplit(split.id, { days: split.days }); ref.close(); refresh();
    } }, icon('swap'), h('.grow.sb', day.rest ? 'Make it a training day' : 'Make it a rest day')),
    !day.rest ? h('button.listrow', { onclick: () => { ref.close(); focusSheet(split, day, refresh); } },
      icon('target'), h('.grow.sb', 'Set focus muscles'), icon('chevronRight')) : null,
    h('button.listrow', { onclick: () => {
      split.days.splice(i + 1, 0, JSON.parse(JSON.stringify(day)));
      S.updateSplit(split.id, { days: split.days }); ref.close(); refresh();
    } }, icon('copy'), h('.grow.sb', 'Duplicate day')),
    h('button.listrow', { style: { color: 'var(--bad)' }, onclick: () => {
      split.days.splice(i, 1);
      S.updateSplit(split.id, { days: split.days }); ref.close(); refresh();
    } }, icon('trash'), h('.grow.sb', 'Delete day')),
  ) });
}

function focusSheet(split, day, refresh) {
  const sel = new Set(day.focus || []);
  const byRegion = {};
  for (const m of S.muscles()) (byRegion[m.region] ||= []).push(m);
  const wrap = h('.stack.stack-14');
  const draw = () => mount(wrap, ...Object.entries(byRegion).map(([r, ms]) =>
    h('.field', h('label.label', r), h('.row.wrap', { style: { gap: '7px' } },
      ...ms.map((m) => h(`button.chip${sel.has(m.id) ? '.on' : ''}`,
        { onclick: () => { sel.has(m.id) ? sel.delete(m.id) : sel.add(m.id); draw(); } }, m.name))))));
  draw();
  const ref = sheet({ title: 'Focus muscles', body: wrap,
    foot: h('button.btn.btn-primary.btn-block', { onclick: () => {
      day.focus = [...sel]; S.updateSplit(split.id, { days: split.days }); ref.close(); refresh();
    } }, 'Save') });
}

function menu(split, ctx) {
  const ref = sheet({ title: split.name, body: h('.stack',
    h('button.listrow', { onclick: () => { const c = S.duplicateSplit(split.id); ref.close(); ctx.navigate(`/split/${c.id}`); } },
      icon('copy'), h('.grow.sb', 'Duplicate'), icon('chevronRight')),
    split.custom ? h('button.listrow', { onclick: () => { ref.close(); editMeta(split, ctx); } },
      icon('edit'), h('.grow.sb', 'Edit details'), icon('chevronRight')) : null,
    h('button.listrow', { onclick: () => {
      ref.close();
      split.days.forEach((d, i) => { if (!d.rest) S.templateFromSplitDay(split, d, i); });
      toast('Workout templates created', 'good'); ctx.navigate('/workouts');
    } }, icon('download'), h('.grow.sb', 'Copy days to my workouts')),
    h('button.listrow', { style: { color: 'var(--bad)' }, onclick: async () => {
      ref.close();
      if (await confirmDelete(split.custom ? 'this split' : 'from your list',
        split.custom ? undefined : 'The predefined split is hidden. You can restore it in Settings.')) {
        S.deleteSplit(split.id); ctx.navigate('/splits');
      }
    } }, icon('trash'), h('.grow.sb', split.custom ? 'Delete split' : 'Hide split')),
  ) });
}

function editMeta(split, ctx) {
  const d = { name: split.name, tagline: split.tagline || '', desc: split.desc || '',
    level: split.level, sessionMin: split.sessionMin || 60 };
  const ref = sheet({ title: 'Split details', body: h('.stack.stack-14',
    h('.field', h('label.label', 'Name'),
      h('input.input', { value: d.name, oninput: (e) => { d.name = e.target.value; } })),
    h('.field', h('label.label', 'Tagline'),
      h('input.input', { value: d.tagline, placeholder: 'One-line summary', oninput: (e) => { d.tagline = e.target.value; } })),
    h('.field', h('label.label', 'Description'),
      h('textarea.textarea', { oninput: (e) => { d.desc = e.target.value; } }, d.desc)),
    h('.grid.grid-2',
      h('.field', h('label.label', 'Level'),
        h('select.select', { onchange: (e) => { d.level = e.target.value; } },
          ...LEVELS.map((l) => h('option', { value: l.id, selected: l.id === d.level }, l.name)))),
      h('.field', h('label.label', 'Session minutes'),
        h('input.input', { type: 'number', value: d.sessionMin, oninput: (e) => { d.sessionMin = +e.target.value || 60; } })))),
    foot: h('button.btn.btn-primary.btn-block', { onclick: () => {
      S.updateSplit(split.id, d); ref.close(); ctx.refresh();
    } }, 'Save') });
}
