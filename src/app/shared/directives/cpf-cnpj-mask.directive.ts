import { NgControl } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { DestroyRef, Directive, ElementRef, HostListener, OnInit, inject } from '@angular/core';

/**
 * Máscara simples CPF/CNPJ (portada do CardSyncWeb):
 *  - até 11 dígitos: 000.000.000-00
 *  - 12-14 dígitos: 00.000.000/0000-00
 *
 * Mantém o valor do FormControl como SOMENTE DÍGITOS.
 */
@Directive({
  selector: '[appCpfCnpjMask]',
  standalone: true,
})
export class CpfCnpjMaskDirective implements OnInit {
  private readonly el = inject<ElementRef<HTMLInputElement>>(ElementRef);
  private readonly ngControl = inject(NgControl, { optional: true });
  private readonly destroyRef = inject(DestroyRef);

  /**
   * `@HostListener('input')` só reage à digitação do usuário - carregar um valor existente via
   * `form.reset()`/`patchValue()` escreve direto no DOM via `DefaultValueAccessor.writeValue()`,
   * sem disparar `input`, então o campo ficava sem máscara até o usuário mexer nele.
   * `valueChanges` cobre os dois casos. Só se aplica quando há um `NgControl` de fato.
   */
  ngOnInit(): void {
    if (!this.ngControl?.control) return;

    this.applyMask();

    this.ngControl.control.valueChanges.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => this.applyMask());
  }

  private applyMask(): void {
    const digits = String(this.ngControl?.control?.value ?? '')
      .replace(/\D+/g, '')
      .slice(0, 14);
    const masked = formatCpfCnpj(digits);
    if (this.el.nativeElement.value !== masked) {
      this.el.nativeElement.value = masked;
    }
  }

  @HostListener('input')
  onInput() {
    const input = this.el.nativeElement;

    const raw = String(input.value ?? '');
    const caret = input.selectionStart ?? raw.length;

    const digitsBeforeCaret = raw.slice(0, caret).replace(/\D+/g, '').length;

    const digits = raw.replace(/\D+/g, '').slice(0, 14);

    const ctrl = this.ngControl?.control;
    if (ctrl && String(ctrl.value ?? '') !== digits) {
      ctrl.setValue(digits, { emitEvent: false });
      ctrl.markAsDirty();
    }

    const masked = formatCpfCnpj(digits);
    if (input.value !== masked) {
      input.value = masked;
    }

    const nextPos = caretFromDigitIndex(masked, digitsBeforeCaret);
    try {
      input.setSelectionRange(nextPos, nextPos);
    } catch {
      // ignore
    }
  }

  @HostListener('blur')
  onBlur() {
    const input = this.el.nativeElement;
    const digits = String(input.value ?? '')
      .replace(/\D+/g, '')
      .slice(0, 14);
    input.value = formatCpfCnpj(digits);
  }
}

function caretFromDigitIndex(masked: string, digitIndex: number): number {
  if (digitIndex <= 0) return 0;
  let count = 0;

  for (let i = 0; i < masked.length; i++) {
    if (/\d/.test(masked[i])) count++;
    if (count >= digitIndex) return i + 1;
  }

  return masked.length;
}

function formatCpfCnpj(digits: string): string {
  if (!digits) return '';

  if (digits.length <= 11) {
    const p1 = digits.slice(0, 3);
    const p2 = digits.slice(3, 6);
    const p3 = digits.slice(6, 9);
    const p4 = digits.slice(9, 11);
    let out = p1;
    if (p2) out += '.' + p2;
    if (p3) out += '.' + p3;
    if (p4) out += '-' + p4;
    return out;
  }

  const p1 = digits.slice(0, 2);
  const p2 = digits.slice(2, 5);
  const p3 = digits.slice(5, 8);
  const p4 = digits.slice(8, 12);
  const p5 = digits.slice(12, 14);
  let out = p1;
  if (p2) out += '.' + p2;
  if (p3) out += '.' + p3;
  if (p4) out += '/' + p4;
  if (p5) out += '-' + p5;
  return out;
}
