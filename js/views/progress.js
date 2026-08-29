import { h, icon, mount } from '../lib/dom.js';
import * as S from '../store.js';
import { statCard, sectionTitle, exerciseCard } from '../lib/components.js';
import { lineChart, barChart, hBarChart, groupedBars, heatmap, ring } from '../lib/charts.js';
import { weeklyBuckets, muscleVolume, sessionTotals, exerciseHistory, allPRs,
  streaks, bodySeries, exerciseSeries } from '../lib/stats.js';
import { analyseProgress, volumeStatus } from '../lib/progression.js';
import { bodyMapPair } from '../lib/anatomy.js';
import { fmtVolume, compactNum, fmtNum, startOfWeek, addDays, fmtDate, fmtDuration,
  relDay, uniq, fmtWeight } from '../lib/utils.js';
import { emptyState, segmented } from '../lib/ui.js';

export const title = 'Progress';

export function render({ navigate }) {
  const st = S.get();
  const unit = st.settings.unit;
  const done = S.completedSessions();
  const idx = S.exerciseIndex();

  if (!done.length) {
    return h('.stack.stack-16',
      emptyState({ iconName: 'chart', title: 'No data yet',
        message: 'Once you complete a workout, this page fills with volume trends, muscle-group balance, strength progression and personal records.',
        action: h('button.btn.btn-primary', { onclick: () => navigate('/workouts') }, 'Start a workout') }));
  }

  let range = 12;
  const body = h('.stack.stack-20');

  const draw = () => {
    const weeks = weeklyBuckets(done, range, st.settings.weekStart);
    const cur = weeks[weeks.length - 1], prev = weeks[weeks.length - 2] || { volume: 0, sets: 0, count: 0, reps: 0, durationSec: 0 };
    const ws = startOfWeek(new Date(), st.settings.weekStart);
    const mvWeek = muscleVolume(done, idx, { from: ws, to: addDays(ws, 6) });
    const mvAll = muscleVolume(done, idx, { from: addDays(ws, -7 * (range - 1)), to: addDays(ws, 6) });
    const targets = st.settings.muscleTargets;

    const delta = (a, b) => (b ? ((a - b) / b) * 100 : null);
    const dPct = (v) => (v === null ? null : { dir: v >= 0 ? 'up' : 'down', tone: v >= 0 ? 'good' : 'bad',
      text: `${v >= 0 ? '+' : ''}${v.toFixed(0)}% vs last week` });

    /* strength movers */
    const trained = uniq(done.flatMap((s) => s.entries.map((e) => e.exerciseId)));
    const movers = trained.map((id) => ({ id, a: analyseProgress(done, id) }))
      .filter((x) => x.a.metrics && x.a.sessionsUsed >= 2)
      .sort((a, b) => (b.a.metrics.e1rmChange) - (a.a.metrics.e1rmChange));
    const improving = movers.filter((x) => x.a.metrics.e1rmChange > 0.5).slice(0, 4);
    const stalling = movers.filter((x) => ['plateau', 'declining'].includes(x.a.status)).slice(0, 4);

    const bw = bodySeries(st.bodyEntries, 'weight');

    mount(body,
      h('.seg', ...[[4, '4 weeks'], [12, '12 weeks'], [26, '6 months'], [52, '1 year']].map(([v, l]) =>
        h(`button${range === v ? '.on' : ''}`, { onclick: () => { range = v; draw(); } }, l))),

      h('.grid.grid-2',
        statCard({ label: 'This week volume', iconName: 'chart',
          value: compactNum(unit === 'lb' ? cur.volume / 0.45359237 : cur.volume),
          delta: dPct(delta(cur.volume, prev.volume)) }),
        statCard({ label: 'Working sets', iconName: 'layers', tone: 'info',
          value: String(cur.sets), delta: dPct(delta(cur.sets, prev.sets)) }),
        statCard({ label: 'Workouts', iconName: 'dumbbell', tone: 'good',
          value: String(cur.count), delta: dPct(delta(cur.count, prev.count)) }),
        statCard({ label: 'Time trained', iconName: 'clock', tone: 'warn',
          value: fmtDuration(cur.durationSec), delta: dPct(delta(cur.durationSec, prev.durationSec)) })),

      h('.card.card-pad.stack.stack-12',
        h('.row-between', h('div.sb', 'Weekly training volume'),
          h('span.t-xs.dim', `${range} weeks`)),
        barChart(weeks.map((w, i) => ({
          label: shortWeek(w.weekStart),
          value: unit === 'lb' ? w.volume / 0.45359237 : w.volume,
          highlight: i === weeks.length - 1,
        })).filter((_, i, a) => a.length <= 14 || i % Math.ceil(a.length / 14) === 0 || i === a.length - 1),
        { height: 190, fmt: compactNum }),
        h('.t-xs.dim', 'Volume = weight × reps, summed across every completed working set.')),

      h('.card.card-pad.stack.stack-12',
        h('.row-between', h('div.sb', 'This week vs last week'), null),
        groupedBars(
          [{ label: 'Volume', a: prev.volume, b: cur.volume },
           { label: 'Sets', a: prev.sets * scaleFor(prev.volume, prev.sets), b: cur.sets * scaleFor(prev.volume, prev.sets) },
           { label: 'Reps', a: prev.reps * scaleFor(prev.volume, prev.reps), b: cur.reps * scaleFor(prev.volume, prev.reps) }],
          [{ key: 'a', label: 'Last week', color: 'var(--line-strong)' },
           { key: 'b', label: 'This week', color: 'var(--accent)' }],
          { height: 150, fmt: () => '' }),
        h('.stack', { style: { gap: '2px' } },
          cmpRow('Workouts', prev.count, cur.count, (v) => String(v)),
          cmpRow('Working sets', prev.sets, cur.sets, (v) => String(v)),
          cmpRow('Total reps', prev.reps, cur.reps, (v) => String(v)),
          cmpRow('Volume', prev.volume, cur.volume, (v) => fmtVolume(v, unit)),
          cmpRow('Time', prev.durationSec, cur.durationSec, (v) => fmtDuration(v)))),

      h('.card.card-pad.stack.stack-12',
        h('.row-between', h('div.sb', 'Weekly sets by muscle'),
          h('span.t-xs.dim', 'vs your target')),
        hBarChart(Object.entries(targets)
          .map(([m, t]) => ({ label: S.muscleName(m), value: mvWeek[m]?.sets || 0, target: t,
            color: volumeColor(mvWeek[m]?.sets || 0, t) }))
          .sort((a, b) => b.value - a.value), { showTarget: true, fmt: (v) => fmtNum(v, v % 1 ? 1 : 0) }),
        h('.t-xs.dim', 'A set counts fully for the primary muscle and as half a set for each secondary muscle. Targets are editable in Settings.')),

      h('.card.card-pad.stack.stack-12',
        h('div.sb', 'Training coverage'),
        bodyMapPair({ intensity: normalise(mvAll), label: true }),
        h('.t-xs.dim', { style: { textAlign: 'center' } },
          `Shading shows relative volume per muscle over the last ${range} weeks.`)),

      improving.length ? h('.stack.stack-10',
        sectionTitle('Improving'),
        ...improving.map(({ id, a }) => idx[id] ? exerciseCard(idx[id], {
          onClick: () => navigate(`/progress/${id}`),
          sub: `Est. 1RM +${a.metrics.e1rmChange.toFixed(1)}% over ${a.sessionsUsed} sessions`,
          right: h(`span.status-pill.${a.cls}`, h('i'), a.label),
        }) : null)) : null,

      stalling.length ? h('.stack.stack-10',
        sectionTitle('Worth a look'),
        ...stalling.map(({ id, a }) => idx[id] ? exerciseCard(idx[id], {
          onClick: () => navigate(`/progress/${id}`),
          sub: a.reason.slice(0, 90),
          right: h(`span.status-pill.${a.cls}`, h('i'), a.label),
        }) : null)) : null,

      bw.length > 1 ? h('.card.card-pad.stack.stack-10',
        h('.row-between', h('div.sb', 'Body weight'),
          h('button.link', { onclick: () => navigate('/body') }, 'Log')),
        lineChart(bw.map((p) => ({ date: p.date, value: unit === 'lb' ? p.value / 0.45359237 : p.value })),
          { height: 180, fmt: (v) => fmtNum(v, 1), label: 'body weight' })) : null,

      h('.grid.grid-2',
        h('button.card.card-pad.card-hover', { onclick: () => navigate('/records'), style: { textAlign: 'left', cursor: 'pointer' } },
          h('div', { style: { color: 'var(--warn)', marginBottom: '8px' } }, icon('trophy', 20)),
          h('div.sb', 'Personal records'), h('.t-xs.dim', `${allPRs(done).length} exercises tracked`)),
        h('button.card.card-pad.card-hover', { onclick: () => navigate('/history'), style: { textAlign: 'left', cursor: 'pointer' } },
          h('div', { style: { color: 'var(--accent)', marginBottom: '8px' } }, icon('history', 20)),
          h('div.sb', 'Full history'), h('.t-xs.dim', `${done.length} sessions`))),

      h('.stack.stack-10',
        sectionTitle('Per-exercise analytics'),
        h('.t-xs.dim', 'Open any exercise for weight, reps, volume and estimated 1RM charts.'),
        ...trained.slice(0, 12).map((id) => idx[id] ? exerciseCard(idx[id], {
          onClick: () => navigate(`/progress/${id}`),
          sub: `${exerciseHistory(done, id).length} sessions logged`,
          right: icon('chevronRight'),
        }) : null)));
  };

  draw();
  return body;
}

const scaleFor = (vol, n) => (n ? Math.max(1, vol / Math.max(n, 1)) : 1);
const shortWeek = (key) => { const [, m, d] = key.split('-'); return `${+d}/${+m}`; };

function cmpRow(label, prev, cur, fmt) {
  const d = prev ? ((cur - prev) / prev) * 100 : null;
  return h('.row-between', { style: { padding: '6px 0', borderBottom: '1px solid var(--line)' } },
    h('span.t-sm.muted', label),
    h('.row', { style: { gap: '10px' } },
      h('span.t-sm.dim.mono', fmt(prev)),
      h('span.dim', icon('arrowRight', 12)),
      h('span.t-sm.sb.mono', fmt(cur)),
      d !== null ? h('span.t-xs.sb', { style: { color: d >= 0 ? 'var(--good)' : 'var(--bad)', minWidth: '44px', textAlign: 'right' } },
        `${d >= 0 ? '+' : ''}${d.toFixed(0)}%`) : h('span.t-xs.dim', { style: { minWidth: '44px', textAlign: 'right' } }, '—')));
}

function volumeColor(sets, target) {
  const v = volumeStatus(sets, target);
  return v.id === 'high' ? 'var(--bad)' : v.id === 'low' ? 'var(--warn)' : 'var(--good)';
}

function normalise(mv) {
  const max = Math.max(...Object.values(mv).map((x) => x.volume || 0), 1);
  return Object.fromEntries(Object.entries(mv).map(([k, v]) => [k, Math.sqrt((v.volume || 0) / max)]));
}
