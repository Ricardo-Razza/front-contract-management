import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

/**
 * Functional Route Guard (canActivate).
 * Restricts access to authenticated users and redirects unauthenticated users to /login.
 */
export const authGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (authService.isAuthenticated()) {
    return true;
  }

  // Preserve attempted URL if useful, then redirect to login
  return router.createUrlTree(['/login'], {
    queryParams: { returnUrl: state.url !== '/' ? state.url : undefined }
  });
};
