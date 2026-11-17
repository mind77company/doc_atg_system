---
titulo: gerador-por-os
subtitulo: Localizar o equipamento a partir do número de uma ordem de serviço
ordem: 4
resumo: Fluxo do n8n que acha o ativo do iClass a partir do número da O.S., para cadastrar o gerador.
verificado: 2026-11-11
commit: 9d680f5
fontes:
  - src/utils/atgBackend.ts
  - src/components/Clientes/AdicionarGeradorPorOsWizard.tsx
  - docs/_fontes_privadas/n8n/Adicionar_Gerador___Via_num_O_S.json
---

:::resumo
Quando a pessoa não tem o número de série do gerador, mas sabe o número de uma ordem de serviço em que ele foi atendido, esta automação procura no iClass o equipamento dessa ordem e devolve o número do ativo e os dados do equipamento.

Ela só **consulta**. Nada é criado nem alterado no iClass. Quem cria o gerador na plataforma é a tela [[modulo:gerador]], depois da confirmação.
:::

## Gatilho

- **Tipo:** webhook `POST` em `/webhook/gerador-por-os` do servidor n8n (o nome do fluxo no n8n é "Adicionar Gerador : Via num O.S").
- **Quem chama:** só a função `buscarAtivoPorOs` de `src/utils/atgBackend.ts`, usada por "Adicionar Gerador por O.S." ([[modulo:gerador]]).
- **Autenticação do webhook:** nenhuma configurada. {{nc}}

## Diagrama do fluxo

:::diagrama Fluxo gerador-por-os: confere o limite, consulta o equipamento da O.S. no iClass e devolve os dados ou o motivo da falha.
flowchart TD
  A["POST gerador-por-os"] --> B["Checar limite de chamadas"]
  B -->|esgotado| B1["rate_limit_excedido"]
  B -->|pode| C["iClass: GET serviceorders equipments"]
  C --> D["Extrair o primeiro ativo da O.S."]
  D --> E{"Achou o ativo?"}
  E -->|sim| E1["Devolve ativo, descricao, fabricante, modelo, serie"]
  E -->|nao| E2["nao_encontrado"]
  C -.->|falha do iClass| C1["Fluxo termina sem resposta"]
:::

## Resultados possíveis

| Resposta | O que significa | O que a tela faz |
|---|---|---|
| `ok: true` com ativo | Achou o equipamento da O.S. | Mostra "Ativo localizado" e o formulário. |
| `nao_encontrado` | O iClass respondeu sem equipamento. | "Nenhum ativo encontrado para esse número de O.S. Confira o código e tente novamente." |
| `rate_limit_excedido` | Limite de chamadas esgotado. | Aviso de iClass sobrecarregado. |
| Resposta vazia ou fora do formato | O iClass devolveu erro, ou a O.S. não foi encontrada de um jeito que quebra o fluxo. | O front vê como `erro_comunicacao`: "Não foi possível se comunicar com o servidor." |

:::alerta nc Dois pontos que o export do fluxo indica
**1.** A chamada ao iClass não tem tratamento de falha. Se o iClass devolver erro (por exemplo, O.S. que não existe), o nó do equipamento falha e o fluxo termina sem a resposta preparada; o sistema vê isso como falha de comunicação, e não como "não encontrado". Isso é compatível com o erro de "resposta vazia" visto em testes com um número de O.S. inexistente.

**2.** O fluxo devolve o número de série na chave `numerodeserie`, mas a tela lê `num_serie`. Pela leitura, o campo Número de Série do formulário ficaria vazio e teria de ser digitado. Não testado. Registrados como V-022 e V-023 em [[pagina:controle/pontos-a-validar]].
:::

## Dados enviados e recebidos (exemplo fictício)

:::detalhes Entrada e saída (exemplos inventados)
```
POST /webhook/gerador-por-os
{ "codigo_os": "OS-0000" }

Sucesso (chaves devolvidas pelo fluxo):
{ "ok": true, "ativo_id": 123456, "descricao": "GRUPO GERADOR EXEMPLO",
  "fabricante": "Fabricante Exemplo", "modelo": "Modelo X", "status_ativo": "Ativo",
  "os_url": "/serviceorders/...", "numerodeserie": "SN-0000" }

Falhas: { "ok": false, "motivo": "nao_encontrado" }
        { "ok": false, "motivo": "rate_limit_excedido", "mensagem": "..." }
```
:::

## O que o fluxo faz, etapa por etapa

:::gerado fluxo-meta gerador-por-os
:::

:::gerado fluxo-nos gerador-por-os
:::

:::detalhes Ligações entre as etapas
:::gerado fluxo-ligacoes gerador-por-os
:::
:::

## Integrações, tabelas e regras

- **iClass:** `GET /serviceorders/<código da O.S.>/equipments`, credencial do n8n do tipo `httpBearerAuth`. Só o **primeiro** equipamento da O.S. é considerado, então este fluxo nunca devolve a lista de vários ativos que a tela sabe mostrar.
- **Banco:** só a função [[funcao:consumir_rate_limit_iclass]] ([[tabela:rate_limit_iclass]]).
- **Erros e reprocessamento:** nenhum e-mail ou alerta; a pessoa tenta de novo pela tela.

## Como testar com segurança

É só leitura. Use um número de O.S. conhecido. Evite números inexistentes se quiser ver a resposta normal: eles disparam o caminho sem tratamento de falha descrito acima.

:::fonte
`docs/_fontes_privadas/n8n/Adicionar_Gerador___Via_num_O_S.json` (13 nós, lido sem copiar valores de chaves), `src/utils/atgBackend.ts` (`buscarAtivoPorOs`).
:::

## Ligações

[[modulo:gerador]], [[fluxo:buscar-ativo]], [[funcao:consumir_rate_limit_iclass]], [[integracao:iclass]].
