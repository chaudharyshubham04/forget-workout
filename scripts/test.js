/* Smoke tests: render every view against a seeded state using a DOM shim,
   and verify the analytics / progression engines against known inputs. */
import { installDOM } from './dom-stub.js';
installDOM();

let pass = 0, fail = 0;
const results = [];
function t(name, fn) {
  try { fn(); pass++; results.push(`  ok   ${name}`); }
  catch (e) { fail++; results.push(`  FAIL ${name}\n       ${e.message}`); }
}
const eq = (a, b, m) => { if (a !== b) throw new Error(`${m || ''} expected ${b}, got ${a}`); };
const ok = (v, m) => { if (!v) throw new Error(m || 'expected truthy'); };
const near = (a, b, tol, m) => { if (Math.abs(a - b) > tol) throw new Error(`${m || ''} ${a} not within ${tol} of ${b}`); };

const S = await import('../js/store.js');
const stats = await import('../js/lib/stats.js');
const prog = await import('../js/lib/progression.js');
const utils = await import('../js/lib/utils.js');
const { EXERCISES } = await import('../js/data/exercises.js');
const { SPLITS } = await import('../js/data/splits.js');
const { poseIds, demoSVG } = await import('../js/lib/motion.js');
const { bodyMapPair } = await import('../js/lib/anatomy.js');
const charts = await import('../js/lib/charts.js');

/* ---------------- data integrity ---------------- */
console.log('\nData integrity');
t('98 predefined exercises with unique ids', () => {
  eq(EXERCISES.length, 98);
  eq(new Set(EXERCISES.map((e) => e.id)).size, 98);
});
t('every exercise has a defined animation pose', () => {
  const have = new Set(poseIds());
  const missing = EXERCISES.filter((e) => !have.has(e.pose));
  eq(missing.length, 0, missing.map((e) => e.id).join());
});
t('every exercise has primary muscles, instructions and equipment', () => {
  const bad = EXERCISES.filter((e) => !e.primary.length || !e.steps.length || !e.equip.length);
  eq(bad.length, 0, bad.map((e) => e.id).join());
});
t('every animation renders', () => {
  for (const p of poseIds()) ok(demoSVG(p), p);
});
t('splits reference only real exercises and are 7 days long', () => {
  const ids = new Set(EXERCISES.map((e) => e.id));
  for (const s of SPLITS) {
    eq(s.days.length, 7, s.id);
    eq(s.days.filter((d) => !d.rest).length, s.daysPerWeek, s.id);
    for (const d of s.days) for (const x of d.exercises || []) ok(ids.has(x.exerciseId), `${s.id}:${x.exerciseId}`);
  }
});

/* ---------------- element factory ---------------- */
console.log('\nElement factory');
{
  const { h } = await import('../js/lib/dom.js');
  t('h() keeps children passed in the props position', () => {
    const el = h('div', h('span', 'a'), h('span', 'b'));
    eq(el.childNodes.length, 2);
    eq(el.textContent, 'ab');
  });
  t('h() still reads a plain object as props', () => {
    const el = h('div', { id: 'x', class: 'y' }, 'text');
    eq(el.id, 'x');
    eq(el.textContent, 'text');
  });
  t('h() skips null and false children', () => {
    const el = h('div', 'a', null, false, undefined, 'b');
    eq(el.textContent, 'ab');
  });
  t('h() parses .class#id shorthand', () => {
    const el = h('p.one.two#three');
    eq(el.id, 'three');
    ok(el.className.includes('one') && el.className.includes('two'));
  });
}

const { icon: iconFn } = await import('../js/lib/dom.js');
t('every icon has an intrinsic size and the .ic class', () => {
  const el = iconFn('check');
  eq(el.getAttribute('width'), '20');
  eq(el.getAttribute('height'), '20');
  ok(el.className.includes('ic'));
  eq(iconFn('check', 14).getAttribute('width'), '14');
});

/* ---------------- imported library ---------------- */
console.log('\nImported library (exercises-dataset)');
{
  const { readFileSync, existsSync } = await import('node:fs');
  const path = 'js/data/exercises-extended.json';
  t('the imported library ships and parses', () => {
    ok(existsSync(path), 'exercises-extended.json is present');
    const list = JSON.parse(readFileSync(path, 'utf8'));
    ok(Array.isArray(list) && list.length > 1000, `expected 1000+ entries, got ${list.length}`);
  });
  const ext = JSON.parse(readFileSync(path, 'utf8'));
  const tax = await import('../js/data/taxonomy.js');
  const M = new Set(tax.MUSCLES.map((m) => m.id));
  const E = new Set(tax.EQUIPMENT.map((e) => e.id));
  const Ca = new Set(tax.CATEGORIES.map((c) => c.id));
  const pose = await import('../js/lib/motion.js');
  const P = new Set(pose.poseIds());
  t('every imported exercise maps onto the app taxonomy', () => {
    for (const e of ext) {
      for (const m of [...e.primaryMuscles, ...e.secondaryMuscles]) ok(M.has(m), `${e.id}: muscle ${m}`);
      for (const q of e.equipment) ok(E.has(q), `${e.id}: equipment ${q}`);
      for (const c of e.categories) ok(Ca.has(c), `${e.id}: category ${c}`);
      ok(P.has(e.pose), `${e.id}: pose ${e.pose}`);
    }
  });
  t('every imported exercise has a name, a primary muscle and instructions', () => {
    const bad = ext.filter((e) => !e.name || !e.primaryMuscles.length || !e.instructions.length);
    eq(bad.length, 0, bad.slice(0, 3).map((e) => e.id).join());
  });
  t('imported ids never collide with the curated library', () => {
    const curated = new Set(EXERCISES.map((e) => e.id));
    const clash = ext.filter((e) => curated.has(e.id));
    eq(clash.length, 0, clash.map((e) => e.id).join());
    eq(new Set(ext.map((e) => e.id)).size, ext.length, 'imported ids are unique');
  });
  /* The media is git-ignored (it is licensed separately), so CI checkouts do not
     have it. Verify whichever situation we are in — never assume it is present. */
  const mediaInstalled = existsSync('media/images') && existsSync('media/videos');
  t(mediaInstalled
    ? 'installed media resolves for every reference'
    : 'the app is complete without the separately-licensed media', () => {
    if (mediaInstalled) {
      /* Sample rather than stat 2,648 files on every run. */
      const sample = ext.filter((_, i) => i % 97 === 0);
      for (const e of sample) {
        ok(existsSync(`media/${e.media.image}`), `missing image for ${e.id}`);
        ok(existsSync(`media/${e.media.gif}`), `missing gif for ${e.id}`);
      }
    } else {
      const { poseIds } = pose;
      const poses = new Set(poseIds());
      ok(ext.every((e) => poses.has(e.pose)),
        'every exercise still has an SVG animation to fall back on');
      ok(ext.every((e) => e.instructions.length),
        'every exercise still has instructions');
    }
  });
  t('the media licence and attribution ship alongside it', () => {
    ok(existsSync('media/README.md'), 'media/README.md documents the licence');
    const notice = readFileSync('media/README.md', 'utf8');
    ok(/Gym visual/.test(notice), 'attribution names the rights holder');
    ok(/does not grant you any license/i.test(notice), 'the media exception is quoted');
    ok(existsSync('ATTRIBUTION.md'));
  });
  t('all 1,324 dataset records are represented', () => {
    const curatedMedia = JSON.parse(readFileSync('js/data/curated-media.json', 'utf8'));
    eq(ext.length + Object.keys(curatedMedia).length, 1324);
  });
}

/* ---------------- public-domain library ---------------- */
console.log('\nPublic-domain library (free-exercise-db)');
{
  const { readFileSync, existsSync } = await import('node:fs');
  const open = JSON.parse(readFileSync('js/data/exercises-open.json', 'utf8'));
  const attach = JSON.parse(readFileSync('js/data/open-media.json', 'utf8'));
  const tax2 = await import('../js/data/taxonomy.js');
  const M2 = new Set(tax2.MUSCLES.map((m) => m.id));
  const E2 = new Set(tax2.EQUIPMENT.map((e) => e.id));
  const C2 = new Set(tax2.CATEGORIES.map((c) => c.id));
  const pose2 = await import('../js/lib/motion.js');
  const P2 = new Set(pose2.poseIds());

  t('the public-domain set imports and maps onto the taxonomy', () => {
    ok(open.length > 600, `expected 600+, got ${open.length}`);
    for (const e of open) {
      for (const m of [...e.primaryMuscles, ...e.secondaryMuscles]) ok(M2.has(m), `${e.id}: muscle ${m}`);
      for (const q of e.equipment) ok(E2.has(q), `${e.id}: equipment ${q}`);
      for (const c of e.categories) ok(C2.has(c), `${e.id}: category ${c}`);
      ok(P2.has(e.pose), `${e.id}: pose ${e.pose}`);
    }
  });
  t('every public-domain entry carries photos and instructions', () => {
    const bad = open.filter((e) => !e.media?.open || !e.media.images?.length || !e.instructions.length);
    eq(bad.length, 0, bad.slice(0, 3).map((e) => e.id).join());
  });
  t('public-domain photos are installed and resolve', () => {
    if (!existsSync('media/open')) { ok(true, 'not installed in this checkout'); return; }
    const sample = open.filter((_, i) => i % 61 === 0);
    for (const e of sample) {
      for (const img of e.media.images) ok(existsSync(`media/${img}`), `missing ${img} for ${e.id}`);
    }
  });
  t('photos attached to existing exercises point at real files', () => {
    if (!existsSync('media/open')) { ok(true, 'not installed in this checkout'); return; }
    for (const [, m] of Object.entries(attach)) ok(existsSync(`media/${m.image}`), `missing ${m.image}`);
  });
  t('ids never collide across the three sources', () => {
    const imported = JSON.parse(readFileSync('js/data/exercises-extended.json', 'utf8'));
    const all = [...EXERCISES.map((e) => e.id), ...imported.map((e) => e.id), ...open.map((e) => e.id)];
    eq(new Set(all).size, all.length, 'all exercise ids are unique');
  });
}

/* ---------------- store ---------------- */
console.log('\nStore');
S.load();
t('starts un-onboarded with the curated library visible', () => {
  eq(S.get().onboarded, false);
  eq(S.exercises().length, 98);
});
const extLoaded = await S.loadExtendedLibrary();
t('both imported libraries merge into the visible library', () => {
  ok(extLoaded.length > 1900, `loaded ${extLoaded.length}`);
  eq(S.exercises().length, 98 + extLoaded.length);
  ok(S.exerciseById(extLoaded[0].id), 'an imported exercise resolves by id');
  ok(S.openCount() > 600, `public-domain entries loaded: ${S.openCount()}`);
});
t('custom exercises add to the library', () => {
  const before = S.exercises().length;
  const ex = S.createExercise({ name: 'Zercher Squat', primaryMuscles: ['quads'] });
  eq(S.exercises().length, before + 1);
  eq(S.exerciseById(ex.id).name, 'Zercher Squat');
});
t('overriding a predefined exercise leaves system data intact', () => {
  S.updateExercise('barbell-bench-press', { name: 'Bench (mine)' });
  eq(S.exerciseById('barbell-bench-press').name, 'Bench (mine)');
  eq(EXERCISES.find((e) => e.id === 'barbell-bench-press').name, 'Barbell Bench Press');
  S.resetExercise('barbell-bench-press');
  eq(S.exerciseById('barbell-bench-press').name, 'Barbell Bench Press');
});
t('hiding a predefined exercise removes it, restoring brings it back', () => {
  S.deleteExercise('burpee');
  ok(!S.exerciseById('burpee'));
  S.restoreExercise('burpee');
  ok(S.exerciseById('burpee'));
});
t('deleting a category detaches it from exercises', () => {
  const c = S.createCategory({ name: 'Temp' });
  const ex = S.createExercise({ name: 'Temp ex', categories: [c.id] });
  S.deleteCategory(c.id);
  eq(S.exerciseById(ex.id).categories.length, 0);
});
t('activating a split generates one template per training day', () => {
  S.activateSplit('split-upper-lower-4');
  const plan = S.get().activePlan;
  eq(plan.splitId, 'split-upper-lower-4');
  eq(plan.templateIds.filter(Boolean).length, 4);
  eq(S.templates().filter((x) => x.splitId === 'split-upper-lower-4').length, 4);
});
/* The plan is pinned to weekdays: the same weekday always runs the same
   session, and the first split day lands on the user's week-start day. */
const mondayKey = (offsetWeeks = 0) => {
  const d = new Date();
  d.setDate(d.getDate() + ((1 - d.getDay() + 7) % 7) + offsetWeeks * 7);
  return utils.dayKey(d);
};
t('the split starts on the week-start day', () => {
  eq(S.settings().weekStart, 1, 'weeks start on Monday by default');
  eq(S.planDayFor(mondayKey()).index, 0);
});
t('a weekday always maps to the same session', () => {
  eq(S.planDayFor(mondayKey()).index, S.planDayFor(mondayKey(1)).index);
  const wed = utils.dayKey(utils.addDays(utils.parseDay(mondayKey()), 2));
  eq(S.planDayFor(wed).index, 2);
});
t('any weekday can be reassigned to another session', () => {
  const sched = S.planSchedule().slice();
  sched[1] = 3;                                   // Monday now runs day 4
  S.setPlanSchedule(sched);
  eq(S.planDayFor(mondayKey()).index, 3);
  S.resetPlanSchedule();
  eq(S.planDayFor(mondayKey()).index, 0);
});
t('a weekday can be set to rest', () => {
  const sched = S.planSchedule().slice();
  sched[1] = null;
  S.setPlanSchedule(sched);
  const d = S.planDayFor(mondayKey());
  eq(d.isRest, true);
  eq(d.templateId, null);
  S.resetPlanSchedule();
});

/* ---------------- seed history ---------------- */
console.log('\nSession logging');
function logSession(dateKey, name, entries) {
  const s = S.startSession({ name, date: dateKey });
  for (const [exId, sets] of entries) {
    const entry = S.addSessionExercise(s.id, exId, { sets: sets.length });
    entry.sets.forEach((set, i) => {
      S.updateSet(s.id, entry.id, set.id, { weight: sets[i][0], reps: sets[i][1], rpe: sets[i][2] ?? null, done: true });
    });
  }
  return S.finishSession(s.id);
}
const dk = (back) => utils.dayKey(utils.addDays(new Date(), -back));

t('a completed session stores every individual set', () => {
  const s = logSession(dk(21), 'Upper A', [['barbell-bench-press', [[60, 8, 7], [60, 8, 8], [60, 8, 8]]]]);
  eq(s.status, 'completed');
  eq(s.entries[0].sets.length, 3);
  eq(s.entries[0].sets[0].weight, 60);
});
logSession(dk(14), 'Upper A', [['barbell-bench-press', [[60, 10, 8], [60, 9, 8], [60, 8, 9]]]]);
logSession(dk(7), 'Upper A', [['barbell-bench-press', [[60, 12, 8], [60, 11, 9], [60, 10, 9]]]]);

t('session totals compute volume, sets and reps', () => {
  const s = S.completedSessions()[0];
  const tt = stats.sessionTotals(s);
  eq(tt.sets, 3);
  eq(tt.reps, 33);
  eq(tt.volume, 60 * 33);
});
t('warm-up sets are excluded from volume', () => {
  const s = S.startSession({ name: 'Warmup test', date: dk(3) });
  const e = S.addSessionExercise(s.id, 'back-squat', { sets: 2 });
  S.updateSet(s.id, e.id, e.sets[0].id, { weight: 40, reps: 10, type: 'warmup', done: true });
  S.updateSet(s.id, e.id, e.sets[1].id, { weight: 100, reps: 5, done: true });
  const fin = S.finishSession(s.id);
  eq(stats.sessionTotals(fin).volume, 500);
  S.deleteSession(fin.id);
});

/* ---------------- analytics ---------------- */
console.log('\nAnalytics');
const done = () => S.completedSessions();
t('exercise history is newest-first and complete', () => {
  const hist = stats.exerciseHistory(done(), 'barbell-bench-press');
  eq(hist.length, 3);
  ok(hist[0].date > hist[1].date);
  eq(hist[0].maxReps, 12);
});
t('estimated 1RM uses the Epley formula', () => {
  near(utils.e1rm(100, 1), 100, 0.001);
  near(utils.e1rm(60, 10), 60 * (1 + 10 / 30), 0.001);
});
t('personal records identify heaviest, most reps and best e1RM', () => {
  const prs = stats.exercisePRs(done(), 'barbell-bench-press');
  eq(prs.heaviest.weight, 60);
  eq(prs.mostReps.reps, 12);
  near(prs.bestE1rm.value, utils.e1rm(60, 12), 0.001);
  eq(prs.sessions, 3);
});
t('reps-at-weight tracks the double-progression view', () => {
  const prs = stats.exercisePRs(done(), 'barbell-bench-press');
  const at60 = prs.repsAtWeight.find((x) => x.weight === 60);
  eq(at60.reps, 12);
});
t('PR detection flags a rep PR but not a duplicate weight PR', () => {
  const before = done();
  const s = logSession(dk(1), 'Upper A', [['barbell-bench-press', [[60, 13, 9]]]]);
  const prs = stats.detectPRs(done(), s);
  ok(prs.some((p) => p.kind === 'reps' && p.reps === 13), 'rep PR detected');
  ok(!prs.some((p) => p.kind === 'weight'), 'no weight PR at the same load');
  S.deleteSession(s.id);
});
t('muscle volume counts secondaries as half sets', () => {
  const mv = stats.muscleVolume(done(), S.exerciseIndex());
  eq(mv.chest.sets, 9);          // 3 sessions × 3 sets, primary
  eq(mv.triceps.sets, 4.5);      // secondary → half
});
t('weekly buckets group sessions by week', () => {
  const w = stats.weeklyBuckets(done(), 5, 1);
  eq(w.length, 5);
  eq(w.reduce((n, x) => n + x.count, 0), done().length);
});
t('streaks count training days', () => {
  const st = stats.streaks(done());
  ok(st.totalDays >= 3);
});

/* ---------------- progression ---------------- */
console.log('\nProgressive overload');
t('rising reps at a fixed weight reads as progressing', () => {
  const a = prog.analyseProgress(done(), 'barbell-bench-press');
  eq(a.status, 'progressing');
  ok(a.reason.includes('%'));
});
t('double progression recommends more weight once the top of the range is hit', () => {
  const ex = S.exerciseById('barbell-bench-press');
  const s = prog.suggestNext(done(), ex, { method: 'double', targetSets: 3, repRange: [8, 10], incrementKg: 2.5 });
  ok(/add/i.test(s.headline), s.headline);
  const weightOpt = s.options.find((o) => o.kind === 'weight');
  ok(weightOpt, 'a weight-increase option is offered');
  eq(weightOpt.weight, 62.5);
});
t('double progression recommends more reps mid-range', () => {
  const ex = S.exerciseById('barbell-bench-press');
  const s = prog.suggestNext(done(), ex, { method: 'double', targetSets: 3, repRange: [8, 15], incrementKg: 2.5 });
  ok(s.options.some((o) => o.kind === 'reps'), 'a rep-increase option is offered');
});
t('an unlogged exercise gets a baseline suggestion, not a bogus number', () => {
  const s = prog.suggestNext(done(), S.exerciseById('lateral-raise'), null);
  eq(s.last, null);
  ok(s.rationale.includes('reserve'));
});
t('declining performance triggers a deload suggestion', () => {
  const ids = [];
  ids.push(logSession(dk(20), 'D', [['overhead-press', [[60, 8], [60, 8], [60, 8]]]]).id);
  ids.push(logSession(dk(15), 'D', [['overhead-press', [[60, 6], [60, 6], [60, 5]]]]).id);
  ids.push(logSession(dk(10), 'D', [['overhead-press', [[55, 6], [55, 5], [55, 5]]]]).id);
  ids.push(logSession(dk(5), 'D', [['overhead-press', [[50, 5], [50, 5], [50, 4]]]]).id);
  const a = prog.analyseProgress(done(), 'overhead-press');
  eq(a.status, 'declining');
  ok(a.deload, 'deload flagged');
  const s = prog.suggestNext(done(), S.exerciseById('overhead-press'), null);
  ok(s.options.some((o) => o.kind === 'deload'), 'a deload option is offered');
  ids.forEach((id) => S.deleteSession(id));
});
t('an unchanged performer reads as a plateau', () => {
  const ids = [];
  for (const back of [24, 18, 12, 6]) ids.push(logSession(dk(back), 'P', [['lat-pulldown', [[50, 10], [50, 10], [50, 10]]]]).id);
  const a = prog.analyseProgress(done(), 'lat-pulldown');
  eq(a.status, 'plateau');
  ids.forEach((id) => S.deleteSession(id));
});
t('prefill uses last performance when there is history', () => {
  const pf = prog.prefillFor(done(), S.exerciseById('barbell-bench-press'), null, 0);
  ok(pf.weight > 0, 'a weight is pre-filled');
  ok(pf.suggestion.last, 'the suggestion carries last performance');
});

t('exercises are labelled by where they came from', async () => {});
{
  const { exerciseTier } = await import('../js/lib/components.js');
  results.pop(); pass--;
  t('exercises are labelled by where they came from', () => {
    eq(exerciseTier(S.exerciseById('barbell-bench-press')).id, 'curated');
    eq(exerciseTier(S.exercises().find((e) => e.source === 'exercises-dataset')).id, 'imported');
    eq(exerciseTier(S.exercises().find((e) => e.source === 'free-exercise-db')).id, 'imported');
    const mine = S.createExercise({ name: 'Tier check' });
    eq(exerciseTier(mine).id, 'custom');
    S.deleteExercise(mine.id);
  });
}

/* ---------------- build ---------------- */
console.log('\nDeployable build');
{
  const { execFileSync } = await import('node:child_process');
  const { existsSync, readFileSync, rmSync } = await import('node:fs');
  t('the default build is publishable — app only, no licensed media', () => {
    execFileSync(process.execPath, ['scripts/build.js', '--out', '.tmp-dist'], { encoding: 'utf8' });
    ok(existsSync('.tmp-dist/index.html'), 'index.html is built');
    ok(existsSync('.tmp-dist/sw.js'), 'the service worker is built');
    ok(existsSync('.tmp-dist/js/data/exercises-extended.json'), 'the exercise library is built');
    eq(JSON.parse(readFileSync('.tmp-dist/js/data/app-config.json', 'utf8')).licensedMedia, false,
      'the build tells the app the licensed media is absent');
    ok(existsSync('.tmp-dist/media/open'), 'public-domain photos ARE published');
    ok(!existsSync('.tmp-dist/media/videos'), 'Gym visual GIFs are not published');
    ok(!existsSync('.tmp-dist/media/images'), 'Gym visual photos are not published');
    ok(existsSync('.tmp-dist/.nojekyll'), 'GitHub Pages marker');
    ok(existsSync('.tmp-dist/_headers'), 'cache headers for the host');
    ok(!existsSync('.tmp-dist/_redirects'),
      'no SPA fallback — hash routing needs none, and it would mask 404s');
    rmSync('.tmp-dist', { recursive: true, force: true });
  });
}

/* ---------------- migration ---------------- */
console.log('\nSchema migration');
t('an install predating bundled media adopts it on upgrade', () => {
  const snapshot = JSON.parse(S.exportData());
  const old = JSON.parse(JSON.stringify(snapshot.state));
  old.schema = 1;
  old.settings.mediaBase = '';
  S.importData({ state: old });
  eq(S.settings().mediaBase, 'media');
  S.importData(snapshot);
});
t('a deliberate clear on the current schema is respected', () => {
  const snapshot = JSON.parse(S.exportData());
  const cur = JSON.parse(JSON.stringify(snapshot.state));
  cur.schema = 2;
  cur.settings.mediaBase = '';
  S.importData({ state: cur });
  eq(S.settings().mediaBase, '');
  S.importData(snapshot);
});

/* ---------------- media ---------------- */
console.log('\nLicensed media hook');
{
  const media = await import('../js/lib/media.js');
  const sample = S.exercises().find((e) => e.media && e.media.gif);
  t('media resolves from the bundled folder by default', () => {
    S.setSetting('mediaBase', 'media');
    ok(media.mediaEnabled());
    eq(media.gifFor(sample), `media/${sample.media.gif}`);
    eq(media.imageFor(sample), `media/${sample.media.image}`);
    ok(media.hasMedia(sample));
    ok(media.ATTRIBUTION.includes('Gym visual'), 'attribution is exposed for display');
  });
  t('the media source is redirectable to any host', () => {
    S.setSetting('mediaBase', 'https://cdn.example.com/assets/');
    eq(media.gifFor(sample), `https://cdn.example.com/assets/${sample.media.gif}`);
  });
  t('clearing the media source falls back to the built-in diagrams', () => {
    S.setSetting('mediaBase', '');
    eq(media.mediaEnabled(), false);
    eq(media.gifFor(sample), null);
    eq(media.hasMedia(sample), false);
    S.setSetting('mediaBase', 'media');
  });
  t('public-domain photos resolve even when the licensed set is absent', () => {
    const openEx = S.exercises().find((e) => e.media && e.media.open);
    ok(openEx, 'a public-domain exercise exists');
    const frames = media.framesFor(openEx);
    ok(frames && frames.length >= 1, 'photo frames resolve');
    ok(frames[0].startsWith('media/open/'));
    ok(media.creditFor(openEx).includes('Public domain'));
  });
  t('an exercise carrying only Gym visual media is gated on the licence', () => {
    const gv = S.exercises().find((e) => e.media && e.media.gif && !e.media.open);
    if (!gv) { ok(true, 'none in this build'); return; }
    ok(media.gifFor(gv), 'resolves while the licensed set is present');
    ok(media.creditFor(gv).includes('Gym visual'), 'attribution is required for it');
  });
}

/* ---------------- units ---------------- */
console.log('\nUnits');
t('kg/lb conversion round-trips', () => {
  near(utils.fromKg(utils.toKg(225, 'lb'), 'lb'), 225, 0.0001);
  near(utils.toKg(100, 'lb'), 45.359237, 0.0001);
});
t('weight formatting respects the unit', () => {
  eq(utils.fmtWeight(60, 'kg'), '60 kg');
  eq(utils.fmtWeight(45.359237, 'lb'), '100 lb');
});
t('day keys are local-time and do not shift across timezones', () => {
  const d = new Date(2026, 0, 1, 23, 30);
  eq(utils.dayKey(d), '2026-01-01');
});

/* ---------------- rendering ---------------- */
console.log('\nView rendering');
S.completeOnboarding();
const VIEWS = [
  ['home', {}], ['exercises', {}], ['exerciseDetail', { id: 'barbell-bench-press' }],
  ['exerciseEdit', { id: 'barbell-bench-press' }], ['workouts', {}],
  ['builder', { id: S.templates()[0].id }], ['splits', {}],
  ['splitDetail', { id: 'split-upper-lower-4' }], ['progress', {}],
  ['exerciseProgress', { id: 'barbell-bench-press' }], ['history', {}],
  ['sessionDetail', { id: S.completedSessions()[0].id }], ['calendar', {}],
  ['records', {}], ['goals', {}], ['body', {}], ['settings', {}],
  ['taxonomyEdit', {}], ['more', {}], ['onboarding', {}], ['active', {}],
];
const ctx = (params) => ({ params, query: {}, navigate() {}, back() {}, refresh() {}, path: '/' });
for (const [name, params] of VIEWS) {
  t(`renders ${name}`, async () => {});
  try {
    const mod = await import(`../js/views/${name}.js`);
    const out = mod.render(ctx(params));
    ok(out, `${name} returned nothing`);
    if (mod.actions) mod.actions(ctx(params));
    if (typeof mod.title === 'function') mod.title(ctx(params));
    results[results.length - 1] = `  ok   renders ${name}`;
  } catch (e) {
    fail++; pass--;
    results[results.length - 1] = `  FAIL renders ${name}\n       ${e.stack.split('\n').slice(0, 3).join('\n       ')}`;
  }
}
t('active workout renders with a live session', async () => {});
try {
  const s = S.startSession({ name: 'Live' });
  S.addSessionExercise(s.id, 'back-squat');
  const mod = await import('../js/views/active.js');
  ok(mod.render(ctx({})));
  S.discardSession(s.id);
  results[results.length - 1] = '  ok   active workout renders with a live session';
} catch (e) {
  fail++; pass--;
  results[results.length - 1] = `  FAIL active workout with a live session\n       ${e.stack.split('\n').slice(0, 3).join('\n       ')}`;
}

t('charts render for empty and populated inputs', () => {
  ok(charts.lineChart([]));
  ok(charts.lineChart([{ date: '2026-01-01', value: 1 }, { date: '2026-01-08', value: 2 }]));
  ok(charts.barChart([{ label: 'a', value: 1 }]));
  ok(charts.hBarChart([{ label: 'a', value: 1, target: 2 }], { showTarget: true }));
  ok(charts.ring(1, 2));
  ok(charts.heatmap({ '2026-01-01': 1 }));
  ok(charts.sparkline([1, 2, 3]));
});
t('body map renders both views', () => ok(bodyMapPair({ primary: ['chest'], secondary: ['triceps'] })));

/* ---------------- backup ---------------- */
console.log('\nBackup');
t('export then import restores an identical state', () => {
  const json = S.exportData();
  const sessionCount = S.completedSessions().length;
  S.resetAll();
  eq(S.completedSessions().length, 0);
  S.importData(json);
  eq(S.completedSessions().length, sessionCount);
});
t('merge import does not duplicate existing records', () => {
  const json = S.exportData();
  const before = S.completedSessions().length;
  S.importData(json, { merge: true });
  eq(S.completedSessions().length, before);
});

console.log(results.join('\n'));

/* Service worker runs in its own global scope, so it is verified separately. */
console.log('\nService worker');
try {
  const { execFileSync } = await import('node:child_process');
  const out = execFileSync(process.execPath, ['scripts/sw-test.js'], { encoding: 'utf8' });
  out.trim().split('\n').forEach((l) => console.log('  ' + l));
  if (/FAILED|✗/.test(out)) fail++; else pass++;
} catch (e) {
  fail++;
  console.log('  FAIL service worker\n       ' + String(e.message).split('\n')[0]);
}

console.log(`\n${pass} passed, ${fail} failed\n`);
process.exit(fail ? 1 : 0);
