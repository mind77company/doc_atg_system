---
titulo: Perguntas frequentes
subtitulo: As dúvidas que mais aparecem no dia a dia, com respostas curtas e o caminho para o detalhe
resumo: Perguntas e respostas sobre clientes, geradores, preditiva, produtos, acessos e o funcionamento geral da plataforma.
ordem: 20
verificado: 2026-11-12
commit: 8db54a9
fontes:
  - docs/conteudo
  - docs/data/pontos.json
---

:::resumo
Aqui estão as perguntas que alguém da ATG provavelmente faria ("de onde vem este número?", "o que acontece quando...?"). Cada resposta é curta e leva à página com o detalhe e a fonte. Onde algo ainda não foi confirmado, a resposta diz.
:::

## Clientes

### De onde vem a lista de clientes?

Da tabela de clientes do banco ([[tabela:omie_clientes]]). Os clientes entram pelo botão **Novo Cliente** ou vieram de uma carga inicial. A tela mostra o resumo calculado pela view [[tabela:vw_cliente_card]]. Ver [[modulo:clientes-lista]].

### O que significam os selos "Sem iClass", "Sem Gerador", "Sem Ficha", "Completo" e "Validado"?

São a etapa em que o cliente está, sempre pela primeira regra que se aplica: sem número do iClass; com iClass mas sem gerador; com algum gerador sem ficha; completo (tudo preenchido); validado (cliente e geradores conferidos). A tabela está em [[modulo:clientes-lista]].

### Ao cadastrar um cliente, ele vai para o iClass automaticamente?

Sim, no mesmo formulário o cliente é criado no **Omie** e no **iClass**. Se o Omie recusar, nada é criado. Se o Omie aceitar e o iClass falhar ou estiver sobrecarregado, o cliente é salvo com o aviso de pendência. Ver [[fluxo:criar-cliente]].

### O que faço quando aparece "Pendente iClass"?

Crie ou confira o cliente no iClass com o código `ATG_` seguido do CNPJ e use **Corrigir cadastro iClass**. Pelo código, o selo pode continuar depois da correção (V-019). Ver [[modulo:corrigir-iclass]].

### Inativar um cliente apaga alguma coisa?

Não. O cliente continua na lista (mais claro, com o selo "Inativo"), e **nada é alterado no Omie nem no iClass**. Reativar reaproveita o mesmo cadastro. Ver [[modulo:clientes-lista]].

### Posso excluir um cliente?

Só o administrador, e a exclusão é **definitiva**: não volta pelo Histórico. A tela bloqueia se o cliente ainda tem geradores. Um detalhe: geradores arquivados não contam nesse bloqueio, mas são apagados junto (A-017). Ver [[modulo:clientes-lista]].

### Por que um vendedor não vê um cliente?

O vendedor só vê os clientes atribuídos a ele. Um administrador atribui o vendedor no cartão do cliente, e o login do vendedor precisa estar vinculado ao cadastro dele. Ver [[pagina:visao-geral/perfis-e-permissoes]].

## Geradores, ficha e preditiva

### De onde vem a situação "vencido", "a vencer" e "em dia"?

É **calculada na hora** pelo banco, a partir da data de vencimento de cada item e da data de hoje (horário de São Paulo): vencido é antes de hoje; a vencer é até 30 dias; em dia é mais que isso. Ver [[modulo:preditiva-e-oxicatalisador]] e [[tabela:vw_preditivas]].

### De onde vem o percentual de saúde do relatório?

É o número de itens em dia dividido pelos itens avaliáveis (os "não se aplica" ficam de fora). Um item **sem data conta contra**, e o gerador só chega a 100% se nenhum item estiver vencido, a vencer ou sem data. Ver [[modulo:relatorio-de-saude]].

### Por que um gerador não tem itens de preditiva?

Normalmente porque a linha da planilha não foi ligada a ele na importação (nota de semelhança baixa ou cliente com mais de um gerador). Pode-se usar **Cadastrar itens padrão de preditiva** e preencher as datas. Ver [[fluxo:importacao-preditivas]].

### O que quer dizer "Não se aplica"?

Que o item não faz parte daquele gerador. Ele sai do cálculo do percentual. Ver [[modulo:preditiva-e-oxicatalisador]].

### Apaguei uma data e ela continua aparecendo. Por quê?

Pela função do banco, apagar a data só marca "sem data"; a data antiga permanece (A-008). Ver [[funcao:salvar_preditiva]].

### Como vinculo a ficha de levantamento a um gerador?

Na aba **Ficha de Levantamento**, digite o código da O.S. do levantamento, confira a prévia e confirme. Ver [[modulo:ficha-de-levantamento]].

### Por que aparece "OS não localizada"?

A O.S. não existe no iClass, não tem checklist ou o iClass está indisponível. Confira o código. Ver [[fluxo:buscar-os]].

### O que é a página "Geradores" separada da "Clientes & Geradores"?

É a versão **antiga** do cadastro, com a ficha em colunas e tabela própria. As duas não se conversam. Ver [[modulo:geradores-legado]].

### Posso reverter uma alteração?

Só o administrador, no Histórico, e só para algumas ações (atribuir vendedor, inativar, corrigir iClass, editar ficha, entre outras). Não é possível reverter exclusões, criações nem edições de itens de preditiva. Ver [[modulo:historico-e-reverter]].

## Produtos, serviços, ordens e orçamentos

### De onde vêm os preços de produtos e serviços?

Do **Omie**. Uma automação os copia a cada 30 dias, e o botão **Atualizar Preços** dispara uma cópia na hora. Ver [[modulo:produtos-e-servicos]].

### Editei um preço e ele voltou ao valor antigo. Por quê?

A atualização vinda do Omie regrava nome, valor e (no fluxo forçado) a marcação de inativo (A-024). Para uma mudança duradoura, altere no Omie. Ver [[fluxo:atualiza-produto]].

### Por que o Dashboard mostra zero em tudo?

Dois motivos: as tabelas de ordens de serviço e orçamentos estão vazias (nenhuma tela as preenche) e o período padrão está preso em junho de 2026 (A-020). Ver [[modulo:dashboard]].

### Como crio um orçamento ou uma ordem de serviço?

Hoje **não há tela para isso**: o botão "Novo Orçamento" do Dashboard só abre a lista. Quem deveria alimentar essas tabelas não está definido (V-030). Ver [[modulo:orcamentos]] e [[fluxo:receberorc]].

## Acessos

### Como dou acesso a uma pessoa nova?

Em **Controle de Usuários**, administrador: **Novo Usuário**, preencher nome, e-mail e perfil, e enviar o convite. A pessoa recebe um e-mail, clica no link e cria a senha. Se o e-mail não chegar, use **Definir senha**. Ver [[fluxo:convite-e-senha]].

### Uma pessoa esqueceu a senha. E agora?

Não há "Esqueci minha senha" no login. O administrador usa **Definir senha** no cadastro da pessoa e passa a nova senha por um canal seguro. Ver [[modulo:usuarios-e-vendedores]].

### Por que aparece "limite de envio de e-mails" ao convidar?

Muitos convites seguidos esgotam o limite do envio de e-mails do Supabase. Aguarde (geralmente menos de 1 hora) e evite repetir; ou use **Definir senha**. Ver [[fluxo:convite-e-senha]].

### Quem pode ver e fazer o quê?

Ver a tabela completa em [[pagina:visao-geral/perfis-e-permissoes]].

## O sistema por dentro

### Qual a diferença entre Omie e iClass?

O **Omie** é o sistema de gestão (ERP): cadastros, produtos, serviços, pedidos. O **iClass** é o sistema de serviços em campo: ativos (equipamentos), ordens de serviço e fichas. A plataforma liga os dois. Ver [[integracao:omie]] e [[integracao:iclass]].

### O que é o n8n e o que acontece se ele cair?

É o servidor das automações. Se cair, as telas que dependem dele (criar cliente, buscas no iClass, atualizar preços) mostram "Não foi possível se comunicar com o servidor" e nada é criado. O resto da plataforma continua funcionando. Ver [[integracao:n8n]].

### Onde os dados ficam guardados?

No banco do **Supabase**. Ver [[integracao:supabase]] e [[pagina:banco/visao-geral]].

### Os dados na tela estão atualizados?

As listas são carregadas ao abrir a tela. Se alguém vê dado diferente dos colegas, recarregue sem cache (Ctrl+F5) e teste em outro navegador. Ver [[pagina:operacao/quando-algo-da-errado]].

### Posso testar sem afetar os dados reais?

Não há ambiente de testes. Qualquer teste que crie, grave ou envie age de verdade. Cada página de fluxo tem "Como testar com segurança". Ver [[pagina:visao-geral/ambientes]].

## Sobre esta documentação

### O que significam "Não confirmado" e "Finalidade não identificada"?

São marcas de honestidade: **Não confirmado** é dedução a partir do código, sem confirmação; **Finalidade não identificada** é um item (tabela, campo, fluxo) cuja função não foi possível descobrir. Todos estão reunidos em [[pagina:controle/pontos-a-validar]].

### Onde vejo o que parece errado ou sem uso?

Em [[pagina:controle/achados]], incluindo os alertas de segurança. Nada foi corrigido: só registrado.

### Esta documentação pode ser publicada?

**Não.** Ela descreve a arquitetura interna e não deve ser publicada abertamente. Não contém senhas, chaves nem dados reais, mas mostra a estrutura da plataforma.

### Como mantenho esta documentação atualizada?

Seguindo `docs/COMO_ATUALIZAR.md` e a regra do `CLAUDE.md`. Cada mudança é registrada em [[pagina:controle/changelog]].

:::fonte
Respostas baseadas nas páginas citadas em cada pergunta; as fontes de código estão no fim de cada uma delas.
:::
