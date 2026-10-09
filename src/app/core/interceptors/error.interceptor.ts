import { inject } from '@angular/core';
import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { catchError, throwError } from 'rxjs';
import { ToastService } from '@core/services/toast.service';
import { ApiErrorResponse } from '@core/models/api.models';
import { SKIP_GLOBAL_ERROR } from './http-context';

export function httpErrorMessage(error: HttpErrorResponse): string {
  if (error.status === 401) return 'Sua sessão expirou. Entre novamente para continuar.';
  if (error.status === 403) return 'Você não tem permissão para realizar esta operação.';
  if (error.status === 0) return 'Não foi possível conectar ao servidor. Verifique sua conexão.';
  if (error.status >= 500) return 'O servidor não conseguiu concluir a operação. Tente novamente.';

  const body = error.error;
  if (typeof body === 'string' && body.trim()) {
    return body.trim();
  }

  if (body && typeof body === 'object') {
    const payload = body as ApiErrorResponse;
    let detailMessages: string[] = [];

    if (Array.isArray(payload.errors)) {
      detailMessages = (payload.errors as unknown[])
        .map(item => {
          if (typeof item === 'string') return item;
          if (item && typeof item === 'object') {
            const obj = item as { defaultMessage?: unknown; message?: unknown };
            if (typeof obj.defaultMessage === 'string') return obj.defaultMessage;
            if (typeof obj.message === 'string') return obj.message;
          }
          return null;
        })
        .filter((msg): msg is string => Boolean(msg && msg.trim()));
    } else if (payload.errors && typeof payload.errors === 'object') {
      detailMessages = Object.values(payload.errors)
        .map(val => typeof val === 'string' ? val : null)
        .filter((msg): msg is string => Boolean(msg && msg.trim()));
    }

    const mainMessage = (typeof payload.message === 'string' && payload.message.trim())
      ? payload.message.trim()
      : (typeof payload.mensagem === 'string' && payload.mensagem.trim())
        ? payload.mensagem.trim()
        : '';

    if (mainMessage && detailMessages.length > 0) {
      return `${mainMessage}: ${detailMessages.join(', ')}`;
    }
    if (detailMessages.length > 0) {
      return detailMessages.join(', ');
    }
    if (mainMessage) {
      return mainMessage;
    }
  }

  if (error.status === 404) return 'O registro solicitado não foi encontrado.';
  if (error.status === 400 || error.status === 422) return 'Confira os dados informados e tente novamente.';
  return 'Não foi possível concluir a operação. Tente novamente.';
}

export const errorInterceptor: HttpInterceptorFn = (request, next) => {
  const toast = inject(ToastService);
  return next(request).pipe(
    catchError((error: unknown) => {
      if (error instanceof HttpErrorResponse && !request.context.get(SKIP_GLOBAL_ERROR)) {
        toast.error(httpErrorMessage(error));
      }
      return throwError(() => error);
    })
  );
};
