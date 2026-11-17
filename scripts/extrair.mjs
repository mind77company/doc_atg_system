#!/usr/bin/env node
// Extrai dados estruturados do projeto para docs/data/*.gerado.json.
//
// Fontes lidas (somente leitura):
//   - docs/_fontes_privadas/schema/schema_banco_atg_completo.csv   (colunas do banco)
//   - docs/_fontes_privadas/sql_resultados/Q*.json                 (resultado das consultas de docs/scripts/extracao_banco.sql)
//   - src/ e supabase/functions/                                   (tabelas, RPCs, rotas, variaveis de ambiente)
//   - docs/_fontes_privadas/n8n/*.json                             (exportacoes dos fluxos do n8n)
//
// Seguranca: este script NUNCA copia valores de parametros, cabecalhos, chaves ou
// codigo de nos do n8n. Do n8n leva apenas: nome do no, tipo, caminho do webhook,
// host/caminho das chamadas HTTP (sem query), tipos de credencial e ligacoes.
// Nao altera arquivos manuais (banco.manual.json, fluxos.manual.json, conteudo/*.md).
//
// Uso: node docs/scripts/extrair.mjs

import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const AQUI = path.dirname(fileURLToPath(import.meta.url));
const DOCS = path.resolve(AQUI, "..");
const RAIZ = path.resolve(DOCS, "..");
const PRIV = path.join(DOCS, "_fontes_privadas");
const DATA = path.join(DOCS, "data");
fs.mkdirSync(DATA, { recursive: true });

const rel = (p) => path.relative(RAIZ, p).split(path.sep).join("/");
const lerJson = (p, padrao = null) => (fs.existsSync(p) ? JSON.parse(fs.readFileSync(p, "utf8")) : padrao);
const gravar = (nome, obj) => {
  fs.writeFileSync(path.join(DATA, nome), JSON.stringify(obj, null, 2) + "\n", "utf8");
  console.log("  gravado docs/data/" + nome);
};

function git(cmd) {
  try {
    return execSync("git " + cmd, { cwd: RAIZ, stdio: ["ignore", "pipe", "ignore"] }).toString().trim();
  } catch {
    return "";
  }
}
const COMMIT = git("rev-parse --short HEAD") || "desconhecido";
const HOJE = new Date().toISOString().slice(0, 10);
const META = { gerado_em: HOJE, commit: COMMIT, alteracoes_nao_commitadas: git("status --porcelain -- src supabase").length > 0 };

// ---------------------------------------------------------------- CSV
function parseCsv(texto) {
  texto = texto.replace(/^﻿/, "");
  const linhas = [];
  let campo = "", linha = [], aspas = false;
  for (let i = 0; i < texto.length; i++) {
    const c = texto[i];
    if (aspas) {
      if (c === '"' && texto[i + 1] === '"') { campo += '"'; i++; }
      else if (c === '"') aspas = false;
      else campo += c;
    } else if (c === '"') aspas = true;
    else if (c === ",") { linha.push(campo); campo = ""; }
    else if (c === "\n" || c === "\r") {
      if (c === "\r" && texto[i + 1] === "\n") i++;
      linha.push(campo); campo = "";
      if (linha.length > 1 || linha[0] !== "") linhas.push(linha);
      linha = [];
    } else campo += c;
  }
  if (campo !== "" || linha.length) { linha.push(campo); linhas.push(linha); }
  const [cab, ...resto] = linhas;
  return resto.map((l) => Object.fromEntries(cab.map((h, i) => [h, l[i] ?? ""])));
}

// ---------------------------------------------------------------- BANCO
function extrairBanco() {
  console.log("Banco de dados");
  const csv = path.join(PRIV, "schema", "schema_banco_atg_completo.csv");
  const sqlDir = path.join(PRIV, "sql_resultados");
  const Q = (n) => lerJson(path.join(sqlDir, n + ".json"), []);
  const objetos = {};
  const obj = (nome) => (objetos[nome] ??= {
    nome, tipo: "tabela", linhas: null, comentario: null, colunas: [], restricoes: [], indices: [],
    triggers: [], rls: { ativo: null, politicas: [] }, grants: {}, definicao_view: null
  });

  if (fs.existsSync(csv)) {
    for (const r of parseCsv(fs.readFileSync(csv, "utf8"))) {
      const o = obj(r.table_name);
      const padrao = r.column_default === "null" ? null : r.column_default;
      const tipoChave = r.constraint_type && r.constraint_type !== "null" ? r.constraint_type : null;
      const existente = o.colunas.find((c) => c.nome === r.column_name);
      if (existente) { // o CSV repete a coluna uma vez por restricao
        if (tipoChave && !existente.chaves.includes(tipoChave)) existente.chaves.push(tipoChave);
        continue;
      }
      o.colunas.push({
        nome: r.column_name, tipo: r.data_type, obrigatorio: r.is_nullable === "NO",
        padrao, chaves: tipoChave ? [tipoChave] : []
      });
    }
  } else console.warn("  AVISO: CSV do schema nao encontrado em " + rel(csv));

  for (const r of Q("Q08")) {
    const o = obj(r.objeto);
    o.tipo = { r: "tabela", v: "view", m: "view materializada", p: "tabela" }[r.tipo] || r.tipo;
    o.linhas = Number(r.linhas);
    o.comentario = r.comentario || null;
  }
  const tabelaLimpa = (t) => String(t).replace(/^public\./, "").replace(/^"|"$/g, "");
  for (const r of Q("Q01")) obj(tabelaLimpa(r.tabela)).restricoes.push({ nome: r.restricao, tipo: r.tipo, definicao: r.definicao });
  for (const r of Q("Q02")) obj(tabelaLimpa(r.tabela)).indices.push({ nome: r.indice, definicao: r.definicao });
  for (const r of Q("Q05")) obj(tabelaLimpa(r.tabela)).triggers.push({ nome: r.trigger, habilitado: r.habilitado, definicao: r.definicao });
  for (const r of Q("Q06")) {
    const o = obj(tabelaLimpa(r.tabela));
    o.rls.ativo = r.rls_ativo;
    if (r.politica) o.rls.politicas.push({ nome: r.politica, comando: r.comando, papeis: r.papeis, leitura: r.condicao_leitura, escrita: r.condicao_escrita });
  }
  for (const r of Q("Q12")) obj(tabelaLimpa(r.tabela)).grants[r.papel] = r.privilegios;

  // Definicao das views (uma linha por registro)
  const defs = {};
  for (const r of Q("Q03")) (defs[r.objeto] ??= []).push([r.linha_n, r.linha]);
  for (const [nome, ls] of Object.entries(defs)) {
    obj(nome).definicao_view = ls.sort((a, b) => a[0] - b[0]).map((x) => x[1]).join("\n");
  }

  // Funcoes (corpo linha a linha)
  const funcoes = {};
  const porFuncao = {};
  for (const r of [...Q("Q04A"), ...Q("Q04B")]) (porFuncao[r.funcao] ??= []).push([r.linha_n, r.linha]);
  for (const [nome, ls] of Object.entries(porFuncao)) {
    const corpo = ls.sort((a, b) => a[0] - b[0]).map((x) => x[1].replace(/\r$/, "")).join("\n");
    const cab = corpo.match(/FUNCTION public\.([\w]+)\((.*?)\)\n/s);
    const ret = corpo.match(/\n RETURNS ([^\n]+)/);
    const lang = corpo.match(/\n LANGUAGE (\w+)/);
    const sp = corpo.match(/\n SET search_path TO ([^\n]+)/);
    funcoes[nome] = {
      nome,
      argumentos: cab ? cab[2] : null,
      retorno: ret ? ret[1] : null,
      linguagem: lang ? lang[1] : null,
      security_definer: /\n SECURITY DEFINER/.test(corpo),
      search_path: sp ? sp[1] : null,
      volatilidade: /\n IMMUTABLE/.test(corpo) ? "IMMUTABLE" : /\n STABLE/.test(corpo) ? "STABLE" : "VOLATILE",
      corpo
    };
  }
  const privilegiosFuncao = {};
  for (const r of Q("Q13")) (privilegiosFuncao[r.funcao] ??= new Set()).add(r.papel);
  for (const [nome, set] of Object.entries(privilegiosFuncao)) {
    if (funcoes[nome]) funcoes[nome].executam = [...set].sort();
  }
  const extensoes = Q("Q07").map((r) => ({ nome: r.extensao, versao: r.versao }));

  // Valores possiveis de status (so contagens, sem dados pessoais)
  const valores = {};
  for (const r of Q("Q11")) ((valores[r.campo] ??= {})[r.valor === null ? "(vazio)" : r.valor] = Number(r.qtd));

  gravar("banco.gerado.json", { meta: META, extensoes, objetos, funcoes, valores });
  const n = Object.keys(objetos).length;
  console.log(`  ${n} objetos, ${Object.keys(funcoes).length} funcoes com corpo, ${extensoes.length} extensoes`);
}

// ---------------------------------------------------------------- CODIGO
function listarArquivos(dir, exts, acc = []) {
  if (!fs.existsSync(dir)) return acc;
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) { if (!["node_modules", "dist", ".git"].includes(e.name)) listarArquivos(p, exts, acc); }
    else if (exts.some((x) => e.name.endsWith(x))) acc.push(p);
  }
  return acc;
}

function extrairCodigo() {
  console.log("Codigo-fonte");
  const arquivos = [...listarArquivos(path.join(RAIZ, "src"), [".ts", ".tsx"]), ...listarArquivos(path.join(RAIZ, "supabase"), [".ts"])];
  const tabelas = {}; // tabela -> arquivo -> {leitura, escrita}
  const rpcs = {};    // rpc -> [arquivos]
  const webhooks = {};
  const env = {};
  const rotas = [];
  const marcar = (t, a, modo) => {
    ((tabelas[t] ??= {})[a] ??= { leitura: false, escrita: false })[modo] = true;
  };
  for (const arq of arquivos) {
    const a = rel(arq);
    const src = fs.readFileSync(arq, "utf8");
    // .from("tabela") seguido, na mesma cadeia, de select/insert/update/delete/upsert
    for (const m of src.matchAll(/\.from\(\s*["'`]([^"'`]+)["'`]\s*\)([\s\S]{0,400})/g)) {
      const cadeia = m[2].split(/;\s*\n|\bawait\b|\bconst\b/)[0];
      const escreve = /\.(insert|update|delete|upsert)\s*\(/.test(cadeia);
      const le = /\.select\s*\(/.test(cadeia) || !escreve;
      if (escreve) marcar(m[1], a, "escrita");
      if (le && /\.select\s*\(/.test(cadeia)) marcar(m[1], a, "leitura");
      else if (!escreve) marcar(m[1], a, "leitura");
    }
    // tabela dinamica de reverterLog (logEdicoes.ts): .from(tabela)
    for (const m of src.matchAll(/(?:callRpc|supabase\.rpc)\w*(?:<[^>]*>)?\(\s*["'`]([a-z_0-9]+)["'`]/g)) (rpcs[m[1]] ??= new Set()).add(a);
    for (const m of src.matchAll(/https:\/\/([\w.-]+)\/webhook\/([\w-]+)/g)) (webhooks[m[2]] ??= { host: m[1], arquivos: new Set() }).arquivos.add(a);
    for (const m of src.matchAll(/import\.meta(?: as any\))?\)?\.env\.([A-Z0-9_]+)/g)) (env[m[1]] ??= { origem: "front", arquivos: new Set() }).arquivos.add(a);
    for (const m of src.matchAll(/(?:process\.env|Deno\.env\.get\()\.?\(?\s*["']?([A-Z][A-Z0-9_]{2,})["']?/g)) (env[m[1]] ??= { origem: "servidor", arquivos: new Set() }).arquivos.add(a);
    for (const m of src.matchAll(/\.functions\.invoke\(\s*["'`]([\w-]+)["'`]/g)) (webhooks["edge:" + m[1]] ??= { host: "supabase (edge function)", arquivos: new Set() }).arquivos.add(a);
  }
  const ser = (o) => Object.fromEntries(Object.entries(o).sort().map(([k, v]) => [k, v instanceof Set ? [...v].sort() : v]));
  const tabelasOut = Object.fromEntries(Object.entries(tabelas).sort().map(([t, arqs]) => [t, Object.entries(arqs).sort().map(([arquivo, modo]) => ({ arquivo, ...modo }))]));
  const rpcOut = ser(rpcs);
  const webOut = Object.fromEntries(Object.entries(webhooks).sort().map(([k, v]) => [k, { host: v.host, arquivos: [...v.arquivos].sort() }]));
  const envOut = Object.fromEntries(Object.entries(env).sort().map(([k, v]) => [k, { origem: v.origem, arquivos: [...v.arquivos].sort() }]));

  // Rotas (src/utils/navigation.ts) e paginas (src/utils/pages.ts): lidas como texto, para conferencia
  const nav = path.join(RAIZ, "src", "utils", "navigation.ts");
  if (fs.existsSync(nav)) {
    for (const m of fs.readFileSync(nav, "utf8").matchAll(/(?:base|path)\s*===\s*["']([\w-]+)["']/g)) rotas.push(m[1]);
  }
  const deps = lerJson(path.join(RAIZ, "package.json"), {});
  gravar("codigo.gerado.json", {
    meta: { ...META, arquivos_analisados: arquivos.length },
    tabelas: tabelasOut, rpcs: rpcOut, webhooks_chamados_pelo_front: webOut,
    variaveis_ambiente: envOut, rotas: [...new Set(rotas)].sort(),
    dependencias: { dependencies: Object.keys(deps.dependencies || {}), devDependencies: Object.keys(deps.devDependencies || {}) },
    arquivos: arquivos.map(rel).sort()
  });
  console.log(`  ${arquivos.length} arquivos, ${Object.keys(tabelasOut).length} tabelas/views referenciadas, ${Object.keys(rpcOut).length} RPCs`);
}

// ---------------------------------------------------------------- FLUXOS (n8n)
const mascarar = (s) => String(s).replace(/\b[0-9a-f]{24,}\b/gi, "XXX").replace(/eyJ[A-Za-z0-9_.-]{20,}/g, "XXX");

function extrairFluxos() {
  console.log("Fluxos n8n");
  const dir = path.join(PRIV, "n8n");
  if (!fs.existsSync(dir)) { console.warn("  AVISO: pasta de exportacoes n8n nao encontrada"); return; }
  const fluxos = [];
  for (const f of fs.readdirSync(dir).filter((x) => x.endsWith(".json")).sort()) {
    const j = lerJson(path.join(dir, f));
    const nos = [];
    const tabelasSupabase = new Set();
    const rpcsChamadas = new Set();
    const hosts = new Set();
    const credenciais = new Set();
    let gatilho = null;
    for (const n of j.nodes || []) {
      const tipo = String(n.type).replace("n8n-nodes-base.", "");
      const p = n.parameters || {};
      const no = { nome: n.name, tipo, desativado: !!n.disabled, ao_falhar: n.onError || null, tentativas: n.retryOnFail ? n.maxTries || null : null };
      if (n.type.endsWith("webhook")) {
        gatilho = { tipo: "webhook", metodo: p.httpMethod || "GET", caminho: p.path };
        no.caminho = p.path;
      }
      if (n.type.endsWith("scheduleTrigger")) {
        gatilho = { tipo: "agenda", regra: p.rule || null };
      }
      if (n.type.endsWith("httpRequest") && typeof p.url === "string") {
        const limpo = mascarar(p.url.replace(/^=/, "")).split("?")[0];
        const m = limpo.match(/^https?:\/\/([^/]+)(\/[^{}]*)?/);
        if (m) {
          let host = m[1].replace(/\{\{.*$/, "");
          if (/\.supabase\.co$/.test(host)) host = "supabase.co (projeto ATG)";
          no.host = host;
          no.caminho = (m[2] || "").replace(/\/$/, "");
          hosts.add(host);
          const rpc = no.caminho.match(/\/rest\/v1\/rpc\/(\w+)/);
          if (rpc) rpcsChamadas.add(rpc[1]);
          const tab = no.caminho.match(/\/rest\/v1\/(\w+)$/);
          if (tab && !rpc) tabelasSupabase.add(tab[1]);
        }
        no.metodo = p.method || "GET";
      }
      if (n.type.endsWith("supabase") && p.tableId) {
        no.tabela = String(p.tableId).replace(/^=/, "");
        no.operacao = p.operation || "insert";
        if (!/[{}]/.test(no.tabela)) tabelasSupabase.add(no.tabela);
      }
      for (const c of Object.keys(n.credentials || {})) { credenciais.add(c); }
      nos.push(no);
    }
    const ligacoes = [];
    for (const [de, v] of Object.entries(j.connections || {})) {
      for (const outs of Object.values(v)) outs.forEach((o, i) => (o || []).forEach((t) => ligacoes.push({ de, saida: i, para: t.node })));
    }
    fluxos.push({
      arquivo_privado: "docs/_fontes_privadas/n8n/" + f,
      nome: j.name, ativo: j.active !== false, gatilho,
      quantidade_nos: nos.length, nos, ligacoes,
      hosts: [...hosts].sort(), tabelas_supabase: [...tabelasSupabase].sort(), rpcs_chamadas: [...rpcsChamadas].sort(),
      tipos_credencial: [...credenciais].sort()
    });
  }
  gravar("fluxos.gerado.json", { meta: META, fluxos });
  console.log(`  ${fluxos.length} fluxos`);
}

// ---------------------------------------------------------------- EDGE FUNCTION
function extrairEdge() {
  const f = path.join(RAIZ, "supabase", "functions", "manage-users", "index.ts");
  if (!fs.existsSync(f)) return;
  const src = fs.readFileSync(f, "utf8");
  const acoes = [...src.matchAll(/action\s*===\s*["'](\w+)["']/g)].map((m) => m[1]);
  const atual = lerJson(path.join(DATA, "codigo.gerado.json"), {});
  atual.edge_functions = { "manage-users": { arquivo: rel(f), acoes: [...new Set(acoes)] } };
  gravar("codigo.gerado.json", atual);
}

extrairBanco();
extrairCodigo();
extrairEdge();
extrairFluxos();
console.log("Concluido. Commit de referencia: " + COMMIT);
