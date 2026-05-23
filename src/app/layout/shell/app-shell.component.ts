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
import { MatListModule } from '@angular/material/list';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatMenuModule } from '@angular/material/menu';
import { MatBadgeModule } from '@angular/material/badge';
import { MatDividerModule } from '@angular/material/divider';
import { MatTooltipModule } from '@angular/material/tooltip';
import { HttpClient } from '@angular/common/http';
import { AuthService } from '../../core/auth/auth.service';
import { BuService } from '../../core/services/bu.service';
import { BusinessUnitDTO } from '../../core/models/anagrafica.models';
import { MovimentoDTO } from '../../core/models/movimenti.models';
import { ScadenzeImminentiDTO } from '../../core/models/dashboard.models';
import { API_PATHS } from '../../core/constants/api-paths';
import { environment } from '../../../environments/environment';

const SIDENAV_KEY = 'agos_sidenav_open';

interface NavItem {
  label: string;
  icon: string;
  route?: string;
  adminOnly: boolean;
}

const NAV_ITEMS: NavItem[] = [
  { label: 'Dashboard',        icon: 'dashboard',              route: '/dashboard',         adminOnly: false },
  { label: 'Movimenti',        icon: 'swap_horiz',             route: '/movimenti',         adminOnly: true  },
  { label: 'Spese Ricorrenti', icon: 'repeat',                 route: '/spese-ricorrenti',  adminOnly: true  },
  { label: 'Cassa',            icon: 'account_balance_wallet', route: '/cassa',             adminOnly: true  },
  { label: 'Forecasting',      icon: 'trending_up',            route: '/forecasting',       adminOnly: true  },
];

const NAV_ITEMS_BOTTOM: NavItem[] = [
  { label: 'Anagrafica',   icon: 'people',     route: '/anagrafica', adminOnly: true  },
  { label: 'Reporting',    icon: 'bar_chart',  route: '/reporting',  adminOnly: true  },
  { label: 'Eventi',       icon: 'event',      route: '/eventi',     adminOnly: false },
];

@Component({
  selector: 'app-shell',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    MatSidenavModule,
    MatToolbarModule,
    MatListModule,
    MatIconModule,
    MatButtonModule,
    MatMenuModule,
    MatBadgeModule,
    MatDividerModule,
    MatTooltipModule,
  ],
  templateUrl: './app-shell.component.html',
  styleUrl: './app-shell.component.scss',
})
export class AppShellComponent implements OnInit {
  private readonly authService = inject(AuthService);
  private readonly buService = inject(BuService);
  private readonly http = inject(HttpClient);

  readonly user = this.authService.user;
  readonly isAdmin = this.authService.isAdmin;

  readonly sidenavOpen = signal<boolean>(
    sessionStorage.getItem(SIDENAV_KEY) !== 'false'
  );

  readonly businessUnits = signal<BusinessUnitDTO[]>([]);
  readonly nonRiconciliatiCount = signal<number>(0);
  readonly scadenzeCount = signal<number>(0);

  readonly visibleNavItems = computed(() =>
    NAV_ITEMS.filter(item => !item.adminOnly || this.isAdmin())
  );
  readonly visibleNavItemsBottom = computed(() =>
    NAV_ITEMS_BOTTOM.filter(item => !item.adminOnly || this.isAdmin())
  );

  constructor() {
    effect(() => {
      sessionStorage.setItem(SIDENAV_KEY, String(this.sidenavOpen()));
    });
  }

  ngOnInit(): void {
    this.buService.getAll().subscribe(units => this.businessUnits.set(units));

    if (this.isAdmin()) {
      this.loadNonRiconciliati();
      this.loadScadenze();
    }
  }

  toggleSidenav(): void {
    this.sidenavOpen.update(v => !v);
  }

  logout(): void {
    this.authService.logout();
  }

  private loadNonRiconciliati(): void {
    this.http
      .get<MovimentoDTO[]>(
        environment.apiBaseUrl + API_PATHS.MOVIMENTI.NON_RICONCILIATI
      )
      .subscribe({
        next: list => this.nonRiconciliatiCount.set(list.length),
        error: () => {},
      });
  }

  private loadScadenze(): void {
    this.http
      .get<ScadenzeImminentiDTO>(
        environment.apiBaseUrl + API_PATHS.DASHBOARD.SCADENZE_IMMINENTI,
        { params: { period: 'MTD' } }
      )
      .subscribe({
        next: data => {
          const all = [...data.eventi, ...data.rateRicorrenti];
          this.scadenzeCount.set(all.filter(s => s.urgenza === 'ALTA').length);
        },
        error: () => {},
      });
  }
}
