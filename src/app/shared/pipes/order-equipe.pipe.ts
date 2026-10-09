import { Pipe, PipeTransform } from '@angular/core';

function getFuncaoPriority(funcaoRaw?: string): number {
  if (!funcaoRaw) return 99;
  const f = funcaoRaw.toUpperCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  if (f.includes('GESTOR') && (f.includes('TITULAR') || f.includes('ATA') || f.includes('CONTRATO')) && !f.includes('SUPLENTE')) return 1;
  if (f.includes('GESTOR') && !f.includes('SUPLENTE')) return 2;
  if (f.includes('SUPLENTE')) return 3;
  if (f.includes('FISCAL') && f.includes('TECNICO')) return 4;
  if (f.includes('FISCAL') && f.includes('ADMINISTRATIVO')) return 5;
  if (f.includes('FISCAL')) return 6;
  if (f.includes('MEMBRO')) return 7;
  return 99;
}

export interface EquipeMemberLike {
  funcaoNome?: string;
  funcao?: string;
  servidorNome?: string;
  servidor?: string;
}

@Pipe({
  name: 'orderEquipe',
  standalone: true
})
export class OrderEquipePipe implements PipeTransform {
  transform<T extends EquipeMemberLike>(equipe: T[] | null | undefined): T[] {
    if (!equipe || equipe.length === 0) return [];

    return [...equipe].sort((a, b) => {
      const funcaoA = a?.funcaoNome || a?.funcao || '';
      const funcaoB = b?.funcaoNome || b?.funcao || '';

      const prioA = getFuncaoPriority(funcaoA);
      const prioB = getFuncaoPriority(funcaoB);

      if (prioA !== prioB) {
        return prioA - prioB;
      }

      const nomeA = a?.servidorNome || a?.servidor || '';
      const nomeB = b?.servidorNome || b?.servidor || '';
      return nomeA.localeCompare(nomeB, 'pt-BR');
    });
  }
}