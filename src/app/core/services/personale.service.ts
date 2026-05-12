import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import {
  PersonaleDTO,
  PersonaleSummaryDTO,
  PersonaleCostoSummaryDTO,
  CreatePersonaleRequest,
} from '../models/personale.models';
import { PagedResponse } from '../models/shared.models';
import { API_PATHS } from '../constants/api-paths';
import { environment } from '../../../environments/environment';

export interface PersonaleFilter {
  search?: string;
  buId?: number;
  mansione?: string;
  activeOnly?: boolean;
  page?: number;
  size?: number;
}

@Injectable({ providedIn: 'root' })
export class PersonaleService {
  private readonly http = inject(HttpClient);

  getList(filter: PersonaleFilter = {}): Observable<PagedResponse<PersonaleSummaryDTO>> {
    let params = new HttpParams();
    if (filter.search) params = params.set('search', filter.search);
    if (filter.buId != null) params = params.set('buId', filter.buId);
    if (filter.mansione) params = params.set('mansione', filter.mansione);
    if (filter.activeOnly) params = params.set('activeOnly', 'true');
    if (filter.page != null) params = params.set('page', filter.page);
    if (filter.size != null) params = params.set('size', filter.size);
    return this.http.get<PagedResponse<PersonaleSummaryDTO>>(
      environment.apiBaseUrl + API_PATHS.PERSONALE.BASE,
      { params }
    );
  }

  getById(id: string): Observable<PersonaleDTO> {
    return this.http.get<PersonaleDTO>(environment.apiBaseUrl + API_PATHS.PERSONALE.BY_ID(id));
  }

  getCostoSummary(): Observable<PersonaleCostoSummaryDTO> {
    return this.http.get<PersonaleCostoSummaryDTO>(
      environment.apiBaseUrl + API_PATHS.PERSONALE.COSTO_SUMMARY
    );
  }

  getMansioni(): Observable<string[]> {
    return this.http.get<string[]>(environment.apiBaseUrl + API_PATHS.PERSONALE.MANSIONI);
  }

  create(body: CreatePersonaleRequest): Observable<PersonaleDTO> {
    return this.http.post<PersonaleDTO>(environment.apiBaseUrl + API_PATHS.PERSONALE.BASE, body);
  }

  update(id: string, body: CreatePersonaleRequest): Observable<PersonaleDTO> {
    return this.http.put<PersonaleDTO>(
      environment.apiBaseUrl + API_PATHS.PERSONALE.BY_ID(id),
      body
    );
  }
}
