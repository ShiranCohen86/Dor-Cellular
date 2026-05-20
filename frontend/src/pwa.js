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
  // The virtual module is only available when built with vite-plugin-pwa.
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return;

  // Lazy import so dev builds without the plugin don't fail to start.
  import('virtual:pwa-register')
    .then(({ registerSW }) => {
      const updateServiceWorker = registerSW({
        onNeedRefresh() {
          logInfo('pwa', 'new version available — call updateServiceWorker(true) to apply');
          // A simple "Update available" toast could trigger the line below.
          // updateServiceWorker(true);
        },
        onOfflineReady() { logInfo('pwa', 'app is ready for offline use'); },
        onRegisterError(error) { logWarn('pwa', 'register failed', error); },
      });
      // Expose for any custom "click here to update" UI you may want to add later.
      window.__updateServiceWorker = updateServiceWorker;
    })
    .catch(() => {
      // Plugin not present (e.g. running with the bare Vite config). Harmless.
    });
}
