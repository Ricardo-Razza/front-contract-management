import { Component, Input, ChangeDetectionStrategy, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { PaginationComponent } from '@shared/components/pagination/pagination.component';
import type { ImpressorasComponent } from '../impressoras.component';
import { EspelhoFatura } from '@core/models';
import { ConferenciaFaturaComponent } from './conferencia-fatura.component';
import { chaveFatura } from '../financeiro/conferencia-fatura.utils';

export type FinanceiroImpressorasComponentContext = Pick<ImpressorasComponent, 'subTabFinanceiro' | 'selecionarSubTabFinanceiro' | 'quantidadeNotasGeradas' | 'empenhos' | 'anoFinanceiro' | 'carregarNotasFiscaisConsolidado' | 'carregarNotasFiscaisLote' | 'modoMultiplosMeses' | 'alternarModoMultiplosMeses' | 'selecionarMesesFaturados' | 'loadingNotasConsolidado' | 'mesesComFaturamento' | 'selecionarTodosMeses' | 'empenhoFiltroNotas' | 'selecionarFiltroEmpenho' | 'mesesLista' | 'isMesSelecionado' | 'selecionarMes' | 'totalFaturadoSelecionado' | 'mesesSelecionados' | 'totalCopiasMonoSelecionadas' | 'totalCopiasColorSelecionadas' | 'totalExcedenteMonoSelecionado' | 'totalExcedenteColorSelecionado' | 'notasFiscaisLote' | 'expandAllInvoices' | 'collapseAllInvoices' | 'loadingNotasLote' | 'isInvoiceExpanded' | 'toggleInvoice' | 'imprimirNotaIndividual' | 'formatDatePtBr' | 'incluirMedicaoImpressao' | 'alternarMedicaoImpressao' | 'notasFiscaisConsolidado' | 'paginadosEmpenhos' | 'calcularPercentualEmpenho' | 'openEditEmpenhoModal' | 'paginaAtualEmpenhos' | 'tamanhoEmpenhos' | 'paginaEmpenhos'>;

@Component({selector: 'app-financeiro-impressoras', standalone: true, imports: [CommonModule, FormsModule, ReactiveFormsModule, PaginationComponent, ConferenciaFaturaComponent], templateUrl: './financeiro-impressoras.component.html', styleUrl: './financeiro-impressoras.component.scss', changeDetection: ChangeDetectionStrategy.OnPush})
export class FinanceiroImpressorasComponent {
  @Input({required: true}) context!: FinanceiroImpressorasComponentContext;
  readonly conferenciasAbertas = signal(new Set<string>());
  readonly chaveFatura = chaveFatura;

  toggleConferencia(fatura: EspelhoFatura): void {
    const chave = chaveFatura(fatura);
    this.conferenciasAbertas.update(abertas => {
      const novas = new Set(abertas);
      if (novas.has(chave)) novas.delete(chave); else novas.add(chave);
      return novas;
    });
  }

  abrirConferenciaMensal(empenhoId: number, mes: number): void {
    this.context.empenhoFiltroNotas.set(empenhoId);
    this.context.mesesSelecionados.set([mes]);
    this.context.modoMultiplosMeses.set(false);
    this.context.subTabFinanceiro.set('NOTAS_MENSAIS');
    this.conferenciasAbertas.set(new Set([`fatura-${empenhoId}-${this.context.anoFinanceiro()}-${mes}`]));
    this.context.carregarNotasFiscaisLote();
  }
}
