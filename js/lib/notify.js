/* Local reminder notifications. Uses the Notification API when permitted and
   an in-page fallback otherwise. Schedules are recomputed on every app start,
   which is the honest limit of what a PWA can do without a push server. */
import { toast } from './ui.js';

const timers = new Map();

export const supported = () => typeof Notification !== 'undefined';
export const permission = () => (supported() ? Notification.permission : 'unsupported');

export async function requestPermission() {
  if (!supported()) return 'unsupported';
  if (Notification.permission !== 'default') return Notification.permission;
  try { return await Notification.requestPermission(); } catch { return 'denied'; }
}

async function show(title, body, url = './') {
  if (supported() && Notification.permission === 'granted') {
    try {
      const reg = navigator.serviceWorker && (await navigator.serviceWorker.getRegistration());
      const opts = { body, icon: 'icons/icon-192.png', badge: 'icons/icon-192.png',
        tag: title, data: { url }, silent: false };
      if (reg && reg.showNotification) await reg.showNotification(title, opts);
      else new Notification(title, opts);
      return true;
    } catch { /* fall through */ }
  }
  toast(`${title} — ${body}`);
  return false;
}

/** Fire an immediate notification (used for the "test" button and rest timers). */
export const notifyNow = show;

function clearAll() {
  for (const t of timers.values()) clearTimeout(t);
  timers.clear();
}

/**
 * Recompute all reminder timers from settings. Only fires while the tab is
 * alive — a genuine limitation without a push backend, surfaced in Settings.
 */
export function scheduleReminders(settings, ctx = {}) {
  clearAll();
  if (!settings?.notifications?.enabled) return;
  const n = settings.notifications;
  const now = new Date();

  const at = (h, m, dayOffset = 0) => {
    const d = new Date(now);
    d.setDate(d.getDate() + dayOffset);
    d.setHours(h, m, 0, 0);
    return d;
  };
  const arm = (key, when, title, body, url) => {
    const ms = when - now;
    if (ms <= 0 || ms > 26 * 3600 * 1000) return;
    timers.set(key, setTimeout(() => show(title, body, url), ms));
  };

  const [wh, wm] = String(n.workoutTime || '18:00').split(':').map(Number);
  if (n.workoutReminder) {
    const today = at(wh, wm);
    const target = today > now ? today : at(wh, wm, 1);
    const planned = ctx.plannedName || 'your session';
    arm('workout', target, 'Time to train', `${planned} is on your plan today.`, './#/workouts');
  }
  if (n.streakReminder && ctx.streak > 0) {
    arm('streak', at(20, 30), `${ctx.streak}-day streak`, 'Keep it going — log today\'s session.', './#/');
  }
  if (n.missedReminder && ctx.daysSinceLast >= 3) {
    arm('missed', at(Math.max(wh, 17), 0), 'It has been a few days',
      `${ctx.daysSinceLast} days since your last workout. Even a short session counts.`, './#/workouts');
  }
  if (n.goalReminder) {
    arm('goal', at(9, 0, now.getDay() === 0 ? 0 : 7 - now.getDay()), 'Weekly goal check-in',
      'Review your goal progress for the week.', './#/goals');
  }
}

export function cancelReminders() { clearAll(); }
