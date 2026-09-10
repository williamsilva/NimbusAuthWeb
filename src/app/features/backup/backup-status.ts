import { BackupExecution } from './backup.models';

const STATUS_LABELS: Record<BackupExecution['status'], string> = {
  RUNNING: 'Em execução',
  SUCCESS: 'Concluído',
  PARTIAL: 'Concluído com alertas',
  FAILED: 'Falhou',
};

const STATUS_SEVERITIES: Record<BackupExecution['status'], 'success' | 'info' | 'warn' | 'danger'> = {
  RUNNING: 'info',
  SUCCESS: 'success',
  PARTIAL: 'warn',
  FAILED: 'danger',
};

export function statusLabel(status: BackupExecution['status'] | null | undefined): string {
  return (status && STATUS_LABELS[status]) || 'Desconhecido';
}

export function statusSeverity(
  status: BackupExecution['status'] | null | undefined,
): 'success' | 'info' | 'warn' | 'danger' | 'secondary' {
  return (status && STATUS_SEVERITIES[status]) || 'secondary';
}

// Sem pipe/util de formatBytes já existente no repo (greenfield) - unidades binárias (1024),
// mesma convenção usada pelo próprio backend/SO pra tamanho de arquivo.
export function formatBytes(bytes: number | null | undefined): string {
  if (bytes == null) {
    return '-';
  }
  if (bytes === 0) {
    return '0 B';
  }
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  const exponent = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  const value = bytes / Math.pow(1024, exponent);
  return `${value.toFixed(exponent === 0 ? 0 : 1)} ${units[exponent]}`;
}
