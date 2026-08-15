import AuditLog from '../models/auditLog.model.js';

// --- Simple in-memory SSE broadcaster ---
const sseClients = new Set();

export const addSseClient = (res) => {
  sseClients.add(res);
  res.on('close', () => {
    sseClients.delete(res);
    try { res.end(); } catch {}
  });
};

const broadcastLog = (log) => {
  const data = `data: ${JSON.stringify(log)}\n\n`;
  for (const res of sseClients) {
    try { res.write(data); } catch {}
  }
};

// Sanitize request body by removing sensitive fields
const sanitize = (obj) => {
  try {
    if (!obj) return null;
    const clone = JSON.parse(JSON.stringify(obj));
    const sensitive = ['password', 'new_password', 'current_password', 'resetPasswordToken'];
    sensitive.forEach((k) => { if (k in clone) clone[k] = '***'; });
    // Truncate large payloads
    const str = JSON.stringify(clone);
    return str.length > 2000 ? { truncated: true } : clone;
  } catch {
    return null;
  }
};

export const logEvent = async ({ req, action, entity_type = null, entity_id = null, metadata = null }) => {
  try {
    const created = await AuditLog.create({
      user_id: req?.user?.id || null,
      user_email: req?.user?.email || null,
      user_role: req?.user?.role || null,
      action: action || `${req?.method} ${req?.originalUrl}`,
      method: req?.method || 'UNKNOWN',
      path: req?.originalUrl || '',
      entity_type,
      entity_id: entity_id ? String(entity_id) : null,
      ip_address: req?.headers['x-forwarded-for']?.split(',')[0] || req?.socket?.remoteAddress || null,
      user_agent: req?.headers['user-agent'] || null,
      metadata: metadata ?? sanitize(req?.body)
    });
    // Push to any live SSE subscribers; enrich with fullname for convenience
    const payload = created.toJSON();
    payload.user_fullname = req?.user?.fullname || null;
    broadcastLog(payload);
  } catch (e) {
    // Don't break main flow on logging failure
    console.warn('Audit log failed:', e.message);
  }
};

// Middleware to log any authenticated request (attach after verifyToken)
export const auditLogger = async (req, res, next) => {
  // We log after response by hooking into finish event
  res.on('finish', () => {
    // Ignore 401/403 to avoid noise
    if (res.statusCode >= 200 && res.statusCode < 400) {
      logEvent({ req });
    }
  });
  next();
};

export default auditLogger;
export { broadcastLog };