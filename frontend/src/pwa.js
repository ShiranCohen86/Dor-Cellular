/**
 * Service worker registration helper for the PWA.
 *
 * vite-plugin-pwa generates `/sw.js` and the virtual module below at build time.
 * We register it after the page loads to avoid blocking first paint, and we
 * listen for new versions so the user can refresh to update.
 */
import { logInfo, logWarn } from './api/logger.js';

/** Registers the generated service worker (production only — Vite dev SW is disabled). */
export function registerServiceWorker() {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return;

  // When a new SW takes over, reload so the page gets fresh CSS/JS.
  // This fires at most once per deploy — after reload the new SW is in control
  // and controllerchange won't fire again until another new version is deployed.
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    localStorage.setItem('app-just-updated', '1');
    window.location.reload();
  });

  import('virtual:pwa-register')
    .then(({ registerSW }) => {
      registerSW({
        onOfflineReady() { logInfo('pwa', 'app is ready for offline use'); },
        onRegisterError(error) { logWarn('pwa', 'register failed', error); },
      });
    })
    .catch(() => {});
}
