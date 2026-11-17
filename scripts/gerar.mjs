#!/usr/bin/env node
// Monta as páginas HTML da documentação a partir de:
//   docs/conteudo/**/*.md        textos escritos à mão (resumos, regras de negócio, passo a passo)
//   docs/data/*.json             dados gerados (banco/codigo/fluxos) e manuais (banco.manual, glossario, pontos...)
// Saída: docs/index.html, docs/paginas/**, docs/assets/busca-indice.js, docs/data/verificacao.json
//
// Uso: node docs/scripts/gerar.mjs
// Sem dependências. Abra docs/index.html direto no navegador.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { esc, slugify, selo, inline, blocos, separarFrontMatter, textoPuroDeHtml } from "./lib/md.mjs";

const AQUI = path.dirname(fileURLToPath(import.meta.url));
const DOCS = path.resolve(AQUI, "..");
const DATA = path.join(DOCS, "data");
const CONTEUDO = path.join(DOCS, "conteudo");
const SAIDA_PAGINAS = path.join(DOCS, "paginas");
const NOME = "QUIRON ATG SYSTEM";
const SUBTITULO = "ATG | Sistema de Ordem de Serviços e Orçamentos";

const lerJson = (n, padrao) => {
  const p = path.join(DATA, n);
  return fs.existsSync(p) ? JSON.parse(fs.readFileSync(p, "utf8").replace(/^﻿/, "")) : padrao;
};

const banco = lerJson("banco.gerado.json", { meta: {}, objetos: {}, funcoes: {}, valores: {} });
const bancoManual = lerJson("banco.manual.json", { objetos: {}, funcoes: {} });
const codigo = lerJson("codigo.gerado.json", { tabelas: {}, rpcs: {}, variaveis_ambiente: {}, webhooks_chamados_pelo_front: {} });
const fluxosGer = lerJson("fluxos.gerado.json", { fluxos: [] });
const fluxosMan = lerJson("fluxos.manual.json", { fluxos: {} });
const glossario = lerJson("glossario.json", { termos: [] }).termos;
const navegacao = lerJson("navegacao.json", { secoes: [] });
const mapaArquivos = lerJson("mapa_arquivos.json", {});
const pontos = lerJson("pontos.json", { itens: [] }).itens;
const changelog = lerJson("changelog.json", { entradas: [] }).entradas;
const META = banco.meta || {};
const COMMIT = META.commit || "desconhecido";
const DATA_VERIF = META.gerado_em || new Date().toISOString().slice(0, 10);

// ----------------------------------------------------------------------- registro de páginas
/** pagina: {id, secao, slug, titulo, url, ordem, resumo, tipo, corpo(md)|gerar(fn), fontes[], verificado, commit} */
const paginas = new Map();
const aviso = [];
const urlDe = (secao, slug) => (secao === "raiz" ? `paginas/${slug}.html` : secao === "inicio" ? "index.html" : `paginas/${secao}/${slug}.html`);
function registrar(p) {
  p.id = `${p.secao}/${p.slug}`;
  p.url = urlDe(p.secao, p.slug);
  if (paginas.has(p.id)) aviso.push(`página duplicada: ${p.id}`);
  paginas.set(p.id, p);
}

// conteúdo escrito à mão
function varrer(dir, acc = []) {
  if (!fs.existsSync(dir)) return acc;
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) varrer(p, acc); else if (e.name.endsWith(".md")) acc.push(p);
  }
  return acc;
}
for (const arq of varrer(CONTEUDO)) {
  const { meta, corpo } = separarFrontMatter(fs.readFileSync(arq, "utf8"));
  const relp = path.relative(CONTEUDO, arq).split(path.sep).join("/");
  const partes = relp.replace(/\.md$/, "").split("/");
  const slug = partes.pop();
  const secao = partes.length ? partes[0] : "raiz";
  registrar({
    secao: slug === "index" && !partes.length ? "inicio" : secao, slug, titulo: meta.titulo || slug, subtitulo: meta.subtitulo || "",
    ordem: Number(meta.ordem ?? 50), resumo: meta.resumo || "", corpo, fontes: meta.fontes || [], verificado: meta.verificado || DATA_VERIF,
    commit: meta.commit || COMMIT, arquivoMd: "docs/conteudo/" + relp, grupo: meta.grupo || ""
  });
}

// páginas de banco geradas a partir dos dados
const slugObj = (nome) => "t-" + slugify(nome);
const documentados = Object.entries(bancoManual.objetos || {}).filter(([, o]) => o.documentar !== false).map(([n]) => n);
for (const nome of documentados) {
  const m = bancoManual.objetos[nome];
  registrar({
    secao: "banco", slug: slugObj(nome), titulo: nome, subtitulo: m.titulo || "", ordem: 100 + (m.ordem ?? 50), resumo: m.resumo || "", gerar: "objeto-banco",
    objeto: nome, fontes: m.fontes || [], verificado: m.verificado || DATA_VERIF, commit: m.commit || COMMIT, grupo: m.grupo || ""
  });
}
// páginas geradas fixas
registrar({ secao: "raiz", slug: "glossario", titulo: "Glossário", subtitulo: "Termos de negócio e técnicos, em linguagem simples", ordem: 10, gerar: "glossario", fontes: ["docs/data/glossario.json"], verificado: DATA_VERIF, commit: COMMIT, resumo: "Definições dos termos usados na documentação" });
for (const [slug, titulo, sub] of [
  ["pontos-a-validar", "Pontos a validar com a equipe", "O que é dedução, o que não ficou claro e precisa de confirmação"],
  ["achados", "Achados e inconsistências", "Código morto, duplicidades, divergências entre código e banco e alertas de segurança"]
]) registrar({ secao: "controle", slug, titulo, subtitulo: sub, ordem: slug === "pontos-a-validar" ? 10 : 20, gerar: slug, fontes: ["docs/data/pontos.json"], verificado: DATA_VERIF, commit: COMMIT, resumo: sub });
registrar({ secao: "controle", slug: "changelog", titulo: "Histórico de alterações da documentação", subtitulo: "O que mudou na documentação, quando e em qual commit", ordem: 30, gerar: "changelog", fontes: ["docs/data/changelog.json"], verificado: DATA_VERIF, commit: COMMIT, resumo: "Changelog da documentação" });

// ----------------------------------------------------------------------- navegação
const planejadas = new Map(); // id -> titulo
for (const s of navegacao.secoes) for (const p of s.planejadas || []) planejadas.set(`${s.id}/${p.slug}`, p.titulo);

function raizDe(url) {
  const prof = url.split("/").length - 1;
  return "../".repeat(prof);
}

// ----------------------------------------------------------------------- utilidades de banco
const nomeBancoValido = (n) => bancoManual.objetos?.[n] && bancoManual.objetos[n].documentar !== false;
function parseFk(def) {
  const m = def.match(/FOREIGN KEY \(([^)]+)\) REFERENCES ([\w."]+)\(([^)]+)\)(.*)$/);
  if (!m) return null;
  const alvo = m[2].replace(/^public\./, "").replace(/"/g, "");
  const del = (m[4].match(/ON DELETE ([A-Z ]+?)(?: ON UPDATE|$)/) || [])[1] || "NO ACTION";
  const upd = (m[4].match(/ON UPDATE ([A-Z ]+?)(?: ON DELETE|$)/) || [])[1] || "NO ACTION";
  return { coluna: m[1], alvo, alvoColuna: m[3], aoApagar: del.trim(), aoAtualizar: upd.trim() };
}
const TRAD_ACAO = {
  "CASCADE": "apaga junto (em cascata)", "SET NULL": "limpa a ligação (fica vazio)", "NO ACTION": "bloqueia a exclusão enquanto houver ligação", "RESTRICT": "bloqueia", "SET DEFAULT": "volta ao valor padrão"
};
function fksDe(nome) {
  const o = banco.objetos[nome];
  return (o?.restricoes || []).filter((r) => r.tipo === "f").map((r) => ({ nome: r.nome, ...parseFk(r.definicao) })).filter((x) => x.coluna);
}
function referenciadoPor(nome) {
  const lista = [];
  for (const [n, o] of Object.entries(banco.objetos)) {
    for (const r of o.restricoes || []) {
      if (r.tipo !== "f") continue;
      const fk = parseFk(r.definicao);
      if (fk && fk.alvo === nome) lista.push({ de: n, ...fk });
    }
  }
  return lista;
}
function unicoColuna(nome, coluna) {
  return (banco.objetos[nome]?.restricoes || []).some((r) => (r.tipo === "u" || r.tipo === "p") && new RegExp(`\\((?:${coluna})\\)`).test(r.definicao));
}
function usoEmFuncoesEViews(nome) {
  const re = new RegExp(`(?<![\\w])(?:public\\.)?"?${nome.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}"?(?![\\w])`, "i");
  const achou = [];
  for (const f of Object.values(banco.funcoes)) if (re.test(f.corpo.split("\n").slice(1).join("\n")) && f.nome !== nome) achou.push({ tipo: "função", nome: f.nome });
  for (const [n, o] of Object.entries(banco.objetos)) if (o.definicao_view && n !== nome && re.test(o.definicao_view)) achou.push({ tipo: "view", nome: n });
  return achou;
}

// ----------------------------------------------------------------------- contexto de renderização
function novoContexto(pagina) {
  const ctx = {
    toc: [], fontes: new Set(pagina.fontes || []), avisos: [], temDiagrama: false, ids: new Map(), termosUsados: new Set(),
    idUnico(base) {
      const n = (this.ids.get(base) || 0) + 1;
      this.ids.set(base, n);
      return n === 1 ? base : `${base}-${n}`;
    },
    registrarFonte(f) { if (/[\/.]/.test(f) && !/\s/.test(f)) this.fontes.add(f.replace(/[:#].*$/, "")); },
    referencia(tipo, id, rotulo) { return referenciaHtml(tipo, id, rotulo, pagina, ctx); },
    gerado(nome, arg) { return geradoHtml(nome, arg, pagina, ctx); }
  };
  return ctx;
}

const referenciasQuebradas = [];
const referenciasPlanejadas = new Set();
function referenciaHtml(tipo, id, rotulo, pagina, ctx) {
  let alvoId = null, texto = rotulo, ancora = "", classe = "tag", usarCodigo = false;
  switch (tipo) {
    case "tabela": alvoId = `banco/${slugObj(id)}`; texto ??= id; usarCodigo = true; break;
    case "funcao": alvoId = "banco/funcoes"; ancora = "#" + slugify(id); texto ??= id; usarCodigo = true; break;
    case "fluxo": alvoId = `fluxos/${id}`; classe = "tag fluxo"; texto ??= fluxosMan.fluxos?.[id]?.titulo || paginas.get(alvoId)?.titulo || planejadas.get(alvoId) || id; break;
    case "modulo": alvoId = `modulos/${id}`; texto ??= planejadas.get(alvoId) || id; break;
    case "pagina": alvoId = id; texto ??= paginas.get(id)?.titulo || planejadas.get(id) || id; break;
    case "integracao": alvoId = `integracoes/${id}`; texto ??= planejadas.get(alvoId) || id; break;
    case "termo": { const t = glossario.find((g) => g.id === id); alvoId = "raiz/glossario"; ancora = "#" + id; texto ??= t ? t.termo : id; classe = "tag"; break; }
    default: return `<span class="tag pendente">${esc(rotulo || id)}</span>`;
  }
  const conteudo = usarCodigo && !rotulo ? `<code>${esc(texto)}</code>` : esc(texto);
  const alvo = paginas.get(alvoId);
  if (alvo) {
    const href = raizDe(pagina.url) + alvo.url + ancora;
    return `<a class="${classe}" href="${href}">${conteudo}</a>`;
  }
  if (planejadas.has(alvoId)) {
    referenciasPlanejadas.add(`${pagina.id} -> ${alvoId}`);
    return `<span class="tag pendente" title="Página ainda não escrita (planejada)">${conteudo}</span>`;
  }
  referenciasQuebradas.push(`${pagina.id} -> ${tipo}:${id}`);
  return `<span class="tag pendente" title="Referência sem página">${conteudo}</span>`;
}

const linkPagina = (pagina, alvoId, texto, classe = "tag") => {
  const alvo = paginas.get(alvoId);
  return alvo ? `<a class="${classe}" href="${raizDe(pagina.url)}${alvo.url}">${esc(texto)}</a>` : `<span class="tag pendente">${esc(texto)}</span>`;
};

// ----------------------------------------------------------------------- blocos gerados
function tabelaHtml(cabecalhos, linhas, { filtro = false, ordenavel = true } = {}) {
  let h = `<div class="tabela-envoltorio">`;
  if (filtro) h += `<div class="tabela-barra"><label>Filtrar <input type="search" placeholder="digite para filtrar"></label><span class="contador">${linhas.length} de ${linhas.length}</span></div>`;
  h += `<table${ordenavel ? ' class="ordenavel"' : ""}><thead><tr>${cabecalhos.map((c) => `<th>${c}</th>`).join("")}</tr></thead><tbody>`;
  for (const l of linhas) h += `<tr>${l.map((c) => `<td${c && c.valor !== undefined ? ` data-valor="${esc(c.valor)}"` : ""}>${c && c.html !== undefined ? c.html : c}</td>`).join("")}</tr>`;
  return h + "</tbody></table></div>";
}

function ermaid(tabelas, { titulo } = {}) {
  const set = new Set(tabelas.filter((t) => /^[A-Za-z_][\w]*$/.test(t) && banco.objetos[t]));
  const rel = [];
  const attrs = new Map([...set].map((t) => [t, []]));
  for (const t of set) {
    const cols = banco.objetos[t].colunas;
    const pk = new Set(cols.filter((c) => c.chaves.includes("PRIMARY KEY")).map((c) => c.nome));
    for (const c of cols) if (pk.has(c.nome)) attrs.get(t).push(`${tipoCurto(c.tipo)} ${c.nome} PK`);
    for (const fk of fksDe(t)) {
      const cols2 = fk.coluna.split(",").map((x) => x.trim());
      cols2.forEach((cn) => { if (!pk.has(cn)) { const c = cols.find((x) => x.nome === cn); attrs.get(t).push(`${tipoCurto(c?.tipo)} ${cn} FK`); } });
      if (set.has(fk.alvo)) {
        const col = banco.objetos[t].colunas.find((c) => c.nome === cols2[0]);
        const opc = col && !col.obrigatorio;
        const um = unicoColuna(t, cols2[0]);
        rel.push(`  ${fk.alvo} ${opc ? "|o" : "||"}--${um ? "o|" : "o{"} ${t} : "${cols2[0]}"`);
      }
    }
  }
  const linhas = ["erDiagram"];
  for (const [t, a] of attrs) linhas.push(`  ${t} {`, ...[...new Set(a)].map((x) => `    ${x}`), `  }`);
  linhas.push(...rel);
  return linhas.join("\n");
}
const tipoCurto = (t = "") => ({ bigint: "bigint", integer: "int", uuid: "uuid", text: "text", boolean: "bool", jsonb: "jsonb", numeric: "numeric", date: "date" }[t] || "campo");

function figuraMermaid(codigoMermaid, alt, ctx) {
  ctx.temDiagrama = true;
  const id = ctx.idUnico("diagrama");
  return `<figure class="diagrama" id="${id}" data-alt="${esc(alt)}"><button type="button" class="ampliar" aria-label="Ampliar diagrama em tela cheia">Ampliar</button><div class="area"><pre class="mermaid">${esc(codigoMermaid)}</pre></div><figcaption>${esc(alt)}</figcaption></figure>`;
}

function listaUsos(nome, pagina) {
  const usos = codigo.tabelas?.[nome] || [];
  const modulo = (arq) => {
    const alvoId = mapaArquivos[arq];
    return alvoId && paginas.get(alvoId.replace(/^modulo:/, "modulos/")) ? alvoId.replace(/^modulo:/, "modulos/") : null;
  };
  const linhas = usos.map((u) => {
    const mid = modulo(u.arquivo);
    const modTxt = mid ? linkPagina(pagina, mid, paginas.get(mid).titulo) : (mapaArquivos[u.arquivo] ? `<span class="tag pendente" title="Página ainda não escrita">${esc(planejadas.get(mapaArquivos[u.arquivo].replace(/^modulo:/, "modulos/")) || mapaArquivos[u.arquivo])}</span>` : "");
    return [`<code>${esc(u.arquivo)}</code>`, u.leitura ? "sim" : "", u.escrita ? "<strong>sim</strong>" : "", modTxt];
  });
  return linhas.length ? tabelaHtml(["Arquivo do código", "Lê", "Grava", "Módulo"], linhas, { ordenavel: linhas.length > 3 }) : "<p>Nenhum arquivo do <code>src/</code> acessa este objeto diretamente.</p>";
}

function listaFluxosQueUsam(nome, pagina) {
  const lista = [];
  for (const f of fluxosGer.fluxos) {
    const slug = Object.entries(fluxosMan.fluxos || {}).find(([, v]) => v.nome_n8n === f.nome)?.[0];
    const usa = f.tabelas_supabase.includes(nome);
    if (usa) lista.push({ f, slug, como: "grava ou lê (nó do Supabase/REST)" });
  }
  return lista;
}

function geradoHtml(nome, arg, pagina, ctx) {
  switch (nome) {
    case "er": {
      const tabs = arg.split(/[\s,]+/).filter(Boolean);
      return figuraMermaid(ermaid(tabs.length ? tabs : documentados), `Diagrama de relacionamentos entre as tabelas: ${tabs.join(", ") || "todas as documentadas"}.`, ctx);
    }
    case "lista-objetos": {
      const grupo = arg || null;
      const itens = documentados.filter((n) => !grupo || bancoManual.objetos[n].grupo === grupo);
      const linhas = itens.map((n) => {
        const o = banco.objetos[n], m = bancoManual.objetos[n];
        return [linkPagina(pagina, `banco/${slugObj(n)}`, n), o?.tipo || "", { html: String(o?.colunas.length ?? ""), valor: o?.colunas.length ?? 0 }, { html: o?.linhas != null ? o.linhas.toLocaleString("pt-BR") : "", valor: o?.linhas ?? 0 }, esc(m.resumo || "")];
      });
      return tabelaHtml(["Objeto", "Tipo", "Campos", `Linhas (em ${DATA_VERIF})`, "Para que serve"], linhas, { filtro: linhas.length >= 10 });
    }
    case "usos": return listaUsos(arg, pagina);
    case "fluxo-meta": {
      const man = fluxosMan.fluxos?.[arg];
      const f = fluxosGer.fluxos.find((x) => x.nome === man?.nome_n8n);
      if (!f) { ctx.avisos.push(`fluxo n8n não encontrado: ${arg}`); return `<div class="alerta aviso"><span class="rotulo">Dados do fluxo indisponíveis (${esc(arg)}).</span></div>`; }
      ctx.fontes.add(f.arquivo_privado);
      const g = f.gatilho;
      const gat = g?.tipo === "webhook" ? `Webhook (${g.metodo}) em <code>/webhook/${esc(g.caminho)}</code>` : g?.tipo === "agenda" ? `Agendado: ${esc(JSON.stringify(g.regra))}` : "Não identificado";
      const linhas = [
        ["Nome no n8n", esc(f.nome)], ["Situação na exportação", f.ativo ? "Ativo" : "Inativo"], ["Gatilho", gat], ["Quantidade de etapas (nós)", String(f.quantidade_nos)],
        ["Sistemas externos chamados", f.hosts.map((h) => `<code>${esc(h)}</code>`).join(", ") || "nenhum"],
        ["Funções do banco chamadas", f.rpcs_chamadas.map((r) => referenciaHtml("funcao", r, null, pagina, ctx)).join(" ") || "nenhuma"],
        ["Tabelas do Supabase acessadas pelo fluxo", f.tabelas_supabase.map((t) => referenciaHtml("tabela", t, null, pagina, ctx)).join(" ") || "nenhuma diretamente"],
        ["Tipos de credencial usados (sem valores)", f.tipos_credencial.map((c) => `<code>${esc(c)}</code>`).join(", ") || "chaves informadas direto nos nós (ver Achados)"]
      ];
      return tabelaHtml(["Item", "Valor"], linhas, { ordenavel: false });
    }
    case "fluxo-nos": {
      const man = fluxosMan.fluxos?.[arg];
      const f = fluxosGer.fluxos.find((x) => x.nome === man?.nome_n8n);
      if (!f) return "";
      const descr = man.nos || {};
      const linhas = f.nos.map((n, i) => {
        const det = [n.caminho ? `<code>${esc((n.metodo ? n.metodo + " " : "") + (n.host || "") + n.caminho)}</code>` : "", n.tabela ? `tabela <code>${esc(n.tabela)}</code> (${esc(n.operacao)})` : ""].filter(Boolean).join(" ");
        return [{ html: String(i + 1), valor: i + 1 }, `<strong>${esc(n.nome)}</strong>`, `<code>${esc(n.tipo)}</code>`, descr[n.nome] ? inline(descr[n.nome], ctx) : '<span class="selo nc">sem descrição</span>', det];
      });
      return tabelaHtml(["#", "Etapa (nó do n8n)", "Tipo", "O que faz", "Detalhe técnico"], linhas, { filtro: linhas.length >= 10 });
    }
    case "fluxo-ligacoes": {
      const man = fluxosMan.fluxos?.[arg];
      const f = fluxosGer.fluxos.find((x) => x.nome === man?.nome_n8n);
      if (!f) return "";
      const linhas = f.ligacoes.map((l) => [esc(l.de), l.saida === 0 && /\?$|OK\?|Permitido|vale tentar|completos/i.test(l.de) ? "SIM (saída 1)" : l.saida === 1 ? "NÃO (saída 2)" : "segue", esc(l.para)]);
      return tabelaHtml(["De", "Condição", "Para"], linhas, { filtro: true });
    }
    case "funcoes-lista": {
      const linhas = Object.values(banco.funcoes).sort((a, b) => a.nome.localeCompare(b.nome)).map((f) => {
        const m = bancoManual.funcoes?.[f.nome] || {};
        return [`<a href="#${slugify(f.nome)}"><code>${esc(f.nome)}</code></a>`, esc(m.tipo || ""), esc(f.retorno || ""), f.security_definer ? '<span class="selo chave">executa com permissão do dono</span>' : "permissão de quem chama", esc(m.resumo || "")];
      });
      return tabelaHtml(["Função", "Papel", "Devolve", "Permissão", "Resumo"], linhas, { filtro: true });
    }
    case "funcoes-detalhe": {
      let h = "";
      for (const f of Object.values(banco.funcoes).sort((a, b) => a.nome.localeCompare(b.nome))) {
        const m = bancoManual.funcoes?.[f.nome] || {};
        const id = slugify(f.nome);
        ctx.toc.push({ n: 3, id, texto: f.nome });
        h += `<h3 id="${id}"><code>${esc(f.nome)}</code></h3>`;
        h += `<section class="resumo"><span class="rotulo">Resumo simples</span><p>${m.resumo ? inline(m.resumo, ctx) : `${selo("fi")} Finalidade não confirmada no código.`}</p></section>`;
        const regras = (m.regras || []).map((r) => `<li>${inline(r, ctx)}</li>`).join("");
        const quem = (codigo.rpcs?.[f.nome] || []).map((a) => `<code>${esc(a)}</code>`).join(", ");
        h += `<details class="tecnico"><summary>Detalhes técnicos<small>: assinatura, regras e código</small></summary><div class="corpo">`;
        h += tabelaHtml(["Item", "Valor"], [
          ["Parâmetros", `<code>${esc(f.argumentos || "")}</code>`], ["Devolve", `<code>${esc(f.retorno || "")}</code>`], ["Linguagem", esc(f.linguagem || "")],
          ["Permissão ao executar", f.security_definer ? "<strong>SECURITY DEFINER</strong> (usa a permissão do dono da função, ignora o RLS)" : "permissão de quem chama"],
          ["search_path fixo", f.search_path ? `<code>${esc(f.search_path)}</code>` : "não definido"], ["Volatilidade", esc(f.volatilidade)],
          ["Quem pode executar", (f.executam || []).map((x) => `<code>${esc(x)}</code>`).join(", ") || "não consultado"],
          ["Chamada pelo código do front", quem || "não (ou só por fluxos/outras funções)"]
        ], { ordenavel: false });
        if (regras) h += `<h4>Regras</h4><ul>${regras}</ul>`;
        h += `<h4>Código da função</h4><pre><code>${esc(f.corpo)}</code></pre>`;
        h += `<aside class="fonte"><span class="rotulo">Fonte</span> banco de dados, extração Q04 (<code>docs/scripts/extracao_banco.sql</code>)${(codigo.rpcs?.[f.nome] || []).map((a) => `, chamada em <code>${esc(a)}</code>`).join("")}</aside>`;
        h += `</div></details>`;
      }
      ctx.fontes.add("docs/scripts/extracao_banco.sql");
      return h;
    }
    case "valores": {
      let h = "";
      for (const n of documentados) {
        const m = bancoManual.objetos[n];
        for (const [campo, vals] of Object.entries(m.valores || {})) {
          const chave = `${n}.${campo}`;
          const cont = banco.valores?.[chave] || {};
          const linhas = Object.entries(vals).map(([v, sig]) => [`<code>${esc(v)}</code>`, inline(sig, ctx), { html: cont[v] != null ? cont[v].toLocaleString("pt-BR") : "-", valor: cont[v] ?? 0 }]);
          for (const v of Object.keys(cont)) if (!(v in vals) && v !== "(vazio)") linhas.push([`<code>${esc(v)}</code>`, selo("fi") + " valor presente nos dados, sem significado confirmado", { html: cont[v].toLocaleString("pt-BR"), valor: cont[v] }]);
          if (cont["(vazio)"] != null && !("(vazio)" in vals)) linhas.push(["<em>(vazio)</em>", "Sem valor preenchido", { html: cont["(vazio)"].toLocaleString("pt-BR"), valor: cont["(vazio)"] }]);
          const id = ctx.idUnico(slugify(chave));
          ctx.toc.push({ n: 3, id, texto: chave });
          h += `<h3 id="${id}"><code>${esc(chave)}</code></h3>` + tabelaHtml(["Valor", "Significado", `Linhas em ${DATA_VERIF}`], linhas, { ordenavel: false });
        }
      }
      return h;
    }
    case "regras-banco": {
      let h = "";
      const linhasTrig = [];
      for (const [n, o] of Object.entries(banco.objetos)) for (const t of o.triggers) if (!/INATIVO/.test(n)) linhasTrig.push([referenciaHtml("tabela", n, null, pagina, ctx) || esc(n), `<code>${esc(t.nome)}</code>`, `<code>${esc(t.definicao.replace(/^CREATE TRIGGER \S+ /, ""))}</code>`]);
      ctx.toc.push({ n: 3, id: "triggers", texto: "Gatilhos (triggers)" });
      h += `<h3 id="triggers">Gatilhos (triggers)</h3>` + tabelaHtml(["Tabela", "Gatilho", "Definição"], linhasTrig, { ordenavel: false });
      const linhasRls = [];
      for (const [n, o] of Object.entries(banco.objetos)) {
        if (/INATIVO|^vw_|^mv_|^generators|^proximos/.test(n)) continue;
        if (o.tipo !== "tabela") continue;
        const pol = o.rls.politicas.map((p) => `<code>${esc(p.nome)}</code> (${esc(p.comando)}, papéis ${esc(p.papeis)})`).join("<br>") || (o.rls.ativo ? "<em>nenhuma política: ninguém além do dono do banco acessa</em>" : "-");
        const g = o.grants || {};
        linhasRls.push([esc(n), o.rls.ativo ? '<span class="selo ok">ligado</span>' : '<span class="selo pessoal">desligado</span>', pol, g.anon ? (g.anon.split(",").length === 7 ? "todos" : esc(g.anon)) : "nenhum", g.authenticated ? (g.authenticated.split(",").length === 7 ? "todos" : esc(g.authenticated)) : "nenhum"]);
      }
      ctx.toc.push({ n: 3, id: "rls", texto: "Acesso por tabela (RLS e privilégios)" });
      h += `<h3 id="rls">Acesso por tabela (RLS e privilégios)</h3>` + tabelaHtml(["Tabela", "RLS", "Políticas", "Privilégios de anon", "Privilégios de authenticated"], linhasRls, { filtro: true });
      return h;
    }
    case "extensoes": {
      return tabelaHtml(["Extensão", "Versão"], (banco.extensoes || []).map((e) => [`<code>${esc(e.nome)}</code>`, esc(e.versao)]), { ordenavel: false });
    }
    case "secoes": {
      let h = '<div class="grade">';
      for (const s of navegacao.secoes) {
        const alvo = [...paginas.values()].filter((p) => p.secao === s.id).sort((a, b) => a.ordem - b.ordem)[0];
        const href = alvo ? raizDe(pagina.url) + alvo.url : null;
        const corpo = `<strong>${esc(s.titulo)}</strong><span>${esc(s.descricao || "")}</span>`;
        h += href ? `<a class="cartao" href="${href}">${corpo}</a>` : `<div class="cartao" style="opacity:.6">${corpo}<span>Em construção</span></div>`;
      }
      return h + "</div>";
    }
    case "fluxos-usam": {
      // arg: host:<trecho> | cred:<tipo> | tipo:<trecho do tipo de nó>
      const [modo, ...resto] = arg.split(":");
      const chave = resto.join(":").toLowerCase();
      const linhas = [];
      for (const f of fluxosGer.fluxos) {
        let n = 0;
        if (modo === "todos") n = f.nos.length;
        else if (modo === "host") n = f.nos.filter((x) => (x.host || "").toLowerCase().includes(chave)).length;
        else if (modo === "cred") n = f.tipos_credencial.some((c) => c.toLowerCase() === chave) ? f.nos.length : 0;
        else if (modo === "tipo") n = f.nos.filter((x) => x.tipo.toLowerCase().includes(chave)).length;
        if (!n) continue;
        const slug = Object.entries(fluxosMan.fluxos || {}).find(([, v]) => v.nome_n8n === f.nome)?.[0];
        const g = f.gatilho;
        const gat = g?.tipo === "webhook" ? `Webhook <code>/${esc(g.caminho)}</code>` : g?.tipo === "agenda" ? "Agendado (a cada 30 dias)" : "—";
        linhas.push([slug ? referenciaHtml("fluxo", slug, null, pagina, ctx) : esc(f.nome), gat, modo === "cred" ? "usa a credencial" : String(n)]);
      }
      return linhas.length ? tabelaHtml(["Fluxo", "Gatilho", modo === "cred" ? "Uso" : modo === "todos" ? "Etapas (nós)" : "Etapas que usam"], linhas, { ordenavel: false }) : "<p>Nenhum fluxo exportado usa esta integração.</p>";
    }
    case "pontos": return pontosHtml(arg, pagina, ctx);
    default:
      ctx.avisos.push(`bloco gerado desconhecido: ${nome}`);
      return `<div class="alerta aviso"><span class="rotulo">Bloco gerado desconhecido: ${esc(nome)}</span></div>`;
  }
}

function pontosHtml(tipo, pagina, ctx) {
  const lista = pontos.filter((p) => (tipo === "validar" ? p.categoria === "validar" : p.categoria === "achado"));
  const porGrupo = new Map();
  for (const p of lista) (porGrupo.get(p.grupo || "Geral") ?? porGrupo.set(p.grupo || "Geral", []).get(p.grupo || "Geral")).push(p);
  let h = "";
  for (const [grupo, itens] of porGrupo) {
    const id = ctx.idUnico(slugify(grupo));
    ctx.toc.push({ n: 2, id, texto: grupo });
    h += `<h2 id="${id}">${esc(grupo)}</h2>`;
    const linhas = itens.map((p) => {
      (p.fontes || []).forEach((f) => ctx.fontes.add(f));
      const onde = (p.onde || []).map((o) => { const [t, i] = o.split(":"); return referenciaHtml(t, i, null, pagina, ctx); }).join(" ");
      const sev = p.severidade ? `<span class="selo ${p.severidade === "alerta" ? "pessoal" : p.severidade === "inconsistencia" ? "nc" : "legado"}">${esc({ alerta: "Alerta de segurança", inconsistencia: "Inconsistência", morto: "Código/objeto sem uso", duplicado: "Duplicidade" }[p.severidade] || p.severidade)}</span> ` : "";
      return [`<code>${esc(p.id)}</code>`, `${sev}<strong>${inline(p.titulo, ctx)}</strong><br>${inline(p.descricao, ctx)}${p.fontes?.length ? `<br><small>Fonte: ${p.fontes.map((f) => `<code>${esc(f)}</code>`).join(", ")}</small>` : ""}`, onde];
    });
    h += tabelaHtml(["Código", tipo === "validar" ? "O que precisa ser confirmado" : "Achado", "Onde aparece"], linhas, { ordenavel: false });
  }
  return h || "<p>Nada registrado ainda.</p>";
}

// ----------------------------------------------------------------------- página de objeto do banco
function paginaObjeto(pagina, ctx) {
  const nome = pagina.objeto;
  const o = banco.objetos[nome];
  const m = bancoManual.objetos[nome];
  if (!o) { ctx.avisos.push(`objeto ${nome} não existe em banco.gerado.json`); return "<p>Objeto não encontrado na extração.</p>"; }
  let h = "";
  const selos = [
    `<span class="selo chave">${esc(o.tipo)}</span>`,
    o.linhas != null ? `<span class="selo legado">${o.linhas.toLocaleString("pt-BR")} linhas em ${DATA_VERIF}</span>` : "",
    ...(m.selos || []).map((s) => selo(s))
  ].join(" ");
  h += `<p>${selos}</p>`;
  h += `<section class="resumo"><span class="rotulo">Resumo simples</span><p>${m.resumo ? inline(m.resumo, ctx) : `${selo("fi")} Finalidade não identificada.`}</p></section>`;
  if (m.descricao?.length) h += blocos(m.descricao.join("\n").split("\n"), ctx);

  // Campos
  ctx.toc.push({ n: 2, id: "campos", texto: "Campos" });
  h += `<h2 id="campos">Campos</h2>`;
  const campos = m.campos || {};
  const linhasCampos = o.colunas.map((c) => {
    const d = campos[c.nome];
    const tags = [...(d?.tags || [])].map((t) => selo(t)).join(" ");
    const chaves = c.chaves.map((k) => ({ "PRIMARY KEY": "PK", "FOREIGN KEY": "FK", "UNIQUE": "único", "CHECK": "regra" }[k] || k)).map((k) => `<span class="selo chave">${esc(k)}</span>`).join(" ");
    const sig = d?.d ? inline(d.d, ctx) : selo("fi");
    return [`<code>${esc(c.nome)}</code>`, `<code>${esc(c.tipo)}</code>`, c.obrigatorio ? "sim" : "não", c.padrao ? `<code>${esc(c.padrao.length > 38 ? c.padrao.slice(0, 36) + "…" : c.padrao)}</code>` : "-", `${sig} ${tags}`, chaves];
  });
  h += tabelaHtml(["Campo", "Tipo", "Obrigatório", "Valor padrão", "Significado", "Chaves"], linhasCampos, { filtro: true });
  if (nome.startsWith("vw_") || o.tipo.startsWith("view")) h += `<p><small>Em uma view, “obrigatório” e “valor padrão” não se aplicam: os campos vêm das tabelas de origem.</small></p>`;

  // Relacionamentos
  const fks = fksDe(nome);
  const refs = referenciadoPor(nome).filter((r) => !/INATIVO|_bkp_/.test(r.de));
  ctx.toc.push({ n: 2, id: "relacionamentos", texto: "Relacionamentos" });
  h += `<h2 id="relacionamentos">Relacionamentos</h2>`;
  if (fks.length || refs.length) {
    const linhas = [];
    for (const f of fks) {
      const col = o.colunas.find((c) => c.nome === f.coluna);
      const card = unicoColuna(nome, f.coluna) ? "um para um" : "muitos para um";
      const alvoHtml = nomeBancoValido(f.alvo) ? referenciaHtml("tabela", f.alvo, null, pagina, ctx) : `<code>${esc(f.alvo)}</code>${f.alvo === "auth.users" ? " (Supabase Auth)" : ""}`;
      linhas.push([`<code>${esc(nome)}.${esc(f.coluna)}</code>`, `${alvoHtml}<code>.${esc(f.alvoColuna)}</code>`, card + (col && !col.obrigatorio ? " (opcional)" : ""), `Ao apagar o registro de <code>${esc(f.alvo)}</code>: ${TRAD_ACAO[f.aoApagar] || esc(f.aoApagar)}. Ao atualizar: ${TRAD_ACAO[f.aoAtualizar] || esc(f.aoAtualizar)}.`]);
    }
    for (const r of refs) {
      const deHtml = nomeBancoValido(r.de) ? referenciaHtml("tabela", r.de, null, pagina, ctx) : `<code>${esc(r.de)}</code>`;
      linhas.push([`${deHtml}<code>.${esc(r.coluna)}</code>`, `<code>${esc(nome)}.${esc(r.alvoColuna)}</code>`, unicoColuna(r.de, r.coluna) ? "um para um" : "um para muitos", `Ao apagar um registro de <code>${esc(nome)}</code>: ${TRAD_ACAO[r.aoApagar] || esc(r.aoApagar)}.`]);
    }
    h += tabelaHtml(["De", "Para", "Cardinalidade", "O que acontece"], linhas, { ordenavel: false });
    const rel = [nome, ...fks.map((f) => f.alvo), ...refs.map((r) => r.de)].filter((t) => /^[A-Za-z_]\w*$/.test(t) && banco.objetos[t] && !/INATIVO|_bkp_/.test(t));
    if (rel.length > 1) h += figuraMermaid(ermaid([...new Set(rel)]), `Diagrama de relacionamentos de ${nome} com as tabelas ligadas a ela.`, ctx);
  } else h += `<p>Não há chave estrangeira declarada no banco para este objeto.</p>`;
  if (m.relacoes_logicas?.length) h += `<h3>Ligações que o banco não impõe</h3><ul>${m.relacoes_logicas.map((r) => `<li>${inline(r, ctx)}</li>`).join("")}</ul>`;

  // Valores possíveis
  if (m.valores) {
    ctx.toc.push({ n: 2, id: "valores", texto: "Valores possíveis" });
    h += `<h2 id="valores">Valores possíveis de campos de status</h2>`;
    for (const [campo, vals] of Object.entries(m.valores)) {
      const cont = banco.valores?.[`${nome}.${campo}`] || {};
      const linhas = Object.entries(vals).map(([v, sig]) => [`<code>${esc(v)}</code>`, inline(sig, ctx), cont[v] != null ? cont[v].toLocaleString("pt-BR") : "-"]);
      for (const v of Object.keys(cont)) if (!(v in vals) && v !== "(vazio)") linhas.push([`<code>${esc(v)}</code>`, `${selo("fi")} valor presente nos dados, significado não confirmado`, cont[v].toLocaleString("pt-BR")]);
      if (cont["(vazio)"] != null && !("(vazio)" in vals)) linhas.push(["<em>(vazio)</em>", "Campo sem valor preenchido.", cont["(vazio)"].toLocaleString("pt-BR")]);
      h += `<h3>Campo <code>${esc(campo)}</code></h3>` + tabelaHtml(["Valor", "Significado", `Linhas em ${DATA_VERIF}`], linhas, { ordenavel: false });
    }
  }

  // Regras do banco
  ctx.toc.push({ n: 2, id: "regras", texto: "Regras que o banco impõe" });
  h += `<h2 id="regras">Regras que o banco impõe</h2>`;
  const regras = [];
  for (const t of o.triggers) regras.push(`Gatilho <code>${esc(t.nome)}</code>: <code>${esc(t.definicao.replace(/^CREATE TRIGGER \S+ /, ""))}</code>`);
  for (const r of o.restricoes.filter((x) => x.tipo === "c" && !/singleton/.test(x.nome))) regras.push(`Regra de validação <code>${esc(r.nome)}</code>: <code>${esc(r.definicao)}</code>`);
  if (o.tipo === "tabela") {
    const g = o.grants || {};
    regras.push(`RLS (acesso por linha): <strong>${o.rls.ativo ? "ligado" : "desligado"}</strong>${o.rls.politicas.length ? `, políticas: ${o.rls.politicas.map((p) => `<code>${esc(p.nome)}</code> (${esc(p.comando)} para ${esc(p.papeis)}, condição <code>${esc(p.leitura || p.escrita || "")}</code>)`).join("; ")}` : ""}.`);
    if (g.anon || g.authenticated) regras.push(`Privilégios de tabela: papel <code>anon</code> = ${g.anon ? (g.anon.split(",").length === 7 ? "todos" : esc(g.anon)) : "nenhum"}; papel <code>authenticated</code> = ${g.authenticated ? (g.authenticated.split(",").length === 7 ? "todos" : esc(g.authenticated)) : "nenhum"} (fonte: consulta Q12).`);
  }
  for (const r of m.regras || []) regras.push(inline(r, ctx));
  const uso = usoEmFuncoesEViews(nome);
  if (uso.length) regras.push(`Usada por ${uso.map((u) => u.tipo === "função" ? referenciaHtml("funcao", u.nome, null, pagina, ctx) : (nomeBancoValido(u.nome) ? referenciaHtml("tabela", u.nome, null, pagina, ctx) : `<code>${esc(u.nome)}</code> (view)`)).join(" ")} dentro do banco.`);
  h += regras.length ? `<ul>${regras.map((r) => `<li>${r}</li>`).join("")}</ul>` : "<p>Nenhuma regra além das chaves e índices abaixo.</p>";

  // Quem lê e quem grava
  ctx.toc.push({ n: 2, id: "uso", texto: "Quem lê e quem grava" });
  h += `<h2 id="uso">Quem lê e quem grava</h2>`;
  h += `<h3>No código da plataforma (src/)</h3>` + listaUsos(nome, pagina);
  const flux = listaFluxosQueUsam(nome, pagina);
  const fluxManual = m.usos_fluxos || [];
  if (flux.length || fluxManual.length) {
    h += `<h3>Nos fluxos do n8n</h3><ul>`;
    for (const f of flux) h += `<li>${f.slug ? referenciaHtml("fluxo", f.slug, null, pagina, ctx) : esc(f.f.nome)}: ${esc(f.como)}.</li>`;
    for (const t of fluxManual) h += `<li>${inline(t, ctx)}</li>`;
    h += `</ul>`;
  }

  // Estrutura técnica (chaves, índices)
  ctx.toc.push({ n: 2, id: "estrutura", texto: "Chaves, restrições e índices" });
  h += `<h2 id="estrutura">Chaves, restrições e índices</h2>`;
  let det = "";
  if (o.restricoes.length) det += `<h4>Restrições</h4>` + tabelaHtml(["Nome", "Tipo", "Definição"], o.restricoes.map((r) => [`<code>${esc(r.nome)}</code>`, { p: "chave primária", f: "chave estrangeira", u: "único", c: "validação" }[r.tipo] || r.tipo, `<code>${esc(r.definicao)}</code>`]), { ordenavel: false });
  if (o.indices.length) det += `<h4>Índices</h4>` + tabelaHtml(["Nome", "Definição"], o.indices.map((i) => [`<code>${esc(i.nome)}</code>`, `<code>${esc(i.definicao)}</code>`]), { ordenavel: false });
  if (o.definicao_view) det += `<h4>Definição da view (SQL)</h4><pre><code>${esc(o.definicao_view)}</code></pre>`;
  h += det ? `<details class="tecnico"><summary>Detalhes técnicos<small>: restrições, índices${o.definicao_view ? " e SQL da view" : ""}</small></summary><div class="corpo">${det}</div></details>` : "<p>Sem restrições ou índices.</p>";

  // Pontos a validar relacionados
  const rel = pontos.filter((p) => (p.onde || []).includes(`tabela:${nome}`));
  if (rel.length) {
    ctx.toc.push({ n: 2, id: "pontos", texto: "Pontos a validar e achados" });
    h += `<h2 id="pontos">Pontos a validar e achados sobre este objeto</h2><ul>${rel.map((p) => `<li><code>${esc(p.id)}</code> ${inline(p.titulo, ctx)} (${p.categoria === "validar" ? referenciaHtml("pagina", "controle/pontos-a-validar", "ver pontos a validar", pagina, ctx) : referenciaHtml("pagina", "controle/achados", "ver achados", pagina, ctx)})</li>`).join("")}</ul>`;
  }
  ctx.fontes.add("docs/_fontes_privadas/schema/schema_banco_atg_completo.csv (colunas)");
  ctx.fontes.add("docs/scripts/extracao_banco.sql (restrições, índices, gatilhos, RLS, views)");
  return h;
}

function paginaGlossario(pagina, ctx) {
  let h = `<section class="resumo"><span class="rotulo">Resumo simples</span><p>Aqui estão as palavras usadas na documentação, explicadas de forma direta. Na primeira vez que um termo aparece em cada página, ele é sublinhado e leva até esta definição.</p></section>`;
  const grupos = { negocio: "Termos de negócio", tecnico: "Termos técnicos", plataforma: "Termos da plataforma" };
  for (const [cat, rot] of Object.entries(grupos)) {
    const itens = glossario.filter((t) => (t.categoria || "tecnico") === cat).sort((a, b) => a.termo.localeCompare(b.termo, "pt-BR"));
    if (!itens.length) continue;
    ctx.toc.push({ n: 2, id: cat, texto: rot });
    h += `<h2 id="${cat}">${rot}</h2><dl>`;
    for (const t of itens) {
      ctx.toc.push({ n: 3, id: t.id, texto: t.termo });
      h += `<dt id="${esc(t.id)}"><strong>${esc(t.termo)}</strong>${t.apelidos?.length ? ` <small>(também: ${t.apelidos.map(esc).join(", ")})</small>` : ""}</dt><dd>${inline(t.definicao, ctx)}</dd>`;
    }
    h += "</dl>";
  }
  return h;
}

function paginaChangelog(pagina, ctx) {
  let h = `<section class="resumo"><span class="rotulo">Resumo simples</span><p>Lista do que foi criado ou alterado nesta documentação, com a data e o commit do código que serviu de base.</p></section>`;
  for (const e of changelog) {
    h += `<h2 id="${esc("v-" + e.data + "-" + (e.commit || ""))}">${esc(e.data)} <small>(commit ${esc(e.commit || "n/d")})</small></h2><p><strong>${inline(e.titulo, ctx)}</strong></p><ul>${(e.mudancas || []).map((x) => `<li>${inline(x, ctx)}</li>`).join("")}</ul>`;
    ctx.toc.push({ n: 2, id: "v-" + e.data + "-" + (e.commit || ""), texto: `${e.data}` });
  }
  return h;
}

// ----------------------------------------------------------------------- glossário: autolink
function autolinkar(html, pagina, ctx) {
  if (pagina.id === "raiz/glossario" || !glossario.length) return html;
  const raiz = raizDe(pagina.url);
  const termos = [];
  for (const t of glossario) for (const nome of [t.termo, ...(t.apelidos || [])]) termos.push({ nome, id: t.id });
  termos.sort((a, b) => b.nome.length - a.nome.length);
  const usados = new Set();
  const partes = html.split(/(<[^>]+>)/);
  const pilha = [];
  const BLOQUEIA = new Set(["a", "code", "pre", "h1", "h2", "h3", "h4", "script", "style", "button", "summary", "th", "textarea", "label", "dt"]);
  for (let i = 0; i < partes.length; i++) {
    const p = partes[i];
    if (i % 2 === 1) {
      const m = p.match(/^<(\/?)([a-zA-Z0-9]+)/);
      if (m && !/\/>$/.test(p) && !["br", "hr", "img", "input", "meta", "link"].includes(m[2].toLowerCase())) {
        if (m[1]) { const idx = pilha.lastIndexOf(m[2].toLowerCase()); if (idx >= 0) pilha.length = idx; }
        else pilha.push(m[2].toLowerCase());
      }
      continue;
    }
    if (pilha.some((t) => BLOQUEIA.has(t)) || pilha.includes("figure")) continue;
    let texto = p;
    for (const t of termos) {
      if (usados.has(t.id)) continue;
      // Termos curtos ou com maiúsculas internas (OS, API, RLS) só casam com a mesma grafia, para não sublinhar "os" comum.
      const sensivel = t.nome.length <= 4 || /[A-ZÀ-Ý]/.test(t.nome.slice(1));
      const re = new RegExp(`(?<![\\p{L}\\p{N}_./-])(${t.nome.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})(?![\\p{L}\\p{N}_-])`, sensivel ? "u" : "iu");
      const m = re.exec(texto);
      if (m) {
        usados.add(t.id);
        texto = texto.slice(0, m.index) + `<a class="termo" href="${raiz}paginas/glossario.html#${t.id}" title="Ver no glossário">${m[1]}</a>` + texto.slice(m.index + m[1].length);
      }
    }
    partes[i] = texto;
  }
  ctx.termosUsados = usados;
  return partes.join("");
}

// ----------------------------------------------------------------------- moldura da página
function menuHtml(atual) {
  const raiz = raizDe(atual.url);
  let h = `<a class="raiz-link${atual.id === "inicio/index" ? " atual" : ""}" href="${raiz}index.html">Início</a>`;
  for (const s of navegacao.secoes) {
    const reais = [...paginas.values()].filter((p) => p.secao === s.id).sort((a, b) => a.ordem - b.ordem || a.titulo.localeCompare(b.titulo, "pt-BR"));
    const plan = (s.planejadas || []).filter((p) => !paginas.has(`${s.id}/${p.slug}`));
    if (!reais.length && !plan.length) continue;
    const aberto = reais.some((p) => p.id === atual.id);
    h += `<details${aberto ? " open" : ""}><summary>${esc(s.titulo)}</summary><ul>`;
    let grupoAtual = null;
    for (const p of reais) {
      if (p.grupo && p.grupo !== grupoAtual) { grupoAtual = p.grupo; h += `<li><span class="grupo-rotulo">${esc(p.grupo)}</span></li>`; }
      h += `<li><a href="${raiz}${p.url}"${p.id === atual.id ? ' class="atual" aria-current="page"' : ""}>${esc(p.titulo)}</a></li>`;
    }
    for (const p of plan) h += `<li><span class="planejada">${esc(p.titulo)}</span></li>`;
    h += `</ul></details>`;
  }
  return h;
}

function moldura(pagina, corpoHtml, ctx) {
  const raiz = raizDe(pagina.url);
  const secao = navegacao.secoes.find((s) => s.id === pagina.secao);
  const trilha = pagina.id === "inicio/index" ? "" : `<div class="trilha"><a href="${raiz}index.html">Início</a>${secao ? ` / ${esc(secao.titulo)}` : ""}</div>`;
  const toc = ctx.toc.length > 1 ? `<aside class="indice-pagina" aria-label="Nesta página"><strong>Nesta página</strong><ul>${ctx.toc.map((t) => `<li class="n${t.n}"><a href="#${t.id}">${esc(t.texto)}</a></li>`).join("")}</ul></aside>` : "";
  const fontes = [...ctx.fontes].sort();
  const commitTxt = pagina.commit || COMMIT;
  return `<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex, nofollow">
<title>${esc(pagina.titulo)} · ${NOME} · Documentação</title>
<link rel="stylesheet" href="${raiz}assets/tema.css">
</head>
<body data-raiz="${raiz}">
<a class="somente-leitor" href="#conteudo">Pular para o conteúdo</a>
<header class="topo">
  <button class="botao-menu" type="button" aria-label="Abrir menu" aria-expanded="false">Menu</button>
  <a class="marca" href="${raiz}index.html"><img src="${raiz}assets/img/logo_atg_geradores.png" alt="ATG Geradores"><span>${NOME}<small>Documentação da plataforma</small></span></a>
  <span class="espaco"></span>
  <div class="busca-caixa"><input id="busca" type="search" placeholder="Buscar na documentação (tecla /)" autocomplete="off" aria-label="Buscar na documentação"><div class="busca-resultados" role="listbox"></div></div>
</header>
<nav class="menu" aria-label="Seções da documentação">${menuHtml(pagina)}</nav>
<div class="layout"><div class="pagina">
<main class="conteudo" id="conteudo">
${trilha}
<h1>${esc(pagina.titulo)}</h1>
${pagina.subtitulo ? `<p class="subtitulo">${esc(pagina.subtitulo)}</p>` : ""}
${corpoHtml}
<footer class="rodape">
  <p><strong>Verificado em ${esc(pagina.verificado || DATA_VERIF)} no commit ${esc(commitTxt)}.</strong> Documentação interna: descreve a arquitetura da plataforma e não deve ser publicada abertamente.</p>
  ${fontes.length ? `<details><summary>Arquivos-fonte consultados (${fontes.length})</summary><ul>${fontes.map((f) => `<li><code>${esc(f)}</code></li>`).join("")}</ul></details>` : ""}
</footer>
</main>
${toc}
</div></div>
<button class="voltar-topo" type="button" aria-label="Voltar ao topo">↑</button>
<script src="${raiz}assets/busca-indice.js"></script>
${ctx.temDiagrama ? `<script src="${raiz}assets/js/mermaid.min.js"></script>` : ""}
<script src="${raiz}assets/js/app.js"></script>
</body>
</html>
`;
}

// ----------------------------------------------------------------------- build
fs.rmSync(SAIDA_PAGINAS, { recursive: true, force: true });
fs.rmSync(path.join(DOCS, "index.html"), { force: true });
const indiceBusca = [];
let total = 0;
const problemas = { termos_sem_glossario: [], avisos: aviso };
for (const pagina of paginas.values()) {
  const ctx = novoContexto(pagina);
  let corpo;
  if (pagina.gerar === "objeto-banco") corpo = paginaObjeto(pagina, ctx);
  else if (pagina.gerar === "glossario") corpo = paginaGlossario(pagina, ctx);
  else if (pagina.gerar === "pontos-a-validar") corpo = `<section class="resumo"><span class="rotulo">Resumo simples</span><p>Esta lista reúne tudo o que foi deduzido a partir do código e não está escrito em lugar nenhum, e tudo o que não deu para entender. Cada item pede uma confirmação da equipe da ATG ou da Mind. Nada aqui foi corrigido: só foi registrado.</p></section>` + pontosHtml("validar", pagina, ctx);
  else if (pagina.gerar === "achados") corpo = `<section class="resumo"><span class="rotulo">Resumo simples</span><p>Esta página lista o que foi encontrado de estranho ao comparar código, banco e fluxos: coisas que parecem sem uso, duplicadas, divergentes ou que merecem cuidado de segurança. Nenhuma correção foi feita; são só registros para a equipe decidir.</p></section><div class="alerta seguranca"><span class="rotulo">Sobre segredos</span><p>Quando uma chave ou senha aparece num arquivo, esta documentação cita apenas o <strong>nome do arquivo</strong> e o <strong>tipo</strong> do segredo, nunca o valor.</p></div>` + pontosHtml("achado", pagina, ctx);
  else if (pagina.gerar === "changelog") corpo = paginaChangelog(pagina, ctx);
  else corpo = blocos(pagina.corpo.replace(/\r\n/g, "\n").split("\n"), ctx);
  corpo = autolinkar(corpo, pagina, ctx);
  const html = moldura(pagina, corpo, ctx);
  const destino = path.join(DOCS, pagina.url);
  fs.mkdirSync(path.dirname(destino), { recursive: true });
  fs.writeFileSync(destino, html, "utf8");
  total++;
  problemas.avisos.push(...ctx.avisos.map((a) => `${pagina.id}: ${a}`));
  indiceBusca.push({ url: pagina.url, titulo: pagina.titulo, secao: navegacao.secoes.find((s) => s.id === pagina.secao)?.titulo || "Início", texto: textoPuroDeHtml(corpo).slice(0, 9000) });
}

fs.writeFileSync(path.join(DOCS, "assets", "busca-indice.js"), "window.BUSCA_INDICE = " + JSON.stringify(indiceBusca) + ";\n", "utf8");
fs.writeFileSync(path.join(DATA, "verificacao.json"), JSON.stringify({
  gerado_em: DATA_VERIF, commit: COMMIT, paginas: total,
  referencias_quebradas: [...new Set(referenciasQuebradas)].sort(),
  referencias_para_paginas_planejadas: [...referenciasPlanejadas].sort(), avisos: problemas.avisos
}, null, 2) + "\n", "utf8");

console.log(`Geradas ${total} páginas em docs/ (índice de busca com ${indiceBusca.length} entradas).`);
if (referenciasQuebradas.length) console.log(`ATENÇÃO: ${new Set(referenciasQuebradas).size} referência(s) quebrada(s):\n  ` + [...new Set(referenciasQuebradas)].join("\n  "));
if (referenciasPlanejadas.size) console.log(`${referenciasPlanejadas.size} referência(s) a páginas planejadas e ainda não escritas (mostradas como etiqueta cinza).`);
if (problemas.avisos.length) console.log("Avisos:\n  " + problemas.avisos.join("\n  "));
