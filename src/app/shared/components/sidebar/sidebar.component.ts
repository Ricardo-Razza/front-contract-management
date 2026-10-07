import { ChangeDetectionStrategy, Component, ElementRef, EventEmitter, HostBinding, HostListener, Input, OnChanges, OnDestroy, Output, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, RouterLinkActive } from '@angular/router';

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './sidebar.component.html',
  styleUrl: './sidebar.component.scss'
})
export class SidebarComponent implements OnChanges, OnDestroy {
  @Input() isOpen = false;
  @Input() isMobile = false;
  @Output() closeSidebar = new EventEmitter<void>();

  private readonly element = inject<ElementRef<HTMLElement>>(ElementRef);
  readonly isHovered = signal(false);
  readonly isPinned = signal(this.readPinnedPreference());
  private hoverTimer?: ReturnType<typeof setTimeout>;
  private focusFrame?: number;
  private returnFocus?: HTMLElement;
  private suppressHover = false;

  @HostBinding('class.open') get openClass(): boolean { return this.isOpen; }
  @HostBinding('class.hovered') get hoveredClass(): boolean { return !this.isMobile && this.isHovered(); }
  @HostBinding('class.pinned') get pinnedClass(): boolean { return !this.isMobile && this.isPinned(); }

  ngOnChanges(): void {
    this.clearHoverTimer();
    this.isHovered.set(false);
    if (this.focusFrame !== undefined) cancelAnimationFrame(this.focusFrame);
    if (this.isMobile && this.isOpen) {
      this.returnFocus ??= document.querySelector<HTMLElement>('[aria-controls="sidebar-navigation"]') ?? undefined;
      this.focusFrame = requestAnimationFrame(() => {
        this.element.nativeElement.querySelector<HTMLButtonElement>('.btn-close-sidebar')?.focus();
        this.focusFrame = undefined;
      });
    } else if (this.returnFocus) {
      const target = this.returnFocus;
      this.returnFocus = undefined;
      this.focusFrame = requestAnimationFrame(() => {
        if (target.isConnected && !this.isOpen && this.isMobile) target.focus();
        this.focusFrame = undefined;
      });
    }
  }

  onMouseEnter(): void {
    this.clearHoverTimer();
    if (this.isMobile || this.suppressHover) return;
    this.hoverTimer = setTimeout(() => this.isHovered.set(true), 140);
  }

  onMouseLeave(): void {
    this.clearHoverTimer();
    this.suppressHover = false;
    this.hoverTimer = setTimeout(() => this.isHovered.set(false), 220);
  }

  togglePinned(event: MouseEvent): void {
    this.isPinned.update(value => !value);
    try { localStorage.setItem('arp.sidebar.pinned', String(this.isPinned())); } catch { /* Storage may be unavailable. */ }
    if (!this.isPinned()) {
      this.clearHoverTimer();
      this.isHovered.set(false);
      this.suppressHover = true;
      if (event.detail > 0 && event.currentTarget instanceof HTMLElement) event.currentTarget.blur();
    }
  }

  onCloseSidebar(event?: MouseEvent): void {
    this.clearHoverTimer();
    this.suppressHover = true;
    this.isHovered.set(false);
    if (event && event.detail > 0 && event.currentTarget instanceof HTMLElement) event.currentTarget.blur();
    this.closeSidebar.emit();
  }

  onItemClick(event?: MouseEvent): void {
    if (this.isMobile) this.onCloseSidebar(event);
  }

  @HostListener('keydown', ['$event'])
  onKeydown(event: KeyboardEvent): void {
    if (event.key === 'Escape') {
      if (this.isMobile && this.isOpen) {
        event.preventDefault();
        event.stopPropagation();
        this.onCloseSidebar();
      } else {
        this.clearHoverTimer();
        this.isHovered.set(false);
      }
    }
    if (event.key !== 'Tab' || !this.isMobile || !this.isOpen) return;
    const controls = Array.from(this.element.nativeElement.querySelectorAll<HTMLElement>('a[href], button'))
      .filter(control => control.getClientRects().length > 0);
    const first = controls[0];
    const last = controls[controls.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last?.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first?.focus();
    }
  }

  ngOnDestroy(): void {
    this.clearHoverTimer();
    if (this.focusFrame !== undefined) cancelAnimationFrame(this.focusFrame);
  }

  private clearHoverTimer(): void {
    if (this.hoverTimer !== undefined) clearTimeout(this.hoverTimer);
    this.hoverTimer = undefined;
  }

  private readPinnedPreference(): boolean {
    try { return localStorage.getItem('arp.sidebar.pinned') === 'true'; } catch { return false; }
  }
}
