import { Directive, HostListener, ElementRef, OnInit, inject } from '@angular/core';

@Directive({
  selector: '[appCpfMask]',
  standalone: true
})
export class CpfMaskDirective implements OnInit {
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

    if (value.length > 9) {
      value = value.replace(/(\d{3})(\d{3})(\d{3})(\d{1,2})/, '$1.$2.$3-$4');
    } else if (value.length > 6) {
      value = value.replace(/(\d{3})(\d{3})(\d{1,3})/, '$1.$2.$3');
    } else if (value.length > 3) {
      value = value.replace(/(\d{3})(\d{1,3})/, '$1.$2');
    }

    if (input.value !== value) {
      input.value = value;
    }
  }
}
