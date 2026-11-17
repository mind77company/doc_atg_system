---
titulo: Subir, atualizar e reverter
subtitulo: Como colocar uma mudança no ar e como voltar atrás
resumo: Passo a passo para rodar localmente, publicar o site, atualizar o banco, a função de usuários e os fluxos, e reverter cada um.
ordem: 3
verificado: 2026-11-12
commit: 8db54a9
fontes:
  - package.json
  - .gitignore
  - docs/backups
  - docs/scripts/extracao_banco.sql
---

:::resumo
A plataforma tem **quatro partes que mudam de formas diferentes**: o **site** (código no Git), o **banco** (alterado direto no Supabase), a **função de usuários** (código no Git, publicada no Supabase) e os **fluxos** (editados no n8n). Cada uma tem seu jeito de ser atualizada e de voltar atrás.

Só o site tem um histórico confiável para voltar: o Git. As outras três dependem de cópias manuais.
:::

:::alerta aviso Não existe ambiente de testes
Toda mudança publicada atinge os dados e os sistemas reais (ver [[pagina:visao-geral/ambientes]]). Teste com cuidado e fora do horário de uso quando possível.
:::

## 1. Rodar no computador

1. Ter o Node.js instalado. {{nc}} A versão exigida não consta no repositório.
2. Instalar as dependências: `npm install`.
3. Criar o arquivo `.env` com as duas variáveis do Supabase ([[pagina:operacao/variaveis-ambiente]]). **Atenção: ele acessa o banco real.**
4. Subir: `npm run dev`, que abre o site na porta 3000.
5. Conferir tipos: `npm run lint` (só checagem de tipos; não há testes automatizados).
6. Montar o site: `npm run build` (gera a pasta `dist`, ignorada pelo Git).

## 2. Site (código no Git)

**Atualizar**

1. Fazer a mudança, rodar `npm run lint` e `npm run build`, e testar as telas afetadas no computador.
2. Registrar no Git (commit) e enviar para o `main`.
3. A produção é atualizada a partir daí. {{nc}} Pela hospedagem na Vercel informada pela equipe, o envio costuma publicar sozinho, mas **isso não está confirmado** no repositório.
4. Depois de publicar, avisar quem usa para **recarregar a página** (Ctrl+F5): o navegador pode manter a versão antiga em cache por um tempo.

**Reverter**

1. Identificar o commit com problema (`git log`).
2. Criar um commit que desfaz a mudança (`git revert <commit>`) e enviar para o `main`. **Não reescrever o histórico** do `main`.
3. Se a hospedagem guarda publicações anteriores, também é possível voltar a uma delas pelo painel. {{nc}}

## 3. Banco de dados

**Atualizar**

1. Não há migrations. As mudanças de estrutura (tabelas, campos, funções, gatilhos) são feitas direto no **editor SQL do Supabase**.
2. Antes: copiar o que será alterado (por exemplo, a definição atual da função, ou uma cópia da tabela).
3. Depois: rodar de novo a extração desta documentação (`docs/scripts/extracao_banco.sql`) e atualizar as páginas ([[pagina:banco/historico-de-mudancas]]).

**Reverter**

- **Não há mecanismo no repositório.** A volta depende de backup do Supabase (se o plano tiver; {{nc}}) ou de cópias manuais feitas antes.
- Para dados editados pelas telas, a tela de [[modulo:historico-e-reverter]] reverte algumas alterações. Não cobre exclusões, criações nem preditivas.

:::alerta nc Segurança da mudança no banco
Como o controle por linha (RLS) está desligado na maior parte das tabelas, um erro em um comando SQL atinge todos os dados. Evite `UPDATE` ou `DELETE` sem condição e teste primeiro numa cópia.
:::

## 4. Função de usuários (`manage-users`)

**Atualizar**

1. Editar `supabase/functions/manage-users/index.ts` e **publicar no Supabase**. {{nc}} O jeito de publicar (linha de comando do Supabase ou painel) não está registrado.
2. Testar: abrir **Controle de Usuários** e listar. Listar é seguro; convidar e definir senha têm efeito real.

**Reverter**

- Há quatro versões anteriores em `docs/backups/` (antes da etapa 2A, etapa 2A, e fases 1 e 2 da etapa 2B). Publicar a versão desejada de novo. O código mais novo está no Git.

## 5. Fluxos do n8n

**Atualizar**

1. Editar o fluxo no painel do n8n (não há cópia versionada no repositório).
2. Depois, **exportar** o fluxo (JSON) e guardar em `docs/_fontes_privadas/n8n/`, para a documentação e como cópia. As exportações podem ter chaves e dados de teste: **não versionar nem compartilhar**.
3. Se o nome do webhook mudar, mudar também o endereço em `src/utils/atgBackend.ts` ou `src/utils/webhooks.ts` e publicar o site. Já existe uma divergência desse tipo (V-003).

**Reverter**

- Reimportar a exportação anterior no n8n, se guardada. O n8n pode manter versões do fluxo. {{nc}}

## 6. Documentação

Seguir `docs/COMO_ATUALIZAR.md` e a regra do `CLAUDE.md`: ao mexer em tabelas, funções, fluxos, integrações, módulos ou telas, rodar a extração e a verificação, atualizar as páginas e registrar no changelog.

## Lista de conferência antes de publicar o site

- `npm run lint` sem erros e `npm run build` concluído.
- Login, Clientes, uma ficha e o Relatório de Saúde abrindo.
- Se tocou em fluxo ou função do banco: testar a tela que a chama.
- Atualizar a documentação.

:::fonte
`package.json` (scripts `dev`, `build`, `preview`, `lint`), `.gitignore`, `docs/backups/`, `docs/scripts/extracao_banco.sql`, `docs/COMO_ATUALIZAR.md`, `CLAUDE.md`.
:::
