/* Derived analytics. Everything is computed from individual SetLog records at
   read time, so editing history immediately re-flows through every chart. */
import { e1rm, sum, groupBy, dayKey, parseDay, startOfWeek, addDays, daysBetween, uniq } from './utils.js';

/** A set counts toward volume/PRs only if it was completed and not a warm-up. */
export const isWorkingSet = (s) => s.done && s.type !== 'warmup';
export const setVolume = (s) => (Number(s.weight) || 0) * (Number(s.reps) || 0);

export function sessionSets(session, { workingOnly = true } = {}) {
  const out = [];
  for (const entry of session.entries || []) {
    for (const s of entry.sets || []) {
      if (workingOnly && !isWorkingSet(s)) continue;
      out.push({ ...s, exerciseId: entry.exerciseId, entryId: entry.id, date: session.date, sessionId: session.id });
    }
  }
  return out;
}

export function sessionTotals(session) {
  const sets = sessionSets(session);
  const volume = sum(sets.map(setVolume));
  return {
    volume,
    sets: sets.length,
    reps: sum(sets.map((s) => Number(s.reps) || 0)),
    exercises: (session.entries || []).filter((en) => (en.sets || []).some(isWorkingSet)).length,
    durationSec: session.durationSec || (session.endedAt && session.startedAt
      ? Math.round((session.endedAt - session.startedAt) / 1000) : 0),
  };
}

/** All completed working sets for one exercise, newest session first. */
export function exerciseHistory(sessions, exerciseId) {
  const out = [];
  for (const s of sessions) {
    if (s.status !== 'completed') continue;
    for (const entry of s.entries || []) {
      if (entry.exerciseId !== exerciseId) continue;
      const sets = (entry.sets || []).filter(isWorkingSet);
      if (!sets.length) continue;
      out.push({
        sessionId: s.id, date: s.date, name: s.name, notes: entry.notes, sets,
        volume: sum(sets.map(setVolume)),
        topSet: sets.reduce((b, x) => (!b || setVolume(x) > setVolume(b) ? x : b), null),
        bestE1rm: Math.max(...sets.map((x) => e1rm(Number(x.weight) || 0, Number(x.reps) || 0)), 0),
        maxWeight: Math.max(...sets.map((x) => Number(x.weight) || 0), 0),
        maxReps: Math.max(...sets.map((x) => Number(x.reps) || 0), 0),
        avgRpe: (() => { const r = sets.map((x) => Number(x.rpe)).filter(Boolean); return r.length ? sum(r) / r.length : null; })(),
      });
    }
  }
  return out.sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));
}

/** Most recent session in which this exercise was performed. */
export const lastPerformance = (sessions, exerciseId) => exerciseHistory(sessions, exerciseId)[0] || null;

/** Personal records for one exercise. */
export function exercisePRs(sessions, exerciseId) {
  const hist = exerciseHistory(sessions, exerciseId);
  if (!hist.length) return null;
  const all = hist.flatMap((h) => h.sets.map((s) => ({ ...s, date: h.date })));
  const best = (f) => all.reduce((b, x) => (!b || f(x) > f(b) ? x : b), null);
  const heaviest = best((s) => Number(s.weight) || 0);
  const mostReps = best((s) => Number(s.reps) || 0);
  const bestE1 = best((s) => e1rm(Number(s.weight) || 0, Number(s.reps) || 0));
  const bestVolSession = hist.reduce((b, x) => (!b || x.volume > b.volume ? x : b), null);
  const bestSetVol = best(setVolume);
  /* Best reps achieved at each distinct weight — the double-progression view. */
  const byWeight = new Map();
  for (const s of all) {
    const w = Number(s.weight) || 0, r = Number(s.reps) || 0;
    if (!byWeight.has(w) || byWeight.get(w).reps < r) byWeight.set(w, { reps: r, date: s.date });
  }
  return {
    heaviest: heaviest && Number(heaviest.weight) ? { weight: Number(heaviest.weight), reps: Number(heaviest.reps), date: heaviest.date } : null,
    mostReps: mostReps ? { weight: Number(mostReps.weight) || 0, reps: Number(mostReps.reps) || 0, date: mostReps.date } : null,
    bestE1rm: bestE1 ? { value: e1rm(Number(bestE1.weight) || 0, Number(bestE1.reps) || 0), weight: Number(bestE1.weight) || 0, reps: Number(bestE1.reps) || 0, date: bestE1.date } : null,
    bestSessionVolume: bestVolSession ? { value: bestVolSession.volume, date: bestVolSession.date } : null,
    bestSetVolume: bestSetVol ? { value: setVolume(bestSetVol), weight: Number(bestSetVol.weight) || 0, reps: Number(bestSetVol.reps) || 0, date: bestSetVol.date } : null,
    repsAtWeight: [...byWeight.entries()].sort((a, b) => b[0] - a[0]).map(([weight, v]) => ({ weight, ...v })),
    sessions: hist.length,
    lastDate: hist[0].date,
    totalVolume: sum(hist.map((h) => h.volume)),
    totalSets: sum(hist.map((h) => h.sets.length)),
  };
}

/**
 * PRs newly set by `session`, compared against everything before it.
 * Returns [{ exerciseId, kind, value, previous, weight, reps }]
 */
export function detectPRs(sessions, session) {
  const prior = sessions.filter((s) => s.id !== session.id && s.status === 'completed' &&
    (s.date < session.date || (s.date === session.date && (s.startedAt || 0) < (session.startedAt || 0))));
  const out = [];
  for (const entry of session.entries || []) {
    const sets = (entry.sets || []).filter(isWorkingSet);
    if (!sets.length) continue;
    const before = exercisePRs(prior, entry.exerciseId);
    const w = Math.max(...sets.map((s) => Number(s.weight) || 0), 0);
    const r = Math.max(...sets.map((s) => Number(s.reps) || 0), 0);
    const oneRm = Math.max(...sets.map((s) => e1rm(Number(s.weight) || 0, Number(s.reps) || 0)), 0);
    const vol = sum(sets.map(setVolume));
    const top = sets.reduce((b, x) => (!b || e1rm(Number(x.weight) || 0, Number(x.reps) || 0) > e1rm(Number(b.weight) || 0, Number(b.reps) || 0) ? x : b), null);
    if (!before) {
      if (w > 0 || r > 0) out.push({ exerciseId: entry.exerciseId, kind: 'first', value: oneRm, previous: 0, weight: w, reps: r });
      continue;
    }
    if (w > (before.heaviest?.weight || 0)) out.push({ exerciseId: entry.exerciseId, kind: 'weight', value: w, previous: before.heaviest?.weight || 0, weight: w, reps: sets.find((s) => Number(s.weight) === w)?.reps || 0 });
    if (oneRm > (before.bestE1rm?.value || 0) + 0.01) out.push({ exerciseId: entry.exerciseId, kind: 'e1rm', value: oneRm, previous: before.bestE1rm?.value || 0, weight: Number(top?.weight) || 0, reps: Number(top?.reps) || 0 });
    if (vol > (before.bestSessionVolume?.value || 0)) out.push({ exerciseId: entry.exerciseId, kind: 'volume', value: vol, previous: before.bestSessionVolume?.value || 0 });
    /* Reps PR only counts at a weight already lifted before, otherwise it duplicates a weight PR. */
    const prevAt = new Map(before.repsAtWeight.map((x) => [x.weight, x.reps]));
    for (const s of sets) {
      const ww = Number(s.weight) || 0, rr = Number(s.reps) || 0;
      if (prevAt.has(ww) && rr > prevAt.get(ww)) {
        out.push({ exerciseId: entry.exerciseId, kind: 'reps', value: rr, previous: prevAt.get(ww), weight: ww, reps: rr });
        prevAt.set(ww, rr);
      }
    }
  }
  return out;
}

/** Every exercise's PRs, for the records screen. */
export function allPRs(sessions) {
  const ids = uniq(sessions.filter((s) => s.status === 'completed').flatMap((s) => (s.entries || []).map((e) => e.exerciseId)));
  return ids.map((id) => ({ exerciseId: id, prs: exercisePRs(sessions, id) })).filter((x) => x.prs);
}

/* ---------- aggregation over time ---------- */

export function sessionsInRange(sessions, from, to) {
  const a = dayKey(from), b = dayKey(to);
  return sessions.filter((s) => s.status === 'completed' && s.date >= a && s.date <= b);
}

/** Weekly buckets: [{ weekStart, sessions[], volume, sets, reps, durationSec }] */
export function weeklyBuckets(sessions, weeks = 12, weekStart = 1, endDate = new Date()) {
  const out = [];
  const thisWeek = startOfWeek(endDate, weekStart);
  for (let i = weeks - 1; i >= 0; i--) {
    const from = addDays(thisWeek, -7 * i), to = addDays(from, 6);
    const inWeek = sessionsInRange(sessions, from, to);
    const totals = inWeek.map(sessionTotals);
    out.push({
      weekStart: dayKey(from), weekEnd: dayKey(to), sessions: inWeek,
      count: inWeek.length,
      volume: sum(totals.map((t) => t.volume)),
      sets: sum(totals.map((t) => t.sets)),
      reps: sum(totals.map((t) => t.reps)),
      durationSec: sum(totals.map((t) => t.durationSec)),
    });
  }
  return out;
}

/**
 * Working sets and volume per muscle group over a period.
 * A set counts fully for each primary muscle and as a half set for secondaries,
 * which is the common convention for counting indirect volume.
 */
export function muscleVolume(sessions, exerciseIndex, { from, to } = {}) {
  const list = from ? sessionsInRange(sessions, from, to || new Date()) : sessions.filter((s) => s.status === 'completed');
  const acc = {};
  const bump = (m, sets, vol, k) => {
    acc[m] ||= { sets: 0, volume: 0, exercises: new Set(), days: new Set() };
    acc[m].sets += sets * k; acc[m].volume += vol * k;
  };
  for (const s of list) {
    for (const entry of s.entries || []) {
      const ex = exerciseIndex[entry.exerciseId];
      if (!ex) continue;
      const sets = (entry.sets || []).filter(isWorkingSet);
      if (!sets.length) continue;
      const vol = sum(sets.map(setVolume));
      for (const m of ex.primaryMuscles || []) { bump(m, sets.length, vol, 1); acc[m].exercises.add(ex.id); acc[m].days.add(s.date); }
      for (const m of ex.secondaryMuscles || []) { bump(m, sets.length, vol, 0.5); acc[m].exercises.add(ex.id); acc[m].days.add(s.date); }
    }
  }
  return Object.fromEntries(Object.entries(acc).map(([k, v]) => [k, {
    sets: Math.round(v.sets * 10) / 10, volume: v.volume,
    exercises: v.exercises.size, frequency: v.days.size,
  }]));
}

/** Consecutive-week or consecutive-day streaks. */
export function streaks(sessions, { restDayGrace = 2 } = {}) {
  const days = uniq(sessions.filter((s) => s.status === 'completed').map((s) => s.date)).sort();
  if (!days.length) return { current: 0, best: 0, lastDate: null, totalDays: 0 };
  let best = 1, cur = 1;
  for (let i = 1; i < days.length; i++) {
    const gap = daysBetween(parseDay(days[i - 1]), parseDay(days[i]));
    if (gap <= restDayGrace + 1) cur++; else cur = 1;
    best = Math.max(best, cur);
  }
  const sinceLast = daysBetween(parseDay(days[days.length - 1]), new Date());
  const current = sinceLast <= restDayGrace + 1 ? cur : 0;
  return { current, best, lastDate: days[days.length - 1], totalDays: days.length };
}

/** Rolling body-weight series from body entries. */
export function bodySeries(entries, field = 'weight') {
  return entries
    .filter((e) => e[field] !== undefined && e[field] !== null && e[field] !== '')
    .map((e) => ({ date: e.date, value: Number(e[field]) }))
    .filter((p) => !Number.isNaN(p.value))
    .sort((a, b) => (a.date < b.date ? -1 : 1));
}

/** Series builder for the exercise analytics screen. */
export function exerciseSeries(sessions, exerciseId, metric) {
  const hist = exerciseHistory(sessions, exerciseId).slice().reverse();
  return hist.map((h) => {
    let value = 0;
    switch (metric) {
      case 'weight':   value = h.maxWeight; break;
      case 'reps':     value = h.maxReps; break;
      case 'volume':   value = h.volume; break;
      case 'e1rm':     value = h.bestE1rm; break;
      case 'sets':     value = h.sets.length; break;
      case 'rpe':      value = h.avgRpe ?? 0; break;
      case 'topset':   value = h.topSet ? setVolume(h.topSet) : 0; break;
      default:         value = h.volume;
    }
    return { date: h.date, value, meta: h };
  }).filter((p) => p.value > 0 || metric === 'rpe');
}

/** Reps achieved at a specific weight over time — the double-progression chart. */
export function repsAtWeightSeries(sessions, exerciseId, weight) {
  const hist = exerciseHistory(sessions, exerciseId).slice().reverse();
  return hist.map((h) => {
    const at = h.sets.filter((s) => Math.abs((Number(s.weight) || 0) - weight) < 0.01);
    return at.length ? { date: h.date, value: Math.max(...at.map((s) => Number(s.reps) || 0)) } : null;
  }).filter(Boolean);
}

/** Simple calorie estimate. Deliberately rough — labelled as an estimate in the UI. */
export function estimateCalories(session, bodyWeightKg = 75) {
  const t = sessionTotals(session);
  const minutes = (t.durationSec || 0) / 60;
  if (!minutes) return 0;
  const met = 5.0; // resistance training, moderate-to-vigorous
  return Math.round((met * 3.5 * bodyWeightKg) / 200 * minutes);
}

/** Days since each muscle group was last trained — the recovery indicator. */
export function muscleRecovery(sessions, exerciseIndex) {
  const last = {};
  for (const s of sessions) {
    if (s.status !== 'completed') continue;
    for (const entry of s.entries || []) {
      const ex = exerciseIndex[entry.exerciseId];
      if (!ex || !(entry.sets || []).some(isWorkingSet)) continue;
      for (const m of [...(ex.primaryMuscles || []), ...(ex.secondaryMuscles || [])]) {
        if (!last[m] || s.date > last[m]) last[m] = s.date;
      }
    }
  }
  return Object.fromEntries(Object.entries(last).map(([m, d]) => {
    const days = daysBetween(parseDay(d), new Date());
    return [m, { lastDate: d, daysAgo: days, recovered: Math.min(1, days / 2) }];
  }));
}

export { groupBy };
