# Como atualizar a documentação

Documentação estática em HTML, aberta direto no navegador (`docs/index.html`), sem servidor e sem internet.
Só precisa do Node.js (qualquer versão recente). Nenhum pacote para instalar.

## Estrutura

```
docs/
  index.html, paginas/        páginas geradas (não edite à mão: são recriadas)
  conteudo/                   textos escritos à mão, em Markdown (EDITE AQUI)
  data/
    banco.gerado.json         gerado por extrair.mjs (não editar)
    codigo.gerado.json        gerado por extrair.mjs (não editar)
    fluxos.gerado.json        gerado por extrair.mjs (não editar)
    banco.manual.json         descrição de tabelas, campos, valores, funções (EDITE AQUI)
    fluxos.manual.json        descrição das etapas de cada fluxo (EDITE AQUI)
    glossario.json            termos do glossário (EDITE AQUI)
    pontos.json               "Pontos a validar" e "Achados" (EDITE AQUI)
    changelog.json            histórico da documentação (EDITE AQUI)
    navegacao.json            seções do menu e páginas planejadas (EDITE AQUI)
    mapa_arquivos.json        qual módulo cada arquivo do src/ pertence (EDITE AQUI)
  assets/tema.css             cores, fontes e medidas (único lugar da identidade visual)
  scripts/                    extrair.mjs, gerar.mjs, verificar.mjs, extracao_banco.sql
  _fontes_privadas/           exportações do n8n, CSV do schema e resultados do SQL
```

**Regra de ouro:** arquivos `*.gerado.json` e `paginas/` são recriados por script. Descrições escritas à mão ficam em `conteudo/` e nos arquivos `*.manual.json`; os scripts nunca as apagam.

## Passo a passo

1. **Atualizar os dados do banco (só se o banco mudou).**
   - Abra `docs/scripts/extracao_banco.sql` no SQL Editor do Supabase do projeto ATG.
   - Rode **uma consulta por vez** (Q01 a Q13). São todas de leitura.
   - Para cada resultado, use *Copy > JSON* e salve em `docs/_fontes_privadas/sql_resultados/` com o nome `Q01.json`, `Q02.json`, ..., `Q04A.json`, `Q04B.json`.
   - Nas consultas que listam código (Q03, Q04A, Q04B), deixe o seletor de limite em "No limit".
   - Se algum resultado trouxer chave, token ou senha, troque por `XXX` antes de salvar.
2. **Atualizar os fluxos do n8n (só se algum fluxo mudou).** Exporte o fluxo (JSON) e coloque em `docs/_fontes_privadas/n8n/`, substituindo o antigo.
3. **Rodar a extração:**
   ```
   node docs/scripts/extrair.mjs
   ```
   Lê o CSV do schema, os resultados do SQL, o `src/` e os fluxos. Atualiza só os `*.gerado.json`.
4. **Rodar a verificação:**
   ```
   node docs/scripts/verificar.mjs
   ```
   Imprime o que existe e não está documentado, o que está documentado e não existe mais, as páginas cuja fonte mudou desde o último commit verificado, referências quebradas e possíveis segredos. Código de saída 0 = em dia, 1 = há defasagem, 2 = possível segredo.
5. **Revisar e escrever.** Para cada item do relatório:
   - campo, tabela ou função novos: descreva em `data/banco.manual.json`;
   - etapa de fluxo nova: descreva em `data/fluxos.manual.json`;
   - mudança de regra ou de tela: edite o `.md` em `conteudo/`, atualize `verificado` e `commit` no topo do arquivo;
   - algo que você não sabe explicar: deixe sem descrição (aparece como "Finalidade não identificada") e registre em `data/pontos.json`;
   - termo técnico novo: acrescente em `data/glossario.json`.
6. **Regenerar as páginas:**
   ```
   node docs/scripts/gerar.mjs
   ```
7. **Registrar a mudança** em `data/changelog.json` (data, commit, o que mudou) e rode `gerar.mjs` de novo.
8. Abra `docs/index.html` no navegador e confira as páginas alteradas.

## Como escrever em `conteudo/*.md`

Cada arquivo começa com um bloco de metadados:

```
---
titulo: Nome da página
subtitulo: Frase curta
ordem: 10
verificado: 2026-11-11
commit: 9d680f5
fontes:
  - src/pages/Clientes.tsx
---
```

A pasta onde o arquivo está define a seção do menu (`conteudo/fluxos/x.md` vira a página x da seção Fluxos). Texto: parágrafos, listas, tabelas e títulos `##` e `###` (o título principal vem do metadado).

Blocos especiais (linha própria, fechados por `:::` sozinho):

| Bloco | Para quê |
|---|---|
| `:::resumo` | "Resumo simples": até 5 linhas, sem termo técnico. Sempre visível. |
| `:::detalhes Título` | "Detalhes técnicos" recolhíveis. `+Título` abre já expandido. |
| `:::fonte` | Caixa "Fonte" com arquivo (e função). Caminhos entre crases entram no rodapé da página. |
| `:::alerta tipo Título` | Caixa de destaque. Tipos: `aviso`, `seguranca`, `info`, `nc`. |
| `:::diagrama Texto alternativo` | Diagrama Mermaid dentro do bloco. O texto alternativo é obrigatório. |
| `:::gerado nome argumento` | Bloco montado a partir dos dados. Nomes: `er`, `lista-objetos`, `usos`, `fluxo-meta`, `fluxo-nos`, `fluxo-ligacoes`, `funcoes-lista`, `funcoes-detalhe`, `valores`, `regras-banco`, `extensoes`, `secoes`, `fluxos-usam` (argumento `host:`, `cred:`, `tipo:` ou `todos:`), `pontos`. |

No texto corrido:

- `[[tabela:omie_clientes]]`, `[[fluxo:criar-cliente]]`, `[[funcao:criar_gerador]]`, `[[modulo:clientes-lista]]`, `[[pagina:controle/achados]]` criam links entre módulo, fluxo e tabela. Para trocar o rótulo: `[[tabela:omie_clientes|clientes]]`.
- `{{nc}}` (Não confirmado), `{{fi}}` (Finalidade não identificada), `{{pessoal}}` (Dado pessoal), `{{legado}}`, `{{calculado}}`, `{{naousado}}`.
- Na primeira aparição de cada página, termos do glossário viram link automaticamente.

## Regras que não podem ser quebradas

- Nunca escrever senha, token, chave de API, string de conexão ou dado real de cliente, funcionário ou fornecedor. Exemplos devem ser claramente fictícios. Para variáveis de ambiente, documentar só nome, finalidade e se é obrigatória.
- Tudo o que for escrito precisa ter fonte (arquivo e, se couber, função). O que for dedução vai marcado como "Não confirmado" e entra em `pontos.json`.
- Não corrigir código nem banco por causa da documentação. Divergências vão para `pontos.json` (categoria `achado`).
- `_fontes_privadas/` contém material sensível (exportações do n8n com chaves). Nunca copiar o conteúdo para páginas e nunca versionar. As linhas de `.git/info/exclude` impedem o versionamento da pasta `docs/` nova; remova-as só se a equipe decidir publicar.

## Situações comuns

- **Mudou uma tabela ou campo:** passos 1, 3, 4, 5 (editar `banco.manual.json`), 6, 7.
- **Mudou um fluxo no n8n:** passos 2, 3, 4, 5 (editar `fluxos.manual.json` e o `.md` do fluxo), 6, 7.
- **Mudou só texto de uma tela:** edite o `.md`, atualize `verificado` e `commit`, rode `gerar.mjs`.
- **Novo módulo ou página:** crie o `.md` em `conteudo/<seção>/`; se já estava no menu como "em breve", o item vira link sozinho. Acrescente o mapeamento do arquivo em `mapa_arquivos.json`.
