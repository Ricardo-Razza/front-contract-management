import { EspelhoFatura } from '@core/models';

const emCentavos = (valor: number): number => Math.round(valor * 100);

/** Confere os valores retornados pela API, sem substituir o cálculo contratual. */
export function resumirFatura(fatura: EspelhoFatura) {
  const equipamentos = fatura.equipamentos;
  const locacao = equipamentos.reduce((total, item) => total + item.valorLocacao, 0);
  const excedentes = equipamentos.reduce((total, item) => total + item.valorExcedente, 0);
  const totalLeituras = equipamentos.reduce((total, item) => total + item.valorTotal, 0);
  const totalItens = fatura.itens.reduce((total, item) => total + item.valorTotal, 0);
  const diferencaLeituras = (emCentavos(totalLeituras) - emCentavos(fatura.totalFatura)) / 100;
  const diferencaItens = (emCentavos(totalItens) - emCentavos(fatura.totalFatura)) / 100;
  const equipamentosDivergentes = equipamentos.map((item, index) => ({ item, index }))
    .filter(({ item }) => Math.abs(emCentavos(item.valorLocacao + item.valorExcedente) - emCentavos(item.valorTotal)) > 1);
  return {
    locacao, excedentes, totalLeituras, totalItens, diferencaLeituras, diferencaItens,
    divergeLeituras: Math.abs(diferencaLeituras) > 0.01,
    divergeItens: Math.abs(diferencaItens) > 0.01,
    equipamentosDivergentes,
    franquiaMono: equipamentos.reduce((total, item) => total + item.franquiaMono, 0),
    franquiaColor: equipamentos.reduce((total, item) => total + item.franquiaColor, 0),
    copiasMono: equipamentos.reduce((total, item) => total + item.copiasMono, 0),
    copiasColor: equipamentos.reduce((total, item) => total + item.copiasColor, 0),
    excedenteMono: equipamentos.reduce((total, item) => total + item.excedenteMono, 0),
    excedenteColor: equipamentos.reduce((total, item) => total + item.excedenteColor, 0)
  };
}

export function competenciaAnterior(mes: number, ano: number) {
  return mes === 1 ? { mes: 12, ano: ano - 1 } : { mes: mes - 1, ano };
}

export function compararFaturas(atual: EspelhoFatura, anterior: EspelhoFatura) {
  const diferenca = (emCentavos(atual.totalFatura) - emCentavos(anterior.totalFatura)) / 100;
  const resumoAtual = resumirFatura(atual);
  const resumoAnterior = resumirFatura(anterior);
  return {
    diferenca,
    percentual: anterior.totalFatura === 0 ? null : (diferenca / anterior.totalFatura) * 100,
    diferencaPaginas: resumoAtual.copiasMono + resumoAtual.copiasColor
      - resumoAnterior.copiasMono - resumoAnterior.copiasColor
  };
}

export function chaveFatura(fatura: EspelhoFatura): string {
  return `fatura-${fatura.empenhoId}-${fatura.anoReferencia}-${fatura.mesReferencia}`;
}
