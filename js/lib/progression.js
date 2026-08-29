/* ============================================================
   Progressive overload engine.

   Two jobs:
     1. analyseProgress()  — classify an exercise's recent trend and explain why.
     2. suggestNext()      — propose concrete targets for the next session.

   Everything returned is advisory. The UI always labels output as a
   suggestion and the user can ignore or override it.
   ============================================================ */
import { e1rm, sum, avg, round, clamp, daysBetween, parseDay } from './utils.js';
import { exerciseHistory, setVolume } from './stats.js';

export const DEFAULT_RULE = {
  method: 'double',
  targetSets: 3,
  repRange: [8, 12],
  incrementKg: 2.5,
  autoregulate: true,
};

/** Sensible per-exercise defaults when the user has not set a rule. */
export function defaultRuleFor(exercise, goal) {
  const r = { ...DEFAULT_RULE };
  if (goal?.repRange) r.repRange = [...goal.repRange];
  if (!exercise) return r;
  if (exercise.mechanic === 'isolation') {
    r.repRange = [Math.max(8, r.repRange[0] + 2), r.repRange[1] + 3];
    r.incrementKg = 1.25;
  }
  if (exercise.tracking === 'duration') { r.repRange = [30, 60]; r.incrementKg = 0; }
  if (exercise.tracking === 'distance_time') { r.repRange = [10, 30]; r.incrementKg = 0; }
  const heavy = ['barbell', 'trap-bar', 'smith', 'machine'];
  if ((exercise.equipment || []).some((q) => heavy.includes(q)) && exercise.mechanic === 'compound') r.incrementKg = 2.5;
  if ((exercise.primaryMuscles || []).some((m) => ['quads', 'hamstrings', 'glutes', 'lower-back'].includes(m))
      && exercise.mechanic === 'compound') r.incrementKg = 5;
  if ((exercise.equipment || []).includes('dumbbell')) r.incrementKg = exercise.mechanic === 'isolation' ? 1.25 : 2;
  return r;
}

/** Least-squares slope of y over evenly spaced x, normalised to % per session. */
function slopePct(values) {
  const n = values.length;
  if (n < 2) return 0;
  const mx = (n - 1) / 2, my = avg(values);
  let num = 0, den = 0;
  for (let i = 0; i < n; i++) { num += (i - mx) * (values[i] - my); den += (i - mx) ** 2; }
  const slope = den ? num / den : 0;
  return my ? (slope / Math.abs(my)) * 100 : 0;
}

export const STATUS = {
  progressing: { id: 'progressing', label: 'Progressing', cls: 'st-progressing', tone: 'good' },
  maintaining: { id: 'maintaining', label: 'Maintaining', cls: 'st-maintaining', tone: 'info' },
  plateau:     { id: 'plateau',     label: 'Plateau',     cls: 'st-plateau',     tone: 'warn' },
  declining:   { id: 'declining',   label: 'Declining',   cls: 'st-declining',   tone: 'bad' },
  new:         { id: 'new',         label: 'Not enough data', cls: 'st-new',     tone: 'dim' },
};

/**
 * Classify recent performance for one exercise.
 * @returns {{status, label, cls, reason, metrics, sessionsUsed, deload:boolean}}
 */
export function analyseProgress(sessions, exerciseId, { window = 5 } = {}) {
  const hist = exerciseHistory(sessions, exerciseId);
  const used = hist.slice(0, window).reverse(); // oldest → newest
  if (used.length < 2) {
    return { ...STATUS.new, status: 'new', sessionsUsed: used.length, deload: false,
      reason: used.length === 1
        ? 'Logged once so far. Two or more sessions are needed before a trend means anything.'
        : 'No completed sessions logged for this exercise yet.',
      metrics: null };
  }
  const e1 = used.map((h) => h.bestE1rm);
  const vol = used.map((h) => h.volume);
  const wt = used.map((h) => h.maxWeight);
  const reps = used.map((h) => sum(h.sets.map((s) => Number(s.reps) || 0)));

  const m = {
    e1rmSlope: slopePct(e1), volumeSlope: slopePct(vol),
    weightSlope: slopePct(wt), repsSlope: slopePct(reps),
    e1rmChange: e1[0] ? ((e1[e1.length - 1] - e1[0]) / e1[0]) * 100 : 0,
    volumeChange: vol[0] ? ((vol[vol.length - 1] - vol[0]) / vol[0]) * 100 : 0,
    latestE1rm: e1[e1.length - 1], firstE1rm: e1[0],
    sessions: used.length,
  };
  /* Composite score: strength trend weighted above raw volume. */
  const score = m.e1rmSlope * 0.55 + m.volumeSlope * 0.25 + m.weightSlope * 0.2;

  let status, reason;
  if (score >= 1.2) {
    status = 'progressing';
    reason = `Estimated strength is up ${fmtPct(m.e1rmChange)} and training volume ${fmtPct(m.volumeChange)} across your last ${used.length} sessions.`;
  } else if (score <= -2.2) {
    status = 'declining';
    reason = `Performance has fallen ${fmtPct(Math.abs(m.e1rmChange))} over your last ${used.length} sessions. Fatigue, sleep or recovery are worth reviewing.`;
  } else if (Math.abs(score) < 0.55 && used.length >= 3) {
    status = 'plateau';
    reason = `Weight, reps and volume have stayed within a few percent across your last ${used.length} sessions.`;
  } else {
    status = 'maintaining';
    reason = score > 0
      ? `Small gains — estimated strength is up ${fmtPct(m.e1rmChange)} over ${used.length} sessions.`
      : `Holding roughly steady over your last ${used.length} sessions.`;
  }
  /* Deload flag: sustained decline, or a long plateau with rising RPE. */
  const rpes = used.map((h) => h.avgRpe).filter((x) => x != null);
  const rpeRising = rpes.length >= 3 && rpes[rpes.length - 1] - rpes[0] >= 1;
  const deload = status === 'declining' || (status === 'plateau' && used.length >= 4 && rpeRising);

  return { ...STATUS[status], status, reason, metrics: m, sessionsUsed: used.length, deload,
    rpeRising, history: used };
}
const fmtPct = (v) => `${Math.abs(v) < 0.05 ? '0' : Math.abs(v).toFixed(1)}%`;

/**
 * Concrete suggestions for the next session of one exercise.
 * @returns {{ headline, rationale, options:[{label, detail, weight, reps, sets, kind}], rule, last }}
 */
export function suggestNext(sessions, exercise, rule, { unit = 'kg' } = {}) {
  const R = { ...defaultRuleFor(exercise), ...(rule || {}) };
  const hist = exerciseHistory(sessions, exercise.id);
  const last = hist[0] || null;
  const [lo, hi] = R.repRange;
  const inc = R.incrementKg || 2.5;

  if (!last) {
    return {
      headline: 'First time logging this',
      rationale: `Pick a weight you can control for ${lo}–${hi} reps with 2–3 reps still in reserve. That becomes your baseline for every future suggestion.`,
      options: [{ label: `Find a working weight`, detail: `${R.targetSets} sets × ${lo}–${hi} reps`, sets: R.targetSets, reps: hi, kind: 'baseline' }],
      rule: R, last: null, status: null,
    };
  }

  const working = last.sets;
  const topWeight = Math.max(...working.map((s) => Number(s.weight) || 0), 0);
  const atTop = working.filter((s) => Math.abs((Number(s.weight) || 0) - topWeight) < 0.01);
  const repsAtTop = atTop.map((s) => Number(s.reps) || 0);
  const minReps = Math.min(...repsAtTop);
  const maxReps = Math.max(...repsAtTop);
  const setsAtTop = atTop.length;
  const analysis = analyseProgress(sessions, exercise.id);
  const avgRpe = last.avgRpe;
  const daysAgo = daysBetween(parseDay(last.date), new Date());

  const opts = [];
  const push = (o) => opts.push(o);
  const W = (w) => round(w, unit === 'lb' ? 0.5669904625 : 0.25); // ≈1.25 lb / 0.25 kg granularity

  let headline, rationale;

  /* -- deload takes priority over any progression -- */
  if (analysis.deload) {
    headline = 'Consider backing off this week';
    rationale = `${analysis.reason} A lighter week often restores progress faster than pushing through.`;
    push({ label: 'Deload 10%', detail: `${R.targetSets} × ${lo}–${hi} at a lighter load`, weight: W(topWeight * 0.9), reps: Math.round((lo + hi) / 2), sets: R.targetSets, kind: 'deload' });
    push({ label: 'Repeat last session', detail: `${topWeight ? fmtW(topWeight, unit) + ' × ' : ''}${minReps} reps, focus on form`, weight: topWeight, reps: minReps, sets: setsAtTop, kind: 'hold' });
    push({ label: 'Drop a set, keep the weight', detail: `${Math.max(1, setsAtTop - 1)} × ${minReps} reps`, weight: topWeight, reps: minReps, sets: Math.max(1, setsAtTop - 1), kind: 'reduce-volume' });
    return { headline, rationale, options: opts, rule: R, last, status: analysis };
  }

  switch (R.method) {
    case 'weight-first': {
      if (minReps >= lo) {
        headline = `Add ${fmtW(inc, unit)}`;
        rationale = `You hit at least ${lo} reps on every set at ${fmtW(topWeight, unit)}, which is the trigger for adding weight under this rule.`;
        push({ label: `${fmtW(W(topWeight + inc), unit)} × ${lo}–${hi}`, detail: 'Add the smallest increment', weight: W(topWeight + inc), reps: lo, sets: setsAtTop, kind: 'weight' });
      } else {
        headline = 'Hold the weight and build reps';
        rationale = `Your lowest set was ${minReps} reps — reach ${lo} on all sets before adding load.`;
        push({ label: `${fmtW(topWeight, unit)} × ${minReps + 1}`, detail: 'Add one rep to the weakest set', weight: topWeight, reps: minReps + 1, sets: setsAtTop, kind: 'reps' });
      }
      break;
    }
    case 'reps-first': {
      if (maxReps >= hi + 3) {
        headline = `Reset with ${fmtW(inc, unit)} more`;
        rationale = `You reached ${maxReps} reps, well past the top of your range. Add weight and rebuild reps.`;
        push({ label: `${fmtW(W(topWeight + inc), unit)} × ${lo}`, detail: 'Reset the rep count higher up', weight: W(topWeight + inc), reps: lo, sets: setsAtTop, kind: 'weight' });
      } else {
        headline = 'Push the reps';
        rationale = `Keep ${fmtW(topWeight, unit)} on the bar and chase more reps before adding load.`;
        push({ label: `${fmtW(topWeight, unit)} × ${maxReps + 1}`, detail: 'One more rep than last time', weight: topWeight, reps: maxReps + 1, sets: setsAtTop, kind: 'reps' });
      }
      break;
    }
    case 'volume': {
      const lastVol = last.volume;
      headline = 'Add volume';
      rationale = `Last session was ${Math.round(lastVol)} ${unit} of volume across ${working.length} sets. Adding a set is the simplest way to increase it.`;
      push({ label: `Add a set`, detail: `${setsAtTop + 1} × ${minReps} at ${fmtW(topWeight, unit)}`, weight: topWeight, reps: minReps, sets: setsAtTop + 1, kind: 'sets' });
      push({ label: `${fmtW(topWeight, unit)} × ${minReps + 1}`, detail: 'Or add a rep to every set', weight: topWeight, reps: minReps + 1, sets: setsAtTop, kind: 'reps' });
      break;
    }
    case 'manual':
      headline = 'Manual progression';
      rationale = 'Automatic suggestions are off for this exercise. Your last session is shown for reference.';
      push({ label: 'Repeat last session', detail: `${setsAtTop} × ${minReps}–${maxReps} at ${fmtW(topWeight, unit)}`, weight: topWeight, reps: maxReps, sets: setsAtTop, kind: 'hold' });
      break;

    default: { /* double progression */
      const cleared = repsAtTop.length >= Math.min(R.targetSets, setsAtTop) && minReps >= hi;
      if (cleared) {
        headline = `Time to add ${fmtW(inc, unit)}`;
        rationale = `You hit ${hi}+ reps on every set at ${fmtW(topWeight, unit)} — the top of your ${lo}–${hi} range. Add the smallest increment; reps will drop back toward ${lo} and you climb again.`;
        push({ label: `${fmtW(W(topWeight + inc), unit)} × ${lo}–${lo + 2}`, detail: `Recommended — ${R.targetSets} sets`, weight: W(topWeight + inc), reps: lo, sets: R.targetSets, kind: 'weight' });
        push({ label: `${fmtW(topWeight, unit)} × ${maxReps + 1}`, detail: 'Or squeeze out one more rep first', weight: topWeight, reps: maxReps + 1, sets: setsAtTop, kind: 'reps' });
      } else if (minReps >= hi - 1 && setsAtTop >= R.targetSets) {
        headline = 'One more rep and you earn the jump';
        rationale = `You are one rep short of ${hi} on your weakest set at ${fmtW(topWeight, unit)}. Clear ${hi} across all ${R.targetSets} sets and the weight goes up next time.`;
        push({ label: `${fmtW(topWeight, unit)} × ${hi}`, detail: `Aim for ${hi} on every set`, weight: topWeight, reps: hi, sets: R.targetSets, kind: 'reps' });
        push({ label: `${fmtW(W(topWeight + inc), unit)} × ${lo}`, detail: 'Or jump early if last session felt easy', weight: W(topWeight + inc), reps: lo, sets: R.targetSets, kind: 'weight' });
      } else if (setsAtTop < R.targetSets) {
        headline = `Add a set at ${fmtW(topWeight, unit)}`;
        rationale = `You logged ${setsAtTop} of your ${R.targetSets} target sets at this weight. Complete the set count before changing the load.`;
        push({ label: `${R.targetSets} × ${minReps}`, detail: `Same weight, ${R.targetSets - setsAtTop} more set${R.targetSets - setsAtTop > 1 ? 's' : ''}`, weight: topWeight, reps: minReps, sets: R.targetSets, kind: 'sets' });
      } else {
        headline = 'Add a rep';
        rationale = `You are at ${minReps}–${maxReps} reps inside your ${lo}–${hi} range. Keep ${fmtW(topWeight, unit)} and add reps until every set reaches ${hi}.`;
        push({ label: `${fmtW(topWeight, unit)} × ${minReps + 1}`, detail: 'Add one rep to your weakest set', weight: topWeight, reps: minReps + 1, sets: setsAtTop, kind: 'reps' });
        push({ label: `${fmtW(topWeight, unit)} × ${Math.min(hi, maxReps + 2)}`, detail: 'Or push two reps if it felt easy', weight: topWeight, reps: Math.min(hi, maxReps + 2), sets: setsAtTop, kind: 'reps' });
      }
    }
  }

  /* Autoregulation from RPE / RIR. */
  if (R.autoregulate && avgRpe != null) {
    if (avgRpe <= 6.5) {
      rationale += ` Your average RPE was ${avgRpe.toFixed(1)}, so there was plenty left in the tank.`;
      push({ label: `${fmtW(W(topWeight + inc), unit)} × ${Math.max(lo, minReps - 1)}`, detail: `Low RPE last time — a bigger jump is reasonable`, weight: W(topWeight + inc), reps: Math.max(lo, minReps - 1), sets: setsAtTop, kind: 'weight' });
    } else if (avgRpe >= 9.5) {
      rationale += ` Average RPE was ${avgRpe.toFixed(1)} — close to failure, so repeating the load is a fair call.`;
      push({ label: `Repeat ${fmtW(topWeight, unit)} × ${minReps}`, detail: 'Very high RPE last session', weight: topWeight, reps: minReps, sets: setsAtTop, kind: 'hold' });
    }
  }
  if (daysAgo > 21) {
    rationale += ` It has been ${daysAgo} days since you last did this, so easing back in is sensible.`;
    push({ label: `${fmtW(W(topWeight * 0.9), unit)} × ${Math.round((lo + hi) / 2)}`, detail: 'Ease back after the layoff', weight: W(topWeight * 0.9), reps: Math.round((lo + hi) / 2), sets: setsAtTop, kind: 'deload' });
  }
  push({ label: 'Repeat last session', detail: `${setsAtTop} × ${minReps}–${maxReps} at ${fmtW(topWeight, unit)}`, weight: topWeight, reps: maxReps, sets: setsAtTop, kind: 'hold' });

  /* De-duplicate by weight+reps, keep first (highest priority). */
  const seen = new Set();
  const options = opts.filter((o) => {
    const k = `${o.weight ?? ''}|${o.reps ?? ''}|${o.sets ?? ''}`;
    if (seen.has(k)) return false; seen.add(k); return true;
  }).slice(0, 4);

  return { headline, rationale, options, rule: R, last, status: analysis, daysAgo };
}

function fmtW(kg, unit) {
  if (!kg) return '—';
  const v = unit === 'lb' ? kg / 0.45359237 : kg;
  return `${(Math.round(v * 100) / 100).toString().replace(/\.00$/, '')} ${unit}`;
}

/**
 * Pre-fill values for a set during an active workout: last performance,
 * nudged by the top suggestion.
 */
export function prefillFor(sessions, exercise, rule, setIndex, unit = 'kg') {
  const s = suggestNext(sessions, exercise, rule, { unit });
  if (!s.last) return { weight: '', reps: '', suggestion: s };
  const prevSet = s.last.sets[Math.min(setIndex, s.last.sets.length - 1)];
  const top = s.options[0];
  const useTop = top && top.weight != null && top.kind !== 'hold';
  return {
    weight: useTop ? top.weight : (Number(prevSet?.weight) || ''),
    reps: useTop && top.reps ? top.reps : (Number(prevSet?.reps) || ''),
    prevSet, suggestion: s,
  };
}

/** Weekly volume guidance per muscle relative to the user's target. */
export function volumeStatus(setsThisWeek, target) {
  if (!target) return { id: 'none', label: '—', cls: 'st-new' };
  if (setsThisWeek < target * 0.6) return { id: 'low', label: 'Undertrained', cls: 'st-plateau' };
  if (setsThisWeek > target * 1.6) return { id: 'high', label: 'High volume', cls: 'st-declining' };
  if (setsThisWeek >= target * 0.6 && setsThisWeek <= target * 1.6) return { id: 'ok', label: 'On target', cls: 'st-progressing' };
  return { id: 'none', label: '—', cls: 'st-new' };
}
