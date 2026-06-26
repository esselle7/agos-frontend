import { Component } from '@angular/core';
import { MatTabsModule } from '@angular/material/tabs';
import { PlComparativoComponent } from './pl-comparativo.component';

@Component({
  selector: 'app-reporting',
  standalone: true,
  imports: [
    MatTabsModule,
    PlComparativoComponent,
  ],
  templateUrl: './reporting.component.html',
  styleUrls: ['./reporting.component.scss'],
})
export class ReportingComponent {}
