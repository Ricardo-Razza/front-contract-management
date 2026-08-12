import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { HeaderComponent } from '../../shared/components/header/header.component';
import { ConfirmModalComponent } from '../../shared/components/confirm-modal/confirm-modal.component';
import { LoadingSkeletonComponent } from '../../shared/components/loading-skeleton/loading-skeleton.component';
import { AtaService } from '../../core/services/ata.service';
import { SecretariaService } from '../../core/services/secretaria.service';
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
  template: `
    <app-header title="Atas (Agreements)"></app-header>

    <div class="page-content">
      <div class="page-title-group">
        <div class="title-with-actions">
          <div>
            <h1>Acordos e Atas de Registro de Preços</h1>
            <p>Gerencie as atas registradas, vigências e secretarias aderentes</p>
          </div>
          <button class="btn btn-primary" (click)="openCreateModal()">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            Nova Ata
          </button>
        </div>
      </div>

      <div class="table-card">
        <div class="table-header-toolbar">
          <div class="search-input-wrapper">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
            <input
              type="text"
              placeholder="Buscar por número, ano ou objeto..."
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
                  <th class="text-center" style="width: 60px;">ID</th>
                  <th class="text-center">Nº / Ano</th>
                  <th class="text-center">Data Vigente</th>
                  <th class="text-center">Status</th>
                  <th class="text-center">Secretarias</th>
                  <th class="text-center">Tipo</th>
                  <th>Objeto da Ata</th>
                  <th class="text-center">Portaria</th>
                  <th class="text-center">Data Designação</th>
                  <th>Equipe</th>
                  <th>Observação</th>
                  <th class="text-center" style="width: 60px;">Ações</th>
                </tr>
              </thead>
              <tbody>
                @for (ata of filteredAgreements(); track ata.id) {
                  <tr>
                    <td class="text-center">#{{ ata.id }}</td>
                    <td class="text-center"><strong>{{ ata.numero }}/{{ ata.ano }}</strong></td>
                    <td class="text-center">{{ getDataVigente(ata) }}</td>
                    <td class="text-center">
                      <span class="badge-status" [ngClass]="ata.situacao === 'DESATIVADO' ? 'status-inactive' : 'status-active'">
                        <span class="dot"></span>
                        {{ ata.situacao || 'ATIVO' }}
                      </span>
                    </td>
                    <td>
                      <div class="sec-list">
                        @for (sec of ata.secretarias; track sec.id) {
                          <span class="sec-pill" [title]="sec.nome">{{ sec.sigla || sec.nome }}</span>
                        } @empty {
                          <span class="text-muted">-</span>
                        }
                      </div>
                    </td>
                    <td class="text-center">
                      <span class="type-badge">{{ ata.tipo || 'PRODUTO' }}</span>
                    </td>
                    <td class="td-objeto-completo">
                      <div class="objeto-full">
                        {{ ata.objeto }}
                      </div>
                    </td>
                    <td class="text-center">{{ ata.portariaDesignacao || '-' }}</td>
                    <td class="text-center">{{ ata.dataDesignacao | date:'dd/MM/yyyy' }}</td>
                    <td>
                      @if (ata.equipe && ata.equipe.length > 0) {
                        <div class="equipe-list">
                          @for (membro of ata.equipe; track membro.id) {
                            <div class="equipe-item">
                              <span class="equipe-funcao">{{ membro.funcao }}:</span>
                              <span class="equipe-nome">{{ membro.servidor }}</span>
                            </div>
                          }
                        </div>
                      } @else {
                        <span class="text-muted">-</span>
                      }
                    </td>
                    <td class="td-objeto-completo">
                      <div class="objeto-full">
                        {{ ata.observacao || '-' }}
                      </div>
                    </td>
                    <td class="text-center">
                      <button class="btn-icon btn-icon-primary" title="Editar Ata" (click)="openEditModal(ata)">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="18" height="18">
                          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                          <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                        </svg>
                      </button>
                    </td>
                  </tr>
                } @empty {
                  <tr>
                    <td colspan="12">
                      <div class="empty-state">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="48" height="48">
                          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                        </svg>
                        <h4>Nenhuma ata cadastrada</h4>
                        <p>Clique em "Nova Ata" para registrar o primeiro acordo no sistema.</p>
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
            <h3>Nova Ata de Registro de Preços</h3>
            <button class="modal-close" (click)="closeModal()">&times;</button>
          </div>

          <form [formGroup]="form" (ngSubmit)="save()">
            <div class="modal-body">
              <div class="form-grid">
                <div class="col-6 form-group">
                  <label>Número <span class="required">*</span></label>
                  <input type="number" formControlName="numero" placeholder="Ex: 105" />
                  @if (form.get('numero')?.touched && form.get('numero')?.hasError('required')) {
                    <span class="form-error">O número é obrigatório</span>
                  }
                </div>

                <div class="col-6 form-group">
                  <label>Ano <span class="required">*</span></label>
                  <input type="number" formControlName="ano" placeholder="Ex: 2026" />
                  @if (form.get('ano')?.touched && form.get('ano')?.hasError('required')) {
                    <span class="form-error">O ano é obrigatório</span>
                  }
                </div>
              </div>

              <div class="form-grid">
                <div class="col-6 form-group">
                  <label>Data de Início <span class="required">*</span></label>
                  <input type="date" formControlName="dataInicio" />
                </div>

                <div class="col-6 form-group">
                  <label>Data de Fim <span class="required">*</span></label>
                  <input type="date" formControlName="dataFim" />
                </div>
              </div>

              <div class="form-grid">
                <div class="col-6 form-group">
                  <label>Tipo do Acordo <span class="required">*</span></label>
                  <select formControlName="tipoId">
                    @for (item of tiposList(); track item.id) {
                      <option [value]="item.id">{{ item.tipoArp || 'Selecione' }}</option>
                    }
                  </select>
                </div>

                <div class="col-6 form-group">
                  <label>Situação <span class="required">*</span></label>
                  <select formControlName="ativoId">
                    @for (item of statusList(); track item.id) {
                      <option [value]="item.id">{{ item.situacao || 'Selecione' }}</option>
                    }
                  </select>
                </div>
              </div>

              <div class="form-group">
                <label>Objeto da Ata <span class="required">*</span></label>
                <textarea formControlName="objeto" rows="3" placeholder="Resumo do objeto da contratação ou fornecimento..."></textarea>
                @if (form.get('objeto')?.touched && form.get('objeto')?.hasError('required')) {
                  <span class="form-error">O objeto é obrigatório</span>
                }
              </div>

              <div class="form-group">
                <label>Observação</label>
                <textarea formControlName="observacao" rows="2" placeholder="Observações adicionais sobre a ata..."></textarea>
              </div>

              <div class="form-group">
                <label>Portaria de Designação <span class="required">*</span></label>
                <input type="text" formControlName="portariaDesignacao" placeholder="Ex: PORT-001/2026" />
                @if (form.get('portariaDesignacao')?.touched && form.get('portariaDesignacao')?.hasError('required')) {
                  <span class="form-error">A portaria de designação é obrigatória!</span>
                }
              </div>

              <div class="form-group">
                <label>Data de Designação <span class="required">*</span></label>
                <input type="date" formControlName="dataDesignacao" />
                @if (form.get('dataDesignacao')?.touched && form.get('dataDesignacao')?.hasError('required')) {
                  <span class="form-error">A data de designação é obrigatória</span>
                }
              </div>

              <div class="form-group">
                <label>Secretarias Participantes <span class="required">*</span></label>
                <div class="checkbox-grid">
                  @for (sec of secretariats(); track sec.id) {
                    <label class="checkbox-label">
                      <input
                        type="checkbox"
                        [checked]="isSecretariatSelected(sec.id)"
                        (change)="toggleSecretariat(sec.id)"
                      />
                      <span>{{ sec.nome }} ({{ sec.sigla }})</span>
                    </label>
                  }
                </div>
              </div>
            </div>

            <div class="modal-footer">
              <button type="button" class="btn btn-secondary" (click)="closeModal()">Cancelar</button>
              <button type="submit" class="btn btn-primary" [disabled]="submitting() || form.invalid">
                @if (submitting()) {
                  <span>Salvando...</span>
                } @else {
                  <span>Cadastrar Ata</span>
                }
              </button>
            </div>
          </form>
        </div>
      </div>
    }

    <!-- Edit Modal -->
    @if (isEditModalOpen()) {
      <div class="modal-backdrop" (click)="closeEditModal()">
        <div class="modal-card" (click)="$event.stopPropagation()">
          <div class="modal-header">
            <h3>Editar Ata de Registro de Preços</h3>
            <button class="modal-close" (click)="closeEditModal()">&times;</button>
          </div>

          <form [formGroup]="form" (ngSubmit)="update()">
            <div class="modal-body">
              <div class="form-grid">
                <div class="col-6 form-group">
                  <label>Número <span class="required">*</span></label>
                  <input type="number" formControlName="numero" placeholder="Ex: 105" />
                  @if (form.get('numero')?.touched && form.get('numero')?.hasError('required')) {
                    <span class="form-error">O número é obrigatório</span>
                  }
                </div>

                <div class="col-6 form-group">
                  <label>Ano <span class="required">*</span></label>
                  <input type="number" formControlName="ano" placeholder="Ex: 2026" />
                  @if (form.get('ano')?.touched && form.get('ano')?.hasError('required')) {
                    <span class="form-error">O ano é obrigatório</span>
                  }
                </div>
              </div>

              <div class="form-grid">
                <div class="col-6 form-group">
                  <label>Data de Início <span class="required">*</span></label>
                  <input type="date" formControlName="dataInicio" />
                </div>

                <div class="col-6 form-group">
                  <label>Data de Fim <span class="required">*</span></label>
                  <input type="date" formControlName="dataFim" />
                </div>
              </div>

              <div class="form-grid">
                <div class="col-6 form-group">
                  <label>Tipo do Acordo <span class="required">*</span></label>
                  <select formControlName="tipoId">
                    @for (item of tiposList(); track item.id) {
                      <option [value]="item.id">{{ item.tipoArp || 'Selecione' }}</option>
                    }
                  </select>
                </div>

                <div class="col-6 form-group">
                  <label>Situação <span class="required">*</span></label>
                  <select formControlName="ativoId">
                    @for (item of statusList(); track item.id) {
                      <option [value]="item.id">{{ item.situacao || 'Selecione' }}</option>
                    }
                  </select>
                </div>
              </div>

              <div class="form-group">
                <label>Objeto da Ata <span class="required">*</span></label>
                <textarea formControlName="objeto" rows="3" placeholder="Resumo do objeto da contratação ou fornecimento..."></textarea>
                @if (form.get('objeto')?.touched && form.get('objeto')?.hasError('required')) {
                  <span class="form-error">O objeto é obrigatório</span>
                }
              </div>

              <div class="form-group">
                <label>Observação</label>
                <textarea formControlName="observacao" rows="2" placeholder="Observações adicionais sobre a ata..."></textarea>
              </div>

              <div class="form-group">
                <label>Portaria de Designação <span class="required">*</span></label>
                <input type="text" formControlName="portariaDesignacao" placeholder="Ex: PORT-001/2026" />
                @if (form.get('portariaDesignacao')?.touched && form.get('portariaDesignacao')?.hasError('required')) {
                  <span class="form-error">A portaria de designação é obrigatória!</span>
                }
              </div>

              <div class="form-group">
                <label>Data de Designação <span class="required">*</span></label>
                <input type="date" formControlName="dataDesignacao" />
                @if (form.get('dataDesignacao')?.touched && form.get('dataDesignacao')?.hasError('required')) {
                  <span class="form-error">A data de designação é obrigatória</span>
                }
              </div>

              <div class="form-group">
                <label>Secretarias Participantes <span class="required">*</span></label>
                <div class="checkbox-grid">
                  @for (sec of secretariats(); track sec.id) {
                    <label class="checkbox-label">
                      <input
                        type="checkbox"
                        [checked]="isSecretariatSelected(sec.id)"
                        (change)="toggleSecretariat(sec.id)"
                      />
                      <span>{{ sec.nome }} ({{ sec.sigla }})</span>
                    </label>
                  }
                </div>
              </div>
            </div>

            <div class="modal-footer">
              <button type="button" class="btn btn-secondary" (click)="closeEditModal()">Cancelar</button>
              <button type="submit" class="btn btn-primary" [disabled]="submitting() || form.invalid">
                @if (submitting()) {
                  <span>Salvando...</span>
                } @else {
                  <span>Atualizar Ata</span>
                }
              </button>
            </div>
          </form>
        </div>
      </div>
    }

    <!-- Cascade Delete Confirmation Modal -->
    <app-confirm-modal
      [isOpen]="isDeleteModalOpen()"
      [title]="'Excluir Ata (Exclusão em Cascata)'"
      [message]="'Tem certeza que deseja excluir a Ata ' + itemToDelete()?.numero + '/' + itemToDelete()?.ano + '?'"
      [isCascade]="true"
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

    .text-center {
      text-align: center;
    }

    .type-badge {
      display: inline-block;
      padding: 4px 14px;
      border-radius: 20px;
      font-size: 0.7rem;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.3px;
      background: linear-gradient(135deg, #e0e7ff, #c7d2fe);
      color: #4338ca;
      border: 1px solid #a5b4fc;
      box-shadow: 0 1px 3px rgba(0,0,0,0.05);
    }

    .type-badge:has-text('SERVICO') {
      background: linear-gradient(135deg, #d1fae5, #a7f3d0);
      color: #065f46;
      border-color: #6ee7b7;
    }

    .data-table td {
      vertical-align: middle;
      padding: 10px 12px;
      font-size: 0.875rem;
    }

    .data-table th {
      padding: 12px 8px;
      font-weight: 600;
      color: #475569;
      font-size: 0.75rem;
      text-transform: uppercase;
      letter-spacing: 0.3px;
      border-bottom: 2px solid #e2e8f0;
      background: #f8fafc;
    }

    .data-table tbody tr:hover {
      background: #f8fafc;
    }

    .badge-status {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 4px 14px;
      border-radius: 20px;
      font-size: 0.75rem;
      font-weight: 600;
    }

    .badge-status .dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      display: inline-block;
    }

    .status-active {
      background: #dcfce7;
      color: #166534;
    }

    .status-active .dot {
      background: #22c55e;
    }

    .status-inactive {
      background: #fee2e2;
      color: #991b1b;
    }

    .status-inactive .dot {
      background: #ef4444;
    }

    .sec-list {
      display: flex;
      flex-wrap: wrap;
      gap: 4px;
      justify-content: center;
    }

    .sec-pill {
      font-size: 0.6875rem;
      font-weight: 600;
      padding: 3px 10px;
      background: #f1f5f9;
      color: #334155;
      border-radius: 12px;
      border: 1px solid #e2e8f0;
      white-space: nowrap;
    }

    .equipe-list {
      display: flex;
      flex-direction: column;
      gap: 2px;
      padding: 2px 0;
    }

    .equipe-item {
      display: flex;
      align-items: baseline;
      gap: 4px;
      font-size: 0.75rem;
      line-height: 1.4;
    }

    .equipe-funcao {
      font-weight: 600;
      color: #475569;
      white-space: nowrap;
      font-size: 0.65rem;
    }

    .equipe-nome {
      color: #1e293b;
      font-size: 0.75rem;
    }

    .text-muted {
      color: #94a3b8;
      font-size: 0.8rem;
    }

    .td-objeto-completo {
      max-width: 320px;
      min-width: 180px;
      word-wrap: break-word;
      white-space: normal;
      line-height: 1.4;
      vertical-align: middle;
    }

    .objeto-full {
      font-size: 0.8125rem;
      color: #1e293b;
      max-height: none;
      overflow: visible;
      line-height: 1.5;
    }

    .btn-icon {
      background: none;
      border: none;
      padding: 6px;
      border-radius: 8px;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      transition: all 0.2s;
      color: #64748b;
    }

    .btn-icon:hover {
      background: #f1f5f9;
    }

    .btn-icon-primary {
      color: #3b82f6;
    }

    .btn-icon-primary:hover {
      background: #eff6ff;
      color: #2563eb;
    }

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
      max-width: 640px;
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

    .empty-state {
      text-align: center;
      padding: 3rem 1rem;
      color: #94a3b8;
    }

    .empty-state h4 {
      margin: 0.5rem 0 0.25rem;
      color: #475569;
      font-weight: 600;
    }

    .empty-state p {
      font-size: 0.875rem;
      margin: 0;
    }
  `]
})
export class AtasComponent implements OnInit {
  private ataService = inject(AtaService);
  private secService = inject(SecretariaService);
  private lookupService = inject(LookupService);
  private toast = inject(ToastService);
  private fb = inject(FormBuilder);

  agreements = signal<Agreement[]>([]);
  secretariats = signal<Secretariat[]>([]);
  tiposList = signal<LookupItem[]>([]);
  statusList = signal<LookupItem[]>([]);

  searchTerm = signal<string>('');
  selectedSecretariatIds = signal<number[]>([]);

  loading = signal<boolean>(true);
  submitting = signal<boolean>(false);
  deleting = signal<boolean>(false);

  isModalOpen = signal<boolean>(false);
  isEditModalOpen = signal<boolean>(false);
  isDeleteModalOpen = signal<boolean>(false);
  itemToDelete = signal<Agreement | null>(null);
  editingAta = signal<Agreement | null>(null);

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

  ngOnInit(): void {
    this.loadData();
    this.loadLookups();
  }

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

  filteredAgreements(): Agreement[] {
    const term = this.searchTerm().toLowerCase().trim();
    if (!term) return this.agreements();

    return this.agreements().filter(a =>
      a.numero.toString().includes(term) ||
      a.ano.toString().includes(term) ||
      a.objeto.toLowerCase().includes(term)
    );
  }

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

  getDataVigente(ata: Agreement): string {
    const inicio = this.formatDate(ata.dataInicio);
    if (ata.dataFim) {
      const fim = this.formatDate(ata.dataFim);
      return `${inicio} - ${fim}`;
    }
    return inicio;
  }

  private formatDate(dateStr: string): string {
    if (!dateStr) return '';
    const parts = dateStr.split('-');
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  }

  private getTipoIdByNome(tipoNome: string): number {
    const map: { [key: string]: number } = {
      'PRODUTO': 1,
      'SERVICO': 2
    };
    return map[tipoNome] || 1;
  }

  save(): void {
    if (this.form.invalid) return;

    if (this.selectedSecretariatIds().length === 0) {
      this.toast.warning('Selecione pelo menos uma secretaria participante.');
      return;
    }

    this.submitting.set(true);
    const dto = {
      ...this.form.value,
      secretariasIds: this.selectedSecretariatIds()
    };

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
    const dto = {
      ...this.form.value,
      secretariasIds: this.selectedSecretariatIds()
    };

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