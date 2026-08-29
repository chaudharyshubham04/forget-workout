/* ============================================================
   Import yuhonas/free-exercise-db — a public-domain (Unlicense) exercise set
   with photographs.

   Unlike the Gym visual media, these images carry no redistribution
   restriction, so they ship in the deployed build. Exercises already present
   in the library (by exact name) are not duplicated; their photos are attached
   to the existing entry instead.

   Usage: node scripts/import-open-db.js <path-to-free-exercise-db-checkout>
   ============================================================ */
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { EXERCISES } from '../js/data/exercises.js';

const SRC = process.argv[2] || '/tmp/freedb';
const OUT = 'js/data/exercises-open.json';
const OUT_MEDIA = 'js/data/open-media.json';

const raw = JSON.parse(readFileSync(`${SRC}/dist/exercises.json`, 'utf8'));
const ext = JSON.parse(readFileSync('js/data/exercises-extended.json', 'utf8'));

const MUSCLE = {
  abdominals: 'abs', abductors: 'abductors', adductors: 'adductors',
  biceps: 'biceps', calves: 'calves', chest: 'chest', forearms: 'forearms',
  glutes: 'glutes', hamstrings: 'hamstrings', lats: 'lats',
  'lower back': 'lower-back', 'middle back': 'rhomboids', neck: 'neck',
  quadriceps: 'quads', traps: 'traps', triceps: 'triceps',
};
const resolveDelt = (name) => {
  const n = name.toLowerCase();
  if (/rear|reverse|bent.?over|face pull/.test(n)) return 'rear-delts';
  if (/lateral|side|upright/.test(n)) return 'side-delts';
  if (/front|press|push|overhead|military/.test(n)) return 'front-delts';
  return 'side-delts';
};
const mapMuscle = (m, name) => (m === 'shoulders' ? resolveDelt(name) : MUSCLE[m] || null);

const EQUIP = {
  bands: 'band', barbell: 'barbell', 'body only': 'bodyweight', cable: 'cable',
  dumbbell: 'dumbbell', 'e-z curl bar': 'ez-bar', 'exercise ball': 'stability-ball',
  'foam roll': 'foam-roller', kettlebells: 'kettlebell', machine: 'machine',
  'medicine ball': 'medicine-ball', other: 'none',
};

const CAT_BY_MUSCLE = {
  chest: ['cat-chest'], 'upper-chest': ['cat-chest'],
  lats: ['cat-back'], rhomboids: ['cat-back'], traps: ['cat-back'], 'lower-back': ['cat-back'],
  'front-delts': ['cat-shoulders'], 'side-delts': ['cat-shoulders'], 'rear-delts': ['cat-shoulders'],
  biceps: ['cat-biceps'], triceps: ['cat-triceps'], forearms: ['cat-forearms'],
  quads: ['cat-quads', 'cat-legs'], hamstrings: ['cat-hamstrings', 'cat-legs'],
  glutes: ['cat-glutes', 'cat-legs'], calves: ['cat-calves', 'cat-legs'],
  adductors: ['cat-legs'], abductors: ['cat-legs'],
  abs: ['cat-core'], obliques: ['cat-core'], core: ['cat-core'],
  neck: ['cat-neck'], cardio: ['cat-cardio'],
};

/* Reuse the movement/pose heuristics that the other importer proved out. */
const POSE_RULES = [
  [/incline.*(press|bench)/i, 'inclinebench'], [/decline.*(press|bench)/i, 'declinebench'],
  [/skull|lying tricep/i, 'skullcrusher'], [/(bench press|floor press|chest press)/i, 'bench'],
  [/(fly|flye|pec deck|crossover)/i, 'fly'], [/push.?up/i, 'pushup'], [/dip/i, 'dip'],
  [/pull.?up|chin.?up|muscle.?up/i, 'pullup'], [/pulldown|lat pull/i, 'pulldown'],
  [/(hanging|captain).*(raise|knee|leg)/i, 'legraise'], [/row/i, 'row'],
  [/deadlift|clean|snatch|good morning/i, 'deadlift'],
  [/(romanian|stiff|hip hinge|swing)/i, 'hinge'], [/hip thrust|glute bridge|bridge/i, 'hipthrust'],
  [/back extension|hyperextension/i, 'backext'], [/leg press|hack squat/i, 'legpress'],
  [/leg extension/i, 'legextension'], [/leg curl|nordic|kickback/i, 'legcurl'],
  [/squat|thruster/i, 'squat'], [/lunge|split squat|step.?up/i, 'lunge'],
  [/calf|heel raise/i, 'calfraise'], [/(shoulder|overhead|military|arnold).*press/i, 'ohp'],
  [/lateral raise|side raise/i, 'lateralraise'], [/front raise/i, 'frontraise'],
  [/face pull|rear delt|reverse fly/i, 'facepull'], [/shrug|upright row/i, 'shrug'],
  [/hammer curl|reverse curl|wrist/i, 'hammercurl'], [/curl/i, 'curl'],
  [/pushdown|tricep.*(extension|press)/i, 'pushdown'], [/overhead.*extension/i, 'overheadext'],
  [/sit.?up/i, 'situp'], [/crunch/i, 'crunch'],
  [/plank|mountain climber|dead bug|bird dog/i, 'plank'], [/wheel|rollout/i, 'abwheel'],
  [/twist|wood ?chop|oblique/i, 'russiantwist'], [/carry|farmer/i, 'carry'],
  [/(run|sprint|treadmill|jog)/i, 'run'], [/walk|march/i, 'walk'],
  [/(bike|cycl|elliptical)/i, 'cycle'], [/stair|stepmill/i, 'stairs'],
  [/jump|hop|burpee|jack/i, 'jump'], [/stretch|mobility/i, 'lunge'],
];
const POSE_BY_MUSCLE = {
  chest: 'bench', lats: 'pulldown', rhomboids: 'row', traps: 'shrug',
  'front-delts': 'ohp', 'side-delts': 'lateralraise', 'rear-delts': 'facepull',
  biceps: 'curl', triceps: 'pushdown', forearms: 'hammercurl',
  quads: 'squat', hamstrings: 'legcurl', glutes: 'hipthrust', calves: 'calfraise',
  abs: 'crunch', obliques: 'russiantwist', 'lower-back': 'backext',
  adductors: 'legextension', abductors: 'legextension', neck: 'shrug', cardio: 'run',
};
function poseFor(rec, primary) {
  const isCore = ['abs', 'obliques', 'core'].includes(primary);
  if (isCore && /bike|bicycle|cycl/i.test(rec.name)) return 'crunch';
  for (const [re, p] of POSE_RULES) if (re.test(rec.name)) return p;
  return POSE_BY_MUSCLE[primary] || 'generic';
}
const MOVEMENT = [
  [/squat|leg press|hack/i, 'squat'], [/deadlift|romanian|good morning|swing|hyperextension/i, 'hinge'],
  [/lunge|split squat|step.?up/i, 'lunge'], [/carry|farmer/i, 'carry'],
  [/twist|chop|rotation/i, 'rotation'], [/plank|hold/i, 'core'],
  [/run|walk|bike|cycl|jump|sprint/i, 'gait'],
  [/row|pull|chin|curl|shrug|pulldown/i, 'pull'], [/press|push|dip|extension|raise|fly/i, 'push'],
];

const norm = (s) => String(s).toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
const title = (s) => s.replace(/\s+/g, ' ').trim();

/* Existing library: curated first so its names win any collision. */
const byName = new Map();
for (const e of EXERCISES) byName.set(norm(e.name), e.id);
for (const e of ext) if (!byName.has(norm(e.name))) byName.set(norm(e.name), e.id);

const out = [];
const attach = {};
let noSteps = 0;
const usedIds = new Set([...EXERCISES.map((e) => e.id), ...ext.map((e) => e.id)]);
let matched = 0, noImages = 0;

for (const rec of raw) {
  const images = (rec.images || []).filter(Boolean);
  if (!images.length) { noImages++; continue; }
  if (!existsSync(`${SRC}/exercises/${images[0]}`)) { noImages++; continue; }

  const media = { image: `open/${images[0]}`, images: images.map((i) => `open/${i}`), open: true };

  const key = norm(rec.name);
  if (byName.has(key)) { attach[byName.get(key)] = media; matched++; continue; }

  /* A handful of source records have no instruction text. Rather than invent
     coaching cues, skip them — the library already has 2,000+ complete entries. */
  if (!(rec.instructions || []).filter((x) => x && x.trim()).length) { noSteps++; continue; }

  const primary = mapMuscle(rec.primaryMuscles?.[0], rec.name)
    || (rec.category === 'cardio' ? 'cardio' : 'full-body');
  const secondary = [...new Set((rec.secondaryMuscles || [])
    .map((m) => mapMuscle(m, rec.name)).filter((m) => m && m !== primary))].slice(0, 5);

  let id = `od-${key.replace(/ /g, '-')}`;
  if (usedIds.has(id)) id = `${id}-${out.length}`;
  usedIds.add(id);

  const mech = rec.mechanic || (/curl|raise|fly|extension|shrug|crunch|calf/i.test(rec.name) ? 'isolation' : 'compound');
  let movement = mech === 'isolation' ? 'isolation' : 'push';
  for (const [re, m] of MOVEMENT) if (re.test(rec.name)) { movement = m; break; }

  out.push({
    id,
    name: title(rec.name),
    primaryMuscles: [primary],
    secondaryMuscles: secondary,
    categories: [...new Set([...(CAT_BY_MUSCLE[primary] || []),
      ...(rec.category === 'cardio' ? ['cat-cardio'] : []),
      ...(rec.category === 'stretching' ? ['cat-mobility'] : []),
      ...(rec.category === 'olympic weightlifting' ? ['cat-olympic'] : [])])],
    equipment: [EQUIP[rec.equipment] || 'none'],
    difficulty: rec.level === 'expert' ? 'advanced' : rec.level,
    mechanic: mech,
    movement,
    force: rec.force || 'push',
    tracking: rec.category === 'cardio' ? 'duration'
      : /plank|hold|stretch/i.test(rec.name) ? 'duration'
      : rec.equipment === 'body only' ? 'weighted_bw' : 'weight_reps',
    description: (rec.instructions || [])[0] || '',
    instructions: rec.instructions || [],
    mistakes: [], tips: [], cues: [],
    alternatives: [], variations: [], similarExercises: [],
    tags: [rec.category, rec.equipment].filter(Boolean).map(norm).map((t) => t.replace(/ /g, '-')),
    pose: poseFor(rec, primary),
    unilateral: /single|one arm|one leg|alternat/i.test(rec.name),
    custom: false,
    source: 'free-exercise-db',
    media,
  });
}

writeFileSync(OUT, JSON.stringify(out));
writeFileSync(OUT_MEDIA, JSON.stringify(attach));
console.log(`added ${out.length} new exercises with public-domain photos`);
console.log(`attached photos to ${matched} exercises already in the library`);
console.log(`skipped ${noImages} records with no usable image`);
console.log(`skipped ${noSteps} records with no instruction text`);
console.log(`total photo-backed: ${out.length + matched}`);
console.log(`wrote ${OUT} (${(readFileSync(OUT).length / 1024).toFixed(0)} KB) and ${OUT_MEDIA}`);
