import { Component, signal, ChangeDetectionStrategy, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet } from '@angular/router';
import { SidebarComponent, ToastComponent } from '@shared';

@Component({
  selector: 'app-layout',
  standalone: true,
  imports: [CommonModule, RouterOutlet, SidebarComponent, ToastComponent],
  templateUrl: './layout.component.html',
  styleUrls: ['./layout.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class LayoutComponent {
  isSidebarOpen = signal(false);

  private hoverSuppressed = false;

  @HostListener('document:pointermove', ['$event'])
  onPointerMove(event: PointerEvent): void {
    if (!(event.target instanceof Element) || !event.target.closest('.btn-hamburger')) {
      this.hoverSuppressed = false;
    }
  }

  openOnHover(event: PointerEvent): void {
    if (event.pointerType === "mouse" && !this.hoverSuppressed) this.isSidebarOpen.set(true);
  }

  @HostListener("document:keydown.escape")
  closeSidebar(): void {
    this.hoverSuppressed = true;
    this.isSidebarOpen.set(false);
  }

  toggleSidebar(): void {
    this.isSidebarOpen.update(value => !value);
  }
}