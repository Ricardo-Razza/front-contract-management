import { Component, Input, OnChanges, OnDestroy, inject, signal, computed, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subscription } from 'rxjs';
import { InstalacaoHistorico } from '@core/models';
import { ImpressoraService } from '@core/services/impressora.service';
import { LocalInstalacaoService } from '@core/services/local-instalacao.service';
import { PaginationComponent } from '@shared/components/pagination/pagination.component';

@Component({
  selector: 'app-historico-instalacoes',
  standalone: true,
  imports: [CommonModule, PaginationComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (localId && impressoraConsultada()) {
      <button type="button" (click)="carregar()">← Voltar ao histórico do local</button>
      <h3>Locais da impressora #{{ impressoraConsultada() }}</h3>
    }
    @if (carregando()) { <p role="status">Carregando histórico...</p> }
    @else if (erro()) {
      <p role="alert">Não foi possível carregar o histórico.</p>
      <button type="button" (click)="carregar(impressoraConsultada())">Tentar novamente</button>
    } @else {
      <div class="table-scroll">
        <table>
          <thead><tr><th>Impressora / Série</th><th>Local / Secretaria</th><th>Entrada</th><th>Saída</th><th>Situação</th><th>Motivo da saída</th></tr></thead>
          <tbody>
            @for (i of visiveis(); track i.id) {
              <tr>
                <td>{{ i.fabricante }} {{ i.modelo }}<br><small>{{ i.numeroSerie || 'Sem série' }} · #{{ i.itemPedido || i.impressoraId }}</small>
                  @if (localId && !impressoraConsultada()) { <br><button type="button" (click)="carregar(i.impressoraId)">Ver locais desta impressora</button> }
                </td>
                <td>{{ i.localInstalacao }}<br><small>{{ i.secretariaSigla }}</small></td>
                <td>{{ i.dataInstalacao | date:'dd/MM/yyyy' }}</td>
                <td>{{ i.dataRetirada ? (i.dataRetirada | date:'dd/MM/yyyy') : 'Em uso' }}</td>
                <td>{{ status(i.status) }}</td><td>{{ i.motivoRetirada || '—' }}</td>
              </tr>
            } @empty { <tr><td colspan="6">Nenhuma passagem registrada.</td></tr> }
          </tbody>
        </table>
      </div>
      <app-pagination [totalItems]="itens().length" [currentPage]="pagina()" [pageSize]="tamanho()" (pageChange)="pagina.set($event)" (pageSizeChange)="tamanho.set($event); pagina.set(1)"></app-pagination>
    }
  `,
  styles: [`:host { display: block; } .table-scroll { overflow-x: auto; } table { width: 100%; border-collapse: collapse; text-align: left; } th, td { padding: .8rem; border-bottom: 1px solid #e2e8f0; } th { background: #f8fafc; } small { color: #64748b; } button { cursor: pointer; padding: .4rem .6rem; border: 1px solid #cbd5e1; border-radius: 6px; background: white; color: #1d4ed8; }`]
})
export class HistoricoInstalacoesComponent implements OnChanges, OnDestroy {
  @Input() impressoraId?: number;
  @Input() localId?: number;
  private static readonly STATUS_MAP: Record<string, string> = {
    ATIVA: 'Em uso',
    REMANEJADA: 'Remanejada',
    SUBSTITUIDA: 'Substituída',
    RECOLHIDA: 'Recolhida'
  };
  private impressoras = inject(ImpressoraService);
  private locais = inject(LocalInstalacaoService);
  private consulta?: Subscription;
  itens = signal<InstalacaoHistorico[]>([]);
  carregando = signal(false);
  erro = signal(false);
  impressoraConsultada = signal<number | undefined>(undefined);
  pagina = signal(1);
  tamanho = signal(5);
  visiveis = computed(() => this.itens().slice((this.pagina() - 1) * this.tamanho(), this.pagina() * this.tamanho()));
  ngOnChanges(): void { this.carregar(); }
  ngOnDestroy(): void { this.consulta?.unsubscribe(); }
  status(valor: string): string { return HistoricoInstalacoesComponent.STATUS_MAP[valor] || valor; }
  carregar(impressoraId?: number): void {
    this.consulta?.unsubscribe();
    this.impressoraConsultada.set(impressoraId);
    this.pagina.set(1);
    this.itens.set([]);
    this.erro.set(false);
    const id = impressoraId || this.impressoraId;
    if (!id && !this.localId) return;
    this.carregando.set(true);
    const request = id ? this.impressoras.getHistorico(id) : this.locais.getHistorico(this.localId!);
    this.consulta = request.subscribe({
      next: itens => { this.itens.set(itens); this.carregando.set(false); },
      error: () => { this.erro.set(true); this.carregando.set(false); }
    });
  }
}
