const AuditLog = require('../models/AuditLog');
const logger = require('../utils/logger');

// Records an audit entry after a successful (2xx) response.
// Use sparingly on mutating endpoints.
function audit(action, entityFn) {
  return (req, res, next) => {
    res.on('finish', () => {
      if (res.statusCode < 200 || res.statusCode >= 300) return;
      const entity = typeof entityFn === 'function' ? entityFn(req, res) : entityFn;
      AuditLog.create({
        userId: req.user?.id,
        action,
        entity: entity?.type,
        entityId: entity?.id,
        ip: req.ip,
        userAgent: req.headers['user-agent'],
        meta: entity?.meta,
      }).catch((err) => logger.warn('audit log failed', { err: err.message }));
    });
    next();
  };
}

module.exports = { audit };
