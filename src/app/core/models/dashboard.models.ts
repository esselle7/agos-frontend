export type DashboardPeriod = 'MTD' | 'QTD' | 'YTD' | 'CUSTOM';

export interface ContoSaldoDTO {
  saldo: number;
  variazioneNelPeriodo: number;
}

export interface SaldiDTO {
  bpm: ContoSaldoDTO;
  creditAgricole: ContoSaldoDTO;
  cassa: ContoSaldoDTO;
  totale: ContoSaldoDTO;
}

export interface PeriodoDTO {
  from: string;
  to: string;
  totalEntrate: number;
  totalUscite: number;
  margine: number;
  marginePct: number;
  nMovimenti: number;
}

export interface DeltaMesePrecedenteDTO {
  entrateDelta: number;
  usciteDelta: number;
  margineDelta: number;
  deltaPercent: number;
}

export interface DashboardKpiDTO {
  saldi: SaldiDTO;
  periodo: PeriodoDTO;
  vsMesePrecedente: DeltaMesePrecedenteDTO;
  aggiornatoAl: string;
}

export interface AndamentoMensileDTO {
  anno: number;
  mese: number;
  totEntrate: number;
  totUscite: number;
  margine: number;
}

export interface FatturatoPerBuDTO {
  buId: number;
  buNome: string;
  colore: string;
  totEntrate: number;
  totUscite: number;
  margine: number;
  marginePct: number;
}

export interface ScadenzaDTO {
  tipo: string;
  referenceId: string;
  descrizione: string;
  importoAtteso: number;
  dataScadenza: string;
  urgenza: 'BASSA' | 'MEDIA' | 'ALTA';
  stato: 'PENDING' | 'PAID';
}

export interface ScadenzeImminentiDTO {
  eventi: ScadenzaDTO[];
  rateRicorrenti: ScadenzaDTO[];
}
