---
titulo: Funções do banco (RPCs e apoio)
subtitulo: As funções que a plataforma, o n8n e o próprio banco executam
ordem: 2
resumo: Lista das 19 funções do banco usadas pelo núcleo, com resumo, regras e código.
verificado: 2026-11-11
commit: 9d680f5
fontes:
  - docs/scripts/extracao_banco.sql
---

:::resumo
Algumas tarefas são feitas por funções guardadas no próprio banco, em vez de pelo navegador. Isso garante que um conjunto de passos aconteça junto: por exemplo, criar um gerador e já registrar no histórico quem o criou.

Há três tipos: funções que a **plataforma** chama (criar gerador, salvar preditiva, validar cadastro), funções que o **n8n** chama (controle do limite do iClass) e funções de **apoio** à importação da planilha de preditivas e à comparação de nomes.
:::

## Lista

:::gerado funcoes-lista
:::

## Detalhe de cada função

:::gerado funcoes-detalhe
:::
