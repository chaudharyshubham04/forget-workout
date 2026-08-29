import { h, icon, mount } from '../lib/dom.js';
import * as S from '../store.js';
import { sessionTotals } from '../lib/stats.js';
import { emptyState, sheet, toast, dialog } from '../lib/ui.js';
import { fmtDate, relDay, fmtVolume, fmtDuration, groupBy, MONTHS, parseDay, compactNum } from '../lib/utils.js';

export const title = 'History';
export const actions = () => [
  h('button.iconbtn', { 'aria-label': 'Calendar', onclick: () => (location.hash = '#/calendar') }, icon('calendar')),
];

export function render({ navigate }) {
  const unit = S.settings().unit;
  const all = S.completedSessions();
  if (!all.length) return emptyState({ iconName: 'history', title: 'No workouts logged yet',
    message: 'Every completed session is stored here with all of its sets, so you can revisit or edit it at any time.',
    action: h('button.btn.btn-primary', { onclick: () => navigate('/workouts') }, 'Start a workout') });

  let q = '';
  const listEl = h('.stack.stack-16');

  const draw = () => {
    const filtered = q
      ? all.filter((s) => s.name.toLowerCase().includes(q.toLowerCase())
        || s.entries.some((e) => (S.exerciseById(e.exerciseId)?.name || '').toLowerCase().includes(q.toLowerCase())))
      : all;

    if (!filtered.length) {
      mount(listEl, emptyState({ iconName: 'search', title: 'No matching sessions',
        message: `Nothing matches “${q}”.` }));
      return;
    }
    const byMonth = groupBy(filtered, (s) => s.date.slice(0, 7));
    mount(listEl, ...[...byMonth.entries()].map(([month, list]) => {
      const totals = list.map(sessionTotals);
      const vol = totals.reduce((n, t) => n + t.volume, 0);
      const [y, m] = month.split('-');
      return h('.stack.stack-10',
        h('.row-between', { style: { position: 'sticky', top: '56px', background: 'var(--bg)', zIndex: 5, padding: '6px 0' } },
          h('h2', `${MONTHS[+m - 1]} ${y}`),
          h('span.t-xs.dim', `${list.length} workouts · ${fmtVolume(vol, unit)}`)),
        ...list.map((s) => {
          const t = sessionTotals(s);
          return h('.card.card-pad.card-hover', { onclick: () => navigate(`/history/${s.id}`) },
            h('.row-between', { style: { alignItems: 'flex-start' } },
              h('.grow',
                h('.row', { style: { gap: '7px', flexWrap: 'wrap' } },
                  h('div.sb', s.name),
                  s.prs?.length ? h('span.tag.tag-warn', icon('trophy', 10), `${s.prs.length} PR`) : null),
                h('.t-xs.dim', { style: { marginTop: '3px' } },
                  `${fmtDate(s.date, 'med')} · ${relDay(s.date)}`),
                h('.row.wrap', { style: { gap: '5px', marginTop: '8px' } },
                  h('span.tag', `${t.exercises} exercises`),
                  h('span.tag', `${t.sets} sets`),
                  h('span.tag', fmtVolume(t.volume, unit)),
                  t.durationSec ? h('span.tag', fmtDuration(t.durationSec)) : null),
                s.entries.length ? h('.t-xs.dim', { style: { marginTop: '8px' } },
                  s.entries.slice(0, 4).map((e) => S.exerciseById(e.exerciseId)?.name || '—').join(' · ')
                  + (s.entries.length > 4 ? ` +${s.entries.length - 4}` : '')) : null),
              h('.row', { style: { gap: '4px' } },
                h('button.iconbtn', { 'aria-label': 'Options',
                  onclick: (e) => { e.stopPropagation(); menu(s, navigate); } }, icon('more')),
                icon('chevronRight'))));
        }));
    }));
  };
  draw();

  return h('.stack.stack-14',
    h('.search', icon('search'),
      h('input.input', { placeholder: 'Search by workout or exercise…', type: 'search',
        oninput: (e) => { q = e.target.value; draw(); } })),
    h('.grid.grid-2',
      h('.stat', h('.stat-v', String(all.length)), h('.stat-l', 'Total workouts')),
      h('.stat', h('.stat-v', compactNum(all.reduce((n, s) => n + sessionTotals(s).volume, 0) / (unit === 'lb' ? 0.45359237 : 1))),
        h('.stat-l', `Lifetime volume (${unit})`))),
    listEl);
}

function menu(s, navigate) {
  const ref = sheet({ title: s.name, body: h('.stack',
    h('button.listrow', { onclick: () => { ref.close(); navigate(`/history/${s.id}`); } },
      icon('eye'), h('.grow.sb', 'View & edit'), icon('chevronRight')),
    h('button.listrow', { onclick: () => {
      ref.close();
      if (S.activeSession()) { toast('Finish your active workout first', 'bad'); return; }
      S.repeatSession(s.id); navigate('/active');
      toast('Loaded — weights pre-filled', 'good');
    } }, icon('repeat'), h('.grow.sb', 'Repeat this workout')),
    h('button.listrow', { onclick: () => {
      const t = S.duplicateSessionAsTemplate(s.id); ref.close(); navigate(`/builder/${t.id}`);
    } }, icon('copy'), h('.grow.sb', 'Save as template'), icon('chevronRight')),
    h('button.listrow', { style: { color: 'var(--bad)' }, onclick: async () => {
      ref.close();
      if (await dialog({ title: 'Delete this workout?',
        message: 'Every set logged in it is removed and your charts will update.',
        confirmText: 'Delete', danger: true, iconName: 'trash' })) {
        S.deleteSession(s.id); toast('Workout deleted'); navigate('/history');
      }
    } }, icon('trash'), h('.grow.sb', 'Delete')),
  ) });
}
