import { Component, OnInit, inject, signal, computed, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { HeaderComponent, LoadingSkeletonComponent } from '@shared';
import { SecretariaService, ServidorService, AtaService, ContratoService, EquipeService } from '@core/services';
import { Agreement, Contract } from '@core/models';
import { forkJoin, catchError, of } from 'rxjs';

export interface ExpirandoItem {
  id: number;
  tipoItem: 'CONTRATO' | 'ATA';
  numero: number;
  ano: number;
  objeto: string;
  dataFim: string;
  diasRestantes: number;
  statusLabel: string;
  statusClass: string;
  secretarias: string[];
}

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
  private contratoService = inject(ContratoService);
  private equipeService = inject(EquipeService);

  loading = signal(true);
  
  // Dados brutos
  contracts = signal<Contract[]>([]);
  agreements = signal<Agreement[]>([]);
  totalSecretariats = signal(0);
  totalServants = signal(0);
  totalTeams = signal(0);

  // Tab para tabela de recentes
  activeTab = signal<'CONTRATOS' | 'ATAS'>('CONTRATOS');

  // Filtro para tabela de expirando
  expirandoFilter = signal<'TODOS' | 'CONTRATO' | 'ATA'>('TODOS');

  // KPI Computados
  totalContracts = computed(() => this.contracts().length);
  totalAgreements = computed(() => this.agreements().length);

  activeContractsCount = computed(() => this.contracts().filter(c => c.situacao !== 'DESATIVADO').length);
  inactiveContractsCount = computed(() => this.contracts().filter(c => c.situacao === 'DESATIVADO').length);

  activeAgreementsCount = computed(() => this.agreements().filter(a => a.situacao !== 'DESATIVADO').length);
  inactiveAgreementsCount = computed(() => this.agreements().filter(a => a.situacao === 'DESATIVADO').length);

  // Lista dos 5 contratos mais recentes
  recentContracts = computed(() => {
    return [...this.contracts()]
      .sort((a, b) => b.id - a.id)
      .slice(0, 5);
  });

  // Lista das 5 atas mais recentes
  recentAgreements = computed(() => {
    return [...this.agreements()]
      .sort((a, b) => b.id - a.id)
      .slice(0, 5);
  });

  // Lista consolidada de itens se encerrando ou vencidos
  expiringItems = computed(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const items: ExpirandoItem[] = [];

    // Processa Contratos
    this.contracts().forEach(c => {
      if (!c.dataFim) return;
      const end = new Date(c.dataFim);
      end.setHours(0, 0, 0, 0);
      const diffTime = end.getTime() - today.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      let statusLabel = '';
      let statusClass = '';

      if (diffDays < 0) {
        statusLabel = `Vencido há ${Math.abs(diffDays)}d`;
        statusClass = 'badge-expired';
      } else if (diffDays <= 30) {
        statusLabel = `Vence em ${diffDays}d`;
        statusClass = 'badge-critical';
      } else if (diffDays <= 60) {
        statusLabel = `Vence em ${diffDays}d`;
        statusClass = 'badge-warning';
      } else if (diffDays <= 90) {
        statusLabel = `Vence em ${diffDays}d`;
        statusClass = 'badge-attention';
      }

      if (diffDays <= 90) {
        items.push({
          id: c.id,
          tipoItem: 'CONTRATO',
          numero: c.numero,
          ano: c.ano,
          objeto: c.objeto,
          dataFim: c.dataFim,
          diasRestantes: diffDays,
          statusLabel,
          statusClass,
          secretarias: (c.secretarias || []).map(s => s.sigla || s.nome)
        });
      }
    });

    // Processa Atas
    this.agreements().forEach(a => {
      if (!a.dataFim) return;
      const end = new Date(a.dataFim);
      end.setHours(0, 0, 0, 0);
      const diffTime = end.getTime() - today.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      let statusLabel = '';
      let statusClass = '';

      if (diffDays < 0) {
        statusLabel = `Vencida há ${Math.abs(diffDays)}d`;
        statusClass = 'badge-expired';
      } else if (diffDays <= 30) {
        statusLabel = `Vence em ${diffDays}d`;
        statusClass = 'badge-critical';
      } else if (diffDays <= 60) {
        statusLabel = `Vence em ${diffDays}d`;
        statusClass = 'badge-warning';
      } else if (diffDays <= 90) {
        statusLabel = `Vence em ${diffDays}d`;
        statusClass = 'badge-attention';
      }

      if (diffDays <= 90) {
        items.push({
          id: a.id,
          tipoItem: 'ATA',
          numero: a.numero,
          ano: a.ano,
          objeto: a.objeto,
          dataFim: a.dataFim,
          diasRestantes: diffDays,
          statusLabel,
          statusClass,
          secretarias: (a.secretarias || []).map(s => s.sigla || s.nome)
        });
      }
    });

    // Ordena pelo que está mais próximo de vencer ou vencido
    return items.sort((a, b) => a.diasRestantes - b.diasRestantes);
  });

  filteredExpiringItems = computed(() => {
    const filter = this.expirandoFilter();
    const items = this.expiringItems();
    if (filter === 'TODOS') return items;
    return items.filter(i => i.tipoItem === filter);
  });

  // Gráfico mensal real baseado no início dos contratos e atas
  monthlyStats = computed(() => {
    const months = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
    const currentYear = new Date().getFullYear();
    
    const countContratos = new Array(12).fill(0);
    const countAtas = new Array(12).fill(0);

    this.contracts().forEach(c => {
      if (c.dataInicio) {
        const d = new Date(c.dataInicio);
        if (d.getFullYear() === currentYear) {
          countContratos[d.getMonth()]++;
        }
      }
    });

    this.agreements().forEach(a => {
      if (a.dataInicio) {
        const d = new Date(a.dataInicio);
        if (d.getFullYear() === currentYear) {
          countAtas[d.getMonth()]++;
        }
      }
    });

    let maxVal = 1;
    const data = months.map((month, idx) => {
      const cCount = countContratos[idx];
      const aCount = countAtas[idx];
      const total = cCount + aCount;
      if (total > maxVal) maxVal = total;
      return {
        month,
        contratos: cCount,
        atas: aCount,
        total
      };
    });

    return {
      year: currentYear,
      data,
      maxVal
    };
  });

  ngOnInit(): void {
    this.loadData();
  }

  loadData(): void {
    this.loading.set(true);

    forkJoin({
      secretariats: this.secService.getAll().pipe(catchError(() => of([]))),
      servants: this.servService.getAll().pipe(catchError(() => of([]))),
      agreements: this.ataService.getAll().pipe(catchError(() => of([]))),
      contracts: this.contratoService.getAll().pipe(catchError(() => of([]))),
      teams: this.equipeService.getAll().pipe(catchError(() => of([])))
    }).subscribe({
      next: (res) => {
        this.totalSecretariats.set(res.secretariats.length);
        this.totalServants.set(res.servants.length);
        this.agreements.set(res.agreements || []);
        this.contracts.set(res.contracts || []);
        this.totalTeams.set(res.teams.length);

        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
      }
    });
  }
}
