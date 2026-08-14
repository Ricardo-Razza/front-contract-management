
import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'orderEquipe',
  standalone: true
})
export class OrderEquipePipe implements PipeTransform {
  transform(equipe: any[]): any[] {
    if (!equipe || equipe.length === 0) return equipe; //se a equipe estiver vazia ou nao existir, não é feito nada

    const ordem: { [key: string]: number } = {
      'GT': 1,   // Gestor Titular
      'GS': 2,   // Gestor Suplente
      'F': 3,    // Fiscal
    };

    return [...equipe].sort((a, b) => {
      const funcaoA = a.funcao?.toUpperCase() || '';
      const funcaoB = b.funcao?.toUpperCase() || '';

      const ordemA = Object.keys(ordem).find(key => funcaoA.includes(key));
      const ordemB = Object.keys(ordem).find(key => funcaoB.includes(key));

      return (ordem[ordemA || ''] || 99) - (ordem[ordemB || ''] || 99);
    });
  }
}