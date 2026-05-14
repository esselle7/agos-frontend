import { Injectable, computed, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, catchError, tap, throwError } from 'rxjs';
import { UserInfo, TokenResponse, RefreshRequest } from '../models/auth.models';
import { API_PATHS } from '../constants/api-paths';
import { environment } from '../../../environments/environment';

const STORAGE = {
  ACCESS_TOKEN: 'auth_access_token',
  REFRESH_TOKEN: 'auth_refresh_token',
  USER: 'auth_user',
  EXPIRES_AT: 'auth_expires_at',
} as const;

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);

  private readonly _accessToken = signal<string | null>(null);
  private readonly _refreshToken = signal<string | null>(null);
  private readonly _user = signal<UserInfo | null>(null);
  private refreshTimerId: ReturnType<typeof setTimeout> | null = null;
  private readonly syncChannel = new BroadcastChannel('auth_sync');

  readonly user = this._user.asReadonly();
  readonly isAuthenticated = computed(() => this._accessToken() !== null);
  readonly isAdmin = computed(() => this._user()?.ruolo === 'ADMIN');

  constructor() {
    this.restoreSession();
    // Sync logout across all open tabs
    this.syncChannel.onmessage = ({ data }) => {
      if (data === 'logout') {
        this.clearSession();
        this.router.navigate(['/login']);
      }
    };
  }

  loginWithGoogle(): void {
    window.location.href = environment.apiBaseUrl + API_PATHS.AUTH.GOOGLE_LOGIN;
  }

  handleCallback(
    accessToken: string,
    refreshToken: string,
    user: UserInfo,
    expiresIn = 3600
  ): void {
    this._accessToken.set(accessToken);
    this._refreshToken.set(refreshToken);
    this._user.set(user);
    this.persistSession(accessToken, refreshToken, user, expiresIn);
    this.scheduleTokenRefresh(expiresIn);
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
          const user = this._user()!;
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
    const delayMs = expiresIn * 1000 - 60_000;
    if (delayMs > 0) {
      this.refreshTimerId = setTimeout(() => {
        this.refresh().subscribe();
      }, delayMs);
    }
  }

  getAccessToken(): string | null {
    return this._accessToken();
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
