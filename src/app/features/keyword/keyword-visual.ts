/**
 * Linguaggio visivo condiviso delle keyword (pagina, wizard, anteprima triage).
 * Tre "tipi" che combinano NATURA (cosa riconosce) e AZIONE (cosa fa), così l'utente
 * capisce a colpo d'occhio cosa succederà:
 *  - IDENTITA          → riconosce un fornitore preciso e lo CONTABILIZZA.
 *  - DOMINIO_EVENTO    → riconosce un evento e lo PARCHEGGIA (nessun movimento).
 *  - DOMINIO_CATEGORIA → riconosce una categoria e la CONTABILIZZA (senza fornitore).
 */
export type KeywordKind = 'IDENTITA' | 'DOMINIO_EVENTO' | 'DOMINIO_CATEGORIA';

export interface KeywordVisual {
  kind: KeywordKind;
  icon: string;        // material icon
  /** etichetta natura */
  naturaLabel: string;
  /** etichetta azione */
  azioneLabel: string;
  /** classe CSS per l'accento colore */
  accent: string;
  /** descrizione breve del comportamento */
  hint: string;
}

export function keywordKind(natura: string, azione: string): KeywordKind {
  if (natura === 'IDENTITA') return 'IDENTITA';
  return azione === 'PARK_EVENTO' ? 'DOMINIO_EVENTO' : 'DOMINIO_CATEGORIA';
}

const VISUALS: Record<KeywordKind, KeywordVisual> = {
  IDENTITA: {
    kind: 'IDENTITA',
    icon: 'badge',
    naturaLabel: 'Identità',
    azioneLabel: 'Contabilizza',
    accent: 'kw-identita',
    hint: 'Riconosce una controparte precisa (nome o codice) e registra il movimento attribuendo il fornitore.',
  },
  DOMINIO_CATEGORIA: {
    kind: 'DOMINIO_CATEGORIA',
    icon: 'sell',
    naturaLabel: 'Dominio · Categoria',
    azioneLabel: 'Contabilizza',
    accent: 'kw-categoria',
    hint: 'Riconosce una categoria generica e registra il movimento su BU + COGE. Non attribuisce un fornitore.',
  },
  DOMINIO_EVENTO: {
    kind: 'DOMINIO_EVENTO',
    icon: 'celebration',
    naturaLabel: 'Dominio · Evento',
    azioneLabel: 'Parcheggia',
    accent: 'kw-evento',
    hint: 'Riconosce un evento (matrimonio, cerimonia…) e lo mette in attesa di riconciliazione: NON crea un movimento.',
  },
};

export function keywordVisual(natura: string, azione: string): KeywordVisual {
  return VISUALS[keywordKind(natura, azione)];
}

/** Etichetta leggibile dello scope tipo movimento. */
export function tipoMovLabel(tm: string): string {
  return tm === 'ENTRATA' ? 'in entrata' : tm === 'USCITA' ? 'in uscita' : 'di qualsiasi tipo';
}
