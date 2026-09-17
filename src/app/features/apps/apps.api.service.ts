import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

import { API } from '../../core/api/api.config';
import { HalPagedResponse, ListQueryBody } from '../../core/api/list-query.models';
import { AppCreateInput, AppModel, AppSecretModel, AppUpdateInput, AppsAdvancedFilters } from './apps.models';

@Injectable({ providedIn: 'root' })
export class AppsApiService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${API.base}/v1/apps`;

  /** Busca simples (catálogo p/ selects/multiselects de outras telas) - sem paginação/ordenação/
   *  filtro avançado real, ver searchAdvanced() para a listagem completa (StatefulListPage). */
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

  /** Busca avançada (StatefulListPage - painel de Apps e de E-mail dos Apps) - mesmo contrato
   *  usado por Usuários/Grupos (ListQueryDto<AppsFilter>, ver AppsController#search). */
  searchAdvanced(query: ListQueryBody<AppsAdvancedFilters>): Observable<HalPagedResponse<AppModel>> {
    return this.http.post<HalPagedResponse<AppModel>>(`${this.baseUrl}/search`, query);
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
