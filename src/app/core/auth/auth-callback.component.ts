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
    const params = this.route.snapshot.queryParamMap;
    const accessToken = params.get('accessToken');
    const refreshToken = params.get('refreshToken');

    if (!accessToken || !refreshToken) {
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
    this.authService.handleCallback(accessToken, refreshToken, user, expiresIn);
    this.router.navigate(['/dashboard']);
  }
}
