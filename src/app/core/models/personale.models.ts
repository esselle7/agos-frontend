export interface PersonaleSummaryDTO {
  id: string;
  nome: string;
  cognome: string;
  mansione: string | null;
  businessUnitId: number | null;
  businessUnitNome: string | null;
  costoAziendaleMensile: number | null;
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
  mansione: string | null;
  businessUnitId: number | null;
  centroDiCostoId: number | null;
  costoAziendaleMensile: number | null;
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
