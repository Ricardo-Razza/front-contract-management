import { effect, untracked } from '@angular/core';
import { Subscription } from 'rxjs';
import { DocumentoFilterOptions } from '@core/models';
import { addEquipeMember } from '@shared/components/equipe-form/equipe-form.utils';
import { ViewChild } from '@angular/core';
import { EquipeFormComponent } from '@shared/components/equipe-form/equipe-form.component';
import { AnexoManagerComponent } from '@shared/components/anexo-manager/anexo-manager.component';
import { DestroyRef as LifecycleDestroyRef, inject as lifecycleInject } from '@angular/core';
import { takeUntilDestroyed as untilComponentDestroyed } from '@angular/core/rxjs-interop';
import { Component, OnInit, inject, signal, computed, ChangeDetectionStrategy, HostListener, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, FormArray, Validators } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { HeaderComponent, ConfirmModalComponent, LoadingSkeletonComponent, PaginationComponent, OrderEquipePipe } from '@shared';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { AtaService, SecretariaService, ServidorService, LookupService, ToastService, AnexoService } from '@core/services';
import { Agreement, Secretariat, LookupItem, Servant, DocumentoAnexo, TIPOS_DOCUMENTO_LABELS } from '@core/models';
import { includesNormalized, matchesSearch, exportToCsv, printFichaDocumento, parseDateSafe, formatDatePtBr } from '@core/utils';

@Component({
  selector: 'app-atas',
  standalone: true,
  imports: [EquipeFormComponent, AnexoManagerComponent,
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    HeaderComponent,
    ConfirmModalComponent,
    LoadingSkeletonComponent,
    PaginationComponent,
    OrderEquipePipe
  ],
  templateUrl: './atas.component.html',
  styleUrls: ['./atas.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AtasComponent implements OnInit {
  @ViewChild(EquipeFormComponent) private equipeForm?: EquipeFormComponent;
  @ViewChild(AnexoManagerComponent) private anexosManager?: AnexoManagerComponent;
  private readonly requestDestroyRef = lifecycleInject(LifecycleDestroyRef);

  formatDatePtBr = formatDatePtBr;

  // ===== INJECTS =====
  private route = inject(ActivatedRoute);
  private ataService = inject(AtaService);
  private secService = inject(SecretariaService);
  private servidorService = inject(ServidorService);
  private lookupService = inject(LookupService);
  private toast = inject(ToastService);
  private fb = inject(FormBuilder);
  private elementRef = inject(ElementRef);

  // ===== DADOS =====
  agreements = signal<Agreement[]>([]);
  secretariats = signal<Secretariat[]>([]);
  tiposList = signal<LookupItem[]>([]);
  statusList = signal<LookupItem[]>([]);
  funcoesList = signal<LookupItem[]>([]);
  servants = signal<Servant[]>([]);
  servidoresList = signal<{ id: number; nome: string }[]>([]);

  // Repositório Digital de Anexos

  selectedSecretariasSet = signal<Set<number>>(new Set<number>());

  // Visualização de Anexo

  // Equipe de Ata (No Modal)

  // ===== FILTROS =====
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

  // ===== SORT & PAGINAÇÃO =====
  sortColumn = signal<string>('id');
  sortDirection = signal<'asc' | 'desc'>('desc');
  currentPage = signal<number>(1);
  pageSize = signal<number>(25);

  // ===== UI STATE =====
  loading = signal<boolean>(true);
  submitting = signal<boolean>(false);
  deleting = signal<boolean>(false);

  // ===== MODALS =====
  isModalOpen = signal<boolean>(false);
  isEditModalOpen = signal<boolean>(false);
  isDeleteModalOpen = signal<boolean>(false);
  isDetailsModalOpen = signal<boolean>(false);
  itemToDelete = signal<Agreement | null>(null);
  editingAta = signal<Agreement | null>(null);
  selectedAtaForDetails = signal<Agreement | null>(null);
  modalSecretariaSearch = signal<string>('');

  @HostListener('document:keydown.escape')
  onEscapeKey(): void {
    if (this.anexosManager?.hasOpenDialog()) {
      this.anexosManager.closeTopDialog();
    } else if (this.showSecretariaDropdown()) {
      this.showSecretariaDropdown.set(false);
    } else if (this.showPessoaSuggestions()) {
      this.showPessoaSuggestions.set(false);
    } else if (this.equipeForm && this.equipeForm.openServidorDropdownIndex() !== null) {
      this.equipeForm?.closeDropdown();
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
      this.equipeForm?.closeDropdown();
    }
  }

  // ===== FORM =====
  form: FormGroup = this.fb.group({
    numero: ['', Validators.required],
    ano: [new Date().getFullYear(), Validators.required],
    dataInicio: ['', Validators.required],
    dataFim: ['', Validators.required],
    tipoId: [1, Validators.required],
    objeto: ['', Validators.required],
    observacao: [''],
    portariaDesignacao: ['', Validators.required],
    dataDesignacao: ['', Validators.required],
    ativoId: [1, Validators.required],
    secretariasIds: [[], Validators.required],
    membros: this.fb.array([])
  });

  get membrosArray(): FormArray {
    return this.form.get('membros') as FormArray;
  }

  // ===== COMPUTED =====
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

  anosDisponiveis = computed(() => this.filterOptions().anos);

  tiposDisponiveis = computed(() => this.filterOptions().tipos);

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
    const allFilteredIds = this.filteredModalSecretarias().map(s => s.id);
    const currentSelected = this.form.get('secretariasIds')?.value || [];
    const merged = Array.from(new Set([...currentSelected, ...allFilteredIds]));
    const control = this.form.get('secretariasIds');
    control?.setValue(merged);
    this.selectedSecretariasSet.set(new Set(merged));
    control?.markAsTouched();
    control?.updateValueAndValidity();
  }

  clearAllSecretarias(): void {
    const filteredIds = new Set(this.filteredModalSecretarias().map(s => s.id));
    const currentSelected = this.form.get('secretariasIds')?.value || [];
    const remaining = currentSelected.filter((id: number) => !filteredIds.has(id));
    const control = this.form.get('secretariasIds');
    control?.setValue(remaining);
    this.selectedSecretariasSet.set(new Set(remaining));
    control?.markAsTouched();
    control?.updateValueAndValidity();
  }

  getVigenciaPercent(dataInicio?: string, dataFim?: string): number {
    if (!dataInicio || !dataFim) return 0;
    const start = parseDateSafe(dataInicio)?.getTime() ?? 0;
    const end = parseDateSafe(dataFim)?.getTime() ?? 0;
    const now = new Date().getTime();
    if (end <= start) return 100;
    if (now <= start) return 0;
    if (now >= end) return 100;
    return Math.min(100, Math.max(0, Math.round(((now - start) / (end - start)) * 100)));
  }

  private filterAgreements(list: Agreement[]) {

    const global = this.globalSearch();
    const ano = this.filterAno();
    const tipo = this.filterTipo();
    const status = this.filterStatus();
    const vigencia = this.filterVigencia();
    const selectedSecs = this.filterSecretarias();
    const selectedPessoas = this.filterPessoas();

    return list.filter(ata => {
      // 1. Busca global inteligente
      if (global) {
        const targets: (string | number | null | undefined)[] = [
          ata.numero,
          ata.ano,
          `${ata.numero}/${ata.ano}`,
          ata.objeto,
          ata.portariaDesignacao,
          ata.observacao,
          ata.tipo,
          ata.situacao
        ];
        if (ata.secretarias && ata.secretarias.length > 0) {
          for (const s of ata.secretarias) {
            targets.push(s.sigla, s.nome);
          }
        }
        if (ata.equipe && ata.equipe.length > 0) {
          for (const eq of ata.equipe as any[]) {
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

      // 2. Ano
      if (ano && ata.ano !== Number(ano)) return false;

      // 3. Tipo
      if (tipo && (ata.tipo || '').trim().toUpperCase() !== tipo.trim().toUpperCase()) return false;

      // 4. Status
      if (status) {
        const ataStatus = (ata.situacao || 'ATIVO').trim().toUpperCase();
        if (ataStatus !== status.trim().toUpperCase()) return false;
      }

      // 5. Vigência
      if (vigencia) {
        const vStatus = this.getVigenciaStatus(ata.dataFim);
        if (vigencia === 'VIGENTE' && vStatus.badgeClass !== 'vigencia-ok') return false;
        if (vigencia === 'ATENCAO' && vStatus.badgeClass !== 'vigencia-warning') return false;
        if (vigencia === 'CRITICA' && vStatus.badgeClass !== 'vigencia-critical') return false;
        if (vigencia === 'EM_ALERTA' && vStatus.badgeClass !== 'vigencia-warning' && vStatus.badgeClass !== 'vigencia-critical') return false;
        if (vigencia === 'VENCIDO' && vStatus.badgeClass !== 'vigencia-expired') return false;
        if (vigencia === 'TODOS_VIGENTES' && (vStatus.badgeClass === 'vigencia-expired' || vStatus.badgeClass === 'vigencia-unknown')) return false;
      }

      // 5. Secretarias (Multi-select)
      if (selectedSecs.length > 0) {
        const hasSecretaria = ata.secretarias?.some(s => selectedSecs.includes(s.id));
        if (!hasSecretaria) return false;
      }

      // 6. Pessoas (Multi-select)
      if (selectedPessoas.length > 0) {
        const equipes = ata.equipe || [];
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
  }

  paginatedAgreements = computed(() => this.agreements());

  // ===== LIFECYCLE =====
  ngOnInit(): void {
    this.route.queryParams.pipe(untilComponentDestroyed(this.requestDestroyRef)).subscribe(params => {
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

    this.loadLookups();
    this.loadServidores();
  }

  // ===== LOAD DATA =====
  loadData(): void {
    this.listRequest?.unsubscribe();
    this.loading.set(true);
    const query = {search:this.globalSearch(),ano:this.filterAno(),tipo:this.filterTipo(),status:this.filterStatus(),vigencia:this.filterVigencia(),secretarias:this.filterSecretarias(),pessoas:this.filterPessoas()};
    this.listRequest = this.ataService.getPage(this.currentPage()-1,this.pageSize(),[this.sortColumn()+','+this.sortDirection()],query).pipe(untilComponentDestroyed(this.requestDestroyRef)).subscribe({
      next: page => {
        this.agreements.set(page.content); this.totalRecords.set(page.totalElements); this.loading.set(false);
        const last = Math.max(1,page.totalPages); if(this.currentPage()>last) this.currentPage.set(last);
      },
      error: () => this.loading.set(false)
    });
  }

  loadLookups(): void {
    this.loadFilterOptions();
    this.secService.getAll().pipe(untilComponentDestroyed(this.requestDestroyRef)).subscribe({
      next: (items) => this.secretariats.set(items || [])
    });
    this.lookupService.getTipos().pipe(untilComponentDestroyed(this.requestDestroyRef)).subscribe({
      next: (items) => this.tiposList.set(items || [])
    });
    this.lookupService.getAtivos().pipe(untilComponentDestroyed(this.requestDestroyRef)).subscribe({
      next: (items) => this.statusList.set(items || [])
    });
    this.lookupService.getFuncoesEquipe().pipe(untilComponentDestroyed(this.requestDestroyRef)).subscribe({
      next: (items) => this.funcoesList.set(items || [])
    });
  }

  loadServidores(): void {
    this.servidorService.getAll().pipe(untilComponentDestroyed(this.requestDestroyRef)).subscribe({
      next: (data) => {
        this.servants.set(data || []);
        this.servidoresList.set((data || []).map(s => ({ id: s.id, nome: s.nome })));
      }
    });
  }

  // ============ MÉTODOS DE EQUIPE DE ATA (MODAL) ============
  addMembro(servidorId: number | string = '', funcaoId: number | string = '', servantObj: Servant | null = null): void { addEquipeMember(this.membrosArray, servidorId, funcaoId); }

  // ===== SORT & PAGINATION METHODS =====
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

  getDataVigente(ata: Agreement): string {
    if (!ata.dataInicio || !ata.dataFim) return '-';
    const di = formatDatePtBr(ata.dataInicio);
    const df = formatDatePtBr(ata.dataFim);
    return `${di} - ${df}`;
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
    navigator.clipboard.writeText(text).then(() => {
      this.toast.info(`${label} copiado!`);
    }).catch(() => {
      this.toast.error('Não foi possível copiar');
    });
  }

  exportAgreements(): void {
    this.ataService.getAll().pipe(untilComponentDestroyed(this.requestDestroyRef)).subscribe({next: data => {
    const list = this.filterAgreements(data);
    if (!list.length) {
      this.toast.warning('Nenhuma ata para exportar com os filtros atuais.');
      return;
    }

    exportToCsv('relatorio_atas', [
      { header: 'ID', accessor: a => a.id },
      { header: 'Número/Ano', accessor: a => `${a.numero}/${a.ano}` },
      { header: 'Tipo', accessor: a => a.tipo || 'PRODUTO' },
      { header: 'Situação', accessor: a => a.situacao || 'ATIVO' },
      { header: 'Data Início', accessor: a => a.dataInicio ? formatDatePtBr(a.dataInicio) : '' },
      { header: 'Data Término', accessor: a => a.dataFim ? formatDatePtBr(a.dataFim) : '' },
      { header: 'Status Vigência', accessor: a => this.getVigenciaPillText(a.dataFim) },
      { header: 'Portaria', accessor: a => a.portariaDesignacao || '' },
      { header: 'Data Portaria', accessor: a => a.dataDesignacao ? formatDatePtBr(a.dataDesignacao) : '' },
      { header: 'Secretarias', accessor: a => (a.secretarias || []).map(s => s.sigla || s.nome).join(', ') },
      { header: 'Objeto', accessor: a => a.objeto || '' },
      { header: 'Observação', accessor: a => a.observacao || '' }
    ], list);

    this.toast.success(`${list.length} ata(s) exportada(s) com sucesso!`);

    }});
  }

  printFicha(ata: Agreement | null): void {
    if (!ata) return;
    const membros: any[] = [];
    if (ata.equipe) {
      ata.equipe.forEach(eq => {
        if (eq.membros && eq.membros.length > 0) {
          eq.membros.forEach(m => membros.push(m));
        } else if (eq.servidor) {
          membros.push({ funcaoNome: eq.funcao, servidorNome: eq.servidor });
        }
      });
    }

    printFichaDocumento({
      tipoDocumento: 'Ata de Registro de Preços',
      numero: ata.numero,
      ano: ata.ano,
      tipo: ata.tipo,
      situacao: ata.situacao,
      objeto: ata.objeto,
      dataInicio: ata.dataInicio,
      dataFim: ata.dataFim,
      portariaDesignacao: ata.portariaDesignacao,
      dataDesignacao: ata.dataDesignacao,
      observacao: ata.observacao,
      secretarias: ata.secretarias,
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

  // ===== DETAILS MODAL =====
  openDetailsModal(ata: Agreement): void {
    this.selectedAtaForDetails.set(ata);
    this.isDetailsModalOpen.set(true);

  }

  closeDetailsModal(): void {
    this.isDetailsModalOpen.set(false);
    this.selectedAtaForDetails.set(null);

    this.anexosManager?.closeDialogs();
  }

  // ============ MÉTODOS DE SELEÇÃO DE SECRETARIAS ============
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
  // ============ FIM DOS MÉTODOS DE SELEÇÃO ============

  // ===== CREATE & EDIT MODALS =====
  openCreateModal(): void {
    this.editingAta.set(null);
    this.isEditModalOpen.set(false);
    this.modalSecretariaSearch.set('');
    this.membrosArray.clear();
    this.equipeForm?.closeDropdown();
    this.form.reset({
      numero: '',
      ano: new Date().getFullYear(),
      dataInicio: '',
      dataFim: '',
      tipoId: 1,
      objeto: '',
      observacao: '',
      portariaDesignacao: '',
      dataDesignacao: '',
      ativoId: 1,
      secretariasIds: []
    });
    this.selectedSecretariasSet.set(new Set());
    this.isModalOpen.set(true);
  }

  openEditModal(ata: Agreement): void {
    this.editingAta.set(ata);
    this.isEditModalOpen.set(true);
    this.modalSecretariaSearch.set('');
    this.membrosArray.clear();
    this.equipeForm?.closeDropdown();

    const ataTipoNorm = (ata.tipo || '').trim().toUpperCase();
    const tipoObj = this.tiposList().find(t =>
      (t.tipoArp && t.tipoArp.trim().toUpperCase() === ataTipoNorm) ||
      (t.nome && t.nome.trim().toUpperCase() === ataTipoNorm)
    );
    const ataSituacaoNorm = (ata.situacao || '').trim().toUpperCase();
    const activeObj = this.statusList().find(s =>
      (s.situacao && s.situacao.trim().toUpperCase() === ataSituacaoNorm) ||
      (s.nome && s.nome.trim().toUpperCase() === ataSituacaoNorm)
    );

    const secIds = ata.secretarias?.map(s => s.id) || [];
    this.selectedSecretariasSet.set(new Set(secIds));

    this.form.patchValue({
      numero: ata.numero,
      ano: ata.ano,
      dataInicio: ata.dataInicio ? ata.dataInicio.substring(0, 10) : '',
      dataFim: ata.dataFim ? ata.dataFim.substring(0, 10) : '',
      tipoId: tipoObj ? tipoObj.id : 1,
      objeto: ata.objeto,
      observacao: ata.observacao || '',
      portariaDesignacao: ata.portariaDesignacao || '',
      dataDesignacao: ata.dataDesignacao ? ata.dataDesignacao.substring(0, 10) : '',
      ativoId: activeObj ? activeObj.id : 1,
      secretariasIds: secIds
    });

    if (ata.equipe && ata.equipe.length > 0) {
      ata.equipe.forEach(eq => {
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
    this.editingAta.set(null);
    this.modalSecretariaSearch.set('');
    this.membrosArray.clear();
    this.equipeForm?.closeDropdown();
    this.form.reset();
  }

  // ===== SAVE / UPDATE =====
  saveAta(): void {
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
      portariaDesignacao: val.portariaDesignacao,
      dataDesignacao: val.dataDesignacao,
      ativoId: Number(val.ativoId),
      secretariasIds: val.secretariasIds || [],
      membros: membrosPayload
    };

    if (this.editingAta()) {
      const id = this.editingAta()!.id;
      this.ataService.update(id, payload).pipe(untilComponentDestroyed(this.requestDestroyRef)).subscribe({
        next: () => {
          this.toast.success('Ata atualizada com sucesso!');
          this.submitting.set(false);
          this.closeModal();
          this.loadData(); this.loadFilterOptions();
        },
        error: () => {

          this.submitting.set(false);
        }
      });
    } else {
      this.ataService.create(payload).pipe(untilComponentDestroyed(this.requestDestroyRef)).subscribe({
        next: () => {
          this.toast.success('Ata cadastrada com sucesso!');
          this.submitting.set(false);
          this.closeModal();
          this.loadData(); this.loadFilterOptions();
        },
        error: () => {

          this.submitting.set(false);
        }
      });
    }
  }

  // ===== DELETE =====
  promptDelete(ata: Agreement): void {
    this.itemToDelete.set(ata);
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
    this.ataService.delete(item.id).pipe(untilComponentDestroyed(this.requestDestroyRef)).subscribe({
      next: () => {
        this.toast.success('Ata excluída com sucesso.');
        this.deleting.set(false);
        this.closeDeleteModal();
        this.loadData(); this.loadFilterOptions();
      },
      error: () => {

        this.deleting.set(false);
      }
    });
  }

  ordenarMembros(membros: any[]): any[] {
    if (!membros || membros.length === 0) return [];
    return new OrderEquipePipe().transform(membros);
  }
  readonly totalRecords = signal(0);
  readonly filterOptions = signal<DocumentoFilterOptions>({anos:[],tipos:[]});
  private listRequest?: Subscription;
  private readonly refreshList = effect(() => {
    this.globalSearch(); this.filterAno(); this.filterTipo(); this.filterStatus(); this.filterVigencia(); this.filterSecretarias(); this.filterPessoas(); this.currentPage(); this.pageSize(); this.sortColumn(); this.sortDirection();
    untracked(() => this.loadData());
  });

  private loadFilterOptions(): void { this.ataService.getFilterOptions().pipe(untilComponentDestroyed(this.requestDestroyRef)).subscribe(options => this.filterOptions.set(options)); }

}
