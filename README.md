# Forge — Gym Workout Tracker PWA

An offline-first Progressive Web App for tracking workouts, exercises, splits and
progressive overload.

**No build step. No dependencies. No network required.** Plain HTML, CSS and
native ES modules — clone it and open it.

Made with ♥ by Shubham

---

## Quick start

```bash
node scripts/serve.js 8080
``` 

Open <http://localhost:8080>. Any static file server works.

To install it as a real app: open it in Chrome/Edge/Safari and choose
*Install* / *Add to Home Screen*. It then runs full-screen, launches from your
home screen and works with no connection at all.

```bash
node scripts/test.js     # 90 checks
```

---

## What's inside

| | |
|---|---|
| **Exercises** | **2,115** — 98 hand-written + 2,017 imported from two open datasets |
| **Demonstrations** | 868 photo demonstrations (public domain, published), 1,324 animation GIFs (local only, licensed separately), and 45 procedural SVG animations covering everything else |
| **Splits** | 14 predefined, from Full Body 3× to a 6-day Push/Pull/Legs/Core/Upper/Lower |
| **Storage** | localStorage for data, IndexedDB for progress photos — entirely on-device |
| **Size** | 97 MB deployed (2.2 MB app + 95 MB public-domain photos); 137 MB more if you licence the GIFs |

### Screens

Home dashboard · Exercise library · Exercise detail · Workout builder ·
**Active workout** · Splits · Progress analytics · Per-exercise analytics ·
History · Session detail · Calendar · Personal records · Goals · Body tracking ·
Settings · Categories & muscles · Onboarding

Bottom tab bar on mobile, persistent sidebar on desktop, dark mode by default
with a one-tap Dark → Light → Auto toggle in the top bar.

### Your training week

The active split is pinned to weekdays, starting on your week-start day (Monday
by default) — so the same weekday always runs the same session. Any day can be
reassigned in **Settings → Training plan → Weekly schedule**: put Pull on Monday
instead of Push, run the same session twice a week, or mark a day as rest.
Changing the schedule never touches your logged history.

---

## The tracking model

**Every set is stored individually** — weight, reps, RPE, RIR, rest, set type
(warm-up / working / drop / failure / AMRAP), completion flag and timestamp.
Nothing is aggregated at write time.

Volume, personal records, estimated 1RM, muscle-group balance and every trend
are **derived at read time** from those set records. This is why editing a
workout from three weeks ago immediately and correctly re-flows through every
chart, PR and status indicator.

```
Session ─→ SessionEntry (one exercise) ─→ SetLog (one set)
                                            weight, reps, rpe, rir,
                                            restSec, type, done, ts
```

### Progressive overload

Each exercise is classified from its recent history — 🟢 Progressing,
🔵 Maintaining, 🟡 Plateau, 🔴 Declining — with the reasoning stated in plain
language ("Estimated strength is up 9.6% and training volume 25.9% across your
last 4 sessions").

The engine then proposes concrete next targets under a configurable rule:
double progression, weight-first, reps-first, volume progression or manual.
It autoregulates on RPE/RIR, notices long layoffs, and flags when a deload is
worth considering. Suggestions are always labelled as suggestions, and you can
accept, ignore or override any of them.

During a live session each exercise shows the previous performance beside the
current set, pre-fills the suggested load, completes a set in one tap and starts
the rest timer automatically.

---

## Exercise data

The library has three tiers, all flowing through the same override system:

| Tier | Count | Detail |
|---|---|---|
| **Curated** | 98 | Written for this project: description, step-by-step instructions, common mistakes, safety tips, form cues, alternatives, variations, similar exercises |
| **Imported** | 1,300 | [exercises-dataset](https://github.com/hasaneyldrm/exercises-dataset) (MIT) — names, taxonomy, English instructions |
| **Imported** | 717 | [free-exercise-db](https://github.com/yuhonas/free-exercise-db) (Unlicense) — same, **plus public-domain photographs** |
| **Custom** | yours | Anything you create in-app |

### Where the imported data comes from

`js/data/exercises-extended.json` is generated from the MIT-licensed
[**exercises-dataset**](https://github.com/hasaneyldrm/exercises-dataset)
project by Hasan Emir Yıldırım.

Only the parts MIT covers are used: exercise names, the
category / body-part / equipment / muscle taxonomy, and the **English**
instruction text. The other nine languages are dropped — that alone cut the
payload from 17 MB to 1.6 MB (162 KB gzipped).

Each imported record is mapped onto Forge's own taxonomy: muscles, equipment,
categories, difficulty, mechanic (compound/isolation), movement pattern, and
tracking type — so a stationary bike logs distance and time, a plank logs
duration, and a barbell press logs weight × reps. Every one is also assigned an
animated demonstration. **All 1,300 map cleanly with zero unmapped values**,
asserted by the test suite. 24 records were skipped as duplicates so the
hand-written versions win.

To regenerate after an upstream update:

```bash
curl -sSL -o /tmp/ex-dataset.json \
  https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/data/exercises.json
node scripts/import-dataset.js /tmp/ex-dataset.json
```

### Which exercises are which

Every exercise carries a tag so you know what you are looking at:

- **Curated** — one of the 98 written for this app, with mistakes, cues,
  safety tips, alternatives and variations. Filter the library to just these
  with the *★ Curated* chip.
- *(untagged)* — imported: name, taxonomy and step-by-step instructions.
- **Custom** — created by you.

### Exercise media, and what is publishable

Three tiers, in the order the app prefers them:

1. **Public-domain photographs** — `media/open/`, from free-exercise-db under
   the Unlicense. 868 exercises get two stills (start and end position) which
   the app cross-fades to animate the movement. **These ship in the deployed
   build**, because public domain carries no redistribution restriction.
2. **Gym visual GIFs** — `media/images/` and `media/videos/`, 1,324 animations.
   © Gym visual and **excluded from the build by default**: their terms state
   the media "cannot be transmitted to another party" and may not be
   "redistributed". Their §6.1 *does* explicitly permit app and website use
   once you buy a licence, so `--with-media` is there for when you have one.
3. **Procedural SVG animations** — `js/lib/motion.js`, written for this
   project. A keyframed anatomical figure with the equipment drawn in and the
   trained muscles highlighted. Covers every exercise with no assets at all,
   and is the fallback wherever no photo exists.

Media is never precached — the service worker caches each file the first time
you view it, so the app installs fast and the exercises you actually use become
available offline.

See [ATTRIBUTION.md](ATTRIBUTION.md) for the full licence positions.

---

## Deploy it for free

```bash
node scripts/build.js      # → dist/, 97 MB, 1,805 files
```

`dist/` is a plain static folder. Drop it on any free host — it needs no server,
no database and no build environment. HTTPS is the only requirement (service
workers need a secure origin; every option below gives you one free).

| Host | How | Notes |
|---|---|---|
| **GitHub Pages** | Push to `main` — [`.github/workflows/deploy.yml`](.github/workflows/deploy.yml) tests, builds and publishes | Free, custom domain supported. Enable Pages → Source: *GitHub Actions* |
| **Cloudflare Pages** | Connect the repo. Build: `node scripts/build.js`, output: `dist` | Unlimited bandwidth on the free plan — see below |
| **Netlify** | Connect the repo — [`netlify.toml`](netlify.toml) is already configured | 100 GB/month free |
| **Vercel** | Connect the repo. Build: `node scripts/build.js`, output: `dist` | 100 GB/month free |
| **Anywhere** | `node scripts/build.js` then upload `dist/` | Works from a subdirectory too |

The build sets cache headers, an SPA fallback and a `.nojekyll` marker for you.
All paths are relative, so serving from `example.com/forge/` works exactly the
same as from a root domain.

### Cloudflare, step by step

1. <https://dash.cloudflare.com> → **Workers & Pages** → **Create** →
   **Connect to Git**, and pick the repository.
2. Build settings:
   - Framework preset — **None**
   - Build command — `node scripts/build.js`
   - Build output directory — `dist`
   - Root directory — leave empty
3. **Save and Deploy.** First build takes about a minute; HTTPS is included.

Every push to `main` redeploys automatically, and pull requests get their own
preview URL. `.node-version` pins the builder to Node 20.

[`wrangler.jsonc`](wrangler.jsonc) points the deploy at `dist/`. **This matters:**
Cloudflare's newer Workers projects install wrangler into the repo and, without
that config, upload the entire working directory as assets — including
`node_modules/workerd/bin/workerd`, a 146 MiB binary that blows the 25 MiB
per-asset limit and fails the deploy with `[ERROR] Asset too large`.

Cloudflare reads `_headers` from `dist/`, which the build writes, so caching is
handled. There is deliberately no `_redirects`: routing is hash-based
(`/#/progress`), so every request maps to a real file and an SPA fallback would
only turn genuine 404s into 200s serving HTML. It ignores `netlify.toml`, which
is there for Netlify.

To add your own domain: project → **Custom domains** → add it. DNS is
configured for you if the domain is already on Cloudflare.

### What gets published, and what doesn't

`scripts/build.js` **excludes the exercise media by default.** Publishing those
files would be redistribution, and the upstream licence does not grant it — so
the deployed app uses its own SVG animations, which are part of this project and
carry no restrictions. The build writes a flag telling the app the media is
absent, so it never requests missing files.

#### Switching the media on later

Once you hold a licence from <https://gymvisual.com/>, publishing it is three
steps:

1. Delete the `media/images/` and `media/videos/` lines from `.gitignore`, then
   commit the files (137 MB).
2. Change the host's build command to `node scripts/build.js --with-media`.
3. Keep the "© Gym visual — https://gymvisual.com/" attribution the app renders
   on every frame — their terms require it.

Nothing else changes: the app already prefers the media whenever it is present
and falls back to the SVG animations when it is not. Read
[ATTRIBUTION.md](ATTRIBUTION.md) first.

## Architecture

Full detail in [ARCHITECTURE.md](ARCHITECTURE.md). The short version:

- **No framework.** A ~90-line `h()` element factory, a hash router, and a
  subscribe/emit store.
- **System data is never mutated.** Customising a predefined exercise writes a
  partial override keyed by its id, so the global library stays pristine and
  "reset to default" always works.
- **Offline first.** The service worker precaches the whole shell and library;
  navigations fall back to the cached shell, assets use
  stale-while-revalidate. The imported library is lazy-loaded but never blocks
  startup — if the network stalls, the app boots on the curated library and
  merges the rest in when it arrives.
- **Everything is drawn in-house.** Charts, anatomy maps, exercise animations
  and icons are all hand-written SVG, so there is nothing to download and
  nothing to break offline.

```
index.html · sw.js · manifest.webmanifest · offline.html
css/styles.css            design system
js/app.js                 router, shell, lifecycle
js/store.js               state, persistence, actions, selectors
js/lib/                   dom, utils, charts, anatomy, motion, progression,
                          stats, media, idb, notify, ui, components, theme, install
js/data/                  taxonomy, exercises (curated), exercises-extended (imported), splits
js/views/                 one module per route
scripts/                  serve, test, import-dataset, sw-test, dom-stub
```

---

## Testing

```bash
node scripts/test.js
```

90 checks across: data integrity, the element factory, the imported library's
taxonomy mapping, the store and its override system, set-level logging, PR
detection, analytics, the progressive-overload engine (including plateau and
deload detection), the media layer, schema migrations, weekday plan
scheduling, the deployable build, unit conversion, backup export/import, a render pass over **every view** against a DOM shim, and a
service-worker install/offline test that verifies the precache and the offline
navigation fallback.

---

## Notes and limits

- **Reminders** are scheduled locally and fire while the app is running.
  Guaranteed delivery after the browser unloads the app would need a push server.
- **Media licensing** is your responsibility if you publish this app — see
  above and [ATTRIBUTION.md](ATTRIBUTION.md).
- **Fallback demonstrations** (used when media is disabled, and for the 74
  curated exercises with no dataset match) are procedural SVG animations. They
  show the movement pattern, equipment and target muscles rather than
  photorealistic anatomy.
- **Imported metadata** is mapped heuristically. It is accurate for the
  overwhelming majority, but a few records follow the source's opinion (its
  "barbell full squat" targets glutes rather than quads), and only the 98
  curated exercises carry hand-written mistakes, cues and safety tips.
- **Estimated 1RM** uses the Epley formula, capped at 15 reps where the estimate
  stops being reliable.
- **Training-status indicators** ("progressing", "plateau", volume targets) are
  informational summaries of your own logged data — general training guidance,
  not medical advice.
- **Your data lives in this browser on this device.** Clearing site data removes
  it, so export a backup from Settings → Data periodically.
