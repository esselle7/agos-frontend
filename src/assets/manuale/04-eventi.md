# 10. Eventi

> Menu: **Gestione → Eventi**. È l'unica sezione (oltre alla Dashboard) che vedono anche i
> dipendenti — ma loro vedono solo i propri eventi.

Il modulo Eventi gestisce matrimoni, banchetti e cerimonie (Business Unit **BU2 – Cerimonie ed
Eventi**) dal preventivo fino al saldo. La sua particolarità è la **logica caparra/acconto/saldo**
e il fatto che i ricavi sono di **competenza della data dell'evento**, anche se incassati prima.

> **Concetto chiave.** Per un evento il ricavo "matura" il giorno della cerimonia. Quindi una
> caparra incassata a marzo per un matrimonio di agosto pesa sul **conto economico di agosto**, ma
> sul **cash flow di marzo** (quando l'hai incassata davvero). È il [modello a tre date](01-capire-il-gestionale.md#2-il-modello-a-tre-date)
> applicato agli eventi.

---

## 10.1 Le viste degli eventi

Aprendo **Eventi** trovi tre schede:

- **Tutti gli eventi** — la lista completa (solo amministratore).
- **I Miei** — gli eventi assegnati all'utente collegato.
- **Calendario** — la vista a calendario per data.

Da qui crei un nuovo evento con **Nuovo** e apri il **dettaglio** cliccando una riga.

---

## 10.2 Il ciclo di vita di un evento

```
   PREVENTIVATO ──(prima caparra o acconto)──► CONFERMATO ──(residuo azzerato)──► SALDATO
        │
        └──────────────(annullamento, solo ADMIN)──────────────► ANNULLATO
```

| Stato | Significato |
|---|---|
| **Preventivato** | Bozza: hai fatto un preventivo, il cliente non ha ancora versato nulla. |
| **Confermato** | Il cliente ha versato la prima caparra/acconto: l'evento è confermato. |
| **Saldato** | È stato incassato tutto (residuo ≤ 1 centesimo). Stato **finale**. |
| **Annullato** | Evento annullato (solo amministratore, con nota obbligatoria). |

Le transizioni avvengono **in automatico** quando registri i pagamenti, oppure manualmente dal
dialog di cambio stato (con le stesse regole).

---

## 10.3 Creare un evento (e il preventivo)

**A cosa serve:** aprire la scheda di una nuova cerimonia con i dati del cliente e il preventivo.

### Passo passo

1. **Eventi → Nuovo.**
2. Compila i dati:
   - **Nome evento** *(obbligatorio)* — es. "Matrimonio Rossi-Bianchi".
   - **Tipo evento** *(obbligatorio)* — matrimonio, battesimo, banchetto aziendale…
   - **Data evento** *(obbligatorio)* — è la data di **competenza** dei ricavi.
   - **Data preventivo** — la data in cui hai formulato l'offerta.
   - **Totale ospiti** *(obbligatorio)* e **di cui bambini**.
   - **Nome contatto** *(obbligatorio)*, **Email**, **Telefono**.
   - **Allergie e intolleranze**, **Note**.
3. Imposta il **Preventivo totale** (l'importo concordato): serve per confermare e saldare.
4. **Salva.** L'evento nasce in stato **Preventivato**.

### Regole

- Per passare a **Confermato** serve un **preventivo totale > 0**.
- Puoi caricare un **menù in PDF** dalla scheda dell'evento.

---

## 10.4 Registrare un pagamento (caparra / acconto / saldo / penale)

**A cosa serve:** registrare i soldi versati dal cliente. Ogni pagamento crea un **movimento di
entrata** collegato all'evento.

### Passo passo

1. Apri l'evento → riquadro **Storico pagamenti** → **Registra Pagamento**.
2. Scegli il **Tipo di pagamento**:

   | Tipo | Quando | Effetto sullo stato |
   |---|---|---|
   | **Caparra** | Prima conferma | Preventivato → **Confermato** |
   | **Acconto** | Pagamento intermedio | Preventivato → **Confermato** (se primo versamento) |
   | **Saldo** | Chiusura totale | Se azzera il residuo → **Saldato** |
   | **Penale** | Da inadempienza | Solo su evento **Annullato** |

3. Inserisci **Importo**, **Data pagamento** *(la data finanziaria reale)*, **Conto di accredito**
   e **Metodo di pagamento**. Eventuali **Note**.
4. **Registra.**

> Per il **Saldo** il sistema **pre-compila l'importo** con il residuo da incassare, così chiudi
> con un clic.

### Campi e regole (importanti)

- **Una sola Caparra, un solo Acconto, un solo Saldo per evento.** Se uno di questi è già presente,
  il tipo non è più selezionabile.
- La **Penale** è registrabile **solo su un evento annullato** (è la penale di recesso).
- L'importo di Caparra/Acconto/Saldo **non può superare il residuo** da incassare.
- Il **rimborso** al cliente (es. restituzione caparra su annullamento) non è un pulsante di
  questa schermata: si gestisce come movimento con importo negativo / nei flussi dedicati.

### Cosa succede dopo

- Nasce un **movimento di entrata** con:
  - *data movimento (competenza)* = **data dell'evento**;
  - *data finanziaria* = **data del pagamento**.
- Il riquadro **Riepilogo Finanziario** dell'evento aggiorna **Incassato**, **Residuo** e
  **Profitto**.
- Lo **stato** dell'evento avanza in automatico se le condizioni sono soddisfatte.

### Esempio concreto

> Matrimonio il **14 agosto 2026**, preventivo **€10.000**.
> - Caparra **€2.000** incassata il **10 marzo** → evento *Confermato*.
> - Acconto **€3.000** il **20 giugno**.
> - Saldo **€5.000** il **15 agosto** → residuo a zero → evento *Saldato*.
>
> **Conto economico:** tutti i €10.000 di ricavo sono in **agosto 2026** (mese dell'evento).
> **Cash flow:** +€2.000 a marzo, +€3.000 a giugno, +€5.000 ad agosto (mesi reali degli incassi).

---

## 10.5 Cambiare stato manualmente

Dal dettaglio puoi forzare un cambio di stato (entro le regole del ciclo di vita):

- **→ Confermato:** richiede preventivo totale > 0.
- **→ Saldato:** richiede residuo ≤ 1 centesimo.
- **→ Annullato:** **solo amministratore**, con **nota di annullamento obbligatoria**.
- Un evento **Saldato è terminale**: non si modifica più.

---

## 10.6 Imputare i costi diretti

**A cosa serve:** registrare i costi sostenuti *specificamente* per quell'evento (fornitori
esterni, extra), per misurarne la redditività reale.

### Passo passo

1. Apri l'evento → riquadro **Costi diretti** → aggiungi una voce.
2. Indica descrizione, importo e il **Conto CoGe** (famiglia **40 – Costo operativo**).
3. **Salva.**

**Cosa succede:** nasce un **movimento di uscita** collegato all'evento (competenza = data
evento), e il costo si somma ai **costi diretti** dell'evento. Il **Profitto** nel Riepilogo
Finanziario si aggiorna di conseguenza (Incassato − Costi diretti).

---

## 10.7 Partecipanti e ore del personale

Nel riquadro **Personale impiegato / Partecipanti** puoi:

- **assegnare dipendenti** all'evento;
- **allocare le ore** lavorate da ciascuno.

Le ore allocate alimentano il costo del personale imputato all'evento, contribuendo al calcolo del
profitto e al monitoraggio consuntivo.

---

## 10.8 Preventivo vs consuntivo (monitoraggio)

L'evento distingue tra ciò che avevi **preventivato** e ciò che è **realmente** accaduto:

- Il **Preventivo totale** è il ricavo atteso.
- Il **tracking preventivo** consente di annotare le voci attese di **affitto** e **catering**
  (una sola voce per tipo) per confrontarle con il consuntivo. *Sono dati di monitoraggio: non
  generano movimenti contabili.*
- Il riquadro **Riepilogo Finanziario** mostra **Preventivato**, **Incassato**, **Residuo** e
  **Profitto** sempre aggiornati.

Così puoi capire, evento per evento, se hai rispettato il budget e quanto hai effettivamente
guadagnato.

---

## Errori comuni / attenzione

- **Registrare la caparra come movimento manuale invece che dal modulo Eventi.** Falla sempre da
  qui: solo così l'incasso si collega all'evento e i totali (incassato/residuo/profitto) tornano.
- **Dimenticare il preventivo totale.** Senza, non puoi confermare né saldare.
- **Voler annullare da dipendente.** L'annullamento è riservato all'amministratore e richiede la
  nota.

---

[← 11. Spese ricorrenti](05-spese-ricorrenti.md) · [Indice](README.md) · **Prossimo:** [19. Situazione iniziale →](12-situazione-iniziale.md)
