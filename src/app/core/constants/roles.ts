export const ROLES = {
  ADMIN:      'ADMIN',
  DIPENDENTE: 'DIPENDENTE',
} as const;

export type Role = typeof ROLES[keyof typeof ROLES];

export const ADMIN_ROUTES = ['/movimenti', '/cassa', '/bu', '/reporting', '/anagrafica'];
export const DIPENDENTE_ROUTES = ['/dashboard', '/eventi'];
