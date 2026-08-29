# Attribution & third-party licences

Forge has no runtime dependencies. Its only third-party content is exercise data.

## exercises-dataset — exercise data (MIT)

Source: <https://github.com/hasaneyldrm/exercises-dataset>
Copyright (c) 2026 Hasan Emir Yıldırım — MIT License.

`js/data/exercises-extended.json` is generated from that project's
`data/exercises.json` by `scripts/import-dataset.js`. It uses the parts the MIT
licence covers: exercise names, category/body-part/equipment/muscle taxonomy,
and the **English** instruction text. The other nine languages are not shipped.

Regenerate with:

```bash
curl -sSL -o /tmp/ex-dataset.json \
  https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/data/exercises.json
node scripts/import-dataset.js /tmp/ex-dataset.json
```

## free-exercise-db — exercises and photographs (Unlicense / public domain)

Source: <https://github.com/yuhonas/free-exercise-db>
Released under the **Unlicense** — dedicated to the public domain, data *and*
images, with no attribution requirement and no restriction on redistribution.

`js/data/exercises-open.json` and `media/open/` are generated from it by
`scripts/import-open-db.js`: 717 exercises with photographs, plus photographs
attached to 151 exercises already in the library. Two stills per exercise
(start and end position), which the app cross-fades to animate the movement.

Because they are public domain, **these are the photos that ship in the
deployed build.** The app credits the project anyway, which is courtesy rather
than obligation.

Regenerate with:

```bash
git clone --depth 1 https://github.com/yuhonas/free-exercise-db.git /tmp/freedb
node scripts/import-open-db.js /tmp/freedb
cp -R /tmp/freedb/exercises/. media/open/ && find media/open -name '*.json' -delete
```

## Exercise media — © Gym visual, licensed separately

`media/images/` (1,324 photos) and `media/videos/` (1,324 animation GIFs) come
from the same dataset repository but are **© Gym visual**
(<https://gymvisual.com/>). They are **not** covered by the MIT licence above.
That project's LICENSE carries a media exception:

> That media is © Gym visual (https://gymvisual.com/) and is included here with
> the rights holder's written permission, at 180×180 resolution, and must retain
> the attribution "© Gym visual — https://gymvisual.com/". Its use and reuse are
> governed by Gym visual's Terms & Conditions … **Cloning this repository does
> not grant you any license to the media; obtain your own from Gym visual.**

### What that means for this project

- The attribution "© Gym visual — https://gymvisual.com/" is rendered on every
  media frame in the app, as their terms require.
- The media is at the 180×180 resolution the upstream permission covers.
- **Before distributing this app publicly — app store, public website, or any
  redistribution — obtain your own licence from Gym visual.** Cloning did not
  grant one. Their terms are at
  <https://gymvisual.com/content/3-terms-and-conditions-of-use>.
- `media/README.md` repeats this notice next to the files themselves, and
  `media/LICENSE-exercises-dataset.txt` is the upstream licence verbatim.

### Running without it

This media is entirely optional and is **excluded from the deployed build by
default** (`scripts/build.js`). Exercises fall back to the public-domain photos
above where available, and otherwise to a procedurally generated SVG animation
(`js/lib/motion.js`) written for this project. Delete `media/images` and
`media/videos` to drop ~137 MB.

Per Gym visual's Terms & Conditions §6.1, a purchased licence *does* explicitly
permit use in "Android or iOS mobile application (apps)" and "website pages and
headers" — so licensing it legitimately unlocks this. §5 and §6.2 are equally
explicit that without one the media "cannot be transmitted to another party" and
may not be "resold or redistributed".

## Everything else

Application code, design system, animation engine, anatomy maps, charts,
progression engine and the 98 curated exercises were written for this project.
