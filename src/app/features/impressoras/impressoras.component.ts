import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ImpressoraService } from '@core/services/impressora.service';
import { SecretariaService } from '@core/services/secretaria.service';
import { ToastService } from '@core/services/toast.service';
import { ConfirmModalComponent } from '@shared/components/confirm-modal/confirm-modal.component';
import { PaginationComponent } from '@shared/components/pagination/pagination.component';
import { exportToCsv } from '@core/utils/export.utils';
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
  MesFatura
} from '@core/models';

@Component({
  selector: 'app-impressoras',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    PaginationComponent,
    ConfirmModalComponent
  ],
  templateUrl: './impressoras.component.html',
  styleUrls: ['./impressoras.component.scss']
})
export class ImpressorasComponent implements OnInit {
  private impressoraService = inject(ImpressoraService);
  private secretariaService = inject(SecretariaService);
  private toast = inject(ToastService);
  private fb = inject(FormBuilder);

  // Estados principais
  loading = signal<boolean>(true);
  printers = signal<Impressora[]>([]);
  lotes = signal<LoteImpressao[]>([]);
  secretariats = signal<Secretariat[]>([]);
  empenhos = signal<EmpenhoImpressao[]>([]);
  leituras = signal<LeituraContador[]>([]);

  // Filtros e Navegação
  activeTab = signal<'INVENTARIO' | 'LEITURAS' | 'FINANCEIRO' | 'LOTES'>('INVENTARIO');
  globalSearch = signal<string>('');
  filterSecretaria = signal<string>('');
  filterLote = signal<string>('');
  filterEmpenho = signal<string>('');
  filterStatus = signal<string>('');

  // Módulo Financeiro & Notas Fiscais Unificado
  subTabFinanceiro = signal<'NOTAS_MENSAIS' | 'DEMONSTRATIVO_ANUAL' | 'EMPENHOS'>('NOTAS_MENSAIS');
  anoFinanceiro = signal<number>(2026);
  mesesSelecionados = signal<number[]>([8]); // Padrão: Agosto (último mês faturado)
  modoMultiplosMeses = signal<boolean>(false);
  empenhoFiltroNotas = signal<number | null>(null); // null = Todos os 8 empenhos

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
  termoBuscaLeituras = signal<string>('');
  filtroSecretariaLeituras = signal<string>('');

  // Paginação da tabela de inventário
  currentPage = signal<number>(1);
  pageSize = signal<number>(15);

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
  activeDetailsTab = signal<'GERAL' | 'LEITURAS'>('GERAL');
  historicoLeiturasImpressora = signal<LeituraContador[]>([]);
  loadingHistorico = signal<boolean>(false);

  // Controle de Modais de Empenhos
  isEmpenhoModalOpen = signal<boolean>(false);
  isEmpenhoEditMode = signal<boolean>(false);
  selectedEmpenho = signal<EmpenhoImpressao | null>(null);
  isDeleteEmpenhoModalOpen = signal<boolean>(false);
  empenhoToDelete = signal<EmpenhoImpressao | null>(null);

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
    localInstalacao: ['', Validators.required],
    endereco: [''],
    responsavel: [''],
    transformador: ['NAO'],
    dataInstalacao: [new Date().toISOString().substring(0, 10), Validators.required],
    contadorInicialMono: [0],
    contadorInicialColor: [0]
  });

  remanejarForm: FormGroup = this.fb.group({
    novaSecretariaId: ['', Validators.required],
    novoLocalInstalacao: ['', Validators.required],
    novoEndereco: [''],
    novoResponsavel: [''],
    novoIp: [''],
    novoTransformador: ['NAO'],
    dataMudanca: [new Date().toISOString().substring(0, 10), Validators.required],
    contadorAtualMono: [0, Validators.required],
    contadorAtualColor: [0],
    motivo: ['Remanejamento de setor']
  });

  substituirForm: FormGroup = this.fb.group({
    contadorFinalMonoRetirada: [0, Validators.required],
    contadorFinalColorRetirada: [0],
    dataSubstituicao: [new Date().toISOString().substring(0, 10), Validators.required],
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
    dataLeitura: [new Date().toISOString().substring(0, 10), Validators.required],
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
  totalAtivas = computed(() => this.printers().filter(p => p.statusInstalacao === 'ATIVA' || p.ativo).length);
  totalMono = computed(() => this.printers().filter(p => p.tipoImpressao === 'MONO').length);
  totalColor = computed(() => this.printers().filter(p => p.tipoImpressao === 'COLOR').length);

  // Computado de filtragem do Inventário
  filteredPrinters = computed(() => {
    let list = this.printers();
    const search = this.globalSearch().toLowerCase().trim();

    if (search) {
      list = list.filter(p =>
        (p.modelo && p.modelo.toLowerCase().includes(search)) ||
        (p.ip && p.ip.toLowerCase().includes(search)) ||
        (p.localInstalacao && p.localInstalacao.toLowerCase().includes(search)) ||
        (p.secretariaSigla && p.secretariaSigla.toLowerCase().includes(search)) ||
        (p.secretariaNome && p.secretariaNome.toLowerCase().includes(search)) ||
        (p.numeroSerie && p.numeroSerie.toLowerCase().includes(search)) ||
        (p.numeroEmpenho && p.numeroEmpenho.toLowerCase().includes(search)) ||
        (p.itemPedido && p.itemPedido.toString().includes(search))
      );
    }

    if (this.filterSecretaria()) {
      list = list.filter(p => p.secretariaSigla === this.filterSecretaria());
    }

    if (this.filterLote()) {
      list = list.filter(p => p.numeroLote === Number(this.filterLote()));
    }

    if (this.filterEmpenho()) {
      list = list.filter(p => p.numeroEmpenho === this.filterEmpenho());
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
    const search = this.termoBuscaLeituras().toLowerCase().trim();

    if (search) {
      list = list.filter(l =>
        (l.impressoraModelo && l.impressoraModelo.toLowerCase().includes(search)) ||
        (l.localInstalacao && l.localInstalacao.toLowerCase().includes(search)) ||
        (l.impressoraIp && l.impressoraIp.toLowerCase().includes(search)) ||
        (l.secretariaSigla && l.secretariaSigla.toLowerCase().includes(search)) ||
        (l.itemPedido && l.itemPedido.toString().includes(search))
      );
    }

    if (this.filtroSecretariaLeituras()) {
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

  ngOnInit(): void {
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
  }

  carregarEmpenhos(): void {
    this.impressoraService.getEmpenhos().subscribe({
      next: emp => this.empenhos.set(emp),
      error: () => {}
    });
  }

  carregarImpressoras(): void {
    this.impressoraService.getAll().subscribe({
      next: list => {
        this.printers.set(list);
        this.loading.set(false);
      },
      error: () => {
        this.toast.error('Erro ao conectar com o serviço de impressoras.');
        this.loading.set(false);
      }
    });
  }

  carregarLeiturasCompetencia(): void {
    this.impressoraService.getLeituras(this.mesCompetencia(), this.anoCompetencia()).subscribe({
      next: list => this.leituras.set(list),
      error: () => this.toast.error('Erro ao carregar leituras da competência.')
    });
  }

  trocarAba(tab: 'INVENTARIO' | 'LEITURAS' | 'FINANCEIRO' | 'LOTES'): void {
    this.activeTab.set(tab);
    if (tab === 'LEITURAS' && this.leituras().length === 0) {
      this.carregarLeiturasCompetencia();
    } else if (tab === 'FINANCEIRO') {
      this.inicializarFinanceiroSeNecessario();
    } else if (tab === 'LOTES') {
      if (!this.balancoFranquias()) {
        this.carregarBalancoFranquias();
      }
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
    this.form.reset({
      fabricante: 'Ricoh',
      tipoImpressao: 'MONO',
      loteId: 1,
      transformador: 'NAO',
      dataInstalacao: new Date().toISOString().substring(0, 10),
      contadorInicialMono: 0,
      contadorInicialColor: 0,
      secretariaId: '',
      empenhoId: '',
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
  }

  salvarImpressora(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.toast.error('Preencha os campos obrigatórios.');
      return;
    }

    const payload = this.form.value;

    if (this.isEditMode() && this.selectedPrinter()) {
      this.impressoraService.update(this.selectedPrinter()!.id, payload).subscribe({
        next: () => {
          this.toast.success('Equipamento atualizado com sucesso!');
          this.closeModal();
          this.carregarImpressoras();
        },
        error: () => this.toast.error('Erro ao atualizar impressora.')
      });
    } else {
      this.impressoraService.create(payload).subscribe({
        next: () => {
          this.toast.success('Equipamento cadastrado com sucesso!');
          this.closeModal();
          this.carregarImpressoras();
        },
        error: () => this.toast.error('Erro ao cadastrar impressora.')
      });
    }
  }

  // Modal Remanejar de Local
  openRemanejarModal(p: Impressora): void {
    this.selectedPrinter.set(p);
    this.remanejarForm.reset({
      novaSecretariaId: p.secretariaId,
      novoLocalInstalacao: p.localInstalacao,
      novoEndereco: p.endereco,
      novoResponsavel: p.responsavel,
      novoIp: p.ip,
      novoTransformador: p.transformador || 'NAO',
      dataMudanca: new Date().toISOString().substring(0, 10),
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
      this.toast.error('Preencha os campos de remanejamento.');
      return;
    }

    this.impressoraService.remanejarLocal(this.selectedPrinter()!.id, this.remanejarForm.value).subscribe({
      next: () => {
        this.toast.success('Impressora remanejada com histórico registrado!');
        this.closeRemanejarModal();
        this.carregarImpressoras();
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
      dataSubstituicao: new Date().toISOString().substring(0, 10),
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
      dataLeitura: new Date().toISOString().substring(0, 10),
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
    exportToCsv('inventario_impressoras_' + new Date().toISOString().substring(0, 10), columns, list);
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

  imprimirNotasFiscaisLote(): void {
    window.print();
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
}

