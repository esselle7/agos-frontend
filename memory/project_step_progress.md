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
