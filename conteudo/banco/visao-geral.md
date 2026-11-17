---
titulo: Banco de dados: visão geral
subtitulo: As tabelas do núcleo da plataforma, como se ligam e onde ler mais
ordem: 1
resumo: Mapa das tabelas e views do núcleo (clientes, geradores, preditivas, histórico) e suas ligações.
verificado: 2026-11-11
commit: 9d680f5
fontes:
  - docs/_fontes_privadas/schema/schema_banco_atg_completo.csv
  - docs/scripts/extracao_banco.sql
---

:::resumo
O banco de dados é onde a plataforma guarda tudo. O núcleo gira em torno do **cliente**: cada cliente tem **geradores**; cada gerador tem sua **ficha de levantamento**, seus itens de **manutenção preditiva** e o dado do **oxicatalisador**. Toda alteração importante deixa uma linha no **histórico**.

Esta seção explica cada tabela em linguagem simples e, em um bloco recolhível, traz os detalhes técnicos: campos, ligações, regras e quem usa.
:::

## O que está documentado

Todas as tabelas e views que fazem parte da lógica da plataforma: o núcleo (clientes, geradores, vendedores, preditivas, oxicatalisador, histórico), as ordens de serviço e orçamentos, o catálogo de produtos e serviços, as tabelas de apoio (iClass, Omie, comparação de nomes) e o legado ainda em uso.

Não entram as tabelas com prefixo `INATIVO_`, que a equipe indicou estarem fora da lógica da plataforma.

## Mapa do núcleo

:::diagrama Relacionamentos do núcleo: o cliente tem geradores; cada gerador tem itens de preditiva e oxicatalisador; o vendedor atende clientes.
flowchart LR
  V["vendedores"] -->|atende| C["omie_clientes: clientes"]
  C -->|1 para N, apaga junto| G["geradores_atg: geradores"]
  G -->|N itens| P["preditivas_atg: itens de preditiva"]
  I["preditiva_itens: catalogo de 7 itens"] -->|define| P
  G -->|sem trava de unicidade| X["oxicatalisador_atg"]
  S["preditivas_staging: planilha importada"] -.->|funcao processar_preditivas| P
  S -.-> X
  L["log_edicoes: historico"] -.->|aponta por entidade e id| C
  L -.-> G
  L -.-> P
:::

As linhas pontilhadas são ligações que o banco **não impõe** (não são chaves estrangeiras): o histórico aponta para vários tipos de registro, e a planilha é lida pela função de importação.

## Diagrama das relações impostas pelo banco (ER)

:::gerado er omie_clientes geradores_atg vendedores preditivas_atg preditiva_itens oxicatalisador_atg
:::

Este diagrama é gerado a partir das chaves estrangeiras reais do banco e mostra, em cada tabela, só as chaves primárias e estrangeiras. Use o botão "Ampliar" para ver em tela cheia.

## Tabelas e views documentadas

:::gerado lista-objetos
:::

## Como ler as páginas de tabela

- **Campos:** cada campo tem tipo, se é obrigatório, valor padrão e o significado de negócio. Campos que guardam dado pessoal levam o selo {{pessoal}}. Campos cujo propósito não se encontrou levam {{fi}}, e o que é dedução leva {{nc}}.
- **Relacionamentos:** de qual tabela para qual, a cardinalidade e o que acontece ao apagar ou atualizar.
- **Quem lê e quem grava:** lista, a partir do código, os arquivos do `src/` que acessam a tabela, e as funções, views e fluxos que a usam.
- **Regras do banco:** gatilhos, validações, segurança por linha (RLS) e privilégios.

:::detalhes Extensões do PostgreSQL instaladas
:::gerado extensoes
:::
Em uso na lógica: `pg_trgm` (similaridade de nomes) e `unaccent` (remover acentos) pela comparação de nomes; `uuid-ossp` e `pgcrypto` aparecem instaladas sem uso identificado no código analisado {{nc}}; `pg_stat_statements` é de monitoramento do próprio Supabase; `supabase_vault` é do Supabase.
:::

:::detalhes Migrations e histórico de mudanças do banco
O repositório **não tem pasta de migrations**. Não é possível reconstruir o histórico de mudanças do banco a partir do código. A única fonte de estrutura no repositório era uma exportação das colunas (`schema_banco_atg_completo.csv`), e o restante desta documentação vem de consultas de leitura ao catálogo do banco feitas em 2026-11-11. Os rastros que existem estão reunidos em [[pagina:banco/historico-de-mudancas]].
:::

:::fonte
`docs/_fontes_privadas/schema/schema_banco_atg_completo.csv`, `docs/scripts/extracao_banco.sql` (consultas Q01 a Q13), `src/types.ts`.
:::
