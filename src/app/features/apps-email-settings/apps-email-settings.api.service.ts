import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

import { API } from '../../core/api/api.config';
import { EmailSettings, EmailSettingsUpdate } from '../email-settings/email-settings.models';

/** Config de e-mail de CADA app satélite (cardsync/nimbusflow/nimbusdesk/nimbusnovax) - o
 *  NimbusCoreServer repassa (proxy) pro /internal/email-settings daquele app via
 *  AppEmailSettingsClient, mesmo formato de EmailSettings/EmailSettingsUpdate já usado pela config
 *  de e-mail do PRÓPRIO NimbusCore (ver features/email-settings). */
@Injectable({ providedIn: 'root' })
export class AppsEmailSettingsApiService {
  private readonly http = inject(HttpClient);

  get(appKey: string): Observable<EmailSettings> {
    return this.http.get<EmailSettings>(`${API.base}/v1/apps/${appKey}/email-settings`);
  }

  update(appKey: string, settings: EmailSettingsUpdate): Observable<EmailSettings> {
    return this.http.put<EmailSettings>(`${API.base}/v1/apps/${appKey}/email-settings`, settings);
  }
}
