import { Impressora } from '@core/models';
import { matchesSearch } from '@core/utils';

export interface FiltrosSelecaoColeta {
  secretariaId: number | null;
  empenhoId: number | null;
  loteId: number | null;
  tipo: string;
  rede: 'TODAS' | 'COM_IP' | 'SEM_IP';
  selecao: 'TODAS' | 'MARCADAS' | 'DESMARCADAS';
  busca: string;
}

export function possuiIpColeta(ip?: string): boolean {
  const valor = ip?.trim() ?? '';
  return /^\d{1,3}(\.\d{1,3}){3}$/.test(valor) && valor.split('.').every(parte => Number(parte) <= 255);
}

export function filtrarImpressorasColeta(impressoras: Impressora[], filtros: FiltrosSelecaoColeta, selecionadas: ReadonlySet<number>): Impressora[] {
  const busca = filtros.busca.trim().replace(/^#\s*(\d+)$/, '$1');
  return impressoras.filter(p =>
    (filtros.secretariaId === null || p.secretariaId === filtros.secretariaId) &&
    (filtros.empenhoId === null || p.empenhoId === filtros.empenhoId) &&
    (filtros.loteId === null || p.loteId === filtros.loteId) &&
    (filtros.tipo === 'TODOS' || p.tipoImpressao === filtros.tipo) &&
    (filtros.rede === 'TODAS' || (filtros.rede === 'COM_IP' ? possuiIpColeta(p.ip) : !possuiIpColeta(p.ip))) &&
    (filtros.selecao === 'TODAS' || (filtros.selecao === 'MARCADAS' ? selecionadas.has(p.id) : !selecionadas.has(p.id))) &&
    matchesSearch([p.itemPedido ?? p.id, `#${p.itemPedido ?? p.id}`, 'item', p.modelo, p.fabricante, p.ip, p.numeroSerie,
      p.secretariaSigla, p.secretariaNome, p.localInstalacao, p.numeroEmpenho, p.loteDescricao], busca)
  );
}
