import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, catchError, of, shareReplay } from 'rxjs';
import { environment } from '@env/environment';
import {
  Impressora,
  ImpressoraDTO,
  TrocaLocalDTO,
  SubstituicaoImpressoraDTO,
  LoteImpressao,
  EmpenhoImpressao,
  LeituraContador,
  LeituraContadorDTO
} from '@core/models';

@Injectable({
  providedIn: 'root'
})
export class ImpressoraService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/impressoras`;

  private lotesCache$?: Observable<LoteImpressao[]>;

  getAll(): Observable<Impressora[]> {
    return this.http.get<Impressora[]>(this.apiUrl);
  }

  getById(id: number): Observable<Impressora> {
    return this.http.get<Impressora>(`${this.apiUrl}/${id}`);
  }

  create(dto: ImpressoraDTO): Observable<Impressora> {
    return this.http.post<Impressora>(this.apiUrl, dto);
  }

  update(id: number, dto: ImpressoraDTO): Observable<Impressora> {
    return this.http.put<Impressora>(`${this.apiUrl}/${id}`, dto);
  }

  remanejarLocal(id: number, dto: TrocaLocalDTO): Observable<Impressora> {
    return this.http.post<Impressora>(`${this.apiUrl}/${id}/remanejar`, dto);
  }

  substituirPorDefeito(id: number, dto: SubstituicaoImpressoraDTO): Observable<Impressora> {
    return this.http.post<Impressora>(`${this.apiUrl}/${id}/substituir`, dto);
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }

  getLotes(): Observable<LoteImpressao[]> {
    if (!this.lotesCache$) {
      this.lotesCache$ = this.http.get<LoteImpressao[]>(`${this.apiUrl}/lotes`).pipe(
        catchError(() => of([
          { id: 1, numeroLote: 1, descricao: 'Multifuncional Laser Monocromática', tipo: 'MONO', franquiaMono: 1000, franquiaColor: 0, valorLocacaoMensal: 30, valorExcedenteMono: 0.03, valorExcedenteColor: 0, ativo: true },
          { id: 2, numeroLote: 3, descricao: 'Multifuncional Laser Policromática Híbrida', tipo: 'COLOR', franquiaMono: 1500, franquiaColor: 500, valorLocacaoMensal: 204, valorExcedenteMono: 0.04, valorExcedenteColor: 0.29, ativo: true },
          { id: 3, numeroLote: 4, descricao: 'Impressora Laser Monocromática Simples', tipo: 'MONO', franquiaMono: 1000, franquiaColor: 0, valorLocacaoMensal: 26, valorExcedenteMono: 0.02, valorExcedenteColor: 0, ativo: true }
        ])),
        shareReplay({ bufferSize: 1, refCount: false })
      );
    }
    return this.lotesCache$;
  }

  getEmpenhos(secretariaId?: number): Observable<EmpenhoImpressao[]> {
    let params = new HttpParams();
    if (secretariaId) {
      params = params.set('secretariaId', secretariaId.toString());
    }
    return this.http.get<EmpenhoImpressao[]>(`${this.apiUrl}/empenhos`, { params }).pipe(
      catchError(() => of([]))
    );
  }

  getLeituras(mes: number, ano: number): Observable<LeituraContador[]> {
    const params = new HttpParams()
      .set('mes', mes.toString())
      .set('ano', ano.toString());
    return this.http.get<LeituraContador[]>(`${this.apiUrl}/leituras`, { params }).pipe(
      catchError(() => of([]))
    );
  }

  lancarLeitura(dto: LeituraContadorDTO): Observable<LeituraContador> {
    return this.http.post<LeituraContador>(`${this.apiUrl}/leituras`, dto);
  }
}
