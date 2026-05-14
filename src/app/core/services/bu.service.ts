import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map, of, tap } from 'rxjs';
import { BusinessUnitDTO } from '../models/anagrafica.models';
import { CacheService } from './cache.service';
import { API_PATHS } from '../constants/api-paths';
import { environment } from '../../../environments/environment';

const CACHE_KEY = 'bu:all';

@Injectable({ providedIn: 'root' })
export class BuService {
  private readonly http = inject(HttpClient);
  private readonly cache = inject(CacheService);

  getAll(): Observable<BusinessUnitDTO[]> {
    const cached = this.cache.get<BusinessUnitDTO[]>(CACHE_KEY);
    if (cached) return of(cached);
    return this.http.get<BusinessUnitDTO[]>(environment.apiBaseUrl + API_PATHS.BU).pipe(
      tap(data => this.cache.set(CACHE_KEY, data, environment.cacheTtlStaticMs))
    );
  }

  getById(id: number): Observable<BusinessUnitDTO | undefined> {
    return this.getAll().pipe(map(units => units.find(u => u.id === id)));
  }
}
