import { ApplicationConfig, provideZoneChangeDetection } from '@angular/core';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideRouter } from '@angular/router';

import Lara from '@primeuix/themes/lara';
import { providePrimeNG } from 'primeng/config';
import { ConfirmationService, MessageService } from 'primeng/api';

import { routes } from './app.routes';
import { authInterceptor } from './core/auth/auth.interceptor';

export const appConfig: ApplicationConfig = {
  providers: [
    provideZoneChangeDetection({ eventCoalescing: true }),

    provideRouter(routes),

    provideHttpClient(withInterceptors([authInterceptor])),

    providePrimeNG({
      theme: {
        preset: Lara,
        options: {
          darkModeSelector: '.dark',
          cssLayer: { name: 'primeng', order: 'primeng' },
        },
      },
    }),

    provideAnimationsAsync(),

    MessageService,
    ConfirmationService,
  ],
};
