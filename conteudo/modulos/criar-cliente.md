---
titulo: Novo Cliente (Omie + iClass)
subtitulo: O formulário de cadastro de cliente
ordem: 2
resumo: Janela com o formulário de novo cliente, que cadastra nos dois sistemas e grava na plataforma.
verificado: 2026-11-11
commit: 9d680f5
fontes:
  - src/components/Clientes/CriarClienteWizard.tsx
  - src/pages/Clientes.tsx
  - src/utils/atgBackend.ts
---

:::resumo
É a janela "Novo Cliente (Omie + iClass)". A pessoa preenche os dados do cliente uma única vez e a plataforma cadastra o cliente no Omie e no iClass ao mesmo tempo, e depois guarda o cadastro na própria lista de clientes.

Quase tudo é obrigatório (só a observação é opcional). Se algo der errado no meio do caminho, a plataforma avisa o que foi criado e o que ficou pendente, para ninguém cadastrar o mesmo cliente duas vezes sem saber.
:::

O passo a passo técnico do que acontece nos sistemas externos está em [[fluxo:criar-cliente]]. Esta página descreve **a tela**.

## Quem usa

Administradores e usuários comuns. O botão "Novo Cliente" fica no alto da tela [[modulo:clientes-lista]] e **não aparece para o perfil vendedor**.

## O que a pessoa vê, passo a passo

1. Clica em "Novo Cliente". Abre a janela com uma caixa explicando: "Preenche o formulário uma vez só: o cliente é criado no Omie e no iClass ao mesmo tempo. Todos os campos são obrigatórios, exceto Observação."
2. Preenche os campos:

| Campo | Observação |
|---|---|
| Razão Social, Nome Fantasia | Texto livre. |
| CNPJ/CPF | "Só números" (a pontuação digitada é removida antes de enviar). |
| E-mail | Texto livre; não há conferência de formato na tela. |
| DDD do Telefone, Número do Telefone, Celular | Exemplo na tela: DDD 11, número 99999-9999. |
| Endereço (rua), Número, Bairro | Texto livre. |
| Cidade, Estado, CEP | Exemplos na tela: "São Paulo (SP)", "SP", "só números". |
| Observação | Opcional. |

3. Clica em "Criar Cliente". O botão muda para "Criando..." e os campos ficam bloqueados.
4. A tela mostra o resultado (tabela abaixo), fecha e atualiza a lista de clientes.

## Regras de negócio

- **Campos obrigatórios:** os 13 acima, conferidos na tela antes do envio (campo vazio ou só com espaços fica destacado em vermelho e aparece o aviso "Preencha todos os campos obrigatórios.") e de novo dentro do fluxo.
- **Documento:** o CNPJ/CPF é enviado só com números. Na gravação, a plataforma guarda duas versões: formatada (`cnpj_raw`) e só números (`cnpj_limpo`). Formata como CNPJ se tiver 14 dígitos e como CPF se tiver 11; qualquer outro tamanho é guardado como foi digitado.
- **Nada é gravado se o Omie recusar.** Depois que o Omie aceita, o cliente **é sempre gravado** na plataforma, mesmo que o iClass tenha falhado.
- **Sem checagem de duplicidade na plataforma:** a tela e a gravação não verificam se já existe cliente com o mesmo CNPJ em [[tabela:omie_clientes]] (a tabela não tem restrição de unicidade nesse campo). {{nc}} O que o Omie faz com um código de integração repetido não foi verificado.

## Resultados possíveis na tela

| O que aconteceu | Mensagem | O que foi gravado |
|---|---|---|
| Tudo certo (`completo`) | "Cliente criado com sucesso nos dois sistemas!" | Cliente em `omie_clientes` com os dados do iClass. |
| Criado nos dois, sem identificador do iClass (`iclass_sem_id`) | Aviso: "Cliente criado, mas o ID do iClass não foi capturado. Confira e complete manualmente pelo botão Corrigir cadastro iClass." | Cliente gravado com identificador do iClass vazio. |
| Omie ok, iClass falhou ou sobrecarregado (`iclass_pendente`) | Aviso: "Cliente criado no Omie, finalize manualmente no iClass." (com o motivo) | Cliente gravado com `iclass_pendente = true`. |
| Omie recusou (`falha_omie`) | Erro "Falha ao criar cliente no Omie." e "Nada foi cadastrado. Verifique os dados e tente novamente." | Nada. |
| Campo faltando (`campos_faltando`) | "Faltam campos obrigatórios", com a lista | Nada. |
| Sem comunicação (`erro_comunicacao`) | "Não foi possível se comunicar com o servidor. Tente novamente." | Nada. |
| Omie criou, mas a gravação na plataforma falhou | Aviso e mensagem: "Atenção: o cliente já existe no Omie (código N), mas não foi possível salvar aqui", com o erro | O cliente existe no Omie e no iClass, mas **não na plataforma**. Sem reprocessamento automático. |

Depois de qualquer gravação com sucesso, a plataforma registra no histórico a ação `criou_cliente` (ou `criou_cliente_iclass_pendente`), com os dados gravados.

:::alerta nc Cliente sem ID do iClass fica sem selo de pendência
No caso `iclass_sem_id`, a tela grava `iclass_pendente = false`. Como o estado do cliente depende só do identificador do iClass, ele aparece como "Sem iClass" **sem** o selo "Pendente iClass". Deduzido da leitura do código e da view, não testado.
:::

## Depois do cadastro

- O cliente aparece na lista com o estado "Sem Gerador" (se tem iClass) ou "Sem iClass".
- Para completar uma pendência do iClass, usar [[modulo:corrigir-iclass]].
- Para adicionar geradores, o botão aparece só depois que o cliente tem iClass ([[modulo:gerador]]).
- O telefone, endereço, e-mail, celular e observação **não ficam guardados na plataforma**: só existem no Omie e no iClass.

## Tabelas e integrações

| O que | Onde |
|---|---|
| Grava | [[tabela:omie_clientes]] (9 campos), [[tabela:log_edicoes]] |
| Chama | Fluxo [[fluxo:criar-cliente]], que usa [[integracao:omie]] e [[integracao:iclass]] |

:::detalhes Detalhes de implementação
- Componente `CriarClienteWizard` (`src/components/Clientes/CriarClienteWizard.tsx`), aberto pelo estado `creatingCliente` de `Clientes.tsx`.
- A chamada é `criarCliente(payload)` em `src/utils/atgBackend.ts`, que faz um `POST` direto do navegador para o webhook do n8n. Se a resposta não tiver o campo `ok`, devolve `erro_comunicacao`.
- A gravação é um `INSERT` em `omie_clientes` feito pelo navegador com a chave pública do Supabase e em seguida `registrarLog`. Não há transação: se o `INSERT` falhar depois de o fluxo ter criado nos sistemas externos, não há desfazimento.
- `usuario` no pedido e no histórico é o e-mail de quem está logado, vindo de `supabase.auth.getUser()`.
:::

:::fonte
`src/components/Clientes/CriarClienteWizard.tsx` (`handleSubmit`), `src/pages/Clientes.tsx`, `src/utils/atgBackend.ts` (`criarCliente`, `callWebhook`).
:::
