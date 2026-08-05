import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Secretariat, SecretariatDTO } from '../models/api.models';

@Injectable({
  providedIn: 'root'
})
export class SecretariaService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/secretarias`;

  getAll(): Observable<Secretariat[]> {
    return this.http.get<Secretariat[]>(this.apiUrl);
  }

  getById(id: number): Observable<Secretariat> {
    return this.http.get<Secretariat>(`${this.apiUrl}/${id}`);
  }

  create(dto: SecretariatDTO | any): Observable<Secretariat> {
    return this.http.post<Secretariat>(this.apiUrl, dto);
  }

  update(id: number, dto: SecretariatDTO | any): Observable<Secretariat> {
    return this.http.put<Secretariat>(`${this.apiUrl}/${id}`, dto);
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }
}
