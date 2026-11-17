---
titulo: Geradores (página legada)
subtitulo: A tela antiga de fichas técnicas de geradores, com a ficha em colunas
resumo: Página que lista e edita as fichas da tabela geradores, com busca do código do cliente no Omie. Convive com o cadastro atual de clientes e geradores.
ordem: 10
verificado: 2026-11-12
commit: 8db54a9
fontes:
  - src/pages/Geradores.tsx
  - src/components/Geradores/OmieSearchModal.tsx
  - src/types.ts
---

:::resumo
É a primeira versão do cadastro de geradores. Cada linha é uma **ficha técnica** de um equipamento (motor, alternador, bateria, filtros, radiador e mais), identificada pela ordem de serviço do levantamento, com o **código do cliente no Omie** que pode ser buscado e vinculado.

Hoje convive com o cadastro atual ([[modulo:clientes-lista]] e [[modulo:gerador]]), que guarda a ficha de outro jeito e em outra tabela. As duas **não se conversam**: alterar uma não altera a outra.
:::

## Quem usa

Quem tem a página "Geradores" liberada (a lista de 9 páginas marcáveis inclui "Geradores" além de "Clientes & Geradores"). Não tem restrição por perfil dentro da página.

## O que a pessoa vê, passo a passo

1. A lista mostra: **Equipamento**, **Cliente**, **CNPJ**, **Código Omie**, **Status** (Completo ou Pendente Admin) e ações, 20 por página, ordenada pela alteração mais recente.
2. **Busca** por cliente, CNPJ, equipamento ou identificador da ficha, e **filtro de Status**.
3. Clicar em uma linha abre a ficha, em seções: Identificação (iClass), Cliente, Equipamento, Gerador, Motor, Alternador, Controlador, Bomba Injetora, Bateria, Filtros (primário e secundário de combustível, lubrificante, água, separador e ar), Radiador e Status de Preenchimento (com as **pendências** em texto).
4. **Editar** libera os campos. As identificações do iClass (número da ficha, ativo, códigos) **não podem ser alteradas**.
5. **Vincular código Omie:** abre "Buscar Código do Cliente no Omie", onde se busca por **nome ou CNPJ** (até 30 resultados) e se escolhe o cliente; o código dele é colocado na ficha. Salvar grava.
6. "Gerador da ficha ... atualizado com sucesso!"

## Regras de negócio

- O status de preenchimento tem dois valores: `COMPLETO` e `PENDENTE_ADM` (pendente do administrador). Só é mudado à mão.
- A edição **não gera registro** no Histórico e **não** é reversível por ele (apesar de o mapa de reversão ter a entidade `gerador_legado`, nenhuma tela grava registros com ela). {{nc}}
- Esta página **não lê nem grava** [[tabela:geradores_atg]] e não participa do relatório de saúde nem da preditiva.

:::alerta aviso A busca de código Omie pode não funcionar
A busca usa a tabela [[tabela:omie]], que tem RLS ligado e **nenhuma política**. Pela configuração, usuários logados não enxergam nenhuma linha, e a busca devolveria sempre "nenhum resultado". Não testado. Ver V-033.
:::

## Erros e situações comuns

| Situação | O que acontece |
|---|---|
| Falha ao carregar | Tela de erro com o motivo e botão para tentar de novo. |
| Falha ao salvar | "Erro ao salvar alterações." com o motivo. |
| Busca de Omie sem texto | "Digite um nome ou CNPJ para buscar." |
| Busca sem resultado | Mensagem de nenhum resultado. |

## Tabelas e integrações

| Operação | Onde |
|---|---|
| Lê | [[tabela:geradores]] (todas as linhas), [[tabela:omie]] (busca de código) |
| Grava | [[tabela:geradores]] (campos editáveis) |
| Integrações | Nenhuma. As fichas vieram do iClass por um processo antigo que não está no repositório. {{nc}} |

:::detalhes Detalhes de implementação
- Componente `Geradores`; lê `geradores` inteira (`select *` ordenada por `updated_at`) e filtra e pagina no navegador.
- A edição envia um `UPDATE` com todos os campos exceto `id`, `os_ficha_id`, `ativo_id_iclass`, `equipamento_codigo_iclass`, `cliente_codigo_iclass`, `created_at` e `updated_at`.
- O tipo `GeradorFicha` descreve cerca de 65 das 118 colunas da tabela, e chama de `cliente_codigo_iclass` uma coluna que no banco é `cliente_codigo_id_iclass`. Por isso, na edição, essa coluna não é excluída do envio. {{nc}} Sem efeito prático conhecido.
- `OmieSearchModal` consulta `omie` com `ilike` em nome e CNPJ (removendo vírgulas e parênteses do texto) e limita a 30 resultados.
:::

:::fonte
`src/pages/Geradores.tsx`, `src/components/Geradores/OmieSearchModal.tsx`, `src/types.ts` (`GeradorFicha`).
:::
