---
titulo: Configurações
subtitulo: Tela informativa sobre o sistema
resumo: Página somente de leitura com o status do banco e informações sobre o sistema; não altera nenhuma configuração.
ordem: 11
verificado: 2026-11-12
commit: 8db54a9
fontes:
  - src/pages/Configuracoes.tsx
---

:::resumo
A página "Configurações do Sistema" **não configura nada**: é uma tela de informação, com um cartão de status ("Conectado ao Supabase"), dois quadros ("Ambiente: Produção" e "Banco de Dados: Supabase (PostgreSQL)") e um texto "Sobre este Sistema".

Parte do texto está **desatualizada** (ver abaixo), então ela não deve ser usada como fonte de verdade sobre o sistema.
:::

## Quem usa

Quem tem a página "Configurações" liberada. Não há nenhum botão, campo ou ação.

## O que a pessoa vê

| Parte | Texto |
|---|---|
| Status da API e Banco | "Conectado ao Supabase · Clientes ainda utiliza dados locais (tabela em preparação)." |
| Ambiente | "Produção" |
| Banco de Dados | "Supabase (PostgreSQL)" |
| Sobre este Sistema | Painel operacional da ATG Geradores para gestão de Ordens de Serviço e Orçamentos, com autenticação real via Supabase Auth, exportação de relatórios em Excel (SheetJS) e controle de acesso por perfil (Administrador / Usuário Comum). |

## O que está fixo e desatualizado

- O status "**Conectado ao Supabase**" é texto fixo: a tela **não testa** a conexão.
- "**Clientes ainda utiliza dados locais (tabela em preparação)**" já não é verdade: a tela de Clientes lê o banco ([[modulo:clientes-lista]]).
- "**Ambiente: Produção**" é texto fixo, sem relação com o ambiente real. A plataforma não tem outros ambientes registrados no repositório.
- "**Administrador / Usuário Comum**": hoje existem **três** perfis, incluindo o vendedor ([[modulo:login-e-acesso]]).

Registrado como A-028 em [[pagina:controle/achados]].

## Tabelas e integrações

Não lê nem grava nenhuma tabela e não chama nenhuma integração.

:::fonte
`src/pages/Configuracoes.tsx` (arquivo inteiro).
:::
