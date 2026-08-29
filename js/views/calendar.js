import { h, icon, mount } from '../lib/dom.js';
import * as S from '../store.js';
import { sessionTotals } from '../lib/stats.js';
import { sheet, emptyState, toast } from '../lib/ui.js';
import { MONTHS, DAY_MIN, dayKey, todayKey, fmtDate, relDay, fmtVolume,
  fmtDuration, startOfWeek, addDays, parseDay } from '../lib/utils.js';

export const title = 'Calendar';

export function render({ navigate }) {
  const st = S.get();
  const unit = st.settings.unit;
  const weekStart = st.settings.weekStart;
  const done = S.completedSessions();
  const byDay = {};
  for (const s of done) (byDay[s.date] ||= []).push(s);

  let cursor = new Date(); cursor.setDate(1);
  const gridEl = h('div');
  const headEl = h('.row-between');
  const statsEl = h('div');

  function draw() {
    const y = cursor.getFullYear(), m = cursor.getMonth();
    const first = new Date(y, m, 1);
    const lead = (first.getDay() - weekStart + 7) % 7;
    const start = addDays(first, -lead);
    const cells = [];
    for (let i = 0; i < 42; i++) {
      const d = addDays(start, i);
      const key = dayKey(d);
      const out = d.getMonth() !== m;
      const list = byDay[key] || [];
      const plan = S.planDayFor(key);
      const isToday = key === todayKey();
      const isFuture = d > new Date();
      let cls = 'cal-cell';
      if (out) cls += ' out';
      if (list.length) cls += ' done';
      else if (plan && !plan.isRest && isFuture) cls += ' planned';
      else if (plan && plan.isRest && isFuture) cls += ' rest';
      if (isToday) cls += ' today';
      cells.push(h(`.${cls.split(' ').join('.')}`, {
        onclick: () => daySheet(key, list, plan, navigate),
        title: list.length ? `${list.length} workout${list.length > 1 ? 's' : ''}` : (plan ? plan.day.name : ''),
      }, h('span', String(d.getDate())),
        list.length > 1 ? h('span', { style: { fontSize: '8px', fontWeight: 800 } }, `×${list.length}`)
          : (!list.length && plan && !plan.isRest && isFuture ? h('.cdot') : null)));
    }
    mount(gridEl,
      h('.cal-grid', ...Array.from({ length: 7 }, (_, i) =>
        h('.cal-head', DAY_MIN[(i + weekStart) % 7]))),
      h('.cal-grid', ...cells));

    mount(headEl,
      h('button.iconbtn', { 'aria-label': 'Previous month',
        onclick: () => { cursor = new Date(y, m - 1, 1); draw(); } }, icon('chevronLeft')),
      h('h2', `${MONTHS[m]} ${y}`),
      h('button.iconbtn', { 'aria-label': 'Next month',
        onclick: () => { cursor = new Date(y, m + 1, 1); draw(); } }, icon('chevronRight')));

    const monthKey = `${y}-${String(m + 1).padStart(2, '0')}`;
    const inMonth = done.filter((s) => s.date.startsWith(monthKey));
    const totals = inMonth.map(sessionTotals);
    mount(statsEl, h('.grid.grid-3',
      h('.stat', h('.stat-v', String(inMonth.length)), h('.stat-l', 'Workouts')),
      h('.stat', h('.stat-v', String(totals.reduce((n, t) => n + t.sets, 0))), h('.stat-l', 'Sets')),
      h('.stat', h('.stat-v', fmtDuration(totals.reduce((n, t) => n + t.durationSec, 0))), h('.stat-l', 'Time'))));
  }
  draw();

  return h('.stack.stack-16',
    headEl,
    h('.card.card-pad', gridEl),
    h('.row.wrap', { style: { gap: '12px', justifyContent: 'center' } },
      legend('var(--accent)', 'Completed'),
      legend('var(--accent-soft)', 'Planned'),
      legend('var(--surface-3)', 'Rest day')),
    statsEl,
    h('button.btn.btn-block', { onclick: () => { cursor = new Date(); cursor.setDate(1); draw(); } },
      'Jump to this month'));
}

const legend = (color, label) => h('.row', { style: { gap: '6px' } },
  h('i', { style: { width: '12px', height: '12px', borderRadius: '4px', background: color, display: 'block' } }),
  h('span.t-xs.dim', label));

function daySheet(key, list, plan, navigate) {
  const unit = S.settings().unit;
  const ref = sheet({ title: fmtDate(key, 'long'), body: h('.stack.stack-12',
    h('.t-sm.dim', relDay(key)),
    plan ? h('.card.card-pad',
      h('.row-between',
        h('div',
          h('.t-xs.dim', 'Scheduled'),
          h('div.sb', plan.isRest ? 'Rest day' : plan.day.name)),
        !plan.isRest && plan.templateId && key === todayKey()
          ? h('button.btn.btn-sm.btn-primary', { onclick: () => {
              ref.close();
              if (S.activeSession()) { navigate('/active'); return; }
              S.startSession({ templateId: plan.templateId, splitId: plan.split.id, dayIndex: plan.index });
              navigate('/active');
            } }, icon('play', 14), 'Start') : null)) : null,
    ...(list.length ? list.map((s) => {
      const t = sessionTotals(s);
      return h('button.listrow.card', { style: { borderRadius: '14px' },
        onclick: () => { ref.close(); navigate(`/history/${s.id}`); } },
        h('.grow',
          h('div.sb', s.name),
          h('.t-xs.dim', `${t.exercises} exercises · ${t.sets} sets · ${fmtVolume(t.volume, unit)}`)),
        icon('chevronRight'));
    }) : [h('.t-sm.dim', { style: { textAlign: 'center', padding: '12px 0' } }, 'No workout logged on this day.')]),
  ) });
}
