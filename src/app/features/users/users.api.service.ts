import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

import { API, APP_KEY } from '../../core/api/api.config';
import { HalPagedResponse, ListQueryBody } from '../../core/api/list-query.models';
import { UserInput, UserModel, UsersFilter } from './users.models';

@Injectable({ providedIn: 'root' })
export class UsersApiService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${API.base}/v1/users`;

  /** status nulo/vazio = todos. groupAppKey sempre fixo em 'nimbusauth' - restringe a busca aos
   *  usuários que têm ao menos um grupo deste app (ver UsersFilter.groupAppKey no backend). */
  search(globalFilter: string, page: number, size: number, status: number[] | null): Observable<HalPagedResponse<UserModel>> {
    const body: ListQueryBody<UsersFilter> = {
      page,
      size,
      sort: [{ field: 'name', order: 1 }],
      tableFilters: {},
      globalFilter: globalFilter || null,
      advanced: { groupAppKey: APP_KEY, status: status && status.length ? status : null },
    };
    return this.http.post<HalPagedResponse<UserModel>>(`${this.baseUrl}/search`, body);
  }

  getById(id: string): Observable<UserModel> {
    return this.http.get<UserModel>(`${this.baseUrl}/${id}`);
  }

  create(input: UserInput): Observable<UserModel> {
    return this.http.post<UserModel>(this.baseUrl, input);
  }

  update(id: string, input: UserInput): Observable<UserModel> {
    return this.http.put<UserModel>(`${this.baseUrl}/${id}`, input);
  }

  activate(id: string): Observable<void> {
    return this.http.post<void>(`${this.baseUrl}/${id}/activate`, {});
  }

  deactivate(id: string): Observable<void> {
    return this.http.post<void>(`${this.baseUrl}/${id}/deactivate`, {});
  }

  resendInvite(id: string): Observable<void> {
    return this.http.post<void>(`${this.baseUrl}/${id}/resend-invite`, {});
  }
}
