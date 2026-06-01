import type { Request, Response } from 'express';
import { AuthService } from './auth.service';
import { env } from '../../config/env';
import { Unauthorized } from '../../utils/errors';

const REFRESH_COOKIE = 'masoom_rt';

function setRefreshCookie(res: Response, token: string) {
  res.cookie(REFRESH_COOKIE, token, {
    httpOnly: true,
    secure: env.COOKIE_SECURE,
    sameSite: 'lax',
    domain: env.COOKIE_DOMAIN === 'localhost' ? undefined : env.COOKIE_DOMAIN,
    path: '/',
    maxAge: 30 * 24 * 60 * 60 * 1000,
  });
}

function clearRefreshCookie(res: Response) {
  res.clearCookie(REFRESH_COOKIE, {
    httpOnly: true,
    secure: env.COOKIE_SECURE,
    sameSite: 'lax',
    domain: env.COOKIE_DOMAIN === 'localhost' ? undefined : env.COOKIE_DOMAIN,
    path: '/',
  });
}

function ctxFrom(req: Request) {
  return { ip: req.ip, userAgent: req.headers['user-agent'] ?? undefined };
}

export const AuthController = {
  async register(req: Request, res: Response) {
    const user = await AuthService.register(req.body);
    res.status(201).json({ data: user });
  },

  async login(req: Request, res: Response) {
    const { accessToken, refreshToken, user } = await AuthService.login(req.body, ctxFrom(req));
    setRefreshCookie(res, refreshToken);
    res.json({ data: { accessToken, user } });
  },

  async refresh(req: Request, res: Response) {
    const raw =
      (req.cookies?.[REFRESH_COOKIE] as string | undefined) ??
      (req.body?.refreshToken as string | undefined);
    if (!raw) throw Unauthorized('Missing refresh token');
    const { accessToken, refreshToken } = await AuthService.refresh(raw, ctxFrom(req));
    setRefreshCookie(res, refreshToken);
    res.json({ data: { accessToken } });
  },

  async logout(req: Request, res: Response) {
    const raw = req.cookies?.[REFRESH_COOKIE] as string | undefined;
    await AuthService.logout(raw);
    clearRefreshCookie(res);
    res.status(204).end();
  },

  async me(req: Request, res: Response) {
    if (!req.user) throw Unauthorized();
    const data = await AuthService.me(req.user.sub);
    res.json({ data });
  },

  async changePassword(req: Request, res: Response) {
    if (!req.user) throw Unauthorized();
    await AuthService.changePassword(req.user.sub, req.body);
    res.status(204).end();
  },
};
