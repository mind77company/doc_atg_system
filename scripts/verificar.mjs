#!/usr/bin/env node
// Verifica a defasagem entre o que existe (código, banco, fluxos) e o que está documentado.
// Somente leitura: não altera nenhum arquivo. Imprime um relatório em texto.
//
// Uso:   node docs/scripts/verificar.mjs
// Antes: node docs/scripts/extrair.mjs   (para os dados gerados estarem atualizados)
// Código de saída: 0 = em dia; 1 = há defasagem; 2 = possível segredo encontrado nas páginas.

import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { separarFrontMatter } from "./lib/md.mjs";

const AQUI = path.dirname(fileURLToPath(import.meta.url));
const DOCS = path.resolve(AQUI, "..");
const RAIZ = path.resolve(DOCS, "..");
const DATA = path.join(DOCS, "data");
const ler = (n, padrao) => { const p = path.join(DATA, n); return fs.existsSync(p) ? JSON.parse(fs.readFileSync(p, "utf8").replace(/^﻿/, "")) : padrao; };
const git = (c) => { try { return execSync("git " + c, { cwd: RAIZ, stdio: ["ignore", "pipe", "ignore"] }).toString().trim(); } catch { return null; } };

const banco = ler("banco.gerado.json", { objetos: {}, funcoes: {}, meta: {} });
const manual = ler("banco.manual.json", { objetos: {}, funcoes: {} });
const codigo = ler("codigo.gerado.json", { tabelas: {}, rpcs: {}, webhooks_chamados_pelo_front: {}, variaveis_ambiente: {}, rotas: [] });
const fluxos = ler("fluxos.gerado.json", { fluxos: [] }).fluxos;
const fluxosMan = ler("fluxos.manual.json", { fluxos: {} }).fluxos;
const nav = ler("navegacao.json", { secoes: [] });
const verif = ler("verificacao.json", {});
const HEAD = git("rev-parse --short HEAD") || "desconhecido";

const secoes = [];
let defasagem = 0;
const secao = (titulo, itens, { conta = true } = {}) => {
  secoes.push({ titulo, itens });
  if (conta) defasagem += itens.length;
};

const planejadas = new Set();
for (const s of nav.secoes) for (const p of s.planejadas || []) planejadas.add(`${s.id}/${p.slug}`);
const slugObj = (n) => "t-" + n.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");

// 1 e 2. Tabelas e views
const doc = new Set(Object.entries(manual.objetos || {}).filter(([, o]) => o.documentar !== false).map(([n]) => n));
const ignorado = (n) => /^INATIVO_/.test(n) || /_bkp_/.test(n);
const naoDoc = [], planej = [];
for (const n of Object.keys(banco.objetos)) {
  if (ignorado(n) || doc.has(n)) continue;
  (planejadas.has(`banco/${slugObj(n)}`) ? planej : naoDoc).push(n);
}
secao("Tabelas e views que existem no banco e NÃO estão documentadas nem planejadas (INATIVO_* e cópias _bkp_ são ignoradas)", naoDoc);
secao("Tabelas e views planejadas e ainda não documentadas (informativo)", planej, { conta: false });
secao("Tabelas ou views documentadas que não existem mais no banco", [...doc].filter((n) => !banco.objetos[n]));

// 3. Campos
const campoNovo = [], campoSumiu = [], campoSemDesc = [];
for (const n of doc) {
  const o = banco.objetos[n]; if (!o) continue;
  const man = manual.objetos[n].campos || {};
  const nomes = new Set(o.colunas.map((c) => c.nome));
  for (const c of o.colunas) if (!man[c.nome]) campoSemDesc.push(`${n}.${c.nome}`);
  for (const k of Object.keys(man)) if (!nomes.has(k)) campoSumiu.push(`${n}.${k}`);
}
secao("Campos do banco sem descrição manual (aparecem como 'Finalidade não identificada')", campoSemDesc);
secao("Campos documentados que não existem mais no banco", campoSumiu);

// 4. Funções
const fBanco = Object.keys(banco.funcoes), fMan = Object.keys(manual.funcoes || {});
secao("Funções do banco sem descrição manual", fBanco.filter((f) => !fMan.includes(f)));
secao("Funções documentadas que não existem mais", fMan.filter((f) => !fBanco.includes(f)));

// 5. Código
const tabCod = Object.keys(codigo.tabelas || {});
secao("Tabelas/views usadas no código (src/) que não existem na extração do banco", tabCod.filter((t) => !banco.objetos[t]));
secao("Tabelas/views usadas no código e ainda não documentadas nem planejadas", tabCod.filter((t) => banco.objetos[t] && !doc.has(t) && !planejadas.has(`banco/${slugObj(t)}`)));
secao("Funções (RPC) chamadas no código que não existem na extração do banco", Object.keys(codigo.rpcs || {}).filter((r) => !banco.funcoes[r]));

// webhooks
const caminhosN8n = new Set(fluxos.map((f) => f.gatilho?.caminho).filter(Boolean));
const chamados = Object.keys(codigo.webhooks_chamados_pelo_front || {}).filter((k) => !k.startsWith("edge:"));
secao("Webhooks chamados pelo front que não existem nas exportações do n8n (caminho divergente ou export desatualizado)", chamados.filter((w) => !caminhosN8n.has(w)));
secao("Webhooks do n8n que nenhum arquivo do front chama (pode ser normal: agendados ou externos)", [...caminhosN8n].filter((w) => !chamados.includes(w)), { conta: false });

// 6. Fluxos
const nomesDoc = new Set(Object.values(fluxosMan).map((f) => f.nome_n8n));
secao("Fluxos do n8n sem descrição manual em fluxos.manual.json (planejados para próximos módulos)", fluxos.filter((f) => !nomesDoc.has(f.nome)).map((f) => f.nome), { conta: false });
const nosSemDesc = [];
for (const [slug, f] of Object.entries(fluxosMan)) {
  const g = fluxos.find((x) => x.nome === f.nome_n8n);
  if (!g) { nosSemDesc.push(`${slug}: fluxo '${f.nome_n8n}' não está na exportação`); continue; }
  for (const n of g.nos) if (n.tipo !== "stickyNote" && !f.nos?.[n.nome]) nosSemDesc.push(`${slug}: etapa '${n.nome}' sem descrição`);
  for (const k of Object.keys(f.nos || {})) if (!g.nos.some((n) => n.nome === k)) nosSemDesc.push(`${slug}: descrição de etapa que não existe mais: '${k}'`);
}
secao("Fluxos documentados com etapas sem descrição ou descrições órfãs", nosSemDesc);

// variáveis de ambiente
const envDoc = fs.existsSync(path.join(DOCS, "conteudo", "operacao", "variaveis-ambiente.md")) ? fs.readFileSync(path.join(DOCS, "conteudo", "operacao", "variaveis-ambiente.md"), "utf8") : "";
secao("Variáveis de ambiente do código não citadas em operacao/variaveis-ambiente", Object.keys(codigo.variaveis_ambiente || {}).filter((v) => !envDoc.includes(v)));

// 7. Seções cuja fonte mudou desde o commit verificado
const mudou = [];
function pagina(id, commit, fontes) {
  if (!commit || commit === "desconhecido") { mudou.push(`${id}: sem commit de verificação`); return; }
  const alterados = new Set();
  const diff = git(`diff --name-only ${commit} HEAD`);
  if (diff === null) { mudou.push(`${id}: commit ${commit} não encontrado neste repositório`); return; }
  diff.split("\n").filter(Boolean).forEach((f) => alterados.add(f));
  // git() remove espaços das pontas, então a 1ª linha perde o espaço inicial: não dá para cortar por posição fixa.
  (git("status --porcelain") || "").split("\n").filter(Boolean).forEach((l) => alterados.add(l.replace(/^\s*\S+\s+/, "").replace(/"/g, "")));
  const tocadas = (fontes || []).map((f) => f.replace(/\s*\(.*$/, "").trim()).filter((f) => /^(src|supabase)\//.test(f) && alterados.has(f));
  if (tocadas.length) mudou.push(`${id} (verificada no commit ${commit}): fonte alterada desde então: ${tocadas.join(", ")}`);
}
function varrer(d, acc = []) { for (const e of fs.existsSync(d) ? fs.readdirSync(d, { withFileTypes: true }) : []) { const p = path.join(d, e.name); e.isDirectory() ? varrer(p, acc) : e.name.endsWith(".md") && acc.push(p); } return acc; }
const semFonte = [];
for (const arq of varrer(path.join(DOCS, "conteudo"))) {
  const { meta, corpo } = separarFrontMatter(fs.readFileSync(arq, "utf8"));
  const id = path.relative(path.join(DOCS, "conteudo"), arq).split(path.sep).join("/");
  const fontes = meta.fontes || [];
  if (!fontes.length && !/:::fonte/.test(corpo)) semFonte.push(id);
  pagina(id, meta.commit, fontes);
}
for (const [n, o] of Object.entries(manual.objetos || {})) {
  if (o.documentar === false) continue;
  pagina(`banco/${n}`, o.commit || banco.meta?.commit, o.fontes || []);
  if (!(o.fontes || []).length) semFonte.push(`banco/${n}`);
}
secao("Páginas cuja fonte (src/ ou supabase/) mudou depois do commit em que foram verificadas", mudou);
secao("Páginas sem nenhuma fonte registrada", semFonte);

// 8. Referências cruzadas
secao("Referências cruzadas quebradas (apontam para página inexistente e não planejada)", verif.referencias_quebradas || []);
secao("Referências a páginas planejadas e ainda não escritas (informativo)", (verif.referencias_para_paginas_planejadas || []).slice(0, 15), { conta: false });
secao("Avisos do gerador de páginas", verif.avisos || []);

// 9. Idade dos dados gerados
const idadeDados = [];
for (const [nome, d] of [["banco.gerado.json", banco], ["codigo.gerado.json", codigo], ["fluxos.gerado.json", ler("fluxos.gerado.json", {})]]) {
  const c = d.meta?.commit;
  if (c && c !== HEAD) idadeDados.push(`${nome} foi extraído no commit ${c}; o commit atual é ${HEAD}. Rode extrair.mjs.`);
}
secao("Dados gerados desatualizados em relação ao commit atual", idadeDados);

// 9b. Links reais nos HTML gerados (arquivo e âncora), e recursos externos (quebram o uso offline)
{
  const htmls = [];
  const varrerHtml = (d) => { for (const e of fs.existsSync(d) ? fs.readdirSync(d, { withFileTypes: true }) : []) { const p = path.join(d, e.name); e.isDirectory() ? varrerHtml(p) : e.name.endsWith(".html") && htmls.push(p); } };
  varrerHtml(path.join(DOCS, "paginas"));
  if (fs.existsSync(path.join(DOCS, "index.html"))) htmls.push(path.join(DOCS, "index.html"));
  const cacheIds = new Map();
  const idsDe = (arq) => { if (!cacheIds.has(arq)) cacheIds.set(arq, new Set([...fs.readFileSync(arq, "utf8").matchAll(/\sid="([^"]+)"/g)].map((m) => m[1]))); return cacheIds.get(arq); };
  const quebrados = [], externos = [];
  for (const arq of htmls) {
    const html = fs.readFileSync(arq, "utf8");
    const rotulo = path.relative(DOCS, arq).split(path.sep).join("/");
    for (const m of html.matchAll(/\b(?:href|src)="([^"]*)"/g)) {
      const alvo = m[1];
      if (!alvo || /^(mailto:|javascript:|data:)/.test(alvo)) continue;
      if (/^https?:/.test(alvo)) { externos.push(`${rotulo}: ${alvo.slice(0, 60)}`); continue; }
      const [arqRel, ancora] = alvo.split("#");
      const destino = arqRel ? path.resolve(path.dirname(arq), arqRel) : arq;
      if (!fs.existsSync(destino)) { quebrados.push(`${rotulo} -> ${alvo}`); continue; }
      if (ancora && destino.endsWith(".html") && !idsDe(destino).has(ancora)) quebrados.push(`${rotulo} -> ${alvo} (âncora inexistente)`);
    }
  }
  secao(`Links ou âncoras quebrados nos HTML gerados (${htmls.length} arquivos verificados)`, quebrados);
  secao("Recursos externos nas páginas (exigiriam internet; devem ser zero)", externos);
}

// 9c. Termos técnicos usados nas páginas e ausentes do glossário
{
  const indiceTxt = fs.existsSync(path.join(DOCS, "assets", "busca-indice.js")) ? fs.readFileSync(path.join(DOCS, "assets", "busca-indice.js"), "utf8") : "";
  const indice = indiceTxt ? JSON.parse(indiceTxt.replace(/^window\.BUSCA_INDICE\s*=\s*/, "").replace(/;\s*$/, "")) : [];
  const gl = ler("glossario.json", { termos: [] }).termos;
  const conhecidos = new Set(gl.flatMap((t) => [t.termo, ...(t.apelidos || [])]).map((x) => x.toLowerCase()));
  const TECNICOS = ["JWT", "token", "OAuth", "CORS", "SMTP", "PostgREST", "CFOP", "NCM", "UUID", "Vercel", "Vite", "React", "TypeScript", "Tailwind", "Easypanel", "cache", "build", "commit", "upsert", "SQL", "backup", "pg_cron", "proxy", "CDN", "RLS", "RPC", "webhook", "trigger", "gatilho", "view", "índice", "migration", "JSON", "API", "HTTP", "URL", "Edge Function", "service_role", "SECURITY DEFINER", "pg_trgm", "staging", "rate limit", "mock", "credencial", "Supabase", "n8n", "Omie", "iClass", "PostgreSQL", "Git", "npm", "ER", "UazAPI", "app_metadata", "paginação", "fallback", "timeout", "tempo limite"];
  const faltam = [];
  for (const t of TECNICOS) {
    if (conhecidos.has(t.toLowerCase())) continue;
    const re = new RegExp("(?<![\\p{L}\\p{N}_])" + t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "(?![\\p{L}\\p{N}_])", t === t.toUpperCase() ? "u" : "iu");
    const n = indice.filter((p) => p.url !== "paginas/glossario.html" && re.test(p.texto)).length;
    if (n) faltam.push(`${t} (usado em ${n} página(s))`);
  }
  secao("Termos técnicos usados nas páginas que não estão no glossário", faltam);
}

// 9d. Dados pessoais e de clientes nas páginas e no conteúdo (devem ser zero; exemplos fictícios usam .invalid ou zeros)
{
  const pessoais = [];
  const alvos = [path.join(DOCS, "conteudo"), DATA, path.join(DOCS, "paginas"), path.join(DOCS, "index.html")];
  const lista = (p, acc = []) => { if (!fs.existsSync(p)) return acc; if (fs.statSync(p).isDirectory()) fs.readdirSync(p).forEach((f) => lista(path.join(p, f), acc)); else if (/\.(html|md|json)$/.test(p) && !/banco\.gerado|codigo\.gerado|fluxos\.gerado/.test(p)) acc.push(p); return acc; };
  for (const a of alvos.flatMap((x) => lista(x))) {
    const t = fs.readFileSync(a, "utf8");
    const rotulo = path.relative(DOCS, a).split(path.sep).join("/");
    const emails = [...t.matchAll(/[A-Za-z0-9._%+-]+@[A-Za-z0-9-]+\.[A-Za-z.]{2,}/g)].map((m) => m[0]).filter((e) => !/\.invalid$|@exemplo\.|@sistema\.com|noreply@anthropic/i.test(e));
    if (emails.length) pessoais.push(`${rotulo}: e-mail ${emails.length}x (${emails[0].replace(/^[^@]+/, "***")})`);
    const cnpjs = [...t.matchAll(/\b\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}\b/g)].map((m) => m[0]).filter((c) => !/^0+(\D0+)*$/.test(c.replace(/\D/g, "")));
    if (cnpjs.length) pessoais.push(`${rotulo}: CNPJ ${cnpjs.length}x`);
    if (/\(?\b\d{2}\)?\s?9\d{4}-?\d{4}\b/.test(t) && !/00000000|9999-9999|99999-9999/.test(t.match(/\(?\b\d{2}\)?\s?9\d{4}-?\d{4}\b/)[0])) pessoais.push(`${rotulo}: possível telefone`);
  }
  secao("Possíveis dados pessoais (e-mails, CNPJ, telefones reais) nas páginas e no conteúdo", pessoais);
}

// 9e. Itens de controle sem fonte
{
  const pt = ler("pontos.json", { itens: [] }).itens;
  secao("Itens de 'Pontos a validar' e 'Achados' sem nenhuma fonte (informativo)", pt.filter((p) => !(p.fontes || []).length).map((p) => `${p.id}: ${p.titulo}`), { conta: false });
}

// 10. Possíveis segredos nas páginas e dados (nunca devem existir)
const padroes = [
  [/eyJ[A-Za-z0-9_-]{15,}\.[A-Za-z0-9_-]{15,}/, "token JWT"],
  [/\b[0-9a-f]{32,}\b/i, "sequência hexadecimal longa"],
  [/(app_secret|app_key|apikey|api_key|password|senha)["'\s:=]+[A-Za-z0-9_\-]{12,}/i, "chave ou senha com valor"],
  [/\bsk_(live|test)_[A-Za-z0-9]{10,}/, "chave de API"],
  [/postgres(ql)?:\/\/[^\s"']+:[^\s"']+@/i, "string de conexão com senha"]
];
const segredos = [];
const alvo = [path.join(DOCS, "index.html"), path.join(DOCS, "paginas"), path.join(DOCS, "conteudo"), DATA, path.join(DOCS, "assets", "busca-indice.js")];
function arquivos(p, acc = []) {
  if (!fs.existsSync(p)) return acc;
  if (fs.statSync(p).isDirectory()) fs.readdirSync(p).forEach((f) => arquivos(path.join(p, f), acc)); else if (/\.(html|md|json|js)$/.test(p)) acc.push(p);
  return acc;
}
for (const a of alvo.flatMap((p) => arquivos(p))) {
  const t = fs.readFileSync(a, "utf8");
  for (const [re, nome] of padroes) {
    if (!re.test(t)) continue;
    // O padrão "chave ou senha com valor" casa prosa (ex.: "senha convite-e-senha"). Só conta se o valor
    // parecer uma chave de verdade: tem dígito, ou mistura maiúsculas e minúsculas.
    if (nome === "chave ou senha com valor") {
      const g = new RegExp(re.source, "gi");
      const reais = [...t.matchAll(g)].filter((m) => { const v = m[0].split(/["'\s:=]+/).pop(); return /\d/.test(v) || (/[A-Z]/.test(v) && /[a-z]/.test(v)); });
      if (!reais.length) continue;
    }
    segredos.push(`${path.relative(DOCS, a).split(path.sep).join("/")}: ${nome}`);
  }
}
const nSeg = segredos.length;
secoes.push({ titulo: "POSSÍVEIS SEGREDOS nas páginas ou dados (deve ser zero)", itens: segredos });

// ------------------------------------------------------------------ saída
console.log("RELATÓRIO DE VERIFICAÇÃO DA DOCUMENTAÇÃO");
console.log(`Commit atual: ${HEAD}   |   Data: ${new Date().toISOString().slice(0, 10)}`);
const nl = (git("status --porcelain -- src supabase") || "").split("\n").filter(Boolean);
if (nl.length) console.log(`Atenção: há ${nl.length} arquivo(s) de src/supabase com alterações não commitadas (a verificação os considera alterados).`);
console.log("");
for (const s of secoes) {
  console.log(`${s.itens.length === 0 ? "[ok]   " : "[" + String(s.itens.length).padStart(3) + "] "} ${s.titulo}`);
  s.itens.slice(0, 40).forEach((i) => console.log(`        - ${i}`));
  if (s.itens.length > 40) console.log(`        ... e mais ${s.itens.length - 40}`);
}
console.log("");
console.log(nSeg ? "RESULTADO: possível segredo encontrado. Revise antes de qualquer compartilhamento." : defasagem ? `RESULTADO: ${defasagem} ponto(s) de defasagem. Veja os itens acima.` : "RESULTADO: documentação em dia com o código e o banco.");
process.exit(nSeg ? 2 : defasagem ? 1 : 0);
