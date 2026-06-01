import { z } from 'zod';

export const loginSchema = z.object({
  email: z.string().email().toLowerCase(),
  password: z.string().min(1),
});

export const registerSchema = z.object({
  email: z.string().email().toLowerCase(),
  password: z.string().min(8).max(128),
  fullName: z.string().min(2).max(120),
  phone: z.string().optional(),
  roleId: z.string().min(1),
});

export const refreshSchema = z.object({
  refreshToken: z.string().optional(),    // optional: usually comes from cookie
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(8).max(128),
});

export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
