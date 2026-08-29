import { h, icon } from '../lib/dom.js';
import * as S from '../store.js';
import { statCard, sectionTitle, exerciseCard, pill } from '../lib/components.js';
import { ring, heatmap, barChart } from '../lib/charts.js';
import { streaks, sessionTotals, weeklyBuckets, muscleVolume, muscleRecovery } from '../lib/stats.js';
import { volumeStatus } from '../lib/progression.js';
import { todayKey, fmtVolume, relDay, fmtDuration, DAY_MIN, startOfWeek, addDays, dayKey,
  daysBetween, parseDay, compactNum, fmtDate } from '../lib/utils.js';
import { emptyState } from '../lib/ui.js';

export const title = 'Home';

export function render({ navigate }) {
  const st = S.get();
  const unit = st.settings.unit;
  const done = S.completedSessions();
  const streak = streaks(done);
  const plan = S.planDayFor(todayKey());
  const active = S.activeSession();
  const weeks = weeklyBuckets(done, 2, st.settings.weekStart);
  const thisWeek = weeks[1] || { count: 0, volume: 0, sets: 0 };
  const lastWeek = weeks[0] || { count: 0, volume: 0, sets: 0 };
  const idx = S.exerciseIndex();

  const greet = (() => {
    const hr = new Date().getHours();
    const n = st.profile.name ? `, ${st.profile.name.split(' ')[0]}` : '';
    return `${hr < 12 ? 'Good morning' : hr < 18 ? 'Good afternoon' : 'Good evening'}${n}`;
  })();

  /* ---- hero: today's plan ---- */
  const weekDots = (() => {
    const ws = startOfWeek(new Date(), st.settings.weekStart);
    const trained = new Set(done.map((s) => s.date));
    return h('.streak-days', ...Array.from({ length: 7 }, (_, i) => {
      const d = addDays(ws, i), k = dayKey(d);
      const isToday = k === todayKey();
      const pd = S.planDayFor(k);
      return h('.sday',
        h(`.sday-dot${trained.has(k) ? '.on' : ''}${isToday ? '.today' : ''}`,
          trained.has(k) ? icon('check', 14) : (pd && !pd.isRest ? '·' : '')),
        h('.sday-l', DAY_MIN[d.getDay()]));
    }));
  })();

  const hero = h('.hero',
    h('.row-between', { style: { alignItems: 'flex-start', marginBottom: '14px' } },
      h('div',
        h('div', { style: { fontSize: '12.5px', opacity: .9, fontWeight: 600 } }, greet),
        h('h1', { style: { color: '#fff', marginTop: '2px' } },
          active ? 'Workout in progress' : plan && !plan.isRest ? plan.day.name : plan ? 'Rest day' : 'Ready to train')),
      streak.current > 0
        ? h('.row', { style: { gap: '5px', background: 'rgba(255,255,255,.2)', padding: '5px 10px',
            borderRadius: '99px', fontWeight: 800, fontSize: '13px' } },
            icon('flame', 15), `${streak.current}`)
        : null),
    h('.t-sm', { style: { opacity: .92, marginBottom: '14px' } },
      active ? `${active.entries.reduce((n, e) => n + e.sets.filter((x) => x.done).length, 0)} sets logged so far`
      : plan && !plan.isRest ? `${plan.split.name} · ${(plan.day.focus || []).map((m) => S.muscleName(m)).join(' · ') || 'Full body'}`
      : plan ? 'Recovery is where the adaptation happens. Move, eat, sleep.'
      : 'Pick a split or start an empty session to begin logging.'),
    weekDots,
    h('.row', { style: { marginTop: '16px', gap: '8px' } },
      active
        ? h('button.btn.btn-lg.grow', { style: { background: '#fff', color: 'hsl(var(--accent-h) 90% 42%)', borderColor: 'transparent' },
            onclick: () => navigate('/active') }, icon('play'), 'Resume workout')
        : plan && !plan.isRest && plan.templateId
          ? h('button.btn.btn-lg.grow', { style: { background: '#fff', color: 'hsl(var(--accent-h) 90% 42%)', borderColor: 'transparent' },
              onclick: () => { S.startSession({ templateId: plan.templateId, splitId: plan.split.id, dayIndex: plan.index }); navigate('/active'); } },
              icon('play'), `Start ${plan.day.name}`)
          : h('button.btn.btn-lg.grow', { style: { background: '#fff', color: 'hsl(var(--accent-h) 90% 42%)', borderColor: 'transparent' },
              onclick: () => navigate('/workouts') }, icon('plus'), 'Start a workout'),
      h('button.btn.btn-lg', { style: { background: 'rgba(255,255,255,.18)', color: '#fff', borderColor: 'transparent' },
        onclick: () => navigate('/calendar'), 'aria-label': 'Calendar' }, icon('calendar'))));

  /* ---- week stats ---- */
  const volDelta = lastWeek.volume ? ((thisWeek.volume - lastWeek.volume) / lastWeek.volume) * 100 : null;
  const stats = h('.grid.grid-2',
    statCard({ label: 'Workouts this week', value: String(thisWeek.count), iconName: 'dumbbell',
      delta: lastWeek.count !== undefined ? {
        dir: thisWeek.count > lastWeek.count ? 'up' : thisWeek.count < lastWeek.count ? 'down' : 'flat',
        tone: thisWeek.count >= lastWeek.count ? 'good' : 'ink-3',
        text: `${thisWeek.count - lastWeek.count >= 0 ? '+' : ''}${thisWeek.count - lastWeek.count} vs last week` } : null,
      onClick: () => navigate('/history') }),
    statCard({ label: 'Volume this week', value: compactNum(thisWeek.volume ? (unit === 'lb' ? thisWeek.volume / 0.45359237 : thisWeek.volume) : 0),
      iconName: 'chart', tone: 'info',
      delta: volDelta !== null ? { dir: volDelta >= 0 ? 'up' : 'down',
        tone: volDelta >= 0 ? 'good' : 'bad', text: `${volDelta >= 0 ? '+' : ''}${volDelta.toFixed(0)}%` } : null,
      onClick: () => navigate('/progress') }),
    statCard({ label: 'Working sets', value: String(thisWeek.sets), iconName: 'layers', tone: 'good',
      onClick: () => navigate('/progress') }),
    statCard({ label: 'Total workouts', value: String(done.length), iconName: 'trophy', tone: 'warn',
      onClick: () => navigate('/history') }));

  /* ---- weekly goal ring ---- */
  const target = st.profile.daysPerWeek || 4;
  const goalCard = h('.card.card-pad',
    h('.row', { style: { gap: '18px' } },
      ring(thisWeek.count, target, { size: 78, children: [
        h('div', { style: { fontSize: '1.15rem', fontWeight: 800, fontFamily: 'var(--ff-num)' } }, `${thisWeek.count}/${target}`),
        h('div', { style: { fontSize: '9px', color: 'var(--ink-3)', fontWeight: 700 } }, 'DAYS')] }),
      h('.grow',
        h('div.sb', thisWeek.count >= target ? 'Weekly target hit' : `${target - thisWeek.count} to go this week`),
        h('.t-sm.muted', { style: { marginTop: '3px', lineHeight: 1.45 } },
          thisWeek.count >= target
            ? 'Nice work. Anything beyond this is a bonus.'
            : `You train ${target} days a week. ${thisWeek.count} logged so far.`),
        streak.best > 0 ? h('.t-xs.dim', { style: { marginTop: '6px' } },
          `Best streak: ${streak.best} sessions · Last trained ${streak.lastDate ? relDay(streak.lastDate).toLowerCase() : 'never'}`) : null)));

  /* ---- muscle volume ---- */
  const ws = startOfWeek(new Date(), st.settings.weekStart);
  const mv = muscleVolume(done, idx, { from: ws, to: addDays(ws, 6) });
  const targets = st.settings.muscleTargets;
  const mvItems = Object.entries(targets)
    .map(([m, t]) => ({ m, t, sets: mv[m]?.sets || 0 }))
    .sort((a, b) => b.sets - a.sets).slice(0, 6);
  const muscleCard = h('.card.card-pad.stack.stack-12',
    h('.row-between', h('div.sb', 'Weekly sets by muscle'),
      h('button.link', { onclick: () => navigate('/progress') }, 'All muscles')),
    ...(mvItems.some((x) => x.sets > 0) ? mvItems.map((x) => {
      const vs = volumeStatus(x.sets, x.t);
      return h('div',
        h('.row-between', { style: { marginBottom: '4px' } },
          h('span.t-sm.sb', S.muscleName(x.m)),
          h('.row', { style: { gap: '6px' } },
            h('span.t-xs.mono.dim', `${x.sets} / ${x.t}`),
            h(`span.status-pill.${vs.cls}`, h('i'), vs.label))),
        h('.bar', h('i', { style: { width: `${Math.min(100, (x.sets / x.t) * 100)}%`,
          background: vs.id === 'high' ? 'var(--bad)' : vs.id === 'low' ? 'var(--warn)' : 'var(--good)' } })));
    }) : [h('.t-sm.dim', 'Log a workout this week to see volume per muscle group.')]));

  /* ---- recovery ---- */
  const rec = muscleRecovery(done, idx);
  const recEntries = Object.entries(rec).filter(([m]) => targets[m] !== undefined)
    .sort((a, b) => a[1].daysAgo - b[1].daysAgo).slice(0, 8);
  const recoveryCard = recEntries.length ? h('.card.card-pad.stack.stack-10',
    h('.row-between', h('div.sb', 'Muscle recovery'),
      h('span.t-xs.dim', 'Days since trained')),
    h('.row.wrap', { style: { gap: '6px' } },
      ...recEntries.map(([m, r]) => h('span.chip.chip-sm.chip-static', {
        style: { borderColor: r.daysAgo <= 1 ? 'var(--bad-soft)' : r.daysAgo === 2 ? 'var(--warn-soft)' : 'var(--good-soft)',
          background: r.daysAgo <= 1 ? 'var(--bad-soft)' : r.daysAgo === 2 ? 'var(--warn-soft)' : 'var(--good-soft)',
          color: r.daysAgo <= 1 ? 'var(--bad)' : r.daysAgo === 2 ? 'var(--warn)' : 'var(--good)' } },
        `${S.muscleName(m)} · ${r.daysAgo}d`))),
    h('.t-xs.dim', 'An indicator based on training history, not a physiological measurement.')) : null;

  /* ---- recent workouts ---- */
  const recent = done.slice(0, 3);
  const recentCard = h('.stack.stack-10',
    sectionTitle('Recent workouts', recent.length
      ? h('button.link', { onclick: () => navigate('/history') }, 'See all') : null),
    ...(recent.length ? recent.map((s) => {
      const t = sessionTotals(s);
      return h('.card.card-pad.card-hover', { onclick: () => navigate(`/history/${s.id}`) },
        h('.row-between',
          h('div',
            h('div.sb', s.name),
            h('.t-xs.dim', { style: { marginTop: '3px' } },
              `${relDay(s.date)} · ${t.exercises} exercises · ${t.sets} sets · ${fmtVolume(t.volume, unit)}`)),
          h('.row', { style: { gap: '8px' } },
            s.prs?.length ? h('span.tag.tag-warn', icon('trophy', 11), String(s.prs.length)) : null,
            h('span.t-xs.dim.mono', fmtDuration(t.durationSec)),
            icon('chevronRight'))));
    }) : [emptyState({ iconName: 'history', title: 'No workouts yet',
      message: 'Your logged sessions will appear here with volume, sets and personal records.',
      action: h('button.btn.btn-primary', { onclick: () => navigate('/workouts') }, 'Start your first workout') })]));

  /* ---- consistency heatmap ---- */
  const dayMap = {};
  for (const s of done) dayMap[s.date] = (dayMap[s.date] || 0) + 1;
  const heat = done.length ? h('.card.card-pad.stack.stack-10',
    h('.row-between', h('div.sb', 'Consistency'),
      h('button.link', { onclick: () => navigate('/calendar') }, 'Calendar')),
    h('.scroll-x', heatmap(dayMap, { weeks: 20, weekStart: st.settings.weekStart,
      onPick: (k) => { const hit = done.find((x) => x.date === k); if (hit) navigate(`/history/${hit.id}`); } })),
    h('.row-between',
      h('span.t-xs.dim', '20 weeks'),
      h('.row', { style: { gap: '4px', alignItems: 'center' } },
        h('span.t-xs.dim', 'Less'),
        ...[0.2, 0.45, 0.7, 1].map((a) => h('i', { style: { width: '11px', height: '11px', borderRadius: '3px',
          background: `hsl(var(--accent-h) var(--accent-s) var(--accent-l) / ${a})`, display: 'block' } })),
        h('span.t-xs.dim', 'More')))) : null;

  /* ---- quick actions ---- */
  const quick = h('.grid.grid-2',
    ...[
      ['Quick start', 'Empty session', 'plus', () => navigate('/workouts')],
      ['Exercises', `${S.exercises().length} in library`, 'library', () => navigate('/exercises')],
      ['My splits', 'Plan your week', 'layers', () => navigate('/splits')],
      ['Records', 'Personal bests', 'trophy', () => navigate('/records')],
    ].map(([t, sub, ic, fn]) => h('.card.card-pad.card-hover', { onclick: fn },
      h('div', { style: { color: 'var(--accent)', marginBottom: '8px' } }, icon(ic, 20)),
      h('div.sb', t), h('.t-xs.dim', sub))));

  return h('.stack.stack-20',
    hero,
    stats,
    goalCard,
    S.get().goals.filter((g) => !g.done).length ? goalStrip(navigate) : null,
    muscleCard,
    recoveryCard,
    recentCard,
    heat,
    sectionTitle('Quick access'),
    quick);
}

function goalStrip(navigate) {
  const goals = S.get().goals.filter((g) => !g.done).slice(0, 2);
  return h('.stack.stack-10',
    sectionTitle('Goals', h('button.link', { onclick: () => navigate('/goals') }, 'Manage')),
    ...goals.map((g) => {
      const span = (g.targetValue - g.startValue) || 1;
      const p = Math.max(0, Math.min(1, ((g.currentValue ?? g.startValue) - g.startValue) / span));
      return h('.card.card-pad.card-hover', { onclick: () => navigate('/goals') },
        h('.row-between', { style: { marginBottom: '8px' } },
          h('div.sb', g.title),
          h('span.t-sm.mono.dim', `${Math.round(p * 100)}%`)),
        h('.bar', h('i', { style: { width: `${p * 100}%` } })),
        g.targetDate ? h('.t-xs.dim', { style: { marginTop: '6px' } },
          `Target ${fmtDate(g.targetDate, 'short')} · ${Math.max(0, daysBetween(new Date(), parseDay(g.targetDate)))} days left`) : null);
    }));
}
