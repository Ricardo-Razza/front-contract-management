import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, catchError, throwError, shareReplay } from 'rxjs';
import { environment } from '@env/environment';
import { LookupItem } from '@core/models';

@Injectable({
  providedIn: 'root'
})
export class LookupService {
  private http = inject(HttpClient);
  private apiUrl = environment.apiUrl;

  private ativosCache$?: Observable<LookupItem[]>;
  private tiposCache$?: Observable<LookupItem[]>;
  private funcoesCache$?: Observable<LookupItem[]>;

  getAtivos(forceRefresh = false): Observable<LookupItem[]> {
    if (!this.ativosCache$ || forceRefresh) {
      this.ativosCache$ = this.http.get<LookupItem[]>(`${this.apiUrl}/ativos`).pipe(
        catchError(err => {
          this.ativosCache$ = undefined;
          return throwError(() => err);
        }),
        shareReplay({ bufferSize: 1, refCount: false })
      );
    }
    return this.ativosCache$;
  }

  getTipos(forceRefresh = false): Observable<LookupItem[]> {
    if (!this.tiposCache$ || forceRefresh) {
      this.tiposCache$ = this.http.get<LookupItem[]>(`${this.apiUrl}/tipos`).pipe(
        catchError(err => {
          this.tiposCache$ = undefined;
          return throwError(() => err);
        }),
        shareReplay({ bufferSize: 1, refCount: false })
      );
    }
    return this.tiposCache$;
  }

  getFuncoesEquipe(forceRefresh = false): Observable<LookupItem[]> {
    if (!this.funcoesCache$ || forceRefresh) {
      this.funcoesCache$ = this.http.get<LookupItem[]>(`${this.apiUrl}/funcoes-equipe`).pipe(
        catchError(err => {
          this.funcoesCache$ = undefined;
          return throwError(() => err);
        }),
        shareReplay({ bufferSize: 1, refCount: false })
      );
    }
    return this.funcoesCache$;
  }

  clearCache(): void {
    this.ativosCache$ = undefined;
    this.tiposCache$ = undefined;
    this.funcoesCache$ = undefined;
  }
}
