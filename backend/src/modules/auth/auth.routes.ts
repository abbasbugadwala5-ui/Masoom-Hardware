import { Router } from 'express';
import { AuthController } from './auth.controller';
import {
  loginSchema,
  registerSchema,
  changePasswordSchema,
} from './auth.schema';
import { validate } from '../../middleware/validate';
import { requireAuth, requirePermission } from '../../middleware/auth';
import { authLimiter } from '../../middleware/rateLimit';
import { asyncHandler } from '../../utils/asyncHandler';

export const authRouter = Router();

authRouter.post(
  '/register',
  requireAuth,
  requirePermission('user.create'),
  validate(registerSchema),
  asyncHandler(AuthController.register),
);

authRouter.post('/login',   authLimiter, validate(loginSchema),  asyncHandler(AuthController.login));
authRouter.post('/refresh', authLimiter,                          asyncHandler(AuthController.refresh));
authRouter.post('/logout',                                        asyncHandler(AuthController.logout));
authRouter.get ('/me',      requireAuth,                          asyncHandler(AuthController.me));

authRouter.post(
  '/change-password',
  requireAuth,
  validate(changePasswordSchema),
  asyncHandler(AuthController.changePassword),
);
