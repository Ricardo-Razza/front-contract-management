import { Component, OnInit, inject, signal, computed, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { HeaderComponent, ConfirmModalComponent, LoadingSkeletonComponent, PaginationComponent } from '@shared';
import { AtaService, SecretariaService, ServidorService, LookupService, ToastService } from '@core/services';
import { Agreement, Secretariat, LookupItem } from '@core/models';
import { includesNormalized, normalizeText } from '@core/utils';

@Component({
  selector: 'app-atas',
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
  templateUrl: './atas.component.html',
  styleUrls: ['./atas.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AtasComponent implements OnInit {
  // ===== INJECTS =====
  private ataService = inject(AtaService);
  private secService = inject(SecretariaService);
  private servidorService = inject(ServidorService);
  private lookupService = inject(LookupService);
  private toast = inject(ToastService);
  private fb = inject(FormBuilder);

  isMenuOpen = signal(true);

  toggleMenu() {
    this.isMenuOpen.update(value => !value);
  }

  // ===== DADOS =====
  agreements = signal<Agreement[]>([]);
  secretariats = signal<Secretariat[]>([]);
  tiposList = signal<LookupItem[]>([]);
  statusList = signal<LookupItem[]>([]);
  servidoresList = signal<{ id: number; nome: string }[]>([]);

  // ===== FILTROS =====
  showFilters = signal(false);
  globalSearch = signal<string>('');
  filterAno = signal<string>('');
  filterTipo = signal<string>('');
  filterStatus = signal<string>('');
  filterSecretaria = signal<number | ''>('');
  filterPessoa = signal<string>('');
  showPessoaSuggestions = signal<boolean>(false);

  // ===== SORT & PAGINAÇÃO =====
  sortColumn = signal<string>('id');
  sortDirection = signal<'asc' | 'desc'>('desc');
  currentPage = signal<number>(1);
  pageSize = signal<number>(10);

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
    secretariasIds: [[], Validators.required]
  });

  // ===== COMPUTED =====
  activeFiltersCount = computed(() => {
    let count = 0;
    if (this.globalSearch()) count++;
    if (this.filterAno()) count++;
    if (this.filterTipo()) count++;
    if (this.filterStatus()) count++;
    if (this.filterSecretaria()) count++;
    if (this.filterPessoa()) count++;
    return count;
  });

  anosDisponiveis = computed(() => {
    const anos = new Set<number>();
    this.agreements().forEach(a => anos.add(a.ano));
    return Array.from(anos).sort((a, b) => b - a);
  });

  filteredServidoresSuggestions = computed(() => {
    const search = this.filterPessoa();
    const list = this.servidoresList();
    if (!search || !search.trim()) {
      return list.slice(0, 8);
    }
    return list
      .filter(s => includesNormalized(s.nome, search))
      .slice(0, 8);
  });

  filteredAgreements = computed(() => {
    let list = this.agreements();

    const global = this.globalSearch();
    const ano = this.filterAno();
    const tipo = this.filterTipo();
    const status = this.filterStatus();
    const secId = this.filterSecretaria();
    const pessoa = this.filterPessoa();

    return list.filter(ata => {
      // 1. Busca global
      if (global) {
        const match =
          includesNormalized(ata.numero, global) ||
          includesNormalized(ata.ano, global) ||
          includesNormalized(ata.objeto, global) ||
          includesNormalized(ata.portariaDesignacao, global) ||
          includesNormalized(ata.observacao, global);
        if (!match) return false;
      }

      // 2. Ano
      if (ano && ata.ano !== Number(ano)) return false;

      // 3. Tipo
      if (tipo && ata.tipo !== tipo) return false;

      // 4. Status
      if (status) {
        const ataStatus = ata.situacao || 'ATIVO';
        if (ataStatus !== status) return false;
      }

      // 5. Secretaria
      if (secId) {
        const secIdNumber = Number(secId);
        const hasSecretaria = ata.secretarias?.some(s => s.id === secIdNumber);
        if (!hasSecretaria) return false;
      }


      if (pessoa) {
        const equipes = ata.equipe || [];
        const hasPessoa = equipes.some((eq: any) => {
          if (eq.membros && eq.membros.length > 0) {
            return eq.membros.some((m: any) => includesNormalized(m.servidorNome || '', pessoa));
          }
          return includesNormalized(eq.servidor || '', pessoa);
        });
        if (!hasPessoa) return false;
      }

      return true;
    });
  });

  sortedAgreements = computed(() => {
    const list = [...this.filteredAgreements()];
    const col = this.sortColumn();
    const dir = this.sortDirection();
    const multiplier = dir === 'asc' ? 1 : -1;

    return list.sort((a: any, b: any) => {
      let valA = a[col];
      let valB = b[col];

      if (col === 'numero') {
        // Sort by ano first, then numero
        if (a.ano !== b.ano) return (a.ano - b.ano) * multiplier;
        return (Number(a.numero) - Number(b.numero)) * multiplier;
      }

      if (col === 'vigencia') {
        valA = a.dataFim ? new Date(a.dataFim).getTime() : 0;
        valB = b.dataFim ? new Date(b.dataFim).getTime() : 0;
        return (valA - valB) * multiplier;
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

  paginatedAgreements = computed(() => {
    const sorted = this.sortedAgreements();
    const page = this.currentPage();
    const size = this.pageSize();
    const startIndex = (page - 1) * size;
    return sorted.slice(startIndex, startIndex + size);
  });

  // ===== LIFECYCLE =====
  ngOnInit(): void {
    this.loadData();
    this.loadLookups();
    this.loadServidores();
  }

  // ===== LOAD DATA =====
  loadData(): void {
    this.loading.set(true);
    this.ataService.getAll().subscribe({
      next: (data) => {
        this.agreements.set(data || []);
        this.loading.set(false);
      },
      error: () => {
        this.toast.error('Erro ao carregar atas.');
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
  }

  loadServidores(): void {
    this.servidorService.getAll().subscribe({
      next: (data) => {
        this.servidoresList.set(data.map(s => ({ id: s.id, nome: s.nome })));
      }
    });
  }

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
    const end = new Date(dataFimStr);
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
    const di = new Date(ata.dataInicio).toLocaleDateString('pt-BR');
    const df = new Date(ata.dataFim).toLocaleDateString('pt-BR');
    return `${di} - ${df}`;
  }

  // ===== AUTOCOMPLETE SUGGESTIONS =====
  selectPessoaSuggestion(nome: string): void {
    this.filterPessoa.set(nome);
    this.showPessoaSuggestions.set(false);
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
    this.filterSecretaria.set('');
    this.filterPessoa.set('');
    this.showPessoaSuggestions.set(false);
    this.currentPage.set(1);
  }

  getSecretariaNome(id: number): string {
    const sec = this.secretariats().find(s => s.id === id);
    return sec ? `${sec.sigla} - ${sec.nome}` : '';
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
  }

  // ============ MÉTODOS DE SELEÇÃO DE SECRETARIAS ============
  isSecretariaSelected(secretariaId: number): boolean {
    const ids = this.form.get('secretariasIds')?.value || [];
    return ids.includes(secretariaId);
  }

  toggleSecretaria(secretariaId: number): void {
    const control = this.form.get('secretariasIds');
    if (!control) return;

    const currentValue = control.value || [];
    const index = currentValue.indexOf(secretariaId);

    if (index === -1) {
      control.setValue([...currentValue, secretariaId]);
    } else {
      control.setValue(currentValue.filter((id: number) => id !== secretariaId));
    }

    control.markAsTouched();
    control.updateValueAndValidity();
  }
  // ============ FIM DOS MÉTODOS DE SELEÇÃO ============

  // ===== CREATE & EDIT MODALS =====
  openCreateModal(): void {
    this.editingAta.set(null);
    this.isEditModalOpen.set(false);
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
    this.isModalOpen.set(true);
  }

  openEditModal(ata: Agreement): void {
    this.editingAta.set(ata);
    this.isEditModalOpen.set(true);

    const tipoObj = this.tiposList().find(t => t.tipoArp === ata.tipo || t.nome === ata.tipo);
    const activeObj = this.statusList().find(s => s.situacao === ata.situacao || s.nome === ata.situacao);

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
      secretariasIds: ata.secretarias?.map(s => s.id) || []
    });

    this.isModalOpen.set(true);
  }

  closeModal(): void {
    this.isModalOpen.set(false);
    this.isEditModalOpen.set(false);
    this.editingAta.set(null);
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
      secretariasIds: val.secretariasIds || []
    };

    if (this.editingAta()) {
      const id = this.editingAta()!.id;
      this.ataService.update(id, payload).subscribe({
        next: () => {
          this.toast.success('Ata atualizada com sucesso!');
          this.submitting.set(false);
          this.closeModal();
          this.loadData();
        },
        error: () => {
          this.toast.error('Erro ao atualizar ata.');
          this.submitting.set(false);
        }
      });
    } else {
      this.ataService.create(payload).subscribe({
        next: () => {
          this.toast.success('Ata cadastrada com sucesso!');
          this.submitting.set(false);
          this.closeModal();
          this.loadData();
        },
        error: () => {
          this.toast.error('Erro ao cadastrar ata.');
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
    this.ataService.delete(item.id).subscribe({
      next: () => {
        this.toast.success('Ata excluída com sucesso.');
        this.deleting.set(false);
        this.closeDeleteModal();
        this.loadData();
      },
      error: () => {
        this.toast.error('Erro ao excluir ata.');
        this.deleting.set(false);
      }
    });
  }

  ordenarMembros(membros: any[]): any[] {
    if (!membros || membros.length === 0) return membros;

    const ordem: { [key: string]: number } = {
      'GT': 1,
      'GS': 2,
      'F': 3,
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