import { h, icon, mount, append } from '../lib/dom.js';
import * as S from '../store.js';
import { exerciseCard, favButton, diffOf, exerciseTier } from '../lib/components.js';
import { emptyState, sheet, segmented, toast } from '../lib/ui.js';
import { matchScore, debounce } from '../lib/utils.js';
import { DIFFICULTIES, MOVEMENTS, MECHANICS } from '../data/taxonomy.js';
import { demoSVG } from '../lib/motion.js';

export const title = 'Exercises';
export const actions = () => [
  h('button.iconbtn', { 'aria-label': 'New exercise',
    onclick: () => (location.hash = '#/exercise-new') }, icon('plus')),
];

/* Filters persist for the lifetime of the page so returning from a detail
   view keeps your place. */
const F = { q: '', cat: 'all', muscles: [], equipment: [], difficulty: [], mechanic: [], movement: [], view: 'list', sort: 'name' };

export function render({ navigate, query }) {
  if (query.q !== undefined) F.q = query.q;
  if (query.muscle) { F.muscles = [query.muscle]; F.cat = 'all'; }
  if (query.cat) F.cat = query.cat;

  const listEl = h('.stack.stack-8');
  const countEl = h('span.t-xs.dim');
  const chipRow = h('.chiprow');
  const activeFiltersEl = h('.row.wrap', { style: { gap: '6px' } });

  const cats = S.categories();
  const buildChips = () => mount(chipRow,
    ...[{ id: 'all', name: 'All' }, { id: 'curated', name: '★ Curated' },
      { id: 'favorites', name: 'Favourites' },
      { id: 'recent', name: 'Recent' }, { id: 'custom', name: 'My exercises' }, ...cats]
      .map((c) => h(`button.chip${F.cat === c.id ? '.on' : ''}`,
        { onclick: () => { F.cat = c.id; buildChips(); build(); } }, c.name)));

  const activeCount = () => F.muscles.length + F.equipment.length + F.difficulty.length
    + F.mechanic.length + F.movement.length;

  function apply() {
    let list = S.exercises();
    const recent = S.get().recentExercises;
    if (F.cat === 'curated') list = list.filter((e) => exerciseTier(e).id === 'curated');
    else if (F.cat === 'favorites') list = list.filter((e) => S.isFavorite(e.id));
    else if (F.cat === 'recent') list = list.filter((e) => recent.includes(e.id));
    else if (F.cat === 'custom') list = list.filter((e) => e.custom || e.edited);
    else if (F.cat !== 'all') list = list.filter((e) => (e.categories || []).includes(F.cat));

    if (F.muscles.length) list = list.filter((e) =>
      F.muscles.some((m) => (e.primaryMuscles || []).includes(m) || (e.secondaryMuscles || []).includes(m)));
    if (F.equipment.length) list = list.filter((e) => F.equipment.some((q) => (e.equipment || []).includes(q)));
    if (F.difficulty.length) list = list.filter((e) => F.difficulty.includes(e.difficulty));
    if (F.mechanic.length) list = list.filter((e) => F.mechanic.includes(e.mechanic));
    if (F.movement.length) list = list.filter((e) => F.movement.includes(e.movement));

    if (F.q.trim()) {
      list = list.map((e) => ({ e, s: Math.max(
        matchScore(e.name, F.q),
        ...(e.primaryMuscles || []).map((m) => matchScore(S.muscleName(m), F.q) * 0.6),
        ...(e.equipment || []).map((q) => matchScore(S.equipmentName(q), F.q) * 0.4),
        ...(e.tags || []).map((t) => matchScore(t, F.q) * 0.5)) }))
        .filter((x) => x.s > 0).sort((a, b) => b.s - a.s).map((x) => x.e);
    } else {
      const sorters = {
        name: (a, b) => a.name.localeCompare(b.name),
        difficulty: (a, b) => diffOf(a.difficulty).order - diffOf(b.difficulty).order || a.name.localeCompare(b.name),
        muscle: (a, b) => S.muscleName(a.primaryMuscles?.[0]).localeCompare(S.muscleName(b.primaryMuscles?.[0])) || a.name.localeCompare(b.name),
        recent: (a, b) => (recent.indexOf(a.id) + 1 || 999) - (recent.indexOf(b.id) + 1 || 999),
      };
      list = [...list].sort(sorters[F.sort] || sorters.name);
    }
    return list;
  }

  function build() {
    const list = apply();
    countEl.textContent = `${list.length} exercise${list.length === 1 ? '' : 's'}`;

    mount(activeFiltersEl, ...[
      ...F.muscles.map((m) => ['muscles', m, S.muscleName(m)]),
      ...F.equipment.map((q) => ['equipment', q, S.equipmentName(q)]),
      ...F.difficulty.map((d) => ['difficulty', d, diffOf(d).name]),
      ...F.mechanic.map((m) => ['mechanic', m, m === 'compound' ? 'Compound' : 'Isolation']),
      ...F.movement.map((m) => ['movement', m, MOVEMENTS.find((x) => x.id === m)?.name || m]),
    ].map(([key, val, label]) => h('button.chip.chip-sm.on',
      { onclick: () => { F[key] = F[key].filter((x) => x !== val); build(); } }, label, icon('x', 12))),
      activeCount() > 1 ? h('button.chip.chip-sm', { onclick: () => {
        F.muscles = []; F.equipment = []; F.difficulty = []; F.mechanic = []; F.movement = []; build();
      } }, 'Clear all') : null);

    if (!list.length) {
      mount(listEl, emptyState({ iconName: 'search', title: 'No exercises found',
        message: F.q ? `Nothing matches “${F.q}”. Try a different term or clear your filters.`
          : 'No exercises match the current filters.',
        action: h('button.btn', { onclick: () => {
          F.q = ''; F.cat = 'all'; F.muscles = []; F.equipment = []; F.difficulty = [];
          F.mechanic = []; F.movement = [];
          const inp = document.querySelector('#ex-search'); if (inp) inp.value = '';
          buildChips(); build();
        } }, 'Reset filters') }));
      return;
    }

    if (F.view === 'grid') {
      listEl.className = 'grid grid-auto';
      mount(listEl, ...list.map((ex) => h('.card.card-hover', { onclick: () => navigate(`/exercise/${ex.id}`),
        style: { overflow: 'hidden' } },
        h('div', { style: { aspectRatio: '4/3', background: 'var(--surface-2)' } }, exerciseCardArt(ex)),
        h('.card-pad', { style: { padding: '10px 12px 12px' } },
          h('.ex-name', ex.name),
          h('.ex-meta', h('span', (ex.primaryMuscles || []).map((m) => S.muscleName(m)).join(', ')))))));
    } else {
      listEl.className = 'stack stack-8';
      mount(listEl, ...list.map((ex) => exerciseCard(ex, {
        onClick: () => navigate(`/exercise/${ex.id}`),
        right: h('.row', { style: { gap: '2px' } }, favButton(ex.id), icon('chevronRight')),
      })));
    }
  }

  const onSearch = debounce((v) => { F.q = v; build(); }, 160);

  const root = h('.stack.stack-14',
    h('.search',
      icon('search'),
      h('input.input#ex-search', { placeholder: `Search ${S.exercises().length} exercises…`, value: F.q, type: 'search',
        oninput: (e) => onSearch(e.target.value) })),
    chipRow,
    h('.row-between',
      h('.row', { style: { gap: '8px' } },
        h(`button.chip${activeCount() ? '.on' : ''}`, { onclick: () => openFilters(build) },
          icon('filter', 14), 'Filters', activeCount() ? ` (${activeCount()})` : ''),
        countEl),
      h('.row', { style: { gap: '4px' } },
        h('button.iconbtn', { 'aria-label': 'Sort', onclick: () => openSort(build) }, icon('swap')),
        h('button.iconbtn', { 'aria-label': 'Toggle view',
          onclick: (e) => { F.view = F.view === 'list' ? 'grid' : 'list'; build();
            e.currentTarget.replaceChildren(icon(F.view === 'list' ? 'grid' : 'list')); } },
          icon(F.view === 'list' ? 'grid' : 'list')))),
    activeFiltersEl,
    listEl);

  buildChips(); build();
  return root;
}

/* Grid tiles show the live animated demo — it reads far better than a still. */
const exerciseCardArt = (ex) => demoSVG(ex.pose || 'generic', { highlight: ex.primaryMuscles || [] });

function openSort(rerender) {
  const opts = [['name', 'Name (A–Z)'], ['muscle', 'Muscle group'], ['difficulty', 'Difficulty'], ['recent', 'Recently used']];
  const ref = sheet({ title: 'Sort by', body: h('.stack',
    ...opts.map(([id, label]) => h('button.listrow', { onclick: () => { F.sort = id; rerender(); ref.close(); } },
      h('.grow.sb', label), F.sort === id ? icon('check') : null))) });
}

function openFilters(rerender) {
  const body = h('.stack.stack-20');
  const group = (label, items, key, getName) => {
    const wrap = h('.row.wrap', { style: { gap: '7px' } });
    const draw = () => mount(wrap, ...items.map((it) => {
      const id = typeof it === 'string' ? it : it.id;
      const on = F[key].includes(id);
      return h(`button.chip${on ? '.on' : ''}`, { onclick: () => {
        F[key] = on ? F[key].filter((x) => x !== id) : [...F[key], id];
        draw(); rerender();
      } }, getName(it));
    }));
    draw();
    return h('.field', h('label.label', label), wrap);
  };

  const byRegion = {};
  for (const m of S.muscles()) { (byRegion[m.region] ||= []).push(m); }

  append(body, [
    ...Object.entries(byRegion).map(([region, ms]) =>
      group(region, ms, 'muscles', (m) => m.name)),
    group('Equipment', S.equipmentList(), 'equipment', (e) => e.name),
    group('Difficulty', DIFFICULTIES, 'difficulty', (d) => d.name),
    group('Type', MECHANICS, 'mechanic', (m) => m.name),
    group('Movement pattern', MOVEMENTS, 'movement', (m) => m.name),
  ]);

  const ref = sheet({
    title: 'Filters', body,
    actions: h('button.link', { onclick: () => {
      F.muscles = []; F.equipment = []; F.difficulty = []; F.mechanic = []; F.movement = [];
      rerender(); ref.close();
    } }, 'Reset'),
    foot: h('button.btn.btn-primary.btn-block', { onclick: () => ref.close() }, 'Show results'),
  });
}
