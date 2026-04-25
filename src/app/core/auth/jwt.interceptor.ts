import {
  HttpErrorResponse,
  HttpEvent,
  HttpHandlerFn,
  HttpInterceptorFn,
  HttpRequest,
} from '@angular/common/http';
import { inject } from '@angular/core';
import { BehaviorSubject, Observable, throwError } from 'rxjs';
import { catchError, filter, switchMap, take } from 'rxjs/operators';
import { AuthService } from './auth.service';

// Module-level state serializes concurrent refresh calls across all in-flight requests
let isRefreshing = false;
const refreshSubject = new BehaviorSubject<string | null>(null);

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
  return url.includes('/auth/');
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
    refreshSubject.next(null);

    return authService.refresh().pipe(
      switchMap(tokens => {
        isRefreshing = false;
        refreshSubject.next(tokens.accessToken);
        return next(withBearer(req, tokens.accessToken));
      }),
      catchError(err => {
        isRefreshing = false;
        refreshSubject.next(null);
        return throwError(() => err);
      })
    );
  }

  // Another refresh is in progress — wait for its result then retry
  return refreshSubject.pipe(
    filter((token): token is string => token !== null),
    take(1),
    switchMap(token => next(withBearer(req, token)))
  );
}
