import { Component, inject, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ToastService } from '@core/services';

@Component({
  selector: 'app-toast',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="toast-container" aria-live="polite">
      @for (toast of toastService.toasts(); track toast.id) {
        <div class="toast toast-{{ toast.type }}" (click)="toastService.remove(toast.id)" role="alert">
          <div class="toast-icon-badge">
            @if (toast.type === 'success') {
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                <polyline points="20 6 9 17 4 12"/>
              </svg>
            } @else if (toast.type === 'danger') {
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                <circle cx="12" cy="12" r="10"/>
                <line x1="15" y1="9" x2="9" y2="15"/>
                <line x1="9" y1="9" x2="15" y2="15"/>
              </svg>
            } @else if (toast.type === 'warning') {
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
                <line x1="12" y1="9" x2="12" y2="13"/>
                <line x1="12" y1="17" x2="12.01" y2="17"/>
              </svg>
            } @else {
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                <circle cx="12" cy="12" r="10"/>
                <line x1="12" y1="16" x2="12" y2="12"/>
                <line x1="12" y1="8" x2="12.01" y2="8"/>
              </svg>
            }
          </div>

          <div class="toast-content">
            @if (toast.title) {
              <div class="toast-title">{{ toast.title }}</div>
            }
            <div class="toast-message">{{ toast.message }}</div>
          </div>

          <button class="toast-close" (click)="toastService.remove(toast.id); $event.stopPropagation()" aria-label="Fechar notificação">
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"/>
              <line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>

          <div class="toast-progress-bar" [style.animation-duration.ms]="toast.duration || 4000"></div>
        </div>
      }
    </div>
  `,
  styles: [`
    @use 'variables' as *;

    .toast-container {
      position: fixed;
      top: 1.5rem;
      right: 1.5rem;
      z-index: 9999;
      display: flex;
      flex-direction: column;
      gap: 0.875rem;
      max-width: 420px;
      width: calc(100% - 3rem);
      pointer-events: none;
    }

    .toast {
      position: relative;
      pointer-events: auto;
      display: flex;
      align-items: flex-start;
      gap: 0.875rem;
      padding: 1rem 1.125rem;
      border-radius: 14px;
      background: #ffffff;
      border: 1px solid #e2e8f0;
      box-shadow: 0 12px 28px -4px rgba(15, 23, 42, 0.14), 0 4px 10px -2px rgba(15, 23, 42, 0.06);
      cursor: pointer;
      overflow: hidden;
      transition: transform 0.18s ease, box-shadow 0.18s ease;
      animation: slideInToast 0.28s cubic-bezier(0.16, 1, 0.3, 1);

      &:hover {
        transform: translateY(-2px);
        box-shadow: 0 16px 32px -4px rgba(15, 23, 42, 0.18), 0 6px 12px -2px rgba(15, 23, 42, 0.08);

        .toast-progress-bar {
          animation-play-state: paused;
        }
      }

      .toast-icon-badge {
        width: 36px;
        height: 36px;
        border-radius: 10px;
        display: flex;
        align-items: center;
        justify-content: center;
        flex-shrink: 0;
        margin-top: 1px;
      }

      .toast-content {
        flex: 1;
        min-width: 0;

        .toast-title {
          font-weight: 700;
          font-size: 0.875rem;
          color: #0f172a;
          margin-bottom: 3px;
          line-height: 1.3;
        }

        .toast-message {
          font-size: 0.8125rem;
          color: #475569;
          line-height: 1.45;
          word-break: break-word;
        }
      }

      .toast-close {
        background: transparent;
        border: none;
        width: 28px;
        height: 28px;
        border-radius: 8px;
        display: flex;
        align-items: center;
        justify-content: center;
        color: #94a3b8;
        cursor: pointer;
        padding: 0;
        margin: -2px -2px 0 0;
        flex-shrink: 0;
        transition: all 0.15s ease;

        &:hover {
          background-color: #f1f5f9;
          color: #0f172a;
        }
      }

      .toast-progress-bar {
        position: absolute;
        bottom: 0;
        left: 0;
        right: 0;
        height: 3px;
        width: 100%;
        animation: toastProgress linear forwards;
      }

      // Success
      &.toast-success {
        border-color: #bbf7d0;
        .toast-icon-badge {
          background: #ecfdf5;
          color: #059669;
        }
        .toast-progress-bar {
          background: linear-gradient(90deg, #10b981, #059669);
        }
      }

      // Danger / Error
      &.toast-danger {
        border-color: #fecaca;
        .toast-icon-badge {
          background: #fef2f2;
          color: #dc2626;
        }
        .toast-progress-bar {
          background: linear-gradient(90deg, #ef4444, #dc2626);
        }
      }

      // Warning
      &.toast-warning {
        border-color: #fde68a;
        .toast-icon-badge {
          background: #fffbeb;
          color: #d97706;
        }
        .toast-progress-bar {
          background: linear-gradient(90deg, #f59e0b, #d97706);
        }
      }

      // Info
      &.toast-info {
        border-color: #bfdbfe;
        .toast-icon-badge {
          background: #eff6ff;
          color: #2563eb;
        }
        .toast-progress-bar {
          background: linear-gradient(90deg, #3b82f6, #2563eb);
        }
      }
    }

    @keyframes slideInToast {
      from {
        opacity: 0;
        transform: translateY(-8px) scale(0.96);
      }
      to {
        opacity: 1;
        transform: translateY(0) scale(1);
      }
    }

    @keyframes toastProgress {
      from {
        width: 100%;
      }
      to {
        width: 0%;
      }
    }
  `]
})
export class ToastComponent {
  toastService = inject(ToastService);
}
