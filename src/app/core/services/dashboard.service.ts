import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, of, tap } from 'rxjs';
import {
  AndamentoMensileDTO,
  DashboardKpiDTO,
  DashboardPeriod,
  FatturatoPerBuDTO,
  ScadenzeImminentiDTO,
} from '../models/dashboard.models';
import { MovimentoDTOShared } from '../models/shared.models';
import { CacheService } from './cache.service';
import { API_PATHS } from '../constants/api-paths';
import { environment } from '../../../environments/environment';

const ANDAMENTO_TTL_MS = 300_000;
const SCADENZE_TTL_MS = 120_000;

@Injectable({ providedIn: 'root' })
export class DashboardService {
  private readonly http = inject(HttpClient);
  private readonly cache = inject(CacheService);

  getKpi(period: DashboardPeriod, from?: string, to?: string): Observable<DashboardKpiDTO> {
    const key = `dashboard:kpi:${period}:${from ?? ''}:${to ?? ''}`;
    const cached = this.cache.get<DashboardKpiDTO>(key);
    if (cached) return of(cached);

    let params = new HttpParams().set('period', period);
    if (from != null) params = params.set('from', from);
    if (to != null) params = params.set('to', to);

    return this.http
      .get<DashboardKpiDTO>(environment.apiBaseUrl + API_PATHS.DASHBOARD.KPI, { params })
      .pipe(tap(data => this.cache.set(key, data, environment.cacheTtlDefaultMs)));
  }

  getAndamentoMensile(anni = 2): Observable<AndamentoMensileDTO[]> {
    const key = `dashboard:andamento:${anni}`;
    const cached = this.cache.get<AndamentoMensileDTO[]>(key);
    if (cached) return of(cached);

    const params = new HttpParams().set('anni', anni);
    return this.http
      .get<AndamentoMensileDTO[]>(environment.apiBaseUrl + API_PATHS.DASHBOARD.ANDAMENTO_MENSILE, { params })
      .pipe(tap(data => this.cache.set(key, data, ANDAMENTO_TTL_MS)));
  }

  getFatturatoPerBu(period: DashboardPeriod, from?: string, to?: string): Observable<FatturatoPerBuDTO[]> {
    const key = `dashboard:bu:${period}:${from ?? ''}:${to ?? ''}`;
    const cached = this.cache.get<FatturatoPerBuDTO[]>(key);
    if (cached) return of(cached);

    let params = new HttpParams().set('period', period);
    if (from != null) params = params.set('from', from);
    if (to != null) params = params.set('to', to);

    return this.http
      .get<FatturatoPerBuDTO[]>(environment.apiBaseUrl + API_PATHS.DASHBOARD.FATTURATO_PER_BU, { params })
      .pipe(tap(data => this.cache.set(key, data, environment.cacheTtlDefaultMs)));
  }

  getUltimeTransazioni(limit = 10): Observable<MovimentoDTOShared[]> {
    const params = new HttpParams().set('limit', limit);
    return this.http.get<MovimentoDTOShared[]>(
      environment.apiBaseUrl + API_PATHS.DASHBOARD.ULTIME_TRANSAZIONI,
      { params }
    );
  }

  getScadenzeImminenti(period: DashboardPeriod, from?: string, to?: string): Observable<ScadenzeImminentiDTO> {
    const key = `dashboard:scadenze:${period}:${from ?? ''}:${to ?? ''}`;
    const cached = this.cache.get<ScadenzeImminentiDTO>(key);
    if (cached) return of(cached);

    let params = new HttpParams().set('period', period);
    if (from != null) params = params.set('from', from);
    if (to != null) params = params.set('to', to);
    return this.http
      .get<ScadenzeImminentiDTO>(environment.apiBaseUrl + API_PATHS.DASHBOARD.SCADENZE_IMMINENTI, { params })
      .pipe(tap(data => this.cache.set(key, data, SCADENZE_TTL_MS)));
  }
}
