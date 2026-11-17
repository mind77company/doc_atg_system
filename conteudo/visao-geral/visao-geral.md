---
titulo: Visão geral e mapa dos módulos
subtitulo: O que é a plataforma, que problema resolve, quem usa e como as partes se ligam
resumo: Apresentação da plataforma QUIRON ATG SYSTEM, com o mapa dos módulos, os números atuais e a situação de cada parte.
ordem: 1
verificado: 2026-11-12
commit: 8db54a9
fontes:
  - package.json
  - metadata.json
  - src/App.tsx
  - src/utils/pages.ts
  - docs/data/banco.gerado.json
  - docs/data/fluxos.gerado.json
---

:::resumo
A plataforma da ATG Geradores (nome: **QUIRON ATG SYSTEM**) é um sistema na internet para acompanhar os **clientes** da ATG, os **geradores** de cada cliente e a **manutenção preditiva** deles: quais itens foram trocados, quando e quando vencem. Dali sai o **Relatório de Saúde**, um PDF para o cliente.

Ela também liga dois sistemas que a ATG já usa, o **Omie** e o **iClass**: cadastra o cliente nos dois de uma vez e busca no iClass os equipamentos e as fichas técnicas, para ninguém precisar digitar a mesma informação mais de uma vez. Além disso, mostra o catálogo de produtos e serviços do Omie, o histórico de alterações e tem telas de ordens de serviço e orçamentos.
:::

## Que problema ela resolve

Conforme o que o código e o banco mostram:

- **Um cadastro só:** o cliente é criado no Omie e no iClass pelo mesmo formulário ([[fluxo:criar-cliente]]).
- **Manutenção em um lugar:** os itens de preditiva de cada gerador, antes controlados em planilha, foram levados para o banco e ligados aos geradores ([[fluxo:importacao-preditivas]]).
- **Relatório pronto para o cliente:** o percentual de saúde e a situação de cada item viram um PDF ([[modulo:relatorio-de-saude]]).
- **Rastro das alterações:** quem mudou o quê e quando, com a possibilidade de reverter algumas mudanças ([[modulo:historico-e-reverter]]).
- **Acesso por perfil:** cada pessoa vê só o que lhe cabe, inclusive o vendedor, que vê apenas os clientes dele ([[pagina:visao-geral/perfis-e-permissoes]]).

## Quem usa

Pessoas da ATG, em três perfis: **administrador**, **usuário comum** (com páginas liberadas) e **vendedor** (só consulta os próprios clientes). Quem convida e libera acessos é o administrador. Detalhes em [[pagina:visao-geral/perfis-e-permissoes]].

## Mapa dos módulos

:::diagrama Mapa geral: as telas da plataforma usam o banco no Supabase e acionam os fluxos do n8n, que conversam com o iClass, o Omie, o Gmail e o WhatsApp.
flowchart LR
  subgraph P["Plataforma, no navegador"]
    A["Login e acesso"]
    B["Clientes e Geradores"]
    C["Preditiva, Ficha e Relatorio de Saude"]
    D["Produtos e Servicos"]
    E["Ordens de Servico e Orcamentos"]
    F["Historico"]
    G["Usuarios e Vendedores"]
  end
  S[("Supabase: banco, login e funcao de usuarios")]
  N["n8n: 10 fluxos de automacao"]
  I["iClass"]
  O["Omie"]
  M["Gmail e WhatsApp"]
  A --> S
  B --> S
  C --> S
  D --> S
  E --> S
  F --> S
  G --> S
  B --> N
  D --> N
  N --> S
  N --> I
  N --> O
  N --> M
  O -.->|aviso de pedido| N
:::

## Os módulos e a situação de cada um

| Módulo | Para que serve | Situação nos dados (2026-11-11) |
|---|---|---|
| [[modulo:clientes-lista]], [[modulo:criar-cliente]], [[modulo:corrigir-iclass]] | Cadastro de clientes ligado ao Omie e ao iClass | **Em uso:** 541 clientes |
| [[modulo:gerador]], [[modulo:ficha-de-levantamento]] | Geradores e fichas técnicas | **Em uso:** 478 geradores |
| [[modulo:preditiva-e-oxicatalisador]], [[modulo:relatorio-de-saude]] | Manutenção preditiva e relatório | **Em uso:** 6.573 itens de preditiva |
| [[modulo:historico-e-reverter]] | Diário de alterações | **Em uso:** 1.324 registros |
| [[modulo:usuarios-e-vendedores]], [[modulo:login-e-acesso]], [[modulo:definir-senha]] | Acessos e vendedores | **Em uso:** 18 vendedores |
| [[modulo:produtos-e-servicos]] | Catálogo vindo do Omie | **Em uso:** 903 produtos e 41 serviços |
| [[modulo:dashboard]], [[modulo:ordens-de-servico]], [[modulo:orcamentos]] | Painel, ordens de serviço e orçamentos | **Sem dados:** as duas tabelas têm 0 linhas, e nenhuma tela cria registros (V-030) |
| [[fluxo:receberorc]] | Gerar orçamento a partir de pedido do Omie | **Inacabado** na exportação (A-021) |
| [[modulo:geradores-legado]] | Fichas da versão antiga | **Legado**, tabela separada |
| [[modulo:configuracoes]] | Informações do sistema | Texto fixo e desatualizado (A-028) |

## Tecnologias, em uma frase cada

| Serviço ou tecnologia | Para quê |
|---|---|
| React e TypeScript | Construir as telas. |
| Vite | Preparar o site para publicar. |
| Tailwind | Aparência das telas. |
| Supabase | Banco de dados, login e a função que gerencia usuários. |
| n8n | As automações com iClass, Omie, Gmail e WhatsApp. |
| iClass e Omie | Sistemas externos da ATG, de onde vêm e para onde vão dados. |
| Vercel | Hospedagem do site em produção (informada pela equipe, V-001). |

Mais detalhes em [[pagina:visao-geral/arquitetura]].

## Ambientes

Há um ambiente de desenvolvimento (o computador de quem programa) e o de produção. Não há ambiente de teste separado identificado. Ver [[pagina:visao-geral/ambientes]].

## Para continuar lendo

- Quem pode o quê: [[pagina:visao-geral/perfis-e-permissoes]].
- Como as peças se encaixam por dentro: [[pagina:visao-geral/arquitetura]].
- O que não ficou claro e o que merece atenção: [[pagina:controle/pontos-a-validar]] e [[pagina:controle/achados]].

:::fonte
`package.json`, `metadata.json`, `src/App.tsx`, `src/utils/pages.ts`; contagens de linhas pela consulta Q08 (`docs/scripts/extracao_banco.sql`).
:::
