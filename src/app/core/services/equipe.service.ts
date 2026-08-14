import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '@env/environment';
import { ContractTeam, ContractTeamDTO } from '@core/models';

@Injectable({
  providedIn: 'root'
})
export class EquipeService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/equipes-contrato`;

  getAll(): Observable<ContractTeam[]> {
    return this.http.get<ContractTeam[]>(this.apiUrl);
  }

  getById(id: number): Observable<ContractTeam> {
    return this.http.get<ContractTeam>(`${this.apiUrl}/${id}`);
  }

  create(dto: ContractTeamDTO | any): Observable<ContractTeam> {
    return this.http.post<ContractTeam>(this.apiUrl, dto);
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }
}
