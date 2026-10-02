import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, shareReplay } from 'rxjs';
import { environment } from '@env/environment';
import { Secretariat, SecretariatDTO } from '@core/models';

@Injectable({
  providedIn: 'root'
})
export class SecretariaService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/secretarias`;
  private cache$?: Observable<Secretariat[]>;

  getAll(forceRefresh = false): Observable<Secretariat[]> {
    if (!this.cache$ || forceRefresh) {
      this.cache$ = this.http.get<Secretariat[]>(this.apiUrl).pipe(
        shareReplay({ bufferSize: 1, refCount: false })
      );
    }
    return this.cache$;
  }

  clearCache(): void {
    this.cache$ = undefined;
  }

  getById(id: number): Observable<Secretariat> {
    return this.http.get<Secretariat>(`${this.apiUrl}/${id}`);
  }

  create(dto: SecretariatDTO | any): Observable<Secretariat> {
    this.clearCache();
    return this.http.post<Secretariat>(this.apiUrl, dto);
  }

  update(id: number, dto: SecretariatDTO | any): Observable<Secretariat> {
    this.clearCache();
    return this.http.put<Secretariat>(`${this.apiUrl}/${id}`, dto);
  }

  delete(id: number): Observable<void> {
    this.clearCache();
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }
}
