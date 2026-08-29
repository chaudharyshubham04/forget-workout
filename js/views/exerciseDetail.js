import { h, icon, mount } from '../lib/dom.js';
import * as S from '../store.js';
import { demoPlayer, favButton, diffOf, exerciseCard, fmtSet, pill, kv, exerciseTier } from '../lib/components.js';
import { bodyMapPair } from '../lib/anatomy.js';
import { sparkline, lineChart } from '../lib/charts.js';
import { exerciseHistory, exercisePRs, lastPerformance } from '../lib/stats.js';
import { analyseProgress, suggestNext } from '../lib/progression.js';
import { MOVEMENTS, PROGRESSION_METHODS } from '../data/taxonomy.js';
import { fmtWeight, relDay, fmtDate, compactNum, e1rm, prettify } from '../lib/utils.js';
import { sheet, dialog, confirmDelete, toast, emptyState, segmented } from '../lib/ui.js';

export const title = (ctx) => S.exerciseById(ctx.params.id)?.name || 'Exercise';

export const actions = (ctx) => {
  const ex = S.exerciseById(ctx.params.id);
  if (!ex) return [];
  return [
    favButton(ex.id),
    h('button.iconbtn', { 'aria-label': 'More', onclick: () => openMenu(ex, ctx) }, icon('more')),
  ];
};

export function render({ params, navigate }) {
  const ex = S.exerciseById(params.id);
  if (!ex) return emptyState({ iconName: 'search', title: 'Exercise not found',
    message: 'It may have been deleted.',
    action: h('button.btn.btn-primary', { onclick: () => navigate('/exercises') }, 'Back to library') });

  S.markRecent(ex.id);
  const unit = S.settings().unit;
  const sessions = S.completedSessions();
  const hist = exerciseHistory(sessions, ex.id);
  const prs = exercisePRs(sessions, ex.id);
  const analysis = analyseProgress(sessions, ex.id);
  const suggestion = suggestNext(sessions, ex, S.ruleFor(ex.id), { unit });
  const last = hist[0];

  const tabBody = h('div');
  let tab = 'guide';
  const tabs = [['guide', 'Guide'], ['muscles', 'Muscles'], ['history', 'History'], ['related', 'Related']];
  const tabBar = h('.seg', ...tabs.map(([id, label]) =>
    h(`button${tab === id ? '.on' : ''}`, { onclick: (e) => {
      tab = id;
      [...tabBar.children].forEach((c) => c.classList.remove('on'));
      e.currentTarget.classList.add('on');
      drawTab();
    } }, label)));

  const drawTab = () => mount(tabBody,
    tab === 'guide' ? guideTab(ex)
    : tab === 'muscles' ? musclesTab(ex, navigate)
    : tab === 'history' ? historyTab(ex, hist, prs, unit, navigate)
    : relatedTab(ex, navigate));

  drawTab();

  const meta = h('.row.wrap', { style: { gap: '6px' } },
    pill(ex.mechanic === 'compound' ? 'Compound' : 'Isolation', 'tag-accent'),
    pill(MOVEMENTS.find((m) => m.id === ex.movement)?.name || prettify(ex.movement || '')),
    h('span.tag', { style: { background: `${diffOf(ex.difficulty).color}22`, color: diffOf(ex.difficulty).color } },
      diffOf(ex.difficulty).name),
    ...(ex.equipment || []).map((q) => pill(S.equipmentName(q))),
    ex.unilateral ? pill('Unilateral') : null,
    (() => { const t = exerciseTier(ex); return t ? pill(t.label, t.cls) : null; })(),
    ex.edited ? pill('Edited', 'tag-info') : null);

  return h('.stack.stack-16',
    demoPlayer(ex),
    h('div',
      h('h1', ex.name),
      h('.t-sm.muted', { style: { marginTop: '4px' } },
        (ex.primaryMuscles || []).map((m) => S.muscleName(m)).join(' · '))),
    meta,
    ex.description ? h('p.muted', { style: { lineHeight: 1.65 } }, ex.description) : null,

    /* progression status + suggestion */
    hist.length ? h('.card.card-pad.stack.stack-12',
      h('.row-between',
        h('.row', { style: { gap: '8px' } },
          h(`span.status-pill.${analysis.cls}`, h('i'), analysis.label),
          hist.length >= 2 ? h('span.t-xs.dim', `${analysis.sessionsUsed} sessions`) : null),
        h('button.link', { onclick: () => navigate(`/progress/${ex.id}`) }, 'Analytics')),
      h('.t-sm.muted', { style: { lineHeight: 1.55 } }, analysis.reason),
      hist.length >= 3 ? h('.row-between', { style: { marginTop: '2px' } },
        h('span.t-xs.dim', 'Estimated 1RM trend'),
        sparkline(hist.slice(0, 12).reverse().map((x) => x.bestE1rm), { width: 110, height: 28 })) : null)
      : null,

    last ? h('.card.card-pad.stack.stack-10',
      h('.row-between',
        h('div.sb', 'Last performance'),
        h('span.t-xs.dim', relDay(last.date))),
      h('.stack', { style: { gap: '4px' } }, ...last.sets.map((s, i) =>
        h('.row-between', { style: { padding: '3px 0' } },
          h('span.t-sm.dim', `Set ${i + 1}`),
          h('span.t-sm.sb.mono', fmtSet(s, ex, unit)),
          h('span.t-xs.dim', s.rpe ? `RPE ${s.rpe}` : s.rir != null ? `${s.rir} RIR` : '')))),
      h('.divider'),
      h('div',
        h('.row', { style: { gap: '7px', marginBottom: '4px' } },
          h('span', { style: { color: 'var(--accent)' } }, icon('bolt', 15)),
          h('span.sb', suggestion.headline),
          h('span.tag.tag-accent', 'Suggestion')),
        h('.t-sm.muted', { style: { lineHeight: 1.55 } }, suggestion.rationale)),
      h('.row.wrap', { style: { gap: '6px' } },
        ...suggestion.options.slice(0, 3).map((o) => h('span.chip.chip-sm.chip-static', o.label))))
      : h('.card.card-pad',
          h('.row', { style: { gap: '10px', alignItems: 'flex-start' } },
            h('span', { style: { color: 'var(--accent)' } }, icon('info', 18)),
            h('.grow',
              h('div.sb', 'No history yet'),
              h('.t-sm.muted', { style: { marginTop: '3px', lineHeight: 1.5 } }, suggestion.rationale)))),

    tabBar,
    tabBody,

    h('.row', { style: { gap: '10px' } },
      h('button.btn.btn-primary.btn-lg.grow', { onclick: () => addToWorkout(ex, navigate) },
        icon('plus'), 'Add to workout')));
}

/* ---------------- tabs ---------------- */
function guideTab(ex) {
  const list = (title, items, iconName, tone) => (items && items.length)
    ? h('.card.card-pad.stack.stack-10',
        h('.row', { style: { gap: '8px' } },
          h('span', { style: { color: `var(--${tone})` } }, icon(iconName, 17)),
          h('div.sb', title)),
        h('.stack', { style: { gap: '9px' } }, ...items.map((t, i) =>
          h('.row', { style: { gap: '10px', alignItems: 'flex-start' } },
            iconName === 'list'
              ? h('span', { style: { flex: 'none', width: '22px', height: '22px', borderRadius: '7px',
                  background: 'var(--accent-soft)', color: 'var(--accent)', fontSize: '11px',
                  fontWeight: 800, display: 'grid', placeItems: 'center' } }, String(i + 1))
              : h('span', { style: { flex: 'none', color: `var(--${tone})`, marginTop: '2px' } }, icon(iconName === 'alert' ? 'x' : 'check', 14)),
            h('.t-sm', { style: { lineHeight: 1.55 } }, t)))))
    : null;

  return h('.stack.stack-12',
    list('How to perform it', ex.instructions, 'list', 'accent'),
    ex.cues?.length ? h('.card.card-pad.stack.stack-10',
      h('.row', { style: { gap: '8px' } },
        h('span', { style: { color: 'var(--info)' } }, icon('sparkle', 17)),
        h('div.sb', 'Form cues')),
      h('.row.wrap', { style: { gap: '7px' } },
        ...ex.cues.map((c) => h('span.chip.chip-sm.chip-static', `“${c}”`)))) : null,
    list('Common mistakes', ex.mistakes, 'alert', 'bad'),
    list('Safety & tips', ex.tips, 'shield', 'good'),
    ex.tags?.length ? h('.row.wrap', { style: { gap: '6px' } },
      ...ex.tags.map((t) => h('span.tag', prettify(t)))) : null);
}

function musclesTab(ex, navigate) {
  const primary = ex.primaryMuscles || [], secondary = ex.secondaryMuscles || [];
  return h('.stack.stack-14',
    h('.card.card-pad', bodyMapPair({ primary, secondary })),
    h('.row', { style: { gap: '16px', justifyContent: 'center' } },
      h('.row', { style: { gap: '6px' } },
        h('i', { style: { width: '11px', height: '11px', borderRadius: '3px', background: 'var(--accent)', display: 'block' } }),
        h('span.t-xs.dim', 'Primary')),
      h('.row', { style: { gap: '6px' } },
        h('i', { style: { width: '11px', height: '11px', borderRadius: '3px',
          background: 'hsl(var(--accent-h) var(--accent-s) var(--accent-l) / .42)', display: 'block' } }),
        h('span.t-xs.dim', 'Secondary'))),
    h('.card.card-pad.stack.stack-10',
      h('div.sb', 'Primary muscles'),
      h('.row.wrap', { style: { gap: '6px' } }, ...(primary.length ? primary : ['—']).map((m) =>
        m === '—' ? h('span.t-sm.dim', '—')
          : h('button.chip.chip-sm.on', { onclick: () => navigate(`/exercises?muscle=${m}`) }, S.muscleName(m)))),
      secondary.length ? [h('.divider'), h('div.sb', 'Secondary muscles'),
        h('.row.wrap', { style: { gap: '6px' } }, ...secondary.map((m) =>
          h('button.chip.chip-sm', { onclick: () => navigate(`/exercises?muscle=${m}`) }, S.muscleName(m))))] : null),
    h('.card.card-pad.stack', { style: { gap: '2px' } },
      kv('Mechanic', ex.mechanic === 'compound' ? 'Compound' : 'Isolation'),
      kv('Movement pattern', MOVEMENTS.find((m) => m.id === ex.movement)?.name || prettify(ex.movement || '—')),
      kv('Force', prettify(ex.force || '—')),
      kv('Difficulty', diffOf(ex.difficulty).name),
      kv('Equipment', (ex.equipment || []).map((q) => S.equipmentName(q)).join(', ') || '—'),
      kv('Categories', (ex.categories || []).map((c) => S.categoryIndex()[c]?.name).filter(Boolean).join(', ') || '—'),
      kv('Tracked as', ex.tracking === 'weight_reps' ? 'Weight × reps'
        : ex.tracking === 'duration' ? 'Duration'
        : ex.tracking === 'distance_time' ? 'Distance & time'
        : ex.tracking === 'weighted_bw' ? 'Bodyweight + added'
        : ex.tracking === 'reps' ? 'Reps only' : 'Weight × duration')));
}

function historyTab(ex, hist, prs, unit, navigate) {
  if (!hist.length) return emptyState({ iconName: 'history', title: 'Not performed yet',
    message: 'Once you log this exercise, every set is stored here by date so you can see exactly how you have progressed.' });

  const prCard = prs ? h('.grid.grid-2',
    prs.heaviest ? prCell('Heaviest', `${fmtWeight(prs.heaviest.weight, unit)}`, `× ${prs.heaviest.reps} · ${fmtDate(prs.heaviest.date, 'short')}`) : null,
    prs.bestE1rm ? prCell('Best est. 1RM', fmtWeight(prs.bestE1rm.value, unit), `${fmtWeight(prs.bestE1rm.weight, unit)} × ${prs.bestE1rm.reps}`) : null,
    prs.mostReps ? prCell('Most reps', `${prs.mostReps.reps}`, `at ${fmtWeight(prs.mostReps.weight, unit)}`) : null,
    prs.bestSessionVolume ? prCell('Best session volume', compactNum(unit === 'lb' ? prs.bestSessionVolume.value / 0.45359237 : prs.bestSessionVolume.value) + ` ${unit}`, fmtDate(prs.bestSessionVolume.date, 'short')) : null) : null;

  return h('.stack.stack-14',
    prCard,
    h('.row-between',
      h('div.sb', `${hist.length} session${hist.length === 1 ? '' : 's'} logged`),
      h('button.link', { onclick: () => navigate(`/progress/${ex.id}`) }, 'Charts & analytics')),
    ...hist.map((entry) => h('.card.card-pad.stack.stack-8',
      h('.row-between',
        h('div',
          h('div.sb', fmtDate(entry.date, 'med')),
          h('.t-xs.dim', `${relDay(entry.date)} · ${entry.name || 'Workout'}`)),
        h('button.btn.btn-xs', { onclick: () => navigate(`/history/${entry.sessionId}`) }, 'Open')),
      h('.stack', { style: { gap: '3px' } }, ...entry.sets.map((s, i) =>
        h('.row-between', { style: { padding: '2px 0' } },
          h('span.t-xs.dim', `Set ${i + 1}`),
          h('span.t-sm.mono.sb', fmtSet(s, ex, unit)),
          h('span.t-xs.dim', s.rpe ? `RPE ${s.rpe}` : s.rir != null ? `${s.rir} RIR` : '·')))),
      h('.row-between', { style: { paddingTop: '4px', borderTop: '1px solid var(--line)' } },
        h('span.t-xs.dim', `Volume ${compactNum(unit === 'lb' ? entry.volume / 0.45359237 : entry.volume)} ${unit}`),
        h('span.t-xs.dim', `Est. 1RM ${fmtWeight(entry.bestE1rm, unit)}`)))));
}
const prCell = (label, value, sub) => h('.stat',
  h('.stat-v', { style: { fontSize: '1.2rem' } }, value),
  h('.stat-l', label), h('.t-xs.dim', { style: { marginTop: '3px' } }, sub));

function relatedTab(ex, navigate) {
  const idx = S.exerciseIndex();
  const group = (label, ids, note) => {
    if (!ids || !ids.length) return null;
    const resolved = ids.map((id) => idx[id]).filter(Boolean);
    const unresolved = ids.filter((id) => !idx[id]);
    return h('.stack.stack-8',
      h('.row-between', h('div.sb', label), note ? h('span.t-xs.dim', note) : null),
      ...resolved.map((e) => exerciseCard(e, { onClick: () => navigate(`/exercise/${e.id}`),
        right: icon('chevronRight') })),
      unresolved.length ? h('.row.wrap', { style: { gap: '6px' } },
        ...unresolved.map((id) => h('button.chip.chip-sm', {
          onclick: () => navigate(`/exercises?q=${encodeURIComponent(prettify(id))}`) },
          prettify(id), icon('search', 12)))) : null);
  };
  const blocks = [
    group('Alternatives', ex.alternatives, 'Swap in when equipment is busy'),
    group('Variations', ex.variations, 'Different angles of the same movement'),
    group('Similar exercises', ex.similarExercises),
  ].filter(Boolean);
  return blocks.length ? h('.stack.stack-16', ...blocks)
    : emptyState({ iconName: 'link', title: 'No related exercises',
        message: 'Add alternatives and variations by editing this exercise.' });
}

/* ---------------- actions ---------------- */
function addToWorkout(ex, navigate) {
  const active = S.activeSession();
  const templates = S.templates();
  const ref = sheet({ title: 'Add to', body: h('.stack',
    active ? h('button.listrow', { onclick: () => {
      S.addSessionExercise(active.id, ex.id); ref.close();
      toast(`${ex.name} added to your active workout`, 'good'); navigate('/active');
    } }, h('span', { style: { color: 'var(--accent)' } }, icon('play')),
      h('.grow', h('div.sb', 'Active workout'), h('.t-xs.dim', active.name)), icon('chevronRight')) : null,
    h('button.listrow', { onclick: () => {
      const t = S.createTemplate({ name: `${ex.name} workout` });
      const b = S.blockOf([S.newEntry(ex.id)]);
      S.updateTemplate(t.id, { blocks: [b] });
      ref.close(); navigate(`/builder/${t.id}`);
    } }, icon('plus'), h('.grow.sb', 'New workout template'), icon('chevronRight')),
    ...templates.map((t) => h('button.listrow', { onclick: () => {
      const blocks = [...(t.blocks || [])];
      if (!blocks.length) blocks.push(S.blockOf([]));
      blocks[blocks.length - 1].entries.push(S.newEntry(ex.id));
      S.updateTemplate(t.id, { blocks });
      ref.close(); toast(`Added to ${t.name}`, 'good');
    } }, icon('dumbbell'), h('.grow', h('div.sb', t.name),
      h('.t-xs.dim', `${(t.blocks || []).reduce((n, b) => n + b.entries.length, 0)} exercises`)), icon('plus'))),
  ) });
}

function openMenu(ex, ctx) {
  const isCustom = !!ex.custom;
  const ref = sheet({ title: ex.name, body: h('.stack',
    h('button.listrow', { onclick: () => { ref.close(); location.hash = `#/exercise/${ex.id}/edit`; } },
      icon('edit'), h('.grow.sb', isCustom ? 'Edit exercise' : 'Customise exercise'), icon('chevronRight')),
    h('button.listrow', { onclick: () => { ref.close(); openRuleSheet(ex, ctx); } },
      icon('bolt'), h('.grow', h('div.sb', 'Progression rule'),
        h('.t-xs.dim', ruleSummary(S.ruleFor(ex.id)))), icon('chevronRight')),
    h('button.listrow', { onclick: () => { ref.close(); location.hash = `#/progress/${ex.id}`; } },
      icon('chartline'), h('.grow.sb', 'Analytics & charts'), icon('chevronRight')),
    h('button.listrow', { onclick: () => {
      const copy = S.createExercise({ ...ex, id: undefined, name: `${ex.name} (copy)`, custom: true });
      ref.close(); location.hash = `#/exercise/${copy.id}/edit`;
    } }, icon('copy'), h('.grow.sb', 'Duplicate'), icon('chevronRight')),
    ex.edited && !isCustom ? h('button.listrow', { onclick: async () => {
      ref.close();
      if (await dialog({ title: 'Reset to default?', message: 'Your customisations to this predefined exercise will be removed.', confirmText: 'Reset', iconName: 'refresh' })) {
        S.resetExercise(ex.id); toast('Reset to the built-in version'); ctx.refresh();
      }
    } }, icon('refresh'), h('.grow.sb', 'Reset to default')) : null,
    h('button.listrow', { style: { color: 'var(--bad)' }, onclick: async () => {
      ref.close();
      const ok = await confirmDelete(isCustom ? 'this exercise' : 'from your library',
        isCustom ? 'Your logged sets for it stay in history.'
          : 'This hides the predefined exercise from your library. You can restore it in Settings.');
      if (ok) { S.deleteExercise(ex.id); toast('Removed'); location.hash = '#/exercises'; }
    } }, icon('trash'), h('.grow.sb', isCustom ? 'Delete exercise' : 'Hide from library')),
  ) });
}

export const ruleSummary = (r) =>
  `${PROGRESSION_METHODS.find((m) => m.id === r.method)?.name || r.method} · ${r.targetSets} × ${r.repRange[0]}–${r.repRange[1]}`;

export function openRuleSheet(ex, ctx) {
  const rule = { ...S.ruleFor(ex.id) };
  const unit = S.settings().unit;
  const body = h('.stack.stack-16');
  const draw = () => mount(body,
    h('.field', h('label.label', 'Progression method'),
      h('.stack.stack-8', ...PROGRESSION_METHODS.map((m) =>
        h(`button.suggest-opt${rule.method === m.id ? '' : ''}`, {
          style: { borderColor: rule.method === m.id ? 'var(--accent)' : undefined,
            background: rule.method === m.id ? 'var(--accent-soft)' : undefined },
          onclick: () => { rule.method = m.id; draw(); } },
          h('.grow', h('div.sb', m.name), h('.t-xs.dim', { style: { marginTop: '2px' } }, m.desc)),
          rule.method === m.id ? icon('check') : null)))),
    h('.grid.grid-2',
      h('.field', h('label.label', 'Target sets'),
        h('input.input', { type: 'number', min: 1, max: 12, value: rule.targetSets,
          oninput: (e) => { rule.targetSets = Math.max(1, +e.target.value || 1); } })),
      h('.field', h('label.label', `Weight increment (${unit})`),
        h('input.input', { type: 'number', step: '0.25', min: 0, value: unit === 'lb' ? (rule.incrementKg / 0.45359237).toFixed(1) : rule.incrementKg,
          oninput: (e) => { const v = +e.target.value || 0; rule.incrementKg = unit === 'lb' ? v * 0.45359237 : v; } }))),
    h('.grid.grid-2',
      h('.field', h('label.label', 'Min reps'),
        h('input.input', { type: 'number', min: 1, value: rule.repRange[0],
          oninput: (e) => { rule.repRange = [Math.max(1, +e.target.value || 1), rule.repRange[1]]; } })),
      h('.field', h('label.label', 'Max reps'),
        h('input.input', { type: 'number', min: 1, value: rule.repRange[1],
          oninput: (e) => { rule.repRange = [rule.repRange[0], Math.max(1, +e.target.value || 1)]; } }))),
    h('.card.card-pad', { style: { background: 'var(--surface-2)' } },
      h('.t-sm.muted', { style: { lineHeight: 1.55 } },
        `With double progression at ${rule.targetSets} × ${rule.repRange[0]}–${rule.repRange[1]}: keep the weight until every set reaches ${rule.repRange[1]} reps, then add ${fmtWeight(rule.incrementKg, unit)} and build back up from ${rule.repRange[0]}.`)));
  draw();

  const ref = sheet({
    title: `Progression — ${ex.name}`, body,
    foot: h('.row', { style: { width: '100%' } },
      S.hasCustomRule(ex.id) ? h('button.btn', { onclick: () => {
        S.clearRule(ex.id); ref.close(); toast('Reset to default rule'); ctx && ctx.refresh();
      } }, 'Reset') : null,
      h('button.btn.btn-primary.grow', { onclick: () => {
        S.setRule(ex.id, rule); ref.close(); toast('Progression rule saved', 'good'); ctx && ctx.refresh();
      } }, 'Save rule')),
  });
}
