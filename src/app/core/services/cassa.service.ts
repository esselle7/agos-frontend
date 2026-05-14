import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, of, tap } from 'rxjs';
import { CassaMovimentoDTO, CreateCassaMovimentoRequest, SaldoResponse } from '../models/cassa.models';
import { CacheService } from './cache.service';
import { PagedResponse } from '../models/shared.models';
import { API_PATHS } from '../constants/api-paths';
import { environment } from '../../../environments/environment';

const SALDO_CACHE_KEY = 'cassa:saldo';
const SALDO_TTL_MS = 60_000;

export interface CassaMovimentiFilter {
  from?: string;
  to?: string;
  page?: number;
  size?: number;
}

@Injectable({ providedIn: 'root' })
export class CassaService {
  private readonly http = inject(HttpClient);
  private readonly cache = inject(CacheService);

  getSaldo(): Observable<SaldoResponse> {
    const cached = this.cache.get<SaldoResponse>(SALDO_CACHE_KEY);
    if (cached) return of(cached);
    return this.http.get<SaldoResponse>(environment.apiBaseUrl + API_PATHS.CASSA.SALDO).pipe(
      tap(data => this.cache.set(SALDO_CACHE_KEY, data, SALDO_TTL_MS))
    );
  }

  getMovimenti(filter: CassaMovimentiFilter = {}): Observable<PagedResponse<CassaMovimentoDTO>> {
    let params = new HttpParams();
    if (filter.from != null) params = params.set('from', filter.from);
    if (filter.to != null) params = params.set('to', filter.to);
    if (filter.page != null) params = params.set('page', filter.page);
    if (filter.size != null) params = params.set('size', filter.size);
    return this.http.get<PagedResponse<CassaMovimentoDTO>>(
      environment.apiBaseUrl + API_PATHS.CASSA.MOVIMENTI,
      { params }
    );
  }

  getById(id: string): Observable<CassaMovimentoDTO> {
    return this.http.get<CassaMovimentoDTO>(
      `${environment.apiBaseUrl}${API_PATHS.CASSA.MOVIMENTI}/${id}`
    );
  }

  create(body: CreateCassaMovimentoRequest): Observable<CassaMovimentoDTO> {
    return this.http
      .post<CassaMovimentoDTO>(environment.apiBaseUrl + API_PATHS.CASSA.MOVIMENTI, body)
      .pipe(tap(() => this.cache.invalidate(SALDO_CACHE_KEY)));
  }

  update(id: string, body: CreateCassaMovimentoRequest): Observable<CassaMovimentoDTO> {
    return this.http
      .put<CassaMovimentoDTO>(`${environment.apiBaseUrl}${API_PATHS.CASSA.MOVIMENTI}/${id}`, body)
      .pipe(tap(() => this.cache.invalidate(SALDO_CACHE_KEY)));
  }

  delete(id: string): Observable<void> {
    return this.http
      .delete<void>(`${environment.apiBaseUrl}${API_PATHS.CASSA.MOVIMENTI}/${id}`)
      .pipe(tap(() => this.cache.invalidate(SALDO_CACHE_KEY)));
  }
}
