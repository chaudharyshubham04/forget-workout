import { h, icon, mount } from '../lib/dom.js';
import * as S from '../store.js';
import { GOALS, LEVELS, EQUIPMENT, EQUIPMENT_PROFILES, DEFAULT_MUSCLE_TARGETS } from '../data/taxonomy.js';
import { EXERCISES } from '../data/exercises.js';
import { SPLITS } from '../data/splits.js';
import { sheet, dialog, toast, switchToggle, confirmDelete } from '../lib/ui.js';
import { requestPermission, permission, supported, notifyNow, scheduleReminders } from '../lib/notify.js';
import { applyTheme } from '../lib/theme.js';
import { canInstall, promptInstall } from '../lib/install.js';
import { fmtDate, prettify, DAYS, todayKey } from '../lib/utils.js';
import { allKeys, delBlob } from '../lib/idb.js';
import { madeWith } from './more.js';

export const title = 'Settings';

export function render({ navigate, refresh }) {
  const st = S.get();
  const s = st.settings, p = st.profile;

  const card = (heading, ...rows) => h('.stack.stack-10',
    h('h2', heading), h('.card', { style: { overflow: 'hidden' } }, ...rows));

  const row = (label, sub, control) => h('.listrow.static',
    h('.grow', h('div.sb', label), sub ? h('.t-xs.dim', { style: { marginTop: '2px' } }, sub) : null),
    control);

  const navRow = (label, sub, onClick, right) => h('button.listrow', { onclick: onClick },
    h('.grow', h('div.sb', label), sub ? h('.t-xs.dim', { style: { marginTop: '2px' } }, sub) : null),
    right || icon('chevronRight'));

  const seg = (options, value, onPick) => h('.seg', { style: { flex: 'none' } },
    ...options.map(([v, l]) => h(`button${value === v ? '.on' : ''}`, { onclick: () => onPick(v) }, l)));

  const hue = h('input', { type: 'range', min: 0, max: 360, value: s.accentHue ?? 18,
    style: { width: '130px', accentColor: 'var(--accent)' },
    oninput: (e) => { document.documentElement.style.setProperty('--accent-h', e.target.value); },
    onchange: (e) => { S.setSetting('accentHue', +e.target.value); } });

  return h('.stack.stack-20', { style: { maxWidth: '680px', margin: '0 auto' } },

    card('Profile',
      navRow('Name', p.name || 'Not set', () => textSheet('Your name', p.name, (v) => {
        S.patchProfile({ name: v }); refresh();
      })),
      navRow('Goal', S.goal().name, () => pickSheet('Fitness goal',
        GOALS.map((g) => ({ id: g.id, name: g.name, sub: g.desc })), p.goal, (v) => {
          S.patchProfile({ goal: v });
          const g = GOALS.find((x) => x.id === v);
          if (g) S.patchSettings({ defaultRestSec: g.restSec });
          refresh(); toast('Goal updated — recommendations refreshed', 'good');
        })),
      navRow('Experience', LEVELS.find((l) => l.id === p.level)?.name || p.level, () =>
        pickSheet('Experience level', LEVELS.map((l) => ({ id: l.id, name: l.name, sub: l.desc })), p.level, (v) => {
          S.patchProfile({ level: v }); refresh();
        })),
      navRow('Days per week', String(p.daysPerWeek), () =>
        pickSheet('Training days per week', [2, 3, 4, 5, 6, 7].map((n) => ({ id: n, name: `${n} days` })), p.daysPerWeek, (v) => {
          S.patchProfile({ daysPerWeek: v }); refresh();
        })),
      navRow('Session length', `${p.sessionMin} minutes`, () =>
        pickSheet('Typical session length', [30, 45, 60, 75, 90].map((n) => ({ id: n, name: `${n} minutes` })), p.sessionMin, (v) => {
          S.patchProfile({ sessionMin: v }); refresh();
        })),
      navRow('Equipment', `${p.equipment.length} of ${S.equipmentList().length} available`, () => equipmentSheet(refresh))),

    card('Units & display',
      row('Weight unit', 'Existing data is converted automatically',
        seg([['kg', 'kg'], ['lb', 'lb']], s.unit, (v) => { S.setSetting('unit', v); refresh(); })),
      row('Length unit', 'For body measurements',
        seg([['cm', 'cm'], ['in', 'in']], s.lengthUnit, (v) => { S.setSetting('lengthUnit', v); refresh(); })),
      row('Theme', null,
        seg([['light', 'Light'], ['dark', 'Dark'], ['system', 'Auto']], s.theme, (v) => {
          S.setSetting('theme', v); applyTheme(S.settings()); refresh();
        })),
      row('Accent colour', 'Tune the app’s highlight colour', hue),
      row('Week starts on', 'Used by charts, the calendar and your plan',
        seg([[1, 'Mon'], [0, 'Sun']], s.weekStart, (v) => {
          S.setSetting('weekStart', v); S.resetPlanSchedule(); refresh();
        }))),

    card('Workout logging',
      navRow('Default rest time', fmtRest(s.defaultRestSec), () =>
        pickSheet('Default rest', [30, 45, 60, 75, 90, 120, 150, 180, 240].map((n) =>
          ({ id: n, name: fmtRest(n) })), s.defaultRestSec, (v) => { S.setSetting('defaultRestSec', v); refresh(); })),
      row('Auto-start rest timer', 'Starts as soon as you complete a set',
        switchToggle(s.restAutoStart, (v) => S.setSetting('restAutoStart', v))),
      row('Rest timer sound', null, switchToggle(s.restSound, (v) => S.setSetting('restSound', v))),
      row('Rest timer vibration', null, switchToggle(s.restVibrate, (v) => S.setSetting('restVibrate', v))),
      row('Keep screen awake', 'While a workout is active',
        switchToggle(s.keepScreenAwake, (v) => S.setSetting('keepScreenAwake', v))),
      row('Track RPE', 'Rate of perceived exertion per set',
        switchToggle(s.showRpe, (v) => S.setSetting('showRpe', v))),
      row('Use RIR instead', 'Reps in reserve rather than RPE',
        switchToggle(s.showRir, (v) => { S.setSetting('showRir', v); if (v) S.setSetting('showRpe', true); })),
      row('Confirm before finishing', null,
        switchToggle(s.confirmFinish, (v) => S.setSetting('confirmFinish', v)))),

    card('Volume targets',
      h('.card-pad',
        h('.t-sm.muted', { style: { lineHeight: 1.55, marginBottom: '12px' } },
          'Weekly working-set targets per muscle group. These drive the “undertrained / on target / high volume” indicators. They are guidance you set yourself, not medical prescriptions.'),
        h('.row', { style: { gap: '8px' } },
          h('button.btn.btn-sm.grow', { onclick: () => navigate('/taxonomy') }, 'Edit targets'),
          h('button.btn.btn-sm', { onclick: () => {
            S.patchSettings({ muscleTargets: { ...DEFAULT_MUSCLE_TARGETS } });
            toast('Targets reset'); refresh();
          } }, 'Reset')))),

    card('Notifications',
      row('Enable reminders', supported()
        ? (permission() === 'denied' ? 'Blocked in your browser settings' : 'Local reminders while the app is open')
        : 'Not supported in this browser',
        switchToggle(s.notifications.enabled, async (v) => {
          if (v) {
            const perm = await requestPermission();
            if (perm !== 'granted') { toast('Notification permission was not granted', 'bad'); refresh(); return; }
          }
          S.patchNotifications({ enabled: v });
          scheduleReminders(S.settings(), {});
          refresh();
        })),
      ...(s.notifications.enabled ? [
        navRow('Workout time', s.notifications.workoutTime, () => timeSheet(s.notifications.workoutTime, (v) => {
          S.patchNotifications({ workoutTime: v }); scheduleReminders(S.settings(), {}); refresh();
        })),
        row('Scheduled workout', 'Remind me at my usual training time',
          switchToggle(s.notifications.workoutReminder, (v) => { S.patchNotifications({ workoutReminder: v }); scheduleReminders(S.settings(), {}); })),
        row('Streak reminder', 'Evening nudge when a streak is live',
          switchToggle(s.notifications.streakReminder, (v) => S.patchNotifications({ streakReminder: v }))),
        row('Missed workouts', 'After three quiet days',
          switchToggle(s.notifications.missedReminder, (v) => S.patchNotifications({ missedReminder: v }))),
        row('Weekly goal check-in', null,
          switchToggle(s.notifications.goalReminder, (v) => S.patchNotifications({ goalReminder: v }))),
        h('.card-pad',
          h('.t-xs.dim', { style: { lineHeight: 1.5, marginBottom: '10px' } },
            'Reminders are scheduled locally and fire while the app is running in a tab or in the background where the browser allows it. Without a push server they cannot be guaranteed after the browser fully unloads the app.'),
          h('button.btn.btn-sm', { onclick: () => notifyNow('Forge', 'Test notification — reminders are working.') },
            'Send a test notification')),
      ] : [])),

    (() => {
      const plan = st.activePlan;
      const split = plan ? S.splitById(plan.splitId) : null;
      if (!split) {
        return card('Training plan',
          navRow('No active plan', 'Pick a split to schedule your week', () => navigate('/splits')));
      }
      const sched = S.planSchedule() || [];
      const order = Array.from({ length: 7 }, (_, i) => (s.weekStart + i) % 7);
      return card('Training plan',
        navRow('Split', split.name, () => navigate(`/split/${split.id}`)),
        row('Week starts on', 'Your plan begins on this day',
          seg([[1, 'Mon'], [0, 'Sun']], s.weekStart, (v) => {
            S.setSetting('weekStart', v);
            S.resetPlanSchedule();
            toast('Week re-anchored', 'good');
            refresh();
          })),
        navRow('Weekly schedule',
          order.map((wd) => {
            const i = sched[wd];
            const d = i === null || i === undefined ? null : split.days[i];
            return `${DAYS[wd].slice(0, 3)} ${d && !d.rest ? '·' : '–'}`;
          }).join('  '),
          () => scheduleSheet(refresh)),
        h('.card-pad', h('.t-xs.dim', { style: { lineHeight: 1.5 } },
          'Each weekday runs the same session every week. Tap Weekly schedule to swap any day — for example run Pull on Monday instead of Push.')));
    })(),

    card('Library',
      navRow('Exercises',
        `${S.exercises().length} available · ${S.curatedCount()} curated · ${S.extendedCount()} imported · ${st.customExercises.length} custom`,
        () => navigate('/exercises')),
      navRow('Exercise media', s.mediaBase ? 'Custom source configured' : 'Using built-in animated diagrams',
        () => mediaSheet(refresh)),
      navRow('Categories & muscles', 'Customise the taxonomy', () => navigate('/taxonomy')),
      st.hiddenExercises.length ? navRow('Hidden exercises', `${st.hiddenExercises.length} hidden`,
        () => hiddenSheet('exercises', refresh)) : null,
      st.hiddenSplits.length ? navRow('Hidden splits', `${st.hiddenSplits.length} hidden`,
        () => hiddenSheet('splits', refresh)) : null,
      Object.keys(st.progressionRules).length ? navRow('Progression rules',
        `${Object.keys(st.progressionRules).length} custom rules`, () => rulesSheet(refresh)) : null),

    card('Data',
      navRow('Export backup', 'Download everything as a JSON file', exportBackup, icon('download')),
      navRow('Import backup', 'Restore or merge a previous export', () => importBackup(refresh), icon('upload')),
      navRow('Storage used', storageSummary(), () => storageSheet(refresh), icon('info')),
      st.lastBackupAt ? row('Last backup', new Date(st.lastBackupAt).toLocaleString(), null) : null,
      h('button.listrow', { style: { color: 'var(--bad)' }, onclick: () => resetEverything(navigate) },
        h('.grow', h('div.sb', 'Reset all data'),
          h('.t-xs.dim', { style: { marginTop: '2px' } }, 'Deletes every workout, template and setting')),
        icon('trash'))),

    canInstall() ? h('button.btn.btn-primary.btn-block.btn-lg', { onclick: async () => {
      const ok = await promptInstall(); if (!ok) toast('Installation dismissed');
    } }, icon('download'), 'Install Forge on this device') : null,

    h('.center.t-xs.dim', { style: { padding: '4px 0 24px' } },
      h('div', 'Forge 1.0 — offline-first workout tracker'),
      h('div', { style: { marginTop: '4px' } },
        `${S.exercises().length} exercises · ${SPLITS.length} splits`),
      h('div', { style: { marginTop: '6px', maxWidth: '420px', margin: '6px auto 0', lineHeight: 1.5 } },
        'Imported exercise data from the exercises-dataset project (MIT). Exercise media © Gym visual, not distributed.'),
      madeWith()));
}

const fmtRest = (v) => (v >= 60 ? `${Math.floor(v / 60)}:${String(v % 60).padStart(2, '0')}` : `${v}s`);

/** Assign any split day (or a rest day) to any weekday. */
function scheduleSheet(refresh) {
  const st = S.get();
  const split = S.splitById(st.activePlan.splitId);
  const sched = (S.planSchedule() || []).slice();
  const weekStart = st.settings.weekStart;
  const order = Array.from({ length: 7 }, (_, i) => (weekStart + i) % 7);

  const body = h('.stack.stack-10');
  const draw = () => mount(body,
    h('.t-sm.muted', { style: { lineHeight: 1.55 } },
      `Choose which ${split.name} session runs on each day. The same weekday always runs the same session.`),
    ...order.map((wd) => {
      const cur = sched[wd];
      return h('.row', { style: { gap: '10px' } },
        h('div', { style: { width: '54px', flex: 'none', fontWeight: 700, fontSize: '13px' } }, DAYS[wd].slice(0, 3)),
        h('select.select.grow', { onchange: (e) => {
          const v = e.target.value;
          sched[wd] = v === '' ? null : Number(v);
          draw();
        } },
          h('option', { value: '', selected: cur === null || cur === undefined }, 'Rest day'),
          ...split.days.map((d, i) => h('option',
            { value: String(i), selected: cur === i },
            d.rest ? `Day ${i + 1} — Rest` : `Day ${i + 1} — ${d.name}`))));
    }),
    h('.card.card-pad', { style: { background: 'var(--surface-2)' } },
      h('.t-xs.dim', { style: { lineHeight: 1.5 } },
        'You can put the same session on more than one day, or leave a day empty for rest. Your logged history is never affected by changing this.')));
  draw();

  const ref = sheet({
    title: 'Weekly schedule', body,
    actions: h('button.link', { onclick: () => {
      S.resetPlanSchedule(); ref.close(); toast('Reset to the default order'); refresh();
    } }, 'Reset'),
    foot: h('button.btn.btn-primary.btn-block', { onclick: () => {
      S.setPlanSchedule(sched); ref.close(); toast('Schedule saved', 'good'); refresh();
    } }, 'Save schedule'),
  });
}

/* The imported exercises reference photo/GIF assets that are © Gym visual and
   are deliberately not bundled. This lets someone who licenses them plug them in. */
function mediaSheet(refresh) {
  const cur = S.settings().mediaBase || '';
  const inp = h('input.input', { value: cur, placeholder: 'https://example.com/exercise-media/',
    autocapitalize: 'off', spellcheck: 'false' });
  const ref = sheet({ title: 'Exercise media', body: h('.stack.stack-14',
    h('.card.card-pad', { style: { background: 'var(--surface-2)' } },
      h('.row', { style: { gap: '10px', alignItems: 'flex-start' } },
        h('span', { style: { color: 'var(--accent)' } }, icon('info', 18)),
        h('.t-sm.muted', { style: { lineHeight: 1.6 } },
          'Forge ships procedurally animated diagrams, which need no assets and work offline. ',
          `The ${S.extendedCount()} imported exercises also reference photo and GIF demonstrations from the exercises-dataset project. `,
          'Those files are © Gym visual and are not distributed with this app — cloning that dataset does not license them. ',
          'If you have obtained them, host them yourself and give the base path below.'))),
    h('.field', h('label.label', 'Media base URL or path'), inp,
      h('.t-xs.dim', { style: { marginTop: '6px' } },
        'Files are read as <base>/images/… and <base>/videos/… — the same layout as the dataset.')),
    h('.card.card-pad',
      h('.t-xs.dim', { style: { lineHeight: 1.55 } },
        'Attribution "© Gym visual — https://gymvisual.com/" is displayed on every media frame, as their terms require.')),
    cur ? h('button.btn.btn-danger.btn-block', { onclick: () => {
      S.setSetting('mediaBase', ''); ref.close(); toast('Back to animated diagrams'); refresh();
    } }, 'Clear media source') : null),
    foot: h('button.btn.btn-primary.btn-block', { onclick: () => {
      S.setSetting('mediaBase', inp.value.trim());
      ref.close();
      toast(inp.value.trim() ? 'Media source saved' : 'Using animated diagrams', 'good');
      refresh();
    } }, 'Save') });
}

function textSheet(title, value, onSave) {
  const inp = h('input.input', { value: value || '', autofocus: true });
  const ref = sheet({ title, body: h('.field', h('label.label', title), inp),
    foot: h('button.btn.btn-primary.btn-block', { onclick: () => { onSave(inp.value); ref.close(); } }, 'Save') });
}
function timeSheet(value, onSave) {
  const inp = h('input.input', { type: 'time', value });
  const ref = sheet({ title: 'Reminder time', body: h('.field', h('label.label', 'Time'), inp),
    foot: h('button.btn.btn-primary.btn-block', { onclick: () => { onSave(inp.value); ref.close(); } }, 'Save') });
}
function pickSheet(title, options, current, onPick) {
  const ref = sheet({ title, body: h('.stack', ...options.map((o) =>
    h('button.listrow', { onclick: () => { onPick(o.id); ref.close(); } },
      h('.grow', h('div.sb', o.name), o.sub ? h('.t-xs.dim', o.sub) : null),
      current === o.id ? icon('check') : null))) });
}

function equipmentSheet(refresh) {
  const sel = new Set(S.profile().equipment);
  const wrap = h('.stack.stack-14');
  const draw = () => mount(wrap,
    h('.field', h('label.label', 'Quick presets'),
      h('.row.wrap', { style: { gap: '7px' } }, ...EQUIPMENT_PROFILES.map((p) =>
        h('button.chip', { onclick: () => { sel.clear(); p.equipment.forEach((e) => sel.add(e)); draw(); } }, p.name)))),
    h('.field', h('label.label', 'Available equipment'),
      h('.row.wrap', { style: { gap: '7px' } }, ...S.equipmentList().map((e) =>
        h(`button.chip${sel.has(e.id) ? '.on' : ''}`, { onclick: () => {
          sel.has(e.id) ? sel.delete(e.id) : sel.add(e.id); draw();
        } }, e.name)))));
  draw();
  const ref = sheet({ title: 'Your equipment', body: wrap,
    foot: h('button.btn.btn-primary.btn-block', { onclick: () => {
      S.patchProfile({ equipment: [...sel] }); ref.close(); toast('Equipment updated', 'good'); refresh();
    } }, 'Save') });
}

function hiddenSheet(kind, refresh) {
  const st = S.get();
  const ids = kind === 'exercises' ? st.hiddenExercises : st.hiddenSplits;
  const nameOf = (id) => kind === 'exercises'
    ? (EXERCISES.find((e) => e.id === id)?.name || id)
    : (SPLITS.find((s) => s.id === id)?.name || id);
  const wrap = h('.stack.stack-8');
  const draw = () => mount(wrap, ...(ids.length ? ids.map((id) => h('.listrow.static',
    h('.grow.sb', nameOf(id)),
    h('button.btn.btn-xs', { onclick: () => {
      if (kind === 'exercises') S.restoreExercise(id);
      else { const i = st.hiddenSplits.indexOf(id); if (i >= 0) st.hiddenSplits.splice(i, 1); S.save(); }
      ids.splice(ids.indexOf(id), 1); draw(); refresh();
    } }, 'Restore'))) : [h('.t-sm.dim', 'Nothing hidden.')]));
  draw();
  sheet({ title: `Hidden ${kind}`, body: wrap });
}

function rulesSheet(refresh) {
  const rules = S.get().progressionRules;
  const wrap = h('.stack.stack-8');
  const draw = () => mount(wrap, ...Object.entries(rules).map(([exId, r]) => {
    const ex = S.exerciseById(exId);
    return h('.listrow.static',
      h('.grow', h('div.sb', ex?.name || exId),
        h('.t-xs.dim', `${prettify(r.method)} · ${r.targetSets} × ${r.repRange[0]}–${r.repRange[1]}`)),
      h('button.btn.btn-xs', { onclick: () => { S.clearRule(exId); delete rules[exId]; draw(); refresh(); } }, 'Reset'));
  }));
  draw();
  sheet({ title: 'Custom progression rules', body: wrap });
}

/* ---------------- data ---------------- */
function exportBackup() {
  const json = S.exportData();
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = h('a', { href: url, download: `forge-backup-${new Date().toISOString().slice(0, 10)}.json` });
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
  S.markBackup();
  toast('Backup downloaded', 'good');
}

function importBackup(refresh) {
  const input = h('input', { type: 'file', accept: 'application/json,.json', style: { display: 'none' } });
  input.addEventListener('change', async () => {
    const file = input.files?.[0];
    if (!file) return;
    let text;
    try { text = await file.text(); } catch { toast('Could not read that file', 'bad'); return; }
    let parsed;
    try { parsed = JSON.parse(text); } catch { toast('That is not a valid backup file', 'bad'); return; }
    const incoming = parsed.state || parsed;
    const summary = `${(incoming.sessions || []).length} workouts, ${(incoming.templates || []).length} templates, ${(incoming.customExercises || []).length} custom exercises`;
    const ref = sheet({ title: 'Import backup', body: h('.stack.stack-14',
      h('.card.card-pad', h('.t-sm', summary),
        parsed.exportedAt ? h('.t-xs.dim', { style: { marginTop: '4px' } },
          `Exported ${new Date(parsed.exportedAt).toLocaleString()}`) : null),
      h('.t-sm.muted', { style: { lineHeight: 1.55 } },
        'Merge keeps everything you have now and adds anything missing. Replace discards your current data entirely.')),
      foot: h('.row', { style: { width: '100%' } },
        h('button.btn.grow', { onclick: () => {
          try { S.importData(parsed, { merge: true }); ref.close(); toast('Merged', 'good'); refresh(); }
          catch (e) { toast(e.message, 'bad'); }
        } }, 'Merge'),
        h('button.btn.btn-danger.grow', { onclick: async () => {
          if (await dialog({ title: 'Replace all data?', message: 'Everything currently stored on this device will be overwritten.',
            confirmText: 'Replace', danger: true, iconName: 'alert' })) {
            try { S.importData(parsed, { merge: false }); ref.close(); toast('Data restored', 'good'); location.hash = '#/'; }
            catch (e) { toast(e.message, 'bad'); }
          }
        } }, 'Replace')) });
  });
  document.body.appendChild(input); input.click();
  setTimeout(() => input.remove(), 1000);
}

function storageSummary() {
  try {
    const bytes = new Blob([localStorage.getItem('forge.state.v1') || '']).size;
    return `${(bytes / 1024).toFixed(0)} KB of workout data`;
  } catch { return 'Unknown'; }
}

async function storageSheet(refresh) {
  const st = S.get();
  const bytes = new Blob([localStorage.getItem('forge.state.v1') || '']).size;
  let quota = null;
  try {
    if (navigator.storage?.estimate) {
      const est = await navigator.storage.estimate();
      quota = est;
    }
  } catch {}
  const photoKeys = await allKeys();
  const orphans = (photoKeys || []).filter((k) => !st.bodyEntries.some((e) => e.photoId === k));

  sheet({ title: 'Storage', body: h('.stack.stack-14',
    h('.card.card-pad.stack', { style: { gap: '2px' } },
      kvRow('Workout data', `${(bytes / 1024).toFixed(1)} KB`),
      kvRow('Sessions', String(st.sessions.length)),
      kvRow('Custom exercises', String(st.customExercises.length)),
      kvRow('Progress photos', String((photoKeys || []).length)),
      quota ? kvRow('Browser quota used',
        `${((quota.usage || 0) / 1048576).toFixed(1)} MB of ${((quota.quota || 0) / 1048576).toFixed(0)} MB`) : null),
    orphans.length ? h('.card.card-pad',
      h('.t-sm.muted', { style: { marginBottom: '10px' } },
        `${orphans.length} photo${orphans.length > 1 ? 's are' : ' is'} no longer linked to a body entry.`),
      h('button.btn.btn-sm', { onclick: async () => {
        for (const k of orphans) await delBlob(k);
        toast('Cleaned up', 'good');
      } }, 'Delete unused photos')) : null,
    h('.t-xs.dim', { style: { lineHeight: 1.55 } },
      'All data lives in this browser on this device. Clearing site data removes it, so export a backup regularly.')) });
}
const kvRow = (l, v) => h('.row-between', { style: { padding: '6px 0' } },
  h('span.t-sm.muted', l), h('span.t-sm.sb', v));

async function resetEverything(navigate) {
  const ok = await dialog({ title: 'Reset all data?',
    message: 'Every workout, template, custom exercise, goal and setting is permanently deleted from this device. Export a backup first if you want to keep it.',
    confirmText: 'Delete everything', danger: true, iconName: 'alert' });
  if (!ok) return;
  const sure = await dialog({ title: 'Are you certain?',
    message: 'This cannot be undone.', confirmText: 'Yes, delete it all', danger: true, iconName: 'trash' });
  if (!sure) return;
  for (const k of (await allKeys()) || []) await delBlob(k);
  S.resetAll();
  toast('All data deleted');
  location.hash = '#/onboarding';
}
