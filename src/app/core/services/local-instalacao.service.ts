import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '@env/environment';
import { LocalInstalacao, LocalInstalacaoDTO } from '@core/models';

@Injectable({
  providedIn: 'root'
})
export class LocalInstalacaoService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/locais-instalacao`;

  getAll(secretariaId?: number): Observable<LocalInstalacao[]> {
    let params = new HttpParams();
    if (secretariaId) {
      params = params.set('secretariaId', secretariaId.toString());
    }
    return this.http.get<LocalInstalacao[]>(this.apiUrl, { params });
  }

  getById(id: number): Observable<LocalInstalacao> {
    return this.http.get<LocalInstalacao>(`${this.apiUrl}/${id}`);
  }

  create(dto: LocalInstalacaoDTO): Observable<LocalInstalacao> {
    return this.http.post<LocalInstalacao>(this.apiUrl, dto);
  }

  update(id: number, dto: LocalInstalacaoDTO): Observable<LocalInstalacao> {
    return this.http.put<LocalInstalacao>(`${this.apiUrl}/${id}`, dto);
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }
}
