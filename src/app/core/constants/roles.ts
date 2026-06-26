export const ROLES = {
  ADMIN:      'ADMIN',
  DIPENDENTE: 'DIPENDENTE',
} as const;

export type Role = typeof ROLES[keyof typeof ROLES];
