// Espelha BackupExecutionModel/GoogleDriveStatusModel do backend (ver BackupController).
export interface BackupExecution {
  id: string;
  startedAt: string;
  finishedAt: string | null;
  status: 'RUNNING' | 'SUCCESS' | 'PARTIAL' | 'FAILED';
  triggeredByUsername: string | null;
  sizeBytes: number | null;
  errorSummary: string | null;
}

export interface GoogleDriveStatus {
  connected: boolean;
  connectedAt: string | null;
  connectedByUsername: string | null;
}

export interface BackupNotificationRecipient {
  id: string;
  email: string;
  createdAt: string;
}
