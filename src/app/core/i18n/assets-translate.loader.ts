import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { TranslateLoader, TranslationObject } from '@ngx-translate/core';
import { Observable, shareReplay } from 'rxjs';

/** Busca `/i18n/{lang}.json` de verdade (pt-BR/en/es, ver public/i18n/) - com cache em memória
 *  por idioma pra não rebuscar o mesmo arquivo a cada troca (TranslateService já cacheia
 *  internamente também, mas o cache aqui evita um request duplicado caso getTranslation() seja
 *  chamado antes da 1ª resposta voltar). Sem o truque de HttpBackend que o CardSyncWeb usa pra
 *  escapar do próprio interceptor de auth - não precisa aqui: authInterceptor só anexa Bearer em
 *  requests pra `environment.apiBaseUrl`, e este JSON é servido da própria origem do SPA. */
@Injectable({ providedIn: 'root' })
export class AssetsTranslateLoader implements TranslateLoader {
  private readonly http = inject(HttpClient);
  private readonly cache = new Map<string, Observable<TranslationObject>>();

  getTranslation(lang: string): Observable<TranslationObject> {
    let cached = this.cache.get(lang);

    if (!cached) {
      cached = this.http.get<TranslationObject>(`/i18n/${lang}.json`).pipe(shareReplay(1));
      this.cache.set(lang, cached);
    }

    return cached;
  }
}
