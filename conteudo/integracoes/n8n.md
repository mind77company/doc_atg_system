---
titulo: n8n
subtitulo: O servidor de automações que liga a plataforma ao iClass, ao Omie, ao Gmail e ao WhatsApp
resumo: Ferramenta de automação onde estão os 10 fluxos da ATG, acionados por chamadas da plataforma, por eventos do Omie ou por agenda.
ordem: 2
verificado: 2026-11-12
commit: 8db54a9
fontes:
  - src/utils/atgBackend.ts
  - src/utils/webhooks.ts
  - docs/data/fluxos.gerado.json
  - docs/_fontes_privadas/n8n/
---

:::resumo
O n8n é onde moram as **automações**. Quando a plataforma precisa falar com o iClass ou com o Omie (criar um cliente, buscar um equipamento, atualizar preços), ela não fala direto: chama um endereço do n8n, que faz o trabalho e devolve a resposta. O n8n também roda tarefas sozinho, a cada 30 dias, para atualizar preços.

Há **10 fluxos**, todos ativos na exportação.
:::

## Quem usa, e para quê

| Quem | Para quê |
|---|---|
| Plataforma (navegador) | Chama 7 endereços (webhooks) para cadastro de cliente, buscas no iClass e atualização de preços. |
| Omie | Deveria avisar o fluxo `receberorc` quando um pedido é concluído. {{nc}} |
| O próprio n8n | Dois fluxos agendados de preço. |

## Os 10 fluxos

:::gerado fluxos-usam todos:
:::

Lista completa por tipo:

| Tipo | Fluxos |
|---|---|
| Chamados pela plataforma | [[fluxo:criar-cliente]], [[fluxo:buscar-cliente-iclass]], [[fluxo:buscar-ativo]], [[fluxo:buscar-os]], [[fluxo:gerador-por-os]], [[fluxo:atualiza-produto]], [[fluxo:atualiza-servico]] |
| Chamado por evento externo (Omie) | [[fluxo:receberorc]] |
| Agendados (a cada 30 dias) | [[fluxo:preco-produto-mensal]], [[fluxo:preco-servico-mensal]] |

## Direção do dado

**Ambos os sentidos.** A plataforma envia pedidos e recebe respostas em JSON. O n8n envia dados ao iClass e ao Omie, lê deles, grava no banco e dispara e-mails e WhatsApp.

## Onde é chamado no código

- `src/utils/atgBackend.ts`: um `POST` direto do navegador para cada webhook (`criar-cliente`, `buscar-cliente-iclass`, `buscar-ativo`, `buscar-os`, `gerador-por-os`), pela função `callWebhook`.
- `src/utils/webhooks.ts`: `atualiza-produto` e `atualiza-serv`, pela função `triggerWebhook`.
- Os endereços são escritos no código (o servidor n8n fica em um domínio da hospedagem Easypanel). {{nc}} Não há variável de ambiente para o endereço do n8n: trocar de servidor exige alterar o código.

## Formato dos dados

JSON. O `callWebhook` considera válida apenas uma resposta que tenha o campo `ok`; qualquer outra (vazia, erro, texto) vira `erro_comunicacao` e a tela mostra "Não foi possível se comunicar com o servidor".

## Autenticação

- **Webhooks:** nenhum configurado nos nós de entrada. Quem souber o endereço pode chamá-los. {{nc}} Não foi verificado se há proteção na frente do servidor (A-029).
- **Dentro dos fluxos:** credenciais do n8n dos tipos `httpBearerAuth` (iClass), `supabaseApi`, `gmailOAuth2` e `uazApiApi`. Em vários fluxos, chaves do Omie e do Supabase estão escritas direto nos nós (A-001 e A-002).

## Limites e restrições conhecidos

- O limite de 25 chamadas por minuto ao iClass é controlado por uma contagem **no banco**, consultada por 5 fluxos ([[funcao:consumir_rate_limit_iclass]]).
- Nenhum tempo limite foi configurado nos fluxos de cadastro; os de busca no iClass têm 15 segundos (`buscar-cliente-iclass`).
- Quem opera o servidor n8n, a versão e os backups dos fluxos não constam no repositório. As exportações em `docs/_fontes_privadas/n8n/` são a única cópia no projeto. {{nc}}

## O que acontece quando falha

| Falha | Efeito |
|---|---|
| Servidor n8n fora do ar | As telas mostram "Não foi possível se comunicar com o servidor"; nada é criado. |
| Fluxo sem nó de resposta ou com erro no meio | A tela vê falha de comunicação. É o caso de `gerador-por-os` para O.S. inexistente e provavelmente dos fluxos forçados de preço (V-022, V-034). |
| Falha no iClass ou no Omie | Depende do fluxo; ver a página de cada um. |
| Aviso de falha | Quase nenhum fluxo avisa alguém: só o `receberorc` tem nós de aviso (inacabados). |

## Como reprocessar e testar

Reenviar a chamada pela tela, ou executar o fluxo manualmente no painel do n8n (que guarda o histórico de execuções). Ver "Como testar com segurança" em cada fluxo.

:::detalhes Detalhes de implementação
- As exportações têm 5 a 29 nós por fluxo. A leitura da estrutura ignorou valores de parâmetros, cabeçalhos e código de nós, para não copiar segredos.
- Todos os fluxos de busca e cadastro com o iClass seguem o mesmo padrão de limite: contar, esperar o tempo que o banco indicar e tentar de novo, até 5 vezes.
:::

:::fonte
`docs/data/fluxos.gerado.json` (gerado das exportações), `src/utils/atgBackend.ts` (`callWebhook`), `src/utils/webhooks.ts`.
:::
