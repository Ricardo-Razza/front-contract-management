export interface DocumentoAnexo {
  id: number;
  nomeOriginal: string;
  tipoDocumento: string;
  contentType?: string;
  tamanhoBytes?: number;
  descricao?: string;
  contratoId?: number;
  ataId?: number;
  criadoEm?: string;
  urlDownload?: string;
  urlVisualizar?: string;
}

export type TipoDocumentoAnexo =
  | 'CONTRATO_INTEGRA'
  | 'TERMO_REFERENCIA'
  | 'PORTARIA'
  | 'ADITIVO'
  | 'NOTA_EMPENHO'
  | 'OUTRO';

export const TIPOS_DOCUMENTO_LABELS: Record<string, string> = {
  CONTRATO_INTEGRA: 'Íntegra do Contrato / Ata',
  TERMO_REFERENCIA: 'Termo de Referência (TR)',
  PORTARIA: 'Portaria de Fiscalização',
  ADITIVO: 'Termo Aditivo',
  NOTA_EMPENHO: 'Nota de Empenho',
  OUTRO: 'Outros Documentos'
};
