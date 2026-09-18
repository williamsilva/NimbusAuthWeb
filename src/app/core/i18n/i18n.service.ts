import { DOCUMENT } from '@angular/common';
import { Injectable, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { TranslateService } from '@ngx-translate/core';
import { PrimeNG } from 'primeng/config';

import { PRIMENG_TRANSLATIONS } from './primeng-translations';

export type NimbusLang = 'pt-BR' | 'en' | 'es';

const STORAGE_KEY = 'nimbuscore.lang';

interface LangConfig {
  locale: string;
  currency: string;
  dateFormat: string;
}

const LANG_CONFIG: Record<NimbusLang, LangConfig> = {
  'pt-BR': { locale: 'pt-BR', currency: 'BRL', dateFormat: 'dd/mm/yy' },
  en: { locale: 'en-US', currency: 'USD', dateFormat: 'mm/dd/yy' },
  es: { locale: 'es-ES', currency: 'EUR', dateFormat: 'dd/mm/yy' },
};

/** Implementação de NimbusTopbarI18n (@williamsilva/nimbus-web-commons) com troca de idioma DE
 *  VERDADE (pt-BR/en/es) - antes disso, EN/ES no seletor do Topbar apontavam pro mesmo dicionário
 *  pt-BR (ver AssetsTranslateLoader, que agora busca `/i18n/{lang}.json` de verdade). Idioma
 *  escolhido persiste em localStorage (`nimbuscore.lang`) e é reaplicado no próximo carregamento
 *  (ver readPersistedLang(), usado no provideAppInitializer de app.config.ts) - sem sincronização
 *  entre abas (BroadcastChannel) como o CardSyncWeb tem, não é necessário pra um app
 *  administrativo de uso tipicamente 1 aba por vez. */
@Injectable({ providedIn: 'root' })
export class I18nService {
  private readonly translate = inject(TranslateService);
  private readonly primeNG = inject(PrimeNG);
  private readonly document = inject(DOCUMENT);

  readonly appliedLang = signal<NimbusLang>(readPersistedLang());

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
    return LANG_CONFIG[this.appliedLang()].dateFormat;
  }

  getDateLocale(): string {
    return LANG_CONFIG[this.appliedLang()].locale;
  }

  getLocale(): string {
    return LANG_CONFIG[this.appliedLang()].locale;
  }

  getCurrency(): string {
    return LANG_CONFIG[this.appliedLang()].currency;
  }

  /** Chamado pelo Topbar compartilhado ao trocar de idioma no menu de conta, e no boot (via
   *  provideAppInitializer) pra aplicar o idioma persistido. */
  async setLang(lang: NimbusLang): Promise<void> {
    await firstValueFrom(this.translate.use(lang));
    this.appliedLang.set(lang);
    this.document.documentElement.lang = lang;
    this.primeNG.setTranslation(PRIMENG_TRANSLATIONS[lang]);

    try {
      localStorage.setItem(STORAGE_KEY, lang);
    } catch {
      // localStorage indisponível (modo privado etc.) - segue sem persistir, sem quebrar a troca.
    }
  }
}

function readPersistedLang(): NimbusLang {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === 'pt-BR' || stored === 'en' || stored === 'es') {
      return stored;
    }
  } catch {
    // localStorage indisponível - usa o padrão.
  }

  return 'pt-BR';
}

export { readPersistedLang };
