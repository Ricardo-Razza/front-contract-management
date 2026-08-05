import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'phone',
  standalone: true
})
export class PhonePipe implements PipeTransform {
  transform(value: string | number | null | undefined): string {
    if (!value) return '-';
    const raw = value.toString().replace(/\D/g, '');
    if (raw.length === 11) {
      return raw.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3');
    } else if (raw.length === 10) {
      return raw.replace(/(\d{2})(\d{4})(\d{4})/, '($1) $2-$3');
    }
    return value.toString();
  }
}
