import type { NextFunction, Request, Response } from 'express';
import { Unauthorized, Forbidden } from '../utils/errors';
import { verifyAccessToken, type AccessTokenPayload } from '../utils/jwt';

declare module 'express-serve-static-core' {
  interface Request {
    user?: AccessTokenPayload;
  }
}

export const requireAuth = (req: Request, _res: Response, next: NextFunction): void => {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    next(Unauthorized('Missing bearer token'));
    return;
  }
  const token = header.slice('Bearer '.length).trim();
  try {
    req.user = verifyAccessToken(token);
    next();
  } catch {
    next(Unauthorized('Invalid or expired token'));
  }
};

export const requirePermission =
  (...keys: string[]) =>
  (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) return next(Unauthorized());
    const ok = keys.every((k) => req.user!.permissions.includes(k));
    if (!ok) return next(Forbidden(`Missing permission: ${keys.join(', ')}`));
    next();
  };

export const requireRole =
  (...roles: string[]) =>
  (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) return next(Unauthorized());
    if (!roles.includes(req.user.role)) return next(Forbidden(`Role not allowed: ${req.user.role}`));
    next();
  };
