# Férias e afastamentos — escala anual

## Interface

A aba inicial é **Escala anual**, baseada em `Desktop/ferias.jpeg`: faixas azuis por mês, unidade e servidor à esquerda, 31 colunas de dias, fins de semana/feriados em cinza e faixas por período aquisitivo. A paleta é estável: 2025/2026 amarelo, 2024/2025 roxo, 2023/2024 azul. Planejamentos usam borda tracejada e parcelas opcionais usam 1ª/2ª/3ª. As faixas têm descrição completa ao passar o mouse ou focar pelo teclado.

Fluxo: cadastre o período na aba **Saldos e períodos** → use **Novo agendamento** (ou o + do mês) → escolha servidor, tipo, período e datas → revise saldo e cobertura → salve planejado ou confirmado. O cadastro de um período dentro do formulário retorna sem perder as datas. Clique na faixa para editar. A aba **Agendamentos** permite buscar, filtrar, paginar e cancelar mantendo histórico. A impressão reproduz a matriz anual completa, respeitando filtros de servidor, secretaria e setor.

## Contrato da API

- `GET /ferias?ano=2026`: agendamentos que interceptam o ano, incluindo cancelados; mantém datas completas e dados do servidor. Alertas são recalculados na leitura.
- `GET /ferias/escala-anual?ano=2026`: contrato anterior preservado; a nova tela usa os metadados de dias e feriados desta resposta.
- `GET /periodos-aquisitivos`: períodos com `secretariaId`, `servidorSetor`, `diasReservados` e `diasGozados`, além dos campos anteriores.
- `POST /ferias` e `PUT /ferias/{id}`: os contratos existentes foram preservados. O servidor é imutável na edição; período aquisitivo deve pertencer a ele. A troca de servidor requer cancelar e criar outro registro.
- `POST /ferias/verificar-conflito`: retorna `temConflito`, `bloqueante`, `mensagem` e `conflitos`. Próprio servidor: bloqueio. Colegas: apenas mesma secretaria **e** mesmo setor informado, com possibilidade de confirmar ciência. A mudança de datas remove o aceite anterior.
- `PATCH /ferias/{id}/cancelar`: operação idempotente; devolve saldo uma vez e preserva o agendamento cancelado. Cancelados não podem ser editados.
- Endpoints anteriores de consulta por servidor, exclusão e gestão de períodos continuam disponíveis.

`diasUsados` continua representando dias comprometidos para compatibilidade. `diasGozados` soma dias confirmados decorridos até hoje, incluindo hoje. `diasReservados = diasUsados - diasGozados`. Planejamentos, mesmo passados, permanecem reservados até confirmação ou cancelamento. Não há migração destrutiva nem tarefa agendada para alterar status.

As gravações usam transação READ_COMMITTED, bloqueio do servidor e do período, validação de titularidade e estorno/débito atômicos. Períodos sobrepostos e redução do total abaixo do saldo comprometido são rejeitados. Períodos com qualquer histórico vinculado não podem ser excluídos. Foi mantida a regra existente de até 30 dias por agendamento de férias; outros tipos de afastamento não recebem esse limite. A regra existente de sugerir o limite de gozo em um ano após a aquisição permanece explícita no formulário.

## Validação local

API, Java 21: `mvn -o -Dtest=FeriasServiceTest,FeriasPersistenceTest test`. Os testes de persistência usam H2 em memória, configuração isolada e nenhuma execução de schedulers da aplicação. Incluem consultas de conflitos, limites inclusivos, rollback de saldo e reservas simultâneas. H2 não substitui uma homologação no MySQL usado em produção.

Front: `node scripts/test-ferias-escala.cjs` e `npm run build`. Testes da escala incluem mudança de mês/ano, ano bissexto, cancelados, parcelas, dados antigos sobrepostos, feriados e paleta.

Revisão visual com Chrome em modo headless e respostas fictícias da API: script auxiliar `../ferias-browser-review.cjs`; capturas em `../ferias-review/`. As imagens e o PDF são demonstrações, não dados reais. Para usar a aplicação atualizada, reinicie a API e o front e abra `/ferias`.
