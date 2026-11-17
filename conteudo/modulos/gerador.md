---
titulo: Gerador (adicionar, por O.S. e detalhe)
subtitulo: Cadastrar um gerador de um cliente e consultar os dados dele
ordem: 4
resumo: Janelas de adicionar gerador por série ou patrimônio, por O.S., e a janela de detalhe do gerador.
verificado: 2026-11-11
commit: 9d680f5
fontes:
  - src/components/Clientes/AdicionarGeradorWizard.tsx
  - src/components/Clientes/AdicionarGeradorPorOsWizard.tsx
  - src/components/Clientes/GeradorModal.tsx
  - src/pages/Clientes.tsx
  - src/utils/atgBackend.ts
---

:::resumo
Um gerador é um equipamento de um cliente da ATG. Para cadastrá-lo, a pessoa informa o **número de série** (ou o número de uma **ordem de serviço** em que ele foi atendido), a plataforma procura o equipamento no iClass, a pessoa confere os dados e confirma. O gerador passa a existir na lista do cliente.

Depois de criado, a janela do gerador mostra os dados do equipamento e duas abas: a **Preditiva** (acompanhamento das manutenções) e a **Ficha de Levantamento**. Dali também dá para marcar o gerador como conferido, gerar o Relatório de Saúde ou excluí-lo.
:::

## Quem usa

- **Adicionar gerador:** administradores e usuários comuns, no cartão de um cliente que **já tem iClass**. O botão não aparece para o perfil vendedor nem para cliente no estado "Sem iClass" ([[modulo:clientes-lista]]).
- **Janela do gerador:** todos os perfis podem abrir. O vendedor vê tudo em **somente leitura**: sem Conferido, sem Excluir, sem editar ficha ou preditiva.

## Adicionar Gerador (por série ou patrimônio)

1. Digita o **número de série** e clica em "Buscar". Vazio é recusado ("Digite o número de série.").
2. A plataforma chama o fluxo [[fluxo:buscar-ativo]].
   - **Achou:** mostra "Ativo localizado: descrição (ID iClass: N)" e um formulário com Fabricante, Modelo e Número de Série, já preenchidos com o que veio do iClass e editáveis.
   - **Não achou pela série:** aparece "Não encontrado por número de série. Tente pelo número de patrimônio." e o campo muda para patrimônio.
   - **Não achou pelo patrimônio:** tela final "Ativo não cadastrado no iClass. Cadastre o ativo no iClass primeiro antes de vinculá-lo aqui." Não há como criar o gerador sem ativo.
   - **iClass sobrecarregado ou sem comunicação:** a mensagem aparece e a pessoa fica na mesma etapa, para tentar de novo (não conta como "não encontrado").
   - **Vários ativos:** a tela tem uma lista "O iClass encontrou múltiplos ativos. Selecione o correto", mas os fluxos atuais não devolvem vários (ver V-021).
3. Clica em "Revisar e Confirmar". A tela mostra o resumo (fabricante, modelo, série, descrição do iClass, ID iClass): "O gerador só é criado depois que você confirmar."
4. Clica em "Confirmar Criação" (ou "Voltar" para editar).
5. A plataforma cria o gerador, mostra "Gerador criado com sucesso! Agora vincule a ficha de levantamento." e **abre a janela do gerador** já na lista do cliente.

## Adicionar Gerador por O.S.

Igual ao anterior, mas o primeiro passo pede o **número da O.S.** (exemplo na tela: OS-12345) e usa o fluxo [[fluxo:gerador-por-os]]. Mensagem de não encontrado: "Nenhum ativo encontrado para esse número de O.S. Confira o código e tente novamente." Não tem a etapa de patrimônio.

## Regras de negócio

- **O ativo é obrigatório:** a função [[funcao:criar_gerador]] recusa gerador sem `ativo_id`.
- **Dados que o gerador herda do cliente:** nome fantasia, razão social, CNPJ e os dados do iClass do cliente são copiados no momento da criação. Se o cadastro do cliente mudar depois, os geradores já criados **não** acompanham.
- **O que a tela envia:** fabricante, modelo, número de série, descrição e situação do ativo. O **número de patrimônio digitado na busca não é gravado** (a tela não o inclui nos dados) e o **tipo de equipamento** também não é enviado.
- **Situação do ativo:** se o iClass não informar, o banco grava `ATIVO`.
- **Sem conferência de duplicidade ou de dono:** nem a tela, nem a função, nem o banco impedem criar dois geradores com o mesmo ativo (A-009), e a tela não confere se o ativo encontrado pertence ao cliente em questão (V-021).
- **Histórico:** a função grava a ação `criou_gerador`.

## Janela do gerador

| Parte | O que mostra ou faz |
|---|---|
| Cabeçalho | Fabricante, Modelo, Nº de Série e "ID iClass (não editável)". |
| Conferido | Marca ou desmarca o gerador como validado, pela função [[funcao:validar_cadastro]]. {{nc}} Ver V-012. |
| Excluir Gerador | Pede confirmação ("apagado definitivamente do banco de dados, sem possibilidade de recuperação"). Faz exclusão real e registra `excluiu_definitivamente` com uma cópia do gerador. **Não pode ser revertida** pelo Histórico. |
| Aba Preditiva (padrão) | [[modulo:preditiva-e-oxicatalisador]]. |
| Aba Ficha de Levantamento | [[modulo:ficha-de-levantamento]]. |
| Gerar Relatório | Fecha a janela e abre a tela do [[modulo:relatorio-de-saude]] (`#/relatorio/<id do gerador>`). |

O que acontece ao excluir um gerador: as linhas de preditiva e de oxicatalisador dele **continuam no banco**, só ficam sem gerador (`gerador_id` vazio). Elas deixam de aparecer na aba, mas ainda contam nas views de preditiva (ver [[tabela:vw_preditivas]]).

## Erros e situações comuns

| Situação | O que acontece |
|---|---|
| Valor de busca vazio | Aviso "Digite o número de série", "patrimônio" ou "da O.S.". |
| Limite do iClass esgotado | "O sistema do iClass está sobrecarregado no momento. Aguarde alguns instantes e tente novamente." |
| n8n fora ou resposta inválida | "Não foi possível se comunicar com o servidor. Tente novamente." Na busca por O.S., também é o que aparece quando o número da O.S. não existe no iClass (ver [[fluxo:gerador-por-os]]). |
| A função de criar não confirma | Aviso "Erro ao criar gerador." com o motivo. Nada é aberto. |
| Excluir falha | Aviso "Erro ao excluir gerador." com o motivo. |

## Tabelas e integrações

| Operação | Onde |
|---|---|
| Lê | [[tabela:geradores_atg]] (lista do cliente, sem os arquivados) |
| Grava | [[tabela:geradores_atg]] (pela função `criar_gerador` e pela exclusão), [[tabela:log_edicoes]] |
| Chama | Fluxos [[fluxo:buscar-ativo]] e [[fluxo:gerador-por-os]]; função [[funcao:criar_gerador]]; função [[funcao:validar_cadastro]] |

:::gerado usos geradores_atg
:::

:::detalhes Detalhes de implementação
- Componentes: `AdicionarGeradorWizard` (etapas `serie`, `patrimonio`, `bloqueado`, `multiplos`, `form`, `revisao`), `AdicionarGeradorPorOsWizard` (etapas `os`, `multiplos`, `form`, `revisao`) e `GeradorModal`.
- A criação é a chamada `criarGerador(cliente.id, ativo_id, dados, usuario)`, que usa a função do banco `criar_gerador`. Sucesso é reconhecido por a resposta ter um `id` numérico.
- Depois de criar, a tela **monta o gerador na memória** com os valores que enviou e abre a janela, sem reler o banco. Valores padrão do banco (como `ATIVO` na situação do ativo, quando vazia) só aparecem depois que a lista é recarregada.
- A exclusão é um `DELETE` direto em `geradores_atg` pelo navegador (chave pública do Supabase), seguido do registro no histórico.
- `usuario` é o e-mail de quem está logado.
:::

:::fonte
`AdicionarGeradorWizard.tsx` (`handleBuscarSerie`, `handleBuscarPatrimonio`, `handleCriar`), `AdicionarGeradorPorOsWizard.tsx`, `GeradorModal.tsx` (`handleValidar`, `handleExcluir`), `src/utils/atgBackend.ts` (`criarGerador`), função `criar_gerador` (extração Q04).
:::
