/**
 * Loads and validates all environment variables in one place.
 * Anywhere in the app, `require('config/env')` gives back typed, defaulted values
 * instead of poking at `process.env` directly (which is error-prone and untyped).
 */
const env = {
  NODE_ENV: process.env.NODE_ENV || 'development',
  PORT: parseInt(process.env.PORT, 10) || 5000,
  MONGO_URI: process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/dor_store',
  JWT_SECRET: process.env.JWT_SECRET || 'dev_jwt_secret_change_me',
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '7d',
  JWT_REFRESH_SECRET: process.env.JWT_REFRESH_SECRET || 'dev_refresh_secret_change_me_DIFFERENT',
  JWT_REFRESH_EXPIRES_IN: process.env.JWT_REFRESH_EXPIRES_IN || '30d',
  BCRYPT_SALT_ROUNDS: parseInt(process.env.BCRYPT_SALT_ROUNDS, 10) || 10,
  FRONTEND_URL: process.env.FRONTEND_URL || 'http://localhost:5173',
  RATE_LIMIT_WINDOW_MS: parseInt(process.env.RATE_LIMIT_WINDOW_MS, 10) || 15 * 60 * 1000,
  RATE_LIMIT_MAX: parseInt(process.env.RATE_LIMIT_MAX, 10) || 200,
  SMS_PROVIDER: process.env.SMS_PROVIDER || 'stub',
  SMS_API_KEY: process.env.SMS_API_KEY || '',
  WHATSAPP_API_URL: process.env.WHATSAPP_API_URL || '',
  LOG_LEVEL: process.env.LOG_LEVEL || 'info',
  AUTO_SEED_IF_EMPTY: (process.env.AUTO_SEED_IF_EMPTY || 'false').toLowerCase() === 'true',
  ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY || '',
  // Absolute path to the repo root. Defaults to the parent of /backend.
  PROJECT_ROOT: process.env.PROJECT_ROOT || require('path').resolve(__dirname, '../../..'),
};

// Sanity check — if both JWT secrets are identical an attacker who steals an access token
// could also forge refresh tokens (and vice-versa). Warn loudly.
if (env.JWT_SECRET === env.JWT_REFRESH_SECRET) {
  // eslint-disable-next-line no-console
  console.warn('⚠  JWT_SECRET and JWT_REFRESH_SECRET are identical. Use two different values for safety.');
}

module.exports = env;
