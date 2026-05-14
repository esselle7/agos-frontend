import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import {
  AliasDTO,
  CreateAliasRequest,
  CreateFornitoreRequest,
  FornitoreDTO,
  FornitoreSummaryDTO,
} from '../models/anagrafica.models';
import { PagedResponse } from '../models/shared.models';
import { API_PATHS } from '../constants/api-paths';
import { environment } from '../../../environments/environment';

export interface FornitoriFilter {
  search?: string;
  page?: number;
  size?: number;
}

@Injectable({ providedIn: 'root' })
export class FornitoriService {
  private readonly http = inject(HttpClient);

  getList(filter: FornitoriFilter = {}): Observable<PagedResponse<FornitoreSummaryDTO>> {
    let params = new HttpParams();
    if (filter.search != null) params = params.set('search', filter.search);
    if (filter.page != null) params = params.set('page', filter.page);
    if (filter.size != null) params = params.set('size', filter.size);
    return this.http.get<PagedResponse<FornitoreSummaryDTO>>(
      environment.apiBaseUrl + API_PATHS.FORNITORI,
      { params }
    );
  }

  getById(id: string): Observable<FornitoreDTO> {
    return this.http.get<FornitoreDTO>(`${environment.apiBaseUrl}${API_PATHS.FORNITORI}/${id}`);
  }

  create(body: CreateFornitoreRequest): Observable<FornitoreDTO> {
    return this.http.post<FornitoreDTO>(environment.apiBaseUrl + API_PATHS.FORNITORI, body);
  }

  update(id: string, body: CreateFornitoreRequest): Observable<FornitoreDTO> {
    return this.http.put<FornitoreDTO>(
      `${environment.apiBaseUrl}${API_PATHS.FORNITORI}/${id}`,
      body
    );
  }

  addAlias(fornitoreId: string, body: CreateAliasRequest): Observable<AliasDTO> {
    return this.http.post<AliasDTO>(
      `${environment.apiBaseUrl}${API_PATHS.FORNITORI}/${fornitoreId}/alias`,
      body
    );
  }

  deleteAlias(fornitoreId: string, aliasId: number): Observable<void> {
    return this.http.delete<void>(
      `${environment.apiBaseUrl}${API_PATHS.FORNITORI}/${fornitoreId}/alias/${aliasId}`
    );
  }
}
