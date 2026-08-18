import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '@env/environment';
import { Contract, ContractDTO } from '@core/models';

@Injectable({
  providedIn: 'root'
})
export class ContratoService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/contratos`;

  getAll(): Observable<Contract[]> {
    return this.http.get<Contract[]>(this.apiUrl);
  }

  getById(id: number): Observable<Contract> {
    return this.http.get<Contract>(`${this.apiUrl}/${id}`);
  }

  create(dto: ContractDTO | any): Observable<Contract> {
    return this.http.post<Contract>(this.apiUrl, dto);
  }

  update(id: number, dto: ContractDTO | any): Observable<Contract> {
    return this.http.put<Contract>(`${this.apiUrl}/${id}`, dto);
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }
}
