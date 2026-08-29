/* Predefined workout splits. A split is a repeating cycle of days;
   each day is either a rest day or a workout with a concrete exercise list. */

const e = (id, sets, lo, hi, rest, opts = {}) => ({ exerciseId: id, sets, repRange: [lo, hi], rest, ...opts });

export const SPLITS = [

{ id: 'split-full-body-3', name: 'Full Body 3×', level: 'beginner',
  goals: ['beginner', 'general', 'hypertrophy', 'fat-loss', 'strength'], daysPerWeek: 3, sessionMin: 55,
  tagline: 'Every muscle, three times a week',
  desc: 'The most efficient structure for beginners and anyone training three days a week. Each session covers a squat, a hinge, a push and a pull, so every muscle gets trained three times weekly — the frequency that drives the fastest early progress.',
  notes: 'Run it Mon / Wed / Fri, or any three non-consecutive days.',
  days: [
    { name: 'Full Body A', focus: ['quads', 'chest', 'lats'], exercises: [
      e('back-squat', 3, 6, 8, 150), e('barbell-bench-press', 3, 6, 8, 150),
      e('barbell-row', 3, 8, 10, 120), e('romanian-deadlift', 2, 8, 10, 120),
      e('lateral-raise', 2, 12, 15, 60), e('plank', 3, 30, 45, 45) ] },
    { name: 'Rest', rest: true },
    { name: 'Full Body B', focus: ['hamstrings', 'front-delts', 'lats'], exercises: [
      e('deadlift', 3, 5, 6, 180), e('overhead-press', 3, 6, 8, 150),
      e('lat-pulldown', 3, 8, 12, 120), e('leg-press', 3, 10, 12, 120),
      e('dumbbell-curl', 2, 10, 12, 60), e('tricep-pushdown', 2, 10, 12, 60) ] },
    { name: 'Rest', rest: true },
    { name: 'Full Body C', focus: ['glutes', 'chest', 'lats'], exercises: [
      e('front-squat', 3, 6, 8, 150), e('incline-dumbbell-press', 3, 8, 12, 120),
      e('seated-cable-row', 3, 10, 12, 90), e('hip-thrust', 3, 8, 12, 120),
      e('face-pull', 3, 12, 15, 60), e('hanging-leg-raise', 3, 8, 12, 60) ] },
    { name: 'Rest', rest: true }, { name: 'Rest', rest: true },
  ] },

{ id: 'split-upper-lower-4', name: 'Upper / Lower 4×', level: 'intermediate',
  goals: ['hypertrophy', 'strength', 'general', 'athletic', 'fat-loss'], daysPerWeek: 4, sessionMin: 65,
  tagline: 'The best all-round four-day split',
  desc: 'Alternating upper- and lower-body days. Every muscle is trained twice a week with enough volume per session for real growth, and it fits neatly into four days — the sweet spot for most intermediate lifters.',
  notes: 'Mon / Tue / Thu / Fri works well. Keep at least one rest day between the two upper days.',
  days: [
    { name: 'Upper A — Strength', focus: ['chest', 'lats', 'front-delts'], exercises: [
      e('barbell-bench-press', 4, 5, 8, 180), e('barbell-row', 4, 6, 8, 150),
      e('overhead-press', 3, 6, 10, 120), e('lat-pulldown', 3, 8, 12, 90),
      e('lateral-raise', 3, 12, 15, 60), e('barbell-curl', 3, 8, 12, 60), e('tricep-pushdown', 3, 10, 12, 60) ] },
    { name: 'Lower A — Squat focus', focus: ['quads', 'glutes'], exercises: [
      e('back-squat', 4, 5, 8, 180), e('romanian-deadlift', 3, 8, 10, 150),
      e('leg-press', 3, 10, 12, 120), e('leg-curl', 3, 10, 12, 90),
      e('standing-calf-raise', 4, 12, 15, 60), e('hanging-leg-raise', 3, 10, 15, 60) ] },
    { name: 'Rest', rest: true },
    { name: 'Upper B — Volume', focus: ['upper-chest', 'lats', 'side-delts'], exercises: [
      e('incline-dumbbell-press', 4, 8, 12, 120), e('pull-up', 4, 6, 10, 150),
      e('seated-cable-row', 3, 10, 12, 90), e('dumbbell-shoulder-press', 3, 8, 12, 90),
      e('cable-fly', 3, 12, 15, 60), e('face-pull', 3, 15, 20, 45),
      e('hammer-curl', 3, 10, 12, 60), e('overhead-tricep-extension', 3, 10, 12, 60) ] },
    { name: 'Lower B — Hinge focus', focus: ['hamstrings', 'glutes'], exercises: [
      e('deadlift', 3, 4, 6, 210), e('bulgarian-split-squat', 3, 8, 12, 120),
      e('hip-thrust', 3, 8, 12, 120), e('leg-extension', 3, 12, 15, 60),
      e('seated-calf-raise', 4, 15, 20, 45), e('cable-crunch', 3, 12, 15, 60) ] },
    { name: 'Rest', rest: true }, { name: 'Rest', rest: true },
  ] },

{ id: 'split-pplcul-6', name: 'Push / Pull / Legs / Core / Upper / Lower 6×', level: 'intermediate',
  goals: ['hypertrophy', 'general', 'athletic', 'strength'], daysPerWeek: 6, sessionMin: 70,
  tagline: 'Six specialised days, every muscle twice a week',
  desc: 'Three specialisation days (push, pull, legs) followed by a dedicated core day and two full upper/lower days. Every muscle group is trained roughly twice a week, and the second exposure uses different angles and rep ranges — the structure that drives hypertrophy best once you are past the beginner stage.',
  notes: 'Day 4 (core) is deliberately lighter, which lets the upper and lower days at the end of the week be hard again. Each day covers every muscle in its group, with a compound first and stretch-position isolation work after.',
  days: [
    { name: 'Push', focus: ['chest', 'upper-chest', 'front-delts', 'side-delts', 'triceps'], exercises: [
      e('incline-barbell-press', 4, 6, 10, 150),
      e('dumbbell-bench-press', 3, 8, 12, 120),
      e('cable-fly', 3, 12, 15, 60),
      e('dumbbell-shoulder-press', 3, 8, 12, 120),
      e('cable-lateral-raise', 4, 12, 20, 45),
      e('overhead-tricep-extension', 3, 10, 12, 75),
      e('tricep-pushdown', 3, 12, 15, 45) ] },
    { name: 'Pull', focus: ['lats', 'rhomboids', 'traps', 'rear-delts', 'biceps', 'forearms'], exercises: [
      e('pull-up', 4, 6, 10, 150),
      e('barbell-row', 4, 8, 10, 120),
      e('seated-cable-row', 3, 10, 12, 90),
      e('straight-arm-pulldown', 3, 12, 15, 60),
      e('face-pull', 3, 15, 20, 45),
      e('barbell-curl', 3, 8, 12, 75),
      e('hammer-curl', 3, 10, 15, 60),
      e('shrug', 3, 10, 15, 60) ] },
    { name: 'Legs', focus: ['quads', 'hamstrings', 'glutes', 'calves'], exercises: [
      e('back-squat', 4, 6, 10, 180),
      e('romanian-deadlift', 3, 8, 12, 150),
      e('leg-press', 3, 10, 15, 120),
      e('seated-leg-curl', 3, 10, 15, 75),
      e('hip-thrust', 3, 8, 12, 120),
      e('leg-extension', 3, 12, 15, 60),
      e('standing-calf-raise', 4, 10, 15, 60),
      e('seated-calf-raise', 3, 15, 20, 45) ] },
    { name: 'Core & Conditioning', focus: ['abs', 'obliques', 'core', 'lower-back'], exercises: [
      e('hanging-leg-raise', 4, 8, 15, 75),
      e('cable-crunch', 4, 10, 15, 60),
      e('ab-wheel-rollout', 3, 8, 12, 75),
      e('cable-woodchop', 3, 10, 12, 60),
      e('side-plank', 3, 30, 45, 45),
      e('hyperextension', 3, 12, 15, 60),
      e('farmers-walk', 3, 40, 60, 90) ] },
    { name: 'Upper', focus: ['chest', 'lats', 'front-delts', 'side-delts', 'biceps', 'triceps'], exercises: [
      e('barbell-bench-press', 4, 5, 8, 180),
      e('lat-pulldown', 4, 8, 12, 120),
      e('overhead-press', 3, 6, 10, 150),
      e('chest-supported-row', 3, 10, 12, 90),
      e('lateral-raise', 3, 12, 20, 45),
      e('preacher-curl', 3, 10, 12, 60),
      e('skull-crusher', 3, 10, 12, 60) ] },
    { name: 'Lower', focus: ['quads', 'hamstrings', 'glutes', 'calves', 'abductors'], exercises: [
      e('front-squat', 4, 6, 10, 180),
      e('bulgarian-split-squat', 3, 8, 12, 120),
      e('leg-curl', 3, 10, 15, 75),
      e('hip-thrust', 4, 8, 12, 120),
      e('leg-extension', 3, 12, 20, 60),
      e('hip-abduction', 3, 15, 20, 45),
      e('standing-calf-raise', 4, 12, 20, 45) ] },
    { name: 'Rest', rest: true },
  ] },

{ id: 'split-ppl-6', name: 'Push / Pull / Legs 6×', level: 'advanced',
  goals: ['hypertrophy', 'athletic'], daysPerWeek: 6, sessionMin: 70,
  tagline: 'High-frequency, high-volume hypertrophy',
  desc: 'Each pattern is trained twice a week across six sessions. This is the highest-volume mainstream split — it works extremely well if your recovery, sleep and nutrition can support six sessions a week.',
  notes: 'Push A / Pull A / Legs A / Push B / Pull B / Legs B, then one rest day.',
  days: [
    { name: 'Push A — Heavy', focus: ['chest', 'front-delts', 'triceps'], exercises: [
      e('barbell-bench-press', 4, 5, 8, 180), e('overhead-press', 3, 6, 10, 150),
      e('incline-dumbbell-press', 3, 8, 12, 120), e('lateral-raise', 4, 12, 15, 60),
      e('tricep-pushdown', 3, 10, 12, 60), e('overhead-tricep-extension', 3, 10, 12, 60) ] },
    { name: 'Pull A — Heavy', focus: ['lats', 'rhomboids', 'biceps'], exercises: [
      e('deadlift', 3, 4, 6, 210), e('pull-up', 4, 6, 10, 150),
      e('barbell-row', 3, 8, 10, 120), e('face-pull', 3, 15, 20, 45),
      e('barbell-curl', 3, 8, 12, 60), e('hammer-curl', 3, 10, 12, 60) ] },
    { name: 'Legs A — Quad focus', focus: ['quads', 'calves'], exercises: [
      e('back-squat', 4, 5, 8, 180), e('leg-press', 3, 10, 12, 120),
      e('romanian-deadlift', 3, 8, 10, 120), e('leg-extension', 3, 12, 15, 60),
      e('standing-calf-raise', 4, 12, 15, 60) ] },
    { name: 'Push B — Volume', focus: ['upper-chest', 'side-delts', 'triceps'], exercises: [
      e('incline-barbell-press', 4, 8, 10, 150), e('dumbbell-shoulder-press', 3, 8, 12, 120),
      e('cable-fly', 3, 12, 15, 60), e('cable-lateral-raise', 4, 12, 20, 45),
      e('close-grip-bench-press', 3, 8, 12, 90), e('tricep-pushdown', 3, 12, 15, 45) ] },
    { name: 'Pull B — Volume', focus: ['lats', 'rear-delts', 'biceps'], exercises: [
      e('lat-pulldown', 4, 8, 12, 120), e('chest-supported-row', 4, 10, 12, 90),
      e('straight-arm-pulldown', 3, 12, 15, 60), e('rear-delt-fly', 3, 15, 20, 45),
      e('preacher-curl', 3, 10, 12, 60), e('cable-curl', 3, 12, 15, 45) ] },
    { name: 'Legs B — Posterior focus', focus: ['hamstrings', 'glutes'], exercises: [
      e('romanian-deadlift', 4, 8, 10, 150), e('hip-thrust', 4, 8, 12, 120),
      e('bulgarian-split-squat', 3, 10, 12, 90), e('seated-leg-curl', 4, 10, 15, 60),
      e('seated-calf-raise', 4, 15, 20, 45), e('cable-crunch', 3, 12, 15, 60) ] },
    { name: 'Rest', rest: true },
  ] },

{ id: 'split-ppl-3', name: 'Push / Pull / Legs 3×', level: 'beginner',
  goals: ['hypertrophy', 'general', 'beginner'], daysPerWeek: 3, sessionMin: 60,
  tagline: 'Classic PPL on three days',
  desc: 'One push, one pull and one leg session per week. Lower frequency than a full-body split, but each session is focused and simple to execute — a good option if you like longer, more specialised workouts.',
  days: [
    { name: 'Push', focus: ['chest', 'front-delts', 'triceps'], exercises: [
      e('barbell-bench-press', 4, 6, 10, 150), e('overhead-press', 3, 8, 10, 120),
      e('incline-dumbbell-press', 3, 10, 12, 90), e('lateral-raise', 3, 12, 15, 60),
      e('tricep-pushdown', 3, 10, 12, 60) ] },
    { name: 'Rest', rest: true },
    { name: 'Pull', focus: ['lats', 'biceps'], exercises: [
      e('pull-up', 4, 6, 10, 150), e('barbell-row', 4, 8, 10, 120),
      e('seated-cable-row', 3, 10, 12, 90), e('face-pull', 3, 15, 20, 45),
      e('barbell-curl', 3, 10, 12, 60) ] },
    { name: 'Rest', rest: true },
    { name: 'Legs', focus: ['quads', 'hamstrings', 'glutes'], exercises: [
      e('back-squat', 4, 6, 10, 180), e('romanian-deadlift', 3, 8, 10, 150),
      e('leg-press', 3, 10, 12, 120), e('leg-curl', 3, 12, 15, 60),
      e('standing-calf-raise', 4, 12, 15, 60), e('plank', 3, 40, 60, 45) ] },
    { name: 'Rest', rest: true }, { name: 'Rest', rest: true },
  ] },

{ id: 'split-bro-5', name: 'Bro Split 5×', level: 'intermediate',
  goals: ['hypertrophy'], daysPerWeek: 5, sessionMin: 60,
  tagline: 'One muscle group per day',
  desc: 'The classic bodybuilding split: one body part per session, five days a week. Frequency is low, so each session accumulates a lot of volume. Popular and enjoyable, though most lifters grow faster on a higher-frequency structure.',
  days: [
    { name: 'Chest', focus: ['chest'], exercises: [
      e('barbell-bench-press', 4, 6, 10, 150), e('incline-dumbbell-press', 4, 8, 12, 120),
      e('decline-bench-press', 3, 10, 12, 90), e('cable-fly', 3, 12, 15, 60),
      e('push-up', 2, 15, 25, 60) ] },
    { name: 'Back', focus: ['lats', 'rhomboids'], exercises: [
      e('deadlift', 3, 5, 6, 210), e('pull-up', 4, 6, 10, 150),
      e('barbell-row', 4, 8, 10, 120), e('seated-cable-row', 3, 10, 12, 90),
      e('straight-arm-pulldown', 3, 12, 15, 60) ] },
    { name: 'Legs', focus: ['quads', 'hamstrings', 'glutes', 'calves'], exercises: [
      e('back-squat', 4, 6, 10, 180), e('leg-press', 4, 10, 12, 120),
      e('romanian-deadlift', 3, 8, 12, 120), e('leg-curl', 3, 12, 15, 60),
      e('leg-extension', 3, 12, 15, 60), e('standing-calf-raise', 4, 12, 20, 45) ] },
    { name: 'Shoulders', focus: ['front-delts', 'side-delts', 'rear-delts'], exercises: [
      e('overhead-press', 4, 6, 10, 150), e('dumbbell-shoulder-press', 3, 8, 12, 120),
      e('lateral-raise', 4, 12, 15, 60), e('rear-delt-fly', 3, 15, 20, 45),
      e('face-pull', 3, 15, 20, 45), e('shrug', 3, 10, 15, 60) ] },
    { name: 'Arms', focus: ['biceps', 'triceps'], exercises: [
      e('barbell-curl', 4, 8, 12, 75), e('close-grip-bench-press', 4, 8, 12, 90),
      e('hammer-curl', 3, 10, 12, 60), e('overhead-tricep-extension', 3, 10, 12, 60),
      e('preacher-curl', 3, 12, 15, 45), e('tricep-pushdown', 3, 12, 15, 45) ] },
    { name: 'Rest', rest: true }, { name: 'Rest', rest: true },
  ] },

{ id: 'split-arnold-6', name: 'Arnold Split 6×', level: 'advanced',
  goals: ['hypertrophy'], daysPerWeek: 6, sessionMin: 75,
  tagline: 'Chest+Back · Shoulders+Arms · Legs',
  desc: 'Antagonist pairing over six days. Training chest with back and shoulders with arms lets you superset opposing muscles, which keeps sessions dense and produces a serious pump. Very high volume — treat it as an advanced option.',
  days: [
    { name: 'Chest & Back', focus: ['chest', 'lats'], exercises: [
      e('barbell-bench-press', 4, 6, 10, 150), e('barbell-row', 4, 8, 10, 120),
      e('incline-dumbbell-press', 3, 10, 12, 90), e('pull-up', 3, 8, 12, 120),
      e('cable-fly', 3, 12, 15, 60), e('seated-cable-row', 3, 12, 15, 60) ] },
    { name: 'Shoulders & Arms', focus: ['side-delts', 'biceps', 'triceps'], exercises: [
      e('overhead-press', 4, 6, 10, 150), e('lateral-raise', 4, 12, 15, 60),
      e('rear-delt-fly', 3, 15, 20, 45), e('barbell-curl', 3, 8, 12, 60),
      e('skull-crusher', 3, 10, 12, 60), e('hammer-curl', 3, 10, 12, 45),
      e('tricep-pushdown', 3, 12, 15, 45) ] },
    { name: 'Legs', focus: ['quads', 'hamstrings', 'glutes'], exercises: [
      e('back-squat', 4, 6, 10, 180), e('romanian-deadlift', 3, 8, 10, 150),
      e('leg-press', 3, 10, 12, 120), e('leg-curl', 3, 12, 15, 60),
      e('standing-calf-raise', 4, 12, 20, 45), e('hanging-leg-raise', 3, 10, 15, 60) ] },
    { name: 'Chest & Back II', focus: ['upper-chest', 'lats'], exercises: [
      e('incline-barbell-press', 4, 8, 10, 150), e('lat-pulldown', 4, 10, 12, 90),
      e('dip', 3, 8, 12, 120), e('chest-supported-row', 3, 10, 12, 90),
      e('cable-crossover', 3, 12, 15, 60), e('straight-arm-pulldown', 3, 12, 15, 45) ] },
    { name: 'Shoulders & Arms II', focus: ['side-delts', 'biceps', 'triceps'], exercises: [
      e('dumbbell-shoulder-press', 4, 8, 12, 120), e('cable-lateral-raise', 4, 12, 20, 45),
      e('face-pull', 3, 15, 20, 45), e('preacher-curl', 3, 10, 12, 60),
      e('overhead-tricep-extension', 3, 10, 12, 60), e('cable-curl', 3, 12, 15, 45),
      e('diamond-push-up', 2, 12, 20, 45) ] },
    { name: 'Legs II', focus: ['hamstrings', 'glutes', 'calves'], exercises: [
      e('front-squat', 4, 6, 10, 180), e('hip-thrust', 4, 8, 12, 120),
      e('bulgarian-split-squat', 3, 10, 12, 90), e('seated-leg-curl', 4, 12, 15, 60),
      e('seated-calf-raise', 4, 15, 20, 45) ] },
    { name: 'Rest', rest: true },
  ] },

{ id: 'split-5day', name: '5-Day Split', level: 'intermediate',
  goals: ['hypertrophy', 'general'], daysPerWeek: 5, sessionMin: 65,
  tagline: 'Chest · Back · Legs · Shoulders · Arms',
  desc: 'A body-part split with a dedicated arm day. Similar to the bro split but with slightly more balanced volume and a little cross-over between days.',
  days: [
    { name: 'Chest', focus: ['chest'], exercises: [
      e('barbell-bench-press', 4, 6, 10, 150), e('incline-dumbbell-press', 3, 8, 12, 120),
      e('cable-fly', 3, 12, 15, 60), e('dip', 3, 8, 12, 90), e('push-up', 2, 15, 25, 60) ] },
    { name: 'Back', focus: ['lats', 'rhomboids'], exercises: [
      e('pull-up', 4, 6, 10, 150), e('barbell-row', 4, 8, 10, 120),
      e('lat-pulldown', 3, 10, 12, 90), e('seated-cable-row', 3, 10, 12, 90),
      e('face-pull', 3, 15, 20, 45) ] },
    { name: 'Legs', focus: ['quads', 'hamstrings', 'glutes'], exercises: [
      e('back-squat', 4, 6, 10, 180), e('romanian-deadlift', 3, 8, 10, 150),
      e('leg-press', 3, 10, 12, 120), e('leg-curl', 3, 12, 15, 60),
      e('standing-calf-raise', 4, 12, 20, 45) ] },
    { name: 'Shoulders', focus: ['front-delts', 'side-delts', 'rear-delts'], exercises: [
      e('overhead-press', 4, 6, 10, 150), e('lateral-raise', 4, 12, 15, 60),
      e('rear-delt-fly', 3, 15, 20, 45), e('upright-row', 3, 10, 12, 60), e('shrug', 3, 10, 15, 60) ] },
    { name: 'Arms & Core', focus: ['biceps', 'triceps', 'abs'], exercises: [
      e('barbell-curl', 4, 8, 12, 75), e('skull-crusher', 4, 8, 12, 75),
      e('hammer-curl', 3, 10, 12, 60), e('tricep-pushdown', 3, 12, 15, 45),
      e('cable-crunch', 3, 12, 15, 60), e('plank', 3, 45, 60, 45) ] },
    { name: 'Rest', rest: true }, { name: 'Rest', rest: true },
  ] },

{ id: 'split-strength-3', name: 'Strength 3× (Linear)', level: 'beginner',
  goals: ['strength', 'beginner'], daysPerWeek: 3, sessionMin: 50,
  tagline: 'Squat, press, pull — add weight every session',
  desc: 'A minimalist barbell strength programme built on linear progression. Two alternating sessions covering the main lifts, with heavy sets of five and long rests. Add a small increment every session for as long as it keeps working.',
  notes: 'Add 2.5 kg to upper-body lifts and 5 kg to lower-body lifts each session while you can. When you miss reps twice, drop 10% and build back.',
  days: [
    { name: 'Workout A', focus: ['quads', 'chest'], exercises: [
      e('back-squat', 3, 5, 5, 210), e('barbell-bench-press', 3, 5, 5, 210),
      e('barbell-row', 3, 5, 5, 180), e('plank', 3, 30, 45, 60) ] },
    { name: 'Rest', rest: true },
    { name: 'Workout B', focus: ['quads', 'front-delts'], exercises: [
      e('back-squat', 3, 5, 5, 210), e('overhead-press', 3, 5, 5, 210),
      e('deadlift', 1, 5, 5, 240), e('chin-up', 3, 5, 8, 150) ] },
    { name: 'Rest', rest: true },
    { name: 'Workout A', focus: ['quads', 'chest'], exercises: [
      e('back-squat', 3, 5, 5, 210), e('barbell-bench-press', 3, 5, 5, 210),
      e('barbell-row', 3, 5, 5, 180), e('hanging-leg-raise', 3, 8, 12, 60) ] },
    { name: 'Rest', rest: true }, { name: 'Rest', rest: true },
  ] },

{ id: 'split-fatloss-4', name: 'Fat Loss Hybrid 4×', level: 'beginner',
  goals: ['fat-loss', 'general'], daysPerWeek: 4, sessionMin: 55,
  tagline: 'Full-body lifting plus conditioning',
  desc: 'Two full-body strength sessions and two strength-plus-conditioning sessions. Lifting preserves muscle in a calorie deficit; the conditioning and daily steps handle the energy expenditure.',
  notes: 'Keep the lifting heavy — a deficit is not the time to cut weight on the bar. Add a daily step target for the biggest effect.',
  days: [
    { name: 'Full Body Strength A', focus: ['quads', 'chest', 'lats'], exercises: [
      e('back-squat', 3, 8, 10, 120), e('barbell-bench-press', 3, 8, 10, 120),
      e('seated-cable-row', 3, 10, 12, 90), e('romanian-deadlift', 3, 10, 12, 90),
      e('plank', 3, 40, 60, 45) ] },
    { name: 'Conditioning + Core', focus: ['cardio', 'abs'], exercises: [
      e('hiit', 1, 15, 20, 60), e('kettlebell-swing', 4, 12, 15, 60),
      e('mountain-climber', 3, 30, 45, 45), e('russian-twist', 3, 15, 20, 45),
      e('walking', 1, 20, 30, 0) ] },
    { name: 'Rest', rest: true },
    { name: 'Full Body Strength B', focus: ['hamstrings', 'front-delts', 'lats'], exercises: [
      e('trap-bar-deadlift', 3, 8, 10, 120), e('dumbbell-shoulder-press', 3, 10, 12, 90),
      e('lat-pulldown', 3, 10, 12, 90), e('bulgarian-split-squat', 3, 10, 12, 90),
      e('cable-crunch', 3, 12, 15, 60) ] },
    { name: 'Conditioning + Full Body', focus: ['cardio', 'full-body'], exercises: [
      e('rowing', 1, 15, 20, 60), e('goblet-squat', 3, 12, 15, 60),
      e('push-up', 3, 12, 20, 60), e('dumbbell-row', 3, 12, 15, 60),
      e('farmers-walk', 3, 40, 60, 60) ] },
    { name: 'Rest', rest: true }, { name: 'Rest', rest: true },
  ] },

{ id: 'split-athletic-4', name: 'Athletic Performance 4×', level: 'intermediate',
  goals: ['athletic', 'strength'], daysPerWeek: 4, sessionMin: 65,
  tagline: 'Power, strength and conditioning',
  desc: 'Explosive work first, heavy compound strength second, accessories last. Built for people who want their training to transfer to sport rather than purely to appearance.',
  notes: 'Power work is low-rep and fully recovered — never take jumps or cleans to failure.',
  days: [
    { name: 'Lower Power', focus: ['quads', 'glutes'], exercises: [
      e('box-jump', 4, 3, 5, 120), e('back-squat', 4, 3, 5, 210),
      e('romanian-deadlift', 3, 6, 8, 150), e('bulgarian-split-squat', 3, 8, 10, 90),
      e('farmers-walk', 3, 30, 45, 90) ] },
    { name: 'Upper Power', focus: ['chest', 'lats'], exercises: [
      e('barbell-bench-press', 4, 3, 5, 210), e('pull-up', 4, 5, 8, 150),
      e('overhead-press', 3, 6, 8, 150), e('barbell-row', 3, 8, 10, 120),
      e('face-pull', 3, 15, 20, 45) ] },
    { name: 'Rest', rest: true },
    { name: 'Total Body Power', focus: ['full-body'], exercises: [
      e('power-clean', 5, 3, 3, 180), e('front-squat', 3, 5, 6, 180),
      e('kettlebell-swing', 4, 12, 15, 75), e('cable-woodchop', 3, 10, 12, 60),
      e('hiit', 1, 10, 15, 0) ] },
    { name: 'Accessory & Core', focus: ['abs', 'hamstrings', 'rear-delts'], exercises: [
      e('trap-bar-deadlift', 3, 6, 8, 150), e('nordic-curl', 3, 3, 6, 120),
      e('hip-thrust', 3, 8, 12, 90), e('ab-wheel-rollout', 3, 8, 12, 60),
      e('side-plank', 3, 30, 45, 45) ] },
    { name: 'Rest', rest: true }, { name: 'Rest', rest: true },
  ] },

{ id: 'split-home-3', name: 'Home / Minimal Kit 3×', level: 'beginner',
  goals: ['general', 'beginner', 'fat-loss'], daysPerWeek: 3, sessionMin: 40,
  tagline: 'Dumbbells, a bar and bodyweight',
  desc: 'A full-body routine that needs only dumbbells, a pull-up bar and floor space. Ideal for home training or for keeping progress going while travelling.',
  days: [
    { name: 'Home Full Body A', focus: ['chest', 'quads'], exercises: [
      e('goblet-squat', 3, 10, 15, 90), e('push-up', 3, 10, 20, 75),
      e('dumbbell-row', 3, 10, 12, 75), e('dumbbell-rdl', 3, 10, 12, 75),
      e('plank', 3, 30, 60, 45) ] },
    { name: 'Rest', rest: true },
    { name: 'Home Full Body B', focus: ['lats', 'glutes'], exercises: [
      e('bulgarian-split-squat', 3, 10, 12, 90), e('pull-up', 3, 5, 10, 90),
      e('dumbbell-shoulder-press', 3, 10, 12, 75), e('glute-bridge', 3, 12, 20, 60),
      e('side-plank', 3, 30, 45, 45) ] },
    { name: 'Rest', rest: true },
    { name: 'Home Full Body C', focus: ['full-body'], exercises: [
      e('lunge', 3, 10, 12, 90), e('diamond-push-up', 3, 8, 15, 75),
      e('inverted-row', 3, 8, 15, 75), e('dumbbell-curl', 3, 10, 15, 60),
      e('mountain-climber', 3, 30, 45, 45), e('crunch', 3, 15, 25, 45) ] },
    { name: 'Rest', rest: true }, { name: 'Rest', rest: true },
  ] },

{ id: 'split-push-pull-4', name: 'Push / Pull 4×', level: 'intermediate',
  goals: ['hypertrophy', 'strength'], daysPerWeek: 4, sessionMin: 60,
  tagline: 'Legs shared across both days',
  desc: 'Push days cover chest, shoulders, triceps and quads; pull days cover back, biceps and hamstrings. Each pattern is hit twice a week with fewer sessions than a six-day PPL.',
  days: [
    { name: 'Push A', focus: ['chest', 'quads', 'triceps'], exercises: [
      e('barbell-bench-press', 4, 6, 8, 150), e('back-squat', 4, 6, 8, 180),
      e('overhead-press', 3, 8, 10, 120), e('leg-extension', 3, 12, 15, 60),
      e('tricep-pushdown', 3, 10, 12, 60), e('lateral-raise', 3, 12, 15, 45) ] },
    { name: 'Pull A', focus: ['lats', 'hamstrings', 'biceps'], exercises: [
      e('deadlift', 3, 5, 6, 210), e('pull-up', 4, 6, 10, 150),
      e('barbell-row', 3, 8, 10, 120), e('leg-curl', 3, 12, 15, 60),
      e('barbell-curl', 3, 10, 12, 60), e('face-pull', 3, 15, 20, 45) ] },
    { name: 'Rest', rest: true },
    { name: 'Push B', focus: ['upper-chest', 'glutes', 'side-delts'], exercises: [
      e('incline-dumbbell-press', 4, 8, 12, 120), e('leg-press', 4, 10, 12, 120),
      e('dumbbell-shoulder-press', 3, 10, 12, 90), e('cable-fly', 3, 12, 15, 60),
      e('cable-lateral-raise', 3, 15, 20, 45), e('overhead-tricep-extension', 3, 10, 12, 60) ] },
    { name: 'Pull B', focus: ['rhomboids', 'glutes', 'biceps'], exercises: [
      e('lat-pulldown', 4, 10, 12, 90), e('hip-thrust', 4, 8, 12, 120),
      e('chest-supported-row', 3, 10, 12, 90), e('romanian-deadlift', 3, 10, 12, 90),
      e('hammer-curl', 3, 10, 12, 60), e('rear-delt-fly', 3, 15, 20, 45) ] },
    { name: 'Rest', rest: true }, { name: 'Rest', rest: true },
  ] },

{ id: 'split-full-body-2', name: 'Full Body 2× (Minimum Effective)', level: 'beginner',
  goals: ['general', 'beginner'], daysPerWeek: 2, sessionMin: 45,
  tagline: 'Two sessions, everything covered',
  desc: 'The smallest structure that still produces steady progress. Two full-body sessions a week is enough to build strength and keep muscle when time is genuinely short.',
  days: [
    { name: 'Full Body A', focus: ['quads', 'chest', 'lats'], exercises: [
      e('back-squat', 3, 8, 10, 150), e('barbell-bench-press', 3, 8, 10, 150),
      e('barbell-row', 3, 8, 10, 120), e('romanian-deadlift', 3, 10, 12, 120),
      e('plank', 3, 40, 60, 45) ] },
    { name: 'Rest', rest: true }, { name: 'Rest', rest: true },
    { name: 'Full Body B', focus: ['glutes', 'front-delts', 'lats'], exercises: [
      e('trap-bar-deadlift', 3, 6, 8, 180), e('dumbbell-shoulder-press', 3, 8, 12, 120),
      e('lat-pulldown', 3, 10, 12, 90), e('leg-press', 3, 10, 12, 120),
      e('dumbbell-curl', 2, 12, 15, 60), e('tricep-pushdown', 2, 12, 15, 60) ] },
    { name: 'Rest', rest: true }, { name: 'Rest', rest: true }, { name: 'Rest', rest: true },
  ] },
];

/**
 * Rank splits for a goal / frequency / level combination.
 * Returns [{ split, score, reasons[] }] sorted best-first.
 */
export function recommendSplits({ goal = 'hypertrophy', daysPerWeek = 4, level = 'beginner', sessionMin = 60 } = {}) {
  return SPLITS.map((s) => {
    let score = 0; const reasons = [];
    if (s.goals.includes(goal)) { score += 40; reasons.push('Matches your goal'); }
    const dd = Math.abs(s.daysPerWeek - daysPerWeek);
    if (dd === 0) { score += 40; reasons.push(`Exactly ${daysPerWeek} days a week`); }
    else if (dd === 1) { score += 22; reasons.push(`${s.daysPerWeek} days a week — close to your ${daysPerWeek}`); }
    else if (dd === 2) score += 6;
    else score -= dd * 5;
    if (s.level === level) { score += 18; reasons.push(`Suited to ${level} lifters`); }
    else if ((level === 'advanced' && s.level === 'intermediate') || (level === 'intermediate' && s.level === 'beginner')) score += 8;
    else if (level === 'beginner' && s.level === 'advanced') { score -= 22; reasons.push('High volume — demanding for a beginner'); }
    if (sessionMin && s.sessionMin <= sessionMin + 10) { score += 10; reasons.push(`Fits a ${sessionMin}-minute session`); }
    else if (sessionMin && s.sessionMin > sessionMin + 20) { score -= 12; reasons.push('Sessions run longer than your target'); }
    return { split: s, score, reasons };
  }).sort((a, b) => b.score - a.score);
}

/** Goal → frequency guidance shown on the recommendation screen. */
export const GOAL_GUIDANCE = {
  hypertrophy: { 2: 'Full Body', 3: 'Full Body', 4: 'Upper / Lower', 5: '5-Day or Bro Split', 6: 'Push / Pull / Legs' },
  strength:    { 2: 'Full Body', 3: 'Linear Strength', 4: 'Upper / Lower', 5: 'Upper / Lower + accessory', 6: 'Push / Pull / Legs' },
  'fat-loss':  { 2: 'Full Body + steps', 3: 'Full Body + cardio', 4: 'Fat Loss Hybrid', 5: 'Hybrid + cardio', 6: 'PPL + daily steps' },
  general:     { 2: 'Full Body 2×', 3: 'Full Body 3×', 4: 'Upper / Lower', 5: '5-Day Split', 6: 'Push / Pull / Legs' },
  beginner:    { 2: 'Full Body 2×', 3: 'Full Body 3×', 4: 'Upper / Lower', 5: 'Upper / Lower + full body', 6: 'Not recommended yet' },
  athletic:    { 2: 'Full Body', 3: 'Full Body power', 4: 'Athletic Performance', 5: 'Athletic + conditioning', 6: 'PPL + sport practice' },
};

export const splitById = Object.fromEntries(SPLITS.map((s) => [s.id, s]));
