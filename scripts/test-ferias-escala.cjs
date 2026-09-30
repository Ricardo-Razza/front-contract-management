const fs = require("node:fs");
const path = require("node:path");
const assert = require("node:assert/strict");
const ts = require("typescript");
const source = fs.readFileSync(
  path.join(__dirname, "../src/app/features/ferias/ferias-escala.utils.ts"),
  "utf8",
);
const compiled = ts.transpileModule(source, {
  compilerOptions: {
    module: ts.ModuleKind.CommonJS,
    target: ts.ScriptTarget.ES2022,
  },
}).outputText;
const mod = { exports: {} };
new Function("exports", "require", "module", compiled)(
  mod.exports,
  require,
  mod,
);
const { montarEscala, corPeriodo, corAgendamento } = mod.exports;
const base = {
  id: 1,
  servidorId: 1,
  servidorNome: "Ana",
  servidorMatricula: 1,
  servidorSetor: "TI",
  status: "CONFIRMADO",
  tipoAfastamento: "FERIAS",
  periodoIdentificador: "2025/2026",
  dataInicio: "2026-01-25",
  dataFim: "2026-02-08",
};
let total = 0;
function test(name, fn) {
  fn();
  total++;
  console.log("PASS " + name);
}
test("cross-month booking is clipped to the exact days", () => {
  const e = montarEscala(2026, [base], null);
  assert.equal(e.length, 12);
  assert.equal(e[0].linhas[0].faixas[0].inicio, 25);
  assert.equal(e[0].linhas[0].faixas[0].fim, 31);
  assert.equal(e[1].linhas[0].faixas[0].inicio, 1);
  assert.equal(e[1].linhas[0].faixas[0].fim, 8);
});
test("leap year and invalid columns", () => {
  const e = montarEscala(2024, [], null);
  assert.equal(e[1].totalDias, 29);
  assert.equal(e[1].dias.length, 31);
  assert.equal(montarEscala(2026, [], null)[1].totalDias, 28);
});
test("cancelled records are excluded", () => {
  assert.equal(
    montarEscala(2026, [{ ...base, status: "CANCELADO" }], null)[0].linhas
      .length,
    0,
  );
});
test("adjacent fractions share a row", () => {
  const a = { ...base, dataInicio: "2026-01-01", dataFim: "2026-01-10" };
  const b = { ...base, id: 2, dataInicio: "2026-01-11", dataFim: "2026-01-20" };
  assert.equal(montarEscala(2026, [a, b], null)[0].linhas.length, 1);
});
test("legacy overlapping records are not hidden", () => {
  const e = montarEscala(2026, [base, { ...base, id: 2 }], null);
  assert.equal(e[0].linhas.length, 2);
});
test("same-name servers are kept separate", () => {
  assert.equal(
    montarEscala(2026, [base, { ...base, id: 2, servidorId: 2 }], null)[0]
      .linhas.length,
    2,
  );
});
test("holidays retain API metadata", () => {
  const day = {
    dia: 1,
    ehFeriado: true,
    nomeFeriado: "Ano novo",
    ehFimDeSemana: false,
  };
  const e = montarEscala(2026, [], { meses: [{ mesNumero: 1, dias: [day] }] });
  assert.equal(e[0].dias[0].nomeFeriado, "Ano novo");
  assert.equal(e[0].dias[0].ehFeriado, true);
});
test("photo palette is stable across reference years", () => {
  assert.equal(corPeriodo(2025), "#f2d524");
  assert.equal(corPeriodo(2024), "#8064a2");
  assert.equal(corAgendamento(base), corPeriodo(2025));
  assert.ok(corPeriodo(2030));
});
test("cross-year booking only occupies visible year", () => {
  const e = montarEscala(
    2026,
    [{ ...base, dataInicio: "2025-12-20", dataFim: "2026-01-10" }],
    null,
  );
  assert.equal(e[0].linhas[0].faixas[0].inicio, 1);
  assert.equal(e[0].linhas[0].faixas[0].fim, 10);
  assert.equal(e[11].linhas.length, 0);
});
console.log(`${total} calendar tests passed.`);
