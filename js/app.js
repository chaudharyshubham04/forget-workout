/* Router, shell and lifecycle. */
import { h, mount, clear, icon, qs } from './lib/dom.js';
import * as S from './store.js';
import { toast } from './lib/ui.js';
import { scheduleReminders } from './lib/notify.js';
import { streaks } from './lib/stats.js';
import { fmtClock, daysBetween, parseDay, todayKey } from './lib/utils.js';
import { applyTheme as applyThemeTo } from './lib/theme.js';
import { watchInstallPrompt } from './lib/install.js';

/* ---------------- routes ---------------- */
const ROUTES = [
  { path: '/',                    mod: () => import('./views/home.js'),            tab: 'home',      title: 'Home' },
  { path: '/exercises',           mod: () => import('./views/exercises.js'),       tab: 'exercises', title: 'Exercises' },
  { path: '/exercise/:id',        mod: () => import('./views/exerciseDetail.js'),  tab: 'exercises' },
  { path: '/exercise/:id/edit',   mod: () => import('./views/exerciseEdit.js'),    tab: 'exercises' },
  { path: '/exercise-new',        mod: () => import('./views/exerciseEdit.js'),    tab: 'exercises' },
  { path: '/workouts',            mod: () => import('./views/workouts.js'),        tab: 'workouts',  title: 'Workouts' },
  { path: '/builder/:id',         mod: () => import('./views/builder.js'),         tab: 'workouts' },
  { path: '/builder',             mod: () => import('./views/builder.js'),         tab: 'workouts' },
  { path: '/active',              mod: () => import('./views/active.js'),          tab: 'workouts',  title: 'Active workout' },
  { path: '/splits',              mod: () => import('./views/splits.js'),          tab: 'workouts',  title: 'Splits' },
  { path: '/split/:id',           mod: () => import('./views/splitDetail.js'),     tab: 'workouts' },
  { path: '/progress',            mod: () => import('./views/progress.js'),        tab: 'progress',  title: 'Progress' },
  { path: '/progress/:id',        mod: () => import('./views/exerciseProgress.js'),tab: 'progress' },
  { path: '/history',             mod: () => import('./views/history.js'),         tab: 'progress',  title: 'History' },
  { path: '/history/:id',         mod: () => import('./views/sessionDetail.js'),   tab: 'progress' },
  { path: '/calendar',            mod: () => import('./views/calendar.js'),        tab: 'progress',  title: 'Calendar' },
  { path: '/records',             mod: () => import('./views/records.js'),         tab: 'progress',  title: 'Records' },
  { path: '/goals',               mod: () => import('./views/goals.js'),           tab: 'more',      title: 'Goals' },
  { path: '/body',                mod: () => import('./views/body.js'),            tab: 'progress',  title: 'Body' },
  { path: '/settings',            mod: () => import('./views/settings.js'),        tab: 'more',      title: 'Settings' },
  { path: '/taxonomy',            mod: () => import('./views/taxonomyEdit.js'),    tab: 'more',      title: 'Categories' },
  { path: '/more',                mod: () => import('./views/more.js'),            tab: 'more',      title: 'More' },
  { path: '/onboarding',          mod: () => import('./views/onboarding.js'),      tab: null,        title: 'Welcome' },
];

function matchRoute(path) {
  for (const r of ROUTES) {
    const rp = r.path.split('/').filter(Boolean);
    const pp = path.split('/').filter(Boolean);
    if (rp.length !== pp.length) continue;
    const params = {};
    let ok = true;
    for (let i = 0; i < rp.length; i++) {
      if (rp[i].startsWith(':')) params[rp[i].slice(1)] = decodeURIComponent(pp[i]);
      else if (rp[i] !== pp[i]) { ok = false; break; }
    }
    if (ok) return { route: r, params };
  }
  return null;
}

export function navigate(to, { replace = false } = {}) {
  const hash = `#${to.startsWith('/') ? to : `/${to}`}`;
  if (location.hash === hash) { render(); return; }
  if (replace) {
    /* replaceState does not fire hashchange, so drive the render directly. */
    history.replaceState(null, '', hash);
    render();
  } else {
    location.hash = hash;   // fires hashchange -> render()
  }
}
export const back = () => (history.length > 1 ? history.back() : navigate('/'));

/* ---------------- nav definitions ---------------- */
const TABS = [
  { id: 'home',      label: 'Home',      icon: 'home',     to: '/' },
  { id: 'exercises', label: 'Exercises', icon: 'library',  to: '/exercises' },
  { id: 'start',     label: 'Start',     icon: 'plus',     fab: true },
  { id: 'progress',  label: 'Progress',  icon: 'chart',    to: '/progress' },
  { id: 'more',      label: 'More',      icon: 'more',     to: '/more' },
];
const SIDE = [
  { sec: 'Train' },
  { label: 'Home',      icon: 'home',     to: '/',          tab: 'home' },
  { label: 'Workouts',  icon: 'dumbbell', to: '/workouts',  tab: 'workouts' },
  { label: 'Splits',    icon: 'layers',   to: '/splits' },
  { label: 'Exercises', icon: 'library',  to: '/exercises', tab: 'exercises' },
  { sec: 'Track' },
  { label: 'Progress',  icon: 'chart',    to: '/progress',  tab: 'progress' },
  { label: 'History',   icon: 'history',  to: '/history' },
  { label: 'Calendar',  icon: 'calendar', to: '/calendar' },
  { label: 'Records',   icon: 'trophy',   to: '/records' },
  { label: 'Body',      icon: 'scale',    to: '/body' },
  { sec: 'You' },
  { label: 'Goals',     icon: 'target',   to: '/goals' },
  { label: 'Settings',  icon: 'settings', to: '/settings',  tab: 'more' },
];

/* ---------------- theme ---------------- */
export const applyTheme = () => applyThemeTo(S.settings());

/* ---------------- shell ---------------- */
let currentTab = 'home';

function renderTabbar() {
  const el = document.getElementById('tabbar');
  mount(el, ...TABS.map((t) => {
    if (t.fab) {
      return h('button.tab.tab-fab', { 'aria-label': 'Start workout', onclick: onStartTap },
        h('.fab-inner', icon(S.activeSession() ? 'play' : 'plus')),
      );
    }
    return h(`button.tab${currentTab === t.id ? '.active' : ''}`,
      { onclick: () => navigate(t.to), 'aria-current': currentTab === t.id ? 'page' : null },
      icon(t.icon), h('span', t.label));
  }));
}

function renderSidebar() {
  const el = document.getElementById('sidebar');
  const active = S.activeSession();
  mount(el,
    h('.brand', h('.brand-mark', icon('dumbbell')), 'Forge'),
    ...SIDE.map((item) => item.sec
      ? h('.side-sec', item.sec)
      : h(`button.side-link${location.hash === `#${item.to}` ? '.active' : ''}`,
          { onclick: () => navigate(item.to) },
          icon(item.icon), h('span', item.label),
          item.to === '/workouts' && active ? h('span.side-badge', 'LIVE') : null)),
    h('.side-foot',
      h('button.btn.btn-primary.btn-block', { onclick: onStartTap },
        icon(active ? 'play' : 'plus'), active ? 'Resume workout' : 'Start workout')),
  );
}

/** Cycles dark → light → auto, so both modes are one tap away from anywhere. */
export function themeToggle() {
  const order = ['dark', 'light', 'system'];
  const cur = S.settings().theme;
  const next = order[(order.indexOf(cur) + 1) % order.length];
  const label = { dark: 'Dark', light: 'Light', system: 'Auto' };
  return h('button.iconbtn', {
    'aria-label': `Theme: ${label[cur]}. Switch to ${label[next]}`,
    title: `Theme: ${label[cur]} — tap for ${label[next]}`,
    onclick: () => {
      S.setSetting('theme', next);
      applyTheme();
      render();
      toast(`${label[next]} mode`, '', 1400);
    },
  }, icon(cur === 'dark' ? 'moon' : cur === 'light' ? 'sun' : 'eye'));
}

function renderTopbar(title, actions) {
  const el = document.getElementById('topbar');
  const showBack = !['/', '/exercises', '/workouts', '/progress', '/more'].includes(currentPath());
  mount(el,
    showBack
      ? h('button.iconbtn', { onclick: back, 'aria-label': 'Back' }, icon('chevronLeft'))
      : h('.brand-mark', { style: { width: '30px', height: '30px' } }, icon('dumbbell')),
    h('.topbar-title', title || 'Forge'),
    h('.topbar-actions', ...(actions || []), themeToggle()));
}

function renderResumeBar() {
  const host = document.getElementById('resume-host');
  const s = S.activeSession();
  if (!s || currentPath() === '/active') { clear(host); return; }
  const tick = () => {
    const t = qs('.resume-time', host);
    if (t) t.textContent = fmtClock(S.elapsedSec(s));
  };
  mount(host, h('.resume', { onclick: () => navigate('/active'), role: 'button' },
    h('.pulse-dot'),
    h('.grow',
      h('div', { style: { fontWeight: 700, fontSize: '14px' } }, s.name),
      h('div', { style: { fontSize: '11.5px', opacity: .85 } },
        `${s.entries.reduce((n, e) => n + e.sets.filter((x) => x.done).length, 0)} sets logged`)),
    h('.resume-time.num', { style: { fontWeight: 800, fontSize: '17px' } }, fmtClock(S.elapsedSec(s))),
    icon('chevronRight')));
  clearInterval(renderResumeBar._t);
  renderResumeBar._t = setInterval(tick, 1000);
}

async function onStartTap() {
  if (S.activeSession()) return navigate('/active');
  const { quickStartSheet } = await import('./views/workouts.js');
  quickStartSheet();
}

export const currentPath = () => (location.hash.replace(/^#/, '').split('?')[0] || '/');
export function currentQuery() {
  const q = location.hash.split('?')[1];
  return q ? Object.fromEntries(new URLSearchParams(q)) : {};
}

/* ---------------- render ---------------- */
let renderToken = 0;
export async function render() {
  const token = ++renderToken;
  const path = currentPath();
  const outlet = document.getElementById('outlet');

  if (!S.get().onboarded && path !== '/onboarding') return navigate('/onboarding', { replace: true });

  const m = matchRoute(path);
  if (!m) {
    mount(outlet, h('.empty', h('.empty-art', icon('search')), h('h3', 'Page not found'),
      h('p', `Nothing lives at ${path}.`),
      h('button.btn.btn-primary', { onclick: () => navigate('/') }, 'Go home')));
    return;
  }
  currentTab = m.route.tab;
  /* Onboarding is a full-screen flow — no tab bar, sidebar or top bar. */
  const chrome = path !== '/onboarding';
  document.getElementById('tabbar').hidden = !chrome;
  document.getElementById('sidebar').hidden = !chrome;
  document.getElementById('topbar').hidden = !chrome;
  document.getElementById('outlet').style.paddingBottom = chrome ? '' : '32px';
  if (chrome) { renderTabbar(); renderSidebar(); renderTopbar(m.route.title || '…'); }

  try {
    const mod = await m.route.mod();
    if (token !== renderToken) return;
    const ctx = { params: m.params, query: currentQuery(), navigate, back, refresh: render, path };
    const view = await mod.render(ctx);
    if (token !== renderToken) return;
    const title = (typeof mod.title === 'function' ? mod.title(ctx) : mod.title) || m.route.title || 'Forge';
    if (chrome) renderTopbar(title, typeof mod.actions === 'function' ? mod.actions(ctx) : null);
    mount(outlet, view);
    outlet.classList.remove('fade-in'); void outlet.offsetWidth; outlet.classList.add('fade-in');
    document.title = `${title} — Forge`;
  } catch (err) {
    console.error('View failed', err);
    if (token !== renderToken) return;
    mount(outlet, h('.empty', h('.empty-art', icon('alert')), h('h3', 'Something went wrong'),
      h('p', String(err && err.message || err)),
      h('button.btn', { onclick: () => render() }, 'Try again')));
  }
  renderResumeBar();
  if (!location.hash.includes('#/active')) window.scrollTo({ top: 0 });
}

/* ---------------- service worker ---------------- */
async function registerSW() {
  if (!('serviceWorker' in navigator)) return;
  if (location.protocol === 'file:') return;
  try {
    const reg = await navigator.serviceWorker.register('sw.js', { scope: './' });
    reg.addEventListener('updatefound', () => {
      const w = reg.installing;
      if (!w) return;
      w.addEventListener('statechange', () => {
        if (w.state === 'installed' && navigator.serviceWorker.controller) {
          const t = toast('New version available — tap to update', '', 9000);
          t && t.addEventListener('click', () => { w.postMessage({ type: 'SKIP_WAITING' }); location.reload(); });
        }
      });
    });
  } catch (e) { console.warn('SW registration failed', e); }
}

/* ---------------- boot ---------------- */
async function boot() {
  S.load();
  S.watchStorage();
  applyTheme();

  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
    if (S.settings().theme === 'system') applyTheme();
  });

  window.addEventListener('hashchange', render);
  watchInstallPrompt((available) => { if (!available) toast('Forge installed', 'good'); });
  window.addEventListener('online', () => toast('Back online', 'good', 1800));
  window.addEventListener('beforeunload', () => S.saveImmediate());
  document.addEventListener('visibilitychange', () => { if (document.hidden) S.saveImmediate(); });

  const outlet = document.getElementById('outlet');
  const topbar = document.getElementById('topbar');
  const onScroll = () => topbar.classList.toggle('scrolled', window.scrollY > 4);
  window.addEventListener('scroll', onScroll, { passive: true });

  /* Re-render the shell (nav badges, resume bar) when state changes. */
  S.subscribe((_, reason) => {
    if (reason === 'settings') applyTheme();
    if (['session', 'settings', 'plan'].includes(reason)) { renderTabbar(); renderSidebar(); renderResumeBar(); }
    if (reason === 'external' || reason === 'import' || reason === 'reset') render();
  });

  /* The imported library should be present before the first render so exercise
     ids saved in sessions and templates resolve. It is precached by the service
     worker, so this is instant after the first visit — but never block startup
     on it: if the network stalls, boot with the curated library and merge the
     rest in when it arrives. */
  await Promise.race([
    S.loadExtendedLibrary(),
    new Promise((r) => setTimeout(r, 2500)),
  ]);
  S.loadExtendedLibrary().then((list) => { if (list.length) render(); });

  document.getElementById('app').hidden = false;
  const bootEl = document.getElementById('boot');
  bootEl.classList.add('hide');
  setTimeout(() => bootEl.remove(), 320);

  render();
  registerSW();

  /* Reminders are recomputed on each start; see notify.js for the limits. */
  const st = streaks(S.completedSessions());
  const plan = S.planDayFor(todayKey());
  scheduleReminders(S.settings(), {
    streak: st.current,
    daysSinceLast: st.lastDate ? daysBetween(parseDay(st.lastDate), new Date()) : 99,
    plannedName: plan && !plan.isRest ? plan.day.name : null,
  });
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
else boot();
