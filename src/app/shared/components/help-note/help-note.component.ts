import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';

export type HelpNoteTone = 'info' | 'tip' | 'warn';

/**
 * Nota contestuale riusabile: spiega la *logica* o un'ipotesi di una sezione.
 * - tono: info (neutro) | tip (suggerimento) | warn (avvertenza)
 * - collapsed: se true mostra solo un trigger "Cosa significa?" che espande il testo,
 *   così non appesantisce la schermata. Il titolo del trigger è personalizzabile.
 *
 * Il corpo della nota è proiettato (max 2-3 frasi):
 *   <agos-help-note tono="tip" [collapsed]="true" titolo="Perché capitale e interessi?">
 *     La rata di un finanziamento si divide ...
 *   </agos-help-note>
 */
@Component({
  selector: 'agos-help-note',
  standalone: true,
  imports: [MatIconModule],
  templateUrl: './help-note.component.html',
  styleUrls: ['./help-note.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HelpNoteComponent {
  /** Tono visivo della nota. */
  @Input() tono: HelpNoteTone = 'info';
  /** Se true parte chiuso, espandibile con un click. */
  @Input() collapsed = false;
  /** Etichetta del trigger quando è chiuso. */
  @Input() titolo = 'Cosa significa?';

  open = false;

  get icon(): string {
    switch (this.tono) {
      case 'tip':
        return 'lightbulb';
      case 'warn':
        return 'warning_amber';
      default:
        return 'info';
    }
  }

  toggle(): void {
    this.open = !this.open;
  }
}
