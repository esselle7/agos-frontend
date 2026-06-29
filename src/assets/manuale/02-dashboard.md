# 8. Dashboard

> Menu: **Operatività → Dashboard**. È la pagina che vedi appena entri.

## A cosa serve

La Dashboard è il tuo "cruscotto": una fotografia sintetica della situazione, senza dover aprire i
report. Come amministratore vedi la **dashboard completa**; un dipendente vede invece una
**dashboard dedicata agli eventi**.

## Cosa trovi (dashboard amministratore)

La pagina è divisa in riquadri:

| Riquadro | Cosa mostra |
|---|---|
| **Situazione Finanziaria** | La fotografia della cassa: saldi e disponibilità. È la lettura "cash" del momento. |
| **Performance Economica** | I numeri del conto economico del periodo (ricavi, margine, utile). È la lettura "P&L". |
| **Andamento Mensile** | Il grafico dell'andamento nel tempo. |
| **Fatturato per Business Unit** | Quanto sta producendo ciascuna delle cinque aree. |
| **Agenda Imminente** | Le prossime scadenze in arrivo. |
| **Eventi Imminenti** | I prossimi eventi in calendario. |
| **Pagamenti Ricorrenti** | Le prossime rate dei piani di spesa ricorrente. |
| **Uscite da liquidare** | I movimenti registrati ma non ancora pagati (stato *Da liquidare*). |

> Il **campanellino** in alto a destra ti segnala il numero di **scadenze già scadute** (movimenti
> da pagare/incassare, eventi e rate). Cliccandolo apri lo [Scadenzario](13-scadenzario.md), che è
> la pagina dedicata a tutte le scadenze.

### Il pulsante "Senza banca"

Nell'intestazione del riquadro **Situazione Finanziaria** c'è il pulsante **Senza banca**, con un
badge che conta i movimenti **non ancora assegnati a un conto**. Sono incassi entrati nel sistema
(spesso dall'import) senza che sia chiaro su quale conto siano finiti.

Cliccandolo si apre un popup: per ogni movimento vedi importo, descrizione e natura (evento,
fornitore, categoria, fonte) e tre pulsanti per attribuirlo a **BPM**, **Crédit Agricole** o
**Cassa**. Appena assegni, il saldo del conto si aggiorna e il movimento sparisce dalla lista.

> **Perché conta.** Un incasso "senza banca" non viene conteggiato in nessun saldo: finché resta
> lì, la Situazione Finanziaria è incompleta. Tieni il badge a zero.

## Come si usa

1. Apri **Dashboard** (è la home).
2. Leggi i due riquadri in alto affiancati: **Situazione Finanziaria** (i soldi che hai) e
   **Performance Economica** (quanto stai guadagnando). Ricorda che possono raccontare cose
   diverse — vedi [Parte I, cap. 4](01-capire-il-gestionale.md#4-il-cash-flow).
3. Usa **Fatturato per Business Unit** per capire quale area tira e quale arranca. Cliccando una
   BU puoi aprirne il dettaglio.
4. Tieni d'occhio **Uscite da liquidare** e **Pagamenti Ricorrenti**: sono i soldi che dovrai tirar
   fuori a breve.

## Attenzione

- I numeri della Dashboard derivano da viste che si **aggiornano periodicamente** (ogni ~30
  minuti), non in tempo reale al secondo. Se hai appena inserito un movimento, potrebbe comparire
  nei totali con un piccolo ritardo.
- La Dashboard è di sola lettura: per *agire* (creare/modificare) usa le sezioni dedicate.

---

[← Indice](README.md) · **Prossimo:** [18. Scadenzario →](13-scadenzario.md)
