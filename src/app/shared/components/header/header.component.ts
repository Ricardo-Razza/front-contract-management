import { Component, Input, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <header class="app-header">
      <div class="header-left">
        <div class="breadcrumb">
          <span class="system-badge">Sistema ARP</span>
          <span class="separator">/</span>
          <span class="breadcrumb-item active">{{ title }}</span>
        </div>
      </div>
    </header>
  `,
  styles: [`
    @use 'variables' as *;

    .app-header {
      height: $header-height;
      background-color: #ffffff;
      border-bottom: 1px solid #e2e8f0;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.03);
      padding: 0 2rem 0 5rem;
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
      gap: 0.65rem;
      font-size: 0.875rem;

      .system-badge {
        font-size: 0.75rem;
        font-weight: 700;
        text-transform: uppercase;
        letter-spacing: 0.04em;
        background: #f1f5f9;
        color: #475569;
        padding: 3px 8px;
        border-radius: 6px;
        border: 1px solid #e2e8f0;
      }

      .separator {
        color: #94a3b8;
        font-weight: 400;
      }

      .active {
        color: #0f172a;
        font-weight: 700;
        font-size: 0.925rem;
      }
    }
  `]
})
export class HeaderComponent {
  @Input() title: string = 'Dashboard';
}
