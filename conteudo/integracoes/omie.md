---
titulo: Omie
subtitulo: O sistema de gestão (ERP) da ATG: clientes, produtos, serviços e pedidos
resumo: Sistema externo de onde vêm os clientes, o catálogo de produtos e serviços e os pedidos. A plataforma conversa com ele por fluxos do n8n.
ordem: 4
verificado: 2026-11-12
commit: 8db54a9
fontes:
  - docs/data/fluxos.gerado.json
  - docs/_fontes_privadas/n8n/
  - src/types.ts
---

:::resumo
O Omie é o sistema de gestão (ERP) da ATG: guarda o cadastro oficial de clientes, os produtos e serviços com seus preços, e os pedidos de venda. A plataforma **cria clientes no Omie** (junto com o iClass), **lê o catálogo e os preços** para manter as telas de Produtos e Serviços, e deveria **receber o aviso de pedido concluído** para gerar orçamentos.

A plataforma **nunca fala direto** com o Omie: sempre por um fluxo do n8n.
:::

## Para que serve e quem usa

| Uso | Onde | Fluxo |
|---|---|---|
| Criar cliente (`IncluirCliente`) | [[modulo:criar-cliente]] | [[fluxo:criar-cliente]] |
| Ler produtos (`ListarProdutos`) | [[modulo:produtos-e-servicos]] | [[fluxo:atualiza-produto]], [[fluxo:preco-produto-mensal]] |
| Ler serviços (`ListarCadastroServico`) | [[modulo:produtos-e-servicos]] | [[fluxo:atualiza-servico]], [[fluxo:preco-servico-mensal]] |
| Ler pedido e cliente (`ConsultarPedido`, `ConsultarCliente`) | Orçamentos | [[fluxo:receberorc]] |

## Direção do dado

- **Sai da plataforma:** só a criação de cliente (razão social, nome fantasia, e-mail, CNPJ/CPF, telefone, endereço, bairro, cidade, estado, CEP e o código de integração `ATG_` + CNPJ).
- **Entra na plataforma:** código do cliente no Omie; produtos (código, nome, valor, família, unidade, NCM, inativo, características); serviços (código, descrição, valor, código LC 116); pedidos e telefone de cliente (no `receberorc`).
- **Vem do Omie por evento:** o aviso de pedido concluído, para o webhook `receberorc`. {{nc}} Configuração do aviso no Omie fora do repositório.

A plataforma não altera cadastros existentes no Omie.

## Chamadas usadas

Todas por `POST` para a API do Omie, com o nome da operação (`call`) no corpo: `IncluirCliente` (clientes), `ConsultarCliente`, `ListarProdutos` (produtos), `ListarCadastroServico` (serviços) e `ConsultarPedido` (pedidos).

## Autenticação

Chave e segredo da API do Omie **escritos dentro do corpo das chamadas**, em 6 dos fluxos, e não em credenciais do n8n (A-002). Os valores não são reproduzidos aqui.

## Limites e restrições conhecidas

- Os fluxos pedem produtos em páginas de 200 e serviços em páginas de 100, e esperam 2 segundos entre as páginas nos fluxos forçados.
- O que o Omie faz com um código de integração repetido (`ATG_` + CNPJ) não foi verificado (V-018).
- Limites de chamadas, planos e ambiente de testes do Omie não constam no repositório. {{nc}}

## O que acontece quando falha

| Falha | Efeito |
|---|---|
| Omie recusa ou não responde ao criar cliente | Nada é criado em lugar nenhum; a tela mostra o erro. |
| Falha nas atualizações de preço | O fluxo para onde falhou; o que já foi gravado permanece; não há aviso. |
| Preços divergentes entre Omie e plataforma | A atualização sobrescreve o que foi editado na plataforma (A-024). |

## Dados do Omie guardados no banco

[[tabela:omie_clientes]] (código do Omie e dados do cliente), [[tabela:Produtos]], [[tabela:Serviços]], a lista de consulta [[tabela:omie]] e a cópia de vendedores [[tabela:vendedores omie]].

:::gerado fluxos-usam host:omie.com.br
:::

:::fonte
`docs/data/fluxos.gerado.json`, exportações em `docs/_fontes_privadas/n8n/` (lidas sem copiar valores), `src/types.ts`.
:::
