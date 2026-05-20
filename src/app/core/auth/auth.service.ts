import { DestroyRef, Injectable, computed, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, catchError, of, tap, throwError } from 'rxjs';
import { LoginResponse, RefreshRequest, TokenResponse, UserInfo } from '../models/auth.models';
import { API_PATHS } from '../constants/api-paths';
import { environment } from '../../../environments/environment';

const STORAGE = {
  ACCESS_TOKEN:  'auth_access_token',
  REFRESH_TOKEN: 'auth_refresh_token',
  USER:          'auth_user',
  EXPIRES_AT:    'auth_expires_at',
} as const;

/** Margine prima della scadenza per pianificare il refresh proattivo. */
const REFRESH_LEAD_MS = 60_000;

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  private readonly _accessToken  = signal<string | null>(null);
  private readonly _refreshToken = signal<string | null>(null);
  private readonly _user         = signal<UserInfo | null>(null);

  private refreshTimerId: ReturnType<typeof setTimeout> | null = null;
  private readonly syncChannel = new BroadcastChannel('auth_sync');

  readonly user = this._user.asReadonly();
  readonly isAuthenticated = computed(() => this._accessToken() !== null);
  readonly isAdmin = computed(() => this._user()?.ruolo === 'ADMIN');
  readonly personaleId = computed(() => this._user()?.personaleId ?? null);

  constructor() {
    this.restoreSession();
    // Sync logout across all open tabs
    this.syncChannel.onmessage = ({ data }) => {
      if (data === 'logout') {
        this.clearSession();
        this.router.navigate(['/login']);
      }
    };
    // Cleanup esplicito quando il root injector viene distrutto (test, SSR).
    this.destroyRef.onDestroy(() => {
      if (this.refreshTimerId !== null) clearTimeout(this.refreshTimerId);
      this.syncChannel.close();
    });
  }

  loginWithGoogle(): void {
    window.location.href = environment.apiBaseUrl + API_PATHS.AUTH.GOOGLE_LOGIN;
  }

  /**
   * Scambia il codice opaco ricevuto nel redirect OAuth con i veri JWT.
   * Sostituisce il vecchio flusso che passava i token nei query parameter.
   */
  exchangeOauthCode(code: string): Observable<LoginResponse> {
    return this.http
      .post<LoginResponse>(environment.apiBaseUrl + API_PATHS.AUTH.GOOGLE_EXCHANGE, { code })
      .pipe(tap(res => this.acceptLogin(res)));
  }

  /**
   * Rivalidazione della sessione persistita: ricarica i dati utente dal server
   * in modo che cambiamenti applicati nel frattempo (es. {@code personaleId}
   * collegato da un ADMIN) siano visibili senza richiedere logout/login.
   * In caso di token scaduto o invalido viene scatenato il flusso di refresh
   * dall'interceptor JWT alla prossima richiesta.
   */
  revalidateSession(): Observable<UserInfo | null> {
    if (!this._accessToken()) return of(null);
    return this.http
      .get<UserInfo>(environment.apiBaseUrl + API_PATHS.AUTH.ME)
      .pipe(
        tap(user => {
          this._user.set(user);
          this.persistUser(user);
        }),
        catchError(() => of(null))
      );
  }

  refresh(): Observable<TokenResponse> {
    const refreshToken = this._refreshToken();
    if (!refreshToken) {
      return throwError(() => new Error('No refresh token available'));
    }
    const body: RefreshRequest = { refreshToken };
    return this.http
      .post<TokenResponse>(environment.apiBaseUrl + API_PATHS.AUTH.REFRESH, body)
      .pipe(
        tap(tokens => {
          const user = this._user();
          if (!user) return;
          this._accessToken.set(tokens.accessToken);
          this._refreshToken.set(tokens.refreshToken);
          this.persistSession(tokens.accessToken, tokens.refreshToken, user, tokens.expiresIn);
          this.scheduleTokenRefresh(tokens.expiresIn);
        }),
        catchError(err => {
          if (err.status === 401) {
            this.clearSession();
            this.router.navigate(['/login']);
          }
          return throwError(() => err);
        })
      );
  }

  logout(): void {
    const accessToken = this._accessToken();
    const refreshToken = this._refreshToken();
    if (refreshToken && accessToken) {
      this.http
        .post(
          environment.apiBaseUrl + API_PATHS.AUTH.LOGOUT,
          { refreshToken },
          { headers: { Authorization: `Bearer ${accessToken}` } }
        )
        .subscribe({ error: () => {} });
    }
    // Notify all other open tabs to also logout
    this.syncChannel.postMessage('logout');
    this.clearSession();
    this.router.navigate(['/login']);
  }

  scheduleTokenRefresh(expiresIn: number): void {
    if (this.refreshTimerId !== null) {
      clearTimeout(this.refreshTimerId);
    }
    const delayMs = expiresIn * 1000 - REFRESH_LEAD_MS;
    if (delayMs > 0) {
      this.refreshTimerId = setTimeout(() => {
        this.refresh().subscribe({ error: () => {} });
      }, delayMs);
    }
  }

  getAccessToken(): string | null {
    return this._accessToken();
  }

  private acceptLogin(res: LoginResponse): void {
    this._accessToken.set(res.accessToken);
    this._refreshToken.set(res.refreshToken);
    this._user.set(res.user);
    this.persistSession(res.accessToken, res.refreshToken, res.user, res.expiresIn);
    this.scheduleTokenRefresh(res.expiresIn);
  }

  private persistSession(
    accessToken: string,
    refreshToken: string,
    user: UserInfo,
    expiresIn: number
  ): void {
    const expiresAt = Date.now() + expiresIn * 1000;
    sessionStorage.setItem(STORAGE.ACCESS_TOKEN, accessToken);
    sessionStorage.setItem(STORAGE.REFRESH_TOKEN, refreshToken);
    sessionStorage.setItem(STORAGE.USER, JSON.stringify(user));
    sessionStorage.setItem(STORAGE.EXPIRES_AT, String(expiresAt));
  }

  private persistUser(user: UserInfo): void {
    sessionStorage.setItem(STORAGE.USER, JSON.stringify(user));
  }

  private restoreSession(): void {
    const accessToken = sessionStorage.getItem(STORAGE.ACCESS_TOKEN);
    const refreshToken = sessionStorage.getItem(STORAGE.REFRESH_TOKEN);
    const userJson = sessionStorage.getItem(STORAGE.USER);
    const expiresAt = sessionStorage.getItem(STORAGE.EXPIRES_AT);

    if (!accessToken || !refreshToken || !userJson || !expiresAt) return;

    const remainingMs = Number(expiresAt) - Date.now();
    if (remainingMs <= 0) {
      this.clearStorage();
      return;
    }

    try {
      const user = JSON.parse(userJson) as UserInfo;
      this._accessToken.set(accessToken);
      this._refreshToken.set(refreshToken);
      this._user.set(user);
      this.scheduleTokenRefresh(Math.floor(remainingMs / 1000));
      // Background revalidation: aggiorna user (in particolare personaleId)
      // se è cambiato sul server senza forzare logout/login.
      this.revalidateSession().subscribe();
    } catch {
      this.clearStorage();
    }
  }

  private clearSession(): void {
    this._accessToken.set(null);
    this._refreshToken.set(null);
    this._user.set(null);
    if (this.refreshTimerId !== null) {
      clearTimeout(this.refreshTimerId);
      this.refreshTimerId = null;
    }
    this.clearStorage();
  }

  private clearStorage(): void {
    sessionStorage.removeItem(STORAGE.ACCESS_TOKEN);
    sessionStorage.removeItem(STORAGE.REFRESH_TOKEN);
    sessionStorage.removeItem(STORAGE.USER);
    sessionStorage.removeItem(STORAGE.EXPIRES_AT);
  }
}
