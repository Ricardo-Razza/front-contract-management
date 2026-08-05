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
                  <th style="width: 70px;">ID</th>
                  <th>Nº / Ano</th>
                  <th>Tipo</th>
                  <th>Objeto da Ata</th>
                  <th>Data Início</th>
                  <th>Data Fim</th>
                  <th>Secretarias Participantes</th>
                  <th>Status</th>
                  <th style="width: 80px; text-align: right;">Ações</th>
                </tr>
              </thead>
              <tbody>
                @for (ata of filteredAgreements(); track ata.id) {
                  <tr>
                    <td>#{{ ata.id }}</td>
                    <td><strong>{{ ata.numero }}/{{ ata.ano }}</strong></td>
                    <td><span class="type-tag">{{ ata.tipo || 'Bens e Produtos' }}</span></td>
                    <td class="td-object" [title]="ata.objeto">{{ ata.objeto }}</td>
                    <td>{{ ata.dataInicio | date:'dd/MM/yyyy' }}</td>
                    <td>{{ ata.dataFim | date:'dd/MM/yyyy' }}</td>
                    <td>
                      <div class="sec-list">
                        @for (sec of ata.secretarias; track sec.id) {
                          <span class="sec-pill" [title]="sec.nome">{{ sec.sigla || sec.nome }}</span>
                        } @empty {
                          <span class="text-muted">Nenhuma</span>
                        }
                      </div>
                    </td>
                    <td>
                      <span class="badge-status" [ngClass]="ata.situacao === 'Inativo' ? 'status-inactive' : 'status-active'">
                        <span class="dot"></span>
                        {{ ata.situacao || 'Ativo' }}
                      </span>
                    </td>
                    <td style="text-align: right;">
                      <button class="btn btn-icon btn-icon-danger" title="Excluir (Cascata)" (click)="promptDelete(ata)">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>
                      </button>
                    </td>
                  </tr>
                } @empty {
                  <tr>
                    <td colspan="9">
                      <div class="empty-state">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/></svg>
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
                      <option [value]="item.id">{{ item.nome || item.tipo || item.descricao }}</option>
                    }
                  </select>
                </div>

                <div class="col-6 form-group">
                  <label>Situação <span class="required">*</span></label>
                  <select formControlName="ativoId">
                    @for (item of statusList(); track item.id) {
                      <option [value]="item.id">{{ item.nome || item.situacao || item.descricao }}</option>
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

    .type-tag {
      font-size: 0.75rem;
      font-weight: 600;
      padding: 3px 8px;
      background-color: #eff6ff;
      color: #2563eb;
      border-radius: 4px;
    }

    .td-object {
      max-width: 280px;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .sec-list {
      display: flex;
      flex-wrap: wrap;
      gap: 4px;
    }

    .sec-pill {
      font-size: 0.6875rem;
      font-weight: 600;
      padding: 2px 6px;
      background-color: #f1f5f9;
      color: $color-secondary;
      border-radius: 4px;
      border: 1px solid $color-border;
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
  isDeleteModalOpen = signal<boolean>(false);
  itemToDelete = signal<Agreement | null>(null);

  form: FormGroup = this.fb.group({
    numero: ['', Validators.required],
    ano: [new Date().getFullYear(), Validators.required],
    dataInicio: ['', Validators.required],
    dataFim: ['', Validators.required],
    tipoId: [1, Validators.required],
    objeto: ['', Validators.required],
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
      ativoId: 1
    });
    this.isModalOpen.set(true);
  }

  closeModal(): void {
    this.isModalOpen.set(false);
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

  save(): void {
    if (this.form.invalid) return;

    if (this.selectedSecretariatIds().length === 0) {
      this.toast.warning('Selecione pelo menos uma secretaria participante.');
      return;
    }

    this.submitting.set(true);
    const dto = {
      ...this.form.value,
      secretariaIds: this.selectedSecretariatIds()
    };

    this.ataService.create(dto).subscribe({
      next: () => {
        this.toast.success('Ata cadastrada com sucesso!');
        this.submitting.set(false);
        this.closeModal();
        this.loadData();
      },
      error: () => {
        this.toast.error('Erro ao cadastrar ata.');
        this.submitting.set(false);
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
      error: () => {
        this.toast.error('Erro ao excluir ata.');
        this.deleting.set(false);
      }
    });
  }
}
