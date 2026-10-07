import { FormArray, FormControl, FormGroup, Validators } from '@angular/forms';

/** A mesma estrutura é usada ao adicionar membros e ao carregar uma equipe existente. */
export function addEquipeMember(membros: FormArray, servidorId: number | string = '', funcaoId: number | string = ''): void {
  membros.push(new FormGroup({
    servidorId: new FormControl(servidorId, Validators.required),
    funcaoId: new FormControl(funcaoId, Validators.required)
  }));
}
