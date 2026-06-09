import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import {
  BulkImportResponse,
  MovimentoCreateRequest,
  MovimentoDTO,
  MovimentoUpdateRequest,
  MovimentiSommarioDTO,
  EtlImportResponse,
  ImportLogDTO,
  AmbiguitaDTO,
  ClassificaAmbiguitaRequest,
  ImportKpiDTO,
  SuggerimentoControparteDTO,
  RegolaClassificazioneDTO,
  TransitorioDTO,
  ClassificaTransitorioRequest,
  EventoParcheggiatoDTO,
  RisolviEventoRequest,
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

  getSommario(filter: Omit<MovimentiFilter, 'page' | 'size' | 'sort'> = {}): Observable<MovimentiSommarioDTO> {
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
    return this.http.get<MovimentiSommarioDTO>(
      environment.apiBaseUrl + API_PATHS.MOVIMENTI.SOMMARIO,
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

  liquida(id: string, contoBancarioId: number, metodoPagamentoId?: number): Observable<MovimentoDTO> {
    return this.http.patch<MovimentoDTO>(
      environment.apiBaseUrl + API_PATHS.MOVIMENTI.LIQUIDA(id),
      { contoBancarioId, metodoPagamentoId: metodoPagamentoId ?? null }
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

  // ── Import ETL (Billy / BPM / CA) ──────────────────────────────────────────

  importBilly(file: File): Observable<EtlImportResponse> {
    return this.uploadImport(API_PATHS.MOVIMENTI.IMPORT_BILLY, file);
  }

  importBpm(file: File): Observable<EtlImportResponse> {
    return this.uploadImport(API_PATHS.MOVIMENTI.IMPORT_BPM, file);
  }

  importCa(file: File): Observable<EtlImportResponse> {
    return this.uploadImport(API_PATHS.MOVIMENTI.IMPORT_CA, file);
  }

  private uploadImport(path: string, file: File): Observable<EtlImportResponse> {
    const fd = new FormData();
    fd.append('file', file, file.name);
    fd.append('filename', file.name);
    return this.http.post<EtlImportResponse>(environment.apiBaseUrl + path, fd);
  }

  getImportHistory(fonte?: string, page = 0, size = 20): Observable<PagedResponse<ImportLogDTO>> {
    let params = new HttpParams().set('page', page).set('size', size);
    if (fonte) params = params.set('fonte', fonte);
    return this.http.get<PagedResponse<ImportLogDTO>>(
      environment.apiBaseUrl + API_PATHS.MOVIMENTI.IMPORT_HISTORY,
      { params }
    );
  }

  getAmbiguita(importLogId: string, stato?: string, page = 0, size = 50): Observable<PagedResponse<AmbiguitaDTO>> {
    let params = new HttpParams().set('page', page).set('size', size);
    if (stato) params = params.set('stato', stato);
    return this.http.get<PagedResponse<AmbiguitaDTO>>(
      environment.apiBaseUrl + API_PATHS.MOVIMENTI.IMPORT_AMBIGUITA(importLogId),
      { params }
    );
  }

  classificaAmbiguita(id: string, req: ClassificaAmbiguitaRequest): Observable<void> {
    return this.http.put<void>(
      environment.apiBaseUrl + API_PATHS.MOVIMENTI.CLASSIFICA_AMBIGUITA(id),
      req
    );
  }

  // ── Triage assistito / KPI / regole data-driven (ETL v2 §8/§9/§13) ──────────

  getImportKpi(): Observable<ImportKpiDTO> {
    return this.http.get<ImportKpiDTO>(environment.apiBaseUrl + API_PATHS.MOVIMENTI.IMPORT_KPI);
  }

  getSuggerimenti(ambiguitaId: string): Observable<SuggerimentoControparteDTO[]> {
    return this.http.get<SuggerimentoControparteDTO[]>(
      environment.apiBaseUrl + API_PATHS.MOVIMENTI.IMPORT_SUGGERIMENTI(ambiguitaId)
    );
  }

  getRegole(): Observable<RegolaClassificazioneDTO[]> {
    return this.http.get<RegolaClassificazioneDTO[]>(
      environment.apiBaseUrl + API_PATHS.MOVIMENTI.IMPORT_REGOLE
    );
  }

  createRegola(regola: RegolaClassificazioneDTO): Observable<{ id: number }> {
    return this.http.post<{ id: number }>(
      environment.apiBaseUrl + API_PATHS.MOVIMENTI.IMPORT_REGOLE, regola
    );
  }

  setRegolaAttiva(id: number, attiva: boolean): Observable<void> {
    let params = new HttpParams().set('attiva', attiva);
    return this.http.put<void>(
      environment.apiBaseUrl + API_PATHS.MOVIMENTI.IMPORT_REGOLA_ATTIVA(id), null, { params }
    );
  }

  deleteRegola(id: number): Observable<void> {
    return this.http.delete<void>(environment.apiBaseUrl + API_PATHS.MOVIMENTI.IMPORT_REGOLA(id));
  }

  rollbackImport(importLogId: string): Observable<Record<string, unknown>> {
    return this.http.delete<Record<string, unknown>>(
      environment.apiBaseUrl + API_PATHS.MOVIMENTI.IMPORT_ROLLBACK(importLogId)
    );
  }

  // ── Centro smistamento: transitori ──────────────────────────────────────────

  getTransitori(tipo?: string, page = 0, size = 20): Observable<PagedResponse<TransitorioDTO>> {
    let params = new HttpParams().set('page', page).set('size', size);
    if (tipo) params = params.set('tipo', tipo);
    return this.http.get<PagedResponse<TransitorioDTO>>(
      environment.apiBaseUrl + API_PATHS.MOVIMENTI.IMPORT_TRANSITORI, { params }
    );
  }

  getSuggerimentiTransitorio(movimentoId: string): Observable<SuggerimentoControparteDTO[]> {
    return this.http.get<SuggerimentoControparteDTO[]>(
      environment.apiBaseUrl + API_PATHS.MOVIMENTI.IMPORT_TRANSITORIO_SUGG(movimentoId)
    );
  }

  classificaTransitorio(movimentoId: string, req: ClassificaTransitorioRequest): Observable<void> {
    return this.http.put<void>(
      environment.apiBaseUrl + API_PATHS.MOVIMENTI.IMPORT_TRANSITORIO_CLASSIFICA(movimentoId), req
    );
  }

  // ── Centro smistamento: eventi parcheggiati ─────────────────────────────────

  getEventiParcheggiati(stato = 'DA_RICONCILIARE', page = 0, size = 20): Observable<PagedResponse<EventoParcheggiatoDTO>> {
    const params = new HttpParams().set('stato', stato).set('page', page).set('size', size);
    return this.http.get<PagedResponse<EventoParcheggiatoDTO>>(
      environment.apiBaseUrl + API_PATHS.MOVIMENTI.IMPORT_EVENTI, { params }
    );
  }

  risolviEvento(id: string, req: RisolviEventoRequest): Observable<void> {
    return this.http.put<void>(
      environment.apiBaseUrl + API_PATHS.MOVIMENTI.IMPORT_EVENTO_RISOLVI(id), req
    );
  }
}
