import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of, tap } from 'rxjs';
import { PianoContiCogeDTO, MetodoPagamentoDTO, AliquotaIvaDTO, TipoEventoDTO } from '../models/anagrafica.models';
import { CentroDiCostoDTO } from '../models/personale.models';
import { CacheService } from './cache.service';
import { API_PATHS } from '../constants/api-paths';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class LookupService {
  private readonly http = inject(HttpClient);
  private readonly cache = inject(CacheService);

  getPianoConti(): Observable<PianoContiCogeDTO[]> {
    const key = 'lookup:piano-dei-conti';
    const cached = this.cache.get<PianoContiCogeDTO[]>(key);
    if (cached) return of(cached);
    return this.http.get<PianoContiCogeDTO[]>(environment.apiBaseUrl + API_PATHS.PIANO_DEI_CONTI).pipe(
      tap(data => this.cache.set(key, data, environment.cacheTtlStaticMs))
    );
  }

  getMetodiPagamento(): Observable<MetodoPagamentoDTO[]> {
    const key = 'lookup:metodi-pagamento';
    const cached = this.cache.get<MetodoPagamentoDTO[]>(key);
    if (cached) return of(cached);
    return this.http.get<MetodoPagamentoDTO[]>(environment.apiBaseUrl + API_PATHS.METODI_PAGAMENTO).pipe(
      tap(data => this.cache.set(key, data, environment.cacheTtlStaticMs))
    );
  }

  getAliquoteIva(): Observable<AliquotaIvaDTO[]> {
    const key = 'lookup:aliquote-iva';
    const cached = this.cache.get<AliquotaIvaDTO[]>(key);
    if (cached) return of(cached);
    return this.http.get<AliquotaIvaDTO[]>(environment.apiBaseUrl + API_PATHS.ALIQUOTE_IVA).pipe(
      tap(data => this.cache.set(key, data, environment.cacheTtlStaticMs))
    );
  }

  getTipiEvento(): Observable<TipoEventoDTO[]> {
    const key = 'lookup:tipi-evento';
    const cached = this.cache.get<TipoEventoDTO[]>(key);
    if (cached) return of(cached);
    return this.http.get<TipoEventoDTO[]>(environment.apiBaseUrl + API_PATHS.LOOKUP.TIPI_EVENTO).pipe(
      tap(data => this.cache.set(key, data, environment.cacheTtlStaticMs))
    );
  }

  getCentriDiCosto(): Observable<CentroDiCostoDTO[]> {
    const key = 'lookup:centri-di-costo';
    const cached = this.cache.get<CentroDiCostoDTO[]>(key);
    if (cached) return of(cached);
    return this.http.get<CentroDiCostoDTO[]>(environment.apiBaseUrl + API_PATHS.LOOKUP.CENTRI_DI_COSTO).pipe(
      tap(data => this.cache.set(key, data, environment.cacheTtlStaticMs))
    );
  }
}
