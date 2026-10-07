import { montarEscala, corPeriodo } from './ferias-escala.utils';
import { AgendamentoFerias } from '@core/models';

describe('Escala anual', () => {
  function agendamento(extra: Partial<AgendamentoFerias> = {}): AgendamentoFerias {
    return { id:1, servidorId:1, servidorNome:'Ana', tipoAfastamento:'FERIAS', status:'CONFIRMADO', dataInicio:'2024-02-28', dataFim:'2024-03-03', periodoIdentificador:'2023/2024', ...extra } as AgendamentoFerias;
  }
  it('respeita fevereiro bissexto e recorta períodos entre meses', () => {
    const meses=montarEscala(2024,[agendamento()],null);
    expect(meses[1].totalDias).toBe(29);
    expect(meses[1].linhas[0].faixas[0].inicio).toBe(28);
    expect(meses[1].linhas[0].faixas[0].fim).toBe(29);
    expect(meses[2].linhas[0].faixas[0].inicio).toBe(1);
    expect(meses[2].linhas[0].faixas[0].fim).toBe(3);
  });
  it('ignora cancelamentos e não altera os agendamentos', () => {
    const item=agendamento({status:'CANCELADO'});
    expect(montarEscala(2024,[item],null).every(m=>m.linhas.length===0)).toBeTrue();
    expect(item.dataInicio).toBe('2024-02-28');
  });
  it('mantém a cor de referência de cada período', () => {
    expect(corPeriodo(2025)).toBe('#f2d524');
    expect(corPeriodo(2024)).toBe('#8064a2');
    expect(corPeriodo(2023)).toBe('#5684ba');
  });
});
