import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { HeaderComponent } from '../../shared/components/header/header.component';
import { ConfirmModalComponent } from '../../shared/components/confirm-modal/confirm-modal.component';
import { LoadingSkeletonComponent } from '../../shared/components/loading-skeleton/loading-skeleton.component';
import { EquipeService } from '../../core/services/equipe.service';
import { AtaService } from '../../core/services/ata.service';
import { ServidorService } from '../../core/services/servidor.service';
import { LookupService } from '../../core/services/lookup.service';
import { ToastService } from '../../core/services/toast.service';
import { ContractTeam, Agreement, Servant, LookupItem } from '../../core/models/api.models';

@Component({
  selector: 'app-equipes',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    HeaderComponent,
    ConfirmModalComponent,
    LoadingSkeletonComponent
  ],
  template: `
    <app-header title="Equipes de Contrato"></app-header>

    <div class="page-content">
      <div class="page-title-group">
        <div class="title-with-actions">
          <div>
            <h1>Equipes de Gestão e Fiscalização de Contratos</h1>
            <p>Designação de servidores, gestores e fiscais de atas de registro de preço</p>
          </div>
          <button class="btn btn-primary" (click)="openCreateModal()">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            Designar Servidor / Função
          </button>
        </div>
      </div>

      <div class="table-card">
        <div class="table-header-toolbar">
          <div class="search-input-wrapper">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
            <input
              type="text"
              placeholder="Buscar por servidor, ata ou função..."
              [ngModel]="searchTerm()"
              (ngModelChange)="searchTerm.set($event)"
            />
          </div>
        </div>

        @if (loading()) {
          <app-loading-skeleton [rows]="5"></app-loading-skeleton>
        } @else {
          <div class="table-responsive">
            <table class="data-table">
              <thead>
                <tr>
                  <th style="width: 70px;">ID</th>
                  <th>Ata de Origem</th>
                  <th>Servidor Designado</th>
                  <th>Função na Equipe</th>
                  <th>Data Designação</th>
                  <th>Término Designação</th>
                  <th>Status</th>
                  <th style="width: 80px; text-align: right;">Ações</th>
                </tr>
              </thead>
              <tbody>
                @for (team of filteredTeams(); track team.id) {
                  <tr>
                    <td>#{{ team.id }}</td>
                    <td><strong>{{ team.ata }}</strong></td>
                    <td>{{ team.servidor }}</td>
                    <td><span class="role-badge">{{ team.funcao }}</span></td>
                    <td>{{ team.dataDesignacao | date:'dd/MM/yyyy' }}</td>
                    <td>{{ team.dataFim | date:'dd/MM/yyyy' }}</td>
                    <td>
                      <span class="badge-status" [ngClass]="team.situacao === 'Inativo' ? 'status-inactive' : 'status-active'">
                        <span class="dot"></span>
                        {{ team.situacao || 'Ativo' }}
                      </span>
                    </td>
                    <td style="text-align: right;">
                      <button class="btn btn-icon btn-icon-danger" title="Excluir Designação" (click)="promptDelete(team)">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>
                      </button>
                    </td>
                  </tr>
                } @empty {
                  <tr>
                    <td colspan="8">
                      <div class="empty-state">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><line x1="19" y1="8" x2="19" y2="14"/></svg>
                        <h4>Nenhuma equipe designada</h4>
                        <p>Clique em "Designar Servidor / Função" para cadastrar um fiscal de ata.</p>
                      </div>
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        }
      </div>
    </div>

    <!-- Create Modal -->
    @if (isModalOpen()) {
      <div class="modal-backdrop" (click)="closeModal()">
        <div class="modal-card" (click)="$event.stopPropagation()">
          <div class="modal-header">
            <h3>Designar Servidor em Equipe de Contrato</h3>
            <button class="modal-close" (click)="closeModal()">&times;</button>
          </div>

          <form [formGroup]="form" (ngSubmit)="save()">
            <div class="modal-body">
              <div class="form-group">
                <label>Ata de Registro de Preços <span class="required">*</span></label>
                <select formControlName="agreementId">
                  <option value="">Selecione a ata</option>
                  @for (ata of agreements(); track ata.id) {
                    <option [value]="ata.id">Ata Nº {{ ata.numero }}/{{ ata.ano }} - {{ ata.objeto }}</option>
                  }
                </select>
                @if (form.get('agreementId')?.touched && form.get('agreementId')?.hasError('required')) {
                  <span class="form-error">Selecione uma ata</span>
                }
              </div>

              <div class="form-grid">
                <div class="col-6 form-group">
                  <label>Servidor <span class="required">*</span></label>
                  <select formControlName="servantId">
                    <option value="">Selecione o servidor</option>
                    @for (serv of servants(); track serv.id) {
                      <option [value]="serv.id">{{ serv.nome }} ({{ serv.cargo }})</option>
                    }
                  </select>
                  @if (form.get('servantId')?.touched && form.get('servantId')?.hasError('required')) {
                    <span class="form-error">Selecione um servidor</span>
                  }
                </div>

                <div class="col-6 form-group">
                  <label>Função na Equipe <span class="required">*</span></label>
                  <select formControlName="functionId">
                    <option value="">Selecione a função</option>
                    @for (item of funcoesList(); track item.id) {
                      <option [value]="item.id">{{ item.nome || item.funcao || item.descricao }}</option>
                    }
                  </select>
                  @if (form.get('functionId')?.touched && form.get('functionId')?.hasError('required')) {
                    <span class="form-error">Selecione a função</span>
                  }
                </div>
              </div>

              <div class="form-grid">
                <div class="col-6 form-group">
                  <label>Data da Designação <span class="required">*</span></label>
                  <input type="date" formControlName="designationDate" />
                  @if (form.get('designationDate')?.touched && form.get('designationDate')?.hasError('required')) {
                    <span class="form-error">Informe a data de designação</span>
                  }
                </div>

                <div class="col-6 form-group">
                  <label>Data Término <span class="required">*</span></label>
                  <input type="date" formControlName="endDate" />
                  @if (form.get('endDate')?.touched && form.get('endDate')?.hasError('required')) {
                    <span class="form-error">Informe a data de término</span>
                  }
                </div>
              </div>

              <div class="form-group">
                <label>Situação / Status <span class="required">*</span></label>
                <select formControlName="activeId">
                  @for (item of statusList(); track item.id) {
                    <option [value]="item.id">{{ item.nome || item.situacao || item.descricao }}</option>
                  }
                </select>
              </div>
            </div>

            <div class="modal-footer">
              <button type="button" class="btn btn-secondary" (click)="closeModal()">Cancelar</button>
              <button type="submit" class="btn btn-primary" [disabled]="submitting() || form.invalid">
                @if (submitting()) {
                  <span>Salvando...</span>
                } @else {
                  <span>Salvar Designação</span>
                }
              </button>
            </div>
          </form>
        </div>
      </div>
    }

    <!-- Delete Confirmation Modal -->
    <app-confirm-modal
      [isOpen]="isDeleteModalOpen()"
      [title]="'Excluir Designação de Equipe'"
      [message]="'Tem certeza que deseja excluir a designação de ' + itemToDelete()?.servidor + ' na ata ' + itemToDelete()?.ata + '?'"
      [loading]="deleting()"
      (confirm)="confirmDelete()"
      (cancel)="closeDeleteModal()"
    ></app-confirm-modal>
  `,
  styles: [`
    @use 'variables' as *;

    .title-with-actions {
      display: flex;
      align-items: center;
      justify-content: space-between;
      width: 100%;
    }

    .search-input-wrapper {
      position: relative;
      max-width: 320px;
      width: 100%;

      svg {
        position: absolute;
        left: 10px;
        top: 50%;
        transform: translateY(-50%);
        width: 16px;
        height: 16px;
        color: $color-text-muted;
      }

      input {
        width: 100%;
        padding: 0.5rem 0.75rem 0.5rem 2.25rem;
        border: 1px solid $color-border;
        border-radius: $border-radius-sm;
        font-size: 0.875rem;

        &:focus {
          outline: none;
          border-color: $color-accent;
        }
      }
    }

    .role-badge {
      font-size: 0.75rem;
      font-weight: 600;
      padding: 3px 8px;
      background-color: #fff7ed;
      color: #ea580c;
      border-radius: 4px;
      border: 1px solid #ffedd5;
    }

    // Modal
    .modal-backdrop {
      position: fixed;
      inset: 0;
      background-color: rgba(15, 23, 42, 0.6);
      backdrop-filter: blur(4px);
      z-index: 1000;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 1rem;
    }

    .modal-card {
      background: #ffffff;
      border-radius: $border-radius-lg;
      box-shadow: $shadow-lg;
      max-width: 580px;
      width: 100%;
      overflow: hidden;
    }

    .modal-header {
      padding: 1.25rem 1.5rem;
      border-bottom: 1px solid $color-border;
      display: flex;
      align-items: center;
      justify-content: space-between;

      h3 {
        font-size: 1.125rem;
        font-weight: 700;
        color: $color-secondary;
      }

      .modal-close {
        background: none;
        border: none;
        font-size: 1.5rem;
        color: $color-text-muted;
        cursor: pointer;

        &:hover { color: $color-secondary; }
      }
    }

    .modal-body {
      padding: 1.5rem;
    }

    .modal-footer {
      padding: 1rem 1.5rem;
      background-color: #f8fafc;
      border-top: 1px solid $color-border;
      display: flex;
      justify-content: flex-end;
      gap: 0.75rem;
    }
  `]
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
    designationDate: ['', Validators.required],
    endDate: ['', Validators.required],
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

  filteredTeams(): ContractTeam[] {
    const term = this.searchTerm().toLowerCase().trim();
    if (!term) return this.teams();

    return this.teams().filter(t =>
      t.ata.toLowerCase().includes(term) ||
      t.servidor.toLowerCase().includes(term) ||
      t.funcao.toLowerCase().includes(term)
    );
  }

  openCreateModal(): void {
    this.form.reset({
      agreementId: '',
      servantId: '',
      functionId: '',
      designationDate: '',
      endDate: '',
      activeId: 1
    });
    this.isModalOpen.set(true);
  }

  closeModal(): void {
    this.isModalOpen.set(false);
    this.form.reset();
  }

  save(): void {
    if (this.form.invalid) return;

    this.submitting.set(true);
    const val = this.form.value;

    const payload = {
      ataId: Number(val.agreementId),
      agreementId: Number(val.agreementId),
      servidorId: Number(val.servantId),
      servantId: Number(val.servantId),
      funcaoId: Number(val.functionId),
      functionId: Number(val.functionId),
      dataDesignacao: val.designationDate,
      designationDate: val.designationDate,
      dataFim: val.endDate,
      endDate: val.endDate,
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
