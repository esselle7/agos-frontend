export interface PagedResponse<T> {
  content: T[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
}

export interface ErrorResponse {
  code: string;
  message: string;
  details: Record<string, string> | null;
  timestamp: string;
}

export interface MovimentoDTOShared {
  id: string;
  tipo: 'ENTRATA' | 'USCITA';
  importo: number;
  dataMovimento: string;
  dataCompetenza: string | null;
  dataLiquidita: string | null;
  canale: string | null;
  contoId: string | null;
  contoNome: string | null;
  businessUnitId: string | null;
  businessUnitNome: string | null;
  categoriaId: string | null;
  categoriaNome: string | null;
  sottocategoriaId: string | null;
  sottocategoriaNome: string | null;
  fornitoreId: string | null;
  fornitoreNome: string | null;
  eventoId: string | null;
  eventoNome: string | null;
  tipoEventoMovimento: string | null;
  descrizione: string | null;
  note: string | null;
  importoLordo: number | null;
  importoCommissione: number | null;
  aliquotaIva: number | null;
  importoIva: number | null;
  stato: string;
  fonte: string | null;
  allegatoPath: string | null;
  createdAt: string;
  createdBy: string;
}
