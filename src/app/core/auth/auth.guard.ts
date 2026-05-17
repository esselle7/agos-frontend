import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from './auth.service';

export const authGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  const ok = authService.isAuthenticated();
  console.log('[AuthGuard] isAuthenticated:', ok);
  if (ok) return true;
  console.warn('[AuthGuard] non autenticato → redirect /login');
  return router.createUrlTree(['/login']);
};
