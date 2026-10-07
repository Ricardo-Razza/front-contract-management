import { TestBed } from '@angular/core/testing';
import { FormArray, FormBuilder, FormGroup } from '@angular/forms';
import { EquipeFormComponent } from './equipe-form.component';
import { Servant } from '@core/models';

describe('Formulário de equipe compartilhado',()=> {
  it('edita o mesmo FormArray enviado pelo pai e preserva os validadores',()=> {
    const fixture=TestBed.createComponent(EquipeFormComponent);
    const form=new FormBuilder().group({membros:new FormArray<FormGroup>([])});
    fixture.componentRef.setInput('form',form);
    fixture.componentRef.setInput('servidores',[{id:7,nome:'Ana'} as Servant]);
    fixture.detectChanges();
    const component=fixture.componentInstance;
    component.addMembro();expect(form.invalid).toBeTrue();
    component.selectServant(0,{id:7,nome:'Ana'} as Servant);
    component.membrosArray.at(0).get('funcaoId')!.setValue(2);
    expect(form.value.membros).toEqual([{servidorId:7,funcaoId:2}]);
    expect(form.valid).toBeTrue();expect(component.selectedServants()[0]?.nome).toBe('Ana');
    component.removeMembro(0);expect(component.membrosArray.length).toBe(0);
  });
});
