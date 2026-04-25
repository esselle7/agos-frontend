import {
  Component,
  Input,
  forwardRef,
  OnInit,
  inject,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
} from '@angular/core';
import {
  ControlValueAccessor,
  NG_VALUE_ACCESSOR,
  ReactiveFormsModule,
  FormControl,
} from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { BusinessUnitDTO } from '../../../core/models/anagrafica.models';
import { BuService } from '../../../core/services/bu.service';

@Component({
  selector: 'agos-bu-selector',
  standalone: true,
  imports: [ReactiveFormsModule, MatFormFieldModule, MatSelectModule],
  templateUrl: './bu-selector.component.html',
  styleUrls: ['./bu-selector.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => BuSelectorComponent),
      multi: true,
    },
  ],
})
export class BuSelectorComponent implements ControlValueAccessor, OnInit {
  @Input() label = 'Business Unit';
  @Input() required = false;
  @Input() placeholder = 'Seleziona BU';

  private readonly buService = inject(BuService);
  private readonly cdr = inject(ChangeDetectorRef);

  units: BusinessUnitDTO[] = [];
  loading = true;
  control = new FormControl<number | null>(null);

  private onChange: (v: number | null) => void = () => {};
  private onTouched: () => void = () => {};

  ngOnInit(): void {
    this.buService.getAll().subscribe(data => {
      this.units = data;
      this.loading = false;
      this.cdr.markForCheck();
    });

    this.control.valueChanges.subscribe(v => {
      this.onChange(v);
    });
  }

  writeValue(value: number | null): void {
    this.control.setValue(value, { emitEvent: false });
    this.cdr.markForCheck();
  }

  registerOnChange(fn: (v: number | null) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    isDisabled ? this.control.disable() : this.control.enable();
    this.cdr.markForCheck();
  }

  onBlur(): void {
    this.onTouched();
  }
}
