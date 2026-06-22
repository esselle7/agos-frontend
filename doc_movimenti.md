# Documentazione Movimenti — Agostinelli Gestionale

> Schema DB consolidato `V1`–`V10` | Ultimo aggiornamento: 2026-06-22
>
> Nota: questo documento è **logicamente allineato al codice**. I riferimenti a numeri di migration
> storici (V20, V29…) sono stati rimossi: tutte le strutture descritte (mastri COGE 10–70, modello a
> 3 date, viste materializzate del P&L e del cash flow) vivono ora nello schema consolidato `V1`–`V10`.

---

## Indice

1. [Modello dati del Movimento](#1-modello-dati-del-movimento)
2. [Piano dei Conti (COGE) e classificazioni](#2-piano-dei-conti-coge-e-classificazioni)
3. [Il modello delle tre date](#3-il-modello-delle-tre-date)
4. [Stati del Movimento](#4-stati-del-movimento)
5. [Movimenti manuali](#5-movimenti-manuali)
6. [Pagamenti eventi (EventiService)](#6-pagamenti-eventi-eventiservice)
7. [Spese ricorrenti — tipo FLAT](#7-spese-ricorrenti--tipo-flat)
8. [Spese ricorrenti — tipo FINANZIAMENTO](#8-spese-ricorrenti--tipo-finanziamento)
9. [Movimenti cassa](#9-movimenti-cassa)
10. [Stipendi e personale](#10-stipendi-e-personale)
11. [Impatto economico: il conto economico (P&L)](#11-impatto-economico-il-conto-economico-pl)
12. [Impatto finanziario: il cash flow](#12-impatto-finanziario-il-cash-flow)
13. [Il waterfall P&L dettagliato](#13-il-waterfall-pl-dettagliato)
14. [Forecasting e proiezioni](#14-forecasting-e-proiezioni)
15. [Tabella riepilogativa di tutti i tipi](#15-tabella-riepilogativa-di-tutti-i-tipi)

---

## 1. Modello dati del Movimento

Il `Movimento` è l'entità centrale del sistema contabile. Ogni flusso di denaro — incasso, pagamento, rata, stipendio — genera uno o più movimenti nella tabella `movimenti`.

La tabella è **partizionata per anno** su `data_movimento`:

```
movimenti_2024  →  2024-01-01 … 2024-12-31
movimenti_2025  →  2025-01-01 … 2025-12-31
movimenti_2026  →  2026-01-01 … 2026-12-31
movimenti_2027  →  2027-01-01 … 2027-12-31
movimenti_default → catch-all fuori range
```

### Campi principali

| Campo (Java) | Colonna DB | Tipo | Nullable | Descrizione |
|---|---|---|---|---|
| `tipo` | `tipo` | `VARCHAR(50)` | NO | `ENTRATA` o `USCITA` |
| `importo` | `importo_lordo` | `NUMERIC(15,2)` | NO | Importo effettivo del movimento (al netto di commissioni) |
| `importoImponibile` | `importo_imponibile` | `NUMERIC(15,2)` | SÌ | Base imponibile IVA |
| `importoIva` | `importo_iva` | `NUMERIC(15,2)` | SÌ | Ammontare IVA |
| `importoCommissione` | `importo_commissione` | `NUMERIC(15,2)` | NO | Commissione (default 0; POS/Stripe) |
| `dataMovimento` | `data_movimento` | `DATE` | NO | **Chiave di partizionamento.** Data di competenza economica. |
| `dataCompetenza` | `data_competenza` | `DATE` | SÌ | Alias di `data_movimento`; usata dalla MV per il P&L mensile. |
| `dataFinanziaria` | `data_finanziaria` | `DATE` | SÌ | Data di effettivo regolamento bancario. `NULL` = non ancora liquidato. |
| `dataLiquidita` | `data_liquidita` | `DATE` | SÌ | Scadenza attesa del pagamento (richiesta se `dataFinanziaria` è null). |
| `stato` | `stato` | `VARCHAR(50)` | NO | Vedi §4 |
| `fonte` | `fonte` | `VARCHAR(50)` | NO | Origine del movimento (vedi sotto) |
| `contoCoge` | `conto_coge_id` | `INT` | NO | FK su `piano_dei_conti_coge`. Determina la classificazione P&L. |
| `businessUnitId` | `business_unit_id` | `SMALLINT` | NO | Unità di business di competenza |
| `contoBancarioId` | `conto_bancario_id` | `SMALLINT` | SÌ | Richiesto se `dataFinanziaria` valorizzata |
| `metodoPagamentoId` | `metodo_pagamento_id` | `INT` | SÌ | Richiesto se `dataFinanziaria` valorizzata |
| `aliquotaIvaId` | `aliquota_iva_id` | `INT` | SÌ | Aliquota IVA applicata |
| `eventoId` | `evento_id` | `UUID` | SÌ | Collega al modulo eventi |
| `tipoEventoMovimento` | `tipo_evento_movimento` | `VARCHAR(50)` | SÌ | Tipo pagamento evento (`CAPARRA`, `ACCONTO`, `SALDO`, `PENALE`) |
| `cespiteId` | `cespite_id` | `UUID` | SÌ | Collega al registro cespiti (CAPEX) |
| `fornitoreId` | `fornitore_id` | `UUID` | SÌ | Fornitore di riferimento |
| `centroDiCostoId` | `centro_di_costo_id` | `INT` | SÌ | Centro di costo analitico |
| `riferimentoEsterno` | `riferimento_esterno` | `VARCHAR(255)` | SÌ | Chiave deduplicazione con `fonte` e `data_movimento` (UNIQUE) |
| `descrizione` | `descrizione` | `VARCHAR(500)` | SÌ | Testo libero |
| `note` | `note` | `TEXT` | SÌ | Note aggiuntive |

### Valori di `fonte`

| Fonte | Chi la imposta | Descrizione |
|---|---|---|
| `MANUALE` | Utente / EventiService / CassaService | Creato dall'operatore o dal modulo eventi/cassa |
| `RICORRENTE` | RecurringExpenseService | Generato da un piano di spesa ricorrente |
| `IMPORT_BILLY` | ImportService | Importazione da POS Billy |
| `IMPORT_BANCA` | ImportService | Importazione da estratto conto bancario |
| `IMPORT_ALVEARE` | ImportService | Importazione da Alveare (marketplace) |
| `IMPORT_FATTURA` | ImportService | Importazione da fatturazione elettronica |

---

## 2. Piano dei Conti (COGE) e classificazioni

Il conto COGE (`conto_coge_id`) determina **come ogni movimento viene classificato nel P&L e nel cash flow**. La tabella `piano_dei_conti_coge` ha un campo `tipo` e un flag `is_capex`.

### Tipi di conto

| Tipo COGE | Mastro | Descrizione | Impatto P&L | Impatto Cash Flow |
|---|---|---|---|---|
| `RICAVO` | 30.xx | Ricavi da vendite, eventi, servizi | + Ricavi (EBITDA) | + Entrate operative |
| `COSTO` (is_capex=false) | 40.xx | Costi operativi: personale, utenze, fornitori | − Costi op. (EBITDA) | − Uscite operative |
| `COSTO` (is_capex=true) | 50.xx | Investimenti in beni strumentali (CAPEX) | Non in EBITDA; separato | − Uscite investimento |
| `PASSIVITA` | 20.xx | Rimborso quota capitale su mutui/leasing | Non in P&L | − Uscite finanziarie |
| `ONERE_FINANZIARIO` | 60.xx | Interessi passivi su finanziamenti | − Oneri finanziari (sotto EBIT) | − Uscite finanziarie |
| `IMPOSTA` | 70.xx | IRAP, IRPEF, IRES | − Imposte (sotto EBIT) | − Uscite operative |
| `ATTIVITA` | 10.xx | Liquidità, crediti, giroconti | Non in P&L | Registrazione saldi |

### Gerarchia dei conti (estratto rilevante)

```
10  ATTIVITÀ PATRIMONIALI (ATTIVITA)
    10.01.xxx  Conti bancari e cassa
    10.02.xxx  Crediti e IVA a credito
    10.03.xxx  Giroconti (trasferimenti interni)

20  PASSIVITÀ E DEBITI (PASSIVITA)
    20.01.001  Mutuo ipotecario
    20.01.002  Finanziamento Regione
    20.01.003  ISMEA
    20.02.001  Debiti fornitori
    20.02.002  IVA debito
    20.02.003  Imposte F24

30  RICAVI (RICAVO)
    30.01.001  Incassi cassa/Billy (ristorazione)
    30.01.002  Incassi B&B
    30.02.001  Caparre eventi
    30.02.002  Saldi eventi
    30.03.001  Vendita carni/salumi (IVA 10%)
    30.03.002  Vendita ortofrutta (IVA 4%)
    30.03.003  Alveare netto
    30.04.001  Manutenzione verde

40  COSTI OPERATIVI (COSTO, is_capex=false)
    40.01.xxx  Manodopera (per dipendente)
    40.02.001  Costi bancari
    40.03.001  Utenze
    40.04.001  Materie prime ristorazione
    40.05.001  Assicurazioni
    40.06.001  Carburanti e pedaggi
    40.07.001  Contabilità e consulenze
    40.08.001  Contributi previdenziali
    40.09.001  Manutenzioni ordinarie
    40.10.001  Compenso amministratore
    40.11.001  Altri costi operativi
    40.12.001  Materie prime spaccio

50  INVESTIMENTI / CAPEX (COSTO, is_capex=true)
    50.01.001  Lavastoviglie professionale
    50.01.002  Lavapavimenti
    50.01.003  Arredi e attrezzature

60  ONERI FINANZIARI (ONERE_FINANZIARIO)
    60.01.001  Interessi mutuo ipotecario
    60.01.002  Interessi Regione
    60.01.003  Interessi ISMEA

70  IMPOSTE E TRIBUTI (IMPOSTA)
    70.01.001  IRAP
    70.02.001  IRPEF / IRES
```

---

## 3. Il modello delle tre date

Ogni movimento può avere fino a tre date con significato distinto:

```
dataMovimento (data_movimento)
│  Data di COMPETENZA ECONOMICA.
│  Determina in quale mese appare nel P&L.
│  Chiave di partizionamento. Sempre valorizzata.
│  Esempi: data dell'evento, data scadenza rata, data fattura.

dataFinanziaria (data_finanziaria)
│  Data di REGOLAMENTO BANCARIO effettivo.
│  Determina in quale mese appare nel Cash Flow storico.
│  NULL = pagamento non ancora avvenuto (stato DA_LIQUIDARE).
│  Se valorizzata, richiede anche contoBancarioId e metodoPagamentoId.

dataLiquidita (data_liquidita)
   Data ATTESA di pagamento (scadenza).
   Usata dal forecasting per proiettare uscite future.
   Richiesta quando dataFinanziaria è NULL.
   Coincide con dataFinanziaria una volta liquidato il movimento.
```

### Implicazioni pratiche

| Scenario | dataMovimento | dataFinanziaria | dataLiquidita | stato | Appare nel P&L | Appare nel CF |
|---|---|---|---|---|---|---|
| Pagamento immediato | oggi | oggi | oggi | REGISTRATO | Mese corrente | Mese corrente |
| Fattura non ancora pagata | data fattura | NULL | scadenza | DA_LIQUIDARE | Mese fattura | Non ancora |
| Rata ricorrente pagata | data scadenza | data pagamento | data pagamento | REGISTRATO | Mese scadenza | Mese pagamento |
| Caparra evento futura | data evento | data incasso | data incasso | REGISTRATO | Mese evento | Mese incasso |

> **Nota:** Il P&L usa `data_competenza` (= `data_movimento`). Il Cash Flow usa `data_finanziaria`. I due mesi possono essere **diversi**: una fattura emessa a dicembre e pagata a gennaio compare nel P&L di dicembre ma nel Cash Flow di gennaio.

---

## 4. Stati del Movimento

```
                    ┌─────────────────────────┐
                    │     (creazione)         │
                    ▼                         │
             ┌─────────────┐                  │
             │ DA_LIQUIDARE│ ──pagamento──► REGISTRATO
             └─────────────┘                  │
                    │                         │
                    ▼                         ▼
             ┌──────────────────────────────────────┐
             │              RICONCILIATO             │
             │     (abbinato a estratto conto)       │
             └──────────────────────────────────────┘
                    │
                    ▼
             ┌─────────────┐
             │  ANNULLATO  │  (stato finale; escluso da P&L e CF)
             └─────────────┘
```

| Stato | Descrizione | `dataFinanziaria` | Incluso in P&L | Incluso in CF storico |
|---|---|---|---|---|
| `REGISTRATO` | Liquidato, contabilizzato | Valorizzata | Sì | Sì |
| `DA_LIQUIDARE` | Creato ma non ancora pagato | NULL | Sì | No |
| `RICONCILIATO` | Abbinato a movimentazione bancaria | Valorizzata | Sì | Sì |
| `ANNULLATO` | Annullato; non ha effetti contabili | — | No | No |

---

## 5. Movimenti manuali

I movimenti manuali vengono creati dall'operatore tramite l'interfaccia web o via API.

### Regole di creazione

```
SE dataFinanziaria è fornita (pagamento già avvenuto):
  → stato = REGISTRATO
  → contoBancarioId RICHIESTO
  → metodoPagamentoId RICHIESTO
  → dataFinanziaria ≤ oggi
  → dataLiquidita = dataFinanziaria

SE dataFinanziaria è null (pagamento in sospeso):
  → stato = DA_LIQUIDARE
  → dataLiquidita RICHIESTA
  → contoBancarioId e metodoPagamentoId ASSENTI
```

### Campi calcolati automaticamente

- `importoCommissione` = `importoLordo − importo` (solo se il metodo di pagamento ha commissioni, es. POS Stripe/Satispay)
- `importoIva` = calcolato da `aliquota_iva.valore` × base imponibile
- `importoImponibile` = `importo − importoIva`
- `dataCompetenza` = `dataMovimento` (impostato in `@PrePersist`)

### Scenari tipici

#### 5.1 Incasso manuale (ENTRATA)

```
tipo:            ENTRATA
contoCoge:       30.xx (RICAVO)
businessUnitId:  BU di competenza
dataMovimento:   data della prestazione/vendita
dataFinanziaria: data incasso (o null se sospeso)

→ P&L:  +Ricavi nel mese di dataMovimento
→ CF:   +Entrate operative nel mese di dataFinanziaria
```

#### 5.2 Pagamento fornitore (USCITA operativa)

```
tipo:            USCITA
contoCoge:       40.xx (COSTO, is_capex=false)
fornitoreId:     UUID fornitore (opzionale)
dataMovimento:   data fattura / competenza
dataFinanziaria: data pagamento (o null se non ancora pagato)

→ P&L:  −Costi operativi nel mese di dataMovimento
→ CF:   −Uscite operative nel mese di dataFinanziaria
```

#### 5.3 Acquisto bene strumentale (USCITA CAPEX)

```
tipo:            USCITA
contoCoge:       50.xx (COSTO, is_capex=true)
cespiteId:       UUID cespite (colleg. al registro cespiti)
dataMovimento:   data acquisto

→ P&L:  Non entra in EBITDA (è investimento);
         compare come "investimenti_capex" a parte
→ CF:   −Uscite investimento nel mese di dataFinanziaria

Nota: il cespite genera anche ammortamenti periodici
      (costo_storico × aliquota / 12 per mese)
      che riducono EBITDA → EBIT nella voce D&A.
```

#### 5.4 Pagamento imposta (USCITA tasse)

```
tipo:            USCITA
contoCoge:       70.xx (IMPOSTA)
dataMovimento:   data di competenza del tributo

→ P&L:  −Imposte (al di sotto di EBIT, nel calcolo UtileNetto)
→ CF:   −Uscite operative nel mese di dataFinanziaria
```

#### 5.5 Rimborso o nota di credito (ENTRATA negativa)

```
tipo:            ENTRATA
importo:         valore negativo (es. -150.00)
contoCoge:       30.xx (RICAVO) o 40.xx (COSTO)

→ P&L:  Riduce la voce corrispondente del mese
```

---

## 6. Pagamenti eventi (EventiService)

Gli eventi rappresentano cerimonie, matrimoni, e feste organizzate dall'azienda. I pagamenti da parte dei clienti vengono registrati come movimenti `ENTRATA`.

### Ciclo di vita di un evento

```
PREVENTIVATO ──(caparra/acconto)──► CONFERMATO ──(saldo completo)──► SALDATO
      │
      └──(annullamento)──► ANNULLATO
```

### Tipi di pagamento evento

| Tipo (`tipoEventoMovimento`) | Direzione | Transizione stato evento | Vincoli | Note |
|---|---|---|---|---|
| `CAPARRA` | ENTRATA | PREVENTIVATO → CONFERMATO | Max 1 per evento | Deposito cauzionale |
| `ACCONTO` | ENTRATA | PREVENTIVATO → CONFERMATO | Multipli ammessi | Pagamenti parziali intermedi |
| `SALDO` | ENTRATA | Se importoResiduo ≤ €0.01 → SALDATO | Max 1 per evento | Chiusura totale |
| `PENALE` | ENTRATA | Solo su evento ANNULLATO | Multipli ammessi | Penale di recesso |

### Struttura del movimento generato

```
Movimento creato da EventiService.registraPagamento():

tipo:                  ENTRATA
importo:               importo del pagamento
dataMovimento:         evento.dataEvento   ← COMPETENZA = data dell'evento
dataFinanziaria:       request.data()      ← LIQUIDAZIONE = data del pagamento fisico
dataLiquidita:         request.data()
stato:                 REGISTRATO  (ATTIVO è un alias legacy ancora presente tra i lk_stati_movimento)
fonte:                 MANUALE
eventoId:              evento.id
tipoEventoMovimento:   CAPARRA | ACCONTO | SALDO | PENALE
contoCoge:             30.02.001 (caparre) o 30.02.002 (saldi) — scelto dall'operatore
contoBancarioId:       conto scelto dall'operatore
metodoPagamentoId:     metodo scelto dall'operatore
businessUnitId:        BU2 (eventi e cerimonie)
descrizione:           "[EVENTO] <nome evento> – <tipo>"
```

> **Importante:** La data di competenza economica (`dataMovimento`) è la **data dell'evento**, non la data del pagamento. Questo significa che il ricavo compare nel P&L del mese in cui si tiene l'evento, anche se la caparra è stata incassata mesi prima. Il Cash Flow, invece, riflette il mese del pagamento fisico.

### Impatto economico e finanziario

```
Evento il 14 agosto 2026:
  Caparra pagata il 10 marzo 2026: €2.000
  Acconto pagato il 20 giugno 2026: €3.000
  Saldo pagato il 15 agosto 2026:   €5.000
  Totale: €10.000

P&L (mese di agosto 2026):
  Ricavi agosto 2026: +€10.000
  (tutte e 3 le voci usano dataMovimento = 14 agosto 2026)

Cash Flow (mesi effettivi dei pagamenti):
  Cash Flow marzo 2026: +€2.000
  Cash Flow giugno 2026: +€3.000
  Cash Flow agosto 2026: +€5.000
```

### Costi diretti imputati all'evento

I costi diretti sostenuti per l'evento (fornitori esterni, spese catering, ecc.) vengono registrati come movimenti `USCITA` con `eventoId` valorizzato. Il sistema accumula `costiDirettiImputati` sull'evento per monitorare la redditività.

```
tipo:       USCITA
eventoId:   evento.id
contoCoge:  40.xx (COSTO operativo)

→ P&L: −Costi operativi nel mese dell'evento (data_movimento = data evento)
→ Evento: aumenta costiDirettiImputati
```

---

## 7. Spese ricorrenti — tipo FLAT

Le spese ricorrenti FLAT rappresentano pagamenti periodici costanti: affitti, abbonamenti, canoni, noleggi.

### Caratteristiche

- **Importo**: costante (o con variazione percentuale opzionale per rata)
- **Frequenza**: MENSILE, BIMESTRALE, TRIMESTRALE
- **Numero rate**: definito alla creazione
- **Tipo piano**: `FLAT`

### Generazione installments

Il sistema genera `numeroRate` installments con importo fisso (o crescente/decrescente se `variazionePct ≠ 0`):

```
Rata i:
  importo[i] = importo[0] × (1 + variazionePct/100)^(i-1)
  dataScadenza = dataPrimaRata + (i-1) × mesiPerFrequenza
  quotaCapitale = NULL   ← nessuna distinzione capitale/interessi
  quotaInteressi = NULL
```

### Movimento generato al pagamento (`payInstallment`)

```
Movimento singolo (1 per rata):

tipo:            USCITA
importo:         rata.importo
dataMovimento:   LocalDate.now()  ← data del pagamento effettivo
dataFinanziaria: LocalDate.now()
stato:           REGISTRATO
fonte:           RICORRENTE
contoCoge:       piano.contoCoge  (deve essere tipo PASSIVITA o COSTO)
contoBancarioId: piano.contoBancarioId
businessUnitId:  derivato dal contoBancario
descrizione:     "[RICORRENTE] <descrizione piano> – rata <n>/<totale>"
```

> **Perché `contoCoge` è PASSIVITA per una spesa fissa?** I piani ricorrenti sono tipicamente usati per rimborso di debiti (mutui, leasing). Per spese operative, l'operatore può scegliere un conto COSTO. La classificazione determina l'impatto P&L.

### Impatto con contoCoge COSTO (spesa operativa)

```
Esempio: canone affitto €1.200/mese, 12 rate mensili

P&L:       −€1.200 in Costi Operativi ogni mese
CF:        −€1.200 in Uscite Operative ogni mese
EBITDA:    riduce di €1.200/mese
```

### Impatto con contoCoge PASSIVITA (rimborso debito)

```
Esempio: rata leasing €500/mese (già tutto capitale, nessun interesse)

P&L:       NON impatta EBITDA né EBIT (è rimborso finanziario)
CF:        −€500 in Uscite Finanziarie ogni mese
```

### Liquidazione anticipata (`liquidatePlan`)

Tutte le rate PENDING vengono pagate con un unico movimento:

```
Movimento singolo (maxi-rata):

tipo:    USCITA
importo: somma di tutte le rate PENDING
fonte:   RICORRENTE
note:    <eventuale nota di estinzione>
```

---

## 8. Spese ricorrenti — tipo FINANZIAMENTO

I piani FINANZIAMENTO modellano mutui, leasing finanziari, prestiti bancari usando l'**ammortamento alla francese** (rata costante, quote variabili).

### Principio matematico

```
Ammortamento alla francese (rata costante):

  Dati: P = debito iniziale, r = tasso periodico, n = numero rate

  Tasso periodico:
    r = (tassoAnnuo / 100) × (mesiPerFrequenza / 12)

  Rata costante (PMT):
    PMT = P × r / (1 − (1+r)^−n)

  Per ogni rata i:
    interessi_i = debitoResiduo_{i-1} × r
    capitale_i  = PMT − interessi_i
    debitoResiduo_i = debitoResiduo_{i-1} − capitale_i

  Ultima rata:
    capitale_n  = debitoResiduo_{n-1}   (chiude esattamente il debito)
    interessi_n = max(0, PMT − capitale_n)

  Invarianti garantiti dal sistema:
    ∀ i:  capitale_i + interessi_i ≈ PMT  (± €0.01 arrotondamento)
    Σ capitale_i = P                      (esatto sull'ultima rata)
    interessi_i è NON CRESCENTE           (decresce con il debito residuo)
    capitale_i  è NON DECRESCENTE         (cresce man mano che si riduce il debito)
```

### Modalità di configurazione

Il frontend offre due modalità:

| Modalità | Input utente | Valore derivato | Formula |
|---|---|---|---|
| **RATA** | Debito (P), Tasso (r), N. rate (n) | PMT (rata) | PMT = P·r/(1−(1+r)^−n) |
| **DURATA** | Debito (P), Tasso (r), Importo rata (PMT) | N. rate (n) | n = ⌈−log(1−P·r/PMT) / log(1+r)⌉ |

Vincolo di validità: `PMT > interessi_primo_periodo` (altrimenti il capitale sarebbe negativo).

### Dati aggiuntivi richiesti

Oltre ai campi standard del piano:

| Campo | Tipo | Obbligatorio | Descrizione |
|---|---|---|---|
| `importoDebitoIniziale` | BigDecimal | Sì | Capitale residuo alla prima rata |
| `tassoInteresseAnnuo` | BigDecimal | Sì | Tasso annuo nominale (es. 3.5 = 3,5%) |
| `contoCogeInteressiId` | Integer | Sì | Conto COGE tipo `ONERE_FINANZIARIO` (mastro 60.xx) |
| `contoCoge` | Integer | Sì | Conto COGE tipo `PASSIVITA` (mastro 20.xx) per la quota capitale |

### Due movimenti per rata

Al pagamento di ogni rata FINANZIAMENTO vengono creati **due movimenti separati**:

```
Movimento 1 — QUOTA CAPITALE:

  tipo:            USCITA
  importo:         rata.quotaCapitale
  contoCoge:       piano.contoCoge       (PASSIVITA, es. 20.01.001)
  fonte:           RICORRENTE
  dataMovimento:   oggi
  dataFinanziaria: oggi

  → P&L:  NON impatta (PASSIVITA non entra nel conto economico)
  → CF:   −quota capitale in "Uscite finanziarie"
  → Bilancio: riduce il debito residuo

─────────────────────────────────────────────────────

Movimento 2 — QUOTA INTERESSI:

  tipo:            USCITA
  importo:         rata.quotaInteressi
  contoCoge:       piano.contoCogeInteressi (ONERE_FINANZIARIO, es. 60.01.001)
  fonte:           RICORRENTE
  dataMovimento:   oggi
  dataFinanziaria: oggi

  → P&L:  −Oneri finanziari (tra EBIT e Utile Netto)
  → CF:   −quota interessi in "Uscite finanziarie"
```

### Esempio numerico completo

**Parametri:** €100.000, 3,5% annuo, 12 rate mensili, prima rata 2026-01-01

| # | Rata | Interessi | Capitale | Debito Residuo |
|---|---|---|---|---|
| 1 | €8.490,67 | €291,67 | €8.199,00 | €91.801,00 |
| 2 | €8.490,67 | €267,78 | €8.222,89 | €83.578,11 |
| 3 | €8.490,67 | €243,60 | €8.247,07 | €75.331,04 |
| … | … | … | … | … |
| 11 | €8.490,67 | €49,11 | €8.441,56 | €8.251,87 |
| 12 | €8.490,67 | €24,07 | **€8.251,87** (= residuo) | €0,00 |
| **Totale** | **€101.888,04** | **€1.888,04** | **€100.000,00** | — |

**Impatto sul P&L anno 2026 (se tutte le 12 rate pagate):**

```
Oneri finanziari:   −€1.888,04   (somma interessi annui)
Costi operativi:     €0,00       (capitale non impatta EBITDA)
Ammortamenti D&A:    €0,00       (il finanziamento non genera D&A; 
                                  i cespiti acquistati eventualmente sì)
```

**Impatto sul Cash Flow anno 2026:**

```
Uscite finanziarie: −€101.888,04  (totale rate pagate)
  di cui capitale:  −€100.000,00
  di cui interessi: −€1.888,04
```

### Comportamento dello skip rata su FINANZIAMENTO

| Modalità skip | Effetto sulla rata | Effetto sulle quote |
|---|---|---|
| `RIMANDA` | Rata SKIPPED; aggiunta rata extra in fondo al piano con stessa data scadenza originale | Quote `quotaCapitale`/`quotaInteressi` **copiate** sulla nuova rata |
| `ACCORPA` | Rata SKIPPED; importo sommato alla prossima rata PENDING | Quote sulla prossima rata **azzerati** (NULL) — il split deve essere ricalcolato |

---

## 9. Movimenti cassa

Il modulo cassa gestisce il denaro contante dell'azienda separatamente. I movimenti cassa (`cassa_movimenti`) sono un'entità distinta, ma alcuni tipi generano automaticamente un corrispondente `Movimento` sul libro contabile.

### Tipi di movimento cassa

| Tipo | Genera Movimento? | Direzione Movimento | Conto COGE | Descrizione |
|---|---|---|---|---|
| `ENTRATA` | No (solo cassa) | — | — | Incasso in contanti (es. POS, cliente) |
| `USCITA` | No (solo cassa) | — | — | Pagamento in contanti |
| `PRELIEVO_DA_BANCA` | **Sì** | USCITA (banca) | 10.03.xxx (giroconti) | Prelievo contanti da conto bancario |
| `VERSAMENTO_IN_BANCA` | **Sì** | ENTRATA (banca) | 10.03.xxx (giroconti) | Versamento contanti in banca |

### Struttura del movimento generato (PRELIEVO/VERSAMENTO)

```
Movimento bancario specchio:

tipo:            USCITA (per PRELIEVO) o ENTRATA (per VERSAMENTO)
importo:         cassa_movimento.importo
dataMovimento:   cassa_movimento.data_movimento
dataFinanziaria: cassa_movimento.data_movimento  (immediato)
contoBancarioId: request.contoBancaId
metodoPagamentoId: 1  (CONTANTI)
contoCoge:       10.03.xxx  (ATTIVITA — giroconti)
stato:           REGISTRATO
fonte:           MANUALE
descrizione:     "[CASSA] Prelievo/Versamento"
```

> **Impatto P&L e CF:** I giroconti (conto tipo `ATTIVITA`) **non entrano nel P&L**. Non sono ricavi né costi. Nel Cash Flow, i giroconti interni sono esclusi dalla classificazione operativa/finanziaria — rappresentano spostamenti di liquidità tra conti dello stesso soggetto.

---

## 10. Stipendi e personale

### Stato attuale

Il modulo personale gestisce l'anagrafica dei dipendenti ma **non genera ancora movimenti automatici**. I pagamenti stipendi vengono registrati manualmente.

### Dati disponibili nel modulo personale

| Campo | Descrizione |
|---|---|
| `costoAziendaleMensile` | Costo mensile complessivo (stipendio + contributi) |
| `mansioneId` | Qualifica/mansione |
| `centroDiCostoId` | Centro di costo (derivato dalla BU) |

### Come registrare un pagamento stipendio oggi

Movimento manuale USCITA con:

```
tipo:            USCITA
contoCoge:       40.01.xxx  (COSTO — manodopera, specifico per dipendente)
                 oppure 40.08.001 (contributi previdenziali)
importo:         stipendio netto (o costo aziendale)
dataMovimento:   ultimo giorno del mese di competenza
dataFinanziaria: data bonifico effettivo (es. 27 del mese)
descrizione:     "Stipendio <nome> <mese/anno>"

→ P&L:  −Costi operativi nel mese di dataMovimento
→ CF:   −Uscite operative nel mese di dataFinanziaria
```

### Previsione evoluzione futura

Il Forecasting Service ha già la categoria `STIPENDIO` nella vista; l'implementazione è prevista come costo ricorrente automatico mensile, con movimento generato il giorno configurato per ciascun dipendente.

---

## 11. Impatto economico: il conto economico (P&L)

### La materialized view `mv_conto_economico_mensile`

La vista materializata è il cuore del P&L. Aggrega i movimenti per mese, business unit e tipo COGE:

```sql
-- Logica di classificazione (semplificata):
SELECT
  EXTRACT(YEAR FROM m.data_competenza)   AS anno,
  EXTRACT(MONTH FROM m.data_competenza)  AS mese,
  m.business_unit_id,
  pc.codice_coge,
  pc.tipo,
  pc.is_capex,
  SUM(CASE WHEN m.tipo='ENTRATA' AND pc.tipo='RICAVO'
      THEN m.importo_lordo ELSE 0 END)     AS ricavi,
  SUM(CASE WHEN m.tipo='USCITA' AND pc.tipo='COSTO' AND NOT pc.is_capex
      THEN m.importo_lordo ELSE 0 END)     AS costi_operativi,
  SUM(CASE WHEN m.tipo='USCITA' AND pc.is_capex
      THEN m.importo_lordo ELSE 0 END)     AS investimenti_capex,
  SUM(CASE WHEN m.tipo='USCITA' AND pc.tipo='ONERE_FINANZIARIO'
      THEN m.importo_lordo ELSE 0 END)     AS oneri_finanziari,
  SUM(CASE WHEN m.tipo='USCITA' AND pc.tipo='IMPOSTA'
      THEN m.importo_lordo ELSE 0 END)     AS imposte,
  -- EBITDA proxy = ricavi - costi operativi
  (ricavi - costi_operativi)               AS ebitda_proxy
FROM movimenti m
JOIN piano_dei_conti_coge pc ON pc.id = m.conto_coge_id
WHERE m.stato != 'ANNULLATO'
  AND m.data_competenza IS NOT NULL
GROUP BY anno, mese, business_unit_id, codice_coge, tipo, is_capex
```

### Cosa **non** entra nel P&L

| Tipo COGE | Motivo dell'esclusione |
|---|---|
| `ATTIVITA` | Spostamenti di liquidità, crediti — non sono ricavi né costi |
| `PASSIVITA` | Rimborso di debiti — non è un costo ma riduzione del passivo |

### Refresh della MV

La vista viene aggiornata:
- **Automaticamente** ogni 30 minuti tramite `fn_refresh_all_mv()` (scheduled job)
- **Manualmente** nei test: `REFRESH MATERIALIZED VIEW mv_conto_economico_mensile`
- **Concurrently**: senza lock esclusivi, per non bloccare le letture

---

## 12. Impatto finanziario: il cash flow

### La materialized view `mv_cash_flow_statement`

Il Cash Flow usa `data_finanziaria` (data effettiva del regolamento bancario), non `data_competenza`. Esclude i movimenti non ancora liquidati (`data_finanziaria IS NULL`).

```sql
-- Classificazione Cash Flow (semplificata):
entrate_operative  = SUM importo WHERE tipo='ENTRATA' AND tipo_coge NOT IN (PASSIVITA, ONERE_FINANZIARIO) AND NOT is_capex
uscite_operative   = SUM importo WHERE tipo='USCITA'  AND tipo_coge NOT IN (PASSIVITA, ONERE_FINANZIARIO) AND NOT is_capex
uscite_investimento = SUM importo WHERE tipo='USCITA' AND is_capex=true
uscite_finanziarie  = SUM importo WHERE tipo='USCITA' AND tipo_coge IN (PASSIVITA, ONERE_FINANZIARIO)
entrate_finanziarie = SUM importo WHERE tipo='ENTRATA' AND tipo_coge IN (PASSIVITA, ONERE_FINANZIARIO)
flusso_netto = entrate_operative - uscite_operative - uscite_investimento - uscite_finanziarie + entrate_finanziarie
```

### Quadro completo degli impatti

| Tipo movimento | Conto COGE | P&L (data_competenza) | Cash Flow (data_finanziaria) |
|---|---|---|---|
| Incasso ricavo | RICAVO | +Ricavi | +Entrate operative |
| Pagamento costo operativo | COSTO (non capex) | −Costi operativi | −Uscite operative |
| Acquisto bene strumentale | COSTO (is_capex) | Solo investimenti_capex | −Uscite investimento |
| Pagamento imposta | IMPOSTA | −Imposte | −Uscite operative |
| Rata FINANZIAMENTO — quota capitale | PASSIVITA | *(nessun impatto)* | −Uscite finanziarie |
| Rata FINANZIAMENTO — quota interessi | ONERE_FINANZIARIO | −Oneri finanziari | −Uscite finanziarie |
| Rata FLAT su conto COSTO | COSTO | −Costi operativi | −Uscite operative |
| Rata FLAT su conto PASSIVITA | PASSIVITA | *(nessun impatto)* | −Uscite finanziarie |
| Giroconto cassa/banca | ATTIVITA | *(nessun impatto)* | *(non classificato)* |
| Pagamento caparra evento | RICAVO | +Ricavi (mese evento) | +Entrate operative (mese incasso) |

---

## 13. Il waterfall P&L dettagliato

Il conto economico consolidato segue questa struttura a cascata:

```
┌─────────────────────────────────────────────────────────────────┐
│  RICAVI                                                          │
│  Fatturato e ricavi da contratti nel periodo                     │
│  Fonte: movimenti ENTRATA con tipo_coge = RICAVO                │
├─────────────────────────────────────────────────────────────────┤
│  − COSTI OPERATIVI                                               │
│  Acquisti, servizi esterni, personale, spese di struttura        │
│  Fonte: movimenti USCITA con tipo_coge = COSTO AND NOT is_capex │
├═════════════════════════════════════════════════════════════════╡
│  = EBITDA  (Margine Operativo Lordo)                             │
│  Earnings Before Interest, Taxes, Depreciation & Amortization   │
│  Formula: Ricavi − Costi operativi                               │
│  Margine %: EBITDA / Ricavi × 100                                │
├─────────────────────────────────────────────────────────────────┤
│  − D&A  (Ammortamenti e svalutazioni)                            │
│  Quote annue di ammortamento dei cespiti attivi                  │
│  Formula: Σ (costo_storico × aliquota / 100 / 12) × n_mesi      │
│  Fonte: tabella `cespiti` (is_active = true)                     │
│  Per BU: distribuzione pro-rata proporzionale all'EBITDA della BU│
├═════════════════════════════════════════════════════════════════╡
│  = EBIT  (Risultato Operativo Netto)                             │
│  Earnings Before Interest & Tax                                  │
│  Formula: EBITDA − D&A                                           │
├─────────────────────────────────────────────────────────────────┤
│  − ONERI FINANZIARI                                              │
│  Interessi passivi su mutui, leasing, finanziamenti              │
│  Fonte: movimenti USCITA con tipo_coge = ONERE_FINANZIARIO       │
│  (solo quota interessi delle rate FINANZIAMENTO)                 │
├─────────────────────────────────────────────────────────────────┤
│  = EBT  (Risultato prima delle imposte)                          │
│  Earnings Before Tax                                             │
│  Formula: EBIT − Oneri finanziari                                │
│  (mostrato solo se ci sono imposte da dedurre)                   │
├─────────────────────────────────────────────────────────────────┤
│  − IMPOSTE                                                       │
│  IRAP e IRPEF/IRES registrate nel periodo                        │
│  Fonte: movimenti USCITA con tipo_coge = IMPOSTA                 │
├═════════════════════════════════════════════════════════════════╡
│  = UTILE NETTO                                                   │
│  Risultato finale d'esercizio                                    │
│  Formula: EBT − Imposte  ≡  EBIT − OneriFinanziari − Imposte    │
└─────────────────────────────────────────────────────────────────┘
```

### Invarianti matematici verificabili

```
ebit           = ebitda − ammortamenti − oneriFinanziari
utileNetto     = ebit − imposte
marginePct     = (ebitda / ricavi) × 100    [solo se ricavi > 0]
ebitda         = ricavi − costiOperativi
```

### Allocazione D&A per Business Unit

Gli ammortamenti sono calcolati a livello **consolidato** (dalla tabella `cespiti`) e distribuiti alle BU proporzionalmente al loro contributo all'EBITDA:

```
ammortBU_i = ammortamentiTotali × (EBITDA_BU_i / Σ EBITDA_BU)
```

Se l'EBITDA totale è zero o negativo, gli ammortamenti vengono allocati in parti uguali o non allocati.

---

## 14. Forecasting e proiezioni

Il servizio di forecasting (`ForecastingService`) proietta entrate e uscite future usando i dati esistenti nel sistema.

### Fonti dei dati previsionali

| Categoria (`ForecastingCategoria`) | Fonte | Vista | Modalità |
|---|---|---|---|
| `MOVIMENTO` | Movimenti con `data_liquidita` futura e `data_finanziaria IS NULL` (DA_LIQUIDARE) | Economica + Finanziaria | Movimenti manuali in sospeso |
| `EVENTO` | Residuo eventi CONFERMATO: `importoTotalePreviventivato − importoIncassato` | Economica + Finanziaria | Ricavi futuri stimati |
| `RATA_RICORRENTE_CAPITALE` | Rate `PENDING` dei piani ricorrenti con scadenza futura | Economica + Finanziaria | Piani FLAT e quota capitale FINANZIAMENTO |
| `RATA_RICORRENTE_INTERESSI` | Quota interessi delle rate PENDING (solo FINANZIAMENTO) | Solo economica | Non impatta Cash Flow direttamente |
| `STIPENDIO` | (non ancora implementato) | — | Placeholder per costi fissi mensili |

### Vista economica vs finanziaria

| Vista | Descrizione | Date usate |
|---|---|---|
| `ECONOMICA` | Proiezione del P&L futuro | `dataMovimento` / `data_liquidita` |
| `FINANZIARIA` | Proiezione del Cash Flow futuro | `data_liquidita` (quando verrà incassato/pagato) |
| `ENTRAMBE` | Entrambi gli impatti | — |

### Orizzonti di previsione

| Horizon | Giorni | Granularità timeline |
|---|---|---|
| `30` | 30 gg | Settimanale |
| `60` | 60 gg | Settimanale |
| `90` | 90 gg | Settimanale |
| `180` | 180 gg | Settimanale |
| `FINE_ANNO` | Fino al 31/12 dell'anno corrente | Settimanale |

### De-duplicazione eventi

Per evitare doppio conteggio, il forecasting **esclude** i movimenti con `evento_id IS NOT NULL` dalla categoria `MOVIMENTO`. Gli incassi da eventi vengono proiettati **solo tramite** `EVENTO` (residuo da incassare), non come movimenti individuali.

---

## 15. Tabella riepilogativa di tutti i tipi

| # | Tipo movimento | Fonte | COGE | P&L | Cash Flow | Genera MV interessi? |
|---|---|---|---|---|---|---|
| 1 | **Incasso manuale** | MANUALE | RICAVO | +Ricavi | +Entr. operative | No |
| 2 | **Pagamento fornitore** | MANUALE | COSTO | −Costi op. | −Usc. operative | No |
| 3 | **Acquisto cespite (CAPEX)** | MANUALE | COSTO (capex) | Investimenti capex | −Usc. investimento | No |
| 4 | **Pagamento imposta** | MANUALE | IMPOSTA | −Imposte | −Usc. operative | No |
| 5 | **Pagamento caparra evento** | MANUALE | RICAVO | +Ricavi (mese evento) | +Entr. operative | No |
| 6 | **Pagamento acconto evento** | MANUALE | RICAVO | +Ricavi (mese evento) | +Entr. operative | No |
| 7 | **Saldo evento** | MANUALE | RICAVO | +Ricavi (mese evento) | +Entr. operative | No |
| 8 | **Penale annullamento** | MANUALE | RICAVO | +Ricavi | +Entr. operative | No |
| 9 | **Costo diretto evento** | MANUALE | COSTO | −Costi op. | −Usc. operative | No |
| 10 | **Rata FLAT (conto COSTO)** | RICORRENTE | COSTO | −Costi op. | −Usc. operative | No |
| 11 | **Rata FLAT (conto PASSIVITA)** | RICORRENTE | PASSIVITA | *(nessuno)* | −Usc. finanziarie | No |
| 12 | **Rata FINANZIAMENTO — capitale** | RICORRENTE | PASSIVITA | *(nessuno)* | −Usc. finanziarie | No |
| 13 | **Rata FINANZIAMENTO — interessi** | RICORRENTE | ONERE_FIN. | −Oneri finanziari | −Usc. finanziarie | **Sì** |
| 14 | **Stipendio** | MANUALE | COSTO (40.01.xxx) | −Costi op. | −Usc. operative | No |
| 15 | **Contributi previdenziali** | MANUALE | COSTO (40.08.001) | −Costi op. | −Usc. operative | No |
| 16 | **Prelievo cassa da banca** | MANUALE | ATTIVITA (giroconto) | *(nessuno)* | *(nessuno)* | No |
| 17 | **Versamento cassa in banca** | MANUALE | ATTIVITA (giroconto) | *(nessuno)* | *(nessuno)* | No |
| 18 | **Liquidazione anticipata FLAT** | RICORRENTE | COSTO/PASSIVITA | Dipende dal COGE | Dipende dal COGE | No |
| 19 | **Liquidazione anticipata FIN. (cap.)** | RICORRENTE | PASSIVITA | *(nessuno)* | −Usc. finanziarie | No |
| 20 | **Liquidazione anticipata FIN. (int.)** | RICORRENTE | ONERE_FIN. | −Oneri finanziari | −Usc. finanziarie | **Sì** |

---

### Note finali

**Riconciliazione bancaria:** I movimenti in stato `RICONCILIATO` sono stati abbinati a una movimentazione effettiva dell'estratto conto. Non cambia l'impatto su P&L o CF, ma certifica la corrispondenza con il dato bancario reale.

**Deduplicazione importazioni:** Il constraint `UNIQUE(fonte, riferimento_esterno, data_movimento)` garantisce che reimportare lo stesso file CSV non generi duplicati.

**Partizione annuale:** La tabella `movimenti` è partizionata per anno su `data_movimento`. Query che attraversano più anni devono includere la chiave di partizione o usare la partition pruning di PostgreSQL per performance ottimali.

**Ammortamenti cespiti:** I D&A non generano movimenti contabili ma vengono calcolati direttamente dalla tabella `cespiti` (`costo_storico × aliquota / 100 / 12`). Il loro impatto è visibile solo nel P&L waterfall (EBITDA → EBIT), non nelle MV dei movimenti.
