---
titulo: Quando algo dá errado
subtitulo: Sintoma, causa provável, onde olhar e como resolver
resumo: Guia de problemas comuns da plataforma, organizado por sintoma, com a causa provável e o caminho de solução.
ordem: 4
verificado: 2026-11-12
commit: 8db54a9
fontes:
  - src/utils/atgBackend.ts
  - src/utils/mensagensErro.ts
  - src/pages/Clientes.tsx
  - docs/data/fluxos.gerado.json
---

:::resumo
Esta página reúne os problemas que mais provavelmente aparecem, cada um com o **sintoma** (o que a pessoa vê), a **causa provável**, **onde olhar** e **como resolver**. As causas vêm do que o código e os fluxos fazem, e algumas foram vistas na prática pela equipe. As que dependem de configuração fora do repositório estão marcadas "Não confirmado".

Em dúvida, comece pelo item mais parecido com o que está acontecendo.
:::

## Acesso e usuários

| Sintoma | Causa provável | Onde olhar | Como resolver |
|---|---|---|---|
| "Supabase não configurado" no login | Faltam `VITE_SUPABASE_URL` ou `VITE_SUPABASE_ANON_KEY` na publicação | Painel da hospedagem; [[pagina:operacao/variaveis-ambiente]] | Definir as duas variáveis e publicar de novo. |
| "E-mail ou senha incorretos" | Senha errada, conta desativada ou e-mail não confirmado | Controle de Usuários | Administrador usa **Definir senha** (ela também confirma o e-mail) e confere se a conta está **Ativa**. |
| Pessoa convidada "não consegue criar a senha" | Link vencido ou já usado; versão antiga do site sem a tela de senha | [[fluxo:convite-e-senha]] | Definir a senha pelo administrador. |
| "Limite de envio de e-mails" ao convidar | Muitos convites seguidos; limite do envio de e-mails do Supabase | Mensagem na tela | Esperar (menos de 1 hora) ou usar **Definir senha**. Não tentar várias vezes seguidas. |
| "Nenhuma página liberada" | Usuário comum sem páginas marcadas, ou conta criada fora da plataforma | Cadastro do usuário | Administrador abre o usuário, marca as páginas e salva. |
| "Acesso restrito" ao abrir uma página | A página não está liberada para o perfil | [[pagina:visao-geral/perfis-e-permissoes]] | Liberar a página no cadastro. |
| Vendedor não vê nenhum cliente | Login sem vendedor vinculado, ou sem clientes atribuídos | Mensagem na tela de Clientes | Vincular o login a um vendedor e atribuir clientes. |

## Clientes e cadastros

| Sintoma | Causa provável | Onde olhar | Como resolver |
|---|---|---|---|
| "Falha ao criar cliente no Omie" | O Omie recusou os dados | Mensagem na tela; execução do fluxo no n8n | Corrigir os dados e tentar de novo. Nada foi criado. |
| Cliente com selo **Pendente iClass** ou **Sem iClass** | O iClass falhou ou estava no limite ao criar | [[fluxo:criar-cliente]] | Criar no iClass com o código `ATG_` + CNPJ e usar **Corrigir cadastro iClass**. |
| Pendente iClass continua depois de corrigir | O código não zera esse selo (V-019) | [[modulo:corrigir-iclass]] | Registrar para a equipe técnica. |
| Status "DIVERGENCIA" não sai | Antes do commit 77aa1fa, a correção não atualizava o status | [[modulo:corrigir-iclass]] | Usar a versão atual do site e refazer a correção. |
| Uma pessoa vê dados antigos e outras vêem os novos (por exemplo, um nome já corrigido) | **Cache do navegador** (ou de uma rede, como proxy) dessa pessoa | O mesmo cliente aberto em outro navegador ou no celular | Recarregar sem cache (Ctrl+F5), testar outro navegador ou janela anônima, limpar só os dados do site. Se persistir só nesse computador, olhar proxy ou rede. |
| Cliente criado no Omie e no iClass, mas não aparece na plataforma | A gravação no banco falhou depois do fluxo (mensagem mostra o código do Omie) | Mensagem na tela | Registrar o cliente manualmente; não há reprocessamento automático. |
| Cliente sumiu da lista | Está inativo (continua na lista, mais claro) ou foi excluído definitivamente | Histórico (`inativou`, `excluiu_definitivamente`) | Reativar. Exclusão não volta. |

## Geradores, ficha e preditiva

| Sintoma | Causa provável | Onde olhar | Como resolver |
|---|---|---|---|
| "Não foi possível se comunicar com o servidor" ao adicionar gerador **por O.S.** | O.S. inexistente: o fluxo termina sem resposta (V-022); ou n8n fora do ar | [[fluxo:gerador-por-os]] | Conferir o número da O.S. Se normal, ver o n8n. |
| Adicionar gerador por **patrimônio** nunca acha | O fluxo ignora o tipo de busca (V-020) | [[fluxo:buscar-ativo]] | Usar o número de série. |
| Campo "Número de série" vazio ao adicionar por O.S. | Nome de campo diferente entre fluxo e tela (V-023) | [[fluxo:gerador-por-os]] | Digitar o número. |
| "OS não localizada" ao vincular ficha | O.S. sem checklist, número errado ou iClass fora | [[fluxo:buscar-os]] | Conferir o código da O.S. A ficha não é conferida com o equipamento (V-024): olhar a prévia. |
| "Sobrecarregado" (iClass) | Limite de 25 chamadas por minuto | [[funcao:consumir_rate_limit_iclass]] | Esperar um minuto e repetir. |
| Gerador sem itens de preditiva | Não casou com a planilha | [[modulo:preditiva-e-oxicatalisador]] | Usar **Cadastrar itens padrão de preditiva** e preencher as datas. |
| Data apagada na preditiva continua aparecendo | A função não apaga datas (A-008) | [[funcao:salvar_preditiva]] | Registrar para a equipe técnica. |
| Relatório de Saúde "indisponível" | Gerador arquivado ou sem acesso; vendedor de outro cliente | [[modulo:relatorio-de-saude]] | Conferir o gerador e o vendedor do cliente. |
| Relatório mostra "Preditiva ainda não cadastrada" | O gerador não tem itens de preditiva | [[modulo:relatorio-de-saude]] | Cadastrar os itens. |

## Produtos, serviços, ordens e orçamentos

| Sintoma | Causa provável | Onde olhar | Como resolver |
|---|---|---|---|
| Preço editado voltou ao valor antigo | A atualização vinda do Omie sobrescreve (A-024) | [[fluxo:atualiza-produto]] | Alterar o valor no Omie. |
| "Atualizar Preços" de serviços não muda o valor | Grava em coluna que a tela não mostra, e o endereço chamado é outro (A-025, V-003) | [[fluxo:atualiza-servico]] | Aguardar o fluxo mensal ou ver o fluxo no n8n. |
| Erro ao "Atualizar Preços", mas os dados mudaram | O fluxo não responde ao webhook (V-034) | n8n, histórico de execuções | Conferir a tabela e a execução no n8n. |
| Produtos "de exemplo" na lista | Falha de leitura: a tela mostra dados fictícios (A-027) | Aviso de erro na tela | Recarregar; se persistir, ver o Supabase. |
| Dashboard, O.S. e Orçamentos com zero | Tabelas vazias; e o período padrão é junho de 2026 (A-020) | [[modulo:dashboard]] | Usar o período **Personalizado**. Dados só chegam por carga externa (V-030). |

## Automações (n8n)

| Sintoma | Causa provável | Onde olhar | Como resolver |
|---|---|---|---|
| Várias telas falham com "servidor" | n8n fora do ar | Servidor n8n (Easypanel) | Verificar o servidor e reiniciar. |
| Webhook responde em branco | Nó de resposta ausente, desativado ou erro no meio | Execuções do fluxo | Ver a execução com erro e o nó que falhou. |
| Orçamentos por WhatsApp ou e-mail não saem | `receberorc` inacabado (A-021) | [[fluxo:receberorc]] | Não é esperado que funcione hoje. |

## Banco e histórico

| Sintoma | Causa provável | Onde olhar | Como resolver |
|---|---|---|---|
| "Erro ao reverter alteração" | Ação sem valor de antes, ou entidade fora do mapa | [[modulo:historico-e-reverter]] | Ver a tabela de ações reversíveis. |
| Lista cortada em 1.000 itens | Limite de linhas por consulta (V-036) | Painel do Supabase | Paginar no servidor ou aumentar o limite. |
| Dado alterado por fora da plataforma | Banco acessível diretamente (A-003) | Painel do Supabase | Restringir o acesso (RLS). |
| "Função não encontrada" com faixa amarela | Função do banco ausente: a plataforma usa resposta simulada | [[pagina:banco/funcoes]] | Criar a função; o resultado simulado **não é gravado**. |

## Se nada resolver

1. Anotar: quem, o que fez, a hora e a mensagem exata.
2. Ver o [[modulo:historico-e-reverter]] (o que foi alterado) e o histórico de execuções do fluxo no n8n.
3. Acionar a equipe técnica (Mind) com essas informações.

:::fonte
Mensagens e regras em `src/utils/atgBackend.ts`, `src/utils/mensagensErro.ts`, `src/pages/Clientes.tsx` e nas páginas de cada módulo e fluxo citadas na tabela. O caso de dados diferentes entre pessoas foi observado pela equipe em uso real; a causa (cache do navegador ou da rede) é provável, não verificada. {{nc}}
:::
