/**
 * Tiny front-end logger. Wraps console so we can:
 *   - Silence everything in production via `import.meta.env.PROD`.
 *   - Add tags and timestamps consistently.
 *   - Swap in a remote logging service later (Sentry, LogRocket) in one place.
 */
const isProd = !!import.meta.env.PROD;

/**
 * Internal formatter. Returns a label like `[12:34:56] [api] `.
 * @param {string} tag
 */
function buildLabel(tag) {
  const now = new Date();
  const hh = String(now.getHours()).padStart(2, '0');
  const mm = String(now.getMinutes()).padStart(2, '0');
  const ss = String(now.getSeconds()).padStart(2, '0');
  return `[${hh}:${mm}:${ss}] [${tag}]`;
}

/** Log informational messages (silent in production). */
export function logInfo(tag, ...args) {
  if (isProd) return;
  // eslint-disable-next-line no-console
  console.info(buildLabel(tag), ...args);
}

/** Log debug messages (silent in production). */
export function logDebug(tag, ...args) {
  if (isProd) return;
  // eslint-disable-next-line no-console
  console.debug(buildLabel(tag), ...args);
}

/** Log warnings (visible in all environments). */
export function logWarn(tag, ...args) {
  // eslint-disable-next-line no-console
  console.warn(buildLabel(tag), ...args);
}

/** Log errors (visible in all environments). Wire to Sentry here. */
export function logError(tag, ...args) {
  // eslint-disable-next-line no-console
  console.error(buildLabel(tag), ...args);
}
