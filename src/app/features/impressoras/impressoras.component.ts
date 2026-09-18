import { Component, OnInit, inject, signal, computed, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { HeaderComponent } from '@shared/components/header/header.component';
import { LoadingSkeletonComponent } from '@shared/components/loading-skeleton/loading-skeleton.component';
import { PaginationComponent } from '@shared/components/pagination/pagination.component';
import { ConfirmModalComponent } from '@shared/components/confirm-modal/confirm-modal.component';
import { ToastService } from '@core/services/toast.service';
import { ImpressoraService } from '@core/services/impressora.service';
import { SecretariaService } from '@core/services/secretaria.service';
import {
  Impressora,
  ImpressoraDTO,
  TrocaLocalDTO,
  SubstituicaoImpressoraDTO,
  LoteImpressao,
  EmpenhoImpressao,
  LeituraContador,
  LeituraContadorDTO,
  Secretariat
} from '@core/models';
import { exportToCsv } from '@core/utils';

@Component({
  selector: 'app-impressoras',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    HeaderComponent,
    LoadingSkeletonComponent,
    PaginationComponent,
    ConfirmModalComponent
  ],
  templateUrl: './impressoras.component.html',
  styleUrls: ['./impressoras.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
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
  activeTab = signal<'INVENTARIO' | 'LEITURAS' | 'FATURAMENTO' | 'LOTES'>('INVENTARIO');
  globalSearch = signal<string>('');
  filterSecretaria = signal<string>('');
  filterLote = signal<string>('');
  filterStatus = signal<string>('');

  // Competência selecionada para leituras
  mesCompetencia = signal<number>(new Date().getMonth() + 1);
  anoCompetencia = signal<number>(new Date().getFullYear());

  // Paginação da tabela de inventário
  currentPage = signal<number>(1);
  pageSize = signal<number>(15);

  // Controle de Modais
  isModalOpen = signal<boolean>(false);
  isEditMode = signal<boolean>(false);
  selectedPrinter = signal<Impressora | null>(null);

  isRemanejarModalOpen = signal<boolean>(false);
  isSubstituirModalOpen = signal<boolean>(false);
  isLeituraModalOpen = signal<boolean>(false);
  isDetailsModalOpen = signal<boolean>(false);
  isDeleteModalOpen = signal<boolean>(false);
  printerToDelete = signal<Impressora | null>(null);

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
        (p.itemPedido && p.itemPedido.toString().includes(search))
      );
    }

    if (this.filterSecretaria()) {
      list = list.filter(p => p.secretariaSigla === this.filterSecretaria());
    }

    if (this.filterLote()) {
      list = list.filter(p => p.numeroLote === Number(this.filterLote()));
    }

    return list;
  });

  paginatedPrinters = computed(() => {
    const list = this.filteredPrinters();
    const start = (this.currentPage() - 1) * this.pageSize();
    return list.slice(start, start + this.pageSize());
  });

  // Métricas do Faturamento Mensal das Leituras
  totalCopiasMonoMes = computed(() => this.leituras().reduce((sum, l) => sum + (l.copiasMono || 0), 0));
  totalCopiasColorMes = computed(() => this.leituras().reduce((sum, l) => sum + (l.copiasColor || 0), 0));
  totalExcedenteMes = computed(() => this.leituras().reduce((sum, l) => sum + (l.excedenteMono || 0) + (l.excedenteColor || 0), 0));
  totalValorFaturaMes = computed(() => this.leituras().reduce((sum, l) => sum + (l.valorTotal || 0), 0));

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

    this.impressoraService.getEmpenhos().subscribe({
      next: emp => this.empenhos.set(emp),
      error: () => {}
    });

    this.carregarImpressoras();
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

  trocarAba(tab: 'INVENTARIO' | 'LEITURAS' | 'FATURAMENTO' | 'LOTES'): void {
    this.activeTab.set(tab);
    if (tab === 'LEITURAS' || tab === 'FATURAMENTO') {
      this.carregarLeiturasCompetencia();
    }
  }

  // Modais de Criação / Edição
  openCreateModal(): void {
    this.isEditMode.set(false);
    this.selectedPrinter.set(null);
    this.form.reset({
      itemPedido: '',
      numeroSerie: '',
      fabricante: 'Ricoh',
      modelo: '',
      tipoImpressao: 'MONO',
      loteId: 1,
      ip: '',
      secretariaId: '',
      empenhoId: '',
      localInstalacao: '',
      endereco: '',
      responsavel: '',
      transformador: 'NAO',
      dataInstalacao: new Date().toISOString().substring(0, 10),
      contadorInicialMono: 0,
      contadorInicialColor: 0
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
      dataInstalacao: p.dataInstalacao
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

    const dto: ImpressoraDTO = this.form.value;

    if (this.isEditMode() && this.selectedPrinter()) {
      this.impressoraService.update(this.selectedPrinter()!.id, dto).subscribe({
        next: () => {
          this.toast.success('Impressora atualizada com sucesso!');
          this.closeModal();
          this.carregarImpressoras();
        },
        error: () => this.toast.error('Erro ao atualizar impressora.')
      });
    } else {
      this.impressoraService.create(dto).subscribe({
        next: () => {
          this.toast.success('Impressora cadastrada com sucesso!');
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
    if (this.remanejarForm.invalid) {
      this.remanejarForm.markAllAsTouched();
      return;
    }
    const dto: TrocaLocalDTO = this.remanejarForm.value;
    this.impressoraService.remanejarLocal(this.selectedPrinter()!.id, dto).subscribe({
      next: () => {
        this.toast.success('Remanejamento registrado com sucesso!');
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
    if (this.substituirForm.invalid) {
      this.substituirForm.markAllAsTouched();
      return;
    }
    const dto: SubstituicaoImpressoraDTO = this.substituirForm.value;
    this.impressoraService.substituirPorDefeito(this.selectedPrinter()!.id, dto).subscribe({
      next: () => {
        this.toast.success('Substituição de equipamento registrada com sucesso!');
        this.closeSubstituirModal();
        this.carregarImpressoras();
      },
      error: () => this.toast.error('Erro ao registrar substituição.')
    });
  }

  // Modal Lançar Leitura
  openLeituraModal(p?: Impressora): void {
    this.leituraForm.reset({
      impressoraId: p ? p.id : (this.printers().length > 0 ? this.printers()[0].id : ''),
      mesReferencia: this.mesCompetencia(),
      anoReferencia: this.anoCompetencia(),
      dataLeitura: new Date().toISOString().substring(0, 10),
      leituraMonoAtual: p ? (p.ultimoContadorMono || 0) : 0,
      leituraColorAtual: p ? (p.ultimoContadorColor || 0) : 0,
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
      return;
    }
    const dto: LeituraContadorDTO = this.leituraForm.value;
    this.impressoraService.lancarLeitura(dto).subscribe({
      next: () => {
        this.toast.success('Leitura lançada e apurada com sucesso!');
        this.closeLeituraModal();
        this.carregarLeiturasCompetencia();
        this.carregarImpressoras();
      },
      error: () => this.toast.error('Erro ao lançar leitura.')
    });
  }

  // Detalhes da Impressora
  openDetailsModal(p: Impressora): void {
    this.selectedPrinter.set(p);
    this.isDetailsModalOpen.set(true);
  }

  closeDetailsModal(): void {
    this.isDetailsModalOpen.set(false);
    this.selectedPrinter.set(null);
  }

  // Exclusão
  confirmDelete(p: Impressora): void {
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
        this.toast.success('Impressora recolhida/inativada com sucesso!');
        this.closeDeleteModal();
        this.carregarImpressoras();
      },
      error: () => this.toast.error('Erro ao inativar impressora.')
    });
  }

  // Exportar Inventário para CSV
  exportarInventarioCSV(): void {
    const list = this.filteredPrinters();
    const columns = [
      { header: 'Item', accessor: (p: Impressora) => p.itemPedido || '' },
      { header: 'Secretaria', accessor: (p: Impressora) => p.secretariaSigla || '' },
      { header: 'Local Instalacao', accessor: (p: Impressora) => p.localInstalacao || '' },
      { header: 'Endereco', accessor: (p: Impressora) => p.endereco || '' },
      { header: 'Fabricante', accessor: (p: Impressora) => p.fabricante || '' },
      { header: 'Modelo', accessor: (p: Impressora) => p.modelo || '' },
      { header: 'Tipo', accessor: (p: Impressora) => p.tipoImpressao || '' },
      { header: 'Lote', accessor: (p: Impressora) => p.numeroLote ? 'Lote ' + p.numeroLote : '' },
      { header: 'IP', accessor: (p: Impressora) => p.ip || '' },
      { header: 'Transformador', accessor: (p: Impressora) => p.transformador || 'NAO' },
      { header: 'Ultimo Contador', accessor: (p: Impressora) => p.ultimoContadorMono || 0 },
      { header: 'Status', accessor: (p: Impressora) => p.statusInstalacao || 'ATIVA' }
    ];
    exportToCsv('inventario_impressoras_' + new Date().toISOString().substring(0, 10), columns, list);
    this.toast.success('Inventário exportado em .CSV com sucesso!');
  }

  // Exportar Medição Mensal para CSV
  exportarMedicaoCSV(): void {
    const list = this.leituras();
    const columns = [
      { header: 'Item', accessor: (l: LeituraContador) => l.itemPedido || '' },
      { header: 'Secretaria', accessor: (l: LeituraContador) => l.secretariaSigla || '' },
      { header: 'Local Instalacao', accessor: (l: LeituraContador) => l.localInstalacao || '' },
      { header: 'Modelo', accessor: (l: LeituraContador) => l.impressoraModelo || '' },
      { header: 'IP', accessor: (l: LeituraContador) => l.impressoraIp || '' },
      { header: 'Leitura Anterior', accessor: (l: LeituraContador) => l.leituraMonoAnterior },
      { header: 'Leitura Atual', accessor: (l: LeituraContador) => l.leituraMonoAtual },
      { header: 'Copias Mono', accessor: (l: LeituraContador) => l.copiasMono },
      { header: 'Franquia Aplicada', accessor: (l: LeituraContador) => l.franquiaMonoAplicada },
      { header: 'Excedente Mono', accessor: (l: LeituraContador) => l.excedenteMono },
      { header: 'Valor Locacao', accessor: (l: LeituraContador) => l.valorLocacao.toFixed(2) },
      { header: 'Valor Excedente', accessor: (l: LeituraContador) => l.valorExcedenteMono.toFixed(2) },
      { header: 'Total a Pagar', accessor: (l: LeituraContador) => l.valorTotal.toFixed(2) }
    ];
    exportToCsv('medicao_impressoras_' + this.mesCompetencia() + '_' + this.anoCompetencia(), columns, list);
    this.toast.success('Medição mensal exportada em .CSV com sucesso!');
  }
}
