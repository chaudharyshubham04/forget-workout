/* ============================================================
   Import the MIT-licensed portion of hasaneyldrm/exercises-dataset.

   The dataset's LICENSE grants MIT rights to "the code, tooling, dataset
   structure, and instruction text/translations" only. The images/ and videos/
   directories are © Gym visual and explicitly NOT licensed by cloning, so no
   media is downloaded or redistributed here — only names, taxonomy and the
   English instruction text. Media paths are recorded as references so a user
   who licenses the assets can point the app at them (see js/lib/media.js).

   Usage: node scripts/import-dataset.js <path-to-exercises.json>
   ============================================================ */
import { readFileSync, writeFileSync } from 'node:fs';
import { EXERCISES } from '../js/data/exercises.js';

const SRC = process.argv[2] || '/tmp/ex-dataset.json';
const OUT = 'js/data/exercises-extended.json';
const OUT_MEDIA = 'js/data/curated-media.json';

const raw = JSON.parse(readFileSync(SRC, 'utf8'));

/* ---------- taxonomy mapping ---------- */
const MUSCLE = {
  abs: 'abs', abdominals: 'abs', 'lower abs': 'abs',
  obliques: 'obliques', core: 'core', 'hip flexors': 'hip-flexors',
  spine: 'lower-back', 'lower back': 'lower-back',
  lats: 'lats', 'latissimus dorsi': 'lats', back: 'lats',
  'upper back': 'rhomboids', rhomboids: 'rhomboids',
  traps: 'traps', trapezius: 'traps', 'levator scapulae': 'traps',
  chest: 'chest', pectorals: 'chest', 'upper chest': 'upper-chest',
  'serratus anterior': 'serratus',
  'rear deltoids': 'rear-delts', 'rotator cuff': 'rotator-cuff',
  biceps: 'biceps', brachialis: 'biceps', triceps: 'triceps',
  forearms: 'forearms', 'wrist extensors': 'forearms', 'wrist flexors': 'forearms',
  wrists: 'forearms', hands: 'forearms', 'grip muscles': 'forearms',
  quads: 'quads', quadriceps: 'quads', hamstrings: 'hamstrings', glutes: 'glutes',
  calves: 'calves', soleus: 'calves', shins: 'calves',
  ankles: 'calves', 'ankle stabilizers': 'calves', feet: 'calves',
  adductors: 'adductors', 'inner thighs': 'adductors', groin: 'adductors',
  abductors: 'abductors',
  'cardiovascular system': 'cardio',
  sternocleidomastoid: 'neck',
};
/* "delts" / "shoulders" are ambiguous — resolve from the movement name. */
function resolveDelt(name) {
  const n = name.toLowerCase();
  if (/rear|reverse|bent.?over|face pull/.test(n)) return 'rear-delts';
  if (/lateral|side|upright/.test(n)) return 'side-delts';
  if (/front|press|push/.test(n)) return 'front-delts';
  return 'side-delts';
}
const mapMuscle = (term, name) => {
  if (!term) return null;
  const t = String(term).toLowerCase().trim();
  if (t === 'delts' || t === 'deltoids' || t === 'shoulders') return resolveDelt(name);
  return MUSCLE[t] || null;
};

const EQUIP = {
  assisted: 'machine', band: 'band', 'resistance band': 'band',
  barbell: 'barbell', 'olympic barbell': 'barbell', 'ez barbell': 'ez-bar',
  'body weight': 'bodyweight', weighted: 'bodyweight',
  cable: 'cable', dumbbell: 'dumbbell', kettlebell: 'kettlebell',
  'leverage machine': 'machine', hammer: 'machine', 'smith machine': 'smith',
  'medicine ball': 'medicine-ball', 'stability ball': 'stability-ball',
  'bosu ball': 'bosu-ball', roller: 'foam-roller', 'wheel roller': 'ab-wheel',
  rope: 'battle-rope', 'sled machine': 'sled', 'trap bar': 'trap-bar',
  'stationary bike': 'bike', 'elliptical machine': 'elliptical',
  'skierg machine': 'skierg', 'stepmill machine': 'stair-climber',
  'upper body ergometer': 'ergometer', tire: 'tire',
};

const CATEGORY = {
  back: ['cat-back'], cardio: ['cat-cardio'], chest: ['cat-chest'],
  'lower arms': ['cat-forearms'], 'lower legs': ['cat-calves', 'cat-legs'],
  neck: ['cat-neck'], shoulders: ['cat-shoulders'], waist: ['cat-core'],
  'upper arms': ['cat-biceps'], 'upper legs': ['cat-legs'],
};
function categoriesFor(rec, primary) {
  const out = new Set(CATEGORY[rec.body_part] || []);
  if (rec.body_part === 'upper arms') {
    out.delete('cat-biceps');
    out.add(primary === 'triceps' ? 'cat-triceps' : primary === 'forearms' ? 'cat-forearms' : 'cat-biceps');
  }
  if (rec.body_part === 'upper legs') {
    if (primary === 'hamstrings') out.add('cat-hamstrings');
    else if (primary === 'glutes') out.add('cat-glutes');
    else if (primary === 'quads') out.add('cat-quads');
  }
  return [...out];
}

/* ---------- movement classification ---------- */
const ISOLATION = /curl|raise|fly|flye|extension|kickback|shrug|pushdown|pullover|calf|crunch|twist|bend|abduction|adduction|reverse hyper|wrist|pec deck|leg curl|concentration|preacher|lateral|pull.?apart|rotation/i;
const POSE_RULES = [
  [/incline.*(press|bench)/i, 'inclinebench'],
  [/decline.*(press|bench)/i, 'declinebench'],
  [/(bench press|floor press|chest press|skull|lying.*press)/i, 'bench'],
  [/skull|lying tricep/i, 'skullcrusher'],
  [/(fly|flye|pec deck|crossover)/i, 'fly'],
  [/push.?up|push up/i, 'pushup'],
  [/dip/i, 'dip'],
  [/pull.?up|chin.?up|muscle.?up/i, 'pullup'],
  [/pulldown|lat pull/i, 'pulldown'],
  [/(hanging|captain).*(raise|knee|leg)/i, 'legraise'],
  [/row/i, 'row'],
  [/deadlift|clean|snatch|good morning/i, 'deadlift'],
  [/(romanian|stiff|hip hinge|swing|kettlebell swing)/i, 'hinge'],
  [/hip thrust|glute bridge|bridge/i, 'hipthrust'],
  [/back extension|hyperextension/i, 'backext'],
  [/leg press|hack squat/i, 'legpress'],
  [/leg extension/i, 'legextension'],
  [/leg curl|nordic|kickback/i, 'legcurl'],
  [/squat|thruster/i, 'squat'],
  [/lunge|split squat|step.?up/i, 'lunge'],
  [/calf|heel raise/i, 'calfraise'],
  [/(shoulder|overhead|military|arnold|z press).*(press)?/i, 'ohp'],
  [/lateral raise|side raise|lateral delt/i, 'lateralraise'],
  [/front raise/i, 'frontraise'],
  [/face pull|rear delt|reverse fly/i, 'facepull'],
  [/shrug|upright row/i, 'shrug'],
  [/hammer curl|reverse curl|wrist/i, 'hammercurl'],
  [/curl/i, 'curl'],
  [/pushdown|tricep.*(extension|press)/i, 'pushdown'],
  [/overhead.*extension/i, 'overheadext'],
  [/sit.?up/i, 'situp'],
  [/crunch/i, 'crunch'],
  [/plank|mountain climber|dead bug|bird dog/i, 'plank'],
  [/wheel|rollout/i, 'abwheel'],
  [/(russian )?twist|wood ?chop|oblique/i, 'russiantwist'],
  [/carry|farmer|suitcase/i, 'carry'],
  [/(run|sprint|treadmill|jog)/i, 'run'],
  [/walk|march/i, 'walk'],
  [/(bike|cycl|elliptical)/i, 'cycle'],
  [/row(ing)? machine|ergometer|skierg/i, 'rowmachine'],
  [/stair|stepmill/i, 'stairs'],
  [/jump|hop|burpee|jack/i, 'jump'],
];
function poseFor(rec, primary) {
  const n = rec.name;
  /* Core work named after a cardio machine ("air bike", "bicycle crunch") is
     abdominal work, not cycling — resolve by muscle before matching the name. */
  const isCore = ['abs', 'obliques', 'core', 'hip-flexors'].includes(primary);
  if (isCore && /bike|bicycle|cycl|run|walk/i.test(n)) return /twist|oblique|side/i.test(n) ? 'russiantwist' : 'crunch';
  for (const [re, pose] of POSE_RULES) if (re.test(n)) return pose;
  const byMuscle = {
    chest: 'bench', 'upper-chest': 'inclinebench', lats: 'pulldown', rhomboids: 'row',
    traps: 'shrug', 'front-delts': 'ohp', 'side-delts': 'lateralraise', 'rear-delts': 'facepull',
    biceps: 'curl', triceps: 'pushdown', forearms: 'hammercurl',
    quads: 'squat', hamstrings: 'legcurl', glutes: 'hipthrust', calves: 'calfraise',
    abs: 'crunch', obliques: 'russiantwist', core: 'plank', 'lower-back': 'backext',
    cardio: 'run', neck: 'shrug',
  };
  return byMuscle[primary] || 'generic';
}

function trackingFor(rec, primary) {
  const n = rec.name.toLowerCase();
  if (primary === 'cardio' || rec.body_part === 'cardio') {
    return /bike|run|treadmill|walk|row|elliptical|ski/.test(n) ? 'distance_time' : 'duration';
  }
  if (/plank|hold|hang|wall sit|isometric/.test(n)) return 'duration';
  if (/carry|farmer|walk/.test(n)) return 'weight_time';
  const eq = EQUIP[rec.equipment];
  if (eq === 'bodyweight' && rec.equipment === 'body weight') return 'weighted_bw';
  return 'weight_reps';
}

function difficultyFor(rec) {
  const n = rec.name.toLowerCase();
  if (/(muscle.?up|snatch|clean and jerk|pistol|planche|front lever|nordic|dragon)/.test(n)) return 'advanced';
  if (/(olympic|power clean|jerk|deficit|pause|single.?leg|bulgarian)/.test(n)) return 'advanced';
  const eq = EQUIP[rec.equipment];
  if (['machine', 'smith', 'cable', 'band'].includes(eq)) return 'beginner';
  if (rec.equipment === 'body weight' && !/one arm|single|pistol/.test(n)) return 'beginner';
  if (['barbell', 'trap-bar', 'ez-bar'].includes(eq)) return 'intermediate';
  return 'intermediate';
}

const MOVEMENT = [
  [/squat|leg press|hack/i, 'squat'],
  [/deadlift|romanian|good morning|swing|hinge|hyperextension|back extension/i, 'hinge'],
  [/lunge|split squat|step.?up/i, 'lunge'],
  [/carry|farmer|suitcase/i, 'carry'],
  [/twist|chop|rotation|russian/i, 'rotation'],
  [/plank|dead bug|bird dog|hold/i, 'core'],
  [/run|walk|bike|cycl|row machine|elliptical|stair|jump|sprint/i, 'gait'],
  [/row|pull|chin|curl|shrug|face pull|pulldown/i, 'pull'],
  [/press|push|dip|extension|raise|fly/i, 'push'],
];
function movementFor(rec, mech) {
  for (const [re, m] of MOVEMENT) if (re.test(rec.name)) return m;
  return mech === 'isolation' ? 'isolation' : 'push';
}

const title = (s) => s.replace(/\s+/g, ' ').trim()
  .replace(/\b[a-z]/g, (c) => c.toUpperCase())
  .replace(/\bV[- ]?Bar\b/i, 'V-Bar').replace(/\bEz\b/g, 'EZ');
const norm = (s) => String(s).toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();

/* ---------- convert ---------- */
/* Records whose name matches a curated exercise are not added again — their
   media reference is attached to the curated entry instead, so all 1,324
   dataset records contribute without creating duplicate library entries. */
const curatedByName = new Map(EXERCISES.map((e) => [norm(e.name), e.id]));
const existing = new Set(curatedByName.keys());
const curatedMedia = {};
const usedIds = new Set(EXERCISES.map((e) => e.id));
const out = [];
let skipped = 0;

for (const rec of raw) {
  if (existing.has(norm(rec.name))) {
    curatedMedia[curatedByName.get(norm(rec.name))] = { id: rec.media_id, image: rec.image, gif: rec.gif_url };
    skipped++;
    continue;
  }

  const primary = mapMuscle(rec.target, rec.name) || mapMuscle(rec.muscle_group, rec.name) || 'full-body';
  const secondary = [...new Set(
    [rec.muscle_group, ...(rec.secondary_muscles || [])]
      .map((m) => mapMuscle(m, rec.name))
      .filter((m) => m && m !== primary),
  )].slice(0, 5);

  const mech = ISOLATION.test(rec.name) ? 'isolation' : 'compound';
  const steps = (rec.instruction_steps?.en || []).filter((s) => s && s.trim());
  const equipment = EQUIP[rec.equipment] ? [EQUIP[rec.equipment]] : ['none'];

  let id = `ds-${norm(rec.name).replace(/ /g, '-')}`;
  if (usedIds.has(id)) id = `${id}-${rec.id}`;
  usedIds.add(id);

  out.push({
    id,
    name: title(rec.name),
    primaryMuscles: [primary],
    secondaryMuscles: secondary,
    categories: categoriesFor(rec, primary),
    equipment,
    difficulty: difficultyFor(rec),
    mechanic: mech,
    movement: movementFor(rec, mech),
    force: /pull|row|curl|chin|shrug/i.test(rec.name) ? 'pull' : 'push',
    tracking: trackingFor(rec, primary),
    description: (rec.instructions?.en || '').split(/(?<=\.)\s+/).slice(0, 2).join(' ').trim(),
    instructions: steps,
    mistakes: [],
    tips: [],
    cues: [],
    alternatives: [],
    variations: [],
    similarExercises: [],
    tags: [rec.body_part, rec.equipment].filter(Boolean).map(norm).map((t) => t.replace(/ /g, '-')),
    pose: poseFor(rec, primary),
    unilateral: /single|one arm|one leg|alternat/i.test(rec.name),
    custom: false,
    source: 'exercises-dataset',
    /* Media references only — the files themselves are © Gym visual and are
       not redistributed. See js/lib/media.js. */
    media: { id: rec.media_id, image: rec.image, gif: rec.gif_url },
  });
}

writeFileSync(OUT, JSON.stringify(out));
writeFileSync(OUT_MEDIA, JSON.stringify(curatedMedia));
const bytes = readFileSync(OUT).length;
console.log(`imported ${out.length} exercises as new entries`);
console.log(`matched ${skipped} onto curated exercises (media attached, no duplicate created)`);
console.log(`total dataset records represented: ${out.length + skipped} of ${raw.length}`);
console.log(`wrote ${OUT} — ${(bytes / 1048576).toFixed(2)} MB`);

/* sanity summary */
const count = (f) => { const m = {}; for (const e of out) { const k = f(e); m[k] = (m[k] || 0) + 1; } return m; };
console.log('by difficulty:', JSON.stringify(count((e) => e.difficulty)));
console.log('poses used:', new Set(out.map((e) => e.pose)).size);
console.log('no primary muscle:', out.filter((e) => !e.primaryMuscles[0]).length);
console.log('no instructions:', out.filter((e) => !e.instructions.length).length);
