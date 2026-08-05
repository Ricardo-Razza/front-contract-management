import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [CommonModule],
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
        <div class="api-badge" title="API Backend URL: http://localhost:8081/api">
          <span class="status-dot"></span>
          <span class="api-label">API: localhost:8081</span>
        </div>
      </div>
    </header>
  `,
  styles: [`
    @use 'variables' as *;

    .app-header {
      height: $header-height;
      background-color: #ffffff;
      border-bottom: 1px solid $color-border;
      padding: 0 2rem;
      display: flex;
      align-items: center;
      justify-content: space-between;
      position: sticky;
      top: 0;
      z-index: 90;
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

    .api-badge {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.375rem 0.75rem;
      background-color: #f8fafc;
      border: 1px solid $color-border;
      border-radius: 9999px;
      font-size: 0.75rem;
      font-weight: 600;
      color: $color-text-muted;

      .status-dot {
        width: 8px;
        height: 8px;
        border-radius: 50%;
        background-color: $color-success;
        box-shadow: 0 0 0 2px rgba(34, 197, 94, 0.2);
      }
    }
  `]
})
export class HeaderComponent {
  @Input() title: string = 'Dashboard';
}
