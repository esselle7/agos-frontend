import { Component, inject } from '@angular/core';
import { AuthService } from '../../core/auth/auth.service';
import { DashboardComponent } from './dashboard.component';
import { EventiDashboardComponent } from './eventi-dashboard.component';

@Component({
  selector: 'app-dashboard-router',
  standalone: true,
  imports: [DashboardComponent, EventiDashboardComponent],
  template: `
    @if (auth.isAdmin()) {
      <app-dashboard />
    } @else {
      <app-eventi-dashboard />
    }
  `,
})
export class DashboardRouterComponent {
  readonly auth = inject(AuthService);
}
