---
titulo: Convite e definição de senha
subtitulo: Como uma pessoa nova ganha acesso à plataforma, passo a passo
ordem: 8
resumo: Jornada completa do convite por e-mail, da tela de definir senha e do caminho alternativo em que o administrador define a senha.
verificado: 2026-11-12
commit: 8db54a9
fontes:
  - supabase/functions/manage-users/index.ts
  - src/pages/Usuarios.tsx
  - src/pages/DefinirSenhaInicial.tsx
  - src/App.tsx
  - src/utils/mensagensErro.ts
---

:::resumo
Dar acesso a uma pessoa nova tem **dois caminhos**. No primeiro, o administrador **convida** pelo e-mail: a pessoa recebe um link, clica, cria a própria senha e entra. No segundo, o administrador **define a senha** diretamente e a repassa à pessoa por um canal seguro, sem depender de e-mail.

O segundo caminho existe porque o envio de e-mails do convite tem um limite: quando muitos convites são enviados em pouco tempo, o sistema recusa novos e a pessoa precisa esperar. O administrador também usa o segundo caminho para quem perdeu a senha, já que a tela de login não tem "Esqueci minha senha".
:::

## Caminho 1: convite por e-mail

:::diagrama Convite por e-mail: o administrador convida, o Supabase envia o e-mail, a pessoa clica no link, cria a senha e passa a entrar normalmente.
sequenceDiagram
  participant AD as Administrador
  participant T as Tela de usuarios
  participant F as Funcao manage-users
  participant S as Supabase Auth
  participant P as Pessoa convidada
  participant APP as Plataforma
  AD->>T: Novo Usuario: nome, e-mail, perfil, paginas
  T->>F: invite
  F->>S: inviteUserByEmail
  S-->>P: e-mail com o link
  F->>S: grava perfil e paginas (app_metadata)
  F-->>T: convite enviado
  P->>APP: clica no link (type=invite)
  APP->>P: tela Definir senha
  P->>APP: senha e confirmacao
  APP->>S: updateUser com a senha
  S-->>APP: ok
  APP->>P: abre o Dashboard
:::

1. O administrador preenche o convite em [[modulo:usuarios-e-vendedores]]. Se o perfil for vendedor, escolhe o vendedor a vincular.
2. A função [[fluxo:manage-users]] confere o vendedor (se for o caso), pede ao Supabase para enviar o e-mail de convite e grava o perfil e as páginas liberadas num dado que só o servidor escreve.
3. A pessoa recebe o e-mail e clica no link. O link já a autentica, **sem pedir senha**.
4. A plataforma reconhece o link de convite e mostra a tela [[modulo:definir-senha]], bloqueando o resto do sistema até a senha ser criada.
5. A pessoa cria a senha e entra. A partir daí, entra normalmente pelo login com e-mail e senha.

## Caminho 2: o administrador define a senha

1. Na tabela de usuários, o administrador clica no ícone de chave do usuário e digita a nova senha duas vezes (8 a 72 caracteres).
2. A função `setPassword` define a senha e **marca o e-mail como confirmado**. Isso importa quando o convite nunca foi aceito: sem a confirmação, o login com a senha certa seria recusado.
3. O administrador passa a senha à pessoa por um canal seguro. O sistema não a mostra nem a guarda depois.
4. A pessoa entra pelo login com e-mail e senha. Pode ser útil que o administrador oriente a pessoa a escolher outra senha depois. A plataforma não tem tela para a pessoa trocar a própria senha depois de logada (a tela de Configurações não trata de senha).

## O que pode dar errado

| Situação | Causa provável | O que fazer |
|---|---|---|
| "O sistema atingiu o limite de envio de e-mails por agora..." | Muitos convites em pouco tempo (limite do envio de e-mails do Supabase). Tentar várias vezes só prolonga a espera. | Aguardar (a mensagem diz que costuma ser menos de 1 hora) ou usar o caminho 2. |
| "Este e-mail já está cadastrado no sistema." | A pessoa já tem conta. | Editar o usuário existente em vez de convidar de novo. |
| "Convite enviado, mas as permissões não foram gravadas." | Falha no segundo passo do convite. | Abrir o usuário, salvar o cadastro de novo (grava o perfil). Até lá, a pessoa fica sem nenhuma página. |
| "Convite enviado, mas o vínculo com o vendedor falhou." | Falha ao ligar o login ao vendedor. | Abrir o usuário e salvar de novo. |
| A pessoa clica no link e "não consegue criar a senha" | Antes de 2026-11-03, a plataforma não tinha a tela de definir senha. Corrigido no commit 9544808. | Se acontecer de novo, verificar se o link veio com `type=invite` e se o link não expirou. {{nc}} |
| O link do e-mail não chega ou cai no spam | Limite de envio, e-mail digitado errado ou filtro do destinatário. | Conferir o e-mail e usar o caminho 2. |
| Pessoa esqueceu a senha | Não há "Esqueci minha senha" no login. | Caminho 2. |

## Configurações que ficam fora do repositório

- **Endereço de retorno do link do e-mail** (para onde o link leva) e **modelo do e-mail** de convite: ficam no painel do Supabase. {{nc}} Não verificados.
- **Servidor de envio de e-mails:** o convite usa o envio de e-mails do Supabase. A equipe relatou o erro de limite de envio e discutiu configurar um servidor próprio de e-mail; **não há registro disso no repositório**. {{nc}}
- **Opção "Confirm email" do Supabase:** a equipe informou que foi desativada. Ela não é a causa do limite de e-mails do convite, e o convite envia e-mail de qualquer forma. Informação da equipe, sem fonte no repositório. {{nc}}
- **Quanto tempo o link vale:** padrão do Supabase, não configurado no código. {{nc}}

## Tabelas e integrações

| O que | Onde |
|---|---|
| Usuários, perfis e senhas | Supabase Auth ([[integracao:supabase]]) |
| Vínculo login e vendedor | [[tabela:vendedores]] (`auth_user_id`) |
| Histórico | [[tabela:log_edicoes]] (só `vinculou_login` e `desvinculou_login`; convite e senha não são registrados) |
| E-mail | Envio de e-mails do Supabase Auth |

:::detalhes Detalhes de implementação
- O convite usa `inviteUserByEmail` com os dados `nome`, `perfil` e `paginas_permitidas` e depois `updateUserById` para gravar o mesmo perfil em `app_metadata` (o convite só aceita `user_metadata`).
- O link de convite dispara o evento comum de login (`SIGNED_IN`), não o de recuperação de senha. Por isso `App.tsx` olha o endereço (`type=invite` ou `type=recovery`) logo na abertura, antes de o SDK limpar o endereço; o evento `PASSWORD_RECOVERY` cobre o link de recuperação.
- `setPassword` usa `updateUserById` com `password` e `email_confirm: true`.
:::

:::fonte
`supabase/functions/manage-users/index.ts` (ações `invite` e `setPassword`), `src/pages/Usuarios.tsx`, `src/pages/DefinirSenhaInicial.tsx`, `src/App.tsx`, `src/utils/mensagensErro.ts`.
:::

## Ligações

[[modulo:usuarios-e-vendedores]], [[modulo:definir-senha]], [[modulo:login-e-acesso]], [[fluxo:manage-users]].
