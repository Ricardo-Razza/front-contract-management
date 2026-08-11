import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Agreement, AgreementDTO } from '../models/api.models';

@Injectable({
  providedIn: 'root'
})
export class AtaService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/atas`;

  getAll(): Observable<Agreement[]> {
    return this.http.get<Agreement[]>(this.apiUrl);
  }

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
