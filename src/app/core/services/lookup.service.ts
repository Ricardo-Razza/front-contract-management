import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, catchError, of, shareReplay } from 'rxjs';
import { environment } from '@env/environment';
import { LookupItem } from '@core/models';

@Injectable({
  providedIn: 'root'
})
export class LookupService {
  private http = inject(HttpClient);
  private apiUrl = environment.apiUrl;

  private ativosCache$?: Observable<LookupItem[]>;
  private tiposCache$?: Observable<LookupItem[]>;
  private funcoesCache$?: Observable<LookupItem[]>;

  getAtivos(): Observable<LookupItem[]> {
    if (!this.ativosCache$) {
      this.ativosCache$ = this.http.get<LookupItem[]>(`${this.apiUrl}/ativos`).pipe(
        catchError(() => of([
          { id: 1, nome: 'Ativo', situacao: 'Ativo', descricao: 'Ativo' },
          { id: 2, nome: 'Desativado', situacao: 'Desativado', descricao: 'Desativado' }
        ])),
        shareReplay({ bufferSize: 1, refCount: false })
      );
    }
    return this.ativosCache$;
  }

  getTipos(): Observable<LookupItem[]> {
    if (!this.tiposCache$) {
      this.tiposCache$ = this.http.get<LookupItem[]>(`${this.apiUrl}/tipos`).pipe(
        catchError(() => of([
          { id: 1, nome: 'Bens e Produtos', tipo: 'Bens e Produtos', descricao: 'Bens e Produtos' },
          { id: 2, nome: 'Serviços Contínuos', tipo: 'Serviços Contínuos', descricao: 'Serviços Contínuos' },
          { id: 3, nome: 'Obras e Engenharia', tipo: 'Obras e Engenharia', descricao: 'Obras e Engenharia' }
        ])),
        shareReplay({ bufferSize: 1, refCount: false })
      );
    }
    return this.tiposCache$;
  }

  getFuncoesEquipe(): Observable<LookupItem[]> {
    if (!this.funcoesCache$) {
      this.funcoesCache$ = this.http.get<LookupItem[]>(`${this.apiUrl}/funcoes-equipe`).pipe(
        catchError(() => of([
          { id: 1, nome: 'Gestor da Ata', funcao: 'Gestor da Ata', descricao: 'Gestor da Ata' },
          { id: 2, nome: 'Fiscal Técnico', funcao: 'Fiscal Técnico', descricao: 'Fiscal Técnico' },
          { id: 3, nome: 'Fiscal Administrativo', funcao: 'Fiscal Administrativo', descricao: 'Fiscal Administrativo' },
          { id: 4, nome: 'Membro', funcao: 'Membro', descricao: 'Membro' }
        ])),
        shareReplay({ bufferSize: 1, refCount: false })
      );
    }
    return this.funcoesCache$;
  }
}
