/* PWA install prompt. Kept out of app.js so views can import it without
   pulling in the module that bootstraps the application. */
let deferred = null;

export function watchInstallPrompt(onChange) {
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault(); deferred = e; onChange && onChange(true);
  });
  window.addEventListener('appinstalled', () => { deferred = null; onChange && onChange(false); });
}
export const canInstall = () => !!deferred;
export const isStandalone = () =>
  window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;

export async function promptInstall() {
  if (!deferred) return false;
  deferred.prompt();
  const { outcome } = await deferred.userChoice;
  deferred = null;
  return outcome === 'accepted';
}
