export type JobStatus = 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED';

export interface BuRefDTO {
  id: number;
  nome: string;
}

export interface VoceDTO {
  codiceCoge: string;
  categoria: string;
  importo: number;
  pct: number;
}

export interface RicaviDTO {
  totale: number;
  perCategoria: VoceDTO[];
}

export interface CostiDTO {
  totale: number;
  capex: number;
  perCategoria: VoceDTO[];
}

export interface PlDTO {
  bu: BuRefDTO;
  from: string;
  to: string;
  ricavi: RicaviDTO;
  costi: CostiDTO;
  ebitda: number;
  marginePct: number;
}

export interface BuPlRiepilogoDTO {
  bu: BuRefDTO;
  ricavi: number;
  costi: number;
  ebitda: number;
  marginePct: number;
}

export interface TotaleConsolidatoDTO {
  ricavi: number;
  costi: number;
  ebitda: number;
  marginePct: number;
}

export interface PlComparativoDTO {
  from: string;
  to: string;
  businessUnits: BuPlRiepilogoDTO[];
  totaleConsolidato: TotaleConsolidatoDTO;
}

export interface CashFlowPeriodoDTO {
  periodoInizio: string;
  periodoFine: string;
  entrate: number;
  uscite: number;
  saldoPeriodo: number;
  saldoCumulato: number;
}

export interface ForecastPointDTO {
  data: string;
  tipo: string;
  entratePreviste: number;
  uscitePreviste: number;
  liquiditaProiettata: number;
  note: string | null;
}

export interface JobStatusDTO {
  jobId: string;
  status: JobStatus;
  result: PlDTO | null;
  error: string | null;
}

export interface RiepilogoCategoriaDTO {
  codiceCoge: string;
  categoria: string;
  importo: number;
  pct: number;
}
