import rateLimit from 'express-rate-limit';

// Brute-force guard for login. Only FAILED attempts count, so legit logins never
// burn the bucket. Behind the Next.js proxy, req.ip can collapse to a shared
// upstream IP, so the limit is generous to avoid locking out all users at once.
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 50,
  skipSuccessfulRequests: true,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { error: { code: 'TOO_MANY_REQUESTS', message: 'Too many auth attempts, slow down.' } },
});

// Refresh runs on every page load and is already gated by a signed httpOnly
// cookie, so it gets a much higher ceiling than login. Without this, normal
// browsing (each reload = one refresh) trips the strict login limit.
export const refreshLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 600,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { error: { code: 'TOO_MANY_REQUESTS', message: 'Too many refresh attempts, slow down.' } },
});

export const apiLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 300,                  // 300 req/min/IP for general API
  standardHeaders: 'draft-7',
  legacyHeaders: false,
});
