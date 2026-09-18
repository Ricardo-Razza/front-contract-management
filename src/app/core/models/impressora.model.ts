export interface LoteImpressao {
  id: number;
  numeroLote: number;
  descricao: string;
  tipo: string;
  franquiaMono: number;
  franquiaColor: number;
  valorLocacaoMensal: number;
  valorExcedenteMono: number;
  valorExcedenteColor: number;
  ativo: boolean;
}

export interface EmpenhoImpressao {
  id: number;
  numeroEmpenho: string;
  ano: number;
  secretariaId: number;
  secretariaNome?: string;
  secretariaSigla?: string;
  descricao?: string;
  valorTotal: number;
  saldo: number;
  ativo: boolean;
}

export interface Impressora {
  id: number;
  itemPedido?: number;
  numeroSerie?: string;
  fabricante: string;
  modelo: string;
  tipoImpressao: string; // 'MONO' | 'COLOR'
  ip?: string;
  ativo: boolean;

  // Dados do Lote
  loteId?: number;
  numeroLote?: number;
  loteDescricao?: string;
  franquiaMono?: number;
  franquiaColor?: number;
  valorLocacaoMensal?: number;
  valorExcedenteMono?: number;
  valorExcedenteColor?: number;

  // Dados da Instalação Ativa
  instalacaoId?: number;
  secretariaId?: number;
  secretariaNome?: string;
  secretariaSigla?: string;
  empenhoId?: number;
  numeroEmpenho?: string;
  localInstalacao?: string;
  endereco?: string;
  responsavel?: string;
  transformador?: string;
  dataInstalacao?: string;
  contadorInstalacaoMono?: number;
  contadorInstalacaoColor?: number;
  statusInstalacao?: string;

  // Última Leitura
  ultimoContadorMono?: number;
  ultimoContadorColor?: number;
  dataUltimaLeitura?: string;
}

export interface ImpressoraDTO {
  itemPedido?: number;
  numeroSerie?: string;
  fabricante: string;
  modelo: string;
  tipoImpressao: string;
  loteId?: number;
  ip?: string;
  secretariaId: number;
  empenhoId?: number;
  localInstalacao: string;
  endereco?: string;
  responsavel?: string;
  transformador?: string;
  dataInstalacao?: string;
  contadorInicialMono?: number;
  contadorInicialColor?: number;
}

export interface TrocaLocalDTO {
  novaSecretariaId: number;
  novoLocalInstalacao: string;
  novoEndereco?: string;
  novoResponsavel?: string;
  novoIp?: string;
  novoTransformador?: string;
  dataMudanca: string;
  contadorAtualMono?: number;
  contadorAtualColor?: number;
  motivo?: string;
}

export interface SubstituicaoImpressoraDTO {
  contadorFinalMonoRetirada: number;
  contadorFinalColorRetirada?: number;
  dataSubstituicao: string;
  motivoDefeito: string;
  novoNumeroSerie?: string;
  novoModelo: string;
  novoFabricante?: string;
  contadorInicialMonoNova: number;
  contadorInicialColorNova?: number;
}

export interface LeituraContador {
  id: number;
  impressoraId: number;
  itemPedido?: number;
  impressoraModelo: string;
  impressoraIp?: string;
  secretariaSigla?: string;
  localInstalacao?: string;
  mesReferencia: number;
  anoReferencia: number;
  dataLeitura: string;
  leituraMonoAnterior: number;
  leituraMonoAtual: number;
  copiasMono: number;
  leituraColorAnterior: number;
  leituraColorAtual: number;
  copiasColor: number;
  proporcao: number;
  franquiaMonoAplicada: number;
  franquiaColorAplicada: number;
  excedenteMono: number;
  excedenteColor: number;
  valorLocacao: number;
  valorExcedenteMono: number;
  valorExcedenteColor: number;
  valorTotal: number;
  origemLeitura: string;
  observacoes?: string;
}

export interface LeituraContadorDTO {
  impressoraId: number;
  mesReferencia: number;
  anoReferencia: number;
  dataLeitura: string;
  leituraMonoAtual: number;
  leituraColorAtual?: number;
  proporcao?: number;
  origemLeitura?: string;
  observacoes?: string;
}
