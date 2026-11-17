---
titulo: Regras e segurança do banco
subtitulo: Gatilhos, segurança por linha (RLS) e quem pode acessar cada tabela
ordem: 3
resumo: Gatilhos do banco, estado do RLS e privilégios das tabelas, a partir das consultas de catálogo.
verificado: 2026-11-11
commit: 9d680f5
fontes:
  - docs/scripts/extracao_banco.sql
---

:::resumo
O banco tem duas camadas de proteção: **quem pode acessar a tabela** e, dentro disso, **quais linhas** cada pessoa enxerga (a segurança por linha, ou RLS). Esta página mostra como está configurado hoje e quais regras automáticas (gatilhos) existem.

O ponto de atenção é que, na maioria das tabelas, o RLS está desligado. Isso significa que a restrição de "o vendedor só vê os próprios clientes" existe só na tela, não no banco. Os detalhes e o que foi deduzido estão nos [[pagina:controle/achados|achados de segurança]].
:::

:::alerta seguranca Configuração observada, não testada
O que está abaixo vem das consultas de catálogo do banco (Q05, Q06, Q12 e Q13). Elas dizem **o que está configurado**. Nenhuma tentativa de acesso foi feita para confirmar o efeito real.
:::

## Como ler a tabela de acesso

- **RLS desligado + privilégios totais** para `anon` e `authenticated` quer dizer que, pela configuração, qualquer chamada autenticada ou anônima à API do Supabase pode ler e gravar a tabela sem restrição de linha.
- **RLS ligado com política** libera apenas o que a política descreve (nas tabelas de preditiva, tudo para quem está logado).
- **RLS ligado sem política** bloqueia o acesso a todos os papéis comuns; só funções com `SECURITY DEFINER` e o dono do banco alcançam a tabela.

## Gatilhos, segurança por linha e privilégios

:::gerado regras-banco
:::

:::fonte
`docs/scripts/extracao_banco.sql`: Q05 (gatilhos), Q06 (RLS e políticas), Q12 (privilégios de tabela), Q13 (quem executa as funções).
:::
