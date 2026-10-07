import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Impressora } from '@core/models';
import { ImpressorasComponent } from '../impressoras.component';
import { possuiIpColeta } from './coleta-selecao.utils';

describe('Seleção e filtros da coleta automática', () => {
  let component: ImpressorasComponent;
  let http: HttpTestingController;
  const impressoras: Impressora[] = [
    { id: 1, itemPedido: 1, ativo: true, fabricante: 'Pantum', modelo: 'M7105DW', ip: '192.168.8.27', secretariaId: 10, secretariaNome: 'Saúde', secretariaSigla: 'SMS', empenhoId: 100, loteId: 1, tipoImpressao: 'MONO', localInstalacao: 'Recepção' },
    { id: 2, itemPedido: 2, ativo: true, fabricante: 'Ricoh', modelo: 'Color', ip: '192.168.9.1', secretariaId: 20, secretariaNome: 'Educação', secretariaSigla: 'SMED', empenhoId: 200, loteId: 2, tipoImpressao: 'COLOR' },
    { id: 3, itemPedido: 3, ativo: true, fabricante: 'Pantum', modelo: 'P3305DW', ip: 'USB', secretariaId: 10, empenhoId: 100, loteId: 1, tipoImpressao: 'MONO' },
    { id: 4, itemPedido: 4, ativo: true, fabricante: 'Ricoh', modelo: 'Color', ip: '999.168.9.1', secretariaId: 20, empenhoId: 200, loteId: 2, tipoImpressao: 'COLOR' },
    { id: 5, itemPedido: 5, ativo: false, fabricante: 'Ricoh', modelo: 'Color', ip: '192.168.9.2', tipoImpressao: 'COLOR' }
  ];
  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    http = TestBed.inject(HttpTestingController);
    component = TestBed.runInInjectionContext(() => new ImpressorasComponent());
    component.printers.set(impressoras);
  });
  afterEach(() => { component.ngOnDestroy(); http.verify(); });
  const ids = (lista: Impressora[]) => lista.map(p => p.id);

  it('mantém uma impressora desmarcada ao filtrar, buscar e voltar a todas', () => {
    component.abrirModalSelecaoImpressoras();
    component.alternarSelecaoImpressoraColeta(1);
    component.onFiltroSecretariaModalChange(10);
    expect(ids(component.impressorasFiltradasModalColeta())).toEqual([1, 3]);
    expect(component.isImpressoraSelecionadaColeta(1)).toBeFalse();
    component.buscaImpressoraModalColeta.set('ricoh');
    expect(component.impressorasFiltradasModalColeta().length).toBe(0);
    expect(component.idsImpressorasSelecionadasEfetivas()).toEqual([2, 3, 4]);
    component.limparFiltrosModalColeta();
    expect(ids(component.impressorasFiltradasModalColeta())).toEqual([1, 2, 3, 4]);
    expect(component.idsImpressorasSelecionadasEfetivas()).toEqual([2, 3, 4]);
  });

  it('mantém selecionadas de outras secretarias nas ações sobre filtradas', () => {
    component.abrirModalSelecaoImpressoras();
    component.onFiltroSecretariaModalChange(10);
    component.desmarcarFiltradasModalColeta();
    expect(component.idsImpressorasSelecionadasEfetivas()).toEqual([2, 4]);
    expect(component.totalSelecionadasOcultasColeta()).toBe(2);
    component.onFiltroSecretariaModalChange(20);
    component.alternarSelecaoImpressoraColeta(2);
    component.onFiltroSecretariaModalChange(10);
    component.marcarFiltradasModalColeta();
    expect(component.idsImpressorasSelecionadasEfetivas()).toEqual([1, 3, 4]);
    expect(component.isImpressoraSelecionadaColeta(2)).toBeFalse();
  });

  it('confirma a seleção global mesmo quando o filtro está vazio e a preserva ao reabrir', () => {
    component.abrirModalSelecaoImpressoras();
    component.alternarSelecaoImpressoraColeta(1);
    component.buscaImpressoraModalColeta.set('inexistente');
    component.confirmarSelecaoImpressorasColeta();
    expect(component.idsImpressorasConfirmadasColeta()).toEqual([2, 3, 4]);
    expect(component.itensColetaFiltrados().map(item => item.impressoraId)).toEqual([2, 3, 4]);
    component.abrirModalSelecaoImpressoras();
    component.limparFiltrosModalColeta();
    expect(component.isImpressoraSelecionadaColeta(1)).toBeFalse();
    expect(component.totalImpressorasSelecionadasColeta()).toBe(3);
  });

  it('cancelar restaura a seleção e não modifica a prévia confirmada enquanto edita', () => {
    component.abrirModalSelecaoImpressoras();
    component.alternarSelecaoImpressoraColeta(1);
    component.confirmarSelecaoImpressorasColeta();
    component.abrirModalSelecaoImpressoras();
    component.desmarcarTodasImpressorasColeta();
    expect(component.idsImpressorasSelecionadasEfetivas()).toEqual([]);
    expect(component.totalImpressorasConfirmadasColeta()).toBe(3);
    expect(component.itensColetaFiltrados().length).toBe(3);
    component.fecharModalSelecaoImpressoras();
    expect(component.idsImpressorasSelecionadasEfetivas()).toEqual([2, 3, 4]);
    expect(component.idsImpressorasConfirmadasColeta()).toEqual([2, 3, 4]);
  });

  it('combina secretaria, empenho, lote, tipo e conexão sem mexer na seleção', () => {
    component.filtroSecretariaModalColeta.set(20);
    component.filtroEmpenhoModalColeta.set(200);
    component.filtroLoteModalColeta.set(2);
    component.filtroTipoModalColeta.set('COLOR');
    component.filtroRedeModalColeta.set('COM_IP');
    expect(ids(component.impressorasFiltradasModalColeta())).toEqual([2]);
    expect(component.idsImpressorasSelecionadasEfetivas()).toEqual([1, 2, 3, 4]);
    component.filtroEmpenhoModalColeta.set(100);
    expect(component.impressorasFiltradasModalColeta().length).toBe(0);
  });

  it('busca sem acentos, com múltiplas palavras e por item sem confundir 1 com 10', () => {
    component.buscaImpressoraModalColeta.set('saude recepcao');
    expect(ids(component.impressorasFiltradasModalColeta())).toEqual([1]);
    component.buscaImpressoraModalColeta.set('smed #2');
    expect(ids(component.impressorasFiltradasModalColeta())).toEqual([2]);
    component.buscaImpressoraModalColeta.set('item 3');
    expect(ids(component.impressorasFiltradasModalColeta())).toEqual([3]);
    component.buscaImpressoraModalColeta.set('#1');
    expect(ids(component.impressorasFiltradasModalColeta())).toEqual([1]);
  });

  it('permite revisar somente desmarcadas e voltar a todas sem remarcá-las', () => {
    component.alternarSelecaoImpressoraColeta(2);
    component.filtroSelecaoModalColeta.set('DESMARCADAS');
    expect(ids(component.impressorasFiltradasModalColeta())).toEqual([2]);
    component.verSelecionadasColeta();
    expect(ids(component.impressorasFiltradasModalColeta())).toEqual([1, 3, 4]);
    component.limparFiltrosModalColeta();
    expect(component.isImpressoraSelecionadaColeta(2)).toBeFalse();
  });

  it('checkbox geral reflete seleção parcial do filtro e altera somente esse resultado', () => {
    component.filtroSecretariaModalColeta.set(10);
    component.alternarSelecaoImpressoraColeta(1);
    expect(component.algumasFiltradasModalMarcadas()).toBeTrue();
    expect(component.todasFiltradasModalMarcadas()).toBeFalse();
    component.alternarSelecaoFiltradasModalColeta();
    expect(component.todasFiltradasModalMarcadas()).toBeTrue();
    component.alternarSelecaoFiltradasModalColeta();
    expect(component.idsImpressorasSelecionadasEfetivas()).toEqual([2, 4]);
  });

  it('marcar filtradas inclui outras páginas sem apagar seleções fora do filtro', () => {
    component.printers.set(Array.from({ length: 55 }, (_, index) => ({ ...impressoras[0], id: index + 1, itemPedido: index + 1 })));
    component.desmarcarTodasImpressorasColeta();
    component.paginaSelecaoColeta.set(2);
    expect(component.paginadasModalColeta().length).toBe(25);
    component.marcarFiltradasModalColeta();
    expect(component.totalImpressorasSelecionadasColeta()).toBe(55);
    component.buscaImpressoraModalColeta.set('#55');
    expect(component.paginaAtualSelecaoColeta()).toBe(1);
    expect(ids(component.paginadasModalColeta())).toEqual([55]);
    component.desmarcarFiltradasModalColeta();
    component.limparFiltrosModalColeta();
    expect(component.totalImpressorasSelecionadasColeta()).toBe(54);
    expect(component.isImpressoraSelecionadaColeta(55)).toBeFalse();
  });

  it('somente ações globais explícitas substituem a seleção inteira', () => {
    component.alternarSelecaoImpressoraColeta(1);
    component.filtroSecretariaModalColeta.set(20);
    component.selecionarTodasImpressorasColeta();
    expect(component.idsImpressorasSelecionadasEfetivas()).toEqual([1, 2, 3, 4]);
    component.selecionarApenasComIpColeta();
    expect(component.idsImpressorasSelecionadasEfetivas()).toEqual([1, 2]);
    component.desmarcarTodasImpressorasColeta();
    component.limparFiltrosModalColeta();
    expect(component.idsImpressorasSelecionadasEfetivas()).toEqual([]);
  });

  it('envia os IDs confirmados de todas as secretarias mesmo com filtro e edição pendente', () => {
    component.abrirModalSelecaoImpressoras();
    component.alternarSelecaoImpressoraColeta(1);
    component.confirmarSelecaoImpressorasColeta();
    component.abrirModalSelecaoImpressoras();
    component.alternarSelecaoImpressoraColeta(2);
    component.filtroSecretariaModalColeta.set(20);
    component.filtroEmpenhoModalColeta.set(200);
    component.iniciarColetaAutomatica();
    const req = http.expectOne(r => r.url.endsWith('/coletas/iniciar'));
    expect(req.request.body.impressoraIds).toEqual([2, 3, 4]);
    expect(req.request.body.secretariaId).toBeUndefined();
    expect(req.request.body.empenhoId).toBeUndefined();
    req.flush({}, { status: 500, statusText: 'Error' });
  });

  it('uma seleção confirmada vazia não inicia coleta e impressoras inativas não participam', () => {
    expect(component.idsImpressorasConfirmadasColeta()).not.toContain(5);
    component.desmarcarTodasImpressorasColeta();
    component.confirmarSelecaoImpressorasColeta();
    component.iniciarColetaAutomatica();
    http.expectNone(r => r.url.endsWith('/coletas/iniciar'));
    expect(component.totalImpressorasConfirmadasColeta()).toBe(0);
  });

  it('filtrar ou limpar não altera os KPIs da seleção confirmada', () => {
    component.alternarSelecaoImpressoraColeta(1);
    component.confirmarSelecaoImpressorasColeta();
    const antes = component.metricasColeta();
    component.buscaImpressoraModalColeta.set('inexistente');
    expect(component.metricasColeta()).toEqual(antes);
    component.limparFiltrosModalColeta();
    expect(component.metricasColeta()).toEqual(antes);
  });

  it('classifica USB, endereços inválidos e IPs com espaços corretamente', () => {
    expect(possuiIpColeta(' 192.168.0.10 ')).toBeTrue();
    for (const ip of ['', 'USB', 'andrius', '999.168.0.1', '192.168.0', '192.168.0.1:80']) expect(possuiIpColeta(ip)).toBeFalse();
    expect(component.totalComIpParaColeta()).toBe(2);
    expect(component.totalSemIpParaColeta()).toBe(2);
  });
});
