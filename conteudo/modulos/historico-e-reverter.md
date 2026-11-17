---
titulo: Histórico e reverter
subtitulo: O diário das alterações feitas na plataforma e como desfazer algumas delas
resumo: Tela que lista quem alterou o quê e quando, e permite ao administrador reverter alterações elegíveis.
ordem: 8
verificado: 2026-11-12
commit: 8db54a9
fontes:
  - src/pages/Historico.tsx
  - src/utils/logEdicoes.ts
  - src/types.ts
---

:::resumo
Toda alteração importante feita nas telas de clientes, geradores, fichas, preditivas, vendedores e oxicatalisador deixa um registro: **quem** fez, **quando**, **o que** mudou e **como era antes**. A tela "Histórico de Alterações" mostra essa lista.

O administrador pode **reverter** algumas alterações: a plataforma devolve o campo ao valor de antes. Não dá para reverter exclusões definitivas, criações nem edições de itens de preditiva.
:::

## Quem usa

Quem tem a página "Histórico" liberada pode **ver** a lista. Só o **administrador** vê a coluna Ações com o botão Reverter.

## O que a pessoa vê, passo a passo

1. A tela carrega os **300 registros mais recentes**, do mais novo para o mais antigo. {{nc}} Registros mais antigos que esses 300 não aparecem na tela.
2. A tabela mostra: **Data** e hora, **Usuário** (e-mail de quem fez), **Ação** (etiqueta), **Entidade** (tipo e número do registro, como `cliente #12`), **Antes** e **Depois**, e **Ações** (administrador).
3. Os campos de "Antes" e "Depois" aparecem como `campo: valor`. Campos longos (como a ficha de levantamento inteira) ficam recolhidos como "ficha_levantamento (9 campos) ▼" e abrem ao clicar, mostrando o JSON.
4. Quando a alteração foi feita por uma função do banco (salvar preditiva, criar gerador), não há "antes e depois": a tela mostra no lugar o que foi enviado, com a nota "(dados enviados)".
5. **Filtros:** busca por texto (usuário, ação ou número do registro) e filtro por entidade. A busca **não** procura pelo nome da entidade nem pelo conteúdo dos campos.
6. **Reverter** (administrador): clica em "Reverter", a tela pergunta "Restaurar o estado anterior?" e, ao confirmar, aplica a reversão e recarrega a lista. "Alteração revertida com sucesso."

## O que pode ser revertido

Reverter só aparece quando **todas** estas condições valem: a entidade tem tabela conhecida, o registro tem o valor de antes guardado, a ação não é `reverteu` e não é `excluiu_definitivamente`.

| Entidade | Tabela afetada | Observação |
|---|---|---|
| `cliente` | [[tabela:omie_clientes]] | Atribuir vendedor, inativar e reativar, corrigir iClass e outras edições. |
| `gerador` e `ficha` | [[tabela:geradores_atg]] | Editar e vincular ficha. |
| `oxicatalisador` | [[tabela:oxicatalisador_atg]] | Editar oxicatalisador. |
| `vendedor` | [[tabela:vendedores]] | Editar e ativar ou desativar. |
| `gerador_legado` | tabela legada `geradores` | Página legada ([[modulo:geradores-legado]]). |
| `preditiva` | **nenhuma** | Não consta no mapa de reversão; o botão não aparece. Resolve a dúvida V-014. |

| Ação | Reversível? |
|---|---|
| `atribuiu_vendedor`, `inativou`, `reativou`, `corrigiu_iclass`, `editou_ficha`, `vinculou_ficha`, `editou_oxicatalisador`, `editou_vendedor`, `desativou_vendedor`, `ativou_vendedor` | Sim, pois guardam o valor de antes. |
| `criou_cliente`, `criou_gerador`, `criou_vendedor`, `cadastrou_preditiva_padrao` | Não: não têm valor de antes. |
| `editou` (preditiva) | Não: entidade fora do mapa. |
| `vinculou_login`, `desvinculou_login` | Não, de propósito: reverter só a tabela deixaria o login e o vendedor dessincronizados. |
| `excluiu_definitivamente` | Não: a linha já não existe. O registro guarda uma cópia do que foi apagado, só para consulta. |
| `reverteu` | Não: uma reversão não se reverte. |

## Como a reversão funciona

1. A plataforma pega o **valor de antes** do registro de histórico: só os campos que mudaram naquela ação, não a linha inteira.
2. Aplica esse conteúdo como atualização parcial na tabela da entidade, pelo número do registro.
3. Grava um novo registro de histórico com a ação `reverteu`, com antes e depois trocados.

:::alerta aviso Reverter não confere o que veio depois
A reversão reaplica o valor de antes daquele registro **sem verificar** se o cliente, gerador ou ficha foi alterado de novo desde então. Reverter um registro antigo desfaz também mudanças mais novas nos mesmos campos. Ver A-023 em [[pagina:controle/achados]].
:::

## Erros e situações comuns

| Situação | O que a tela mostra |
|---|---|
| Falha ao carregar | "Falha ao carregar histórico" com o motivo e botão para tentar de novo. |
| Nenhum registro para os filtros | "Nenhum registro encontrado". |
| Falha ao reverter | "Erro ao reverter alteração." com o motivo (por exemplo, "Este registro não tem um valor anterior salvo"). |
| Registro apagado depois | A reversão atualiza zero linhas. {{nc}} Não foi verificado se a tela avisa. |

## O que gera registro no histórico

Resumo do que as telas gravam (detalhes em cada módulo):

- **Clientes:** criar, corrigir iClass, atribuir vendedor, inativar e reativar, excluir ([[modulo:clientes-lista]]).
- **Geradores:** criar, excluir, vincular e editar ficha ([[modulo:gerador]], [[modulo:ficha-de-levantamento]]).
- **Preditiva e oxicatalisador:** editar itens, cadastrar itens padrão, editar oxicatalisador ([[modulo:preditiva-e-oxicatalisador]]).
- **Vendedores:** criar, editar, ativar, desativar, vincular e desvincular login ([[modulo:usuarios-e-vendedores]]).

**Não geram registro:** edição de ordens de serviço e de orçamentos, produtos e serviços, convites, senhas e ativação de usuários. Ver V-029.

## Tabelas e integrações

| Operação | Onde |
|---|---|
| Lê | [[tabela:log_edicoes]] (últimos 300) |
| Grava | A tabela da entidade revertida e [[tabela:log_edicoes]] (registro `reverteu`) |
| Integrações | Nenhuma |

:::detalhes Detalhes de implementação
- Componente `Historico` (`src/pages/Historico.tsx`); a regra de reversão fica em `reverterLog` (`src/utils/logEdicoes.ts`), com o mapa `TABELA_POR_ENTIDADE`.
- A leitura é `select * from log_edicoes order by criado_em desc limit 300`.
- O registro é gravado **depois** da ação principal por `registrarLog`; se a gravação do registro falhar, a ação continua valendo e só há um aviso no console.
- As políticas de RLS de `log_edicoes` existem, mas o RLS está desligado na tabela (A-006); por isso qualquer pessoa com acesso à API conseguiria ler e escrever registros. Ver [[pagina:banco/regras]].
:::

:::fonte
`src/pages/Historico.tsx` (`podeReverter`, `handleReverter`), `src/utils/logEdicoes.ts` (`registrarLog`, `reverterLog`, `TABELA_POR_ENTIDADE`).
:::
