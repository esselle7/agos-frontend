# Parte I — Capire il gestionale

> Questa parte non ti chiede di cliccare niente. Serve a darti il "mentale" del sistema.
> Una volta capiti questi sette concetti, ogni schermata della Parte II avrà senso.

---

## 1. Benvenuto

### A cosa serve questo gestionale

Il gestionale tiene insieme **tre cose** che di solito vivono separate:

1. **La contabilità** — ogni euro che entra ed esce (i *Movimenti*).
2. **La gestione operativa** — gli *Eventi* (matrimoni, banchetti), le *Spese ricorrenti*
   (mutui, leasing, canoni), l'*Anagrafica* di fornitori e personale.
3. **L'analisi** — il conto economico, le previsioni di cassa, i KPI di sintesi.

L'idea di fondo: **tu inserisci o importi i dati una volta sola**, e il sistema ti restituisce
sia "quanto ho guadagnato" (il conto economico) sia "quanti soldi ho davvero in banca e quando"
(il cash flow). Sono due domande diverse e questo manuale ti insegna a non confonderle.

### Chi vede cosa: amministratore vs dipendente

Ci sono due livelli di accesso:

| | **Amministratore (tu, Pietro)** | **Dipendente** |
|---|---|---|
| Dashboard | Dashboard completa (finanza + agenda) | Dashboard eventi (solo i suoi eventi) |
| Eventi | Tutti gli eventi | I propri eventi |
| Movimenti, Import, Spese ricorrenti, Anagrafica, Regole di classificazione, Report, Previsioni | ✅ Sì | ❌ No |

In pratica: tutta la parte contabile e di analisi è **riservata a te**. Un dipendente usa il
gestionale solo per consultare e lavorare gli eventi.

### Le cinque aree dell'azienda (Business Unit)

Ogni cosa che registri è attribuita a una delle cinque **Business Unit** (BU), cioè le aree di
attività. Servono a capire *quale parte dell'azienda* guadagna o spende:

| Codice | Business Unit | Cosa contiene |
|---|---|---|
| BU1 | **Ristorazione e Agriturismo** | Pranzi, cene, ospitalità, B&B |
| BU2 | **Cerimonie ed Eventi** | Matrimoni, banchetti privati e aziendali (logica caparra/saldo) |
| BU3 | **Vendita Prodotti e Spaccio** | Carne, salumi, ortofrutta, trasformati (Spaccio, Alveare, Shopify) |
| BU4 | **Manutenzione Verde** | Manutenzione verde per privati, aziende, condomini |
| BU5 | **Overhead** | Costi generali non attribuibili: mutui, assicurazioni, ammortamenti |

Ne riparliamo nel [capitolo 5](#5-business-unit-e-piano-dei-conti).

---

## 2. Il modello a tre date

Questo è **il concetto più importante di tutto il manuale**. Se lo capisci, capisci il sistema.

Ogni movimento di denaro ha, nel sistema, fino a **tre date diverse**, perché rispondono a tre
domande diverse:

| Data | Risponde alla domanda | A cosa serve |
|---|---|---|
| **Data movimento** (di competenza) | *Di quale periodo è questo costo/ricavo?* | Decide in che mese appare nel **conto economico** |
| **Data finanziaria** | *Quando i soldi sono passati davvero in banca?* | Decide in che mese appare nel **cash flow** |
| **Data di liquidità** (scadenza) | *Quando mi aspetto che vengano pagati?* | Alimenta le **Previsioni** di cassa |

### Perché tre date e non una

Perché **competere** un costo e **pagarlo** sono due eventi distinti, spesso in mesi diversi.

> **Esempio classico — la fattura di dicembre pagata a gennaio.**
> Ricevi una fattura del fornitore datata **20 dicembre 2025** ma la paghi con bonifico il
> **15 gennaio 2026**.
> - **Data movimento (competenza):** 20 dicembre 2025 → il costo pesa sul **conto economico di
>   dicembre 2025** (è lì che hai "consumato" quel servizio).
> - **Data finanziaria:** 15 gennaio 2026 → l'uscita di cassa appare nel **cash flow di gennaio
>   2026** (è quando i soldi sono usciti davvero).
>
> Stesso movimento, due mesi diversi. È corretto così: l'utile di dicembre e i soldi in banca a
> gennaio raccontano due verità entrambe vere.

### La regola pratica: "da liquidare"

Quando registri qualcosa che **non è ancora stato pagato**, lasci vuota la **data finanziaria** e
indichi solo la **data di liquidità** (la scadenza prevista). Il movimento nasce nello stato
**Da liquidare**: pesa già sul conto economico, ma non è ancora uscito dalla cassa. Quando poi
paghi, lo "liquidi" e gli dai la data finanziaria.

| Situazione | Data movimento | Data finanziaria | Data liquidità | Stato |
|---|---|---|---|---|
| Pagato subito | oggi | oggi | oggi | **Registrato** |
| Fattura non ancora pagata | data fattura | *(vuota)* | scadenza | **Da liquidare** |
| Caparra evento di agosto incassata a marzo | data evento (ago) | data incasso (mar) | mar | **Registrato** |

> Gli stati possibili di un movimento sono quattro: **Registrato** (contabilizzato e pagato),
> **Da liquidare** (contabilizzato ma non ancora pagato), **Riconciliato** (pagato e verificato
> contro l'estratto conto della banca) e **Annullato** (escluso da tutti i conti).

---

## 3. Il conto economico

Il **conto economico** (o **P&L**, dall'inglese *Profit & Loss*) risponde alla domanda
"**quanto ho guadagnato?**" in un periodo. Si costruisce a cascata (il cosiddetto *waterfall*):
si parte dai ricavi e si tolgono via via le diverse categorie di costo, fino all'utile finale.

```
   RICAVI                          tutto quello che hai fatturato/incassato come vendita
 − Costi operativi                 acquisti, personale, utenze, servizi
 ─────────────────
 = EBITDA                          il margine "industriale": quanto rende l'attività pura
 − Ammortamenti (D&A)              la quota annua dei beni che hai comprato (cespiti)
 ─────────────────
 = EBIT                            il risultato operativo, dopo l'usura dei beni
 − Oneri finanziari                gli interessi che paghi su mutui e finanziamenti
 ─────────────────
 = EBT                             il risultato prima delle tasse
 − Imposte                         IRAP, IRPEF/IRES
 ─────────────────
 = UTILE NETTO                     quello che resta davvero
```

In parole povere, riga per riga:

- **Ricavi** — i soldi che entrano per la tua attività (pranzi, eventi, vendite, manutenzioni).
- **Costi operativi** — tutto ciò che serve per produrre quei ricavi: materie prime, stipendi,
  affitti, utenze, consulenze.
- **EBITDA** (*Margine Operativo Lordo*) — Ricavi − Costi operativi. È l'indicatore di quanto è
  sana l'attività *prima* di considerare beni, banche e fisco. Il **margine %** è EBITDA ÷ Ricavi.
- **Ammortamenti (D&A)** — se compri una lavastoviglie da €5.000 che durerà anni, non è giusto
  farla pesare tutta sul mese dell'acquisto. La si "spalma" in quote annuali: quelle quote sono
  gli ammortamenti. (Non sono un'uscita di cassa: i soldi sono già usciti quando hai comprato.)
- **EBIT** (*Risultato Operativo*) — EBITDA − Ammortamenti.
- **Oneri finanziari** — gli **interessi** che paghi alle banche. Attenzione: solo gli interessi,
  non la restituzione del capitale (vedi [capitolo 6](#6-cosa-non-e-un-costo-o-un-ricavo)).
- **EBT** — il risultato prima delle imposte.
- **Imposte** — le tasse di competenza del periodo.
- **Utile netto** — il risultato finale.

> Vedrai questa cascata, mese per mese e BU per BU, nella sezione **Report → P&L Comparativo**
> ([capitolo 15](09-reporting-e-previsioni.md)).

---

## 4. Il cash flow

Il **cash flow** (flusso di cassa) risponde a una domanda diversa: "**quanti soldi sono entrati e
usciti davvero, e quando?**". Non è l'utile: è il movimento concreto del denaro in banca.

Si divide in tre tipi di flusso:

- **Flussi operativi** — incassi dei clienti e pagamenti di fornitori, stipendi, utenze, tasse.
- **Flussi di investimento** — l'acquisto di beni strumentali (i cespiti / CAPEX).
- **Flussi finanziari** — le rate di mutui e finanziamenti (sia capitale che interessi).

### Perché il cash flow è diverso dall'utile

Per due motivi:

1. **Le date.** Il conto economico usa la *data di competenza*, il cash flow usa la *data
   finanziaria*. La fattura di dicembre pagata a gennaio (vedi [capitolo 2](#2-il-modello-a-tre-date))
   è il caso tipico: stesso importo, mesi diversi.
2. **Cosa conta.** Alcune cose pesano sull'utile ma non sulla cassa (gli **ammortamenti**: il bene
   l'hai già pagato). Altre pesano sulla cassa ma non sull'utile (la **restituzione del capitale**
   di un mutuo: stai solo restituendo soldi che avevi preso in prestito, non è un costo).

> Puoi avere un mese **in utile ma a corto di cassa** (hai fatturato tanto ma i clienti non hanno
> ancora pagato) oppure **con tanta cassa ma in perdita** (hai incassato vecchie fatture mentre
> il mese andava male). Sono entrambe situazioni normali: per questo servono due viste.

> **Dove si legge il cash flow.** Oggi non esiste una schermata "Cash Flow" a sé nel menu. La
> fotografia della cassa la trovi nei riquadri della **Dashboard** ("Situazione Finanziaria"),
> mentre le **uscite/entrate future previste** sono nella sezione **Previsioni**
> ([capitolo 15](09-reporting-e-previsioni.md)).

---

## 5. Business Unit e piano dei conti

Per dare un senso ai numeri, ogni movimento viene classificato secondo **due assi**:

- **Business Unit (BU)** — *in quale area* dell'azienda. Sono le cinque viste nel
  [capitolo 1](#1-benvenuto).
- **Conto contabile (CoGe)** — *che tipo* di soldi sono. È la "categoria" dell'euro.

### Il piano dei conti (CoGe): le sette famiglie

Il piano dei conti è organizzato in famiglie numerate. Non devi imparare i numeri a memoria — il
sistema te li propone — ma è utile sapere **come ogni famiglia impatta i tuoi report**:

| Famiglia | Tipo di conto | Cos'è | Conto economico | Cash flow |
|---|---|---|---|---|
| **30** | **Ricavo** | Vendite, eventi, servizi | + Ricavi | + Entrata operativa |
| **40** | **Costo operativo** | Personale, utenze, fornitori, materie prime | − Costi operativi | − Uscita operativa |
| **50** | **Investimento (CAPEX)** | Acquisto di beni strumentali (cespiti) | Non in EBITDA (genera ammortamenti) | − Uscita di investimento |
| **20** | **Passività** | Restituzione del **capitale** di mutui/finanziamenti | **Nessun impatto** | − Uscita finanziaria |
| **60** | **Onere finanziario** | **Interessi** su mutui e finanziamenti | − Oneri finanziari | − Uscita finanziaria |
| **70** | **Imposta** | IRAP, IRPEF/IRES | − Imposte | − Uscita operativa |
| **10** | **Attività** | Liquidità, crediti, **giroconti** tra conti | **Nessun impatto** | Non classificato |

> Quando crei un movimento scegli il **Conto CoGe**: è quella scelta a decidere dove finirà nei
> report. Se sbagli famiglia, sbagli il report. Per questo, dove possibile, il sistema te lo
> **propone in automatico** (dal fornitore, dalle regole keyword, dalla categoria).

---

## 6. Cosa NON è un costo o un ricavo

Due trappole classiche. Capirle ti evita di leggere male i conti.

### 6.1 I giroconti

Se sposti denaro **da un conto a un altro tuo conto** (es. prelevi contanti dalla banca, o versi
l'incasso in cassaforte sul conto corrente), **non hai né guadagnato né speso**: hai solo spostato
i tuoi soldi da una tasca all'altra. Questi movimenti (famiglia **10 – Attività**) **non entrano
nel conto economico** e nel cash flow non sono classificati come operativi/finanziari.

### 6.2 La quota capitale di un finanziamento

Quando paghi la rata di un mutuo, quella rata contiene **due cose diverse**:

- **Quota capitale** — stai *restituendo* i soldi che avevi preso in prestito. Non è un costo: è
  la riduzione di un debito. → Famiglia **20 – Passività**: esce dalla cassa (uscita finanziaria)
  ma **non tocca l'utile**.
- **Quota interessi** — è il *prezzo* del prestito. Questo sì è un costo. → Famiglia **60 – Onere
  finanziario**: pesa sull'utile (sotto l'EBIT) **e** esce dalla cassa.

> È per questo che il gestionale, quando paghi la rata di un **Finanziamento**, genera
> **due movimenti separati**: uno per il capitale (famiglia 20) e uno per gli interessi
> (famiglia 60). Vedi [capitolo 11](05-spese-ricorrenti.md). Se mettessi tutta la rata come
> "costo", gonfieresti artificialmente le perdite.

---

## 7. Il ciclo di vita di un dato

Mettendo insieme tutto, ecco il percorso che fa un'informazione dall'inizio alla fine:

```
   1. ORIGINE
      ├─ Inserimento manuale  (tu crei un Movimento, un Evento, un piano di spesa)
      └─ Import                (carichi i 3 file del periodo: Billy + Banco BPM + Crédit Agricole)
                │
                ▼
   2. SMISTAMENTO  (solo per i dati importati)
      Il sistema classifica ogni riga in automatico. Quello che non sa classificare con
      certezza finisce nella console di smistamento, dove tu lo cataloghi/confermi.
                │
                ▼
   3. MOVIMENTO
      Il dato diventa un movimento contabile, con le sue tre date, la sua BU e il suo conto.
                │
                ▼
   4. REPORTING
      Il movimento alimenta il conto economico, il cash flow, le previsioni e i KPI.
```

I dati **inseriti a mano** saltano lo smistamento: nascono già come movimenti. I dati
**importati** passano dallo smistamento perché arrivano "grezzi" dalle banche e dal POS e vanno
riconosciuti.

> Da qui in poi entriamo nell'operatività. Ogni capitolo della Parte II segue sempre la stessa
> struttura: *a cosa serve → passo passo → campi e regole → cosa succede dopo → esempio →
> attenzione*.

---

**Prossimo:** [8. Dashboard →](02-dashboard.md)
