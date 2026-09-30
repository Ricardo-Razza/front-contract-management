import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'cpf',
  standalone: true
})
export class CpfPipe implements PipeTransform {
  transform(value: string | number | null | undefined): string {
    if (!value) return '-';
    let raw = value.toString().trim().replace(/\D/g, '');
    if (!raw) return '-';

    if (raw.length === 11) {
      return raw.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
    }
    if (raw.length === 10 || raw.length === 9) {
      raw = raw.padStart(11, '0');
      return raw.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
    }
    if (raw.length === 14) {
      return raw.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
    }
    return value.toString().trim();
  }
}
