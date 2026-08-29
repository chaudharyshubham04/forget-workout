/* ============================================================
   Procedural animated exercise demonstrations.

   Each exercise declares a `pose`. A pose is a keyframed stick-figure
   skeleton plus props (barbell plates, benches, cables, machines).
   Frames are interpolated by SMIL, so the animation runs with zero
   JavaScript after render and works fully offline.
   ============================================================ */
import { h } from './dom.js';

const W = 200, H = 150, FLOOR = 138;

/* Side view: the camera is to the lifter's left; they face right.
   Points: hd head, nk neck, md mid-torso, sh shoulder, el/hn front arm,
   el2/hn2 rear arm, hp hip, kn/ft/tp front leg, kn2/ft2/tp2 rear leg.

   Each segment is drawn as a tapered polygon rather than a stroke, which
   gives the figure real limb volume. `part` is the anatomical region, used to
   highlight whichever muscles the exercise actually trains.
   [ from, to, part, widthAtFrom, widthAtTo, isRearLimb ]                     */
const SIDE_SEGS = [
  ['hp', 'kn2', 'thigh', 12.5, 9.5, 1], ['kn2', 'ft2', 'shin', 9, 6, 1], ['ft2', 'tp2', 'foot', 6, 4.5, 1],
  ['sh', 'el2', 'upperArm', 8.5, 7, 1], ['el2', 'hn2', 'foreArm', 7, 5.5, 1],
  ['nk', 'hd', 'neck', 7.5, 7.5],
  ['nk', 'md', 'torsoUpper', 17, 18], ['md', 'hp', 'torsoLower', 18, 15],
  ['hp', 'kn', 'thigh', 12.5, 9.5], ['kn', 'ft', 'shin', 9, 6], ['ft', 'tp', 'foot', 6, 4.5],
  ['sh', 'el', 'upperArm', 8.5, 7], ['el', 'hn', 'foreArm', 7, 5.5],
];
const SIDE_JOINTS = [
  ['hp', 7, 'hip'], ['kn', 4.8, 'thigh'], ['ft', 3, 'shin'],
  ['sh', 4.6, 'shoulder'], ['el', 3.6, 'upperArm'], ['hn', 2.9, 'foreArm'],
];
const SIDE_JOINTS_BACK = [['kn2', 4.8], ['ft2', 3], ['el2', 3.6], ['hn2', 2.9]];

/* Front view: symmetric left/right chains. */
const FRONT_SEGS = [
  ['nk', 'hd', 'neck', 8, 8],
  ['nk', 'md', 'torsoUpper', 21, 22], ['md', 'hp', 'torsoLower', 22, 17],
  ['sL', 'eL', 'upperArm', 8, 6.5], ['eL', 'wL', 'foreArm', 6.5, 5],
  ['sR', 'eR', 'upperArm', 8, 6.5], ['eR', 'wR', 'foreArm', 6.5, 5],
  ['hp', 'kL', 'thigh', 11, 9], ['kL', 'fL', 'shin', 8, 5.5],
  ['hp', 'kR', 'thigh', 11, 9], ['kR', 'fR', 'shin', 8, 5.5],
];
const FRONT_JOINTS = [
  ['sL', 4.2, 'shoulder'], ['sR', 4.2, 'shoulder'], ['eL', 3.4, 'upperArm'], ['eR', 3.4, 'upperArm'],
  ['hp', 8, 'hip'], ['kL', 4.6, 'thigh'], ['kR', 4.6, 'thigh'],
];

/** Which part of the figure each muscle group lives on. */
const MUSCLE_PART = {
  chest: 'torsoUpper', 'upper-chest': 'torsoUpper', 'lower-chest': 'torsoUpper',
  serratus: 'torsoUpper', lats: 'torsoUpper', traps: 'torsoUpper',
  rhomboids: 'torsoUpper', 'rotator-cuff': 'shoulder',
  abs: 'torsoLower', obliques: 'torsoLower', core: 'torsoLower',
  'lower-back': 'torsoLower', 'hip-flexors': 'torsoLower',
  'front-delts': 'shoulder', 'side-delts': 'shoulder', 'rear-delts': 'shoulder',
  biceps: 'upperArm', triceps: 'upperArm', forearms: 'foreArm',
  quads: 'thigh', hamstrings: 'thigh', adductors: 'thigh', abductors: 'thigh',
  glutes: 'hip', calves: 'shin',
};
export const partsForMuscles = (ids = []) =>
  new Set(ids.map((m) => MUSCLE_PART[m]).filter(Boolean));

/* Base skeletons. Every frame is merged onto these, so a pose only
   needs to specify the joints that actually move. */
const BASE_SIDE = {
  hd: [92, 26], nk: [92, 38], sh: [93, 45], hp: [95, 80],
  el: [91, 63], hn: [90, 81], kn: [97, 109], ft: [95, FLOOR], tp: [106, FLOOR],
};
const BASE_FRONT = {
  hd: [100, 26], nk: [100, 38], hp: [100, 82],
  sL: [86, 46], sR: [114, 46], eL: [82, 66], eR: [118, 66], wL: [80, 87], wR: [120, 87],
  kL: [93, 110], kR: [107, 110], fL: [92, FLOOR], fR: [108, FLOOR],
};

/* ---------- pose library ----------
   f: keyframes. Looping plays f[0] → f[1] → … → f[0].
   p: props. dur: seconds for a full cycle.                            */
const POSES = {

/* ---- horizontal presses ---- */
bench: { view: 'side', dur: 3.4, lie: true,
  p: [{ t: 'bench', x: 58, y: 96, w: 96 }, { t: 'plate', at: 'hn' }],
  base: { hd: [58, 88], nk: [70, 90], sh: [76, 90], hp: [116, 93], kn: [134, 112], ft: [140, FLOOR], tp: [150, FLOOR] },
  f: [{ el: [78, 71], hn: [80, 52] }, { el: [62, 85], hn: [80, 82] }] },

inclinebench: { view: 'side', dur: 3.4, lie: true,
  p: [{ t: 'bench', x: 62, y: 100, w: 84, incline: 26 }, { t: 'plate', at: 'hn' }],
  base: { hd: [62, 70], nk: [72, 76], sh: [78, 78], hp: [116, 97], kn: [132, 116], ft: [138, FLOOR], tp: [148, FLOOR] },
  f: [{ el: [82, 60], hn: [86, 42] }, { el: [66, 76], hn: [84, 70] }] },

declinebench: { view: 'side', dur: 3.4, lie: true,
  p: [{ t: 'bench', x: 56, y: 92, w: 92, incline: -18 }, { t: 'plate', at: 'hn' }],
  base: { hd: [58, 104], nk: [70, 101], sh: [76, 100], hp: [116, 86], kn: [132, 100], ft: [140, 118], tp: [150, 120] },
  f: [{ el: [78, 82], hn: [80, 62] }, { el: [62, 96], hn: [80, 92] }] },

fly: { view: 'side', dur: 3.6, lie: true,
  p: [{ t: 'bench', x: 58, y: 96, w: 96 }, { t: 'db', at: 'hn' }, { t: 'db', at: 'hn2' }],
  base: { hd: [58, 88], nk: [70, 90], sh: [76, 90], hp: [116, 93], kn: [134, 112], ft: [140, FLOOR], tp: [150, FLOOR] },
  f: [{ el: [78, 72], hn: [80, 54], el2: [74, 74], hn2: [76, 56] },
      { el: [64, 78], hn: [56, 66], el2: [92, 76], hn2: [102, 64] }] },

pushup: { view: 'side', dur: 3.2,
  p: [{ t: 'ground' }],
  base: { hd: [56, 92], nk: [68, 96], sh: [74, 98], hp: [116, 110], kn: [140, 120], ft: [162, 132], tp: [170, 136] },
  f: [{ el: [74, 116], hn: [74, FLOOR], sh: [74, 96], nk: [68, 94], hd: [56, 90], hp: [116, 108] },
      { el: [62, 122], hn: [74, FLOOR], sh: [74, 118], nk: [68, 116], hd: [56, 112], hp: [116, 122] }] },

dip: { view: 'side', dur: 3.4,
  p: [{ t: 'dipbars' }],
  base: { tp: [98, 128], tp2: [92, 130] },
  f: [{ hd: [86, 34], nk: [88, 46], sh: [90, 52], el: [92, 68], hn: [94, 84], hp: [96, 86], kn: [104, 106], ft: [96, 122], kn2: [100, 108], ft2: [92, 124] },
      { hd: [82, 52], nk: [85, 64], sh: [88, 70], el: [78, 80], hn: [94, 84], hp: [96, 102], kn: [106, 118], ft: [96, 132], kn2: [102, 120], ft2: [92, 134] }] },

/* ---- vertical pulls ---- */
pullup: { view: 'side', dur: 3.6,
  p: [{ t: 'bar', x1: 50, x2: 150, y: 20 }],
  base: { hn: [96, 22], el: [96, 40] },
  f: [{ hd: [88, 54], nk: [90, 64], sh: [93, 70], el: [96, 46], hp: [96, 100], kn: [100, 124], ft: [92, 140], kn2: [96, 126], ft2: [88, 142] },
      { hd: [86, 34], nk: [88, 44], sh: [92, 50], el: [90, 36], hp: [96, 82], kn: [104, 104], ft: [96, 122], kn2: [100, 106], ft2: [92, 124] }] },

pulldown: { view: 'side', dur: 3.4, seat: true,
  p: [{ t: 'cable', from: [104, 12], at: 'hn' }, { t: 'seat', x: 78, y: 104 }],
  base: { hd: [86, 34], nk: [88, 46], sh: [90, 52], hp: [92, 86], kn: [122, 92], ft: [128, 120], tp: [138, 122] },
  f: [{ el: [98, 36], hn: [104, 18] }, { el: [80, 62], hn: [98, 58] }] },

legraise: { view: 'side', dur: 3.6,
  p: [{ t: 'bar', x1: 50, x2: 150, y: 18 }],
  f: [{ hd: [92, 40], nk: [92, 50], sh: [93, 56], el: [94, 38], hn: [95, 20], hp: [94, 90], kn: [96, 112], ft: [94, 136], tp: [104, 136] },
      { hd: [92, 40], nk: [92, 50], sh: [93, 56], el: [94, 38], hn: [95, 20], hp: [94, 90], kn: [116, 76], ft: [136, 66], tp: [144, 72] }] },

/* ---- horizontal pulls ---- */
row: { view: 'side', dur: 3.4,
  p: [{ t: 'plate', at: 'hn' }],
  base: { kn: [98, 108], ft: [94, FLOOR], tp: [104, FLOOR], kn2: [92, 110], ft2: [88, FLOOR], tp2: [98, FLOOR] },
  f: [{ hd: [58, 62], nk: [68, 66], sh: [74, 68], hp: [96, 80], el: [76, 88], hn: [78, 108] },
      { hd: [58, 62], nk: [68, 66], sh: [74, 68], hp: [96, 80], el: [84, 74], hn: [80, 88] }] },

rowmachine: { view: 'side', dur: 3.2, seat: true,
  p: [{ t: 'cable', from: [172, 96], at: 'hn' }, { t: 'seat', x: 80, y: 108, w: 40 }],
  f: [{ hd: [78, 44], nk: [80, 54], sh: [82, 60], el: [104, 66], hn: [126, 72], hp: [86, 92], kn: [124, 84], ft: [148, 100], tp: [158, 102] },
      { hd: [66, 52], nk: [70, 60], sh: [74, 66], el: [96, 74], hn: [126, 78], hp: [84, 94], kn: [116, 96], ft: [148, 106], tp: [158, 108] }] },

facepull: { view: 'front', dur: 3.2,
  p: [{ t: 'cableF', from: [100, 12] }],
  f: [{ eL: [72, 62], wL: [58, 52], eR: [128, 62], wR: [142, 52] },
      { eL: [74, 44], wL: [88, 34], eR: [126, 44], wR: [112, 34] }] },

reardelt: { view: 'front', dur: 3.4,
  p: [{ t: 'dbF' }],
  base: { hd: [100, 44], nk: [100, 54], sL: [88, 60], sR: [112, 60], hp: [100, 84],
          kL: [93, 110], kR: [107, 110], fL: [92, FLOOR], fR: [108, FLOOR] },
  f: [{ eL: [86, 78], wL: [86, 96], eR: [114, 78], wR: [114, 96] },
      { eL: [70, 66], wL: [52, 62], eR: [130, 66], wR: [148, 62] }] },

shrug: { view: 'front', dur: 2.8,
  p: [{ t: 'barF', y: 92 }],
  f: [{ sL: [86, 48], sR: [114, 48], eL: [82, 68], eR: [118, 68], wL: [80, 92], wR: [120, 92], nk: [100, 40], hd: [100, 28] },
      { sL: [86, 38], sR: [114, 38], eL: [82, 60], eR: [118, 60], wL: [80, 84], wR: [120, 84], nk: [100, 34], hd: [100, 24] }] },

/* ---- hinges ---- */
deadlift: { view: 'side', dur: 3.8,
  p: [{ t: 'plate', at: 'hn', r: 15 }],
  base: { ft: [94, FLOOR], tp: [106, FLOOR], ft2: [88, FLOOR], tp2: [100, FLOOR] },
  f: [{ hd: [70, 60], nk: [78, 66], sh: [82, 70], el: [84, 88], hn: [86, 122], hp: [104, 92], kn: [98, 112], kn2: [94, 114] },
      { hd: [90, 26], nk: [90, 38], sh: [91, 45], el: [92, 62], hn: [92, 84], hp: [94, 80], kn: [96, 108], kn2: [92, 110] }] },

hinge: { view: 'side', dur: 3.6,
  p: [{ t: 'plate', at: 'hn' }],
  base: { ft: [94, FLOOR], tp: [106, FLOOR], ft2: [88, FLOOR], tp2: [100, FLOOR] },
  f: [{ hd: [90, 26], nk: [90, 38], sh: [91, 45], el: [92, 62], hn: [92, 82], hp: [94, 80], kn: [96, 108], kn2: [92, 110] },
      { hd: [58, 56], nk: [68, 60], sh: [74, 62], el: [76, 80], hn: [78, 100], hp: [102, 82], kn: [98, 110], kn2: [94, 112] }] },

backext: { view: 'side', dur: 3.4,
  p: [{ t: 'benchPad', x: 96, y: 92 }],
  base: { kn: [108, 112], ft: [104, FLOOR], tp: [114, FLOOR], hp: [98, 88] },
  f: [{ hd: [56, 74], nk: [66, 78], sh: [72, 80], el: [72, 66], hn: [66, 56] },
      { hd: [58, 108], nk: [68, 104], sh: [74, 100], el: [74, 86], hn: [68, 76] }] },

hipthrust: { view: 'side', dur: 3.2,
  p: [{ t: 'bench', x: 42, y: 96, w: 46 }, { t: 'plate', at: 'hn', r: 13 }],
  base: { hd: [50, 78], nk: [60, 82], sh: [66, 84], el: [76, 86], ft: [136, FLOOR], tp: [146, FLOOR] },
  f: [{ hp: [102, 112], kn: [126, 116], hn: [102, 104] },
      { hp: [102, 86], kn: [128, 100], hn: [102, 78] }] },

/* ---- squats & legs ---- */
squat: { view: 'side', dur: 3.6,
  p: [{ t: 'plate', at: 'sh', r: 15 }],
  base: { ft: [92, FLOOR], tp: [104, FLOOR], ft2: [86, FLOOR], tp2: [98, FLOOR], el: [84, 52], hn: [80, 44] },
  f: [{ hd: [90, 26], nk: [90, 38], sh: [92, 46], hp: [94, 80], kn: [96, 108], kn2: [90, 110] },
      { hd: [82, 50], nk: [83, 62], sh: [85, 68], hp: [96, 104], kn: [116, 110], kn2: [110, 112] }] },

legpress: { view: 'side', dur: 3.4, seat: true,
  p: [{ t: 'sled' }, { t: 'seat', x: 44, y: 116, w: 44 }],
  base: { hd: [44, 76], nk: [52, 82], sh: [56, 86], el: [52, 100], hn: [46, 112], hp: [80, 106] },
  f: [{ kn: [122, 86], ft: [156, 74], tp: [162, 84] },
      { kn: [102, 66], ft: [130, 82], tp: [140, 90] }] },

legextension: { view: 'side', dur: 3.2, seat: true,
  p: [{ t: 'seat', x: 60, y: 100, w: 44 }, { t: 'padRoll', at: 'ft' }],
  base: { hd: [66, 44], nk: [68, 56], sh: [70, 62], el: [62, 78], hn: [56, 92], hp: [76, 98], kn: [110, 100] },
  f: [{ ft: [116, 130], tp: [126, 132] }, { ft: [146, 94], tp: [156, 98] }] },

legcurl: { view: 'side', dur: 3.2,
  p: [{ t: 'bench', x: 46, y: 104, w: 84 }, { t: 'padRoll', at: 'ft' }],
  base: { hd: [46, 92], nk: [58, 96], sh: [64, 98], el: [58, 110], hn: [50, 116], hp: [110, 100], kn: [130, 100] },
  f: [{ ft: [140, 128], tp: [150, 130] }, { ft: [134, 66], tp: [144, 62] }] },

calfraise: { view: 'side', dur: 2.6,
  p: [{ t: 'plate', at: 'sh', r: 13 }, { t: 'step' }],
  base: { el: [84, 52], hn: [80, 44], tp: [106, 126], tp2: [100, 128] },
  f: [{ hd: [92, 34], nk: [92, 46], sh: [93, 53], hp: [95, 88], kn: [97, 112], ft: [95, 128], ft2: [89, 130], kn2: [91, 114] },
      { hd: [92, 20], nk: [92, 32], sh: [93, 39], hp: [95, 74], kn: [97, 100], ft: [95, 114], ft2: [89, 116], kn2: [91, 102] }] },

lunge: { view: 'side', dur: 3.6,
  p: [{ t: 'db', at: 'hn' }, { t: 'db', at: 'hn2' }],
  base: { el: [90, 62], hn: [88, 82], el2: [84, 62], hn2: [82, 82] },
  f: [{ hd: [88, 26], nk: [88, 38], sh: [89, 45], hp: [90, 80], kn: [116, 104], ft: [124, FLOOR], tp: [134, FLOOR], kn2: [70, 106], ft2: [64, FLOOR], tp2: [74, FLOOR] },
      { hd: [86, 44], nk: [86, 56], sh: [87, 63], hp: [88, 98], kn: [120, 106], ft: [124, FLOOR], tp: [134, FLOOR], kn2: [66, 116], ft2: [58, 132], tp2: [68, 136] }] },

jump: { view: 'side', dur: 2.4,
  p: [{ t: 'ground' }],
  f: [{ hd: [92, 46], nk: [92, 58], sh: [93, 64], el: [80, 74], hn: [70, 86], hp: [94, 96], kn: [116, 104], ft: [94, 132], tp: [104, 134], kn2: [110, 106], ft2: [88, 134], tp2: [98, 136] },
      { hd: [92, 12], nk: [92, 24], sh: [93, 30], el: [94, 14], hn: [96, 0], hp: [94, 60], kn: [100, 86], ft: [96, 110], tp: [106, 112], kn2: [94, 88], ft2: [90, 112], tp2: [100, 114] }] },

stairs: { view: 'side', dur: 2.8,
  p: [{ t: 'stairs' }],
  f: [{ hd: [80, 34], nk: [80, 46], sh: [81, 52], el: [72, 66], hn: [66, 78], hp: [82, 86], kn: [104, 92], ft: [116, 108], tp: [126, 110], kn2: [86, 112], ft2: [80, 132], tp2: [90, 134] },
      { hd: [80, 34], nk: [80, 46], sh: [81, 52], el: [90, 64], hn: [96, 76], hp: [82, 86], kn: [90, 110], ft: [84, 130], tp: [94, 132], kn2: [104, 94], ft2: [118, 110], tp2: [128, 112] }] },

/* ---- overhead ---- */
ohp: { view: 'side', dur: 3.2,
  p: [{ t: 'plate', at: 'hn' }],
  base: { hp: [94, 80], kn: [96, 108], ft: [94, FLOOR], tp: [104, FLOOR], kn2: [90, 110], ft2: [88, FLOOR], tp2: [98, FLOOR] },
  f: [{ hd: [92, 28], nk: [92, 40], sh: [93, 46], el: [86, 60], hn: [92, 44] },
      { hd: [92, 26], nk: [92, 38], sh: [93, 45], el: [94, 26], hn: [94, 6] }] },

overheadext: { view: 'side', dur: 3.2,
  p: [{ t: 'db', at: 'hn' }],
  base: { hd: [92, 28], nk: [92, 40], sh: [93, 46], hp: [94, 80], kn: [96, 108], ft: [94, FLOOR], tp: [104, FLOOR] },
  f: [{ el: [94, 22], hn: [96, 4] }, { el: [94, 22], hn: [74, 30] }] },

skullcrusher: { view: 'side', dur: 3.2, lie: true,
  p: [{ t: 'bench', x: 58, y: 96, w: 96 }, { t: 'plate', at: 'hn', r: 10 }],
  base: { hd: [58, 88], nk: [70, 90], sh: [76, 90], hp: [116, 93], kn: [134, 112], ft: [140, FLOOR], tp: [150, FLOOR], el: [76, 66] },
  f: [{ hn: [78, 48] }, { hn: [56, 74] }] },

/* ---- arms ---- */
curl: { view: 'side', dur: 3.0,
  p: [{ t: 'plate', at: 'hn', r: 11 }],
  base: { hd: [92, 26], nk: [92, 38], sh: [93, 45], hp: [95, 80], kn: [97, 108], ft: [95, FLOOR], tp: [106, FLOOR], el: [93, 64] },
  f: [{ hn: [94, 84] }, { hn: [76, 56] }] },

hammercurl: { view: 'side', dur: 3.0,
  p: [{ t: 'db', at: 'hn' }, { t: 'db', at: 'hn2' }],
  base: { hd: [92, 26], nk: [92, 38], sh: [93, 45], hp: [95, 80], kn: [97, 108], ft: [95, FLOOR], tp: [106, FLOOR], el: [93, 64], el2: [88, 64] },
  f: [{ hn: [94, 84], hn2: [89, 84] }, { hn: [78, 58], hn2: [73, 60] }] },

pushdown: { view: 'side', dur: 3.0,
  p: [{ t: 'cable', from: [96, 10], at: 'hn' }],
  base: { hd: [88, 30], nk: [88, 42], sh: [89, 48], hp: [92, 82], kn: [95, 109], ft: [93, FLOOR], tp: [104, FLOOR], el: [90, 66] },
  f: [{ hn: [96, 52] }, { hn: [92, 86] }] },

frontraise: { view: 'side', dur: 3.0,
  p: [{ t: 'db', at: 'hn' }],
  base: { hd: [92, 26], nk: [92, 38], sh: [93, 45], hp: [95, 80], kn: [97, 108], ft: [95, FLOOR], tp: [106, FLOOR] },
  f: [{ el: [93, 63], hn: [93, 82] }, { el: [110, 50], hn: [128, 44] }] },

lateralraise: { view: 'front', dur: 3.0,
  p: [{ t: 'dbF' }],
  f: [{ eL: [84, 66], wL: [82, 88], eR: [116, 66], wR: [118, 88] },
      { eL: [72, 50], wL: [52, 46], eR: [128, 50], wR: [148, 46] }] },

/* ---- core ---- */
crunch: { view: 'side', dur: 3.0,
  p: [{ t: 'ground' }],
  base: { hp: [112, 122], kn: [138, 104], ft: [156, 130], tp: [166, 132] },
  f: [{ hd: [66, 122], nk: [76, 122], sh: [82, 121], el: [72, 112], hn: [64, 114] },
      { hd: [74, 100], nk: [84, 104], sh: [90, 108], el: [80, 96], hn: [72, 96] }] },

situp: { view: 'side', dur: 3.4,
  p: [{ t: 'ground' }],
  base: { hp: [112, 124], kn: [138, 104], ft: [156, 130], tp: [166, 132] },
  f: [{ hd: [62, 124], nk: [74, 124], sh: [80, 123], el: [72, 114], hn: [66, 118] },
      { hd: [98, 74], nk: [100, 86], sh: [102, 92], el: [94, 92], hn: [90, 96] }] },

plank: { view: 'side', dur: 4.0,
  p: [{ t: 'ground' }],
  base: { hd: [50, 96], nk: [62, 100], sh: [68, 102], el: [68, 122], hn: [50, 130], hp: [112, 112], kn: [140, 122], ft: [166, 132], tp: [174, 136] },
  f: [{ hp: [112, 112] }, { hp: [112, 116] }] },

abwheel: { view: 'side', dur: 3.6,
  p: [{ t: 'wheel', at: 'hn' }, { t: 'ground' }],
  base: { kn: [116, 130], ft: [140, 134], tp: [148, 136] },
  f: [{ hd: [70, 88], nk: [80, 94], sh: [86, 96], el: [80, 110], hn: [70, 128], hp: [112, 110] },
      { hd: [44, 108], nk: [56, 110], sh: [62, 112], el: [50, 118], hn: [34, 128], hp: [110, 118] }] },

russiantwist: { view: 'front', dur: 3.2,
  base: { hd: [100, 46], nk: [100, 58], hp: [100, 96], sL: [88, 64], sR: [112, 64],
          kL: [82, 108], kR: [118, 108], fL: [72, 130], fR: [128, 130] },
  p: [{ t: 'ball' }],
  f: [{ eL: [78, 76], wL: [66, 82], eR: [104, 78], wR: [70, 84] },
      { eL: [96, 78], wL: [130, 84], eR: [122, 76], wR: [134, 82] }] },

woodchop: { view: 'front', dur: 3.2,
  p: [{ t: 'cableF', from: [26, 12] }],
  base: { hd: [100, 30], nk: [100, 42], hp: [100, 84], sL: [88, 50], sR: [112, 50],
          kL: [90, 110], kR: [112, 110], fL: [86, FLOOR], fR: [116, FLOOR] },
  f: [{ eL: [74, 34], wL: [56, 20], eR: [92, 34], wR: [62, 22] },
      { eL: [116, 74], wL: [138, 96], eR: [124, 66], wR: [142, 92] }] },

carry: { view: 'side', dur: 2.4,
  p: [{ t: 'db', at: 'hn' }, { t: 'db', at: 'hn2' }],
  base: { hd: [92, 26], nk: [92, 38], sh: [93, 45], hp: [95, 80], el: [93, 63], hn: [93, 84], el2: [88, 63], hn2: [88, 84] },
  f: [{ kn: [108, 106], ft: [118, 132], tp: [128, 134], kn2: [86, 110], ft2: [76, FLOOR], tp2: [86, FLOOR] },
      { kn: [86, 108], ft: [76, 132], tp: [86, 134], kn2: [106, 108], ft2: [116, FLOOR], tp2: [126, FLOOR] }] },

/* ---- locomotion ---- */
run: { view: 'side', dur: 1.1,
  p: [{ t: 'ground' }],
  base: { hd: [92, 24], nk: [92, 36], sh: [93, 44], hp: [94, 78] },
  f: [{ el: [78, 52], hn: [70, 62], el2: [106, 52], hn2: [116, 46], kn: [116, 92], ft: [128, 112], tp: [138, 110], kn2: [80, 100], ft2: [70, 122], tp2: [80, 126] },
      { el: [98, 56], hn: [104, 44], el2: [86, 54], hn2: [78, 64], kn: [92, 104], ft: [84, 128], tp: [94, 130], kn2: [104, 96], ft2: [116, 116], tp2: [126, 114] },
      { el: [106, 52], hn: [116, 46], el2: [78, 52], hn2: [70, 62], kn: [80, 100], ft: [70, 122], tp: [80, 126], kn2: [116, 92], ft2: [128, 112], tp2: [138, 110] },
      { el: [86, 54], hn: [78, 64], el2: [98, 56], hn2: [104, 44], kn: [104, 96], ft: [116, 116], tp: [126, 114], kn2: [92, 104], ft2: [84, 128], tp2: [94, 130] }] },

walk: { view: 'side', dur: 2.0,
  p: [{ t: 'ground' }],
  base: { hd: [92, 26], nk: [92, 38], sh: [93, 45], hp: [94, 80] },
  f: [{ el: [86, 60], hn: [80, 76], el2: [100, 60], hn2: [106, 74], kn: [106, 106], ft: [114, FLOOR], tp: [124, FLOOR], kn2: [84, 108], ft2: [76, FLOOR], tp2: [86, FLOOR] },
      { el: [96, 62], hn: [98, 78], el2: [90, 60], hn2: [86, 76], kn: [96, 108], ft: [94, FLOOR], tp: [104, FLOOR], kn2: [96, 108], ft2: [94, FLOOR], tp2: [104, FLOOR] },
      { el: [100, 60], hn: [106, 74], el2: [86, 60], hn2: [80, 76], kn: [84, 108], ft: [76, FLOOR], tp: [86, FLOOR], kn2: [106, 106], ft2: [114, FLOOR], tp2: [124, FLOOR] },
      { el: [90, 60], hn: [86, 76], el2: [96, 62], hn2: [98, 78], kn: [96, 108], ft: [94, FLOOR], tp: [104, FLOOR], kn2: [96, 108], ft2: [94, FLOOR], tp2: [104, FLOOR] }] },

cycle: { view: 'side', dur: 1.6,
  p: [{ t: 'bike' }],
  base: { hd: [66, 46], nk: [74, 52], sh: [78, 56], el: [96, 62], hn: [116, 66], hp: [86, 86] },
  f: [{ kn: [116, 92], ft: [124, 112], tp: [132, 116], kn2: [104, 106], ft2: [100, 126], tp2: [108, 130] },
      { kn: [120, 100], ft: [116, 124], tp: [124, 128], kn2: [106, 96], ft2: [110, 114], tp2: [118, 118] },
      { kn: [104, 106], ft: [100, 126], tp: [108, 130], kn2: [116, 92], ft2: [124, 112], tp2: [132, 116] },
      { kn: [106, 96], ft: [110, 114], tp: [118, 118], kn2: [120, 100], ft2: [116, 124], tp2: [124, 128] }] },

generic: { view: 'side', dur: 3.0,
  p: [{ t: 'db', at: 'hn' }],
  base: { hd: [92, 26], nk: [92, 38], sh: [93, 45], hp: [95, 80], kn: [97, 108], ft: [95, FLOOR], tp: [106, FLOOR], el: [93, 64] },
  f: [{ hn: [94, 84] }, { hn: [78, 58] }] },
};

/* Rear limbs default to the front ones, offset for depth. */
function resolveFrames(pose) {
  const base = { ...(pose.view === 'front' ? BASE_FRONT : BASE_SIDE), ...(pose.base || {}) };
  return pose.f.map((f) => {
    const pt = { ...base, ...f };
    if (pose.view !== 'front') {
      for (const [a, b] of [['el', 'el2'], ['hn', 'hn2'], ['kn', 'kn2'], ['ft', 'ft2'], ['tp', 'tp2']]) {
        if (!(b in { ...base, ...f })) pt[b] = [pt[a][0] - 5, pt[a][1]];
      }
      if (!pose.base?.tp2 && !f.tp2 && pt.ft2) pt.tp2 = [pt.ft2[0] + 11, pt.ft2[1]];
    }
    /* Mid-torso split point, so the chest/back and abdomen can be lit separately. */
    const nk = pt.nk || [100, 40], hp = pt.hp || [100, 80];
    pt.md = [nk[0] + (hp[0] - nk[0]) * 0.45, nk[1] + (hp[1] - nk[1]) * 0.45];
    return pt;
  });
}

/** Tapered quad from a (width w1) to b (width w2). */
function taper(a, b, w1, w2) {
  const dx = b[0] - a[0], dy = b[1] - a[1];
  const len = Math.hypot(dx, dy) || 1;
  const px = -dy / len, py = dx / len;
  const n = (v) => v.toFixed(2);
  return `M${n(a[0] + px * w1 / 2)} ${n(a[1] + py * w1 / 2)}` +
         `L${n(b[0] + px * w2 / 2)} ${n(b[1] + py * w2 / 2)}` +
         `L${n(b[0] - px * w2 / 2)} ${n(b[1] - py * w2 / 2)}` +
         `L${n(a[0] - px * w1 / 2)} ${n(a[1] - py * w1 / 2)}Z`;
}

const line = (a, b) => `M${a[0].toFixed(1)} ${a[1].toFixed(1)}L${b[0].toFixed(1)} ${b[1].toFixed(1)}`;
const loop = (arr) => (arr.length > 1 ? [...arr, arr[0]] : [arr[0], arr[0]]);

function animate(attr, values, dur, id) {
  const v = loop(values);
  return h('animate', {
    attributeName: attr, values: v.join(';'), dur: `${dur}s`, repeatCount: 'indefinite',
    calcMode: 'spline',
    keyTimes: v.map((_, i) => (i / (v.length - 1)).toFixed(4)).join(';'),
    keySplines: v.slice(1).map(() => '.42 0 .58 1').join(';'),
    id,
  });
}

/* ---------- props ---------- */
function prop(def, frames, C) {
  const at = (name) => frames.map((f) => f[name] || [100, 100]);
  switch (def.t) {
    case 'ground':
      return [h('path', { d: `M8 ${FLOOR + 2}H192`, stroke: C.floor, 'stroke-width': 2, 'stroke-linecap': 'round' })];
    case 'bench': {
      const { x, y, w, incline = 0 } = def;
      const dy = (w * Math.tan((incline * Math.PI) / 180)) / 2;
      return [
        h('path', { d: `M${x} ${y + dy}L${x + w} ${y - dy}`, stroke: C.gear, 'stroke-width': 7, 'stroke-linecap': 'round', opacity: .9 }),
        h('path', { d: `M${x + 10} ${y + dy}V${FLOOR}M${x + w - 10} ${y - dy}V${FLOOR}`, stroke: C.gear, 'stroke-width': 4, 'stroke-linecap': 'round' }),
        h('path', { d: `M8 ${FLOOR + 2}H192`, stroke: C.floor, 'stroke-width': 2, 'stroke-linecap': 'round' }),
      ];
    }
    case 'benchPad':
      return [h('path', { d: `M${def.x - 26} ${def.y}h52`, stroke: C.gear, 'stroke-width': 8, 'stroke-linecap': 'round' }),
        h('path', { d: `M${def.x} ${def.y}V${FLOOR}`, stroke: C.gear, 'stroke-width': 5 }),
        h('path', { d: `M8 ${FLOOR + 2}H192`, stroke: C.floor, 'stroke-width': 2, 'stroke-linecap': 'round' })];
    case 'seat': {
      const w = def.w || 34;
      return [h('path', { d: `M${def.x} ${def.y}h${w}`, stroke: C.gear, 'stroke-width': 7, 'stroke-linecap': 'round' }),
        h('path', { d: `M${def.x + 6} ${def.y}V${FLOOR}`, stroke: C.gear, 'stroke-width': 4 }),
        h('path', { d: `M8 ${FLOOR + 2}H192`, stroke: C.floor, 'stroke-width': 2, 'stroke-linecap': 'round' })];
    }
    case 'bar':
      return [h('path', { d: `M${def.x1} ${def.y}H${def.x2}`, stroke: C.gear, 'stroke-width': 5, 'stroke-linecap': 'round' }),
        h('path', { d: `M${def.x1 + 12} ${def.y}V4M${def.x2 - 12} ${def.y}V4`, stroke: C.gear, 'stroke-width': 3 })];
    case 'dipbars':
      return [h('path', { d: `M74 84h52M74 84v${FLOOR - 84}M126 84v${FLOOR - 84}`, stroke: C.gear, 'stroke-width': 5, 'stroke-linecap': 'round', fill: 'none' }),
        h('path', { d: `M8 ${FLOOR + 2}H192`, stroke: C.floor, 'stroke-width': 2, 'stroke-linecap': 'round' })];
    case 'plate': {
      const r = def.r || 12, pts = at(def.at);
      return [h('circle', { r, fill: C.gearFill, stroke: C.accent, 'stroke-width': 3 },
        animate('cx', pts.map((p) => p[0]), C.dur), animate('cy', pts.map((p) => p[1]), C.dur)),
        h('circle', { r: 3, fill: C.accent },
          animate('cx', pts.map((p) => p[0]), C.dur), animate('cy', pts.map((p) => p[1]), C.dur))];
    }
    case 'db': {
      const pts = at(def.at);
      return [h('rect', { width: 20, height: 9, rx: 3.5, fill: C.accent },
        animate('x', pts.map((p) => p[0] - 10), C.dur), animate('y', pts.map((p) => p[1] - 4.5), C.dur))];
    }
    case 'dbF':
      return ['wL', 'wR'].flatMap((n) => {
        const pts = at(n);
        return [h('rect', { width: 18, height: 8, rx: 3, fill: C.accent },
          animate('x', pts.map((p) => p[0] - 9), C.dur), animate('y', pts.map((p) => p[1] - 4), C.dur))];
      });
    case 'barF': {
      const l = at('wL'), r = at('wR');
      return [h('path', { stroke: C.accent, 'stroke-width': 4, 'stroke-linecap': 'round' },
        animate('d', l.map((p, i) => `M${p[0] - 16} ${p[1]}H${r[i][0] + 16}`), C.dur)),
        ...[[l, -20], [r, 20]].map(([pts, off]) => h('rect', { width: 7, height: 26, rx: 2.5, fill: C.accent },
          animate('x', pts.map((p) => p[0] + off - 3.5), C.dur), animate('y', pts.map((p) => p[1] - 13), C.dur)))];
    }
    case 'cable': {
      const pts = at(def.at);
      return [h('path', { d: `M${def.from[0] - 14} 8h28`, stroke: C.gear, 'stroke-width': 4, 'stroke-linecap': 'round' }),
        h('path', { stroke: C.accent, 'stroke-width': 2, 'stroke-dasharray': '5 3' },
          animate('d', pts.map((p) => `M${def.from[0]} ${def.from[1]}L${p[0]} ${p[1]}`), C.dur)),
        h('circle', { r: 4, fill: C.accent },
          animate('cx', pts.map((p) => p[0]), C.dur), animate('cy', pts.map((p) => p[1]), C.dur))];
    }
    case 'cableF': {
      const l = at('wL'), r = at('wR');
      return [h('path', { d: `M${def.from[0] - 14} 8h28`, stroke: C.gear, 'stroke-width': 4, 'stroke-linecap': 'round' }),
        h('path', { stroke: C.accent, 'stroke-width': 2, 'stroke-dasharray': '5 3' },
          animate('d', l.map((p, i) => `M${def.from[0]} ${def.from[1]}L${p[0]} ${p[1]}M${def.from[0]} ${def.from[1]}L${r[i][0]} ${r[i][1]}`), C.dur))];
    }
    case 'padRoll': {
      const pts = at(def.at);
      return [h('rect', { width: 10, height: 22, rx: 5, fill: C.gearFill, stroke: C.accent, 'stroke-width': 2.5 },
        animate('x', pts.map((p) => p[0] - 5), C.dur), animate('y', pts.map((p) => p[1] - 11), C.dur))];
    }
    case 'wheel': {
      const pts = at(def.at);
      return [h('circle', { r: 9, fill: C.gearFill, stroke: C.accent, 'stroke-width': 3 },
        animate('cx', pts.map((p) => p[0]), C.dur), animate('cy', pts.map((p) => FLOOR - 9), C.dur))];
    }
    case 'sled':
      return [h('path', { d: 'M150 44L182 60M150 44v56l32 16V60', stroke: C.gear, 'stroke-width': 4, fill: 'none', 'stroke-linejoin': 'round' }),
        h('path', { d: `M8 ${FLOOR + 2}H192`, stroke: C.floor, 'stroke-width': 2, 'stroke-linecap': 'round' })];
    case 'step':
      return [h('path', { d: `M60 128h80v10H60z`, fill: C.gearFill, stroke: C.gear, 'stroke-width': 2 }),
        h('path', { d: `M8 ${FLOOR + 2}H192`, stroke: C.floor, 'stroke-width': 2, 'stroke-linecap': 'round' })];
    case 'stairs':
      return [h('path', { d: 'M60 138h34v-14h34v-14h34v-14h20', stroke: C.gear, 'stroke-width': 3.5, fill: 'none', 'stroke-linejoin': 'round', 'stroke-linecap': 'round' })];
    case 'bike':
      return [h('circle', { cx: 62, cy: 118, r: 18, fill: 'none', stroke: C.gear, 'stroke-width': 3 }),
        h('circle', { cx: 148, cy: 118, r: 18, fill: 'none', stroke: C.gear, 'stroke-width': 3 }),
        h('path', { d: 'M62 118L96 92h34l18 26M96 92V70h26', stroke: C.gear, 'stroke-width': 3, fill: 'none', 'stroke-linejoin': 'round' }),
        h('circle', { cx: 113, cy: 118, r: 7, fill: 'none', stroke: C.accent, 'stroke-width': 3 }),
        h('path', { d: `M8 ${FLOOR + 2}H192`, stroke: C.floor, 'stroke-width': 2, 'stroke-linecap': 'round' })];
    case 'ball': {
      const l = at('wL'), r = at('wR');
      return [h('circle', { r: 8, fill: C.accent },
        animate('cx', l.map((p, i) => (p[0] + r[i][0]) / 2), C.dur),
        animate('cy', l.map((p, i) => (p[1] + r[i][1]) / 2), C.dur))];
    }
    default: return [];
  }
}

/**
 * Build an animated demonstration for a pose id.
 * @param {string} poseId  key into POSES
 * @param {{paused?:boolean, speed?:number, highlight?:string[]}} [opts]
 *        highlight — muscle ids to light up on the figure.
 */
export function demoSVG(poseId, opts = {}) {
  const pose = POSES[poseId] || POSES.generic;
  const frames = resolveFrames(pose);
  const dur = (pose.dur || 3) / (opts.speed || 1);
  const front = pose.view === 'front';
  const segs = front ? FRONT_SEGS : SIDE_SEGS;
  const joints = front ? FRONT_JOINTS : SIDE_JOINTS;
  const lit = partsForMuscles(opts.highlight || []);
  const C = {
    dur, accent: 'var(--accent)', body: 'var(--ink)', back: 'var(--ink-3)',
    gear: 'var(--ink-3)', gearFill: 'var(--surface)', floor: 'var(--line-strong)',
  };

  const fillFor = (part, isBack) =>
    isBack ? C.body : (lit.has(part) ? C.accent : C.body);
  const opacityFor = (part, isBack) =>
    isBack ? 0.32 : (lit.has(part) ? 1 : 0.86);
  /* Limbs get a background-coloured outline so an arm crossing the torso stays
     readable. The two torso halves are left unstroked to avoid a visible seam. */
  const STROKED = new Set(['upperArm', 'foreArm', 'thigh', 'shin', 'foot', 'limb']);
  const outline = (part) => (STROKED.has(part)
    ? { stroke: 'var(--surface-2)', 'stroke-width': 1.1, 'stroke-linejoin': 'round' } : {});

  const limb = (from, to, part, w1, w2, isBack) =>
    h('path', {
      fill: fillFor(part, isBack), opacity: opacityFor(part, isBack), ...outline(part),
    }, animate('d', frames.map((f) => taper(f[from], f[to], w1, w2)), dur));

  const joint = (name, r, part, isBack) =>
    h('circle', { r, fill: fillFor(part, isBack), opacity: opacityFor(part, isBack), ...outline(part) },
      animate('cx', frames.map((f) => f[name][0]), dur),
      animate('cy', frames.map((f) => f[name][1]), dur));

  const bodyG = h('g', null,
    ...segs.filter(([a, b]) => frames.every((f) => f[a] && f[b]))
      .map(([a, b, part, w1, w2, isBack]) => limb(a, b, part, w1, w2, isBack)),
    ...(front ? [] : SIDE_JOINTS_BACK)
      .filter(([n]) => frames.every((f) => f[n]))
      .map(([n, r]) => joint(n, r, 'limb', true)),
    ...joints.filter(([n]) => frames.every((f) => f[n]))
      .map(([n, r, part]) => joint(n, r, part, false)),
    h('circle', { r: 9, fill: C.body, opacity: 0.86 },
      animate('cx', frames.map((f) => f.hd[0]), dur),
      animate('cy', frames.map((f) => f.hd[1]), dur)),
  );

  const svg = h('svg', {
    viewBox: `0 0 ${W} ${H}`, role: 'img',
    'aria-label': `Animated demonstration of the ${poseId} movement pattern`,
    preserveAspectRatio: 'xMidYMid meet',
  },
    ...(pose.p || []).flatMap((d) => prop(d, frames, C)),
    bodyG,
  );
  if (opts.paused) requestAnimationFrame(() => { try { svg.pauseAnimations(); } catch {} });
  return svg;
}

/** Static thumbnail: the start frame plus its equipment, no animation.
    Used in lists and grids where dozens render at once. */
export function poseThumb(poseId, highlight = []) {
  const pose = POSES[poseId] || POSES.generic;
  const frames = resolveFrames(pose);
  const f = frames[0];
  const front = pose.view === 'front';
  const segs = front ? FRONT_SEGS : SIDE_SEGS;
  const joints = front ? FRONT_JOINTS : SIDE_JOINTS;
  const lit = partsForMuscles(highlight);
  const at = (n) => f[n] || [100, 100];

  const fill = (part, isBack) => (isBack ? 'var(--ink-2)' : lit.has(part) ? 'var(--accent)' : 'var(--ink-2)');
  const op = (part, isBack) => (isBack ? 0.3 : lit.has(part) ? 1 : 0.85);

  /* Equipment, drawn statically so the thumbnail reads as the real movement. */
  const gear = [];
  for (const d of pose.p || []) {
    if (d.t === 'plate') gear.push(
      h('circle', { cx: at(d.at)[0], cy: at(d.at)[1], r: d.r || 12, fill: 'none',
        stroke: 'var(--accent)', 'stroke-width': 4 }));
    else if (d.t === 'db') gear.push(
      h('rect', { x: at(d.at)[0] - 10, y: at(d.at)[1] - 4.5, width: 20, height: 9, rx: 3.5, fill: 'var(--accent)' }));
    else if (d.t === 'dbF') gear.push(
      ...['wL', 'wR'].map((n) => h('rect', { x: at(n)[0] - 9, y: at(n)[1] - 4, width: 18, height: 8, rx: 3, fill: 'var(--accent)' })));
    else if (d.t === 'barF') gear.push(
      h('path', { d: `M${at('wL')[0] - 16} ${at('wL')[1]}H${at('wR')[0] + 16}`, stroke: 'var(--accent)', 'stroke-width': 5, 'stroke-linecap': 'round' }));
    else if (d.t === 'cable' || d.t === 'wheel') gear.push(
      h('circle', { cx: at(d.at || 'hn')[0], cy: at(d.at || 'hn')[1], r: 6, fill: 'var(--accent)' }));
    else if (d.t === 'bench' || d.t === 'benchPad' || d.t === 'seat') gear.push(
      h('path', { d: `M${(d.x ?? 60)} ${d.y}h${d.w || 40}`, stroke: 'var(--ink-3)', 'stroke-width': 6,
        'stroke-linecap': 'round', opacity: .45 }));
    else if (d.t === 'bar') gear.push(
      h('path', { d: `M${d.x1} ${d.y}H${d.x2}`, stroke: 'var(--ink-3)', 'stroke-width': 5, 'stroke-linecap': 'round', opacity: .6 }));
  }

  return h('svg', { viewBox: '4 0 192 150', 'aria-hidden': 'true', preserveAspectRatio: 'xMidYMid meet' },
    ...gear,
    ...segs.filter(([a, b]) => f[a] && f[b]).map(([a, b, part, w1, w2, isBack]) =>
      h('path', { d: taper(f[a], f[b], w1, w2), fill: fill(part, isBack), opacity: op(part, isBack) })),
    ...(front ? [] : SIDE_JOINTS_BACK).filter(([n]) => f[n])
      .map(([n, r]) => h('circle', { cx: f[n][0], cy: f[n][1], r, fill: 'var(--ink-2)', opacity: .3 })),
    ...joints.filter(([n]) => f[n]).map(([n, r, part]) =>
      h('circle', { cx: f[n][0], cy: f[n][1], r, fill: fill(part, false), opacity: op(part, false) })),
    h('circle', { cx: f.hd[0], cy: f.hd[1], r: 9, fill: 'var(--ink-2)', opacity: .85 }));
}

export const hasPose = (id) => !!POSES[id];
export const poseIds = () => Object.keys(POSES);
