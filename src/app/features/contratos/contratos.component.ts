import { Component, OnInit, inject, signal, computed, ChangeDetectionStrategy, HostListener, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, FormArray, Validators } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { HeaderComponent, ConfirmModalComponent, LoadingSkeletonComponent, PaginationComponent } from '@shared';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { ContratoService, SecretariaService, ServidorService, LookupService, ToastService, AnexoService } from '@core/services';
import { Contract, Secretariat, LookupItem, Servant, DocumentoAnexo, TIPOS_DOCUMENTO_LABELS } from '@core/models';
import { includesNormalized, matchesSearch, exportToCsv, printFichaDocumento, parseDateSafe, formatDatePtBr } from '@core/utils';

@Component({
  selector: 'app-contratos',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    HeaderComponent,
    ConfirmModalComponent,
    LoadingSkeletonComponent,
    PaginationComponent
  ],
  templateUrl: './contratos.component.html',
  styleUrls: ['./contratos.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ContratosComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private contratoService = inject(ContratoService);
  private secService = inject(SecretariaService);
  private servidorService = inject(ServidorService);
  private lookupService = inject(LookupService);
  private toast = inject(ToastService);
  private fb = inject(FormBuilder);
  private elementRef = inject(ElementRef);
  private anexoService = inject(AnexoService);
  private sanitizer = inject(DomSanitizer);

  contracts = signal<Contract[]>([]);
  secretariats = signal<Secretariat[]>([]);
  tiposList = signal<LookupItem[]>([]);
  statusList = signal<LookupItem[]>([]);
  funcoesList = signal<LookupItem[]>([]);
  servants = signal<Servant[]>([]);
  servidoresList = signal<{ id: number; nome: string }[]>([]);

  // Repositório Digital de Anexos
  anexosContrato = signal<DocumentoAnexo[]>([]);
  loadingAnexos = signal<boolean>(false);
  isUploadModalOpen = signal<boolean>(false);
  uploadingAnexo = signal<boolean>(false);
  uploadTipo = signal<string>('CONTRATO_INTEGRA');
  uploadDescricao = signal<string>('');
  selectedFile = signal<File | null>(null);
  tiposDocumento = TIPOS_DOCUMENTO_LABELS;
  readonly tiposDocumentoKeys = Object.keys(TIPOS_DOCUMENTO_LABELS);
  selectedSecretariasSet = signal<Set<number>>(new Set<number>());

  // Visualização de Anexo
  previewAnexo = signal<DocumentoAnexo | null>(null);
  previewUrl = signal<SafeResourceUrl | null>(null);
  isPreviewModalOpen = signal<boolean>(false);

  // Equipe de Contrato (No Modal)
  openServidorDropdownIndex = signal<number | null>(null);
  servidorSearch = signal<string>('');
  selectedServants = signal<(Servant | null)[]>([]);

  filteredServantsForDropdown = computed(() => {
    const term = this.servidorSearch().trim();
    if (!term) return this.servants();
    return this.servants().filter(s =>
      matchesSearch([s.nome, s.cargo, s.matricula, s.secretaria], term)
    );
  });

  showFilters = signal(false);
  globalSearch = signal<string>('');
  filterAno = signal<string>('');
  filterTipo = signal<string>('');
  filterStatus = signal<string>('');
  filterVigencia = signal<string>('');
  filterSecretarias = signal<number[]>([]);
  showSecretariaDropdown = signal<boolean>(false);
  secretariaFilterSearch = signal<string>('');
  filterPessoas = signal<string[]>([]);
  pessoaInput = signal<string>('');
  showPessoaSuggestions = signal<boolean>(false);

  sortColumn = signal<string>('id');
  sortDirection = signal<'asc' | 'desc'>('desc');
  currentPage = signal<number>(1);
  pageSize = signal<number>(25);

  loading = signal<boolean>(true);
  submitting = signal<boolean>(false);
  deleting = signal<boolean>(false);

  isModalOpen = signal<boolean>(false);
  isEditModalOpen = signal<boolean>(false);
  isDeleteModalOpen = signal<boolean>(false);
  isDetailsModalOpen = signal<boolean>(false);
  itemToDelete = signal<Contract | null>(null);
  editingContrato = signal<Contract | null>(null);
  selectedContratoForDetails = signal<Contract | null>(null);
  modalSecretariaSearch = signal<string>('');
  formatDatePtBr = formatDatePtBr;

  @HostListener('document:keydown.escape')
  onEscapeKey(): void {
    if (this.isPreviewModalOpen()) {
      this.fecharPreviewModal();
    } else if (this.isUploadModalOpen()) {
      this.fecharModalUploadAnexo();
    } else if (this.showSecretariaDropdown()) {
      this.showSecretariaDropdown.set(false);
    } else if (this.showPessoaSuggestions()) {
      this.showPessoaSuggestions.set(false);
    } else if (this.openServidorDropdownIndex() !== null) {
      this.openServidorDropdownIndex.set(null);
    } else if (this.isDetailsModalOpen()) {
      this.closeDetailsModal();
    } else if (this.isModalOpen()) {
      this.closeModal();
    } else if (this.isDeleteModalOpen()) {
      this.closeDeleteModal();
    }
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    const target = event.target as HTMLElement;
    if (!this.elementRef.nativeElement.contains(target)) {
      this.showSecretariaDropdown.set(false);
      this.showPessoaSuggestions.set(false);
    }
    if (!target.closest('.custom-select-wrapper')) {
      this.openServidorDropdownIndex.set(null);
    }
  }

  form: FormGroup = this.fb.group({
    numero: ['', Validators.required],
    ano: [new Date().getFullYear(), Validators.required],
    dataInicio: ['', Validators.required],
    dataFim: ['', Validators.required],
    tipoId: [1, Validators.required],
    objeto: ['', Validators.required],
    observacao: [''],
    nomeContratado: ['', Validators.required],
    portariaDesignacao: ['', Validators.required],
    dataDesignacao: ['', Validators.required],
    ativoId: [1, Validators.required],
    secretariasIds: [[], Validators.required],
    membros: this.fb.array([])
  });

  get membrosArray(): FormArray {
    return this.form.get('membros') as FormArray;
  }

  activeFiltersCount = computed(() => {
    let count = 0;
    if (this.globalSearch()) count++;
    if (this.filterAno()) count++;
    if (this.filterTipo()) count++;
    if (this.filterStatus()) count++;
    if (this.filterVigencia()) count++;
    count += this.filterSecretarias().length;
    count += this.filterPessoas().length;
    return count;
  });

  anosDisponiveis = computed(() => {
    const anos = new Set<number>();
    this.contracts().forEach(c => anos.add(c.ano));
    return Array.from(anos).sort((a, b) => b - a);
  });

  tiposDisponiveis = computed(() => {
    const tipos = new Set<string>();
    this.contracts().forEach(c => {
      if (c.tipo) tipos.add(c.tipo);
    });
    return Array.from(tipos).sort();
  });

  filteredSecretariasForFilter = computed(() => {
    const search = this.secretariaFilterSearch().trim();
    const list = this.secretariats();
    if (!search) return list;
    return list.filter(sec => matchesSearch([sec.sigla, sec.nome], search));
  });

  filteredServidoresSuggestions = computed(() => {
    const search = this.pessoaInput().trim();
    const list = this.servidoresList();
    const alreadySelected = this.filterPessoas();
    if (!search) {
      return list.filter(s => !alreadySelected.includes(s.nome)).slice(0, 8);
    }
    return list
      .filter(s => !alreadySelected.includes(s.nome) && matchesSearch(s.nome, search))
      .slice(0, 8);
  });

  filteredModalSecretarias = computed(() => {
    const search = this.modalSecretariaSearch();
    const list = this.secretariats();
    if (!search || !search.trim()) return list;
    return list.filter(sec => matchesSearch([sec.sigla, sec.nome], search));
  });

  selectAllSecretarias(): void {
    const ids = this.filteredModalSecretarias().map(s => s.id);
    const control = this.form.get('secretariasIds');
    const current = control?.value || [];
    const merged = Array.from(new Set([...current, ...ids]));
    control?.setValue(merged);
    this.selectedSecretariasSet.set(new Set(merged));
    control?.markAsTouched();
    control?.updateValueAndValidity();
  }

  clearAllSecretarias(): void {
    const control = this.form.get('secretariasIds');
    control?.setValue([]);
    this.selectedSecretariasSet.set(new Set());
    control?.markAsTouched();
    control?.updateValueAndValidity();
  }

  getVigenciaPercent(dataInicio?: string, dataFim?: string): number {
    if (!dataInicio || !dataFim) return 0;
    const startDate = parseDateSafe(dataInicio);
    const endDate = parseDateSafe(dataFim);
    if (!startDate || !endDate) return 0;
    const start = startDate.getTime();
    const end = endDate.getTime();
    const now = new Date().getTime();
    if (end <= start) return 100;
    if (now <= start) return 0;
    if (now >= end) return 100;
    return Math.min(100, Math.max(0, Math.round(((now - start) / (end - start)) * 100)));
  }

  filteredContracts = computed(() => {
    let list = this.contracts();

    const global = this.globalSearch();
    const ano = this.filterAno();
    const tipo = this.filterTipo();
    const status = this.filterStatus();
    const vigencia = this.filterVigencia();
    const selectedSecs = this.filterSecretarias();
    const selectedPessoas = this.filterPessoas();

    return list.filter(contrato => {
      if (global) {
        const targets: (string | number | null | undefined)[] = [
          contrato.numero,
          contrato.ano,
          `${contrato.numero}/${contrato.ano}`,
          contrato.objeto,
          contrato.nomeContratado,
          contrato.portariaDesignacao,
          contrato.tipo,
          contrato.situacao,
          contrato.observacao
        ];
        if (contrato.secretarias && contrato.secretarias.length > 0) {
          for (const s of contrato.secretarias) {
            targets.push(s.sigla, s.nome);
          }
        }
        if (contrato.equipe && contrato.equipe.length > 0) {
          for (const eq of contrato.equipe as any[]) {
            if (eq.servidor) targets.push(eq.servidor, eq.funcao);
            if (eq.membros && eq.membros.length > 0) {
              for (const m of eq.membros) {
                targets.push(m.servidorNome, m.funcaoNome, m.servidorCargo);
              }
            }
          }
        }
        if (!matchesSearch(targets, global)) return false;
      }

      if (ano && contrato.ano !== Number(ano)) return false;

      if (tipo && contrato.tipo !== tipo) return false;

      if (status) {
        const contratoStatus = contrato.situacao || 'ATIVO';
        if (contratoStatus !== status) return false;
      }

      if (vigencia) {
        const vStatus = this.getVigenciaStatus(contrato.dataFim);
        if (vigencia === 'VIGENTE' && vStatus.badgeClass !== 'vigencia-ok') return false;
        if (vigencia === 'ATENCAO' && vStatus.badgeClass !== 'vigencia-warning') return false;
        if (vigencia === 'CRITICA' && vStatus.badgeClass !== 'vigencia-critical') return false;
        if (vigencia === 'EM_ALERTA' && vStatus.badgeClass !== 'vigencia-warning' && vStatus.badgeClass !== 'vigencia-critical') return false;
        if (vigencia === 'VENCIDO' && vStatus.badgeClass !== 'vigencia-expired') return false;
        if (vigencia === 'TODOS_VIGENTES' && (vStatus.badgeClass === 'vigencia-expired' || vStatus.badgeClass === 'vigencia-unknown')) return false;
      }

      if (selectedSecs.length > 0) {
        const hasSec = contrato.secretarias?.some(s => selectedSecs.includes(s.id));
        if (!hasSec) return false;
      }

      if (selectedPessoas.length > 0) {
        const equipes = contrato.equipe || [];
        const hasPessoa = selectedPessoas.some(pessoa => {
          return equipes.some((eq: any) => {
            if (eq.membros && eq.membros.length > 0) {
              return eq.membros.some((m: any) => matchesSearch([m.servidorNome, m.servidorCargo, m.funcaoNome], pessoa));
            }
            return matchesSearch([eq.servidor, eq.funcao], pessoa);
          });
        });
        if (!hasPessoa) return false;
      }

      return true;
    });
  });

  sortedContracts = computed(() => {
    const list = [...this.filteredContracts()];
    const col = this.sortColumn();
    const dir = this.sortDirection();
    const multiplier = dir === 'asc' ? 1 : -1;

    return list.sort((a: any, b: any) => {
      let valA = a[col];
      let valB = b[col];

      if (col === 'numero') {
        if (a.ano !== b.ano) return (a.ano - b.ano) * multiplier;
        return (Number(a.numero) - Number(b.numero)) * multiplier;
      }

      if (col === 'vigencia') {
        valA = a.dataFim ? new Date(a.dataFim).getTime() : 0;
        valB = b.dataFim ? new Date(b.dataFim).getTime() : 0;
        return (valA - valB) * multiplier;
      }

      if (col === 'nomeContratado') {
        valA = a.nomeContratado || '';
        valB = b.nomeContratado || '';
        return valA.localeCompare(valB, 'pt-BR') * multiplier;
      }

      if (typeof valA === 'string' && typeof valB === 'string') {
        return valA.localeCompare(valB, 'pt-BR') * multiplier;
      }

      if (typeof valA === 'number' && typeof valB === 'number') {
        return (valA - valB) * multiplier;
      }

      if (!valA && valB) return -1 * multiplier;
      if (valA && !valB) return 1 * multiplier;
      return 0;
    });
  });

  paginatedContracts = computed(() => {
    const sorted = this.sortedContracts();
    const page = this.currentPage();
    const size = this.pageSize();
    const startIndex = (page - 1) * size;
    return sorted.slice(startIndex, startIndex + size);
  });

  ngOnInit(): void {
    this.route.queryParams.subscribe(params => {
      if (params['status']) {
        this.filterStatus.set(params['status']);
      }
      if (params['ano']) {
        this.filterAno.set(params['ano']);
      }
      if (params['search']) {
        this.globalSearch.set(params['search']);
      }
      if (params['vigencia']) {
        this.filterVigencia.set(params['vigencia'].toUpperCase());
      }
    });
    this.loadData();
    this.loadLookups();
    this.loadServidores();
  }

  loadData(): void {
    this.loading.set(true);
    this.contratoService.getAll().subscribe({
      next: (data) => {
        this.contracts.set(data || []);
        this.loading.set(false);
      },
      error: () => {
        this.toast.error('Erro ao carregar contratos.');
        this.loading.set(false);
      }
    });
  }

  loadLookups(): void {
    this.secService.getAll().subscribe({
      next: (items) => this.secretariats.set(items || [])
    });
    this.lookupService.getTipos().subscribe({
      next: (items) => this.tiposList.set(items || [])
    });
    this.lookupService.getAtivos().subscribe({
      next: (items) => this.statusList.set(items || [])
    });
    this.lookupService.getFuncoesEquipe().subscribe({
      next: (items) => this.funcoesList.set(items || [])
    });
  }

  loadServidores(): void {
    this.servidorService.getAll().subscribe({
      next: (data) => {
        this.servants.set(data || []);
        this.servidoresList.set((data || []).map(s => ({ id: s.id, nome: s.nome })));
      }
    });
  }

  // ============ MÉTODOS DE SELEÇÃO DE SECRETARIAS (NOVOS) ============
  
  isSecretariaSelected(secretariaId: number): boolean {
    return this.selectedSecretariasSet().has(secretariaId);
  }

  toggleSecretaria(secretariaId: number): void {
    const control = this.form.get('secretariasIds');
    if (!control) return;
    
    const currentValue = control.value || [];
    const index = currentValue.indexOf(secretariaId);
    let nextValue: number[];
    
    if (index === -1) {
      nextValue = [...currentValue, secretariaId];
    } else {
      nextValue = currentValue.filter((id: number) => id !== secretariaId);
    }
    
    control.setValue(nextValue);
    this.selectedSecretariasSet.set(new Set(nextValue));
    control.markAsTouched();
    control.updateValueAndValidity();
  }

  // ============ MÉTODOS DE EQUIPE DE CONTRATO (MODAL) ============
  addMembro(servidorId: number | string = '', funcaoId: number | string = '', servantObj: Servant | null = null): void {
    this.membrosArray.push(this.fb.group({
      servidorId: [servidorId, Validators.required],
      funcaoId: [funcaoId, Validators.required]
    }));
    this.selectedServants.update(list => [...list, servantObj]);
  }

  removeMembro(index: number): void {
    this.membrosArray.removeAt(index);
    this.selectedServants.update(list => list.filter((_, i) => i !== index));
    if (this.openServidorDropdownIndex() === index) {
      this.openServidorDropdownIndex.set(null);
    }
  }

  toggleServidorDropdown(index: number): void {
    if (this.openServidorDropdownIndex() === index) {
      this.openServidorDropdownIndex.set(null);
    } else {
      this.openServidorDropdownIndex.set(index);
      this.servidorSearch.set('');
    }
  }

  selectServant(index: number, servant: Servant): void {
    const ctrl = this.membrosArray.at(index);
    if (ctrl) {
      ctrl.get('servidorId')!.setValue(servant.id);
      this.selectedServants.update(list => {
        const copy = [...list];
        copy[index] = servant;
        return copy;
      });
      ctrl.get('servidorId')!.markAsTouched();
    }
    this.openServidorDropdownIndex.set(null);
    this.servidorSearch.set('');
  }

  // ============ FIM DOS MÉTODOS DE SELEÇÃO ============

  setSort(column: string): void {
    if (this.sortColumn() === column) {
      this.sortDirection.set(this.sortDirection() === 'asc' ? 'desc' : 'asc');
    } else {
      this.sortColumn.set(column);
      this.sortDirection.set('asc');
    }
  }

  onPageChange(page: number): void {
    this.currentPage.set(page);
  }

  onPageSizeChange(size: number): void {
    this.pageSize.set(size);
    this.currentPage.set(1);
  }

  getVigenciaStatus(dataFimStr?: string): { label: string; badgeClass: string; days: number; text: string } {
    if (!dataFimStr) {
      return { label: 'Sem data', badgeClass: 'vigencia-unknown', days: 0, text: '-' };
    }
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const end = parseDateSafe(dataFimStr);
    if (!end) {
      return { label: 'Sem data', badgeClass: 'vigencia-unknown', days: 0, text: '-' };
    }
    end.setHours(0, 0, 0, 0);
    const diffTime = end.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < 0) {
      return {
        label: 'Vencida',
        badgeClass: 'vigencia-expired',
        days: Math.abs(diffDays),
        text: `Vencida há ${Math.abs(diffDays)} dia(s)`
      };
    } else if (diffDays <= 30) {
      return {
        label: 'Crítica',
        badgeClass: 'vigencia-critical',
        days: diffDays,
        text: `Vence em ${diffDays} dia(s)`
      };
    } else if (diffDays <= 60) {
      return {
        label: 'Atenção',
        badgeClass: 'vigencia-warning',
        days: diffDays,
        text: `Vence em ${diffDays} dias`
      };
    } else {
      return {
        label: 'Vigente',
        badgeClass: 'vigencia-ok',
        days: diffDays,
        text: `${diffDays} dias restantes`
      };
    }
  }

  getDataVigente(contrato: Contract): string {
    if (!contrato.dataInicio || !contrato.dataFim) return '-';
    return `${formatDatePtBr(contrato.dataInicio)} - ${formatDatePtBr(contrato.dataFim)}`;
  }

  getVigenciaPillClass(dataFim?: string): string {
    const status = this.getVigenciaStatus(dataFim);
    if (status.badgeClass === 'vigencia-expired') return 'pill-expired';
    if (status.badgeClass === 'vigencia-critical') return 'pill-urgent';
    if (status.badgeClass === 'vigencia-warning') return 'pill-warning';
    if (status.badgeClass === 'vigencia-ok') return 'pill-valid';
    return 'pill-none';
  }

  getVigenciaPillText(dataFim?: string): string {
    const status = this.getVigenciaStatus(dataFim);
    if (status.badgeClass === 'vigencia-expired') return 'Vencido';
    if (status.badgeClass === 'vigencia-critical') return `Vence em ${status.days}d`;
    if (status.badgeClass === 'vigencia-warning') return `Vence em ${status.days}d`;
    if (status.badgeClass === 'vigencia-ok') return 'Vigente';
    return '-';
  }

  getVigenciaFilterLabel(val: string): string {
    switch (val) {
      case 'VIGENTE': return 'Vigente (> 60d)';
      case 'ATENCAO': return 'Atenção (Vence em 60d)';
      case 'CRITICA': return 'Crítica (Vence em 30d)';
      case 'EM_ALERTA': return 'Em Alerta (≤ 60d)';
      case 'VENCIDO': return 'Vencido';
      case 'TODOS_VIGENTES': return 'Não Vencidos';
      default: return val;
    }
  }

  filterByVigenciaPill(dataFim?: string): void {
    if (!dataFim) return;
    const vStatus = this.getVigenciaStatus(dataFim);
    if (vStatus.badgeClass === 'vigencia-expired') {
      this.filterVigencia.set('VENCIDO');
    } else if (vStatus.badgeClass === 'vigencia-critical') {
      this.filterVigencia.set('CRITICA');
    } else if (vStatus.badgeClass === 'vigencia-warning') {
      this.filterVigencia.set('ATENCAO');
    } else if (vStatus.badgeClass === 'vigencia-ok') {
      this.filterVigencia.set('VIGENTE');
    }
    this.currentPage.set(1);
  }

  copyToClipboard(text: string, label: string): void {
    if (!text) return;
    if (navigator?.clipboard?.writeText) {
      navigator.clipboard.writeText(text).then(() => {
        this.toast.info(`${label} copiado!`);
      }).catch(() => {
        this.fallbackCopy(text, label);
      });
    } else {
      this.fallbackCopy(text, label);
    }
  }

  private fallbackCopy(text: string, label: string): void {
    try {
      const textarea = document.createElement('textarea');
      textarea.value = text;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      this.toast.info(`${label} copiado!`);
    } catch {
      this.toast.error('Não foi possível copiar');
    }
  }

  exportContracts(): void {
    const list = this.filteredContracts();
    if (!list.length) {
      this.toast.warning('Nenhum contrato para exportar com os filtros atuais.');
      return;
    }

    exportToCsv('relatorio_contratos', [
      { header: 'ID', accessor: c => c.id },
      { header: 'Número/Ano', accessor: c => `${c.numero}/${c.ano}` },
      { header: 'Tipo', accessor: c => c.tipo || 'PRODUTO' },
      { header: 'Situação', accessor: c => c.situacao || 'ATIVO' },
      { header: 'Contratado', accessor: c => c.nomeContratado || '' },
      { header: 'Data Início', accessor: c => formatDatePtBr(c.dataInicio) },
      { header: 'Data Término', accessor: c => formatDatePtBr(c.dataFim) },
      { header: 'Status Vigência', accessor: c => this.getVigenciaPillText(c.dataFim) },
      { header: 'Portaria', accessor: c => c.portariaDesignacao || '' },
      { header: 'Data Portaria', accessor: c => formatDatePtBr(c.dataDesignacao) },
      { header: 'Secretarias', accessor: c => (c.secretarias || []).map(s => s.sigla || s.nome).join(', ') },
      { header: 'Objeto', accessor: c => c.objeto || '' },
      { header: 'Observação', accessor: c => c.observacao || '' }
    ], list);

    this.toast.success(`${list.length} contrato(s) exportado(s) com sucesso!`);
  }

  printFicha(contrato: Contract | null): void {
    if (!contrato) return;
    const membros: any[] = [];
    if (contrato.equipe) {
      contrato.equipe.forEach(eq => {
        if (eq.membros && eq.membros.length > 0) {
          eq.membros.forEach(m => membros.push(m));
        } else if (eq.servidor) {
          membros.push({ funcaoNome: eq.funcao, servidorNome: eq.servidor });
        }
      });
    }

    printFichaDocumento({
      tipoDocumento: 'Contrato',
      numero: contrato.numero,
      ano: contrato.ano,
      tipo: contrato.tipo,
      situacao: contrato.situacao,
      objeto: contrato.objeto,
      nomeContratado: contrato.nomeContratado,
      dataInicio: contrato.dataInicio,
      dataFim: contrato.dataFim,
      portariaDesignacao: contrato.portariaDesignacao,
      dataDesignacao: contrato.dataDesignacao,
      observacao: contrato.observacao,
      secretarias: contrato.secretarias,
      equipe: membros
    });
  }

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

  addPessoaFilter(nome: string): void {
    const trimmed = nome.trim();
    if (!trimmed) return;
    if (!this.filterPessoas().includes(trimmed)) {
      this.filterPessoas.update(p => [...p, trimmed]);
    }
    this.pessoaInput.set('');
    this.showPessoaSuggestions.set(false);
    this.currentPage.set(1);
  }

  removePessoaFilter(nome: string): void {
    this.filterPessoas.update(p => p.filter(item => item !== nome));
    this.currentPage.set(1);
  }

  hidePessoaSuggestionsWithDelay(): void {
    setTimeout(() => {
      this.showPessoaSuggestions.set(false);
    }, 200);
  }

  clearFilters(): void {
    this.globalSearch.set('');
    this.filterAno.set('');
    this.filterTipo.set('');
    this.filterStatus.set('');
    this.filterVigencia.set('');
    this.filterSecretarias.set([]);
    this.filterPessoas.set([]);
    this.pessoaInput.set('');
    this.showPessoaSuggestions.set(false);
    this.showSecretariaDropdown.set(false);
    this.currentPage.set(1);
  }

  getSecretariaNome(id: number | ''): string {
    if (!id) return '';
    const sec = this.secretariats().find(s => s.id === Number(id));
    return sec ? (sec.sigla || sec.nome) : '';
  }

  toggleFilters(): void {
    this.showFilters.set(!this.showFilters());
  }

  openDetailsModal(contrato: Contract): void {
    this.selectedContratoForDetails.set(contrato);
    this.isDetailsModalOpen.set(true);
    this.carregarAnexos(contrato.id);
  }

  closeDetailsModal(): void {
    this.isDetailsModalOpen.set(false);
    this.selectedContratoForDetails.set(null);
    this.anexosContrato.set([]);
    this.fecharPreviewModal();
  }

  carregarAnexos(contratoId: number): void {
    this.loadingAnexos.set(true);
    this.anexoService.listarPorContrato(contratoId).subscribe({
      next: (anexos) => {
        this.anexosContrato.set(anexos || []);
        this.loadingAnexos.set(false);
      },
      error: (err) => {
        console.error('Erro ao carregar anexos do contrato:', err);
        this.loadingAnexos.set(false);
      }
    });
  }

  abrirModalUploadAnexo(): void {
    this.selectedFile.set(null);
    this.uploadTipo.set('CONTRATO_INTEGRA');
    this.uploadDescricao.set('');
    this.isUploadModalOpen.set(true);
  }

  fecharModalUploadAnexo(): void {
    this.isUploadModalOpen.set(false);
    this.selectedFile.set(null);
  }

  onFileSelected(event: any): void {
    const file = event.target?.files?.[0];
    if (file) {
      this.selectedFile.set(file);
    }
  }

  enviarAnexo(): void {
    const file = this.selectedFile();
    const contrato = this.selectedContratoForDetails();
    if (!file || !contrato) return;

    this.uploadingAnexo.set(true);
    this.anexoService.upload(file, this.uploadTipo(), this.uploadDescricao(), contrato.id).subscribe({
      next: () => {
        this.toast.success('Documento anexado com sucesso!');
        this.uploadingAnexo.set(false);
        this.fecharModalUploadAnexo();
        this.carregarAnexos(contrato.id);
      },
      error: (err) => {
        console.error('Erro ao fazer upload do anexo:', err);
        this.toast.error('Erro ao fazer upload do documento.');
        this.uploadingAnexo.set(false);
      }
    });
  }

  downloadAnexo(anexo?: DocumentoAnexo | null): void {
    if (!anexo) return;
    const url = this.anexoService.getUrlDownload(anexo.id);
    window.open(url, '_blank');
  }

  visualizarAnexo(anexo: DocumentoAnexo): void {
    this.previewAnexo.set(anexo);
    const rawUrl = this.anexoService.getUrlVisualizar(anexo.id);
    this.previewUrl.set(this.sanitizer.bypassSecurityTrustResourceUrl(rawUrl));
    this.isPreviewModalOpen.set(true);
  }

  fecharPreviewModal(): void {
    this.isPreviewModalOpen.set(false);
    this.previewAnexo.set(null);
    this.previewUrl.set(null);
  }

  abrirAnexoNovaAba(anexo?: DocumentoAnexo | null): void {
    if (!anexo) return;
    const url = this.anexoService.getUrlVisualizar(anexo.id);
    window.open(url, '_blank');
  }

  isArquivoVisualizavel(anexo?: DocumentoAnexo | null): boolean {
    if (!anexo) return false;
    const nome = (anexo.nomeOriginal || '').toLowerCase();
    const type = (anexo.contentType || '').toLowerCase();
    return (
      nome.endsWith('.pdf') ||
      nome.endsWith('.png') ||
      nome.endsWith('.jpg') ||
      nome.endsWith('.jpeg') ||
      type.includes('pdf') ||
      type.includes('image')
    );
  }

  excluirAnexo(anexo: DocumentoAnexo): void {
    if (confirm(`Tem certeza que deseja excluir o anexo "${anexo.nomeOriginal}"?`)) {
      this.anexoService.deletar(anexo.id).subscribe({
        next: () => {
          this.toast.success('Anexo excluído com sucesso!');
          const contrato = this.selectedContratoForDetails();
          if (contrato) {
            this.carregarAnexos(contrato.id);
          }
        },
        error: (err) => {
          console.error('Erro ao excluir anexo:', err);
          this.toast.error('Erro ao excluir documento anexo.');
        }
      });
    }
  }

  formatarTamanho(bytes?: number): string {
    if (!bytes || bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  }

  getTipoDocumentoLabel(tipo: string): string {
    return this.tiposDocumento[tipo] || tipo;
  }

  openCreateModal(): void {
    this.editingContrato.set(null);
    this.isEditModalOpen.set(false);
    this.modalSecretariaSearch.set('');
    this.membrosArray.clear();
    this.selectedServants.set([]);
    this.openServidorDropdownIndex.set(null);
    this.servidorSearch.set('');
    this.form.reset({
      numero: '',
      ano: new Date().getFullYear(),
      dataInicio: '',
      dataFim: '',
      tipoId: 1,
      objeto: '',
      observacao: '',
      nomeContratado: '',
      portariaDesignacao: '',
      dataDesignacao: '',
      ativoId: 1,
      secretariasIds: []
    });
    this.selectedSecretariasSet.set(new Set());
    this.isModalOpen.set(true);
  }

  openEditModal(contrato: Contract): void {
    this.editingContrato.set(contrato);
    this.isEditModalOpen.set(true);
    this.modalSecretariaSearch.set('');
    this.membrosArray.clear();
    this.selectedServants.set([]);
    this.openServidorDropdownIndex.set(null);
    this.servidorSearch.set('');

    const tipoObj = this.tiposList().find(t =>
      (t.tipoArp && contrato.tipo && t.tipoArp.trim().toUpperCase() === contrato.tipo.trim().toUpperCase()) ||
      (t.nome && contrato.tipo && t.nome.trim().toUpperCase() === contrato.tipo.trim().toUpperCase())
    );
    const activeObj = this.statusList().find(s =>
      (s.situacao && contrato.situacao && s.situacao.trim().toUpperCase() === contrato.situacao.trim().toUpperCase()) ||
      (s.nome && contrato.situacao && s.nome.trim().toUpperCase() === contrato.situacao.trim().toUpperCase())
    );

    const secIds = contrato.secretarias?.map(s => s.id) || [];
    this.selectedSecretariasSet.set(new Set(secIds));

    this.form.patchValue({
      numero: contrato.numero,
      ano: contrato.ano,
      dataInicio: contrato.dataInicio ? contrato.dataInicio.substring(0, 10) : '',
      dataFim: contrato.dataFim ? contrato.dataFim.substring(0, 10) : '',
      tipoId: tipoObj ? tipoObj.id : 1,
      objeto: contrato.objeto,
      observacao: contrato.observacao || '',
      nomeContratado: contrato.nomeContratado || '',
      portariaDesignacao: contrato.portariaDesignacao || '',
      dataDesignacao: contrato.dataDesignacao ? contrato.dataDesignacao.substring(0, 10) : '',
      ativoId: activeObj ? activeObj.id : 1,
      secretariasIds: secIds
    });

    if (contrato.equipe && contrato.equipe.length > 0) {
      contrato.equipe.forEach(eq => {
        if (eq.membros && eq.membros.length > 0) {
          eq.membros.forEach(m => {
            const sObj = this.servants().find(s => s.id === m.servidorId) || {
              id: m.servidorId,
              nome: m.servidorNome || '',
              cargo: m.servidorCargo || '',
              matricula: m.servidorMatricula ? Number(m.servidorMatricula) : 0,
              email: '',
              telefone: '',
              secretaria: '',
              situacao: 'ATIVO'
            };
            this.addMembro(m.servidorId, m.funcaoId, sObj);
          });
        }
      });
    }

    this.isModalOpen.set(true);
  }

  closeModal(): void {
    this.isModalOpen.set(false);
    this.isEditModalOpen.set(false);
    this.editingContrato.set(null);
    this.modalSecretariaSearch.set('');
    this.membrosArray.clear();
    this.selectedServants.set([]);
    this.openServidorDropdownIndex.set(null);
    this.servidorSearch.set('');
    this.form.reset();
  }

  saveContrato(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.submitting.set(true);
    const val = this.form.value;

    const membrosPayload = val.membros && val.membros.length > 0
      ? val.membros.map((m: any) => ({
          servidorId: Number(m.servidorId),
          funcaoId: Number(m.funcaoId)
        }))
      : [];

    const payload = {
      numero: Number(val.numero),
      ano: Number(val.ano),
      dataInicio: val.dataInicio,
      dataFim: val.dataFim,
      tipoId: Number(val.tipoId),
      objeto: val.objeto,
      observacao: val.observacao || '',
      nomeContratado: val.nomeContratado,
      portariaDesignacao: val.portariaDesignacao,
      dataDesignacao: val.dataDesignacao,
      ativoId: Number(val.ativoId),
      secretariasIds: val.secretariasIds || [],
      membros: membrosPayload
    };

    if (this.editingContrato()) {
      const id = this.editingContrato()!.id;
      this.contratoService.update(id, payload).subscribe({
        next: () => {
          this.toast.success('Contrato atualizado com sucesso!');
          this.submitting.set(false);
          this.closeModal();
          this.loadData();
        },
        error: () => {
          this.toast.error('Erro ao atualizar contrato.');
          this.submitting.set(false);
        }
      });
    } else {
      this.contratoService.create(payload).subscribe({
        next: () => {
          this.toast.success('Contrato cadastrado com sucesso!');
          this.submitting.set(false);
          this.closeModal();
          this.loadData();
        },
        error: () => {
          this.toast.error('Erro ao cadastrar contrato.');
          this.submitting.set(false);
        }
      });
    }
  }

  promptDelete(contrato: Contract): void {
    this.itemToDelete.set(contrato);
    this.isDeleteModalOpen.set(true);
  }

  closeDeleteModal(): void {
    this.isDeleteModalOpen.set(false);
    this.itemToDelete.set(null);
  }

  confirmDelete(): void {
    const item = this.itemToDelete();
    if (!item) return;

    this.deleting.set(true);
    this.contratoService.delete(item.id).subscribe({
      next: () => {
        this.toast.success('Contrato excluído com sucesso.');
        this.deleting.set(false);
        this.closeDeleteModal();
        this.loadData();
      },
      error: () => {
        this.toast.error('Erro ao excluir contrato.');
        this.deleting.set(false);
      }
    });
  }

  ordenarMembros(membros: any[]): any[] {
    if (!membros || membros.length === 0) return membros;

    const ordem: { [key: string]: number } = {
      'GT': 1,
      'GS': 2,
      'GESTOR TITULAR': 1,
      'GESTOR SUPLENTE': 2,
      'F': 3,
      'FISCAL': 3,
    };

    return [...membros].sort((a, b) => {
      const funcaoA = a.funcaoNome?.toUpperCase() || '';
      const funcaoB = b.funcaoNome?.toUpperCase() || '';

      const ordemA = Object.keys(ordem).find(key => funcaoA === key || funcaoA.includes(key));
      const ordemB = Object.keys(ordem).find(key => funcaoB === key || funcaoB.includes(key));

      return (ordem[ordemA || ''] || 99) - (ordem[ordemB || ''] || 99);
    });
  }
}
