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
/* A build published without the media folder reports it, so we never emit
   requests for files that are not there. */
export const mediaEnabled = () => !!mediaBase() && mediaAvailable();

const join = (base, path) =>
  `${base.replace(/\/+$/, '')}/${String(path).replace(/^\/+/, '')}`;

/** Animated media (GIF) for an exercise, or null when unavailable. */
export function gifFor(ex) {
  const base = mediaEnabled() ? mediaBase() : '';
  if (!base || !ex?.media?.gif) return null;
  return join(base, ex.media.gif);
}
/** Still image for an exercise, or null. */
export function imageFor(ex) {
  const base = mediaEnabled() ? mediaBase() : '';
  if (!base || !ex?.media?.image) return null;
  return join(base, ex.media.image);
}
export const hasMedia = (ex) => !!(mediaEnabled() && (ex?.media?.gif || ex?.media?.image));

/** Attribution required by the media licence. Rendered wherever media shows. */
export const ATTRIBUTION = '© Gym visual — https://gymvisual.com/';
