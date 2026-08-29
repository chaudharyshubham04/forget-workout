import { h, icon, mount } from '../lib/dom.js';
import * as S from '../store.js';
import { lineChart, barChart, sparkline } from '../lib/charts.js';
import { exerciseSeries, exerciseHistory, exercisePRs, repsAtWeightSeries, setVolume } from '../lib/stats.js';
import { analyseProgress, suggestNext } from '../lib/progression.js';
import { fmtWeight, compactNum, fmtNum, fmtDate, relDay, daysBetween, parseDay } from '../lib/utils.js';
import { emptyState, sheet, toast } from '../lib/ui.js';
import { fmtSet } from '../lib/components.js';
import { openRuleSheet, ruleSummary } from './exerciseDetail.js';

export const title = (ctx) => S.exerciseById(ctx.params.id)?.name || 'Analytics';

const METRICS = [
  { id: 'e1rm',   label: 'Est. 1RM',  desc: 'Best estimated one-rep max per session' },
  { id: 'weight', label: 'Weight',    desc: 'Heaviest weight lifted per session' },
  { id: 'reps',   label: 'Reps',      desc: 'Most reps in a single set per session' },
  { id: 'volume', label: 'Volume',    desc: 'Total weight × reps per session' },
  { id: 'sets',   label: 'Sets',      desc: 'Completed working sets per session' },
  { id: 'rpe',    label: 'Avg RPE',   desc: 'Average perceived exertion per session' },
];
const RANGES = [[30, '30d'], [90, '3m'], [180, '6m'], [365, '1y'], [0, 'All']];

export function render({ params, navigate, refresh }) {
  const ex = S.exerciseById(params.id);
  if (!ex) return emptyState({ iconName: 'search', title: 'Exercise not found' });

  const unit = S.settings().unit;
  const done = S.completedSessions();
  const hist = exerciseHistory(done, ex.id);
  if (!hist.length) {
    return emptyState({ iconName: 'chartline', title: `No data for ${ex.name}`,
      message: 'Log this exercise in a workout and its charts will build up here automatically.',
      action: h('button.btn.btn-primary', { onclick: () => navigate(`/exercise/${ex.id}`) }, 'View exercise') });
  }

  let metric = 'e1rm', days = 90;
  const analysis = analyseProgress(done, ex.id);
  const prs = exercisePRs(done, ex.id);
  const suggestion = suggestNext(done, ex, S.ruleFor(ex.id), { unit });

  const chartHost = h('div');
  const statHost = h('div');

  const filtered = () => {
    let series = exerciseSeries(done, ex.id, metric);
    if (days) {
      const cutoff = daysBetween(new Date(), new Date()) ;
      series = series.filter((p) => daysBetween(parseDay(p.date), new Date()) <= days);
    }
    if (metric === 'weight' || metric === 'e1rm' || metric === 'volume') {
      series = series.map((p) => ({ ...p, value: unit === 'lb' ? p.value / 0.45359237 : p.value }));
    }
    return series;
  };

  const draw = () => {
    const series = filtered();
    const m = METRICS.find((x) => x.id === metric);
    mount(chartHost,
      series.length > 1
        ? lineChart(series, { height: 210, yMinZero: metric === 'volume' || metric === 'sets',
            fmt: metric === 'rpe' ? (v) => fmtNum(v, 1) : compactNum, label: m.label })
        : h('.chart-empty', `Not enough sessions in this range to plot ${m.label.toLowerCase()}.`),
      h('.t-xs.dim', { style: { marginTop: '6px' } }, m.desc));

    if (series.length > 1) {
      const first = series[0].value, last = series[series.length - 1].value;
      const change = first ? ((last - first) / first) * 100 : 0;
      mount(statHost, h('.grid.grid-3',
        cell('Start', fmtMetric(first, metric, unit)),
        cell('Latest', fmtMetric(last, metric, unit)),
        cell('Change', `${change >= 0 ? '+' : ''}${change.toFixed(1)}%`,
          change >= 0 ? 'var(--good)' : 'var(--bad)')));
    } else mount(statHost);
  };

  const metricBar = h('.seg', ...METRICS.map((m) =>
    h(`button${metric === m.id ? '.on' : ''}`, { onclick: (e) => {
      metric = m.id;
      [...metricBar.children].forEach((c) => c.classList.remove('on'));
      e.currentTarget.classList.add('on'); draw();
    } }, m.label)));

  const rangeBar = h('.seg', ...RANGES.map(([v, l]) =>
    h(`button${days === v ? '.on' : ''}`, { onclick: (e) => {
      days = v;
      [...rangeBar.children].forEach((c) => c.classList.remove('on'));
      e.currentTarget.classList.add('on'); draw();
    } }, l)));

  draw();

  /* double-progression: reps achieved at each weight */
  const topWeights = (prs?.repsAtWeight || []).slice(0, 4);
  const dpCards = topWeights.map((w) => {
    const s = repsAtWeightSeries(done, ex.id, w.weight);
    return h('.card.card-pad.stack.stack-8',
      h('.row-between',
        h('div.sb', fmtWeight(w.weight, unit)),
        h('span.t-xs.dim', `best ${w.reps} reps`)),
      s.length > 1 ? lineChart(s, { height: 120, yMinZero: true, showDots: true, fmt: (v) => fmtNum(v, 0), label: 'reps' })
        : h('.t-xs.dim', 'Only one session at this weight so far.'));
  });

  return h('.stack.stack-16',
    h('div',
      h('h1', ex.name),
      h('.t-sm.muted', { style: { marginTop: '4px' } },
        `${hist.length} sessions · first logged ${fmtDate(hist[hist.length - 1].date, 'short')}`)),

    h('.card.card-pad.stack.stack-10',
      h('.row-between',
        h(`span.status-pill.${analysis.cls}`, h('i'), analysis.label),
        h('button.btn.btn-xs', { onclick: () => openRuleSheet(ex, { refresh }) },
          icon('bolt', 13), 'Rules')),
      h('.t-sm.muted', { style: { lineHeight: 1.55 } }, analysis.reason),
      h('.t-xs.dim', ruleSummary(S.ruleFor(ex.id))),
      analysis.deload ? h('.card.card-pad', { style: { background: 'var(--warn-soft)', border: 'none' } },
        h('.row', { style: { gap: '9px', alignItems: 'flex-start' } },
          h('span', { style: { color: 'var(--warn)' } }, icon('alert', 16)),
          h('.t-sm', { style: { lineHeight: 1.5 } },
            'A lighter week may help. Options: hold the weight and focus on form, cut a set, or drop the load about 10% for a week. This is a general training suggestion, not medical advice.'))) : null),

    h('.card.card-pad.stack.stack-12',
      h('.row-between', h('div.sb', 'Progression'), rangeBar),
      metricBar, chartHost, statHost),

    prs ? h('.stack.stack-10',
      h('h2', 'Personal records'),
      h('.grid.grid-2',
        prs.heaviest ? prCell('Heaviest weight', fmtWeight(prs.heaviest.weight, unit),
          `× ${prs.heaviest.reps} · ${fmtDate(prs.heaviest.date, 'short')}`) : null,
        prs.bestE1rm ? prCell('Best est. 1RM', fmtWeight(prs.bestE1rm.value, unit),
          `${fmtWeight(prs.bestE1rm.weight, unit)} × ${prs.bestE1rm.reps}`) : null,
        prs.mostReps ? prCell('Most reps', String(prs.mostReps.reps),
          `at ${fmtWeight(prs.mostReps.weight, unit)}`) : null,
        prs.bestSetVolume ? prCell('Best set volume',
          `${compactNum(unit === 'lb' ? prs.bestSetVolume.value / 0.45359237 : prs.bestSetVolume.value)} ${unit}`,
          `${fmtWeight(prs.bestSetVolume.weight, unit)} × ${prs.bestSetVolume.reps}`) : null,
        prs.bestSessionVolume ? prCell('Best session volume',
          `${compactNum(unit === 'lb' ? prs.bestSessionVolume.value / 0.45359237 : prs.bestSessionVolume.value)} ${unit}`,
          fmtDate(prs.bestSessionVolume.date, 'short')) : null,
        prCell('Lifetime volume',
          `${compactNum(unit === 'lb' ? prs.totalVolume / 0.45359237 : prs.totalVolume)} ${unit}`,
          `${prs.totalSets} sets`))) : null,

    dpCards.length ? h('.stack.stack-10',
      h('h2', 'Reps at each weight'),
      h('.t-xs.dim', 'The double-progression view: watch reps climb at a fixed load before the weight goes up.'),
      ...dpCards) : null,

    h('.card.card-pad.stack.stack-10',
      h('.row', { style: { gap: '8px' } },
        h('span', { style: { color: 'var(--accent)' } }, icon('bolt', 17)),
        h('div.sb', suggestion.headline),
        h('span.tag.tag-accent', 'Suggestion')),
      h('.t-sm.muted', { style: { lineHeight: 1.55 } }, suggestion.rationale),
      h('.row.wrap', { style: { gap: '6px' } },
        ...suggestion.options.map((o) => h('span.chip.chip-sm.chip-static', o.label)))),

    h('.stack.stack-10',
      h('h2', 'Session history'),
      ...hist.map((entry) => h('.card.card-pad.stack.stack-8',
        h('.row-between',
          h('div',
            h('div.sb', fmtDate(entry.date, 'med')),
            h('.t-xs.dim', `${relDay(entry.date)} · ${entry.name || 'Workout'}`)),
          h('.row', { style: { gap: '8px' } },
            h('span.t-xs.dim.mono', `${compactNum(unit === 'lb' ? entry.volume / 0.45359237 : entry.volume)} ${unit}`),
            h('button.btn.btn-xs', { onclick: () => navigate(`/history/${entry.sessionId}`) }, 'Edit'))),
        h('.stack', { style: { gap: '2px' } }, ...entry.sets.map((s, i) =>
          h('.row-between', { style: { padding: '2px 0' } },
            h('span.t-xs.dim', `Set ${i + 1}`),
            h('span.t-sm.mono.sb', fmtSet(s, ex, unit)),
            h('span.t-xs.dim', s.rpe ? `RPE ${s.rpe}` : s.rir != null ? `${s.rir} RIR` : '·')))),
        entry.notes ? h('.t-xs.muted', { style: { fontStyle: 'italic' } }, entry.notes) : null))));
}

const cell = (label, value, color) => h('.stat',
  h('.stat-v', { style: { fontSize: '1.15rem', color } }, value), h('.stat-l', label));
const prCell = (label, value, sub) => h('.stat',
  h('.stat-v', { style: { fontSize: '1.15rem' } }, value),
  h('.stat-l', label), sub ? h('.t-xs.dim', { style: { marginTop: '3px' } }, sub) : null);

function fmtMetric(v, metric, unit) {
  if (metric === 'reps' || metric === 'sets') return fmtNum(v, 0);
  if (metric === 'rpe') return fmtNum(v, 1);
  if (metric === 'volume') return `${compactNum(v)} ${unit}`;
  return `${fmtNum(v, v % 1 ? 1 : 0)} ${unit}`;
}
