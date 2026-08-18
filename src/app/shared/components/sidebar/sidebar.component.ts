import { Component, EventEmitter, HostBinding, Input, Output, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, RouterLinkActive } from '@angular/router';

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <aside class="sidebar">
      <div class="sidebar-inner">
        <div class="brand">
          <div class="brand-info">
            <div class="brand-logo">
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
          <button class="btn-close-sidebar" (click)="closeSidebar.emit()" aria-label="Fechar menu" title="Fechar menu">
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>

        <nav class="nav-menu">
          <div class="nav-section">PAINEL PRINCIPAL</div>

          <a routerLink="/dashboard" routerLinkActive="active" class="nav-item">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <rect x="3" y="3" width="7" height="7"></rect>
              <rect x="14" y="3" width="7" height="7"></rect>
              <rect x="14" y="14" width="7" height="7"></rect>
              <rect x="3" y="14" width="7" height="7"></rect>
            </svg>
            <span>Dashboard</span>
          </a>

          <div class="nav-section">CADASTROS DE BASE</div>

          <a routerLink="/secretarias" routerLinkActive="active" class="nav-item">
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
            <span>Secretarias</span>
          </a>

          <a routerLink="/servidores" routerLinkActive="active" class="nav-item">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
              <circle cx="9" cy="7" r="4"></circle>
              <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
              <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
            </svg>
            <span>Servidores</span>
          </a>

          <div class="nav-section">GESTÃO DE ACORDOS</div>

          <a routerLink="/atas" routerLinkActive="active" class="nav-item">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
              <polyline points="14 2 14 8 20 8"></polyline>
              <path d="m9 15 2 2 4-4"></path>
            </svg>
            <span>Atas (Agreements)</span>
          </a>

          <a routerLink="/contratos" routerLinkActive="active" class="nav-item">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"></path>
              <rect x="8" y="2" width="8" height="4" rx="1" ry="1"></rect>
              <line x1="9" y1="12" x2="15" y2="12"></line>
              <line x1="9" y1="16" x2="15" y2="16"></line>
            </svg>
            <span>Contratos</span>
          </a>

          <a routerLink="/equipes" routerLinkActive="active" class="nav-item">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"></path>
              <circle cx="9" cy="7" r="4"></circle>
              <line x1="19" y1="8" x2="19" y2="14"></line>
              <line x1="22" y1="11" x2="16" y2="11"></line>
            </svg>
            <span>Equipes de Contrato</span>
          </a>
        </nav>

        <div class="sidebar-footer">
          <div class="user-info">
            <div class="avatar">ADM</div>
            <div class="user-details">
              <span class="user-name">Administrador</span>
              <span class="user-role">Sistema ARP</span>
            </div>
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
      width: 0;
      overflow: hidden;
      transition: width 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    }

    :host(.open) {
      width: var(--sidebar-width, 260px);
    }

    .sidebar {
      height: 100vh;
      width: var(--sidebar-width, 260px); /* largura fixa e real do conteúdo */
      background-color: $color-secondary;
      color: #ffffff;
      display: flex;
      flex-direction: column;
      box-shadow: 2px 0 10px rgba(0, 0, 0, 0.1);
    }

    .sidebar-inner {
      display: flex;
      flex-direction: column;
      height: 100%;
      width: var(--sidebar-width, 260px);
    }

    .brand {
      height: $header-height;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 0.75rem;
      padding: 0 1.25rem;
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

        svg { width: 20px; height: 20px; color: #ffffff; }
      }

      .brand-title {
        display: block;
        font-weight: 700;
        font-size: 1rem;
        color: #ffffff;
        line-height: 1.1;
        white-space: nowrap;
      }

      .brand-subtitle {
        display: block;
        font-size: 0.6875rem;
        color: #94a3b8;
        text-transform: uppercase;
        letter-spacing: 0.05em;
        white-space: nowrap;
      }

      .btn-close-sidebar {
        background: rgba(255, 255, 255, 0.06);
        border: 1px solid rgba(255, 255, 255, 0.08);
        border-radius: 8px;
        width: 32px;
        height: 32px;
        display: flex;
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
      padding: 1.25rem 0.75rem;
      display: flex;
      flex-direction: column;
      gap: 0.375rem;
      overflow-y: auto;
    }

    .nav-section {
      font-size: 0.6875rem;
      font-weight: 700;
      color: #64748b;
      letter-spacing: 0.08em;
      padding: 0.75rem 0.75rem 0.375rem;
      text-transform: uppercase;
      white-space: nowrap;
    }

    .nav-item {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      padding: 0.6875rem 0.875rem;
      color: #94a3b8;
      text-decoration: none;
      font-size: 0.875rem;
      font-weight: 500;
      border-radius: 8px;
      white-space: nowrap;
      transition: all 0.15s ease-in-out;

      svg { width: 18px; height: 18px; color: #64748b; flex-shrink: 0; transition: color 0.15s ease-in-out; }

      &:hover {
        background-color: rgba(255, 255, 255, 0.05);
        color: #ffffff;
        svg { color: #ffffff; }
      }

      &.active {
        background-color: $color-accent;
        color: #ffffff;
        font-weight: 600;
        svg { color: #ffffff; }
      }
    }

    .sidebar-footer {
      padding: 1rem 1.25rem;
      border-top: 1px solid rgba(255, 255, 255, 0.08);
      flex-shrink: 0;

      .user-info {
        display: flex;
        align-items: center;
        gap: 0.75rem;

        .avatar {
          width: 34px;
          height: 34px;
          border-radius: 50%;
          background-color: #334155;
          color: #ffffff;
          font-weight: 700;
          font-size: 0.75rem;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }

        .user-name { display: block; font-size: 0.8125rem; font-weight: 600; color: #ffffff; white-space: nowrap; }
        .user-role { display: block; font-size: 0.6875rem; color: #94a3b8; white-space: nowrap; }
      }
    }
  `]
})
export class SidebarComponent {
  @Input() isOpen = false;
  @Output() closeSidebar = new EventEmitter<void>();

  @HostBinding('class.open')
  get openClass(): boolean {
    return this.isOpen;
  }
}