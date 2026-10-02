import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, shareReplay } from 'rxjs';
import { environment } from '@env/environment';
import { Servant, ServantDTO } from '@core/models';

@Injectable({
  providedIn: 'root'
})
export class ServidorService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/servidores`;
  private cache$?: Observable<Servant[]>;

  getAll(forceRefresh = false): Observable<Servant[]> {
    if (!this.cache$ || forceRefresh) {
      this.cache$ = this.http.get<Servant[]>(this.apiUrl).pipe(
        shareReplay({ bufferSize: 1, refCount: false })
      );
    }
    return this.cache$;
  }

  clearCache(): void {
    this.cache$ = undefined;
  }

  getById(id: number): Observable<Servant> {
    return this.http.get<Servant>(`${this.apiUrl}/${id}`);
  }

  create(dto: ServantDTO | any): Observable<Servant> {
    this.clearCache();
    return this.http.post<Servant>(this.apiUrl, dto);
  }

  update(id: number, dto: ServantDTO | any): Observable<Servant> {
    this.clearCache();
    return this.http.put<Servant>(`${this.apiUrl}/${id}`, dto);
  }

  delete(id: number): Observable<void> {
    this.clearCache();
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }
}
