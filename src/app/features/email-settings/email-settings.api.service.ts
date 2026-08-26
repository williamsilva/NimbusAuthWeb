import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

import { API } from '../../core/api/api.config';
import { EmailSettings, EmailSettingsUpdate } from './email-settings.models';

@Injectable({ providedIn: 'root' })
export class EmailSettingsApiService {
  private readonly http = inject(HttpClient);
  // path do backend é /email/settings (não /email-settings) - ver EmailSettingsController.
  private readonly baseUrl = `${API.base}/v1/email/settings`;

  get(): Observable<EmailSettings> {
    return this.http.get<EmailSettings>(this.baseUrl);
  }

  update(settings: EmailSettingsUpdate): Observable<EmailSettings> {
    return this.http.put<EmailSettings>(this.baseUrl, settings);
  }
}
