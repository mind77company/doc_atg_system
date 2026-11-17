---
titulo: Arquitetura e tecnologias
subtitulo: Como a plataforma é construída por dentro
resumo: Visão técnica das camadas, das tecnologias, da organização do código e do que o projeto herdou do modelo inicial.
ordem: 3
verificado: 2026-11-12
commit: 8db54a9
fontes:
  - package.json
  - vite.config.ts
  - src/App.tsx
  - src/utils/navigation.ts
  - src/utils/supabase.ts
  - metadata.json
  - .env.example
---

:::resumo
A plataforma é um **site de uma página só**: o navegador baixa o programa uma vez e depois conversa direto com o banco de dados (Supabase). Para tarefas que envolvem os sistemas da ATG (Omie e iClass), o navegador chama automações no n8n. Não existe um servidor próprio da ATG entre as telas e o banco: as regras de negócio estão ou nas telas ou no banco.

O código foi organizado por telas e componentes, com uma pasta de funções de apoio.
:::

## Camadas

:::diagrama Camadas da plataforma: o navegador executa as telas e fala com o Supabase e com o n8n; o n8n fala com os sistemas externos.
flowchart TD
  U["Pessoa usando o navegador"] --> F["Site de uma pagina so: React, publicado como arquivos estaticos"]
  F -->|dados, login, funcoes| S["Supabase: PostgreSQL, Auth e Edge Function"]
  F -->|webhooks| N["n8n: automacoes"]
  N --> S
  N --> I["iClass"]
  N --> O["Omie"]
  N --> G["Gmail e WhatsApp"]
  O -.->|evento de pedido| N
:::

| Camada | Onde está | O que faz |
|---|---|---|
| **Telas** | `src/pages` e `src/components` | Mostram dados, recebem ações, aplicam as regras de perfil e de tela. |
| **Acesso aos dados** | `src/utils/supabase.ts` e as próprias telas | Cada tela consulta o Supabase diretamente (`supabase.from(...)`). Não há camada de API própria. |
| **Integração** | `src/utils/atgBackend.ts`, `src/utils/webhooks.ts` | Chamam os webhooks do n8n e as funções do banco, tratam falhas e, se a função não existir, usam resposta simulada. |
| **Banco de dados** | Supabase (PostgreSQL) | Guarda os dados e várias regras (gatilhos, views, funções). Ver [[pagina:banco/visao-geral]]. |
| **Servidor** | Função `manage-users` (Supabase) | Única parte com chave de administrador: gerencia usuários. |
| **Automação** | n8n | Fluxos com iClass, Omie, Gmail e WhatsApp. Ver [[integracao:n8n]]. |

## Tecnologias

| Tecnologia | Versão (em `package.json`) | Para quê |
|---|---|---|
| React | 19 | Telas. |
| TypeScript | 5.8 | Código com tipos. `npm run lint` roda só a checagem de tipos. |
| Vite | 6 | Montagem e servidor de desenvolvimento. |
| Tailwind CSS | 4 | Estilo. As cores da marca estão em `src/index.css`. |
| `@supabase/supabase-js` | 2 | Banco, login e funções. |
| `lucide-react` | 0.546 | Ícones. |
| `motion` | 12 | Animações. |
| `recharts` | 3 | Gráfico do Dashboard. |
| `sonner` | 2 | Avisos na tela. |
| `xlsx` | 0.18 | Exportar para Excel. |

Sem biblioteca de rotas nem de gerenciamento de estado: cada tela guarda o próprio estado com React, e a navegação lê o endereço depois do `#`.

## Como a navegação funciona

As telas são abertas por endereços com `#` (por exemplo `#/clientes`). Quem decide qual tela mostrar é o `App.tsx`, que lê o endereço (`src/utils/navigation.ts`) e confere se a pessoa tem permissão. Como tudo depois do `#` é tratado pelo navegador, o site publicado **não precisa de configuração de redirecionamento** no servidor.

## Organização do código

| Pasta | Conteúdo |
|---|---|
| `src/pages` | 11 telas (Dashboard, Clientes, Ordens de Serviço, Orçamentos, Histórico, Usuários, Configurações, Login, Definir Senha, Relatório, Geradores legado). |
| `src/components` | Peças das telas: `Clientes` (8), `ui` (4: modal, filtros, período, estado vazio), `layout` (menu e barra superior), `Usuarios`, `Products`, `Services`, `Geradores`. |
| `src/utils` | 10 arquivos de apoio: Supabase, integração, histórico, páginas, regras de saúde, datas, Excel e tradução de mensagens. |
| `src/data` | Dados de exemplo (usados como reserva nos catálogos; um arquivo sem uso). |
| `supabase/functions` | A função `manage-users`. |
| `docs` | Esta documentação e arquivos de apoio. |

O código tem cerca de 10,9 mil linhas nas telas, componentes e funções de apoio. Não há testes automatizados nem integração contínua no repositório. {{nc}} Pode haver verificações no serviço de hospedagem.

## Onde ficam as regras de negócio

- **Nas telas:** permissões por perfil, exigência de campos, mensagens, regra do vendedor.
- **No banco:** situação de cada item de preditiva, estado do cliente, comparação de nomes e importação da planilha, controle de limite do iClass, criação de gerador. Ver [[pagina:banco/funcoes]].
- **Nos fluxos do n8n:** cadastro nos dois sistemas, tradução da ficha, atualização de preços.

## Origem do projeto

O projeto nasceu de um modelo do **Google AI Studio**: ficam rastros no `vite.config.ts` (comentário sobre HMR do AI Studio), no `.env.example` (variáveis de Gemini e de endereço da aplicação), no `metadata.json` (nome e permissão de uso do Gemini no servidor) e em dependências sem uso (`@google/genai`, `express`, `@tanstack/react-table`, `zod`, `react-hook-form`, `dotenv`). Nenhuma delas é usada pelo código atual (A-014). O arquivo `README.md` está vazio.

## Pontos de atenção

- **Muita regra no navegador:** a proteção por perfil depende da tela (A-003).
- **Sem camada de API:** qualquer tela fala direto com o banco; mudar uma tabela afeta várias telas ([[pagina:banco/visao-geral]], seção "Quem lê e quem grava").
- **Endereços dos webhooks no código:** trocar o servidor n8n exige mexer no código.

:::fonte
`package.json`, `vite.config.ts`, `src/App.tsx`, `src/utils/navigation.ts`, `src/utils/supabase.ts`, `.env.example` (apenas nomes), `metadata.json`.
:::
