import { Directive, HostListener, ElementRef, OnInit, inject } from '@angular/core';

@Directive({
  selector: '[appPhoneMask]',
  standalone: true
})
export class PhoneMaskDirective implements OnInit {
  private readonly el = inject<ElementRef<HTMLInputElement>>(ElementRef);

  ngOnInit(): void {
    setTimeout(() => this.formatCurrentValue(), 50);
  }

  @HostListener('input')
  onInput(): void {
    this.formatCurrentValue();
  }

  @HostListener('blur')
  onBlur(): void {
    this.formatCurrentValue();
  }

  private formatCurrentValue(): void {
    const input = this.el.nativeElement;
    if (!input || !input.value) return;

    let value = input.value.replace(/\D/g, '');
    if (value.length > 11) {
      value = value.substring(0, 11);
    }

    if (value.length > 10) {
      value = value.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3');
    } else if (value.length > 6) {
      value = value.replace(/(\d{2})(\d{4})(\d{0,4})/, '($1) $2-$3');
    } else if (value.length > 2) {
      value = value.replace(/(\d{2})(\d{0,5})/, '($1) $2');
    }

    if (input.value !== value) {
      input.value = value;
    }
  }
}
