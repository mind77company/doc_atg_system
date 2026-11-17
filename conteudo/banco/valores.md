---
titulo: Valores possíveis de status e tipo
subtitulo: O significado de cada valor dos campos de situação do núcleo
ordem: 4
resumo: Todos os valores de status e tipo dos campos do núcleo, com significado e quantidade de linhas.
verificado: 2026-11-11
commit: 9d680f5
fontes:
  - docs/scripts/extracao_banco.sql
  - src/types.ts
---

:::resumo
Vários campos do banco só aceitam um conjunto pequeno de valores, como `ATIVO`, `OK` ou `vencido`. Esta página reúne todos eles em um só lugar, com o que cada um significa e quantas linhas usam cada valor em 2026-11-11.

Onde o significado não está escrito no código, o valor aparece marcado como {{nc}}.
:::

:::gerado valores
:::

:::fonte
Quantidades: consulta Q11 de `docs/scripts/extracao_banco.sql` (apenas contagens, sem dados pessoais). Significados: código-fonte indicado na página de cada tabela.
:::
