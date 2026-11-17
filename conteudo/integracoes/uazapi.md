---
titulo: UazAPI (WhatsApp)
subtitulo: O envio de mensagens de WhatsApp feito por um fluxo do n8n
resumo: Serviço de WhatsApp usado só pelo fluxo receberorc, para enviar o orçamento ao cliente e avisar a equipe da Mind.
ordem: 6
verificado: 2026-11-12
commit: 8db54a9
fontes:
  - docs/data/fluxos.gerado.json
  - docs/_fontes_privadas/n8n/Recebe_Or_amentos_no_OMIE.json
---

:::resumo
A UazAPI é o serviço que permite ao n8n **enviar mensagens de WhatsApp**. Hoje só o fluxo [[fluxo:receberorc]] a usa: para mandar o orçamento ao cliente e para avisar a equipe da Mind quando algo dá errado.

O fluxo parece **inacabado**, e não se sabe se está em uso.
:::

## Quem usa

Somente o n8n, no fluxo `receberorc`.

:::gerado fluxos-usam tipo:uazapi
:::

## Onde é usada

| Etapa do fluxo | Mensagem | Destinatário |
|---|---|---|
| Envio de orçamento no WhatsApp do cliente | Texto provisório ("e") na exportação | Telefone do cliente, montado a partir do cadastro no Omie (só números, com o 9 e o 55) |
| Avisa time Mind que deu erro na execução | Identificador e nome do fluxo, hora e aviso de que nenhuma ação foi tomada | Número configurado no nó; vazio na exportação |

## Direção do dado

**Saída** (envio de mensagem). Não há leitura de mensagens recebidas.

## Formato dos dados

Texto simples: o número do destinatário e a mensagem. Dados reais de clientes não são reproduzidos aqui.

## Autenticação

Credencial do n8n do tipo `uazApiApi`. O valor não é reproduzido. A conta do WhatsApp usada e o plano do serviço não constam no repositório. {{nc}}

## Limites e restrições conhecidas

Não documentados no repositório. {{nc}} Serviços de WhatsApp costumam exigir que o número do remetente esteja conectado, e podem bloquear números por volume de envio; confirmar com a equipe como a conta é operada.

## O que acontece quando falha

Nenhum tratamento. O fluxo não confere se a mensagem foi entregue. Se o envio ao cliente falhar, o fluxo segue para o e-mail sem avisar.

:::alerta aviso Mensagens a clientes reais
Como o fluxo envia mensagens a clientes de verdade, qualquer teste exige um pedido e um telefone de teste (ver [[fluxo:receberorc]]).
:::

:::fonte
`docs/data/fluxos.gerado.json`, `docs/_fontes_privadas/n8n/Recebe_Or_amentos_no_OMIE.json` (lido sem copiar mensagens, números nem dados de teste).
:::
