// src/app/features/atas/atas.component.ts
import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { HeaderComponent } from '../../shared/components/header/header.component';
import { ConfirmModalComponent } from '../../shared/components/confirm-modal/confirm-modal.component';
import { LoadingSkeletonComponent } from '../../shared/components/loading-skeleton/loading-skeleton.component';
import { AtaService } from '../../core/services/ata.service';
import { SecretariaService } from '../../core/services/secretaria.service';
import { ServidorService } from '../../core/services/servidor.service';
import { LookupService } from '../../core/services/lookup.service';
import { ToastService } from '../../core/services/toast.service';
import { Agreement, Secretariat, LookupItem } from '../../core/models/api.models';

@Component({
  selector: 'app-atas',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    HeaderComponent,
    ConfirmModalComponent,
    LoadingSkeletonComponent
  ],
  templateUrl: './atas.component.html',
  styleUrls: ['./atas.component.scss']
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

  // ===== UI STATE =====
  loading = signal<boolean>(true);
  submitting = signal<boolean>(false);
  deleting = signal<boolean>(false);
  selectedSecretariatIds = signal<number[]>([]);

  // ===== MODALS =====
  isModalOpen = signal<boolean>(false);
  isEditModalOpen = signal<boolean>(false);
  isDeleteModalOpen = signal<boolean>(false);
  itemToDelete = signal<Agreement | null>(null);
  editingAta = signal<Agreement | null>(null);

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
    ativoId: [1, Validators.required]
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

  // ===== FILTERS =====
  filteredAgreements(): Agreement[] {
    let list = this.agreements();

    const global = this.globalSearch().toLowerCase().trim();
    const ano = this.filterAno();
    const tipo = this.filterTipo();
    const status = this.filterStatus();
    const secId = this.filterSecretaria();
    const pessoa = this.filterPessoa().toLowerCase().trim();

    return list.filter(ata => {
      // 1. Busca global
      if (global) {
        const match =
          ata.numero.toString().includes(global) ||
          ata.ano.toString().includes(global) ||
          ata.objeto?.toLowerCase().includes(global) ||
          ata.portariaDesignacao?.toLowerCase().includes(global) ||
          ata.observacao?.toLowerCase().includes(global);
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

      // 6. Pessoa vinculada
      if (pessoa) {
        const equipe = ata.equipe || [];
        const hasPessoa = equipe.some(m => 
          m.servidor?.toLowerCase().includes(pessoa)
        );
        if (!hasPessoa) return false;
      }

      return true;
    });
  }

  clearFilters(): void {
    this.globalSearch.set('');
    this.filterAno.set('');
    this.filterTipo.set('');
    this.filterStatus.set('');
    this.filterSecretaria.set('');
    this.filterPessoa.set('');
  }

  getSecretariaNome(id: number): string {
    const sec = this.secretariats().find(s => s.id === id);
    return sec ? `${sec.sigla} - ${sec.nome}` : '';
  }

  toggleFilters(): void {
    this.showFilters.set(!this.showFilters());
  }

  // ===== MODALS =====
  openCreateModal(): void {
    this.selectedSecretariatIds.set([]);
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
      ativoId: 1
    });
    this.isModalOpen.set(true);
  }

  closeModal(): void {
    this.isModalOpen.set(false);
    this.form.reset();
  }

  openEditModal(ata: Agreement): void {
    this.editingAta.set(ata);
    this.form.patchValue({
      numero: ata.numero,
      ano: ata.ano,
      dataInicio: ata.dataInicio,
      dataFim: ata.dataFim,
      tipoId: this.getTipoIdByNome(ata.tipo),
      objeto: ata.objeto,
      observacao: ata.observacao || '',
      portariaDesignacao: ata.portariaDesignacao || '',
      dataDesignacao: ata.dataDesignacao || '',
      ativoId: ata.situacao === 'ATIVO' ? 1 : 2
    });
    this.selectedSecretariatIds.set(ata.secretarias.map(s => s.id));
    this.isEditModalOpen.set(true);
  }

  closeEditModal(): void {
    this.isEditModalOpen.set(false);
    this.editingAta.set(null);
    this.form.reset();
  }

  // ===== SECRETARIAS =====
  isSecretariatSelected(secId: number): boolean {
    return this.selectedSecretariatIds().includes(secId);
  }

  toggleSecretariat(secId: number): void {
    const current = this.selectedSecretariatIds();
    if (current.includes(secId)) {
      this.selectedSecretariatIds.set(current.filter(id => id !== secId));
    } else {
      this.selectedSecretariatIds.set([...current, secId]);
    }
  }

  // ===== HELPERS =====
  getDataVigente(ata: Agreement): string {
    const inicio = this.formatDate(ata.dataInicio);
    return ata.dataFim ? `${inicio} - ${this.formatDate(ata.dataFim)}` : inicio;
  }

  private formatDate(dateStr: string): string {
    if (!dateStr) return '';
    const parts = dateStr.split('-');
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  }

  private getTipoIdByNome(tipoNome: string): number {
    const map: { [key: string]: number } = { 'PRODUTO': 1, 'SERVICO': 2 };
    return map[tipoNome] || 1;
  }

  // ===== CRUD =====
  save(): void {
    if (this.form.invalid) return;
    if (this.selectedSecretariatIds().length === 0) {
      this.toast.warning('Selecione pelo menos uma secretaria participante.');
      return;
    }
    this.submitting.set(true);
    const dto = { ...this.form.value, secretariasIds: this.selectedSecretariatIds() };
    this.ataService.create(dto).subscribe({
      next: () => {
        this.toast.success('Ata cadastrada com sucesso!');
        this.submitting.set(false);
        this.closeModal();
        this.loadData();
      },
      error: (err) => {
        this.toast.error('Erro ao cadastrar ata.');
        this.submitting.set(false);
        console.error(err);
      }
    });
  }

  update(): void {
    if (this.form.invalid) return;
    if (this.selectedSecretariatIds().length === 0) {
      this.toast.warning('Selecione pelo menos uma secretaria participante.');
      return;
    }
    const ata = this.editingAta();
    if (!ata) return;
    this.submitting.set(true);
    const dto = { ...this.form.value, secretariasIds: this.selectedSecretariatIds() };
    this.ataService.update(ata.id, dto).subscribe({
      next: () => {
        this.toast.success('Ata atualizada com sucesso!');
        this.submitting.set(false);
        this.closeEditModal();
        this.loadData();
      },
      error: (err) => {
        this.toast.error('Erro ao atualizar ata.');
        this.submitting.set(false);
        console.error(err);
      }
    });
  }

  promptDelete(item: Agreement): void {
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
    this.ataService.delete(item.id).subscribe({
      next: () => {
        this.toast.success('Ata excluída com sucesso.');
        this.deleting.set(false);
        this.closeDeleteModal();
        this.loadData();
      },
      error: (err) => {
        this.toast.error('Erro ao excluir ata.');
        this.deleting.set(false);
        console.error(err);
      }
    });
  }
}