import { addEquipeMember } from './equipe-form.utils';
import { Component, Input, inject, signal, HostListener, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormGroup, FormArray, FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Servant, LookupItem } from '@core/models';
import { matchesSearch } from '@core/utils';
@Component({selector:'app-equipe-form',standalone:true,imports:[CommonModule,ReactiveFormsModule],templateUrl:'./equipe-form.component.html',styleUrl:'./equipe-form.component.scss',changeDetection:ChangeDetectionStrategy.OnPush})
export class EquipeFormComponent {
  @Input({required:true}) form!: FormGroup;
  @Input() servidores: Servant[] = [];
  @Input() funcoes: LookupItem[] = [];
  @Input() entityLabel = 'este contrato';
  readonly openServidorDropdownIndex = signal<number|null>(null);
  readonly servidorSearch = signal('');
  get membrosArray(): FormArray { return this.form.get('membros') as FormArray; }
  servants(): Servant[] { return this.servidores; }
  funcoesList(): LookupItem[] { return this.funcoes; }
  selectedServants(): (Servant|null)[] { return this.membrosArray.controls.map(c=>this.servidores.find(s=>s.id===Number(c.get('servidorId')?.value))??null); }
  filteredServantsForDropdown(): Servant[] { return this.servidores.filter(s=>matchesSearch([s.nome,s.cargo,s.matricula,s.secretaria],this.servidorSearch())); }
  @HostListener('document:click') closeDropdown(): void { this.openServidorDropdownIndex.set(null); }
  addMembro(servidorId: number | string = '', funcaoId: number | string = '', servantObj: Servant | null = null): void { addEquipeMember(this.membrosArray, servidorId, funcaoId); }

  removeMembro(index: number): void {
    this.membrosArray.removeAt(index);

    if (this.openServidorDropdownIndex() === index) {
      this.openServidorDropdownIndex.set(null);
    }
  }

  toggleServidorDropdown(index: number): void {
    if (this.openServidorDropdownIndex() === index) {
      this.openServidorDropdownIndex.set(null);
    } else {
      this.openServidorDropdownIndex.set(index);
      this.servidorSearch.set('');
    }
  }

  selectServant(index: number, servant: Servant): void {
    const ctrl = this.membrosArray.at(index);
    if (ctrl) {
      ctrl.get('servidorId')!.setValue(servant.id);

      ctrl.get('servidorId')!.markAsTouched();
    }
    this.openServidorDropdownIndex.set(null);
    this.servidorSearch.set('');
  }
}
