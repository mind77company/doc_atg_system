---
titulo: buscar-ativo
subtitulo: Localizar o equipamento (ativo) no iClass pelo número de série ou de patrimônio
ordem: 3
resumo: Fluxo do n8n que procura o ativo no iClass e devolve identificador, descrição, fabricante e modelo.
verificado: 2026-11-11
commit: 9d680f5
fontes:
  - src/utils/atgBackend.ts
  - src/components/Clientes/AdicionarGeradorWizard.tsx
  - docs/_fontes_privadas/n8n/buscar_ativo.json
---

:::resumo
Para cadastrar um gerador, a plataforma precisa do **ativo** dele no iClass (o equipamento cadastrado lá). Esta automação recebe o número de série do equipamento, procura no iClass e devolve o número do ativo e os dados do equipamento: descrição, fabricante, modelo e situação.

Ela só **consulta**. Nada é criado nem alterado no iClass. Quem cria o gerador na plataforma é a tela [[modulo:gerador]], depois que a pessoa confirma.
:::

## Gatilho

- **Tipo:** webhook `POST` em `/webhook/buscar-ativo` do servidor n8n.
- **Quem chama:** só a função `buscarAtivo` de `src/utils/atgBackend.ts`, usada pela tela "Adicionar Gerador" ([[modulo:gerador]]).
- **Autenticação do webhook:** nenhuma configurada no nó de entrada. {{nc}}

:::alerta nc A busca por patrimônio parece não funcionar
A tela envia `por` (`serialNumber` ou `patrimony`) e `valor`. O fluxo exportado **ignora o `por`**: ele sempre consulta o iClass pelo filtro `serialNumber`, e a palavra "patrimony" não aparece em nenhum nó. Pela leitura, digitar um número de patrimônio seria buscado como se fosse um número de série e retornaria "não encontrado". Deduzido da exportação (que pode estar desatualizada), não testado. Registrado como V-020 em [[pagina:controle/pontos-a-validar]].
:::

## Diagrama do fluxo

:::diagrama Fluxo buscar-ativo: confere o limite, consulta o equipamento no iClass, depois tenta descobrir o cliente pelas ordens de serviço do ativo.
flowchart TD
  A["POST buscar-ativo"] --> B["Checar limite de chamadas"]
  B -->|esgotado| B1["rate_limit_excedido"]
  B -->|pode| C["iClass: GET equipments por serie"]
  C --> D{"Achou o ativo?"}
  D -->|nao| D1["nao_encontrado"]
  D -->|sim| E{"O ativo tem ordens de servico?"}
  E -->|nao| E1["Devolve o ativo sem cliente"]
  E -->|sim| F["Checar limite de novo"]
  F -->|esgotado| F1["Devolve o ativo sem cliente"]
  F -->|pode| G["iClass: ordens de servico do ativo"]
  G --> H["Escolher o cliente mais frequente"]
  H -->|ate 5 clientes| H1["Devolve ativo com cliente e codigo"]
  H -->|mais de 5 clientes| H2["muitos_clientes"]
:::

## Dados enviados e recebidos (exemplo fictício)

:::detalhes Entrada e saída (exemplos inventados)
```
POST /webhook/buscar-ativo
{ "por": "serialNumber", "valor": "SN-0000" }

Sucesso:
{ "ok": true, "ativo_id": 123456, "descricao": "GRUPO GERADOR EXEMPLO",
  "fabricante": "Fabricante Exemplo", "modelo": "Modelo X", "status_ativo": "Ativo",
  "cliente": "CLIENTE EXEMPLO", "codigo": "COD-EXEMPLO" }

Falhas: { "ok": false, "motivo": "nao_encontrado" }
        { "ok": false, "motivo": "rate_limit_excedido", "mensagem": "..." }
        { "ok": false, "motivo": "muitos_clientes", "ativo_id": 123456, "mensagem": "..." }
```
:::

## Resultados possíveis

| Resposta | O que significa | O que a tela faz |
|---|---|---|
| `ok: true` com ativo | Achou o equipamento. | Mostra "Ativo localizado" e segue para o formulário. |
| `nao_encontrado` | O iClass não devolveu equipamento. | Pela série, tenta o patrimônio; pelo patrimônio, bloqueia ("Ativo não cadastrado no iClass"). |
| `rate_limit_excedido` | Limite de 25 chamadas por minuto esgotado. | Aviso de iClass sobrecarregado; fica na mesma etapa para tentar de novo. |
| `muitos_clientes` | Mais de 5 clientes diferentes nas ordens de serviço do ativo. | A tela não trata este motivo especificamente: ele cai no ramo "não encontrado" e segue para o patrimônio ou bloqueia. {{nc}} |
| `erro_comunicacao` | Gerado pelo front se o n8n não responder ou responder fora do formato. | Aviso de falha de comunicação; fica na mesma etapa. |

:::alerta nc O cliente devolvido pelo fluxo não é usado pela plataforma
O fluxo descobre o cliente do ativo pelas ordens de serviço e o devolve em `cliente` e `codigo`, mas o código da plataforma (`BuscarAtivoResultSucesso`) não lê esses campos. Assim, a tela **não confere** se o ativo encontrado pertence ao cliente que está sendo editado. Também nunca recebe o aviso `multiplos`: o fluxo só olha o primeiro equipamento, então a tela "O iClass encontrou múltiplos ativos" não é alcançada por este fluxo. Ver V-021.
:::

## O que o fluxo faz, etapa por etapa

:::gerado fluxo-meta buscar-ativo
:::

:::gerado fluxo-nos buscar-ativo
:::

:::detalhes Ligações entre as etapas
:::gerado fluxo-ligacoes buscar-ativo
:::
:::

## Integrações, tabelas e regras

- **iClass:** `GET /equipments?serialNumber=...` e, quando há ordens de serviço, o endereço de ordens de serviço devolvido para o ativo. Autenticação por credencial do n8n do tipo `httpBearerAuth`. As falhas do iClass não interrompem o fluxo (`continueRegularOutput`): aparecem como "sem resultado".
- **Banco:** só a função [[funcao:consumir_rate_limit_iclass]] ([[tabela:rate_limit_iclass]]). Nenhuma outra tabela é lida ou gravada.
- **Regras do cliente:** ignora ordens de serviço cujo cliente seja "iclass" ou "ATG" (internas), escolhe o cliente mais frequente e recusa ativos ligados a mais de 5 clientes ("ativo bagunçado").
- **Reprocessar:** só repetir a busca pela tela. Sem e-mail ou alerta.

## Como testar com segurança

É só leitura. Pode ser chamado com um número de série de teste, sem efeito no iClass. Consome uma ou duas das 25 chamadas por minuto compartilhadas com os outros fluxos.

:::fonte
`docs/_fontes_privadas/n8n/buscar_ativo.json` (24 nós, lido sem copiar valores de chaves), `src/utils/atgBackend.ts` (`buscarAtivo`).
:::

## Ligações

[[modulo:gerador]], [[fluxo:gerador-por-os]], [[funcao:consumir_rate_limit_iclass]], [[integracao:iclass]].
