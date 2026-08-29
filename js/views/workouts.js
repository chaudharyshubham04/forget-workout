import { h, icon, mount } from '../lib/dom.js';
import * as S from '../store.js';
import { sectionTitle, exercisePicker } from '../lib/components.js';
import { emptyState, sheet, toast, confirmDelete, dialog } from '../lib/ui.js';
import { todayKey, relDay, fmtDuration, fmtVolume } from '../lib/utils.js';
import { sessionTotals } from '../lib/stats.js';

export const title = 'Workouts';
export const actions = () => [
  h('button.iconbtn', { 'aria-label': 'New workout',
    onclick: () => (location.hash = '#/builder') }, icon('plus')),
];

export function render({ navigate }) {
  const templates = S.templates();
  const pinned = templates.filter((t) => S.isPinned(t.id));
  const rest = templates.filter((t) => !S.isPinned(t.id));
  const plan = S.planDayFor(todayKey());
  const active = S.activeSession();
  const done = S.completedSessions();
  const unit = S.settings().unit;

  const exCount = (t) => (t.blocks || []).reduce((n, b) => n + (b.entries || []).length, 0);
  const setCount = (t) => (t.blocks || []).reduce((n, b) =>
    n + (b.entries || []).reduce((m, e) => m + (e.sets || []).length, 0), 0);

  const templateCard = (t) => h('.card.card-pad.card-hover', { onclick: () => navigate(`/builder/${t.id}`) },
    h('.row-between', { style: { alignItems: 'flex-start' } },
      h('.grow',
        h('.row', { style: { gap: '7px' } },
          h('div.sb', t.name),
          S.isPinned(t.id) ? h('span', { style: { color: 'var(--accent)' } }, icon('star', 13)) : null),
        h('.t-xs.dim', { style: { marginTop: '3px' } },
          `${exCount(t)} exercises · ${setCount(t)} sets${t.type ? ` · ${t.type}` : ''}`),
        (t.targetMuscles || []).length ? h('.row.wrap', { style: { gap: '5px', marginTop: '8px' } },
          ...t.targetMuscles.slice(0, 4).map((m) => h('span.tag', S.muscleName(m)))) : null),
      h('.row', { style: { gap: '4px' } },
        h('button.btn.btn-sm.btn-primary', { onclick: (e) => { e.stopPropagation(); startFrom(t, navigate); } },
          icon('play', 15), 'Start'),
        h('button.iconbtn', { 'aria-label': 'Options',
          onclick: (e) => { e.stopPropagation(); templateMenu(t, navigate); } }, icon('more')))));

  const todayCard = plan ? h('.card.card-pad.stack.stack-12',
    h('.row-between',
      h('.row', { style: { gap: '8px' } },
        h('span', { style: { color: 'var(--accent)' } }, icon('calendar', 17)),
        h('div.sb', 'Today')),
      h('button.link', { onclick: () => navigate(`/split/${plan.split.id}`) }, plan.split.name)),
    plan.isRest
      ? h('.row', { style: { gap: '12px' } },
          h('.grow', h('div.sb', 'Rest day'),
            h('.t-sm.muted', { style: { marginTop: '3px' } },
              'Scheduled recovery. You can still start any workout below if you feel good.')))
      : h('.row-between',
          h('.grow',
            h('div.sb', plan.day.name),
            h('.t-sm.muted', { style: { marginTop: '3px' } },
              (plan.day.focus || []).map((m) => S.muscleName(m)).join(' · ') || 'Full body')),
          plan.templateId
            ? h('button.btn.btn-primary', { onclick: () => startFrom(S.templateById(plan.templateId), navigate) },
                icon('play'), 'Start')
            : null)) : null;

  return h('.stack.stack-20',
    active ? h('.card.card-pad.card-hover', { style: { borderColor: 'var(--accent)' },
      onclick: () => navigate('/active') },
      h('.row', { style: { gap: '12px' } },
        h('.pulse-dot', { style: { background: 'var(--accent)' } }),
        h('.grow', h('div.sb', 'Workout in progress'), h('.t-xs.dim', active.name)),
        h('button.btn.btn-sm.btn-primary', 'Resume'))) : null,

    todayCard,

    h('.grid.grid-2',
      h('button.card.card-pad.card-hover', { onclick: () => quickStartSheet(),
        style: { textAlign: 'left', cursor: 'pointer' } },
        h('div', { style: { color: 'var(--accent)', marginBottom: '8px' } }, icon('bolt', 20)),
        h('div.sb', 'Quick start'), h('.t-xs.dim', 'Empty session or repeat')),
      h('button.card.card-pad.card-hover', { onclick: () => navigate('/splits'),
        style: { textAlign: 'left', cursor: 'pointer' } },
        h('div', { style: { color: 'var(--accent)', marginBottom: '8px' } }, icon('layers', 20)),
        h('div.sb', 'Splits'), h('.t-xs.dim', 'Plan your training week'))),

    pinned.length ? h('.stack.stack-10', sectionTitle('Pinned'), ...pinned.map(templateCard)) : null,

    h('.stack.stack-10',
      sectionTitle(pinned.length ? 'All workouts' : 'My workouts',
        h('button.link', { onclick: () => navigate('/builder') }, '+ New')),
      ...(rest.length ? rest.map(templateCard) : (pinned.length ? [] : [emptyState({
        iconName: 'dumbbell', title: 'No workout templates yet',
        message: 'Build one from scratch, or activate a split to generate a full week of workouts automatically.',
        action: h('.row', { style: { gap: '8px' } },
          h('button.btn.btn-primary', { onclick: () => navigate('/builder') }, icon('plus'), 'Build a workout'),
          h('button.btn', { onclick: () => navigate('/splits') }, 'Browse splits')),
      })]))),

    done.length ? h('.stack.stack-10',
      sectionTitle('Repeat a recent session', h('button.link', { onclick: () => navigate('/history') }, 'History')),
      ...done.slice(0, 3).map((s) => {
        const t = sessionTotals(s);
        return h('.card.card-pad.card-hover', { onclick: () => navigate(`/history/${s.id}`) },
          h('.row-between',
            h('.grow', h('div.sb', s.name),
              h('.t-xs.dim', { style: { marginTop: '3px' } },
                `${relDay(s.date)} · ${t.sets} sets · ${fmtVolume(t.volume, unit)}`)),
            h('button.btn.btn-sm', { onclick: (e) => { e.stopPropagation(); repeat(s.id, navigate); } },
              icon('repeat', 14), 'Repeat')));
      })) : null);
}

function startFrom(t, navigate) {
  if (!t) return;
  if (S.activeSession()) { navigate('/active'); return; }
  S.startSession({ templateId: t.id, name: t.name, splitId: t.splitId || null });
  navigate('/active');
}

async function repeat(sessionId, navigate) {
  if (S.activeSession()) {
    const ok = await dialog({ title: 'A workout is already active',
      message: 'Finish or discard it before starting another.', confirmText: 'Go to it', iconName: 'alert' });
    if (ok) navigate('/active');
    return;
  }
  S.repeatSession(sessionId);
  navigate('/active');
  toast('Session loaded — weights pre-filled from last time', 'good');
}

/** Shared by the FAB and the Quick start card. */
export function quickStartSheet() {
  const navigate = (to) => (location.hash = `#${to}`);
  if (S.activeSession()) { navigate('/active'); return; }
  const plan = S.planDayFor(todayKey());
  const templates = S.templates();
  const recent = S.completedSessions().slice(0, 3);

  const ref = sheet({ title: 'Start a workout', body: h('.stack.stack-14',
    plan && !plan.isRest && plan.templateId ? h('.stack.stack-8',
      h('.label', "Today's plan"),
      h('button.listrow.card', { style: { borderRadius: '14px', border: '1px solid var(--accent)' },
        onclick: () => { ref.close(); startFrom(S.templateById(plan.templateId), navigate); } },
        h('span', { style: { color: 'var(--accent)' } }, icon('play')),
        h('.grow', h('div.sb', plan.day.name),
          h('.t-xs.dim', (plan.day.focus || []).map((m) => S.muscleName(m)).join(' · ') || plan.split.name)),
        icon('chevronRight'))) : null,

    h('.stack.stack-8',
      h('.label', 'Start fresh'),
      h('button.listrow', { onclick: () => {
        ref.close();
        S.startSession({ name: 'Quick workout' });
        navigate('/active');
      } }, icon('plus'), h('.grow', h('div.sb', 'Empty workout'),
        h('.t-xs.dim', 'Add exercises as you go')), icon('chevronRight'))),

    templates.length ? h('.stack.stack-8',
      h('.label', 'From a template'),
      ...templates.slice(0, 6).map((t) => h('button.listrow', {
        onclick: () => { ref.close(); startFrom(t, navigate); } },
        icon('dumbbell'),
        h('.grow', h('div.sb', t.name),
          h('.t-xs.dim', `${(t.blocks || []).reduce((n, b) => n + b.entries.length, 0)} exercises`)),
        icon('chevronRight')))) : null,

    recent.length ? h('.stack.stack-8',
      h('.label', 'Repeat'),
      ...recent.map((s) => h('button.listrow', {
        onclick: () => { ref.close(); repeat(s.id, navigate); } },
        icon('repeat'),
        h('.grow', h('div.sb', s.name), h('.t-xs.dim', relDay(s.date))),
        icon('chevronRight')))) : null,
  ) });
}

function templateMenu(t, navigate) {
  const ref = sheet({ title: t.name, body: h('.stack',
    h('button.listrow', { onclick: () => { ref.close(); startFrom(t, navigate); } },
      h('span', { style: { color: 'var(--accent)' } }, icon('play')), h('.grow.sb', 'Start workout'), icon('chevronRight')),
    h('button.listrow', { onclick: () => { ref.close(); navigate(`/builder/${t.id}`); } },
      icon('edit'), h('.grow.sb', 'Edit'), icon('chevronRight')),
    h('button.listrow', { onclick: () => { const on = S.togglePin(t.id); ref.close();
      toast(on ? 'Pinned' : 'Unpinned'); location.reload && navigate('/workouts'); } },
      icon('star'), h('.grow.sb', S.isPinned(t.id) ? 'Unpin' : 'Pin to top')),
    h('button.listrow', { onclick: () => { const c = S.duplicateTemplate(t.id); ref.close(); navigate(`/builder/${c.id}`); } },
      icon('copy'), h('.grow.sb', 'Duplicate'), icon('chevronRight')),
    h('button.listrow', { style: { color: 'var(--bad)' }, onclick: async () => {
      ref.close();
      if (await confirmDelete('this workout', 'Sessions you already logged from it are kept.')) {
        S.deleteTemplate(t.id); toast('Workout deleted'); navigate('/workouts');
      }
    } }, icon('trash'), h('.grow.sb', 'Delete')),
  ) });
}
