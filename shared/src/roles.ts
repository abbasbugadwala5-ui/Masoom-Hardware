export const ROLE_NAMES = [
  'SUPER_ADMIN',
  'ADMIN',
  'ACCOUNTANT',
  'SALESMAN',
  'WAREHOUSE',
  'CUSTOMER',
] as const;

export type RoleName = typeof ROLE_NAMES[number];
