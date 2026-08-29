import { h, icon, mount } from '../lib/dom.js';
import * as S from '../store.js';
import { allPRs, exerciseHistory } from '../lib/stats.js';
import { exerciseThumb } from '../lib/components.js';
import { emptyState, segmented } from '../lib/ui.js';
import { fmtWeight, compactNum, fmtDate, relDay, e1rm } from '../lib/utils.js';
import { sparkline } from '../lib/charts.js';

export const title = 'Records';

const SORTS = [['recent', 'Recent'], ['e1rm', 'Est. 1RM'], ['weight', 'Weight'], ['volume', 'Volume'], ['name', 'Name']];

export function render({ navigate }) {
  const unit = S.settings().unit;
  const done = S.completedSessions();
  const records = allPRs(done);
  const idx = S.exerciseIndex();

  if (!records.length) return emptyState({ iconName: 'trophy', title: 'No records yet',
    message: 'Complete a workout and your best weight, reps, estimated 1RM and volume for every exercise are tracked here automatically.',
    action: h('button.btn.btn-primary', { onclick: () => navigate('/workouts') }, 'Start a workout') });

  let sort = 'recent';
  const listEl = h('.stack.stack-10');

  const draw = () => {
    const sorters = {
      recent: (a, b) => (a.prs.lastDate < b.prs.lastDate ? 1 : -1),
      e1rm: (a, b) => (b.prs.bestE1rm?.value || 0) - (a.prs.bestE1rm?.value || 0),
      weight: (a, b) => (b.prs.heaviest?.weight || 0) - (a.prs.heaviest?.weight || 0),
      volume: (a, b) => b.prs.totalVolume - a.prs.totalVolume,
      name: (a, b) => (idx[a.exerciseId]?.name || '').localeCompare(idx[b.exerciseId]?.name || ''),
    };
    const list = [...records].sort(sorters[sort]);
    mount(listEl, ...list.map(({ exerciseId, prs }) => {
      const ex = idx[exerciseId];
      if (!ex) return null;
      const hist = exerciseHistory(done, exerciseId);
      return h('.card.card-pad.stack.stack-10', { style: { cursor: 'pointer' },
        onclick: () => navigate(`/progress/${exerciseId}`) },
        h('.row', { style: { gap: '10px' } },
          exerciseThumb(ex),
          h('.grow',
            h('.ex-name', ex.name),
            h('.ex-meta',
              h('span', `${prs.sessions} sessions`), h('i.dot'),
              h('span', `last ${relDay(prs.lastDate).toLowerCase()}`))),
          hist.length > 2 ? sparkline(hist.slice(0, 10).reverse().map((x) => x.bestE1rm), { width: 64, height: 26 }) : null,
          icon('chevronRight')),
        h('.grid', { style: { gridTemplateColumns: 'repeat(4,1fr)', gap: '8px' } },
          mini('Weight', prs.heaviest ? fmtWeight(prs.heaviest.weight, unit, false) : '—', unit),
          mini('Reps', prs.mostReps ? String(prs.mostReps.reps) : '—', ''),
          mini('Est. 1RM', prs.bestE1rm ? fmtWeight(prs.bestE1rm.value, unit, false) : '—', unit),
          mini('Volume', compactNum(unit === 'lb' ? prs.totalVolume / 0.45359237 : prs.totalVolume), unit)));
    }));
  };

  const bar = h('.seg', ...SORTS.map(([id, label]) =>
    h(`button${sort === id ? '.on' : ''}`, { onclick: (e) => {
      sort = id; [...bar.children].forEach((c) => c.classList.remove('on'));
      e.currentTarget.classList.add('on'); draw();
    } }, label)));
  draw();

  const totalPRs = done.reduce((n, s) => n + (s.prs?.length || 0), 0);

  return h('.stack.stack-16',
    h('.grid.grid-3',
      h('.stat', h('.stat-v', String(records.length)), h('.stat-l', 'Exercises')),
      h('.stat', h('.stat-v', String(totalPRs)), h('.stat-l', 'PRs set')),
      h('.stat', h('.stat-v', compactNum(records.reduce((n, r) => n + r.prs.totalSets, 0))), h('.stat-l', 'Total sets'))),
    bar,
    listEl);
}

const mini = (label, value, unit) => h('div', { style: { textAlign: 'center' } },
  h('div', { style: { fontWeight: 800, fontSize: '15px', fontFamily: 'var(--ff-num)' } }, value),
  h('.t-xs.dim', { style: { marginTop: '1px' } }, unit ? `${label} (${unit})` : label));
