const stores = new Map();

const getClientIp = (req) => {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string' && forwarded.length > 0) {
    return forwarded.split(',')[0].trim();
  }
  return req.ip || req.connection?.remoteAddress || 'unknown';
};

export const createRateLimiter = ({
  keyPrefix,
  windowMs,
  max,
  blockMs = windowMs,
  message,
  keyGenerator,
}) => {
  if (!stores.has(keyPrefix)) {
    stores.set(keyPrefix, new Map());
  }

  const store = stores.get(keyPrefix);

  return (req, res, next) => {
    const now = Date.now();
    const defaultKey = `${keyPrefix}:${getClientIp(req)}`;
    const key = (typeof keyGenerator === 'function' ? keyGenerator(req) : null) || defaultKey;

    let entry = store.get(key);

    if (!entry || now - entry.windowStart >= windowMs) {
      entry = {
        count: 0,
        windowStart: now,
        blockedUntil: 0,
      };
    }

    if (entry.blockedUntil && now < entry.blockedUntil) {
      const retryAfterSeconds = Math.max(1, Math.ceil((entry.blockedUntil - now) / 1000));
      res.set('Retry-After', String(retryAfterSeconds));
      return res.status(429).json({
        success: false,
        message,
      });
    }

    entry.count += 1;

    if (entry.count > max) {
      entry.blockedUntil = now + blockMs;
      store.set(key, entry);

      const retryAfterSeconds = Math.max(1, Math.ceil(blockMs / 1000));
      res.set('Retry-After', String(retryAfterSeconds));
      return res.status(429).json({
        success: false,
        message,
      });
    }

    store.set(key, entry);
    return next();
  };
};

export const authLoginLimiter = createRateLimiter({
  keyPrefix: 'auth-login',
  windowMs: 15 * 60 * 1000,
  max: 8,
  blockMs: 30 * 60 * 1000,
  message: 'Too many login attempts. Try again later.',
});

export const forgotPasswordLimiter = createRateLimiter({
  keyPrefix: 'auth-forgot-password',
  windowMs: 15 * 60 * 1000,
  max: 5,
  blockMs: 30 * 60 * 1000,
  message: 'Too many reset requests. Try again later.',
});

export const resetPasswordLimiter = createRateLimiter({
  keyPrefix: 'auth-reset-password',
  windowMs: 15 * 60 * 1000,
  max: 10,
  blockMs: 30 * 60 * 1000,
  message: 'Too many reset attempts. Try again later.',
});

export const verificationLimiter = createRateLimiter({
  keyPrefix: 'auth-verification',
  windowMs: 15 * 60 * 1000,
  max: 6,
  blockMs: 30 * 60 * 1000,
  message: 'Too many verification attempts. Try again later.',
  keyGenerator: (req) => {
    const userId = req.userId || req.user?.id || 'anon';
    return `auth-verification:${userId}:${getClientIp(req)}`;
  },
});
