---
titulo: receberorc
subtitulo: Gerar e enviar o orçamento ao cliente quando um pedido do Omie é concluído
resumo: Fluxo do n8n disparado por evento do Omie que decide se gera o orçamento e o envia por WhatsApp e e-mail. Parece inacabado.
ordem: 9
verificado: 2026-11-12
commit: 8db54a9
fontes:
  - docs/_fontes_privadas/n8n/Recebe_Or_amentos_no_OMIE.json
---

:::resumo
Quando alguém conclui um pedido no Omie, o Omie avisa esta automação. Ela consulta o pedido e olha a **observação de venda**: se estiver escrito "Concluído", gera o orçamento e o envia ao cliente por **WhatsApp** e por **e-mail**; se estiver "Não gerar", não faz nada; se a observação ainda estiver vazia, espera alguns minutos e confere de novo; em qualquer outro caso, avisa o time por e-mail ou pelo WhatsApp.

Pela exportação, o fluxo **não está terminado**: partes importantes estão desativadas ou com texto provisório. Ninguém na plataforma o chama.
:::

:::alerta nc Estado do fluxo
- O nó que atualizaria a tabela de orçamentos no banco está **desativado**.
- O nó "Cria o orçamento" está **sem configuração**.
- O texto do WhatsApp e o destinatário, o assunto e a mensagem dos e-mails estão com **valores provisórios** (letras soltas).
- Um nó que consulta ordens de serviço do iClass, com datas fixas, está **solto**, sem ligação.
- A segunda espera não tem tempo configurado.
- A exportação inclui **dados de teste fixados** (`pinData`), que podem conter dados reais; o conteúdo não foi copiado para esta documentação.

Nenhum arquivo de `src/` chama este webhook e as tabelas de [[tabela:orcamentos]] e [[tabela:ordens_servico]] estão vazias. Não se sabe se o fluxo está em uso. Ver V-002, V-030, A-021 em [[pagina:controle/pontos-a-validar]] e [[pagina:controle/achados]].
:::

## Gatilho

- **Tipo:** webhook `POST` em `/webhook/receberorc` do servidor n8n. A chamada deve vir do **Omie** (evento de pedido), com `event.idPedido` e `event.idCliente`.
- **Autenticação do webhook:** nenhuma configurada. {{nc}} Não foi verificada proteção na frente do n8n.
- **Quem chama:** nenhum arquivo do projeto. {{nc}} Pode estar cadastrado como webhook no painel do Omie, fora do repositório.

## Diagrama do fluxo

:::diagrama Fluxo receberorc: consulta o pedido no Omie e decide pela observação de venda entre gerar o orçamento, não fazer nada, esperar ou avisar erro.
flowchart TD
  A["Omie avisa: pedido concluido, POST receberorc"] --> B["Consultar o pedido no Omie"]
  B --> C{"Observacao de venda"}
  C -->|Concluido| D["Consultar o cliente no Omie"]
  D --> E["Montar telefone para WhatsApp"]
  E --> F["Enviar orcamento por WhatsApp"]
  F --> G["Enviar orcamento por e-mail"]
  C -->|Nao gerar| H["Nao faz nada"]
  C -->|Sem observacao| I["Esperar 3 minutos"]
  I --> J["Consultar o pedido de novo"]
  J -->|agora tem observacao| C
  J -->|continua sem| K["E-mail a ATG: tempo limite"]
  C -->|Outro valor| L{"O Omie devolveu o pedido?"}
  L -->|sim| M["E-mail de erro a ATG"]
  L -->|nao| N["WhatsApp ao time da Mind"]
:::

## Regras de negócio (do que está configurado)

- A decisão depende de uma **convenção no Omie**: o campo observação de venda do pedido (`obs_venda`) precisa conter exatamente `Concluído` para gerar, ou `Não gerar` para dispensar. {{nc}} Se a equipe da ATG conhece e usa essa convenção, não está dito no código.
- O WhatsApp do cliente é montado do telefone cadastrado no Omie: só números, com o dígito 9 acrescentado se vier com 8 dígitos e o prefixo 55 se faltar.
- Se o pedido ainda não tem observação, espera 3 minutos e consulta de novo.

## O que o fluxo faz, etapa por etapa

:::gerado fluxo-meta receberorc
:::

:::gerado fluxo-nos receberorc
:::

:::detalhes Ligações entre as etapas
:::gerado fluxo-ligacoes receberorc
:::
:::

## Integrações, tabelas e tratamento de erro

| Sistema | Uso | Autenticação |
|---|---|---|
| Omie | `ConsultarPedido` e `ConsultarCliente` | Chave e segredo da API dentro do corpo das chamadas (ver A-002; valores não reproduzidos). |
| UazAPI | Enviar mensagens de WhatsApp (ao cliente e ao time da Mind) | Credencial do n8n do tipo `uazApiApi`. |
| Gmail | Enviar e-mails (ao cliente e à ATG) | Credencial do n8n do tipo `gmailOAuth2`. |
| Supabase | Atualizar a tabela de orçamentos | Credencial do n8n do tipo `supabaseApi`; **nó desativado**. |

- **Tabelas:** nenhuma é lida ou gravada (o nó de banco está desativado).
- **Erros:** quando o pedido não é localizado ou a observação tem outro valor, avisa por e-mail (ATG) ou WhatsApp (time da Mind). Quando o tempo acaba sem observação, avisa a ATG por e-mail. Os textos estão provisórios.
- **Reprocessar:** reenviar o evento pelo Omie (ou chamar o webhook de novo). Sem trava de duplicidade: o mesmo pedido enviado duas vezes geraria dois envios. {{nc}}
- **Testar com segurança:** **não** use dados reais: o fluxo pode enviar WhatsApp e e-mail a clientes de verdade. Use um pedido de teste e um telefone próprio.

:::fonte
`docs/_fontes_privadas/n8n/Recebe_Or_amentos_no_OMIE.json` (19 nós, lido sem copiar valores de chaves, mensagens ou dados fixados).
:::

## Ligações

[[modulo:orcamentos]], [[modulo:ordens-de-servico]], [[tabela:orcamentos]], [[integracao:omie]], [[integracao:uazapi]], [[integracao:gmail]].
