import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

import { API } from '../../core/api/api.config';
import { HalPagedResponse, ListQueryBody } from '../../core/api/list-query.models';
import { UserInput, UserModel, UserOption, UsersAdvancedFilters } from './users.models';

@Injectable({ providedIn: 'root' })
export class UsersApiService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${API.base}/v1/users`;

  search(query: ListQueryBody<UsersAdvancedFilters>): Observable<HalPagedResponse<UserModel>> {
    return this.http.post<HalPagedResponse<UserModel>>(`${this.baseUrl}/search`, query);
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

  activateBulk(ids: string[]): Observable<void> {
    return this.http.post<void>(`${this.baseUrl}/activate`, { ids });
  }

  deactivateBulk(ids: string[]): Observable<void> {
    return this.http.post<void>(`${this.baseUrl}/deactivate`, { ids });
  }

  resendInvite(id: string): Observable<void> {
    return this.http.post<void>(`${this.baseUrl}/${id}/resend-invite`, {});
  }

  /** Inclui o usuário de suporte (diferente de /options) - usado no multiselect "Criado por". */
  optionsFilter(): Observable<UserOption[]> {
    return this.http.get<UserOption[]>(`${this.baseUrl}/options-filter`);
  }
}
