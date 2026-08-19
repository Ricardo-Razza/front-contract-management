// src/app/core/models/api.models.ts

export interface LookupItem {
  id: number;
  tipoArp?: string;
  situacao?: string;
  nome?: string;
  descricao?: string;
  funcao?: string;
}

export interface Secretariat {
  id: number;
  nome: string;
  sigla: string;
  situacao: string;
}

export interface SecretariatDTO {
  nome: string;
  sigla: string;
  ativoId: number;
}

export interface Servant {
  id: number;
  nome: string;
  cargo: string;
  matricula: number;
  email: string;
  telefone: string;
  secretaria: string;
  situacao: string;
}

export interface ServantDTO {
  nome: string;
  cargo: string;
  matricula: number;
  email: string;
  telefone: string;
  secretariaId: number;
  ativoId: number;
}

// src/app/core/models/api.models.ts

export interface Agreement {
  id: number;
  numero: number;
  ano: number;
  dataInicio: string;
  dataFim: string;
  tipo: string;
  objeto: string;
  observacao: string;
  portariaDesignacao?: string;
  dataDesignacao?: string;
  situacao?: string;
  gestores?: string;
  fiscais?: string;
  secretarias: Secretariat[];
  equipe?: ContractTeam[];
}

export interface AgreementDTO {
  numero: number;
  ano: number;
  dataInicio: string;
  dataFim: string;
  tipoId: number;
  objeto: string;
  observacao: string;
  ativoId: number;
  secretariasIds: number[];
}

export interface ContractTeamMember {
  id?: number;
  servidorId: number;
  servidorNome?: string;
  servidorCargo?: string;
  servidorMatricula?: string;
  funcaoId: number;
  funcaoNome?: string;
}

export interface Contract {
  id: number;
  numero: number;
  ano: number;
  dataInicio: string;
  dataFim: string;
  tipo: string;
  objeto: string;
  observacao?: string;
  nomeContratado: string;
  portariaDesignacao?: string;
  dataDesignacao?: string;
  situacao?: string;
  secretaria?: Secretariat;
  equipe?: ContractTeam[];
}

export interface ContractDTO {
  numero: number;
  ano: number;
  dataInicio: string;
  dataFim: string;
  tipoId: number;
  objeto: string;
  observacao?: string;
  nomeContratado: string;
  portariaDesignacao: string;
  dataDesignacao: string;
  ativoId: number;
  secretariaId: number;
}

export interface ContractTeam {
  id: number;
  ataId?: number;
  contratoId?: number;
  ataNumero?: number;
  ataAno?: number;
  contratoNumero?: number;
  contratoAno?: number;
  ataObjeto?: string;
  contratoObjeto?: string;
  ata?: string;
  contrato?: string;
  servidor?: string;
  funcao?: string;
  ativoId?: number;
  situacao?: string;
  membros?: ContractTeamMember[];
}

export interface ContractTeamMemberDTO {
  servidorId: number;
  funcaoId: number;
}

export interface ContractTeamDTO {
  ataId: number;
  ativoId: number;
  membros: ContractTeamMemberDTO[];
}

export interface LookupResponse {
  ativos: LookupItem[];
  tipos: LookupItem[];
  funcoes: LookupItem[];
}

// ===== NOVO: DASHBOARD =====
export interface DashboardData {
  totalSecretarias: number;
  totalServidores: number;
  totalAtas: number;
  totalEquipes: number;
  atasPorMes: { [key: string]: number };
  atasAtivas: number;
  atasEncerradas: number;
  atasRecentes: Agreement[];
}