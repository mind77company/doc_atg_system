---
titulo: Clientes e Geradores (lista)
subtitulo: A tela principal de cadastro: clientes, geradores e o que falta fazer em cada um
ordem: 1
resumo: Lista de clientes com estado, filtros, vendedor, e as ações de cadastro, correção, validação, inativação e exclusão.
verificado: 2026-11-11
commit: 9d680f5
fontes:
  - src/pages/Clientes.tsx
  - src/utils/pages.ts
  - src/types.ts
  - src/utils/logEdicoes.ts
---

:::resumo
É a tela "Clientes & Geradores". Mostra todos os clientes da ATG, um cartão por cliente, com um selo que diz **o que falta fazer** (sem iClass, sem gerador, sem ficha, completo ou validado). Dentro de cada cartão dá para ver os dados do Omie e do iClass, os geradores do cliente e fazer as ações do dia a dia: corrigir o vínculo com o iClass, atribuir vendedor, marcar como conferido, adicionar gerador, inativar ou excluir.

O que cada pessoa pode fazer depende do perfil: o vendedor só consulta os clientes dele; o usuário comum cadastra e corrige; o administrador faz tudo, inclusive inativar e excluir.
:::

Endereço da tela: `#/clientes`. A página "Clientes & Geradores" é uma das 9 que podem ser liberadas por usuário (`src/utils/pages.ts`). O perfil vendedor tem esta como única página padrão.

## Quem pode o quê

| Ação | Administrador | Usuário comum | Vendedor |
|---|---|---|---|
| Ver a lista | todos os clientes | todos os clientes | só os atribuídos ao vendedor ligado ao login |
| Filtrar por estado e buscar | sim | sim | sim |
| Filtrar por vendedor | sim | não | não |
| Novo Cliente ([[modulo:criar-cliente]]) | sim | sim | não |
| Corrigir cadastro iClass ([[modulo:corrigir-iclass]]) | sim | sim | não |
| Atribuir vendedor ao cliente | sim | não | não |
| Marcar como conferido (validar) | sim | sim | não |
| Adicionar Gerador / por O.S. ([[modulo:gerador]]) | sim, se o cliente tem iClass | sim, se o cliente tem iClass | não |
| Ver geradores e abrir um gerador | sim | sim | sim (somente leitura) |
| Inativar e reativar cliente | sim | não | não |
| Excluir cliente | sim | não | não |

:::fonte
`src/pages/Clientes.tsx`: a variável `somenteLeitura` (vendedor) e as condições `activeRole === PerfilUsuario.ADMIN` nos botões.
:::

:::alerta aviso A regra do vendedor vale só na tela
O filtro "vendedor só vê os próprios clientes" é feito no navegador, depois de carregar todos os clientes. O banco não impõe essa regra (RLS desligado em [[tabela:omie_clientes]]). Ver [[pagina:controle/pontos-a-validar]] (V-013) e [[pagina:controle/achados]] (A-003).
:::

## O que a pessoa vê, passo a passo

1. Ao abrir, a tela carrega todos os clientes ordenados por razão social e mostra "esqueletos" cinzas enquanto carrega.
2. Cada cartão fechado mostra: razão social; selo de estado; selos extras ("Inativo", "Pendente iClass", nome do vendedor ou "Sem vendedor", este último só para administrador); CNPJ; e a contagem "N geradores · X com ficha · Y validados".
3. Acima da lista há uma barra de busca (razão social, nome fantasia ou CNPJ, com ou sem pontuação) e filtros de Estado e, para administrador, de Vendedor ("Sem vendedor" ou um vendedor). A busca e os filtros são feitos no navegador, sem nova consulta.
4. Clicar no cartão o expande. Dentro dele:
   - dois quadros lado a lado, **Omie** (razão social, nome fantasia, CNPJ, código Omie) e **iClass** (nome no iClass, ID encontrado, código do contrato, status de conferência);
   - o link "Corrigir cadastro iClass";
   - (administrador) o seletor de Vendedor;
   - os botões de ação;
   - "Ver Geradores", que abre a lista de geradores do cliente, com o que falta em cada um.
5. Clicar em um gerador abre a janela do gerador ([[modulo:gerador]]).

## Estados do cliente

O selo vem do campo `estado` da view [[tabela:vw_cliente_card]], decidido nesta ordem:

| Selo na tela | Valor | Quando |
|---|---|---|
| Sem iClass (vermelho) | `SEM_ICLASS` | O cliente não tem número do iClass. |
| Sem Gerador (cinza) | `SEM_GERADOR` | Tem iClass, mas nenhum gerador não arquivado. |
| Sem Ficha (âmbar) | `SEM_FICHA` | Algum gerador sem ficha de levantamento. |
| Completo (verde) | `COMPLETO` | Todos os geradores com ficha, mas ainda não validado por completo. |
| Validado (verde escuro) | `VALIDADO` | Cliente validado e todos os geradores validados. |

Na lista de geradores, cada gerador pode ter os selos **VALIDADO** (quando `ficha_validada_por_humano` é verdadeiro), **SEM FICHA** (ficha vazia) e **SEM ATIVO** (sem número do ativo do iClass). Atenção: o selo VALIDADO do gerador usa o campo da ficha, e não `validado`, que é o que a view conta como "validado".

## Ações e regras

- **Atribuir vendedor** (administrador): troca `vendedor_id` do cliente; opções são os vendedores ativos mais o atual (mesmo que desativado depois). Registra `atribuiu_vendedor` com antes e depois (pode ser revertido pelo Histórico).
- **Conferido / Validado (clique para reabrir):** marca ou desmarca o cliente como validado pela função [[funcao:validar_cadastro]]. {{nc}} Há uma dúvida aberta sobre se ela grava de fato (V-012 em [[pagina:controle/pontos-a-validar]]): a tela só confia na resposta `ok`, e a resposta simulada (que o front usa quando a função não existe) também devolve `ok`.
- **Adicionar Gerador** e **Adicionar Gerador por O.S.:** só aparecem para o cliente com iClass (estado diferente de `SEM_ICLASS`). Ver [[modulo:gerador]].
- **Inativar / Reativar Cliente** (administrador): alterna `inativo` em [[tabela:omie_clientes]]. O cartão **continua na lista**, mais claro e com o selo "Inativo". Não toca no Omie nem no iClass, e reativar reaproveita o mesmo cadastro. Registra `inativou` ou `reativou`. Foi criado a pedido da ATG para que um cliente que volte não precise ser recriado nos outros sistemas.
- **Excluir Cliente** (administrador):
  - A tela **bloqueia** se o cliente ainda tem geradores (usa a contagem `n_geradores` da view) e pede para excluí-los antes.
  - Se não houver, pede confirmação: "O cliente será apagado definitivamente do banco de dados, sem possibilidade de recuperação."
  - A exclusão é real (`DELETE`), registra `excluiu_definitivamente` com uma cópia do cliente e **não pode ser revertida** pelo Histórico.
  - Não apaga nada no Omie nem no iClass.

:::alerta nc Gerador arquivado não entra na conta do bloqueio
A contagem `n_geradores` ignora geradores arquivados, mas a regra do banco apaga **todos** os geradores do cliente junto com ele (exclusão em cascata). Se um cliente tiver só geradores arquivados, a tela deixa excluir e os geradores arquivados serão apagados junto. Deduzido da leitura do código e da view, não testado. Registrado em [[pagina:controle/achados]] (A-017).
:::

## Erros e situações comuns

| Situação | O que acontece |
|---|---|
| Banco não configurado (variáveis de ambiente ausentes) | Tela de erro: "Supabase não configurado. Defina VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY no .env." |
| Falha ao carregar | Tela "Falha ao carregar clientes" com o motivo e botão "Tentar Novamente". |
| Falha só na segunda consulta (dados de inativo, iClass e vendedor) | A lista aparece sem esses campos (aviso só no console). Para o vendedor, vira erro: a lista nunca "cai" para mostrar tudo. |
| Vendedor sem vínculo | "Seu login ainda não está vinculado a um vendedor". Peça a um administrador para vincular em Controle de Usuários. |
| Vendedor sem clientes atribuídos | "Nenhum cliente atribuído a você". |
| Nenhum resultado para os filtros | "Nenhum cliente encontrado", com botão "Limpar filtros". |
| Dados parecem desatualizados | A lista é carregada ao abrir a tela e recarregada após ações que alteram contagens. Não há atualização automática: reabrir a tela ou recarregar a página traz os dados novos. |

## Tabelas e integrações

| Operação | Tabela ou serviço |
|---|---|
| Lê | [[tabela:vw_cliente_card]] (lista), [[tabela:omie_clientes]] (campos que a view não traz), [[tabela:vendedores]], [[tabela:geradores_atg]] (geradores do cliente) |
| Grava | [[tabela:omie_clientes]] (vendedor, inativo, exclusão), [[tabela:log_edicoes]] (todas as ações) |
| Funções | [[funcao:validar_cadastro]] |
| Abre | [[modulo:criar-cliente]], [[modulo:corrigir-iclass]], [[modulo:gerador]] |

Referência cruzada completa gerada a partir do código:

:::gerado usos omie_clientes
:::

:::detalhes Detalhes de implementação
- Componente `Clientes` (`src/pages/Clientes.tsx`), recebe o perfil ativo (`activeRole`). Usa `FilterBar`, `EmptyState` e modais.
- Duas consultas ao carregar: a view `vw_cliente_card` e `omie_clientes` (`id, inativo, iclass_nome, iclass_pendente, vendedor_id`), mescladas no navegador, porque a view não traz esses campos. Depois consulta `vendedores`. Não há paginação: todos os clientes vêm de uma vez (541 em 2026-11-11).
- Para o perfil vendedor, descobre o vendedor pelo login (`vendedores.auth_user_id`) e filtra a lista; qualquer falha vira erro (falha fechada).
- O e-mail de quem está logado (`supabase.auth.getUser()`) é usado como `usuario` do histórico e dos campos `validado_por`.
:::

:::fonte
`src/pages/Clientes.tsx` (`fetchClientes`, `filteredList`, `handleAtribuirVendedor`, `handleValidarCliente`, `handleToggleInativoCliente`, `handleExcluirCliente`), `src/utils/pages.ts`.
:::
