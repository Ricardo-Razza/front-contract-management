import { Component, Input, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { PaginationComponent } from '@shared/components/pagination/pagination.component';
import type { ImpressorasComponent } from '../impressoras.component';

export type FinanceiroImpressorasComponentContext = Pick<ImpressorasComponent, 'subTabFinanceiro' | 'selecionarSubTabFinanceiro' | 'quantidadeNotasGeradas' | 'empenhos' | 'anoFinanceiro' | 'carregarNotasFiscaisConsolidado' | 'carregarNotasFiscaisLote' | 'modoMultiplosMeses' | 'alternarModoMultiplosMeses' | 'selecionarMesesFaturados' | 'loadingNotasConsolidado' | 'mesesComFaturamento' | 'selecionarTodosMeses' | 'empenhoFiltroNotas' | 'selecionarFiltroEmpenho' | 'mesesLista' | 'isMesSelecionado' | 'selecionarMes' | 'totalFaturadoSelecionado' | 'mesesSelecionados' | 'totalCopiasMonoSelecionadas' | 'totalCopiasColorSelecionadas' | 'totalExcedenteMonoSelecionado' | 'totalExcedenteColorSelecionado' | 'notasFiscaisLote' | 'expandAllInvoices' | 'collapseAllInvoices' | 'loadingNotasLote' | 'isInvoiceExpanded' | 'toggleInvoice' | 'imprimirNotaIndividual' | 'formatDatePtBr' | 'incluirMedicaoImpressao' | 'notasFiscaisConsolidado' | 'paginadosEmpenhos' | 'calcularPercentualEmpenho' | 'openEditEmpenhoModal' | 'paginaAtualEmpenhos' | 'tamanhoEmpenhos' | 'paginaEmpenhos'>;

@Component({selector: 'app-financeiro-impressoras', standalone: true, imports: [CommonModule, FormsModule, ReactiveFormsModule, PaginationComponent], templateUrl: './financeiro-impressoras.component.html', styleUrl: './financeiro-impressoras.component.scss', changeDetection: ChangeDetectionStrategy.OnPush})
export class FinanceiroImpressorasComponent { @Input({required: true}) context!: FinanceiroImpressorasComponentContext; }
