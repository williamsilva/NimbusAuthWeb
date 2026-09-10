import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import { API } from '../../core/api/api.config';
import { BackupExecution, GoogleDriveStatus } from './backup.models';

@Injectable({ providedIn: 'root' })
export class BackupApiService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${API.base}/v1/backup`;

  execute(): Observable<void> {
    return this.http.post<void>(`${this.baseUrl}/execute`, {});
  }

  executions(): Observable<BackupExecution[]> {
    return this.http.get<BackupExecution[]>(`${this.baseUrl}/executions`);
  }

  googleDriveStatus(): Observable<GoogleDriveStatus> {
    return this.http.get<GoogleDriveStatus>(`${this.baseUrl}/google-drive/status`);
  }
}
