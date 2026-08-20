import { Component, OnInit, inject, signal, computed, ChangeDetectionStrategy, HostListener, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, FormArray, Validators } from '@angular/forms';
import { HeaderComponent, ConfirmModalComponent, LoadingSkeletonComponent, PaginationComponent } from '@shared';
import { EquipeService, AtaService, ServidorService, LookupService, ToastService, ContratoService } from '@core/services';
import { ContractTeam, Agreement, Contract, Servant, LookupItem } from '@core/models';
import { includesNormalized } from '@core/utils';

type TipoVinculo = 'ATA' | 'CONTRATO';

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
  private contratoService = inject(ContratoService);
  private toast = inject(ToastService);
  private fb = inject(FormBuilder);
  private elRef = inject(ElementRef);

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    if (!this.elRef.nativeElement.contains(event.target)) {
      this.ataDropdownOpen.set(false);
      this.contratoDropdownOpen.set(false);
      this.openServidorDropdownIndex.set(null);
    }
  }

  teams = signal<ContractTeam[]>([]);
  agreements = signal<Agreement[]>([]);
  contracts = signal<Contract[]>([]);
  servants = signal<Servant[]>([]);
  funcoesList = signal<LookupItem[]>([]);
  statusList = signal<LookupItem[]>([]);

  searchTerm = signal<string>('');

  // Tipo de vínculo da equipe (Ata ou Contrato)
  tipoVinculo = signal<TipoVinculo>('ATA');

  // Ata searchable dropdown
  ataSearch = signal<string>('');
  ataDropdownOpen = signal<boolean>(false);

  filteredAgreementsDropdown = computed(() => {
    const term = this.ataSearch().trim();
    if (!term) return this.agreements();
    const termLower = term.toLowerCase();
    return this.agreements().filter(a => {
      const numero = String(a.numero ?? '');
      const ano = String(a.ano ?? '');
      const numAno = `${numero}/${ano}`;
      const objeto = (a.objeto ?? '').toLowerCase();
      return numero.startsWith(term) ||
        numAno.includes(term) ||
        ano.startsWith(term) ||
        objeto.includes(termLower);
    });
  });

  selectedAta = signal<Agreement | null>(null);

  // Contrato searchable dropdown
  contratoSearch = signal<string>('');
  contratoDropdownOpen = signal<boolean>(false);

  filteredContractsDropdown = computed(() => {
    const term = this.contratoSearch().trim();
    if (!term) return this.contracts();
    const termLower = term.toLowerCase();
    return this.contracts().filter(c => {
      const numero = String(c.numero ?? '');
      const ano = String(c.ano ?? '');
      const numAno = `${numero}/${ano}`;
      const objeto = (c.objeto ?? '').toLowerCase();
      const contratado = (c.nomeContratado ?? '').toLowerCase();
      return numero.startsWith(term) ||
        numAno.includes(term) ||
        ano.startsWith(term) ||
        objeto.includes(termLower) ||
        contratado.includes(termLower);
    });
  });

  selectedContrato = signal<Contract | null>(null);

  // Servant searchable dropdowns (one per FormArray row)
  openServidorDropdownIndex = signal<number | null>(null);
  servidorSearch = signal<string>('');
  selectedServants = signal<(Servant | null)[]>([]);

  filteredServantsForDropdown = computed(() => {
    const term = this.servidorSearch().trim().toLowerCase();
    if (!term) return this.servants();
    return this.servants().filter(s =>
      (s.nome ?? '').toLowerCase().includes(term) ||
      (s.cargo ?? '').toLowerCase().includes(term) ||
      String(s.matricula ?? '').includes(term)
    );
  });

  // Sort & Pagination
  sortColumn = signal<string>('id');
  sortDirection = signal<'asc' | 'desc'>('desc');
  currentPage = signal<number>(1);
  pageSize = signal<number>(10);

  loading = signal<boolean>(true);
  submitting = signal<boolean>(false);
  deleting = signal<boolean>(false);

  isModalOpen = signal<boolean>(false);
  isDeleteModalOpen = signal<boolean>(false);
  editingId = signal<number | null>(null);
  itemToDelete = signal<ContractTeam | null>(null);

  form: FormGroup = this.fb.group({
    tipo: ['ATA', Validators.required],
    ataId: [''],
    contratoId: [''],
    ativoId: [1, Validators.required],
    membros: this.fb.array([])
  });

  get membrosArray(): FormArray {
    return this.form.get('membros') as FormArray;
  }

  toggleAtaDropdown(): void {
    this.ataDropdownOpen.update(v => !v);
    if (this.ataDropdownOpen()) {
      this.ataSearch.set('');
    }
  }

  closeAtaDropdown(): void {
    this.ataDropdownOpen.set(false);
  }

  selectAta(ata: Agreement): void {
    this.form.get('ataId')!.setValue(ata.id);
    this.selectedAta.set(ata);
    this.ataDropdownOpen.set(false);
    this.ataSearch.set('');
  }

  toggleContratoDropdown(): void {
    this.contratoDropdownOpen.update(v => !v);
    if (this.contratoDropdownOpen()) {
      this.contratoSearch.set('');
    }
  }

  closeContratoDropdown(): void {
    this.contratoDropdownOpen.set(false);
  }

  selectContrato(contrato: Contract): void {
    this.form.get('contratoId')!.setValue(contrato.id);
    this.selectedContrato.set(contrato);
    this.contratoDropdownOpen.set(false);
    this.contratoSearch.set('');
  }

  setTipoVinculo(tipo: TipoVinculo): void {
    this.tipoVinculo.set(tipo);
    this.form.get('tipo')!.setValue(tipo);
    // Limpa o vínculo anterior ao trocar de tipo
    if (tipo === 'ATA') {
      this.form.get('contratoId')!.setValue('');
      this.selectedContrato.set(null);
    } else {
      this.form.get('ataId')!.setValue('');
      this.selectedAta.set(null);
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

  selectServant(index: number, serv: Servant): void {
    this.membrosArray.at(index).get('servidorId')!.setValue(serv.id);
    const arr = [...this.selectedServants()];
    arr[index] = serv;
    this.selectedServants.set(arr);
    this.openServidorDropdownIndex.set(null);
    this.servidorSearch.set('');
  }

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

    this.contratoService.getAll().subscribe({
      next: (items) => this.contracts.set(items || [])
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

    return this.teams().filter(t => {
      const ataLabel = t.ataNumero && t.ataAno ? `${t.ataNumero}/${t.ataAno}` : t.ata || '';
      const contratoLabel = t.contratoNumero && t.contratoAno ? `${t.contratoNumero}/${t.contratoAno}` : t.contrato || '';
      const objetoAta = t.ataObjeto || '';
      const objetoContrato = t.contratoObjeto || '';
      const matchAta = includesNormalized(ataLabel, term) || includesNormalized(objetoAta, term);
      const matchContrato = includesNormalized(contratoLabel, term) || includesNormalized(objetoContrato, term);
      const matchMembros = t.membros?.some(m =>
        includesNormalized(m.servidorNome || '', term) ||
        includesNormalized(m.funcaoNome || '', term)
      );
      const matchLegacy = includesNormalized(t.servidor || '', term) || includesNormalized(t.funcao || '', term);

      return matchAta || matchContrato || matchMembros || matchLegacy;
    });
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
    this.editingId.set(null);
    this.selectedAta.set(null);
    this.selectedContrato.set(null);
    this.selectedServants.set([]);
    this.tipoVinculo.set('ATA');
    this.form.reset({ tipo: 'ATA', ataId: '', contratoId: '', ativoId: 1 });
    this.membrosArray.clear();
    this.addMembro();
    this.isModalOpen.set(true);
  }

  openEditModal(team: ContractTeam): void {
    this.editingId.set(team.id);
    // Detecta o tipo de vínculo: se tem contratoId preenchido, é contrato; senão, ata
    const tipo: TipoVinculo = team.contratoId ? 'CONTRATO' : 'ATA';
    this.tipoVinculo.set(tipo);

    const ataObj = this.agreements().find(a => a.id === team.ataId) ?? null;
    const contratoObj = this.contracts().find(c => c.id === team.contratoId) ?? null;
    this.selectedAta.set(ataObj);
    this.selectedContrato.set(contratoObj);

    this.form.patchValue({
      tipo,
      ataId: team.ataId || '',
      contratoId: team.contratoId || '',
      ativoId: team.ativoId || 1
    });

    this.membrosArray.clear();
    this.selectedServants.set([]);

    if (team.membros && team.membros.length > 0) {
      team.membros.forEach(m => {
        this.addMembro(m.servidorId, m.funcaoId);
      });
      // Resolve servant objects for display
      const servArr = team.membros.map(m =>
        this.servants().find(s => s.id === m.servidorId) ?? null
      );
      this.selectedServants.set(servArr);
    } else {
      this.addMembro();
    }

    this.isModalOpen.set(true);
  }

  addMembro(servidorId: number | string = '', funcaoId: number | string = ''): void {
    const group = this.fb.group({
      servidorId: [servidorId, Validators.required],
      funcaoId: [funcaoId, Validators.required]
    });
    this.membrosArray.push(group);
    // Append null placeholder for the new row's servant display
    this.selectedServants.update(arr => [...arr, null]);
  }

  removeMembro(index: number): void {
    if (this.membrosArray.length > 1) {
      this.membrosArray.removeAt(index);
      this.selectedServants.update(arr => arr.filter((_, i) => i !== index));
      // Close dropdown if it was open on this or a later row
      if ((this.openServidorDropdownIndex() ?? -1) >= index) {
        this.openServidorDropdownIndex.set(null);
      }
    } else {
      this.toast.error('A equipe precisa ter pelo menos um membro.');
    }
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
    this.editingId.set(null);
    this.selectedAta.set(null);
    this.selectedContrato.set(null);
    this.selectedServants.set([]);
    this.openServidorDropdownIndex.set(null);
    this.servidorSearch.set('');
    this.ataSearch.set('');
    this.contratoSearch.set('');
    this.ataDropdownOpen.set(false);
    this.contratoDropdownOpen.set(false);
    this.tipoVinculo.set('ATA');
    this.form.reset();
    this.membrosArray.clear();
  }

  save(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    if (this.membrosArray.length === 0) {
      this.toast.error('Adicione pelo menos um servidor na equipe.');
      return;
    }

    const tipo: TipoVinculo = this.form.get('tipo')!.value;
    if (tipo === 'ATA' && !this.form.get('ataId')!.value) {
      this.toast.error('Selecione uma ata.');
      this.form.get('ataId')!.markAsTouched();
      return;
    }
    if (tipo === 'CONTRATO' && !this.form.get('contratoId')!.value) {
      this.toast.error('Selecione um contrato.');
      this.form.get('contratoId')!.markAsTouched();
      return;
    }

    this.submitting.set(true);
    const val = this.form.value;

    const payload: any = {
      tipo,
      ativoId: Number(val.ativoId),
      membros: val.membros.map((m: any) => ({
        servidorId: Number(m.servidorId),
        funcaoId: Number(m.funcaoId)
      }))
    };

    if (tipo === 'ATA') {
      payload.ataId = Number(val.ataId);
    } else {
      payload.contratoId = Number(val.contratoId);
    }

    const id = this.editingId();
    if (id) {
      this.equipeService.update(id, payload).subscribe({
        next: () => {
          this.toast.success('Equipe de contrato atualizada com sucesso!');
          this.submitting.set(false);
          this.closeModal();
          this.loadData();
        },
        error: () => {
          this.toast.error('Erro ao atualizar equipe de contrato.');
          this.submitting.set(false);
        }
      });
    } else {
      this.equipeService.create(payload).subscribe({
        next: () => {
          this.toast.success('Equipe de contrato cadastrada com sucesso!');
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
        this.toast.success('Equipe excluída com sucesso.');
        this.deleting.set(false);
        this.closeDeleteModal();
        this.loadData();
      },
      error: () => {
        this.toast.error('Erro ao excluir equipe.');
        this.deleting.set(false);
      }
    });
  }
}
