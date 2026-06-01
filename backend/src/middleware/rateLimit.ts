import rateLimit from 'express-rate-limit';

export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 30,                   // 30 attempts per IP per 15 min
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { error: { code: 'TOO_MANY_REQUESTS', message: 'Too many auth attempts, slow down.' } },
});

export const apiLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 300,                  // 300 req/min/IP for general API
  standardHeaders: 'draft-7',
  legacyHeaders: false,
});
