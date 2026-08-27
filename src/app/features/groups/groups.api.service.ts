import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

import { API, APP_KEY } from '../../core/api/api.config';
import { HalPagedResponse, ListQueryBody } from '../../core/api/list-query.models';
import { GroupInput, GroupModel, GroupOption, GroupsAdvancedFilters, PermissionOption, UserOption } from './groups.models';

@Injectable({ providedIn: 'root' })
export class GroupsApiService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${API.base}/v1/groups`;

  /** appKey null/ausente = todos os apps (painel central) - ver GroupsFilter no backend. */
  search(query: ListQueryBody<GroupsAdvancedFilters>): Observable<HalPagedResponse<GroupModel>> {
    return this.http.post<HalPagedResponse<GroupModel>>(`${this.baseUrl}/search`, query);
  }

  getById(id: string): Observable<GroupModel> {
    return this.http.get<GroupModel>(`${this.baseUrl}/${id}`);
  }

  create(input: GroupInput): Observable<GroupModel> {
    return this.http.post<GroupModel>(this.baseUrl, input);
  }

  update(id: string, input: GroupInput): Observable<GroupModel> {
    return this.http.put<GroupModel>(`${this.baseUrl}/${id}`, input);
  }

  delete(id: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${id}`);
  }

  /** Substitui TODO o conjunto de permissões do grupo (não incremental). */
  updatePermissions(id: string, permissionIds: string[]): Observable<GroupModel> {
    return this.http.put<GroupModel>(`${this.baseUrl}/${id}/permissions`, { permissionIds });
  }

  /** Substitui TODO o conjunto de membros do grupo (não incremental) - backend bloqueia deixar um
   *  usuário órfão (sem nenhum outro grupo deste mesmo app_key). */
  updateUsers(id: string, userIds: string[]): Observable<GroupModel> {
    return this.http.put<GroupModel>(`${this.baseUrl}/${id}/users`, { userIds });
  }

  /** Grupos do app nimbusauth, para o multiselect do formulário de Usuário. */
  options(): Observable<GroupOption[]> {
    const params = new HttpParams().set('appKey', APP_KEY);
    return this.http.get<GroupOption[]>(`${this.baseUrl}/options`, { params });
  }

  /** Catálogo de permissões do app do grupo sendo gerenciado, para a aba "Permissões" do diálogo. */
  permissionOptions(appKey: string): Observable<PermissionOption[]> {
    const params = new HttpParams().set('appKey', appKey);
    return this.http.get<PermissionOption[]>(`${API.base}/v1/permissions/options`, { params });
  }

  /** Usuários (globais), para a aba "Usuários" do diálogo de grupo. */
  userOptions(): Observable<UserOption[]> {
    return this.http.get<UserOption[]>(`${API.base}/v1/users/options`);
  }
}
