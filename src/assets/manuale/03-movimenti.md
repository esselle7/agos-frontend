# 9. Movimenti

> Menu: **Contabilità → Movimenti**. È il registro di tutto ciò che entra ed esce.

Un **movimento** è la singola registrazione contabile di un euro che si muove. Tutto, alla fine,
diventa un movimento: gli incassi, i pagamenti, le rate, le caparre degli eventi. Questo capitolo
spiega come crearli, modificarli, liquidarli e leggerli.

> Prima di proseguire, assicurati di avere chiaro il [modello a tre date](01-capire-il-gestionale.md#2-il-modello-a-tre-date)
> e le [famiglie del piano dei conti](01-capire-il-gestionale.md#5-business-unit-e-piano-dei-conti):
> sono i due concetti che usi in ogni movimento.

---

## 9.1 La lista dei movimenti

Aprendo **Movimenti** vedi l'elenco di tutte le registrazioni, con filtri (periodo, BU, stato,
tipo). Da qui puoi:

- cliccare una riga per aprirne il **dettaglio**;
- usare il pulsante **Nuovo** (in alto) per creare un movimento;
- riconoscere a colpo d'occhio lo **stato** di ciascuno (Registrato / Da liquidare / Riconciliato
  / Annullato).

---

## 9.2 Creare un movimento

**A cosa serve:** registrare a mano un'entrata o un'uscita che non arriva dall'import (es. una
fattura ricevuta, un incasso in contanti, l'acquisto di un'attrezzatura, il pagamento di una tassa).

La creazione è guidata da un **wizard a passi**. In alto un riquadro ti mostra in tempo reale
l'**impatto** del movimento: *Economico* (effetto sull'utile), *Cassa oggi* (effetto immediato sui
soldi) ed eventualmente *Previsto* (se l'incasso/pagamento è differito).

### Passo passo

1. **Movimenti → Nuovo.**
2. **Tipo di movimento** — scegli come impatta economico e cassa:

   | Scelta | Quando usarla | Effetto |
   |---|---|---|
   | **Movimento immediato** | Pagato/incassato oggi | Economico e cassa coincidono (stato *Registrato*) |
   | **Economico con incasso differito** | Fattura emessa/ricevuta ma non ancora regolata | Pesa subito sull'utile, la cassa arriva dopo (stato *Da liquidare*) |
   | **Solo finanziario** | Giroconto o rettifica di cassa | **Nessun impatto sull'EBITDA** (non è costo né ricavo) |

3. **Direzione** — **Entrata** (Ricavo/Entrata) o **Uscita** (Costo/Uscita).
4. **Dati economici** — inserisci l'**Importo**, la **Descrizione**, se serve l'**Aliquota IVA**
   (l'IVA e l'imponibile vengono scorporati in automatico).
5. **Conto contabile e controparte** — scegli il **Conto CoGe** (la famiglia/categoria — vedi
   sotto) e, facoltativamente, il **Fornitore / Controparte**. Se scegli un fornitore con un conto
   predefinito, il **CoGe viene auto-compilato**. Indica anche la **Business Unit** e, se vuoi, la
   **Categoria / Sottocategoria** analitica.
6. **Date** — a seconda del tipo scelto al passo 2:
   - *Movimento immediato:* indichi la **data** (vale sia come competenza sia come data
     finanziaria) e scegli **Conto bancario** e **Metodo di pagamento**.
   - *Incasso differito:* indichi la **data movimento** (competenza) e la **data di liquidità**
     (scadenza prevista); conto e metodo li compilerai quando lo liquiderai.
7. **Collegamenti facoltativi** — puoi collegare il movimento a un **Evento** (vedi
   [capitolo 10](04-eventi.md)) o, per un acquisto di bene strumentale, indicarlo come
   **investimento/CAPEX** (vedi [§9.4](#94-i-casi-tipici)).
8. Controlla il **riepilogo** finale e **Salva**.

### Campi e regole

- **Importo, Descrizione, Direzione, Conto CoGe, Business Unit** sono **obbligatori**.
- Se il movimento è **immediato** (o quando lo liquidi), **Conto bancario** e **Metodo di
  pagamento** diventano obbligatori.
- Se è **differito**, è obbligatoria la **data di liquidità** e *non* si indicano conto/metodo;
  la scadenza non può essere nel passato.
- Le **commissioni** (es. POS) vengono calcolate in automatico dal metodo di pagamento, se previste.
- Il **tipo di movimento** (immediato/differito/solo finanziario) **non è modificabile dopo la
  creazione**: per cambiarlo devi annullare e ricreare.

### Cosa succede dopo il salvataggio

- Il movimento appare nella lista con il suo stato.
- Se *immediato*: **Registrato** → entra subito sia nel conto economico (mese della data) sia nel
  cash flow.
- Se *differito*: **Da liquidare** → entra nel conto economico (mese della competenza) ma **non**
  ancora nel cash flow; comparirà tra le **Uscite/entrate da liquidare** e nelle **Previsioni**.

---

## 9.3 Liquidare un movimento "Da liquidare"

**A cosa serve:** quando una fattura registrata viene finalmente pagata/incassata, la "liquidi"
per dirle che i soldi sono passati in banca.

### Passo passo

1. Apri il movimento (dalla lista o dal riquadro **Uscite da liquidare** della Dashboard).
2. Scegli **Liquida / Registra pagamento**.
3. Inserisci la **data finanziaria** (quando i soldi sono passati davvero), il **Conto bancario**
   e il **Metodo di pagamento**.
4. **Salva.**

**Cosa succede:** lo stato passa a **Registrato** e il movimento entra nel **cash flow** del mese
della data finanziaria. Il conto economico **non cambia** (era già contabilizzato alla competenza).

---

## 9.4 I casi tipici

Ecco come impostare i movimenti più frequenti.

### Incasso (entrata)
- Direzione **Entrata**, Conto CoGe famiglia **30 – Ricavo**.
- → *Conto economico:* + Ricavi nel mese della competenza. *Cash flow:* + Entrata operativa nel
  mese dell'incasso.

### Pagamento fornitore (uscita operativa)
- Direzione **Uscita**, Conto CoGe famiglia **40 – Costo operativo**, indica il **Fornitore**.
- → *Conto economico:* − Costi operativi. *Cash flow:* − Uscita operativa.

### Acquisto di un bene strumentale (CAPEX)
- Direzione **Uscita**, Conto CoGe famiglia **50 – Investimento**, segnalalo come **investimento**.
- → *Conto economico:* **non** entra nell'EBITDA; genererà **ammortamenti** spalmati negli anni
  (riducono l'EBITDA→EBIT nei periodi successivi). *Cash flow:* − Uscita di investimento.
- *Esempio:* lavastoviglie professionale €5.000 → escono €5.000 dalla cassa oggi, ma sull'utile
  pesa solo la quota d'ammortamento annua, non i €5.000 in un colpo.

### Pagamento di un'imposta
- Direzione **Uscita**, Conto CoGe famiglia **70 – Imposta**.
- → *Conto economico:* − Imposte (sotto l'EBIT). *Cash flow:* − Uscita operativa.

### Rimborso / nota di credito
- Si registra con **importo negativo** sulla stessa famiglia della voce che corregge (un rimborso
  su un ricavo va su 30 con segno meno; su un costo, su 40 con segno meno).
- → Riduce la voce corrispondente del mese.

---

## 9.5 Modificare o annullare un movimento

- **Modificare:** apri il dettaglio → **Modifica**. Puoi cambiare tutti i dati **tranne il tipo**
  (immediato/differito/solo finanziario). Se il movimento era già liquidato, alcune scelte (es. lo
  stato) possono risultare bloccate.
- **Annullare:** porta il movimento allo stato **Annullato**. Un movimento annullato **resta
  visibile per storico** ma **esce da tutti i conti** (conto economico, cash flow, previsioni). Si
  usa per correggere errori senza cancellare la traccia.

> **Annullare ≠ cancellare.** Il sistema preferisce l'annullamento alla cancellazione, così la
> storia resta tracciabile. Annulla, poi semmai ricrea quello corretto.

---

## 9.6 Leggere il dettaglio di un movimento

Nel dettaglio trovi: importo (e scomposizione imponibile/IVA/commissioni), le tre date, lo stato,
la BU, il conto CoGe, il fornitore/controparte, eventuali collegamenti a evento o cespite, e le
note. È la scheda completa da consultare quando un numero in un report non ti torna.

---

## Errori comuni / attenzione

- **Sbagliare famiglia di conto.** È l'errore che falsa di più i report: mettere la quota capitale
  di un mutuo come "costo" (famiglia 40) invece che come "passività" (famiglia 20) gonfia le
  perdite. In dubbio, ricontrolla la [tabella delle famiglie](01-capire-il-gestionale.md#5-business-unit-e-piano-dei-conti).
- **Confondere le date.** La *data movimento* è la competenza (quando il costo/ricavo *matura*); la
  *data finanziaria* è quando i soldi *passano*. Per le fatture differite, sono mesi diversi.
- **Dimenticare di liquidare.** Un movimento lasciato "Da liquidare" all'infinito sballa il cash
  flow e le previsioni: appare sempre come uscita futura attesa.

---

[← 18. Scadenzario](13-scadenzario.md) · [Indice](README.md) · **Prossimo:** [12. Import & smistamento →](06-import-e-smistamento.md)
