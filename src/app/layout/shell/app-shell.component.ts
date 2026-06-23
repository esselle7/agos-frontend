import {
  Component,
  OnInit,
  inject,
  signal,
  computed,
  effect,
} from '@angular/core';
import { RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatBadgeModule } from '@angular/material/badge';
import { MatTooltipModule } from '@angular/material/tooltip';
import { HttpClient } from '@angular/common/http';
import { AuthService } from '../../core/auth/auth.service';
import { BuService } from '../../core/services/bu.service';
import { ThemeService } from '../../core/services/theme.service';
import { BusinessUnitDTO } from '../../core/models/anagrafica.models';
import { ScadenzeImminentiDTO } from '../../core/models/dashboard.models';
import { API_PATHS } from '../../core/constants/api-paths';
import { environment } from '../../../environments/environment';

const SIDENAV_KEY = 'agos_sidenav_open';
const BU_KEY = 'agos_bu_expanded';

interface NavItem {
  label: string;
  icon: string;
  route: string;
  adminOnly: boolean;
  /** Contatore opzionale stile "notifica non letta" (es. scadenze scadute). */
  badge?: () => number;
}

interface NavSection {
  label: string;
  items: NavItem[];
}

/**
 * Navigazione raggruppata per area di lavoro (rotte invariate: nessun link rotto).
 * Le etichette sono in sentence case e i nomi resi più parlanti ("Previsioni" al posto
 * di "Forecasting"); le icone scelte tra quelle del font Material Icons classico in uso.
 */
const NAV_SECTIONS: NavSection[] = [
  {
    label: 'Panoramica',
    items: [
      { label: 'Dashboard',   icon: 'dashboard',     route: '/dashboard',   adminOnly: false },
      { label: 'Scadenzario', icon: 'event_upcoming', route: '/scadenzario', adminOnly: true },
    ],
  },
  {
    label: 'Contabilità',
    items: [
      { label: 'Movimenti',           icon: 'receipt_long',            route: '/movimenti',        adminOnly: true },
      { label: 'Import & smistamento', icon: 'move_to_inbox',           route: '/import',           adminOnly: true },
      // Cassa temporaneamente disabilitata (nascosta da nav + rotte); codice mantenuto.
      // { label: 'Cassa',               icon: 'account_balance_wallet',  route: '/cassa',            adminOnly: true },
      { label: 'Spese ricorrenti',    icon: 'event_repeat',            route: '/spese-ricorrenti', adminOnly: true },
    ],
  },
  {
    label: 'Gestione',
    items: [
      { label: 'Eventi',     icon: 'celebration', route: '/eventi',     adminOnly: false },
      { label: 'Anagrafica', icon: 'groups',      route: '/anagrafica', adminOnly: true },
      { label: 'Keyword',    icon: 'label',       route: '/keyword',    adminOnly: true },
    ],
  },
  {
    label: 'Analisi',
    items: [
      { label: 'Reporting',  icon: 'assessment',  route: '/reporting',   adminOnly: true },
      { label: 'Previsioni', icon: 'query_stats', route: '/forecasting', adminOnly: true },
    ],
  },
];

@Component({
  selector: 'app-shell',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    MatSidenavModule,
    MatToolbarModule,
    MatIconModule,
    MatButtonModule,
    MatBadgeModule,
    MatTooltipModule,
  ],
  templateUrl: './app-shell.component.html',
  styleUrl: './app-shell.component.scss',
})
export class AppShellComponent implements OnInit {
  private readonly authService = inject(AuthService);
  private readonly buService = inject(BuService);
  private readonly http = inject(HttpClient);
  private readonly themeService = inject(ThemeService);

  readonly user = this.authService.user;
  readonly isAdmin = this.authService.isAdmin;
  readonly isDarkTheme = this.themeService.theme;

  readonly sidenavOpen = signal<boolean>(
    sessionStorage.getItem(SIDENAV_KEY) !== 'false'
  );

  /** "Dettaglio BU": chiuso di default per non occupare spazio verticale (stato ricordato). */
  readonly buExpanded = signal<boolean>(
    sessionStorage.getItem(BU_KEY) === 'true'
  );

  readonly businessUnits = signal<BusinessUnitDTO[]>([]);
  readonly scadenzeCount = signal<number>(0);

  readonly visibleSections = computed<NavSection[]>(() =>
    NAV_SECTIONS
      .map(s => ({
        ...s,
        items: s.items
          .filter(i => !i.adminOnly || this.isAdmin())
          // Aggancia il contatore "scaduti" alla voce Scadenzario (badge stile notifica).
          .map(i => i.route === '/scadenzario' ? { ...i, badge: () => this.scadenzeCount() } : i),
      }))
      .filter(s => s.items.length > 0)
  );

  /** Iniziale per l'avatar del profilo (fallback '?' se il nome non è disponibile). */
  readonly userInitial = computed(() =>
    this.user()?.nome?.trim().charAt(0).toUpperCase() || '?'
  );

  readonly roleLabel = computed(() =>
    this.isAdmin() ? 'Amministratore' : 'Dipendente'
  );

  constructor() {
    effect(() => sessionStorage.setItem(SIDENAV_KEY, String(this.sidenavOpen())));
    effect(() => sessionStorage.setItem(BU_KEY, String(this.buExpanded())));
  }

  ngOnInit(): void {
    this.buService.getAll().subscribe(units => this.businessUnits.set(units));
    if (this.isAdmin()) {
      this.loadScadenze();
    }
  }

  /** Tooltip della voce (barra compressa): aggiunge il conteggio scaduti se presente. */
  navTooltip(item: NavItem): string {
    const n = item.badge?.() ?? 0;
    return n > 0 ? `${item.label} · ${n} scadute` : item.label;
  }

  toggleSidenav(): void {
    this.sidenavOpen.update(v => !v);
  }

  toggleBu(): void {
    this.buExpanded.update(v => !v);
  }

  toggleTheme(): void {
    this.themeService.toggle();
  }

  logout(): void {
    this.authService.logout();
  }

  /**
   * Conta le scadenze GIÀ SCADUTE (non semplicemente urgenti): è il numero mostrato come
   * "notifica non letta" accanto a Scadenzario. Usa un periodo ampio (YTD) per non perdere
   * scaduti fuori dal mese corrente. Scaduto = scadenza passata e ancora non saldato/incassato.
   */
  private loadScadenze(): void {
    const oggi = new Date().toISOString().slice(0, 10);
    this.http
      .get<ScadenzeImminentiDTO>(
        environment.apiBaseUrl + API_PATHS.DASHBOARD.SCADENZE_IMMINENTI,
        { params: { period: 'YTD' } }
      )
      .subscribe({
        next: data => {
          const movScaduti = [
            ...(data.usciteDaLiquidare ?? []),
            ...(data.entrateDaRicevere ?? []),
          ].filter(m => m.ggAllaScadenza < 0).length;
          const eventiRateScaduti = [...data.eventi, ...data.rateRicorrenti]
            .filter(s => s.stato !== 'PAID' && s.dataScadenza < oggi).length;
          this.scadenzeCount.set(movScaduti + eventiRateScaduti);
        },
        error: () => {},
      });
  }
}
