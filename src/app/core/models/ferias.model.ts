export type TipoAfastamento =
  "FERIAS" | "LICENCA_SAUDE" | "LICENCA_PREMIO" | "FOLGA";
export type StatusFerias = "PLANEJADO" | "CONFIRMADO" | "CANCELADO";

export interface PeriodoAquisitivo {
  id: number;
  servidorId: number;
  servidorNome: string;
  servidorMatricula: number;
  anoInicio: number;
  anoFim: number;
  identificador: string;
  dataInicio: string;
  dataFim: string;
  limiteGozo?: string;
  totalDias: number;
  diasUsados: number;
  diasReservados: number;
  diasGozados: number;
  secretariaId?: number;
  servidorSetor?: string;
  diasRestantes: number;
  corHex: string;
  criadoEm?: string;
}

export interface PeriodoAquisitivoDTO {
  servidorId: number;
  anoInicio: number;
  anoFim: number;
  identificador?: string;
  dataInicio: string;
  dataFim: string;
  limiteGozo?: string;
  totalDias?: number;
  corHex?: string;
}

export interface AgendamentoFerias {
  id: number;
  servidorId: number;
  servidorNome: string;
  servidorMatricula: number;
  servidorCargo?: string;
  servidorSetor?: string;
  secretariaId?: number;
  secretariaNome?: string;
  secretariaSigla?: string;
  periodoAquisitivoId?: number;
  periodoIdentificador?: string;
  corHex: string;
  tipoAfastamento: TipoAfastamento;
  tipoDescricao: string;
  dataInicio: string;
  dataFim: string;
  dias: number;
  fracao?: number;
  status: StatusFerias;
  alertaConflito: boolean;
  descricaoConflito?: string;
  observacao?: string;
  criadoEm?: string;
  atualizadoEm?: string;
}

export interface AgendamentoFeriasDTO {
  servidorId: number;
  periodoAquisitivoId?: number | null;
  tipoAfastamento: TipoAfastamento;
  dataInicio: string;
  dataFim: string;
  fracao?: number | null;
  status?: StatusFerias;
  observacao?: string;
  confirmarComConflito?: boolean;
}

export interface VerificacaoConflitoRequest {
  servidorId: number;
  dataInicio: string;
  dataFim: string;
  agendamentoId?: number | null;
}

export interface ConflitoItem {
  agendamentoId: number;
  servidorId: number;
  servidorNome: string;
  servidorMatricula: number;
  setor?: string;
  tipoAfastamento: string;
  dataInicio: string;
  dataFim: string;
  dias: number;
}

export interface VerificacaoConflitoResponse {
  temConflito: boolean;
  bloqueante: boolean;
  mensagem: string;
  conflitos: ConflitoItem[];
}

export interface DiaInfo {
  dia: number;
  diaSemana: number;
  diaSemanaSigla: string;
  ehFimDeSemana: boolean;
  ehFeriado: boolean;
  nomeFeriado?: string;
}

export interface CelulaDia {
  dia: number;
  ocupado: boolean;
  agendamentoId?: number;
  tipoAfastamento?: string;
  tipoDescricao?: string;
  periodoAquisitivoId?: number;
  periodoIdentificador?: string;
  corHex?: string;
  fracao?: number;
  status?: string;
  alertaConflito?: boolean;
  descricaoConflito?: string;
  observacao?: string;
}

export interface LinhaServidorMes {
  servidorId: number;
  servidorNome: string;
  servidorMatricula: number;
  servidorCargo?: string;
  servidorSetor?: string;
  celulas: CelulaDia[];
}

export interface MesEscala {
  mesNumero: number;
  mesNome: string;
  totalDias: number;
  dias: DiaInfo[];
  linhas: LinhaServidorMes[];
}

export interface LegendaItem {
  label: string;
  corHex: string;
  tipo: string;
}

export interface EscalaAnual {
  ano: number;
  secretariaId?: number;
  secretariaNome?: string;
  secretariaSigla?: string;
  setor?: string;
  meses: MesEscala[];
  legendas: LegendaItem[];
}
