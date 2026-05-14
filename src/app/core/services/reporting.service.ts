import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import {
  CashFlowPeriodoDTO,
  ForecastingHorizon,
  ForecastingRispostaDTO,
  ForecastPointDTO,
  JobStatusDTO,
  PlComparativoDTO,
  PlDTO,
} from '../models/reporting.models';
import { API_PATHS } from '../constants/api-paths';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class ReportingService {
  private readonly http = inject(HttpClient);

  getPl(buId: number, from: string, to: string): Observable<PlDTO | { jobId: string }> {
    const params = new HttpParams().set('buId', buId).set('from', from).set('to', to);
    return this.http
      .get<PlDTO | { jobId: string }>(environment.apiBaseUrl + API_PATHS.REPORTING.PL, {
        params,
        observe: 'response',
      })
      .pipe(
        map(resp =>
          resp.status === 202
            ? (resp.body as { jobId: string })
            : (resp.body as PlDTO)
        )
      );
  }

  getPlStatus(jobId: string): Observable<JobStatusDTO> {
    return this.http.get<JobStatusDTO>(
      `${environment.apiBaseUrl}${API_PATHS.REPORTING.PL_STATUS}/${jobId}`
    );
  }

  getPlTutteBu(from: string, to: string): Observable<PlComparativoDTO> {
    const params = new HttpParams().set('from', from).set('to', to);
    return this.http.get<PlComparativoDTO>(
      environment.apiBaseUrl + API_PATHS.REPORTING.PL_TUTTE_BU,
      { params }
    );
  }

  getCashFlowStorico(from: string, to: string, granularity = 'MONTH'): Observable<CashFlowPeriodoDTO[]> {
    const params = new HttpParams().set('from', from).set('to', to).set('granularity', granularity);
    return this.http.get<CashFlowPeriodoDTO[]>(
      environment.apiBaseUrl + API_PATHS.REPORTING.CASHFLOW_STORICO,
      { params }
    );
  }

  getCashFlowForecast(giorni = 90): Observable<ForecastPointDTO[]> {
    const params = new HttpParams().set('giorni', giorni);
    return this.http.get<ForecastPointDTO[]>(
      environment.apiBaseUrl + API_PATHS.REPORTING.CASHFLOW_FORECAST,
      { params }
    );
  }

  getForecasting(horizon: ForecastingHorizon = '90'): Observable<ForecastingRispostaDTO> {
    const params = new HttpParams().set('horizon', horizon);
    return this.http.get<ForecastingRispostaDTO>(
      environment.apiBaseUrl + API_PATHS.REPORTING.FORECASTING,
      { params }
    );
  }

  exportMovimenti(from: string, to: string, format: 'csv' | 'xlsx'): Observable<Blob> {
    const params = new HttpParams().set('from', from).set('to', to).set('format', format);
    return this.http.get(environment.apiBaseUrl + API_PATHS.REPORTING.EXPORT_MOVIMENTI, {
      params,
      responseType: 'blob',
    });
  }

  exportCommercialista(mese: number, anno: number): Observable<Blob> {
    const params = new HttpParams().set('mese', mese).set('anno', anno);
    return this.http.get(environment.apiBaseUrl + API_PATHS.REPORTING.EXPORT_COMMERCIALISTA, {
      params,
      responseType: 'blob',
    });
  }

  exportPlBu(buId: number, from: string, to: string): Observable<Blob> {
    const params = new HttpParams()
      .set('buId', buId)
      .set('from', from)
      .set('to', to)
      .set('format', 'xlsx');
    return this.http.get(environment.apiBaseUrl + API_PATHS.REPORTING.EXPORT_PL_BU, {
      params,
      responseType: 'blob',
    });
  }

  downloadBlob(blob: Blob, filename: string): void {
    const objectUrl = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = objectUrl;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(objectUrl);
  }
}
