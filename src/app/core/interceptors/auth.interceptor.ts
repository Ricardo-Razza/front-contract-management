import { InjectionToken, inject } from '@angular/core';
import { HttpInterceptorFn } from '@angular/common/http';
import { environment } from '@env/environment';

/** Substituir o provider ao habilitar autenticação. Não persiste credenciais. */
export const AUTH_TOKEN_SOURCE = new InjectionToken<() => string | null>('AUTH_TOKEN_SOURCE', {
  providedIn: 'root', factory: () => () => null
});

export const authInterceptor: HttpInterceptorFn = (request, next) => {
  const api = new URL(environment.apiUrl, window.location.origin);
  const target = new URL(request.url, window.location.origin);
  const belongsToApi = target.origin === api.origin
    && (target.pathname === api.pathname || target.pathname.startsWith(api.pathname.replace(/\/$/, '') + '/'));
  const token = belongsToApi ? inject(AUTH_TOKEN_SOURCE)() : null;
  return next(token && !request.headers.has('Authorization')
    ? request.clone({ setHeaders: { Authorization: `Bearer ${token}` } }) : request);
};
