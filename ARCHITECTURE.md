# Forge — Gym Workout Tracker PWA

Zero-dependency, no-build Progressive Web App. Native ES modules, hash router,
localStorage + IndexedDB persistence, hand-rolled SVG charts and anatomy maps.

## Why no framework
Offline-first is the hard requirement. A build-free app means the service worker
caches exactly what ships, there is no hydration cost, and first paint on a phone
is a single HTML + CSS round trip. Everything renders from a single immutable-ish
state tree through a tiny virtual-DOM-free `h()` helper.

## Directory layout

    index.html            App shell (nav, outlet, toast host)
    manifest.webmanifest  PWA manifest
    sw.js                 Service worker: precache + stale-while-revalidate
    offline.html          Offline fallback document
    css/styles.css        Design system + all component styles
    icons/                Generated PNG/SVG app icons
    js/app.js             Router, shell rendering, lifecycle
    js/store.js           State tree, persistence, actions, selectors
    js/lib/
      dom.js              h() element factory, mount, fragment helpers
      utils.js            dates, formatting, ids, units, math
      charts.js           SVG line/bar/donut/heatmap renderers
      anatomy.js          Front/back body SVG with muscle highlighting
      motion.js           Procedural animated SVG exercise demonstrations
      progression.js      Progressive-overload engine (analysis + suggestions)
      stats.js            Volume, PRs, e1RM, muscle-group aggregation
      idb.js              IndexedDB wrapper for photo blobs
      notify.js           Notification + reminder scheduling
    js/data/
      taxonomy.js              Muscle groups, categories, equipment (system data)
      exercises.js             Curated exercise library (98, hand-written)
      exercises-extended.json  Imported library (1,300) — lazy-loaded, precached
      splits.js                Predefined workout splits + goal recommendation matrix
    scripts/
      import-dataset.js   Regenerates exercises-extended.json from the MIT dataset
    js/views/             One module per route, each exports render(ctx)

## Data model

The library has three tiers: 98 curated exercises compiled into the bundle, a
1,300-entry imported set fetched once and cached by the service worker, and the
user's own custom exercises. All three flow through the same override system.

System (predefined) data lives in `js/data/*` and is never mutated. User data
lives in the state tree. Predefined records are customised via an *overrides*
map keyed by system id, so the global library stays pristine and a user can
always "reset to default".

    Exercise        id, name, primaryMuscles[], secondaryMuscles[], categories[],
                    equipment[], difficulty, mechanic, movement, force, tracking,
                    description, instructions[], mistakes[], tips[], cues[],
                    media{pose, image}, alternatives[], variations[], similar[],
                    tags[], custom
    Category        id, name, color, icon, custom          (many-to-many w/ Exercise)
    MuscleGroup     id, name, region, parent, color, custom
    Equipment       id, name, custom

    WorkoutTemplate id, name, type, notes, blocks[]
      Block         id, kind: single|superset|circuit|dropset, rounds, rest,
                    entries[]
      Entry         id, exerciseId, notes, sets[], progression{}
      PlannedSet    id, type: warmup|normal|failure|drop|amrap, targetReps[min,max],
                    weight, rpe, tempo, rest

    Split           id, name, level, goals[], daysPerWeek, days[]
      SplitDay      id, name, kind: workout|rest, templateId, focus[]

    Session         id, date, startedAt, endedAt, status, templateId, splitId,
                    dayId, name, notes, entries[]
      SessionEntry  id, exerciseId, order, notes, sets[]
      SetLog        id, type, weight, reps, rpe, rir, restSec, durationSec,
                    distanceM, done, ts

Every set is stored individually — never aggregated at write time. All volume,
PR, e1RM and trend analysis is derived from `SetLog` records at read time, which
means historical edits immediately and correctly re-flow into every chart.

    BodyEntry       id, date, weight, bodyFat, measurements{}, photoId, notes
    Goal            id, kind, title, exerciseId, startValue, targetValue, unit,
                    targetDate, done
    ProgressionRule exerciseId, method, targetSets, repRange[], increment

## Navigation

Mobile: bottom tab bar (Home / Exercises / [FAB start] / Progress / More).
Desktop: persistent left sidebar with the full route list.
Active session surfaces as a sticky resume bar on every route.

Routes: #/ , #/exercises , #/exercise/:id , #/workouts , #/workout/:id ,
#/builder/:id? , #/active , #/splits , #/split/:id , #/progress ,
#/progress/exercise/:id , #/history , #/history/:id , #/calendar , #/records ,
#/goals , #/body , #/settings , #/onboarding

## User flow

1. Onboarding captures experience, goal, days/week, session length, equipment.
2. Recommendation engine maps (goal × days × level) to ranked splits.
3. User activates a split; its days schedule onto the calendar.
4. Home surfaces today's planned workout → one tap starts a session.
5. Active session pre-fills every set from last performance, shows a progressive
   overload suggestion per exercise, auto-starts the rest timer on set completion.
6. Finishing writes an immutable session record and detects PRs.
7. Progress/analytics read exclusively from session records.
