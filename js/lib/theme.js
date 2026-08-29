/* Theme application. Separate from app.js so settings can call it directly. */
import { h } from './dom.js';

export function applyTheme(settings) {
  const root = document.documentElement;
  if (settings.theme === 'system') root.removeAttribute('data-theme');
  else root.setAttribute('data-theme', settings.theme);
  root.style.setProperty('--accent-h', String(settings.accentHue ?? 18));

  const dark = settings.theme === 'dark'
    || (settings.theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
  for (const m of document.querySelectorAll('meta[name="theme-color"]')) m.remove();
  document.head.appendChild(h('meta', { name: 'theme-color', content: dark ? '#0b0d12' : '#ffffff' }));
}
