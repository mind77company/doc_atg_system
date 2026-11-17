---
titulo: Login e acesso
subtitulo: Entrar na plataforma, o que cada perfil enxerga e como as páginas são protegidas
ordem: 1
resumo: Tela de login, regras de sessão e permissão por página, menu lateral e barra superior.
verificado: 2026-11-12
commit: 8db54a9
fontes:
  - src/App.tsx
  - src/pages/Login.tsx
  - src/utils/pages.ts
  - src/utils/navigation.ts
  - src/components/layout/Sidebar.tsx
  - src/components/layout/Topbar.tsx
---

:::resumo
Para usar a plataforma é preciso entrar com e-mail e senha. Depois de entrar, cada pessoa vê **só as páginas liberadas para o seu perfil**: o administrador vê tudo, o usuário comum vê as páginas que um administrador marcou para ele e o vendedor vê só Clientes & Geradores (e, dentro dela, só os clientes dele).

Quem não tem nenhuma página liberada vê um aviso pedindo para falar com um administrador. A conta de um usuário desativado não consegue mais entrar.
:::

## Os três perfis

| Perfil | O que enxerga | Quem define |
|---|---|---|
| **Administrador** | Todas as páginas, inclusive Controle de Usuários. | Fixo no perfil. |
| **Usuário Comum** | Só as páginas marcadas em uma lista de 9 (Dashboard, Ordens de Serviço, Orçamentos, Clientes & Geradores, Produtos, Serviços, Geradores, Histórico, Configurações). **Controle de Usuários nunca pode ser liberado.** | Um administrador, em [[modulo:usuarios-e-vendedores]]. |
| **Vendedor** | Por padrão, só Clientes & Geradores, e apenas os clientes atribuídos a ele ([[modulo:clientes-lista]]). Em somente leitura. | O perfil define o padrão; um administrador pode ajustar a lista. |

Detalhes de regra:

- Um Usuário Comum **antigo**, criado antes de existir a lista por página, mantém "acesso total antigo" (todas as páginas, menos Usuários). O cadastro de usuários mostra isso como "todas as páginas (legado)".
- Uma conta criada **fora da plataforma**, sem perfil gravado, é tratada como Usuário Comum **sem nenhuma página** até que um administrador salve o cadastro dela (falha fechado).
- O Relatório de Saúde ([[modulo:relatorio-de-saude]]) não é item do menu: abre para quem tem acesso a Clientes & Geradores.

## O que a pessoa vê, passo a passo

1. Abre o endereço da plataforma. Enquanto o sistema confere se já existe uma sessão, aparece um círculo girando (evita mostrar o login por um instante).
2. **Sem sessão:** vai para a tela de login. À esquerda, a marca QUIRON ATG SYSTEM e um texto de apresentação; à direita, o formulário **E-mail** e **Senha** (com botão de mostrar a senha) e o botão **Entrar**.
3. Os campos são conferidos ao sair deles: "Campo obrigatório" e "E-mail inválido".
4. Se o e-mail ou a senha estiverem errados, aparece "E-mail ou senha incorretos. Verifique suas credenciais de acesso." A mensagem é sempre a mesma, sem dizer qual dos dois errou.
5. Entrando com sucesso, a plataforma abre o Dashboard (ou a primeira página liberada, se o perfil não tiver o Dashboard).
6. **Menu lateral:** mostra só as páginas liberadas. A **barra superior** mostra o caminho da página, o campo "Pesquisar...", o perfil ("Perfil: Administrador") e o botão **Sair**.
7. **Sair** encerra a sessão e volta ao login, com o aviso "Sessão encerrada".

## Regras de proteção das páginas

- Quem não está logado é levado ao login em qualquer endereço.
- Quem está logado e abre o login é levado à primeira página liberada.
- Quem tenta abrir uma página que não tem é levado à primeira página liberada, com o aviso "Acesso restrito. Seu perfil não tem permissão para acessar esta página."
- **Quem só tem a senha provisória do convite:** enquanto a pessoa não define a senha, a plataforma mostra só a tela [[modulo:definir-senha]], sem liberar nenhuma página.
- O perfil e as páginas vêm de um dado que **só o servidor consegue gravar** (`app_metadata` do Supabase Auth). Um campo parecido que o próprio usuário consegue editar (`user_metadata`) é usado **apenas para o nome**.

:::alerta aviso A proteção é uma conferência de tela
As regras acima decidem o que a plataforma **mostra**. Quem acessa o banco direto, fora da plataforma, não passa por elas. As únicas ações protegidas no servidor são as da função [[fluxo:manage-users]] (só administrador). Ver [[pagina:controle/achados]] (A-003).
:::

## Itens da tela que não têm efeito real

- O campo **"Pesquisar..."** da barra superior guarda o texto digitado, mas **nenhuma página o usa**. Cada tela tem a própria busca. Ver A-018.
- O **sino de notificações** mostra três avisos **fixos de exemplo** escritos no código ("Inconsistência na O.S. OS-2026-002" e outros). Não vêm do banco. Ver A-019.

## Erros e situações comuns

| Situação | O que acontece |
|---|---|
| Variáveis de ambiente do Supabase ausentes | "Supabase não configurado" no login, com a orientação de definir `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY`. |
| Usuário desativado | O login com a senha certa é recusado; aparece a mesma mensagem de e-mail ou senha incorretos. {{nc}} Não foi testado. |
| Usuário sem nenhuma página | Tela "Nenhuma página liberada", com botão **Sair**. |
| Sessão expirada | O sistema trata como sem sessão e leva ao login. |
| Esqueceu a senha | **Não há link "Esqueci minha senha" na tela.** Um administrador define uma nova senha ([[modulo:usuarios-e-vendedores]]). |

## Tabelas e integrações

Não lê nem grava tabelas do esquema público. Usa o **Supabase Auth** ([[integracao:supabase]]): `signInWithPassword` para entrar e `signOut` para sair. A sessão fica no navegador. O perfil e as páginas vêm do cadastro do usuário no Auth ([[fluxo:manage-users]] os grava).

:::detalhes Detalhes de implementação
- Componente `App` (`src/App.tsx`): guarda o usuário atual, escuta `onAuthStateChange` e faz a proteção de rotas em um efeito. As rotas são por hash (`#/clientes`) e leem de `src/utils/navigation.ts`; as regras de página ficam em `src/utils/pages.ts` (`allowedPagesFor`, `canAccessPage`).
- `mapSupabaseUser` converte o usuário do Auth em perfil e páginas, lendo `app_metadata.perfil` e `app_metadata.paginas_permitidas`. `null` nas páginas significa acesso total antigo (só para Usuário Comum legado; o administrador usa a lista inteira por regra de perfil).
- O formulário de login valida o e-mail com uma expressão simples e chama `supabase.auth.signInWithPassword`.
- O menu (`Sidebar.tsx`) lista 10 itens e filtra pelos liberados; Controle de Usuários é o único fora da lista de 9 que pode ser marcada.
:::

:::fonte
`src/App.tsx` (`mapSupabaseUser`, proteção de rotas), `src/pages/Login.tsx` (`handleSubmit`), `src/utils/pages.ts`, `src/components/layout/Sidebar.tsx`, `src/components/layout/Topbar.tsx`.
:::
