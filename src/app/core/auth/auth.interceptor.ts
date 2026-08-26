import { inject } from '@angular/core';
import { HttpInterceptorFn } from '@angular/common/http';
import { catchError, throwError } from 'rxjs';

import { environment } from '../../../environments/environment';
import { AuthService } from './auth.service';

/** Anexa "Authorization: Bearer <token>" nas chamadas pra API do NimbusAuth. Em 401 (token
 *  expirado - sem refresh_token de propósito, ver AuthService), manda pro login de novo em vez
 *  de só propagar o erro. */
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(AuthService);

  const isApiRequest = req.url.startsWith(environment.apiBaseUrl)
    && !req.url.includes('/oauth2/')
    && !req.url.includes('/connect/');

  const token = isApiRequest ? auth.accessToken : null;
  const authorizedReq = token
    ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } })
    : req;

  return next(authorizedReq).pipe(
    catchError((err) => {
      if (isApiRequest && err?.status === 401) {
        void auth.startLogin(location.pathname + location.search);
      }
      return throwError(() => err);
    }),
  );
};
