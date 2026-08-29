/* ============================================================
   Exercise media resolution.

   Imported exercises carry references to the media in
   hasaneyldrm/exercises-dataset (images/NNNN-xxx.jpg, videos/NNNN-xxx.gif).
   That media is © Gym visual and is NOT redistributed with this app — the
   dataset's own licence states that cloning it grants no rights to the files.

   By default the app serves them from the bundled `media/` folder. The path is
   configurable in Settings → Library → Exercise media, and clearing it falls
   back to the procedurally animated SVG, which needs no assets at all.

   Because the GIFs total ~110 MB they are NOT precached by the service worker;
   they are cached on demand as you view exercises, so the app installs fast and
   the exercises you actually use become available offline.
   ============================================================ */
import { get, mediaAvailable } from '../store.js';

export const mediaBase = () => (get().settings.mediaBase || '').trim();
/** Public-domain photos ship in every build; the licensed set may not. */
const usable = (ex) => !!mediaBase() && (ex?.media?.open ? true : mediaAvailable());
export const mediaEnabled = () => !!mediaBase();

const join = (base, path) =>
  `${base.replace(/\/+$/, '')}/${String(path).replace(/^\/+/, '')}`;

/** Animated media (GIF) for an exercise, or null when unavailable. */
export function gifFor(ex) {
  if (!usable(ex) || !ex?.media?.gif) return null;
  return join(mediaBase(), ex.media.gif);
}
/** Photo pair (start/end) for public-domain entries — alternated to animate. */
export function framesFor(ex) {
  if (!usable(ex) || !ex?.media?.images?.length) return null;
  return ex.media.images.map((p) => join(mediaBase(), p));
}
/** Still image for an exercise, or null. */
export function imageFor(ex) {
  if (!usable(ex) || !ex?.media?.image) return null;
  return join(mediaBase(), ex.media.image);
}
export const hasMedia = (ex) => !!(usable(ex) && (ex?.media?.gif || ex?.media?.image));

/** Attribution required by the media licence. Rendered wherever media shows. */
export const ATTRIBUTION = '© Gym visual — https://gymvisual.com/';
/** Public-domain photos need no attribution, but crediting the source is polite. */
export const OPEN_CREDIT = 'Public domain — free-exercise-db';
export const creditFor = (ex) => (ex?.media?.open ? OPEN_CREDIT : ATTRIBUTION);
