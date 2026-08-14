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
              &laquo;
            </button>

            <button
              class="page-btn nav-btn"
              [disabled]="currentPage === 1"
              (click)="goToPage(currentPage - 1)"
              title="Página anterior"
            >
              &lsaquo;
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
              &rsaquo;
            </button>

            <button
              class="page-btn nav-btn"
              [disabled]="currentPage === totalPages"
              (click)="goToPage(totalPages)"
              title="Última página"
            >
              &raquo;
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
        padding: 0.25rem 0.5rem;
        border: 1px solid $color-border;
        border-radius: 6px;
        background-color: #ffffff;
        font-size: 0.8125rem;
        color: $color-secondary;
        cursor: pointer;

        &:focus {
          outline: none;
          border-color: $color-accent;
        }
      }
    }

    .page-buttons {
      display: flex;
      align-items: center;
      gap: 0.25rem;
    }

    .page-btn {
      min-width: 32px;
      height: 32px;
      padding: 0 0.5rem;
      border: 1px solid $color-border;
      border-radius: 6px;
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
        background-color: #f8fafc;
      }

      &.active {
        background-color: $color-accent;
        border-color: $color-accent;
        color: #ffffff;
        font-weight: 600;
      }

      &:disabled {
        opacity: 0.4;
        cursor: not-allowed;
        background-color: #f1f5f9;
      }

      &.nav-btn {
        font-size: 1.125rem;
        line-height: 1;
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
