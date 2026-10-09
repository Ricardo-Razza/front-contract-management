import { parseDateSafe } from './string.utils';

export interface VigenciaStatus {
  label: string;
  badgeClass: string;
  days: number;
  text: string;
}

export function getVigenciaStatus(dataFimStr?: string | null): VigenciaStatus {
  if (!dataFimStr) {
    return { label: 'Sem data', badgeClass: 'vigencia-unknown', days: 0, text: '-' };
  }
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const end = parseDateSafe(dataFimStr);
  if (!end) {
    return { label: 'Sem data', badgeClass: 'vigencia-unknown', days: 0, text: '-' };
  }
  end.setHours(0, 0, 0, 0);
  const diffTime = end.getTime() - today.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays < 0) {
    return {
      label: 'Vencida',
      badgeClass: 'vigencia-expired',
      days: Math.abs(diffDays),
      text: `Vencida há ${Math.abs(diffDays)} dia(s)`
    };
  } else if (diffDays <= 30) {
    return {
      label: 'Crítica',
      badgeClass: 'vigencia-critical',
      days: diffDays,
      text: `Vence em ${diffDays} dia(s)`
    };
  } else if (diffDays <= 60) {
    return {
      label: 'Atenção',
      badgeClass: 'vigencia-warning',
      days: diffDays,
      text: `Vence em ${diffDays} dias`
    };
  } else {
    return {
      label: 'Vigente',
      badgeClass: 'vigencia-ok',
      days: diffDays,
      text: `${diffDays} dias restantes`
    };
  }
}

export function getVigenciaPercent(dataInicio?: string | null, dataFim?: string | null): number {
  if (!dataInicio || !dataFim) return 0;
  const startDate = parseDateSafe(dataInicio);
  const endDate = parseDateSafe(dataFim);
  if (!startDate || !endDate) return 0;
  const start = startDate.getTime();
  const end = endDate.getTime();
  const now = new Date().getTime();
  if (end <= start) return 100;
  if (now <= start) return 0;
  if (now >= end) return 100;
  return Math.min(100, Math.max(0, Math.round(((now - start) / (end - start)) * 100)));
}

export function getVigenciaPillClass(dataFim?: string | null): string {
  const status = getVigenciaStatus(dataFim);
  if (status.badgeClass === 'vigencia-expired') return 'pill-expired';
  if (status.badgeClass === 'vigencia-critical') return 'pill-urgent';
  if (status.badgeClass === 'vigencia-warning') return 'pill-warning';
  if (status.badgeClass === 'vigencia-ok') return 'pill-valid';
  return 'pill-none';
}

export function getVigenciaPillText(dataFim?: string | null): string {
  const status = getVigenciaStatus(dataFim);
  if (status.badgeClass === 'vigencia-expired') return 'Vencido';
  if (status.badgeClass === 'vigencia-critical') return `Vence em ${status.days}d`;
  if (status.badgeClass === 'vigencia-warning') return `Vence em ${status.days}d`;
  if (status.badgeClass === 'vigencia-ok') return 'Vigente';
  return '-';
}

export function getVigenciaFilterLabel(val: string): string {
  switch (val) {
    case 'VIGENTE': return 'Vigente (> 60d)';
    case 'ATENCAO': return 'Atenção (Vence em 60d)';
    case 'CRITICA': return 'Crítica (Vence em 30d)';
    case 'EM_ALERTA': return 'Em Alerta (≤ 60d)';
    case 'VENCIDO': return 'Vencido';
    case 'TODOS_VIGENTES': return 'Não Vencidos';
    default: return val;
  }
}

export function matchesVigenciaFilter(dataFim: string | null | undefined, filter: string): boolean {
  if (!filter) return true;
  const vStatus = getVigenciaStatus(dataFim);
  if (filter === 'VIGENTE') return vStatus.badgeClass === 'vigencia-ok';
  if (filter === 'ATENCAO') return vStatus.badgeClass === 'vigencia-warning';
  if (filter === 'CRITICA') return vStatus.badgeClass === 'vigencia-critical';
  if (filter === 'EM_ALERTA') return vStatus.badgeClass === 'vigencia-warning' || vStatus.badgeClass === 'vigencia-critical';
  if (filter === 'VENCIDO') return vStatus.badgeClass === 'vigencia-expired';
  if (filter === 'TODOS_VIGENTES') return vStatus.badgeClass !== 'vigencia-expired' && vStatus.badgeClass !== 'vigencia-unknown';
  return true;
}

export function getVigenciaFilterFromPill(dataFim?: string | null): string | null {
  if (!dataFim) return null;
  const vStatus = getVigenciaStatus(dataFim);
  if (vStatus.badgeClass === 'vigencia-expired') return 'VENCIDO';
  if (vStatus.badgeClass === 'vigencia-critical') return 'CRITICA';
  if (vStatus.badgeClass === 'vigencia-warning') return 'ATENCAO';
  if (vStatus.badgeClass === 'vigencia-ok') return 'VIGENTE';
  return null;
}
