---
titulo: Ambientes
subtitulo: Onde a plataforma roda: desenvolvimento, produção e o que não existe
resumo: Quais ambientes existem, como cada um é configurado e o que está compartilhado entre eles.
ordem: 4
verificado: 2026-11-12
commit: 8db54a9
fontes:
  - package.json
  - vite.config.ts
  - .env.example
  - src/pages/Configuracoes.tsx
  - docs/_fontes_privadas/n8n/
---

:::resumo
A plataforma tem dois ambientes conhecidos: o de **desenvolvimento**, no computador de quem programa, e o de **produção**, o site que a equipe da ATG usa. **Não foi identificado um ambiente de testes (homologação) separado.**

Os dois ambientes usam, até onde se sabe, o **mesmo banco de dados** e o **mesmo servidor de automações**. Isso quer dizer que um teste feito em desenvolvimento pode alterar dados reais.
:::

## Os ambientes

| Ambiente | Onde roda | Como sobe | Configuração |
|---|---|---|---|
| **Desenvolvimento** | Computador de quem programa, na porta 3000 | `npm run dev` | Arquivo `.env` local com a URL e a chave pública do Supabase (fora do git). |
| **Produção** | Hospedagem do site, com endereço próprio. A equipe informou que é a **Vercel**. {{nc}} Não há arquivo de configuração de hospedagem no repositório. | Publicação do código do `main`. {{nc}} Como a publicação é disparada não consta no repositório. | As mesmas duas variáveis de ambiente, definidas no painel da hospedagem (V-001). |
| **Homologação / teste** | **Não identificado.** | — | — |

A tela de [[modulo:configuracoes]] mostra "Ambiente: Produção" como texto fixo, sem relação com o ambiente real.

## O que é compartilhado

| Recurso | Compartilhado entre desenvolvimento e produção? |
|---|---|
| Banco de dados, login e função de usuários (Supabase) | Provavelmente **sim**: há um só projeto, e o código não tem outra configuração. {{nc}} Quem tem o `.env` de desenvolvimento acessa o banco de produção. |
| Servidor de automações (n8n) | **Sim**: os endereços dos webhooks estão escritos no código e não variam por ambiente. |
| Omie e iClass | **Sim**: não há ambiente de teste de nenhum dos dois identificado. |

**Consequência prática:** qualquer teste que crie cliente, grave ficha, atualize preço ou envie mensagem age de verdade. Cada página de fluxo traz a seção "Como testar com segurança".

## Variáveis por ambiente

Ver [[pagina:operacao/variaveis-ambiente]]. As variáveis do navegador entram no site **no momento da montagem** (build): mudar um valor exige montar e publicar de novo.

## Rastros do modelo inicial

O `.env.example` e o `metadata.json` falam em **Cloud Run** e **AI Studio**, herdados do modelo de onde o projeto partiu. Não indicam onde a plataforma roda hoje (ver [[pagina:visao-geral/arquitetura]]).

## Pontos a confirmar

- Se existe um projeto Supabase separado para testes. {{nc}}
- Como a produção é atualizada (publicação automática ao enviar para o `main`, ou manual). {{nc}}
- Se há um endereço de homologação. {{nc}}

:::fonte
`package.json` (script `dev`), `vite.config.ts`, `.env.example` (somente nomes), `src/pages/Configuracoes.tsx`, `src/utils/atgBackend.ts` e `src/utils/webhooks.ts` (endereços dos webhooks).
:::
