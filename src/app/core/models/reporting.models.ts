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

// ── Forecasting ──────────────────────────────────────────────────────────────

export type ForecastingHorizon = '30' | '60' | '90' | '180' | 'FINE_ANNO';
export type ForecastingCategoria = 'MOVIMENTO' | 'EVENTO' | 'RATA_RICORRENTE' | 'STIPENDIO';
export type ForecastingVista = 'ECONOMICA' | 'FINANZIARIA' | 'ENTRAMBE';

export interface ForecastingAsIsDTO {
  saldoLiquidita: number;
  ricaviYtd: number;
  costiYtd: number;
  ebitdaYtd: number;
  creditiAperti: number;
  debitiAperti: number;
}

export interface ForecastingDettaglioDTO {
  data: string;
  categoria: ForecastingCategoria;
  descrizione: string;
  importoEntrata: number;
  importoUscita: number;
  vista: ForecastingVista;
}

export interface ForecastingTimelineDTO {
  bucket: string;
  bucketStart: string;
  bucketEnd: string;
  entratePreviste: number;
  uscitePreviste: number;
  ebitdaPeriodo: number;
  saldoLiquiditaFine: number;
}

export interface ForecastingEconomicoDTO {
  ricaviPrevisti: number;
  costiPrevisti: number;
  ebitdaPrevisto: number;
  dettaglio: ForecastingDettaglioDTO[];
}

export interface ForecastingFinanziarioDTO {
  saldoPartenza: number;
  incassiPrevisti: number;
  uscitePreviste: number;
  saldoFinale: number;
  timeline: ForecastingTimelineDTO[];
}

export interface ForecastingRispostaDTO {
  asIs: ForecastingAsIsDTO;
  economico: ForecastingEconomicoDTO;
  finanziario: ForecastingFinanziarioDTO;
}
