import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import { PianoContiCogeDTO, PianoContiCogeUpsertRequest } from '../models/anagrafica.models';
import { CacheService } from './cache.service';
import { API_PATHS } from '../constants/api-paths';
import { environment } from '../../../environments/environment';

/**
 * Gestione del piano dei conti COGE (admin). La lista è letta fresca ad ogni apertura della pagina;
 * dopo create/update invalida la cache lookup ('lookup:piano-dei-conti') così i coge-picker si
 * riallineano senza ricaricare l'app.
 */
@Injectable({ providedIn: 'root' })
export class PianoContiService {
  private readonly http = inject(HttpClient);
  private readonly cache = inject(CacheService);
  private readonly base = environment.apiBaseUrl + API_PATHS.PIANO_DEI_CONTI;

  list(): Observable<PianoContiCogeDTO[]> {
    return this.http.get<PianoContiCogeDTO[]>(this.base, { params: { tipo: 'all' } });
  }

  create(req: PianoContiCogeUpsertRequest): Observable<PianoContiCogeDTO> {
    return this.http.post<PianoContiCogeDTO>(this.base, req).pipe(tap(() => this.bustCache()));
  }

  update(id: number, req: PianoContiCogeUpsertRequest): Observable<PianoContiCogeDTO> {
    return this.http.put<PianoContiCogeDTO>(`${this.base}/${id}`, req).pipe(tap(() => this.bustCache()));
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.base}/${id}`).pipe(tap(() => this.bustCache()));
  }

  private bustCache(): void {
    this.cache.invalidate('lookup:piano-dei-conti');
  }
}
