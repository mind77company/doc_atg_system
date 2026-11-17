---
titulo: Migrations e histórico de mudanças do banco
subtitulo: O que se sabe sobre como a estrutura do banco foi mudando
resumo: O repositório não tem migrations. Esta página reúne os rastros que existem (commits, tabelas de cópia, backups) e o que falta registrar.
ordem: 5
verificado: 2026-11-12
commit: 8db54a9
fontes:
  - docs/_fontes_privadas/schema/schema_banco_atg_completo.csv
  - docs/scripts/extracao_banco.sql
  - docs/backups
---

:::resumo
Normalmente, cada mudança na estrutura do banco (criar uma tabela, acrescentar um campo) fica guardada em um arquivo chamado **migration**, que permite repetir e conferir a história. **Este projeto não tem nenhum.** As mudanças foram feitas direto no painel do Supabase, e o que sobrou no repositório são só rastros indiretos.

Esta página junta esses rastros para que a equipe consiga reconstruir a ordem das coisas, e aponta o que seria bom passar a registrar.
:::

:::alerta nc O histórico real do banco não está no repositório
Tudo abaixo é **dedução** a partir de commits do código, nomes de tabelas e arquivos de apoio. Não substitui as migrations. As datas são as dos commits, não as de quando a mudança foi feita no banco. Ver V-037 em [[pagina:controle/pontos-a-validar]].
:::

## Rastros que existem

### 1. Tabelas de cópia e de legado

| Objeto | O que indica |
|---|---|
| `omie_clientes_bkp_20261008` (541 linhas) | Cópia de segurança de `omie_clientes` com data no nome: 08/10/2026. Continua no esquema público, com os mesmos privilégios da original (A-005). |
| `INATIVO_geradores_atg_bkp_20260710` (464 linhas) | Cópia antiga de `geradores_atg`, de 10/07/2026 (pelo formato do nome). |
| `INATIVO_generators` (757) e `INATIVO_generators_backup_10_02_2026` (741) | Base antiga de geradores e sua cópia, com data no nome (10/02/2026, se for dia, mês e ano). {{nc}} |
| `INATIVO_ATG BD`, `INATIVO_Novo BD ATG`, `INATIVO_manutencoes-preditivas` | Tabelas antigas, marcadas como inativas. |
| Views `generators_com_itens_vencidos` e `proximos_vencimentos` | Dependentes da base antiga ([[tabela:generators_com_itens_vencidos]], [[tabela:proximos_vencimentos]]). |

A equipe indicou que as tabelas `INATIVO_*` ficam fora desta documentação. O sinal que elas dão é o de uma **troca de estrutura**: a base antiga de geradores foi substituída por `geradores_atg` (com `omie_clientes` ao lado) e a antiga ficou marcada como inativa.

### 2. Commits que indicam mudanças no banco

Cada linha abaixo é um commit do código cuja mensagem mostra que o front passou a depender de uma estrutura do banco. O SQL correspondente não está no repositório.

| Data | Commit | O que o commit sugere sobre o banco |
|---|---|---|
| 2026-07-14 | `89f4f90` | Início do projeto. |
| 2026-07-16 | `53ec904` | Permissões por página; campo de inativo em clientes. |
| 2026-07-21 | `7e58b51` | Tabela de histórico `log_edicoes`; campo de arquivamento de gerador. |
| 2026-07-21 | `6836ca8` | Fluxo de criação de cliente (Omie e iClass); campo de pendência do iClass em `omie_clientes`. {{nc}} |
| 2026-07-30 | `009322c`, `98ba2fd` | A função `criar_gerador` devolve a linha inteira; gerador por O.S. |
| 2026-08-03 | `298937b` | Função `salvar_preditiva` devolve a linha; cadastro manual de itens de preditiva. |
| 2026-08-12 | `3b862db` | Campo "não se aplica" nos itens de preditiva. |
| 2026-10-08 | `05a0910`, `605fe5a`, `48a51a9` | Tabela `vendedores`, vínculo com o login e atribuição de vendedor a clientes. |
| 2026-10-08 | `a2617cb`, `8c5ea01` | Perfil e páginas gravados em `app_metadata` do Auth. |
| 2026-11-03 | `339402a` | O histórico passa a mostrar a coluna `detalhe`, gravada pelas funções do banco. |
| 2026-11-05 | `77aa1fa` | Correção do status de conferência de clientes. |
| 2026-11-06 | `9d680f5` | Inativar e reativar cliente (usa o campo `inativo`). |

Para o histórico completo do código, veja o Git do repositório. As funções do banco e o perfil de preditivas (importação da planilha) **não aparecem em nenhum commit**: foram criados direto no banco.

### 3. Cópias das versões da função `manage-users`

A pasta `docs/backups/` guarda quatro versões da função de servidor, geradas durante a criação do perfil Vendedor (2026-10-08): antes da etapa 2A, a etapa 2A publicada e as fases 1 e 2 da etapa 2B. Servem de ponto de retorno para a função, não para o banco.

## Como o banco era descrito até agora

Havia só a exportação das colunas (`schema_banco_atg_completo.csv`, 656 colunas em 34 objetos), sem chaves estrangeiras, índices, gatilhos, políticas de acesso nem o corpo de views e funções. Esta documentação completou o quadro com consultas de leitura ao catálogo do banco, feitas em 2026-11-11 (`docs/scripts/extracao_banco.sql`).

## O que seria bom registrar daqui para frente

1. **Guardar o SQL** de cada mudança de estrutura em uma pasta de migrations no repositório (o Supabase tem uma ferramenta de linha de comando para isso).
2. **Trazer para o repositório** o código das funções do banco (`processar_preditivas`, `match_cliente` e as demais; ver [[pagina:banco/funcoes]]) e das views.
3. **Mover ou apagar** as tabelas de cópia do esquema público depois de conferidas, ou restringir o acesso a elas.
4. **Registrar a mudança** na página de histórico desta documentação ([[pagina:controle/changelog]]), como pede o `CLAUDE.md`.

:::fonte
`docs/_fontes_privadas/schema/schema_banco_atg_completo.csv`, consultas Q01 a Q13 (`docs/scripts/extracao_banco.sql`), histórico do Git do repositório (mensagens e datas dos commits citados), `docs/backups/`.
:::
