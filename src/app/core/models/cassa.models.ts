export interface CassaMovimentoDTO {
  id: string;
  tipo: string;
  importo: number;
  dataMovimento: string;
  descrizione: string | null;
  contoCoge: number | null;
  businessUnitId: number | null;
  contoBancaId: number | null;
  stato: string;
  createdAt: string;
  createdBy: string;
}

export interface CreateCassaMovimentoRequest {
  tipo: string;
  importo: number;
  dataMovimento: string;
  descrizione: string | null;
  contoCoge: number | null;
  businessUnitId: number | null;
  contoBancaId: number | null;
}

export interface SaldoResponse {
  saldo: number;
  aggiornatoAl: string;
}
