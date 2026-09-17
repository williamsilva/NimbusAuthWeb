import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import { API } from '../../core/api/api.config';
import { AppEmailLogPage, AppEmailLogSearchParams } from './apps-email-log.models';

@Injectable({ providedIn: 'root' })
export class AppsEmailLogApiService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${API.base}/v1/apps`;

  search(appKey: string, params: AppEmailLogSearchParams): Observable<AppEmailLogPage> {
    let httpParams = new HttpParams().set('page', params.page).set('size', params.size);

    if (params.recipient) httpParams = httpParams.set('recipient', params.recipient);
    if (params.subject) httpParams = httpParams.set('subject', params.subject);
    if (params.eventType) httpParams = httpParams.set('eventType', params.eventType);
    if (params.status) httpParams = httpParams.set('status', params.status);
    if (params.sentAtFrom) httpParams = httpParams.set('sentAtFrom', params.sentAtFrom);
    if (params.sentAtTo) httpParams = httpParams.set('sentAtTo', params.sentAtTo);
    if (params.sortField) httpParams = httpParams.set('sortField', params.sortField);
    if (params.sortOrder) httpParams = httpParams.set('sortOrder', params.sortOrder);

    return this.http.get<AppEmailLogPage>(`${this.baseUrl}/${appKey}/email-log/search`, { params: httpParams });
  }
}
