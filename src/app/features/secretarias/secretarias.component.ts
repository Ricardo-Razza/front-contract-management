import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { HeaderComponent } from '../../shared/components/header/header.component';
import { ConfirmModalComponent } from '../../shared/components/confirm-modal/confirm-modal.component';
import { LoadingSkeletonComponent } from '../../shared/components/loading-skeleton/loading-skeleton.component';
import { SecretariaService } from '../../core/services/secretaria.service';
import { LookupService } from '../../core/services/lookup.service';
import { ToastService } from '../../core/services/toast.service';
import { Secretariat, LookupItem } from '../../core/models/api.models';

@Component({
  selector: 'app-secretarias',
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
    <app-header title="Secretarias"></app-header>

    <div class="page-content">
      <div class="page-title-group">
        <div class="title-with-actions">
          <div>
            <h1>Secretarias</h1>
            <p>Gerencie as secretarias públicas participantes do sistema de ARP</p>
          </div>
          <button class="btn btn-primary" (click)="openCreateModal()">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            Nova Secretaria
          </button>
        </div>
      </div>

      <div class="table-card">
        <div class="table-header-toolbar">
          <div class="search-input-wrapper">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
            <input
              type="text"
              placeholder="Buscar por nome ou sigla..."
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
                  <th style="width: 80px;">ID</th>
                  <th>Nome da Secretaria</th>
                  <th>Sigla</th>
                  <th>Situação</th>
                  <th style="width: 120px; text-align: right;">Ações</th>
                </tr>
              </thead>
              <tbody>
                @for (sec of filteredSecretariats(); track sec.id) {
                  <tr>
                    <td>#{{ sec.id }}</td>
                    <td><strong>{{ sec.nome }}</strong></td>
                    <td><span class="acronym-badge">{{ sec.sigla }}</span></td>
                    <td>
                      <span class="badge-status" [ngClass]="sec.situacao === 'Inativo' ? 'status-inactive' : 'status-active'">
                        <span class="dot"></span>
                        {{ sec.situacao || 'Ativo' }}
                      </span>
                    </td>
                    <td style="text-align: right;">
                      <div class="action-buttons">
                        <button class="btn btn-icon btn-icon-accent" title="Editar" (click)="openEditModal(sec)">
                          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                        </button>
                        <button class="btn btn-icon btn-icon-danger" title="Excluir" (click)="promptDelete(sec)">
                          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                } @empty {
                  <tr>
                    <td colspan="5">
                      <div class="empty-state">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 21h18"/><path d="M5 21V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16"/></svg>
                        <h4>Nenhuma secretaria encontrada</h4>
                        <p>Clique em "Nova Secretaria" para cadastrar a primeira secretaria no sistema.</p>
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

    <!-- Modal Form (Create / Edit) -->
    @if (isModalOpen()) {
      <div class="modal-backdrop" (click)="closeModal()">
        <div class="modal-card" (click)="$event.stopPropagation()">
          <div class="modal-header">
            <h3>{{ editingId() ? 'Editar Secretaria' : 'Nova Secretaria' }}</h3>
            <button class="modal-close" (click)="closeModal()">&times;</button>
          </div>

          <form [formGroup]="form" (ngSubmit)="save()">
            <div class="modal-body">
              <div class="form-group">
                <label>Nome da Secretaria <span class="required">*</span></label>
                <input type="text" formControlName="nome" placeholder="Ex: Secretaria de Educação" />
                @if (form.get('nome')?.touched && form.get('nome')?.hasError('required')) {
                  <span class="form-error">O nome é obrigatório</span>
                }
              </div>

              <div class="form-grid">
                <div class="col-6 form-group">
                  <label>Sigla <span class="required">*</span></label>
                  <input type="text" formControlName="sigla" placeholder="Ex: SEMED" style="text-transform: uppercase;" />
                  @if (form.get('sigla')?.touched && form.get('sigla')?.hasError('required')) {
                    <span class="form-error">A sigla é obrigatória</span>
                  }
                </div>

                <div class="col-6 form-group">
                  <label>Status / Situação <span class="required">*</span></label>
                  <select formControlName="ativoId">
                    @for (item of statusList(); track item.id) {
                      <option [value]="item.id">{{ item.nome || item.descricao || item.situacao }}</option>
                    }
                  </select>
                </div>
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
      [title]="'Excluir Secretaria'"
      [message]="'Tem certeza que deseja excluir a secretaria ' + itemToDelete()?.nome + '?'"
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

    .acronym-badge {
      font-weight: 700;
      font-size: 0.75rem;
      padding: 3px 8px;
      background-color: #f1f5f9;
      color: $color-secondary;
      border-radius: 4px;
      border: 1px solid $color-border;
    }

    .action-buttons {
      display: inline-flex;
      gap: 0.25rem;
    }

    // Modal Form Styles
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
      max-width: 520px;
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
        line-height: 1;

        &:hover {
          color: $color-secondary;
        }
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
export class SecretariasComponent implements OnInit {
  private secService = inject(SecretariaService);
  private lookupService = inject(LookupService);
  private toast = inject(ToastService);
  private fb = inject(FormBuilder);

  secretariats = signal<Secretariat[]>([]);
  statusList = signal<LookupItem[]>([]);
  searchTerm = signal<string>('');
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

  filteredSecretariats(): Secretariat[] {
    const term = this.searchTerm().toLowerCase().trim();
    if (!term) return this.secretariats();

    return this.secretariats().filter(s =>
      s.nome.toLowerCase().includes(term) ||
      s.sigla.toLowerCase().includes(term)
    );
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
    if (this.form.invalid) return;

    this.submitting.set(true);
    const val = this.form.value;
    val.sigla = val.sigla.toUpperCase();

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
