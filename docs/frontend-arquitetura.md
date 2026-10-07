# Organização e resiliência do frontend

## Impressoras

`ImpressorasComponent` mantém o estado compartilhado da rota, a navegação e o inventário. Os filhos recebem contratos tipados com `Pick`, contendo somente os sinais e as operações usados pelo template:

- `app-grade-leituras`: filtros, matriz e salvamento em lote.
- `app-financeiro-impressoras`: notas, demonstrativo e empenhos.
- `app-coleta-impressoras`: execução e progresso.
- `app-modal-coleta-snmp`: seleção dos equipamentos.
- `app-comprovante-viewer`: visualização, zoom e download.

As operações ficam em `LeiturasImpressorasActions`, `FinanceiroImpressorasActions`, `ColetaImpressorasActions` e `ComprovanteImpressorasActions`. A fachada delega para elas. O estado permanece único para preservar a sincronização entre abas, modais e cabeçalho. Referências ao componente usadas para tipagem são `import type`, sem dependência circular em runtime.

Os estilos foram divididos entre os componentes. Os limites originais de budget não foram aumentados.

## Compartilhados

`EquipeFormComponent` edita o `FormArray` recebido. Contratos e atas continuam responsáveis por seus payloads e salvamento. O seletor de servidores e as operações visuais têm uma implementação compartilhada.

`AnexoManagerComponent` recebe ID e origem (`CONTRATO` ou `ATA`) e concentra listagem, upload, exclusão, download e preview. `BodyPortalDirective` mantém os overlays fora de containers com overflow/transform. O pai preserva a prioridade do Escape: preview/upload antes de detalhes.

## HTTP

Interceptores funcionais registrados em ordem:

1. `authInterceptor`: lê `AUTH_TOKEN_SOURCE` e envia o token somente à API. O provider padrão retorna `null`; a autenticação permanece desativada. Authorization explícito é preservado.
2. `loadingInterceptor`: contabiliza requisições simultâneas e usa `finalize` em sucesso, erro ou cancelamento.
3. `errorInterceptor`: exibe um toast e devolve o erro ao chamador. Callbacks locais restauram o estado da tela sem duplicar o aviso.

`SKIP_GLOBAL_LOADING` evita que polling faça a barra piscar. `SKIP_GLOBAL_ERROR` permite tratamento específico. Validações anteriores ao HTTP continuam nas telas.

Assinaturas nos componentes e operações extraídas usam `takeUntilDestroyed` com `DestroyRef` explícito, inclusive em callbacks fora do contexto de injeção. O intervalo de polling continua sendo encerrado pela rota.

## Paginação

Contratos e atas consultam páginas no servidor. Mudanças de filtros/ordenação disparam nova consulta e cancelam a anterior. O total vem de `totalElements`; opções de ano/tipo vêm de `/filtros`. A exportação busca a listagem completa sob demanda e aplica os filtros atuais.

A API preserva busca sem acentos, tokens numéricos, filtros de secretaria, fiscal/gestor e vigência e ordenação por número/ano.

No backend, a listagem padrão pagina diretamente no banco. Consultas com filtros ou ordenação especial ainda processam os DTOs completos no servidor para preservar a semântica anterior, devolvendo somente a página. Isso reduz tráfego e memória do navegador, mas mantém o custo de carregar os registros no servidor. Uma evolução futura pode transferir essas regras para SQL com os mesmos testes de compatibilidade.

O frontend deve ser entregue junto dos endpoints ampliados do backend. As rotas antigas continuam disponíveis.

## Testes e lint

Jasmine/Karma usa o builder oficial do Angular 19. Os testes cobrem operações de medição, meses faturados, vínculo de anexos, FormArray, destruição, requisições concorrentes e paginação reativa.

O lint verifica injeção moderna, sintaxe de templates e erros básicos de TypeScript, incluindo os arquivos legados. Regras mais rigorosas podem ser adicionadas gradualmente.

Referências: [interceptores Angular](https://angular.dev/guide/http/interceptors), [testes no Angular 19](https://v19.angular.dev/guide/testing), [angular-eslint](https://github.com/angular-eslint/angular-eslint).
