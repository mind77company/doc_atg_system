// Conversor mínimo de Markdown + diretivas para HTML, sem dependências.
// Usado apenas por docs/scripts/gerar.mjs. HTML cru nunca é aceito no texto:
// tudo é escapado, então um .md não consegue injetar script nas páginas.
//
// Sintaxe de diretivas (linha própria, fechada por ":::" sozinho):
//   :::resumo ... :::                 "Resumo simples" (sempre visível)
//   :::detalhes Título ... :::        "Detalhes técnicos" recolhível ("+Título" abre já expandido)
//   :::fonte ... :::                  bloco discreto "Fonte" (caminhos entre crases entram no rodapé)
//   :::alerta tipo Título ... :::     tipo: aviso | seguranca | info | nc
//   :::diagrama Texto alternativo     código Mermaid dentro; vira figura com botão de ampliar
//   :::gerado nome argumento :::      bloco montado por gerar.mjs a partir de docs/data
// Inline: **negrito**, *itálico*, `código`, [texto](url), [[tipo:id]] ou [[tipo:id|texto]]
//         {{nc}} {{fi}} {{pessoal}} {{legado}} {{calculado}} {{naousado}}

export const esc = (s) => String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

export function slugify(s) {
  return String(s).toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "item";
}

const SELOS = {
  nc: ["nc", "Não confirmado"],
  fi: ["fi", "Finalidade não identificada"],
  pessoal: ["pessoal", "Dado pessoal"],
  legado: ["legado", "Legado"],
  calculado: ["calculado", "Calculado"],
  naousado: ["naousado", "Não utilizado"]
};
export const selo = (k) => (SELOS[k] ? `<span class="selo ${SELOS[k][0]}">${SELOS[k][1]}</span>` : "");

// ------------------------------------------------------------ inline
export function inline(texto, ctx) {
  const guardados = [];
  const guardar = (html) => { guardados.push(html); return `\u0000${guardados.length - 1}\u0000`; };
  let t = String(texto);
  t = t.replace(/`([^`]+)`/g, (_, c) => guardar(`<code>${esc(c)}</code>`));
  t = esc(t);
  t = t.replace(/\{\{(nc|fi|pessoal|legado|calculado|naousado)\}\}/g, (_, k) => guardar(selo(k)));
  t = t.replace(/\[\[([a-z-]+):([^\]|]+)(?:\|([^\]]+))?\]\]/g, (_, tipo, id, rotulo) => guardar(ctx.referencia(tipo, id.trim(), rotulo)));
  t = t.replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (_, rot, url) => {
    const externo = /^https?:/.test(url);
    return guardar(`<a href="${url}"${externo ? ' rel="noopener" target="_blank"' : ""}>${rot}</a>`);
  });
  t = t.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
  t = t.replace(/(^|[\s(])\*([^*\s][^*]*)\*(?=[\s).,;:!?]|$)/g, "$1<em>$2</em>");
  return t.replace(/\u0000(\d+)\u0000/g, (_, i) => guardados[Number(i)]);
}

// ------------------------------------------------------------ blocos
function acharFim(linhas, ini) {
  let nivel = 1, fence = false;
  for (let i = ini + 1; i < linhas.length; i++) {
    const l = linhas[i];
    if (/^```/.test(l.trim())) fence = !fence;
    if (fence) continue;
    if (/^:::\S/.test(l)) nivel++;
    else if (l.trim() === ":::") { nivel--; if (nivel === 0) return i; }
  }
  return linhas.length;
}

function renderTabela(linhasTab, ctx) {
  const celulas = (l) => l.trim().replace(/^\|/, "").replace(/\|$/, "").split(/(?<!\\)\|/).map((c) => c.trim().replace(/\\\|/g, "|"));
  const cab = celulas(linhasTab[0]);
  const corpo = linhasTab.slice(2).map(celulas);
  const ord = corpo.length >= 4;
  const filtro = corpo.length >= 10;
  let h = `<div class="tabela-envoltorio">`;
  if (filtro) h += `<div class="tabela-barra"><label>Filtrar <input type="search" placeholder="digite para filtrar"></label><span class="contador">${corpo.length} de ${corpo.length}</span></div>`;
  h += `<table${ord ? ' class="ordenavel"' : ""}><thead><tr>${cab.map((c) => `<th>${inline(c, ctx)}</th>`).join("")}</tr></thead><tbody>`;
  for (const l of corpo) h += `<tr>${cab.map((_, i) => `<td>${inline(l[i] ?? "", ctx)}</td>`).join("")}</tr>`;
  return h + `</tbody></table></div>`;
}

function renderLista(linhas, ctx) {
  // linhas: itens ja no mesmo bloco de lista; suporta um nivel de aninhamento por indentacao
  const ordenada = /^\s*\d+[.)]\s/.test(linhas[0]);
  const base = linhas[0].match(/^(\s*)/)[1].length;
  const itens = [];
  for (const l of linhas) {
    const ind = l.match(/^(\s*)/)[1].length;
    const m = l.match(/^\s*(?:[-*]|\d+[.)])\s+(.*)$/);
    if (m && ind <= base) itens.push({ texto: m[1], filhos: [] });
    else if (m && itens.length) itens[itens.length - 1].filhos.push(l);
    else if (itens.length) {
      const it = itens[itens.length - 1];
      if (it.filhos.length) it.filhos.push(l); else it.texto += " " + l.trim();
    }
  }
  const tag = ordenada ? "ol" : "ul";
  return `<${tag}>` + itens.map((it) => `<li>${inline(it.texto, ctx)}${it.filhos.length ? renderLista(it.filhos, ctx) : ""}</li>`).join("") + `</${tag}>`;
}

export function blocos(linhas, ctx) {
  let h = "";
  let i = 0;
  while (i < linhas.length) {
    const l = linhas[i];
    if (!l.trim()) { i++; continue; }

    // diretiva
    let m = l.match(/^:::([\w-]+)\s*(.*)$/);
    if (m) {
      const fim = acharFim(linhas, i);
      const interno = linhas.slice(i + 1, fim);
      h += diretiva(m[1], m[2].trim(), interno, ctx);
      i = fim + 1;
      continue;
    }
    // bloco de codigo
    m = l.match(/^```(\w*)\s*$/);
    if (m) {
      const cod = [];
      i++;
      while (i < linhas.length && !/^```\s*$/.test(linhas[i])) cod.push(linhas[i++]);
      i++;
      h += `<pre><code>${esc(cod.join("\n"))}</code></pre>`;
      continue;
    }
    // titulo
    m = l.match(/^(#{1,4})\s+(.*)$/);
    if (m) {
      const n = m[1].length;
      const textoPuro = m[2].replace(/[`*]/g, "").replace(/\{\{\w+\}\}/g, "").replace(/\[\[[^\]]+\]\]/g, "").trim();
      const id = ctx.idUnico(slugify(textoPuro));
      if (n === 2 || n === 3) ctx.toc.push({ n, id, texto: textoPuro });
      h += `<h${n} id="${id}">${inline(m[2], ctx)}</h${n}>`;
      i++;
      continue;
    }
    // regra
    if (/^(-{3,}|\*{3,})\s*$/.test(l)) { h += "<hr>"; i++; continue; }
    // tabela
    if (/^\s*\|/.test(l) && i + 1 < linhas.length && /^\s*\|?[\s:|-]+\|[\s:|-]*$/.test(linhas[i + 1])) {
      const tab = [];
      while (i < linhas.length && /^\s*\|/.test(linhas[i])) tab.push(linhas[i++]);
      h += renderTabela(tab, ctx);
      continue;
    }
    // citacao
    if (/^>\s?/.test(l)) {
      const q = [];
      while (i < linhas.length && /^>\s?/.test(linhas[i])) q.push(linhas[i++].replace(/^>\s?/, ""));
      h += `<blockquote>${blocos(q, ctx)}</blockquote>`;
      continue;
    }
    // lista
    if (/^\s*(?:[-*]|\d+[.)])\s+/.test(l)) {
      const lista = [];
      while (i < linhas.length && linhas[i].trim() && (/^\s*(?:[-*]|\d+[.)])\s+/.test(linhas[i]) || /^\s{2,}\S/.test(linhas[i]))) lista.push(linhas[i++]);
      h += renderLista(lista, ctx);
      continue;
    }
    // paragrafo
    const p = [];
    while (i < linhas.length && linhas[i].trim() && !/^(#{1,4}\s|:::|```|>\s?|\s*\|)/.test(linhas[i]) && !/^\s*(?:[-*]|\d+[.)])\s+/.test(linhas[i])) p.push(linhas[i++].trim());
    h += `<p>${inline(p.join(" "), ctx)}</p>`;
  }
  return h;
}

function diretiva(nome, args, interno, ctx) {
  switch (nome) {
    case "resumo":
      return `<section class="resumo"><span class="rotulo">Resumo simples</span>${blocos(interno, ctx)}</section>`;
    case "detalhes": {
      const aberto = args.startsWith("+");
      const titulo = args.replace(/^\+/, "").trim();
      return `<details class="tecnico"${aberto ? " open" : ""}><summary>Detalhes técnicos${titulo ? `<small>${inline(titulo, ctx)}</small>` : ""}</summary><div class="corpo">${blocos(interno, ctx)}</div></details>`;
    }
    case "fonte": {
      const texto = interno.join("\n");
      for (const c of texto.matchAll(/`([^`]+)`/g)) ctx.registrarFonte(c[1]);
      return `<aside class="fonte"><span class="rotulo">Fonte</span>${blocos(interno, ctx).replace(/^<p>([\s\S]*)<\/p>$/, "$1")}</aside>`;
    }
    case "alerta": {
      const [tipoBruto, ...resto] = args.split(/\s+/);
      const tipo = ["aviso", "seguranca", "info", "nc"].includes(tipoBruto) ? tipoBruto : "info";
      const rotulos = { aviso: "Atenção", seguranca: "Alerta de segurança", info: "Nota", nc: "Não confirmado" };
      const titulo = resto.join(" ") || rotulos[tipo];
      return `<div class="alerta ${tipo}"><span class="rotulo">${inline(titulo, ctx)}</span>${blocos(interno, ctx)}</div>`;
    }
    case "diagrama": {
      ctx.temDiagrama = true;
      const alt = args || "Diagrama";
      const id = ctx.idUnico("diagrama");
      return `<figure class="diagrama" id="${id}" data-alt="${esc(alt)}"><button type="button" class="ampliar" aria-label="Ampliar diagrama em tela cheia">Ampliar</button><div class="area"><pre class="mermaid">${esc(interno.join("\n"))}</pre></div><figcaption>${esc(alt)}</figcaption></figure>`;
    }
    case "gerado": {
      const [nomeGerado, ...a] = args.split(/\s+/);
      return ctx.gerado(nomeGerado, a.join(" "));
    }
    default:
      ctx.avisos.push(`diretiva desconhecida: ${nome}`);
      return `<div class="alerta aviso"><span class="rotulo">Diretiva desconhecida: ${esc(nome)}</span></div>`;
  }
}

// ------------------------------------------------------------ front matter
export function separarFrontMatter(texto) {
  texto = texto.replace(/^﻿/, "").replace(/\r\n/g, "\n");
  const m = texto.match(/^---\n([\s\S]*?)\n---\n?/);
  if (!m) return { meta: {}, corpo: texto };
  const meta = {};
  let chaveLista = null;
  for (const l of m[1].split("\n")) {
    const item = l.match(/^\s+-\s+(.*)$/);
    if (item && chaveLista) { meta[chaveLista].push(item[1].trim()); continue; }
    const kv = l.match(/^([\w-]+):\s*(.*)$/);
    if (!kv) continue;
    if (kv[2] === "") { meta[kv[1]] = []; chaveLista = kv[1]; }
    else { meta[kv[1]] = kv[2].replace(/^["']|["']$/g, ""); chaveLista = null; }
  }
  return { meta, corpo: texto.slice(m[0].length) };
}

export function textoPuroDeHtml(html) {
  return html
    .replace(/<(script|style|pre class="mermaid")[\s\S]*?<\/(script|style|pre)>/g, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&amp;/g, "&")
    .replace(/\s+/g, " ").trim();
}
