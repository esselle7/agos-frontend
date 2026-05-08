export type InstallmentStato = 'PENDING' | 'PAID' | 'CANCELLED' | 'SKIPPED';
export type PlanStato = 'ATTIVO' | 'COMPLETATO' | 'ANNULLATO';
export type Frequenza = 'MENSILE' | 'BIMESTRALE' | 'TRIMESTRALE';

export interface InstallmentDTO {
  id: string;
  numeroRata: number;
  dataScadenza: string;
  importo: number;
  stato: InstallmentStato;
  movimentoId: string | null;
  note: string | null;
}

export interface PlanSummaryDTO {
  id: string;
  descrizione: string;
  contoBancarioId: number;
  contoBancarioNome: string;
  contoCoge: number;
  contoCogeDescrizione: string;
  importoRata: number;
  variazionePct: number;
  giornoDelMese: number;
  frequenza: Frequenza;
  numeroRate: number;
  dataPrimaRata: string;
  stato: PlanStato;
  ratePending: number;
  ratePaid: number;
  rateSkipped: number;
  rateCancelled: number;
  totalePagato: number;
  totaleResiduo: number;
}

export interface PlanDetailDTO extends PlanSummaryDTO {
  note: string | null;
  totalePiano: number;
  saldoContoBancario: number;
  rate: InstallmentDTO[];
}

export interface PlanCreateRequest {
  descrizione: string;
  contoBancarioId: number;
  contoCoge: number;
  importoRata: number;
  variazionePct: number;
  giornoDelMese: number;
  frequenza: Frequenza;
  numeroRate: number;
  dataInizio: string;   // ISO date (YYYY-MM-DD), giorno verrà sostituito da giornoDelMese
  note?: string;
}

export interface CogeOption {
  id: number;
  codice: string;
  descrizione: string;
}
