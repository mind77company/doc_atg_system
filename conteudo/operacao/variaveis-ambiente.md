---
titulo: Variáveis de ambiente
subtitulo: Os nomes das configurações que o sistema lê, para que servem e se são obrigatórias
resumo: Lista de variáveis de ambiente do site, da função de usuários e do ambiente de desenvolvimento, sem valores.
ordem: 2
verificado: 2026-11-12
commit: 8db54a9
fontes:
  - src/utils/supabase.ts
  - supabase/functions/manage-users/index.ts
  - vite.config.ts
  - .env.example
---

:::resumo
"Variáveis de ambiente" são configurações que não ficam escritas no código: cada instalação (por exemplo, o computador de quem programa e a hospedagem em produção) informa as suas. Aqui estão **só os nomes**, o que cada uma faz e se é obrigatória. **Os valores nunca aparecem nesta documentação.**

O site precisa de **duas**: o endereço do Supabase e a chave pública dele. Sem elas, a plataforma mostra "Supabase não configurado".
:::

:::alerta seguranca Valores não vão para o código nem para esta documentação
O arquivo `.env` (com os valores) é ignorado pelo Git e nunca deve ser compartilhado. O `.env.example` só mostra os nomes.
:::

## O site (navegador)

Lidas na **montagem** do site (build): para mudar um valor, é preciso montar e publicar de novo.

| Nome | Para que serve | Obrigatória | Onde é lida |
|---|---|---|---|
| `VITE_SUPABASE_URL` | Endereço do projeto Supabase. | **Sim** | `src/utils/supabase.ts` |
| `VITE_SUPABASE_ANON_KEY` | Chave **pública** do Supabase (a do tipo "anon"), que fica visível no navegador por natureza. | **Sim** | `src/utils/supabase.ts` |

Se qualquer uma faltar, o cliente do Supabase não é criado, o login mostra "Supabase não configurado" e as telas, ou mostram erro, ou (nos catálogos) usam dados de exemplo (A-027).

## A função de usuários (servidor)

Lidas pela função `manage-users`, no servidor do Supabase.

| Nome | Para que serve | Obrigatória | Observação |
|---|---|---|---|
| `SUPABASE_URL` | Endereço do projeto. | Sim | {{nc}} Normalmente injetada pelo próprio Supabase nas funções. |
| `SUPABASE_ANON_KEY` | Chave pública, usada só para identificar quem chama. | Sim | Idem. |
| `SUPABASE_SERVICE_ROLE_KEY` | Chave de **administrador**, usada nas ações de usuário. | Sim | Idem. **Nunca** deve ir para o navegador ou para arquivos compartilhados. |

## Desenvolvimento

| Nome | Para que serve | Obrigatória |
|---|---|---|
| `DISABLE_HMR` | Desliga a atualização automática e a observação de arquivos do servidor de desenvolvimento. Herdada do modelo do AI Studio. | Não |

## Listadas no `.env.example` e sem uso

| Nome | Situação |
|---|---|
| `GEMINI_API_KEY` | Herdada do modelo inicial. **Nenhum arquivo do código a usa.** |
| `APP_URL` | Herdada do modelo inicial. **Nenhum arquivo do código a usa.** |

Estas duas podem ser removidas do `.env.example` sem efeito (A-014).

## Configurações que **não** são variáveis de ambiente

Alguns valores importantes estão **escritos no código** ou **dentro de fluxos**, e não em variáveis:

| O quê | Onde está | Consequência |
|---|---|---|
| Endereços dos webhooks do n8n | `src/utils/atgBackend.ts`, `src/utils/webhooks.ts` | Trocar de servidor n8n exige alterar o código. |
| Chave e segredo do Omie | Dentro de 6 fluxos do n8n | Trocar exige editar cada fluxo (A-002). |
| Chave de administrador do Supabase | Dentro de 2 fluxos do n8n | Ver A-001. |
| Limite de 25 chamadas por minuto ao iClass | Valor padrão da função `consumir_rate_limit_iclass` | Mudar exige alterar a função no banco. |
| WhatsApp exibido no Relatório de Saúde | `src/pages/RelatorioGerador.tsx` | Mudar exige alterar o código. |

:::fonte
`src/utils/supabase.ts`, `supabase/functions/manage-users/index.ts`, `vite.config.ts`, `.env.example` (somente nomes), `docs/data/codigo.gerado.json` (variáveis detectadas no código).
:::
