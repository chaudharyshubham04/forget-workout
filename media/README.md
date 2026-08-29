# Exercise media

These files come from https://github.com/hasaneyldrm/exercises-dataset and are
**© Gym visual — https://gymvisual.com/**.

They are NOT covered by that project's MIT licence. Its LICENSE states:

> Cloning this repository does not grant you any license to the media; obtain
> your own from Gym visual.

Use here is subject to Gym visual's Terms & Conditions
(https://gymvisual.com/content/3-terms-and-conditions-of-use). Obtain your own
licence from Gym visual before distributing this app publicly. The attribution
"© Gym visual — https://gymvisual.com/" is displayed on every media frame in the
app, as their terms require.

`images/` and `videos/` are git-ignored so they are never redistributed by
accident. To re-fetch them:

```bash
git clone --depth 1 https://github.com/hasaneyldrm/exercises-dataset.git /tmp/exdata
cp -R /tmp/exdata/images media/images
cp -R /tmp/exdata/videos media/videos
```

To run the app without this media, clear **Settings → Library → Exercise media**
and it falls back to the built-in animated SVG diagrams.
