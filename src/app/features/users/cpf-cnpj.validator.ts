import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';

/** Valida CPF (11) ou CNPJ (14) por dígito verificador - aceita valor com ou sem máscara, valida
 *  só os dígitos. Espelha o validador equivalente do CardSyncWeb
 *  (shared/validators/cpf-cnpj.validator.ts). */
export function cpfCnpjValidator(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const raw = String(control.value ?? '');
    const digits = raw.replace(/\D+/g, '');

    if (!digits) return null; // required fica por conta do Validators.required

    if (digits.length === 11) {
      return isValidCpf(digits) ? null : { cpfNotValid: true };
    }

    if (digits.length === 14) {
      return isValidCnpj(digits) ? null : { cnpjNotValid: true };
    }

    return { invalidLength: true };
  };
}

function isAllSameDigits(s: string): boolean {
  return /^([0-9])\1+$/.test(s);
}

function isValidCpf(cpf: string): boolean {
  if (cpf.length !== 11) return false;
  if (isAllSameDigits(cpf)) return false;

  const nums = cpf.split('').map((c) => Number(c));

  let sum = 0;
  for (let i = 0; i < 9; i++) sum += nums[i] * (10 - i);
  let d1 = (sum * 10) % 11;
  if (d1 === 10) d1 = 0;
  if (d1 !== nums[9]) return false;

  sum = 0;
  for (let i = 0; i < 10; i++) sum += nums[i] * (11 - i);
  let d2 = (sum * 10) % 11;
  if (d2 === 10) d2 = 0;
  return d2 === nums[10];
}

function isValidCnpj(cnpj: string): boolean {
  if (cnpj.length !== 14) return false;
  if (isAllSameDigits(cnpj)) return false;

  const nums = cnpj.split('').map((c) => Number(c));
  const w1 = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  const w2 = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];

  let sum = 0;
  for (let i = 0; i < 12; i++) sum += nums[i] * w1[i];
  let d1 = sum % 11;
  d1 = d1 < 2 ? 0 : 11 - d1;
  if (d1 !== nums[12]) return false;

  sum = 0;
  for (let i = 0; i < 13; i++) sum += nums[i] * w2[i];
  let d2 = sum % 11;
  d2 = d2 < 2 ? 0 : 11 - d2;
  return d2 === nums[13];
}
