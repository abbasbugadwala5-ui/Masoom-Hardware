import bcrypt from 'bcryptjs';
import { nanoid } from 'nanoid';
import { prisma } from '../../db/prisma';
import {
  BadRequest,
  Conflict,
  NotFound,
  Unauthorized,
} from '../../utils/errors';
import {
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
} from '../../utils/jwt';
import { env } from '../../config/env';
import type { LoginInput, RegisterInput, ChangePasswordInput } from './auth.schema';

const BCRYPT_COST = 12;

/** Parse a JWT-style duration string (e.g. "15m", "30d") into milliseconds. */
function parseDurationMs(spec: string): number {
  const m = /^(\d+)\s*([smhd])$/i.exec(spec.trim());
  if (!m) throw new Error(`Invalid duration: ${spec}`);
  const n = Number(m[1]);
  const unit = m[2]!.toLowerCase();
  const mult = { s: 1_000, m: 60_000, h: 3_600_000, d: 86_400_000 }[unit]!;
  return n * mult;
}

async function loadUserWithRole(userId: string) {
  return prisma.user.findFirst({
    where: { id: userId, deletedAt: null, isActive: true },
    include: {
      role: { include: { permissions: { include: { permission: true } } } },
    },
  });
}

function tokenizeUser(u: NonNullable<Awaited<ReturnType<typeof loadUserWithRole>>>) {
  const permissions = u.role.permissions.map((rp) => rp.permission.key);
  const accessToken = signAccessToken({
    sub: u.id,
    email: u.email,
    role: u.role.name,
    permissions,
  });
  return { accessToken, permissions };
}

export interface AuthContext {
  ip?: string;
  userAgent?: string;
}

export const AuthService = {
  async register(input: RegisterInput) {
    const existing = await prisma.user.findUnique({ where: { email: input.email } });
    if (existing) throw Conflict('Email already in use');

    const role = await prisma.role.findUnique({ where: { id: input.roleId } });
    if (!role) throw BadRequest('Invalid role');

    const passwordHash = await bcrypt.hash(input.password, BCRYPT_COST);
    const user = await prisma.user.create({
      data: {
        email: input.email,
        passwordHash,
        fullName: input.fullName,
        phone: input.phone,
        roleId: role.id,
      },
      select: { id: true, email: true, fullName: true, roleId: true, createdAt: true },
    });
    return user;
  },

  async login(input: LoginInput, ctx: AuthContext) {
    const user = await prisma.user.findUnique({
      where: { email: input.email },
      include: {
        role: { include: { permissions: { include: { permission: true } } } },
      },
    });
    if (!user || user.deletedAt || !user.isActive) throw Unauthorized('Invalid credentials');

    const ok = await bcrypt.compare(input.password, user.passwordHash);
    if (!ok) throw Unauthorized('Invalid credentials');

    const { accessToken, permissions } = tokenizeUser(user);

    const jti = nanoid(24);
    const expiresAt = new Date(Date.now() + parseDurationMs(env.JWT_REFRESH_TTL));
    await prisma.refreshToken.create({
      data: {
        jti,
        userId: user.id,
        expiresAt,
        ip: ctx.ip,
        userAgent: ctx.userAgent,
      },
    });
    const refreshToken = signRefreshToken({ sub: user.id, jti });

    await prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });

    return {
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        role: user.role.name,
        permissions,
      },
    };
  },

  async refresh(rawToken: string, ctx: AuthContext) {
    let payload;
    try {
      payload = verifyRefreshToken(rawToken);
    } catch {
      throw Unauthorized('Invalid refresh token');
    }

    const stored = await prisma.refreshToken.findUnique({ where: { jti: payload.jti } });
    if (!stored || stored.revokedAt || stored.expiresAt < new Date() || stored.userId !== payload.sub) {
      throw Unauthorized('Refresh token revoked or expired');
    }

    const user = await loadUserWithRole(payload.sub);
    if (!user) throw Unauthorized('User no longer active');

    // Rotate: revoke old, issue new
    const newJti = nanoid(24);
    const expiresAt = new Date(Date.now() + parseDurationMs(env.JWT_REFRESH_TTL));
    await prisma.$transaction([
      prisma.refreshToken.update({
        where: { jti: stored.jti },
        data: { revokedAt: new Date() },
      }),
      prisma.refreshToken.create({
        data: {
          jti: newJti,
          userId: user.id,
          expiresAt,
          ip: ctx.ip,
          userAgent: ctx.userAgent,
        },
      }),
    ]);

    const { accessToken } = tokenizeUser(user);
    const refreshToken = signRefreshToken({ sub: user.id, jti: newJti });
    return { accessToken, refreshToken };
  },

  async logout(rawToken: string | undefined) {
    if (!rawToken) return;
    try {
      const payload = verifyRefreshToken(rawToken);
      await prisma.refreshToken.updateMany({
        where: { jti: payload.jti, revokedAt: null },
        data: { revokedAt: new Date() },
      });
    } catch {
      // swallow — logout should be idempotent
    }
  },

  async me(userId: string) {
    const user = await loadUserWithRole(userId);
    if (!user) throw NotFound('User not found');
    return {
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      phone: user.phone,
      role: user.role.name,
      permissions: user.role.permissions.map((rp) => rp.permission.key),
    };
  },

  async changePassword(userId: string, input: ChangePasswordInput) {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw NotFound('User not found');
    const ok = await bcrypt.compare(input.currentPassword, user.passwordHash);
    if (!ok) throw Unauthorized('Current password is incorrect');
    const passwordHash = await bcrypt.hash(input.newPassword, BCRYPT_COST);
    await prisma.$transaction([
      prisma.user.update({ where: { id: userId }, data: { passwordHash } }),
      prisma.refreshToken.updateMany({
        where: { userId, revokedAt: null },
        data: { revokedAt: new Date() },
      }),
    ]);
  },
};

