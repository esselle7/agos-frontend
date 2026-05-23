import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { AuthService } from './auth.service';

/**
 * Punto di atterraggio del redirect OAuth: il backend ha scambiato il codice
 * Google con i propri JWT e ci ha redirezionato passando un codice opaco
 * monouso. Qui lo scambiamo via POST per ricevere i token nel response body
 * (mai più nei query parameter dell'URL).
 */
@Component({
  selector: 'app-auth-callback',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MatButtonModule, MatProgressSpinnerModule],
  template: `
    <div class="callback-wrap">
      @if (!error()) {
        <mat-spinner diameter="48" />
        <p class="callback-label">Accesso in corso…</p>
      } @else {
        <p class="callback-label error">Autenticazione fallita: {{ error() }}</p>
        <button mat-stroked-button (click)="goLogin()">Riprova</button>
      }
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
    .callback-label.error {
      color: #c62828;
    }
  `],
})
export class AuthCallbackComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  readonly error = signal<string | null>(null);

  ngOnInit(): void {
    const code = this.route.snapshot.queryParamMap.get('code');
    if (!code) {
      this.error.set('codice di autorizzazione mancante');
      return;
    }

    this.authService.exchangeOauthCode(code).subscribe({
      next: () => this.router.navigate(['/dashboard']),
      error: err => {
        const msg = err?.error?.message ?? 'codice non valido o scaduto';
        this.error.set(msg);
      },
    });
  }

  goLogin(): void {
    this.router.navigate(['/login']);
  }
}
