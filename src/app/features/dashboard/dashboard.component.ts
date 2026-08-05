import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { HeaderComponent } from '../../shared/components/header/header.component';
import { LoadingSkeletonComponent } from '../../shared/components/loading-skeleton/loading-skeleton.component';
import { SecretariaService } from '../../core/services/secretaria.service';
import { ServidorService } from '../../core/services/servidor.service';
import { AtaService } from '../../core/services/ata.service';
import { EquipeService } from '../../core/services/equipe.service';
import { Agreement } from '../../core/models/api.models';
import { forkJoin, catchError, of } from 'rxjs';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink, HeaderComponent, LoadingSkeletonComponent],
  template: `
    <app-header title="Dashboard"></app-header>

    <div class="page-content">
      <div class="page-title-group">
        <h1>Painel de Controle</h1>
        <p>Visão geral do sistema de acordos de registro de preços (ARP)</p>
      </div>

      <!-- KPI Metrics Cards -->
      <div class="metrics-grid">
        <div class="metric-card card-secretariats">
          <div class="metric-icon">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 21h18"/><path d="M5 21V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16"/></svg>
          </div>
          <div class="metric-data">
            <span class="metric-label">Secretarias</span>
            <span class="metric-value">{{ totalSecretariats() }}</span>
          </div>
        </div>

        <div class="metric-card card-servants">
          <div class="metric-icon">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/></svg>
          </div>
          <div class="metric-data">
            <span class="metric-label">Servidores</span>
            <span class="metric-value">{{ totalServants() }}</span>
          </div>
        </div>

        <div class="metric-card card-agreements">
          <div class="metric-icon">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="m9 15 2 2 4-4"/></svg>
          </div>
          <div class="metric-data">
            <span class="metric-label">Atas Registradas</span>
            <span class="metric-value">{{ totalAgreements() }}</span>
          </div>
        </div>

        <div class="metric-card card-teams">
          <div class="metric-icon">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><line x1="19" y1="8" x2="19" y2="14"/></svg>
          </div>
          <div class="metric-data">
            <span class="metric-label">Equipes de Contrato</span>
            <span class="metric-value">{{ totalTeams() }}</span>
          </div>
        </div>
      </div>

      <div class="dashboard-grid">
        <!-- Monthly Agreements Chart Card -->
        <div class="chart-card">
          <div class="card-header">
            <h3>Acordos e Atas por Mês</h3>
            <span class="card-subtitle">Evolução do registro de atas ao longo do ano</span>
          </div>
          <div class="chart-container">
            <div class="bar-chart">
              @for (item of monthlyData; track item.month) {
                <div class="bar-column">
                  <div class="bar-wrapper">
                    <div class="bar-fill" [style.height.%]="(item.count / maxMonthlyCount) * 100">
                      <span class="bar-tooltip">{{ item.count }} Atas</span>
                    </div>
                  </div>
                  <span class="bar-label">{{ item.month }}</span>
                </div>
              }
            </div>
          </div>
        </div>

        <!-- Quick Info / Status Summary -->
        <div class="info-card">
          <div class="card-header">
            <h3>Status das Atas</h3>
          </div>
          <div class="status-summary-list">
            <div class="status-item">
              <span class="status-label">Atas Ativas</span>
              <span class="badge-status status-active">{{ activeAgreementsCount() }} Registradas</span>
            </div>
            <div class="status-item">
              <span class="status-label">Atas Encerradas</span>
              <span class="badge-status status-inactive">{{ inactiveAgreementsCount() }} Finalizadas</span>
            </div>
            <div class="status-item">
              <span class="status-label">Total Secretarias Participantes</span>
              <span class="status-num">{{ totalSecretariats() }}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Recent Agreements Table Card -->
      <div class="table-card">
        <div class="table-header-toolbar">
          <div>
            <h3>Atas Recentes</h3>
            <span class="card-subtitle">Últimas atas cadastradas no sistema</span>
          </div>
          <a routerLink="/atas" class="btn btn-secondary btn-sm">Ver Todas</a>
        </div>

        @if (loading()) {
          <app-loading-skeleton [rows]="4"></app-loading-skeleton>
        } @else {
          <div class="table-responsive">
            <table class="data-table">
              <thead>
                <tr>
                  <th>Nº / Ano</th>
                  <th>Tipo</th>
                  <th>Objeto</th>
                  <th>Vigência</th>
                  <th>Secretarias</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                @for (ata of recentAgreements(); track ata.id) {
                  <tr>
                    <td><strong>{{ ata.numero }}/{{ ata.ano }}</strong></td>
                    <td>{{ ata.tipo || 'ARP' }}</td>
                    <td class="td-truncate" [title]="ata.objeto">{{ ata.objeto }}</td>
                    <td>{{ ata.dataInicio | date:'dd/MM/yyyy' }} à {{ ata.dataFim | date:'dd/MM/yyyy' }}</td>
                    <td>
                      <div class="sec-tags">
                        @for (sec of ata.secretarias; track sec.id) {
                          <span class="sec-tag">{{ sec.sigla || sec.nome }}</span>
                        } @empty {
                          <span class="text-muted">-</span>
                        }
                      </div>
                    </td>
                    <td>
                      <span class="badge-status" [ngClass]="ata.situacao === 'Inativo' ? 'status-inactive' : 'status-active'">
                        <span class="dot"></span>
                        {{ ata.situacao || 'Ativo' }}
                      </span>
                    </td>
                  </tr>
                } @empty {
                  <tr>
                    <td colspan="6">
                      <div class="empty-state">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/></svg>
                        <h4>Nenhuma ata cadastrada</h4>
                        <p>Acesse a seção de Atas para registrar um novo acordo.</p>
                      </div>
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        }
      </div>
    </div>
  `,
  styles: [`
    @use 'variables' as *;

    .metrics-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
      gap: 1.25rem;
      margin-bottom: 1.75rem;
    }

    .metric-card {
      background: #ffffff;
      border-radius: $border-radius-md;
      border: 1px solid $color-border;
      padding: 1.25rem 1.5rem;
      display: flex;
      align-items: center;
      gap: 1.25rem;
      box-shadow: $shadow-sm;
      transition: transform 0.15s ease, box-shadow 0.15s ease;

      &:hover {
        transform: translateY(-2px);
        box-shadow: $shadow-md;
      }

      .metric-icon {
        width: 52px;
        height: 52px;
        border-radius: 12px;
        display: flex;
        align-items: center;
        justify-content: center;

        svg {
          width: 26px;
          height: 26px;
        }
      }

      &.card-secretariats .metric-icon { background: #eff6ff; color: #2563eb; }
      &.card-servants .metric-icon { background: #f0fdf4; color: #16a34a; }
      &.card-agreements .metric-icon { background: #faf5ff; color: #9333ea; }
      &.card-teams .metric-icon { background: #fff7ed; color: #ea580c; }

      .metric-data {
        display: flex;
        flex-direction: column;

        .metric-label {
          font-size: 0.8125rem;
          color: $color-text-muted;
          font-weight: 500;
        }

        .metric-value {
          font-size: 1.75rem;
          font-weight: 700;
          color: $color-secondary;
          line-height: 1.2;
        }
      }
    }

    .dashboard-grid {
      display: grid;
      grid-template-columns: 2fr 1fr;
      gap: 1.5rem;
      margin-bottom: 1.75rem;

      @media (max-width: 992px) {
        grid-template-columns: 1fr;
      }
    }

    .chart-card, .info-card {
      background: #ffffff;
      border-radius: $border-radius-md;
      border: 1px solid $color-border;
      padding: 1.5rem;
      box-shadow: $shadow-sm;

      .card-header {
        margin-bottom: 1.25rem;
        h3 {
          font-size: 1rem;
          font-weight: 700;
          color: $color-secondary;
        }
        .card-subtitle {
          font-size: 0.8125rem;
          color: $color-text-muted;
        }
      }
    }

    .chart-container {
      height: 220px;
      padding-top: 1rem;
    }

    .bar-chart {
      display: flex;
      align-items: flex-end;
      justify-content: space-between;
      height: 100%;
      gap: 0.5rem;
    }

    .bar-column {
      flex: 1;
      display: flex;
      flex-direction: column;
      align-items: center;
      height: 100%;

      .bar-wrapper {
        flex: 1;
        width: 100%;
        max-width: 32px;
        display: flex;
        align-items: flex-end;
        background-color: #f1f5f9;
        border-radius: 6px;
        overflow: visible;
        position: relative;
      }

      .bar-fill {
        width: 100%;
        background: linear-gradient(180deg, $color-accent, #2563eb);
        border-radius: 6px;
        min-height: 6px;
        transition: height 0.4s ease-out;
        position: relative;

        &:hover .bar-tooltip {
          opacity: 1;
          visibility: visible;
          transform: translateY(-8px);
        }
      }

      .bar-tooltip {
        position: absolute;
        bottom: 100%;
        left: 50%;
        transform: translateX(-50%);
        background: $color-secondary;
        color: #ffffff;
        padding: 4px 8px;
        border-radius: 4px;
        font-size: 0.75rem;
        white-weight: 600;
        white-space: nowrap;
        opacity: 0;
        visibility: hidden;
        transition: all 0.15s ease;
        pointer-events: none;
        box-shadow: $shadow-md;
      }

      .bar-label {
        font-size: 0.75rem;
        color: $color-text-muted;
        margin-top: 0.5rem;
        font-weight: 500;
      }
    }

    .status-summary-list {
      display: flex;
      flex-direction: column;
      gap: 1rem;

      .status-item {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 0.875rem 1rem;
        background-color: #f8fafc;
        border-radius: $border-radius-sm;

        .status-label {
          font-size: 0.875rem;
          color: $color-secondary;
          font-weight: 500;
        }

        .status-num {
          font-weight: 700;
          font-size: 1rem;
          color: $color-accent;
        }
      }
    }

    .td-truncate {
      max-width: 250px;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .sec-tags {
      display: flex;
      flex-wrap: wrap;
      gap: 4px;
    }

    .sec-tag {
      font-size: 0.6875rem;
      font-weight: 600;
      padding: 2px 6px;
      background-color: #e2e8f0;
      color: $color-secondary;
      border-radius: 4px;
    }
  `]
})
export class DashboardComponent implements OnInit {
  private secService = inject(SecretariaService);
  private servService = inject(ServidorService);
  private ataService = inject(AtaService);
  private equipeService = inject(EquipeService);

  loading = signal(true);
  totalSecretariats = signal(0);
  totalServants = signal(0);
  totalAgreements = signal(0);
  totalTeams = signal(0);

  recentAgreements = signal<Agreement[]>([]);
  activeAgreementsCount = signal(0);
  inactiveAgreementsCount = signal(0);

  monthlyData = [
    { month: 'Jan', count: 4 },
    { month: 'Fev', count: 7 },
    { month: 'Mar', count: 5 },
    { month: 'Abr', count: 9 },
    { month: 'Mai', count: 12 },
    { month: 'Jun', count: 8 },
    { month: 'Jul', count: 14 },
    { month: 'Ago', count: 10 },
    { month: 'Set', count: 6 },
    { month: 'Out', count: 11 },
    { month: 'Nov', count: 15 },
    { month: 'Dez', count: 9 }
  ];

  maxMonthlyCount = 15;

  ngOnInit(): void {
    this.loadData();
  }

  loadData(): void {
    this.loading.set(true);

    forkJoin({
      secretariats: this.secService.getAll().pipe(catchError(() => of([]))),
      servants: this.servService.getAll().pipe(catchError(() => of([]))),
      agreements: this.ataService.getAll().pipe(catchError(() => of([]))),
      teams: this.equipeService.getAll().pipe(catchError(() => of([])))
    }).subscribe({
      next: (res) => {
        this.totalSecretariats.set(res.secretariats.length);
        this.totalServants.set(res.servants.length);
        this.totalAgreements.set(res.agreements.length);
        this.totalTeams.set(res.teams.length);

        this.recentAgreements.set(res.agreements.slice(0, 5));

        const activeCount = res.agreements.filter(a => a.situacao !== 'Inativo').length;
        const inactiveCount = res.agreements.filter(a => a.situacao === 'Inativo').length;
        this.activeAgreementsCount.set(activeCount);
        this.inactiveAgreementsCount.set(inactiveCount);

        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
      }
    });
  }
}
