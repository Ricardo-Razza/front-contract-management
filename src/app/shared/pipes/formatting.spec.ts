import { CpfPipe } from './cpf.pipe';
import { PhonePipe } from './phone.pipe';
import { OrderEquipePipe } from './order-equipe.pipe';

describe('Formatação', () => {
  it('formata CPF com zeros à esquerda e CNPJ', () => {
    const pipe = new CpfPipe();
    expect(pipe.transform('123456789')).toBe('001.234.567-89');
    expect(pipe.transform('12345678000190')).toBe('12.345.678/0001-90');
    expect(pipe.transform(null)).toBe('-');
  });
  it('formata telefone fixo, celular e valores ausentes', () => {
    const pipe = new PhonePipe();
    expect(pipe.transform('11987654321')).toBe('(11) 98765-4321');
    expect(pipe.transform('1134567890')).toBe('(11) 3456-7890');
    expect(pipe.transform('')).toBe('-');
  });
  it('ordena funções e nomes sem modificar o array original', () => {
    const equipe = [{funcaoNome:'Fiscal técnico',servidorNome:'Ana'}, {funcaoNome:'Gestor titular',servidorNome:'Zé'}, {funcaoNome:'Fiscal técnico',servidorNome:'Bia'}];
    const result = new OrderEquipePipe().transform(equipe);
    expect(result.map(item=>item.servidorNome)).toEqual(['Zé','Ana','Bia']);
    expect(equipe[0].servidorNome).toBe('Ana');
  });
});
