import { ModalColetaSnmpComponent } from './components/modal-coleta-snmp.component';
import { ComprovanteViewerComponent } from './components/comprovante-viewer.component';
import { ColetaImpressorasComponent } from './components/coleta-impressoras.component';
import { FinanceiroImpressorasComponent } from './components/financeiro-impressoras.component';
import { GradeLeiturasComponent } from './components/grade-leituras.component';
import { ComprovanteImpressorasActions } from './comprovante/comprovante-impressoras.actions';
import { ColetaImpressorasActions } from './coleta/coleta-impressoras.actions';
import { LeiturasImpressorasActions } from './leituras/leituras-impressoras.actions';
import { FinanceiroImpressorasActions } from './financeiro/financeiro-impressoras.actions';
import { DestroyRef as LifecycleDestroyRef, inject as lifecycleInject } from '@angular/core';
import { takeUntilDestroyed as untilComponentDestroyed } from '@angular/core/rxjs-interop';
import { SeletorLocalComponent } from './seletor-local.component';
import { HistoricoInstalacoesComponent } from './historico-instalacoes.component';
import { Component, OnInit, OnDestroy, HostListener, inject, signal, computed, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ImpressoraService } from '@core/services/impressora.service';
import { SecretariaService } from '@core/services/secretaria.service';
import { ToastService } from '@core/services/toast.service';
import { ConfirmModalComponent } from '@shared/components/confirm-modal/confirm-modal.component';
import { PaginationComponent } from '@shared/components/pagination/pagination.component';
import { HeaderComponent } from '@shared/components/header/header.component';
import { exportToCsv, getTodayLocalDateString, formatDatePtBr, matchesSearch } from '@core/utils';
import {
  Impressora,
  LoteImpressao,
  EmpenhoImpressao,
  EmpenhoDTO,
  LeituraContador,
  LeituraContadorDTO,
  ItemGradeLeitura,
  Secretariat,
  ExecucaoMensal,
  EmpenhoExecucao,
  EspelhoFatura,
  ItemFatura,
  EquipamentoFatura,
  BalancoFranquias,
  LoteBalanco,
  NotasFiscaisConsolidado,
  EmpenhoNotaFiscal,
  ItemNotaFiscal,
  MesFatura,
  IniciarColetaRequest,
  ColetaProgresso,
  ColetaSessao,
  ColetaItem,
  LocalInstalacao,
  LocalInstalacaoDTO
} from '@core/models';
import { LocalInstalacaoService } from '@core/services/local-instalacao.service';

@Component({
  selector: 'app-impressoras',
  standalone: true,
  imports: [ModalColetaSnmpComponent, ComprovanteViewerComponent, ColetaImpressorasComponent, FinanceiroImpressorasComponent, GradeLeiturasComponent,
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    PaginationComponent,
    HistoricoInstalacoesComponent,
    SeletorLocalComponent,
    ConfirmModalComponent,
    HeaderComponent
  ],
  templateUrl: './impressoras.component.html',
  styleUrls: ['./impressoras.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ImpressorasComponent implements OnInit, OnDestroy {
  private readonly requestDestroyRef = lifecycleInject(LifecycleDestroyRef);

  formatDatePtBr = formatDatePtBr;

  private impressoraService = inject(ImpressoraService);
  private secretariaService = inject(SecretariaService);
  private localInstalacaoService = inject(LocalInstalacaoService);
  private toast = inject(ToastService);
  private fb = inject(FormBuilder);

  // Estados principais
  loading = signal<boolean>(true);
  inventoryError = signal(false);
  printers = signal<Impressora[]>([]);
  lotes = signal<LoteImpressao[]>([]);
  secretariats = signal<Secretariat[]>([]);
  empenhos = signal<EmpenhoImpressao[]>([]);
  leituras = signal<LeituraContador[]>([]);

  // Estados do CRUD de Locais de Instalação
  locais = signal<LocalInstalacao[]>([]);
  loadingLocais = signal<boolean>(false);
  filtroSecretariaLocais = signal<string>('');
  filtroSecretariasLocais = signal<number[]>([]);
  showSecretariaDropdownLocais = signal<boolean>(false);
  secretariaFilterSearchLocais = signal<string>('');
  buscaLocais = signal<string>('');
  isLocalModalOpen = signal<boolean>(false);
  editingLocal = signal<LocalInstalacao | null>(null);

  // Filtros e Navegação
  activeTab = signal<'INVENTARIO' | 'LEITURAS' | 'FINANCEIRO' | 'LOTES' | 'COLETA' | 'LOCAIS'>('INVENTARIO');
  globalSearch = signal<string>('');
  filterSecretaria = signal<string>('');
  filterSecretarias = signal<number[]>([]);
  showSecretariaDropdown = signal<boolean>(false);
  secretariaFilterSearch = signal<string>('');
  filterLote = signal<string>('');
  filterEmpenho = signal<string>('');
  filterStatus = signal<string>('');
  filterTipo = signal<string>('');
  filterFabricante = signal<string>('');
  filterTransformador = signal<string>('');

  // Novos controles visuais de visualização e filtros rápidos
  viewMode = signal<'tabela' | 'secretaria'>('tabela');
  showInventoryDetails = signal(false);
  readonly tabDescriptions = {
    INVENTARIO: { title: 'Inventário de impressoras', description: 'Localize um equipamento e use Ações para editar, registrar leituras ou remanejar.' },
    LEITURAS: { title: 'Medição mensal', description: 'Selecione a competência para conferir o consumo ou lançar uma leitura manual.' },
    COLETA: { title: 'Coleta automática', description: 'Selecione o período, inicie a coleta e confira os resultados antes de sincronizar as leituras.' },
    FINANCEIRO: { title: 'Financeiro', description: 'Consulte as faturas do período, acompanhe o demonstrativo anual ou gerencie os empenhos.' },
    LOTES: { title: 'Lotes e franquias', description: 'Confira o consumo por lote e consulte os valores e as franquias contratadas.' },
    LOCAIS: { title: 'Locais de instalação', description: 'Cadastre os setores e mantenha os endereços e responsáveis atualizados.' }
  };
  currentSection = computed(() => this.tabDescriptions[this.activeTab()]);
  showAdvancedFilters = signal<boolean>(false);

  toggleAdvancedFilters(): void {
    this.showAdvancedFilters.update(v => !v);
  }

  fabricantesDisponiveis = computed(() => {
    const set = new Set<string>();
    this.printers().forEach(p => {
      if (p.fabricante) set.add(p.fabricante);
    });
    return Array.from(set).sort();
  });

  activeAdvancedFiltersCount = computed(() => {
    let count = 0;
    if (this.filterTipo()) count++;
    if (this.filterFabricante()) count++;
    if (this.filterLote()) count++;
    if (this.filterEmpenho()) count++;
    if (this.filterTransformador()) count++;
    return count;
  });

  filteredSecretariasForFilter = computed(() => {
    const search = this.secretariaFilterSearch().trim();
    const list = this.secretariats();
    if (!search) return list;
    return list.filter(sec => matchesSearch([sec.sigla, sec.nome], search));
  });

  toggleSecretariaDropdown(): void {
    this.showSecretariaDropdown.update(v => !v);
    if (this.showSecretariaDropdown()) {
      this.secretariaFilterSearch.set('');
    }
  }

  toggleSecretariaFilter(id: number): void {
    this.filterSecretarias.update(ids => {
      const exists = ids.includes(id);
      return exists ? ids.filter(i => i !== id) : [...ids, id];
    });
    this.currentPage.set(1);
  }

  isSecretariaFilterSelected(id: number): boolean {
    return this.filterSecretarias().includes(id);
  }

  selectAllSecretariasFilter(): void {
    this.filterSecretarias.set(this.secretariats().map(s => s.id));
    this.currentPage.set(1);
  }

  clearSecretariaFilter(): void {
    this.filterSecretarias.set([]);
    this.currentPage.set(1);
  }

  removeSecretariaFilter(id: number): void {
    this.filterSecretarias.update(ids => ids.filter(i => i !== id));
    this.currentPage.set(1);
  }

  secretariasMap = computed(() => {
    const map = new Map<number, string>();
    for (const s of this.secretariats()) {
      map.set(s.id, s.sigla || s.nome);
    }
    return map;
  });

  getSecretariaNome(id: number): string {
    return this.secretariasMap().get(id) || '';
  }

  activeFiltersCount = computed(() => {
    let count = 0;
    if (this.globalSearch()) count++;
    if (this.filterSecretarias().length > 0 || this.filterSecretaria()) count++;
    if (this.filterTipo()) count++;
    if (this.filterFabricante()) count++;
    if (this.filterStatus()) count++;
    if (this.filterLote()) count++;
    if (this.filterEmpenho()) count++;
    if (this.filterTransformador()) count++;
    return count;
  });

  clearFilters(): void {
    this.globalSearch.set('');
    this.filterSecretaria.set('');
    this.filterSecretarias.set([]);
    this.showSecretariaDropdown.set(false);
    this.filterTipo.set('');
    this.filterFabricante.set('');
    this.filterStatus.set('');
    this.filterLote.set('');
    this.filterEmpenho.set('');
    this.filterTransformador.set('');
    this.currentPage.set(1);
  }

  // Agrupamento por Secretaria para Visão Executiva / Setorial
  printersGroupedBySecretaria = computed(() => {
    const list = this.filteredPrinters();
    const map = new Map<string, { sigla: string; nome: string; total: number; ativas: number; manutencao: number; printers: Impressora[] }>();

    list.forEach(p => {
      const key = p.secretariaSigla || 'OUTRAS';
      if (!map.has(key)) {
        map.set(key, {
          sigla: key,
          nome: p.secretariaNome || key,
          total: 0,
          ativas: 0,
          manutencao: 0,
          printers: []
        });
      }
      const g = map.get(key)!;
      g.total++;
      if (p.statusInstalacao === 'ATIVA' || (p.ativo && !p.statusInstalacao)) {
        g.ativas++;
      } else if (p.statusInstalacao === 'MANUTENCAO' || p.statusInstalacao === 'EM_MANUTENCAO') {
        g.manutencao++;
      }
      g.printers.push(p);
    });

    return Array.from(map.values()).sort((a, b) => b.total - a.total);
  });

  expandedSecretarias = signal<Set<string>>(new Set<string>());

  toggleSecretariaGroup(sigla: string): void {
    this.expandedSecretarias.update(set => {
      const next = new Set(set);
      if (next.has(sigla)) {
        next.delete(sigla);
      } else {
        next.add(sigla);
      }
      return next;
    });
  }

  expandAllSecretarias(): void {
    const all = new Set(this.printersGroupedBySecretaria().map(g => g.sigla));
    this.expandedSecretarias.set(all);
  }

  collapseAllSecretarias(): void {
    this.expandedSecretarias.set(new Set<string>());
  }

  // Dropdown de Ações por Linha e Acordeão de Faturas
  activePrinterMenuId = signal<number | null>(null);
  selectedPrinterForMenu = signal<Impressora | null>(null);
  printerMenuPosition = signal({ left: 0, top: 0 });
  private printerMenuTrigger: HTMLElement | null = null;
  private readonly dismissPrinterMenuOnScroll = () => this.closePrinterMenu();
  expandedInvoices = signal<Set<string>>(new Set<string>());

  @HostListener('document:click', ['$event'])
  onDocumentClick(event?: MouseEvent): void {
    if (this.activePrinterMenuId() !== null) {
      this.closePrinterMenu();
    }
    if (event) {
      const target = event.target as HTMLElement;
      if (!target.closest('.custom-multiselect')) {
        if (this.showSecretariaDropdown()) this.showSecretariaDropdown.set(false);
        if (this.showSecretariaDropdownLeituras()) this.showSecretariaDropdownLeituras.set(false);
        if (this.showSecretariaDropdownLocais()) this.showSecretariaDropdownLocais.set(false);
      }
    }
  }

  @HostListener('document:keydown.escape')
  onPrinterMenuEscape(): void {
    this.historicoLocal.set(null);
    if (this.activePrinterMenuId() !== null) {
      this.closePrinterMenu();
      this.printerMenuTrigger?.focus();
    }
    if (this.showSecretariaDropdown()) this.showSecretariaDropdown.set(false);
    if (this.showSecretariaDropdownLeituras()) this.showSecretariaDropdownLeituras.set(false);
    if (this.showSecretariaDropdownLocais()) this.showSecretariaDropdownLocais.set(false);
  }

  @HostListener('window:resize')
  onPrinterMenuResize(): void {
    if (this.activePrinterMenuId() !== null) {
      this.closePrinterMenu();
    }
  }

  togglePrinterMenu(printer: Impressora, event?: Event): void {
    if (event) {
      event.stopPropagation();
    }
    if (this.activePrinterMenuId() === printer.id) {
      this.closePrinterMenu();
    } else {
      this.printerMenuTrigger = event?.currentTarget as HTMLElement | null;
      const rect = this.printerMenuTrigger?.getBoundingClientRect();
      if (rect) {
        const menuWidth = 230;
        const menuHeight = 250;
        const margin = 8;

        let left = rect.right - menuWidth;
        if (left < margin) {
          left = margin;
        }
        if (left + menuWidth > window.innerWidth - margin) {
          left = window.innerWidth - menuWidth - margin;
        }

        const spaceBelow = window.innerHeight - rect.bottom;
        const spaceAbove = rect.top;
        let top: number;

        if (spaceBelow >= menuHeight + margin || spaceBelow >= spaceAbove) {
          top = rect.bottom + 4;
          if (top + menuHeight > window.innerHeight - margin) {
            top = Math.max(margin, window.innerHeight - menuHeight - margin);
          }
        } else {
          top = Math.max(margin, rect.top - menuHeight - 4);
        }

        this.printerMenuPosition.set({
          left: Math.round(left),
          top: Math.round(top)
        });
      }
      this.selectedPrinterForMenu.set(printer);
      this.activePrinterMenuId.set(printer.id);
      document.addEventListener('scroll', this.dismissPrinterMenuOnScroll, { capture: true, passive: true });
    }
  }

  closePrinterMenu(): void {
    if (this.activePrinterMenuId() === null && this.selectedPrinterForMenu() === null) {
      return;
    }
    document.removeEventListener('scroll', this.dismissPrinterMenuOnScroll, true);
    this.activePrinterMenuId.set(null);
    this.selectedPrinterForMenu.set(null);
  }

  toggleInvoice(numeroEmpenho: string): void { return this.financeiroActions.toggleInvoice(numeroEmpenho); }

  isInvoiceExpanded(numeroEmpenho: string): boolean { return this.financeiroActions.isInvoiceExpanded(numeroEmpenho); }

  expandAllInvoices(): void { return this.financeiroActions.expandAllInvoices(); }

  collapseAllInvoices(): void { return this.financeiroActions.collapseAllInvoices(); }

  calcularPercentualEmpenho(emp: EmpenhoImpressao): number { return this.financeiroActions.calcularPercentualEmpenho(emp); }

  // Módulo Financeiro & Notas Fiscais Unificado
  subTabFinanceiro = signal<'NOTAS_MENSAIS' | 'DEMONSTRATIVO_ANUAL' | 'EMPENHOS'>('NOTAS_MENSAIS');
  anoFinanceiro = signal<number>(2026);
  mesesSelecionados = signal<number[]>([8]); // Padrão: Agosto (último mês faturado)
  modoMultiplosMeses = signal<boolean>(false);
  empenhoFiltroNotas = signal<number | null>(null); // null = Todos os 8 empenhos
  incluirMedicaoImpressao = signal<boolean>(false); // Opcional: omitir ou incluir detalhamento de medições por máquina na impressão

  alternarMedicaoImpressao(): void { return this.financeiroActions.alternarMedicaoImpressao(); }

  notasFiscaisLote = signal<EspelhoFatura[]>([]);
  loadingNotasLote = signal<boolean>(false);
  notasFiscaisConsolidado = signal<NotasFiscaisConsolidado | null>(null);
  loadingNotasConsolidado = signal<boolean>(false);
  mesesComFaturamento = computed(() => {
    const consolidado = this.notasFiscaisConsolidado();
    if (!consolidado || consolidado.ano !== Number(this.anoFinanceiro())) return [];

    const empenhoId = this.empenhoFiltroNotas();
    const empenhos = consolidado.empenhos.filter(emp => empenhoId === null || emp.empenhoId === empenhoId);
    return this.mesesLista
      .filter(mes => empenhos.some(emp => (emp.totaisMensais[mes.num - 1] || 0) > 0))
      .map(mes => mes.num);
  });

  // Execução Orçamentária e Dotações
  execucaoMensal = signal<ExecucaoMensal | null>(null);
  loadingExecucao = signal<boolean>(false);
  anoExecucao = signal<number>(2026);
  empenhoSelecionadoEspelho = signal<number | null>(null);
  espelhoFatura = signal<EspelhoFatura | null>(null);
  loadingEspelho = signal<boolean>(false);

  // Balanço de Franquias por Lote
  balancoFranquias = signal<BalancoFranquias | null>(null);
  loadingBalanco = signal<boolean>(false);
  mesBalanco = signal<number>(8);
  anoBalanco = signal<number>(2026);

  // Competência selecionada para medição de contadores
  mesCompetencia = signal<number>(new Date().getMonth() + 1);
  anoCompetencia = signal<number>(new Date().getFullYear());
  nomeMesCompetencia = computed(() => {
    const meses = ['', 'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
    const m = this.mesCompetencia();
    return (meses[m] || 'Mês ' + m) + ' / ' + this.anoCompetencia();
  });
  termoBuscaLeituras = signal<string>('');
  filtroSecretariaLeituras = signal<string>('');
  filtroSecretariasLeituras = signal<number[]>([]);
  showSecretariaDropdownLeituras = signal<boolean>(false);
  secretariaFilterSearchLeituras = signal<string>('');

  // Estado da Grade Interativa de Leituras Mensais (sem modal obrigatório)
  gradeLeituras = signal<ItemGradeLeitura[]>([]);
  loadingGrade = signal<boolean>(false);
  salvandoEmLote = signal<boolean>(false);
  filtroStatusLeituras = signal<'TODOS' | 'PENDENTES' | 'SALVOS' | 'ALTERADOS'>('TODOS');
  filtroTipoLeituras = signal<'TODOS' | 'MONO' | 'COLOR'>('TODOS');
  itensAlteradosCount = computed(() => this.gradeLeituras().filter(item => item.editado).length);

  filteredSecretariasForLeituras = computed(() => {
    const search = this.secretariaFilterSearchLeituras().trim();
    const list = this.secretariats();
    if (!search) return list;
    return list.filter(sec => matchesSearch([sec.sigla, sec.nome], search));
  });

  toggleSecretariaDropdownLeituras(): void { return this.leiturasActions.toggleSecretariaDropdownLeituras(); }

  toggleSecretariaFilterLeituras(id: number): void { return this.leiturasActions.toggleSecretariaFilterLeituras(id); }

  isSecretariaFilterSelectedLeituras(id: number): boolean { return this.leiturasActions.isSecretariaFilterSelectedLeituras(id); }

  selectAllSecretariasFilterLeituras(): void { return this.leiturasActions.selectAllSecretariasFilterLeituras(); }

  clearSecretariaFilterLeituras(): void { return this.leiturasActions.clearSecretariaFilterLeituras(); }

  removeSecretariaFilterLeituras(id: number): void { return this.leiturasActions.removeSecretariaFilterLeituras(id); }

  // Paginação da tabela de inventário
  paginaLocais = signal(1);
  tamanhoLocais = signal(25);
  paginaAtualLocais = computed(() => Math.min(this.paginaLocais(), Math.max(1, Math.ceil(this.filteredLocais().length / this.tamanhoLocais()))));
  paginadosLocais = computed(() => this.filteredLocais().slice((this.paginaAtualLocais() - 1) * this.tamanhoLocais(), this.paginaAtualLocais() * this.tamanhoLocais()));

  paginaLeituras = signal(1);
  tamanhoLeituras = signal(25);

  paginaEmpenhos = signal(1);
  tamanhoEmpenhos = signal(25);
  paginaAtualEmpenhos = computed(() => Math.min(this.paginaEmpenhos(), Math.max(1, Math.ceil(this.empenhos().length / this.tamanhoEmpenhos()))));
  paginadosEmpenhos = computed(() => this.empenhos().slice((this.paginaAtualEmpenhos() - 1) * this.tamanhoEmpenhos(), this.paginaAtualEmpenhos() * this.tamanhoEmpenhos()));

  paginaColeta = signal(1);
  tamanhoColeta = signal(25);
  paginaAtualColeta = computed(() => Math.min(this.paginaColeta(), Math.max(1, Math.ceil(this.itensColetaFiltrados().length / this.tamanhoColeta()))));
  paginadosColeta = computed(() => this.itensColetaFiltrados().slice((this.paginaAtualColeta() - 1) * this.tamanhoColeta(), this.paginaAtualColeta() * this.tamanhoColeta()));

  paginaGrupos = signal(1);
  tamanhoGrupos = signal(25);
  paginaAtualGrupos = computed(() => Math.min(this.paginaGrupos(), Math.max(1, Math.ceil(this.printersGroupedBySecretaria().length / this.tamanhoGrupos()))));
  paginadosGrupos = computed(() => this.printersGroupedBySecretaria().slice((this.paginaAtualGrupos() - 1) * this.tamanhoGrupos(), this.paginaAtualGrupos() * this.tamanhoGrupos()));

  paginaContadores = signal(1);
  tamanhoContadores = signal(25);
  paginaAtualContadores = computed(() => Math.min(this.paginaContadores(), Math.max(1, Math.ceil(this.historicoLeiturasImpressora().length / this.tamanhoContadores()))));
  paginadosContadores = computed(() => this.historicoLeiturasImpressora().slice((this.paginaAtualContadores() - 1) * this.tamanhoContadores(), this.paginaAtualContadores() * this.tamanhoContadores()));

  paginasGrupo = signal<Record<string, number>>({});
  tamanhosGrupo = signal<Record<string, number>>({});
  paginaGrupo(sigla: string, total: number): number {
    return Math.min(this.paginasGrupo()[sigla] || 1, Math.max(1, Math.ceil(total / (this.tamanhosGrupo()[sigla] || 25))));
  }
  impressorasDoGrupo(sigla: string, impressoras: Impressora[]): Impressora[] {
    const size = this.tamanhosGrupo()[sigla] || 25;
    const start = (this.paginaGrupo(sigla, impressoras.length) - 1) * size;
    return impressoras.slice(start, start + size);
  }
  mudarPaginaGrupo(sigla: string, pagina: number): void {
    this.paginasGrupo.update(p => ({ ...p, [sigla]: pagina }));
  }
  mudarTamanhoGrupo(sigla: string, tamanho: number): void {
    this.tamanhosGrupo.update(p => ({ ...p, [sigla]: tamanho }));
    this.mudarPaginaGrupo(sigla, 1);
  }

  paginaLotes = signal(1);
  tamanhoLotes = signal(25);
  paginaAtualLotes = computed(() => Math.min(this.paginaLotes(), Math.max(1, Math.ceil(this.lotes().length / this.tamanhoLotes()))));
  lotesVisiveis = computed(() => this.lotes().slice((this.paginaAtualLotes() - 1) * this.tamanhoLotes(), this.paginaAtualLotes() * this.tamanhoLotes()));
  currentPage = signal<number>(1);
  pageSize = signal<number>(25);

  // Controle de Modais de Impressoras
  isModalOpen = signal<boolean>(false);
  isEditMode = signal<boolean>(false);
  selectedPrinter = signal<Impressora | null>(null);

  isRemanejarModalOpen = signal<boolean>(false);
  isSubstituirModalOpen = signal<boolean>(false);
  isLeituraModalOpen = signal<boolean>(false);
  isDetailsModalOpen = signal<boolean>(false);
  isDeleteModalOpen = signal<boolean>(false);
  printerToDelete = signal<Impressora | null>(null);

  // Histórico de contadores da impressora selecionada
  historicoLocal = signal<LocalInstalacao | null>(null);

  activeDetailsTab = signal<'GERAL' | 'LEITURAS' | 'LOCAIS'>('GERAL');
  historicoLeiturasImpressora = signal<LeituraContador[]>([]);
  loadingHistorico = signal<boolean>(false);

  // Controle de Modais de Empenhos
  isEmpenhoModalOpen = signal<boolean>(false);
  isEmpenhoEditMode = signal<boolean>(false);
  selectedEmpenho = signal<EmpenhoImpressao | null>(null);
  isDeleteEmpenhoModalOpen = signal<boolean>(false);
  empenhoToDelete = signal<EmpenhoImpressao | null>(null);

  // ==================== ESTADOS DA COLETA AUTOMÁTICA ====================
  coletaAtiva = signal<ColetaProgresso | null>(null);
  coletaSessao = signal<ColetaSessao | null>(null);
  loadingColeta = signal<boolean>(false);
  pollingColetaInterval: any = null;
  anoColeta = signal<number>(2026);
  mesColeta = signal<number>(8);
  secretariaFiltroColeta = signal<number | null>(null);
  empenhoFiltroColeta = signal<number | null>(null);

  // Seleção e visualização de impressoras para a varredura
  modalSelecaoImpressorasAberto = signal<boolean>(false);
  // Exibe a seleção padrão de todas as impressoras ativas desde a abertura da tela.
  selecaoConfirmadaColeta = signal<number[] | null>([]);
  coletarTodasImpressoras = signal<boolean>(true);
  impressorasSelecionadasColeta = signal<number[]>([]);
  buscaImpressoraModalColeta = signal<string>('');
  filtroRedeModalColeta = signal<'TODAS' | 'COM_IP' | 'SEM_IP'>('TODAS');
  filtroSecretariaModalColeta = signal<number | null>(null);

  // Modal de cadastro/edição: navegação e busca
  activeModalStep = signal<number>(1);
  termoBuscaLocalModal = signal<string>('');
  termoBuscaLocalRemanejo = signal<string>('');
  secretariaSelecionadaCadastro = signal<number | null>(null);
  secretariaSelecionadaRemanejo = signal<number | null>(null);

  modalPrintAberto = signal<boolean>(false);
  printSelecionado = signal<ColetaItem | null>(null);

  // Formulários
  form: FormGroup = this.fb.group({
    itemPedido: [''],
    numeroSerie: [''],
    fabricante: ['Ricoh', Validators.required],
    modelo: ['', Validators.required],
    tipoImpressao: ['MONO', Validators.required],
    loteId: [1, Validators.required],
    ip: [''],
    secretariaId: ['', Validators.required],
    empenhoId: [''],
    localInstalacaoId: ['', Validators.required],
    localInstalacao: ['', Validators.required],
    endereco: [''],
    responsavel: [''],
    transformador: ['NAO'],
    dataInstalacao: [getTodayLocalDateString(), Validators.required],
    contadorInicialMono: [0],
    contadorInicialColor: [0]
  });

  remanejarForm: FormGroup = this.fb.group({
    localInstalacaoId: ['', Validators.required],
    novaSecretariaId: ['', Validators.required],
    novoLocalInstalacao: ['', Validators.required],
    novoEndereco: [''],
    novoResponsavel: [''],
    novoIp: [''],
    novoTransformador: ['NAO'],
    dataMudanca: [getTodayLocalDateString(), Validators.required],
    contadorAtualMono: [0, Validators.required],
    contadorAtualColor: [0],
    motivo: ['Remanejamento de setor']
  });

  localForm: FormGroup = this.fb.group({
    nome: ['', Validators.required],
    secretariaId: ['', Validators.required],
    endereco: [''],
    responsavel: [''],
    telefone: [''],
    ativo: [true]
  });

  substituirForm: FormGroup = this.fb.group({
    contadorFinalMonoRetirada: [0, Validators.required],
    contadorFinalColorRetirada: [0],
    dataSubstituicao: [getTodayLocalDateString(), Validators.required],
    motivoDefeito: ['', Validators.required],
    novoNumeroSerie: [''],
    novoFabricante: ['Ricoh'],
    novoModelo: ['', Validators.required],
    contadorInicialMonoNova: [0, Validators.required],
    contadorInicialColorNova: [0]
  });

  leituraForm: FormGroup = this.fb.group({
    impressoraId: ['', Validators.required],
    mesReferencia: [new Date().getMonth() + 1, Validators.required],
    anoReferencia: [new Date().getFullYear(), Validators.required],
    dataLeitura: [getTodayLocalDateString(), Validators.required],
    leituraMonoAtual: [0, Validators.required],
    leituraColorAtual: [0],
    proporcao: [1.0],
    origemLeitura: ['MANUAL'],
    observacoes: ['']
  });

  empenhoForm: FormGroup = this.fb.group({
    numeroEmpenho: ['', Validators.required],
    ano: [new Date().getFullYear(), Validators.required],
    secretariaId: ['', Validators.required],
    descricao: [''],
    valorTotal: [0, [Validators.required, Validators.min(0)]],
    saldo: [0]
  });

  // Métricas Computadas
  totalImpressoras = computed(() => this.printers().length);
  totalManutencao = computed(() => this.printers().filter(p => p.statusInstalacao === 'MANUTENCAO' || p.statusInstalacao === 'EM_MANUTENCAO').length);
  totalAtivas = computed(() => this.printers().filter(p => p.statusInstalacao === 'ATIVA' || (p.ativo && !p.statusInstalacao)).length);
  totalMono = computed(() => this.printers().filter(p => p.tipoImpressao === 'MONO').length);
  totalColor = computed(() => this.printers().filter(p => p.tipoImpressao === 'COLOR').length);

  // Computado de filtragem do Inventário
  filteredPrinters = computed(() => {
    let list = this.printers();
    const rawSearch = this.globalSearch().trim();

    if (rawSearch) {
      const isItemHash = /^#\s*(\d+)$/.test(rawSearch);
      const isItemWord = /^item\s*(\d+)$/i.test(rawSearch);
      const isPureNumber = /^\d+$/.test(rawSearch);

      if (isItemHash || isItemWord || isPureNumber) {
        const itemNum = parseInt(rawSearch.replace(/\D/g, ''), 10);
        const exactMatches = list.filter(p => p.itemPedido === itemNum || p.id === itemNum);
        if (exactMatches.length > 0) {
          list = exactMatches;
        } else {
          const search = rawSearch.toLowerCase();
          list = list.filter(p =>
            (p.numeroSerie && p.numeroSerie.toLowerCase().includes(search)) ||
            (p.ip && p.ip.toLowerCase() === search) ||
            (p.numeroEmpenho && p.numeroEmpenho.toLowerCase().includes(search)) ||
            (p.modelo && p.modelo.toLowerCase().includes(search))
          );
        }
      } else {
        const search = rawSearch.toLowerCase();
        list = list.filter(p =>
          (p.modelo && p.modelo.toLowerCase().includes(search)) ||
          (p.fabricante && p.fabricante.toLowerCase().includes(search)) ||
          (p.ip && p.ip.toLowerCase().includes(search)) ||
          (p.localInstalacao && p.localInstalacao.toLowerCase().includes(search)) ||
          (p.endereco && p.endereco.toLowerCase().includes(search)) ||
          (p.secretariaSigla && p.secretariaSigla.toLowerCase().includes(search)) ||
          (p.secretariaNome && p.secretariaNome.toLowerCase().includes(search)) ||
          (p.numeroSerie && p.numeroSerie.toLowerCase().includes(search)) ||
          (p.numeroEmpenho && p.numeroEmpenho.toLowerCase().includes(search))
        );
      }
    }

    if (this.filterSecretarias().length > 0) {
      const selected = this.filterSecretarias();
      list = list.filter(p => {
        if (p.secretariaId && selected.includes(p.secretariaId)) return true;
        return selected.some(id => {
          const sec = this.secretariats().find(s => s.id === id);
          return sec && (p.secretariaSigla === sec.sigla || p.secretariaSigla === sec.nome);
        });
      });
    } else if (this.filterSecretaria()) {
      list = list.filter(p => p.secretariaSigla === this.filterSecretaria());
    }

    if (this.filterTipo()) {
      list = list.filter(p => p.tipoImpressao === this.filterTipo());
    }

    if (this.filterFabricante()) {
      list = list.filter(p => p.fabricante?.toLowerCase() === this.filterFabricante().toLowerCase());
    }

    if (this.filterStatus()) {
      if (this.filterStatus() === 'ATIVA') {
        list = list.filter(p => p.statusInstalacao === 'ATIVA' || (p.ativo && !p.statusInstalacao));
      } else if (this.filterStatus() === 'MANUTENCAO') {
        list = list.filter(p => p.statusInstalacao === 'MANUTENCAO' || p.statusInstalacao === 'EM_MANUTENCAO');
      } else if (this.filterStatus() === 'INATIVA') {
        list = list.filter(p => p.statusInstalacao === 'INATIVA' || p.statusInstalacao === 'RECOLHIDA' || !p.ativo);
      } else {
        list = list.filter(p => p.statusInstalacao === this.filterStatus());
      }
    }

    if (this.filterLote()) {
      list = list.filter(p => p.numeroLote === Number(this.filterLote()));
    }

    if (this.filterEmpenho()) {
      list = list.filter(p => p.numeroEmpenho === this.filterEmpenho());
    }

    if (this.filterTransformador()) {
      list = list.filter(p => p.transformador === this.filterTransformador());
    }

    return list;
  });

  paginatedPrinters = computed(() => {
    const list = this.filteredPrinters();
    const start = (this.currentPage() - 1) * this.pageSize();
    return list.slice(start, start + this.pageSize());
  });

  // Filtragem da Grade de Medição Mensal
  filteredGradeLeituras = computed(() => {
    let list = this.gradeLeituras();
    const rawSearch = this.termoBuscaLeituras().trim();

    if (rawSearch) {
      const isItemHash = /^#\s*(\d+)$/.test(rawSearch);
      const isItemWord = /^item\s*(\d+)$/i.test(rawSearch);
      const isPureNumber = /^\d+$/.test(rawSearch);

      if (isItemHash || isItemWord || isPureNumber) {
        const itemNum = parseInt(rawSearch.replace(/\D/g, ''), 10);
        const exactMatches = list.filter(l => (l.itemPedido === itemNum || l.impressoraId === itemNum));
        if (exactMatches.length > 0) {
          list = exactMatches;
        } else {
          const search = rawSearch.toLowerCase();
          list = list.filter(l =>
            (l.ip && l.ip.toLowerCase() === search) ||
            (l.modelo && l.modelo.toLowerCase().includes(search))
          );
        }
      } else {
        const search = rawSearch.toLowerCase();
        list = list.filter(l =>
          (l.modelo && l.modelo.toLowerCase().includes(search)) ||
          (l.localInstalacao && l.localInstalacao.toLowerCase().includes(search)) ||
          (l.ip && l.ip.toLowerCase().includes(search)) ||
          (l.secretariaSigla && l.secretariaSigla.toLowerCase().includes(search)) ||
          (l.fabricante && l.fabricante.toLowerCase().includes(search))
        );
      }
    }

    if (this.filtroSecretariasLeituras().length > 0) {
      const selected = this.filtroSecretariasLeituras();
      list = list.filter(l => {
        return selected.some(id => {
          const sec = this.secretariats().find(s => s.id === id);
          return sec && (l.secretariaSigla === sec.sigla || l.secretariaSigla === sec.nome || l.secretariaId === id);
        });
      });
    } else if (this.filtroSecretariaLeituras()) {
      list = list.filter(l => l.secretariaSigla === this.filtroSecretariaLeituras());
    }

    if (this.filtroStatusLeituras() === 'PENDENTES') {
      list = list.filter(l => l.status === 'PENDENTE' || l.leituraMonoAtual === null || l.leituraMonoAtual === undefined);
    } else if (this.filtroStatusLeituras() === 'SALVOS') {
      list = list.filter(l => l.status === 'SALVO' && !l.editado);
    } else if (this.filtroStatusLeituras() === 'ALTERADOS') {
      list = list.filter(l => l.editado);
    }

    if (this.filtroTipoLeituras() === 'MONO') {
      list = list.filter(l => l.tipoImpressao === 'MONO');
    } else if (this.filtroTipoLeituras() === 'COLOR') {
      list = list.filter(l => l.tipoImpressao === 'COLOR');
    }

    return list;
  });

  filteredLeituras = computed(() => this.filteredGradeLeituras() as any);

  // Paginação da grade de medições
  paginaAtualLeituras = computed(() => {
    const total = this.filteredGradeLeituras().length;
    const size = this.tamanhoLeituras();
    return Math.min(this.paginaLeituras(), Math.max(1, Math.ceil(total / size)));
  });

  paginadosGradeLeituras = computed(() => {
    const page = this.paginaAtualLeituras();
    const size = this.tamanhoLeituras();
    return this.filteredGradeLeituras().slice((page - 1) * size, page * size);
  });

  paginadosLeituras = computed(() => this.paginadosGradeLeituras() as any);

  // Métricas do Faturamento Mensal das Leituras
  totalEquipamentosGrade = computed(() => this.gradeLeituras().length);
  totalSalvosGrade = computed(() => this.gradeLeituras().filter(l => l.status === 'SALVO').length);
  totalPendentesGrade = computed(() => this.gradeLeituras().filter(l => l.status === 'PENDENTE' || l.leituraMonoAtual === null || l.leituraMonoAtual === undefined).length);
  totalCopiasMonoMes = computed(() => this.gradeLeituras().reduce((sum, l) => sum + (l.copiasMono || 0), 0));
  totalCopiasColorMes = computed(() => this.gradeLeituras().reduce((sum, l) => sum + (l.copiasColor || 0), 0));
  totalExcedenteMes = computed(() => this.gradeLeituras().reduce((sum, l) => sum + (l.excedenteMono || 0) + (l.excedenteColor || 0), 0));
  totalValorFaturaMes = computed(() => this.gradeLeituras().reduce((sum, l) => sum + (l.valorTotal || 0), 0));
  percentualConcluidoGrade = computed(() => {
    const total = this.totalEquipamentosGrade();
    if (total === 0) return 0;
    return Math.min(100, Math.round((this.totalSalvosGrade() / total) * 100));
  });

  // Métricas Computadas dos Empenhos
  totalEmpenhadoGeral = computed(() => this.empenhos().reduce((sum, e) => sum + (e.valorTotal || 0), 0));
  totalSaldoEmpenhos = computed(() => this.empenhos().reduce((sum, e) => sum + (e.saldo || 0), 0));
  totalMaquinasEmpenhadas = computed(() => this.empenhos().reduce((sum, e) => sum + (e.quantidadeImpressoras || 0), 0));

  // Métricas e Filtragem da Coleta Automática
  impressorasAtivasParaColeta = computed(() => {
    return this.printers().filter(p => p.ativo);
  });

  impressorasElegiveisParaColeta = computed(() => {
    const secretariaId = this.secretariaFiltroColeta();
    const empenhoId = this.empenhoFiltroColeta();
    return this.impressorasAtivasParaColeta().filter(p =>
      (secretariaId === null || p.secretariaId === secretariaId) &&
      (empenhoId === null || p.empenhoId === empenhoId)
    );
  });

  idsImpressorasSelecionadasEfetivas = computed(() => {
    const ativas = this.impressorasFiltradasModalColeta();
    if (this.coletarTodasImpressoras()) {
      return ativas.map(p => p.id);
    }
    const selecionadas = new Set(this.impressorasSelecionadasColeta());
    return ativas.filter(p => selecionadas.has(p.id)).map(p => p.id);
  });

  todasImpressorasSelecionadasColeta = computed(() => {
    const ativas = this.impressorasFiltradasModalColeta();
    if (ativas.length === 0) return true;
    if (this.coletarTodasImpressoras()) return true;
    const selecionadas = this.idsImpressorasSelecionadasEfetivas();
    return ativas.length === selecionadas.length && ativas.every(p => selecionadas.includes(p.id));
  });

  totalImpressorasSelecionadasColeta = computed(() => {
    return this.idsImpressorasSelecionadasEfetivas().length;
  });

  impressorasFiltradasModalColeta = computed(() => {
    let list = this.impressorasElegiveisParaColeta();
    const secId = this.filtroSecretariaModalColeta();
    if (secId) {
      list = list.filter(p => p.secretariaId === secId);
    }
    const rede = this.filtroRedeModalColeta();
    if (rede === 'COM_IP') {
      list = list.filter(p => p.ip && /^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(p.ip.trim()));
    } else if (rede === 'SEM_IP') {
      list = list.filter(p => !p.ip || !/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(p.ip.trim()));
    }
    const busca = this.buscaImpressoraModalColeta().toLowerCase().trim();
    if (busca) {
      list = list.filter(p =>
        (p.modelo && p.modelo.toLowerCase().includes(busca)) ||
        (p.ip && p.ip.toLowerCase().includes(busca)) ||
        (p.numeroSerie && p.numeroSerie.toLowerCase().includes(busca)) ||
        (p.itemPedido && p.itemPedido.toString().includes(busca)) ||
        (p.secretariaSigla && p.secretariaSigla.toLowerCase().includes(busca)) ||
        (p.localInstalacao && p.localInstalacao.toLowerCase().includes(busca))
      );
    }
    return list;
  });

  totalComIpParaColeta = computed(() => {
    return this.impressorasElegiveisParaColeta().filter(p => p.ip && /^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(p.ip.trim())).length;
  });

  totalSemIpParaColeta = computed(() => {
    return this.impressorasElegiveisParaColeta().filter(p => !p.ip || !/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(p.ip.trim())).length;
  });

  todasFiltradasModalMarcadas = computed(() => {
    const filtradas = this.impressorasFiltradasModalColeta();
    if (filtradas.length === 0) return false;
    const selecionadas = this.idsImpressorasSelecionadasEfetivas();
    return selecionadas.length === filtradas.length && filtradas.every(p => selecionadas.includes(p.id));
  });

  itensExibidosColeta = computed<ColetaItem[]>(() => {
    const itens = this.coletaSessao()?.itens || [];
    const confirmadas = this.selecaoConfirmadaColeta() === null ? null : this.idsImpressorasSelecionadasEfetivas();
    if (confirmadas === null) return itens;
    const porImpressora = new Map(itens.map(i => [i.impressoraId, i]));
    const selecionadas = new Set(confirmadas);
    return this.printers().filter(p => selecionadas.has(p.id)).map(p => porImpressora.get(p.id) || {
      // Linha de prévia: não representa um item persistido nem permite requisições por ID.
      id: -p.id,
      sessaoId: 0,
      impressoraId: p.id,
      itemPedido: p.itemPedido,
      ip: p.ip || '',
      modelo: p.modelo,
      secretariaSigla: p.secretariaSigla,
      localInstalacao: p.localInstalacao,
      numeroSerie: p.numeroSerie,
      status: 'PENDENTE' as const,
      mensagem: 'Impressora selecionada. Inicie a coleta para obter o contador e o comprovante.'
    });
  });

  itensColetaFiltrados = computed(() => {
    return this.itensExibidosColeta();
  });

  metricasColeta = computed(() => {
    const itens = this.itensColetaFiltrados();
    return {
      total: itens.length,
      sucesso: itens.filter(i => i.status === 'SUCESSO').length,
      falhas: itens.filter(i => i.status === 'OFFLINE' || i.status === 'ERRO').length,
      pendentes: itens.filter(i => i.status === 'PENDENTE').length
    };
  });

  // Métricas e Filtragem do CRUD de Locais de Instalação
  totalLocais = computed(() => this.locais().length);
  filteredSecretariasForLocais = computed(() => {
    const search = this.secretariaFilterSearchLocais().trim();
    const list = this.secretariats();
    if (!search) return list;
    return list.filter(sec => matchesSearch([sec.sigla, sec.nome], search));
  });

  toggleSecretariaDropdownLocais(): void {
    this.showSecretariaDropdownLocais.update(v => !v);
    if (this.showSecretariaDropdownLocais()) {
      this.secretariaFilterSearchLocais.set('');
    }
  }

  toggleSecretariaFilterLocais(id: number): void {
    this.filtroSecretariasLocais.update(ids => {
      const exists = ids.includes(id);
      return exists ? ids.filter(i => i !== id) : [...ids, id];
    });
  }

  isSecretariaFilterSelectedLocais(id: number): boolean {
    return this.filtroSecretariasLocais().includes(id);
  }

  selectAllSecretariasFilterLocais(): void {
    this.filtroSecretariasLocais.set(this.secretariats().map(s => s.id));
  }

  clearSecretariaFilterLocais(): void {
    this.filtroSecretariasLocais.set([]);
  }

  removeSecretariaFilterLocais(id: number): void {
    this.filtroSecretariasLocais.update(ids => ids.filter(i => i !== id));
  }

  filteredLocais = computed(() => {
    let list = this.locais();
    const busca = this.buscaLocais().toLowerCase().trim();
    if (busca) {
      list = list.filter(l =>
        (l.nome && l.nome.toLowerCase().includes(busca)) ||
        (l.endereco && l.endereco.toLowerCase().includes(busca)) ||
        (l.responsavel && l.responsavel.toLowerCase().includes(busca)) ||
        (l.secretariaSigla && l.secretariaSigla.toLowerCase().includes(busca)) ||
        (l.secretariaNome && l.secretariaNome.toLowerCase().includes(busca))
      );
    }
    if (this.filtroSecretariasLocais().length > 0) {
      const selected = this.filtroSecretariasLocais();
      list = list.filter(l => {
        if (l.secretariaId && selected.includes(l.secretariaId)) return true;
        return selected.some(id => {
          const sec = this.secretariats().find(s => s.id === id);
          return sec && (l.secretariaSigla === sec.sigla || l.secretariaSigla === sec.nome);
        });
      });
    } else if (this.filtroSecretariaLocais()) {
      list = list.filter(l => l.secretariaSigla === this.filtroSecretariaLocais());
    }
    return list;
  });

  // Lista completa e unificada de TODOS os locais existentes (CRUD + inventário de impressoras)
  todosLocaisDisponiveis = computed(() => {
    const mapa = new Map(this.locais().filter(l => l.ativo).map(l => [l.id, l]));

    return Array.from(mapa.values()).sort((a, b) => {
      const siglaA = a.secretariaSigla || '';
      const siglaB = b.secretariaSigla || '';
      if (siglaA !== siglaB) return siglaA.localeCompare(siglaB);
      return a.nome.localeCompare(b.nome);
    });
  });

  // Agrupamento por Secretaria para exibição limpa e estruturada
  locaisAgrupadosPorSecretaria = computed(() => {
    let lista = this.todosLocaisDisponiveis();
    const busca = this.termoBuscaLocalModal().toLowerCase().trim();

    if (busca) {
      lista = lista.filter(l =>
        l.nome.toLowerCase().includes(busca) ||
        (l.secretariaSigla && l.secretariaSigla.toLowerCase().includes(busca)) ||
        (l.secretariaNome && l.secretariaNome.toLowerCase().includes(busca)) ||
        (l.endereco && l.endereco.toLowerCase().includes(busca))
      );
    }

    const grupos = new Map<string, { secretariaId: number; secretariaSigla: string; secretariaNome: string; locais: LocalInstalacao[] }>();

    for (const loc of lista) {
      const sigla = loc.secretariaSigla || 'GERAL';
      if (!grupos.has(sigla)) {
        grupos.set(sigla, {
          secretariaId: loc.secretariaId || 0,
          secretariaSigla: sigla,
          secretariaNome: loc.secretariaNome || sigla,
          locais: []
        });
      }
      grupos.get(sigla)!.locais.push(loc);
    }

    const secSelId = this.secretariaSelecionadaCadastro();
    const resultado = Array.from(grupos.values());

    resultado.sort((a, b) => {
      if (secSelId && a.secretariaId === secSelId) return -1;
      if (secSelId && b.secretariaId === secSelId) return 1;
      return a.secretariaSigla.localeCompare(b.secretariaSigla);
    });

    return resultado;
  });

  // Agrupamento para Remanejamento
  locaisAgrupadosRemanejo = computed(() => {
    let lista = this.todosLocaisDisponiveis();
    const busca = this.termoBuscaLocalRemanejo().toLowerCase().trim();

    if (busca) {
      lista = lista.filter(l =>
        l.nome.toLowerCase().includes(busca) ||
        (l.secretariaSigla && l.secretariaSigla.toLowerCase().includes(busca)) ||
        (l.secretariaNome && l.secretariaNome.toLowerCase().includes(busca)) ||
        (l.endereco && l.endereco.toLowerCase().includes(busca))
      );
    }

    const grupos = new Map<string, { secretariaId: number; secretariaSigla: string; secretariaNome: string; locais: LocalInstalacao[] }>();

    for (const loc of lista) {
      const sigla = loc.secretariaSigla || 'GERAL';
      if (!grupos.has(sigla)) {
        grupos.set(sigla, {
          secretariaId: loc.secretariaId || 0,
          secretariaSigla: sigla,
          secretariaNome: loc.secretariaNome || sigla,
          locais: []
        });
      }
      grupos.get(sigla)!.locais.push(loc);
    }

    const secSelId = this.secretariaSelecionadaRemanejo();
    const resultado = Array.from(grupos.values());

    resultado.sort((a, b) => {
      if (secSelId && a.secretariaId === secSelId) return -1;
      if (secSelId && b.secretariaId === secSelId) return 1;
      return a.secretariaSigla.localeCompare(b.secretariaSigla);
    });

    return resultado;
  });

  locaisFiltradosParaRemanejo = computed(() => {
    const secId = this.secretariaSelecionadaRemanejo();
    if (!secId) return this.todosLocaisDisponiveis();
    return this.todosLocaisDisponiveis().filter(l => l.secretariaId === Number(secId));
  });

  locaisFiltradosParaCadastro = computed(() => {
    const secId = this.secretariaSelecionadaCadastro();
    if (!secId) return this.todosLocaisDisponiveis();
    return this.todosLocaisDisponiveis().filter(l => l.secretariaId === Number(secId));
  });

  ngOnInit(): void {
    this.carregarDados();
  }

  carregarDados(): void {
    this.loading.set(true);

    this.impressoraService.getLotes().pipe(untilComponentDestroyed(this.requestDestroyRef)).subscribe({
      next: lotes => this.lotes.set(lotes),
      error: () => this.toast.error('Erro ao carregar lotes de impressão.')
    });

    this.secretariaService.getAll().pipe(untilComponentDestroyed(this.requestDestroyRef)).subscribe({
      next: secs => this.secretariats.set(secs),
      error: () => this.toast.error('Erro ao carregar secretarias.')
    });

    this.carregarEmpenhos();
    this.carregarImpressoras();
    this.carregarLocais();
    this.carregarGradeLeituras();
  }

  carregarEmpenhos(): void {
    this.impressoraService.getEmpenhos().pipe(untilComponentDestroyed(this.requestDestroyRef)).subscribe({
      next: emp => this.empenhos.set(emp),
      error: () => {}
    });
  }

  carregarImpressoras(): void {
    this.loading.set(true);
    this.inventoryError.set(false);
    this.impressoraService.getAll().pipe(untilComponentDestroyed(this.requestDestroyRef)).subscribe({
      next: list => {
        this.printers.set(list);
        if (this.coletarTodasImpressoras()) {
          this.impressorasSelecionadasColeta.set(list.filter(p => p.ativo).map(p => p.id));
        }
        this.loading.set(false);
      },
      error: () => {

        this.inventoryError.set(true);
        this.loading.set(false);
      }
    });
  }

  carregarLocais(): void {
    this.loadingLocais.set(true);
    this.localInstalacaoService.getAll().pipe(untilComponentDestroyed(this.requestDestroyRef)).subscribe({
      next: data => {
        this.locais.set(data);
        this.loadingLocais.set(false);
      },
      error: () => {
        this.loadingLocais.set(false);

      }
    });
  }

  abrirModalNovoLocal(): void {
    this.editingLocal.set(null);
    this.localForm.reset({
      nome: '',
      secretariaId: this.secretariats().length > 0 ? this.secretariats()[0].id : '',
      endereco: '',
      responsavel: '',
      telefone: '',
      ativo: true
    });
    this.isLocalModalOpen.set(true);
  }

  abrirModalEditarLocal(local: LocalInstalacao): void {
    this.editingLocal.set(local);
    this.localForm.reset({
      nome: local.nome,
      secretariaId: local.secretariaId,
      endereco: local.endereco || '',
      responsavel: local.responsavel || '',
      telefone: local.telefone || '',
      ativo: local.ativo
    });
    this.isLocalModalOpen.set(true);
  }

  fecharModalLocal(): void {
    this.isLocalModalOpen.set(false);
    this.editingLocal.set(null);
  }

  salvarLocal(): void {
    if (this.localForm.invalid) {
      this.localForm.markAllAsTouched();
      this.toast.error('Preencha os campos obrigatórios do local.');
      return;
    }

    const val = this.localForm.value;
    const editing = this.editingLocal();

    if (editing) {
      this.localInstalacaoService.update(editing.id, val).pipe(untilComponentDestroyed(this.requestDestroyRef)).subscribe({
        next: () => {
          this.toast.success('Local de instalação atualizado com sucesso!');
          this.fecharModalLocal();
          this.carregarLocais();
        },
        error: () => this.toast.error('Erro ao atualizar local de instalação.')
      });
    } else {
      this.localInstalacaoService.create(val).pipe(untilComponentDestroyed(this.requestDestroyRef)).subscribe({
        next: () => {
          this.toast.success('Local de instalação cadastrado com sucesso!');
          this.fecharModalLocal();
          this.carregarLocais();
        },
        error: () => this.toast.error('Erro ao cadastrar local de instalação.')
      });
    }
  }

  excluirLocal(id: number): void {
    if (!confirm('Deseja realmente inativar este local de instalação?')) return;
    this.localInstalacaoService.delete(id).pipe(untilComponentDestroyed(this.requestDestroyRef)).subscribe({
      next: () => {
        this.toast.success('Local inativado com sucesso!');
        this.carregarLocais();
      },
      error: () => this.toast.error('Erro ao inativar local.')
    });
  }

  definirPassoModal(passo: number): void {
    if (passo >= 1 && passo <= 4) {
      this.activeModalStep.set(passo);
    }
  }

  proximoPassoModal(): void {
    if (this.activeModalStep() < 4) {
      this.activeModalStep.update(v => v + 1);
    }
  }

  passoAnteriorModal(): void {
    if (this.activeModalStep() > 1) {
      this.activeModalStep.update(v => v - 1);
    }
  }

  getNomeSecretaria(secId: any): string {
    if (!secId) return 'Não informada';
    const sec = this.secretariats().find(s => s.id === Number(secId));
    return sec ? `${sec.sigla} - ${sec.nome}` : 'Secretaria #' + secId;
  }

  onLocalSelecionadoCadastro(valor: any): void {
    if (!valor) return;
    const loc = this.todosLocaisDisponiveis().find(l => l.id === Number(valor));

    if (loc) {
      this.form.patchValue({
        localInstalacao: loc.nome,
        localInstalacaoId: (loc.id && loc.id > 0) ? loc.id : '',
        secretariaId: loc.secretariaId || this.form.get('secretariaId')?.value,
        endereco: loc.endereco || '',
        responsavel: loc.responsavel || ''
      });
      if (loc.secretariaId) {
        this.secretariaSelecionadaCadastro.set(loc.secretariaId);
      }
    }
  }

  onSecretariaMudouCadastro(secretariaId: any): void {
    const secId = Number(secretariaId);
    this.secretariaSelecionadaCadastro.set(secId || null);
    this.form.patchValue({ secretariaId: secId || '', localInstalacaoId: '', localInstalacao: '', endereco: '', responsavel: '', empenhoId: '' });
  }

  onLocalSelecionadoRemanejar(valor: any): void {
    if (!valor) return;
    const loc = this.todosLocaisDisponiveis().find(l => l.id === Number(valor));

    if (loc) {
      this.remanejarForm.patchValue({
        novoLocalInstalacao: loc.nome,
        localInstalacaoId: (loc.id && loc.id > 0) ? loc.id : '',
        novaSecretariaId: loc.secretariaId || this.remanejarForm.get('novaSecretariaId')?.value,
        novoEndereco: loc.endereco || '',
        novoResponsavel: loc.responsavel || ''
      });
      if (loc.secretariaId) {
        this.secretariaSelecionadaRemanejo.set(loc.secretariaId);
      }
    }
  }

  onSecretariaMudouRemanejar(secretariaId: any): void {
    const secId = Number(secretariaId);
    this.secretariaSelecionadaRemanejo.set(secId || null);
    this.remanejarForm.patchValue({ novaSecretariaId: secId || '', localInstalacaoId: '', novoLocalInstalacao: '', novoEndereco: '', novoResponsavel: '' });
  }

  carregarLeiturasCompetencia(): void { return this.leiturasActions.carregarLeiturasCompetencia(); }

  carregarGradeLeituras(): void { return this.leiturasActions.carregarGradeLeituras(); }

  onLeituraMonoChange(item: ItemGradeLeitura, valorStr: any): void { return this.leiturasActions.onLeituraMonoChange(item, valorStr); }

  onLeituraColorChange(item: ItemGradeLeitura, valorStr: any): void { return this.leiturasActions.onLeituraColorChange(item, valorStr); }

  recalcularExcedenteEValorItem(item: ItemGradeLeitura): void { return this.leiturasActions.recalcularExcedenteEValorItem(item); }

  salvarLinhaLeitura(item: ItemGradeLeitura): void { return this.leiturasActions.salvarLinhaLeitura(item); }

  salvarTodasAlteracoes(): void { return this.leiturasActions.salvarTodasAlteracoes(); }

  descartarAlteracoes(): void { return this.leiturasActions.descartarAlteracoes(); }

  focarProximoInput(event: Event): void { return this.leiturasActions.focarProximoInput(event); }

  trocarAba(tab: 'INVENTARIO' | 'LEITURAS' | 'FINANCEIRO' | 'LOTES' | 'COLETA' | 'LOCAIS'): void {
    this.activeTab.set(tab);
    if (tab === 'LEITURAS') {
      if (this.gradeLeituras().length === 0) {
        this.carregarGradeLeituras();
      }
      this.carregarLeiturasCompetencia();
    } else if (tab === 'FINANCEIRO') {
      this.inicializarFinanceiroSeNecessario();
    } else if (tab === 'LOTES') {
      if (!this.balancoFranquias()) {
        this.carregarBalancoFranquias();
      }
    } else if (tab === 'COLETA') {
      this.carregarDadosColeta();
    } else if (tab === 'LOCAIS') {
      this.carregarLocais();
    }
  }

  selecionarSubTabFinanceiro(subTab: 'NOTAS_MENSAIS' | 'DEMONSTRATIVO_ANUAL' | 'EMPENHOS'): void { return this.financeiroActions.selecionarSubTabFinanceiro(subTab); }

  inicializarFinanceiroSeNecessario(): void { return this.financeiroActions.inicializarFinanceiroSeNecessario(); }

  // Modal Impressora: Criar / Editar
  openCreateModal(): void {
    this.isEditMode.set(false);
    this.selectedPrinter.set(null);
    this.activeModalStep.set(1);
    this.termoBuscaLocalModal.set('');
    this.secretariaSelecionadaCadastro.set(null);
    this.form.reset({
      fabricante: 'Ricoh',
      tipoImpressao: 'MONO',
      loteId: 1,
      transformador: 'NAO',
      dataInstalacao: getTodayLocalDateString(),
      contadorInicialMono: 0,
      contadorInicialColor: 0,
      secretariaId: '',
      empenhoId: '',
      localInstalacaoId: '',
      modelo: '',
      localInstalacao: '',
      endereco: '',
      responsavel: '',
      ip: '',
      numeroSerie: '',
      itemPedido: ''
    });
    this.isModalOpen.set(true);
  }

  openEditModal(p: Impressora): void {
    this.isEditMode.set(true);
    this.selectedPrinter.set(p);
    this.activeModalStep.set(1);
    this.termoBuscaLocalModal.set('');
    this.secretariaSelecionadaCadastro.set(p.secretariaId || null);

    const localCorrespondente = this.todosLocaisDisponiveis().find(l =>
      l.id === p.localInstalacaoId || (l.secretariaId === p.secretariaId &&
      l.nome.toLowerCase().trim() === (p.localInstalacao || '').toLowerCase().trim())
    );

    this.form.patchValue({
      itemPedido: p.itemPedido,
      numeroSerie: p.numeroSerie,
      fabricante: p.fabricante,
      modelo: p.modelo,
      tipoImpressao: p.tipoImpressao,
      loteId: p.loteId,
      ip: p.ip,
      secretariaId: p.secretariaId,
      empenhoId: p.empenhoId,
      localInstalacaoId: (localCorrespondente && localCorrespondente.id && localCorrespondente.id > 0) ? localCorrespondente.id : '',
      localInstalacao: p.localInstalacao,
      endereco: p.endereco,
      responsavel: p.responsavel,
      transformador: p.transformador,
      dataInstalacao: p.dataInstalacao,
      contadorInicialMono: p.contadorInstalacaoMono || 0,
      contadorInicialColor: p.contadorInstalacaoColor || 0
    });
    this.isModalOpen.set(true);
  }

  closeModal(): void {
    this.isModalOpen.set(false);
    this.selectedPrinter.set(null);
    this.activeModalStep.set(1);
  }

  salvarImpressora(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      // Redireciona para o passo que contém o erro
      if (this.form.get('modelo')?.invalid || this.form.get('fabricante')?.invalid || this.form.get('tipoImpressao')?.invalid) {
        this.activeModalStep.set(1);
        this.toast.error('Preencha os campos obrigatórios do equipamento (Modelo, Fabricante).');
      } else if (this.form.get('secretariaId')?.invalid || this.form.get('localInstalacaoId')?.invalid) {
        this.activeModalStep.set(2);
        this.toast.error('Informe a Secretaria e o Local de Instalação.');
      } else if (this.form.get('loteId')?.invalid || this.form.get('dataInstalacao')?.invalid) {
        this.activeModalStep.set(3);
        this.toast.error('Informe o Lote e a Data de Instalação.');
      } else {
        this.toast.error('Preencha todos os campos obrigatórios.');
      }
      return;
    }

    const payload = { ...this.form.value };
    const original = this.selectedPrinter();
    if (this.isEditMode() && original && (Number(payload.secretariaId) !== original.secretariaId || Number(payload.localInstalacaoId) !== original.localInstalacaoId)) {
      this.activeModalStep.set(2);
      this.toast.error('Para mudar o local, use a ação Remanejar. Ela preserva o histórico da impressora.');
      return;
    }
    if (!payload.localInstalacao && payload.localInstalacaoId) {
      const loc = this.todosLocaisDisponiveis().find(l => String(l.id) === String(payload.localInstalacaoId));
      if (loc) {
        payload.localInstalacao = loc.nome;
        if (!payload.endereco) payload.endereco = loc.endereco;
        if (!payload.responsavel) payload.responsavel = loc.responsavel;
      }
    }

    if (this.isEditMode() && this.selectedPrinter()) {
      this.impressoraService.update(this.selectedPrinter()!.id, payload).pipe(untilComponentDestroyed(this.requestDestroyRef)).subscribe({
        next: () => {
          this.toast.success('Equipamento atualizado com sucesso!');
          this.closeModal();
          this.carregarImpressoras();
          this.carregarLocais();
        },
        error: () => this.toast.error('Erro ao atualizar impressora.')
      });
    } else {
      this.impressoraService.create(payload).pipe(untilComponentDestroyed(this.requestDestroyRef)).subscribe({
        next: () => {
          this.toast.success('Equipamento cadastrado com sucesso!');
          this.closeModal();
          this.carregarImpressoras();
          this.carregarLocais();
        },
        error: () => this.toast.error('Erro ao cadastrar impressora.')
      });
    }
  }

  // Modal Remanejar de Local
  openRemanejarModal(p: Impressora): void {
    this.selectedPrinter.set(p);
    this.termoBuscaLocalRemanejo.set('');
    this.secretariaSelecionadaRemanejo.set(p.secretariaId || null);

    const localCorrespondente = this.todosLocaisDisponiveis().find(l =>
      l.id === p.localInstalacaoId || (l.secretariaId === p.secretariaId &&
      l.nome.toLowerCase().trim() === (p.localInstalacao || '').toLowerCase().trim())
    );

    this.remanejarForm.reset({
      localInstalacaoId: (localCorrespondente && localCorrespondente.id && localCorrespondente.id > 0) ? localCorrespondente.id : '',
      novaSecretariaId: p.secretariaId,
      novoLocalInstalacao: p.localInstalacao,
      novoEndereco: p.endereco,
      novoResponsavel: p.responsavel,
      novoIp: p.ip,
      novoTransformador: p.transformador || 'NAO',
      dataMudanca: getTodayLocalDateString(),
      contadorAtualMono: p.ultimoContadorMono || p.contadorInstalacaoMono || 0,
      contadorAtualColor: p.ultimoContadorColor || p.contadorInstalacaoColor || 0,
      motivo: 'Remanejamento de setor'
    });
    this.isRemanejarModalOpen.set(true);
  }

  closeRemanejarModal(): void {
    this.isRemanejarModalOpen.set(false);
    this.selectedPrinter.set(null);
  }

  salvarRemanejamento(): void {
    if (this.remanejarForm.invalid || !this.selectedPrinter()) {
      this.remanejarForm.markAllAsTouched();
      this.toast.error('Preencha os campos obrigatórios do remanejamento.');
      return;
    }

    const val = { ...this.remanejarForm.value };
    if (!val.novoLocalInstalacao && val.localInstalacaoId) {
      const loc = this.locais().find(l => l.id === Number(val.localInstalacaoId));
      if (loc) {
        val.novoLocalInstalacao = loc.nome;
        if (!val.novoEndereco) val.novoEndereco = loc.endereco;
        if (!val.novoResponsavel) val.novoResponsavel = loc.responsavel;
      }
    }

    this.impressoraService.remanejarLocal(this.selectedPrinter()!.id, val).pipe(untilComponentDestroyed(this.requestDestroyRef)).subscribe({
      next: () => {
        this.toast.success('Impressora remanejada com histórico registrado!');
        this.closeRemanejarModal();
        this.carregarImpressoras();
        this.carregarLocais();
      },
      error: () => this.toast.error('Erro ao remanejar impressora.')
    });
  }

  // Modal Substituir por Defeito (Swap)
  openSubstituirModal(p: Impressora): void {
    this.selectedPrinter.set(p);
    this.substituirForm.reset({
      contadorFinalMonoRetirada: p.ultimoContadorMono || p.contadorInstalacaoMono || 0,
      contadorFinalColorRetirada: p.ultimoContadorColor || p.contadorInstalacaoColor || 0,
      dataSubstituicao: getTodayLocalDateString(),
      motivoDefeito: '',
      novoNumeroSerie: '',
      novoFabricante: p.fabricante,
      novoModelo: p.modelo,
      contadorInicialMonoNova: 0,
      contadorInicialColorNova: 0
    });
    this.isSubstituirModalOpen.set(true);
  }

  closeSubstituirModal(): void {
    this.isSubstituirModalOpen.set(false);
    this.selectedPrinter.set(null);
  }

  salvarSubstituicao(): void {
    if (this.substituirForm.invalid || !this.selectedPrinter()) {
      this.substituirForm.markAllAsTouched();
      this.toast.error('Preencha os dados da substituição técnica.');
      return;
    }

    this.impressoraService.substituirPorDefeito(this.selectedPrinter()!.id, this.substituirForm.value).pipe(untilComponentDestroyed(this.requestDestroyRef)).subscribe({
      next: () => {
        this.toast.success('Equipamento substituído por Swap com sucesso!');
        this.closeSubstituirModal();
        this.carregarImpressoras();
      },
      error: () => this.toast.error('Erro ao processar substituição por defeito.')
    });
  }

  // Modal Lançar Leitura
  openLeituraModal(p?: Impressora): void {
    this.leituraForm.reset({
      impressoraId: p ? p.id : '',
      mesReferencia: this.mesCompetencia(),
      anoReferencia: this.anoCompetencia(),
      dataLeitura: getTodayLocalDateString(),
      leituraMonoAtual: p ? (p.ultimoContadorMono || p.contadorInstalacaoMono || 0) : 0,
      leituraColorAtual: p ? (p.ultimoContadorColor || p.contadorInstalacaoColor || 0) : 0,
      proporcao: 1.0,
      origemLeitura: 'MANUAL',
      observacoes: ''
    });
    this.isLeituraModalOpen.set(true);
  }

  closeLeituraModal(): void {
    this.isLeituraModalOpen.set(false);
  }

  salvarLeitura(): void {
    if (this.leituraForm.invalid) {
      this.leituraForm.markAllAsTouched();
      this.toast.error('Informe a impressora e o contador atual.');
      return;
    }

    this.impressoraService.lancarLeitura(this.leituraForm.value).pipe(untilComponentDestroyed(this.requestDestroyRef)).subscribe({
      next: () => {
        this.toast.success('Leitura apurada e registrada com sucesso!');
        this.closeLeituraModal();
        this.carregarLeiturasCompetencia();
        this.carregarImpressoras();
        if (this.selectedPrinter()) {
          this.carregarHistoricoImpressora(this.selectedPrinter()!.id);
        }
      },
      error: () => this.toast.error('Erro ao salvar medição de contador.')
    });
  }

  // Modal Detalhes & Histórico da Impressora
  openDetailsModal(p: Impressora): void {
    this.selectedPrinter.set(p);
    this.activeDetailsTab.set('GERAL');
    this.isDetailsModalOpen.set(true);
    this.carregarHistoricoImpressora(p.id);
  }

  abrirHistoricoContadores(p: Impressora): void {
    this.selectedPrinter.set(p);
    this.activeDetailsTab.set('LEITURAS');
    this.isDetailsModalOpen.set(true);
    this.carregarHistoricoImpressora(p.id);
  }

  closeDetailsModal(): void {
    this.isDetailsModalOpen.set(false);
    this.selectedPrinter.set(null);
    this.historicoLeiturasImpressora.set([]);
  }

  carregarHistoricoImpressora(id: number): void {
    this.loadingHistorico.set(true);
    this.impressoraService.getLeiturasPorImpressora(id).pipe(untilComponentDestroyed(this.requestDestroyRef)).subscribe({
      next: list => {
        this.historicoLeiturasImpressora.set(list);
        this.loadingHistorico.set(false);
      },
      error: () => {
        this.loadingHistorico.set(false);
      }
    });
  }

  // Modal Exclusão Impressora
  confirmarExclusao(p: Impressora): void {
    this.printerToDelete.set(p);
    this.isDeleteModalOpen.set(true);
  }

  closeDeleteModal(): void {
    this.isDeleteModalOpen.set(false);
    this.printerToDelete.set(null);
  }

  executarExclusao(): void {
    const p = this.printerToDelete();
    if (!p) return;

    this.impressoraService.delete(p.id).pipe(untilComponentDestroyed(this.requestDestroyRef)).subscribe({
      next: () => {
        this.toast.success('Equipamento inativado e recolhido com sucesso.');
        this.closeDeleteModal();
        this.carregarImpressoras();
      },
      error: () => this.toast.error('Erro ao inativar impressora.')
    });
  }

  // ==========================================
  // GESTÃO DE EMPENHOS
  // ==========================================
  openCreateEmpenhoModal(): void { return this.financeiroActions.openCreateEmpenhoModal(); }

  openEditEmpenhoModal(emp: EmpenhoImpressao): void { return this.financeiroActions.openEditEmpenhoModal(emp); }

  closeEmpenhoModal(): void { return this.financeiroActions.closeEmpenhoModal(); }

  salvarEmpenho(): void { return this.financeiroActions.salvarEmpenho(); }

  confirmarExcluirEmpenho(emp: EmpenhoImpressao): void { return this.financeiroActions.confirmarExcluirEmpenho(emp); }

  closeDeleteEmpenhoModal(): void { return this.financeiroActions.closeDeleteEmpenhoModal(); }

  executarExclusaoEmpenho(): void { return this.financeiroActions.executarExclusaoEmpenho(); }

  filtrarPorEmpenhoNoInventario(numeroEmpenho: string): void { return this.financeiroActions.filtrarPorEmpenhoNoInventario(numeroEmpenho); }

  // ==========================================
  // EXPORTAÇÕES CSV
  // ==========================================
  exportarInventarioCSV(): void {
    const list = this.filteredPrinters();
    const columns = [
      { header: 'Item', accessor: (p: Impressora) => p.itemPedido || '' },
      { header: 'Empenho', accessor: (p: Impressora) => p.numeroEmpenho || '' },
      { header: 'Secretaria', accessor: (p: Impressora) => p.secretariaSigla || '' },
      { header: 'Local Instalacao', accessor: (p: Impressora) => p.localInstalacao || '' },
      { header: 'Endereco', accessor: (p: Impressora) => p.endereco || '' },
      { header: 'Fabricante', accessor: (p: Impressora) => p.fabricante || '' },
      { header: 'Modelo', accessor: (p: Impressora) => p.modelo || '' },
      { header: 'Numero Serie', accessor: (p: Impressora) => p.numeroSerie || '' },
      { header: 'Tipo', accessor: (p: Impressora) => p.tipoImpressao || '' },
      { header: 'Lote', accessor: (p: Impressora) => p.numeroLote ? 'Lote ' + p.numeroLote : '' },
      { header: 'IP', accessor: (p: Impressora) => p.ip || '' },
      { header: 'Transformador', accessor: (p: Impressora) => p.transformador || 'NAO' },
      { header: 'Ultimo Contador', accessor: (p: Impressora) => (p.ultimoContadorMono || 0).toLocaleString('pt-BR') },
      { header: 'Status', accessor: (p: Impressora) => p.statusInstalacao || 'ATIVA' }
    ];
    exportToCsv('inventario_impressoras_' + getTodayLocalDateString(), columns, list);
    this.toast.success('Inventário exportado em .CSV com sucesso!');
  }

  exportarMedicaoCSV(): void { return this.leiturasActions.exportarMedicaoCSV(); }

  exportarHistoricoImpressoraCSV(): void {
    const p = this.selectedPrinter();
    if (!p) return;
    const list = this.historicoLeiturasImpressora();
    const columns = [
      { header: 'Competencia Mes', accessor: (l: LeituraContador) => l.mesReferencia },
      { header: 'Competencia Ano', accessor: (l: LeituraContador) => l.anoReferencia },
      { header: 'Data Leitura', accessor: (l: LeituraContador) => l.dataLeitura },
      { header: 'Contador Inicial', accessor: (l: LeituraContador) => (l.leituraMonoAnterior || 0).toLocaleString('pt-BR') },
      { header: 'Contador Final', accessor: (l: LeituraContador) => (l.leituraMonoAtual || 0).toLocaleString('pt-BR') },
      { header: 'Copias Realizadas', accessor: (l: LeituraContador) => (l.copiasMono || 0).toLocaleString('pt-BR') },
      { header: 'Franquia', accessor: (l: LeituraContador) => (l.franquiaMonoAplicada || 0).toLocaleString('pt-BR') },
      { header: 'Excedente', accessor: (l: LeituraContador) => (l.excedenteMono || 0).toLocaleString('pt-BR') },
      { header: 'Valor Total R$', accessor: (l: LeituraContador) => (l.valorTotal || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }
    ];
    exportToCsv('historico_contadores_item_' + (p.itemPedido || p.id), columns, list);
    this.toast.success('Histórico de contadores exportado em .CSV com sucesso!');
  }

  exportarEmpenhosCSV(): void { return this.financeiroActions.exportarEmpenhosCSV(); }

  // ==========================================
  // GESTÃO ORÇAMENTÁRIA & MATRIZ MENSAL
  // ==========================================
  carregarExecucaoMensal(ano: number = this.anoExecucao()): void { return this.financeiroActions.carregarExecucaoMensal(ano); }

  carregarBalancoFranquias(mes: number = this.mesBalanco(), ano: number = this.anoBalanco()): void { return this.financeiroActions.carregarBalancoFranquias(mes, ano); }

  imprimirEspelho(): void { return this.financeiroActions.imprimirEspelho(); }

  exportarEspelhoCSV(): void { return this.financeiroActions.exportarEspelhoCSV(); }

  exportarMatrizExecucaoCSV(): void { return this.financeiroActions.exportarMatrizExecucaoCSV(); }

  exportarBalancoFranquiasCSV(): void { return this.financeiroActions.exportarBalancoFranquiasCSV(); }

  // ==========================================
  // MÓDULO FINANCEIRO & NOTAS FISCAIS
  // ==========================================
  readonly mesesLista = [
    { num: 1, sigla: 'Jan', nome: 'Janeiro' },
    { num: 2, sigla: 'Fev', nome: 'Fevereiro' },
    { num: 3, sigla: 'Mar', nome: 'Março' },
    { num: 4, sigla: 'Abr', nome: 'Abril' },
    { num: 5, sigla: 'Mai', nome: 'Maio' },
    { num: 6, sigla: 'Jun', nome: 'Junho' },
    { num: 7, sigla: 'Jul', nome: 'Julho' },
    { num: 8, sigla: 'Ago', nome: 'Agosto' },
    { num: 9, sigla: 'Set', nome: 'Setembro' },
    { num: 10, sigla: 'Out', nome: 'Outubro' },
    { num: 11, sigla: 'Nov', nome: 'Novembro' },
    { num: 12, sigla: 'Dez', nome: 'Dezembro' }
  ];

  isMesSelecionado(mes: number): boolean { return this.financeiroActions.isMesSelecionado(mes); }

  selecionarMes(mes: number): void { return this.financeiroActions.selecionarMes(mes); }

  selecionarTodosMeses(): void { return this.financeiroActions.selecionarTodosMeses(); }

  selecionarMesesFaturados(): void { return this.financeiroActions.selecionarMesesFaturados(); }

  alternarModoMultiplosMeses(): void { return this.financeiroActions.alternarModoMultiplosMeses(); }

  selecionarFiltroEmpenho(empId: number | null): void { return this.financeiroActions.selecionarFiltroEmpenho(empId); }

  carregarNotasFiscaisLote(): void { return this.financeiroActions.carregarNotasFiscaisLote(); }

  carregarNotasFiscaisConsolidado(ano: number = this.anoFinanceiro()): void { return this.financeiroActions.carregarNotasFiscaisConsolidado(ano); }

  getIsolatedPrintStyles(landscape: boolean): string { return this.financeiroActions.getIsolatedPrintStyles(landscape); }

  imprimirConteudoIsolado(htmlContent: string, title: string = 'Documento', landscape: boolean = false): void { return this.financeiroActions.imprimirConteudoIsolado(htmlContent, title, landscape); }

  imprimirNotasFiscaisLote(): void { return this.financeiroActions.imprimirNotasFiscaisLote(); }

  imprimirNotaIndividual(numeroEmpenho: string, chave?: string): void { return this.financeiroActions.imprimirNotaIndividual(numeroEmpenho, chave); }

  // Métricas computadas do lote de notas fiscais
  totalFaturadoSelecionado = computed(() => {
    return this.notasFiscaisLote().reduce((acc, f) => acc + (f.totalFatura || 0), 0);
  });

  totalCopiasMonoSelecionadas = computed(() => {
    return this.notasFiscaisLote().reduce((acc, f) => {
      return acc + (f.equipamentos?.reduce((s, e) => s + (e.copiasMono || 0), 0) || 0);
    }, 0);
  });

  totalCopiasColorSelecionadas = computed(() => {
    return this.notasFiscaisLote().reduce((acc, f) => {
      return acc + (f.equipamentos?.reduce((s, e) => s + (e.copiasColor || 0), 0) || 0);
    }, 0);
  });

  totalExcedenteMonoSelecionado = computed(() => {
    return this.notasFiscaisLote().reduce((acc, f) => {
      return acc + (f.equipamentos?.reduce((s, e) => s + (e.excedenteMono || 0), 0) || 0);
    }, 0);
  });

  totalExcedenteColorSelecionado = computed(() => {
    return this.notasFiscaisLote().reduce((acc, f) => {
      return acc + (f.equipamentos?.reduce((s, e) => s + (e.excedenteColor || 0), 0) || 0);
    }, 0);
  });

  quantidadeNotasGeradas = computed(() => this.notasFiscaisLote().length);

  selecionarEmpenhoParaEspelho(empId: number): void { return this.financeiroActions.selecionarEmpenhoParaEspelho(empId); }

  exportarNotasFiscaisConsolidadoCSV(): void { return this.financeiroActions.exportarNotasFiscaisConsolidadoCSV(); }

  exportarNotasFiscaisLoteCSV(): void { return this.financeiroActions.exportarNotasFiscaisLoteCSV(); }

  somarMesesItem(it: ItemNotaFiscal): number { return this.financeiroActions.somarMesesItem(it); }

  // ==================== METODOS DA COLETA AUTOMATICA ====================

  ngOnDestroy(): void {
    document.removeEventListener('scroll', this.dismissPrinterMenuOnScroll, true);
    this.pararPollingColeta();
  }

  carregarDadosColeta(): void { return this.coletaActions.carregarDadosColeta(); }

  verificarColetaAtivaOuUltima(): void { return this.coletaActions.verificarColetaAtivaOuUltima(); }

  carregarUltimaSessaoColeta(): void { return this.coletaActions.carregarUltimaSessaoColeta(); }

  onSecretariaFiltroColetaChange(val: any): void { return this.coletaActions.onSecretariaFiltroColetaChange(val); }

  onFiltroSecretariaModalChange(val: any): void { return this.coletaActions.onFiltroSecretariaModalChange(val); }

  abrirModalSelecaoImpressoras(): void { return this.coletaActions.abrirModalSelecaoImpressoras(); }

  fecharModalSelecaoImpressoras(): void { return this.coletaActions.fecharModalSelecaoImpressoras(); }

  confirmarSelecaoImpressorasColeta(): void { return this.coletaActions.confirmarSelecaoImpressorasColeta(); }

  isImpressoraSelecionadaColeta(id: number): boolean { return this.coletaActions.isImpressoraSelecionadaColeta(id); }

  alternarSelecaoImpressoraColeta(id: number): void { return this.coletaActions.alternarSelecaoImpressoraColeta(id); }

  selecionarTodasImpressorasColeta(): void { return this.coletaActions.selecionarTodasImpressorasColeta(); }

  desmarcarTodasImpressorasColeta(): void { return this.coletaActions.desmarcarTodasImpressorasColeta(); }

  selecionarApenasComIpColeta(): void { return this.coletaActions.selecionarApenasComIpColeta(); }

  marcarFiltradasModalColeta(): void { return this.coletaActions.marcarFiltradasModalColeta(); }

  desmarcarFiltradasModalColeta(): void { return this.coletaActions.desmarcarFiltradasModalColeta(); }

  alternarSelecaoFiltradasModalColeta(): void { return this.coletaActions.alternarSelecaoFiltradasModalColeta(); }

  iniciarColetaAutomatica(): void { return this.coletaActions.iniciarColetaAutomatica(); }

  iniciarPollingColeta(): void { return this.coletaActions.iniciarPollingColeta(); }

  pararPollingColeta(): void { return this.coletaActions.pararPollingColeta(); }

  carregarSessaoColeta(id: number, showLoading = true): void { return this.coletaActions.carregarSessaoColeta(id, showLoading); }

  baixarZipColeta(): void { return this.coletaActions.baixarZipColeta(); }

  aplicarLeiturasColeta(): void { return this.coletaActions.aplicarLeiturasColeta(); }

  recoletarItem(item: ColetaItem): void { return this.coletaActions.recoletarItem(item); }

  recoletarTodasFalhas(): void { return this.coletaActions.recoletarTodasFalhas(); }

  printZoomLevel = signal<number>(1);
  printRotation = signal<number>(0);
  printFitMode = signal<'fit' | 'original'>('fit');
  printImgDimensions = signal<{ width: number; height: number } | null>(null);

  abrirModalPrint(item: ColetaItem): void { return this.comprovanteActions.abrirModalPrint(item); }

  fecharModalPrint(): void { return this.comprovanteActions.fecharModalPrint(); }

  onPrintImageLoaded(event: Event): void { return this.comprovanteActions.onPrintImageLoaded(event); }

  toggleFitMode(): void { return this.comprovanteActions.toggleFitMode(); }

  zoomInPrint(): void { return this.comprovanteActions.zoomInPrint(); }

  zoomOutPrint(): void { return this.comprovanteActions.zoomOutPrint(); }

  resetZoomPrint(): void { return this.comprovanteActions.resetZoomPrint(); }

  onPrintWheel(event: WheelEvent): void { return this.comprovanteActions.onPrintWheel(event); }

  rotatePrint(): void { return this.comprovanteActions.rotatePrint(); }

  downloadPrintImage(item: ColetaItem): void { return this.comprovanteActions.downloadPrintImage(item); }

  getUrlImagemColeta(item: ColetaItem): string { return this.comprovanteActions.getUrlImagemColeta(item); }
  private readonly comprovanteActions = new ComprovanteImpressorasActions(this);

  private readonly coletaActions = new ColetaImpressorasActions(this);

  private readonly leiturasActions = new LeiturasImpressorasActions(this);

  private readonly financeiroActions = new FinanceiroImpressorasActions(this);

}
