# 14. Anagrafica

> Menu: **Gestione → Anagrafica**. Riservata all'amministratore.

L'Anagrafica è l'archivio delle entità che usi ovunque nel gestionale. Tenerla in ordine fa
funzionare meglio l'auto-classificazione e i report. Ha tre schede: **Fornitori**, **Categorie**,
**Personale**.

---

## 14.1 Fornitori

**A cosa serve:** archiviare i fornitori (e i clienti ricorrenti) con i loro dati e, soprattutto,
con i **valori predefiniti** che velocizzano la registrazione dei movimenti e l'import.

### Creare un fornitore

1. **Anagrafica → Fornitori → Nuovo fornitore.**
2. Compila:
   - **Ragione sociale** *(obbligatoria)*.
   - **Alias breve** — nome corto usato nelle liste e nei suggerimenti.
   - **Partita IVA**, **Codice SDI**, **Note**.
   - **Conto CoGe di default** e **BU di default** — la famiglia/conto e l'area che il sistema
     proporrà in automatico quando registri un movimento per questo fornitore.
3. **Salva.**

### Gli alias di matching

Per ogni fornitore puoi definire degli **alias** che aiutano il sistema a riconoscerlo nelle
descrizioni bancarie (durante l'import). Ogni alias ha:

- **Pattern** — il testo da cercare.
- **Tipo match** — come confrontarlo con la descrizione.

> **Perché servono.** Le banche scrivono i nomi in modo disordinato e abbreviato. Gli alias dicono
> al sistema *"se vedi questo testo, è questo fornitore"*, così l'import lo attribuisce da solo.

### Cosa succede dopo

- Quando crei un movimento e scegli il fornitore, **Conto CoGe e BU si auto-compilano** con i suoi
  default (puoi sempre sovrascriverli).
- In fase di import, gli alias aiutano a riconoscere la controparte e ad alzare la "copertura
  fornitori" (il KPI in cima alla pagina Import).

---

## 14.2 Categorie

**A cosa serve:** raggruppare i movimenti per analisi e report, su un piano **più analitico** del
conto contabile. Le categorie sono organizzate ad albero (categoria padre → sottocategorie).

### Creare una categoria

1. **Anagrafica → Categorie → Nuovo.**
2. Compila:
   - **Nome categoria** *(obbligatorio)*.
   - **Business unit** di riferimento.
   - **Figlia di** — la categoria padre (lascia vuoto per una categoria di primo livello).
   - **Ordinamento** — la posizione nell'elenco (numero ≥ 0).
3. **Salva.**

> Le categorie sono **facoltative** sui movimenti, ma utili per spaccare i numeri in modo più fine
> di quanto faccia il piano dei conti.

---

## 14.3 Personale

**A cosa serve:** archiviare i dipendenti con il loro costo, per poterli assegnare agli eventi e
imputarne le ore (vedi [capitolo 10](04-eventi.md#107-partecipanti-e-ore-del-personale)).

### Creare un dipendente

1. **Anagrafica → Personale → Nuovo dipendente.**
2. Compila:
   - **Nome** e **Cognome** *(obbligatori)*.
   - **Mansione**.
   - **Business unit** — da cui il **centro di costo** viene **assegnato in automatico**.
   - **Costo aziendale mensile** — il costo complessivo (stipendio + contributi).
   - **Paga oraria lorda** — usata per valorizzare le ore imputate agli eventi.
3. **Salva.**

### Cosa succede / da sapere

- Il **centro di costo** non si imposta a mano: deriva dalla Business Unit.
- Il modulo personale gestisce l'**anagrafica**; ad oggi **non genera automaticamente** i movimenti
  degli stipendi: il pagamento dello stipendio si registra come [movimento](03-movimenti.md) di
  uscita (famiglia 40 – Costo, manodopera/contributi).

---

## Errori comuni / attenzione

- **Fornitori senza default.** Un fornitore senza Conto CoGe/BU predefiniti ti costringe a
  scegliere i conti a mano ogni volta: imposta i default ai fornitori ricorrenti.
- **Alias troppo generici.** Un alias troppo corto può "agganciare" fornitori sbagliati; usa testi
  distintivi.

---

[← 19. Situazione iniziale](12-situazione-iniziale.md) · [Indice](README.md) · **Prossimo:** [13. Keyword →](07-keyword.md)
