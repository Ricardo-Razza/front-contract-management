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
          <span class="breadcrumb-item">Sistema ARP</span>
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
      border-bottom: 1px solid $color-border;
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
  `]
})
export class HeaderComponent {
  @Input() title: string = 'Dashboard';
}
