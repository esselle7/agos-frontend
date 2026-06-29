# 19. Situazione iniziale

> Menu: **Configurazione → Situazione iniziale**. Riservata all'amministratore.

## A cosa serve

È l'**apertura del gestionale**: la fotografia al **31/12/2025** da cui parte tutto. Serve a far
partire i conti "giusti" — senza dover ricaricare lo storico dei movimenti passati. La compili una
volta sola, all'avvio; poi ci torni solo se hai un dato nuovo da inserire.

Ogni sezione è **facoltativa**: compila quello che hai, quando ce l'hai. Il dettaglio dei movimenti
del 2025 **non serve**: bastano i saldi e le poste aperte a fine anno.

La pagina è divisa in sei sezioni, scelte dalla barra a sinistra.

---

## 19.1 Liquidità — i saldi al 31/12/2025

**A cosa serve:** dire al gestionale quanti soldi avevi in ciascun conto a fine 2025. È la base di
partenza della cassa.

> **Perché conta.** Il saldo che vedi in giro per il gestionale è sempre
> *saldo iniziale + somma dei movimenti*. Se il saldo iniziale è zero, i saldi saranno sbagliati di
> tutta la liquidità che avevi prima di partire.

**Passo passo**

1. Per ogni conto (BPM, Crédit Agricole, Cassa) inserisci il **saldo al 31/12/2025**.
   Lo leggi dal **saldo iniziale del primo estratto conto di gennaio**; per la cassa, il contante a
   fine anno.
2. Premi **Salva** su ogni riga. Il bollino verde conferma il salvataggio.

---

## 19.2 Cespiti — il libro dei beni durevoli

**A cosa serve:** registrare i **beni durevoli** ancora in ammortamento (forno, arredi, macchine,
lavori, impianti). Sono ciò che genera il costo **"ammortamento"** nel conto economico.

> **Perché conta.** L'ammortamento è un costo che pesa sull'utile **senza muovere soldi**: spalma
> il valore di un bene sugli anni di vita. Se non carichi i cespiti, il P&L 2026 non avrà gli
> ammortamenti e l'utile risulterà più alto del reale. Vedi
> [Parte I, cap. 6](01-capire-il-gestionale.md#6-cosa-non-e-un-costo-o-un-ricavo).

**Passo passo**

1. **Aggiungi cespite.**
2. Compila:
   - **Descrizione** (es. "Lavastoviglie professionale").
   - **Conto (categoria investimento)** — la categoria del piano dei conti sotto cui rientra
     (codici `50.xx`). Se manca, con **+ Aggiungi categoria** ne crei una al volo.
   - **Costo storico** — quanto è costato il bene.
   - **Aliquota ammortamento** — la percentuale annua (es. 25% → vita 4 anni). L'anteprima ti mostra
     subito l'ammortamento **al mese** e **all'anno** e la vita stimata.
   - **Data acquisto.**
3. **Salva cespite.**

La lista mostra, per ogni bene, l'ammortamento annuo e il **valore residuo**. In fondo trovi il
**totale ammortamento annuo** e la sua quota mensile nel P&L. Quando un bene arriva a fine vita,
l'ammortamento smette automaticamente.

---

## 19.3 Crediti da incassare

**A cosa serve:** i soldi che i **clienti ti devono** al 31/12/2025 (eventi o fatture non ancora
incassati a fine anno).

> **Perché conta — e perché NON sono ricavo 2026.** Sono crediti maturati nel 2025: quando li
> incassi nel 2026 **muovono la cassa** ma **non** contano come ricavo dell'anno (la competenza è
> del 2025). Tecnicamente sono movimenti in entrata *Da liquidare* con competenza 2025.

**Passo passo:** **Aggiungi credito** → cliente e causale, importo, scadenza prevista, categoria
ricavo → **Aggiungi**. In fondo vedi il totale dei crediti aperti.

---

## 19.4 Debiti da pagare

**A cosa serve:** le **fatture fornitori da pagare** al 31/12/2025 (es. un saldo fornitore aperto).

> **Perché conta — e perché NON sono costo 2026.** Specularmente ai crediti: quando li paghi nel
> 2026 **escono dalla cassa** ma **non** contano come costo 2026 (competenza 2025).

**Passo passo:** **Aggiungi debito** → fornitore e causale, importo, scadenza prevista, categoria
costo → **Aggiungi**.

---

## 19.5 Finanziamenti e mutui

Mutui, leasing e finanziamenti accesi **prima del 2026 non si inseriscono qui**: si gestiscono come
**[spese ricorrenti](05-spese-ricorrenti.md)**, partendo dal **debito residuo all'1/1/2026**.

> Nel conto economico entra **solo la quota interessi** delle rate 2026; la quota capitale è
> rimborso di un debito, non un costo
> ([Parte I, cap. 6](01-capire-il-gestionale.md#6-cosa-non-e-un-costo-o-un-ricavo)).

La sezione contiene solo questa spiegazione e un collegamento a Spese ricorrenti.

---

## 19.6 Rimanenze di magazzino

Il valore delle scorte al 31/12/2025 (cantina, spaccio, food) è una posta dello stato patrimoniale
che il gestionale **non traccia**: serve per il bilancio della commercialista, non per i KPI di
cassa e margine di questo strumento.

Chiedi alla commercialista il **valore delle rimanenze al 31/12/2025** e tienilo come riferimento;
**non va inserito qui** perché non alimenta nessun calcolo del gestionale.

---

## Attenzione

- La **data di apertura** (31/12/2025) è fissa: non si modifica. Non filtra i calcoli, è solo
  l'etichetta della fotografia di partenza.
- Crediti e debiti di apertura **non gonfiano** il P&L 2026: li vedi però nello
  [Scadenzario](13-scadenzario.md) finché non li chiudi, perché sono soldi che devono ancora
  muoversi.

---

[← 10. Eventi](04-eventi.md) · [Indice](README.md) · **Prossimo:** [14. Anagrafica →](08-anagrafica.md)
