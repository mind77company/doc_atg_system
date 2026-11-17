---
titulo: Ordens de Serviço
subtitulo: A lista de ordens de serviço, com status, erro e orçamento ligado
resumo: Tela que lista as ordens de serviço, filtra por período, status e erro, edita e exporta para Excel.
ordem: 4
verificado: 2026-11-12
commit: 8db54a9
fontes:
  - src/pages/OrdensServico.tsx
  - src/components/ui/PeriodFilter.tsx
  - src/utils/excel.ts
  - src/types.ts
---

:::resumo
Mostra as ordens de serviço (O.S.) que a plataforma acompanha: código, cliente, se foi **processada** ou **não processada**, o tipo de erro, o orçamento ligado e a data. Permite filtrar, abrir os detalhes, corrigir o status e **exportar a lista para Excel**.

Hoje a tela aparece **vazia**: a tabela de ordens de serviço tem 0 linhas e nenhuma tela da plataforma cria O.S.
:::

## Quem usa

Quem tem a página "Ordens de Serviço" liberada (administrador e usuários comuns marcados). Não é uma página padrão do vendedor.

## O que a pessoa vê, passo a passo

1. A lista abre filtrada pelo período (que começa em junho de 2026; ver [[modulo:dashboard]] e A-020).
2. **Filtros:** período (Hoje, Semana, Mês, Personalizado), busca por código ou cliente, **Status** (Processada ou Não Processada) e **Tipo de Erro**. "Limpar filtros" volta ao padrão.
3. A tabela mostra: **Código O.S.**, **Cliente** ("Cliente" e 8 caracteres do identificador), **Status** (ponto verde ou vermelho), **Orçamento Vinculado** (código do orçamento ou "Nenhum"), **Tipo de Erro** (só para não processadas; "Erro não especificado" se vazio), **Data de Criação** e um botão de olho.
4. Clicar na linha abre "Detalhes da Ordem de Serviço".
5. **Editar O.S.:** libera três campos: **Mudar Status** (Processada ou Não Processada), **Tipo de Erro** (obrigatório se não processada) e **Orçamento Vinculado** (lista dos orçamentos do **mesmo cliente**, marcados "Faturado" ou "Aberto", ou "Nenhum"). "Salvar Alterações" grava.
6. **Exportar Excel** gera um arquivo `Relatorio_OS_<data>.xlsx` com o que está filtrado: Código O.S., Cliente (ID), Status, Orçamento Vinculado, Tipo de Erro e Criado Em. Sem linhas, o botão fica desligado.

Quem chega pelo Dashboard em "O.S. com Erro" já vê a lista filtrada em Não Processada (endereço `#/ordens-servico?status=erro`).

## Regras de negócio

- **Tipo de erro:** as opções são cinco: Inconsistência de valores, Gerador não localizado, Erro de faturamento, Assinatura digital ausente e Dados cadastrais incompletos. Ao mudar para Não Processada, a tela já sugere o primeiro. Ao marcar Processada, o tipo de erro é **apagado**.
- A tela **exige** o tipo de erro quando a O.S. não está processada ("O preenchimento do tipo de erro é obrigatório quando a O.S. não está processada"). O banco não impõe isso.
- O orçamento só pode ser escolhido entre os do mesmo cliente (`cliente_id`).
- **O vínculo é só de um lado:** ao salvar, a tela atualiza `orcamento_id` da O.S., mas **não** atualiza `os_id` do orçamento. A-022 em [[pagina:controle/achados]].
- **Sem histórico:** a edição de O.S. **não** grava no Histórico e **não pode** ser revertida por ele.
- O código `ordens-servico-detail` existe como rota, mas abre a mesma lista: não há página de detalhe separada.

## Erros e situações comuns

| Situação | O que acontece |
|---|---|
| Falha ao carregar | "Falha ao carregar Ordens de Serviço", com o motivo e botão para tentar de novo. |
| Nenhuma O.S. no período ou filtros | "Nenhuma O.S. encontrada" (com botão de limpar filtros, se há filtro ativo). |
| Salvar sem tipo de erro | Aviso e nada é salvo. |
| Falha ao salvar | "Erro ao atualizar a ordem de serviço." com o motivo. |
| Exportar sem dados | "Nenhum dado encontrado para exportação." |

## Tabelas e integrações

| Operação | Onde |
|---|---|
| Lê | [[tabela:ordens_servico]], [[tabela:orcamentos]] (para mostrar e escolher o orçamento ligado) |
| Grava | [[tabela:ordens_servico]] (`processada`, `tipo_erro`, `orcamento_id`) |
| Integrações | Nenhuma. A exportação é feita no navegador (biblioteca `xlsx`). |

Quem insere O.S. na tabela não está claro (V-030).

:::gerado usos ordens_servico
:::

:::detalhes Detalhes de implementação
- Componente `OrdensServico`; carrega as duas tabelas e filtra no navegador. O filtro de status inicial vem do endereço (`?status=erro` ou `?status=processada`).
- A edição é um `UPDATE` direto em `ordens_servico` pelo navegador (chave pública do Supabase), e a lista local é atualizada sem reler o banco.
- A lista de tipos de erro é uma constante do código (`errorTypes`), não uma tabela do banco.
:::

:::fonte
`src/pages/OrdensServico.tsx` (`handleSaveOS`, `handleExport`, `errorTypes`), `src/utils/excel.ts`.
:::
