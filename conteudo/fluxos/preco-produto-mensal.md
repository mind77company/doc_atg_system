---
titulo: Preço de produtos (mensal)
subtitulo: A atualização automática de preços de produtos a cada 30 dias
resumo: Fluxo agendado do n8n que lê 10 páginas de produtos do Omie e atualiza nome e valor no banco.
ordem: 12
verificado: 2026-11-12
commit: 8db54a9
fontes:
  - docs/_fontes_privadas/n8n/Atualiza__o_Autom_tica_de_Pre_o_de_Produto_Mensal.json
---

:::resumo
A cada 30 dias, sozinha, esta automação consulta o **Omie** e atualiza no banco da plataforma o **nome** e o **valor** dos produtos que já existem. Assim a tabela de preços acompanha o Omie sem ninguém precisar clicar.

Ela só **atualiza** produtos já cadastrados: produtos novos do Omie não são criados por ela (isso é feito pela versão forçada, [[fluxo:atualiza-produto]]).
:::

## Gatilho

- **Tipo:** agendamento. O nó "MENSAL" dispara o fluxo **a cada 30 dias** (não "todo dia 1": é um intervalo de 30 dias a partir da ativação). {{nc}} A data e hora da primeira execução não estão na exportação.
- **Quem chama:** o próprio n8n. Nenhum arquivo do projeto.
- **Situação na exportação:** ativo.

## Diagrama do fluxo

:::diagrama Fluxo mensal de produtos: a cada 30 dias consulta 10 páginas do Omie em paralelo, junta, e atualiza nome e valor de cada produto no banco.
flowchart TD
  A["Agenda: a cada 30 dias"] --> B["10 consultas em paralelo ao Omie: paginas 1 a 10, 200 produtos cada"]
  B --> C["Juntar as respostas"]
  C --> D["Separar um produto por linha"]
  D --> E["Para cada produto: atualizar nome e valor em Produtos pelo cod_produto"]
  E --> F["E-mail de aviso: campos provisorios"]
:::

## Regras

- Consulta **10 páginas fixas de 200 produtos**: até 2.000 produtos. Hoje a tabela tem 903. Se o catálogo passar de 2.000, o excedente **não é atualizado**. Ver A-026.
- Para cada produto, **atualiza** (não cria) a linha de [[tabela:Produtos]] com o mesmo `cod_produto`, gravando `valor_unitario` e `nome_produto` (a descrição do Omie). Produto novo é ignorado.
- Não mexe em `inativo`, família, NCM, unidade nem características (isso é do fluxo forçado).
- **Sobrescreve** nome e valor editados à mão na tela (A-024).
- A página 10 tem um caminho de erro que não faz nada; as demais páginas não têm tratamento de erro.
- O e-mail de aviso tem destinatário, assunto e mensagem **provisórios** na exportação; não se sabe se é enviado a alguém. {{nc}}

## O que o fluxo faz, etapa por etapa

:::gerado fluxo-meta preco-produto-mensal
:::

:::gerado fluxo-nos preco-produto-mensal
:::

## Integrações, tratamento de erro e testes

| Sistema | Uso | Autenticação |
|---|---|---|
| Omie | `ListarProdutos`, 10 chamadas | Chave e segredo no corpo das chamadas (A-002; não reproduzidos). |
| Supabase | Atualização da tabela `Produtos` | Credencial do n8n do tipo `supabaseApi`. |
| Gmail | Aviso de conclusão | Credencial do n8n do tipo `gmailOAuth2`. |

- **Erros:** sem notificação de falha.
- **Reprocessar:** executar o fluxo manualmente no n8n, ou usar [[fluxo:atualiza-produto]].
- **Testar com segurança:** executa em produção e regrava nome e valor de até 903 linhas. Prefira executar a versão forçada, que também cria os produtos novos.

:::fonte
`docs/_fontes_privadas/n8n/Atualiza__o_Autom_tica_de_Pre_o_de_Produto_Mensal.json` (16 nós, lido sem copiar valores de chaves).
:::

## Ligações

[[fluxo:atualiza-produto]], [[modulo:produtos-e-servicos]], [[tabela:Produtos]], [[integracao:omie]], [[integracao:gmail]].
