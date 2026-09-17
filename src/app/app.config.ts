import { ApplicationConfig, provideAppInitializer, provideZoneChangeDetection, importProvidersFrom, inject } from '@angular/core';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideRouter, withNavigationErrorHandler } from '@angular/router';

import { NIMBUS_THEME_CONFIG } from '@williamsilva/nimbus-web-commons';

import Lara from '@primeuix/themes/lara';
import { providePrimeNG } from 'primeng/config';
import { ConfirmationService, MessageService } from 'primeng/api';
import { TranslateLoader, TranslateModule, TranslateService } from '@ngx-translate/core';

import { routes } from './app.routes';
import { authInterceptor } from './core/auth/auth.interceptor';
import { provideNimbusLayoutHosts } from './core/layout/layout-providers';
import { AssetsTranslateLoader } from './core/i18n/assets-translate.loader';
import { I18nService, readPersistedLang } from './core/i18n/i18n.service';

/** Chunk lazy (rota carregada sob demanda, ex.: /users) pode ter mudado de hash entre o deploy que
 *  gerou o index.html já carregado nesta aba e o deploy atual - o browser pede o arquivo antigo,
 *  que não existe mais, e o fallback de SPA do Cloudflare Pages devolve o index.html (text/html)
 *  no lugar do JS esperado ("Failed to load module script... MIME type text/html"). Recarrega a
 *  página inteira (busca o index.html/chunks atuais) só na primeira ocorrência - evita loop se o
 *  erro for de outra natureza (guard flag em sessionStorage, não se repete indefinidamente). */
function reloadOnChunkLoadError(error: unknown): void {
  const message = error instanceof Error ? error.message : String(error);
  const isChunkLoadError = /Failed to fetch dynamically imported module|Loading chunk|dynamically imported module/i.test(message);
  if (!isChunkLoadError) return;

  const flag = 'nimbusauth_web_chunk_reload';
  if (sessionStorage.getItem(flag)) return;

  sessionStorage.setItem(flag, '1');
  window.location.reload();
}

export const appConfig: ApplicationConfig = {
  providers: [
    provideZoneChangeDetection({ eventCoalescing: true }),

    // appId igual à chave de storage já usada pelo ThemeService local antigo ("nimbusauth.theme")
    // - preserva a preferência de tema já salva no navegador de quem já usa o app.
    { provide: NIMBUS_THEME_CONFIG, useValue: { appId: 'nimbusauth' } },

    // NIMBUS_SIDEBAR_HOST/NIMBUS_TOPBAR_HOST (SidebarComponent/TopbarComponent compartilhados) -
    // ver core/layout/layout-providers.ts.
    ...provideNimbusLayoutHosts(),

    provideRouter(routes, withNavigationErrorHandler((event) => reloadOnChunkLoadError(event.error))),

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

    importProvidersFrom(
      TranslateModule.forRoot({
        loader: { provide: TranslateLoader, useClass: AssetsTranslateLoader },
        isolate: false,
      }),
    ),

    provideAppInitializer(() => {
      const translate = inject(TranslateService);
      const i18n = inject(I18nService);
      translate.addLangs(['pt-BR', 'en', 'es']);
      translate.setDefaultLang('pt-BR');
      return i18n.setLang(readPersistedLang());
    }),

    provideAnimationsAsync(),

    MessageService,
    ConfirmationService,
  ],
};
