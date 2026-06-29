# 13. Keyword (regole di riconoscimento)

> Menu: **Gestione → Keyword**. Riservata all'amministratore.

Le **keyword** sono le regole che insegnano al sistema a **catalogare da solo** le righe importate.
Ogni keyword dice, in sostanza: *"quando in una descrizione bancaria compaiono queste parole, fai
questa cosa"*. Più keyword crei, meno lavoro manuale ti resta nello smistamento.

> Le keyword lavorano **a monte** dello smistamento: agiscono durante l'import (vedi
> [capitolo 12](06-import-e-smistamento.md)). Ogni volta che cataloghi un transitorio puoi anche
> **apprendere** la keyword corrispondente, così non lo rifai più.

---

## 13.1 I tre tipi di keyword

| Tipo | Cosa riconosce | Cosa fa alla riga |
|---|---|---|
| **Identità** | Un fornitore / cliente **preciso** (es. *SELECOVER*, *TIM*, un codice mandato SDD) | La **contabilizza** sul conto scelto e le attribuisce **quel fornitore** |
| **Dominio – categoria** | Una **categoria** di ricavo/costo (es. *PRANZO*, *SPACCIO*, *ORTOFRUTTA*, *ASSICURAZIONE*) | La **contabilizza** sul conto scelto, **senza** attribuire un fornitore |
| **Dominio – evento** | Un **evento da riconciliare** (es. *MATRIMONIO*, *CERIMONIA*, *BATTESIMO*) | **Non** crea un movimento: **parcheggia** la riga tra gli incassi evento da riconciliare |

> **Differenza pratica.** *Identità* e *Dominio-categoria* portano la riga direttamente a libro.
> *Dominio-evento* la mette in attesa perché solo tu sai a quale cerimonia appartiene
> (la riconcili nella sezione **Eventi** dello smistamento).

---

## 13.2 Creare una keyword

La creazione è guidata da un wizard a tre domande.

### Passo passo

1. **Keyword → Crea** (o "Nuova").
2. **Che cosa vuoi insegnare?** Scegli il tipo (Identità / Dominio-categoria / Dominio-evento).
   La scelta determina *cosa riconosce* e *cosa succede* alla riga.
3. **Quali parole la attivano?** Aggiungi una o più **parole** (premi Invio dopo ciascuna). La
   regola scatta **solo se tutte** le parole compaiono nella descrizione (è un match "E", non "O").
   - Per un nome composto, inserisci le parole separate: es. `NICOLETA` `MIHAI`.
4. **Dove la registro?**
   - Per **Identità** e **Dominio-categoria**: scegli **Business Unit** e **Conto CoGe**; per
     *Identità* puoi anche indicare il **fornitore** da attribuire.
   - Per **Dominio-evento**: scegli la **forza** della parola:
     - **Forte** — parcheggia da sola (la parola è inequivocabile, es. "MATRIMONIO").
     - **Debole** — parcheggia solo se c'è anche contesto evento (es. una data o l'ordinante che
       combaciano).
5. **Salva.**

### Cosa succede dopo

- Al **prossimo import**, una riga che contiene tutte le parole della keyword viene gestita
  automaticamente secondo il tipo scelto (contabilizzata o parcheggiata).
- Si riduce la coda dello smistamento.

---

## 13.3 Gestire le keyword esistenti

Nella pagina **Keyword** trovi l'elenco diviso per tipo (**Identità** e **Dominio**), con una barra
di ricerca (**Cerca per parola o conto**). Per ciascuna keyword puoi:

- vedere su quale conto/BU/fornitore agisce;
- **Eliminare** una regola che non serve più o che sbaglia;
- accettare le **proposte** che il sistema suggerisce in base a come hai catalogato in passato
  ("Nuova proposta").

---

## Errori comuni / attenzione

- **Parole troppo generiche.** Una keyword con una sola parola comune (es. "PAGAMENTO") rischia di
  catalogare male tante righe diverse. Usa parole **distintive** o combinane più d'una.
- **Identità vs Dominio.** Usa **Identità** quando vuoi anche legare un **fornitore** preciso; usa
  **Dominio-categoria** quando ti interessa solo la categoria contabile.
- **Eventi sempre parcheggiati.** Le keyword di tipo evento **non** generano movimenti di proposito:
  l'ultima parola sull'attribuzione a una cerimonia spetta a te.

---

[← 14. Anagrafica](08-anagrafica.md) · [Indice](README.md) · **Prossimo:** [20. Piano dei conti →](14-piano-conti.md)
