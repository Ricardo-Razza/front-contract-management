import { Injectable, inject } from "@angular/core";
import { HttpClient, HttpParams } from "@angular/common/http";
import { Observable } from "rxjs";
import { environment } from "@env/environment";
import {
  EscalaAnual,
  AgendamentoFerias,
  AgendamentoFeriasDTO,
  PeriodoAquisitivo,
  PeriodoAquisitivoDTO,
  VerificacaoConflitoRequest,
  VerificacaoConflitoResponse,
} from "@core/models";

@Injectable({
  providedIn: "root",
})
export class FeriasService {
  private http = inject(HttpClient);
  private feriasUrl = `${environment.apiUrl}/ferias`;
  private periodosUrl = `${environment.apiUrl}/periodos-aquisitivos`;

  listarAgendamentos(ano: number): Observable<AgendamentoFerias[]> {
    return this.http.get<AgendamentoFerias[]>(this.feriasUrl, {
      params: { ano },
    });
  }
  listarPeriodos(): Observable<PeriodoAquisitivo[]> {
    return this.http.get<PeriodoAquisitivo[]>(this.periodosUrl);
  }
  cancelarAgendamento(id: number): Observable<AgendamentoFerias> {
    return this.http.patch<AgendamentoFerias>(
      `${this.feriasUrl}/${id}/cancelar`,
      {},
    );
  }

  getEscalaAnual(
    ano?: number,
    secretariaId?: number,
    setor?: string,
  ): Observable<EscalaAnual> {
    let params = new HttpParams();
    if (ano) params = params.set("ano", ano.toString());
    if (secretariaId)
      params = params.set("secretariaId", secretariaId.toString());
    if (setor && setor.trim()) params = params.set("setor", setor.trim());

    return this.http.get<EscalaAnual>(`${this.feriasUrl}/escala-anual`, {
      params,
    });
  }

  verificarConflito(
    req: VerificacaoConflitoRequest,
  ): Observable<VerificacaoConflitoResponse> {
    return this.http.post<VerificacaoConflitoResponse>(
      `${this.feriasUrl}/verificar-conflito`,
      req,
    );
  }

  getAgendamentosPorServidor(
    servidorId: number,
  ): Observable<AgendamentoFerias[]> {
    return this.http.get<AgendamentoFerias[]>(
      `${this.feriasUrl}/servidor/${servidorId}`,
    );
  }

  getAgendamentoPorId(id: number): Observable<AgendamentoFerias> {
    return this.http.get<AgendamentoFerias>(`${this.feriasUrl}/${id}`);
  }

  criarAgendamento(dto: AgendamentoFeriasDTO): Observable<AgendamentoFerias> {
    return this.http.post<AgendamentoFerias>(this.feriasUrl, dto);
  }

  atualizarAgendamento(
    id: number,
    dto: AgendamentoFeriasDTO,
  ): Observable<AgendamentoFerias> {
    return this.http.put<AgendamentoFerias>(`${this.feriasUrl}/${id}`, dto);
  }

  deletarAgendamento(id: number): Observable<void> {
    return this.http.delete<void>(`${this.feriasUrl}/${id}`);
  }

  // Períodos Aquisitivos
  getPeriodosPorServidor(servidorId: number): Observable<PeriodoAquisitivo[]> {
    return this.http.get<PeriodoAquisitivo[]>(
      `${this.periodosUrl}/servidor/${servidorId}`,
    );
  }

  criarPeriodo(dto: PeriodoAquisitivoDTO): Observable<PeriodoAquisitivo> {
    return this.http.post<PeriodoAquisitivo>(this.periodosUrl, dto);
  }

  atualizarPeriodo(
    id: number,
    dto: PeriodoAquisitivoDTO,
  ): Observable<PeriodoAquisitivo> {
    return this.http.put<PeriodoAquisitivo>(`${this.periodosUrl}/${id}`, dto);
  }

  deletarPeriodo(id: number): Observable<void> {
    return this.http.delete<void>(`${this.periodosUrl}/${id}`);
  }
}
