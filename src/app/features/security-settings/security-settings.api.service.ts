import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

import { API } from '../../core/api/api.config';
import { SecuritySettings } from './security-settings.models';

@Injectable({ providedIn: 'root' })
export class SecuritySettingsApiService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${API.base}/v1/security-settings`;

  get(): Observable<SecuritySettings> {
    return this.http.get<SecuritySettings>(this.baseUrl);
  }

  update(settings: SecuritySettings): Observable<SecuritySettings> {
    return this.http.put<SecuritySettings>(this.baseUrl, settings);
  }
}
