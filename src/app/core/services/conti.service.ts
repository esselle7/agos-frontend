import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of, tap } from 'rxjs';
import { ContoBancarioDTO } from '../models/anagrafica.models';
import { CacheService } from './cache.service';
import { API_PATHS } from '../constants/api-paths';
import { environment } from '../../../environments/environment';

const CACHE_KEY = 'conti:all';

@Injectable({ providedIn: 'root' })
export class ContiService {
  private readonly http = inject(HttpClient);
  private readonly cache = inject(CacheService);

  getAll(): Observable<ContoBancarioDTO[]> {
    const cached = this.cache.get<ContoBancarioDTO[]>(CACHE_KEY);
    if (cached) return of(cached);
    return this.http.get<ContoBancarioDTO[]>(environment.apiBaseUrl + API_PATHS.CONTI).pipe(
      tap(data => this.cache.set(CACHE_KEY, data, environment.cacheTtlStaticMs))
    );
  }

  /** Forza il refetch dal server (per la pagina Situazione iniziale che mostra i saldi iniziali). */
  getAllFresh(): Observable<ContoBancarioDTO[]> {
    this.cache.invalidate(CACHE_KEY);
    return this.getAll();
  }

  updateSaldoIniziale(id: number, saldoIniziale: number, dataSaldoIniziale: string | null): Observable<ContoBancarioDTO> {
    return this.http.put<ContoBancarioDTO>(
      environment.apiBaseUrl + API_PATHS.CONTI_SALDO_INIZIALE(id),
      { saldoIniziale, dataSaldoIniziale }
    ).pipe(tap(() => this.cache.invalidate(CACHE_KEY)));
  }
}
