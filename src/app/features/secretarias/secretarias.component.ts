import { Component, OnInit, inject, signal, computed, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { HeaderComponent, ConfirmModalComponent, LoadingSkeletonComponent, PaginationComponent } from '@shared';
import { SecretariaService, LookupService, ToastService } from '@core/services';
import { Secretariat, LookupItem } from '@core/models';
import { includesNormalized } from '@core/utils';

@Component({
  selector: 'app-secretarias',
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
  templateUrl: './secretarias.component.html',
  styleUrls: ['./secretarias.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class SecretariasComponent implements OnInit {
  private secService = inject(SecretariaService);
  private lookupService = inject(LookupService);
  private toast = inject(ToastService);
  private fb = inject(FormBuilder);

  secretariats = signal<Secretariat[]>([]);
  statusList = signal<LookupItem[]>([]);
  searchTerm = signal<string>('');

  // Sort & Pagination
  sortColumn = signal<string>('nome');
  sortDirection = signal<'asc' | 'desc'>('asc');
  currentPage = signal<number>(1);
  pageSize = signal<number>(10);

  loading = signal<boolean>(true);
  submitting = signal<boolean>(false);
  deleting = signal<boolean>(false);

  isModalOpen = signal<boolean>(false);
  isDeleteModalOpen = signal<boolean>(false);
  editingId = signal<number | null>(null);
  itemToDelete = signal<Secretariat | null>(null);

  form: FormGroup = this.fb.group({
    nome: ['', Validators.required],
    sigla: ['', Validators.required],
    ativoId: [1, Validators.required]
  });

  filteredSecretariats = computed(() => {
    const term = this.searchTerm();
    if (!term) return this.secretariats();

    return this.secretariats().filter(s =>
      includesNormalized(s.nome, term) ||
      includesNormalized(s.sigla, term)
    );
  });

  sortedSecretariats = computed(() => {
    const list = [...this.filteredSecretariats()];
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

  paginatedSecretariats = computed(() => {
    const sorted = this.sortedSecretariats();
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
    this.secService.getAll().subscribe({
      next: (data) => {
        this.secretariats.set(data || []);
        this.loading.set(false);
      },
      error: () => {
        this.toast.error('Erro ao carregar lista de secretarias.');
        this.loading.set(false);
      }
    });
  }

  loadLookups(): void {
    this.lookupService.getAtivos().subscribe({
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
    this.form.reset({ nome: '', sigla: '', ativoId: 1 });
    this.isModalOpen.set(true);
  }

  openEditModal(item: Secretariat): void {
    this.editingId.set(item.id);
    const activeObj = this.statusList().find(s => s.situacao === item.situacao || s.nome === item.situacao);
    this.form.patchValue({
      nome: item.nome,
      sigla: item.sigla,
      ativoId: activeObj ? activeObj.id : 1
    });
    this.isModalOpen.set(true);
  }

  closeModal(): void {
    this.isModalOpen.set(false);
    this.form.reset();
  }

  save(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.submitting.set(true);
    const val = { ...this.form.value };
    val.sigla = val.sigla ? val.sigla.toUpperCase().trim() : '';
    val.nome = val.nome ? val.nome.trim() : '';

    const id = this.editingId();
    if (id) {
      this.secService.update(id, val).subscribe({
        next: () => {
          this.toast.success('Secretaria atualizada com sucesso!');
          this.submitting.set(false);
          this.closeModal();
          this.loadData();
        },
        error: () => {
          this.toast.error('Erro ao atualizar secretaria.');
          this.submitting.set(false);
        }
      });
    } else {
      this.secService.create(val).subscribe({
        next: () => {
          this.toast.success('Secretaria cadastrada com sucesso!');
          this.submitting.set(false);
          this.closeModal();
          this.loadData();
        },
        error: () => {
          this.toast.error('Erro ao criar secretaria.');
          this.submitting.set(false);
        }
      });
    }
  }

  promptDelete(item: Secretariat): void {
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
    this.secService.delete(item.id).subscribe({
      next: () => {
        this.toast.success('Secretaria excluída com sucesso.');
        this.deleting.set(false);
        this.closeDeleteModal();
        this.loadData();
      },
      error: () => {
        this.toast.error('Erro ao excluir secretaria.');
        this.deleting.set(false);
      }
    });
  }
}
