---
titulo: Infraestrutura
subtitulo: Onde cada peça roda, o que roda sozinho e o que não está registrado
resumo: Visão simples da infraestrutura: hospedagem do site, Supabase, n8n, jobs agendados, filas, logs, backups e monitoramento.
ordem: 1
verificado: 2026-11-12
commit: 8db54a9
fontes:
  - package.json
  - docs/data/fluxos.gerado.json
  - docs/data/banco.gerado.json
  - docs/scripts/extracao_banco.sql
---

:::resumo
A plataforma roda em **três lugares**: o **site** (a parte que as pessoas abrem no navegador), o **Supabase** (banco de dados, login e a função de usuários) e o **n8n** (as automações). Nenhum deles fica em servidor próprio da ATG: são serviços contratados.

Do ponto de vista de operação, o que mais falta é registro: o repositório não diz onde o site está hospedado, como são feitos os **backups** do banco, quem **monitora** os fluxos nem para onde vão os **logs**. Esta página marca esses pontos como "Não confirmado".
:::

## Onde cada peça roda

| Peça | Onde roda | Fonte da informação |
|---|---|---|
| **Site** (arquivos estáticos montados pelo Vite) | **Vercel**, segundo a equipe. {{nc}} Não há configuração de hospedagem no repositório (V-001). | Informada pela equipe. |
| **Banco, login, função de usuários** | **Supabase**, um projeto. Região, plano e backups não constam no repositório. {{nc}} | Código e consultas ao catálogo. |
| **Automações** | **n8n** em um servidor **Easypanel**. Versão, quem opera o servidor e como é feito o backup não constam. {{nc}} | Endereços nos arquivos `atgBackend.ts` e `webhooks.ts`; 10 fluxos exportados. |
| **iClass e Omie** | Sistemas externos, na nuvem dos fornecedores. | Fluxos do n8n. |
| **Gmail e UazAPI** | Serviços externos usados pelo n8n. | Fluxos do n8n. |

## O que roda sozinho (agendamentos)

| O quê | Quando | Onde |
|---|---|---|
| Atualização de preços de produtos | A cada 30 dias | n8n ([[fluxo:preco-produto-mensal]]) |
| Atualização de preços de serviços | A cada 30 dias | n8n ([[fluxo:preco-servico-mensal]]) |
| Atualização da view de pesos de nomes (`mv_idf_tokens`) | **Não identificado** | Banco (V-005). A extensão de agendamento `pg_cron` **não está instalada**, então não há tarefa agendada dentro do banco. |

Nenhuma outra tarefa agendada foi encontrada. Os dois agendamentos do n8n estão ativos na exportação, mas **os e-mails de aviso deles têm campos provisórios**, e não há aviso de falha.

## Filas

**Não há filas** de mensagens ou de tarefas. Cada chamada é imediata; o único controle de ritmo é a contagem de chamadas ao iClass no banco ([[funcao:consumir_rate_limit_iclass]]).

## Logs e registros

| Tipo | Onde | Observação |
|---|---|---|
| **Registro de negócio** (quem mudou o quê) | Tabela [[tabela:log_edicoes]], lida pela tela [[modulo:historico-e-reverter]] | Não cobre convites, senhas, O.S., orçamentos nem produtos. |
| **Execuções dos fluxos** | Painel do n8n | O n8n guarda o histórico de execuções por fluxo. Por quanto tempo, não consta. {{nc}} |
| **Logs do banco, do login e da função de usuários** | Painel do Supabase | Não consultados nesta documentação. {{nc}} |
| **Erros do navegador** | Console do navegador de quem usa | A plataforma não envia erros a nenhum serviço de monitoramento. |

## Backups

| O quê | Situação |
|---|---|
| **Banco de dados** | Não há registro de backup no repositório. Existem **cópias manuais em tabelas** dentro do próprio banco (por exemplo, a de `omie_clientes` de 08/10/2026), que não substituem um backup. O Supabase pode ter backup automático conforme o plano. {{nc}} |
| **Código** | No Git (repositório no GitHub). |
| **Função `manage-users`** | Quatro versões guardadas em `docs/backups/` (geradas durante a criação do perfil Vendedor). |
| **Fluxos do n8n** | Exportações em arquivos (cópia local, fora do Git, em `docs/_fontes_privadas/n8n/`). O servidor n8n pode ter backup próprio. {{nc}} |

## Monitoramento e alertas

**Não identificado.** O repositório não tem monitoramento de disponibilidade, painel de métricas nem alerta de falha. Os avisos que existem são os da tela (para quem está usando) e os e-mails e WhatsApp do fluxo `receberorc`, que está inacabado. Falhas dos fluxos de preço e do iClass **não avisam ninguém**.

## Segurança da infraestrutura

- Segredos (chaves do Omie e de administrador do Supabase) estão escritos dentro de fluxos do n8n (A-001, A-002).
- Os webhooks do n8n não têm autenticação (A-029).
- O banco tem acesso total para os papéis da API na maior parte das tabelas (A-003).

## Custos e responsáveis

Não constam no repositório quem paga cada serviço, os planos contratados nem quem é o responsável técnico pela operação de cada peça. {{nc}}

:::fonte
`package.json`, `docs/data/fluxos.gerado.json`, consultas Q07 e Q08 (`docs/scripts/extracao_banco.sql`), `src/utils/atgBackend.ts`, `src/utils/webhooks.ts`, `docs/backups/`.
:::

## Ligações

[[pagina:visao-geral/arquitetura]], [[pagina:visao-geral/ambientes]], [[integracao:supabase]], [[integracao:n8n]], [[pagina:operacao/quando-algo-da-errado]].
