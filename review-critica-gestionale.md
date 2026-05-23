# Review Critica — Agostinelli Gestionale
> Data review: 2026-05-20 | Versione documentazione analizzata: V29+

Questo documento elenca esclusivamente le **falle, lacune e incoerenze** rilevate nel sistema, ordinate per gravità. Per ogni problema viene fornita la diagnosi e una soluzione concreta che non stravolge l'architettura esistente.

---

## Indice

1. [CRITICO — P&L include IVA nei ricavi (ricavi gonfiati)](#1-critico--pl-include-iva-nei-ricavi-ricavi-gonfiati)
2. [CRITICO — Ammortamenti (D&A) fuori dal sistema dei movimenti](#2-critico--ammortamenti-da-fuori-dal-sistema-dei-movimenti)
3. [CRITICO — Invariante matematica P&L errata](#3-critico--invariante-matematica-pl-errata)
4. [CRITICO — Cash Flow: partition key sbagliata causa scan completi](#4-critico--cash-flow-partition-key-sbagliata-causa-scan-completi)
5. [CRITICO — Skip rata ACCORPA genera movimenti con classificazione indefinita](#5-critico--skip-rata-accorpa-genera-movimenti-con-classificazione-indefinita)
6. [MAGGIORE — IVA: nessun ciclo di liquidazione nel sistema](#6-maggiore--iva-nessun-ciclo-di-liquidazione-nel-sistema)
7. [MAGGIORE — Note di credito con importo negativo: design semanticamente rotto](#7-maggiore--note-di-credito-con-importo-negativo-design-semanticamente-rotto)
8. [MAGGIORE — Giroconti: rischio registrazione asimmetrica](#8-maggiore--giroconti-rischio-registrazione-asimmetrica)
9. [MAGGIORE — Deduplicazione: constraint UNIQUE non funziona su NULL](#9-maggiore--deduplicazione-constraint-unique-non-funziona-su-null)
10. [MAGGIORE — Nessun audit trail](#10-maggiore--nessun-audit-trail)
11. [MODERATO — Allocazione D&A per BU è strutturalmente scorretta](#11-moderato--allocazione-da-per-bu-è-strutturalmente-scorretta)
12. [MODERATO — Skip rata RIMANDA: la nuova rata ha data scadenza sbagliata](#12-moderato--skip-rata-rimanda-la-nuova-rata-ha-data-scadenza-sbagliata)
13. [MODERATO — Forecasting: doppio conteggio sulle rate ricorrenti DA_LIQUIDARE](#13-moderato--forecasting-doppio-conteggio-sulle-rate-ricorrenti-da_liquidare)
14. [MODERATO — Naming ambiguo: `importo` vs `importo_lordo`](#14-moderato--naming-ambiguo-importo-vs-importo_lordo)
15. [MODERATO — Cespiti e CAPEX: nessuna consistenza imposta tra cespite e movimento](#15-moderato--cespiti-e-capex-nessuna-consistenza-imposta-tra-cespite-e-movimento)

---

## 1. CRITICO — P&L include IVA nei ricavi (ricavi gonfiati)

### Problema

La MV `mv_conto_economico_mensile` aggrega `importo_lordo` per calcolare ricavi e costi operativi. Il campo `importo_lordo` rappresenta l'importo del movimento e, dalla relazione tra i campi documentata nel §5, risulta: `importo = importoImponibile + importoIva`.

Questo significa che la riga ricavi del P&L include l'IVA incassata per conto dell'Erario. Un evento da €10.000 + €2.200 IVA (22%) conta come €12.200 di ricavo, gonfiando il fatturato del 22% rispetto al dato reale. L'EBITDA risultante è quindi sistematicamente sovrastimato.

Lo stesso problema vale sui costi operativi: `importo_lordo` di una fattura fornitore include l'IVA a credito, ma quell'IVA non è un costo vero — è un credito verso l'Erario.

### Soluzione

Usare `importo_imponibile` nelle aggregazioni della MV quando il movimento ha IVA valorizzata, con fallback su `importo_lordo` quando `importo_imponibile` è NULL (movimenti esenti o senza IVA):

```sql
-- In mv_conto_economico_mensile, sostituire m.importo_lordo con:
COALESCE(m.importo_imponibile, m.importo_lordo)
```

Questo non richiede modifiche al modello dati né all'API — solo alla query della MV. Tutti i movimenti importati o senza IVA (es. cassa, giroconti) continuano a usare `importo_lordo` per via del COALESCE.

---

## 2. CRITICO — Ammortamenti (D&A) fuori dal sistema dei movimenti

### Problema

La documentazione afferma esplicitamente: *"I D&A non generano movimenti contabili ma vengono calcolati direttamente dalla tabella `cespiti`"*.

Questo crea due sorgenti di verità separate per il P&L:
- `mv_conto_economico_mensile` aggrega solo i movimenti
- Il waterfall EBITDA → EBIT sottrae D&A calcolati da `cespiti`

Le conseguenze sono:
1. **Non è possibile riconciliare il P&L da un'unica fonte**: qualsiasi esportazione o report che legga solo la MV produrrà un EBIT errato (troppo alto, perché mancano i D&A).
2. **Se un cespite viene registrato ma nessun movimento CAPEX lo accompagna**, entra comunque nel calcolo degli ammortamenti — distorcendo il P&L senza traccia nei movimenti.
3. **Un futuro sviluppatore o revisore che analizza i movimenti non troverà mai gli ammortamenti**, rendendo il sistema opaco.

### Soluzione

Generare movimenti contabili sintetici per gli ammortamenti mensili. Al primo giorno di ogni mese, un job schedulato crea un movimento per ogni cespite attivo:

```
tipo:          USCITA
importo:       cespite.costo_storico × cespite.aliquota / 100 / 12
contoCoge:     nuovo conto COGE tipo COSTO (es. 40.09.002 "Ammortamenti")
               — con flag dedicato is_ammortamento=true
dataMovimento: ultimo giorno del mese di competenza
fonte:         RICORRENTE (o nuova fonte AMMORTAMENTO)
stato:         REGISTRATO
dataFinanziaria: NULL  ← gli ammortamenti non hanno impatto cash
cespiteId:     cespite.id
```

Con `dataFinanziaria IS NULL`, questi movimenti entrano nel P&L (via `data_competenza`) ma non nel Cash Flow — comportamento corretto per un ammortamento. Il flag `is_ammortamento` permette di isolarli nei report senza inquinare la categoria COSTO generica.

---

## 3. CRITICO — Invariante matematica P&L errata

### Problema

La documentazione dichiara come invariante verificabile:

```
ebit = ebitda − ammortamenti − oneriFinanziari
```

Questa formula è sbagliata per definizione: l'EBIT (Earnings Before Interest and Taxes) è il risultato **prima** degli oneri finanziari, non dopo. La formula corretta è:

```
ebitda  = ricavi − costiOperativi
ebit    = ebitda − ammortamenti          ← oneri finanziari NON sottratti qui
ebt     = ebit − oneriFinanziari
utileNetto = ebt − imposte
```

Se la formula errata è implementata nel codice Java (e non è solo un refuso nella doc), l'EBIT presentato agli utenti è sottostimato rispetto allo standard contabile internazionale. Questo distorce il confronto con benchmark di settore o con dati di altri esercizi.

### Soluzione

Correggere la formula nell'invariante e verificare che il codice del waterfall rispecchi la struttura corretta a cascata come mostrato nel diagramma del §13 (che è invece corretto). La discrepanza tra il testo-invariante e il diagramma suggerisce che solo il testo sia sbagliato, ma va verificato nel codice.

---

## 4. CRITICO — Cash Flow: partition key sbagliata causa scan completi

### Problema

La tabella `movimenti` è partizionata per anno su `data_movimento`. La MV del Cash Flow filtra su `data_finanziaria`, che è una colonna distinta e non è la chiave di partizionamento.

Il risultato pratico è che **ogni query sul Cash Flow esegue un full scan su tutte le partizioni**, perché PostgreSQL non può applicare partition pruning quando il predicato è su una colonna non-partition-key.

Caso concreto: un movimento con `data_movimento = 2025-12-20` e `data_finanziaria = 2026-01-05` è nella partizione `movimenti_2025`. Una query CF che chiede "incassi di gennaio 2026" deve quindi scansionare `movimenti_2025` per trovarlo — rendendo le query CF progressivamente più lente man mano che crescono le partizioni storiche.

### Soluzione

Due opzioni, in ordine di invasività:

**Opzione A (meno invasiva):** Creare un indice parziale su `data_finanziaria` per ogni partizione:

```sql
CREATE INDEX idx_mv_2025_data_finanziaria
    ON movimenti_2025 (data_finanziaria)
    WHERE data_finanziaria IS NOT NULL;
```

L'indice permette lookup efficienti anche su partizioni non corrispondenti alla data_finanziaria. Non risolve il partition pruning ma riduce drasticamente l'I/O effettivo.

**Opzione B (più corretta):** Usare il partizionamento per lista su `EXTRACT(YEAR FROM data_finanziaria)` per la MV del CF, mantenendo la partizione per `data_movimento` per il P&L. Questo richiede una seconda struttura, ma è la soluzione architetturalmente corretta se i volumi crescono.

---

## 5. CRITICO — Skip rata ACCORPA genera movimenti con classificazione indefinita

### Problema

Quando si esegue uno skip in modalità `ACCORPA`, la documentazione afferma: *"Quote sulla prossima rata azzerati (NULL) — il split deve essere ricalcolato"*.

Il problema: **chi ricalcola il split, e quando?**

Se il sistema genera il movimento di pagamento della rata accorpata **senza quote** (quotaCapitale=NULL, quotaInteressi=NULL), accade che:
1. Il sistema deve scegliere che `contoCoge` usare per creare i movimenti — usa quello del capitale o degli interessi?
2. Se usa solo il conto PASSIVITA (capitale), l'intera rata accorpata sparisce dal P&L (gli interessi non vengono dedotti).
3. Se usa solo il conto ONERE_FINANZIARIO (interessi), l'intera rata viene dedotta come costo finanziario — gonfiando gli oneri.
4. Se crea un unico movimento con importo totale ma `contoCoge` arbitrario, la classificazione CF diventa sbagliata.

In tutti i casi, l'operatore non ha nessun alert che lo avvisa della situazione.

### Soluzione

Prima di applicare ACCORPA, il sistema deve ricalcolare le quote della rata combinata usando la stessa formula dell'ammortamento alla francese, partendo dal `debitoResiduo` corrente:

```
interessi_combinati = debitoResiduo × r                 (tasso del periodo)
capitale_combinato  = (rata_skipped + rata_prossima) − interessi_combinati
```

Il calcolo deve avvenire **in transazione atomica** al momento dello skip, e le quote devono essere persistite sulla nuova rata accorpata prima di generare qualsiasi movimento. Se il calcolo non è possibile (es. tasso non disponibile), lo skip ACCORPA deve essere rifiutato con errore esplicito.

---

## 6. MAGGIORE — IVA: nessun ciclo di liquidazione nel sistema

### Problema

Il sistema traccia `importoIva` su ogni movimento, ma non esiste alcun meccanismo per:
- Calcolare il saldo IVA periodico (IVA debito − IVA credito = IVA da versare)
- Generare automaticamente il movimento F24 corrispondente
- Collegare il pagamento F24 all'IVA che lo ha originato

Il Piano dei Conti prevede i conti 10.02.xxx (IVA a credito), 20.02.002 (IVA debito), 20.02.003 (Imposte F24), ma la liquidazione è completamente manuale e fuori sistema. Questo significa che l'IVA è un'informazione raccolta ma mai usata per produrre output utile, e l'operatore deve fare i conti fuori sistema ogni trimestre/mese con rischio di errori.

### Soluzione

Implementare un servizio `LiquidazioneIvaService` che, per un dato periodo:
1. Somma `importoIva` su movimenti ENTRATA con tipo RICAVO → IVA debito
2. Somma `importoIva` su movimenti USCITA con tipo COSTO → IVA credito
3. Calcola saldo: se positivo genera un movimento DA_LIQUIDARE con `contoCoge = 20.02.003`, `dataLiquidita = scadenza F24`, `dataMovimento = ultimo giorno del periodo`
4. Quando viene pagato, lo stato diventa REGISTRATO con `dataFinanziaria`

Questo non cambia il modello dei movimenti — usa esattamente lo stesso meccanismo già esistente per i pagamenti imposte.

---

## 7. MAGGIORE — Note di credito con importo negativo: design semanticamente rotto

### Problema

Il §5.5 descrive note di credito e storni come movimenti con `importo` negativo. Questo design ha tre conseguenze problematiche:

**a) La MV usa SUM senza guardie su valori negativi.** Un'ENTRATA negativa con tipo RICAVO riduce i ricavi — matematicamente corretto, ma la query della MV non distingue tra un ricavo reale e uno storno, rendendo impossibile calcolare ricavi lordi e storni separatamente.

**b) Il constraint logico `importo > 0` non esiste**, quindi niente impedisce a un operatore di inserire per errore un importo negativo su un movimento normale, distorcendo il P&L silenziosamente.

**c) Se si deve stornare un costo (USCITA su conto COSTO), il §5.5 indica `tipo = ENTRATA` con `contoCoge = 40.xx`.** Ma la MV conta le ENTRATE con tipo COGE = RICAVO come ricavi e le USCITE con COSTO come costi — una ENTRATA su conto COSTO non rientra in nessuno dei due bucket della MV e sparisce dal P&L completamente.

### Soluzione

Introdurre un flag `is_rettifica BOOLEAN DEFAULT FALSE` sulla tabella movimenti. Una rettifica è sempre positiva nell'importo ma viene sottratta dalla categoria originale:

```sql
-- In mv_conto_economico_mensile:
SUM(CASE WHEN tipo='ENTRATA' AND tipo_coge='RICAVO' AND NOT is_rettifica
    THEN importo_lordo
    WHEN tipo='USCITA' AND tipo_coge='RICAVO' AND is_rettifica   -- storno ricavo
    THEN -importo_lordo
    ELSE 0 END) AS ricavi
```

Questo mantiene tutti gli importi positivi (auditabilità), distingue rettifiche da movimenti normali, e risolve il caso dello storno di costo (USCITA rettificata sottrae da costi operativi).

---

## 8. MAGGIORE — Giroconti: rischio registrazione asimmetrica

### Problema

I movimenti `PRELIEVO_DA_BANCA` e `VERSAMENTO_IN_BANCA` generano un solo movimento contabile (lato banca). Il lato cassa è gestito separatamente in `cassa_movimenti`. Niente nel sistema **verifica che entrambi i lati siano stati registrati**.

Se un operatore registra solo il PRELIEVO (uscita dal conto bancario) ma dimentica di aggiornare la cassa, il sistema mostra €X usciti dalla banca senza che siano arrivati da nessuna parte. Questo non impatta P&L (ATTIVITA è escluso), ma il saldo totale di liquidità aziendale risulta scorretto — la liquidità apparente è minore di quella reale.

Simmetricamente, un VERSAMENTO senza corrispondente movimento cassa crea liquidità dal nulla.

### Soluzione

Rendere la registrazione atomica: `CassaService.registraPrelievo()` deve creare in una singola transazione sia il `cassa_movimento` sia il `Movimento` bancario. I due devono condividere un campo `riferimento_giroconto UUID` che li accoppia. Una view di riconciliazione può poi segnalare immediatamente eventuali asimmetrie residue (giroconti non bilanciati).

---

## 9. MAGGIORE — Deduplicazione: constraint UNIQUE non funziona su NULL

### Problema

Il constraint dichiarato è `UNIQUE(fonte, riferimento_esterno, data_movimento)`. In PostgreSQL, una constraint UNIQUE tratta i NULL come valori distinti tra loro: due righe con `riferimento_esterno = NULL` sulla stessa data e fonte **non violano** il constraint.

Per i movimenti manuali (`fonte = MANUALE`, `riferimento_esterno` tipicamente NULL), questo è il comportamento desiderato. Ma per i movimenti `RICORRENTE` generati automaticamente, se per un bug `riferimento_esterno` non viene valorizzato, lo stesso piano potrebbe generare decine di movimenti doppi nella stessa data senza alcun blocco.

Il problema è aggravato dal fatto che la documentazione descrive il constraint come garanzia di deduplicazione assoluta, inducendo falsa sicurezza.

### Soluzione

Creare un partial unique index più preciso che si applica solo dove ha senso:

```sql
-- Deduplicazione solo per movimenti da fonti esterne (dove riferimento_esterno è sempre valorizzato)
CREATE UNIQUE INDEX idx_movimenti_dedup_import
    ON movimenti (fonte, riferimento_esterno, data_movimento)
    WHERE fonte IN ('IMPORT_BILLY','IMPORT_BANCA','IMPORT_ALVEARE','IMPORT_FATTURA')
      AND riferimento_esterno IS NOT NULL;

-- Deduplicazione per ricorrenti: piano + numero rata + anno
CREATE UNIQUE INDEX idx_movimenti_dedup_ricorrente
    ON movimenti (piano_ricorrente_id, numero_rata)
    WHERE fonte = 'RICORRENTE';
```

Il secondo indice richiede l'aggiunta di `piano_ricorrente_id` e `numero_rata` alla tabella movimenti — dati che il sistema deve già avere per generare il movimento.

---



## 11. MODERATO — Allocazione D&A per BU è strutturalmente scorretta

### Problema

La formula di allocazione è:

```
ammortBU_i = ammortamentiTotali × (EBITDA_BU_i / Σ EBITDA_BU)
```

Questo crea un circolo vizioso: la BU con EBITDA più alto viene penalizzata con più ammortamenti, abbassando il suo EBIT relativo rispetto a BU con EBITDA più basso che magari usano gli stessi asset.

Caso patologico: se BU1 ha EBITDA positivo e BU2 ha EBITDA negativo, la somma `Σ EBITDA_BU` è minore di `EBITDA_BU1`. Il risultato è che `ammortBU1 > ammortamentiTotali` — BU1 riceve più ammortamenti di quanti ne esistano in totale.

La documentazione riconosce il caso zero/negativo ma dice solo "allocati in parti uguali o non allocati" — soluzione ambigua e non documentata nel codice.

### Soluzione

Abbandonare l'allocazione EBITDA-proporzionale in favore dell'allocazione diretta per cespite. Ogni `cespite` deve avere un campo `business_unit_id`. L'ammortamento mensile di quel cespite viene attribuito interamente alla BU proprietaria:

```
ammortBU_i = Σ (cespite.costo_storico × aliquota / 100 / 12)
             dove cespite.business_unit_id = BU_i
```

Se un cespite è condiviso tra BU, si introduce `cespiti_bu_allocazione(cespite_id, bu_id, percentuale)`. Questo riflette la realtà operativa e rende l'allocazione stabile e verificabile.

---

## 12. MODERATO — Skip rata RIMANDA: la nuova rata ha data scadenza sbagliata

### Problema

La documentazione descrive RIMANDA come: *"aggiunta rata extra in fondo al piano con stessa data scadenza originale"*. Se la rata skippata aveva scadenza 2026-03-01, la nuova rata aggiunta in fondo ha anch'essa scadenza 2026-03-01 — una data nel passato.

Il risultato è un piano con due rate aventi la stessa data (quella originale e quella postposta), e la seconda con una data nel passato appena viene creata. Il forecasting che legge rate PENDING con scadenza futura non la includerà mai. L'operatore si ritrova con una rata "invisibile" nel futuro.

Se si eseguono più skip RIMANDA consecutivi, il problema si moltiplica: tutte le rate aggiunte in fondo avranno date nel passato o comunque incongruenti.

### Soluzione

La nuova rata deve avere come scadenza quella originale **più un periodo** (in base alla frequenza del piano):

```
nuova_scadenza = data_scadenza_ultima_rata_esistente + mesiPerFrequenza
```

In questo modo il piano si allunga di un periodo preciso, e la nuova rata è sempre futura rispetto all'ultima rata esistente.

---

## 13. MODERATO — Forecasting: doppio conteggio sulle rate ricorrenti DA_LIQUIDARE

### Problema

Il forecasting include due categorie:
- `MOVIMENTO`: movimenti DA_LIQUIDARE con `data_finanziaria IS NULL`
- `RATA_RICORRENTE_CAPITALE` / `RATA_RICORRENTE_INTERESSI`: rate PENDING con scadenza futura

Un movimento generato da una rata ricorrente e non ancora pagato ha `stato = DA_LIQUIDARE`, `fonte = RICORRENTE`, e `data_finanziaria IS NULL`. Questo movimento soddisfa sia il criterio di `MOVIMENTO` che quello di `RATA_RICORRENTE_CAPITALE`.

La de-duplicazione documentata esclude solo i movimenti con `evento_id IS NOT NULL`. Non c'è alcuna esclusione per i movimenti di origine ricorrente.

### Soluzione

Nella categoria `MOVIMENTO`, escludere anche i movimenti con `fonte = RICORRENTE`:

```sql
-- In ForecastingService, categoria MOVIMENTO:
WHERE stato = 'DA_LIQUIDARE'
  AND data_finanziaria IS NULL
  AND data_liquidita > TODAY
  AND evento_id IS NULL
  AND fonte != 'RICORRENTE'   -- ← aggiungere questa condizione
```

I movimenti ricorrenti non pagati vengono comunque conteggiati tramite `RATA_RICORRENTE_CAPITALE`, che usa direttamente la tabella delle rate PENDING — evitando il doppio conteggio.

---

## 14. MODERATO — Naming ambiguo: `importo` vs `importo_lordo`

### Problema

Il campo Java `importo` mappa sulla colonna DB `importo_lordo`. La descrizione dice *"Importo effettivo del movimento (al netto di commissioni)"*. Ma il termine "lordo" in contabilità significa l'opposto di "al netto di". La formula `importoCommissione = importoLordo − importo` implica che esista una colonna separata `importo_lordo` (non la stessa colonna mappata da `importo`).

La tabella di mapping è contraddittoria: o `importo_lordo` include le commissioni (è il gross) e `importo` è il net, oppure la colonna DB si chiama erroneamente. In entrambi i casi, la MV usa `importo_lordo` per calcolare ricavi — e non è chiaro se stia usando il valore inclusivo o esclusivo di commissioni.

### Soluzione

Definire esplicitamente e una volta sola nella documentazione:
- `importo_lordo` (DB) = importo totale della transazione lato cliente (include commissione se applicabile)
- `importo` (Java, = `importo_netto` in DB) = importo ricevuto effettivamente dall'azienda = `importo_lordo − commissione`

La MV del P&L deve usare `importo_netto` per i ricavi dell'azienda (ciò che entra in cassa), non `importo_lordo`. Rinominare la colonna DB da `importo_lordo` a `importo_netto` elimina l'ambiguità alla fonte.

---

## 15. MODERATO — Cespiti e CAPEX: nessuna consistenza imposta tra cespite e movimento

### Problema

Un movimento CAPEX ha `cespiteId` facoltativo e il cespite nella tabella `cespiti` ha un suo `costo_storico`. Niente nel sistema verifica che:
- `Σ importo dei movimenti CAPEX con cespiteId = X` = `cespiti[X].costo_storico`
- Il cespite `is_active = true` abbia almeno un movimento CAPEX che lo giustifica
- Lo stesso cespite non abbia ammortamenti cumulati superiori al suo costo storico

Se un cespite viene registrato manualmente con costo sbagliato, gli ammortamenti calcolati sulla tabella `cespiti` divergono da quanto effettivamente speso (nei movimenti CAPEX). Il P&L mostra D&A inesatti senza che nessun alert scatti.

### Soluzione

Aggiungere un check automatico (schedulato o a ogni refresh MV) che verifica:

```sql
SELECT c.id, c.costo_storico AS dichiarato,
       COALESCE(SUM(m.importo_lordo), 0) AS da_movimenti,
       ABS(c.costo_storico - COALESCE(SUM(m.importo_lordo), 0)) AS delta
FROM cespiti c
LEFT JOIN movimenti m ON m.cespite_id = c.id AND m.stato != 'ANNULLATO'
GROUP BY c.id, c.costo_storico
HAVING ABS(c.costo_storico - COALESCE(SUM(m.importo_lordo), 0)) > 0.01
```

Le discrepanze devono essere segnalate nel pannello amministrativo come warning contabile, non come errori bloccanti (possono esserci cespiti preesistenti all'adozione del gestionale).

---

## Riepilogo priorità di intervento

| # | Problema | Impatto | Sforzo stimato |
|---|---|---|---|
| 1 | IVA inclusa nei ricavi P&L | Ricavi gonfiati strutturalmente | Basso (solo MV) |
| 3 | Invariante EBIT errata | Report con formula sbagliata | Basso (verifica + fix formula) |
| 5 | Skip ACCORPA senza ricalcolo quote | Movimenti con CF/P&L indefinito | Medio |
| 2 | D&A fuori dal sistema movimenti | P&L non riconciliabile da unica fonte | Alto |
| 4 | CF query su partition key sbagliata | Degrado prestazioni progressivo | Medio |
| 7 | Note di credito con importo negativo | Storni di costo invisibili nel P&L | Medio |
| 9 | UNIQUE constraint su NULL non funziona | Falsa sicurezza antiduplicati | Basso |
| 6 | IVA: nessun ciclo liquidazione | Processo manuale error-prone | Alto |
| 8 | Giroconti asimmetrici | Saldo liquidità non affidabile | Medio |
| 12 | Skip RIMANDA data sbagliata | Rate invisibili al forecasting | Basso |
| 13 | Doppio conteggio forecasting ricorrenti | Proiezioni sovrastimate | Basso |
| 11 | Allocazione D&A per BU scorretta | KPI per BU non affidabili | Medio |
| 14 | Naming importo/importo_lordo ambiguo | Bug silenti futuri | Basso |
| 15 | Nessuna consistenza cespite-movimento | D&A potenzialmente inesatti | Basso |

> I problemi 1, 3 e 9 sono risolvibili con modifiche a SQL/query senza toccare l'API o il modello dati. Andrebbero affrontati per primi per il rapporto impatto/sforzo favorevole.
