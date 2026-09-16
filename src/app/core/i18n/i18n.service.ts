import { Injectable, inject, signal } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';

export type NimbusLang = 'pt-BR' | 'en' | 'es';

/** Implementação mínima de NimbusTopbarI18n (@williamsilva/nimbus-web-commons) - este app não
 *  precisa de i18n de verdade (só português), então EN/ES no seletor de idioma do Topbar apontam
 *  pro MESMO dicionário pt-BR (ver TranslateModule.forRoot em app.config.ts) - o seletor aparece
 *  igual aos outros apps, mas trocar de idioma não muda nenhum texto. */
@Injectable({ providedIn: 'root' })
export class I18nService {
  private readonly translate = inject(TranslateService);

  readonly appliedLang = signal<NimbusLang>('pt-BR');

  tUi(key: string, params?: Record<string, unknown> | string, fallback?: string): string {
    const isFallbackOnly = typeof params === 'string';
    const realParams = isFallbackOnly ? undefined : params;
    const realFallback = isFallbackOnly ? params : fallback;

    const value = this.translate.instant(key, realParams);
    return value && value !== key ? value : (realFallback ?? key);
  }

  tPrimeNg(key: string | null | undefined, fallback?: string): string {
    return fallback ?? key ?? '';
  }

  getDateFormatByPeriod(): string {
    return 'dd/mm/yy';
  }

  getDateLocale(): string {
    return 'pt-BR';
  }

  getLocale(): string {
    return 'pt-BR';
  }

  getCurrency(): string {
    return 'BRL';
  }

  setLang(lang: NimbusLang): void {
    this.appliedLang.set(lang);
  }
}
