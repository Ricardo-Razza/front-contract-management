import { SeletorLocalComponent } from './seletor-local.component';
import { HistoricoInstalacoesComponent } from './historico-instalacoes.component';
import { Component, OnInit, OnDestroy, HostListener, inject, signal, computed } from '@angular/core';
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
  imports: [
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
  styleUrls: ['./impressoras.component.scss']
})
export class ImpressorasComponent implements OnInit, OnDestroy {
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

  getSecretariaNome(id: number): string {
    const sec = this.secretariats().find(s => s.id === id);
    return sec ? (sec.sigla || sec.nome) : '';
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
    this.closePrinterMenu();
    if (event) {
      const target = event.target as HTMLElement;
      if (!target.closest('.custom-multiselect')) {
        this.showSecretariaDropdown.set(false);
        this.showSecretariaDropdownLeituras.set(false);
        this.showSecretariaDropdownLocais.set(false);
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
    this.showSecretariaDropdown.set(false);
    this.showSecretariaDropdownLeituras.set(false);
    this.showSecretariaDropdownLocais.set(false);
  }

  @HostListener('window:resize')
  onPrinterMenuResize(): void {
    this.closePrinterMenu();
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
    }
  }

  closePrinterMenu(): void {
    this.activePrinterMenuId.set(null);
    this.selectedPrinterForMenu.set(null);
  }

  toggleInvoice(numeroEmpenho: string): void {
    this.expandedInvoices.update(set => {
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
    return this.expandedInvoices().has(numeroEmpenho);
  }

  expandAllInvoices(): void {
    const all = new Set(this.notasFiscaisLote().map(f => f.numeroEmpenho));
    this.expandedInvoices.set(all);
  }

  collapseAllInvoices(): void {
    this.expandedInvoices.set(new Set<string>());
  }

  calcularPercentualEmpenho(emp: EmpenhoImpressao): number {
    if (!emp.valorTotal || emp.valorTotal <= 0) return 0;
    const consumido = emp.valorTotal - (emp.saldo || 0);
    return Math.min(100, Math.max(0, Math.round((consumido / emp.valorTotal) * 100)));
  }

  // Módulo Financeiro & Notas Fiscais Unificado
  subTabFinanceiro = signal<'NOTAS_MENSAIS' | 'DEMONSTRATIVO_ANUAL' | 'EMPENHOS'>('NOTAS_MENSAIS');
  anoFinanceiro = signal<number>(2026);
  mesesSelecionados = signal<number[]>([8]); // Padrão: Agosto (último mês faturado)
  modoMultiplosMeses = signal<boolean>(false);
  empenhoFiltroNotas = signal<number | null>(null); // null = Todos os 8 empenhos
  incluirMedicaoImpressao = signal<boolean>(false); // Opcional: omitir ou incluir detalhamento de medições por máquina na impressão

  alternarMedicaoImpressao(): void {
    this.incluirMedicaoImpressao.update(v => !v);
  }

  notasFiscaisLote = signal<EspelhoFatura[]>([]);
  loadingNotasLote = signal<boolean>(false);
  notasFiscaisConsolidado = signal<NotasFiscaisConsolidado | null>(null);
  loadingNotasConsolidado = signal<boolean>(false);

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

  filteredSecretariasForLeituras = computed(() => {
    const search = this.secretariaFilterSearchLeituras().trim();
    const list = this.secretariats();
    if (!search) return list;
    return list.filter(sec => matchesSearch([sec.sigla, sec.nome], search));
  });

  toggleSecretariaDropdownLeituras(): void {
    this.showSecretariaDropdownLeituras.update(v => !v);
    if (this.showSecretariaDropdownLeituras()) {
      this.secretariaFilterSearchLeituras.set('');
    }
  }

  toggleSecretariaFilterLeituras(id: number): void {
    this.filtroSecretariasLeituras.update(ids => {
      const exists = ids.includes(id);
      return exists ? ids.filter(i => i !== id) : [...ids, id];
    });
  }

  isSecretariaFilterSelectedLeituras(id: number): boolean {
    return this.filtroSecretariasLeituras().includes(id);
  }

  selectAllSecretariasFilterLeituras(): void {
    this.filtroSecretariasLeituras.set(this.secretariats().map(s => s.id));
  }

  clearSecretariaFilterLeituras(): void {
    this.filtroSecretariasLeituras.set([]);
  }

  removeSecretariaFilterLeituras(id: number): void {
    this.filtroSecretariasLeituras.update(ids => ids.filter(i => i !== id));
  }

  // Paginação da tabela de inventário
  paginaLocais = signal(1);
  tamanhoLocais = signal(5);
  paginaAtualLocais = computed(() => Math.min(this.paginaLocais(), Math.max(1, Math.ceil(this.filteredLocais().length / this.tamanhoLocais()))));
  paginadosLocais = computed(() => this.filteredLocais().slice((this.paginaAtualLocais() - 1) * this.tamanhoLocais(), this.paginaAtualLocais() * this.tamanhoLocais()));

  paginaLeituras = signal(1);
  tamanhoLeituras = signal(5);
  paginaAtualLeituras = computed(() => Math.min(this.paginaLeituras(), Math.max(1, Math.ceil(this.filteredLeituras().length / this.tamanhoLeituras()))));
  paginadosLeituras = computed(() => this.filteredLeituras().slice((this.paginaAtualLeituras() - 1) * this.tamanhoLeituras(), this.paginaAtualLeituras() * this.tamanhoLeituras()));

  paginaEmpenhos = signal(1);
  tamanhoEmpenhos = signal(5);
  paginaAtualEmpenhos = computed(() => Math.min(this.paginaEmpenhos(), Math.max(1, Math.ceil(this.empenhos().length / this.tamanhoEmpenhos()))));
  paginadosEmpenhos = computed(() => this.empenhos().slice((this.paginaAtualEmpenhos() - 1) * this.tamanhoEmpenhos(), this.paginaAtualEmpenhos() * this.tamanhoEmpenhos()));

  paginaColeta = signal(1);
  tamanhoColeta = signal(5);
  paginaAtualColeta = computed(() => Math.min(this.paginaColeta(), Math.max(1, Math.ceil(this.itensColetaFiltrados().length / this.tamanhoColeta()))));
  paginadosColeta = computed(() => this.itensColetaFiltrados().slice((this.paginaAtualColeta() - 1) * this.tamanhoColeta(), this.paginaAtualColeta() * this.tamanhoColeta()));

  paginaGrupos = signal(1);
  tamanhoGrupos = signal(5);
  paginaAtualGrupos = computed(() => Math.min(this.paginaGrupos(), Math.max(1, Math.ceil(this.printersGroupedBySecretaria().length / this.tamanhoGrupos()))));
  paginadosGrupos = computed(() => this.printersGroupedBySecretaria().slice((this.paginaAtualGrupos() - 1) * this.tamanhoGrupos(), this.paginaAtualGrupos() * this.tamanhoGrupos()));

  paginaContadores = signal(1);
  tamanhoContadores = signal(5);
  paginaAtualContadores = computed(() => Math.min(this.paginaContadores(), Math.max(1, Math.ceil(this.historicoLeiturasImpressora().length / this.tamanhoContadores()))));
  paginadosContadores = computed(() => this.historicoLeiturasImpressora().slice((this.paginaAtualContadores() - 1) * this.tamanhoContadores(), this.paginaAtualContadores() * this.tamanhoContadores()));

  paginasGrupo = signal<Record<string, number>>({});
  tamanhosGrupo = signal<Record<string, number>>({});
  paginaGrupo(sigla: string, total: number): number {
    return Math.min(this.paginasGrupo()[sigla] || 1, Math.max(1, Math.ceil(total / (this.tamanhosGrupo()[sigla] || 5))));
  }
  impressorasDoGrupo(sigla: string, impressoras: Impressora[]): Impressora[] {
    const size = this.tamanhosGrupo()[sigla] || 5;
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
  tamanhoLotes = signal(5);
  paginaAtualLotes = computed(() => Math.min(this.paginaLotes(), Math.max(1, Math.ceil(this.lotes().length / this.tamanhoLotes()))));
  lotesVisiveis = computed(() => this.lotes().slice((this.paginaAtualLotes() - 1) * this.tamanhoLotes(), this.paginaAtualLotes() * this.tamanhoLotes()));
  currentPage = signal<number>(1);
  pageSize = signal<number>(5);

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
  filtroStatusColeta = signal<'TODOS' | 'SUCESSO' | 'OFFLINE' | 'ERRO'>('TODOS');
  termoBuscaColeta = signal<string>('');

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

  // Filtragem de Leituras da Competência
  filteredLeituras = computed(() => {
    let list = this.leituras();
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
            (l.impressoraIp && l.impressoraIp.toLowerCase() === search) ||
            (l.impressoraModelo && l.impressoraModelo.toLowerCase().includes(search))
          );
        }
      } else {
        const search = rawSearch.toLowerCase();
        list = list.filter(l =>
          (l.impressoraModelo && l.impressoraModelo.toLowerCase().includes(search)) ||
          (l.localInstalacao && l.localInstalacao.toLowerCase().includes(search)) ||
          (l.impressoraIp && l.impressoraIp.toLowerCase().includes(search)) ||
          (l.secretariaSigla && l.secretariaSigla.toLowerCase().includes(search))
        );
      }
    }

    if (this.filtroSecretariasLeituras().length > 0) {
      const selected = this.filtroSecretariasLeituras();
      list = list.filter(l => {
        return selected.some(id => {
          const sec = this.secretariats().find(s => s.id === id);
          return sec && (l.secretariaSigla === sec.sigla || l.secretariaSigla === sec.nome);
        });
      });
    } else if (this.filtroSecretariaLeituras()) {
      list = list.filter(l => l.secretariaSigla === this.filtroSecretariaLeituras());
    }

    return list;
  });

  // Métricas do Faturamento Mensal das Leituras
  totalCopiasMonoMes = computed(() => this.leituras().reduce((sum, l) => sum + (l.copiasMono || 0), 0));
  totalCopiasColorMes = computed(() => this.leituras().reduce((sum, l) => sum + (l.copiasColor || 0), 0));
  totalExcedenteMes = computed(() => this.leituras().reduce((sum, l) => sum + (l.excedenteMono || 0) + (l.excedenteColor || 0), 0));
  totalValorFaturaMes = computed(() => this.leituras().reduce((sum, l) => sum + (l.valorTotal || 0), 0));

  // Métricas Computadas dos Empenhos
  totalEmpenhadoGeral = computed(() => this.empenhos().reduce((sum, e) => sum + (e.valorTotal || 0), 0));
  totalSaldoEmpenhos = computed(() => this.empenhos().reduce((sum, e) => sum + (e.saldo || 0), 0));
  totalMaquinasEmpenhadas = computed(() => this.empenhos().reduce((sum, e) => sum + (e.quantidadeImpressoras || 0), 0));

  // Métricas e Filtragem da Coleta Automática
  itensColetaFiltrados = computed(() => {
    const sessao = this.coletaSessao();
    if (!sessao || !sessao.itens) return [];
    let list = sessao.itens;

    const statusFiltro = this.filtroStatusColeta();
    if (statusFiltro !== 'TODOS') {
      list = list.filter(i => i.status === statusFiltro);
    }

    const search = this.termoBuscaColeta().toLowerCase().trim();
    if (search) {
      list = list.filter(i =>
        (i.modelo && i.modelo.toLowerCase().includes(search)) ||
        (i.ip && i.ip.toLowerCase().includes(search)) ||
        (i.localInstalacao && i.localInstalacao.toLowerCase().includes(search)) ||
        (i.secretariaSigla && i.secretariaSigla.toLowerCase().includes(search)) ||
        (i.itemPedido && i.itemPedido.toString().includes(search))
      );
    }

    return list;
  });

  totalItensColetaSucesso = computed(() => {
    const s = this.coletaSessao();
    return s?.itens?.filter(i => i.status === 'SUCESSO').length || 0;
  });

  totalItensColetaOffline = computed(() => {
    const s = this.coletaSessao();
    return s?.itens?.filter(i => i.status === 'OFFLINE').length || 0;
  });

  totalItensColetaErro = computed(() => {
    const s = this.coletaSessao();
    return s?.itens?.filter(i => i.status === 'ERRO').length || 0;
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
    document.addEventListener('scroll', this.dismissPrinterMenuOnScroll, true);
    this.carregarDados();
  }

  carregarDados(): void {
    this.loading.set(true);

    this.impressoraService.getLotes().subscribe({
      next: lotes => this.lotes.set(lotes),
      error: () => this.toast.error('Erro ao carregar lotes de impressão.')
    });

    this.secretariaService.getAll().subscribe({
      next: secs => this.secretariats.set(secs),
      error: () => this.toast.error('Erro ao carregar secretarias.')
    });

    this.carregarEmpenhos();
    this.carregarImpressoras();
    this.carregarLocais();
  }

  carregarEmpenhos(): void {
    this.impressoraService.getEmpenhos().subscribe({
      next: emp => this.empenhos.set(emp),
      error: () => {}
    });
  }

  carregarImpressoras(): void {
    this.loading.set(true);
    this.inventoryError.set(false);
    this.impressoraService.getAll().subscribe({
      next: list => {
        this.printers.set(list);
        this.loading.set(false);
      },
      error: () => {
        this.toast.error('Erro ao conectar com o serviço de impressoras.');
        this.inventoryError.set(true);
        this.loading.set(false);
      }
    });
  }

  carregarLocais(): void {
    this.loadingLocais.set(true);
    this.localInstalacaoService.getAll().subscribe({
      next: data => {
        this.locais.set(data);
        this.loadingLocais.set(false);
      },
      error: () => {
        this.loadingLocais.set(false);
        this.toast.error('Erro ao carregar locais de instalação.');
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
      this.localInstalacaoService.update(editing.id, val).subscribe({
        next: () => {
          this.toast.success('Local de instalação atualizado com sucesso!');
          this.fecharModalLocal();
          this.carregarLocais();
        },
        error: () => this.toast.error('Erro ao atualizar local de instalação.')
      });
    } else {
      this.localInstalacaoService.create(val).subscribe({
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
    this.localInstalacaoService.delete(id).subscribe({
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

  carregarLeiturasCompetencia(): void {
    this.impressoraService.getLeituras(this.mesCompetencia(), this.anoCompetencia()).subscribe({
      next: list => this.leituras.set(list),
      error: () => this.toast.error('Erro ao carregar leituras da competência.')
    });
  }

  trocarAba(tab: 'INVENTARIO' | 'LEITURAS' | 'FINANCEIRO' | 'LOTES' | 'COLETA' | 'LOCAIS'): void {
    this.activeTab.set(tab);
    if (tab === 'LEITURAS' && this.leituras().length === 0) {
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

  selecionarSubTabFinanceiro(subTab: 'NOTAS_MENSAIS' | 'DEMONSTRATIVO_ANUAL' | 'EMPENHOS'): void {
    this.subTabFinanceiro.set(subTab);
    this.inicializarFinanceiroSeNecessario();
  }

  inicializarFinanceiroSeNecessario(): void {
    const sub = this.subTabFinanceiro();
    if (sub === 'NOTAS_MENSAIS') {
      if (this.notasFiscaisLote().length === 0) {
        this.carregarNotasFiscaisLote();
      }
    } else if (sub === 'DEMONSTRATIVO_ANUAL') {
      if (!this.notasFiscaisConsolidado()) {
        this.carregarNotasFiscaisConsolidado();
      }
    } else if (sub === 'EMPENHOS') {
      if (!this.execucaoMensal()) {
        this.carregarExecucaoMensal();
      }
    }
  }

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
      this.impressoraService.update(this.selectedPrinter()!.id, payload).subscribe({
        next: () => {
          this.toast.success('Equipamento atualizado com sucesso!');
          this.closeModal();
          this.carregarImpressoras();
          this.carregarLocais();
        },
        error: () => this.toast.error('Erro ao atualizar impressora.')
      });
    } else {
      this.impressoraService.create(payload).subscribe({
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

    this.impressoraService.remanejarLocal(this.selectedPrinter()!.id, val).subscribe({
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

    this.impressoraService.substituirPorDefeito(this.selectedPrinter()!.id, this.substituirForm.value).subscribe({
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

    this.impressoraService.lancarLeitura(this.leituraForm.value).subscribe({
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
    this.impressoraService.getLeiturasPorImpressora(id).subscribe({
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

    this.impressoraService.delete(p.id).subscribe({
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
  openCreateEmpenhoModal(): void {
    this.isEmpenhoEditMode.set(false);
    this.selectedEmpenho.set(null);
    this.empenhoForm.reset({
      numeroEmpenho: '',
      ano: new Date().getFullYear(),
      secretariaId: '',
      descricao: '',
      valorTotal: 0,
      saldo: 0
    });
    this.isEmpenhoModalOpen.set(true);
  }

  openEditEmpenhoModal(emp: EmpenhoImpressao): void {
    this.isEmpenhoEditMode.set(true);
    this.selectedEmpenho.set(emp);
    this.empenhoForm.patchValue({
      numeroEmpenho: emp.numeroEmpenho,
      ano: emp.ano,
      secretariaId: emp.secretariaId,
      descricao: emp.descricao || '',
      valorTotal: emp.valorTotal,
      saldo: emp.saldo
    });
    this.isEmpenhoModalOpen.set(true);
  }

  closeEmpenhoModal(): void {
    this.isEmpenhoModalOpen.set(false);
    this.selectedEmpenho.set(null);
  }

  salvarEmpenho(): void {
    if (this.empenhoForm.invalid) {
      this.empenhoForm.markAllAsTouched();
      this.toast.error('Preencha os dados do empenho.');
      return;
    }

    const payload: EmpenhoDTO = this.empenhoForm.value;

    if (this.isEmpenhoEditMode() && this.selectedEmpenho()) {
      this.impressoraService.updateEmpenho(this.selectedEmpenho()!.id, payload).subscribe({
        next: () => {
          this.toast.success('Empenho atualizado com sucesso!');
          this.closeEmpenhoModal();
          this.carregarEmpenhos();
        },
        error: () => this.toast.error('Erro ao atualizar empenho.')
      });
    } else {
      this.impressoraService.createEmpenho(payload).subscribe({
        next: () => {
          this.toast.success('Empenho cadastrado com sucesso!');
          this.closeEmpenhoModal();
          this.carregarEmpenhos();
        },
        error: () => this.toast.error('Erro ao cadastrar empenho.')
      });
    }
  }

  confirmarExcluirEmpenho(emp: EmpenhoImpressao): void {
    this.empenhoToDelete.set(emp);
    this.isDeleteEmpenhoModalOpen.set(true);
  }

  closeDeleteEmpenhoModal(): void {
    this.isDeleteEmpenhoModalOpen.set(false);
    this.empenhoToDelete.set(null);
  }

  executarExclusaoEmpenho(): void {
    const emp = this.empenhoToDelete();
    if (!emp) return;

    this.impressoraService.deleteEmpenho(emp.id).subscribe({
      next: () => {
        this.toast.success('Empenho inativado com sucesso.');
        this.closeDeleteEmpenhoModal();
        this.carregarEmpenhos();
      },
      error: () => this.toast.error('Erro ao inativar empenho.')
    });
  }

  filtrarPorEmpenhoNoInventario(numeroEmpenho: string): void {
    this.filterEmpenho.set(numeroEmpenho);
    this.activeTab.set('INVENTARIO');
  }

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

  exportarMedicaoCSV(): void {
    const list = this.filteredLeituras();
    const columns = [
      { header: 'Item', accessor: (l: LeituraContador) => l.itemPedido || '' },
      { header: 'Secretaria', accessor: (l: LeituraContador) => l.secretariaSigla || '' },
      { header: 'Local Instalacao', accessor: (l: LeituraContador) => l.localInstalacao || '' },
      { header: 'Modelo', accessor: (l: LeituraContador) => l.impressoraModelo || '' },
      { header: 'IP', accessor: (l: LeituraContador) => l.impressoraIp || '' },
      { header: 'Leitura Anterior', accessor: (l: LeituraContador) => (l.leituraMonoAnterior || 0).toLocaleString('pt-BR') },
      { header: 'Leitura Atual', accessor: (l: LeituraContador) => (l.leituraMonoAtual || 0).toLocaleString('pt-BR') },
      { header: 'Copias Mono', accessor: (l: LeituraContador) => (l.copiasMono || 0).toLocaleString('pt-BR') },
      { header: 'Franquia Aplicada', accessor: (l: LeituraContador) => (l.franquiaMonoAplicada || 0).toLocaleString('pt-BR') },
      { header: 'Excedente Mono', accessor: (l: LeituraContador) => (l.excedenteMono || 0).toLocaleString('pt-BR') },
      { header: 'Valor Locacao', accessor: (l: LeituraContador) => (l.valorLocacao || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) },
      { header: 'Valor Excedente', accessor: (l: LeituraContador) => (l.valorExcedenteMono || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) },
      { header: 'Total a Pagar', accessor: (l: LeituraContador) => (l.valorTotal || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }
    ];
    exportToCsv('medicao_impressoras_' + this.mesCompetencia() + '_' + this.anoCompetencia(), columns, list);
    this.toast.success('Medição mensal exportada em .CSV com sucesso!');
  }

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

  exportarEmpenhosCSV(): void {
    const list = this.empenhos();
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

  // ==========================================
  // GESTÃO ORÇAMENTÁRIA & MATRIZ MENSAL
  // ==========================================
  carregarExecucaoMensal(ano: number = this.anoExecucao()): void {
    this.loadingExecucao.set(true);
    this.anoExecucao.set(ano);
    this.impressoraService.getExecucaoMensal(ano).subscribe({
      next: data => {
        this.execucaoMensal.set(data);
        this.loadingExecucao.set(false);
      },
      error: () => {
        this.toast.error('Erro ao carregar matriz de execução orçamentária.');
        this.loadingExecucao.set(false);
      }
    });
  }


  carregarBalancoFranquias(mes: number = this.mesBalanco(), ano: number = this.anoBalanco()): void {
    this.loadingBalanco.set(true);
    this.mesBalanco.set(mes);
    this.anoBalanco.set(ano);

    this.impressoraService.getBalancoFranquias(mes, ano).subscribe({
      next: balanco => {
        this.balancoFranquias.set(balanco);
        this.loadingBalanco.set(false);
      },
      error: () => {
        this.toast.error('Erro ao carregar balanço de franquias por lote.');
        this.loadingBalanco.set(false);
      }
    });
  }

  imprimirEspelho(): void {
    window.print();
  }

  exportarEspelhoCSV(): void {
    const fatura = this.espelhoFatura();
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
    const exec = this.execucaoMensal();
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
    const balanco = this.balancoFranquias();
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

  isMesSelecionado(mes: number): boolean {
    return this.mesesSelecionados().includes(mes);
  }

  selecionarMes(mes: number): void {
    if (this.modoMultiplosMeses()) {
      const atuais = this.mesesSelecionados();
      if (atuais.includes(mes)) {
        if (atuais.length > 1) {
          this.mesesSelecionados.set(atuais.filter(m => m !== mes));
        }
      } else {
        this.mesesSelecionados.set([...atuais, mes].sort((a, b) => a - b));
      }
    } else {
      this.mesesSelecionados.set([mes]);
    }
    this.carregarNotasFiscaisLote();
  }

  selecionarTodosMeses(): void {
    this.mesesSelecionados.set([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]);
    this.carregarNotasFiscaisLote();
  }

  selecionarMesesFaturados(): void {
    this.mesesSelecionados.set([1, 2, 3, 4, 5, 6, 7, 8]);
    this.carregarNotasFiscaisLote();
  }

  alternarModoMultiplosMeses(): void {
    this.modoMultiplosMeses.update(v => !v);
  }

  selecionarFiltroEmpenho(empId: number | null): void {
    this.empenhoFiltroNotas.set(empId);
    this.carregarNotasFiscaisLote();
  }

  carregarNotasFiscaisLote(): void {
    this.loadingNotasLote.set(true);
    const meses = this.mesesSelecionados();
    const ano = this.anoFinanceiro();
    const empId = this.empenhoFiltroNotas() || undefined;

    this.impressoraService.getNotasFiscaisLote(meses, undefined, ano, empId).subscribe({
      next: faturas => {
        this.notasFiscaisLote.set(faturas);
        this.loadingNotasLote.set(false);
      },
      error: () => {
        this.toast.error('Erro ao gerar faturas dos empenhos.');
        this.loadingNotasLote.set(false);
      }
    });
  }

  carregarNotasFiscaisConsolidado(ano: number = this.anoFinanceiro()): void {
    this.loadingNotasConsolidado.set(true);
    this.anoFinanceiro.set(ano);
    this.impressoraService.getNotasFiscaisConsolidado(ano).subscribe({
      next: data => {
        this.notasFiscaisConsolidado.set(data);
        this.loadingNotasConsolidado.set(false);
      },
      error: () => {
        this.toast.error('Erro ao carregar demonstrativo anual consolidado.');
        this.loadingNotasConsolidado.set(false);
      }
    });
  }

  private getIsolatedPrintStyles(landscape: boolean): string {
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
    if (this.subTabFinanceiro() === 'DEMONSTRATIVO_ANUAL') {
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
        if (!this.incluirMedicaoImpressao()) {
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
      if (!this.incluirMedicaoImpressao()) {
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

  selecionarEmpenhoParaEspelho(empId: number): void {
    this.empenhoFiltroNotas.set(empId);
    this.subTabFinanceiro.set('NOTAS_MENSAIS');
    this.carregarNotasFiscaisLote();
  }

  exportarNotasFiscaisConsolidadoCSV(): void {
    const cons = this.notasFiscaisConsolidado();
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
    const faturas = this.notasFiscaisLote();
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

    const mesesStr = this.mesesSelecionados().join('-');
    const ano = this.anoFinanceiro();
    exportToCsv(`notas_fiscais_meses_${mesesStr}_${ano}`, columns, rows);
    this.toast.success('Notas fiscais exportadas em .CSV com sucesso!');
  }

  somarMesesItem(it: ItemNotaFiscal): number {
    if (!it || !it.meses) return 0;
    return it.meses.reduce((acc, m) => acc + (m.valorTotal || 0), 0);
  }

  // ==================== METODOS DA COLETA AUTOMATICA ====================

  ngOnDestroy(): void {
    document.removeEventListener('scroll', this.dismissPrinterMenuOnScroll, true);
    this.pararPollingColeta();
  }

  carregarDadosColeta(): void {
    this.verificarColetaAtivaOuUltima();
  }

  verificarColetaAtivaOuUltima(): void {
    this.impressoraService.getColetaAtiva().subscribe({
      next: (progresso) => {
        if (progresso && progresso.emAndamento) {
          this.coletaAtiva.set(progresso);
          this.iniciarPollingColeta();
          this.carregarSessaoColeta(progresso.sessaoId, false);
        } else {
          this.carregarUltimaSessaoColeta();
        }
      },
      error: () => {
        this.carregarUltimaSessaoColeta();
      }
    });
  }

  carregarUltimaSessaoColeta(): void {
    this.impressoraService.getUltimaColeta().subscribe({
      next: (sessao) => {
        if (sessao) this.coletaSessao.set(sessao);
      }
    });
  }

  iniciarColetaAutomatica(): void {
    if (this.coletaAtiva()?.emAndamento) {
      this.toast.info('Já existe uma sessão de coleta em andamento.');
      return;
    }

    const req: IniciarColetaRequest = {
      ano: this.anoColeta(),
      mes: this.mesColeta(),
      empenhoId: this.empenhoFiltroColeta() || undefined,
      secretariaId: this.secretariaFiltroColeta() || undefined
    };

    this.loadingColeta.set(true);
    this.impressoraService.iniciarColeta(req).subscribe({
      next: (progresso) => {
        this.coletaAtiva.set(progresso);
        this.toast.success('Coleta de contadores iniciada em segundo plano!');
        this.iniciarPollingColeta();
        this.carregarSessaoColeta(progresso.sessaoId, false);
        this.loadingColeta.set(false);
      },
      error: (err) => {
        this.toast.error('Erro ao iniciar coleta: ' + (err.error?.message || err.message));
        this.loadingColeta.set(false);
      }
    });
  }

  iniciarPollingColeta(): void {
    this.pararPollingColeta();
    this.pollingColetaInterval = setInterval(() => {
      this.impressoraService.getColetaAtiva().subscribe({
        next: (progresso) => {
          if (progresso && progresso.emAndamento) {
            this.coletaAtiva.set(progresso);
            if (progresso.sessaoId) {
              this.carregarSessaoColeta(progresso.sessaoId, false);
            }
          } else {
            this.pararPollingColeta();
            this.coletaAtiva.set(null);
            this.toast.success('Coleta automática de contadores concluída!');
            this.carregarUltimaSessaoColeta();
          }
        },
        error: () => {
          this.pararPollingColeta();
        }
      });
    }, 2500);
  }

  pararPollingColeta(): void {
    if (this.pollingColetaInterval) {
      clearInterval(this.pollingColetaInterval);
      this.pollingColetaInterval = null;
    }
  }

  carregarSessaoColeta(id: number, showLoading = true): void {
    if (showLoading) this.loadingColeta.set(true);
    this.impressoraService.getColetaPorId(id).subscribe({
      next: (sessao) => {
        this.coletaSessao.set(sessao);
        if (showLoading) this.loadingColeta.set(false);
      },
      error: (err) => {
        if (showLoading) {
          this.toast.error('Erro ao carregar detalhes da coleta: ' + err.message);
          this.loadingColeta.set(false);
        }
      }
    });
  }

  baixarZipColeta(): void {
    const sessao = this.coletaSessao();
    if (!sessao) return;

    this.toast.info('Preparando download do pacote de prints...');
    this.impressoraService.baixarZipColeta(sessao.id).subscribe({
      next: (blob) => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `contadores_${sessao.anoReferencia}_${String(sessao.mesReferencia).padStart(2, '0')}.zip`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
        this.toast.success('Pacote de prints baixado com sucesso!');
      },
      error: (err) => {
        this.toast.error('Erro ao baixar arquivo ZIP: ' + err.message);
      }
    });
  }

  aplicarLeiturasColeta(): void {
    const sessao = this.coletaSessao();
    if (!sessao) return;

    this.loadingColeta.set(true);
    this.impressoraService.aplicarLeiturasColeta(sessao.id).subscribe({
      next: (res) => {
        this.toast.success(res.mensagem);
        this.loadingColeta.set(false);
        this.carregarLeiturasCompetencia();
      },
      error: (err) => {
        this.toast.error('Erro ao sincronizar leituras: ' + (err.error?.message || err.message));
        this.loadingColeta.set(false);
      }
    });
  }

  recoletarItem(item: ColetaItem): void {
    if (!item || !item.id) return;
    this.toast.info(`Tentando reconectar ao IP ${item.ip}...`);
    item.status = 'PENDENTE';
    this.impressoraService.recoletarItem(item.id).subscribe({
      next: () => {
        this.toast.success(`Coleta disparada para o equipamento ${item.itemPedido}!`);
        setTimeout(() => {
          if (this.coletaSessao()) {
            this.carregarSessaoColeta(this.coletaSessao()!.id, false);
          }
        }, 3500);
      },
      error: (err) => {
        this.toast.error('Erro ao recoletar equipamento: ' + err.message);
      }
    });
  }

  recoletarTodasFalhas(): void {
    const sessao = this.coletaSessao();
    if (!sessao) return;

    this.toast.info('Tentando reconectar a todos os equipamentos offline...');
    this.impressoraService.recoletarFalhas(sessao.id).subscribe({
      next: (res) => {
        this.toast.success(res.mensagem);
        this.iniciarPollingColeta();
      },
      error: (err) => {
        this.toast.error('Erro ao reconectar falhas: ' + err.message);
      }
    });
  }

  printZoomLevel = signal<number>(1);
  printRotation = signal<number>(0);
  printFitMode = signal<'fit' | 'original'>('fit');
  printImgDimensions = signal<{ width: number; height: number } | null>(null);

  abrirModalPrint(item: ColetaItem): void {
    this.printSelecionado.set(item);
    this.printZoomLevel.set(1);
    this.printRotation.set(0);
    this.printFitMode.set('fit');
    this.printImgDimensions.set(null);
    this.modalPrintAberto.set(true);
  }

  fecharModalPrint(): void {
    this.modalPrintAberto.set(false);
    this.printSelecionado.set(null);
    this.printZoomLevel.set(1);
    this.printRotation.set(0);
    this.printFitMode.set('fit');
    this.printImgDimensions.set(null);
  }

  onPrintImageLoaded(event: Event): void {
    const img = event.target as HTMLImageElement;
    if (img && img.naturalWidth) {
      this.printImgDimensions.set({
        width: img.naturalWidth,
        height: img.naturalHeight
      });
    }
  }

  toggleFitMode(): void {
    if (this.printFitMode() === 'fit') {
      this.printFitMode.set('original');
      this.printZoomLevel.set(1);
    } else {
      this.printFitMode.set('fit');
      this.printZoomLevel.set(1);
    }
  }

  zoomInPrint(): void {
    if (this.printFitMode() === 'fit') {
      this.printFitMode.set('original');
      this.printZoomLevel.set(1.25);
    } else {
      this.printZoomLevel.update(z => Math.min(Number((z + 0.25).toFixed(2)), 3.5));
    }
  }

  zoomOutPrint(): void {
    if (this.printZoomLevel() <= 1 && this.printFitMode() === 'original') {
      this.printFitMode.set('fit');
      this.printZoomLevel.set(1);
    } else {
      this.printZoomLevel.update(z => Math.max(Number((z - 0.25).toFixed(2)), 0.5));
    }
  }

  resetZoomPrint(): void {
    this.printFitMode.set('fit');
    this.printZoomLevel.set(1);
    this.printRotation.set(0);
  }

  onPrintWheel(event: WheelEvent): void {
    event.preventDefault();
    if (event.deltaY < 0) {
      this.zoomInPrint();
    } else {
      this.zoomOutPrint();
    }
  }

  rotatePrint(): void {
    this.printRotation.update(r => (r + 90) % 360);
  }

  downloadPrintImage(item: ColetaItem): void {
    const url = this.getUrlImagemColeta(item);
    if (!url) return;
    const a = document.createElement('a');
    a.href = url;
    a.download = item.nomeArquivo || `print-${item.modelo || 'impressora'}.png`;
    a.target = '_blank';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }

  getUrlImagemColeta(item: ColetaItem): string {
    if (!item || !item.sessaoId || !item.nomeArquivo) return '';
    return this.impressoraService.getUrlImagemColeta(item.sessaoId, item.nomeArquivo);
  }
}
