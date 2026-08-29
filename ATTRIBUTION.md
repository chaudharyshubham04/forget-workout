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

The media is entirely optional. Clear **Settings → Library → Exercise media**
and every exercise falls back to a procedurally generated SVG animation
(`js/lib/motion.js`) written for this project — no third-party assets, no
licensing question, and it works offline. Delete the `media/` folder to drop
~137 MB.

## Everything else

Application code, design system, animation engine, anatomy maps, charts,
progression engine and the 98 curated exercises were written for this project.
