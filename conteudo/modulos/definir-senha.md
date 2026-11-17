---
titulo: Definir senha (convite e recuperação)
subtitulo: A tela que pede a senha de quem chegou por um link de convite
ordem: 2
resumo: Tela mostrada depois do link do e-mail de convite ou de recuperação, para a pessoa criar a própria senha.
verificado: 2026-11-12
commit: 8db54a9
fontes:
  - src/pages/DefinirSenhaInicial.tsx
  - src/App.tsx
---

:::resumo
Quando um administrador convida alguém, a pessoa recebe um e-mail com um link. Esse link já a deixa dentro do sistema, **sem pedir senha**. Esta tela existe para fechar essa lacuna: logo depois do link, a plataforma pede que a pessoa **crie a senha** dela, e só então libera o sistema.

Sem esta tela, a pessoa ficava "logada" sem nunca ter definido uma senha e não conseguia entrar de novo depois.
:::

:::alerta info Por que existe
Antes desta tela (commit 9544808), o RH relatava que "depois do e-mail do convite não dá para criar a senha": o link do Supabase autentica sozinho, e a plataforma não oferecia nenhum lugar para definir a senha. A tela foi criada para isso.
:::

## Quem usa

Qualquer pessoa convidada (ou que recebeu um link de recuperação) logo ao chegar pelo link do e-mail.

## O que a pessoa vê, passo a passo

1. Clica no link do e-mail. O endereço traz `type=invite` (convite) ou `type=recovery` (recuperação).
2. A plataforma percebe isso **antes** de limpar o endereço e mostra, no lugar do sistema, a tela "Definir senha", com o e-mail da conta.
3. Digita a **senha** e a **confirmação** (com botão de mostrar).
4. Clica para salvar.
5. Aparece "Senha definida com sucesso! Você já pode usar o sistema normalmente." e a plataforma abre o Dashboard.

## Regras de negócio

- A senha precisa ter **de 8 a 72 caracteres** (72 é o limite do algoritmo de senha; acima disso o excedente seria ignorado em silêncio) e as duas digitações precisam ser iguais.
- Enquanto a senha não é definida, **nenhuma outra página é liberada** e a proteção de rotas fica suspensa.
- A senha é gravada pela própria sessão da pessoa (`updateUser`). Não passa pela função [[fluxo:manage-users]] e **não precisa de chave de administrador**.
- A tela cobre dois caminhos: o link de **convite** (o Supabase dispara o evento de login normal, por isso a plataforma olha também o endereço) e o link de **recuperação** (o Supabase dispara um evento próprio de recuperação de senha).

## Erros e situações comuns

| Situação | O que acontece |
|---|---|
| Senha com menos de 8 ou mais de 72 caracteres | Aviso na hora; nada é enviado. |
| As duas senhas diferentes | "As duas senhas não são iguais." |
| Link já usado ou vencido | A sessão não é criada; a pessoa cai no login. {{nc}} Não foi testado. |
| Erro do Supabase ao gravar | "Erro ao definir senha." com o motivo em inglês, como veio do serviço (esta tela não usa o tradutor de mensagens). |
| Pessoa que perde a senha depois | Não há link "Esqueci minha senha" no login. Um administrador define outra senha ([[modulo:usuarios-e-vendedores]]). |

## Tabelas e integrações

Não lê nem grava tabelas do esquema público. Usa o **Supabase Auth** (`updateUser`). O e-mail do convite é enviado pelo próprio Supabase ([[fluxo:convite-e-senha]]).

:::detalhes Detalhes de implementação
- `DefinirSenhaInicial` recebe `email` e `onConcluido`. Em `App.tsx`, o estado `precisaDefinirSenha` começa verdadeiro se o endereço tem `type=invite` ou `type=recovery` (lido de forma síncrona, antes de o SDK limpar o endereço) e vira verdadeiro também no evento `PASSWORD_RECOVERY`.
- Com `currentUser && precisaDefinirSenha`, a plataforma renderiza só esta tela; o efeito de proteção de rotas retorna cedo enquanto a senha não é definida.
- Ao concluir, `precisaDefinirSenha` volta a falso e a navegação vai para `dashboard`.
:::

:::fonte
`src/pages/DefinirSenhaInicial.tsx` (`handleSubmit`), `src/App.tsx` (estado `precisaDefinirSenha`, `onAuthStateChange`).
:::
