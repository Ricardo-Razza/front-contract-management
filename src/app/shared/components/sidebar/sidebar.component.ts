import { Component, EventEmitter, HostBinding, HostListener, Input, Output, ChangeDetectionStrategy, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, RouterLinkActive } from '@angular/router';

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <aside class="sidebar" (mouseenter)="onMouseEnter()" (mouseleave)="onMouseLeave()">
      <div class="sidebar-inner">
        <div class="brand">
          <div class="brand-info">
            <div class="brand-logo" title="ARP System">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                <polyline points="14 2 14 8 20 8"></polyline>
                <line x1="16" y1="13" x2="8" y2="13"></line>
                <line x1="16" y1="17" x2="8" y2="17"></line>
                <polyline points="10 9 9 9 8 9"></polyline>
              </svg>
            </div>
            <div class="brand-text">
              <span class="brand-title">ARP System</span>
              <span class="brand-subtitle">Gestão de Atas</span>
            </div>
          </div>
          <button class="btn-close-sidebar" (click)="onCloseSidebar($event)" aria-label="Fechar menu" title="Fechar menu">
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>

        <nav class="nav-menu">
          <div class="nav-section"><span>PAINEL PRINCIPAL</span></div>

          <a routerLink="/dashboard" routerLinkActive="active" class="nav-item" (click)="onItemClick($event)" title="Dashboard">
            <div class="nav-icon">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <rect x="3" y="3" width="7" height="7"></rect>
                <rect x="14" y="3" width="7" height="7"></rect>
                <rect x="14" y="14" width="7" height="7"></rect>
                <rect x="3" y="14" width="7" height="7"></rect>
              </svg>
            </div>
            <span class="nav-label">Dashboard</span>
          </a>

          <div class="nav-section"><span>CADASTROS DE BASE</span></div>

          <a routerLink="/secretarias" routerLinkActive="active" class="nav-item" (click)="onItemClick($event)" title="Secretarias">
            <div class="nav-icon">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M3 21h18"></path>
                <path d="M9 8h1"></path>
                <path d="M9 12h1"></path>
                <path d="M9 16h1"></path>
                <path d="M14 8h1"></path>
                <path d="M14 12h1"></path>
                <path d="M14 16h1"></path>
                <path d="M5 21V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16"></path>
              </svg>
            </div>
            <span class="nav-label">Secretarias</span>
          </a>

          <a routerLink="/servidores" routerLinkActive="active" class="nav-item" (click)="onItemClick($event)" title="Servidores">
            <div class="nav-icon">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                <circle cx="9" cy="7" r="4"></circle>
                <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
                <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
              </svg>
            </div>
            <span class="nav-label">Servidores</span>
          </a>

          <a routerLink="/ferias" routerLinkActive="active" class="nav-item" (click)="onItemClick($event)" title="Escala de Férias">
            <div class="nav-icon">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                <line x1="16" y1="2" x2="16" y2="6"></line>
                <line x1="8" y1="2" x2="8" y2="6"></line>
                <line x1="3" y1="10" x2="21" y2="10"></line>
                <path d="M8 14h.01"></path>
                <path d="M12 14h.01"></path>
                <path d="M16 14h.01"></path>
                <path d="M8 18h.01"></path>
                <path d="M12 18h.01"></path>
                <path d="M16 18h.01"></path>
              </svg>
            </div>
            <span class="nav-label">Escala de Férias</span>
          </a>

          <div class="nav-section"><span>GESTÃO DE ACORDOS</span></div>

          <a routerLink="/atas" routerLinkActive="active" class="nav-item" (click)="onItemClick($event)" title="Atas de Preços">
            <div class="nav-icon">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                <polyline points="14 2 14 8 20 8"></polyline>
                <path d="m9 15 2 2 4-4"></path>
              </svg>
            </div>
            <span class="nav-label">Atas de Preços</span>
          </a>

          <a routerLink="/contratos" routerLinkActive="active" class="nav-item" (click)="onItemClick($event)" title="Contratos">
            <div class="nav-icon">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"></path>
                <rect x="8" y="2" width="8" height="4" rx="1" ry="1"></rect>
                <line x1="9" y1="12" x2="15" y2="12"></line>
                <line x1="9" y1="16" x2="15" y2="16"></line>
              </svg>
            </div>
            <span class="nav-label">Contratos</span>
          </a>

          <a routerLink="/equipes" routerLinkActive="active" class="nav-item" (click)="onItemClick($event)" title="Equipes de Contrato">
            <div class="nav-icon">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"></path>
                <circle cx="9" cy="7" r="4"></circle>
                <line x1="19" y1="8" x2="19" y2="14"></line>
                <line x1="22" y1="11" x2="16" y2="11"></line>
              </svg>
            </div>
            <span class="nav-label">Equipes de Contrato</span>
          </a>

          <div class="nav-section"><span>GESTÃO DE IMPRESSÃO</span></div>

          <a routerLink="/impressoras" routerLinkActive="active" class="nav-item" (click)="onItemClick($event)" title="Impressoras">
            <div class="nav-icon">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <polyline points="6 9 6 2 18 2 18 9"></polyline>
                <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path>
                <rect x="6" y="14" width="12" height="8"></rect>
              </svg>
            </div>
            <span class="nav-label">Impressoras</span>
          </a>
        </nav>

        <div class="sidebar-footer">
          <div class="user-info">
            <div class="avatar" title="Administrador">ADM</div>
            <div class="user-details">
              <span class="user-name">Administrador</span>
              <span class="user-role">Gestão Municipal</span>
            </div>
          </div>
          <div class="system-meta">
            <span class="status-indicator"></span>
            <span>ARP System • v1.0</span>
          </div>
        </div>
      </div>
    </aside>
  `,
  styles: [`
    @use 'variables' as *;

    :host {
      display: block;
      height: 100vh;
      width: var(--sidebar-collapsed-width, 68px);
      position: relative;
      z-index: 1100;
      flex-shrink: 0;
    }

    .sidebar {
      position: absolute;
      top: 0;
      left: 0;
      bottom: 0;
      width: var(--sidebar-collapsed-width, 68px);
      height: 100vh;
      background-color: $color-secondary;
      color: #ffffff;
      display: flex;
      flex-direction: column;
      box-shadow: 2px 0 10px rgba(0, 0, 0, 0.1);
      transition: width 0.25s cubic-bezier(0.4, 0, 0.2, 1), box-shadow 0.25s ease;
      z-index: 1100;
      overflow-x: hidden;
      overflow-y: hidden;
      user-select: none;

      // Subtle invisible hit-area extension to trigger hover smoothly when approaching
      &::after {
        content: '';
        position: absolute;
        top: 0;
        bottom: 0;
        right: -16px;
        width: 16px;
        pointer-events: auto;
      }
    }

    .sidebar-inner {
      display: flex;
      flex-direction: column;
      height: 100%;
      width: var(--sidebar-width, 260px);
      flex-shrink: 0;
    }

    .brand {
      height: $header-height;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 0.75rem;
      padding: 0 1rem;
      border-bottom: 1px solid rgba(255, 255, 255, 0.08);
      flex-shrink: 0;

      .brand-info {
        display: flex;
        align-items: center;
        gap: 0.75rem;
      }

      .brand-logo {
        width: 36px;
        height: 36px;
        border-radius: 8px;
        background: linear-gradient(135deg, $color-accent, #1d4ed8);
        display: flex;
        align-items: center;
        justify-content: center;
        flex-shrink: 0;
        box-shadow: 0 2px 8px rgba(59, 130, 246, 0.3);

        svg {
          width: 20px;
          height: 20px;
          color: #ffffff;
        }
      }

      .brand-text {
        opacity: 0;
        transform: translateX(-8px);
        transition: opacity 0.2s cubic-bezier(0.4, 0, 0.2, 1), transform 0.2s cubic-bezier(0.4, 0, 0.2, 1);
        pointer-events: none;
        white-space: nowrap;

        .brand-title {
          display: block;
          font-weight: 700;
          font-size: 1rem;
          color: #ffffff;
          line-height: 1.1;
        }

        .brand-subtitle {
          display: block;
          font-size: 0.6875rem;
          color: #94a3b8;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }
      }

      .btn-close-sidebar {
        display: none;
        background: rgba(255, 255, 255, 0.06);
        border: 1px solid rgba(255, 255, 255, 0.08);
        border-radius: 8px;
        width: 32px;
        height: 32px;
        align-items: center;
        justify-content: center;
        color: #94a3b8;
        cursor: pointer;
        transition: all 0.2s ease-in-out;
        flex-shrink: 0;

        &:hover {
          background: rgba(255, 255, 255, 0.15);
          color: #ffffff;
          border-color: rgba(255, 255, 255, 0.2);
          transform: scale(1.05);
        }

        svg {
          width: 18px;
          height: 18px;
        }
      }
    }

    .nav-menu {
      flex: 1;
      padding: 0.875rem 0.625rem;
      display: flex;
      flex-direction: column;
      gap: 0.375rem;
      overflow-y: auto;
      overflow-x: hidden;

      &::-webkit-scrollbar {
        width: 4px;
      }

      &::-webkit-scrollbar-track {
        background: transparent;
      }

      &::-webkit-scrollbar-thumb {
        background: rgba(255, 255, 255, 0.12);
        border-radius: 4px;

        &:hover {
          background: rgba(255, 255, 255, 0.25);
        }
      }
    }

    .nav-section {
      height: 0;
      margin: 0;
      padding: 0;
      border: none;
      white-space: nowrap;
      overflow: hidden;
      opacity: 0;
      pointer-events: none;
      transition: opacity 0.2s cubic-bezier(0.4, 0, 0.2, 1), transform 0.2s cubic-bezier(0.4, 0, 0.2, 1);

      span {
        display: block;
        opacity: 0;
        transform: translateX(-8px);
        font-size: 0.6875rem;
        font-weight: 700;
        color: #64748b;
        letter-spacing: 0.08em;
        text-transform: uppercase;
        transition: opacity 0.2s cubic-bezier(0.4, 0, 0.2, 1), transform 0.2s cubic-bezier(0.4, 0, 0.2, 1);
      }
    }

    .nav-item {
      display: flex;
      align-items: center;
      height: 44px;
      padding: 0 0.875rem;
      color: #94a3b8;
      text-decoration: none;
      font-size: 0.875rem;
      font-weight: 500;
      border-radius: 8px;
      white-space: nowrap;
      transition: background-color 0.15s ease, color 0.15s ease, box-shadow 0.15s ease;
      cursor: pointer;
      outline: none;

      &:focus-visible {
        outline: 2px solid rgba(59, 130, 246, 0.6);
        outline-offset: 2px;
      }

      .nav-icon {
        width: 20px;
        height: 20px;
        min-width: 20px;
        display: flex;
        align-items: center;
        justify-content: center;
        color: #64748b;
        flex-shrink: 0;
        transition: color 0.15s ease;

        svg {
          width: 19px;
          height: 19px;
        }
      }

      .nav-label {
        margin-left: 0.875rem;
        white-space: nowrap;
        opacity: 0;
        transform: translateX(-8px);
        transition: opacity 0.2s cubic-bezier(0.4, 0, 0.2, 1), transform 0.2s cubic-bezier(0.4, 0, 0.2, 1);
        pointer-events: none;
      }

      &:hover {
        background-color: rgba(255, 255, 255, 0.07);
        color: #ffffff;

        .nav-icon {
          color: #ffffff;
        }
      }

      &.active {
        background-color: $color-accent;
        color: #ffffff;
        font-weight: 600;
        box-shadow: 0 4px 12px rgba(59, 130, 246, 0.35);

        .nav-icon {
          color: #ffffff;
        }
      }
    }

    .sidebar-footer {
      padding: 0.875rem 1rem;
      border-top: 1px solid rgba(255, 255, 255, 0.08);
      flex-shrink: 0;

      .user-info {
        display: flex;
        align-items: center;
      }

      .avatar {
        width: 36px;
        height: 36px;
        min-width: 36px;
        border-radius: 50%;
        background: linear-gradient(135deg, #3b82f6, #1d4ed8);
        color: #ffffff;
        font-weight: 700;
        font-size: 0.75rem;
        display: flex;
        align-items: center;
        justify-content: center;
        flex-shrink: 0;
        box-shadow: 0 2px 6px rgba(59, 130, 246, 0.3);
      }

      .user-details {
        margin-left: 0.75rem;
        opacity: 0;
        transform: translateX(-8px);
        transition: opacity 0.2s cubic-bezier(0.4, 0, 0.2, 1), transform 0.2s cubic-bezier(0.4, 0, 0.2, 1);
        pointer-events: none;
        white-space: nowrap;
        overflow: hidden;

        .user-name {
          display: block;
          font-size: 0.8125rem;
          font-weight: 600;
          color: #ffffff;
        }

        .user-role {
          display: block;
          font-size: 0.6875rem;
          color: #94a3b8;
        }
      }

      .system-meta {
        display: flex;
        align-items: center;
        gap: 6px;
        opacity: 0;
        max-height: 0;
        overflow: hidden;
        margin-top: 0;
        padding-top: 0;
        border-top: 0;
        font-size: 0.6875rem;
        color: #64748b;
        font-weight: 500;
        transition: opacity 0.2s ease, max-height 0.2s ease, margin-top 0.2s ease;

        .status-indicator {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: #22c55e;
          box-shadow: 0 0 6px rgba(34, 197, 94, 0.6);
        }
      }
    }

    // EXPANDED STATE on desktop: hover, keyboard focus, or open
    @media (min-width: 1025px) {
      :host(.hovered),
      :host(.open),
      :host(:has(:focus-visible)) {
        .sidebar {
          width: var(--sidebar-width, 260px);
          box-shadow: 8px 0 30px rgba(0, 0, 0, 0.28);
        }

        .brand-text {
          opacity: 1;
          transform: translateX(0);
          pointer-events: auto;
        }

        .nav-label {
          opacity: 1;
          transform: translateX(0);
          pointer-events: auto;
        }

        .nav-section {
          height: auto;
          margin: 0.5rem 0 0.125rem;
          padding: 0.375rem 0.625rem;
          border: none;
          opacity: 1;

          &:first-of-type {
            margin-top: 0;
          }

          span {
            opacity: 1;
            transform: translateX(0);
          }
        }

        .user-details {
          opacity: 1;
          transform: translateX(0);
          pointer-events: auto;
        }

        .system-meta {
          opacity: 1;
          max-height: 40px;
          margin-top: 0.75rem;
          padding-top: 0.65rem;
          border-top: 1px solid rgba(255, 255, 255, 0.06);
        }
      }
    }

    // MOBILE / TABLET DRAWER MODE
    @media (max-width: 1024px) {
      :host {
        width: 0;
        position: fixed;
        inset: 0 auto 0 0;
        z-index: 1200;
        pointer-events: none;
      }

      :host(.open) {
        width: var(--sidebar-width, 260px);
        pointer-events: auto;
      }

      .sidebar {
        width: var(--sidebar-width, 260px);
        transform: translateX(-100%);
        transition: transform 0.28s cubic-bezier(0.4, 0, 0.2, 1), box-shadow 0.28s ease;

        &::after {
          display: none;
        }
      }

      :host(.open) .sidebar {
        transform: translateX(0);
        box-shadow: 6px 0 25px rgba(0, 0, 0, 0.35);
      }

      :host(.open) {
        .btn-close-sidebar {
          display: flex;
        }

        .brand-text {
          opacity: 1;
          transform: translateX(0);
          pointer-events: auto;
        }

        .nav-label {
          opacity: 1;
          transform: translateX(0);
          pointer-events: auto;
        }

        .nav-section {
          height: auto;
          margin: 0.5rem 0 0.125rem;
          padding: 0.375rem 0.625rem;
          border: none;
          opacity: 1;

          &:first-of-type {
            margin-top: 0;
          }

          span {
            opacity: 1;
            transform: translateX(0);
          }
        }

        .user-details {
          opacity: 1;
          transform: translateX(0);
          pointer-events: auto;
        }

        .system-meta {
          opacity: 1;
          max-height: 40px;
          margin-top: 0.75rem;
          padding-top: 0.65rem;
          border-top: 1px solid rgba(255, 255, 255, 0.06);
        }
      }
    }
  `]
})
export class SidebarComponent {
  @Input() isOpen = false;
  @Output() closeSidebar = new EventEmitter<void>();

  isHovered = signal(false);
  private suppressHover = false;
  private suppressTimeout?: ReturnType<typeof setTimeout>;

  @HostBinding('class.open')
  get openClass(): boolean {
    return this.isOpen;
  }

  @HostBinding('class.hovered')
  get hoveredClass(): boolean {
    return this.isHovered();
  }

  onMouseEnter(): void {
    if (typeof window !== 'undefined' && window.innerWidth > 1024) {
      if (!this.suppressHover) {
        this.isHovered.set(true);
      }
    }
  }

  onMouseLeave(): void {
    this.isHovered.set(false);
    this.suppressHover = false;
    if (this.suppressTimeout) {
      clearTimeout(this.suppressTimeout);
      this.suppressTimeout = undefined;
    }
  }

  @HostListener('mouseleave')
  onHostMouseLeave(): void {
    this.onMouseLeave();
  }

  onCloseSidebar(event?: MouseEvent): void {
    if (event?.currentTarget instanceof HTMLElement) {
      event.currentTarget.blur();
    }
    this.suppressHover = true;
    this.isHovered.set(false);
    this.closeSidebar.emit();
  }

  onItemClick(event?: MouseEvent): void {
    if (event?.currentTarget instanceof HTMLElement) {
      event.currentTarget.blur();
    }
    if (typeof document !== 'undefined' && document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }

    this.suppressHover = true;
    this.isHovered.set(false);
    this.closeSidebar.emit();

    if (this.suppressTimeout) {
      clearTimeout(this.suppressTimeout);
    }
    this.suppressTimeout = setTimeout(() => {
      this.suppressHover = false;
    }, 350);
  }
}