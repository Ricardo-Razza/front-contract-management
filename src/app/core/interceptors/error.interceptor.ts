import { inject } from '@angular/core';
import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { catchError, throwError } from 'rxjs';
import { ToastService } from '@core/services/toast.service';
import { SKIP_GLOBAL_ERROR } from './http-context';

export function httpErrorMessage(error: HttpErrorResponse): string {
  if (error.status === 401) return 'Sua sessão expirou. Entre novamente para continuar.';
  if (error.status === 403) return 'Você não tem permissão para realizar esta operação.';
  if (error.status === 0) return 'Não foi possível conectar ao servidor. Verifique sua conexão.';
  if (error.status >= 500) return 'O servidor não conseguiu concluir a operação. Tente novamente.';
  const body: unknown = error.error;
  if (body && typeof body === 'object') {
    const payload = body as { message?: unknown; mensagem?: unknown; errors?: unknown };
    if (payload.errors && typeof payload.errors === 'object') {
      const messages = Object.values(payload.errors).filter((value): value is string => typeof value === 'string');
      if (messages.length) return messages.join(' ');
    }
    const message = payload.message ?? payload.mensagem;
    if (typeof message === 'string' && message.trim()) return message;
  }
  if (error.status === 404) return 'O registro solicitado não foi encontrado.';
  if (error.status === 400 || error.status === 422) return 'Confira os dados informados e tente novamente.';
  return 'Não foi possível concluir a operação. Tente novamente.';
}

export const errorInterceptor: HttpInterceptorFn = (request, next) => {
  const toast = inject(ToastService);
  return next(request).pipe(catchError((error: unknown) => {
    if (error instanceof HttpErrorResponse && !request.context.get(SKIP_GLOBAL_ERROR)) {
      toast.error(httpErrorMessage(error));
    }
    return throwError(() => error);
  }));
};
