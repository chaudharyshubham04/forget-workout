/* Reusable presentational pieces shared across views. */
import { h, icon, mount } from './dom.js';
import * as S from '../store.js';
import { demoSVG, poseThumb } from './motion.js';
import { muscleGlyph } from './anatomy.js';
import { DIFFICULTIES, SET_TYPES } from '../data/taxonomy.js';
import { fmtWeight, fmtNum, relDay, compactNum } from './utils.js';
import { sheet, toast, emptyState } from './ui.js';
import { gifFor, imageFor, framesFor, hasMedia, creditFor } from './media.js';
import { matchScore } from './utils.js';

export const diffOf = (id) => DIFFICULTIES.find((d) => d.id === id) || DIFFICULTIES[0];

/**
 * Where an exercise came from. The curated set is hand-written for this app and
 * carries coaching detail (mistakes, cues, safety tips) the imported set lacks,
 * so it is worth surfacing.
 */
export function exerciseTier(ex) {
  if (!ex) return null;
  if (ex.custom) return { id: 'custom', label: 'Custom', cls: 'tag-info' };
  /* Anything with a `source` came from an imported dataset; only the 98
     written for this app count as curated. */
  if (ex.source) return { id: 'imported', label: 'Imported', cls: '' };
  return { id: 'curated', label: 'Curated', cls: 'tag-accent' };
}
/** Small dot badge for dense list rows. */
export const tierBadge = (ex) => {
  const t = exerciseTier(ex);
  if (!t || t.id === 'imported') return null;
  return h(`span.tag.${t.cls}`, { style: { padding: '0 5px', fontSize: '9px', flex: 'none', lineHeight: '15px' }, title:
    t.id === 'curated'
      ? 'Written for Forge — includes mistakes, cues and safety tips'
      : 'Your own exercise' }, t.label.toUpperCase());
};

/** Animated demo with play/pause and a speed toggle. */
export function demoPlayer(exercise, { badge = true, autoplay = true } = {}) {
  let paused = !autoplay, speed = 1, showMuscles = true;
  /* Prefer real footage when the user has configured licensed media; the
     procedural animation is the always-available fallback. */
  let useMedia = hasMedia(exercise);
  const holder = h('.demo');

  const buildMedia = () => {
    /* Gym visual's illustrations are drawn on white, so they get a white
       backdrop. The public-domain files are real photographs (mostly 3:2 in a
       4:3 frame) and need a neutral one, or the letterbox bars read as a bug. */
    holder.classList.add('demo-media');
    holder.classList.toggle('demo-photo', !!exercise.media?.open);
    const gif = gifFor(exercise);
    const frames = gif ? null : framesFor(exercise);
    let node;
    if (gif) {
      node = h('img', { src: gif, alt: `${exercise.name} demonstration`, loading: 'lazy',
        onerror: () => { useMedia = false; build(); } });
    } else if (frames && frames.length > 1) {
      /* Two stills (start and end position) cross-faded on a loop — enough to
         read the movement without a video file. */
      node = h('.demo-frames', { style: { '--frame-dur': `${1.4 / speed}s` } },
        ...frames.map((src, i) => h('img', {
          src, alt: i === 0 ? `${exercise.name}, start position` : `${exercise.name}, end position`,
          class: paused && i > 0 ? 'frame hidden' : 'frame',
          style: { animationDelay: `${i * (0.7 / speed)}s`,
            animationPlayState: paused ? 'paused' : 'running' },
          onerror: () => { useMedia = false; build(); } })));
    } else {
      node = h('img', { src: frames ? frames[0] : imageFor(exercise),
        alt: `${exercise.name} demonstration`, loading: 'lazy',
        onerror: () => { useMedia = false; build(); } });
    }
    mount(holder,
      node,
      badge ? h('.demo-badge', (exercise.movement || 'movement').toUpperCase()) : null,
      h('.demo-attr', { title: creditFor(exercise) }, creditFor(exercise)),
      h('.demo-ctl',
        framesFor(exercise) && !gif
          ? h('button.iconbtn', { 'aria-label': paused ? 'Play' : 'Pause',
              onclick: () => { paused = !paused; build(); } }, icon(paused ? 'play' : 'pause'))
          : null,
        h('button.iconbtn', { 'aria-label': 'Show the diagram instead',
          title: 'Switch to the animated diagram',
          onclick: () => { useMedia = false; build(); } }, icon('user', 17))));
  };

  const build = () => {
    if (useMedia) return buildMedia();
    holder.classList.remove('demo-media');
    mount(holder,
      demoSVG(exercise.pose || 'generic', {
        paused, speed,
        highlight: showMuscles ? (exercise.primaryMuscles || []) : [],
      }),
      badge ? h('.demo-badge', (exercise.movement || 'movement').toUpperCase()) : null,
      h('.demo-ctl',
        h('button.iconbtn', { 'aria-label': paused ? 'Play' : 'Pause',
          onclick: () => { paused = !paused; build(); } }, icon(paused ? 'play' : 'pause')),
        h('button.iconbtn', { 'aria-label': 'Change speed',
          onclick: () => { speed = speed === 1 ? 0.5 : speed === 0.5 ? 2 : 1; build(); } },
          h('span', { style: { fontSize: '11px', fontWeight: 800 } }, `${speed}×`)),
        h('button.iconbtn', {
          'aria-label': showMuscles ? 'Hide target muscles' : 'Show target muscles',
          title: 'Highlight target muscles',
          style: showMuscles ? { background: 'var(--accent)', color: '#fff' } : null,
          onclick: () => { showMuscles = !showMuscles; build(); } }, icon('target', 17)),
        hasMedia(exercise)
          ? h('button.iconbtn', { 'aria-label': 'Show the photo demonstration',
              title: 'Switch to the photo demonstration',
              onclick: () => { useMedia = true; build(); } }, icon('camera', 17))
          : null),
      showMuscles && (exercise.primaryMuscles || []).length
        ? h('.demo-legend',
            h('i'), h('span', (exercise.primaryMuscles || []).map((m) => S.muscleName(m)).join(' · ')))
        : null);
  };
  build();
  return holder;
}

/** Square animated thumbnail used in lists and grids. */
export function exerciseThumb(ex, { animated = false, large = false } = {}) {
  const wrap = h(`.ex-thumb${large ? '.ex-thumb-lg' : ''}`);
  const diagram = () => mount(wrap, animated
    ? demoSVG(ex.pose || 'generic', { highlight: ex.primaryMuscles || [] })
    : poseThumb(ex.pose || 'generic', ex.primaryMuscles || []));
  const photo = imageFor(ex);
  if (photo) {
    /* Falls back to the diagram if the file is missing or the media folder
       has not been installed. */
    mount(wrap, h('img', { src: photo, alt: '', loading: 'lazy', decoding: 'async',
      style: { width: '100%', height: '100%', objectFit: 'cover' },
      onerror: diagram }));
  } else diagram();
  return wrap;
}

/** Compact list row. */
export function exerciseCard(ex, { onClick, right, sub, animated = false } = {}) {
  const muscles = (ex.primaryMuscles || []).map((m) => S.muscleName(m)).join(', ');
  return h('.ex-card', { onclick: onClick, role: onClick ? 'button' : null, tabindex: onClick ? 0 : null,
    onkeydown: onClick ? (e) => { if (e.key === 'Enter') onClick(e); } : null },
    exerciseThumb(ex, { animated }),
    h('.grow',
      h('.ex-name', ex.name),
      h('.ex-meta',
        tierBadge(ex),
        sub !== undefined ? h('span', sub) : [
          h('span', muscles || '—'),
          ex.equipment?.length ? [h('i.dot'), h('span', S.equipmentName(ex.equipment[0]))] : null,
          ex.mechanic ? [h('i.dot'), h('span', ex.mechanic === 'compound' ? 'Compound' : 'Isolation')] : null,
        ])),
    right || null);
}

export const favButton = (exId, onDone) => {
  const btn = h(`button.iconbtn.fav-btn${S.isFavorite(exId) ? '.on' : ''}`,
    { 'aria-label': 'Favourite', onclick: (e) => {
      e.stopPropagation();
      const on = S.toggleFavorite(exId);
      btn.classList.toggle('on', on);
      onDone && onDone(on);
    } }, icon('star'));
  return btn;
};

export const statCard = ({ label, value, delta, iconName, tone = 'accent', onClick }) =>
  h(`.stat${onClick ? '.card-hover' : ''}`, { onclick: onClick, style: onClick ? { cursor: 'pointer' } : null },
    iconName ? h('.stat-icon', { style: {
      background: `var(--${tone === 'accent' ? 'accent-soft' : `${tone}-soft`})`,
      color: `var(--${tone === 'accent' ? 'accent' : tone})` } }, icon(iconName)) : null,
    h('.stat-v', value),
    h('.stat-l', label),
    delta ? h('.stat-d', { style: { color: `var(--${delta.tone || 'ink-3'})` } },
      icon(delta.dir === 'up' ? 'arrowUp' : delta.dir === 'down' ? 'arrowDown' : 'minus', 12),
      h('span', delta.text)) : null);

export const sectionTitle = (title, action) =>
  h('.section-title', h('h2', title), action || null);

export const muscleChip = (mid, { onClick, glyph = false } = {}) =>
  h(`span.chip.chip-sm${onClick ? '' : '.chip-static'}`, { onclick: onClick },
    glyph ? muscleGlyph(mid, 14) : null, S.muscleName(mid));

export const setTypeInfo = (id) => SET_TYPES.find((t) => t.id === id) || SET_TYPES[0];

/** Format one logged set for display, respecting the exercise's tracking type. */
export function fmtSet(set, ex, unit) {
  const t = ex?.tracking || 'weight_reps';
  const w = Number(set.weight) || 0, r = Number(set.reps) || 0;
  if (t === 'duration') return set.durationSec ? `${set.durationSec}s` : '—';
  if (t === 'weight_time') return `${w ? `${fmtWeight(w, unit)} × ` : ''}${set.durationSec || 0}s`;
  if (t === 'distance_time') {
    const km = (Number(set.distanceM) || 0) / 1000;
    return `${km ? `${fmtNum(km, 2)} km` : ''}${km && set.durationSec ? ' · ' : ''}${set.durationSec ? `${Math.round(set.durationSec / 60)} min` : ''}` || '—';
  }
  if (t === 'reps') return `${r} reps`;
  if (t === 'weighted_bw') return w ? `+${fmtWeight(w, unit)} × ${r}` : `BW × ${r}`;
  return `${w ? fmtWeight(w, unit) : 'BW'} × ${r}`;
}

/**
 * Exercise picker sheet with live search and quick filters.
 * @param {(ex)=>void} onPick  called per selection
 */
export function exercisePicker({ onPick, multi = false, title = 'Add exercise', exclude = [] } = {}) {
  let q = '', filter = 'all';
  const picked = new Set();
  const listEl = h('.stack.stack-8');
  const all = S.exercises().filter((e) => !exclude.includes(e.id));
  const recent = S.get().recentExercises;

  const build = () => {
    let list = all;
    if (filter === 'favorites') list = list.filter((e) => S.isFavorite(e.id));
    else if (filter === 'recent') list = list.filter((e) => recent.includes(e.id))
      .sort((a, b) => recent.indexOf(a.id) - recent.indexOf(b.id));
    else if (filter === 'custom') list = list.filter((e) => e.custom);
    else if (filter !== 'all') list = list.filter((e) => (e.categories || []).includes(filter));

    if (q) {
      list = list.map((e) => ({ e, s: Math.max(matchScore(e.name, q),
        ...(e.primaryMuscles || []).map((m) => matchScore(S.muscleName(m), q) * 0.5),
        ...(e.tags || []).map((t) => matchScore(t, q) * 0.4)) }))
        .filter((x) => x.s > 0).sort((a, b) => b.s - a.s).map((x) => x.e);
    } else list = [...list].sort((a, b) => a.name.localeCompare(b.name));

    mount(listEl, ...(list.length ? list.slice(0, 200).map((ex) => {
      const on = picked.has(ex.id);
      return exerciseCard(ex, {
        onClick: () => {
          if (multi) {
            if (picked.has(ex.id)) picked.delete(ex.id); else picked.add(ex.id);
            build();
          } else { onPick(ex); ref.close(); }
        },
        right: multi
          ? h(`.set-check${on ? '.done' : ''}`, { style: { pointerEvents: 'none' } }, on ? icon('check') : null)
          : icon('chevronRight'),
      });
    }) : [emptyState({ iconName: 'search', title: 'No matches',
      message: q ? `Nothing matches “${q}”.` : 'Try a different filter.' })]));
  };

  const chips = [
    { id: 'all', label: 'All' },
    { id: 'recent', label: 'Recent' },
    { id: 'favorites', label: 'Favourites' },
    ...S.categories().map((c) => ({ id: c.id, label: c.name })),
    { id: 'custom', label: 'My exercises' },
  ];
  const chipRow = h('.chiprow', ...chips.map((c) =>
    h(`button.chip${filter === c.id ? '.on' : ''}`, { onclick: (e) => {
      filter = c.id;
      [...chipRow.children].forEach((x) => x.classList.remove('on'));
      e.currentTarget.classList.add('on');
      build();
    } }, c.label)));

  const ref = sheet({
    title,
    body: h('.stack.stack-12',
      h('.search', icon('search'),
        h('input.input', { placeholder: 'Search exercises…', autofocus: true,
          oninput: (e) => { q = e.target.value; build(); } })),
      chipRow,
      listEl),
    foot: multi ? h('.row', { style: { width: '100%' } },
      h('button.btn.grow', { onclick: () => ref.close() }, 'Cancel'),
      h('button.btn.btn-primary.grow', { onclick: () => {
        [...picked].forEach((id) => onPick(S.exerciseById(id)));
        ref.close();
      } }, 'Add selected')) : null,
  });
  build();
  return ref;
}

/** Small "last performed" strip used in the builder and active workout. */
export function lastPerfLine(perf, ex, unit) {
  if (!perf) return h('span.t-xs.dim', 'No history yet');
  return h('span.t-xs.dim', `${relDay(perf.date)} · ${perf.sets.slice(0, 4).map((s) => fmtSet(s, ex, unit)).join(', ')}`);
}

export const pill = (text, cls = '') => h(`span.tag${cls ? `.${cls}` : ''}`, text);

export const kv = (label, value) =>
  h('.row-between', { style: { padding: '7px 0' } },
    h('span.t-sm.muted', label), h('span.t-sm.sb', value));
