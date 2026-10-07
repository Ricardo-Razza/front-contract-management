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
  isMobile = signal(typeof window !== 'undefined' && window.innerWidth <= 1024);

  @HostListener('window:resize')
  onResize(): void {
    const mobile = window.innerWidth <= 1024;
    if (mobile !== this.isMobile()) this.closeSidebar();
    this.isMobile.set(mobile);
  }

  @HostListener('document:keydown.escape')
  closeSidebar(): void {
    this.isSidebarOpen.set(false);
  }

  toggleSidebar(): void {
    this.isSidebarOpen.update(value => !value);
  }
}
