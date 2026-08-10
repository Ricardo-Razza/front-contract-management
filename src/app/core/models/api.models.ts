
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


export interface Agreement {
  id: number;
  numero: number;
  ano: number;
  dataInicio: string;
  dataFim: string;
  tipo: string;
  objeto: string;
  observacao: string;
  portariaDesignacao?:string;
  dataDesignacao?: string;
  situacao?: string;
  gestores?:string;
  fiscais?:string;
  secretarias: Secretariat[];
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



export interface ContractTeam {
  id: number;
  ata: string;
  servidor: string;
  funcao: string;
  dataFim: string;
  situacao: string;
}

export interface ContractTeamDTO {
  ataId: number;
  servidorId: number;
  funcaoId: number;
  dataFim: string;
  ativoId: number;
}


export interface LookupResponse {
  ativos: LookupItem[];
  tipos: LookupItem[];
  funcoes: LookupItem[];
}