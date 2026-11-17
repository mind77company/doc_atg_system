---
titulo: Função manage-users
subtitulo: A função de servidor que gerencia os logins da plataforma
ordem: 7
resumo: Edge Function do Supabase que lista, convida, edita, define senha e desativa usuários, só para administradores.
verificado: 2026-11-12
commit: 8db54a9
fontes:
  - supabase/functions/manage-users/index.ts
  - src/pages/Usuarios.tsx
---

:::resumo
Algumas coisas sobre usuários o navegador não pode fazer sozinho com segurança: convidar alguém por e-mail, trocar a senha de outra pessoa, desativar um acesso. Para isso existe uma função que roda **no servidor** do Supabase. A tela [[modulo:usuarios-e-vendedores]] a chama, a função confere se quem pediu é **administrador** e só então faz o que foi pedido, usando uma chave de acesso total que **nunca sai do servidor**.

Se quem chama não for administrador, a função recusa.
:::

## Gatilho

- **Tipo:** Edge Function do Supabase (`manage-users`), chamada pelo navegador com `supabase.functions.invoke`. O navegador envia automaticamente a identificação da sessão (token JWT) de quem está logado.
- **Quem chama:** só `src/pages/Usuarios.tsx`, pela função `invokeManageUsers`.
- **Arquivo:** `supabase/functions/manage-users/index.ts`.

## Como ela decide quem pode

1. Lê o token da sessão enviado pela chamada. Sem token válido: `401 Não autenticado.`
2. Descobre o usuário dono do token e o seu perfil. **O perfil é lido de `app_metadata`**, que só o servidor consegue gravar; `user_metadata`, que o próprio usuário consegue editar, **nunca** entra na decisão.
3. Se o perfil não for administrador: `403 Acesso restrito a administradores.`
4. Só então cria o cliente de administração, com a chave de acesso total do Supabase.

## As cinco ações

:::diagrama Sequência da função manage-users: a tela chama a função, ela confere se é administrador e executa a ação no serviço de autenticação.
sequenceDiagram
  participant T as Tela de usuarios
  participant F as Funcao manage-users
  participant A as Supabase Auth
  participant B as Banco (vendedores)
  T->>F: acao e dados, com o token da sessao
  F->>A: quem e o dono do token?
  A-->>F: usuario e perfil
  alt nao e administrador
    F-->>T: 403 acesso restrito
  else e administrador
    F->>A: acao administrativa (convidar, editar, senha, bloquear)
    F->>B: ajusta o vinculo com o vendedor, se precisar
    F-->>T: resultado
  end
:::

| Ação | O que faz | Regras e recusas |
|---|---|---|
| `list` | Lista até 1.000 usuários, com nome, e-mail, perfil, páginas liberadas, se está ativo, data de criação e o vendedor vinculado. | Se a leitura dos vínculos falhar, a lista sai sem o vendedor. Usuário sem perfil gravado aparece como Usuário Comum sem páginas. |
| `invite` | Envia o e-mail de convite e grava o perfil e as páginas. | Exige nome, e-mail e perfil. Perfil inválido: recusa. Se o perfil é vendedor, o vendedor é conferido **antes** de convidar (para não criar login órfão). O perfil é gravado em dois passos; se o segundo falhar, avisa: "Convite enviado, mas as permissões não foram gravadas. Edite o usuário e salve para concluir." Idem para o vínculo do vendedor. |
| `updateProfile` | Altera nome, perfil, páginas e o vínculo com o vendedor. | Perfil inválido: recusa. O administrador **não pode tirar o próprio perfil** de administrador. Vendedor precisa estar ativo e sem outro login, a menos que já seja deste usuário. Se o vínculo falhar depois de salvar o perfil: "Perfil salvo, mas o vínculo com o vendedor falhou. Abra o usuário e salve de novo." |
| `setPassword` | Define a senha de um usuário. | De 8 a 72 caracteres. Também marca o e-mail como confirmado. Nunca devolve nem registra a senha. |
| `toggleActive` | Desativa ou reativa o acesso. | Não permite desativar a **própria** conta. Desativar bloqueia o usuário por um período equivalente a cerca de 100 anos (`876000h`); reativar remove o bloqueio. |

Outra ação ou corpo inválido: `400 Ação desconhecida.` ou `400 Corpo da requisição inválido.` Qualquer erro inesperado vira `500` com a mensagem.

## Regras sobre páginas

- **Administrador:** a lista de páginas vira vazia/sem uso (`null`): acesso total.
- **Usuário Comum:** recebe a lista marcada; se nenhuma lista for enviada, recebe lista vazia (sem páginas).
- **Vendedor:** recebe a lista enviada; sem lista, começa só com `clientes`.

## Dados enviados e recebidos (exemplo fictício)

:::detalhes Exemplos inventados
```
Convite:
{ "action": "invite", "nome": "Pessoa Exemplo", "email": "pessoa@exemplo.invalid",
  "perfil": "vendedor", "paginas_permitidas": ["clientes"], "vendedor_id": 1 }
Resposta: { "user": { ... } }   ou   { "error": "Este vendedor já está vinculado a outro usuário." }

Definir senha:
{ "action": "setPassword", "id": "<id do usuário>", "password": "********" }
Resposta: { "ok": true }
```
A senha só trafega nessa chamada e não é devolvida nem registrada.
:::

## Variáveis de ambiente e integrações

| Nome | Para que serve | Obrigatória |
|---|---|---|
| `SUPABASE_URL` | Endereço do projeto Supabase. | Sim. {{nc}} Normalmente injetada pelo próprio Supabase nas Edge Functions. |
| `SUPABASE_ANON_KEY` | Chave pública, usada só para identificar quem chama. | Sim. Idem. |
| `SUPABASE_SERVICE_ROLE_KEY` | Chave de acesso total, usada nas ações administrativas. | Sim. Idem. Nunca vai para o navegador. |

Os valores não são reproduzidos nesta documentação. A função usa a API administrativa do **Supabase Auth** ([[integracao:supabase]]) e lê e grava a tabela [[tabela:vendedores]] (coluna `auth_user_id`).

## Tratamento de erro e como testar

- **Erros:** a função devolve sempre `{ "error": "mensagem" }` com o código HTTP correspondente. A tela mostra a mensagem, traduzindo as conhecidas do serviço de autenticação.
- **Notificações:** nenhuma. Falhas parciais (permissão ou vínculo) orientam o administrador a abrir o usuário e salvar de novo.
- **Reprocessar:** repetir a ação pela tela. `updateProfile` é seguro de repetir.
- **Testar com segurança:** `list` é só leitura. Para as demais, use uma conta de teste. Convites enviam e-mail de verdade e consomem o limite de envio do Supabase.
- **Segurança:** a função aceita chamadas de qualquer origem (`Access-Control-Allow-Origin: *`) e confia na conferência do token feita dentro dela. {{nc}} O repositório não tem arquivo de configuração das funções, então não dá para confirmar se a verificação de token da plataforma também está ligada.

:::detalhes Detalhes de implementação
- Escrita em Deno (`Deno.serve`), usa `@supabase/supabase-js` v2 carregado do CDN esm.sh.
- Dois clientes: um com o token de quem chama (`getUser`) e um administrativo (`service_role`).
- `perfilOf` e `paginasOf` leem só de `app_metadata`. A função grava o perfil em `user_metadata` também, por compatibilidade com um front antigo, mas **não lê mais dele**.
- `checarVendedor` e `sincronizarVinculo` mantêm um login por vendedor, apoiados no índice único parcial `vendedores_auth_user_uk`.
- A "migração preguiçosa" de `user_metadata` para `app_metadata` foi removida de propósito: ela reabriria a brecha de alguém se declarar administrador.
:::

:::fonte
`supabase/functions/manage-users/index.ts` (todo o arquivo), `src/pages/Usuarios.tsx` (`invokeManageUsers`).
:::

## Ligações

[[modulo:usuarios-e-vendedores]], [[fluxo:convite-e-senha]], [[tabela:vendedores]], [[integracao:supabase]].
