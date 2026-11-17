---
titulo: buscar-os
subtitulo: Buscar a ficha de levantamento de uma ordem de serviço no iClass
ordem: 5
resumo: Fluxo do n8n que lê o checklist de uma O.S. no iClass e o traduz para a ficha de levantamento do gerador.
verificado: 2026-11-11
commit: 9d680f5
fontes:
  - src/utils/atgBackend.ts
  - src/components/Clientes/VincularOsWizard.tsx
  - docs/_fontes_privadas/n8n/buscar_os.json
---

:::resumo
Quando alguém faz o levantamento técnico de um gerador em campo, as respostas ficam no iClass como um checklist com mais de cem perguntas soltas. Esta automação busca esse checklist pelo número da ordem de serviço e o **arruma** nos blocos da ficha de levantamento: motor, gerador, alternador, controlador, bateria, bomba injetora, filtros, mangueiras e escapamento. O que não se encaixa em nenhum bloco vai para "outros", sem perder nada.

Ela só **consulta**. Quem grava a ficha no gerador é a aba [[modulo:ficha-de-levantamento]], depois da confirmação.
:::

## Gatilho

- **Tipo:** webhook `POST` em `/webhook/buscar-os`.
- **Quem chama:** a função `buscarOs` de `src/utils/atgBackend.ts`, usada pela busca de ficha ([[modulo:ficha-de-levantamento]]).
- **Autenticação do webhook:** nenhuma configurada. {{nc}}

:::alerta nc O ativo enviado não é usado
A tela envia `ativo_id` e `codigo_os`. O fluxo só usa o código da O.S. na chamada ao iClass: o `ativo_id` não aparece em nenhum nó. Pela leitura, nada confere se a ordem de serviço informada é mesmo do equipamento do gerador, e a ficha da O.S. errada seria vinculada sem aviso. Não testado. Registrado como V-024.
:::

## Diagrama do fluxo

:::diagrama Fluxo buscar-os: confere o limite, lê o checklist da O.S. no iClass, traduz para a ficha de levantamento e devolve.
flowchart TD
  A["POST buscar-os com codigo da O.S."] --> B["Checar limite de chamadas"]
  B -->|esgotado| B1["rate_limit_excedido"]
  B -->|pode| C["iClass: GET serviceorders checklist"]
  C --> D{"Veio checklist?"}
  D -->|nao| D1["os_sem_checklist"]
  D -->|sim| E["Traduzir perguntas para a ficha"]
  E --> F["ok: checklist_pesquisa_id e ficha_levantamento"]
:::

## Dados enviados e recebidos (exemplo fictício)

:::detalhes Entrada e saída (exemplos inventados)
```
POST /webhook/buscar-os
{ "ativo_id": 123456, "codigo_os": "OS-0000" }

Sucesso (trecho):
{ "ok": true, "checklist_pesquisa_id": 987654, "data_pesquisa": "2026-01-01",
  "ficha_levantamento": {
    "motor": { "fabricante": "Fabricante Exemplo", "modelo": "Modelo X", "num_serie": "SN-0000", "capacidade_oleo_baldes": null },
    "filtros": { "ar_primario": { "qtd": "1", "codigo": "COD-EXEMPLO", "fabricante": "Fabricante Exemplo" } },
    "mangueiras": { "combustivel_retorno": { "metros": "2", "polegadas": "1/2" } },
    "outros": [ { "secao": "GERAL", "pergunta": "...", "resposta": "..." } ] } }

Falhas: { "ok": false, "motivo": "os_sem_checklist" }
        { "ok": false, "motivo": "rate_limit_excedido", "mensagem": "..." }
```
:::

## Como a tradução funciona

- O fluxo procura cada pergunta pelo **texto exato**, em maiúsculas e sem espaços repetidos, por exemplo `[MOTOR] MODELO:` ou `[FILTROS] AR - PRIMARIO - CÓDIGO`. Se alguém mudar o texto de uma pergunta no iClass, o campo correspondente deixa de ser preenchido e a pergunta passa a aparecer em "outros".
- Resposta vazia vira `null`.
- Perguntas do tipo "Foto" são descartadas.
- Os 10 tipos de filtro (combustível, lubrificante, água, separador e ar, cada um primário e secundário) levam quantidade, código e fabricante. As 4 mangueiras levam metros e polegadas.

## Resultados possíveis

| Resposta | O que significa | O que a tela mostra |
|---|---|---|
| `ok: true` | Checklist encontrado e traduzido. | "Checklist #N encontrado. Confira os dados abaixo antes de confirmar." |
| `os_sem_checklist` | O iClass não devolveu checklist para a O.S. | "OS não localizada, confira o ID." |
| `rate_limit_excedido` | Limite de chamadas esgotado. | Aviso de iClass sobrecarregado. |
| `erro_comunicacao` | Gerado pelo front se o n8n não responder. | "Não foi possível se comunicar com o servidor." |

## O que o fluxo faz, etapa por etapa

:::gerado fluxo-meta buscar-os
:::

:::gerado fluxo-nos buscar-os
:::

:::detalhes Ligações entre as etapas
:::gerado fluxo-ligacoes buscar-os
:::
:::

## Integrações, tabelas e regras

- **iClass:** `GET /serviceorders/<código da O.S.>/checklist/`, credencial do n8n do tipo `httpBearerAuth`. Falhas do iClass não interrompem o fluxo (`continueRegularOutput`) e aparecem como `os_sem_checklist`.
- **Banco:** só a função [[funcao:consumir_rate_limit_iclass]] ([[tabela:rate_limit_iclass]]).
- **Se o checklist tem mais de um levantamento:** o fluxo usa apenas o primeiro item da lista devolvida.
- **Reprocessar:** repetir a busca pela tela. Nenhum alerta é enviado.

## Como testar com segurança

É só leitura. Use uma O.S. de levantamento conhecida e confira o resultado no passo de revisão da tela, sem confirmar a gravação.

:::fonte
`docs/_fontes_privadas/n8n/buscar_os.json` (11 nós, lido sem copiar valores de chaves), `src/utils/atgBackend.ts` (`buscarOs`).
:::

## Ligações

[[modulo:ficha-de-levantamento]], [[modulo:gerador]], [[funcao:consumir_rate_limit_iclass]], [[integracao:iclass]].
