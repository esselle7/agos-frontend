export interface MansioneDTO {
  id: string;
  nome: string;
  isActive: boolean;
}

export type TipoRetribuzione = 'MENSILE' | 'ORARIA';

export interface PersonaleSummaryDTO {
  id: string;
  nome: string;
  cognome: string;
  mansioneId: string | null;
  mansione: string | null;
  businessUnitId: number | null;
  businessUnitNome: string | null;
  costoAziendaleMensile: number | null;
  tipoRetribuzione: TipoRetribuzione;
  pagaOraria: number | null;
  isActive: boolean;
}

export interface PersonaleDTO extends PersonaleSummaryDTO {
  centroDiCostoId: number | null;
  centroDiCostoCodice: string | null;
  centroDiCostoDescrizione: string | null;
}

export interface CreatePersonaleRequest {
  nome: string;
  cognome: string;
  /** Nome della mansione: il backend crea automaticamente se non esiste. */
  mansione: string | null;
  businessUnitId: number | null;
  /** Ignorato dal backend: il CDC viene derivato automaticamente dalla BU. */
  centroDiCostoId?: number | null;
  /** Stipendio mensile lordo (tipoRetribuzione = MENSILE). */
  costoAziendaleMensile: number | null;
  tipoRetribuzione: TipoRetribuzione;
  /** Paga oraria lorda (tipoRetribuzione = ORARIA). */
  pagaOraria: number | null;
  isActive: boolean;
}

export interface BuCosto {
  businessUnitId: number | null;
  businessUnitNome: string | null;
  count: number;
  costoMensile: number;
}

export interface PersonaleCostoSummaryDTO {
  totaleAttivi: number;
  costoMensileComplessivo: number;
  perBu: BuCosto[];
}

export interface CentroDiCostoDTO {
  id: number;
  codice: string;
  descrizione: string;
  businessUnitId: number;
}
