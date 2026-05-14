import { Component, Input, Output, EventEmitter } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';

@Component({
  selector: 'agos-empty-state',
  standalone: true,
  imports: [MatIconModule, MatButtonModule],
  templateUrl: './empty-state.component.html',
  styleUrls: ['./empty-state.component.scss'],
})
export class EmptyStateComponent {
  @Input() icon = 'inbox';
  @Input() title = 'Nessun dato';
  @Input() subtitle?: string;
  @Input() actionLabel?: string;
  @Output() action = new EventEmitter<void>();
}
