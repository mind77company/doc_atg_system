---
titulo: criar-cliente
subtitulo: Cadastro de um novo cliente no Omie e no iClass, a partir de um formulário só
ordem: 1
resumo: Fluxo do n8n que cria o cliente no Omie e no iClass e devolve o resultado para a plataforma gravar.
verificado: 2026-11-11
commit: 9d680f5
fontes:
  - src/components/Clientes/CriarClienteWizard.tsx
  - src/utils/atgBackend.ts
  - src/pages/Clientes.tsx
  - docs/_fontes_privadas/n8n/Cadastrar_cliente_Iclass.json
---

:::resumo
Quando alguém da ATG cadastra um cliente novo na plataforma, preenche o formulário uma vez só. A plataforma envia os dados para uma automação, que cria o cliente primeiro no Omie e depois no iClass, para os dois sistemas ficarem com o mesmo cadastro.

Se o Omie recusar, nada é criado e a pessoa pode corrigir e tentar de novo. Se o Omie aceitar mas o iClass falhar ou estiver sobrecarregado, o cliente fica salvo na plataforma com um aviso de pendência no iClass, e a pessoa completa o cadastro depois.

O resultado para o negócio é um cliente já cadastrado nos dois sistemas, sem digitar duas vezes.
:::

## Quem usa e quando acontece

- **Quem:** administradores e usuários comuns. O botão "Novo Cliente" não aparece para o perfil vendedor (`somenteLeitura` em `src/pages/Clientes.tsx`).
- **Quando:** a pessoa clica em "Novo Cliente" na tela [[modulo:clientes-lista]], preenche o formulário e clica em "Criar Cliente". A tela do formulário é descrita em [[modulo:criar-cliente]].

:::fonte
`src/pages/Clientes.tsx` (botão e perfil), `src/components/Clientes/CriarClienteWizard.tsx` (formulário)
:::

## Gatilho

- **Tipo:** chamada externa (webhook) com o método `POST` no caminho `/webhook/criar-cliente` do servidor n8n da ATG.
- **Quem chama:** só o código do navegador, na função `criarCliente` de `src/utils/atgBackend.ts`. Nenhum outro arquivo do projeto chama este webhook.
- **Autenticação do webhook:** nenhuma configurada no nó de entrada (`options` vazio). Quem souber o endereço pode chamá-lo. {{nc}} Não foi verificado se há proteção na frente do n8n (proxy ou regra de rede).

## O que a pessoa vê, passo a passo

1. Abre o modal "Novo Cliente (Omie + iClass)".
2. Preenche 13 campos obrigatórios (razão social, nome fantasia, CNPJ/CPF, e-mail, DDD e número do telefone, celular, endereço, número, bairro, cidade, estado, CEP) e, se quiser, a observação.
3. Clica em "Criar Cliente". Se faltar campo, o formulário mostra o aviso na hora e **nem chama** o fluxo.
4. O botão mostra "Criando...". O fluxo pode demorar mais se o iClass estiver no limite de chamadas.
5. Recebe uma das respostas da tabela "Resultados possíveis" mais abaixo.

## Diagrama do fluxo

### Visão geral

:::diagrama Fluxo criar-cliente, visão geral: valida os dados, cria no Omie, cria no iClass, busca o identificador e devolve um dos resultados.
flowchart TD
  A["Front-end valida os 13 campos"] -->|tudo preenchido| B["POST criar-cliente"]
  A -->|faltou campo| A1["Aviso na tela, fluxo nao e chamado"]
  B --> C["Preparar dados e conferir campos"]
  C -->|campo vazio| C1["campos_faltando"]
  C -->|ok| D["Criar no Omie"]
  D -->|recusou| D1["falha_omie: nada criado"]
  D -->|aceitou| E["Criar no iClass, com checagem de limite"]
  E -->|recusou ou limite esgotado| E1["iclass_pendente"]
  E -->|aceitou| F["Buscar o ID no iClass, com checagem de limite"]
  F -->|limite esgotado ou sem ID| F1["iclass_sem_id"]
  F -->|achou o ID| F2["completo"]
:::

### Checagem do limite de chamadas (usada antes de cada chamada ao iClass)

:::diagrama Checagem do limite de chamadas ao iClass: pergunta ao banco se pode chamar; se nao puder, espera e tenta de novo, no maximo 5 vezes.
flowchart TD
  S["Perguntar ao banco: consumir_rate_limit_iclass"] --> T{"Pode chamar agora?"}
  T -->|sim| U["Chamar o iClass"]
  T -->|nao| V{"Menos de 5 tentativas?"}
  V -->|sim| W["Esperar o tempo indicado pelo banco"]
  W --> S
  V -->|nao| X["Desiste e devolve o resultado parcial"]
:::

### Quem fala com quem

:::diagrama Sequência: a plataforma chama o n8n, que chama o Omie, o banco (limite de chamadas) e o iClass, e devolve o resultado, depois a plataforma grava o cliente.
sequenceDiagram
  participant F as Plataforma (navegador)
  participant N as n8n (criar-cliente)
  participant O as Omie
  participant B as Banco (Supabase)
  participant I as iClass
  F->>N: POST dados do cliente
  N->>O: IncluirCliente
  O-->>N: codigo do cliente no Omie
  N->>B: consumir_rate_limit_iclass
  B-->>N: permitido ou espera
  N->>I: POST customers
  I-->>N: sucesso
  N->>B: consumir_rate_limit_iclass
  N->>I: GET customers com o codigo de integracao
  I-->>N: dados e URLs do cliente
  N-->>F: status e codigos
  F->>B: grava omie_clientes e log_edicoes
:::

## Resultados possíveis

A resposta sempre traz `ok` (verdadeiro ou falso) e `status`. O `ok: false` só ocorre quando **nada** foi criado.

| Status | O que aconteceu | O que a plataforma faz |
|---|---|---|
| `completo` | Criado no Omie e no iClass, e o identificador do iClass foi obtido. | Grava o cliente e mostra "Cliente criado com sucesso nos dois sistemas!". |
| `iclass_sem_id` | Criado nos dois, mas não foi possível confirmar o identificador do iClass (por exemplo, limite de chamadas esgotado na busca). | Grava o cliente com o identificador vazio e avisa: conferir e completar pelo botão "Corrigir cadastro iClass". |
| `iclass_pendente` | Criado no Omie; o iClass recusou ou estava sobrecarregado. | Grava o cliente com `iclass_pendente = true` e avisa para finalizar manualmente no iClass. |
| `falha_omie` | O Omie recusou. Nada foi criado. | Mostra o erro e a mensagem "Nada foi cadastrado". Nada é gravado. |
| `campos_faltando` | Algum campo obrigatório chegou vazio. Nada foi criado. | Marca os campos faltantes no formulário. |
| `erro_comunicacao` | O sistema não conseguiu falar com o n8n ou a resposta veio fora do formato esperado. Gerado pelo próprio front. | Mostra "Não foi possível se comunicar com o servidor. Tente novamente." |

:::alerta nc Status rate_limit_excedido
O front trata também um status `rate_limit_excedido` (`CriarClienteRateLimitOuErro`), mas o fluxo exportado nunca o devolve: quando o limite esgota, responde `iclass_pendente` ou `iclass_sem_id`. A ramificação parece sem uso para este fluxo. Registrado em [[pagina:controle/pontos-a-validar]].
:::

## O que o fluxo faz, etapa por etapa

:::gerado fluxo-meta criar-cliente
:::

:::gerado fluxo-nos criar-cliente
:::

:::detalhes Ligações entre as etapas (de onde para onde)
:::gerado fluxo-ligacoes criar-cliente
:::
:::

:::fonte
`docs/_fontes_privadas/n8n/Cadastrar_cliente_Iclass.json` (29 nós; lido sem copiar nenhum valor de chave, cabeçalho ou parâmetro).
:::

## Dados enviados e recebidos (exemplo fictício)

Os dados abaixo são **exemplos inventados**, não pertencem a nenhum cliente real.

:::detalhes Corpo da chamada ao webhook (exemplo)
```
POST /webhook/criar-cliente
{
  "razao_social": "EMPRESA EXEMPLO LTDA",
  "nome_fantasia": "Exemplo",
  "cnpj_cpf": "00000000000000",
  "email": "contato@exemplo.invalid",
  "telefone_ddd": "11",
  "telefone_numero": "40000000",
  "celular": "11900000000",
  "endereco": "Rua Exemplo",
  "endereco_numero": "100",
  "bairro": "Centro",
  "cidade": "Sao Paulo",
  "estado": "SP",
  "cep": "00000000",
  "observacao": "",
  "usuario": "pessoa@exemplo.invalid"
}
```
O campo `usuario` é o e-mail de quem está logado. O fluxo não o usa para decidir nada: apenas o devolve na resposta. O formulário já tira a pontuação do CNPJ/CPF antes de enviar, e o fluxo deixa só números no CNPJ/CPF, no celular e no CEP.
:::

:::detalhes Resposta de sucesso completo (exemplo)
```
{
  "ok": true,
  "status": "completo",
  "mensagem": "Cliente criado com sucesso nos dois sistemas.",
  "codigo_integracao": "ATG_00000000000000",
  "codigo_cliente_omie": 1234567,
  "iclass_id": 7654321,
  "iclass_nome": "EMPRESA EXEMPLO LTDA",
  "iclass_codigo": "ATG_00000000000000",
  "omie_ok": true,
  "iclass_ok": true
}
```
O fluxo também devolve de volta `usuario` e `dados` (o que foi enviado, já tratado). Os números do exemplo são inventados.
:::

## Integrações externas chamadas

| Sistema | Chamada | Para quê | Autenticação |
|---|---|---|---|
| Omie | `POST /api/v1/geral/clientes/` com `call = IncluirCliente` | Criar o cliente. O código de integração (`ATG_` + CNPJ) identifica o cliente no Omie. | Chave e segredo da API informados dentro do corpo da chamada (ver achado A-002; valores não reproduzidos). |
| iClass | `POST /customers/` | Criar o cliente: código, nome (razão social), CNPJ/CPF, telefone, celular, e-mail e observação. | Credencial do n8n do tipo `httpBearerAuth` (token no portador). |
| iClass | `GET /customers/?code=<código de integração>` | Descobrir o identificador numérico do cliente recém-criado, porque o `POST` não o devolve. | Mesma credencial. |
| Banco de dados | Função `consumir_rate_limit_iclass` pelo endereço REST do banco | Controlar o limite de 25 chamadas por minuto ao iClass. | Chave anon do Supabase (tipo conferido, valor não reproduzido), informada nos cabeçalhos do nó. |

Os campos enviados ao Omie incluem telefone (DDD e número), endereço, bairro, cidade, estado, CEP e e-mail. O **celular** e a **observação** vão só ao iClass.

:::fonte
`docs/_fontes_privadas/n8n/Cadastrar_cliente_Iclass.json`, `src/utils/atgBackend.ts` (função `criarCliente`, `callWebhook`).
:::

## Tabelas e campos lidos e gravados

O fluxo em si **não lê nem grava tabelas diretamente**, exceto pela função de limite de chamadas. Quem grava o cliente é o navegador, depois de receber a resposta.

| Momento | Quem faz | Tabela | O que lê ou grava |
|---|---|---|---|
| Checar limite (duas vezes, cada tentativa) | n8n, pela função [[funcao:consumir_rate_limit_iclass]] | [[tabela:rate_limit_iclass]] | Lê e atualiza `janela_inicio` e `contagem` da única linha. |
| Depois de qualquer sucesso (`completo`, `iclass_sem_id`, `iclass_pendente`) | Navegador (`CriarClienteWizard.tsx`) | [[tabela:omie_clientes]] | Insere: `razao_social`, `nome_fantasia`, `cnpj_raw` (formatado), `cnpj_limpo`, `codigo_omie`, `iclass_id_encontrado`, `iclass_nome`, `iclass_codigo_encontrado`, `iclass_pendente`. Os demais campos ficam com o padrão (`validado = false`, `inativo = false`). |
| Logo depois da gravação | Navegador, por `registrarLog` | [[tabela:log_edicoes]] | Uma linha com `entidade = cliente`, `acao = criou_cliente` (ou `criou_cliente_iclass_pendente`), `valor_antes` vazio e `valor_depois` com o que foi inserido. |

:::alerta info O que acontece com os campos de contato e endereço
Telefone, e-mail, endereço (rua, número, bairro, cidade, estado e CEP), celular e observação **são enviados aos sistemas externos, mas não são gravados** em `omie_clientes` (a tabela não tem esses campos). O endereço vai só ao Omie; o celular e a observação vão só ao iClass; telefone e e-mail vão aos dois. Depois do cadastro, esses dados só existem nos sistemas externos.
:::

## Regras de negócio

- Os 13 campos são obrigatórios, no formulário e de novo dentro do fluxo (dupla conferência). A observação é opcional.
- O Omie é criado **primeiro**. Se ele falhar, o iClass nem é chamado.
- O código de integração é sempre `ATG_` seguido dos números do CNPJ/CPF. Ele é o elo entre Omie, iClass e a busca do identificador.
- O cliente **nunca é perdido**: depois que o Omie aceita, a plataforma grava o cliente mesmo que o iClass tenha falhado.
- O iClass limita as chamadas a 25 por minuto. Antes de cada chamada ao iClass, o fluxo pergunta ao banco se cabe mais uma. Se não couber, espera o tempo indicado e tenta de novo, até 5 vezes. Passando disso, desiste e devolve o resultado parcial.

:::detalhes Regras de gravação no navegador
- Em `iclass_sem_id`, o código grava `iclass_id_encontrado` vazio e `iclass_pendente = false`. Como a regra do estado do cliente (view [[tabela:vw_cliente_card]]) usa só o identificador do iClass, o cliente aparece no estado `SEM_ICLASS`, **sem** o selo "Pendente iClass". Deduzido da leitura do código e da view, não testado.
- Se o `INSERT` em `omie_clientes` falhar depois de o Omie já ter criado o cliente, a tela mostra o código do Omie e o erro, e **nada é feito automaticamente**: o cliente existe no Omie e no iClass, mas não na plataforma.
:::

:::fonte
`src/components/Clientes/CriarClienteWizard.tsx` (função `handleSubmit`), `src/utils/logEdicoes.ts`, view `vw_cliente_card` (extração Q03).
:::

## Tratamento de erro, tentativas e reprocessamento

| Situação | Tentativas | Notificação | Como resolver |
|---|---|---|---|
| Campo obrigatório vazio | Nenhuma | Aviso no formulário | Preencher e enviar de novo. |
| Omie recusou | Nenhuma | Mensagem na tela com o erro do Omie | Corrigir os dados (por exemplo, CNPJ já cadastrado, {{nc}} ainda não confirmado se o Omie recusa duplicado) e tentar de novo. Nada foi criado. |
| iClass recusou | Nenhuma | Aviso amarelo | Criar o cliente no iClass manualmente, com o mesmo código `ATG_` + CNPJ, e depois usar **Corrigir cadastro iClass** na plataforma para ligar os dois. |
| Limite do iClass esgotado | Até 5, com espera entre elas | Aviso amarelo (`iclass_pendente` ou `iclass_sem_id`) | Aguardar um pouco e completar com **Corrigir cadastro iClass**. |
| Sem resposta do n8n (rede, servidor fora, resposta fora do formato) | Nenhuma | "Não foi possível se comunicar com o servidor" | Tentar de novo. {{nc}} Se o Omie chegou a criar o cliente antes da falha, uma nova tentativa envia o mesmo código de integração; o comportamento do Omie nesse caso não foi verificado. |
| Gravação no banco falhou depois do Omie | Nenhuma | Mensagem com o código do Omie | Cadastro manual ou ajuste com o time técnico. Não há reprocessamento automático. |

Não há nenhum e-mail, WhatsApp ou alerta de falha neste fluxo: o aviso aparece só na tela de quem está cadastrando. {{nc}} Tempo limite de cada chamada: nenhum foi configurado nos nós; vale o padrão do n8n.

## Como testar com segurança

:::alerta aviso Cada teste completo cria clientes de verdade
Um cadastro que chega até o fim cria um cliente no Omie e outro no iClass, e este fluxo **não tem etapa de exclusão**. Não use dados de clientes reais.
:::

- **Teste sem efeito:** chamar o webhook com um campo obrigatório vazio. O fluxo responde `campos_faltando` e não toca em nenhum sistema.
- **Teste completo:** só com um CNPJ e dados de teste combinados com o responsável pelo Omie e pelo iClass, sabendo que será preciso inativar ou remover os cadastros depois, manualmente, nos dois sistemas. {{nc}} Não foi identificado um ambiente de testes (sandbox) de nenhum dos dois.
- Para ver a execução, abrir o histórico de execuções do fluxo no n8n.

## Ligações com o resto da documentação

- Telas: [[modulo:clientes-lista]], [[modulo:criar-cliente]] e [[modulo:corrigir-iclass]].
- Tabelas: [[tabela:omie_clientes]], [[tabela:log_edicoes]], [[tabela:rate_limit_iclass]].
- Função do banco: [[funcao:consumir_rate_limit_iclass]].
- Integrações: [[integracao:omie]], [[integracao:iclass]], [[integracao:n8n]].
