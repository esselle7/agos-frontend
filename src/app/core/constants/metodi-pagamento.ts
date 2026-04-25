export const METODI_PAGAMENTO = [
  { id: 1, nome: 'POS BPM' },
  { id: 2, nome: 'POS Crédit Agricole' },
  { id: 3, nome: 'Bonifico Bancario' },
  { id: 4, nome: 'Contanti' },
  { id: 5, nome: 'Satispay' },
  { id: 6, nome: 'Stripe' },
  { id: 7, nome: 'Shopify' },
  { id: 8, nome: 'Alveare' },
] as const;

export type MetodoPagamento = (typeof METODI_PAGAMENTO)[number];
