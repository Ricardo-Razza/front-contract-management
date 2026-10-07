import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '@env/environment';
import { Agreement, AgreementDTO, ApiPage, DocumentoQuery, DocumentoFilterOptions } from '@core/models';

@Injectable({
  providedIn: 'root'
})
export class AtaService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/atas`;

  getAll(): Observable<Agreement[]> {
    return this.http.get<Agreement[]>(this.apiUrl);
  }

  getPage(page = 0, size = 25, sort = ['id,desc'], query?: DocumentoQuery): Observable<ApiPage<Agreement>> {
    let params = new HttpParams().set('page', page).set('size', size);
    for (const order of sort) params = params.append('sort', order);
    if (query) {
      for (const key of ['search','ano','tipo','status','vigencia'] as const) if (query[key]) params = params.set(key, query[key]);
      for (const value of query.secretarias) params = params.append('secretarias', value);
      for (const value of query.pessoas) params = params.append('pessoas', value);
    }
    return this.http.get<ApiPage<Agreement>>(`${this.apiUrl}/paginado`, { params });
  }

  getFilterOptions(): Observable<DocumentoFilterOptions> { return this.http.get<DocumentoFilterOptions>(`${this.apiUrl}/filtros`); }

  getById(id: number): Observable<Agreement> {
    return this.http.get<Agreement>(`${this.apiUrl}/${id}`);
  }

  create(dto: AgreementDTO | any): Observable<Agreement> {
    return this.http.post<Agreement>(this.apiUrl, dto);
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }

  update(id: number, dto: any): Observable<Agreement> {
    return this.http.put<Agreement>(`${this.apiUrl}/${id}`, dto);
    //
  }
}
