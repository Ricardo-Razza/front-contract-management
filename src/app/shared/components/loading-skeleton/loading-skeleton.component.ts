import { Component, Input, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-loading-skeleton',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="skeleton-wrapper">
      @for (row of rowsArray; track $index) {
        <div class="skeleton-row">
          <div class="skeleton-cell cell-sm"></div>
          <div class="skeleton-cell cell-md"></div>
          <div class="skeleton-cell cell-lg"></div>
          <div class="skeleton-cell cell-sm"></div>
        </div>
      }
    </div>
  `,
  styles: [`
    @use 'variables' as *;

    .skeleton-wrapper {
      padding: 1rem;
      display: flex;
      flex-direction: column;
      gap: 1rem;
    }

    .skeleton-row {
      display: flex;
      gap: 1rem;
      align-items: center;
    }

    .skeleton-cell {
      height: 20px;
      background: linear-gradient(90deg, #f1f5f9 25%, #e2e8f0 50%, #f1f5f9 75%);
      background-size: 200% 100%;
      border-radius: 4px;
      animation: shimmer 1.5s infinite;

      &.cell-sm { width: 60px; }
      &.cell-md { width: 140px; }
      &.cell-lg { flex: 1; }
    }

    @keyframes shimmer {
      0% { background-position: -200% 0; }
      100% { background-position: 200% 0; }
    }
  `]
})
export class LoadingSkeletonComponent {
  @Input() rows: number = 4;

  get rowsArray(): number[] {
    return Array(this.rows).fill(0);
  }
}
