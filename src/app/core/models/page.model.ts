/** Resposta dos endpoints Spring Data paginados. O índice de página começa em zero. */
export interface ApiPage<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  number: number;
  size: number;
}

export interface DocumentoQuery {
  search: string;
  ano: string;
  tipo: string;
  status: string;
  vigencia: string;
  secretarias: number[];
  pessoas: string[];
}

export interface DocumentoFilterOptions { anos: number[]; tipos: string[]; }
