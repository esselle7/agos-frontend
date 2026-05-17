import {
  HttpErrorResponse,
  HttpEvent,
  HttpHandlerFn,
  HttpInterceptorFn,
  HttpRequest,
} from '@angular/common/http';
import { inject } from '@angular/core';
import { Observable, Subject, throwError } from 'rxjs';
import { catchError, switchMap, take } from 'rxjs/operators';
import { AuthService } from './auth.service';
import { environment } from '../../../environments/environment';

// Module-level state serializes concurrent refresh calls across all in-flight requests
let isRefreshing = false;
// Subject (not BehaviorSubject) so waiting requests only receive future emissions;
// null means refresh failed, non-null string is the new access token.
const refreshSubject = new Subject<string | null>();

export const jwtInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);

  if (isAuthEndpoint(req.url)) {
    return next(req);
  }

  const token = authService.getAccessToken();
  const authedReq = token ? withBearer(req, token) : req;

  return next(authedReq).pipe(
    catchError((err: HttpErrorResponse) => {
      if (err.status === 401) {
        return handleUnauthorized(req, next, authService);
      }
      return throwError(() => err);
    })
  );
};

function isAuthEndpoint(url: string): boolean {
  return url.startsWith(environment.apiBaseUrl) && url.includes('/auth/');
}

function withBearer(req: HttpRequest<unknown>, token: string): HttpRequest<unknown> {
  return req.clone({ setHeaders: { Authorization: `Bearer ${token}` } });
}

function handleUnauthorized(
  req: HttpRequest<unknown>,
  next: HttpHandlerFn,
  authService: AuthService
): Observable<HttpEvent<unknown>> {
  if (!isRefreshing) {
    isRefreshing = true;

    return authService.refresh().pipe(
      switchMap(tokens => {
        isRefreshing = false;
        refreshSubject.next(tokens.accessToken);
        return next(withBearer(req, tokens.accessToken));
      }),
      catchError(err => {
        isRefreshing = false;
        // Emit null so all queued requests unblock and fail gracefully
        refreshSubject.next(null);
        return throwError(() => err);
      })
    );
  }

  // Another refresh is in progress — wait for its result then retry or propagate error
  return refreshSubject.pipe(
    take(1),
    switchMap(token => {
      if (!token) return throwError(() => new Error('Session expired'));
      return next(withBearer(req, token));
    })
  );
}
