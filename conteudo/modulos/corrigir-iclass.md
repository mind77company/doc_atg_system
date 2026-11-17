---
titulo: Corrigir cadastro iClass
subtitulo: Ligar o cliente ao cadastro certo do iClass
ordem: 3
resumo: Janela que busca o cliente no iClass e grava o vínculo correto no cadastro do cliente.
verificado: 2026-11-11
commit: 9d680f5
fontes:
  - src/components/Clientes/CorrigirIclassWizard.tsx
  - src/pages/Clientes.tsx
  - src/utils/atgBackend.ts
  - src/utils/logEdicoes.ts
---

:::resumo
Cada cliente da plataforma deve estar ligado ao mesmo cliente no iClass. Às vezes essa ligação está errada, ou ainda não existe (por exemplo, quando o cadastro no iClass ficou pendente). Esta janela permite achar o cliente certo no iClass e gravar a ligação correta.

A pessoa busca pelo código do contrato, pelo nome ou pelo CNPJ, confere os dados e confirma. **Os dados do Omie nunca são alterados aqui**, e **nada é alterado no iClass**: só o cadastro da plataforma passa a apontar para o cliente escolhido.
:::

## Quem usa

Administradores e usuários comuns. O link "Corrigir cadastro iClass" não aparece para o perfil vendedor. Ele fica dentro do cartão do cliente expandido, na tela [[modulo:clientes-lista]].

## O que a pessoa vê, passo a passo

1. Abre o cartão do cliente e clica em "Corrigir cadastro iClass".
2. Escolhe o critério de busca: **Código de contrato** (padrão), **Nome** ou **CNPJ**. Trocar de critério limpa o campo.
3. Digita o valor e clica em "Buscar". Valor vazio é recusado na própria janela.
4. Resultado:
   - **Um cliente encontrado:** a janela mostra nome, código do contrato, identificador e CNPJ (se houver) e pede para conferir.
   - **Vários encontrados:** mostra a lista "O iClass encontrou múltiplos clientes. Selecione o correto"; ao escolher, segue como no caso anterior.
   - **Nenhum:** mensagem "Cliente não localizado no iClass. Tente outro método de busca ou confira se o preenchimento está exatamente igual ao iClass."
   - **iClass sobrecarregado ou sem comunicação:** mensagens específicas (ver abaixo).
5. Clica em "Confirmar e Salvar". O cadastro é atualizado e a lista de clientes é recarregada.
6. Pode clicar em "Voltar" para escolher outro cliente sem salvar.

## Regras de negócio

- A busca chama o fluxo [[fluxo:buscar-cliente-iclass]], que só consulta.
- Ao confirmar, a tela grava em [[tabela:omie_clientes]], para o cliente em questão: `iclass_id_encontrado`, `iclass_nome`, `iclass_codigo_encontrado` e `status_conferencia = OK`.
- O status de conferência não se atualiza sozinho: por isso a tela o grava como `OK`. Sem isso, o cartão ficaria mostrando `DIVERGENCIA` para sempre, mesmo depois da correção. (Correção feita no commit 77aa1fa.)
- A ação fica no histórico como `corrigiu_iclass`, com os quatro valores de antes e de depois, e pode ser revertida pela tela [[modulo:historico-e-reverter]].
- O estado do cliente na lista muda sozinho: ao ter um número do iClass, o cliente deixa de ser `SEM_ICLASS` (regra da view [[tabela:vw_cliente_card]]).

:::alerta nc O selo "Pendente iClass" pode continuar depois da correção
O código grava os quatro campos acima, mas **não zera** `iclass_pendente`. Pela leitura do código, nenhum outro ponto de `src/` volta esse campo para falso. Se isso for verdade, um cliente criado com pendência no iClass e depois corrigido continua com o selo "Pendente iClass" na lista. Não foi testado; registrado em [[pagina:controle/pontos-a-validar]] (V-019).
:::

## Erros e situações comuns

| Situação | O que a tela mostra | O que fazer |
|---|---|---|
| Valor de busca vazio | Aviso "Preencha o valor da busca." | Preencher e buscar. |
| Nenhum cliente encontrado | Mensagem âmbar de não localizado | Tentar outro critério. O nome precisa estar como no iClass; código e CNPJ tendem a ser mais seguros. |
| Limite do iClass esgotado | Mensagem âmbar "sistema do iClass está sobrecarregado" | Aguardar um pouco e buscar de novo. |
| Sem comunicação com o servidor | Mensagem vermelha "Não foi possível se comunicar com o servidor" | Tentar de novo; se persistir, avisar o time técnico (n8n pode estar fora). |
| Falha ao salvar | Aviso "Erro ao salvar cadastro iClass." com o motivo | Tentar de novo. Nada foi alterado no iClass (a busca só consulta). |
| Cliente escolhido é o errado | Nenhuma validação impede | Reverter pelo Histórico, ou corrigir de novo. A tela não confere se o nome ou o CNPJ do iClass batem com o do cliente. |

## Tabelas e integrações

| O que | Onde |
|---|---|
| Lê (pela lista, já carregada) | [[tabela:vw_cliente_card]] |
| Grava | [[tabela:omie_clientes]] (4 campos), [[tabela:log_edicoes]] (ação `corrigiu_iclass`) |
| Chama | Fluxo [[fluxo:buscar-cliente-iclass]], que consulta o [[integracao:iclass]] |

:::detalhes Detalhes de implementação
- Componente `CorrigirIclassWizard` (`src/components/Clientes/CorrigirIclassWizard.tsx`), aberto por `Clientes.tsx` com o cartão do cliente como propriedade.
- A busca é a função `buscarClienteIclass(criterio, valor, cliente.id)`; o corpo enviado tem `criterio` e `_busca` (campos `iclassCodigoDireto`, `razaoSocial`, `cnpj`; só o do critério escolhido vem preenchido).
- A gravação é um `UPDATE` direto em `omie_clientes` pela chave `id`, feito pelo navegador com a chave pública do Supabase; não passa por função do banco nem confere permissão no servidor.
- O histórico é gravado depois do `UPDATE`; se a gravação do histórico falhar, a correção continua valendo.
:::

:::fonte
`src/components/Clientes/CorrigirIclassWizard.tsx` (`handleBuscar`, `handleConfirmar`), `src/pages/Clientes.tsx` (botão e perfil), `src/utils/atgBackend.ts`.
:::
