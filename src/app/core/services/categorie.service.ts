import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, of, tap } from 'rxjs';
import { CategoriaNode, CreateCategoriaRequest } from '../models/anagrafica.models';
import { CacheService } from './cache.service';
import { API_PATHS } from '../constants/api-paths';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class CategorieService {
  private readonly http = inject(HttpClient);
  private readonly cache = inject(CacheService);

  getAlbero(buId: number, tipo?: 'ENTRATA' | 'USCITA'): Observable<CategoriaNode[]> {
    const key = `categorie:${buId}:${tipo ?? 'all'}`;
    const cached = this.cache.get<CategoriaNode[]>(key);
    if (cached) return of(cached);

    let params = new HttpParams().set('buId', buId);
    if (tipo) params = params.set('tipo', tipo);

    return this.http
      .get<CategoriaNode[]>(environment.apiBaseUrl + API_PATHS.CATEGORIE, { params })
      .pipe(tap(data => this.cache.set(key, data, environment.cacheTtlCategorieMs)));
  }

  create(body: CreateCategoriaRequest): Observable<CategoriaNode> {
    return this.http
      .post<CategoriaNode>(environment.apiBaseUrl + API_PATHS.CATEGORIE, body)
      .pipe(tap(() => this.cache.invalidatePattern(`categorie:${body.buId}:`)));
  }

  update(id: number, body: CreateCategoriaRequest): Observable<CategoriaNode> {
    return this.http
      .put<CategoriaNode>(`${environment.apiBaseUrl}${API_PATHS.CATEGORIE}/${id}`, body)
      .pipe(tap(() => this.cache.invalidatePattern(`categorie:${body.buId}:`)));
  }
}
