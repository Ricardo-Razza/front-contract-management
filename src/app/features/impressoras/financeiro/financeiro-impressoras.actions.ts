import { DestroyRef as LifecycleDestroyRef, inject as lifecycleInject } from '@angular/core';
import { takeUntilDestroyed as untilComponentDestroyed } from '@angular/core/rxjs-interop';

import { inject } from '@angular/core';

import { ImpressoraService } from '@core/services/impressora.service';

import { ToastService } from '@core/services/toast.service';

import { exportToCsv } from '@core/utils';
import { EmpenhoImpressao, EmpenhoDTO, EmpenhoExecucao, ItemFatura, LoteBalanco, ItemNotaFiscal } from '@core/models';

import type { ImpressorasComponent } from '../impressoras.component';

type Context = Pick<ImpressorasComponent, 'expandedInvoices' | 'notasFiscaisLote' | 'incluirMedicaoImpressao' | 'subTabFinanceiro' | 'notasFiscaisConsolidado' | 'anoFinanceiro' | 'execucaoMensal' | 'isEmpenhoEditMode' | 'selectedEmpenho' | 'empenhoForm' | 'isEmpenhoModalOpen' | 'carregarEmpenhos' | 'empenhoToDelete' | 'isDeleteEmpenhoModalOpen' | 'filterEmpenho' | 'activeTab' | 'empenhos' | 'anoExecucao' | 'loadingExecucao' | 'mesBalanco' | 'anoBalanco' | 'loadingBalanco' | 'balancoFranquias' | 'espelhoFatura' | 'mesesSelecionados' | 'modoMultiplosMeses' | 'mesesComFaturamento' | 'empenhoFiltroNotas' | 'loadingNotasLote' | 'loadingNotasConsolidado'>;

/** Operações de financeiro; o contexto compartilha o estado da rota, sem duplicá-lo. */
export class FinanceiroImpressorasActions {
  private readonly requestDestroyRef = lifecycleInject(LifecycleDestroyRef);
  private impressoraService = inject(ImpressoraService);

  private toast = inject(ToastService);

  constructor(private readonly context: Context) {}

  toggleInvoice(numeroEmpenho: string): void {
    this.context.expandedInvoices.update(set => {
      const newSet = new Set(set);
      if (newSet.has(numeroEmpenho)) {
        newSet.delete(numeroEmpenho);
      } else {
        newSet.add(numeroEmpenho);
      }
      return newSet;
    });
  }

  isInvoiceExpanded(numeroEmpenho: string): boolean {
    return this.context.expandedInvoices().has(numeroEmpenho);
  }

  expandAllInvoices(): void {
    const all = new Set(this.context.notasFiscaisLote().map(f => f.numeroEmpenho));
    this.context.expandedInvoices.set(all);
  }

  collapseAllInvoices(): void {
    this.context.expandedInvoices.set(new Set<string>());
  }

  calcularPercentualEmpenho(emp: EmpenhoImpressao): number {
    if (!emp.valorTotal || emp.valorTotal <= 0) return 0;
    const consumido = emp.valorTotal - (emp.saldo || 0);
    return Math.min(100, Math.max(0, Math.round((consumido / emp.valorTotal) * 100)));
  }

  alternarMedicaoImpressao(): void {
    this.context.incluirMedicaoImpressao.update(v => !v);
  }

  selecionarSubTabFinanceiro(subTab: 'NOTAS_MENSAIS' | 'DEMONSTRATIVO_ANUAL' | 'EMPENHOS'): void {
    this.context.subTabFinanceiro.set(subTab);
    this.inicializarFinanceiroSeNecessario();
  }

  inicializarFinanceiroSeNecessario(): void {
    const sub = this.context.subTabFinanceiro();
    if (sub === 'NOTAS_MENSAIS') {
      if (this.context.notasFiscaisConsolidado()?.ano !== Number(this.context.anoFinanceiro())) {
        this.carregarNotasFiscaisConsolidado();
      }
      if (this.context.notasFiscaisLote().length === 0) {
        this.carregarNotasFiscaisLote();
      }
    } else if (sub === 'DEMONSTRATIVO_ANUAL') {
      if (!this.context.notasFiscaisConsolidado()) {
        this.carregarNotasFiscaisConsolidado();
      }
    } else if (sub === 'EMPENHOS') {
      if (!this.context.execucaoMensal()) {
        this.carregarExecucaoMensal();
      }
    }
  }

  openCreateEmpenhoModal(): void {
    this.context.isEmpenhoEditMode.set(false);
    this.context.selectedEmpenho.set(null);
    this.context.empenhoForm.reset({
      numeroEmpenho: '',
      ano: new Date().getFullYear(),
      secretariaId: '',
      descricao: '',
      valorTotal: 0,
      saldo: 0
    });
    this.context.isEmpenhoModalOpen.set(true);
  }

  openEditEmpenhoModal(emp: EmpenhoImpressao): void {
    this.context.isEmpenhoEditMode.set(true);
    this.context.selectedEmpenho.set(emp);
    this.context.empenhoForm.patchValue({
      numeroEmpenho: emp.numeroEmpenho,
      ano: emp.ano,
      secretariaId: emp.secretariaId,
      descricao: emp.descricao || '',
      valorTotal: emp.valorTotal,
      saldo: emp.saldo
    });
    this.context.isEmpenhoModalOpen.set(true);
  }

  closeEmpenhoModal(): void {
    this.context.isEmpenhoModalOpen.set(false);
    this.context.selectedEmpenho.set(null);
  }

  salvarEmpenho(): void {
    if (this.context.empenhoForm.invalid) {
      this.context.empenhoForm.markAllAsTouched();
      this.toast.error('Preencha os dados do empenho.');
      return;
    }

    const payload: EmpenhoDTO = this.context.empenhoForm.value;

    if (this.context.isEmpenhoEditMode() && this.context.selectedEmpenho()) {
      this.impressoraService.updateEmpenho(this.context.selectedEmpenho()!.id, payload).pipe(untilComponentDestroyed(this.requestDestroyRef)).subscribe({
        next: () => {
          this.toast.success('Empenho atualizado com sucesso!');
          this.closeEmpenhoModal();
          this.context.carregarEmpenhos();
        },
        error: () => this.toast.error('Erro ao atualizar empenho.')
      });
    } else {
      this.impressoraService.createEmpenho(payload).pipe(untilComponentDestroyed(this.requestDestroyRef)).subscribe({
        next: () => {
          this.toast.success('Empenho cadastrado com sucesso!');
          this.closeEmpenhoModal();
          this.context.carregarEmpenhos();
        },
        error: () => this.toast.error('Erro ao cadastrar empenho.')
      });
    }
  }

  confirmarExcluirEmpenho(emp: EmpenhoImpressao): void {
    this.context.empenhoToDelete.set(emp);
    this.context.isDeleteEmpenhoModalOpen.set(true);
  }

  closeDeleteEmpenhoModal(): void {
    this.context.isDeleteEmpenhoModalOpen.set(false);
    this.context.empenhoToDelete.set(null);
  }

  executarExclusaoEmpenho(): void {
    const emp = this.context.empenhoToDelete();
    if (!emp) return;

    this.impressoraService.deleteEmpenho(emp.id).pipe(untilComponentDestroyed(this.requestDestroyRef)).subscribe({
      next: () => {
        this.toast.success('Empenho inativado com sucesso.');
        this.closeDeleteEmpenhoModal();
        this.context.carregarEmpenhos();
      },
      error: () => this.toast.error('Erro ao inativar empenho.')
    });
  }

  filtrarPorEmpenhoNoInventario(numeroEmpenho: string): void {
    this.context.filterEmpenho.set(numeroEmpenho);
    this.context.activeTab.set('INVENTARIO');
  }

  exportarEmpenhosCSV(): void {
    const list = this.context.empenhos();
    const columns = [
      { header: 'Numero Empenho', accessor: (e: EmpenhoImpressao) => e.numeroEmpenho },
      { header: 'Exercicio', accessor: (e: EmpenhoImpressao) => e.ano },
      { header: 'Secretaria', accessor: (e: EmpenhoImpressao) => e.secretariaSigla || '' },
      { header: 'Descricao', accessor: (e: EmpenhoImpressao) => e.descricao || '' },
      { header: 'Valor Total R$', accessor: (e: EmpenhoImpressao) => (e.valorTotal || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) },
      { header: 'Saldo Restante R$', accessor: (e: EmpenhoImpressao) => (e.saldo || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) },
      { header: 'Qtd Impressoras', accessor: (e: EmpenhoImpressao) => (e.quantidadeImpressoras || 0).toLocaleString('pt-BR') }
    ];
    exportToCsv('empenhos_impressao_' + new Date().getFullYear(), columns, list);
    this.toast.success('Empenhos exportados em .CSV com sucesso!');
  }

  carregarExecucaoMensal(ano: number = this.context.anoExecucao()): void {
    this.context.loadingExecucao.set(true);
    this.context.anoExecucao.set(ano);
    this.impressoraService.getExecucaoMensal(ano).pipe(untilComponentDestroyed(this.requestDestroyRef)).subscribe({
      next: data => {
        this.context.execucaoMensal.set(data);
        this.context.loadingExecucao.set(false);
      },
      error: () => {

        this.context.loadingExecucao.set(false);
      }
    });
  }

  carregarBalancoFranquias(mes: number = this.context.mesBalanco(), ano: number = this.context.anoBalanco()): void {
    this.context.loadingBalanco.set(true);
    this.context.mesBalanco.set(mes);
    this.context.anoBalanco.set(ano);

    this.impressoraService.getBalancoFranquias(mes, ano).pipe(untilComponentDestroyed(this.requestDestroyRef)).subscribe({
      next: balanco => {
        this.context.balancoFranquias.set(balanco);
        this.context.loadingBalanco.set(false);
      },
      error: () => {

        this.context.loadingBalanco.set(false);
      }
    });
  }

  imprimirEspelho(): void {
    window.print();
  }

  exportarEspelhoCSV(): void {
    const fatura = this.context.espelhoFatura();
    if (!fatura) return;

    const list = fatura.itens;
    const columns = [
      { header: 'Item', accessor: (it: ItemFatura) => it.itemNumero },
      { header: 'Codigo', accessor: (it: ItemFatura) => it.codigoItem },
      { header: 'Descricao', accessor: (it: ItemFatura) => it.descricao },
      { header: 'Unidade', accessor: (it: ItemFatura) => it.unidade },
      { header: 'Quantidade', accessor: (it: ItemFatura) => (it.quantidade || 0).toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 2 }) },
      { header: 'Valor Unitario R$', accessor: (it: ItemFatura) => (it.valorUnitario || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 3 }) },
      { header: 'Subtotal R$', accessor: (it: ItemFatura) => (it.valorTotal || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }
    ];
    exportToCsv(`espelho_fatura_emp_${fatura.numeroEmpenho}_${fatura.mesReferencia}_${fatura.anoReferencia}`, columns, list);
    this.toast.success('Espelho de fatura exportado em .CSV com sucesso!');
  }

  exportarMatrizExecucaoCSV(): void {
    const exec = this.context.execucaoMensal();
    if (!exec) return;

    const list = exec.empenhos;
    const columns = [
      { header: 'Empenho', accessor: (e: EmpenhoExecucao) => e.numeroEmpenho },
      { header: 'Secretaria', accessor: (e: EmpenhoExecucao) => e.secretariaSigla },
      { header: 'Descricao', accessor: (e: EmpenhoExecucao) => e.descricao || '' },
      { header: 'Dotacao Anual R$', accessor: (e: EmpenhoExecucao) => (e.valorTotalEmpenhado || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) },
      { header: 'Jan R$', accessor: (e: EmpenhoExecucao) => (e.meses[0]?.valorFaturado || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) },
      { header: 'Fev R$', accessor: (e: EmpenhoExecucao) => (e.meses[1]?.valorFaturado || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) },
      { header: 'Mar R$', accessor: (e: EmpenhoExecucao) => (e.meses[2]?.valorFaturado || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) },
      { header: 'Abr R$', accessor: (e: EmpenhoExecucao) => (e.meses[3]?.valorFaturado || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) },
      { header: 'Mai R$', accessor: (e: EmpenhoExecucao) => (e.meses[4]?.valorFaturado || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) },
      { header: 'Jun R$', accessor: (e: EmpenhoExecucao) => (e.meses[5]?.valorFaturado || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) },
      { header: 'Jul R$', accessor: (e: EmpenhoExecucao) => (e.meses[6]?.valorFaturado || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) },
      { header: 'Ago R$', accessor: (e: EmpenhoExecucao) => (e.meses[7]?.valorFaturado || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) },
      { header: 'Set R$', accessor: (e: EmpenhoExecucao) => (e.meses[8]?.valorFaturado || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) },
      { header: 'Out R$', accessor: (e: EmpenhoExecucao) => (e.meses[9]?.valorFaturado || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) },
      { header: 'Nov R$', accessor: (e: EmpenhoExecucao) => (e.meses[10]?.valorFaturado || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) },
      { header: 'Dez R$', accessor: (e: EmpenhoExecucao) => (e.meses[11]?.valorFaturado || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) },
      { header: 'Total Liquidado R$', accessor: (e: EmpenhoExecucao) => (e.totalLiquidado || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) },
      { header: 'Saldo Restante R$', accessor: (e: EmpenhoExecucao) => (e.saldoRestante || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) },
      { header: '% Consumido', accessor: (e: EmpenhoExecucao) => (e.percentualConsumido || 0).toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 }) + '%' }
    ];
    exportToCsv(`execucao_orcamentaria_empenhos_${exec.ano}`, columns, list);
    this.toast.success('Matriz de execução orçamentária exportada em .CSV com sucesso!');
  }

  exportarBalancoFranquiasCSV(): void {
    const balanco = this.context.balancoFranquias();
    if (!balanco) return;

    const list = balanco.lotes;
    const columns = [
      { header: 'Lote', accessor: (l: LoteBalanco) => 'Lote 0' + l.numeroLote },
      { header: 'Descricao', accessor: (l: LoteBalanco) => l.descricao },
      { header: 'Tipo', accessor: (l: LoteBalanco) => l.tipo },
      { header: 'Qtd Maquinas', accessor: (l: LoteBalanco) => (l.quantidadeEquipamentos || 0).toLocaleString('pt-BR') },
      { header: 'Franquia Total Mono', accessor: (l: LoteBalanco) => (l.franquiaTotalMono || 0).toLocaleString('pt-BR') },
      { header: 'Copias Mono Produzidas', accessor: (l: LoteBalanco) => (l.copiasMonoProduzidas || 0).toLocaleString('pt-BR') },
      { header: 'Excedente Mono', accessor: (l: LoteBalanco) => (l.excedenteMonoTotal || 0).toLocaleString('pt-BR') },
      { header: '% Uso Mono', accessor: (l: LoteBalanco) => (l.percentualUsoMono || 0).toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 }) + '%' },
      { header: 'Custo Locacao R$', accessor: (l: LoteBalanco) => (l.custoFixoLocacao || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) },
      { header: 'Custo Excedente R$', accessor: (l: LoteBalanco) => ((l.custoExcedenteMono || 0) + (l.custoExcedenteColor || 0)).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) },
      { header: 'Custo Total R$', accessor: (l: LoteBalanco) => (l.custoTotal || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }
    ];
    exportToCsv(`balanco_franquias_${balanco.mesReferencia}_${balanco.anoReferencia}`, columns, list);
    this.toast.success('Balanço de franquias exportado em .CSV com sucesso!');
  }

  isMesSelecionado(mes: number): boolean {
    return this.context.mesesSelecionados().includes(mes);
  }

  selecionarMes(mes: number): void {
    if (this.context.modoMultiplosMeses()) {
      const atuais = this.context.mesesSelecionados();
      if (atuais.includes(mes)) {
        if (atuais.length > 1) {
          this.context.mesesSelecionados.set(atuais.filter(m => m !== mes));
        }
      } else {
        this.context.mesesSelecionados.set([...atuais, mes].sort((a, b) => a - b));
      }
    } else {
      this.context.mesesSelecionados.set([mes]);
    }
    this.carregarNotasFiscaisLote();
  }

  selecionarTodosMeses(): void {
    this.context.mesesSelecionados.set([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]);
    this.carregarNotasFiscaisLote();
  }

  selecionarMesesFaturados(): void {
    const meses = this.context.mesesComFaturamento();
    if (meses.length === 0) return;
    this.context.mesesSelecionados.set(meses);
    this.carregarNotasFiscaisLote();
  }

  alternarModoMultiplosMeses(): void {
    this.context.modoMultiplosMeses.update(v => !v);
  }

  selecionarFiltroEmpenho(empId: number | null): void {
    this.context.empenhoFiltroNotas.set(empId);
    this.carregarNotasFiscaisLote();
  }

  carregarNotasFiscaisLote(): void {
    this.context.loadingNotasLote.set(true);
    const meses = this.context.mesesSelecionados();
    const ano = this.context.anoFinanceiro();
    const empId = this.context.empenhoFiltroNotas() || undefined;

    this.impressoraService.getNotasFiscaisLote(meses, undefined, ano, empId).pipe(untilComponentDestroyed(this.requestDestroyRef)).subscribe({
      next: faturas => {
        this.context.notasFiscaisLote.set(faturas);
        this.context.loadingNotasLote.set(false);
      },
      error: () => {

        this.context.loadingNotasLote.set(false);
      }
    });
  }

  carregarNotasFiscaisConsolidado(ano: number = this.context.anoFinanceiro()): void {
    this.context.loadingNotasConsolidado.set(true);
    this.context.anoFinanceiro.set(ano);
    this.impressoraService.getNotasFiscaisConsolidado(ano).pipe(untilComponentDestroyed(this.requestDestroyRef)).subscribe({
      next: data => {
        if (Number(this.context.anoFinanceiro()) !== Number(ano)) return;
        this.context.notasFiscaisConsolidado.set(data);
        this.context.loadingNotasConsolidado.set(false);
      },
      error: () => {
        if (Number(this.context.anoFinanceiro()) !== Number(ano)) return;

        this.context.loadingNotasConsolidado.set(false);
      }
    });
  }

  getIsolatedPrintStyles(landscape: boolean): string {
    return `
      @page {
        size: A4 ${landscape ? 'landscape' : 'portrait'};
        margin: ${landscape ? '8mm 10mm' : '10mm 12mm'};
      }
      * {
        box-sizing: border-box;
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
      }
      body {
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
        margin: 0;
        padding: 0;
        background: #ffffff;
        color: #0f172a;
        font-size: 8pt;
        line-height: 1.35;
      }
      .no-print {
        display: none !important;
        visibility: hidden !important;
      }
      .official-invoice-card {
        display: block;
        background: #ffffff;
        border: 1.5px solid #334155;
        border-radius: 6px;
        padding: 8mm 10mm;
        margin: 0 0 12mm 0;
        page-break-after: always;
        break-after: page;
        page-break-inside: auto;
        break-inside: auto;
      }
      .official-invoice-card:last-child {
        page-break-after: auto;
        break-after: auto;
        margin-bottom: 0;
      }
      .doc-header {
        display: flex;
        align-items: flex-start;
        justify-content: space-between;
        border-bottom: 2px solid #0f172a;
        padding-bottom: 4mm;
        margin-bottom: 4mm;
        page-break-inside: avoid;
        break-inside: avoid;
      }
      .gov-text h3 {
        font-size: 13pt;
        font-weight: 800;
        color: #0f172a;
        margin: 0 0 1.5mm 0;
        letter-spacing: 0.02em;
      }
      .gov-text .gov-sub {
        font-size: 8.5pt;
        color: #334155;
        margin: 0.8mm 0;
        font-weight: 600;
      }
      .invoice-meta {
        display: flex;
        flex-direction: column;
        align-items: flex-end;
        gap: 1mm;
      }
      .invoice-meta .doc-title-badge {
        background: #0f172a;
        color: #ffffff;
        font-size: 7.5pt;
        font-weight: 800;
        padding: 1mm 3mm;
        border-radius: 3px;
        letter-spacing: 0.04em;
      }
      .invoice-meta .meta-row {
        font-size: 8pt;
        color: #475569;
      }
      .invoice-meta .meta-lbl {
        margin-right: 2mm;
      }
      .invoice-meta .meta-val {
        color: #0f172a;
        font-weight: 600;
      }
      .invoice-meta .meta-val.highlight {
        font-weight: 800;
        color: #1d4ed8;
      }
      .contractor-bar {
        display: flex;
        align-items: center;
        justify-content: space-between;
        background: #f8fafc;
        border: 1px solid #cbd5e1;
        border-radius: 4px;
        padding: 2.5mm 4mm;
        font-size: 7.5pt;
        color: #1e293b;
        margin-bottom: 4mm;
        page-break-inside: avoid;
        break-inside: avoid;
      }
      .doc-section {
        margin-bottom: 4mm;
      }
      .doc-section h4 {
        font-size: 8.5pt;
        font-weight: 700;
        color: #0f172a;
        margin: 0 0 2mm 0;
        border-left: 3px solid #2563eb;
        padding-left: 2.5mm;
        page-break-inside: avoid;
        break-inside: avoid;
      }
      .doc-table {
        width: 100%;
        border-collapse: collapse;
        font-size: 7.5pt;
      }
      .doc-table th {
        background: #f1f5f9;
        color: #0f172a;
        font-weight: 700;
        padding: 1.8mm 2.5mm;
        border: 1px solid #94a3b8;
      }
      .doc-table td {
        padding: 1.8mm 2.5mm;
        border: 1px solid #cbd5e1;
        color: #1e293b;
      }
      .doc-table tr {
        page-break-inside: avoid;
        break-inside: avoid;
      }
      .doc-table .row-total td {
        background: #f8fafc;
        border-top: 2px solid #0f172a;
        font-weight: 700;
      }
      .doc-table .total-destaque {
        font-size: 8.5pt;
        color: #1e40af;
        font-weight: 800;
      }
      .text-center { text-align: center; }
      .text-right { text-align: right; }
      .font-bold { font-weight: 700; }
      .font-semibold { font-weight: 600; }
      code {
        font-family: monospace;
        background: #f1f5f9;
        padding: 1px 3px;
        border-radius: 2px;
      }
      .atesto-box {
        margin-top: 4mm;
        background: #fafaf9;
        border: 1px dashed #94a3b8;
        border-radius: 5px;
        padding: 3.5mm 5mm;
        page-break-inside: avoid;
        break-inside: avoid;
      }
      .atesto-badge {
        display: inline-flex;
        align-items: center;
        gap: 1.5mm;
        font-size: 7pt;
        font-weight: 800;
        color: #15803d;
        text-transform: uppercase;
        letter-spacing: 0.03em;
        margin-bottom: 1.5mm;
      }
      .atesto-badge svg { display: none; }
      .atesto-texto {
        font-size: 7pt;
        color: #334155;
        line-height: 1.35;
        margin: 0 0 5mm 0;
      }
      .atesto-signatures {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 12mm;
      }
      .signature-line {
        display: flex;
        flex-direction: column;
        align-items: center;
      }
      .signature-line .line {
        width: 80%;
        height: 1px;
        background: #334155;
        margin-bottom: 1.5mm;
      }
      .signature-line .signer-name {
        font-size: 7pt;
        font-weight: 700;
        color: #0f172a;
        margin: 0;
      }
      .signature-line .signer-role {
        font-size: 6.5pt;
        color: #475569;
        margin: 0.5mm 0 0 0;
      }
      .consolidado-table-wrapper {
        display: block;
        width: 100%;
      }
      table.table-consolidado {
        width: 100%;
        border-collapse: collapse;
        font-size: 6.5pt;
      }
      table.table-consolidado th, table.table-consolidado td {
        border: 1px solid #cbd5e1;
        padding: 1.5mm 2mm;
      }
      table.table-consolidado th {
        background: #0f172a;
        color: #ffffff;
      }
      table.table-consolidado tr.row-total td {
        background: #f1f5f9;
        font-weight: 700;
      }
    `;
  }

  imprimirConteudoIsolado(htmlContent: string, title: string = 'Documento', landscape: boolean = false): void {
    const iframe = document.createElement('iframe');
    iframe.name = 'print-frame-' + Date.now();
    iframe.style.position = 'fixed';
    iframe.style.top = '-9999px';
    iframe.style.left = '-9999px';
    iframe.style.width = '0px';
    iframe.style.height = '0px';
    iframe.style.border = 'none';
    document.body.appendChild(iframe);

    const doc = iframe.contentWindow?.document || iframe.contentDocument;
    if (!doc) {
      document.body.removeChild(iframe);
      window.print();
      return;
    }

    doc.open();
    doc.write(`<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>${title}</title>
  <style>
    ${this.getIsolatedPrintStyles(landscape)}
  </style>
</head>
<body>
  ${htmlContent}
</body>
</html>`);
    doc.close();

    setTimeout(() => {
      try {
        iframe.contentWindow?.focus();
        iframe.contentWindow?.print();
      } catch (err) {
        console.error('Falha na impressão isolada, tentando método padrão:', err);
        window.print();
      } finally {
        setTimeout(() => {
          if (iframe.parentNode) {
            document.body.removeChild(iframe);
          }
        }, 1500);
      }
    }, 300);
  }

  imprimirNotasFiscaisLote(): void {
    if (this.context.subTabFinanceiro() === 'DEMONSTRATIVO_ANUAL') {
      const el = document.querySelector('.consolidado-table-wrapper');
      if (el) {
        this.imprimirConteudoIsolado(el.outerHTML, 'Demonstrativo Anual Consolidado - Imbe 2026', true);
      } else {
        window.print();
      }
      return;
    }

    const cards = document.querySelectorAll('.official-invoice-card');
    if (cards && cards.length > 0) {
      let combinedHtml = '';
      cards.forEach(c => {
        const clone = c.cloneNode(true) as HTMLElement;
        clone.classList.remove('collapsed-view');
        if (!this.context.incluirMedicaoImpressao()) {
          const medicaoSec = clone.querySelector('.doc-section-equipamentos');
          if (medicaoSec) {
            medicaoSec.remove();
          }
        }
        combinedHtml += clone.outerHTML;
      });
      this.imprimirConteudoIsolado(combinedHtml, `Notas Fiscais em Lote - Imbe 2026 (${cards.length} empenhos)`, false);
    } else {
      this.toast.error('Nenhuma nota fiscal disponível para impressão no momento.');
    }
  }

  imprimirNotaIndividual(numeroEmpenho: string): void {
    const card = document.getElementById('invoice-card-' + numeroEmpenho);
    if (card) {
      const clone = card.cloneNode(true) as HTMLElement;
      clone.classList.remove('collapsed-view');
      if (!this.context.incluirMedicaoImpressao()) {
        const medicaoSec = clone.querySelector('.doc-section-equipamentos');
        if (medicaoSec) {
          medicaoSec.remove();
        }
      }
      this.imprimirConteudoIsolado(clone.outerHTML, `Espelho Fatura Oficial - Empenho ${numeroEmpenho} - Imbe`, false);
    } else {
      this.toast.error('Nota fiscal do empenho ' + numeroEmpenho + ' não encontrada.');
    }
  }

  selecionarEmpenhoParaEspelho(empId: number): void {
    this.context.empenhoFiltroNotas.set(empId);
    this.context.subTabFinanceiro.set('NOTAS_MENSAIS');
    this.carregarNotasFiscaisLote();
  }

  exportarNotasFiscaisConsolidadoCSV(): void {
    const cons = this.context.notasFiscaisConsolidado();
    if (!cons) return;

    interface RowConsolidado {
      empenho: string;
      item: number;
      codigo: string;
      descricao: string;
      unidade: string;
      valorUnitario: number;
      jan: number;
      fev: number;
      mar: number;
      abr: number;
      mai: number;
      jun: number;
      jul: number;
      ago: number;
      set: number;
      out: number;
      nov: number;
      dez: number;
      totalItem: number;
    }

    const rows: RowConsolidado[] = [];
    for (const emp of cons.empenhos) {
      for (const it of emp.itens) {
        const totalItem = it.meses.reduce((sum, m) => sum + (m.valorTotal || 0), 0);
        rows.push({
          empenho: emp.titulo,
          item: it.itemNumero,
          codigo: it.codigoItem,
          descricao: it.descricao,
          unidade: it.unidade,
          valorUnitario: it.valorUnitario,
          jan: it.meses[0]?.valorTotal || 0,
          fev: it.meses[1]?.valorTotal || 0,
          mar: it.meses[2]?.valorTotal || 0,
          abr: it.meses[3]?.valorTotal || 0,
          mai: it.meses[4]?.valorTotal || 0,
          jun: it.meses[5]?.valorTotal || 0,
          jul: it.meses[6]?.valorTotal || 0,
          ago: it.meses[7]?.valorTotal || 0,
          set: it.meses[8]?.valorTotal || 0,
          out: it.meses[9]?.valorTotal || 0,
          nov: it.meses[10]?.valorTotal || 0,
          dez: it.meses[11]?.valorTotal || 0,
          totalItem
        });
      }
    }

    const columns = [
      { header: 'Empenho', accessor: (r: RowConsolidado) => r.empenho },
      { header: 'Item', accessor: (r: RowConsolidado) => r.item },
      { header: 'Código', accessor: (r: RowConsolidado) => r.codigo },
      { header: 'Descrição', accessor: (r: RowConsolidado) => r.descricao },
      { header: 'Unidade', accessor: (r: RowConsolidado) => r.unidade },
      { header: 'Valor Unitário', accessor: (r: RowConsolidado) => (r.valorUnitario || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 3 }) },
      { header: 'Janeiro', accessor: (r: RowConsolidado) => (r.jan || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) },
      { header: 'Fevereiro', accessor: (r: RowConsolidado) => (r.fev || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) },
      { header: 'Março', accessor: (r: RowConsolidado) => (r.mar || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) },
      { header: 'Abril', accessor: (r: RowConsolidado) => (r.abr || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) },
      { header: 'Maio', accessor: (r: RowConsolidado) => (r.mai || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) },
      { header: 'Junho', accessor: (r: RowConsolidado) => (r.jun || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) },
      { header: 'Julho', accessor: (r: RowConsolidado) => (r.jul || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) },
      { header: 'Agosto', accessor: (r: RowConsolidado) => (r.ago || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) },
      { header: 'Setembro', accessor: (r: RowConsolidado) => (r.set || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) },
      { header: 'Outubro', accessor: (r: RowConsolidado) => (r.out || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) },
      { header: 'Novembro', accessor: (r: RowConsolidado) => (r.nov || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) },
      { header: 'Dezembro', accessor: (r: RowConsolidado) => (r.dez || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) },
      { header: 'Total Anual Item', accessor: (r: RowConsolidado) => (r.totalItem || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }
    ];

    exportToCsv(`demonstrativo_anual_consolidado_${cons.ano}`, columns, rows);
    this.toast.success('Demonstrativo anual consolidado exportado em .CSV com sucesso!');
  }

  exportarNotasFiscaisLoteCSV(): void {
    const faturas = this.context.notasFiscaisLote();
    if (!faturas.length) return;

    interface RowLote {
      empenho: string;
      secretaria: string;
      mesReferencia: number;
      anoReferencia: number;
      item: number;
      codigo: string;
      descricao: string;
      unidade: string;
      quantidade: number;
      valorUnitario: number;
      subtotal: number;
    }

    const rows: RowLote[] = [];
    for (const f of faturas) {
      for (const it of f.itens) {
        rows.push({
          empenho: f.numeroEmpenho,
          secretaria: f.secretariaSigla,
          mesReferencia: f.mesReferencia,
          anoReferencia: f.anoReferencia,
          item: it.itemNumero,
          codigo: it.codigoItem,
          descricao: it.descricao,
          unidade: it.unidade,
          quantidade: it.quantidade,
          valorUnitario: it.valorUnitario,
          subtotal: it.valorTotal
        });
      }
    }

    const columns = [
      { header: 'Empenho', accessor: (r: RowLote) => r.empenho },
      { header: 'Secretaria', accessor: (r: RowLote) => r.secretaria },
      { header: 'Mês', accessor: (r: RowLote) => r.mesReferencia },
      { header: 'Ano', accessor: (r: RowLote) => r.anoReferencia },
      { header: 'Item', accessor: (r: RowLote) => r.item },
      { header: 'Código', accessor: (r: RowLote) => r.codigo },
      { header: 'Descrição', accessor: (r: RowLote) => r.descricao },
      { header: 'Unidade', accessor: (r: RowLote) => r.unidade },
      { header: 'Quantidade', accessor: (r: RowLote) => (r.quantidade || 0).toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 2 }) },
      { header: 'Valor Unitário', accessor: (r: RowLote) => (r.valorUnitario || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 3 }) },
      { header: 'Subtotal R$', accessor: (r: RowLote) => (r.subtotal || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }
    ];

    const mesesStr = this.context.mesesSelecionados().join('-');
    const ano = this.context.anoFinanceiro();
    exportToCsv(`notas_fiscais_meses_${mesesStr}_${ano}`, columns, rows);
    this.toast.success('Notas fiscais exportadas em .CSV com sucesso!');
  }

  somarMesesItem(it: ItemNotaFiscal): number {
    if (!it || !it.meses) return 0;
    return it.meses.reduce((acc, m) => acc + (m.valorTotal || 0), 0);
  }
}
