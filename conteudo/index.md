---
titulo: QUIRON ATG SYSTEM
subtitulo: Documentação da plataforma ATG | Sistema de Ordem de Serviços e Orçamentos
ordem: 0
resumo: Ponto de partida da documentação interna da plataforma da ATG.
verificado: 2026-11-11
commit: 9d680f5
fontes:
  - package.json
  - src/App.tsx
---

:::alerta seguranca Uso interno
Esta documentação descreve a arquitetura interna da plataforma (tabelas, fluxos, integrações e pontos de segurança). **Não deve ser publicada abertamente.** Ela não contém senhas, chaves, tokens nem dados reais de clientes: onde há exemplos, eles são fictícios e identificados como tal.
:::

:::resumo
A plataforma da ATG reúne, em um só lugar, o cadastro de clientes e de geradores, o acompanhamento das manutenções preditivas, os relatórios de saúde dos geradores, ordens de serviço, orçamentos e a lista de produtos e serviços. Ela conversa com o Omie e com o iClass para que o cadastro seja feito uma vez só.

Esta documentação explica o que cada parte faz, quem usa, de onde vêm os dados e o que acontece em cada situação. Cada página começa com um **Resumo simples**, para quem não é da área técnica, e traz os **Detalhes técnicos** em blocos que abrem ao clicar, para quem precisa aprofundar.
:::

## Como usar

- Use o **menu à esquerda** para navegar por seção. Em telas pequenas, o botão "Menu" abre o mesmo menu.
- Use a **busca** no topo (atalho: tecla `/`) para achar uma palavra em qualquer página. Ela funciona sem internet.
- Termos técnicos aparecem sublinhados na primeira vez em cada página e levam ao **glossário**.
- Itens marcados {{nc}} são deduções que ainda precisam de confirmação da equipe. Itens marcados {{fi}} são pontos em que não foi possível identificar para que servem. Ambos estão reunidos em [[pagina:controle/pontos-a-validar]].
- O que parece sem uso, duplicado ou inconsistente, e os alertas de segurança, estão em [[pagina:controle/achados]]. **Nada foi corrigido** na plataforma: só foi registrado.

## Seções

:::gerado secoes
:::

## Estado da documentação

A documentação cobre toda a plataforma, na data da última verificação (rodapé de cada página):

- **Visão geral:** [[pagina:visao-geral/visao-geral]], [[pagina:visao-geral/perfis-e-permissoes]], [[pagina:visao-geral/arquitetura]] e [[pagina:visao-geral/ambientes]].
- **Módulos e telas:** 17 páginas, de [[modulo:login-e-acesso]] a [[modulo:configuracoes]].
- **Fluxos e automações:** os 10 fluxos do n8n, a função [[fluxo:manage-users]], o [[fluxo:convite-e-senha]] e a [[fluxo:importacao-preditivas]].
- **Banco de dados:** todas as tabelas e views da lógica da plataforma, as funções, as regras de segurança e o [[pagina:banco/historico-de-mudancas]]. As tabelas `INATIVO_*` ficam de fora, por decisão da equipe.
- **Integrações** e **Operação**.
- **Apoio:** [[pagina:raiz/glossario]], [[pagina:raiz/faq]], [[pagina:controle/pontos-a-validar]], [[pagina:controle/achados]] e [[pagina:controle/changelog]].

:::detalhes De onde vêm as informações
Tudo foi lido no código do repositório (`src/`, `supabase/functions/`), em consultas de leitura ao catálogo do banco de dados feitas em 2026-11-11 e nas exportações dos fluxos do n8n. O rodapé de cada página mostra a data, o commit do código usado como base e a lista de arquivos consultados. A hospedagem na Vercel foi informada pela equipe e não consta no repositório.
:::
