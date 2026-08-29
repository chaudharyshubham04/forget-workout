/* ============================================================
   Application state.

   System data (js/data/*) is never mutated. User customisation of a
   predefined record is stored as a partial override keyed by its id, so the
   global library stays pristine and "reset to default" is always possible.
   ============================================================ */
import { EXERCISES } from './data/exercises.js';
import { SPLITS } from './data/splits.js';
import {
  MUSCLES, CATEGORIES, EQUIPMENT, DEFAULT_MUSCLE_TARGETS, goalById,
} from './data/taxonomy.js';
import { uid, todayKey, deepClone, dayKey, parseDay, daysBetween, prettify } from './lib/utils.js';
import { defaultRuleFor } from './lib/progression.js';

const KEY = 'forge.state.v1';
const SCHEMA = 3;

/* ---------------- defaults ---------------- */
function freshState() {
  return {
    schema: SCHEMA,
    createdAt: Date.now(),
    onboarded: false,
    settings: {
      unit: 'kg',
      lengthUnit: 'cm',
      theme: 'dark',            // dark | light | system (dark is the default)
      accentHue: 18,
      weekStart: 1,             // 0 Sun, 1 Mon
      defaultRestSec: 90,
      restAutoStart: true,
      restSound: true,
      restVibrate: true,
      keepScreenAwake: true,
      mediaBase: 'media',       // where exercise photos/GIFs are served from
      showRpe: true,
      showRir: false,
      confirmFinish: true,
      dashboard: ['today', 'streak', 'week', 'goal', 'recent', 'muscles'],
      muscleTargets: { ...DEFAULT_MUSCLE_TARGETS },
      notifications: {
        enabled: false, workoutReminder: true, workoutTime: '18:00',
        streakReminder: true, missedReminder: true, goalReminder: false,
      },
    },
    profile: {
      name: '', level: 'beginner', goal: 'hypertrophy',
      daysPerWeek: 4, sessionMin: 60,
      equipment: EQUIPMENT.map((e) => e.id),
      bodyWeightKg: null, heightCm: null, birthYear: null,
    },
    /* customisation layers over system data */
    exerciseOverrides: {},      // id -> partial exercise
    customExercises: [],
    hiddenExercises: [],
    categoryOverrides: {},
    customCategories: [],
    hiddenCategories: [],
    muscleOverrides: {},
    customMuscles: [],
    customEquipment: [],
    splitOverrides: {},
    customSplits: [],
    hiddenSplits: [],

    templates: [],              // user workout templates
    pinnedTemplates: [],
    favorites: [],              // exercise ids
    recentExercises: [],
    sessions: [],               // completed + one optional active
    activeSessionId: null,
    bodyEntries: [],
    goals: [],
    progressionRules: {},       // exerciseId -> rule
    activePlan: null,           // { splitId, startDate, dayOffset }
    lastBackupAt: null,
  };
}

/* ---------------- persistence ---------------- */
let state = freshState();
const listeners = new Set();
let saveTimer = null;
let persistFailed = false;

function migrate(s) {
  if (!s || typeof s !== 'object') return freshState();
  const base = freshState();
  const merged = { ...base, ...s };
  merged.settings = { ...base.settings, ...(s.settings || {}) };
  merged.settings.notifications = { ...base.settings.notifications, ...((s.settings || {}).notifications || {}) };
  merged.settings.muscleTargets = { ...base.settings.muscleTargets, ...((s.settings || {}).muscleTargets || {}) };
  merged.profile = { ...base.profile, ...(s.profile || {}) };
  for (const k of ['customExercises', 'customCategories', 'customMuscles', 'customEquipment',
    'customSplits', 'templates', 'sessions', 'bodyEntries', 'goals', 'favorites',
    'recentExercises', 'hiddenExercises', 'hiddenCategories', 'hiddenSplits', 'pinnedTemplates']) {
    if (!Array.isArray(merged[k])) merged[k] = [];
  }
  for (const k of ['exerciseOverrides', 'categoryOverrides', 'muscleOverrides', 'splitOverrides', 'progressionRules']) {
    if (!merged[k] || typeof merged[k] !== 'object') merged[k] = {};
  }
  /* schema 2 introduced bundled exercise media; adopt it for existing installs
     that predate the setting rather than leaving them on the diagrams. */
  const prior = Number(s.schema) || 1;
  if (prior < 2 && !merged.settings.mediaBase) merged.settings.mediaBase = 'media';
  /* schema 3 pins the plan to weekdays instead of a rolling cycle. */
  if (merged.activePlan && !Array.isArray(merged.activePlan.schedule)) {
    const sp = [...SPLITS, ...merged.customSplits].find((x) => x.id === merged.activePlan.splitId);
    if (sp) {
      const ws = merged.settings.weekStart ?? 1;
      const n = sp.days.length;
      const sched = new Array(7).fill(null);
      for (let i = 0; i < 7; i++) sched[(ws + i) % 7] = i < n ? i : null;
      merged.activePlan.schedule = sched;
    }
  }

  merged.schema = SCHEMA;
  return merged;
}

export function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) state = migrate(JSON.parse(raw));
    else state = freshState();
  } catch (e) {
    console.warn('State load failed, starting fresh', e);
    state = freshState();
  }
  return state;
}

function persistNow() {
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
    persistFailed = false;
  } catch (e) {
    if (!persistFailed) {
      persistFailed = true;
      console.error('Persist failed', e);
      import('./lib/ui.js').then(({ toast }) =>
        toast('Storage is full — export a backup and remove old progress photos.', 'bad', 6000));
    }
  }
}
export function save() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(persistNow, 180);
}
export const saveImmediate = () => { clearTimeout(saveTimer); persistNow(); };

/* ---------------- subscription ---------------- */
export function subscribe(fn) { listeners.add(fn); return () => listeners.delete(fn); }
export function emit(reason) { for (const fn of [...listeners]) fn(state, reason); }
function commit(reason) { save(); emit(reason); }

export const get = () => state;
export const settings = () => state.settings;
export const profile = () => state.profile;

/* ============================================================
   Selectors — merged system + user data
   ============================================================ */
const SYS_EX = EXERCISES.map((e) => ({
  ...e,
  primaryMuscles: e.primary, secondaryMuscles: e.secondary,
  categories: e.cats, equipment: e.equip,
  difficulty: e.diff, mechanic: e.mech, movement: e.move,
  instructions: e.steps, variations: e.vars, alternatives: e.alts,
  similarExercises: e.similar,
}));

/* The imported library (1,300 exercises, ~1.6 MB) is fetched once and cached by
   the service worker. Kept out of the main bundle so first paint stays fast. */
let EXT_EX = [];
let OPEN_EX = [];
let CURATED_MEDIA = {};   // Gym visual references (licensed separately)
let OPEN_MEDIA = {};      // public-domain photo references
let MEDIA_AVAILABLE = true;
let extPromise = null;
export function loadExtendedLibrary() {
  if (extPromise) return extPromise;
  const j = (u) => fetch(u).then((r) => (r.ok ? r.json() : null)).catch(() => null);
  extPromise = Promise.all([
    j('js/data/exercises-extended.json'),
    j('js/data/exercises-open.json'),
    j('js/data/curated-media.json'),
    j('js/data/open-media.json'),
    j('js/data/app-config.json'),
  ]).then(([list, open, media, openMedia, config]) => {
    EXT_EX = Array.isArray(list) ? list : [];
    OPEN_EX = Array.isArray(open) ? open : [];
    CURATED_MEDIA = media && typeof media === 'object' ? media : {};
    OPEN_MEDIA = openMedia && typeof openMedia === 'object' ? openMedia : {};
    /* Builds published without the separately-licensed Gym visual media say so
       here, so the app never requests files that are not there. The
       public-domain photos always ship. */
    if (config && config.licensedMedia === false) MEDIA_AVAILABLE = false;
    exCache = null;
    return [...EXT_EX, ...OPEN_EX];
  }).catch((e) => { console.warn('Extended library unavailable', e); EXT_EX = []; return []; });
  return extPromise;
}
export const curatedMediaFor = (id) => CURATED_MEDIA[id] || null;
/** False when this build was published without the licensed Gym visual media.
    Public-domain photos are unaffected. */
export const mediaAvailable = () => MEDIA_AVAILABLE;
export const openCount = () => OPEN_EX.length;
export const extendedCount = () => EXT_EX.length;
export const extendedLoaded = () => EXT_EX.length > 0;

let exCache = null, exCacheKey = '';
function exKey() {
  return `${Object.keys(state.exerciseOverrides).length}:${state.customExercises.length}:${state.hiddenExercises.length}:${EXT_EX.length}:${OPEN_EX.length}:${state._exStamp || 0}`;
}
/** All visible exercises: system (with overrides applied) + custom. */
export function exercises() {
  const k = exKey();
  if (exCache && exCacheKey === k) return exCache;
  const hidden = new Set(state.hiddenExercises);
  const applyOverride = (e) =>
    (state.exerciseOverrides[e.id] ? { ...e, ...state.exerciseOverrides[e.id], id: e.id, custom: false, edited: true } : e);
  /* 24 curated exercises have a matching record in the imported dataset; give
     them its media reference so they show a photo demonstration too. */
  /* Photos matched from either dataset are attached here. Public-domain ones
     win, because they can actually be published. */
  const withMedia = (e) => {
    const m = OPEN_MEDIA[e.id] || CURATED_MEDIA[e.id];
    return m ? { ...e, media: m } : e;
  };
  const list = [
    ...SYS_EX.filter((e) => !hidden.has(e.id)).map(withMedia).map(applyOverride),
    ...EXT_EX.filter((e) => !hidden.has(e.id)).map(withMedia).map(applyOverride),
    ...OPEN_EX.filter((e) => !hidden.has(e.id)).map(applyOverride),
    ...state.customExercises,
  ];
  exCache = list; exCacheKey = k;
  return list;
}
export function exerciseIndex() {
  const idx = {};
  for (const e of exercises()) idx[e.id] = e;
  return idx;
}
export const exerciseById = (id) => exerciseIndex()[id] || null;
export const isSystemExercise = (id) =>
  SYS_EX.some((e) => e.id === id) || EXT_EX.some((e) => e.id === id) || OPEN_EX.some((e) => e.id === id);
export const systemExercise = (id) =>
  SYS_EX.find((e) => e.id === id) || EXT_EX.find((e) => e.id === id) || OPEN_EX.find((e) => e.id === id) || null;
export const curatedCount = () => SYS_EX.length;

export function categories() {
  const hidden = new Set(state.hiddenCategories);
  return [
    ...CATEGORIES.filter((c) => !hidden.has(c.id))
      .map((c) => (state.categoryOverrides[c.id] ? { ...c, ...state.categoryOverrides[c.id], id: c.id } : c)),
    ...state.customCategories,
  ];
}
export const categoryIndex = () => Object.fromEntries(categories().map((c) => [c.id, c]));

export function muscles() {
  return [
    ...MUSCLES.map((m) => (state.muscleOverrides[m.id] ? { ...m, ...state.muscleOverrides[m.id], id: m.id } : m)),
    ...state.customMuscles,
  ];
}
export const muscleIndex = () => Object.fromEntries(muscles().map((m) => [m.id, m]));
export const muscleName = (id) => (muscleIndex()[id]?.name) || prettify(id);

export function equipmentList() { return [...EQUIPMENT, ...state.customEquipment]; }
export const equipmentIndex = () => Object.fromEntries(equipmentList().map((e) => [e.id, e]));
export const equipmentName = (id) => equipmentIndex()[id]?.name || prettify(id);

export function splits() {
  const hidden = new Set(state.hiddenSplits);
  return [
    ...SPLITS.filter((s) => !hidden.has(s.id))
      .map((s) => (state.splitOverrides[s.id] ? { ...s, ...state.splitOverrides[s.id], id: s.id } : s)),
    ...state.customSplits,
  ];
}
export const splitById = (id) => splits().find((s) => s.id === id) || null;

export const templates = () => state.templates;
export const templateById = (id) => state.templates.find((t) => t.id === id) || null;

export const sessions = () => state.sessions;
export const completedSessions = () => state.sessions.filter((s) => s.status === 'completed');
export const sessionById = (id) => state.sessions.find((s) => s.id === id) || null;
export const activeSession = () => (state.activeSessionId ? sessionById(state.activeSessionId) : null);
export const sessionsOn = (key) => completedSessions().filter((s) => s.date === key);

export const goal = () => goalById[state.profile.goal] || goalById.hypertrophy;
export const ruleFor = (exId) => state.progressionRules[exId] || defaultRuleFor(exerciseById(exId), goal());
export const hasCustomRule = (exId) => !!state.progressionRules[exId];

export { prettify };

/* ============================================================
   Actions
   ============================================================ */
const touchEx = () => { state._exStamp = (state._exStamp || 0) + 1; };

export const setSetting = (k, v) => { state.settings[k] = v; commit('settings'); };
export const patchSettings = (p) => { Object.assign(state.settings, p); commit('settings'); };
export const patchNotifications = (p) => { Object.assign(state.settings.notifications, p); commit('settings'); };
export const patchProfile = (p) => { Object.assign(state.profile, p); commit('profile'); };
export const setMuscleTarget = (m, v) => { state.settings.muscleTargets[m] = v; commit('settings'); };
export const completeOnboarding = () => { state.onboarded = true; commit('onboarding'); };

/* ---- exercises ---- */
export function createExercise(data) {
  const ex = {
    id: `ux_${uid('e')}`, custom: true, createdAt: Date.now(),
    name: 'New exercise', primaryMuscles: [], secondaryMuscles: [], categories: [],
    equipment: [], difficulty: 'beginner', mechanic: 'compound', movement: 'push',
    force: 'push', tracking: 'weight_reps', description: '', instructions: [],
    mistakes: [], tips: [], cues: [], alternatives: [], variations: [],
    similarExercises: [], tags: [], pose: 'generic', unilateral: false,
    ...data,
  };
  state.customExercises.push(ex);
  touchEx(); commit('exercises');
  return ex;
}
export function updateExercise(id, patch) {
  const custom = state.customExercises.find((e) => e.id === id);
  if (custom) Object.assign(custom, patch, { id, updatedAt: Date.now() });
  else state.exerciseOverrides[id] = { ...(state.exerciseOverrides[id] || {}), ...patch };
  touchEx(); commit('exercises');
}
export function deleteExercise(id) {
  const i = state.customExercises.findIndex((e) => e.id === id);
  if (i >= 0) state.customExercises.splice(i, 1);
  else if (!state.hiddenExercises.includes(id)) state.hiddenExercises.push(id);
  state.favorites = state.favorites.filter((x) => x !== id);
  state.recentExercises = state.recentExercises.filter((x) => x !== id);
  touchEx(); commit('exercises');
}
export function restoreExercise(id) {
  state.hiddenExercises = state.hiddenExercises.filter((x) => x !== id);
  delete state.exerciseOverrides[id];
  touchEx(); commit('exercises');
}
export const resetExercise = (id) => { delete state.exerciseOverrides[id]; touchEx(); commit('exercises'); };

export function toggleFavorite(id) {
  const i = state.favorites.indexOf(id);
  if (i >= 0) state.favorites.splice(i, 1); else state.favorites.unshift(id);
  commit('favorites');
  return i < 0;
}
export const isFavorite = (id) => state.favorites.includes(id);
export function markRecent(id) {
  state.recentExercises = [id, ...state.recentExercises.filter((x) => x !== id)].slice(0, 24);
  save();
}

/* ---- categories / muscles / equipment ---- */
export function createCategory(data) {
  const c = { id: `uc_${uid('c')}`, custom: true, name: 'New category',
    icon: 'folder', color: '#ff7a2c', muscles: [], ...data };
  state.customCategories.push(c); commit('taxonomy'); return c;
}
export function updateCategory(id, patch) {
  const c = state.customCategories.find((x) => x.id === id);
  if (c) Object.assign(c, patch, { id });
  else state.categoryOverrides[id] = { ...(state.categoryOverrides[id] || {}), ...patch };
  commit('taxonomy');
}
export function deleteCategory(id) {
  const i = state.customCategories.findIndex((x) => x.id === id);
  if (i >= 0) state.customCategories.splice(i, 1);
  else if (!state.hiddenCategories.includes(id)) state.hiddenCategories.push(id);
  /* detach from every exercise that referenced it */
  for (const e of state.customExercises) e.categories = (e.categories || []).filter((c) => c !== id);
  for (const [exId, ov] of Object.entries(state.exerciseOverrides)) {
    if (ov.categories) ov.categories = ov.categories.filter((c) => c !== id);
  }
  for (const e of SYS_EX) {
    if ((e.categories || []).includes(id) && !state.exerciseOverrides[e.id]?.categories) {
      state.exerciseOverrides[e.id] = { ...(state.exerciseOverrides[e.id] || {}),
        categories: e.categories.filter((c) => c !== id) };
    }
  }
  touchEx(); commit('taxonomy');
}
export function restoreCategory(id) {
  state.hiddenCategories = state.hiddenCategories.filter((x) => x !== id);
  delete state.categoryOverrides[id];
  commit('taxonomy');
}
export function createMuscle(data) {
  const m = { id: `um_${uid('m')}`, custom: true, name: 'New muscle group',
    region: 'Full Body', color: '#ff7a2c', ...data };
  state.customMuscles.push(m); commit('taxonomy'); return m;
}
export function updateMuscle(id, patch) {
  const m = state.customMuscles.find((x) => x.id === id);
  if (m) Object.assign(m, patch, { id });
  else state.muscleOverrides[id] = { ...(state.muscleOverrides[id] || {}), ...patch };
  commit('taxonomy');
}
export function deleteMuscle(id) {
  const i = state.customMuscles.findIndex((x) => x.id === id);
  if (i < 0) return false;
  state.customMuscles.splice(i, 1); commit('taxonomy'); return true;
}
export function createEquipment(name) {
  const eq = { id: `ueq_${uid('q')}`, name, custom: true };
  state.customEquipment.push(eq);
  if (!state.profile.equipment.includes(eq.id)) state.profile.equipment.push(eq.id);
  commit('taxonomy'); return eq;
}
export function deleteEquipment(id) {
  state.customEquipment = state.customEquipment.filter((e) => e.id !== id);
  state.profile.equipment = state.profile.equipment.filter((e) => e !== id);
  commit('taxonomy');
}

/* ---- templates ---- */
export const blockOf = (entries = [], kind = 'single', extra = {}) =>
  ({ id: uid('b'), kind, rounds: kind === 'circuit' ? 3 : 1, rest: null, entries, ...extra });

export function newEntry(exerciseId, opts = {}) {
  const ex = exerciseById(exerciseId);
  const rule = ruleFor(exerciseId);
  const sets = opts.sets ?? rule.targetSets ?? 3;
  const range = opts.repRange ?? rule.repRange ?? [8, 12];
  return {
    id: uid('en'), exerciseId, notes: '',
    rest: opts.rest ?? state.settings.defaultRestSec,
    sets: Array.from({ length: sets }, () => ({
      id: uid('s'), type: 'normal', targetReps: [...range],
      weight: null, reps: null, rpe: null, tempo: null,
    })),
    progression: { ...rule },
    tracking: ex?.tracking || 'weight_reps',
  };
}

export function createTemplate(data = {}) {
  const t = {
    id: uid('t'), name: 'New workout', type: '', notes: '', targetMuscles: [],
    blocks: [], createdAt: Date.now(), updatedAt: Date.now(), custom: true,
    ...data,
  };
  state.templates.unshift(t); commit('templates'); return t;
}
export function updateTemplate(id, patch) {
  const t = templateById(id);
  if (!t) return null;
  Object.assign(t, patch, { id, updatedAt: Date.now() });
  commit('templates'); return t;
}
export function deleteTemplate(id) {
  state.templates = state.templates.filter((t) => t.id !== id);
  state.pinnedTemplates = state.pinnedTemplates.filter((t) => t !== id);
  commit('templates');
}
export function duplicateTemplate(id) {
  const t = templateById(id);
  if (!t) return null;
  const copy = deepClone(t);
  copy.id = uid('t'); copy.name = `${t.name} (copy)`;
  copy.createdAt = copy.updatedAt = Date.now();
  copy.blocks = (copy.blocks || []).map((b) => ({ ...b, id: uid('b'),
    entries: b.entries.map((en) => ({ ...en, id: uid('en'), sets: en.sets.map((s) => ({ ...s, id: uid('s') })) })) }));
  state.templates.unshift(copy); commit('templates'); return copy;
}
export function togglePin(id) {
  const i = state.pinnedTemplates.indexOf(id);
  if (i >= 0) state.pinnedTemplates.splice(i, 1); else state.pinnedTemplates.unshift(id);
  commit('templates'); return i < 0;
}
export const isPinned = (id) => state.pinnedTemplates.includes(id);

/** Turn a split day definition into a user-owned template. */
export function templateFromSplitDay(split, day, dayIndex) {
  return createTemplate({
    name: `${day.name}`,
    type: split.name,
    splitId: split.id,
    splitDayIndex: dayIndex,
    targetMuscles: day.focus || [],
    notes: '',
    blocks: [blockOf((day.exercises || []).map((x) => {
      const en = newEntry(x.exerciseId, { sets: x.sets, repRange: x.repRange, rest: x.rest });
      return en;
    }))],
  });
}

/* ---- active plan ---- */

/**
 * Lay a split's days across the week, starting on the user's week-start day.
 * Returns an array indexed by weekday (0 = Sunday) holding a split-day index,
 * or null for a rest day.
 */
export function defaultSchedule(split, weekStart = state.settings.weekStart) {
  const n = split.days.length;
  const sched = new Array(7).fill(null);
  for (let i = 0; i < 7; i++) {
    const weekday = (weekStart + i) % 7;
    sched[weekday] = i < n ? i : null;
  }
  return sched;
}

export function activateSplit(splitId, { materialise = true } = {}) {
  const split = splitById(splitId);
  if (!split) return null;
  state.activePlan = {
    splitId, startDate: todayKey(), templateIds: [],
    schedule: defaultSchedule(split),
  };
  if (materialise) {
    /* Remove templates previously generated for this split, then rebuild. */
    state.templates = state.templates.filter((t) => t.splitId !== splitId);
    const ids = [];
    split.days.forEach((d, i) => {
      if (d.rest) { ids.push(null); return; }
      const t = templateFromSplitDay(split, d, i);
      ids.push(t.id);
    });
    state.activePlan.templateIds = ids;
  }
  commit('plan');
  return state.activePlan;
}
export function clearPlan() { state.activePlan = null; commit('plan'); }

/** Reassign which split day falls on which weekday. `schedule` is indexed by
    weekday (0 = Sunday); each entry is a split-day index or null for rest. */
export function setPlanSchedule(schedule) {
  if (!state.activePlan) return;
  state.activePlan.schedule = schedule.slice(0, 7);
  commit('plan');
}
export function resetPlanSchedule() {
  const plan = state.activePlan;
  if (!plan) return;
  const split = splitById(plan.splitId);
  if (split) { plan.schedule = defaultSchedule(split); commit('plan'); }
}
export const planSchedule = () => state.activePlan?.schedule || null;

/** Which day of the active split falls on `key`. */
export function planDayFor(key = todayKey()) {
  const plan = state.activePlan;
  if (!plan) return null;
  const split = splitById(plan.splitId);
  if (!split || !split.days.length) return null;

  let idx;
  if (Array.isArray(plan.schedule) && plan.schedule.length === 7) {
    /* Fixed weekly schedule: the same weekday always runs the same session. */
    idx = plan.schedule[parseDay(key).getDay()];
    if (idx === null || idx === undefined || !split.days[idx]) {
      return { split, day: { name: 'Rest', rest: true }, index: null, date: key,
        templateId: null, isRest: true };
    }
  } else {
    /* Legacy rolling cycle from the activation date. */
    const offset = daysBetween(parseDay(plan.startDate), parseDay(key));
    const n = split.days.length;
    idx = ((offset % n) + n) % n;
  }
  const day = split.days[idx];
  return {
    split, day, index: idx, date: key,
    templateId: plan.templateIds ? plan.templateIds[idx] : null,
    isRest: !!day.rest,
  };
}

/* ---- sessions ---- */
export function startSession({ templateId = null, name, date = todayKey(), splitId = null, dayIndex = null } = {}) {
  const existing = activeSession();
  if (existing) return existing;
  const t = templateId ? templateById(templateId) : null;
  const entries = [];
  if (t) {
    for (const b of t.blocks || []) {
      for (const en of b.entries || []) {
        entries.push({
          id: uid('se'), exerciseId: en.exerciseId, blockId: b.id, blockKind: b.kind,
          notes: '', order: entries.length,
          plannedRest: en.rest ?? state.settings.defaultRestSec,
          targetReps: en.sets?.[0]?.targetReps || null,
          sets: (en.sets || []).map((s, i) => ({
            id: uid('s'), index: i, type: s.type || 'normal',
            weight: null, reps: null, rpe: null, rir: null,
            durationSec: null, distanceM: null, restSec: null,
            targetReps: s.targetReps || null, done: false, ts: null,
          })),
        });
      }
    }
  }
  const session = {
    id: uid('ws'), date, name: name || t?.name || 'Workout',
    templateId, splitId: splitId || t?.splitId || null, dayIndex,
    status: 'active', startedAt: Date.now(), endedAt: null,
    pausedAt: null, pausedTotalMs: 0,
    durationSec: 0, notes: '', entries, prs: [],
  };
  state.sessions.unshift(session);
  state.activeSessionId = session.id;
  commit('session');
  return session;
}

export function patchSession(id, patch) {
  const s = sessionById(id); if (!s) return;
  Object.assign(s, patch); commit('session');
}
export function pauseSession() {
  const s = activeSession(); if (!s || s.pausedAt) return;
  s.pausedAt = Date.now(); commit('session');
}
export function resumeSession() {
  const s = activeSession(); if (!s || !s.pausedAt) return;
  s.pausedTotalMs = (s.pausedTotalMs || 0) + (Date.now() - s.pausedAt);
  s.pausedAt = null; commit('session');
}
export function elapsedSec(s) {
  if (!s) return 0;
  const end = s.endedAt || (s.pausedAt || Date.now());
  return Math.max(0, Math.round((end - s.startedAt - (s.pausedTotalMs || 0)) / 1000));
}

export function addSessionExercise(sessionId, exerciseId, opts = {}) {
  const s = sessionById(sessionId); if (!s) return null;
  const rule = ruleFor(exerciseId);
  const n = opts.sets ?? rule.targetSets ?? 3;
  const entry = {
    id: uid('se'), exerciseId, notes: '', order: s.entries.length,
    plannedRest: opts.rest ?? state.settings.defaultRestSec,
    targetReps: opts.repRange || rule.repRange,
    sets: Array.from({ length: n }, (_, i) => ({
      id: uid('s'), index: i, type: 'normal', weight: null, reps: null,
      rpe: null, rir: null, durationSec: null, distanceM: null, restSec: null,
      targetReps: opts.repRange || rule.repRange, done: false, ts: null,
    })),
  };
  s.entries.push(entry);
  markRecent(exerciseId);
  commit('session');
  return entry;
}
export function removeSessionExercise(sessionId, entryId) {
  const s = sessionById(sessionId); if (!s) return;
  s.entries = s.entries.filter((e) => e.id !== entryId);
  s.entries.forEach((e, i) => { e.order = i; });
  commit('session');
}
export function reorderSessionEntries(sessionId, ids) {
  const s = sessionById(sessionId); if (!s) return;
  const map = new Map(s.entries.map((e) => [e.id, e]));
  s.entries = ids.map((id) => map.get(id)).filter(Boolean);
  s.entries.forEach((e, i) => { e.order = i; });
  commit('session');
}
export function addSet(sessionId, entryId, patch = {}) {
  const s = sessionById(sessionId); if (!s) return null;
  const en = s.entries.find((e) => e.id === entryId); if (!en) return null;
  const prev = en.sets[en.sets.length - 1];
  const set = {
    id: uid('s'), index: en.sets.length, type: 'normal',
    weight: prev ? prev.weight : null, reps: prev ? prev.reps : null,
    rpe: null, rir: null, durationSec: prev ? prev.durationSec : null,
    distanceM: null, restSec: null, targetReps: en.targetReps || null,
    done: false, ts: null, ...patch,
  };
  en.sets.push(set);
  en.sets.forEach((x, i) => { x.index = i; });
  commit('session');
  return set;
}
export function updateSet(sessionId, entryId, setId, patch) {
  const s = sessionById(sessionId); if (!s) return;
  const en = s.entries.find((e) => e.id === entryId); if (!en) return;
  const st = en.sets.find((x) => x.id === setId); if (!st) return;
  Object.assign(st, patch);
  commit('set');
}
export function removeSet(sessionId, entryId, setId) {
  const s = sessionById(sessionId); if (!s) return;
  const en = s.entries.find((e) => e.id === entryId); if (!en) return;
  en.sets = en.sets.filter((x) => x.id !== setId);
  en.sets.forEach((x, i) => { x.index = i; });
  commit('session');
}
export function duplicateSet(sessionId, entryId, setId) {
  const s = sessionById(sessionId); if (!s) return;
  const en = s.entries.find((e) => e.id === entryId); if (!en) return;
  const i = en.sets.findIndex((x) => x.id === setId); if (i < 0) return;
  const copy = { ...deepClone(en.sets[i]), id: uid('s'), done: false, ts: null };
  en.sets.splice(i + 1, 0, copy);
  en.sets.forEach((x, k) => { x.index = k; });
  commit('session');
}
export function reorderSets(sessionId, entryId, ids) {
  const s = sessionById(sessionId); if (!s) return;
  const en = s.entries.find((e) => e.id === entryId); if (!en) return;
  const map = new Map(en.sets.map((x) => [x.id, x]));
  en.sets = ids.map((id) => map.get(id)).filter(Boolean);
  en.sets.forEach((x, i) => { x.index = i; });
  commit('session');
}

export function finishSession(id, { discardEmpty = true } = {}) {
  const s = sessionById(id); if (!s) return null;
  if (s.pausedAt) { s.pausedTotalMs = (s.pausedTotalMs || 0) + (Date.now() - s.pausedAt); s.pausedAt = null; }
  s.endedAt = Date.now();
  s.durationSec = elapsedSec(s);
  if (discardEmpty) {
    s.entries = s.entries.filter((e) => e.sets.some((x) => x.done));
    s.entries.forEach((e) => { e.sets = e.sets.filter((x) => x.done); });
  }
  s.status = 'completed';
  state.activeSessionId = null;
  for (const e of s.entries) markRecent(e.exerciseId);
  commit('session');
  return s;
}
export function discardSession(id) {
  state.sessions = state.sessions.filter((s) => s.id !== id);
  if (state.activeSessionId === id) state.activeSessionId = null;
  commit('session');
}
export function deleteSession(id) { discardSession(id); }

export function duplicateSessionAsTemplate(id) {
  const s = sessionById(id); if (!s) return null;
  return createTemplate({
    name: `${s.name}`,
    type: 'From history',
    blocks: [blockOf(s.entries.map((en) => ({
      id: uid('en'), exerciseId: en.exerciseId, notes: en.notes || '',
      rest: en.plannedRest || state.settings.defaultRestSec,
      sets: en.sets.map((st) => ({ id: uid('s'), type: st.type || 'normal',
        targetReps: st.targetReps || [Number(st.reps) || 8, Number(st.reps) || 12],
        weight: st.weight, reps: null, rpe: null, tempo: null })),
      progression: { ...ruleFor(en.exerciseId) },
    })))],
  });
}

/** Start a new session pre-loaded with the exact contents of a past session. */
export function repeatSession(id) {
  const src = sessionById(id); if (!src) return null;
  if (activeSession()) return activeSession();
  const session = {
    id: uid('ws'), date: todayKey(), name: src.name,
    templateId: src.templateId || null, splitId: src.splitId || null, dayIndex: src.dayIndex ?? null,
    status: 'active', startedAt: Date.now(), endedAt: null, pausedAt: null, pausedTotalMs: 0,
    durationSec: 0, notes: '', prs: [],
    entries: src.entries.map((en, i) => ({
      id: uid('se'), exerciseId: en.exerciseId, notes: '', order: i,
      plannedRest: en.plannedRest || state.settings.defaultRestSec,
      targetReps: en.targetReps || null,
      sets: en.sets.map((st, k) => ({
        id: uid('s'), index: k, type: st.type || 'normal',
        weight: st.weight ?? null, reps: null, rpe: null, rir: null,
        durationSec: null, distanceM: null, restSec: null,
        targetReps: st.targetReps || null, done: false, ts: null,
      })),
    })),
  };
  state.sessions.unshift(session);
  state.activeSessionId = session.id;
  commit('session');
  return session;
}

/* ---- body / goals / rules ---- */
export function addBodyEntry(data) {
  const e = { id: uid('b'), date: todayKey(), weight: null, bodyFat: null,
    measurements: {}, notes: '', photoId: null, ...data };
  const i = state.bodyEntries.findIndex((x) => x.date === e.date);
  if (i >= 0) state.bodyEntries[i] = { ...state.bodyEntries[i], ...e, id: state.bodyEntries[i].id };
  else state.bodyEntries.push(e);
  state.bodyEntries.sort((a, b) => (a.date < b.date ? -1 : 1));
  if (e.weight) state.profile.bodyWeightKg = Number(e.weight);
  commit('body');
  return e;
}
export function updateBodyEntry(id, patch) {
  const e = state.bodyEntries.find((x) => x.id === id); if (!e) return;
  Object.assign(e, patch); commit('body');
}
export function deleteBodyEntry(id) {
  state.bodyEntries = state.bodyEntries.filter((x) => x.id !== id); commit('body');
}

export function createGoal(data) {
  const g = { id: uid('g'), kind: 'custom', title: 'New goal', exerciseId: null,
    metric: 'value', startValue: 0, targetValue: 0, unit: '', createdAt: todayKey(),
    targetDate: null, done: false, ...data };
  state.goals.unshift(g); commit('goals'); return g;
}
export const updateGoal = (id, patch) => {
  const g = state.goals.find((x) => x.id === id); if (!g) return;
  Object.assign(g, patch); commit('goals');
};
export const deleteGoal = (id) => { state.goals = state.goals.filter((g) => g.id !== id); commit('goals'); };

export const setRule = (exId, rule) => { state.progressionRules[exId] = rule; commit('rules'); };
export const clearRule = (exId) => { delete state.progressionRules[exId]; commit('rules'); };

/* ---- splits ---- */
export function createSplit(data = {}) {
  const s = { id: uid('sp'), custom: true, name: 'My split', level: 'intermediate',
    goals: [state.profile.goal], daysPerWeek: 4, sessionMin: 60, tagline: '', desc: '',
    days: Array.from({ length: 7 }, (_, i) => (i < 4
      ? { name: `Day ${i + 1}`, focus: [], exercises: [] }
      : { name: 'Rest', rest: true })),
    ...data };
  s.daysPerWeek = s.days.filter((d) => !d.rest).length;
  state.customSplits.unshift(s); commit('splits'); return s;
}
export function updateSplit(id, patch) {
  const c = state.customSplits.find((s) => s.id === id);
  if (c) { Object.assign(c, patch, { id }); if (patch.days) c.daysPerWeek = patch.days.filter((d) => !d.rest).length; }
  else state.splitOverrides[id] = { ...(state.splitOverrides[id] || {}), ...patch };
  commit('splits');
}
export function deleteSplit(id) {
  const i = state.customSplits.findIndex((s) => s.id === id);
  if (i >= 0) state.customSplits.splice(i, 1);
  else if (!state.hiddenSplits.includes(id)) state.hiddenSplits.push(id);
  if (state.activePlan?.splitId === id) state.activePlan = null;
  commit('splits');
}
export function duplicateSplit(id) {
  const s = splitById(id); if (!s) return null;
  const copy = deepClone(s);
  copy.id = uid('sp'); copy.name = `${s.name} (copy)`; copy.custom = true;
  state.customSplits.unshift(copy); commit('splits'); return copy;
}

/* ---- backup ---- */
export function exportData() {
  return JSON.stringify({ app: 'forge', schema: SCHEMA, exportedAt: new Date().toISOString(), state }, null, 2);
}
export function importData(json, { merge = false } = {}) {
  const parsed = typeof json === 'string' ? JSON.parse(json) : json;
  const incoming = parsed.state || parsed;
  if (!incoming || typeof incoming !== 'object') throw new Error('Unrecognised backup file');
  if (!merge) { state = migrate(incoming); }
  else {
    const cur = state;
    const next = migrate(incoming);
    const byId = (arr) => new Map(arr.map((x) => [x.id, x]));
    for (const k of ['sessions', 'templates', 'bodyEntries', 'goals', 'customExercises',
      'customCategories', 'customSplits', 'customMuscles', 'customEquipment']) {
      const m = byId(cur[k]);
      for (const x of next[k]) if (!m.has(x.id)) cur[k].push(x);
    }
    cur.sessions.sort((a, b) => (a.date < b.date ? 1 : -1));
    state = cur;
  }
  exCache = null;
  saveImmediate(); emit('import');
  return state;
}
export function resetAll() {
  state = freshState();
  exCache = null;
  saveImmediate(); emit('reset');
}
export function markBackup() { state.lastBackupAt = Date.now(); save(); }

/* Cross-tab sync: another tab wrote state, adopt it. */
export function watchStorage() {
  window.addEventListener('storage', (e) => {
    if (e.key !== KEY || !e.newValue) return;
    try { state = migrate(JSON.parse(e.newValue)); exCache = null; emit('external'); } catch {}
  });
}
