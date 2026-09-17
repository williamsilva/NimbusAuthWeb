import { AbstractControl } from '@angular/forms';
import { Component, Input } from '@angular/core';

/** Label "inteligente": mostra o texto normal (com "*" na frente se obrigatório) e, quando o
 *  campo fica inválido (tocado ou sujo), troca pela mensagem de erro específica - mesmo padrão
 *  visual usado no CardSyncWeb/NimbusFlowWeb/NimbusDeskWeb (shared/error-msg), substituindo o
 *  `<label>` estático. Sem a camada de i18n/ErrorMapperService de lá (não usada aqui - NimbusAuthWeb
 *  é só pt-BR e não faz mapeamento de erro de campo vindo da API) - mensagens só das chaves de
 *  validação padrão do Angular + dos validadores customizados deste app (cpfCnpjValidator,
 *  passwordMismatch). */
@Component({
  selector: 'app-error-msg',
  standalone: true,
  template: `
    <label [attr.for]="forId || null" class="app-float-label" [class.app-float-label-error]="hasErrorMessage">
      {{ text }}
    </label>
  `,
  styles: [
    `
      :host {
        display: contents;
      }

      .app-float-label {
        font-size: 0.88rem;
        line-height: 1.15;
      }

      .app-float-label-error {
        color: var(--p-red-500, #ef4444);
      }
    `,
  ],
})
export class ErrorMsgComponent {
  /** Não usado internamente (sem ErrorMapperService aqui) - só pra aceitar o mesmo template
   *  copiado de CardSyncWeb/NimbusDeskWeb (`[field]="'titulo'"`) sem quebrar o binding. */
  @Input() field?: string;
  @Input() hidden = false;
  @Input() forId?: string;
  @Input() required = true;
  @Input({ required: true }) label!: string;
  @Input({ required: true }) control!: AbstractControl | null;

  get hasErrorMessage(): boolean {
    if (!this.control || this.hidden) return false;
    return this.control.invalid && (this.control.touched || this.control.dirty);
  }

  get text(): string {
    if (!this.control) {
      return this.decorateLabel(this.label);
    }

    if (this.hasErrorMessage && this.control.errors) {
      const firstKey = Object.keys(this.control.errors)[0];
      if (firstKey) {
        return errorMessageFor(firstKey, this.label, this.control.errors[firstKey]);
      }
    }

    if (this.hidden) return '';
    return this.decorateLabel(this.label);
  }

  private decorateLabel(label: string): string {
    return this.required ? `* ${label}` : label;
  }
}

function errorMessageFor(key: string, label: string, value: unknown): string {
  switch (key) {
    case 'required':
      return `${label} é obrigatório.`;
    case 'email':
      return 'Informe um e-mail válido.';
    case 'minlength': {
      const len = (value as { requiredLength?: number } | undefined)?.requiredLength;
      return len ? `${label} deve ter ao menos ${len} caracteres.` : `${label} é muito curto.`;
    }
    case 'maxlength': {
      const len = (value as { requiredLength?: number } | undefined)?.requiredLength;
      return len ? `${label} deve ter no máximo ${len} caracteres.` : `${label} é muito longo.`;
    }
    case 'pattern':
      return `${label} em formato inválido.`;
    case 'cpfNotValid':
      return 'CPF inválido.';
    case 'cnpjNotValid':
      return 'CNPJ inválido.';
    case 'invalidLength':
      return 'Informe um CPF (11 dígitos) ou CNPJ (14 dígitos) válido.';
    case 'passwordMismatch':
      return 'As senhas não coincidem.';
    default:
      return `${label} inválido.`;
  }
}
