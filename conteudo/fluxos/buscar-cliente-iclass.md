---
titulo: buscar-cliente-iclass
subtitulo: Localizar um cliente no iClass por código, nome ou CNPJ
ordem: 2
resumo: Fluxo do n8n que consulta o iClass para achar o cliente e devolver o identificador e o código dele.
verificado: 2026-11-11
commit: 9d680f5
fontes:
  - src/utils/atgBackend.ts
  - src/components/Clientes/CorrigirIclassWizard.tsx
  - docs/_fontes_privadas/n8n/buscar_cliente_iclass.json
---

:::resumo
Quando um cadastro de cliente está ligado ao iClass errado, ou não está ligado a nenhum, a pessoa precisa achar o cliente certo no iClass. Esta automação faz a busca no iClass pelo código do contrato, pelo nome ou pelo CNPJ e devolve os clientes encontrados, com o número de identificação de cada um.

Ela só **consulta**: não cria nem altera nada no iClass nem no Omie. Quem grava o resultado no cadastro é a tela [[modulo:corrigir-iclass]], depois que a pessoa confirma.
:::

## Gatilho

- **Tipo:** chamada externa (webhook) `POST` em `/webhook/buscar-cliente-iclass` do servidor n8n.
- **Quem chama:** só a função `buscarClienteIclass` de `src/utils/atgBackend.ts`, usada pela tela [[modulo:corrigir-iclass]].
- **Autenticação do webhook:** nenhuma configurada no nó de entrada. {{nc}} Não foi verificada proteção na frente do n8n.

## Diagrama do fluxo

:::diagrama Fluxo buscar-cliente-iclass: confere o limite de chamadas, escolhe o critério, consulta o iClass e devolve os clientes encontrados ou o motivo da falha.
flowchart TD
  A["POST buscar-cliente-iclass"] --> B["Preparar busca: criterio e valor"]
  B --> C["Perguntar ao banco se pode chamar o iClass"]
  C -->|pode| D{"Qual criterio?"}
  C -->|nao, ate 5 vezes| C1["Esperar e perguntar de novo"]
  C -->|nao, 5 vezes esgotadas| C2["rate_limit_excedido"]
  D -->|invalido| D1["entrada_invalida"]
  D -->|codigo| E1["iClass: GET customers por codigo"]
  D -->|cnpj| E2["iClass: GET customers por CNPJ"]
  D -->|nome| E3["iClass: GET customers por nome"]
  E1 --> F["Extrair clientes da resposta"]
  E2 --> F
  E3 --> F
  F -->|achou| G["ok: lista de clientes"]
  F -->|nada| H["nao_encontrado"]
:::

## Dados enviados e recebidos (exemplo fictício)

:::detalhes Entrada e saída (exemplos inventados)
```
POST /webhook/buscar-cliente-iclass
{ "criterio": "cnpj",
  "_busca": { "iclassCodigoDireto": "", "razaoSocial": "", "cnpj": "00000000000000" },
  "cliente_id": 1 }

Resposta de sucesso:
{ "ok": true, "total": 1,
  "encontrados": [ { "iclass_id": 7654321, "iclass_nome": "EMPRESA EXEMPLO LTDA",
                     "iclass_codigo": "ATG_00000000000000", "cnpj": "00.000.000/0000-00",
                     "email": null, "telefone": null } ] }

Respostas de falha: { "ok": false, "motivo": "nao_encontrado" }
                    { "ok": false, "motivo": "entrada_invalida", "mensagem": "..." }
                    { "ok": false, "motivo": "rate_limit_excedido", "mensagem": "..." }
```
:::

## Resultados possíveis

| Resposta | Quando acontece | O que a tela mostra |
|---|---|---|
| `ok: true` com 1 cliente | O iClass achou exatamente um. | Mostra os dados para a pessoa conferir e confirmar. |
| `ok: true` com vários | O iClass achou mais de um (até 5 por código ou CNPJ, até 10 por nome). | Lista para a pessoa escolher o correto. |
| `nao_encontrado` | O iClass não devolveu nada, ou devolveu sem identificador. | "Cliente não localizado no iClass. Tente outro método de busca...". |
| `entrada_invalida` | Critério ausente ou valor vazio. | Mesma mensagem de não localizado (a tela já bloqueia valor vazio antes de chamar). |
| `rate_limit_excedido` | O limite de 25 chamadas por minuto ao iClass esgotou, depois de 5 tentativas. | "O sistema do iClass está sobrecarregado no momento. Aguarde alguns instantes e tente novamente." |
| `erro_comunicacao` | Gerado pelo front quando o n8n não responde ou responde fora do formato. | "Não foi possível se comunicar com o servidor. Tente novamente." |

## O que o fluxo faz, etapa por etapa

:::gerado fluxo-meta buscar-cliente-iclass
:::

:::gerado fluxo-nos buscar-cliente-iclass
:::

:::detalhes Ligações entre as etapas (de onde para onde)
:::gerado fluxo-ligacoes buscar-cliente-iclass
:::
:::

## Integrações, tabelas e regras

- **iClass:** `GET /customers` com um dos filtros `code`, `ssn` (CNPJ) ou `name`. Autenticação por credencial do n8n do tipo `httpBearerAuth`. Cada consulta tem tempo limite de 15 segundos.
- **Banco:** a função [[funcao:consumir_rate_limit_iclass]] (tabela [[tabela:rate_limit_iclass]]). O fluxo **não lê nem grava nenhuma outra tabela**.
- **Limite de chamadas:** até 5 verificações, com espera entre elas pelo tempo que o banco indicar.
- **Se o iClass falhar:** as chamadas ao iClass não interrompem o fluxo (o erro de rede ou HTTP é tratado como "sem resultado"), então uma falha do iClass aparece como `nao_encontrado`. Isso foi deduzido da configuração dos nós (resposta completa e sem erro automático) e do código de extração, não testado.
- **Tratamento de erro e reprocessamento:** nenhum e-mail ou alerta. A pessoa tenta de novo pela tela.

## Como testar com segurança

É uma consulta de leitura, sem efeito nos sistemas. Pode ser testada à vontade com um CNPJ ou código de teste. O único efeito é consumir uma das 25 chamadas por minuto ao iClass, compartilhadas com os outros fluxos.

:::fonte
`docs/_fontes_privadas/n8n/buscar_cliente_iclass.json` (16 nós, lido sem copiar valores de chaves), `src/utils/atgBackend.ts` (`buscarClienteIclass`).
:::

## Ligações com o resto da documentação

[[modulo:corrigir-iclass]], [[funcao:consumir_rate_limit_iclass]], [[tabela:rate_limit_iclass]], [[fluxo:criar-cliente]], [[integracao:iclass]].
