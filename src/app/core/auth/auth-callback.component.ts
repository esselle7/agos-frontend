import { Component, OnInit, inject } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { AuthService } from './auth.service';
import { UserInfo } from '../models/auth.models';

@Component({
  selector: 'app-auth-callback',
  standalone: true,
  imports: [MatProgressSpinnerModule],
  template: `
    <div class="callback-wrap">
      <mat-spinner diameter="48" />
      <p class="callback-label">Accesso in corso…</p>
    </div>
  `,
  styles: [`
    .callback-wrap {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      height: 100vh;
      gap: 20px;
    }
    .callback-label {
      color: var(--text-sub);
      font-size: 14px;
    }
  `],
})
export class AuthCallbackComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  ngOnInit(): void {
    console.log('[AuthCallback] ngOnInit — URL:', window.location.href);
    const params = this.route.snapshot.queryParamMap;
    const accessToken = params.get('accessToken');
    const refreshToken = params.get('refreshToken');
    console.log('[AuthCallback] keys:', params.keys, '| hasAccess:', !!accessToken, '| hasRefresh:', !!refreshToken);

    if (!accessToken || !refreshToken) {
      console.warn('[AuthCallback] token mancante → redirect /login');
      this.router.navigate(['/login']);
      return;
    }

    const user: UserInfo = {
      id:    params.get('userId') ?? params.get('id') ?? '',
      email: params.get('email') ?? '',
      nome:  params.get('nome') ?? '',
      ruolo: (params.get('ruolo') ?? 'DIPENDENTE') as UserInfo['ruolo'],
    };

    const expiresIn = Number(params.get('expiresIn') ?? 3600);
    console.log('[AuthCallback] user:', user.ruolo, user.email, '| expiresIn:', expiresIn);
    this.authService.handleCallback(accessToken, refreshToken, user, expiresIn);
    console.log('[AuthCallback] isAuthenticated dopo handleCallback:', this.authService.isAuthenticated());
    console.log('[AuthCallback] navigating to /dashboard...');
    this.router.navigate(['/dashboard']);
  }
}
