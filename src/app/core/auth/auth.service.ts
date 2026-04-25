import { Injectable, computed, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, catchError, tap, throwError } from 'rxjs';
import { UserInfo, TokenResponse, RefreshRequest } from '../models/auth.models';
import { API_PATHS } from '../constants/api-paths';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);

  private readonly _accessToken = signal<string | null>(null);
  private readonly _refreshToken = signal<string | null>(null);
  private readonly _user = signal<UserInfo | null>(null);
  private refreshTimerId: ReturnType<typeof setTimeout> | null = null;

  readonly user = this._user.asReadonly();
  readonly isAuthenticated = computed(() => this._accessToken() !== null);
  readonly isAdmin = computed(() => this._user()?.ruolo === 'ADMIN');

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
          this._accessToken.set(tokens.accessToken);
          this._refreshToken.set(tokens.refreshToken);
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

  private clearSession(): void {
    this._accessToken.set(null);
    this._refreshToken.set(null);
    this._user.set(null);
    if (this.refreshTimerId !== null) {
      clearTimeout(this.refreshTimerId);
      this.refreshTimerId = null;
    }
  }
}
