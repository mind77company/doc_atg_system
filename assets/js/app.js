/* Comportamento das páginas da documentação. Sem dependências, funciona abrindo
   os arquivos direto do computador (protocolo file://). */
(function () {
  "use strict";
  var RAIZ = document.body.getAttribute("data-raiz") || "";

  function normalizar(t) {
    return String(t || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
  }

  /* ---------------- menu no celular ---------------- */
  var botaoMenu = document.querySelector(".botao-menu");
  if (botaoMenu) {
    botaoMenu.addEventListener("click", function () {
      var aberto = document.body.classList.toggle("menu-aberto");
      botaoMenu.setAttribute("aria-expanded", aberto ? "true" : "false");
    });
    document.querySelector(".layout").addEventListener("click", function () {
      document.body.classList.remove("menu-aberto");
    });
  }
  var atual = document.querySelector(".menu a.atual");
  if (atual) {
    var d = atual.closest("details");
    while (d) { d.open = true; d = d.parentElement.closest("details"); }
    var menu = document.querySelector(".menu");
    if (menu && atual.offsetTop > menu.clientHeight - 80) menu.scrollTop = atual.offsetTop - 120;
  }

  /* ---------------- voltar ao topo ---------------- */
  var topo = document.querySelector(".voltar-topo");
  if (topo) {
    window.addEventListener("scroll", function () {
      topo.classList.toggle("visivel", window.scrollY > 500);
    }, { passive: true });
    topo.addEventListener("click", function () { window.scrollTo({ top: 0, behavior: "smooth" }); });
  }

  /* ---------------- tabelas ordenáveis e com filtro ---------------- */
  function valorCelula(tr, i) {
    var td = tr.children[i];
    return td ? (td.getAttribute("data-valor") || td.textContent).trim() : "";
  }
  document.querySelectorAll("table.ordenavel").forEach(function (tabela) {
    var corpo = tabela.tBodies[0];
    if (!corpo) return;
    tabela.querySelectorAll("th").forEach(function (th, i) {
      th.tabIndex = 0;
      th.setAttribute("role", "columnheader");
      function ordenar() {
        var asc = th.getAttribute("aria-sort") !== "ascending";
        tabela.querySelectorAll("th").forEach(function (o) { o.removeAttribute("aria-sort"); });
        th.setAttribute("aria-sort", asc ? "ascending" : "descending");
        var linhas = Array.prototype.slice.call(corpo.rows);
        linhas.sort(function (a, b) {
          var x = valorCelula(a, i), y = valorCelula(b, i);
          var nx = parseFloat(x.replace(/\./g, "").replace(",", ".")), ny = parseFloat(y.replace(/\./g, "").replace(",", "."));
          var r = (!isNaN(nx) && !isNaN(ny) && /^[-\d.,\s]+$/.test(x) && /^[-\d.,\s]+$/.test(y))
            ? nx - ny
            : normalizar(x).localeCompare(normalizar(y), "pt-BR");
          return asc ? r : -r;
        });
        linhas.forEach(function (l) { corpo.appendChild(l); });
      }
      th.addEventListener("click", ordenar);
      th.addEventListener("keydown", function (e) { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); ordenar(); } });
    });
  });
  document.querySelectorAll(".tabela-barra input").forEach(function (input) {
    var tabela = input.closest(".tabela-envoltorio").querySelector("table");
    var contador = input.closest(".tabela-barra").querySelector(".contador");
    function filtrar() {
      var q = normalizar(input.value), vis = 0;
      Array.prototype.forEach.call(tabela.tBodies[0].rows, function (tr) {
        var ok = !q || normalizar(tr.textContent).indexOf(q) !== -1;
        tr.style.display = ok ? "" : "none";
        if (ok) vis++;
      });
      if (contador) contador.textContent = vis + " de " + tabela.tBodies[0].rows.length;
    }
    input.addEventListener("input", filtrar);
  });

  /* ---------------- busca offline ---------------- */
  var campo = document.getElementById("busca");
  var lista = document.querySelector(".busca-resultados");
  var indice = window.BUSCA_INDICE || [];
  if (campo && lista) {
    function destacar(texto, termos) {
      var pos = -1, tn = normalizar(texto);
      for (var i = 0; i < termos.length; i++) { pos = tn.indexOf(termos[i]); if (pos !== -1) break; }
      if (pos === -1) return texto.slice(0, 140);
      var ini = Math.max(0, pos - 50);
      return (ini > 0 ? "…" : "") + texto.slice(ini, ini + 150) + "…";
    }
    function buscar() {
      var q = normalizar(campo.value).trim();
      if (q.length < 2) { lista.classList.remove("aberto"); lista.innerHTML = ""; return; }
      var termos = q.split(/\s+/);
      var res = [];
      indice.forEach(function (p) {
        var t = normalizar(p.titulo), x = normalizar(p.texto), pontos = 0, todos = true;
        termos.forEach(function (termo) {
          var a = t.indexOf(termo) !== -1, b = x.indexOf(termo) !== -1;
          if (!a && !b) todos = false;
          pontos += (a ? 10 : 0) + (b ? 1 : 0);
        });
        if (todos) res.push({ p: p, pontos: pontos });
      });
      res.sort(function (a, b) { return b.pontos - a.pontos; });
      res = res.slice(0, 12);
      lista.innerHTML = "";
      if (!res.length) {
        var v = document.createElement("div"); v.className = "vazio"; v.textContent = "Nada encontrado para “" + campo.value + "”.";
        lista.appendChild(v);
      }
      res.forEach(function (r) {
        var a = document.createElement("a");
        a.href = RAIZ + r.p.url;
        var s = document.createElement("div"); s.className = "secao"; s.textContent = r.p.secao;
        var ti = document.createElement("div"); ti.className = "titulo"; ti.textContent = r.p.titulo;
        var tr = document.createElement("div"); tr.className = "trecho"; tr.textContent = destacar(r.p.texto, termos);
        a.appendChild(s); a.appendChild(ti); a.appendChild(tr);
        lista.appendChild(a);
      });
      lista.classList.add("aberto");
    }
    campo.addEventListener("input", buscar);
    campo.addEventListener("focus", buscar);
    document.addEventListener("click", function (e) {
      if (!e.target.closest(".busca-caixa")) lista.classList.remove("aberto");
    });
    document.addEventListener("keydown", function (e) {
      if (e.key === "/" && document.activeElement.tagName !== "INPUT" && document.activeElement.tagName !== "TEXTAREA") { e.preventDefault(); campo.focus(); }
      if (e.key === "Escape") { lista.classList.remove("aberto"); campo.blur(); }
    });
  }

  /* ---------------- diagramas (Mermaid local) ---------------- */
  var diagramas = document.querySelectorAll("pre.mermaid");
  if (diagramas.length && window.mermaid) {
    var css = getComputedStyle(document.documentElement);
    function v(n) { return css.getPropertyValue(n).trim(); }
    window.mermaid.initialize({
      startOnLoad: false, securityLevel: "strict", theme: "base",
      fontFamily: v("--fonte-texto"),
      themeVariables: {
        primaryColor: v("--cor-primaria-50"), primaryBorderColor: v("--cor-primaria"), primaryTextColor: v("--cor-primaria-escura"),
        lineColor: v("--cor-primaria-300"), secondaryColor: v("--cor-destaque-50"), tertiaryColor: v("--cor-fundo"),
        noteBkgColor: "#FFF8E1", noteTextColor: v("--cor-texto")
      },
      flowchart: { useMaxWidth: false, htmlLabels: true, curve: "basis" },
      er: { useMaxWidth: false }, sequence: { useMaxWidth: false }
    });
    window.mermaid.run({ querySelector: "pre.mermaid" }).then(function () {
      document.querySelectorAll("figure.diagrama").forEach(function (fig) {
        var svg = fig.querySelector("svg");
        if (svg) {
          svg.setAttribute("role", "img");
          svg.setAttribute("aria-label", fig.getAttribute("data-alt") || "Diagrama");
        }
      });
    }).catch(function (e) {
      console.error("Falha ao desenhar diagrama", e);
      document.querySelectorAll("figure.diagrama .area").forEach(function (a) {
        if (!a.querySelector("svg")) a.insertAdjacentHTML("beforeend", "<p><em>Não foi possível desenhar o diagrama. Veja a descrição abaixo.</em></p>");
      });
    });
  }
  var dlg = null;
  document.querySelectorAll("figure.diagrama .ampliar").forEach(function (b) {
    b.addEventListener("click", function () {
      var fig = b.closest("figure");
      var svg = fig.querySelector("svg");
      if (!svg) return;
      if (!dlg) {
        dlg = document.createElement("dialog");
        dlg.className = "tela-cheia";
        dlg.innerHTML = '<div class="barra"><strong></strong><button type="button" class="ampliar" style="position:static">Fechar (Esc)</button></div><div class="corpo"></div>';
        document.body.appendChild(dlg);
        dlg.querySelector("button").addEventListener("click", function () { dlg.close(); });
      }
      dlg.querySelector("strong").textContent = fig.getAttribute("data-alt") || "Diagrama";
      var corpo = dlg.querySelector(".corpo");
      corpo.innerHTML = "";
      var clone = svg.cloneNode(true);
      clone.removeAttribute("style");
      corpo.appendChild(clone);
      dlg.showModal();
    });
  });

  /* ---------------- impressão: abre todos os blocos recolhíveis ---------------- */
  var fechados = [];
  window.addEventListener("beforeprint", function () {
    fechados = [];
    document.querySelectorAll("details.tecnico:not([open])").forEach(function (d) { d.open = true; fechados.push(d); });
  });
  window.addEventListener("afterprint", function () { fechados.forEach(function (d) { d.open = false; }); });
})();
