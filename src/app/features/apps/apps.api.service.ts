import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

import { API } from '../../core/api/api.config';
import {
  AppCreateInput,
  AppModel,
  AppSecretModel,
  AppUpdateInput,
  HalPagedResponse,
  ListQueryBody,
} from './apps.models';

@Injectable({ providedIn: 'root' })
export class AppsApiService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${API.base}/v1/apps`;

  search(globalFilter: string, page: number, size: number): Observable<HalPagedResponse<AppModel>> {
    const body: ListQueryBody = {
      page,
      size,
      sort: [{ field: 'name', order: 1 }],
      tableFilters: {},
      globalFilter: globalFilter || null,
      advanced: null,
    };
    return this.http.post<HalPagedResponse<AppModel>>(`${this.baseUrl}/search`, body);
  }

  getById(id: string): Observable<AppModel> {
    return this.http.get<AppModel>(`${this.baseUrl}/${id}`);
  }

  create(input: AppCreateInput): Observable<AppSecretModel> {
    return this.http.post<AppSecretModel>(this.baseUrl, input);
  }

  update(id: string, input: AppUpdateInput): Observable<AppModel> {
    return this.http.put<AppModel>(`${this.baseUrl}/${id}`, input);
  }

  delete(id: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${id}`);
  }

  regenerateSecret(id: string): Observable<AppSecretModel> {
    return this.http.post<AppSecretModel>(`${this.baseUrl}/${id}/regenerate-secret`, {});
  }
}
