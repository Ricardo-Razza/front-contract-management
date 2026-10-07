const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const ts = require('typescript');

// Exercita as funções reais do componente, sem precisar de um navegador.
const actions = fs.readFileSync(path.join(__dirname, '../src/app/features/impressoras/coleta/coleta-impressoras.actions.ts'), 'utf8').replace(/this\.context\./g, 'this.');
const source = actions + '\n' + fs.readFileSync(path.join(__dirname, '../src/app/features/impressoras/impressoras.component.ts'), 'utf8');
function extract(name, computed = false) {
  const start = source.indexOf('  ' + name + (computed ? ' = computed' : '('));
  assert(start >= 0, name);
  const open = source.indexOf('{', start);
  let depth = 1, end = open + 1;
  while (depth) {
    if (source[end] === '{') depth++;
    if (source[end] === '}') depth--;
    end++;
    assert(end <= source.length, name);
  }
  return source.slice(start, end) + (computed ? ');' : '');
}
const fields = ['impressorasAtivasParaColeta', 'impressorasElegiveisParaColeta', 'impressorasFiltradasModalColeta',
  'idsImpressorasSelecionadasEfetivas', 'todasFiltradasModalMarcadas', 'itensExibidosColeta', 'itensColetaFiltrados', 'metricasColeta'];
const methods = ['marcarFiltradasModalColeta', 'desmarcarFiltradasModalColeta', 'alternarSelecaoFiltradasModalColeta',
  'alternarSelecaoImpressoraColeta', 'onSecretariaFiltroColetaChange', 'onFiltroSecretariaModalChange',
  'abrirModalSelecaoImpressoras', 'selecionarApenasComIpColeta', 'confirmarSelecaoImpressorasColeta', 'fecharModalSelecaoImpressoras'];
const code = 'class Harness {' + fields.map(n => extract(n, true)).join('\n') + methods.map(n => extract(n)).join('\n') + '}\nthis.Harness = Harness;';
const context = { computed: fn => fn };
vm.createContext(context);
vm.runInContext(ts.transpileModule(code, { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText, context);
const signal = initial => { let value = initial; const fn = () => value; fn.set = next => value = next; return fn; };
const h = new context.Harness();
const printers = [
  {id:1, ativo:true, modelo:'Pantum M7105DW', ip:'192.168.8.27', secretariaId:1},
  {id:2, ativo:true, modelo:'Ricoh', ip:'192.168.9.1', secretariaId:2},
  {id:3, ativo:true, modelo:'Pantum P3305DW', ip:'USB', secretariaId:1},
];
Object.assign(h, {
  printers: signal(printers), secretariaFiltroColeta: signal(null), empenhoFiltroColeta: signal(null),
  filtroSecretariaModalColeta: signal(null),
  buscaImpressoraModalColeta: signal(''), filtroRedeModalColeta: signal('TODAS'),
  coletarTodasImpressoras: signal(true), impressorasSelecionadasColeta: signal([]),
  paginaColeta: signal(1), modalSelecaoImpressorasAberto: signal(false),
  selecaoConfirmadaColeta: signal([]),
  secretariats: signal([{id:1, sigla:'A'}, {id:2, sigla:'B'}]),
  coletaSessao: signal({itens: printers.map(p => ({...p, impressoraId:p.id, secretariaSigla:p.secretariaId === 1 ? 'A' : 'B', status:p.id === 3 ? 'OFFLINE' : 'SUCESSO'}))}),
});
const ids = expected => assert.equal(JSON.stringify(h.idsImpressorasSelecionadasEfetivas()), JSON.stringify(expected));
ids([1,2,3]);
assert.equal(h.itensColetaFiltrados().length, 3);
const sessaoInicial = h.coletaSessao();
h.coletaSessao.set({itens: [sessaoInicial.itens[0]]});
assert.equal(h.itensColetaFiltrados().length, 3);
assert.equal(h.metricasColeta().pendentes, 2);
h.coletaSessao.set(sessaoInicial);
h.buscaImpressoraModalColeta.set('pantum');
h.marcarFiltradasModalColeta();
ids([1,3]);
h.buscaImpressoraModalColeta.set('ricoh');
ids([2]); // A troca de busca substitui as impressoras selecionadas pelo filtro anterior.
h.buscaImpressoraModalColeta.set('192.168.8.27');
ids([1]);
h.buscaImpressoraModalColeta.set('');
h.filtroRedeModalColeta.set('COM_IP');
ids([1,2]);
h.filtroRedeModalColeta.set('SEM_IP');
ids([3]);
h.filtroRedeModalColeta.set('TODAS');
h.onSecretariaFiltroColetaChange(1);
ids([1,3]);
h.onFiltroSecretariaModalChange(2);
ids([2]);
h.onFiltroSecretariaModalChange(null);
ids([1,2,3]);
h.alternarSelecaoFiltradasModalColeta();
ids([]);
h.alternarSelecaoFiltradasModalColeta();
ids([1,2,3]);
h.buscaImpressoraModalColeta.set('pantum');
h.filtroRedeModalColeta.set('COM_IP');
h.abrirModalSelecaoImpressoras();
assert.equal(h.buscaImpressoraModalColeta(), 'pantum');
assert.equal(h.filtroRedeModalColeta(), 'COM_IP');
ids([1]);
h.buscaImpressoraModalColeta.set('inexistente');
ids([]);
assert.equal(h.todasFiltradasModalMarcadas(), false);
h.buscaImpressoraModalColeta.set('pantum');
h.filtroRedeModalColeta.set('TODAS');
h.coletaSessao.set({itens: [{...printers[0], id:100, sessaoId:20, impressoraId:1, status:'SUCESSO', nomeArquivo:'pantum.png'}]});
h.confirmarSelecaoImpressorasColeta();
assert.equal(h.itensColetaFiltrados().length, 2);
assert.equal(h.itensColetaFiltrados()[0].nomeArquivo, 'pantum.png');
assert.equal(h.itensColetaFiltrados()[1].status, 'PENDENTE');
assert.equal(h.itensColetaFiltrados()[1].sessaoId, 0);
assert.equal(h.modalSelecaoImpressorasAberto(), false);
h.buscaImpressoraModalColeta.set('ricoh');
assert.equal(h.itensColetaFiltrados().length, 1);
assert.equal(h.itensColetaFiltrados()[0].impressoraId, 2);
h.buscaImpressoraModalColeta.set('pantum');
h.coletaSessao.set(null);
assert.equal(h.itensColetaFiltrados().length, 2); // Prévia funciona antes da primeira sessão.
h.buscaImpressoraModalColeta.set('inexistente');
h.confirmarSelecaoImpressorasColeta();
assert.equal(h.itensColetaFiltrados().length, 0);
h.selecaoConfirmadaColeta.set(null);
h.coletaSessao.set({itens: [
  {...printers[0], impressoraId:1, status:'SUCESSO'},
  {...printers[1], impressoraId:2, status:'OFFLINE'},
  {...printers[2], impressoraId:3, status:'ERRO'},
  {...printers[0], impressoraId:4, status:'PENDENTE'},
]});
const metrics = expected => assert.equal(JSON.stringify(h.metricasColeta()), JSON.stringify(expected));
metrics({total:4, sucesso:1, falhas:2, pendentes:1});
h.buscaImpressoraModalColeta.set('ricoh');
h.confirmarSelecaoImpressorasColeta();
metrics({total:1, sucesso:0, falhas:1, pendentes:0});
h.buscaImpressoraModalColeta.set('inexistente');
metrics({total:0, sucesso:0, falhas:0, pendentes:0});
h.buscaImpressoraModalColeta.set('pantum');
h.confirmarSelecaoImpressorasColeta();
metrics({total:2, sucesso:1, falhas:1, pendentes:0});
h.coletaSessao.set(null);
metrics({total:2, sucesso:0, falhas:0, pendentes:2});
console.log('Filtros, confirmação e KPIs validados, incluindo sucesso, falhas, pendentes e tabela vazia.');
