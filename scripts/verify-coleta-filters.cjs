const path = require('node:path');
const { execFileSync } = require('node:child_process');

// Valida os componentes reais: filtros nunca alteram a seleção confirmada.
execFileSync(process.execPath, [
  path.join(__dirname, '../node_modules/@angular/cli/bin/ng.js'),
  'test', '--watch=false', '--browsers=ChromeHeadless',
  '--include=src/app/features/impressoras/coleta/coleta-selecao.spec.ts'
], { cwd: path.join(__dirname, '..'), stdio: 'inherit' });
