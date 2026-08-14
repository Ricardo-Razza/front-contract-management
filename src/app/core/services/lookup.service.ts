import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, catchError, of } from 'rxjs';
import { environment } from '@env/environment';
import { LookupItem } from '@core/models';

@Injectable({
  providedIn: 'root'
})
export class LookupService {
  private http = inject(HttpClient);
  private apiUrl = environment.apiUrl;

  getAtivos(): Observable<LookupItem[]> {
    return this.http.get<LookupItem[]>(`${this.apiUrl}/ativos`).pipe(
      catchError(() => of([
        { id: 1, nome: 'Ativo', situacao: 'Ativo', descricao: 'Ativo' },
        { id: 2, nome: 'Desativado', situacao: 'Desativado', descricao: 'Desativado' }
      ]))
    );
  }

  getTipos(): Observable<LookupItem[]> {
    return this.http.get<LookupItem[]>(`${this.apiUrl}/tipos`).pipe(
      catchError(() => of([
        { id: 1, nome: 'Bens e Produtos', tipo: 'Bens e Produtos', descricao: 'Bens e Produtos' },
        { id: 2, nome: 'Serviços Contínuos', tipo: 'Serviços Contínuos', descricao: 'Serviços Contínuos' },
        { id: 3, nome: 'Obras e Engenharia', tipo: 'Obras e Engenharia', descricao: 'Obras e Engenharia' }
      ]))
    );
  }

  getFuncoesEquipe(): Observable<LookupItem[]> {
    return this.http.get<LookupItem[]>(`${this.apiUrl}/funcoes-equipe`).pipe(
      catchError(() => of([
        { id: 1, nome: 'Gestor da Ata', funcao: 'Gestor da Ata', descricao: 'Gestor da Ata' },
        { id: 2, nome: 'Fiscal Técnico', funcao: 'Fiscal Técnico', descricao: 'Fiscal Técnico' },
        { id: 3, nome: 'Fiscal Administrativo', funcao: 'Fiscal Administrativo', descricao: 'Fiscal Administrativo' },
        { id: 4, nome: 'Membro', funcao: 'Membro', descricao: 'Membro' }
      ]))
    );
  }
}
