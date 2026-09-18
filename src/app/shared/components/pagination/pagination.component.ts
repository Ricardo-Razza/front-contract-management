import { Component, EventEmitter, Input, Output, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-pagination',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (totalItems > 0) {
      <div class="pagination-container">
        <div class="pagination-info">
          <span>Exibindo <strong>{{ startIndex }}</strong> a <strong>{{ endIndex }}</strong> de <strong>{{ totalItems }}</strong> registros</span>
        </div>

        <div class="pagination-controls">
          <div class="page-size-selector">
            <label for="pageSize">Itens por página:</label>
            <select id="pageSize" [value]="pageSize" (change)="onPageSizeChange($event)">
              @for (size of pageSizeOptions; track size) {
                <option [value]="size">{{ size }}</option>
              }
            </select>
          </div>

          <div class="page-buttons">
            <button
              class="page-btn nav-btn"
              [disabled]="currentPage === 1"
              (click)="goToPage(1)"
              title="Primeira página"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                <polyline points="11 17 6 12 11 7"></polyline>
                <polyline points="18 17 13 12 18 7"></polyline>
              </svg>
            </button>

            <button
              class="page-btn nav-btn"
              [disabled]="currentPage === 1"
              (click)="goToPage(currentPage - 1)"
              title="Página anterior"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                <polyline points="15 18 9 12 15 6"></polyline>
              </svg>
            </button>

            @for (page of visiblePages; track page) {
              <button
                class="page-btn"
                [class.active]="page === currentPage"
                (click)="goToPage(page)"
              >
                {{ page }}
              </button>
            }

            <button
              class="page-btn nav-btn"
              [disabled]="currentPage === totalPages"
              (click)="goToPage(currentPage + 1)"
              title="Próxima página"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                <polyline points="9 18 15 12 9 6"></polyline>
              </svg>
            </button>

            <button
              class="page-btn nav-btn"
              [disabled]="currentPage === totalPages"
              (click)="goToPage(totalPages)"
              title="Última página"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                <polyline points="13 17 18 12 13 7"></polyline>
                <polyline points="6 17 11 12 6 7"></polyline>
              </svg>
            </button>
          </div>
        </div>
      </div>
    }
  `,
  styles: [`
    @use 'variables' as *;

    .pagination-container {
      display: flex;
      align-items: center;
      justify-content: space-between;
      flex-wrap: wrap;
      gap: 1rem;
      padding: 1rem 1.5rem;
      background-color: #ffffff;
      border-top: 1px solid $color-border;
      font-size: 0.8125rem;
      color: $color-text-muted;
    }

    .pagination-info {
      font-weight: 500;
      strong {
        color: $color-secondary;
      }
    }

    .pagination-controls {
      display: flex;
      align-items: center;
      gap: 1.5rem;
      flex-wrap: wrap;
    }

    .page-size-selector {
      display: flex;
      align-items: center;
      gap: 0.5rem;

      label {
        font-size: 0.8125rem;
        color: $color-text-muted;
      }

      select {
        height: 32px;
        padding: 0 1.75rem 0 0.65rem;
        border: 1.5px solid #e2e8f0;
        border-radius: 8px;
        background: #f8fafc url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='10' viewBox='0 0 24 24' fill='none' stroke='%2364748b' stroke-width='2.5'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E") no-repeat right 8px center;
        -webkit-appearance: none;
        appearance: none;
        font-size: 0.8125rem;
        font-family: inherit;
        color: $color-secondary;
        cursor: pointer;
        transition: all 0.15s ease;

        &:focus {
          outline: none;
          border-color: $color-accent;
          background-color: #ffffff;
          box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
        }
      }
    }

    .page-buttons {
      display: flex;
      align-items: center;
      gap: 0.35rem;
    }

    .page-btn {
      min-width: 32px;
      height: 32px;
      padding: 0 0.5rem;
      border: 1.5px solid #e2e8f0;
      border-radius: 8px;
      background-color: #ffffff;
      color: $color-secondary;
      font-size: 0.8125rem;
      font-weight: 500;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      transition: all 0.15s ease;

      &:hover:not(:disabled) {
        border-color: $color-accent;
        color: $color-accent;
        background-color: #eff6ff;
      }

      &.active {
        background-color: $color-accent;
        border-color: $color-accent;
        color: #ffffff;
        font-weight: 600;
        box-shadow: 0 2px 6px rgba(59, 130, 246, 0.3);
      }

      &:disabled {
        opacity: 0.35;
        cursor: not-allowed;
        background-color: #f8fafc;
        border-color: #e2e8f0;
      }

      &.nav-btn {
        padding: 0 6px;
        svg {
          display: block;
        }
      }
    }
  `]
})
export class PaginationComponent {
  @Input() totalItems: number = 0;
  @Input() currentPage: number = 1;
  @Input() pageSize: number = 10;
  @Input() pageSizeOptions: number[] = [5, 10, 25, 50];

  @Output() pageChange = new EventEmitter<number>();
  @Output() pageSizeChange = new EventEmitter<number>();

  get totalPages(): number {
    return Math.max(1, Math.ceil(this.totalItems / this.pageSize));
  }

  get startIndex(): number {
    if (this.totalItems === 0) return 0;
    return (this.currentPage - 1) * this.pageSize + 1;
  }

  get endIndex(): number {
    return Math.min(this.currentPage * this.pageSize, this.totalItems);
  }

  get visiblePages(): number[] {
    const total = this.totalPages;
    const current = this.currentPage;
    const delta = 2;
    const range: number[] = [];

    for (let i = Math.max(1, current - delta); i <= Math.min(total, current + delta); i++) {
      range.push(i);
    }

    return range;
  }

  goToPage(page: number): void {
    if (page >= 1 && page <= this.totalPages && page !== this.currentPage) {
      this.pageChange.emit(page);
    }
  }

  onPageSizeChange(event: Event): void {
    const select = event.target as HTMLSelectElement;
    const newSize = Number(select.value);
    this.pageSizeChange.emit(newSize);
  }
}
