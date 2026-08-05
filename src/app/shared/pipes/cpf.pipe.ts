import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'cpf',
  standalone: true
})
export class CpfPipe implements PipeTransform {
  transform(value: string | number | null | undefined): string {
    if (!value) return '-';
    let raw = value.toString().replace(/\D/g, '');
    if (raw.length < 11) {
      raw = raw.padStart(11, '0');
    }
    if (raw.length > 11) {
      raw = raw.substring(0, 11);
    }
    return raw.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
  }
}
