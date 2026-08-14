import { Component, OnInit, inject, signal, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { HeaderComponent, LoadingSkeletonComponent } from '@shared';
import { SecretariaService, ServidorService, AtaService, EquipeService } from '@core/services';
import { Agreement } from '@core/models';
import { forkJoin, catchError, of } from 'rxjs';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink, HeaderComponent, LoadingSkeletonComponent],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
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

        const activeCount = res.agreements.filter(a => a.situacao !== 'DESATIVADO').length;
        const inactiveCount = res.agreements.filter(a => a.situacao === 'DESATIVADO').length;
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
