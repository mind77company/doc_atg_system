---
titulo: atualiza-produto (forçada)
subtitulo: Atualizar o catálogo de produtos a partir do Omie, sob demanda
resumo: Fluxo do n8n disparado pelo botão Atualizar Preços da tela de Produtos, que lê todos os produtos do Omie e grava no banco.
ordem: 10
verificado: 2026-11-12
commit: 8db54a9
fontes:
  - src/utils/webhooks.ts
  - src/components/Products/ProductList.tsx
  - docs/_fontes_privadas/n8n/Atualiza__o_For_ada_de_Pre_o_de_Produto.json
---

:::resumo
Quando alguém clica em **Atualizar Preços** na tela de Produtos, esta automação busca no **Omie** a lista completa de produtos, página por página, e grava no banco da plataforma: nome, valor, família, unidade, NCM, se está inativo e as características. Produtos novos entram; os que já existem são atualizados.

É a versão "na hora" da atualização que também roda sozinha a cada 30 dias ([[fluxo:preco-produto-mensal]]).
:::

## Gatilho

- **Tipo:** webhook `POST` em `/webhook/atualiza-produto` do servidor n8n.
- **Quem chama:** o botão **Atualizar Preços** da tela [[modulo:produtos-e-servicos]], pela função `triggerWebhook` de `src/utils/webhooks.ts`. Qualquer usuário com a página liberada pode acionar.
- **Autenticação do webhook:** nenhuma configurada. {{nc}}

## Diagrama do fluxo

:::diagrama Fluxo atualiza-produto: percorre as páginas de produtos do Omie, grava cada página no banco e repete até acabar.
flowchart TD
  A["POST atualiza-produto"] --> B["Comecar pela pagina 1"]
  B --> C["Omie: ListarProdutos da pagina"]
  C --> D["Converter produtos para as colunas do banco"]
  D --> E["Gravar a pagina em Produtos: inserir ou atualizar"]
  E --> F{"Ha mais paginas?"}
  F -->|sim| G["Esperar 2 segundos"]
  G --> C
  F -->|nao| H["Montar resumo"]
  H --> I["E-mail ao administrador: desativado"]
:::

## O que é gravado

Para cada produto devolvido pelo Omie, o fluxo grava em [[tabela:Produtos]] (chave `cod_produto`):

| Coluna | Vem de |
|---|---|
| `cod_produto` | Código do produto no Omie |
| `codigo_interno` | Código interno (`codigo`) |
| `nome_produto` | Descrição |
| `valor_unitario` | Valor unitário |
| `familia`, `codigo_familia` | Família do produto |
| `unidade`, `ncm` | Unidade e NCM |
| `inativo` | Verdadeiro se o Omie marca o produto como inativo ou bloqueado; falso caso contrário |
| `caracteristicas` | Características do produto (nome e conteúdo, em JSON) |
| `termos_compatibilidade` | Termos tirados do conteúdo das características (separados por ";", em maiúsculas) |
| `caract_sync_em` | Data e hora da atualização |

**Não grava:** `categora_item`, `CFOP`, `nome_normalizado` e `created_at` (este fica com o padrão do banco nos produtos novos).

:::alerta aviso Sobrescreve edições feitas na tela
Como `nome_produto`, `valor_unitario` e `inativo` são regravados com os valores do Omie, qualquer correção ou inativação feita na tela de Produtos é desfeita por esta atualização. Ver A-024.
:::

## Resultados e tratamento de erro

- **Resposta ao sistema:** o fluxo monta um resumo (páginas processadas, produtos sincronizados, total no Omie), mas **não tem nó de resposta ao webhook**. A tela espera uma resposta de sucesso e pode mostrar erro mesmo quando a atualização terminou bem, ou aguardar o fim de todo o processamento. {{nc}} Não testado (V-034).
- **E-mail de aviso:** o nó que enviaria o resumo ao administrador está **desativado**, com destinatário provisório.
- **Erros:** nenhum tratamento específico. Se o Omie ou o banco falhar em uma página, o fluxo para naquele ponto; as páginas já gravadas permanecem. Não há notificação.
- **Reprocessar:** clicar de novo em Atualizar Preços. O fluxo é seguro de repetir (insere ou atualiza pela mesma chave).
- **Tempo:** a atualização espera 2 segundos entre as páginas de 200 produtos; com 903 produtos são 5 páginas.

## Dados trocados (exemplo fictício)

:::detalhes Exemplos inventados
```
POST /webhook/atualiza-produto          (sem corpo)

Pedido ao Omie (por página):
  ListarProdutos { pagina: 1, registros_por_pagina: 200, exibir_caracteristicas: "S" }

Linha gravada em Produtos (exemplo):
  { cod_produto: "1000", codigo_interno: "COD-EXEMPLO", nome_produto: "Filtro Exemplo",
    valor_unitario: 100.0, familia: "Filtros", unidade: "UN", inativo: false }
```
:::

## O que o fluxo faz, etapa por etapa

:::gerado fluxo-meta atualiza-produto
:::

:::gerado fluxo-nos atualiza-produto
:::

:::detalhes Ligações entre as etapas
:::gerado fluxo-ligacoes atualiza-produto
:::
:::

## Integrações, segredos e como testar

| Sistema | Uso | Autenticação |
|---|---|---|
| Omie | `ListarProdutos` | Chave e segredo da API dentro do corpo da chamada (ver A-002; não reproduzidos). |
| Supabase | Gravação por chamada REST em `Produtos` | **Chave de administrador (`service_role`) escrita nos cabeçalhos** (ver A-001; não reproduzida). |

- **Testar com segurança:** o fluxo grava em produção e substitui nome, valor e inativo. Teste fora do horário de uso e avise quem edita produtos. Não há ambiente de teste identificado. {{nc}}

:::fonte
`docs/_fontes_privadas/n8n/Atualiza__o_For_ada_de_Pre_o_de_Produto.json` (11 nós, lido sem copiar valores de chaves), `src/utils/webhooks.ts`, `src/components/Products/ProductList.tsx`.
:::

## Ligações

[[modulo:produtos-e-servicos]], [[fluxo:preco-produto-mensal]], [[tabela:Produtos]], [[integracao:omie]].
