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
  cpf: number | string;
  cargo: string;
  matricula: number | string;
  email: string;
  telefone: string;
  secretaria: string;
  situacao: string;
}

export interface ServantDTO {
  nome: string;
  cpf: number | string;
  cargo: string;
  matricula: number | string;
  email: string;
  telefone: string;
  secretariaId: number;
  ativoId: number;
}

export interface Agreement {
  id: number;
  numero: number;
  ano: number;
  dataInicio: string;
  dataFim: string;
  tipo: string;
  objeto: string;
  situacao: string;
  secretarias: Secretariat[];
}

export interface AgreementDTO {
  numero: number;
  ano: number;
  dataInicio: string;
  dataFim: string;
  tipoId: number;
  objeto: string;
  ativoId: number;
  secretariaIds: number[];
}

export interface ContractTeam {
  id: number;
  ata: string;
  servidor: string;
  funcao: string;
  dataDesignacao: string;
  dataFim: string;
  situacao: string;
}

export interface ContractTeamDTO {
  ataId?: number;
  agreementId?: number;
  servidorId?: number;
  servantId?: number;
  funcaoId?: number;
  functionId?: number;
  dataDesignacao?: string;
  designationDate?: string;
  dataFim?: string;
  endDate?: string;
  ativoId?: number;
  activeId?: number;
}

export interface LookupItem {
  id: number;
  nome?: string;
  descricao?: string;
  situacao?: string;
  tipo?: string;
  funcao?: string;
}

export interface DashboardMetrics {
  totalSecretariats: number;
  totalServants: number;
  totalAgreements: number;
  totalTeams: number;
}
