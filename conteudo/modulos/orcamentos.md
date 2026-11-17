---
titulo: Orçamentos
subtitulo: A lista de orçamentos de manutenção e o envio para faturamento
resumo: Tela que lista orçamentos, filtra por período e status, edita o vínculo com a O.S., marca como faturado e exporta para Excel.
ordem: 5
verificado: 2026-11-12
commit: 8db54a9
fontes:
  - src/pages/Orcamentos.tsx
  - src/components/ui/PeriodFilter.tsx
  - src/utils/excel.ts
---

:::resumo
Mostra os orçamentos de manutenção de geradores que a plataforma acompanha: código, cliente, se está **em aberto** ou **faturado**, a ordem de serviço ligada e a data. Permite abrir os detalhes, marcar um orçamento como enviado para faturamento, ligar a uma O.S. e exportar para Excel.

Hoje a lista está **vazia** (a tabela tem 0 linhas) e a plataforma **não tem como criar** um orçamento: o botão "Novo Orçamento" do Dashboard só abre esta lista.
:::

## Quem usa

Quem tem a página "Orçamentos" liberada. Não é página padrão do vendedor.

## O que a pessoa vê, passo a passo

1. A lista abre filtrada pelo período (padrão fixo em junho de 2026; ver A-020).
2. **Filtros:** período, busca por código ou cliente e **Status** ("Faturado (Processado)" ou "Aberto (Não Processado)").
3. A tabela mostra **Código Orçamento**, **Cliente** ("Cliente" e 8 caracteres do identificador), **Status** (Em Aberto ou Faturado), **O.S. Vinculada**, **Data de Criação** e ações.
4. **Faturar** (botão na linha, descrito como "Enviar para Faturamento"): aparece só para os orçamentos em aberto, marca o orçamento como processado e avisa "Orçamento ... enviado para faturamento!".
5. **Detalhes:** o olho abre "Detalhes do Orçamento", com o resumo "Enviado para Faturamento" ou "Aberto (Aguardando Aprovação)". **Editar** libera o status (Aberto ou Faturado) e a **O.S. Vinculada**.
6. **Exportar Excel:** gera `Relatorio_Orcamentos_<data>.xlsx` com Código Orçamento, Cliente (ID), Status, O.S. Vinculada e Criado Em, usando o que está filtrado.

Quem chega pelo Dashboard em "Faturamento" já vê a lista em Faturado (`#/orcamentos?status=processada`).

## Regras de negócio

- **"Faturado" significa só `processada = verdadeiro`.** O botão Enviar para Faturamento apenas altera esse campo no banco; **não chama nenhum fluxo nem envia nada ao Omie ou a outro sistema**. {{nc}} O que deveria acontecer no envio real não está no código (V-031).
- O vínculo com a O.S. é gravado só em `os_id` do orçamento; a O.S. não é atualizada (A-022).
- A edição de orçamento **não** grava no Histórico.
- Não existe tela ou botão para **criar** orçamento. Os registros precisariam vir de fora (V-030). O fluxo [[fluxo:receberorc]] é o candidato, mas está inacabado.

## Erros e situações comuns

| Situação | O que acontece |
|---|---|
| Falha ao carregar | "Falha ao carregar orçamentos" com o motivo e botão para tentar de novo. |
| Sem resultados | "Nenhum orçamento encontrado". |
| Falha ao salvar | "Erro ao atualizar o orçamento." com o motivo. |
| Falha ao enviar para faturamento | "Erro ao enviar orçamento para faturamento." |
| Exportar sem dados | "Nenhum orçamento encontrado para exportação." |

## Tabelas e integrações

| Operação | Onde |
|---|---|
| Lê | [[tabela:orcamentos]], [[tabela:ordens_servico]] |
| Grava | [[tabela:orcamentos]] (`processada`, `os_id`) |
| Integrações | Nenhuma na tela. A exportação é feita no navegador. |

:::gerado usos orcamentos
:::

:::detalhes Detalhes de implementação
- Componente `Orcamentos`; mesma estrutura da tela de O.S. (carrega as duas tabelas, filtra no navegador, edita com `UPDATE` direto).
- `handleSendToInvoicing` faz `update({ processada: true })` e atualiza a lista local.
:::

:::fonte
`src/pages/Orcamentos.tsx` (`handleSaveOrcamento`, `handleSendToInvoicing`, `handleExport`).
:::
