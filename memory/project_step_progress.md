---
name: Avanzamento step frontend Agostinelli
description: Traccia quali step del frontend Angular sono stati completati
type: project
---

## Step completati

### Step 01 — Modelli, config, costanti
- Modelli TypeScript per tutti i DTO backend
- Costanti API paths, ruoli
- Environment files

### Step 02 — Auth layer
- AuthService (signals, token storage in memory)
- JwtInterceptor (con refresh token e race-condition guard)
- Guards: AuthGuard, NoAuthGuard, RoleGuard
- LoginComponent
- AuthCallbackComponent
- AppShellComponent (layout con sidenav)

### Step 03 — Servizi API
- BuService, ContiService, CategorieService, FornitoriService
- CassaService, EventiService, MovimentiService
- DashboardService, ReportingService
- CacheService (TTL-based)

### Step 04 — Componenti shared (completato 2026-04-25)
Tutti i file in `src/app/shared/`:
- **Pipes**: EuroPipe, BuLabelPipe
- **StatCardComponent** — KPI card con skeleton loading e delta colorato
- **BadgeComponent** — badge colorato da hex, pill/flat, sm/md
- **EmptyStateComponent** — empty state con icona, titolo, azione opzionale
- **SkeletonLoaderComponent** — tipi: card, table, stat, text
- **ConfirmDialogComponent** — MatDialog con danger mode
- **DateRangePickerComponent** — chip MTD/QTD/YTD/CUSTOM + datepicker
- **CurrencyInputComponent** — ControlValueAccessor con formato italiano (€)
- **BuSelectorComponent** — ControlValueAccessor MatSelect con puntino colorato
- **DataTableComponent** — MatTable + paginazione + skeleton + empty state
- Barrel exports in `components/index.ts` e `pipes/index.ts`

**Why:** Step 4 builds the reusable UI library that all feature modules depend on.
**How to apply:** Feature components import from `shared/components` and `shared/pipes` by name.

### Step 05 — Dashboard (completato 2026-04-25)

File creati in `src/app/features/dashboard/` e `src/app/core/services/`:

- **GlobalPeriodService** — signal condiviso (period/from/to) tra topbar e dashboard
- **DashboardComponent** (ADMIN) — KPI finanziari (4 StatCard) + KPI economici (3 StatCard) + grafico linee Andamento Mensile + grafico barre orizzontali Fatturato per BU + tabella Ultime Transazioni + lista Scadenze Imminenti; forkJoin con catchError individuale; effect per ricarico al cambio periodo
- **EventiDashboardComponent** (DIPENDENTE) — 4 StatCard eventi + tabella ultimi 10 eventi + link rapidi; date filter semplificato (from/to)
- **DashboardRouterComponent** — wrapper che legge `auth.isAdmin()` e carica il componente corretto
- **app.config.ts** aggiornato — aggiunto `provideCharts(withDefaultRegisterables())` per ng2-charts
- **app.routes.ts** aggiornato — /dashboard ora carica DashboardRouterComponent
- **AppShellComponent** aggiornato — period-placeholder sostituito con `<agos-date-range-picker>` collegato a GlobalPeriodService (solo per ADMIN)

**Why:** Step 5 implementa la dashboard principale con visualizzazione KPI, grafici, transazioni recenti e routing per ruolo.
**How to apply:** ng2-charts richiede `provideCharts()` in app.config; i grafici usano `BaseChartDirective` come standalone directive.

### Step 06 — Modulo Movimenti (completato 2026-04-25)

File creati in `src/app/features/movimenti/` e `src/app/core/constants/`:

- **metodi-pagamento.ts** — costanti hardcodate (1=POS BPM … 8=Alveare)
- **movimenti.routes.ts** aggiornato — route: `''` lista, `nuovo` form, `:id` dettaglio, `:id/modifica` form edit
- **MovimentiListComponent** — mat-table diretta (non DataTableComponent), filtri: search/tipo/stato/from/to; segnali; paginazione server-side; bottoni header: Nuovo, Esporta CSV, Riconciliazione, Import bulk; eliminazione con ConfirmDialog; badge colorati per tipo/stato/fonte/BU
- **MovimentiFormComponent** — ReactiveForm tipizzato; 5 sezioni (dati base, classificazione, evento toggle, date avanzate toggle, dettagli espandibile); BuSelectorComponent + CurrencyInputComponent con formControlName; cascade categorie padre→figlio; autocomplete fornitore/evento con debounce 300ms; calcolo IVA live; MatSlideToggle con `[checked]/(change)` (no ngModel); MatExpansionPanel per sezione 5; gestione errori 400 campo per campo
- **MovimentoDetailComponent** — sola lettura con skeleton, 7 sezioni, lookup BU/conto/metodo da servizi, link all'evento collegato
- **RiconciliazioneDialogComponent** — match automatico + lista non riconciliati con paginazione locale + riconciliazione manuale singola con note
- **ImportDialogComponent** — textarea JSON, validazione, POST /api/movimenti/bulk, BulkImportResponse con dettaglio errori

**Why:** Step 6 implementa il modulo core del gestionale — tutti i movimenti economico-finanziari.
**How to apply:** `MatSlideToggle` richiede `MatSlideToggleModule` nell'imports; usare `[checked]/(change)` invece di `[(ngModel)]` per evitare dipendenza da FormsModule. Skeleton loader supporta solo `card|table|stat|text` (non `form`).

### Step 07 — Modulo Eventi (completato 2026-05-02)

File creati in `src/app/features/eventi/`:

- **eventi.routes.ts** — route `''` (tab lista+calendario) + `:id` (dettaglio)
- **EventiComponent** — tab wrapper Lista/Calendario; bottone Nuovo Evento; refreshTrigger signal condiviso con i figli
- **EventiListComponent** — card list (NON tabella) con chip-group stato colorati, filtri date, search debounce 300ms, paginazione server-side; progress bar pagamento per card; ruoli ADMIN/DIPENDENTE
- **EventiCalendarioComponent** — calendario mensile custom con CSS Grid 7 colonne, navigazione prev/next/oggi, event chips per giorno (coloreStato), tooltip, click su giorno vuoto apre form con data precompilata
- **EventoFormDialogComponent** — form creazione/modifica; lazy-loaded da dialog.open tramite import() dinamico
- **EventoDetailComponent** — 5 sezioni: riepilogo finanziario (progress bar + 4 KPI), timeline pagamenti, dati contatto, info evento, partecipanti (solo ADMIN); bottoni transizione stato dinamici per stato corrente
- **PagamentoFormDialogComponent** — MatButtonToggle CAPARRA/ACCONTO/SALDO/RIMBORSO; precompila importo con residuo se SALDO; gestisce header `X-Suggest-Completamento` aprendo ConfirmDialog per completare l'evento
- **CambioStatoDialogComponent** — messaggi contestuali per transizione; textarea noteAnnullamento obbligatoria se stato=ANNULLATO

**Correzioni importanti scoperte:**
- Pipe `EuroPipe` ha name `'euro'` (non `agosEuro`)
- `SkeletonLoaderComponent` accetta input `rows` (non `lines`), nessun `height`
- `MetodoPagamentoDTO` ha campo `descrizione` (non `nome`)
- Lazy-load dialogs con `import('./dialog.component')` evita circular imports
- Aggiungere `SlicePipe`, `DecimalPipe` da `@angular/common` quando usati nel template

**Why:** Step 7 implementa il modulo eventi/cerimonie con ciclo di vita PREVENTIVO→CONFERMATO→COMPLETATO.
**How to apply:** I dialog sono caricati lazy (`import('./x.component')`) dal componente che li apre per evitare circular import.

### Step 08 — Cassa & Anagrafica (completato 2026-05-02)

File creati:

- **CassaComponent** (`features/cassa/`) — saldo prominente con skeleton loader, form rapido inline (MatButtonToggle prelievo/versamento + CurrencyInput + datepicker + select conto), filtri data, tabella paginata server-side con badge tipo/stato, lazy dialog modifica, ConfirmDialog elimina (solo ADMIN); nota quadratura in fondo
- **CassaEditDialogComponent** — form modifica movimento cassa (stessi campi del form rapido)
- **FornitoriComponent** (`features/anagrafica/fornitori/`) — lista paginata con search debounce 300ms; tabella: ragioneSociale, alias, piva (con `$any()` cast per campi non in FornitoreSummaryDTO), buDefault badge, n.alias; azioni: dettaglio, modifica, elimina
- **FornitoreDetailDialogComponent** — mostra FornitoreDTO completo; sezione alias con lista pattern/matchType colorati (EXACT=blu, CONTAINS=verde, REGEX=viola); form inline aggiungi alias (POST /fornitori/:id/alias); elimina con ConfirmDialog
- **FornitoreFormDialogComponent** — ReactiveForm creazione/modifica; gestisce errore 409 P.IVA duplicata; usa BuSelectorComponent per buDefaultId
- **CategorieComponent** (`features/anagrafica/categorie/`) — MatTree nested con NestedTreeControl; BuSelectorComponent + MatButtonToggle ENTRATA/USCITA; azioni nodo: modifica, aggiungi sottocategoria; lazy dialog form; invalidate cache dopo write
- **CategoriaFormDialogComponent** — form nome+ordinamento; mostra contesto (BU, tipo, parentNome) come label read-only; POST o PUT in base a categoriaId presente
- **anagrafica.routes.ts** aggiornato — route `fornitori`, `categorie`, redirect `''→fornitori`

**Correzioni scoperte:**
- `BadgeComponent` usa input `[text]` (non `[label]`)
- `EmptyStateComponent` usa output `(action)` (non `(actionClick)`)
- `FornitoreSummaryDTO` ha solo `id`+`ragioneSociale`; campi extra (alias, piva, buDefaultId, aliasList) richiedono `$any(row)` nei template
- MatTree nested usa `MatTreeNestedDataSource` + `NestedTreeControl` + `matTreeNodeOutlet` per render figli

**Why:** Step 8 implementa cassa fisica e anagrafica (fornitori + categorie piano dei conti).
**How to apply:** MatTree nested richiede `mat-nested-tree-node` con `*matTreeNodeDef="let node; when: hasChildren"` e `ng-container matTreeNodeOutlet` per i figli; il flat tree non funziona con struttura nestata ricorsiva.
