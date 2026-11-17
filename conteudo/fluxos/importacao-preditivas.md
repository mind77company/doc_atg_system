---
titulo: Importação da planilha de preditivas
subtitulo: Como as linhas da planilha viram itens de preditiva ligados aos geradores
ordem: 6
resumo: Processamento dentro do banco que lê a planilha importada, compara nomes com os geradores e grava as preditivas e o oxicatalisador.
verificado: 2026-11-11
commit: 9d680f5
fontes:
  - docs/scripts/extracao_banco.sql
---

:::resumo
Os dados de manutenção preditiva vieram de uma planilha. Eles foram levados para o banco e **transformados**: cada linha da planilha virou até sete itens de manutenção, e o sistema tentou descobrir a qual gerador cada linha pertence **comparando o nome do cliente** da planilha com os geradores cadastrados.

Quando a semelhança é alta e o cliente tem um só gerador, a ligação é feita sozinha. Nos casos duvidosos, a linha fica marcada para **revisão**; quando não há candidato bom, fica **sem correspondência**. Não é uma automação do n8n: tudo acontece dentro do banco de dados, por funções.
:::

:::alerta nc O que não está no repositório
Quem carregou a planilha na tabela de rascunho, quem chama a função de processamento e quem resolve as linhas marcadas para revisão **não aparecem em nenhum arquivo do projeto** (código, fluxos do n8n ou funções do banco analisadas). Esta página descreve só o que as funções do banco fazem. Ver V-004, V-005 e V-026 em [[pagina:controle/pontos-a-validar]].
:::

## Gatilho

A função [[funcao:processar_preditivas]] recebe o identificador de um lote (`import_id`). Nenhum gatilho automático, agenda ou chamada no código foi encontrado. {{nc}} Pode ter sido executada manualmente no editor SQL.

## Etapas

:::diagrama Importação da planilha de preditivas: da tabela de rascunho até as tabelas definitivas, passando pela comparação de nomes.
flowchart TD
  A["Planilha carregada em preditivas_staging"] --> B["processar_preditivas com o import_id"]
  B --> C["Apaga o que ja existia daquele lote em preditivas_atg e oxicatalisador_atg"]
  C --> D["Para cada cliente distinto: match_cliente"]
  D --> E["Separa as 7 colunas de itens de cada linha"]
  E --> F["Converte datas, calcula vencimentos e marca nao se aplica"]
  F --> G["Grava em preditivas_atg"]
  D --> H["Le a coluna do oxicatalisador"]
  H --> I["Grava em oxicatalisador_atg"]
  G --> J["Devolve contagens: linhas, auto, revisar, sem_match"]
  I --> J
:::

1. **Rascunho:** as linhas da planilha ficam em [[tabela:preditivas_staging]], com tudo como texto, uma linha da planilha por registro e colunas por item (realizada, vencimento, observação, status).
2. **Limpeza do lote:** antes de gravar, a função **apaga** as linhas já existentes daquele mesmo `import_id` em [[tabela:preditivas_atg]] e [[tabela:oxicatalisador_atg]], inclusive as editadas à mão.
3. **Comparação de nomes:** uma vez por cliente distinto, chama [[funcao:match_cliente]] (detalhes abaixo).
4. **Itens:** cada linha da planilha é "desdobrada" em 7 itens (um por código do catálogo [[tabela:preditiva_itens]]). Radiador e tanque juntam duas colunas de observação com " | ".
5. **Datas:** converte o texto de data com [[funcao:parse_data_pred]]. Textos vazios, "00/00/0000", "REF", "null" e "não aplica" viram vazio.
6. **Não se aplica:** um item não se aplica se a data realizada, o vencimento **ou** o status da planilha contiver "aplica" ([[funcao:eh_nao_aplica]]). Nesse caso as datas ficam vazias.
7. **Vencimento e realização que faltam:** se há realizada e não há vencimento, vencimento = realizada + periodicidade do item. Se há vencimento e não realizada, realizada = vencimento − periodicidade.
8. **Sem data:** o item que se aplica e continua sem vencimento recebe `sem_data = true`.
9. **Contrato ativo:** `contrato_ativo` é verdadeiro quando a coluna "ativo" da planilha começa com "sim".
10. **Oxicatalisador:** lê as colunas `oxi_tem` e `oxi_bitola`. "sim" vira possui; "não" vira não possui; "pendência" e "sem informação" viram a situação correspondente; bitola "pendente" marca `bitola_pendente`.
11. **Resultado:** devolve quantas linhas foram gravadas e quantas ficaram `auto`, `revisar` e `sem_match`.

## Como o nome é comparado

A função [[funcao:match_cliente]] usa estas peças, todas dentro do banco:

- [[funcao:norm_nome]]: deixa o nome em maiúsculas, sem acento, sem LTDA/ME/EPP/EIRELI/S.A./CIA no final e sem pontuação.
- [[funcao:tokens_nome]]: quebra em palavras distintas, ignorando palavras de uma letra, conectivos (DE, DA, DO, E...) e códigos G1, G2.
- [[funcao:idf]] e [[funcao:peso_tokens]]: dão **mais peso a palavras raras** (por exemplo, o nome próprio da empresa) e menos às comuns. A tabela de pesos é a view materializada `mv_idf_tokens` (808 palavras); palavra desconhecida vale 6,5.
- [[funcao:score_nomes]]: nota de 0 a 1 = 30% cobertura do peso das palavras + 45% se a palavra mais rara do nome do banco aparece + 25% proporção de palavras em comum, com penalidade para palavras sobrando.
- [[funcao:sufixo_gerador]]: reconhece sufixos G1, G2, usados para diferenciar vários geradores do mesmo cliente.

**Passo a passo da decisão:**

1. Pré-filtro barato: só entram como candidatos os geradores cujo nome (fantasia ou razão social) tenha similaridade acima de 0,15 pelo `pg_trgm`, ou que compartilhem alguma palavra com o nome fantasia.
2. Calcula a nota de cada candidato e pega os 3 melhores.
3. Decide pelo melhor:

| Condição | Resultado |
|---|---|
| Nota abaixo de 0,75 | `sem_match` (nenhum gerador é ligado) |
| Nome da planilha tem sufixo G1/G2 | `revisar` (o banco não distingue qual gerador) |
| Nota de 0,90 ou mais **e** o CNPJ tem exatamente 1 gerador | `auto` (o gerador é ligado sozinho) |
| Qualquer outro caso | `revisar` |

4. Só no caso `auto` a linha recebe o `gerador_id`. Nos casos `revisar` e `sem_match` ficam guardados a nota e até 3 candidatos (em JSON), mas **sem gerador**.

:::detalhes Exemplo fictício de comparação
Planilha: "EXEMPLO ARTES GRAFICAS LTDA". Banco: gerador com nome fantasia "EXEMPLO". Depois de padronizar, as palavras são EXEMPLO, ARTES e GRAFICAS contra EXEMPLO. A palavra mais rara do nome do banco (EXEMPLO) está presente, o que pesa 45%, e as palavras a mais na planilha pesam pouco quando a rara foi encontrada. O resultado tende a nota alta; se o cliente tem um só gerador e a nota passa de 0,90, a linha é ligada sozinha. O exemplo é inventado e a nota real depende dos pesos em `mv_idf_tokens`.
:::

## Resultados hoje no banco

Contagens de [[pagina:banco/valores]], em 2026-11-11 (linhas de `preditivas_atg` e de `oxicatalisador_atg`):

| `match_status` | preditivas_atg | oxicatalisador_atg |
|---|---|---|
| `auto` | 1.841 | 263 |
| `revisar` | 1.197 | 171 |
| `sem_match` | 2.254 | 317 |
| `sem_planilha` | 1.281 | 183 |

Só as linhas `auto` (e as ligadas à mão) têm gerador. As demais **não aparecem na aba Preditiva de nenhum gerador**; só existem como linhas soltas em `preditivas_atg` e na view `vw_preditivas`. O valor `sem_planilha` não é gravado por nenhuma função analisada (V-007). {{nc}} Não há tela no código para revisar os casos `revisar` e `sem_match`: a aba Preditiva só oferece cadastrar os itens padrão de um gerador sem itens ([[modulo:preditiva-e-oxicatalisador]]).

## Tabelas e funções

| Operação | Onde |
|---|---|
| Lê | [[tabela:preditivas_staging]], [[tabela:preditiva_itens]], [[tabela:geradores_atg]] (nomes e CNPJ) |
| Grava | [[tabela:preditivas_atg]], [[tabela:oxicatalisador_atg]] |
| Funções | [[funcao:processar_preditivas]], [[funcao:match_cliente]], [[funcao:score_nomes]], [[funcao:norm_nome]], [[funcao:tokens_nome]], [[funcao:sufixo_gerador]], [[funcao:idf]], [[funcao:peso_tokens]], [[funcao:parse_data_pred]], [[funcao:eh_nao_aplica]] |

## Tratamento de erro, reprocessamento e testes

- **Erro:** a função não captura erros: qualquer falha interrompe a execução (e, dentro de uma transação, desfaz o que foi feito naquela chamada). Não há notificação.
- **Reprocessar:** chamar de novo com o mesmo `import_id` apaga e refaz o lote. Isso **descarta edições manuais** das linhas daquele lote. {{nc}}
- **Tabelas de conflito:** `preditivas_conflito` (259 linhas) e `oxicatalisador_conflito` (37) têm a mesma estrutura das tabelas definitivas mais um campo `arquivado_em`. Parecem guardar linhas arquivadas, mas nenhuma função ou arquivo do projeto as usa. {{fi}} Finalidade não identificada.
- **Testar com segurança:** só em uma cópia do banco, porque a função apaga e regrava. Não use em produção para "ver o resultado".

:::fonte
Funções `processar_preditivas`, `match_cliente`, `score_nomes`, `norm_nome`, `tokens_nome`, `sufixo_gerador`, `idf`, `peso_tokens`, `parse_data_pred` e `eh_nao_aplica` (extração Q04 de `docs/scripts/extracao_banco.sql`); contagens da consulta Q11; colunas das tabelas de conflito (extração Q08 e CSV do schema).
:::
