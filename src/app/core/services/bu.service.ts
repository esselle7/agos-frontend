import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of, tap } from 'rxjs';
import { BusinessUnitDTO } from '../models/anagrafica.models';
import { API_PATHS } from '../constants/api-paths';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class BuService {
  private readonly http = inject(HttpClient);

  private readonly _units = signal<BusinessUnitDTO[]>([]);
  private loaded = false;

  readonly units = this._units.asReadonly();

  getAll(): Observable<BusinessUnitDTO[]> {
    if (this.loaded) {
      return of(this._units());
    }
    return this.http
      .get<BusinessUnitDTO[]>(environment.apiBaseUrl + API_PATHS.BU)
      .pipe(
        tap(units => {
          this._units.set(units);
          this.loaded = true;
        })
      );
  }
}
