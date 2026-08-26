import { environment } from '../../../environments/environment';

export const API = {
  base: `${environment.apiBaseUrl}/api`,
} as const;
