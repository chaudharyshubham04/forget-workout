import { h, icon } from '../lib/dom.js';
import * as S from '../store.js';
import { streaks, sessionTotals } from '../lib/stats.js';
import { canInstall, promptInstall } from '../lib/install.js';
import { toast } from '../lib/ui.js';
import { compactNum, fmtVolume } from '../lib/utils.js';

export const title = 'More';

/** Footer credit. */
export const madeWith = () => h('.row', {
  style: { justifyContent: 'center', gap: '5px', marginTop: '10px',
    fontSize: '12px', fontWeight: 600, color: 'var(--ink-3)' } },
  h('span', 'Made with'),
  h('span', { style: { color: 'var(--accent)', display: 'flex' } },
    h('svg', { class: 'ic', viewBox: '0 0 24 24', width: 13, height: 13,
      fill: 'currentColor', 'aria-label': 'love' },
      h('path', { d: 'M12 21S3.5 15 3.5 9.2A4.7 4.7 0 0 1 12 6.5a4.7 4.7 0 0 1 8.5 2.7C20.5 15 12 21 12 21z' }))),
  h('span', 'by Shubham'));

export function render({ navigate }) {
  const st = S.get();
  const done = S.completedSessions();
  const streak = streaks(done);
  const totalVol = done.reduce((n, s) => n + sessionTotals(s).volume, 0);

  const link = (iconName, label, sub, to, badge) =>
    h('button.listrow', { onclick: typeof to === 'function' ? to : () => navigate(to) },
      h('span', { style: { color: 'var(--accent)' } }, icon(iconName)),
      h('.grow', h('div.sb', label), sub ? h('.t-xs.dim', sub) : null),
      badge ? h('span.tag.tag-accent', badge) : null,
      icon('chevronRight'));

  return h('.stack.stack-20',
    h('.card.card-pad',
      h('.row', { style: { gap: '14px' } },
        h('div', { style: { width: '52px', height: '52px', borderRadius: '17px', flex: 'none',
          background: 'linear-gradient(135deg,#ff5a2c,#ffb547)', color: '#fff',
          display: 'grid', placeItems: 'center' } }, icon('user', 26)),
        h('.grow',
          h('h2', st.profile.name || 'Your profile'),
          h('.t-xs.dim', { style: { marginTop: '3px' } },
            `${S.goal().name} · ${st.profile.daysPerWeek} days/week · ${st.profile.level}`)),
        h('button.btn.btn-sm', { onclick: () => navigate('/settings') }, 'Edit'))),

    h('.grid.grid-3',
      h('.stat', h('.stat-v', String(done.length)), h('.stat-l', 'Workouts')),
      h('.stat', h('.stat-v', String(streak.best)), h('.stat-l', 'Best streak')),
      h('.stat', h('.stat-v', compactNum(st.settings.unit === 'lb' ? totalVol / 0.45359237 : totalVol)),
        h('.stat-l', `Volume (${st.settings.unit})`))),

    h('.card', { style: { overflow: 'hidden' } },
      link('dumbbell', 'Workouts', 'Templates and quick start', '/workouts'),
      link('layers', 'Splits', 'Plan your training week', '/splits'),
      link('library', 'Exercise library', `${S.exercises().length} exercises`, '/exercises')),

    h('.card', { style: { overflow: 'hidden' } },
      link('chart', 'Progress', 'Volume, trends and analytics', '/progress'),
      link('history', 'History', `${done.length} sessions`, '/history'),
      link('calendar', 'Calendar', 'Month view of your training', '/calendar'),
      link('trophy', 'Personal records', 'Your bests per exercise', '/records'),
      link('scale', 'Body', 'Weight, measurements and photos', '/body')),

    h('.card', { style: { overflow: 'hidden' } },
      link('target', 'Goals', `${st.goals.filter((g) => !g.done).length} active`, '/goals'),
      link('folder', 'Categories & muscles', 'Customise the taxonomy', '/taxonomy'),
      link('settings', 'Settings', 'Units, theme, notifications, data', '/settings')),

    canInstall() ? h('.card.card-pad',
      h('.row', { style: { gap: '12px' } },
        h('span', { style: { color: 'var(--accent)' } }, icon('download', 22)),
        h('.grow', h('div.sb', 'Install Forge'),
          h('.t-xs.dim', 'Add it to your home screen for full-screen, offline use')),
        h('button.btn.btn-sm.btn-primary', { onclick: async () => {
          const ok = await promptInstall();
          if (!ok) toast('Installation dismissed');
        } }, 'Install'))) : null,

    h('.center.t-xs.dim', { style: { padding: '8px 0 20px' } },
      h('div', 'Forge — offline workout tracker'),
      h('div', { style: { marginTop: '4px' } }, 'All data is stored on this device.'),
      madeWith()));
}
