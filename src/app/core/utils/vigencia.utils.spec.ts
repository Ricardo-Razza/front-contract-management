import {
  getVigenciaStatus,
  getVigenciaPercent,
  getVigenciaPillClass,
  getVigenciaPillText,
  getVigenciaFilterLabel,
  matchesVigenciaFilter,
  getVigenciaFilterFromPill
} from './vigencia.utils';

describe('Vigencia Utils', () => {
  it('retorna status desconhecido para data nula ou indefinida', () => {
    const status = getVigenciaStatus(null);
    expect(status.label).toBe('Sem data');
    expect(status.badgeClass).toBe('vigencia-unknown');
    expect(status.days).toBe(0);
  });

  it('calcula vigência vencida', () => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 5);
    const dateStr = yesterday.toISOString().split('T')[0];

    const status = getVigenciaStatus(dateStr);
    expect(status.badgeClass).toBe('vigencia-expired');
    expect(status.label).toBe('Vencida');
    expect(getVigenciaPillClass(dateStr)).toBe('pill-expired');
    expect(getVigenciaPillText(dateStr)).toBe('Vencido');
    expect(getVigenciaFilterFromPill(dateStr)).toBe('VENCIDO');
    expect(matchesVigenciaFilter(dateStr, 'VENCIDO')).toBeTrue();
    expect(matchesVigenciaFilter(dateStr, 'VIGENTE')).toBeFalse();
  });

  it('calcula vigência crítica (≤ 30 dias)', () => {
    const soon = new Date();
    soon.setDate(soon.getDate() + 15);
    const dateStr = soon.toISOString().split('T')[0];

    const status = getVigenciaStatus(dateStr);
    expect(status.badgeClass).toBe('vigencia-critical');
    expect(status.label).toBe('Crítica');
    expect(getVigenciaPillClass(dateStr)).toBe('pill-urgent');
    expect(getVigenciaFilterFromPill(dateStr)).toBe('CRITICA');
    expect(matchesVigenciaFilter(dateStr, 'CRITICA')).toBeTrue();
    expect(matchesVigenciaFilter(dateStr, 'EM_ALERTA')).toBeTrue();
  });

  it('calcula vigência em atenção (≤ 60 dias)', () => {
    const soon = new Date();
    soon.setDate(soon.getDate() + 45);
    const dateStr = soon.toISOString().split('T')[0];

    const status = getVigenciaStatus(dateStr);
    expect(status.badgeClass).toBe('vigencia-warning');
    expect(status.label).toBe('Atenção');
    expect(getVigenciaPillClass(dateStr)).toBe('pill-warning');
    expect(getVigenciaFilterFromPill(dateStr)).toBe('ATENCAO');
    expect(matchesVigenciaFilter(dateStr, 'ATENCAO')).toBeTrue();
    expect(matchesVigenciaFilter(dateStr, 'EM_ALERTA')).toBeTrue();
  });

  it('calcula vigência regular (> 60 dias)', () => {
    const future = new Date();
    future.setDate(future.getDate() + 100);
    const dateStr = future.toISOString().split('T')[0];

    const status = getVigenciaStatus(dateStr);
    expect(status.badgeClass).toBe('vigencia-ok');
    expect(status.label).toBe('Vigente');
    expect(getVigenciaPillClass(dateStr)).toBe('pill-valid');
    expect(getVigenciaPillText(dateStr)).toBe('Vigente');
    expect(getVigenciaFilterFromPill(dateStr)).toBe('VIGENTE');
    expect(matchesVigenciaFilter(dateStr, 'VIGENTE')).toBeTrue();
    expect(matchesVigenciaFilter(dateStr, 'TODOS_VIGENTES')).toBeTrue();
  });

  it('calcula percentual de vigência decorrido corretamente', () => {
    expect(getVigenciaPercent(null, null)).toBe(0);

    const now = new Date();
    const past = new Date(now.getTime() - 10 * 86400000).toISOString().split('T')[0];
    const future = new Date(now.getTime() + 10 * 86400000).toISOString().split('T')[0];

    const percent = getVigenciaPercent(past, future);
    expect(percent).toBeGreaterThanOrEqual(45);
    expect(percent).toBeLessThanOrEqual(55);
  });

  it('formata labels de filtro de vigência', () => {
    expect(getVigenciaFilterLabel('VIGENTE')).toBe('Vigente (> 60d)');
    expect(getVigenciaFilterLabel('CRITICA')).toBe('Crítica (Vence em 30d)');
    expect(getVigenciaFilterLabel('OUTRO')).toBe('OUTRO');
  });
});
