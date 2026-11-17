---
titulo: Supabase
subtitulo: O banco de dados, o login dos usuários e a função de servidor da plataforma
resumo: Serviço que guarda os dados, autentica quem entra e executa a função manage-users.
ordem: 1
verificado: 2026-11-12
commit: 8db54a9
fontes:
  - src/utils/supabase.ts
  - src/App.tsx
  - supabase/functions/manage-users/index.ts
  - src/utils/atgBackend.ts
  - docs/data/codigo.gerado.json
---

:::resumo
O Supabase é o coração técnico da plataforma. Ele guarda **todos os dados** (clientes, geradores, preditivas, histórico, produtos), cuida do **login** de quem usa e roda a **função de servidor** que gerencia usuários.

Sem o Supabase a plataforma não abre: o login falha e nenhuma lista carrega.
:::

## Para que serve, e quem usa

| Parte do Supabase | Para que a plataforma usa | Quem usa |
|---|---|---|
| **Banco de dados** (PostgreSQL) | Todas as tabelas, views e funções do núcleo. Ver [[pagina:banco/visao-geral]]. | Todas as telas; os fluxos do n8n. |
| **Autenticação** (Auth) | Login por e-mail e senha, convites, definição de senha, perfil e páginas liberadas. Ver [[modulo:login-e-acesso]]. | Todas as pessoas que entram; a função [[fluxo:manage-users]]. |
| **Edge Function** | A função `manage-users`, que roda no servidor com a chave de administrador. | A tela [[modulo:usuarios-e-vendedores]]. |
| **Envio de e-mails do Auth** | O e-mail de convite. Ver [[fluxo:convite-e-senha]]. | A função `manage-users`. |

## Direção do dado

**Ambos os sentidos:** a plataforma lê e grava. É o único "dono" dos dados: as demais integrações (iClass, Omie) alimentam o banco por meio dos fluxos do n8n ou das telas.

## Onde é chamado no código

- **Cliente único:** `src/utils/supabase.ts` cria um cliente com a URL e a chave pública. Se as duas variáveis de ambiente não existirem, o cliente é `null` e as telas mostram "Supabase não configurado" (ou, nos catálogos, usam dados de exemplo; A-027).
- **Telas:** 15 tabelas e views são acessadas por `supabase.from(...)` em páginas e componentes (lista completa em [[pagina:banco/visao-geral]] e na seção "Quem lê e quem grava" de cada tabela).
- **Funções do banco (RPC):** `criar_gerador`, `salvar_preditiva` e `validar_cadastro`, por `supabase.rpc`, em `src/utils/atgBackend.ts`. Ver [[pagina:banco/funcoes]].
- **Autenticação:** `signInWithPassword`, `signOut`, `getSession`, `getUser`, `onAuthStateChange` e `updateUser`.
- **Edge Function:** `supabase.functions.invoke("manage-users")`.
- **Fluxos do n8n:** chamam a API REST do banco (função `consumir_rate_limit_iclass`; gravação de `Produtos` e `Serviços`) e usam a credencial do tipo `supabaseApi`.

## Formato dos dados

JSON pela API REST do Supabase. Nas tabelas, campos de texto, números, datas e JSON (`ficha_levantamento`, `caracteristicas`, `match_candidatos`).

## Autenticação

| Quem | Tipo de acesso |
|---|---|
| Navegador | Chave **pública** (anon), mais a sessão da pessoa logada. |
| Edge Function | Chave pública para identificar quem chama e chave de **administrador** (`service_role`), só dentro do servidor. |
| Fluxos do n8n | Chave pública (conferida no tipo) nos que chamam a função de limite; chave de **administrador** escrita nos dois fluxos de atualização forçada (A-001); credencial `supabaseApi` do n8n nos fluxos mensais e no `receberorc`. |

Os valores das chaves não são reproduzidos nesta documentação.

## Variáveis de ambiente

| Nome | Para que serve | Obrigatória |
|---|---|---|
| `VITE_SUPABASE_URL` | Endereço do projeto, lido no navegador. | Sim |
| `VITE_SUPABASE_ANON_KEY` | Chave pública, lida no navegador. | Sim |
| `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` | Usadas pela função `manage-users`. {{nc}} Normalmente injetadas pelo próprio Supabase nas funções. | Sim, na função |

## Limites e restrições conhecidos

- **Limite de envio de e-mails** do convite: causa o erro "email rate limit". Ver [[fluxo:convite-e-senha]].
- **Segurança por linha (RLS) desligada** na maior parte das tabelas, e privilégios totais para os papéis `anon` e `authenticated`: a proteção de quem vê o quê está no navegador ([[pagina:banco/regras]], A-003).
- **Limite de linhas por consulta:** costuma ser 1.000 por padrão e as telas não paginam no servidor; o valor configurado não consta no repositório (V-036).
- **Plano, backups e região do projeto:** não constam no repositório. {{nc}}

## O que acontece quando falha

| Falha | Efeito |
|---|---|
| Variáveis ausentes | "Supabase não configurado" no login e nas telas. |
| Serviço fora do ar | Login e listas mostram erro, com botão "Tentar Novamente". Os catálogos de Produtos e Serviços caem para dados de exemplo (A-027). |
| Função inexistente (erro de função não encontrada) | O código usa uma **resposta simulada** e avisa com uma faixa amarela; só ocorre se a função faltar no banco. |
| Limite de e-mails | Mensagem traduzida; usar "Definir senha". |

:::gerado fluxos-usam host:supabase
:::

:::detalhes Detalhes de implementação
- `@supabase/supabase-js` v2 no navegador; a função usa a mesma biblioteca por CDN.
- A função de resposta simulada (`callRpc` em `atgBackend.ts`) só é acionada pelo erro `PGRST202` (função não encontrada).
- O projeto Supabase é um só; não há ambiente separado de desenvolvimento registrado no repositório (ver [[pagina:visao-geral/ambientes]]).
:::

:::fonte
`src/utils/supabase.ts`, `src/App.tsx`, `src/utils/atgBackend.ts` (`callRpc`), `supabase/functions/manage-users/index.ts`, consultas Q06, Q12 e Q13.
:::
