/* ============================================================
   Produce a deployable dist/ folder.

   By default the separately-licensed exercise media is EXCLUDED, because
   publishing it is redistribution and the upstream licence does not grant that
   right (see ATTRIBUTION.md). The app falls back to its own SVG animations,
   which are part of this project and carry no restrictions.

     node scripts/build.js                # 2.4 MB, safe to publish anywhere
     node scripts/build.js --with-media   # 139 MB, only with a Gym visual licence

   Usage: node scripts/build.js [--with-media] [--out dist]
   ============================================================ */
import { cp, rm, mkdir, writeFile, readFile, stat, readdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join } from 'node:path';

const args = process.argv.slice(2);
const withMedia = args.includes('--with-media');
const outIdx = args.indexOf('--out');
const OUT = outIdx >= 0 ? args[outIdx + 1] : 'dist';

const SHIP = [
  'index.html', 'offline.html', 'manifest.webmanifest', 'sw.js',
  'css', 'js', 'icons', 'ATTRIBUTION.md',
];

async function dirSize(dir) {
  let total = 0, files = 0;
  for (const e of await readdir(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) { const r = await dirSize(p); total += r.total; files += r.files; }
    else { total += (await stat(p)).size; files++; }
  }
  return { total, files };
}

await rm(OUT, { recursive: true, force: true });
await mkdir(OUT, { recursive: true });

for (const item of SHIP) {
  if (!existsSync(item)) continue;
  await cp(item, join(OUT, item), { recursive: true });
}

if (withMedia) {
  if (!existsSync('media/videos')) {
    console.error('media/ is not installed — see media/README.md');
    process.exit(1);
  }
  await cp('media', join(OUT, 'media'), { recursive: true });
  console.log('⚠  Media INCLUDED. Those files are © Gym visual and are not');
  console.log('   covered by the dataset\'s MIT licence. Publish only with your');
  console.log('   own licence from https://gymvisual.com/ — see ATTRIBUTION.md.');
} else {
  /* Tell the app the media is absent so it never requests missing files. */
  await writeFile(join(OUT, 'js/data/app-config.json'), JSON.stringify({ media: false }));
  /* Drop the media entries from the service worker precache list if present. */
  console.log('Media excluded — the app uses its own SVG animations.');
}

/* GitHub Pages skips files and folders starting with an underscore unless told not to. */
await writeFile(join(OUT, '.nojekyll'), '');

/* Caching rules understood by Netlify, Cloudflare Pages and Workers assets.
   No _redirects file: routing is hash-based, so every request maps to a real
   file and an SPA fallback would only mask genuine 404s. */
await writeFile(join(OUT, '_headers'), `/sw.js
  Cache-Control: no-cache

/js/data/*
  Cache-Control: public, max-age=3600

/media/*
  Cache-Control: public, max-age=31536000, immutable

/icons/*
  Cache-Control: public, max-age=31536000, immutable

/*
  Cache-Control: public, max-age=0, must-revalidate
`);

const { total, files } = await dirSize(OUT);
console.log(`\nBuilt ${OUT}/ — ${files} files, ${(total / 1048576).toFixed(1)} MB`);
console.log('Deploy it with any static host. See README.md → Deploy.');
