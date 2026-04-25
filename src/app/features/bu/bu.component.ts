import { Component, inject } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { map } from 'rxjs/operators';

@Component({
  selector: 'app-bu',
  standalone: true,
  template: `
    <div style="padding: 24px">
      <h2>Business Unit {{ buId() }}</h2>
      <p style="color: var(--text-sub)">Il dettaglio BU sarà implementato in uno step successivo.</p>
    </div>
  `,
})
export class BuComponent {
  private readonly route = inject(ActivatedRoute);
  readonly buId = toSignal(this.route.paramMap.pipe(map(p => p.get('buId'))));
}
