import { h, icon, mount } from '../lib/dom.js';
import * as S from '../store.js';
import { sessionTotals, estimateCalories } from '../lib/stats.js';
import { exerciseThumb, fmtSet } from '../lib/components.js';
import { emptyState, sheet, toast, dialog, confirmDelete } from '../lib/ui.js';
import { fmtDate, relDay, fmtVolume, fmtDuration, fmtWeight, compactNum } from '../lib/utils.js';
import { SET_TYPES } from '../data/taxonomy.js';

export const title = (ctx) => S.sessionById(ctx.params.id)?.name || 'Workout';
export const actions = (ctx) => {
  const s = S.sessionById(ctx.params.id);
  return s ? [h('button.iconbtn', { 'aria-label': 'Options', onclick: () => menu(s, ctx) }, icon('more'))] : [];
};

export function render({ params, navigate, refresh }) {
  const session = S.sessionById(params.id);
  if (!session) return emptyState({ iconName: 'search', title: 'Workout not found' });

  const unit = S.settings().unit;
  const t = sessionTotals(session);
  const idx = S.exerciseIndex();
  const editing = { on: false };
  const body = h('.stack.stack-16');

  const draw = () => mount(body,
    h('div',
      h('h1', session.name),
      h('.t-sm.muted', { style: { marginTop: '4px' } },
        `${fmtDate(session.date, 'long')} · ${relDay(session.date)}`)),

    h('.grid.grid-2',
      h('.stat', h('.stat-v', fmtDuration(t.durationSec)), h('.stat-l', 'Duration')),
      h('.stat', h('.stat-v', String(t.sets)), h('.stat-l', 'Working sets')),
      h('.stat', h('.stat-v', String(t.reps)), h('.stat-l', 'Total reps')),
      h('.stat', h('.stat-v', compactNum(unit === 'lb' ? t.volume / 0.45359237 : t.volume)),
        h('.stat-l', `Volume (${unit})`))),

    h('.card.card-pad.stack', { style: { gap: '2px' } },
      row('Exercises', String(t.exercises)),
      row('Estimated energy', `~${estimateCalories(session, S.profile().bodyWeightKg || 75)} kcal`),
      session.splitId ? row('Split', S.splitById(session.splitId)?.name || '—') : null,
      row('Started', new Date(session.startedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }))),

    session.prs?.length ? h('.stack.stack-8',
      h('.row', { style: { gap: '8px' } },
        h('span', { style: { color: 'var(--warn)' } }, icon('trophy', 17)),
        h('div.sb', `${session.prs.length} personal record${session.prs.length > 1 ? 's' : ''}`)),
      ...session.prs.map((p) => h('.card.card-pad',
        h('.row-between',
          h('div',
            h('div.sb', idx[p.exerciseId]?.name || 'Exercise'),
            h('.t-xs.dim', prLabel(p, unit))),
          h('span', { style: { color: 'var(--warn)' } }, icon('trophy', 16)))))) : null,

    h('.row-between',
      h('h2', 'Exercises'),
      h('button.btn.btn-sm', { onclick: () => { editing.on = !editing.on; draw(); } },
        icon(editing.on ? 'check' : 'edit'), editing.on ? 'Done' : 'Edit')),

    ...session.entries.map((entry) => {
      const ex = idx[entry.exerciseId];
      const vol = entry.sets.reduce((n, s) => n + (Number(s.weight) || 0) * (Number(s.reps) || 0), 0);
      return h('.card.card-pad.stack.stack-10',
        h('.row', { style: { gap: '10px' } },
          ex ? exerciseThumb(ex) : null,
          h('.grow',
            h('button', { style: { background: 'none', border: 'none', padding: 0, fontWeight: 650,
              fontSize: '15px', textAlign: 'left', cursor: 'pointer' },
              onclick: () => ex && navigate(`/exercise/${ex.id}`) }, ex?.name || 'Unknown exercise'),
            h('.ex-meta',
              h('span', `${entry.sets.length} sets`), h('i.dot'),
              h('span', fmtVolume(vol, unit)))),
          ex ? h('button.iconbtn', { 'aria-label': 'Analytics',
            onclick: () => navigate(`/progress/${ex.id}`) }, icon('chartline')) : null),
        h('table.set-table',
          h('tr', h('th', 'SET'), h('th', unit.toUpperCase()), h('th', 'REPS'),
            h('th', 'RPE'), editing.on ? h('th', '') : null),
          ...entry.sets.map((s, i) => h('tr.set-row',
            h('td', h(`.set-num${(SET_TYPES.find((x) => x.id === s.type) || {}).cls ? `.${SET_TYPES.find((x) => x.id === s.type).cls}` : ''}`,
              s.type === 'normal' ? String(i + 1) : (SET_TYPES.find((x) => x.id === s.type) || {}).short || String(i + 1))),
            h('td', editing.on
              ? h('input.set-input', { type: 'number', step: 'any',
                  value: s.weight != null ? (unit === 'lb' ? +(s.weight / 0.45359237).toFixed(2) : s.weight) : '',
                  onchange: (e) => {
                    const v = parseFloat(e.target.value);
                    S.updateSet(session.id, entry.id, s.id, { weight: Number.isNaN(v) ? null : (unit === 'lb' ? v * 0.45359237 : v) });
                    toast('Updated — charts recalculated');
                  } })
              : h('.center.sb.mono', s.weight != null ? fmtWeight(s.weight, unit, false) : '—')),
            h('td', editing.on
              ? h('input.set-input', { type: 'number', value: s.reps ?? '',
                  onchange: (e) => S.updateSet(session.id, entry.id, s.id, { reps: parseFloat(e.target.value) || null }) })
              : h('.center.sb.mono', s.reps ?? '—')),
            h('td', h('.center.t-xs.dim', s.rpe ? `@${s.rpe}` : s.rir != null ? `${s.rir}R` : '—')),
            editing.on ? h('td', h('button.iconbtn', { 'aria-label': 'Delete set',
              onclick: () => { S.removeSet(session.id, entry.id, s.id); draw(); } }, icon('trash', 15))) : null))),
        editing.on ? h('.row', { style: { gap: '8px' } },
          h('button.btn.btn-sm.grow', { onclick: () => { S.addSet(session.id, entry.id, { done: true }); draw(); } },
            icon('plus'), 'Add set'),
          h('button.btn.btn-sm.btn-danger', { onclick: async () => {
            if (await confirmDelete('this exercise from the workout')) {
              S.removeSessionExercise(session.id, entry.id); draw();
            }
          } }, icon('trash'), 'Remove')) : null,
        entry.notes ? h('.t-xs.muted', { style: { fontStyle: 'italic' } }, entry.notes) : null);
    }),

    h('.card.card-pad.stack.stack-8',
      h('div.sb', 'Session notes'),
      h('textarea.textarea', { placeholder: 'Add notes about this session…',
        onchange: (e) => { S.patchSession(session.id, { notes: e.target.value }); toast('Notes saved', 'good'); } },
        session.notes || '')),

    h('.row', { style: { gap: '10px' } },
      h('button.btn.grow', { onclick: () => {
        if (S.activeSession()) { toast('Finish your active workout first', 'bad'); return; }
        S.repeatSession(session.id); navigate('/active');
      } }, icon('repeat'), 'Repeat'),
      h('button.btn.grow', { onclick: () => {
        const tpl = S.duplicateSessionAsTemplate(session.id); navigate(`/builder/${tpl.id}`);
      } }, icon('copy'), 'Save as template')));

  draw();
  return body;
}

const row = (l, v) => h('.row-between', { style: { padding: '7px 0' } },
  h('span.t-sm.muted', l), h('span.t-sm.sb', v));

function prLabel(p, unit) {
  switch (p.kind) {
    case 'weight': return `Heaviest weight — ${fmtWeight(p.value, unit)} × ${p.reps} (was ${fmtWeight(p.previous, unit)})`;
    case 'reps': return `Most reps at ${fmtWeight(p.weight, unit)} — ${p.reps} (was ${p.previous})`;
    case 'e1rm': return `Best estimated 1RM — ${fmtWeight(p.value, unit)} (was ${fmtWeight(p.previous, unit)})`;
    case 'volume': return `Most session volume — ${compactNum(unit === 'lb' ? p.value / 0.45359237 : p.value)} ${unit}`;
    case 'first': return 'First time logged';
    default: return p.kind;
  }
}

function menu(s, ctx) {
  const ref = sheet({ title: s.name, body: h('.stack',
    h('button.listrow', { onclick: () => { ref.close(); renameSheet(s, ctx); } },
      icon('edit'), h('.grow.sb', 'Rename'), icon('chevronRight')),
    h('button.listrow', { onclick: () => { ref.close(); dateSheet(s, ctx); } },
      icon('calendar'), h('.grow.sb', 'Change date'), icon('chevronRight')),
    h('button.listrow', { onclick: () => {
      ref.close();
      if (S.activeSession()) { toast('Finish your active workout first', 'bad'); return; }
      S.repeatSession(s.id); ctx.navigate('/active');
    } }, icon('repeat'), h('.grow.sb', 'Repeat workout')),
    h('button.listrow', { style: { color: 'var(--bad)' }, onclick: async () => {
      ref.close();
      if (await dialog({ title: 'Delete this workout?', message: 'All of its sets are removed from your history and analytics.',
        confirmText: 'Delete', danger: true, iconName: 'trash' })) {
        S.deleteSession(s.id); ctx.navigate('/history');
      }
    } }, icon('trash'), h('.grow.sb', 'Delete workout')),
  ) });
}

function renameSheet(s, ctx) {
  const inp = h('input.input', { value: s.name, autofocus: true });
  const ref = sheet({ title: 'Rename workout', body: h('.field', h('label.label', 'Name'), inp),
    foot: h('button.btn.btn-primary.btn-block', { onclick: () => {
      S.patchSession(s.id, { name: inp.value || 'Workout' }); ref.close(); ctx.refresh();
    } }, 'Save') });
}
function dateSheet(s, ctx) {
  const inp = h('input.input', { type: 'date', value: s.date });
  const ref = sheet({ title: 'Workout date', body: h('.field',
    h('label.label', 'Date'), inp,
    h('.t-xs.dim', { style: { marginTop: '6px' } }, 'Changing the date moves this session in your history, calendar and all charts.')),
    foot: h('button.btn.btn-primary.btn-block', { onclick: () => {
      if (inp.value) S.patchSession(s.id, { date: inp.value });
      ref.close(); ctx.refresh();
    } }, 'Save') });
}
