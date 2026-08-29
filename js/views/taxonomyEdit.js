import { h, icon, mount } from '../lib/dom.js';
import * as S from '../store.js';
import { CATEGORIES, MUSCLES, EQUIPMENT, REGIONS } from '../data/taxonomy.js';
import { iconNames } from '../lib/dom.js';
import { sheet, toast, confirmDelete, emptyState } from '../lib/ui.js';
import { muscleGlyph } from '../lib/anatomy.js';

export const title = 'Categories & muscles';

const TABS = [['categories', 'Categories'], ['muscles', 'Muscle groups'], ['equipment', 'Equipment']];

export function render({ navigate, refresh }) {
  let tab = 'categories';
  const bodyEl = h('div');

  const draw = () => mount(bodyEl,
    tab === 'categories' ? categoriesTab(navigate, draw)
      : tab === 'muscles' ? musclesTab(draw) : equipmentTab(draw));

  const bar = h('.seg', ...TABS.map(([id, label]) =>
    h(`button${tab === id ? '.on' : ''}`, { onclick: (e) => {
      tab = id; [...bar.children].forEach((c) => c.classList.remove('on'));
      e.currentTarget.classList.add('on'); draw();
    } }, label)));
  draw();

  return h('.stack.stack-16', bar, bodyEl);
}

function countFor(catId) {
  return S.exercises().filter((e) => (e.categories || []).includes(catId)).length;
}

function categoriesTab(navigate, refresh) {
  const cats = S.categories();
  const hidden = S.get().hiddenCategories;
  return h('.stack.stack-12',
    h('.t-sm.muted', 'Categories group exercises however you like. An exercise can belong to several at once.'),
    h('.stack.stack-8', ...cats.map((c) => h('.card.card-pad',
      h('.row', { style: { gap: '12px' } },
        h('div', { style: { width: '38px', height: '38px', borderRadius: '12px', flex: 'none',
          background: `${c.color}22`, color: c.color, display: 'grid', placeItems: 'center' } }, icon(c.icon || 'folder')),
        h('.grow',
          h('.row', { style: { gap: '6px' } },
            h('div.sb', c.name),
            c.custom ? h('span.tag.tag-info', 'Custom') : null),
          h('.t-xs.dim', { style: { marginTop: '2px' } },
            `${countFor(c.id)} exercises`)),
        h('button.iconbtn', { 'aria-label': 'Edit', onclick: () => catSheet(c, refresh) }, icon('edit')),
        h('button.iconbtn', { 'aria-label': 'View', onclick: () => navigate(`/exercises?cat=${c.id}`) }, icon('chevronRight')))))),
    h('button.btn.btn-primary.btn-block', { onclick: () => catSheet(null, refresh) },
      icon('plus'), 'New category'),
    hidden.length ? h('.card.card-pad.stack.stack-10',
      h('div.sb', 'Hidden categories'),
      ...hidden.map((id) => {
        const c = CATEGORIES.find((x) => x.id === id);
        return h('.row-between', h('span.t-sm', c?.name || id),
          h('button.btn.btn-xs', { onclick: () => { S.restoreCategory(id); refresh(); } }, 'Restore'));
      })) : null);
}

function catSheet(existing, refresh) {
  const d = existing ? { ...existing } : { name: '', icon: 'folder', color: '#ff7a2c', muscles: [] };
  const ICONS = ['folder', 'dumbbell', 'layers', 'run', 'flame', 'bolt', 'shield', 'heart',
    'target', 'star', 'trophy', 'sparkle', 'book', 'grid', 'timer', 'library'];
  const COLORS = ['#ff6b4a', '#ff9f1c', '#ffc857', '#31d07a', '#00c2b2', '#4a9eff', '#a06bff', '#ff5d8f'];
  const body = h('.stack.stack-16');
  const draw = () => mount(body,
    h('.field', h('label.label', 'Name'),
      h('input.input', { value: d.name, autofocus: true, placeholder: 'e.g. Pull day',
        oninput: (e) => { d.name = e.target.value; } })),
    h('.field', h('label.label', 'Icon'),
      h('.row.wrap', { style: { gap: '7px' } }, ...ICONS.map((ic) =>
        h('button.iconbtn', { style: {
          background: d.icon === ic ? 'var(--accent-soft)' : 'var(--surface-2)',
          color: d.icon === ic ? 'var(--accent)' : 'var(--ink-2)' },
          onclick: () => { d.icon = ic; draw(); } }, icon(ic))))),
    h('.field', h('label.label', 'Colour'),
      h('.row.wrap', { style: { gap: '8px' } }, ...COLORS.map((c) =>
        h('button', { style: { width: '32px', height: '32px', borderRadius: '10px', background: c,
          border: d.color === c ? '2.5px solid var(--ink)' : 'none', cursor: 'pointer' },
          'aria-label': c, onclick: () => { d.color = c; draw(); } })))),
    existing && !existing.custom ? h('.t-xs.dim', 'Editing a predefined category creates a personal override. You can reset it by deleting the override.') : null,
    existing ? h('button.btn.btn-danger.btn-block', { onclick: async () => {
      if (await confirmDelete(`the “${existing.name}” category`,
        'Exercises keep existing — they are just removed from this category.')) {
        S.deleteCategory(existing.id); ref.close(); refresh();
      }
    } }, icon('trash'), existing.custom ? 'Delete category' : 'Hide category') : null);
  draw();
  const ref = sheet({ title: existing ? 'Edit category' : 'New category', body,
    foot: h('button.btn.btn-primary.btn-block', { onclick: () => {
      if (!d.name.trim()) { toast('Give it a name', 'bad'); return; }
      if (existing) S.updateCategory(existing.id, d); else S.createCategory(d);
      ref.close(); toast('Saved', 'good'); refresh();
    } }, 'Save') });
}

function musclesTab(refresh) {
  const byRegion = {};
  for (const m of S.muscles()) (byRegion[m.region] ||= []).push(m);
  const targets = S.settings().muscleTargets;
  return h('.stack.stack-14',
    h('.t-sm.muted', 'Muscle groups drive the body map, volume tracking and filtering. Set a weekly working-set target for any of them.'),
    ...Object.entries(byRegion).map(([region, ms]) => h('.stack.stack-8',
      h('h2', region),
      ...ms.map((m) => h('.card.card-pad',
        h('.row', { style: { gap: '12px' } },
          h('div', { style: { width: '34px', height: '34px', borderRadius: '11px', flex: 'none',
            background: `${m.color}22`, display: 'grid', placeItems: 'center' } }, muscleGlyph(m.id, 22)),
          h('.grow',
            h('.row', { style: { gap: '6px' } },
              h('div.sb', m.name), m.custom ? h('span.tag.tag-info', 'Custom') : null),
            h('.t-xs.dim', { style: { marginTop: '2px' } },
              `${S.exercises().filter((e) => (e.primaryMuscles || []).includes(m.id)).length} exercises`)),
          h('.field', { style: { width: '96px' } },
            h('label.label', { style: { fontSize: '10px' } }, 'Weekly sets'),
            h('input.input.input-inline', { type: 'number', min: 0, value: targets[m.id] ?? '',
              placeholder: '—', style: { textAlign: 'center' },
              onchange: (e) => {
                const v = parseInt(e.target.value, 10);
                S.setMuscleTarget(m.id, Number.isNaN(v) ? undefined : v);
                toast('Target updated');
              } })),
          m.custom ? h('button.iconbtn', { 'aria-label': 'Delete', onclick: async () => {
            if (await confirmDelete(`the “${m.name}” muscle group`)) { S.deleteMuscle(m.id); refresh(); }
          } }, icon('trash')) : null))))),
    h('button.btn.btn-primary.btn-block', { onclick: () => muscleSheet(refresh) },
      icon('plus'), 'New muscle group'));
}

function muscleSheet(refresh) {
  const d = { name: '', region: 'Full Body', color: '#ff7a2c' };
  const ref = sheet({ title: 'New muscle group', body: h('.stack.stack-14',
    h('.field', h('label.label', 'Name'),
      h('input.input', { autofocus: true, oninput: (e) => { d.name = e.target.value; } })),
    h('.field', h('label.label', 'Region'),
      h('select.select', { onchange: (e) => { d.region = e.target.value; } },
        ...REGIONS.map((r) => h('option', { value: r, selected: r === d.region }, r)))),
    h('.t-xs.dim', 'Custom muscle groups appear in filters and volume tracking. They are not drawn on the body map.')),
    foot: h('button.btn.btn-primary.btn-block', { onclick: () => {
      if (!d.name.trim()) { toast('Give it a name', 'bad'); return; }
      S.createMuscle(d); ref.close(); toast('Created', 'good'); refresh();
    } }, 'Create') });
}

function equipmentTab(refresh) {
  const list = S.equipmentList();
  return h('.stack.stack-12',
    h('.t-sm.muted', 'Equipment is used for filtering and for suggesting exercises you can actually perform.'),
    h('.card', { style: { overflow: 'hidden' } },
      ...list.map((e) => h('.listrow.static',
        h('.grow', h('div.sb', e.name),
          h('.t-xs.dim', `${S.exercises().filter((x) => (x.equipment || []).includes(e.id)).length} exercises`)),
        e.custom ? h('button.iconbtn', { 'aria-label': 'Delete', onclick: async () => {
          if (await confirmDelete(`“${e.name}”`)) { S.deleteEquipment(e.id); refresh(); }
        } }, icon('trash')) : h('span.tag', 'Built-in')))),
    h('button.btn.btn-primary.btn-block', { onclick: () => {
      let name = '';
      const ref = sheet({ title: 'New equipment',
        body: h('.field', h('label.label', 'Name'),
          h('input.input', { autofocus: true, oninput: (e) => { name = e.target.value; } })),
        foot: h('button.btn.btn-primary.btn-block', { onclick: () => {
          if (!name.trim()) return;
          S.createEquipment(name.trim()); ref.close(); toast('Added', 'good'); refresh();
        } }, 'Add') });
    } }, icon('plus'), 'New equipment'));
}
