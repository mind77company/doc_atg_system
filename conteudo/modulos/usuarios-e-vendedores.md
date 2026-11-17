---
titulo: Usuários e Vendedores
subtitulo: Quem pode entrar na plataforma, com qual perfil, e a lista de vendedores
resumo: Tela exclusiva do administrador para convidar usuários, definir perfil, páginas e senha, desativar acessos e cadastrar vendedores.
ordem: 3
verificado: 2026-11-12
commit: 8db54a9
fontes:
  - src/pages/Usuarios.tsx
  - src/components/Usuarios/VendedoresSection.tsx
  - supabase/functions/manage-users/index.ts
  - src/utils/mensagensErro.ts
  - src/utils/pages.ts
---

:::resumo
É a tela "Controle de Usuários". Só o administrador acessa. Nela se **convida** uma pessoa nova (ela recebe um e-mail para criar a própria senha), se escolhe o **perfil** dela (administrador, usuário comum ou vendedor), se marcam as **páginas** que ela pode abrir, se **define uma nova senha** quando alguém perde o acesso e se **desativa** ou reativa um acesso.

Logo abaixo fica o **cadastro de vendedores**, a lista usada para atribuir clientes a cada vendedor. Um vendedor pode receber um login para ver apenas os clientes dele.
:::

## Quem usa

Somente administradores. Para outros perfis, o menu nem mostra a página; se o endereço for aberto direto, aparece "Acesso Restrito ao Administrador", com botão para ir ao Dashboard. A mesma regra é aplicada no servidor, na função [[fluxo:manage-users]].

## Parte 1: usuários (logins)

### O que a pessoa vê

Uma tabela com: **Usuário** (nome, iniciais e o código interno), **E-mail**, **Perfil de Acesso** (com um resumo das páginas), **Criado em**, **Status** (Ativo ou Desativado) e **Ações**. A linha do próprio administrador logado leva a etiqueta "Você".

Resumo das páginas por perfil na tabela:

| Perfil | Texto mostrado |
|---|---|
| Administrador | Nenhum (acesso a tudo). |
| Usuário Comum com lista | "N páginas liberadas". |
| Usuário Comum antigo | "todas as páginas (legado)". |
| Vendedor | "Vendedor: <nome>" ou "Sem vendedor vinculado" (em vermelho), mais o resumo das páginas ("somente Clientes & Geradores (padrão)" quando sem lista). |

### Ações

**1. Novo Usuário (convidar)**

1. Clica em "Novo Usuário". Abre "Convidar Novo Colaborador" com a explicação: o usuário recebe um e-mail do Supabase com um link para definir a própria senha.
2. Preenche **Nome Completo** e **E-mail Corporativo**.
3. Escolhe o **Perfil**: Usuário Comum (escolhe as páginas), Vendedor (acessa só os próprios clientes) ou Administrador (acesso completo e controle de usuários).
4. Se for Vendedor, escolhe o **Vendedor Vinculado** (obrigatório). A lista mostra só vendedores ativos que ainda não têm login. Escolher um vendedor preenche nome e e-mail, se estiverem vazios.
5. Se não for Administrador, marca as **Páginas Liberadas**. Vendedor começa só com Clientes & Geradores; usuário comum começa só com Dashboard. Sem nenhuma marcada, aparece o aviso de que a pessoa não conseguirá acessar nada.
6. Clica em "Enviar Convite". Mensagem: "Convite enviado com sucesso! Um e-mail foi enviado para ... com instruções para definir a senha."

**2. Editar permissões** (lápis): altera **nome**, **perfil**, **vendedor vinculado** e **páginas**. O e-mail não é editável. O administrador **não pode tirar o próprio perfil de administrador**.

**3. Definir senha** (chave): o administrador digita a nova senha duas vezes (8 a 72 caracteres). "A nova senha vale imediatamente. O sistema não guarda nem mostra a senha depois: repasse ao usuário por um canal seguro." Serve para quem perdeu o acesso ou nunca conseguiu usar o e-mail de convite. Também **confirma o e-mail** da conta, para que o login com senha funcione mesmo que o convite nunca tenha sido aceito.

**4. Desativar ou reativar** (ícone de usuário): bloqueia ou libera o acesso. "Usuário desativado com sucesso. Ele perderá acesso ao sistema." O administrador **não pode desativar a própria conta** (o botão nem aparece na linha "Você").

### Regras de negócio

- Cada usuário tem **um perfil** e, se não for administrador, **uma lista de páginas** (as 9 descritas em [[modulo:login-e-acesso]]; Controle de Usuários nunca entra na lista).
- Vendedor **precisa** de um vendedor vinculado. Um vendedor tem no máximo **um login**, e um login aponta para no máximo **um vendedor**.
- Quem deixa de ser vendedor perde o vínculo automaticamente; quem troca de vendedor passa a apontar para o novo.
- E-mail repetido é recusado na tela ("Este e-mail já está em uso") e também pelo serviço de autenticação, com a mensagem traduzida ("Este e-mail já está cadastrado no sistema").
- A lista de usuários vem do servidor (até 1.000 usuários por consulta). {{nc}} Não há paginação além disso.
- **Histórico:** só os vínculos com vendedor deixam registro (`vinculou_login` e `desvinculou_login` na entidade `vendedor`, sem valor de antes, e portanto sem opção de reverter). Convite, mudança de perfil, definição de senha e ativação ou desativação de login **não geram registro no Histórico** da plataforma.

### Mensagens de erro traduzidas

As mensagens em inglês do serviço de autenticação são traduzidas para quem usa (`src/utils/mensagensErro.ts`): limite de envio de e-mails, e-mail já cadastrado, e-mail inválido, senha curta, usuário não encontrado e limite temporário. O que não for reconhecido aparece como veio, sem esconder nada.

:::alerta aviso Limite de e-mails do convite
O envio do e-mail de convite usa o limite do Supabase: depois de várias tentativas seguidas aparece "O sistema atingiu o limite de envio de e-mails por agora. Aguarde um pouco (geralmente menos de 1 hora) e tente novamente". Tentar repetidamente prolonga a espera. Enquanto isso, o administrador pode criar o acesso pelo botão **Definir senha**, sem depender de e-mail. Detalhes em [[fluxo:convite-e-senha]].
:::

## Parte 2: vendedores

Tabela com os vendedores (ativos primeiro, depois por nome), com o **número de clientes** que cada um tem atribuídos, e botões para editar e desativar ou reativar.

- **Novo Vendedor:** nome (obrigatório) e e-mail (opcional, não pode repetir entre vendedores). Registra `criou_vendedor`.
- **Editar:** só grava o que mudou e registra `editou_vendedor` com antes e depois (pode ser revertido pelo Histórico).
- **Desativar ou reativar:** um vendedor desativado "não aparece mais na lista de atribuição de clientes". Os clientes que ele já tem continuam atribuídos. Registra `desativou_vendedor` ou `ativou_vendedor`.
- Vendedores novos podem ter sido copiados da tabela `vendedores omie` (cadastro manual fica sem código do Omie): [[tabela:vendedores]].
- O vendedor **não é o login**: é só o cadastro. O vínculo é feito no cadastro do usuário.

## Tabelas e integrações

| Operação | Onde |
|---|---|
| Lê e grava usuários | Supabase Auth, pela função [[fluxo:manage-users]] (listar, convidar, editar perfil, definir senha, desativar) |
| Lê | [[tabela:vendedores]], [[tabela:omie_clientes]] (só para contar clientes por vendedor) |
| Grava | [[tabela:vendedores]] (cadastro, edição, ativação, e o vínculo `auth_user_id` pela função), [[tabela:log_edicoes]] |
| Integrações | [[integracao:supabase]] (autenticação e e-mail do convite) |

:::gerado usos vendedores
:::

:::detalhes Detalhes de implementação
- Todas as ações de usuário passam por `invokeManageUsers`, que chama a função com `supabase.functions.invoke("manage-users", { body })`. Quando a função responde com erro, a tela lê a mensagem real no corpo da resposta (e não o texto genérico do SDK) e a passa pelo tradutor.
- A criação e a edição de **vendedores** são `INSERT` e `UPDATE` diretos em `vendedores`, feitos pelo navegador com a chave pública; a regra de e-mail único vem de um índice do banco (erro 23505 vira "Este e-mail já está em uso por outro vendedor").
- Depois de cada mudança de vínculo, a tela recarrega a seção de vendedores.
- O e-mail de quem faz a ação (`supabase.auth.getUser()`) entra como `usuario` do histórico.
:::

:::fonte
`src/pages/Usuarios.tsx` (`handleCreateUser`, `handleSaveEdit`, `handleSetPassword`, `handleToggleActive`, `invokeManageUsers`), `src/components/Usuarios/VendedoresSection.tsx`, `src/utils/mensagensErro.ts`.
:::
