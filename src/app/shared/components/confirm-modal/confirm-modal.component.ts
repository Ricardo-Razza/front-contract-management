import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-confirm-modal',
  standalone: true,
  imports: [CommonModule],
  template: `
    @if (isOpen) {
      <div class="modal-backdrop" (click)="onCancel()">
        <div class="modal-card" (click)="$event.stopPropagation()">
          <div class="modal-icon danger">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
              <line x1="12" y1="9" x2="12" y2="13"/>
              <line x1="12" y1="17" x2="12.01" y2="17"/>
            </svg>
          </div>

          <div class="modal-content">
            <h3>{{ title }}</h3>
            <p>{{ message }}</p>

            @if (isCascade) {
              <div class="cascade-warning">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                <span>Esta exclusão é em cascata e pode remover registros associados.</span>
              </div>
            }
          </div>

          <div class="modal-actions">
            <button class="btn btn-secondary" [disabled]="loading" (click)="onCancel()">
              Cancelar
            </button>
            <button class="btn btn-danger" [disabled]="loading" (click)="onConfirm()">
              @if (loading) {
                <span>Excluindo...</span>
              } @else {
                <span>Confirmar Exclusão</span>
              }
            </button>
          </div>
        </div>
      </div>
    }
  `,
  styles: [`
    @use 'variables' as *;

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
      animation: fadeIn 0.15s ease-out;
    }

    .modal-card {
      background: #ffffff;
      border-radius: $border-radius-lg;
      box-shadow: $shadow-lg;
      max-width: 440px;
      width: 100%;
      padding: 1.75rem;
      text-align: center;
      animation: scaleUp 0.15s cubic-bezier(0.16, 1, 0.3, 1);
    }

    .modal-icon {
      width: 56px;
      height: 56px;
      border-radius: 50%;
      margin: 0 auto 1.25rem;
      display: flex;
      align-items: center;
      justify-content: center;

      &.danger {
        background-color: $color-danger-bg;
        color: $color-danger;
      }

      svg {
        width: 28px;
        height: 28px;
      }
    }

    .modal-content {
      h3 {
        font-size: 1.125rem;
        font-weight: 700;
        color: $color-secondary;
        margin-bottom: 0.5rem;
      }

      p {
        font-size: 0.875rem;
        color: $color-text-muted;
        line-height: 1.4;
      }
    }

    .cascade-warning {
      margin-top: 1rem;
      padding: 0.75rem 1rem;
      background-color: #fffbebfb;
      border: 1px solid #fef3c7;
      border-radius: $border-radius-sm;
      display: flex;
      align-items: center;
      gap: 0.5rem;
      text-align: left;
      font-size: 0.75rem;
      color: #b45309;
      font-weight: 500;

      svg {
        width: 18px;
        height: 18px;
        flex-shrink: 0;
      }
    }

    .modal-actions {
      display: flex;
      gap: 0.75rem;
      margin-top: 1.75rem;

      .btn {
        flex: 1;
      }
    }

    @keyframes fadeIn {
      from { opacity: 0; }
      to { opacity: 1; }
    }

    @keyframes scaleUp {
      from { transform: scale(0.95); opacity: 0; }
      to { transform: scale(1); opacity: 1; }
    }
  `]
})
export class ConfirmModalComponent {
  @Input() isOpen = false;
  @Input() title = 'Confirmar Exclusão';
  @Input() message = 'Tem certeza que deseja excluir este registro? Esta ação não pode ser desfeita.';
  @Input() isCascade = false;
  @Input() loading = false;

  @Output() confirm = new EventEmitter<void>();
  @Output() cancel = new EventEmitter<void>();

  onConfirm(): void {
    this.confirm.emit();
  }

  onCancel(): void {
    if (!this.loading) {
      this.cancel.emit();
    }
  }
}
