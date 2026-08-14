import { Component, OnInit, inject, signal, computed, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { HeaderComponent, ConfirmModalComponent, LoadingSkeletonComponent, PaginationComponent } from '@shared';
import { EquipeService, AtaService, ServidorService, LookupService, ToastService } from '@core/services';
import { ContractTeam, Agreement, Servant, LookupItem } from '@core/models';
import { includesNormalized } from '@core/utils';

@Component({
  selector: 'app-equipes',
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
  templateUrl: './equipes.component.html',
  styleUrls: ['./equipes.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class EquipesComponent implements OnInit {
  private equipeService = inject(EquipeService);
  private ataService = inject(AtaService);
  private servService = inject(ServidorService);
  private lookupService = inject(LookupService);
  private toast = inject(ToastService);
  private fb = inject(FormBuilder);

  teams = signal<ContractTeam[]>([]);
  agreements = signal<Agreement[]>([]);
  servants = signal<Servant[]>([]);
  funcoesList = signal<LookupItem[]>([]);
  statusList = signal<LookupItem[]>([]);

  searchTerm = signal<string>('');

  // Sort & Pagination
  sortColumn = signal<string>('servidor');
  sortDirection = signal<'asc' | 'desc'>('asc');
  currentPage = signal<number>(1);
  pageSize = signal<number>(10);

  loading = signal<boolean>(true);
  submitting = signal<boolean>(false);
  deleting = signal<boolean>(false);

  isModalOpen = signal<boolean>(false);
  isDeleteModalOpen = signal<boolean>(false);
  itemToDelete = signal<ContractTeam | null>(null);

  form: FormGroup = this.fb.group({
    agreementId: ['', Validators.required],
    servantId: ['', Validators.required],
    functionId: ['', Validators.required],
    activeId: [1, Validators.required]
  });

  ngOnInit(): void {
    this.loadData();
    this.loadLookups();
  }

  loadData(): void {
    this.loading.set(true);
    this.equipeService.getAll().subscribe({
      next: (data) => {
        this.teams.set(data || []);
        this.loading.set(false);
      },
      error: () => {
        this.toast.error('Erro ao carregar equipes de contrato.');
        this.loading.set(false);
      }
    });
  }

  loadLookups(): void {
    this.ataService.getAll().subscribe({
      next: (items) => this.agreements.set(items || [])
    });

    this.servService.getAll().subscribe({
      next: (items) => this.servants.set(items || [])
    });

    this.lookupService.getFuncoesEquipe().subscribe({
      next: (items) => this.funcoesList.set(items || [])
    });

    this.lookupService.getAtivos().subscribe({
      next: (items) => this.statusList.set(items || [])
    });
  }

  filteredTeams = computed(() => {
    const term = this.searchTerm();
    if (!term) return this.teams();

    return this.teams().filter(t =>
      includesNormalized(t.ata, term) ||
      includesNormalized(t.servidor, term) ||
      includesNormalized(t.funcao, term)
    );
  });

  sortedTeams = computed(() => {
    const list = [...this.filteredTeams()];
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

  paginatedTeams = computed(() => {
    const sorted = this.sortedTeams();
    const page = this.currentPage();
    const size = this.pageSize();
    const startIndex = (page - 1) * size;
    return sorted.slice(startIndex, startIndex + size);
  });

  openCreateModal(): void {
    this.form.reset({
      agreementId: '',
      servantId: '',
      functionId: '',
      activeId: 1
    });
    this.isModalOpen.set(true);
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
    const val = this.form.value;

    const payload = {
      ataId: Number(val.agreementId),
      agreementId: Number(val.agreementId),
      servidorId: Number(val.servantId),
      servantId: Number(val.servantId),
      funcaoId: Number(val.functionId),
      functionId: Number(val.functionId),
      ativoId: Number(val.activeId),
      activeId: Number(val.activeId)
    };

    this.equipeService.create(payload).subscribe({
      next: () => {
        this.toast.success('Designação cadastrada com sucesso!');
        this.submitting.set(false);
        this.closeModal();
        this.loadData();
      },
      error: () => {
        this.toast.error('Erro ao cadastrar equipe de contrato.');
        this.submitting.set(false);
      }
    });
  }

  promptDelete(item: ContractTeam): void {
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
    this.equipeService.delete(item.id).subscribe({
      next: () => {
        this.toast.success('Designação excluída com sucesso.');
        this.deleting.set(false);
        this.closeDeleteModal();
        this.loadData();
      },
      error: () => {
        this.toast.error('Erro ao excluir designação.');
        this.deleting.set(false);
      }
    });
  }
}
