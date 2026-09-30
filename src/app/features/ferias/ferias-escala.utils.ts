import type { AgendamentoFerias, EscalaAnual, DiaInfo } from "@core/models";

// Stable reference palette: the same acquisition year always has the same color.
// Anchored to the paper scale: 2025/2026 yellow, 2024/2025 purple, 2023/2024 blue.
const CORES = [
  "#f2d524",
  "#8064a2",
  "#5684ba",
  "#8caa50",
  "#54977a",
  "#285640",
  "#cc957b",
  "#214d87",
  "#b8bb50",
  "#ded673",
];
export function corPeriodo(anoInicio: number): string {
  return CORES[
    (((2025 - anoInicio) % CORES.length) + CORES.length) % CORES.length
  ];
}
export function corAgendamento(a: AgendamentoFerias): string {
  if (a.tipoAfastamento === "FERIAS") {
    const ano = Number(a.periodoIdentificador?.match(/\d{4}/)?.[0]);
    return ano ? corPeriodo(ano) : "#5684ba";
  }
  return {
    LICENCA_SAUDE: "#ce8131",
    LICENCA_PREMIO: "#cf8989",
    FOLGA: "#254b84",
  }[a.tipoAfastamento];
}
export interface FaixaEscala {
  agendamento: AgendamentoFerias;
  inicio: number;
  fim: number;
  cor: string;
}
export interface LinhaEscala {
  chave: string;
  servidorId: number;
  nome: string;
  matricula: number;
  setor: string;
  faixas: FaixaEscala[];
}
export interface MesEscalaVisual {
  numero: number;
  nome: string;
  dias: DiaInfo[];
  totalDias: number;
  linhas: LinhaEscala[];
  quantidade: number;
}
export function montarEscala(
  ano: number,
  agendamentos: AgendamentoFerias[],
  calendario: EscalaAnual | null,
): MesEscalaVisual[] {
  const nomes = [
    "Janeiro",
    "Fevereiro",
    "Março",
    "Abril",
    "Maio",
    "Junho",
    "Julho",
    "Agosto",
    "Setembro",
    "Outubro",
    "Novembro",
    "Dezembro",
  ];
  return nomes.map((nome, index) => {
    const numero = index + 1,
      totalDias = new Date(ano, numero, 0).getDate();
    const prefixo = `${ano}-${String(numero).padStart(2, "0")}`;
    const registros = agendamentos
      .filter(
        (a) =>
          a.status !== "CANCELADO" &&
          a.dataInicio <= `${prefixo}-${totalDias}` &&
          a.dataFim >= `${prefixo}-01`,
      )
      .sort(
        (a, b) =>
          a.servidorNome.localeCompare(b.servidorNome, "pt-BR") ||
          a.dataInicio.localeCompare(b.dataInicio) ||
          a.id - b.id,
      );
    const linhas: LinhaEscala[] = [];
    for (const a of registros) {
      const inicio =
        a.dataInicio.slice(0, 7) === prefixo
          ? Number(a.dataInicio.slice(-2))
          : 1;
      const fim =
        a.dataFim.slice(0, 7) === prefixo
          ? Number(a.dataFim.slice(-2))
          : totalDias;
      // Older inconsistent data must remain visible: overlapping records get another lane.
      let linha = linhas.find(
        (l) =>
          l.servidorId === a.servidorId &&
          l.faixas.every((f) => f.fim < inicio || f.inicio > fim),
      );
      if (!linha) {
        linha = {
          chave: `${a.servidorId}-${a.id}`,
          servidorId: a.servidorId,
          nome: a.servidorNome,
          matricula: a.servidorMatricula,
          setor: a.servidorSetor || "Sem unidade informada",
          faixas: [],
        };
        linhas.push(linha);
      }
      linha.faixas.push({
        agendamento: a,
        inicio,
        fim,
        cor: corAgendamento(a),
      });
    }
    const dias = Array.from({ length: 31 }, (_, i) => {
      const existente = calendario?.meses.find((m) => m.mesNumero === numero)
        ?.dias[i];
      const diaSemana = new Date(ano, index, i + 1).getDay();
      return (
        existente || {
          dia: i + 1,
          diaSemana: diaSemana || 7,
          diaSemanaSigla: ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"][
            diaSemana
          ],
          ehFimDeSemana: [0, 6].includes(diaSemana),
          ehFeriado: false,
        }
      );
    });
    return {
      numero,
      nome,
      dias,
      totalDias,
      linhas,
      quantidade: registros.length,
    };
  });
}
