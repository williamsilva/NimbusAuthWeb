import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

import { API } from '../../core/api/api.config';
import { HalPagedResponse, ListQueryBody } from '../../core/api/list-query.models';
import { EmailLogAdvancedFilters, EmailLogModel } from './email-log.models';

@Injectable({ providedIn: 'root' })
export class EmailLogApiService {
  private readonly http = inject(HttpClient);
  // Atenção: sem "/search" no path (particularidade do EmailLogController - diferente de
  // /api/v1/users/search, /api/v1/groups/search) - POST direto em /email-logs.
  private readonly baseUrl = `${API.base}/v1/email-logs`;

  search(query: ListQueryBody<EmailLogAdvancedFilters>): Observable<HalPagedResponse<EmailLogModel>> {
    return this.http.post<HalPagedResponse<EmailLogModel>>(this.baseUrl, query);
  }
}
