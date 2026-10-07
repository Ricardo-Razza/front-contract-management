import { inject } from '@angular/core';
import { HttpInterceptorFn } from '@angular/common/http';
import { defer, finalize } from 'rxjs';
import { HttpLoadingService } from '@core/services/http-loading.service';
import { SKIP_GLOBAL_LOADING } from './http-context';

export const loadingInterceptor: HttpInterceptorFn = (request, next) => {
  const loading = inject(HttpLoadingService);
  if (request.context.get(SKIP_GLOBAL_LOADING)) return next(request);
  return defer(() => {
    loading.begin();
    return next(request).pipe(finalize(() => loading.end()));
  });
};
