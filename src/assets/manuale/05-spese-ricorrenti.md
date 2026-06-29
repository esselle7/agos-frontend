# 11. Spese ricorrenti

> Menu: **Contabilità → Spese ricorrenti**. Riservata all'amministratore.

Una **spesa ricorrente** è un pagamento che si ripete nel tempo a importi e scadenze prevedibili.
Il gestionale ne distingue due tipi, perché impattano i conti in modo molto diverso:

- **Spesa fissa (FLAT)** — l'importo è uguale ogni rata: abbonamenti, affitti, canoni, noleggi.
- **Finanziamento** — mutui, leasing, prestiti: la rata è costante ma si scompone in **quota
  capitale + quota interessi** (ammortamento alla francese).

> Perché la distinzione conta: in un **finanziamento** solo gli **interessi** sono un costo; la
> **restituzione del capitale** non lo è (vedi [Parte I, cap. 6](01-capire-il-gestionale.md#6-cosa-non-e-un-costo-o-un-ricavo)).
> Per questo ogni rata di finanziamento genera **due movimenti separati**.

---

## 11.1 La lista dei piani

In **Spese ricorrenti** vedi tutti i piani con il loro **avanzamento** (pagato / residuo). Da qui
crei un nuovo piano con **Nuovo piano** e apri il **dettaglio** per gestire le rate.

---

## 11.2 Creare un piano FLAT (spesa fissa)

**A cosa serve:** programmare una spesa fissa periodica (es. il canone d'affitto).

La creazione avviene in un dialog a due passi: **Configurazione** → **Anteprima piano**.

### Passo passo

1. **Spese ricorrenti → Nuovo piano.**
2. **Tipo di piano:** scegli **Spesa fissa**.
3. **Informazioni generali:** **Nome del piano** (es. "Canone affitto capannone").
4. **Conti contabili:**
   - **Conto bancario** da cui usciranno i pagamenti.
   - **Conto CoGe** — per una spesa operativa scegli la famiglia **40 – Costo**; per la
     restituzione di un debito senza interessi, la famiglia **20 – Passività**.
5. **Rata e frequenza:**
   - **Importo rata**.
   - **Numero di rate**.
   - **Frequenza**: mensile / bimestrale / trimestrale.
   - **Giorno del mese** della scadenza.
   - eventuale **Variazione per rata** (% di crescita/calo per rata, se l'importo non è
     perfettamente costante).
6. Controlla l'**Anteprima piano** (l'elenco delle rate generate) e **Salva**.

### Cosa succede dopo

- Il sistema genera tutte le rate come **PENDING** (in attesa).
- Le rate future compaiono nella Dashboard (**Pagamenti Ricorrenti**) e nelle **Previsioni**.
- Quando una rata **arriva a scadenza** viene **pagata in automatico** (vedi [§11.4](#114-pagamento-delle-rate-automatico-e-manuale)).

### Impatto al pagamento (a seconda del conto)

| Conto CoGe scelto | Conto economico | Cash flow |
|---|---|---|
| **40 – Costo** (es. affitto) | − Costi operativi ogni rata | − Uscita operativa |
| **20 – Passività** (es. rata senza interessi) | **Nessun impatto** | − Uscita finanziaria |

---

## 11.3 Creare un piano FINANZIAMENTO

**A cosa serve:** modellare un mutuo, un leasing o un prestito con il corretto split
capitale/interessi.

### Passo passo

1. **Spese ricorrenti → Nuovo piano** → **Tipo di piano: Finanziamento**.
2. **Nome del piano** (es. "Mutuo BPM 2026").
3. **Conti contabili:**
   - **Conto bancario**.
   - **Conto CoGe – quota capitale**: famiglia **20 – Passività** (riduce il debito a bilancio).
   - **Conto CoGe – quota interessi**: famiglia **60 – Onere finanziario**.
4. **Dettagli finanziamento:**
   - **Debito residuo iniziale** (il capitale da restituire).
   - **Tasso d'interesse annuo** (es. 3,5).
   - Scegli **come calcolare il piano**:

     | Modalità | Tu inserisci | Il sistema calcola |
     |---|---|---|
     | **Ho il numero di rate** (RATA) | Numero di rate | L'**importo** della rata costante |
     | **Ho l'importo della rata** (DURATA) | Importo rata | Il **numero** di rate necessarie |

5. Imposta **frequenza** e **giorno del mese**.
6. Verifica l'**Anteprima piano**: il sistema mostra rata per rata la scomposizione **interessi /
   capitale / debito residuo**. **Salva.**

### Regole

- Tutti i campi del finanziamento (debito, tasso, conti capitale e interessi) sono **obbligatori**.
- La rata deve essere **maggiore degli interessi del primo periodo**, altrimenti il debito non si
  ridurrebbe mai (il sistema lo impedisce).
- Nell'ammortamento alla francese gli **interessi calano** rata dopo rata e la **quota capitale
  cresce**; la somma (la rata) resta costante. L'ultima rata chiude esattamente il debito.

### Esempio numerico

> **€100.000**, **3,5%** annuo, **12 rate mensili**.

| # | Rata | Interessi | Capitale | Debito residuo |
|---|---|---|---|---|
| 1 | €8.490,67 | €291,67 | €8.199,00 | €91.801,00 |
| 2 | €8.490,67 | €267,78 | €8.222,89 | €83.578,11 |
| … | … | … | … | … |
| 12 | €8.490,67 | €24,07 | €8.251,87 | €0,00 |
| **Totale** | **€101.888,04** | **€1.888,04** | **€100.000,00** | — |

> **Sul conto economico dell'anno** pesano **solo €1.888,04** di oneri finanziari (gli interessi).
> I €100.000 di capitale **non sono un costo**.
> **Sul cash flow** escono tutti i €101.888,04 (capitale + interessi).

### Due movimenti per rata

Ogni volta che paghi una rata di finanziamento nascono **due movimenti**:

- **Quota capitale** → famiglia 20 (Passività): esce dalla cassa, **non tocca l'utile**, riduce il
  debito.
- **Quota interessi** → famiglia 60 (Onere finanziario): esce dalla cassa **e** pesa sull'utile
  (sotto l'EBIT).

---

## 11.4 Pagamento delle rate: automatico e manuale

Le rate di un piano **attivo** si pagano da sole, ma puoi anche anticiparle a mano.

### Pagamento automatico (alla scadenza)

**Ogni giorno** il sistema controlla le rate arrivate a scadenza e le **converte in automatico in
movimenti**, marcandole come pagate. Non devi fare nulla.

- Il movimento nasce con **data = data di scadenza della rata** e stato **Registrato** (quindi entra
  subito sia nel conto economico sia nel cash flow).
- Per un **finanziamento** vengono creati i **due movimenti** (quota capitale + quota interessi);
  per un **FLAT** un solo movimento.
- Vale solo per i piani in stato **attivo**: un piano annullato non genera più rate.

### Pagamento manuale (in anticipo)

Se vuoi registrare una rata **prima** della scadenza:

1. Apri il dettaglio del piano.
2. Individua la rata **PENDING** → **Paga**.
3. Conferma (stessi movimenti del caso automatico, ma con data di oggi).

**Cosa succede:** la rata passa a **Pagato** e l'**Avanzamento** del piano si aggiorna.

> Il dettaglio ti avvisa se il **saldo disponibile** sul conto non copre la rata
> ("Saldo negativo" / "Residuo non coperto").
>
> Se non vuoi che una rata venga pagata alla scadenza, gestiscila **prima** con **Salta**
> (Rimanda/Accorpa, vedi [§11.5](#115-saltare-una-rata-rimanda-o-accorpa)) o annulla il piano.

---

## 11.5 Saltare una rata: Rimanda o Accorpa

**A cosa serve:** gestire un mese in cui non paghi una rata. Premi **Salta** e scegli la modalità:

| Modalità | Cosa fa | Note sulle quote (finanziamento) |
|---|---|---|
| **Rimanda** | La rata viene saltata e **aggiunta in fondo** al piano (il piano si allunga di una rata). | Le quote capitale/interessi vengono **riportate** sulla rata aggiunta. |
| **Accorpa** | L'importo della rata saltata viene **sommato alla rata successiva**. | Lo split capitale/interessi della rata successiva viene **ricalcolato**. |

---

## 11.6 Liquidazione anticipata (estinguere il piano)

**A cosa serve:** chiudere in anticipo tutte le rate residue con un unico pagamento.

1. Dal dettaglio → **Liquida piano con maxi rata**.
2. Aggiungi eventuali **note** di estinzione e conferma.

**Cosa succede:** tutte le rate ancora PENDING vengono pagate con **un unico movimento** (per i
finanziamenti, con il relativo split capitale/interessi). Le rate già pagate restano nello storico.

---

## 11.7 Annullare un piano

Dal dettaglio → **Annulla piano**: tutte le rate ancora **PENDING** vengono marcate come annullate
(CANCELLED). **Le rate già pagate restano nello storico movimenti** — non si toccano.

---

## Errori comuni / attenzione

- **Mettere un finanziamento come FLAT** su un conto di costo: faresti pesare tutto il capitale
  sull'utile, gonfiando le perdite. Per i mutui/leasing usa sempre **Finanziamento**.
- **Sbagliare i due conti del finanziamento:** il conto capitale dev'essere **20 – Passività**, il
  conto interessi **60 – Onere finanziario**. Invertiti, il conto economico è falsato.
- **Le rate si pagano da sole alla scadenza:** se un mese non vuoi pagarne una, intervieni
  **prima** con **Salta** (Rimanda/Accorpa) o annulla il piano; altrimenti verrà contabilizzata in
  automatico.

---

[← 12. Import & smistamento](06-import-e-smistamento.md) · [Indice](README.md) · **Prossimo:** [10. Eventi →](04-eventi.md)
