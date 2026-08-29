/* Predefined system taxonomy. Never mutated — user changes live in state overrides. */

export const REGIONS = ['Chest', 'Back', 'Shoulders', 'Arms', 'Core', 'Legs', 'Full Body'];

/** Muscle groups. `parent` builds the Legs → Quadriceps style hierarchy. */
export const MUSCLES = [
  { id: 'chest',        name: 'Chest',            region: 'Chest',     color: '#ff6b4a', short: 'Chest' },
  { id: 'upper-chest',  name: 'Upper Chest',      region: 'Chest',     parent: 'chest', color: '#ff8360', short: 'Upper Chest' },
  { id: 'lower-chest',  name: 'Lower Chest',      region: 'Chest',     parent: 'chest', color: '#ff5c3a', short: 'Lower Chest' },
  { id: 'serratus',     name: 'Serratus Anterior',region: 'Chest',     color: '#ffa07a', short: 'Serratus' },

  { id: 'lats',         name: 'Lats',             region: 'Back',      color: '#4a9eff', short: 'Lats' },
  { id: 'traps',        name: 'Trapezius',        region: 'Back',      color: '#5aabff', short: 'Traps' },
  { id: 'rhomboids',    name: 'Rhomboids / Mid Back', region: 'Back',  color: '#3d8de0', short: 'Mid Back' },
  { id: 'lower-back',   name: 'Lower Back / Erectors', region: 'Back', color: '#2f7ac4', short: 'Lower Back' },

  { id: 'front-delts',  name: 'Front Delts',      region: 'Shoulders', color: '#ffc857', short: 'Front Delts' },
  { id: 'side-delts',   name: 'Side Delts',       region: 'Shoulders', color: '#ffb43d', short: 'Side Delts' },
  { id: 'rear-delts',   name: 'Rear Delts',       region: 'Shoulders', color: '#e8a02e', short: 'Rear Delts' },
  { id: 'rotator-cuff', name: 'Rotator Cuff',     region: 'Shoulders', color: '#d9922a', short: 'Rotator Cuff' },

  { id: 'biceps',       name: 'Biceps',           region: 'Arms',      color: '#a06bff', short: 'Biceps' },
  { id: 'triceps',      name: 'Triceps',          region: 'Arms',      color: '#8a5aef', short: 'Triceps' },
  { id: 'forearms',     name: 'Forearms',         region: 'Arms',      color: '#b98cff', short: 'Forearms' },

  { id: 'abs',          name: 'Abs',              region: 'Core',      color: '#31d07a', short: 'Abs' },
  { id: 'obliques',     name: 'Obliques',         region: 'Core',      color: '#28b869', short: 'Obliques' },
  { id: 'core',         name: 'Deep Core',        region: 'Core',      color: '#3ddc8a', short: 'Core' },

  { id: 'quads',        name: 'Quadriceps',       region: 'Legs',      color: '#ff5d8f', short: 'Quads' },
  { id: 'hamstrings',   name: 'Hamstrings',       region: 'Legs',      color: '#e64c7c', short: 'Hamstrings' },
  { id: 'glutes',       name: 'Glutes',           region: 'Legs',      color: '#ff7aa6', short: 'Glutes' },
  { id: 'calves',       name: 'Calves',           region: 'Legs',      color: '#d43d6b', short: 'Calves' },
  { id: 'adductors',    name: 'Adductors',        region: 'Legs',      color: '#ff96b8', short: 'Adductors' },
  { id: 'abductors',    name: 'Abductors',        region: 'Legs',      color: '#ffaec9', short: 'Abductors' },
  { id: 'hip-flexors',  name: 'Hip Flexors',      region: 'Legs',      color: '#c9345f', short: 'Hip Flexors' },

  { id: 'neck',         name: 'Neck',             region: 'Full Body', color: '#7bd3d6', short: 'Neck' },
  { id: 'full-body',    name: 'Full Body',        region: 'Full Body', color: '#00c2b2', short: 'Full Body' },
  { id: 'cardio',       name: 'Cardiovascular',   region: 'Full Body', color: '#00b3d6', short: 'Cardio' },
];

/** Exercise categories. Many-to-many with exercises. */
export const CATEGORIES = [
  { id: 'cat-chest',     name: 'Chest',      icon: 'dumbbell', color: '#ff6b4a', muscles: ['chest','upper-chest','lower-chest'] },
  { id: 'cat-back',      name: 'Back',       icon: 'layers',   color: '#4a9eff', muscles: ['lats','traps','rhomboids','lower-back'] },
  { id: 'cat-shoulders', name: 'Shoulders',  icon: 'bolt',     color: '#ffc857', muscles: ['front-delts','side-delts','rear-delts'] },
  { id: 'cat-biceps',    name: 'Biceps',     icon: 'dumbbell', color: '#a06bff', muscles: ['biceps'] },
  { id: 'cat-triceps',   name: 'Triceps',    icon: 'dumbbell', color: '#8a5aef', muscles: ['triceps'] },
  { id: 'cat-forearms',  name: 'Forearms',   icon: 'dumbbell', color: '#b98cff', muscles: ['forearms'] },
  { id: 'cat-quads',     name: 'Quadriceps', icon: 'run',      color: '#ff5d8f', muscles: ['quads'] },
  { id: 'cat-hamstrings',name: 'Hamstrings', icon: 'run',      color: '#e64c7c', muscles: ['hamstrings'] },
  { id: 'cat-glutes',    name: 'Glutes',     icon: 'run',      color: '#ff7aa6', muscles: ['glutes'] },
  { id: 'cat-calves',    name: 'Calves',     icon: 'run',      color: '#d43d6b', muscles: ['calves'] },
  { id: 'cat-legs',      name: 'Legs',       icon: 'run',      color: '#ff5d8f', muscles: ['quads','hamstrings','glutes','calves','adductors','abductors'] },
  { id: 'cat-core',      name: 'Core & Abs', icon: 'shield',   color: '#31d07a', muscles: ['abs','obliques','core'] },
  { id: 'cat-cardio',    name: 'Cardio',     icon: 'run',      color: '#00b3d6', muscles: ['cardio','full-body'] },
  { id: 'cat-olympic',   name: 'Olympic',    icon: 'bolt',     color: '#ff9f1c', muscles: ['full-body'] },
  { id: 'cat-mobility',  name: 'Mobility',   icon: 'refresh',  color: '#00c2b2', muscles: ['full-body'] },
  { id: 'cat-neck',      name: 'Neck',       icon: 'user',     color: '#7bd3d6', muscles: ['neck'] },
  { id: 'cat-fullbody',  name: 'Full Body',  icon: 'flame',    color: '#00c2b2', muscles: ['full-body'] },
];

export const EQUIPMENT = [
  { id: 'barbell',      name: 'Barbell' },
  { id: 'dumbbell',     name: 'Dumbbell' },
  { id: 'ez-bar',       name: 'EZ Bar' },
  { id: 'kettlebell',   name: 'Kettlebell' },
  { id: 'cable',        name: 'Cable Machine' },
  { id: 'machine',      name: 'Machine' },
  { id: 'smith',        name: 'Smith Machine' },
  { id: 'bodyweight',   name: 'Bodyweight' },
  { id: 'pullup-bar',   name: 'Pull-up Bar' },
  { id: 'dip-bars',     name: 'Dip Bars' },
  { id: 'bench',        name: 'Bench' },
  { id: 'band',         name: 'Resistance Band' },
  { id: 'trap-bar',     name: 'Trap Bar' },
  { id: 'medicine-ball',name: 'Medicine Ball' },
  { id: 'ab-wheel',     name: 'Ab Wheel' },
  { id: 'box',          name: 'Box / Platform' },
  { id: 'treadmill',    name: 'Treadmill' },
  { id: 'bike',         name: 'Stationary Bike' },
  { id: 'rower',        name: 'Rowing Machine' },
  { id: 'stair-climber',name: 'Stair Climber' },
  { id: 'jump-rope',    name: 'Jump Rope' },
  { id: 'sled',         name: 'Sled' },
  { id: 'stability-ball', name: 'Stability Ball' },
  { id: 'bosu-ball',    name: 'Bosu Ball' },
  { id: 'foam-roller',  name: 'Foam Roller' },
  { id: 'battle-rope',  name: 'Battle Rope' },
  { id: 'elliptical',   name: 'Elliptical' },
  { id: 'skierg',       name: 'SkiErg' },
  { id: 'ergometer',    name: 'Upper Body Ergometer' },
  { id: 'tire',         name: 'Tire' },
  { id: 'none',         name: 'No Equipment' },
];

/** Equipment bundles offered during onboarding. */
export const EQUIPMENT_PROFILES = [
  { id: 'full-gym',  name: 'Full gym',     desc: 'Barbells, machines, cables, everything',
    equipment: EQUIPMENT.map((e) => e.id) },
  { id: 'home-dbs',  name: 'Home — dumbbells', desc: 'Dumbbells, a bench and a pull-up bar',
    equipment: ['dumbbell','bench','bodyweight','pullup-bar','band','kettlebell','none','box','jump-rope'] },
  { id: 'minimal',   name: 'Minimal',      desc: 'Bands and bodyweight only',
    equipment: ['bodyweight','band','none','jump-rope'] },
  { id: 'bodyweight',name: 'Bodyweight',   desc: 'No equipment at all',
    equipment: ['bodyweight','none'] },
];

export const DIFFICULTIES = [
  { id: 'beginner',     name: 'Beginner',     color: '#31d07a', order: 1 },
  { id: 'intermediate', name: 'Intermediate', color: '#f3b13c', order: 2 },
  { id: 'advanced',     name: 'Advanced',     color: '#ff6b6b', order: 3 },
];

export const MOVEMENTS = [
  { id: 'push',      name: 'Push' },
  { id: 'pull',      name: 'Pull' },
  { id: 'squat',     name: 'Squat' },
  { id: 'hinge',     name: 'Hinge' },
  { id: 'lunge',     name: 'Lunge' },
  { id: 'carry',     name: 'Carry' },
  { id: 'rotation',  name: 'Rotation' },
  { id: 'isolation', name: 'Isolation' },
  { id: 'gait',      name: 'Gait / Locomotion' },
  { id: 'core',      name: 'Anti-Movement Core' },
];

export const MECHANICS = [
  { id: 'compound',  name: 'Compound' },
  { id: 'isolation', name: 'Isolation' },
];

/** How a set is logged. Drives the active-workout input columns. */
export const TRACKING_TYPES = [
  { id: 'weight_reps', name: 'Weight × Reps',    cols: ['weight', 'reps'] },
  { id: 'reps',        name: 'Reps only',         cols: ['reps'] },
  { id: 'weighted_bw', name: 'Bodyweight + Added',cols: ['weight', 'reps'] },
  { id: 'duration',    name: 'Duration',          cols: ['duration'] },
  { id: 'weight_time', name: 'Weight × Duration', cols: ['weight', 'duration'] },
  { id: 'distance_time', name: 'Distance & Time', cols: ['distance', 'duration'] },
];

export const SET_TYPES = [
  { id: 'normal',  name: 'Working set', short: 'W', cls: '' },
  { id: 'warmup',  name: 'Warm-up',     short: 'WU', cls: 'warmup' },
  { id: 'drop',    name: 'Drop set',    short: 'D',  cls: 'drop' },
  { id: 'failure', name: 'To failure',  short: 'F',  cls: 'failure' },
  { id: 'amrap',   name: 'AMRAP',       short: 'A',  cls: 'amrap' },
];

export const GOALS = [
  { id: 'hypertrophy', name: 'Muscle Gain', sub: 'Hypertrophy', icon: 'dumbbell',
    repRange: [8, 12], restSec: 90, weeklySets: { min: 10, max: 20 },
    desc: 'Moderate loads, higher volume, 1–3 reps from failure.' },
  { id: 'strength', name: 'Strength', sub: 'Max force', icon: 'bolt',
    repRange: [3, 6], restSec: 180, weeklySets: { min: 8, max: 16 },
    desc: 'Heavy compound lifts, long rests, lower rep ranges.' },
  { id: 'fat-loss', name: 'Fat Loss', sub: 'Body recomposition', icon: 'flame',
    repRange: [10, 15], restSec: 60, weeklySets: { min: 10, max: 18 },
    desc: 'Strength work to keep muscle, plus conditioning.' },
  { id: 'general', name: 'General Fitness', sub: 'Health & habit', icon: 'heart',
    repRange: [8, 15], restSec: 75, weeklySets: { min: 6, max: 14 },
    desc: 'Balanced full-body training you can sustain.' },
  { id: 'beginner', name: 'Beginner Fitness', sub: 'First 12 weeks', icon: 'sparkle',
    repRange: [8, 12], restSec: 90, weeklySets: { min: 5, max: 12 },
    desc: 'Learn the main patterns with simple, repeatable sessions.' },
  { id: 'athletic', name: 'Athletic Performance', sub: 'Power & speed', icon: 'run',
    repRange: [4, 8], restSec: 150, weeklySets: { min: 8, max: 16 },
    desc: 'Explosive work, compound strength and conditioning.' },
];

export const LEVELS = [
  { id: 'beginner',     name: 'Beginner',     desc: 'Under 6 months of consistent training' },
  { id: 'intermediate', name: 'Intermediate', desc: '6 months – 2 years' },
  { id: 'advanced',     name: 'Advanced',     desc: '2+ years of structured training' },
];

/** Default weekly working-set targets per muscle region — user-editable. */
export const DEFAULT_MUSCLE_TARGETS = {
  chest: 12, lats: 12, traps: 8, rhomboids: 8, 'lower-back': 6,
  'front-delts': 6, 'side-delts': 10, 'rear-delts': 8,
  biceps: 10, triceps: 10, forearms: 4,
  abs: 8, obliques: 6,
  quads: 12, hamstrings: 10, glutes: 10, calves: 8,
};

export const PROGRESSION_METHODS = [
  { id: 'double',      name: 'Double progression',
    desc: 'Add reps until the top of the range on every set, then add weight.' },
  { id: 'weight-first',name: 'Weight first',
    desc: 'Add weight whenever the bottom of the rep range is met.' },
  { id: 'reps-first',  name: 'Reps first',
    desc: 'Push reps as high as possible, then reset with more weight.' },
  { id: 'volume',      name: 'Volume progression',
    desc: 'Add a set when the target volume is comfortably hit.' },
  { id: 'manual',      name: 'Manual',
    desc: 'No automatic suggestions — you decide every session.' },
];

export const muscleById = Object.fromEntries(MUSCLES.map((m) => [m.id, m]));
export const categoryById = Object.fromEntries(CATEGORIES.map((c) => [c.id, c]));
export const equipmentById = Object.fromEntries(EQUIPMENT.map((e) => [e.id, e]));
export const goalById = Object.fromEntries(GOALS.map((g) => [g.id, g]));
