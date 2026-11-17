---
titulo: Dashboard
subtitulo: O painel operacional com os números de ordens de serviço e orçamentos
resumo: Painel com quatro indicadores, gráfico diário e atividade recente de ordens de serviço e orçamentos.
ordem: 3
verificado: 2026-11-12
commit: 8db54a9
fontes:
  - src/pages/Dashboard.tsx
  - src/components/ui/PeriodFilter.tsx
  - src/utils/date.ts
---

:::resumo
É a primeira tela que um administrador vê ao entrar. Mostra, para o período escolhido, quantas ordens de serviço foram processadas e quantas tiveram erro, quantos orçamentos foram criados e quantos foram enviados para faturamento, além de um gráfico por dia e das últimas movimentações.

Hoje o painel mostra **zero em tudo**, porque as tabelas de ordens de serviço e de orçamentos estão vazias. Além disso, o período padrão está preso em **junho de 2026**, e não no mês atual (ver abaixo).
:::

## Quem usa

Qualquer pessoa com a página Dashboard liberada. É a página inicial do administrador. O vendedor não a recebe por padrão.

## O que a pessoa vê

| Parte | O que mostra |
|---|---|
| Título | "Painel Operacional" e "ATG \| SISTEMA DE ORDEM DE SERVIÇOS E ORÇAMENTOS". |
| Período | Seletor Hoje, Semana, Mês e Personalizado (datas de início e fim). |
| Novo Orçamento | Leva à tela [[modulo:orcamentos]]. Essa tela **não tem formulário de criação**: o botão apenas abre a lista. |
| O.S. Processadas | Quantidade de ordens de serviço do período com `processada = verdadeiro`. |
| O.S. com Erro | Quantidade com `processada = falso`. Clicar abre [[modulo:ordens-de-servico]] já filtrada em "Não Processada". |
| Orçamentos Criados | Quantidade de orçamentos do período. |
| Faturamento | Quantidade de orçamentos processados no período. Clicar abre [[modulo:orcamentos]] filtrada em "Faturado". |
| Volumetria de Atendimento | Gráfico de barras por dia do período: barras de sucesso (a do dia de maior sucesso em azul, as demais hachuradas) e de erros (vermelho claro). |
| Atividade Recente | As 6 movimentações mais novas do período, misturando O.S. e orçamentos. Cada linha mostra código, tipo, "Cliente" mais os 8 primeiros caracteres do identificador, data, hora e situação. Clicar abre a lista correspondente. |
| Ver todas as Ordens | Atalho para a lista de O.S. |

**Detalhes do gráfico:** os orçamentos são contados por dia, mas **não são desenhados** no gráfico (só sucesso e erros). O período e o dia exato usam a data de criação.

## Regras de negócio

- Todos os números são contados **no navegador**, sobre a lista inteira de O.S. e de orçamentos carregada do banco, filtrada pelo período. Não há contagem calculada no banco.
- "Processada" para O.S. significa processada com sucesso; para orçamento, enviado para faturamento. Tudo que não está processado é tratado como erro (O.S.) ou aberto (orçamento).
- As datas são comparadas por dia, sem horário.

:::alerta aviso O período padrão está fixo em junho de 2026
O componente de período usa **30/06/2026** como "hoje" e **01/06 a 30/06/2026** como "mês", escritos no código ("referência de metadados"). Por isso, "Hoje", "Semana" e "Mês" mostram junho de 2026, e o painel já abre nesse período, e não no mês atual. A mesma regra vale para as telas de O.S. e de orçamentos. O período "Personalizado" permite escolher datas reais. Ver A-020 em [[pagina:controle/achados]].
:::

## Erros e situações comuns

| Situação | O que acontece |
|---|---|
| Falha ao carregar as duas tabelas | "Falha ao carregar o painel", com o motivo e botão para tentar de novo. |
| Tabelas vazias | Os números mostram 0, o gráfico fica sem barras e a atividade recente mostra "Nenhum registro encontrado para os filtros aplicados." |
| Carregando | Os números mostram "—" e o gráfico, um círculo girando. |

## Tabelas e integrações

| Operação | Onde |
|---|---|
| Lê | [[tabela:ordens_servico]] e [[tabela:orcamentos]] (todas as linhas, por data de criação) |
| Grava | Nada |
| Integrações | Nenhuma |

:::detalhes Detalhes de implementação
- Componente `Dashboard`; duas consultas em paralelo (`select *` ordenado por `criado_em`). O gráfico usa a biblioteca Recharts.
- O componente `PeriodFilter` (`src/components/ui/PeriodFilter.tsx`) define `todayStr = "2026-06-30"` e o intervalo do mês fixo, e é compartilhado pelas telas de O.S. e orçamentos.
- O rótulo de cliente é `Cliente <8 primeiros caracteres do identificador>`: o código diz que é provisório "até existir uma tabela de clientes".
:::

:::fonte
`src/pages/Dashboard.tsx`, `src/components/ui/PeriodFilter.tsx` (`getPresetRange`).
:::
