# 20. Piano dei conti

> Menu: **Configurazione → Piano dei conti**. Riservato all'amministratore.

## A cosa serve

Il piano dei conti è l'elenco dei **conti COGE** (contabilità generale) usati in tutta
l'applicazione: ogni movimento, evento, spesa e riga di report è agganciato a uno di questi conti.
È l'impalcatura che alimenta il [waterfall del conto economico](01-capire-il-gestionale.md#3-il-conto-economico).

Qui li **consulti** e, all'occorrenza, ne **modifichi** uno o ne **aggiungi** di nuovi.

## Come sono organizzati

I conti sono raggruppati per **natura**, ciascuna con il suo colore:

| Gruppo | Cos'è | Dove pesa |
|---|---|---|
| **Ricavi** | Le entrate di competenza | Riga Ricavi del P&L |
| **Costi** | I costi operativi | EBITDA |
| **Attività** | Beni e crediti (patrimoniale) | Fuori dal P&L |
| **Passività** | Debiti (patrimoniale) | Fuori dal P&L |
| **Oneri finanziari** | Interessi su mutui/finanziamenti | Tra EBITDA ed EBIT/EBT |
| **Imposte** | Tributi e imposte | Verso l'utile netto |

Il **codice** è gerarchico: i punti indicano il livello (es. `30.01.001`). La barra di ricerca in
alto filtra per codice o descrizione.

## Aggiungere o modificare un conto

1. **Nuovo conto** (o **Aggiungi** dentro un gruppo per preselezionarne la natura). Per modificarne
   uno esistente, clicca sulla sua scheda.
2. Compila:
   - **Codice** — gerarchico, i punti definiscono il livello.
   - **Descrizione.**
   - **Tipo** — la natura (Ricavo, Costo operativo, Attività, Passività, Onere finanziario, Imposta).
   - **Conto padre** (opzionale) — per appenderlo sotto un conto esistente.
3. **Salva.**

## Attenzione

- **Cambiare un codice ha effetti a cascata.** Il codice è la chiave con cui movimenti, regole di
  riconoscimento e [keyword](07-keyword.md) si agganciano al conto: se lo modifichi, il sistema
  aggiorna i riferimenti collegati, ma è un'operazione delicata. Cambialo solo se sai cosa stai
  facendo.
- Non eliminare conti già usati da movimenti storici: rischi di "orfanare" dati passati. In dubbio,
  lascia il conto e creane uno nuovo.
- I nuovi conti non entrano automaticamente in tutte le liste di previsione/forecasting: alcune
  selezioni sono ancora definite a livello di sistema.

---

[← 13. Regole di classificazione](07-keyword.md) · [Indice](README.md) · **Prossimo:** [15. Report e Previsioni →](09-reporting-e-previsioni.md)
