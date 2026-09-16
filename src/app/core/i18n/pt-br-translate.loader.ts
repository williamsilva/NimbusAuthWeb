import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { TranslateLoader, TranslationObject } from '@ngx-translate/core';
import { Observable } from 'rxjs';

/** Este app só tem tradução de verdade em pt-BR (ver I18nService) - devolve sempre o mesmo
 *  arquivo, independente do idioma pedido (o parâmetro `lang` é ignorado de propósito). */
@Injectable({ providedIn: 'root' })
export class PtBrTranslateLoader implements TranslateLoader {
  private readonly http = inject(HttpClient);

  getTranslation(_lang: string): Observable<TranslationObject> {
    return this.http.get<TranslationObject>('/i18n/pt-BR.json');
  }
}
