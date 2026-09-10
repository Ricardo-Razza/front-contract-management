import { Component, Input, inject, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AuthService } from '@core/services/auth.service';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <header class="app-header">
      <div class="header-left">
        <div class="breadcrumb">
          <span class="breadcrumb-item">Sistema ARP</span>
          <span class="separator">/</span>
          <span class="breadcrumb-item active">{{ title }}</span>
        </div>
      </div>
      <div class="header-right">
        <button class="btn-logout" (click)="onLogout()" title="Sair do sistema" aria-label="Sair do sistema">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
            <polyline points="16 17 21 12 16 7"></polyline>
            <line x1="21" y1="12" x2="9" y2="12"></line>
          </svg>
          <span>Sair</span>
        </button>
      </div>
    </header>
  `,
  styles: [`
    @use 'variables' as *;

    .app-header {
      height: $header-height;
      background-color: #ffffff;
      border-bottom: 1px solid $color-border;
      padding: 0 2rem 0 5rem;
      display: flex;
      align-items: center;
      justify-content: space-between;
      position: sticky;
      top: 0;
      z-index: 90;
    }

    .header-left {
      display: flex;
      align-items: center;
    }

    .breadcrumb {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      font-size: 0.8125rem;
      color: $color-text-muted;

      .separator {
        color: $color-border-dark;
      }

      .active {
        color: $color-secondary;
        font-weight: 600;
      }
    }

    .header-right {
      display: flex;
      align-items: center;
    }

    .btn-logout {
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.45rem 0.875rem;
      font-family: inherit;
      font-size: 0.8125rem;
      font-weight: 600;
      color: $color-text-muted;
      background-color: transparent;
      border: 1px solid $color-border;
      border-radius: $border-radius-sm;
      cursor: pointer;
      transition: all 0.15s ease-in-out;

      svg {
        width: 16px;
        height: 16px;
      }

      &:hover {
        background-color: $color-danger-bg;
        border-color: #fecaca;
        color: $color-danger;
      }
    }
  `]
})
export class HeaderComponent {
  @Input() title: string = 'Dashboard';
  private authService = inject(AuthService);

  onLogout(): void {
    this.authService.logout();
  }
}
