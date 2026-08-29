import { h, icon, mount, qs, append } from '../lib/dom.js';
import * as S from '../store.js';
import { exercisePicker, exerciseThumb, fmtSet } from '../lib/components.js';
import { sheet, dialog, toast, celebrate, emptyState, confirmDelete, makeSortable } from '../lib/ui.js';
import { lastPerformance, detectPRs, sessionTotals } from '../lib/stats.js';
import { suggestNext, prefillFor } from '../lib/progression.js';
import { fmtClock, fmtWeight, relDay, vibrate, fmtVolume, compactNum, fmtDuration } from '../lib/utils.js';
import { SET_TYPES } from '../data/taxonomy.js';

export const title = 'Active workout';

/* ---------------- rest timer (module-scoped so it survives re-renders) ---------------- */
const Rest = {
  endsAt: null, total: 0, tick: null, el: null,
  start(sec) {
    this.stop();
    this.total = sec; this.endsAt = Date.now() + sec * 1000;
    this.render();
    this.tick = setInterval(() => this.render(), 250);
  },
  add(sec) { if (this.endsAt) { this.endsAt += sec * 1000; this.total += sec; this.render(); } },
  stop() {
    clearInterval(this.tick); this.tick = null; this.endsAt = null;
    if (this.el) { this.el.remove(); this.el = null; }
  },
  render() {
    const left = Math.max(0, Math.round((this.endsAt - Date.now()) / 1000));
    if (!this.el) {
      this.el = h('.rest-bar',
        h('button.iconbtn', { 'aria-label': 'Skip rest', onclick: () => this.stop() }, icon('x')),
        h('.rest-time.num', fmtClock(left)),
        h('.rest-track', h('i')),
        h('button.btn.btn-sm', { onclick: () => this.add(30) }, '+30s'));
      document.body.appendChild(this.el);
    }
    qs('.rest-time', this.el).textContent = fmtClock(left);
    qs('.rest-track > i', this.el).style.width = `${(left / this.total) * 100}%`;
    if (left <= 0) {
      const st = S.settings();
      if (st.restVibrate) vibrate([120, 70, 120]);
      if (st.restSound) beep();
      toast('Rest complete — next set', 'good', 2200);
      this.stop();
    }
  },
};
function beep() {
  try {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return;
    const ctx = new Ctx();
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.connect(g); g.connect(ctx.destination);
    o.frequency.value = 880; o.type = 'sine';
    g.gain.setValueAtTime(0.0001, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.16, ctx.currentTime + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.42);
    o.start(); o.stop(ctx.currentTime + 0.45);
    setTimeout(() => ctx.close(), 700);
  } catch {}
}

/* Wake lock so the screen does not sleep mid-set. */
let wakeLock = null;
async function acquireWakeLock() {
  if (!S.settings().keepScreenAwake || !('wakeLock' in navigator)) return;
  try { wakeLock = await navigator.wakeLock.request('screen'); } catch {}
}
function releaseWakeLock() { try { wakeLock && wakeLock.release(); } catch {} wakeLock = null; }

/* ---------------- view ---------------- */
export function render({ navigate }) {
  const session = S.activeSession();
  if (!session) {
    Rest.stop(); releaseWakeLock();
    return emptyState({ iconName: 'play', title: 'No active workout',
      message: 'Start one from your plan, a template, or as an empty session.',
      action: h('button.btn.btn-primary', { onclick: () => navigate('/workouts') }, 'Go to workouts') });
  }
  acquireWakeLock();

  const unit = S.settings().unit;
  const showRpe = S.settings().showRpe, showRir = S.settings().showRir;
  const sessions = S.completedSessions();
  const root = h('.stack.stack-14', { style: { maxWidth: '760px', margin: '0 auto', paddingBottom: '70px' } });
  const listEl = h('.stack.stack-12');

  /* ---- header ---- */
  const timeEl = h('.stat-v', { style: { fontSize: '1.5rem' } }, fmtClock(S.elapsedSec(session)));
  const statsEl = h('.ex-meta');
  const updateHeader = () => {
    timeEl.textContent = fmtClock(S.elapsedSec(session));
    const t = sessionTotals(session);
    mount(statsEl,
      h('span', `${t.sets} sets`), h('i.dot'),
      h('span', `${t.reps} reps`), h('i.dot'),
      h('span', fmtVolume(t.volume, unit)));
  };
  /* Self-cancelling: stops as soon as this view leaves the document. */
  const timer = setInterval(() => {
    if (!root.isConnected || !S.activeSession()) { clearInterval(timer); return; }
    if (!session.pausedAt) updateHeader();
  }, 1000);

  const header = h('.card.card-pad',
    h('.row-between',
      h('.grow',
        h('input.input', { value: session.name, style: { fontWeight: 700, fontSize: '17px',
          background: 'transparent', border: 'none', padding: 0, height: 'auto' },
          onchange: (e) => S.patchSession(session.id, { name: e.target.value || 'Workout' }) }),
        statsEl),
      h('div', { style: { textAlign: 'right' } },
        timeEl,
        h('.t-xs.dim', session.pausedAt ? 'Paused' : 'Elapsed'))),
    h('.row', { style: { gap: '8px', marginTop: '12px' } },
      h('button.btn.btn-sm.grow', { onclick: () => {
        if (session.pausedAt) { S.resumeSession(); toast('Resumed'); } else { S.pauseSession(); toast('Paused'); }
        location.hash = '#/active'; render_refresh();
      } }, icon(session.pausedAt ? 'play' : 'pause'), session.pausedAt ? 'Resume' : 'Pause'),
      h('button.btn.btn-sm.grow', { onclick: () => notesSheet(session) }, icon('note'), 'Notes'),
      h('button.btn.btn-sm.btn-primary.grow', { onclick: () => finish(session, navigate) },
        icon('check'), 'Finish')));

  /* ---- one exercise ---- */
  function entryCard(entry) {
    const ex = S.exerciseById(entry.exerciseId);
    if (!ex) return h('.card.card-pad', h('.t-sm.dim', 'Exercise unavailable'));
    const prev = lastPerformance(sessions, ex.id);
    const suggestion = suggestNext(sessions, ex, entry.progression || S.ruleFor(ex.id), { unit });
    const track = ex.tracking || 'weight_reps';
    const cols = track === 'duration' ? ['duration']
      : track === 'distance_time' ? ['distance', 'duration']
      : track === 'weight_time' ? ['weight', 'duration']
      : track === 'reps' ? ['reps'] : ['weight', 'reps'];

    const body = h('div');
    const metaEl = h('.ex-meta');
    const doneTag = h('span');
    const updateMeta = () => {
      const doneCount = entry.sets.filter((x) => x.done).length;
      const all = doneCount === entry.sets.length && entry.sets.length > 0;
      mount(metaEl,
        h('span', `${doneCount}/${entry.sets.length} sets`),
        entry.plannedRest ? [h('i.dot'), h('span', `${fmtClock(entry.plannedRest)} rest`)] : null,
        prev ? [h('i.dot'), h('span', `Last ${relDay(prev.date).toLowerCase()}`)] : null);
      mount(doneTag, all ? h('span.tag.tag-good', icon('check', 11)) : null);
    };
    const draw = () => {
      const rows = entry.sets.map((set, i) => {
        const st = SET_TYPES.find((x) => x.id === set.type) || SET_TYPES[0];
        const prevSet = prev?.sets?.[i];
        const inputs = cols.map((c) => {
          if (c === 'weight') return numInput(set, 'weight', unit, set.done, (v) => {
            S.updateSet(session.id, entry.id, set.id, { weight: v }); });
          if (c === 'reps') return numInput(set, 'reps', '', set.done, (v) => {
            S.updateSet(session.id, entry.id, set.id, { reps: v }); }, 'reps');
          if (c === 'duration') return numInput(set, 'durationSec', '', set.done, (v) => {
            S.updateSet(session.id, entry.id, set.id, { durationSec: v }); }, 'sec');
          if (c === 'distance') return numInput(set, 'distanceM', '', set.done, (v) => {
            S.updateSet(session.id, entry.id, set.id, { distanceM: v }); }, 'm');
          return null;
        });

        const check = h(`button.set-check${set.done ? '.done' : ''}`, {
          'aria-label': set.done ? 'Mark set incomplete' : 'Complete set',
          onclick: (e) => toggleSet(entry, set, i, e.currentTarget),
        }, icon('check'));

        return h(`tr.set-row${set.done ? '.done' : ''}`,
          h('td', h(`.set-num${st.cls ? `.${st.cls}` : ''}`, {
            title: `${st.name} — tap to change`, onclick: () => setTypeSheet(entry, set, draw) },
            st.id === 'normal' ? String(entry.sets.slice(0, i + 1).filter((s) => s.type !== 'warmup').length) : st.short)),
          h('td.prev-col', h('.set-prev', prevSet ? fmtSet(prevSet, ex, unit) : '—')),
          ...inputs.map((inp) => h('td', inp)),
          showRpe || showRir ? h('td', h('button.set-input', {
            style: { background: 'transparent', border: '1px dashed var(--line-strong)', fontSize: '12px' },
            onclick: () => rpeSheet(entry, set, draw) },
            set.rpe ? `@${set.rpe}` : set.rir != null ? `${set.rir}R` : '–')) : null,
          h('td', check));
      });

      mount(body,
        h('table.set-table',
          h('tr',
            h('th', 'SET'), h('th.prev-col', 'PREVIOUS'),
            ...cols.map((c) => h('th', c === 'weight' ? unit.toUpperCase()
              : c === 'reps' ? 'REPS' : c === 'duration' ? 'SEC' : 'M')),
            showRpe || showRir ? h('th', showRpe ? 'RPE' : 'RIR') : null,
            h('th', '')),
          ...rows),
        h('.row', { style: { gap: '8px', marginTop: '8px' } },
          h('button.btn.btn-sm.grow', { onclick: () => {
            const s = S.addSet(session.id, entry.id);
            const pf = prefillFor(sessions, ex, entry.progression || S.ruleFor(ex.id), entry.sets.length - 1, unit);
            if (s && s.weight == null && pf.weight) S.updateSet(session.id, entry.id, s.id, { weight: pf.weight });
            draw();
          } }, icon('plus'), 'Add set'),
          h('button.btn.btn-sm', { onclick: () => {
            const s = S.addSet(session.id, entry.id, { type: 'warmup', weight: null, reps: null });
            draw();
          } }, 'Warm-up'),
          h('button.btn.btn-sm', { onclick: () => setListSheet(entry, draw) }, icon('list'), 'Edit sets')));
      updateMeta();
    };

    function toggleSet(entry, set, i, btn) {
      const next = !set.done;
      const patch = { done: next, ts: next ? Date.now() : null };
      /* One-tap completion: if the fields are empty, accept the pre-filled suggestion. */
      if (next) {
        const pf = prefillFor(sessions, ex, entry.progression || S.ruleFor(ex.id), i, unit);
        if (cols.includes('weight') && (set.weight === null || set.weight === '')) patch.weight = pf.weight || null;
        if (cols.includes('reps') && (set.reps === null || set.reps === '')) patch.reps = pf.reps || null;
        if (cols.includes('duration') && !set.durationSec && set.targetReps) patch.durationSec = set.targetReps[0];
      }
      S.updateSet(session.id, entry.id, set.id, patch);
      if (next) {
        btn.classList.add('done', 'pop');
        vibrate(18);
        setTimeout(() => btn.classList.remove('pop'), 320);
        if (S.settings().restAutoStart && set.type !== 'warmup') {
          Rest.start(entry.plannedRest || S.settings().defaultRestSec);
        }
      } else btn.classList.remove('done');
      draw();
      updateHeader();
    }

    draw();

    return h('.card.card-pad.stack.stack-10', { dataset: { sortId: entry.id } },
      h('.row', { style: { gap: '10px' } },
        h('span.drag-handle', icon('drag')),
        exerciseThumb(ex),
        h('.grow',
          h('.row', { style: { gap: '6px', alignItems: 'center' } },
            h('button', { style: { background: 'none', border: 'none', padding: 0, fontWeight: 650,
              fontSize: '15px', textAlign: 'left', cursor: 'pointer' },
              onclick: () => navigate(`/exercise/${ex.id}`) }, ex.name),
            doneTag),
          metaEl),
        h('button.iconbtn', { 'aria-label': 'Options', onclick: () => entryMenu(entry, ex, navigate) }, icon('more'))),

      /* progression suggestion */
      suggestion.last ? h('.suggest',
        h('.row', { style: { gap: '8px', alignItems: 'flex-start' } },
          h('span', { style: { color: 'var(--accent)', flex: 'none' } }, icon('bolt', 16)),
          h('.grow',
            h('.row', { style: { gap: '6px', flexWrap: 'wrap' } },
              h('span.t-sm.b', suggestion.headline),
              h('span.tag.tag-accent', 'Suggestion')),
            h('.t-xs.muted', { style: { marginTop: '3px', lineHeight: 1.5 } }, suggestion.rationale),
            h('.row.wrap', { style: { gap: '6px', marginTop: '8px' } },
              ...suggestion.options.slice(0, 3).map((o) =>
                h('button.chip.chip-sm', { onclick: () => applySuggestion(entry, o, draw) }, o.label))))))
        : null,

      /* last time */
      prev ? h('.row-between', { style: { padding: '2px 0' } },
        h('span.t-xs.dim', `Last time · ${relDay(prev.date)}`),
        h('span.t-xs.dim.mono', prev.sets.slice(0, 4).map((s) => fmtSet(s, ex, unit)).join('  ·  '))) : null,

      body,
      entry.notes ? h('.t-xs.muted', { style: { fontStyle: 'italic' } }, entry.notes) : null);
  }

  function applySuggestion(entry, opt, draw) {
    const targets = entry.sets.filter((s) => s.type !== 'warmup' && !s.done);
    for (const s of targets) {
      const patch = {};
      if (opt.weight != null) patch.weight = opt.weight;
      if (opt.reps != null) patch.reps = null;   // reps stay empty; the suggestion sets the target
      if (opt.reps != null) patch.targetReps = [opt.reps, opt.reps];
      S.updateSet(session.id, entry.id, s.id, patch);
    }
    if (opt.sets && opt.sets > entry.sets.filter((s) => s.type !== 'warmup').length) {
      const need = opt.sets - entry.sets.filter((s) => s.type !== 'warmup').length;
      for (let i = 0; i < need; i++) S.addSet(session.id, entry.id, { weight: opt.weight ?? null });
    }
    toast(`Applied: ${opt.label}`, 'good');
    draw();
  }

  function entryMenu(entry, ex, navigate) {
    const ref = sheet({ title: ex.name, body: h('.stack',
      h('button.listrow', { onclick: () => { ref.close(); navigate(`/exercise/${ex.id}`); } },
        icon('info'), h('.grow.sb', 'Exercise guide'), icon('chevronRight')),
      h('button.listrow', { onclick: () => { ref.close(); restSheet(entry, drawList); } },
        icon('timer'), h('.grow', h('div.sb', 'Rest time'),
          h('.t-xs.dim', fmtClock(entry.plannedRest || 90))), icon('chevronRight')),
      h('button.listrow', { onclick: () => { ref.close(); noteSheet(entry, drawList); } },
        icon('note'), h('.grow.sb', 'Exercise note'), icon('chevronRight')),
      h('button.listrow', { onclick: () => { ref.close();
        exercisePicker({ title: 'Swap for', onPick: (n) => {
          entry.exerciseId = n.id; S.patchSession(session.id, {}); drawList(); toast(`Swapped to ${n.name}`);
        } }); } }, icon('swap'), h('.grow.sb', 'Swap exercise'), icon('chevronRight')),
      h('button.listrow', { onclick: () => {
        entry.sets.forEach((s) => S.updateSet(session.id, entry.id, s.id, { done: false, ts: null }));
        ref.close(); drawList(); toast('Sets reset');
      } }, icon('refresh'), h('.grow.sb', 'Reset all sets')),
      h('button.listrow', { style: { color: 'var(--bad)' }, onclick: async () => {
        ref.close();
        if (await confirmDelete('this exercise from the session', 'Any sets you logged for it will be removed.')) {
          S.removeSessionExercise(session.id, entry.id); drawList();
        }
      } }, icon('trash'), h('.grow.sb', 'Remove exercise')),
    ) });
  }

  function drawList() {
    const s = S.activeSession();
    if (!s) return;
    if (!s.entries.length) {
      mount(listEl, emptyState({ iconName: 'plus', title: 'Empty session',
        message: 'Add your first exercise and start logging sets.',
        action: h('button.btn.btn-primary', { onclick: addExercise }, icon('plus'), 'Add exercise') }));
      return;
    }
    mount(listEl, ...s.entries.map(entryCard));
    makeSortable(listEl, { onReorder: (ids) => S.reorderSessionEntries(session.id, ids) });
    updateHeader();
  }

  function addExercise() {
    exercisePicker({ multi: true, title: 'Add to workout',
      exclude: session.entries.map((e) => e.exerciseId),
      onPick: (ex) => { S.addSessionExercise(session.id, ex.id); drawList(); } });
  }

  const render_refresh = () => { drawList(); updateHeader(); };

  append(root, [header, listEl,
    h('.row', { style: { gap: '10px' } },
      h('button.btn.grow', { onclick: addExercise }, icon('plus'), 'Add exercise'),
      h('button.btn', { onclick: () => Rest.start(S.settings().defaultRestSec) }, icon('timer'), 'Rest')),
    h('button.btn.btn-lg.btn-primary.btn-block', { onclick: () => finish(session, navigate) },
      icon('check'), 'Finish workout'),
    h('button.btn.btn-ghost.btn-block', { style: { color: 'var(--bad)' }, onclick: async () => {
      if (await dialog({ title: 'Discard this workout?',
        message: 'Everything logged in this session will be deleted.', confirmText: 'Discard',
        danger: true, iconName: 'trash' })) {
        Rest.stop(); releaseWakeLock(); S.discardSession(session.id); navigate('/workouts');
      }
    } }, 'Discard workout')]);

  drawList();
  return root;
}

/* ---------------- inputs ---------------- */
function numInput(set, field, unit, done, onChange, placeholder) {
  const toDisplay = (v) => {
    if (v === null || v === undefined || v === '') return '';
    if (field === 'weight' && unit === 'lb') return +(v / 0.45359237).toFixed(2);
    return v;
  };
  const inp = h('input.set-input', {
    type: 'number', inputmode: 'decimal', step: 'any',
    value: toDisplay(set[field]),
    placeholder: placeholder || (set.targetReps && field === 'reps' ? String(set.targetReps[1] ?? '') : (unit || '')),
    'aria-label': field,
    onfocus: (e) => e.target.select(),
    onchange: (e) => {
      const raw = parseFloat(e.target.value);
      if (Number.isNaN(raw)) { onChange(null); return; }
      onChange(field === 'weight' && unit === 'lb' ? raw * 0.45359237 : raw);
    },
  });
  return inp;
}

function setTypeSheet(entry, set, draw) {
  const session = S.activeSession();
  const ref = sheet({ title: 'Set type', body: h('.stack',
    ...SET_TYPES.map((t) => h('button.listrow', { onclick: () => {
      S.updateSet(session.id, entry.id, set.id, { type: t.id }); ref.close(); draw();
    } }, h(`.set-num${t.cls ? `.${t.cls}` : ''}`, t.short),
      h('.grow.sb', t.name), set.type === t.id ? icon('check') : null)),
    h('.divider'),
    h('button.listrow', { onclick: () => { S.duplicateSet(session.id, entry.id, set.id); ref.close(); draw(); } },
      icon('copy'), h('.grow.sb', 'Duplicate set')),
    h('button.listrow', { style: { color: 'var(--bad)' }, onclick: () => {
      S.removeSet(session.id, entry.id, set.id); ref.close(); draw();
    } }, icon('trash'), h('.grow.sb', 'Delete set')),
  ) });
}

function rpeSheet(entry, set, draw) {
  const session = S.activeSession();
  const showRir = S.settings().showRir;
  const ref = sheet({ title: showRir ? 'Reps in reserve' : 'Rate of perceived exertion',
    body: h('.stack.stack-14',
      h('.t-sm.muted', showRir
        ? 'How many more reps could you have done with good form?'
        : 'How hard was that set? 10 means you could not have done another rep.'),
      h('.grid', { style: { gridTemplateColumns: 'repeat(4,1fr)', gap: '8px' } },
        ...(showRir ? [0, 1, 2, 3, 4, 5] : [6, 6.5, 7, 7.5, 8, 8.5, 9, 9.5, 10]).map((v) =>
          h('button.btn', { style: {
            borderColor: (showRir ? set.rir : set.rpe) === v ? 'var(--accent)' : undefined,
            background: (showRir ? set.rir : set.rpe) === v ? 'var(--accent-soft)' : undefined },
            onclick: () => {
              S.updateSet(session.id, entry.id, set.id, showRir
                ? { rir: v, rpe: 10 - v } : { rpe: v, rir: Math.max(0, 10 - v) });
              ref.close(); draw();
            } }, String(v)))),
      h('.t-xs.dim', showRir
        ? '0 RIR is failure. Most hypertrophy work sits at 1–3 RIR.'
        : 'RPE 7–9 is the productive range for most training.'),
      h('button.btn.btn-block', { onclick: () => {
        S.updateSet(session.id, entry.id, set.id, { rpe: null, rir: null }); ref.close(); draw();
      } }, 'Clear')) });
}

function setListSheet(entry, draw) {
  const session = S.activeSession();
  const ref = sheet({ title: 'Edit sets', body: (() => {
    const wrap = h('.stack.stack-8');
    const build = () => mount(wrap, ...entry.sets.map((s, i) => h('.row', { style: { gap: '8px' } },
      h('span.set-num', String(i + 1)),
      h('.grow.t-sm', `${(SET_TYPES.find((t) => t.id === s.type) || SET_TYPES[0]).name}${s.done ? ' · done' : ''}`),
      h('button.btn.btn-xs', { onclick: () => { S.duplicateSet(session.id, entry.id, s.id); build(); draw(); } }, icon('copy', 13)),
      h('button.btn.btn-xs.btn-danger', { onclick: () => { S.removeSet(session.id, entry.id, s.id); build(); draw(); } }, icon('trash', 13)))),
      h('button.btn.btn-sm.btn-block', { onclick: () => { S.addSet(session.id, entry.id); build(); draw(); } },
        icon('plus'), 'Add set'));
    build();
    return wrap;
  })() });
}

function restSheet(entry, draw) {
  const ref = sheet({ title: 'Rest between sets', body: h('.grid.grid-3',
    ...[30, 45, 60, 75, 90, 120, 150, 180, 240, 300].map((v) =>
      h('button.btn', { style: { borderColor: entry.plannedRest === v ? 'var(--accent)' : undefined,
        background: entry.plannedRest === v ? 'var(--accent-soft)' : undefined },
        onclick: () => { entry.plannedRest = v; S.patchSession(S.activeSession().id, {}); ref.close(); draw(); } },
        fmtClock(v)))) });
}

function noteSheet(entry, draw) {
  const ta = h('textarea.textarea', { placeholder: 'How did it feel? Anything to remember?' }, entry.notes || '');
  const ref = sheet({ title: 'Exercise note', body: ta,
    foot: h('button.btn.btn-primary.btn-block', { onclick: () => {
      entry.notes = ta.value; S.patchSession(S.activeSession().id, {}); ref.close(); draw();
    } }, 'Save note') });
}

function notesSheet(session) {
  const ta = h('textarea.textarea', { placeholder: 'Session notes — energy, sleep, anything worth recording',
    style: { minHeight: '140px' } }, session.notes || '');
  const ref = sheet({ title: 'Workout notes', body: ta,
    foot: h('button.btn.btn-primary.btn-block', { onclick: () => {
      S.patchSession(session.id, { notes: ta.value }); ref.close(); toast('Notes saved', 'good');
    } }, 'Save') });
}

/* ---------------- finish ---------------- */
async function finish(session, navigate) {
  const loggedSets = session.entries.reduce((n, e) => n + e.sets.filter((s) => s.done).length, 0);
  if (!loggedSets) {
    const ok = await dialog({ title: 'Nothing logged yet',
      message: 'No sets were marked complete. Finishing now will discard this session.',
      confirmText: 'Discard', danger: true, iconName: 'alert' });
    if (ok) { Rest.stop(); releaseWakeLock(); S.discardSession(session.id); navigate('/workouts'); }
    return;
  }
  const incomplete = session.entries.reduce((n, e) => n + e.sets.filter((s) => !s.done).length, 0);
  if (S.settings().confirmFinish) {
    const ok = await dialog({ title: 'Finish workout?',
      message: incomplete
        ? `${loggedSets} sets logged. ${incomplete} unfinished set${incomplete > 1 ? 's' : ''} will be dropped.`
        : `${loggedSets} sets logged. Nice session.`,
      confirmText: 'Finish', iconName: 'check' });
    if (!ok) return;
  }

  const before = S.completedSessions();
  const finished = S.finishSession(session.id);
  const prs = detectPRs([...before, finished], finished);
  if (prs.length) { S.patchSession(finished.id, { prs }); celebrate(46); }
  Rest.stop(); releaseWakeLock();
  summarySheet(finished, prs, navigate);
}

function summarySheet(session, prs, navigate) {
  const unit = S.settings().unit;
  const t = sessionTotals(session);
  const idx = S.exerciseIndex();
  const prLabels = { weight: 'Heaviest weight', reps: 'Most reps', e1rm: 'Best estimated 1RM',
    volume: 'Most volume', first: 'First time logged' };

  const ref = sheet({ title: 'Workout complete', dismissible: false, body: h('.stack.stack-16',
    h('div', { style: { textAlign: 'center', padding: '4px 0' } },
      h('div', { style: { width: '62px', height: '62px', borderRadius: '20px', margin: '0 auto 12px',
        background: 'var(--good-soft)', color: 'var(--good)', display: 'grid', placeItems: 'center' } }, icon('check', 30)),
      h('h2', session.name),
      h('.t-sm.dim', { style: { marginTop: '4px' } }, relDay(session.date))),

    h('.grid.grid-2',
      h('.stat', h('.stat-v', fmtDuration(t.durationSec)), h('.stat-l', 'Duration')),
      h('.stat', h('.stat-v', String(t.sets)), h('.stat-l', 'Sets')),
      h('.stat', h('.stat-v', String(t.reps)), h('.stat-l', 'Reps')),
      h('.stat', h('.stat-v', compactNum(unit === 'lb' ? t.volume / 0.45359237 : t.volume)), h('.stat-l', `Volume (${unit})`))),

    prs.length ? h('.stack.stack-8',
      h('.row', { style: { gap: '8px' } },
        h('span', { style: { color: 'var(--warn)' } }, icon('trophy', 18)),
        h('div.sb', `${prs.length} personal record${prs.length > 1 ? 's' : ''}`)),
      ...prs.slice(0, 6).map((p) => h('.pr-banner',
        icon('trophy', 18),
        h('.grow',
          h('div', { style: { fontSize: '13.5px' } }, idx[p.exerciseId]?.name || 'Exercise'),
          h('div', { style: { fontSize: '11.5px', opacity: .9, fontWeight: 600 } },
            `${prLabels[p.kind] || p.kind}${p.kind === 'weight' ? ` · ${fmtWeight(p.value, unit)}`
              : p.kind === 'reps' ? ` · ${p.reps} @ ${fmtWeight(p.weight, unit)}`
              : p.kind === 'e1rm' ? ` · ${fmtWeight(p.value, unit)}`
              : p.kind === 'volume' ? ` · ${compactNum(unit === 'lb' ? p.value / 0.45359237 : p.value)} ${unit}` : ''}`))))) : null,

    session.notes ? h('.card.card-pad', h('.t-sm.muted', session.notes)) : null,
  ),
  foot: h('.row', { style: { width: '100%' } },
    h('button.btn.grow', { onclick: () => { ref.close(); navigate(`/history/${session.id}`); } }, 'View details'),
    h('button.btn.btn-primary.grow', { onclick: () => { ref.close(); navigate('/'); } }, 'Done')) });
}
