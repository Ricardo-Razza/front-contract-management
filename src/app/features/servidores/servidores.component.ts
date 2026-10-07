import { DestroyRef as LifecycleDestroyRef, inject as lifecycleInject } from '@angular/core';
import { takeUntilDestroyed as untilComponentDestroyed } from '@angular/core/rxjs-interop';
import { Component, OnInit, inject, signal, computed, ChangeDetectionStrategy, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { HeaderComponent, ConfirmModalComponent, LoadingSkeletonComponent, PhonePipe, PhoneMaskDirective, PaginationComponent } from '@shared';
import { ServidorService, SecretariaService, LookupService, ToastService } from '@core/services';
import { Servant, Secretariat, LookupItem } from '@core/models';
import { includesNormalized, matchesSearch, exportToCsv } from '@core/utils';

@Component({
  selector: 'app-servidores',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    HeaderComponent,
    ConfirmModalComponent,
    LoadingSkeletonComponent,
    PhonePipe,
    PhoneMaskDirective,
    PaginationComponent
  ],
  templateUrl: './servidores.component.html',
  styleUrls: ['./servidores.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ServidoresComponent implements OnInit {
  private readonly requestDestroyRef = lifecycleInject(LifecycleDestroyRef);

  private servService = inject(ServidorService);
  private secService = inject(SecretariaService);
  private lookupService = inject(LookupService);
  private toast = inject(ToastService);
  private fb = inject(FormBuilder);

  servants = signal<Servant[]>([]);
  secretariats = signal<Secretariat[]>([]);
  statusList = signal<LookupItem[]>([]);

  searchTerm = signal<string>('');
  filterSecretarias = signal<number[]>([]);
  showSecretariaDropdown = signal<boolean>(false);
  secretariaFilterSearch = signal<string>('');
  selectedStatusFilter = signal<string>('');

  @HostListener('document:keydown.escape')
  onEscapeKey(): void {
    if (this.isModalOpen()) {
      this.closeModal();
    } else if (this.isDeleteModalOpen()) {
      this.closeDeleteModal();
    } else if (this.showSecretariaDropdown()) {
      this.showSecretariaDropdown.set(false);
    }
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    const target = event.target as HTMLElement;
    if (!target.closest('.custom-multiselect')) {
      this.showSecretariaDropdown.set(false);
    }
  }

  // Sort & Pagination
  sortColumn = signal<string>('nome');
  sortDirection = signal<'asc' | 'desc'>('asc');
  currentPage = signal<number>(1);
  pageSize = signal<number>(25);

  loading = signal<boolean>(true);
  submitting = signal<boolean>(false);
  deleting = signal<boolean>(false);

  isModalOpen = signal<boolean>(false);
  isDeleteModalOpen = signal<boolean>(false);
  editingId = signal<number | null>(null);
  itemToDelete = signal<Servant | null>(null);

  form: FormGroup = this.fb.group({
    nome: ['', Validators.required],
    cargo: ['', Validators.required],
    setor: [''],
    matricula: ['', Validators.required],
    email: ['', [Validators.email]],
    telefone: [''],
    secretariaId: ['', Validators.required],
    ativoId: [1, Validators.required]
  });

  filteredSecretariasForFilter = computed(() => {
    const search = this.secretariaFilterSearch().trim();
    const list = this.secretariats();
    if (!search) return list;
    return list.filter(sec => matchesSearch([sec.sigla, sec.nome], search));
  });

  filteredServants = computed(() => {
    let result = this.servants();
    const term = this.searchTerm();
    const selectedSecs = this.filterSecretarias();
    const statusFilter = this.selectedStatusFilter();

    if (term) {
      result = result.filter(s =>
        matchesSearch([s.nome, s.matricula, s.cargo, s.email, s.telefone, s.secretaria], term)
      );
    }

    if (selectedSecs.length > 0) {
      result = result.filter(s => {
        if (s.secretariaId && selectedSecs.includes(s.secretariaId)) return true;
        return selectedSecs.some(id => {
          const sec = this.secretariats().find(sc => sc.id === id);
          if (!sec) return false;
          const sSec = (s.secretaria || s.secretariaNome || s.secretariaSigla || '').toLowerCase().trim();
          return sSec === sec.nome.toLowerCase().trim() || (sec.sigla && sSec === sec.sigla.toLowerCase().trim());
        });
      });
    }

    if (statusFilter) {
      result = result.filter(s => {
        if (!s.situacao) return false;
        return s.situacao.trim().toUpperCase() === statusFilter.trim().toUpperCase();
      });
    }

    return result;
  });

  hasActiveFilters = computed(() => {
    return !!(this.searchTerm() || this.filterSecretarias().length > 0 || this.selectedStatusFilter());
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

  clearFilters(): void {
    this.searchTerm.set('');
    this.filterSecretarias.set([]);
    this.showSecretariaDropdown.set(false);
    this.selectedStatusFilter.set('');
    this.currentPage.set(1);
  }

  exportServants(): void {
    const list = this.filteredServants();
    if (!list.length) {
      this.toast.warning('Nenhum servidor para exportar com os filtros atuais.');
      return;
    }

    exportToCsv('relatorio_servidores', [
      { header: 'ID', accessor: s => s.id },
      { header: 'Nome Completo', accessor: s => s.nome },
      { header: 'Matrícula', accessor: s => s.matricula },
      { header: 'Cargo / Função', accessor: s => s.cargo },
      { header: 'Secretaria', accessor: s => s.secretaria || '' },
      { header: 'E-mail', accessor: s => s.email || '' },
      { header: 'Telefone', accessor: s => s.telefone || '' },
      { header: 'Situação', accessor: s => s.situacao || 'ATIVO' }
    ], list);

    this.toast.success(`${list.length} servidor(es) exportado(s) com sucesso!`);
  }

  sortedServants = computed(() => {
    const list = [...this.filteredServants()];
    const col = this.sortColumn();
    const dir = this.sortDirection();
    const multiplier = dir === 'asc' ? 1 : -1;

    return list.sort((a: any, b: any) => {
      const valA = a[col];
      const valB = b[col];

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

  paginatedServants = computed(() => {
    const sorted = this.sortedServants();
    const page = this.currentPage();
    const size = this.pageSize();
    const startIndex = (page - 1) * size;
    return sorted.slice(startIndex, startIndex + size);
  });

  ngOnInit(): void {
    this.loadData();
    this.loadLookups();
  }

  loadData(): void {
    this.loading.set(true);
    this.servService.getAll().pipe(untilComponentDestroyed(this.requestDestroyRef)).subscribe({
      next: (data) => {
        this.servants.set(data || []);
        this.loading.set(false);
      },
      error: () => {

        this.loading.set(false);
      }
    });
  }

  loadLookups(): void {
    this.secService.getAll().pipe(untilComponentDestroyed(this.requestDestroyRef)).subscribe({
      next: (items) => this.secretariats.set(items || [])
    });

    this.lookupService.getAtivos().pipe(untilComponentDestroyed(this.requestDestroyRef)).subscribe({
      next: (items) => this.statusList.set(items || [])
    });
  }

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

  openCreateModal(): void {
    this.editingId.set(null);
    this.form.reset({
      nome: '',
      cargo: '',
      setor: '',
      matricula: '',
      email: '',
      telefone: '',
      secretariaId: '',
      ativoId: 1
    });
    this.isModalOpen.set(true);
  }

  openEditModal(item: Servant): void {
    this.editingId.set(item.id);
    const matchedSec = this.secretariats().find(s => s.nome === item.secretaria || s.sigla === item.secretaria);
    const activeObj = this.statusList().find(s =>
      (s.situacao && item.situacao && s.situacao.trim().toUpperCase() === item.situacao.trim().toUpperCase()) ||
      (s.nome && item.situacao && s.nome.trim().toUpperCase() === item.situacao.trim().toUpperCase())
    );

    this.form.patchValue({
      nome: item.nome,
      cargo: item.cargo,
      setor: item.setor || '',
      matricula: item.matricula,
      email: item.email || '',
      telefone: item.telefone || '',
      secretariaId: matchedSec ? matchedSec.id : '',
      ativoId: activeObj ? activeObj.id : 1
    });
    this.isModalOpen.set(true);
  }

  closeModal(): void {
    this.isModalOpen.set(false);
    this.editingId.set(null);
    this.form.reset();
  }

  save(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.submitting.set(true);
    const val = { ...this.form.value };
    if (val.telefone) {
      val.telefone = String(val.telefone).replace(/\D/g, '');
    } else {
      val.telefone = '';
    }
    if (val.matricula) {
      val.matricula = Number(val.matricula);
    }
    if (val.secretariaId) {
      val.secretariaId = Number(val.secretariaId);
    }
    if (val.ativoId) {
      val.ativoId = Number(val.ativoId);
    }

    const id = this.editingId();
    if (id) {
      this.servService.update(id, val).pipe(untilComponentDestroyed(this.requestDestroyRef)).subscribe({
        next: () => {
          this.toast.success('Servidor atualizado com sucesso!');
          this.submitting.set(false);
          this.closeModal();
          this.loadData();
        },
        error: () => {

          this.submitting.set(false);
        }
      });
    } else {
      this.servService.create(val).pipe(untilComponentDestroyed(this.requestDestroyRef)).subscribe({
        next: () => {
          this.toast.success('Servidor cadastrado com sucesso!');
          this.submitting.set(false);
          this.closeModal();
          this.loadData();
        },
        error: () => {

          this.submitting.set(false);
        }
      });
    }
  }

  promptDelete(item: Servant): void {
    this.itemToDelete.set(item);
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
    this.servService.delete(item.id).pipe(untilComponentDestroyed(this.requestDestroyRef)).subscribe({
      next: () => {
        this.toast.success('Servidor excluído com sucesso.');
        this.deleting.set(false);
        this.closeDeleteModal();
        this.loadData();
      },
      error: () => {

        this.deleting.set(false);
      }
    });
  }
}
