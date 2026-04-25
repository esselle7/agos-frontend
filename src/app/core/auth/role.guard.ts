import { inject } from '@angular/core';
import { ActivatedRouteSnapshot, CanActivateFn, Router } from '@angular/router';
import { AuthService } from './auth.service';
import { Role } from '../constants/roles';

export const roleGuard: CanActivateFn = (route: ActivatedRouteSnapshot) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  const requiredRoles: Role[] = route.data['roles'] ?? [];
  const userRole = authService.user()?.ruolo;

  if (userRole && requiredRoles.includes(userRole)) {
    return true;
  }
  return router.createUrlTree(['/dashboard']);
};
