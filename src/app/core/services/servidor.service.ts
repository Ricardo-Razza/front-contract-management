import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '@env/environment';
import { Servant, ServantDTO } from '@core/models';

@Injectable({
  providedIn: 'root'
})
export class ServidorService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/servidores`;

  getAll(): Observable<Servant[]> {
    return this.http.get<Servant[]>(this.apiUrl);
  }

  getById(id: number): Observable<Servant> {
    return this.http.get<Servant>(`${this.apiUrl}/${id}`);
  }

  create(dto: ServantDTO | any): Observable<Servant> {
    return this.http.post<Servant>(this.apiUrl, dto);
  }

  update(id: number, dto: ServantDTO | any): Observable<Servant> {
    return this.http.put<Servant>(`${this.apiUrl}/${id}`, dto);
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }
}
