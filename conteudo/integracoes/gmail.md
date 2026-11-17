---
titulo: Gmail
subtitulo: O envio de e-mails de aviso feito pelos fluxos do n8n
resumo: Conta do Gmail ligada ao n8n por OAuth, usada para enviar e-mails de aviso e de orçamento. Quase todos os e-mails estão com texto provisório.
ordem: 5
verificado: 2026-11-12
commit: 8db54a9
fontes:
  - docs/data/fluxos.gerado.json
  - docs/_fontes_privadas/n8n/
---

:::resumo
Alguns fluxos do n8n foram preparados para **enviar e-mails** pelo Gmail: um aviso de que os preços foram atualizados e, no fluxo de orçamentos, o envio do orçamento ao cliente e avisos de erro à equipe da ATG.

A plataforma (o site) **não envia e-mail por aqui**. E, pela exportação, **quase todos os e-mails estão inacabados**, com destinatário, assunto e mensagem provisórios.
:::

## Quem usa

Somente fluxos do n8n.

:::gerado fluxos-usam cred:gmailOAuth2
:::

## Onde cada e-mail é enviado

| Fluxo | E-mail | Situação na exportação |
|---|---|---|
| [[fluxo:preco-produto-mensal]] | Aviso de atualização de preços | Ativo, campos provisórios |
| [[fluxo:preco-servico-mensal]] | Aviso de atualização de preços | Ativo, campos provisórios |
| [[fluxo:atualiza-produto]] | Resumo para o administrador | **Desativado**, destinatário provisório |
| [[fluxo:atualiza-servico]] | Resumo para o administrador | **Desativado**, destinatário provisório |
| [[fluxo:receberorc]] | Orçamento ao cliente; erro à ATG; tempo limite | Ativos, campos provisórios |

## Direção do dado

**Saída** (envio). A plataforma nunca lê e-mails.

## Formato dos dados

Mensagens de e-mail (destinatário, assunto, corpo). Os textos dos e-mails não são reproduzidos nesta documentação.

## Autenticação

Credencial do n8n do tipo `gmailOAuth2` (conta autorizada por OAuth). A conta usada e o nome do remetente não constam no repositório. {{nc}}

## Limites e restrições conhecidas

Os do próprio Gmail (limite diário de envios por conta) e da autorização OAuth. Não consta no repositório quanto a ATG consome. {{nc}}

## O que acontece quando falha

Nenhum fluxo trata a falha de envio. Se o Gmail recusar, o fluxo pode terminar com erro no n8n, sem aviso a ninguém.

:::fonte
`docs/data/fluxos.gerado.json` (tipos de credencial por fluxo), exportações em `docs/_fontes_privadas/n8n/` (lidas sem copiar mensagens nem destinatários).
:::
