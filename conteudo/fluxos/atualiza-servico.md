---
titulo: atualiza-servico (forçada)
subtitulo: Atualizar o catálogo de serviços a partir do Omie, sob demanda
resumo: Fluxo do n8n que lê os serviços do Omie e grava no banco. O botão da tela chama um endereço diferente do exportado.
ordem: 11
verificado: 2026-11-12
commit: 8db54a9
fontes:
  - src/utils/webhooks.ts
  - src/components/Services/ServiceList.tsx
  - docs/_fontes_privadas/n8n/Atualiza__o_For_ada_de_pre_o_do_Servi_o.json
---

:::resumo
Esta automação busca no **Omie** o cadastro de serviços, página por página, e grava no banco da plataforma. É a versão "na hora" da atualização que também roda sozinha a cada 30 dias ([[fluxo:preco-servico-mensal]]).

Pela leitura do código, ela tem dois problemas: o endereço que o botão chama **não é o mesmo** do fluxo exportado, e ela grava o preço em uma coluna que a tela **não mostra**.
:::

## Gatilho

- **Tipo:** webhook `POST` em `/webhook/atualiza-servico` do servidor n8n (o fluxo exportado).
- **Quem chama:** o botão **Atualizar Preços** da tela [[modulo:produtos-e-servicos]] (aba de Serviços), que chama **`/webhook/atualiza-serv`**, um endereço diferente. {{nc}} Se o fluxo em produção usar `atualiza-serv`, a exportação está desatualizada; se não, o botão não chega a este fluxo. Ver V-003.
- **Autenticação do webhook:** nenhuma configurada. {{nc}}

## Diagrama do fluxo

:::diagrama Fluxo atualiza-servico: percorre as páginas de serviços do Omie, grava cada página no banco e repete até acabar.
flowchart TD
  A["POST atualiza-servico"] --> B["Comecar pela pagina 1"]
  B --> C["Omie: ListarCadastroServico da pagina"]
  C --> D["Converter servicos para as colunas do banco"]
  D --> E["Gravar a pagina em Servicos: inserir ou atualizar"]
  E --> F{"Ha mais paginas?"}
  F -->|sim| G["Esperar 2 segundos"]
  G --> C
  F -->|nao| H["Montar resumo"]
  H --> I["Resposta ao sistema e e-mail: desativados"]
:::

## O que é gravado

Em [[tabela:Serviços]] (chave `nCodServ`):

| Coluna | Vem de |
|---|---|
| `nCodServ` | Código do serviço no Omie |
| `cDescricao` | Descrição **curta** do cadastro |
| `codigo_interno` | Código do cadastro |
| `descricao_completa` | Descrição completa |
| `preco_unitario` | Preço unitário |
| `codigo_lc116` | Código da lista LC 116 |
| `inativo` | Verdadeiro se o Omie marca o serviço como inativo |
| `sync_em` | Data e hora da atualização |

:::alerta aviso O valor mostrado na tela não é atualizado
A tela de Serviços mostra a coluna `nValorDesc`. Este fluxo grava o preço em `preco_unitario`, e **não grava `nValorDesc`**. Só o fluxo mensal ([[fluxo:preco-servico-mensal]]) atualiza `nValorDesc`. Além disso, `cDescricao` recebe a descrição curta aqui e a completa no mensal. Deduzido da leitura, não testado. Ver A-025.
:::

## Resultados e tratamento de erro

- **Resposta ao sistema:** o nó "Responde ao Front End" está **desativado**. A tela pode ver falha mesmo quando a atualização termina. {{nc}} V-034.
- **E-mail de aviso:** o nó está **desativado**, com destinatário provisório.
- **Erros:** nenhum tratamento específico; sem notificação. Páginas já gravadas permanecem.
- **Reprocessar:** acionar de novo; é seguro repetir (insere ou atualiza pela mesma chave).
- **`inativo` é sobrescrito:** a marcação feita na tela de Serviços é regravada com o valor do Omie (A-024).

## O que o fluxo faz, etapa por etapa

:::gerado fluxo-meta atualiza-servico
:::

:::gerado fluxo-nos atualiza-servico
:::

:::detalhes Ligações entre as etapas
:::gerado fluxo-ligacoes atualiza-servico
:::
:::

## Integrações, segredos e como testar

| Sistema | Uso | Autenticação |
|---|---|---|
| Omie | `ListarCadastroServico` (100 por página) | Chave e segredo dentro do corpo da chamada (A-002; não reproduzidos). |
| Supabase | Gravação por chamada REST em `Serviços` | **Chave de administrador (`service_role`) nos cabeçalhos** (A-001; não reproduzida). |

**Testar com segurança:** o fluxo grava em produção. Teste fora do horário de uso.

:::fonte
`docs/_fontes_privadas/n8n/Atualiza__o_For_ada_de_pre_o_do_Servi_o.json` (11 nós, lido sem copiar valores de chaves), `src/utils/webhooks.ts`, `src/components/Services/ServiceList.tsx`.
:::

## Ligações

[[modulo:produtos-e-servicos]], [[fluxo:preco-servico-mensal]], [[tabela:Serviços]], [[integracao:omie]].
