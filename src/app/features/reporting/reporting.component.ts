import { Component } from '@angular/core';
import { MatTabsModule } from '@angular/material/tabs';
import { PlComparativoComponent } from './pl-comparativo.component';
import { CashFlowComponent } from './cash-flow.component';
import { ExportComponent } from './export.component';

@Component({
  selector: 'app-reporting',
  standalone: true,
  imports: [
    MatTabsModule,
    PlComparativoComponent,
    CashFlowComponent,
    ExportComponent,
  ],
  templateUrl: './reporting.component.html',
  styleUrls: ['./reporting.component.scss'],
})
export class ReportingComponent {}
