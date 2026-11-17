---
titulo: Ficha de levantamento
subtitulo: A ficha técnica do gerador, vinda do iClass, e como vinculá-la ou editá-la
ordem: 5
resumo: Aba da janela do gerador que mostra, vincula e edita a ficha de levantamento técnico.
verificado: 2026-11-11
commit: 9d680f5
fontes:
  - src/components/Clientes/FichaTab.tsx
  - src/components/Clientes/VincularOsWizard.tsx
  - src/types.ts
  - src/utils/atgBackend.ts
---

:::resumo
A ficha de levantamento é o retrato técnico do gerador: dados do motor, do gerador, do alternador, da bateria, dos filtros, das mangueiras, do escapamento e outras informações, preenchidos por um técnico no iClass. Esta aba busca essa ficha no iClass pelo número da ordem de serviço do levantamento e a guarda no gerador.

Se o gerador ainda não tem ficha, a aba pede o número da O.S. Se já tem, mostra os dados, permite corrigi-los e permite trocar pela ficha mais recente.
:::

## Quem usa

Administradores e usuários comuns. O vendedor vê a ficha, mas não pode vincular nem editar.

## O que a pessoa vê, passo a passo

**Gerador sem ficha:**

1. A aba mostra "Este gerador ainda não tem ficha de levantamento" e pede a O.S. (vendedor vê a orientação de pedir a um administrador).
2. Digita o código da O.S. (exemplo: OS-12345) e clica em "Buscar". A tela exige que o gerador tenha o ativo do iClass; senão avisa "Este gerador ainda não tem um ativo_id do iClass vinculado".
3. A plataforma chama o fluxo [[fluxo:buscar-os]]. Se achar, mostra "Checklist #N encontrado" e uma **prévia** com todas as seções.
4. Clica em "Confirmar e Vincular Ficha". A ficha é gravada e passa a ser mostrada.

**Gerador com ficha:**

- Mostra "Vinculada via O.S. ..." e as seções, com campos bloqueados.
- **Editar Ficha** libera os campos de texto. "Salvar Ficha" grava tudo.
- **Vincular Ficha Mais Atual** abre a mesma busca por O.S. com o aviso: "Este gerador já tem uma ficha vinculada. Confirmar aqui vai substituir a ficha atual por esta. A ficha anterior fica registrada no Histórico, caso precise reverter."
- As "Informações adicionais" (as perguntas do checklist que não se encaixam em nenhuma seção) aparecem agrupadas e **não são editáveis**.

## Regras de negócio

- **Formato:** a ficha é guardada num único campo JSON de [[tabela:geradores_atg]] (`ficha_levantamento`). Seções simples (motor, gerador, alternador, controlador, bateria, bomba injetora, escapamento) têm campos de texto; seções aninhadas (filtros, mangueiras) têm grupos como quantidade, código e fabricante, ou metros e polegadas.
- **Editar** só altera os valores dos campos que já existem. Não é possível criar campos novos nem remover.
- **Vincular** grava quatro campos do gerador: `ficha_levantamento`, `codigo_os_ficha_levantamento`, `checklist_pesquisa_id` e `ficha_validada_por_humano = true`. Ou seja, **vincular marca a ficha como "validada por humano" na hora**; é esse campo que produz o selo VALIDADO na lista de geradores.
- **Não são preenchidos** pela tela: `ficha_validada_por`, `ficha_validada_em`, `checklist_status` e `checklist_processado_em`.
- Um gerador conta como "com ficha" quando o campo `ficha_levantamento` não está vazio. Isso alimenta o estado "Sem Ficha" do cliente ([[tabela:vw_cliente_card]]).
- **Histórico:** vincular grava `vinculou_ficha`; editar grava `editou_ficha`, ambos com o antes e o depois. Podem ser revertidos pela tela [[modulo:historico-e-reverter]], que reaplica o valor anterior.

:::alerta nc A ordem de serviço não é conferida com o equipamento
O fluxo [[fluxo:buscar-os]] não usa o `ativo_id` enviado. Pela leitura, nada garante que a O.S. informada seja do equipamento do gerador. Ver V-024 em [[pagina:controle/pontos-a-validar]]. A prévia da tela existe justamente para a pessoa conferir antes de confirmar.
:::

## Erros e situações comuns

| Situação | O que acontece |
|---|---|
| Código da O.S. vazio | "Digite o código da O.S." |
| Gerador sem ativo | Aviso orientando a vincular o ativo primeiro. |
| O.S. sem checklist ou não encontrada | "OS não localizada, confira o ID." |
| iClass sobrecarregado | Mensagem âmbar, tentar de novo em instantes. |
| Sem comunicação | "Não foi possível se comunicar com o servidor." |
| Falha ao gravar | "Erro ao vincular ficha." ou "Erro ao salvar ficha." com o motivo. |
| Ficha com todas as seções vazias | "Ficha vinculada, mas sem seções preenchidas." |

## Tabelas e integrações

| Operação | Onde |
|---|---|
| Lê e grava | [[tabela:geradores_atg]] (4 campos ao vincular; `ficha_levantamento` ao editar) |
| Grava | [[tabela:log_edicoes]] (`vinculou_ficha`, `editou_ficha`) |
| Chama | Fluxo [[fluxo:buscar-os]] ([[integracao:iclass]]) |

:::detalhes Detalhes de implementação
- `FichaTab` mostra a ficha e aciona o assistente `VincularOsWizard`. Ambos gravam direto em `geradores_atg` pelo navegador (`UPDATE` pela chave `id`, com a chave pública do Supabase), sem função do banco.
- Tipos em `src/types.ts` (`FichaLevantamento`): seções simples (`Record<string,string>`), aninhadas (`Record<string, Record<string,string>>`) e `outros` (lista de seção, pergunta e resposta).
- Há também uma versão achatada da ficha, em colunas, na tabela legada `geradores` ([[modulo:geradores-legado]]), sem relação com este campo JSON.
:::

:::fonte
`src/components/Clientes/FichaTab.tsx`, `src/components/Clientes/VincularOsWizard.tsx` (`handleBuscar`, `handleConfirmar`), `src/types.ts`.
:::
