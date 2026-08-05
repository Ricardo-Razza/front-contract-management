
export interface LookupItem {
  id: number;
  tipoArp?: string;
  situacao?: string;
  nome?: string;
  descricao?: string;
  funcao?: string;  // ← ADICIONADO para equipes
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
  cpf: number;
  cargo: string;
  matricula: number;
  email: string;
  telefone: string;
  secretaria: string;
  situacao: string;
}

export interface ServantDTO {
  nome: string;
  cpf: number;
  cargo: string;
  matricula: number;
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
  secretariasIds: number[];
}

// =============================================
// CONTRACT TEAM
// =============================================

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
  ataId: number;
  servidorId: number;
  funcaoId: number;
  dataDesignacao: string;
  dataFim: string;
  ativoId: number;
}

// =============================================
// LOOKUP RESPONSE
// =============================================

export interface LookupResponse {
  ativos: LookupItem[];
  tipos: LookupItem[];
  funcoes: LookupItem[];
}