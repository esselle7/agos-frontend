import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import {
  BulkImportResponse,
  MovimentoCreateRequest,
  MovimentoDTO,
  MovimentoUpdateRequest,
} from '../models/movimenti.models';
import { PagedResponse } from '../models/shared.models';
import { API_PATHS } from '../constants/api-paths';
import { environment } from '../../../environments/environment';

export interface MovimentiFilter {
  from?: string;
  to?: string;
  tipo?: 'ENTRATA' | 'USCITA';
  buId?: number;
  categoriaId?: number;
  metodoPagamentoId?: number;
  stato?: string;
  fornitoreId?: string;
  eventoId?: string;
  search?: string;
  page?: number;
  size?: number;
  sort?: string;
}

@Injectable({ providedIn: 'root' })
export class MovimentiService {
  private readonly http = inject(HttpClient);

  getList(filter: MovimentiFilter = {}): Observable<PagedResponse<MovimentoDTO>> {
    let params = new HttpParams();
    if (filter.from != null) params = params.set('from', filter.from);
    if (filter.to != null) params = params.set('to', filter.to);
    if (filter.tipo != null) params = params.set('tipo', filter.tipo);
    if (filter.buId != null) params = params.set('buId', filter.buId);
    if (filter.categoriaId != null) params = params.set('categoriaId', filter.categoriaId);
    if (filter.metodoPagamentoId != null) params = params.set('metodoPagamentoId', filter.metodoPagamentoId);
    if (filter.stato != null) params = params.set('stato', filter.stato);
    if (filter.fornitoreId != null) params = params.set('fornitoreId', filter.fornitoreId);
    if (filter.eventoId != null) params = params.set('eventoId', filter.eventoId);
    if (filter.search != null) params = params.set('search', filter.search);
    if (filter.page != null) params = params.set('page', filter.page);
    if (filter.size != null) params = params.set('size', filter.size);
    if (filter.sort != null) params = params.set('sort', filter.sort);
    return this.http.get<PagedResponse<MovimentoDTO>>(
      environment.apiBaseUrl + API_PATHS.MOVIMENTI.BASE,
      { params }
    );
  }

  getById(id: string): Observable<MovimentoDTO> {
    return this.http.get<MovimentoDTO>(
      `${environment.apiBaseUrl}${API_PATHS.MOVIMENTI.BASE}/${id}`
    );
  }

  create(body: MovimentoCreateRequest): Observable<MovimentoDTO> {
    return this.http.post<MovimentoDTO>(
      environment.apiBaseUrl + API_PATHS.MOVIMENTI.BASE,
      body
    );
  }

  update(id: string, body: MovimentoUpdateRequest): Observable<MovimentoDTO> {
    return this.http.put<MovimentoDTO>(
      `${environment.apiBaseUrl}${API_PATHS.MOVIMENTI.BASE}/${id}`,
      body
    );
  }

  delete(id: string): Observable<void> {
    return this.http.delete<void>(
      `${environment.apiBaseUrl}${API_PATHS.MOVIMENTI.BASE}/${id}`
    );
  }

  bulkImport(movimenti: MovimentoCreateRequest[]): Observable<BulkImportResponse> {
    return this.http.post<BulkImportResponse>(
      environment.apiBaseUrl + API_PATHS.MOVIMENTI.BULK,
      { movimenti }
    );
  }

  getNonRiconciliati(): Observable<MovimentoDTO[]> {
    return this.http.get<MovimentoDTO[]>(
      environment.apiBaseUrl + API_PATHS.MOVIMENTI.NON_RICONCILIATI
    );
  }

  riconcilia(id: string, note?: string): Observable<void> {
    let params = new HttpParams();
    if (note != null) params = params.set('note', note);
    return this.http.post<void>(
      `${environment.apiBaseUrl}/api/movimenti/riconciliazione/${id}/riconcilia`,
      null,
      { params }
    );
  }

  matchAutomatico(): Observable<{ matched: number }> {
    return this.http.post<{ matched: number }>(
      environment.apiBaseUrl + API_PATHS.MOVIMENTI.MATCH_AUTO,
      null
    );
  }
}
