---
titulo: Preditiva e Oxicatalisador
subtitulo: O acompanhamento das manutenções de cada gerador
ordem: 6
resumo: Aba da janela do gerador que lista os itens de manutenção, as datas e a situação, e permite editar datas e o oxicatalisador.
verificado: 2026-11-11
commit: 9d680f5
fontes:
  - src/components/Clientes/PreditivaTab.tsx
  - src/utils/atgBackend.ts
  - src/utils/date.ts
  - src/types.ts
---

:::resumo
A manutenção preditiva é o acompanhamento dos itens que precisam ser trocados ou limpos de tempos em tempos no gerador (óleo e filtros, bateria, mangueiras, limpezas). Esta aba mostra, para cada item, quando foi feito, quando vence e a **situação**: em dia, a vencer, vencido, sem data ou não se aplica.

A pessoa pode corrigir as datas de cada item e informar se o gerador tem **oxicatalisador** e qual a bitola. A situação não é digitada: a plataforma calcula sozinha a partir da data de vencimento.
:::

## Quem usa

Administradores e usuários comuns editam. O vendedor vê as datas e a situação, mas não edita, não cadastra itens e não altera o oxicatalisador. A aba é a primeira a abrir na janela do gerador ([[modulo:gerador]]).

## Os 7 itens acompanhados

Vêm do catálogo fixo da tabela [[tabela:preditiva_itens]]. Os códigos, conforme a função de importação, são: `oleo_filtros`, `bateria`, `mang_combustivel`, `limpeza_qta`, `mang_preaquecimento`, `limpeza_radiador` e `limpeza_tanque`. Os nomes exibidos nas telas vêm da coluna `nome` do catálogo, que não foi extraída nesta documentação. A periodicidade de cada item (em meses) também está nesse catálogo e é usada para sugerir datas. {{nc}} O significado da sigla QTA não está no código.

## O que a pessoa vê, passo a passo

1. A aba lista os itens do gerador em uma tabela: **Item**, **Data Realizada**, **Data Vencimento**, **Status** e (para quem edita) **Ações**. Depois dos itens vem uma linha especial para o **Oxicatalisador**.
2. **Editar um item:** clica no lápis. Aparecem dois campos de data e a caixa "Não se aplica".
   - Ao preencher a data realizada, a tela **sugere** o vencimento somando a periodicidade do item (por exemplo, 12 meses). A sugestão pode ser alterada. Se o dia não existir no mês de destino, usa o último dia do mês (31/01 + 1 mês = 28/02).
   - Marcar "Não se aplica" bloqueia as datas.
3. Clica em "Salvar". A tela recarrega os dados para mostrar a situação recalculada.
4. **Oxicatalisador:** clica no lápis da linha, escolhe "Possui?" (sim, não ou em branco), digita a bitola e salva. Sem edição, a linha mostra "Possui", "Não possui" ou "Não informado", com a bitola.

**Gerador sem nenhum item:** aparece um aviso explicando que isso costuma acontecer quando o gerador ainda não foi casado com a planilha, e (para quem edita) o botão **"Cadastrar itens padrão de preditiva"**. Ele cria os 7 itens vazios do gerador, para as datas serem preenchidas à mão. Se algum item já existir, é ignorado em silêncio.

## Situação de cada item

A situação vem da view [[tabela:vw_preditivas]], na ordem abaixo, usando a data de hoje no horário de São Paulo:

| Situação | Quando |
|---|---|
| `nao_aplica` | O item está marcado como não se aplica. |
| `sem_data` | O item se aplica mas não tem data de vencimento. |
| `vencido` | A data de vencimento é anterior a hoje. |
| `a_vencer` | Vence em até 30 dias a partir de hoje. |
| `ok` | Vence daqui a mais de 30 dias. |

A tela mostra o valor técnico (por exemplo `a_vencer`) em uma etiqueta colorida: vermelha para vencido, âmbar para a vencer, verde para em dia e cinza nos demais. O Relatório de Saúde ([[modulo:relatorio-de-saude]]) usa nomes por extenso.

## Regras de negócio

- **A situação nunca é gravada:** ela é calculada a cada leitura, então um item "em dia" hoje vira "a vencer" sozinho quando faltarem 30 dias.
- **Salvar um item** usa a função [[funcao:salvar_preditiva]], que sempre marca a linha como editada à mão (`editado_manual`).
- **Não é possível apagar uma data:** se a pessoa limpar o campo e salvar, a função mantém a data antiga e só marca "sem data". A tela pode continuar exibindo a data antiga ao lado da situação "sem_data" (ver A-008 em [[pagina:controle/achados]]).
- **Histórico:** salvar um item grava a ação `editou` na entidade `preditiva`, guardando o que foi enviado, **sem o valor de antes**. A entidade `preditiva` não consta do mapa de reversão, então essas edições não podem ser revertidas pela tela de Histórico (ver V-014).
- **Itens padrão:** a ação grava `cadastrou_preditiva_padrao` no histórico. Os itens criados têm `linha_planilha = 0` e um lote (`import_id`) próprio.
- **Oxicatalisador** fica fora do cálculo de saúde: não tem datas. Salvar cria a linha se não existir, ou atualiza a existente, e grava `editou_oxicatalisador` com antes e depois (reversível).

:::alerta nc Mais de uma linha de oxicatalisador por gerador
A tabela [[tabela:oxicatalisador_atg]] não tem restrição de uma linha por gerador, e a tela lê com a expectativa de uma só. Se um gerador tivesse duas, a leitura falharia e a tela mostraria "Não informado" sem avisar o erro. Não foi verificado se existem casos assim. Registrado como V-025 em [[pagina:controle/pontos-a-validar]].
:::

## Erros e situações comuns

| Situação | O que acontece |
|---|---|
| Falha ao carregar | Mensagem de erro com o motivo e botão "Tentar Novamente". |
| Salvar item sem confirmação da função | "O salvamento não foi confirmado pelo backend." |
| Salvar com a função inexistente | A resposta simulada de teste seria usada e uma faixa amarela avisaria. Não é o caso hoje: a função existe. |
| Gerador sem item | Aviso e botão de cadastrar itens padrão (ou só o aviso, para o vendedor). |
| Itens padrão já existentes | Os já existentes são ignorados; o restante é criado. |

## Tabelas e integrações

| Operação | Onde |
|---|---|
| Lê | [[tabela:vw_preditivas]] (itens do gerador, por ordem), [[tabela:oxicatalisador_atg]], [[tabela:preditiva_itens]] |
| Grava | [[tabela:preditivas_atg]] (pela função `salvar_preditiva` e pelo cadastro dos itens padrão), [[tabela:oxicatalisador_atg]], [[tabela:log_edicoes]] |
| Função | [[funcao:salvar_preditiva]] |
| Origem dos dados | A maior parte das linhas veio da importação da planilha: [[fluxo:importacao-preditivas]] |

:::gerado usos preditivas_atg
:::

:::detalhes Detalhes de implementação
- Componente `PreditivaTab`. Lê `vw_preditivas` filtrando por `gerador_id` e ordenando por `ordem`, e `oxicatalisador_atg` com `maybeSingle()`; o erro dessa segunda leitura é ignorado.
- `salvarPreditiva(id, { data_realizada, data_vencimento, nao_aplica }, usuario)` chama a função do banco; sucesso é reconhecido pela resposta ter `id`.
- Os itens padrão são criados com `upsert` em `preditivas_atg` (`onConflict: gerador_id,item_codigo`, ignorando duplicatas) com `cliente_planilha` preenchido por razão social ou nome fantasia (ou "CADASTRO MANUAL"), só para satisfazer as colunas obrigatórias.
- O oxicatalisador novo recebe `import_id` aleatório, `linha_planilha = 0` e `cliente_planilha` pelo mesmo critério.
- Soma de meses: `somarMeses` em `src/utils/date.ts`. Datas puras são formatadas sem conversão de fuso, para não voltar um dia.
:::

:::fonte
`src/components/Clientes/PreditivaTab.tsx` (`fetchData`, `handleSave`, `handleCadastrarPreditivaPadrao`, `handleSaveOxi`), `src/utils/date.ts` (`somarMeses`, `formatDate`), função `salvar_preditiva` e view `vw_preditivas` (extração Q03 e Q04).
:::
