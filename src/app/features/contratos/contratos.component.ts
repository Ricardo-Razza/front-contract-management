import { Component, OnInit, inject, signal, computed, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { HeaderComponent, ConfirmModalComponent, LoadingSkeletonComponent, PaginationComponent } from '@shared';
import { ContratoService, SecretariaService, ServidorService, LookupService, ToastService } from '@core/services';
import { Contract, Secretariat, LookupItem } from '@core/models';
import { includesNormalized } from '@core/utils';

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
  private contratoService = inject(ContratoService);
  private secService = inject(SecretariaService);
  private servidorService = inject(ServidorService);
  private lookupService = inject(LookupService);
  private toast = inject(ToastService);
  private fb = inject(FormBuilder);

  contracts = signal<Contract[]>([]);
  secretariats = signal<Secretariat[]>([]);
  tiposList = signal<LookupItem[]>([]);
  statusList = signal<LookupItem[]>([]);
  servidoresList = signal<{ id: number; nome: string }[]>([]);

  showFilters = signal(false);
  globalSearch = signal<string>('');
  filterAno = signal<string>('');
  filterTipo = signal<string>('');
  filterStatus = signal<string>('');
  filterSecretaria = signal<number | ''>('');
  filterPessoa = signal<string>('');
  showPessoaSuggestions = signal<boolean>(false);

  sortColumn = signal<string>('id');
  sortDirection = signal<'asc' | 'desc'>('desc');
  currentPage = signal<number>(1);
  pageSize = signal<number>(10);

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

  form: FormGroup = this.fb.group({
    numero: ['', Validators.required],
    ano: [new Date().getFullYear(), Validators.required],
    dataInicio: ['', Validators.required],
    dataFim: ['', Validators.required],
    tipoId: [1, Validators.required],
    objeto: ['', Validators.required],
    nomeContratado: ['', Validators.required],
    portariaDesignacao: ['', Validators.required],
    dataDesignacao: ['', Validators.required],
    ativoId: [1, Validators.required],
    secretariaId: ['', Validators.required]
  });

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

  filteredContracts = computed(() => {
    let list = this.contracts();

    const global = this.globalSearch();
    const ano = this.filterAno();
    const tipo = this.filterTipo();
    const status = this.filterStatus();
    const secId = this.filterSecretaria();
    const pessoa = this.filterPessoa();

    return list.filter(contrato => {
      if (global) {
        const match =
          includesNormalized(contrato.numero, global) ||
          includesNormalized(contrato.ano, global) ||
          includesNormalized(contrato.objeto, global) ||
          includesNormalized(contrato.nomeContratado, global) ||
          includesNormalized(contrato.portariaDesignacao, global);
        if (!match) return false;
      }

      if (ano && contrato.ano !== Number(ano)) return false;

      if (tipo && contrato.tipo !== tipo) return false;

      if (status) {
        const contratoStatus = contrato.situacao || 'ATIVO';
        if (contratoStatus !== status) return false;
      }

      if (secId) {
        const secIdNumber = Number(secId);
        if (contrato.secretaria?.id !== secIdNumber) return false;
      }

      if (pessoa) {
        const equipes = contrato.equipe || [];
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
  }

  loadServidores(): void {
    this.servidorService.getAll().subscribe({
      next: (data) => {
        this.servidoresList.set(data.map(s => ({ id: s.id, nome: s.nome })));
      }
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

  getDataVigente(contrato: Contract): string {
    if (!contrato.dataInicio || !contrato.dataFim) return '-';
    const di = new Date(contrato.dataInicio).toLocaleDateString('pt-BR');
    const df = new Date(contrato.dataFim).toLocaleDateString('pt-BR');
    return `${di} - ${df}`;
  }

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

  getSecretariaNome(id: number | ''): string {
    if (!id) return '';
    const sec = this.secretariats().find(s => s.id === Number(id));
    return sec ? `${sec.sigla} - ${sec.nome}` : '';
  }

  toggleFilters(): void {
    this.showFilters.set(!this.showFilters());
  }

  openDetailsModal(contrato: Contract): void {
    this.selectedContratoForDetails.set(contrato);
    this.isDetailsModalOpen.set(true);
  }

  closeDetailsModal(): void {
    this.isDetailsModalOpen.set(false);
    this.selectedContratoForDetails.set(null);
  }

  openCreateModal(): void {
    this.form.reset({
      numero: '',
      ano: new Date().getFullYear(),
      dataInicio: '',
      dataFim: '',
      tipoId: 1,
      objeto: '',
      nomeContratado: '',
      portariaDesignacao: '',
      dataDesignacao: '',
      ativoId: 1,
      secretariaId: ''
    });
    this.isModalOpen.set(true);
  }

  openEditModal(contrato: Contract): void {
    this.editingContrato.set(contrato);

    const tipoObj = this.tiposList().find(t => t.tipoArp === contrato.tipo || t.nome === contrato.tipo);
    const activeObj = this.statusList().find(s => s.situacao === contrato.situacao || s.nome === contrato.situacao);

    this.form.patchValue({
      numero: contrato.numero,
      ano: contrato.ano,
      dataInicio: contrato.dataInicio ? contrato.dataInicio.substring(0, 10) : '',
      dataFim: contrato.dataFim ? contrato.dataFim.substring(0, 10) : '',
      tipoId: tipoObj ? tipoObj.id : 1,
      objeto: contrato.objeto,
      nomeContratado: contrato.nomeContratado || '',
      portariaDesignacao: contrato.portariaDesignacao || '',
      dataDesignacao: contrato.dataDesignacao ? contrato.dataDesignacao.substring(0, 10) : '',
      ativoId: activeObj ? activeObj.id : 1,
      secretariaId: contrato.secretaria?.id || ''
    });

    this.isEditModalOpen.set(true);
    this.isModalOpen.set(true);
  }

  closeModal(): void {
    this.isModalOpen.set(false);
    this.isEditModalOpen.set(false);
    this.editingContrato.set(null);
    this.form.reset();
  }

  saveContrato(): void {
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
      nomeContratado: val.nomeContratado,
      portariaDesignacao: val.portariaDesignacao,
      dataDesignacao: val.dataDesignacao,
      ativoId: Number(val.ativoId),
      secretariaId: Number(val.secretariaId)
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
