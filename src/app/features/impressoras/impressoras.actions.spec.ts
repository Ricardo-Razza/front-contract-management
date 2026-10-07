import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { signal } from '@angular/core';
import { of } from 'rxjs';
import { FinanceiroImpressorasActions } from './financeiro/financeiro-impressoras.actions';
import { LeiturasImpressorasActions } from './leituras/leituras-impressoras.actions';
import { ImpressoraService } from '@core/services/impressora.service';
import { ToastService } from '@core/services/toast.service';
import { ItemGradeLeitura } from '@core/models';

describe('Operações extraídas de impressoras',()=> {
  let api:jasmine.SpyObj<ImpressoraService>,toast:jasmine.SpyObj<ToastService>;
  beforeEach(()=> {
    api=jasmine.createSpyObj('ImpressoraService',['salvarLeiturasLote']);
    toast=jasmine.createSpyObj('ToastService',['warning','success','error']);
    TestBed.configureTestingModule({providers:[provideHttpClient(),{provide:ImpressoraService,useValue:api},{provide:ToastService,useValue:toast}]});
  });
  it('seleciona os meses com faturamento, incluindo meses após agosto',()=> {
    const state={mesesComFaturamento:signal([9,12]),mesesSelecionados:signal([8])};
    const actions=TestBed.runInInjectionContext(()=>new FinanceiroImpressorasActions(state as unknown as ConstructorParameters<typeof FinanceiroImpressorasActions>[0]));
    spyOn(actions,'carregarNotasFiscaisLote');
    actions.selecionarMesesFaturados();
    expect(state.mesesSelecionados()).toEqual([9,12]);expect(actions.carregarNotasFiscaisLote).toHaveBeenCalledTimes(1);
    state.mesesComFaturamento.set([]);actions.selecionarMesesFaturados();expect(state.mesesSelecionados()).toEqual([9,12]);
  });
  function grade(leitura=120) {
    const row={impressoraId:1,itemPedido:1,tipoImpressao:'MONO',leituraMonoAnterior:100,leituraMonoAtual:leitura,leituraColorAnterior:0,leituraColorAtual:0,editado:true} as ItemGradeLeitura;
    const rows=signal([row]);
    const state={gradeLeituras:rows,filteredGradeLeituras:rows,mesCompetencia:signal(8),anoCompetencia:signal(2026),salvandoEmLote:signal(false)};
    const actions=TestBed.runInInjectionContext(()=>new LeiturasImpressorasActions(state as unknown as ConstructorParameters<typeof LeiturasImpressorasActions>[0]));
    return {state,actions};
  }
  it('mantém o payload do salvamento em lote e recarrega a grade após sucesso',()=> {
    api.salvarLeiturasLote.and.returnValue(of([]));
    const {state,actions}=grade();spyOn(actions,'carregarGradeLeituras');
    actions.salvarTodasAlteracoes();
    const payload=api.salvarLeiturasLote.calls.mostRecent().args[0];
    expect(payload[0]).toEqual(jasmine.objectContaining({impressoraId:1,mesReferencia:8,anoReferencia:2026,leituraMonoAtual:120,leituraColorAtual:0,origemLeitura:'MANUAL'}));
    expect(actions.carregarGradeLeituras).toHaveBeenCalled();expect(state.salvandoEmLote()).toBeFalse();
  });
  it('rejeita regressão do contador antes de enviar ao servidor',()=> {
    const {state,actions}=grade(90);actions.salvarTodasAlteracoes();
    expect(api.salvarLeiturasLote).not.toHaveBeenCalled();expect(toast.warning).toHaveBeenCalled();expect(state.salvandoEmLote()).toBeFalse();
  });
});
