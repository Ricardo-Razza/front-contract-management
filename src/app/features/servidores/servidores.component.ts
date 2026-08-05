import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { HeaderComponent } from '../../shared/components/header/header.component';
import { ConfirmModalComponent } from '../../shared/components/confirm-modal/confirm-modal.component';
import { LoadingSkeletonComponent } from '../../shared/components/loading-skeleton/loading-skeleton.component';
import { CpfPipe } from '../../shared/pipes/cpf.pipe';
import { PhonePipe } from '../../shared/pipes/phone.pipe';
import { CpfMaskDirective } from '../../shared/directives/cpf-mask.directive';
import { PhoneMaskDirective } from '../../shared/directives/phone-mask.directive';
import { ServidorService } from '../../core/services/servidor.service';
import { SecretariaService } from '../../core/services/secretaria.service';
import { LookupService } from '../../core/services/lookup.service';
import { ToastService } from '../../core/services/toast.service';
import { Servant, Secretariat, LookupItem } from '../../core/models/api.models';

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
    CpfPipe,
    PhonePipe,
    CpfMaskDirective,
    PhoneMaskDirective
  ],
  template: `
    <app-header title="Servidores"></app-header>

    <div class="page-content">
      <div class="page-title-group">
        <div class="title-with-actions">
          <div>
            <h1>Servidores Públicos</h1>
            <p>Gerencie a equipe de servidores e fiscais de contratos</p>
          </div>
          <button class="btn btn-primary" (click)="openCreateModal()">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            Novo Servidor
          </button>
        </div>
      </div>

      <div class="table-card">
        <!-- Filter toolbar -->
        <div class="table-header-toolbar">
          <div class="filters-group">
            <div class="search-input-wrapper">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
              <input
                type="text"
                placeholder="Buscar por nome, CPF ou matrícula..."
                [ngModel]="searchTerm()"
                (ngModelChange)="searchTerm.set($event)"
              />
            </div>

            <div class="filter-select">
              <select [ngModel]="selectedSecretariatFilter()" (ngModelChange)="selectedSecretariatFilter.set($event)">
                <option value="">Todas as Secretarias</option>
                @for (sec of secretariats(); track sec.id) {
                  <option [value]="sec.nome">{{ sec.sigla || sec.nome }}</option>
                }
              </select>
            </div>

            <div class="filter-select">
              <select [ngModel]="selectedStatusFilter()" (ngModelChange)="selectedStatusFilter.set($event)">
                <option value="">Todos os Status</option>
                @for (item of statusList(); track item.id) {
                  <option [value]="item.situacao || item.nome">{{ item.situacao || item.nome }}</option>
                }
              </select>
            </div>
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
                  <th>Nome Servidor</th>
                  <th>CPF</th>
                  <th>Matrícula</th>
                  <th>Cargo</th>
                  <th>Secretaria</th>
                  <th>Contato</th>
                  <th>Status</th>
                  <th style="width: 100px; text-align: right;">Ações</th>
                </tr>
              </thead>
              <tbody>
                @for (serv of filteredServants(); track serv.id) {
                  <tr>
                    <td>#{{ serv.id }}</td>
                    <td><strong>{{ serv.nome }}</strong></td>
                    <td>{{ serv.cpf | cpf }}</td>
                    <td><span class="mat-tag">{{ serv.matricula }}</span></td>
                    <td>{{ serv.cargo }}</td>
                    <td><span class="sec-badge">{{ serv.secretaria }}</span></td>
                    <td>
                      <div class="contact-info">
                        <span class="email">{{ serv.email || '-' }}</span>
                        <span class="phone">{{ serv.telefone | phone }}</span>
                      </div>
                    </td>
                    <td>
                      <span class="badge-status" [ngClass]="serv.situacao === 'Inativo' ? 'status-inactive' : 'status-active'">
                        <span class="dot"></span>
                        {{ serv.situacao || 'Ativo' }}
                      </span>
                    </td>
                    <td style="text-align: right;">
                      <div class="action-buttons">
                        <button class="btn btn-icon btn-icon-accent" title="Editar" (click)="openEditModal(serv)">
                          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                        </button>
                        <button class="btn btn-icon btn-icon-danger" title="Excluir" (click)="promptDelete(serv)">
                          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                } @empty {
                  <tr>
                    <td colspan="9">
                      <div class="empty-state">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/></svg>
                        <h4>Nenhum servidor encontrado</h4>
                        <p>Nenhum servidor corresponde aos filtros aplicados.</p>
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

    <!-- Create / Edit Modal -->
    @if (isModalOpen()) {
      <div class="modal-backdrop" (click)="closeModal()">
        <div class="modal-card" (click)="$event.stopPropagation()">
          <div class="modal-header">
            <h3>{{ editingId() ? 'Editar Servidor' : 'Novo Servidor' }}</h3>
            <button class="modal-close" (click)="closeModal()">&times;</button>
          </div>

          <form [formGroup]="form" (ngSubmit)="save()">
            <div class="modal-body">
              <div class="form-group">
                <label>Nome Completo <span class="required">*</span></label>
                <input type="text" formControlName="nome" placeholder="Ex: João da Silva" />
                @if (form.get('nome')?.touched && form.get('nome')?.hasError('required')) {
                  <span class="form-error">O nome é obrigatório</span>
                }
              </div>

              <div class="form-grid">
                <div class="col-6 form-group">
                  <label>CPF <span class="required">*</span></label>
                  <input type="text" appCpfMask formControlName="cpf" placeholder="000.000.000-00" />
                  @if (form.get('cpf')?.touched && form.get('cpf')?.hasError('required')) {
                    <span class="form-error">O CPF é obrigatório</span>
                  }
                </div>

                <div class="col-6 form-group">
                  <label>Matrícula <span class="required">*</span></label>
                  <input type="text" formControlName="matricula" placeholder="Ex: 12345" />
                  @if (form.get('matricula')?.touched && form.get('matricula')?.hasError('required')) {
                    <span class="form-error">A matrícula é obrigatória</span>
                  }
                </div>
              </div>

              <div class="form-grid">
                <div class="col-6 form-group">
                  <label>Cargo / Função <span class="required">*</span></label>
                  <input type="text" formControlName="cargo" placeholder="Ex: Analista Administrativo" />
                  @if (form.get('cargo')?.touched && form.get('cargo')?.hasError('required')) {
                    <span class="form-error">O cargo é obrigatório</span>
                  }
                </div>

                <div class="col-6 form-group">
                  <label>Secretaria <span class="required">*</span></label>
                  <select formControlName="secretariaId">
                    <option value="">Selecione uma secretaria</option>
                    @for (sec of secretariats(); track sec.id) {
                      <option [value]="sec.id">{{ sec.nome }} ({{ sec.sigla }})</option>
                    }
                  </select>
                  @if (form.get('secretariaId')?.touched && form.get('secretariaId')?.hasError('required')) {
                    <span class="form-error">Selecione uma secretaria</span>
                  }
                </div>
              </div>

              <div class="form-grid">
                <div class="col-6 form-group">
                  <label>E-mail</label>
                  <input type="email" formControlName="email" placeholder="servidor@orgao.gov.br" />
                </div>

                <div class="col-6 form-group">
                  <label>Telefone</label>
                  <input type="text" appPhoneMask formControlName="telefone" placeholder="(00) 00000-0000" />
                </div>
              </div>

              <div class="form-group">
                <label>Status / Situação <span class="required">*</span></label>
                <select formControlName="ativoId">
                  @for (item of statusList(); track item.id) {
                    <option [value]="item.id">{{ item.nome || item.descricao || item.situacao }}</option>
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
                  <span>{{ editingId() ? 'Atualizar' : 'Cadastrar' }}</span>
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
      [title]="'Excluir Servidor'"
      [message]="'Tem certeza que deseja excluir o servidor ' + itemToDelete()?.nome + '?'"
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

    .filters-group {
      display: flex;
      gap: 0.75rem;
      align-items: center;
      flex-wrap: wrap;
      width: 100%;
    }

    .search-input-wrapper {
      position: relative;
      flex: 1;
      min-width: 240px;

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

    .filter-select {
      select {
        padding: 0.5rem 0.75rem;
        border: 1px solid $color-border;
        border-radius: $border-radius-sm;
        font-size: 0.875rem;
        background-color: #ffffff;

        &:focus {
          outline: none;
          border-color: $color-accent;
        }
      }
    }

    .mat-tag {
      font-weight: 600;
      font-size: 0.75rem;
      padding: 2px 6px;
      background-color: #f1f5f9;
      color: $color-secondary;
      border-radius: 4px;
    }

    .sec-badge {
      font-size: 0.8125rem;
      font-weight: 500;
      color: $color-secondary;
    }

    .contact-info {
      display: flex;
      flex-direction: column;
      font-size: 0.75rem;

      .email { color: $color-text; font-weight: 500; }
      .phone { color: $color-text-muted; }
    }

    .action-buttons {
      display: inline-flex;
      gap: 0.25rem;
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
      max-width: 600px;
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

  loading = signal<boolean>(true);
  submitting = signal<boolean>(false);
  deleting = signal<boolean>(false);

  isModalOpen = signal<boolean>(false);
  isDeleteModalOpen = signal<boolean>(false);
  editingId = signal<number | null>(null);
  itemToDelete = signal<Servant | null>(null);

  form: FormGroup = this.fb.group({
    nome: ['', Validators.required],
    cpf: ['', Validators.required],
    cargo: ['', Validators.required],
    matricula: ['', Validators.required],
    email: [''],
    telefone: [''],
    secretariaId: ['', Validators.required],
    ativoId: [1, Validators.required]
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

  filteredServants(): Servant[] {
    let result = this.servants();
    const term = this.searchTerm().toLowerCase().trim();
    const secFilter = this.selectedSecretariatFilter();
    const statusFilter = this.selectedStatusFilter();

    if (term) {
      result = result.filter(s =>
        s.nome.toLowerCase().includes(term) ||
        s.cpf.toString().includes(term) ||
        s.matricula.toString().includes(term)
      );
    }

    if (secFilter) {
      result = result.filter(s => s.secretaria === secFilter);
    }

    if (statusFilter) {
      result = result.filter(s => s.situacao === statusFilter);
    }

    return result;
  }

  openCreateModal(): void {
    this.editingId.set(null);
    this.form.reset({
      nome: '',
      cpf: '',
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
      cpf: item.cpf,
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
    if (this.form.invalid) return;

    this.submitting.set(true);
    const val = { ...this.form.value };
    val.cpf = val.cpf.replace(/\D/g, '');
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
