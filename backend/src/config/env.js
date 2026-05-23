const env = {
  NODE_ENV:               process.env.NODE_ENV || 'development',
  PORT:                   parseInt(process.env.PORT, 10) || 5000,
  MONGO_URI:              process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/dor_cellular',
  JWT_SECRET:             process.env.JWT_SECRET || 'dev_jwt_secret_change_me',
  JWT_EXPIRES_IN:         process.env.JWT_EXPIRES_IN || '15m',
  JWT_REFRESH_SECRET:     process.env.JWT_REFRESH_SECRET || 'dev_refresh_secret_change_me_DIFFERENT',
  JWT_REFRESH_EXPIRES_IN: process.env.JWT_REFRESH_EXPIRES_IN || '30d',
  BCRYPT_SALT_ROUNDS:     parseInt(process.env.BCRYPT_SALT_ROUNDS, 10) || 10,
  FRONTEND_URL:           process.env.FRONTEND_URL || 'http://localhost:5173',
  RATE_LIMIT_WINDOW_MS:   parseInt(process.env.RATE_LIMIT_WINDOW_MS, 10) || 15 * 60 * 1000,
  RATE_LIMIT_MAX:         parseInt(process.env.RATE_LIMIT_MAX, 10) || 200,
  SMS_PROVIDER:           process.env.SMS_PROVIDER || 'stub',
  SMS_API_KEY:            process.env.SMS_API_KEY || '',
  WHATSAPP_API_URL:       process.env.WHATSAPP_API_URL || '',
  LOG_LEVEL:              process.env.LOG_LEVEL || 'info',
  AUTO_SEED_IF_EMPTY:     (process.env.AUTO_SEED_IF_EMPTY || 'false').toLowerCase() === 'true',
  ANTHROPIC_API_KEY:      process.env.ANTHROPIC_API_KEY || '',
  RESEND_API_KEY:         process.env.RESEND_API_KEY || '',
  OWNER_EMAIL:            process.env.OWNER_EMAIL || '',
  GOOGLE_CLIENT_ID:       process.env.GOOGLE_CLIENT_ID || '',
  // Set RETURN_DEV_TOKEN=true only in explicitly non-production local dev to expose reset tokens in API responses
  RETURN_DEV_TOKEN:       process.env.RETURN_DEV_TOKEN === 'true',
  PROJECT_ROOT:           process.env.PROJECT_ROOT || require('path').resolve(__dirname, '../../..'),
};

// --- Production safety checks ---
if (env.NODE_ENV === 'production') {
  if (!process.env.JWT_SECRET || process.env.JWT_SECRET === 'dev_jwt_secret_change_me') {
    throw new Error('FATAL: JWT_SECRET must be set to a strong random value in production');
  }
  if (!process.env.JWT_REFRESH_SECRET || process.env.JWT_REFRESH_SECRET === 'dev_refresh_secret_change_me_DIFFERENT') {
    throw new Error('FATAL: JWT_REFRESH_SECRET must be set to a strong random value in production');
  }
}

if (env.JWT_SECRET === env.JWT_REFRESH_SECRET) {
  // eslint-disable-next-line no-console
  console.warn('⚠  JWT_SECRET and JWT_REFRESH_SECRET are identical — use two different values.');
}

module.exports = env;
