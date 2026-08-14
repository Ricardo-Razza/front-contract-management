import { Component, OnInit, inject, signal, computed, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { HeaderComponent, ConfirmModalComponent, LoadingSkeletonComponent, PhonePipe, PhoneMaskDirective, PaginationComponent } from '@shared';
import { ServidorService, SecretariaService, LookupService, ToastService } from '@core/services';
import { Servant, Secretariat, LookupItem } from '@core/models';
import { includesNormalized } from '@core/utils';

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
  private servService = inject(ServidorService);
  private secService = inject(SecretariaService);
  private lookupService = inject(LookupService);
  private toast = inject(ToastService);
  private fb = inject(FormBuilder);

  servants = signal<Servant[]>([]);
  secretariats = signal<Secretariat[]>([]);
  statusList = signal<LookupItem[]>([]);

  searchTerm = signal<string>('');
  selectedSecretariatFilter = signal<string>('');
  selectedStatusFilter = signal<string>('');

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
  itemToDelete = signal<Servant | null>(null);

  form: FormGroup = this.fb.group({
    nome: ['', Validators.required],
    cargo: ['', Validators.required],
    matricula: ['', Validators.required],
    email: ['', [Validators.email]],
    telefone: [''],
    secretariaId: ['', Validators.required],
    ativoId: [1, Validators.required]
  });

  filteredServants = computed(() => {
    let result = this.servants();
    const term = this.searchTerm();
    const secFilter = this.selectedSecretariatFilter();
    const statusFilter = this.selectedStatusFilter();

    if (term) {
      result = result.filter(s =>
        includesNormalized(s.nome, term) ||
        includesNormalized(s.matricula, term) ||
        includesNormalized(s.cargo, term) ||
        includesNormalized(s.email, term)
      );
    }

    if (secFilter) {
      result = result.filter(s => s.secretaria === secFilter);
    }

    if (statusFilter) {
      result = result.filter(s => s.situacao === statusFilter);
    }

    return result;
  });

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
    this.servService.getAll().subscribe({
      next: (data) => {
        this.servants.set(data || []);
        this.loading.set(false);
      },
      error: () => {
        this.toast.error('Erro ao carregar lista de servidores.');
        this.loading.set(false);
      }
    });
  }

  loadLookups(): void {
    this.secService.getAll().subscribe({
      next: (items) => this.secretariats.set(items || [])
    });

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
    this.form.reset({
      nome: '',
      cargo: '',
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
    const activeObj = this.statusList().find(s => s.situacao === item.situacao || s.nome === item.situacao);

    this.form.patchValue({
      nome: item.nome,
      cargo: item.cargo,
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
    this.form.reset();
  }

  save(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.submitting.set(true);
    const val = { ...this.form.value };
    val.telefone = val.telefone.replace(/\D/g, '');

    const id = this.editingId();
    if (id) {
      this.servService.update(id, val).subscribe({
        next: () => {
          this.toast.success('Servidor atualizado com sucesso!');
          this.submitting.set(false);
          this.closeModal();
          this.loadData();
        },
        error: () => {
          this.toast.error('Erro ao atualizar servidor.');
          this.submitting.set(false);
        }
      });
    } else {
      this.servService.create(val).subscribe({
        next: () => {
          this.toast.success('Servidor cadastrado com sucesso!');
          this.submitting.set(false);
          this.closeModal();
          this.loadData();
        },
        error: () => {
          this.toast.error('Erro ao criar servidor.');
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
    this.servService.delete(item.id).subscribe({
      next: () => {
        this.toast.success('Servidor excluído com sucesso.');
        this.deleting.set(false);
        this.closeDeleteModal();
        this.loadData();
      },
      error: () => {
        this.toast.error('Erro ao excluir servidor.');
        this.deleting.set(false);
      }
    });
  }
}
