# Analisi effort — Tema scuro (dark mode)

> ✅ **IMPLEMENTATO il 2026-06-22.** Questo documento resta come storico dell'analisi.
>
> Come funziona ora:
> - Toggle nel menu **Impostazioni** della sidebar (sole/luna): "Tema scuro" / "Tema chiaro".
> - `ThemeService` (`core/services/theme.service.ts`): signal, scrive `data-theme` su `<html>`,
>   persiste in `localStorage` (`agos_theme`), default da `prefers-color-scheme`. Aggiorna anche i
>   default Chart.js e ridisegna i grafici vivi.
> - Token dark in `styles.scss` sotto `html[data-theme="dark"]` + tema Material scuro
>   (`mat.all-component-colors($agos-dark-theme)`) scoping sullo stesso selettore → raggiunge anche
>   gli overlay CDK (dialog/menu) che montano in `<body>`.
> - Anti-FOUC: script inline in `index.html` imposta `data-theme` prima del render.
> - Stat-card, chip status, sistema colori keyword (`--kw-*`) e tinte neutre resi theme-aware.

---

> Analisi originale (solo studio). Stato repo: 2026-06-21.

## ⓘ Aggiornamento 2026-06-22 — Fase 0 (de-drift) eseguita

La **Fase 0 (prerequisito)** descritta in fondo è stata completata:
- **0** colori neutri/bianchi hardcoded residui nelle `.scss` (prima: 17 file con `#fff`, ~154 hex chiari, grigi vari).
- Bianco diviso correttamente: `color:#fff` → `--on-accent` (resta chiaro in dark), sfondi `#fff` → `--card`.
- Aggiunti token neutri dark-ready: `--surface-sunken`, `--border-soft`, `--text-faint`, `--on-accent`.
- ~862 usi di `var(--token)` nelle scss; restano hex solo in **17 file** = palette **intenzionali** (tipi keyword `--kw-*`, famiglie status danger/success/warning, colori serie grafici) — da gestire come token semantici/tinte in Fase 1, non sono drift.
- Anche i colori inline statici nei template tokenizzati.

**Nuova stima residua per il dark mode vero e proprio: ~1,5–2 giornate** (token set dark + Material dark + toggle service + grafici + QA). Le voci sotto restano valide come riferimento.

---

## Punto di partenza (cosa aiuta / cosa ostacola)

**A favore**
- Esiste già un layer di **design token** in `src/styles.scss` (`:root { --primary, --surface, --card, --border, --text-*, --shadow-*, --tint-* … }`). Tutto ciò che usa `var(--…)` diventa dark "gratis" ridefinendo i token sotto un selettore `html[data-theme="dark"]`.
- Tema Material configurato in modo pulito (M2, `mat.m2-define-light-theme`): aggiungere un `mat.m2-define-dark-theme` e applicarne i *color* sotto la classe dark è la strada standard.
- Stato sidenav già persistito in `sessionStorage` → stesso pattern riutilizzabile per la preferenza tema.

**Contro (il grosso del lavoro)** — drift di colori hardcoded che NON seguono i token:
| Cosa | Quantità | Impatto in dark |
|---|---|---|
| File `.scss` componenti | 42 | superficie totale da verificare |
| File con `#fff` / `white` hardcoded | 17 | restano bianchi → "card accecanti" su sfondo scuro |
| Occorrenze hex chiari (`#e…`/`#f…`) | ~154 | sfondi/bordi chiari che non si invertono |
| `rgba(0,0,0,…)` (ombre/overlay) | 30 | ombre nere invisibili/sbagliate su scuro |
| `style="color:…"` inline nei template | 15 | da spostare su classi/token |
| File `.ts` con mappe colore (hex) | 25 | badge/stati/**grafici** |
| Componenti grafici (Chart.js) | 5 | Chart.js non legge le CSS var → serve re-theming via JS |

## Stima effort

1. **Set di token dark** — ridefinire i token sotto `html[data-theme="dark"]` (sfondi, testo, bordi, ombre più chiare, tinte). ~0,5 g.
2. **Material dark theme** — definire il tema scuro e includere `mat.all-component-colors($dark)` scoping sotto la classe dark. Attenzione: gli **overlay CDK** (dialog, menu, tooltip, select) montano su `<body>`, quindi la classe dark va su `<html>`/`<body>`, non sul root dell'app. ~0,5–1 g.
3. **De-drift colori hardcoded** (il pezzo più grosso): convertire i ~154 hex chiari + 17 file con bianco + 30 ombre nere in token. Lavoro per-file + QA visiva su ~42 componenti. **~1,5–2 g.** *(beneficia anche il tema chiaro: più coerenza)*
4. **Grafici (Chart.js, 5 componenti + ~25 mappe TS)** — leggere i colori da `getComputedStyle` al cambio tema e ridisegnare, oppure mantenere una palette JS per-tema. ~0,5–1 g.
5. **Toggle + persistenza** — theme service che scrive `data-theme` su `<html>`, salva in `localStorage`, default da `prefers-color-scheme`; voce nel menu Impostazioni della sidebar. ~0,25 g.
6. **QA finale** su tutte le pagine, dialog, grafici, stati hover/focus + ricontrollo contrasti WCAG. ~1 g.

**Totale realistico: ~4–5 giornate** per un dark mode rifinito.
Di cui **~50–60% è de-drift** dei colori hardcoded — lavoro che migliora anche il tema chiaro.

## Raccomandazione (approccio a fasi)

- **Fase 0 (prerequisito):** completare la tokenizzazione dei colori hardcoded residui (~1,5 g). Migliora subito la coerenza in chiaro e rende il dark quasi "a costo zero".
- **Fase 1:** token dark + Material dark + toggle service (~1 g).
- **Fase 2:** grafici + QA completa (~1 g).

Dopo la Fase 0, il dark mode vero e proprio scende a **~1,5–2 g**.

## Rischi principali
- Overlay CDK (dialog/menu) da temare via classe su `<body>` o `overlayContainer`.
- Chart.js da ri-renderizzare al cambio tema (non eredita le CSS var).
- Contrasto: i token semantici attuali (success/warning/danger) sono tarati per sfondo chiaro → servono varianti più luminose in dark.
