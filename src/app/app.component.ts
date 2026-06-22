import { Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { ThemeService } from './core/services/theme.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet],
  template: `<router-outlet />`,
})
export class AppComponent {
  // Istanzia il servizio tema al bootstrap: applica data-theme su <html>
  // (vale anche per login e overlay) prima del primo render delle pagine.
  private readonly theme = inject(ThemeService);
}
