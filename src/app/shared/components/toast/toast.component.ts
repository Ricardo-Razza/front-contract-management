import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ToastService } from '../../../core/services/toast.service';

@Component({
  selector: 'app-toast',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="toast-container">
      @for (toast of toastService.toasts(); track toast.id) {
        <div class="toast toast-{{ toast.type }}" (click)="toastService.remove(toast.id)">
          <div class="toast-icon">
            @if (toast.type === 'success') {
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg>
            } @else if (toast.type === 'danger') {
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>
            } @else if (toast.type === 'warning') {
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
            } @else {
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>
            }
          </div>
          <div class="toast-content">
            @if (toast.title) {
              <div class="toast-title">{{ toast.title }}</div>
            }
            <div class="toast-message">{{ toast.message }}</div>
          </div>
          <button class="toast-close" (click)="toastService.remove(toast.id); $event.stopPropagation()">&times;</button>
        </div>
      }
    </div>
  `,
  styles: [`
    @use 'variables' as *;

    .toast-container {
      position: fixed;
      top: 1.25rem;
      right: 1.25rem;
      z-index: 9999;
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
      max-width: 400px;
      width: 100%;
      pointer-events: none;
    }

    .toast {
      pointer-events: auto;
      display: flex;
      align-items: flex-start;
      gap: 0.875rem;
      padding: 1rem 1.25rem;
      border-radius: $border-radius-md;
      background: #ffffff;
      box-shadow: $shadow-lg;
      border-left: 4px solid transparent;
      cursor: pointer;
      animation: slideIn 0.2s cubic-bezier(0.16, 1, 0.3, 1);

      .toast-icon {
        svg {
          width: 20px;
          height: 20px;
        }
      }

      .toast-content {
        flex: 1;

        .toast-title {
          font-weight: 700;
          font-size: 0.875rem;
          margin-bottom: 2px;
          color: $color-secondary;
        }

        .toast-message {
          font-size: 0.8125rem;
          color: $color-text-muted;
        }
      }

      .toast-close {
        background: none;
        border: none;
        font-size: 1.25rem;
        color: $color-text-light;
        cursor: pointer;
        line-height: 1;

        &:hover {
          color: $color-secondary;
        }
      }

      &.toast-success {
        border-left-color: $color-success;
        .toast-icon svg { color: $color-success; }
      }

      &.toast-danger {
        border-left-color: $color-danger;
        .toast-icon svg { color: $color-danger; }
      }

      &.toast-warning {
        border-left-color: $color-warning;
        .toast-icon svg { color: $color-warning; }
      }

      &.toast-info {
        border-left-color: $color-accent;
        .toast-icon svg { color: $color-accent; }
      }
    }

    @keyframes slideIn {
      from {
        opacity: 0;
        transform: translateX(100%);
      }
      to {
        opacity: 1;
        transform: translateX(0);
      }
    }
  `]
})
export class ToastComponent {
  toastService = inject(ToastService);
}
