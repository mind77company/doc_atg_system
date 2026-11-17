---
titulo: iClass
subtitulo: O sistema de gestão de serviços em campo usado pela ATG
resumo: Sistema externo de clientes, ativos, ordens de serviço e checklists. A plataforma só o consulta por meio dos fluxos do n8n, exceto na criação de clientes.
ordem: 3
verificado: 2026-11-12
commit: 8db54a9
fontes:
  - docs/data/fluxos.gerado.json
  - docs/_fontes_privadas/n8n/
  - src/utils/atgBackend.ts
---

:::resumo
O iClass é o sistema onde a ATG controla clientes, os **ativos** (equipamentos), as **ordens de serviço** e as **fichas de levantamento** (checklists) feitas em campo. A plataforma busca informações lá para cadastrar geradores e fichas, e cria clientes nele junto com o Omie.

A plataforma **nunca fala direto** com o iClass: sempre por um fluxo do n8n.
:::

## Para que serve e quem usa

| Uso | Onde na plataforma | Fluxo |
|---|---|---|
| Criar o cliente | [[modulo:criar-cliente]] | [[fluxo:criar-cliente]] |
| Achar o cliente certo e corrigir o vínculo | [[modulo:corrigir-iclass]] | [[fluxo:buscar-cliente-iclass]] |
| Achar o ativo (equipamento) pelo número de série | [[modulo:gerador]] | [[fluxo:buscar-ativo]] |
| Achar o ativo pelo número de uma O.S. | [[modulo:gerador]] | [[fluxo:gerador-por-os]] |
| Ler a ficha de levantamento de uma O.S. | [[modulo:ficha-de-levantamento]] | [[fluxo:buscar-os]] |

## Direção do dado

- **Sai da plataforma:** só a criação de clientes (código, nome, CNPJ/CPF, telefone, celular, e-mail e observação). O iClass **não** recebe endereço.
- **Entra na plataforma:** identificador e código de cliente; identificador, descrição, fabricante, modelo, situação e série de ativos; checklists de O.S.

A plataforma **não altera** cadastros que já existem no iClass: só cria clientes novos. Corrigir o vínculo muda apenas o dado guardado na plataforma.

## Chamadas usadas (API v2)

| Chamada | Para quê |
|---|---|
| `POST /customers/` | Criar cliente. |
| `GET /customers` e `GET /customers/?code=` | Buscar cliente por código, nome ou CNPJ; descobrir o identificador de um cliente recém-criado. |
| `GET /equipments?serialNumber=` | Buscar equipamento (ativo) por série. |
| Endereço de ordens de serviço do ativo | Descobrir o cliente de um ativo. |
| `GET /serviceorders/<O.S.>/equipments` | Achar o equipamento de uma O.S. |
| `GET /serviceorders/<O.S.>/checklist/` | Ler o checklist da O.S. |

O fluxo `receberorc` tem ainda um nó solto que consulta `GET /serviceorders` com datas fixas, sem ligação com o restante (A-021).

## Formato dos dados

JSON. O iClass não devolve o identificador numérico do cliente diretamente: ele é extraído do texto das URLs devolvidas (por exemplo `/customers/<id>/...`). Nas buscas de ativos, as respostas trazem listas de objetos. Ver cada fluxo para exemplos fictícios.

## Autenticação

Credencial do n8n do tipo `httpBearerAuth` (token no portador), usada em 6 fluxos. O valor do token não é reproduzido. Nenhum acesso ao iClass é feito pelo navegador.

## Limites e restrições conhecidas

- **25 chamadas por minuto.** A plataforma controla esse limite por uma contagem no banco ([[funcao:consumir_rate_limit_iclass]], tabela [[tabela:rate_limit_iclass]]); cada fluxo pergunta antes de chamar e espera, até 5 tentativas. O código descreve esse limite como do iClass.
- Os fluxos pedem no máximo 5 clientes por busca de código ou CNPJ e 10 por nome (valores escolhidos nos fluxos, não limites do iClass).
- Não se sabe se a busca por nome é parcial ou exata. {{nc}}
- Não há ambiente de testes do iClass identificado. {{nc}}

## O que acontece quando falha

| Falha | Efeito |
|---|---|
| Limite esgotado | Os fluxos esperam e, passadas 5 tentativas, devolvem "iClass sobrecarregado"; no cadastro de cliente, o cliente é gravado com pendência. |
| iClass fora do ar | Nos fluxos de busca, aparece como "não encontrado"; em `gerador-por-os`, o fluxo para sem resposta (V-022). |
| Cadastro divergente entre Omie e iClass | A tela de [[modulo:corrigir-iclass]] permite refazer o vínculo. |

## Dados do iClass guardados no banco

[[tabela:omie_clientes]] (identificador, código, nome do iClass, status de conferência), [[tabela:geradores_atg]] (ativo e ficha) e a cópia [[tabela:iclass_clientes]] (finalidade não identificada, V-015).

:::gerado fluxos-usam host:iclass
:::

:::fonte
`docs/data/fluxos.gerado.json`, exportações dos fluxos em `docs/_fontes_privadas/n8n/` (lidas sem copiar valores), `src/utils/atgBackend.ts`.
:::
