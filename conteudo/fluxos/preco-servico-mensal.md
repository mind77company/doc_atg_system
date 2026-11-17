---
titulo: Preço de serviços (mensal)
subtitulo: A atualização automática de preços de serviços a cada 30 dias
resumo: Fluxo agendado do n8n que lê a primeira página de serviços do Omie e atualiza valor e descrição no banco.
ordem: 13
verificado: 2026-11-12
commit: 8db54a9
fontes:
  - docs/_fontes_privadas/n8n/Atualiza__o_Autom_tica_de_pre_o_do_Servi_o_Mensal.json
---

:::resumo
A cada 30 dias, sozinha, esta automação consulta o **Omie** e atualiza no banco da plataforma o **valor** e a **descrição** dos serviços já cadastrados. É a única que atualiza o valor que a tela de Serviços realmente mostra.

Consulta só a primeira página do cadastro (100 serviços) e só atualiza o que já existe.
:::

## Gatilho

- **Tipo:** agendamento a cada **30 dias** (nó "MENSAL"). {{nc}} Data da primeira execução não consta na exportação.
- **Quem chama:** o próprio n8n.
- **Situação na exportação:** ativo.

## Diagrama do fluxo

:::diagrama Fluxo mensal de serviços: a cada 30 dias consulta a primeira página do Omie e atualiza valor e descrição de cada serviço.
flowchart TD
  A["Agenda: a cada 30 dias"] --> B["Omie: ListarCadastroServico, pagina 1, 100 registros"]
  B --> C["Separar um servico por linha"]
  C --> D["Para cada servico: atualizar valor e descricao em Servicos pelo nCodServ"]
  D --> E["E-mail de aviso: campos provisorios"]
:::

## Regras

- Só a **primeira página de 100** é lida. Hoje há 41 serviços. Se passar de 100, o excedente não é atualizado (A-026).
- Para cada serviço, **atualiza** (não cria) a linha de [[tabela:Serviços]] com o mesmo `nCodServ`: `nValorDesc` recebe o preço unitário do Omie e `cDescricao` recebe a **descrição completa**.
- Não mexe em `inativo` nem nas demais colunas.
- **Sobrescreve** o valor mostrado na tela, e a descrição, a cada execução.
- O fluxo forçado ([[fluxo:atualiza-servico]]) escreve em colunas diferentes (A-025).
- O e-mail de aviso tem campos provisórios. {{nc}}

## O que o fluxo faz, etapa por etapa

:::gerado fluxo-meta preco-servico-mensal
:::

:::gerado fluxo-nos preco-servico-mensal
:::

## Integrações, tratamento de erro e testes

| Sistema | Uso | Autenticação |
|---|---|---|
| Omie | `ListarCadastroServico` | Chave e segredo no corpo da chamada (A-002; não reproduzidos). |
| Supabase | Atualização da tabela `Serviços` | Credencial do n8n do tipo `supabaseApi`. |
| Gmail | Aviso de conclusão | Credencial do n8n do tipo `gmailOAuth2`. |

- **Erros:** sem tratamento nem notificação.
- **Reprocessar:** executar manualmente no n8n.
- **Testar com segurança:** executa em produção, regravando os 41 serviços. Poucas linhas, mas é gravação real.

:::fonte
`docs/_fontes_privadas/n8n/Atualiza__o_Autom_tica_de_pre_o_do_Servi_o_Mensal.json` (5 nós, lido sem copiar valores de chaves).
:::

## Ligações

[[fluxo:atualiza-servico]], [[modulo:produtos-e-servicos]], [[tabela:Serviços]], [[integracao:omie]], [[integracao:gmail]].
