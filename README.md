# Contract Management — Frontend

Interface para contratos, atas, equipes, servidores, secretarias, férias e impressoras.

## Stack

- Angular 19, componentes standalone, Angular Router e Signals.
- TypeScript 5.6 e RxJS 7.8.
- SCSS e componentes próprios de toast, modal, paginação e máscaras.
- Jasmine/Karma para testes e angular-eslint para lint.

O projeto não utiliza PrimeNG, Chart.js, ngx-mask, Angular Toastr ou Tailwind.

## Executar

```powershell
npm ci
npm start
```

* **Frontend**: `http://localhost:4200`
* **Backend integrado**: `http://localhost:8081/api`

### Ambientes e Proxy

* **Desenvolvimento (`ng serve` / `npm start`)**: O dev server utiliza `proxy.conf.json`, encaminhando requisições de `/api` para `http://localhost:8081/api`.
* **Produção (`ng build` / Docker)**: Configurado com `environment.prod.ts` (`apiUrl: '/api'`) e `nginx.conf` com proxy reverso apontando para o serviço de backend (`http://backend:8081/api/`), dispensando configuração de CORS em produção.

### Execução Conjunta (Frontend + Backend)

Para subir o frontend junto com o backend Spring Boot em janelas dedicadas:
```powershell
# A partir do diretório raiz de projetos:
.\iniciar.ps1
```

Use Node.js compatível com Angular 19 (Node 22 LTS recomendado). Consulte a [tabela oficial](https://angular.dev/reference/versions).

## Qualidade

```powershell
npm run typecheck
npm run lint
npm run test:ci
npm run build
```

`npm test` acompanha alterações. `test:ci` usa Chrome headless e encerra a execução. Se o navegador não for encontrado, configure `CHROME_BIN` com seu caminho.

A suíte cobre escala anual, pipes, serviços HTTP, interceptores, cancelamento de requisições, equipes, anexos, paginação e operações de impressoras. Os scripts legados em `scripts/` continuam disponíveis.

## Organização

`core` concentra contratos da API, serviços, interceptores e utilitários. `features` contém as telas. `shared` contém componentes, pipes e diretivas reutilizáveis.

Impressoras possui componentes para grade, financeiro, coleta e comprovantes, com operações separadas em `leituras`, `financeiro`, `coleta` e `comprovante`.

Veja [as decisões de arquitetura e compatibilidade](docs/frontend-arquitetura.md).

## Backend e paginação

Contratos e atas usam `/paginado` com `page`, `size`, `sort` e filtros opcionais. A API indexa páginas a partir de zero; a interface, de um. `/filtros` fornece anos e tipos, independentemente da página visível.

Essas telas exigem o backend com os filtros e `/filtros` incluídos nesta atualização. A exportação completa consulta os registros somente quando solicitada.
