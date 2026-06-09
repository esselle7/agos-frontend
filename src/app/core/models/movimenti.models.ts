export type TipoMovimento = 'ENTRATA' | 'USCITA';
export type StatoMovimento = 'REGISTRATO' | 'DA_LIQUIDARE' | 'ANNULLATO';
export type FonteMovimento = 'MANUALE' | 'IMPORT_CSV' | 'STRIPE' | 'SATISPAY' | 'SHOPIFY' | 'BILLY';

export interface MovimentoDTO {
  id: string;
  tipo: TipoMovimento;
  importo: number;
  importoImponibile: number | null;
  importoIva: number | null;
  importoCommissione: number | null;
  /** Data di competenza economica (impatto P&L / EBITDA). */
  dataMovimento: string;
  dataCompetenza: string | null;
  /** Data di liquidazione effettiva. null = DA_LIQUIDARE. */
  dataFinanziaria: string | null;
  /** Scadenza finanziaria attesa. Obbligatoria se dataFinanziaria è null. */
  dataLiquidita: string | null;
  contoBancarioId: number;
  metodoPagamentoId: number;
  businessUnitId: number;
  contoCoge: number;
  categoriaId: number | null;
  fornitoreId: string | null;
  eventoId: string | null;
  tipoEventoMovimento: string | null;
  descrizione: string;
  note: string | null;
  stato: StatoMovimento;
  fonte: string | null;
  riferimentoEsterno: string | null;
  allegatoPath: string | null;
  createdAt: string;
  createdBy: string;
}

export interface MovimentoCreateRequest {
  tipo: TipoMovimento;
  importo: number;
  importoLordo: number | null;
  aliquotaIva: number | null;
  /** Data di competenza economica. Sempre valorizzata. */
  dataMovimento: string;
  /** Alias economico (= dataMovimento). Garantisce mv_conto_economico_mensile. */
  dataCompetenza: string | null;
  /** Data di liquidazione effettiva. null = DA_LIQUIDARE. */
  dataFinanziaria: string | null;
  /** Scadenza finanziaria attesa. Obbligatoria se dataFinanziaria è null. Auto-set = dataFinanziaria se liquidato. */
  dataLiquidita: string | null;
  contoBancarioId: number | null;
  metodoPagamentoId: number | null;
  businessUnitId: number;
  contoCoge: number;
  categoriaId: number | null;
  fornitoreId: string | null;
  eventoId: string | null;
  tipoEventoMovimento: string | null;
  descrizione: string;
  note: string | null;
  riferimentoEsterno: string | null;
  fonte: string | null;
  allegatoPath: string | null;
}

export interface MovimentoUpdateRequest {
  tipo?: TipoMovimento | null;
  importo?: number | null;
  importoLordo?: number | null;
  aliquotaIva?: number | null;
  dataMovimento?: string | null;
  dataCompetenza?: string | null;
  /** Impostare per liquidare il movimento. null = rimane DA_LIQUIDARE. */
  dataFinanziaria?: string | null;
  dataLiquidita?: string | null;
  contoBancarioId?: number | null;
  metodoPagamentoId?: number | null;
  businessUnitId?: number | null;
  contoCoge?: number | null;
  categoriaId?: number | null;
  fornitoreId?: string | null;
  eventoId?: string | null;
  tipoEventoMovimento?: string | null;
  descrizione?: string | null;
  note?: string | null;
  riferimentoEsterno?: string | null;
  fonte?: string | null;
  allegatoPath?: string | null;
}

export interface MovimentiSommarioStatoSomma {
  stato: StatoMovimento;
  totaleEntrate: number;
  totaleUscite: number;
  netto: number;
  countEntrate: number;
  countUscite: number;
}

export interface MovimentiSommarioDTO {
  perStato: MovimentiSommarioStatoSomma[];
  totaleEntrate: number;
  totaleUscite: number;
  netto: number;
  totaleCount: number;
}

export interface BulkImportRequest {
  movimenti: MovimentoCreateRequest[];
}

export interface ImportError {
  riga: number;
  campo: string;
  motivo: string;
}

export interface BulkImportResponse {
  importati: number;
  duplicati: number;
  errori: number;
  dettaglioErrori: ImportError[];
}

// ── Import ETL (Billy / BPM / CA) ────────────────────────────────────────────

export type FonteImport = 'billy' | 'bpm' | 'ca';

export interface EtlRowError {
  riga: number;
  messaggio: string;
  rawData: Record<string, string>;
}

export interface EtlImportResponse {
  importLogId: string;
  importati: number;
  duplicati: number;
  ambigui: number;
  scartati: number;      // SKIP_POS / SKIP_GIROCONTO / SKIP_RICORRENTE (Gate A)
  parcheggiati: number;  // PARK_EVENTO → eventi_da_riconciliare (Gate B)
  errori: EtlRowError[];
}

export interface ImportLogDTO {
  id: string;
  fonte: string;
  filename: string;
  dataImport: string;
  righeTotali: number | null;
  righeImportate: number | null;
  righeErrore: number | null;
  righeDuplicate: number | null;
  righeAmbigue: number | null;
  righeAmbigueClassificate: number | null;
  righeScartate: number | null;
  righeParcheggiate: number | null;
  stato: string;
  importedBy: string | null;
}

// ── Triage assistito / KPI / regole data-driven (ETL v2 §8/§9/§13) ──────────

export interface ImportKpiDTO {
  righeTotali: number;
  importate: number;
  ambigue: number;
  scartate: number;
  parcheggiate: number;
  movimentiTransitori: number;
  saldoTransitori: number;
  tassoAmbiguitaPct: number;
  coperturaFornitoriPct: number;
}

export interface SuggerimentoControparteDTO {
  controparteId: string;
  nome: string;
  iban: string | null;
  fornitoreId: string | null;
  cogeDefaultId: number | null;
  cogeCodice: string | null;
  buDefault: number | null;
  similarita: number;
}

export interface RegolaClassificazioneDTO {
  id: number | null;
  priorita: number;
  sorgente: string;        // BILLY | CA | BPM | *
  tipoMovimento: string;   // ENTRATA | USCITA | *
  campo: string;           // CAUSALE | DESC_SPACED | DESC_COMPACT | IBAN
  matchType: string;       // EQUALS | CONTAINS | STARTS_WITH | REGEX | IN_LIST
  pattern: string;
  azione: string;          // SKIP_POS | SKIP_GIROCONTO | SKIP_RICORRENTE | PARK_EVENTO | MAP
  cogeCodice: string | null;
  buId: number | null;
  metodoCodice: string | null;
  confidence: number | null;
  attivo: boolean;
  note: string | null;
}

// ── Centro smistamento import: transitori + eventi parcheggiati ─────────────

export interface TransitorioDTO {
  id: string;
  tipo: string;               // ENTRATA | USCITA
  importo: number;
  dataMovimento: string;
  descrizione: string;
  cogeCodiceAttuale: string;  // 39.99.999 | 49.99.999
  fornitoreId: string | null;
  contoBancarioId: number | null;
  ibanEstratto: string | null;
  controparteEstratta: string | null;
}

export interface ClassificaTransitorioRequest {
  cogeId: number;
  businessUnitId: number;
  fornitoreId: string | null;
  apprendiControparte: boolean;
  nota: string | null;
}

export interface EventoParcheggiatoDTO {
  id: string;
  fonte: string;
  chiaveAggancio: string | null;
  dataMovimento: string | null;
  importo: number;
  tipo: string;
  contoBancarioId: number | null;
  descrizioneNorm: string | null;
  tipoEventoPresunto: string | null;  // CAPARRA | ACCONTO | SALDO | AFFITTO_SALA | null
  keywordMatch: string | null;
  controparteNome: string | null;
  controparteIban: string | null;
  dataEventoEstratta: string | null;
  stato: string;                       // DA_RICONCILIARE | RICONCILIATO | SCARTATO
}

export interface RisolviEventoRequest {
  azione: 'SCARTA' | 'CLASSIFICA' | 'RICONCILIA';
  cogeId: number | null;
  businessUnitId: number | null;
  eventoId: string | null;
  nota: string | null;
}

export interface AmbiguitaDTO {
  id: string;
  importLogId: string;
  rigaNumero: number;
  fonte: string;
  rawData: Record<string, string>;
  motivo: string;
  stato: string;
  movimentoId: string | null;
  classificatoAt: string | null;
  noteOperatore: string | null;
}

export interface ClassificaAmbiguitaRequest {
  cogeId: number | null;
  businessUnitId: number | null;
  metodoPagamentoId: number | null;
  contoBancarioId: number | null;
  fornitoreId: string | null;
  eventoId: string | null;
  tipoEventoMovimento: string | null;
  nota: string | null;
  aggiungiRegola: boolean;
  scarta: boolean;
}
