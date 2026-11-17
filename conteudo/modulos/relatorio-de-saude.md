---
titulo: Relatório de Saúde do gerador
subtitulo: O documento em PDF que resume a manutenção de um gerador para o cliente
resumo: Tela que monta o Relatório de Saúde de um gerador, com percentual, itens e contato, e gera o PDF pelo navegador.
ordem: 7
verificado: 2026-11-11
commit: 8db54a9
fontes:
  - src/pages/RelatorioGerador.tsx
  - src/utils/saudeGerador.ts
  - src/utils/pages.ts
  - src/utils/date.ts
---

:::resumo
O Relatório de Saúde é uma página de uma folha, pronta para virar PDF e ser enviada ao cliente. Ela mostra se o gerador está **em dia** ou tem itens de manutenção que **precisam de atenção**, com um percentual de saúde, a lista de todos os itens com última troca, próxima troca e situação, e o contato do consultor para regularizar.

É aberta pelo botão "Gerar Relatório" na janela do gerador. O PDF é gerado pelo próprio navegador, pela opção de impressão.
:::

## Quem usa

Administradores, usuários comuns e vendedores. A tela não é um item do menu: abre para quem tem acesso à página Clientes ([[modulo:clientes-lista]]). O endereço é `#/relatorio/<id do gerador>`.

**Vendedor:** só abre o relatório de gerador de cliente atribuído a ele. A conferência é feita antes de buscar qualquer dado de preditiva e, em qualquer falha ou ausência de vínculo, bloqueia ("Você não tem acesso ao relatório deste gerador.").

## O que a pessoa vê, passo a passo

1. Em "Gerar Relatório", a tela abre o relatório já montado, com os botões **Voltar para Clientes** e **Baixar PDF**.
2. **Baixar PDF** abre a janela de impressão do navegador. A tela orienta: "escolha **Salvar como PDF** e desmarque **Cabeçalhos e rodapés**". O nome sugerido para o arquivo é `Relatorio de Saude - <nome do cliente> - Serie <série>`.
3. A folha tem, de cima para baixo:
   - **Cabeçalho:** logo da ATG, "Relatório de Saúde do Gerador" e a data e hora de emissão.
   - **Resultado:** um de três blocos (veja abaixo).
   - **Cliente** (razão social, nome fantasia, CNPJ) e **Gerador** (descrição, fabricante, modelo, nº de série, patrimônio).
   - **Situação de todos os itens da preditiva:** tabela com Item, Período (em meses), Última troca, Próxima troca e Situação. Abaixo, a linha do Oxicatalisador (informativa).
   - **Fechamento:** "Mantenha o plano em dia" (em dia) ou "Próximos passos", com o nome e e-mail do vendedor do cliente (ou "ATG Geradores" se não houver) e o WhatsApp da ATG.
   - **Rodapé:** explica como a situação é calculada.

## Os três resultados possíveis

| Situação do gerador | Bloco mostrado |
|---|---|
| Sem nenhum item de preditiva | "Preditiva ainda não cadastrada": não foi possível avaliar a saúde. |
| Todos os itens avaliáveis em dia | Verde, "Saúde 100%": "Seu gerador está em dia." |
| Algum item vencido, a vencer ou sem data | Vermelho (se há vencido) ou âmbar: percentual de saúde e etiquetas com a quantidade de vencidos, a vencer, sem data e em dia. |

## Como o percentual é calculado

A regra está em `src/utils/saudeGerador.ts` e usa a situação de cada item calculada pela view [[tabela:vw_preditivas]].

- **Itens avaliáveis** = todos os itens menos os que "não se aplicam".
- **Percentual** = itens em dia ÷ itens avaliáveis, arredondado. Sem itens avaliáveis, não há percentual (aparece "—").
- **Em dia (caminho 1)** só quando há itens avaliáveis e **nenhum** está vencido, a vencer ou sem data.
- **Sem data conta contra:** pela regra atual (`semDataImpede100 = true`), um item sem data **impede** o 100% e puxa o percentual para baixo. Mudar esse valor em `saudeGerador.ts` muda o comportamento em todo o sistema (com `false`, itens sem data saem da conta, mas continuam listados).
- Situação desconhecida ou vazia é tratada como "sem data", nunca como "em dia".
- **Oxicatalisador** não entra na conta.

Os nomes na folha são: Em dia, A vencer (vence em até 30 dias), Vencido, Sem data registrada e Não se aplica.

## Erros e situações comuns

| Situação | O que a tela mostra |
|---|---|
| Número de gerador inválido na URL | "Relatório indisponível: Gerador inválido." |
| Gerador não existe | "Gerador não encontrado." |
| Gerador arquivado | "Este gerador foi removido e não tem relatório." |
| Cliente do gerador não existe | "Cliente do gerador não encontrado." |
| Vendedor sem vínculo ou de outro cliente | "Você não tem acesso ao relatório deste gerador." |
| Sessão inválida | "Sessão inválida. Entre novamente." |
| Falha de leitura no banco | "Falha ao carregar o relatório" com o motivo e botão para tentar de novo. |

## O contato no fechamento

O WhatsApp exibido é **um só para todos os relatórios**, fixo no código (`WHATSAPP_ATG`), porque a tabela [[tabela:vendedores]] não tem coluna de telefone. Se cada consultor precisar do próprio número, o caminho indicado no código é criar essa coluna e lê-la de lá. O nome e o e-mail mostrados são os do vendedor atribuído ao cliente.

## Tabelas e integrações

| Operação | Onde |
|---|---|
| Lê | [[tabela:geradores_atg]], [[tabela:omie_clientes]], [[tabela:vendedores]], [[tabela:vw_preditivas]], [[tabela:oxicatalisador_atg]] |
| Grava | Nada. O relatório só lê. |
| Integrações | Nenhuma. O PDF é gerado pelo navegador (impressão). |

:::detalhes Detalhes de implementação
- Componente `RelatorioGerador` (`src/pages/RelatorioGerador.tsx`). Carrega o gerador, o cliente, o vendedor, as preditivas (view, ordenadas por `ordem`) e o oxicatalisador; o resultado da saúde vem de `calcularSaude` (`src/utils/saudeGerador.ts`).
- A permissão de rota para `relatorio` é a de `clientes` (`canAccessPage` em `src/utils/pages.ts`); o vendedor é conferido dentro da própria página.
- A folha tem largura de uma página A4 (820 px) e classes de impressão; os botões ficam fora do PDF (`no-print`). O título da página é trocado temporariamente para sugerir o nome do arquivo e restaurado depois de imprimir.
- O logo vem de `src/assets/logo_atg_geradores.png`.
- A mesma regra de vendedor aparece no filtro da lista de clientes, só na tela. O banco não a impõe; ver [[pagina:controle/pontos-a-validar]] (V-013).
:::

:::fonte
`src/pages/RelatorioGerador.tsx` (`carregar`, `handleBaixarPdf`), `src/utils/saudeGerador.ts` (`calcularSaude`, `normalizarStatus`, `REGRA_SAUDE`), `src/utils/pages.ts` (`canAccessPage`).
:::
