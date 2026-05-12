export type StatoEvento = 'PREVENTIVATO' | 'CONFERMATO' | 'SALDATO' | 'ANNULLATO';
export type TipoPagamentoEvento = 'CAPARRA' | 'ACCONTO' | 'SALDO' | 'PENALE';

export interface PagamentoEventoDTO {
  movimentoId: string;
  tipo: TipoPagamentoEvento;
  importo: number;
  dataFinanziaria: string;
  note: string | null;
  stato: string;
}

export interface EventoDTO {
  id: string;
  nome: string;
  tipo: string;
  dataEvento: string;
  dataPreventivo: string | null;
  importoTotalePreviventivato: number | null;
  importoIncassato: number;
  caparreIncassate: number;
  costiDirettiImputati: number;
  stato: StatoEvento;
  businessUnitId: number;
  contattoNome: string;
  contattoTelefono: string | null;
  contattoEmail: string | null;
  numeroTotalePartecipanti: number;
  numeroBambini: number | null;
  allergie: string[];
  note: string | null;
  motivazioneAnnullamento: string | null;
  importoResiduo: number | null;
  percentualeIncassata: number | null;
  costiReali: number;
  profitto: number;
  pagamenti: PagamentoEventoDTO[];
  createdAt: string;
  createdBy: string;
}

export interface EventoCreateRequest {
  nome: string;
  tipo: string;
  dataEvento: string;
  dataPreventivo: string | null;
  importoTotalePreviventivato: number | null;
  contattoNome: string;
  contattoTelefono: string | null;
  contattoEmail: string | null;
  numeroTotalePartecipanti: number;
  numeroBambini: number | null;
  allergie: string[];
  note: string | null;
  businessUnitId: number | null;
}

export interface EventoUpdateRequest {
  nome?: string | null;
  tipo?: string | null;
  dataEvento?: string | null;
  dataPreventivo?: string | null;
  importoTotalePreviventivato?: number | null;
  contattoNome?: string | null;
  contattoTelefono?: string | null;
  contattoEmail?: string | null;
  numeroTotalePartecipanti?: number | null;
  numeroBambini?: number | null;
  allergie?: string[] | null;
  note?: string | null;
  stato?: StatoEvento | null;
  motivazioneAnnullamento?: string | null;
  businessUnitId?: number | null;
}

export interface EventoCalendarioDTO {
  id: string;
  nome: string;
  dataEvento: string;
  stato: StatoEvento;
  importoTotale: number;
  importoResiduo: number;
  coloreStato: string;
}

export interface EventiDashboardDTO {
  totaleEventi: number;
  totaleIncassato: number;
  totaleCosti: number;
  profittoTotale: number;
  from: string;
  to: string;
}

export interface PagamentoRequest {
  tipo: TipoPagamentoEvento;
  importo: number;
  data: string;
  note: string | null;
  metodoPagamentoId: number;
  contoBancarioId: number;
  contoCoge: number | null;
}

export interface EventoPartecipanteDTO {
  id: number;
  eventoId: string;
  personaleId: string;
  ruolo: string | null;
  costo: number | null;
  note: string | null;
}

export interface AggiungiPartecipanteRequest {
  personaleId: string;
  ruolo: string | null;
  costo: number | null;
  note: string | null;
}
