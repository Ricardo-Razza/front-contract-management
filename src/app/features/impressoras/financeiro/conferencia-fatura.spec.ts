import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { signal } from '@angular/core';
import { EspelhoFatura, EquipamentoFatura } from '@core/models';
import { SKIP_GLOBAL_ERROR, SKIP_GLOBAL_LOADING } from '@core/interceptors/http-context';
import { compararFaturas, competenciaAnterior, chaveFatura, resumirFatura } from './conferencia-fatura.utils';
import { ConferenciaFaturaComponent } from '../components/conferencia-fatura.component';
import { FinanceiroImpressorasComponent, FinanceiroImpressorasComponentContext } from '../components/financeiro-impressoras.component';
import { FinanceiroImpressorasActions } from './financeiro-impressoras.actions';

function fatura(mes = 8, total = 130): EspelhoFatura {
  const equipamento: EquipamentoFatura = {
    itemPedido: 1, modelo: 'Color', numeroSerie: 'ABC', localInstalacao: 'Sala', numeroLote: 3,
    leituraMonoAnterior: 100, leituraMonoAtual: 220, copiasMono: 120,
    leituraColorAnterior: 10, leituraColorAtual: 30, copiasColor: 20,
    franquiaMono: 100, franquiaColor: 10, excedenteMono: 20, excedenteColor: 10,
    valorLocacao: 100, valorExcedente: total - 100, valorTotal: total, origemLeitura: 'MANUAL'
  };
  return {
    empenhoId: 3, numeroEmpenho: '10/2026', ano: 2026, secretariaNome: 'Saúde', secretariaSigla: 'SMS',
    contratoNumero: '23/2024', mesReferencia: mes, anoReferencia: 2026, competenciaFormatada: `${mes}/2026`,
    dataEmissao: '2026-10-07', totalFatura: total, textoAtesto: 'Atesto', equipamentos: [equipamento],
    itens: [{ itemNumero: 1, codigoItem: '1', descricao: 'Locação', unidade: 'MÊS', quantidade: 1, valorUnitario: total, valorTotal: total }]
  };
}

describe('Conferência financeira', () => {
  it('mostra composição, franquia mono e color sem modificar a fatura', () => {
    const atual = fatura();
    const original = JSON.stringify(atual);
    const resumo = resumirFatura(atual);
    expect(resumo.locacao).toBe(100);
    expect(resumo.excedentes).toBe(30);
    expect(resumo.franquiaMono).toBe(100);
    expect(resumo.franquiaColor).toBe(10);
    expect(resumo.divergeItens).toBeFalse();
    expect(resumo.divergeLeituras).toBeFalse();
    expect(JSON.stringify(atual)).toBe(original);
  });
  it('sinaliza divergências de itens, equipamentos e composição', () => {
    const atual = fatura();
    atual.itens[0].valorTotal = 125;
    atual.equipamentos[0].valorTotal = 120;
    const resumo = resumirFatura(atual);
    expect(resumo.diferencaItens).toBe(-5);
    expect(resumo.diferencaLeituras).toBe(-10);
    expect(resumo.divergeItens).toBeTrue();
    expect(resumo.divergeLeituras).toBeTrue();
    expect(resumo.equipamentosDivergentes.length).toBe(1);
  });
  it('tolera um centavo de arredondamento e compara bases zero sem infinito', () => {
    const atual = fatura();
    atual.itens[0].valorTotal = 130.01;
    expect(resumirFatura(atual).divergeItens).toBeFalse();
    expect(compararFaturas(atual, fatura(7, 100)).percentual).toBe(30);
    expect(compararFaturas(atual, fatura(7, 0)).percentual).toBeNull();
    expect(compararFaturas(fatura(8, 90), fatura(7, 100)).diferenca).toBe(-10);
  });
  it('trata janeiro e mantém meses do mesmo empenho separados', () => {
    expect(competenciaAnterior(1, 2026)).toEqual({ mes: 12, ano: 2025 });
    expect(chaveFatura(fatura(7))).not.toBe(chaveFatura(fatura(8)));
  });
});

describe('Painel de conferência da fatura', () => {
  let http: HttpTestingController;
  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    http = TestBed.inject(HttpTestingController);
  });
  afterEach(() => http.verify());
  function criar(mes = 8) {
    const fixture = TestBed.createComponent(ConferenciaFaturaComponent);
    fixture.componentRef.setInput('fatura', fatura(mes));
    fixture.detectChanges();
    return fixture;
  }
  it('consulta dezembro do ano anterior e mostra os contadores coloridos', () => {
    const fixture = criar(1);
    const req = http.expectOne(r => r.url.endsWith('/3/espelho-fatura'));
    expect(req.request.params.get('mes')).toBe('12');
    expect(req.request.params.get('ano')).toBe('2025');
    expect(req.request.context.get(SKIP_GLOBAL_LOADING)).toBeTrue();
    expect(req.request.context.get(SKIP_GLOBAL_ERROR)).toBeTrue();
    req.flush({ ...fatura(12, 100), anoReferencia: 2025 });
    fixture.componentInstance.toggleLeitura(0);
    fixture.detectChanges();
    expect(fixture.componentInstance.comparacao()!.diferenca).toBe(30);
    expect(fixture.nativeElement.querySelector('.reading-details').textContent).toContain('10 → 30');
    expect(fixture.nativeElement.textContent).toContain('Franquia aplicada');
    fixture.destroy();
  });
  it('cancela comparação antiga ao mudar competência e ao destruir o painel', () => {
    const fixture = criar();
    const antiga = http.expectOne(r => r.params.get('mes') === '7');
    fixture.componentRef.setInput('fatura', fatura(9));
    fixture.detectChanges();
    expect(antiga.cancelled).toBeTrue();
    const nova = http.expectOne(r => r.params.get('mes') === '8');
    fixture.destroy();
    expect(nova.cancelled).toBeTrue();
  });
  it('distingue falha de consulta de ausência de faturamento e permite tentar de novo', () => {
    const fixture = criar();
    http.expectOne(r => r.params.get('mes') === '7').flush({}, { status: 500, statusText: 'Error' });
    fixture.detectChanges();
    expect(fixture.componentInstance.estadoComparacao()).toBe('ERRO');
    expect(fixture.nativeElement.textContent).toContain('Não foi possível consultar');
    fixture.componentInstance.tentarComparacao();
    fixture.detectChanges();
    http.expectOne(r => r.params.get('mes') === '7').flush({ ...fatura(7, 0), equipamentos: [], itens: [] });
    fixture.detectChanges();
    expect(fixture.componentInstance.estadoComparacao()).toBe('PRONTO');
    expect(fixture.nativeElement.textContent).toContain('Sem faturamento registrado');
    fixture.destroy();
  });
  it('abre exatamente o empenho e mês clicados no demonstrativo anual', () => {
    const fixture = TestBed.createComponent(FinanceiroImpressorasComponent);
    const state = {
      empenhoFiltroNotas: signal<number | null>(null), mesesSelecionados: signal([8]),
      modoMultiplosMeses: signal(true), subTabFinanceiro: signal('DEMONSTRATIVO_ANUAL'),
      anoFinanceiro: signal(2026), carregarNotasFiscaisLote: jasmine.createSpy('carregar')
    };
    fixture.componentInstance.context = state as unknown as FinanceiroImpressorasComponentContext;
    fixture.componentInstance.abrirConferenciaMensal(3, 9);
    expect(state.empenhoFiltroNotas()).toBe(3);
    expect(state.mesesSelecionados()).toEqual([9]);
    expect(state.subTabFinanceiro()).toBe('NOTAS_MENSAIS');
    expect(state.carregarNotasFiscaisLote).toHaveBeenCalledTimes(1);
    expect(fixture.componentInstance.conferenciasAbertas().has('fatura-3-2026-9')).toBeTrue();
    fixture.destroy();
  });
});

describe('Navegação e impressão financeira', () => {
  let http: HttpTestingController;
  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    http = TestBed.inject(HttpTestingController);
  });
  afterEach(() => http.verify());
  function criarActions(state: object) {
    return TestBed.runInInjectionContext(() => new FinanceiroImpressorasActions(
      state as ConstructorParameters<typeof FinanceiroImpressorasActions>[0]
    ));
  }
  it('ignora uma resposta atrasada do mês anterior ao navegar entre competências', () => {
    const state = {
      notasFiscaisLote: signal<EspelhoFatura[]>([]), loadingNotasLote: signal(false),
      mesesSelecionados: signal([8]), anoFinanceiro: signal(2026), empenhoFiltroNotas: signal(3)
    };
    const actions = criarActions(state);
    actions.carregarNotasFiscaisLote();
    const antiga = http.expectOne(r => r.params.get('meses') === '8');
    state.mesesSelecionados.set([9]);
    actions.carregarNotasFiscaisLote();
    http.expectOne(r => r.params.get('meses') === '9').flush([fatura(9)]);
    antiga.flush([fatura(8)]);
    expect(state.notasFiscaisLote()[0].mesReferencia).toBe(9);
    expect(state.loadingNotasLote()).toBeFalse();
  });
  it('imprime somente a competência escolhida quando o empenho tem vários meses', () => {
    const container = document.createElement('div');
    const julho = document.createElement('div');
    julho.id = 'invoice-card-' + chaveFatura(fatura(7)); julho.textContent = 'Fatura julho';
    const agosto = document.createElement('div');
    agosto.id = 'invoice-card-' + chaveFatura(fatura(8)); agosto.textContent = 'Fatura agosto';
    container.append(julho, agosto); document.body.appendChild(container);
    try {
      const actions = criarActions({ incluirMedicaoImpressao: signal(true) });
      const print = spyOn(actions, 'imprimirConteudoIsolado');
      actions.imprimirNotaIndividual('10/2026', chaveFatura(fatura(8)));
      expect(print.calls.mostRecent().args[0]).toContain('Fatura agosto');
      expect(print.calls.mostRecent().args[0]).not.toContain('Fatura julho');
    } finally { container.remove(); }
  });
  it('remove os botões de navegação somente na cópia do demonstrativo para impressão', () => {
    const table = document.createElement('div');
    table.className = 'consolidado-table-wrapper';
    table.innerHTML = '<table><tr><td><button class="invoice-value-link">130,00</button></td></tr></table>';
    document.body.appendChild(table);
    try {
      const actions = criarActions({ subTabFinanceiro: signal('DEMONSTRATIVO_ANUAL') });
      const print = spyOn(actions, 'imprimirConteudoIsolado');
      actions.imprimirNotasFiscaisLote();
      expect(print.calls.mostRecent().args[0]).toContain('130,00');
      expect(print.calls.mostRecent().args[0]).not.toContain('<button');
      expect(table.querySelector('button')).not.toBeNull();
    } finally { table.remove(); }
  });
});
