---
titulo: Produtos e Serviços
subtitulo: O catálogo de peças e serviços da ATG, copiado do Omie
resumo: Duas telas de consulta ao catálogo, com busca, categoria, exportação para Excel, edição de produtos, inativação e botão de atualizar preços.
ordem: 9
verificado: 2026-11-12
commit: 8db54a9
fontes:
  - src/components/Products/ProductList.tsx
  - src/components/Services/ServiceList.tsx
  - src/utils/webhooks.ts
  - src/utils/excel.ts
  - src/data/productsServicesMock.ts
---

:::resumo
São duas telas: **Produtos** (peças, insumos e equipamentos) e **Serviços**. Ambas mostram o catálogo que veio do **Omie**, com código, nome ou descrição e valor, e permitem buscar, exportar para Excel, inativar e reativar itens.

O botão **Atualizar Preços** pede para uma automação buscar os valores mais novos no Omie e gravar aqui. A tela de Produtos também deixa corrigir nome, valor, categoria e CFOP à mão, mas essas correções **podem ser desfeitas** na próxima atualização vinda do Omie.
:::

## Quem usa

Quem tem as páginas "Produtos" e "Serviços" liberadas. **Todos** esses usuários veem o botão Atualizar Preços e (em Produtos) o botão de editar. Só o **administrador** vê os botões de inativar e reativar (e, em Serviços, a coluna de Ações).

## Produtos

1. A tela mostra o "Catálogo de Produtos": uma tabela com **Código**, **Nome do Produto**, **Valor Unitário** (valor vazio ou zero aparece como "Sob consulta"), **Categoria**, **CFOP**, **Status** (Ativo ou Inativo) e **Ações**.
2. **Busca** por nome e **filtro de categoria** (lista das categorias existentes), feitos no navegador. Mostra 20 itens por página, com botões de página anterior e próxima.
3. **Exportar Excel:** gera `Relatorio_Produtos.xlsx` com o que está filtrado (ID, Código, Nome, Valor, Categoria, CFOP e Criado Em).
4. **Atualizar Preços:** chama o fluxo [[fluxo:atualiza-produto]] e mostra "Atualização de preços disparada com sucesso!" (ou o erro, com o código de resposta).
5. **Editar produto** (lápis): abre uma janela com Nome do Produto, Valor Unitário, Categoria e CFOP. Campos de número vazios viram "sem valor". Salvar grava direto no banco.
6. **Inativar ou reativar** (administrador): alterna o campo `inativo`. O produto continua na lista, com o status "Inativo".
7. No topo aparece um selo "Supabase Conectado" ou "Ambiente Local", conforme a configuração.

## Serviços

Igual a Produtos, com estas diferenças: colunas **Código do Serviço**, **Descrição**, **Valor** (também "Sob consulta" se zero), **Status**; **não há edição** de serviço pela tela (só inativar e reativar, para o administrador); busca só por descrição, sem filtro de categoria; exporta `Relatorio_Servicos`. O botão Atualizar Preços chama [[fluxo:atualiza-servico]].

## Regras de negócio

- A fonte dos dados é o Omie. As tabelas [[tabela:Produtos]] (903 linhas em 2026-11-12) e [[tabela:Serviços]] (41) são cópias, atualizadas por fluxos do n8n: a cada 30 dias ([[fluxo:preco-produto-mensal]], [[fluxo:preco-servico-mensal]]) e quando alguém clica em Atualizar Preços.
- **Valor zero ou vazio = "Sob consulta".**
- **Inativar não apaga:** só marca o item.
- A edição de produto grava `nome_produto`, `valor_unitario`, `categora_item` e `CFOP`. Nenhuma edição, inativação ou atualização de preços gera registro no Histórico.

:::alerta aviso Edições e inativações podem ser desfeitas pela atualização
Os fluxos de atualização do Omie regravam o nome e o valor do produto, e o fluxo forçado regrava também o campo `inativo`, com o valor do Omie. Uma correção ou inativação feita nesta tela pode ser sobrescrita na próxima atualização. Para mudar um nome ou preço de forma duradoura, a mudança precisa ser feita no Omie. Ver A-024.
:::

:::alerta aviso Atualizar Preços de Serviços pode não mudar o valor mostrado
O fluxo forçado de serviços grava o preço em uma coluna que a tela não lê (`preco_unitario`); a tela mostra `nValorDesc`, atualizada só pelo fluxo mensal. E o endereço chamado pelo botão (`atualiza-serv`) é diferente do endereço do fluxo exportado (`atualiza-servico`). Ver A-025 e V-003 em [[pagina:controle/achados]] e [[pagina:controle/pontos-a-validar]].
:::

:::alerta aviso Dados de exemplo quando o banco falha
Se o Supabase não estiver configurado ou a leitura falhar, a tela **mostra uma lista de exemplo embutida no código** (produtos e serviços fictícios), com um aviso de erro. Quem não reparar no aviso pode achar que é o catálogo real. Ver A-027.
:::

## Erros e situações comuns

| Situação | O que acontece |
|---|---|
| Falha ao carregar | Aviso "Erro ao carregar produtos (ou serviços). Exibindo dados locais como fallback." e a lista de exemplo. |
| Falha ao atualizar preços | "Erro ao acionar a atualização de preços", com "Webhook respondeu com status N". {{nc}} Os fluxos forçados podem responder com erro mesmo ao terminar bem (V-034). |
| Falha ao salvar o produto | "Erro ao salvar alterações do produto." com o motivo. |
| Sem dados para exportar | "Não há dados para exportar." |

## Tabelas e integrações

| Operação | Onde |
|---|---|
| Lê | [[tabela:Produtos]], [[tabela:Serviços]] |
| Grava | [[tabela:Produtos]] (edição e inativação), [[tabela:Serviços]] (inativação) |
| Aciona | Fluxos [[fluxo:atualiza-produto]] e [[fluxo:atualiza-servico]], que leem o [[integracao:omie]] |

:::gerado usos Produtos
:::

:::gerado usos Serviços
:::

:::detalhes Detalhes de implementação
- Componentes `ProductList` e `ServiceList`; leem a tabela inteira (`select *`) e filtram e paginam no navegador (20 por página em Produtos).
- O disparo é `triggerWebhook(url)`: um `POST` sem corpo; é considerado sucesso se a resposta tiver status 2xx.
- Os endereços dos webhooks ficam em `src/utils/webhooks.ts`.
- A exportação usa a biblioteca `xlsx`.
- O tipo `Produto` de `src/types.ts` lista só 8 dos 17 campos da tabela.
:::

:::fonte
`src/components/Products/ProductList.tsx` (`fetchProducts`, `handleUpdatePrices`, `handleSaveEdit`, `handleToggleAtivo`), `src/components/Services/ServiceList.tsx`, `src/utils/webhooks.ts`.
:::
