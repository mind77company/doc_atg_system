---
titulo: Perfis e permissões
subtitulo: Quem pode ver e fazer o quê, em uma tabela só
resumo: Resumo consolidado dos três perfis, das páginas liberáveis e das ações de cada perfil nas telas.
ordem: 2
verificado: 2026-11-12
commit: 8db54a9
fontes:
  - src/utils/pages.ts
  - src/App.tsx
  - src/pages/Clientes.tsx
  - src/components/Clientes/GeradorModal.tsx
  - src/components/Products/ProductList.tsx
  - src/components/Services/ServiceList.tsx
  - src/pages/Historico.tsx
  - src/pages/Usuarios.tsx
  - supabase/functions/manage-users/index.ts
---

:::resumo
A plataforma tem **três perfis**. O **administrador** faz tudo e é o único que cuida de usuários. O **usuário comum** faz o trabalho do dia a dia nas páginas que o administrador marcar para ele. O **vendedor** só consulta os clientes que são dele.

O perfil e as páginas liberadas de cada pessoa ficam gravados no cadastro de login (Supabase Auth), num dado que só o servidor consegue alterar.
:::

:::alerta aviso Estas regras valem na tela, não no banco
Quem tem acesso direto ao banco (fora da plataforma) não passa por elas, porque o controle por linha (RLS) está desligado na maior parte das tabelas. A exceção é a função de usuários, que confere o perfil no servidor. Ver [[pagina:banco/regras]] e A-003.
:::

## Os três perfis

| Perfil | Quem é | Como as páginas são definidas |
|---|---|---|
| **Administrador** | Quem gerencia a plataforma. | Todas as páginas, sempre. |
| **Usuário Comum** | Quem trabalha com cadastros, preditiva, produtos etc. | Lista marcada pelo administrador, entre **9 páginas** (não inclui Controle de Usuários). Conta antiga sem lista mantém acesso total, menos Usuários. |
| **Vendedor** | Quem acompanha os próprios clientes. | Por padrão, só Clientes & Geradores, em somente leitura, e só os clientes atribuídos ao vendedor ligado ao login. |

Quem não tem perfil gravado cai como Usuário Comum **sem nenhuma página**. Ver [[modulo:login-e-acesso]].

## As páginas

| Página | Administrador | Usuário Comum | Vendedor |
|---|---|---|---|
| Dashboard | sim | se marcada | não por padrão |
| Ordens de Serviço | sim | se marcada | não por padrão |
| Orçamentos | sim | se marcada | não por padrão |
| Clientes & Geradores | sim | se marcada | **sim** (padrão) |
| Produtos | sim | se marcada | não por padrão |
| Serviços | sim | se marcada | não por padrão |
| Geradores (legado) | sim | se marcada | não por padrão |
| Histórico | sim | se marcada | não por padrão |
| Configurações | sim | se marcada | não por padrão |
| Controle de Usuários | **sim** | nunca | nunca |
| Relatório de Saúde | sim | com Clientes & Geradores | com Clientes & Geradores, só dos clientes dele |

"Sem acesso por padrão" quer dizer que a página não vem liberada para o vendedor, mas o administrador pode marcá-la no cadastro dele; nesse caso valem as regras de quem tem a página.

"Se marcada" quer dizer que o administrador precisa liberar a página no cadastro da pessoa. O administrador também pode ajustar a lista do vendedor.

## As ações

| Ação | Administrador | Usuário Comum | Vendedor |
|---|---|---|---|
| Ver a lista de clientes | todos | todos | só os atribuídos |
| Criar cliente | sim | sim | não |
| Corrigir vínculo com o iClass | sim | sim | não |
| Atribuir vendedor a um cliente | sim | não | não |
| Marcar cliente como conferido | sim | sim | não |
| Inativar ou reativar cliente | sim | não | não |
| Excluir cliente | sim | não | não |
| Adicionar gerador (por série ou O.S.) | sim | sim | não |
| Marcar gerador como conferido | sim | sim | não |
| Excluir gerador | sim | sim | não |
| Vincular ou editar ficha | sim | sim | não |
| Editar preditiva e oxicatalisador | sim | sim | não |
| Gerar o Relatório de Saúde | sim | sim | sim (dos seus clientes) |
| Editar O.S. e orçamentos | sim | sim | sem acesso por padrão |
| Editar produto | sim | sim | sem acesso por padrão |
| Atualizar preços (produtos e serviços) | sim | sim | sem acesso por padrão |
| Inativar produto ou serviço | sim | não | sem acesso por padrão |
| Ver o Histórico | sim | sim | sem acesso por padrão |
| **Reverter** uma alteração no Histórico | sim | não | não |
| Convidar, editar, definir senha e desativar usuários | sim | não | não |
| Cadastrar e editar vendedores | sim | não | não |

As colunas de Usuário Comum valem **para quem tem a página liberada**. Cada linha está explicada no módulo correspondente.

## Onde cada regra é aplicada

| Regra | Onde |
|---|---|
| Quais páginas aparecem e abrem | Navegador (`src/App.tsx`, `src/utils/pages.ts`). |
| Botões por perfil dentro das telas | Navegador (cada tela). |
| Vendedor só vê os próprios clientes | Navegador, por filtro. |
| Quem pode convidar e gerenciar usuários | **Servidor** (função [[fluxo:manage-users]]) e também na tela. |
| Reverter alterações | Navegador (a plataforma esconde o botão). |

## Pontos de atenção

- O vendedor vê só os próprios clientes por um filtro na tela (V-013).
- Convites, mudança de perfil e senha não geram registro no Histórico (V-029).
- Para o usuário comum, "Excluir gerador" é permitido, mas "Excluir cliente" não; um gerador excluído não volta pelo Histórico ([[modulo:gerador]]).

:::fonte
`src/utils/pages.ts` (`APP_PAGES`, `VENDEDOR_DEFAULT_PAGES`, `canAccessPage`), botões condicionados por `activeRole` e `somenteLeitura` em `src/pages/Clientes.tsx`, `src/components/Clientes/GeradorModal.tsx`, `src/components/Products/ProductList.tsx`, `src/components/Services/ServiceList.tsx`, `src/pages/Historico.tsx`, `supabase/functions/manage-users/index.ts`.
:::
