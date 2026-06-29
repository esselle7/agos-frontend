export interface TipoEventoDTO {
  codice: string;
  descrizione: string;
}

export interface BusinessUnitDTO {
  id: number;
  codice: string;
  nome: string;
  colore: string;
  descrizione: string | null;
}

export interface ContoBancarioDTO {
  id: number;
  nome: string;
  tipo: string;
  iban: string | null;
  saldoCalcolato: number;
  saldoIniziale: number;
  dataSaldoIniziale: string | null;
}

export interface CespiteDTO {
  id: string;
  descrizione: string;
  contoCogeId: number;
  contoCogeCodice: string | null;
  contoCogeDescrizione: string | null;
  costoStorico: number;
  aliquotaAmmortamento: number;
  dataAcquisto: string;
  isActive: boolean;
  ammortamentoMensile: number;
  ammortamentoAnnuo: number;
  giaAmmortizzato: number;
  valoreResiduo: number;
}

export interface CespiteRequest {
  descrizione: string;
  contoCogeId: number;
  costoStorico: number;
  aliquotaAmmortamento: number;
  dataAcquisto: string;
  isActive: boolean;
}

export interface CategoriaNode {
  id: number;
  nome: string;
  tipo: 'ENTRATA' | 'USCITA';
  buId: number;
  ordinamento: number;
  sottocategorie: CategoriaNode[];
}

export interface AliasDTO {
  id: number;
  pattern: string;
  matchType: 'EXACT' | 'CONTAINS' | 'REGEX';
}

export interface FornitoreDTO {
  id: string;
  ragioneSociale: string;
  alias: string | null;
  piva: string | null;
  codiceSdi: string | null;
  cogeDefaultId: number | null;
  buDefaultId: number | null;
  note: string | null;
  aliasList: AliasDTO[];
}

export interface FornitoreSummaryDTO {
  id: string;
  ragioneSociale: string;
}

export interface CreateAliasRequest {
  pattern: string;
  matchType: 'EXACT' | 'CONTAINS' | 'REGEX';
}

export interface CreateFornitoreRequest {
  ragioneSociale: string;
  alias: string | null;
  piva: string | null;
  codiceSdi: string | null;
  cogeDefaultId: number | null;
  buDefaultId: number | null;
  note: string | null;
}

export interface CreateCategoriaRequest {
  nome: string;
  tipo: 'ENTRATA' | 'USCITA';
  parentId: number | null;
  buId: number;
  ordinamento: number;
}

export type TipoCoge = 'RICAVO' | 'COSTO' | 'ATTIVITA' | 'PASSIVITA' | 'ONERE_FINANZIARIO' | 'IMPOSTA';

export interface PianoContiCogeDTO {
  id: number;
  codice: string;
  nome: string;
  tipo: TipoCoge;
  parentId: number | null;
  livello: number;
}

export interface PianoContiCogeUpsertRequest {
  codice: string;
  descrizione: string;
  tipo: TipoCoge;
  parentId: number | null;
}

export interface MetodoPagamentoDTO {
  id: number;
  codice: string;
  descrizione: string;
}

export interface AliquotaIvaDTO {
  id: number;
  aliquota: number;
  descrizione: string;
}
