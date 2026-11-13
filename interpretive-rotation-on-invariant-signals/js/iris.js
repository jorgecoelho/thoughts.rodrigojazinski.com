/* Interpretive Rotation on Invariant Signals (IRIS) — web edition 2.1.0
   Reading engine adapted from the first thought; figures specific to IRIS.
   Plain JavaScript, no dependencies. Works from file:// and any static host.
   Without this script the page reads as one continuous essay. */
(function () {
  "use strict";

  var D = JSON.parse(document.getElementById("iris-data").textContent);
  var CITE = document.getElementById("iris-cite").textContent;
  var panels = Array.prototype.slice.call(document.querySelectorAll(".panel"));
  var ids = panels.map(function (p) { return p.id; });
  var narrow = window.matchMedia("(max-width: 899px)");
  var pop = document.getElementById("popover");
  var bar = document.querySelector(".progress span");
  var current = null;
  var store = {
    get: function (k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
    set: function (k, v) { try { localStorage.setItem(k, v); } catch (e) { /* private mode */ } },
    del: function (k) { try { localStorage.removeItem(k); } catch (e) { /* private mode */ } }
  };

  function $(sel, root) { return (root || document).querySelector(sel); }
  function $$(sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }
  function el(tag, attrs, html) {
    var e = document.createElement(tag);
    if (attrs) Object.keys(attrs).forEach(function (k) { e.setAttribute(k, attrs[k]); });
    if (html != null) e.innerHTML = html;
    return e;
  }
  function escHtml(s) { return String(s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); }
  function scroller(p) { return p.querySelector(".panel-scroll"); }

  /* ------------------------------------------------------------ drawers */
  function openPanel(id, opts) {
    opts = opts || {};
    var p = document.getElementById(id);
    if (!p || !p.classList.contains("panel")) return;
    if (current !== p) {
      panels.forEach(function (q) {
        var on = q === p;
        q.classList.toggle("open", on);
        q.querySelector(".spine").setAttribute("aria-expanded", on ? "true" : "false");
      });
      current = p;
      if (!opts.keepScroll) scroller(p).scrollTop = 0;
      document.title = (id === "cover" ? "" : p.querySelector(".spine-label").textContent + " — ") + "Interpretive Rotation on Invariant Signals";
    }
    if (narrow.matches && !opts.noScroll) {
      p.scrollIntoView({ block: "start", behavior: opts.instant ? "auto" : "smooth" });
    } else if (!narrow.matches && !opts.noShelfScroll) {
      var shelf = document.getElementById("shelf");
      var left = p.offsetLeft - Math.max(0, (ids.indexOf(id) - 1)) * 0;
      if (left < shelf.scrollLeft || left + 300 > shelf.scrollLeft + shelf.clientWidth) shelf.scrollTo({ left: Math.max(0, left - 46 * 2), behavior: "smooth" });
    }
    if (opts.focus) {
      var h = p.querySelector("h1, h2");
      if (h) { h.setAttribute("tabindex", "-1"); h.focus({ preventScroll: true }); }
    }
    updateProgress();
    hidePop();
  }

  function setHash(h) {
    if (location.hash !== "#" + h) history.replaceState(null, "", "#" + h);
  }

  function flash(node) {
    node.classList.remove("flash");
    void node.offsetWidth;
    node.classList.add("flash");
    setTimeout(function () { node.classList.remove("flash"); }, 2400);
  }

  function goTo(target, opts) {
    opts = opts || {};
    if (!target) return;
    var node = document.getElementById(target);
    if (!node) return;
    var panel = node.classList.contains("panel") ? node : node.closest(".panel");
    if (!panel) return;
    openPanel(panel.id, { focus: opts.focus, instant: opts.instant, noScroll: node !== panel });
    setHash(target);
    if (node !== panel) {
      requestAnimationFrame(function () {
        setTimeout(function () {
          var sc = scroller(panel);
          if (narrow.matches) node.scrollIntoView({ block: "center", behavior: "smooth" });
          else sc.scrollTo({ top: node.getBoundingClientRect().top - sc.getBoundingClientRect().top + sc.scrollTop - 90, behavior: opts.instant ? "auto" : "smooth" });
          flash(node);
        }, narrow.matches ? 60 : 380);
      });
    }
  }

  panels.forEach(function (p) {
    p.querySelector(".spine").addEventListener("click", function () {
      if (narrow.matches && current === p) {
        p.classList.remove("open");
        p.querySelector(".spine").setAttribute("aria-expanded", "false");
        current = null;
        return;
      }
      openPanel(p.id, { focus: false });
      setHash(p.id);
    });
    scroller(p).addEventListener("scroll", function () { if (p === current) updateProgress(); hidePop(); }, { passive: true });
  });

  function updateProgress() {
    if (!bar || !current) return;
    var sc = narrow.matches ? document.scrollingElement : scroller(current);
    var max = sc.scrollHeight - sc.clientHeight;
    bar.style.width = (max > 0 ? Math.min(100, (sc.scrollTop / max) * 100) : 0) + "%";
  }
  window.addEventListener("scroll", function () { if (narrow.matches) updateProgress(); }, { passive: true });

  /* ------------------------------------------------------------ links */
  document.addEventListener("click", function (e) {
    var a = e.target.closest("a");
    if (!a || e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
    if (a.classList.contains("cite") && !a.classList.contains("demo")) {
      e.preventDefault();
      showCite(a);
      return;
    }
    if (a.classList.contains("claim")) {
      e.preventDefault();
      showClaim(a, a.getAttribute("data-claim"));
      return;
    }
    var href = a.getAttribute("href") || "";
    if (href.charAt(0) === "#" && href.length > 1) {
      e.preventDefault();
      goTo(href.slice(1), { focus: a.closest(".panel-nav") != null });
    }
  });

  window.addEventListener("hashchange", function () { goTo(location.hash.slice(1)); });

  /* ------------------------------------------------------------ keyboard */
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape") { hidePop(true); return; }
    var t = e.target;
    if (e.altKey || e.ctrlKey || e.metaKey || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName) || t.isContentEditable) return;
    if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
    if (t.closest && t.closest(".explore, .seg")) return;
    var i = current ? ids.indexOf(current.id) : 0;
    var j = e.key === "ArrowRight" ? Math.min(ids.length - 1, i + 1) : Math.max(0, i - 1);
    if (j !== i) { e.preventDefault(); openPanel(ids[j]); setHash(ids[j]); }
  });

  /* ------------------------------------------------------------ popover */
  var popAnchor = null;
  function showPop(anchor, html) {
    if (popAnchor === anchor && !pop.hidden) { hidePop(true); return; }
    if (popAnchor) popAnchor.removeAttribute("aria-expanded");
    popAnchor = anchor;
    anchor.setAttribute("aria-expanded", "true");
    pop.innerHTML = '<button class="close" type="button" aria-label="Close">×</button>' + html;
    pop.hidden = false;
    var r = anchor.getBoundingClientRect();
    var pw = pop.offsetWidth, ph = pop.offsetHeight;
    var left = Math.min(Math.max(8, r.left + r.width / 2 - pw / 2), window.innerWidth - pw - 8);
    var top = r.bottom + 8;
    if (top + ph > window.innerHeight - 8) top = Math.max(8, r.top - ph - 8);
    pop.style.left = left + "px";
    pop.style.top = top + "px";
    pop.querySelector(".close").addEventListener("click", function () { hidePop(true); });
  }
  function hidePop(refocus) {
    if (pop.hidden) return;
    pop.hidden = true;
    if (popAnchor) {
      popAnchor.removeAttribute("aria-expanded");
      if (refocus === true) popAnchor.focus({ preventScroll: true });
    }
    popAnchor = null;
  }
  document.addEventListener("click", function (e) {
    if (!pop.hidden && !pop.contains(e.target) && e.target !== popAnchor && !(popAnchor && popAnchor.contains(e.target))) hidePop();
  });
  window.addEventListener("resize", function () { hidePop(); });

  function showCite(a) {
    var key = a.getAttribute("data-ref");
    var r = D.refs[key];
    if (!r) return;
    var search = r.kind === "search";
    showPop(a,
      '<div class="pop-kind">Reference</div>' +
      '<div class="pop-entry">' + r.entry + "</div>" +
      '<div class="pop-actions">' +
      '<a class="primary" href="' + escHtml(r.url) + '" target="_blank" rel="noopener">' + (search ? "Search for this work" : "Open the source") + ' ↗</a>' +
      '<a href="#ref-' + key + '" data-close>In the references</a></div>' +
      '<div class="pop-note">' + escHtml(search ? "No verified open link was found for this work." : "Link: " + r.note + ".") + "</div>");
  }

  function gradeChip(g) { return '<span class="grade grade-' + g + '">' + g + "</span>"; }

  function showClaim(a, id) {
    var c = D.claims[id];
    if (!c) return;
    showPop(a,
      '<div class="pop-kind">Ledger claim ' + id + "</div>" +
      '<div class="pop-entry">' + escHtml(c.claim) + "</div>" +
      '<p style="margin:.6rem 0 0">' + gradeChip(c.grade) + ' <span style="color:var(--muted)">Mechanism: ' + escHtml(c.mechanism) + " · " + escHtml(c.status) + "</span></p>" +
      '<div class="pop-actions"><a class="primary" href="#claim-' + id + '">See it in the ledger →</a></div>');
  }

  function showGloss(span) {
    var term = span.getAttribute("data-gl");
    var t = D.terms[term];
    if (!t) return;
    var slug = term.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
    showPop(span, '<div class="pop-kind">Term, in the paper’s words</div><dfn>' + escHtml(term) + '</dfn><div class="pop-entry">“' + escHtml(t.quote) + '”</div>' +
      '<div class="pop-actions"><a href="#' + t.section + '">Section ' + t.section.slice(1) + '</a><a href="#term-' + slug + '">All terms</a></div>');
  }
  var glTimer = null;
  $$(".gl:not(.demo)").forEach(function (s) {
    s.setAttribute("role", "button");
    s.addEventListener("click", function () { showGloss(s); });
    s.addEventListener("keydown", function (e) { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); showGloss(s); } });
    s.addEventListener("mouseenter", function () { if (!narrow.matches) glTimer = setTimeout(function () { if (popAnchor !== s) showGloss(s); }, 350); });
    s.addEventListener("mouseleave", function () { clearTimeout(glTimer); });
  });
  pop.addEventListener("click", function (e) { if (e.target.closest("a[href^='#']")) hidePop(); });

  /* ------------------------------------------------------------ audio */
  var playing = null;
  document.addEventListener("click", function (e) {
    var b = e.target.closest(".say");
    if (!b) return;
    e.preventDefault();
    var item = D.audio[b.getAttribute("data-audio")];
    if (!item) return;
    if (playing) { playing.audio.pause(); playing.btn.classList.remove("playing"); }
    var audio = new Audio(item.file);
    playing = { audio: audio, btn: b };
    b.classList.add("playing");
    audio.addEventListener("ended", function () { b.classList.remove("playing"); });
    audio.addEventListener("error", function () { b.classList.remove("playing"); b.title = "Recording unavailable"; });
    audio.play().catch(function () { b.classList.remove("playing"); });
  });

  /* ------------------------------------------------------------ settings, citation */
  var themeBtn = $("[data-theme-toggle]");
  themeBtn.addEventListener("click", function () {
    var root = document.documentElement;
    var dark = root.dataset.theme ? root.dataset.theme === "dark" : window.matchMedia("(prefers-color-scheme: dark)").matches;
    root.dataset.theme = dark ? "light" : "dark";
    store.set("iris-theme", root.dataset.theme);
  });
  $("[data-size-toggle]").addEventListener("click", function () {
    var root = document.documentElement;
    var next = { "": "l", l: "xl", xl: "" }[root.dataset.size || ""];
    if (next) root.dataset.size = next; else delete root.dataset.size;
    store.set("iris-size", next);
  });
  $$("[data-copy-cite]").forEach(function (b) {
    b.addEventListener("click", function () {
      var done = function () { var t = b.textContent; b.textContent = "Copied"; setTimeout(function () { b.textContent = t; }, 1600); };
      if (navigator.clipboard) navigator.clipboard.writeText(CITE).then(done, function () { window.prompt("Citation", CITE); });
      else window.prompt("Citation", CITE);
    });
  });
  /* ------------------------------------------------------------ bookmark
     One ribbon per thought, placed only when the reader presses it. Stored under
     "bookmark:<slug>" so the index can show it too. Added at run time: the built
     page, and so the paper's text, is unchanged. */
  var BM_KEY = "bookmark:interpretive-rotation-on-invariant-signals";
  store.del("iris-last");
  var bmNodes = $$(".panel:not(#cover) .prose p, .panel:not(#cover) .prose li").filter(function (n) {
    return !n.closest("figure, table, nav, .explore, .ledger-tools") && !(n.tagName === "LI" && n.querySelector("p"));
  });
  var ribbon = el("button", { "class": "bm", type: "button" });
  ribbon.innerHTML = '<svg viewBox="0 0 12 18" aria-hidden="true"><path d="M1 1h10v16l-5-4-5 4z"/></svg>';
  var bmHost = null, marked = null;
  function snip(n) { return n.textContent.replace(/\s+/g, " ").trim().slice(0, 60); }
  function inPanel(p) { return bmNodes.filter(function (n) { return n.closest(".panel") === p; }); }
  function bmSet(node, save) {
    if (marked) {
      marked.classList.remove("bm-on");
      if (marked.id === "bookmark") marked.removeAttribute("id");
      var old = marked.closest(".panel");
      old.classList.remove("bm-panel");
      var sr = old.querySelector(".bm-sr"); if (sr) sr.remove();
    }
    marked = node;
    var resume = $(".resume");
    if (!node) {
      if (save) store.del(BM_KEY);
      if (resume) resume.hidden = true;
      bmLabel();
      return;
    }
    var p = node.closest(".panel"), list = inPanel(p);
    node.classList.add("bm-on");
    if (!node.id) node.id = "bookmark";
    p.classList.add("bm-panel");
    p.querySelector(".spine").appendChild(el("span", { "class": "bm-sr" }, " (bookmarked)"));
    var label = p.querySelector(".spine-label").textContent + ", paragraph " + (list.indexOf(node) + 1);
    if (save) store.set(BM_KEY, JSON.stringify({ panel: p.id, n: list.indexOf(node), snip: snip(node), anchor: node.id, label: label }));
    if (resume) {
      resume.hidden = false;
      resume.querySelector("a").setAttribute("href", "#" + node.id);
      resume.querySelector("span").textContent = label;
    }
    bmLabel();
  }
  function bmLabel() {
    var on = bmHost && bmHost === marked;
    ribbon.setAttribute("aria-label", on ? "Remove bookmark" : "Bookmark this paragraph");
    ribbon.setAttribute("aria-pressed", on ? "true" : "false");
  }
  function bmShow(node) {
    if (bmHost === node) return;
    bmHost = node;
    node.appendChild(ribbon);
    bmLabel();
  }
  function bmToggle(node) { bmSet(node === marked ? null : node, true); if (bmHost !== node) bmShow(node); bmLabel(); }
  bmNodes.forEach(function (n) { n.classList.add("bm-able"); });
  document.addEventListener("mouseover", function (e) {
    var n = e.target.closest && e.target.closest(".bm-able");
    if (n) bmShow(n);
  });
  document.addEventListener("click", function (e) {
    if (e.target.closest(".bm")) { e.preventDefault(); bmToggle(bmHost); return; }
    var n = e.target.closest(".bm-able");
    if (!n || e.target.closest("a, button, input, select, textarea, .gl")) return;
    var sel = window.getSelection && window.getSelection();
    if (sel && !sel.isCollapsed) return;
    bmShow(n);
  });
  /* keyboard: B bookmarks the paragraph with the ribbon, or the first one in view */
  document.addEventListener("keydown", function (e) {
    var t = e.target;
    if (e.key !== "b" && e.key !== "B") return;
    if (e.altKey || e.ctrlKey || e.metaKey || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName) || t.isContentEditable) return;
    if (!current || current.id === "cover") return;
    var node = bmHost && bmHost.closest(".panel") === current ? bmHost : null;
    if (!node) node = inPanel(current).filter(function (n) { var r = n.getBoundingClientRect(); return r.bottom > 80 && r.top < window.innerHeight; })[0];
    if (!node) return;
    e.preventDefault();
    bmToggle(node);
    ribbon.focus({ preventScroll: true });
  });
  (function () {
    var saved;
    try { saved = JSON.parse(store.get(BM_KEY) || "null"); } catch (err) { saved = null; }
    if (!saved) return;
    var p = document.getElementById(saved.panel), list = p && p.classList.contains("panel") ? inPanel(p) : [];
    var node = list[saved.n] && snip(list[saved.n]) === saved.snip ? list[saved.n] : list.filter(function (n) { return snip(n) === saved.snip; })[0];
    if (node) bmSet(node, !!(saved.anchor !== (node.id || "bookmark"))); else store.del(BM_KEY);
  })();

  /* ------------------------------------------------------------ explorables */
  var builders = {};
  var W = D.worked;
  function q(s) { return "<q>" + escHtml(s) + "</q>"; }
  function grClass(g) { return "gr-" + g.id; }

  /* Section 2: the grammar tuple */
  builders.tuple = function (box) {
    box.innerHTML = '<div class="tuple-keys" role="group" aria-label="Parameters">' + D.params.map(function (p) {
      return '<button type="button" class="tuple-key' + (p.key === "E" ? " optional" : "") + '" data-k="' + p.key + '" title="' + escHtml(p.name) + '" aria-pressed="false">' + p.key + "</button>";
    }).join("") + '</div><p class="tuple-def" aria-live="polite"></p><div class="tuple-cols"></div>';
    var def = box.querySelector(".tuple-def"), cols = box.querySelector(".tuple-cols");
    function render(k) {
      $$(".tuple-key", box).forEach(function (b) { b.setAttribute("aria-pressed", b.getAttribute("data-k") === k ? "true" : "false"); });
      var p = D.params.filter(function (x) { return x.key === k; })[0];
      def.innerHTML = "<strong>" + escHtml(p.name) + " (" + k + ")" + (k === "E" ? " · optional" : "") + "</strong>" + q(D.paramDefs[k]);
      cols.innerHTML = W.grammars.map(function (g, i) {
        return '<div class="tuple-col ' + grClass(g) + '"><h5>' + escHtml(g.name) + "</h5><p>" + escHtml(D.table1[k][i]) + "</p></div>";
      }).join("");
    }
    box.querySelector(".tuple-keys").addEventListener("click", function (e) { var b = e.target.closest("button"); if (b) render(b.getAttribute("data-k")); });
    render("V");
  };

  /* Section 4: rotate the grammar */
  builders.rotate = function (box) {
    var BADGE = { highest: "weighted highest", subordinated: "admitted, subordinated", measured: "weighted by measurability", unstated: "weight not stated" };
    var RANK = { highest: 0, measured: 1, unstated: 2, subordinated: 3 };
    var state = { g: 0, mode: "rotate" };
    box.innerHTML = '<div class="mode-row"><div class="gr-tabs" role="group" aria-label="Choose a grammar">' + W.grammars.map(function (g, i) {
      return '<button type="button" class="gr-tab ' + grClass(g) + '" data-g="' + i + '" aria-pressed="false"><span class="gr-dot"></span>' + escHtml(g.name) + "</button>";
    }).join("") + '</div><div class="seg" role="group" aria-label="View"><button type="button" data-m="rotate">Rotate</button><button type="button" data-m="gilens">Follow one signal</button><button type="button" data-m="speech">Follow an excluded signal</button></div></div><div class="rot-view" aria-live="polite"></div>';
    var view = box.querySelector(".rot-view");

    function sigCard(s, w, gid) {
      return '<div class="sig w-' + w + '" data-sig="' + s.id + '"><div class="sig-head"><span class="sig-label"><span class="sig-id">(' + s.id + ")</span> " + escHtml(s.label) +
        '</span><span class="sig-badge">' + BADGE[w] + "</span></div>" + q(s.quote) + "</div>";
    }
    function rotateView() {
      var g = W.grammars[state.g];
      var sigs = W.signals.slice().sort(function (a, b) { return RANK[g.weights[a.id]] - RANK[g.weights[b.id]]; });
      var weighting = g.weights_quote + (g.weights_quote_2 ? " " + g.weights_quote_2 : "");
      return '<div class="rot ' + grClass(g) + '"><div class="rot-signals">' + sigs.map(function (s) { return sigCard(s, g.weights[s.id]); }).join("") +
        '<div class="sig excluded"><div class="sig-head"><span class="sig-label">' + escHtml(W.excluded.label) + '</span><span class="sig-badge">excluded (E)</span></div>' + q(W.excluded.quote) + "</div></div>" +
        '<div class="rot-out"><div class="label">Constitutes the object</div><p class="rot-object">“' + escHtml(g.object) + '”</p><dl>' +
        "<dt>Processed as</dt><dd>" + q(g.processed) + "</dd>" +
        "<dt>Closure, under this grammar</dt><dd>" + q(g.closure) + ' <span class="within">within A: ' + escHtml(g.within) + "</span></dd>" +
        "<dt>Weighting</dt><dd>" + q(weighting) + "</dd>" +
        "<dt>Excluded signals (E, Table 1)</dt><dd>" + escHtml(D.table1.E[state.g]) + "</dd></dl></div></div>";
    }
    function followView(kind) {
      var gil = W.signals[2];
      var intro = kind === "gilens"
        ? '<p class="follow-intro">Signal (iii), ' + escHtml(gil.label) + ", enters all three grammars: " + q(gil.quote) + ".</p>"
        : '<p class="follow-intro">' + escHtml(W.excluded.label) + ": " + q(W.excluded.quote) + ". Three grammars, three different reasons for suppressing it.</p>";
      return intro + '<div class="follow">' + W.grammars.map(function (g) {
        return '<div class="follow-card ' + grClass(g) + '"><div class="label">' + escHtml(g.name) + "</div>" +
          (kind === "gilens" ? '<p class="follow-role">' + escHtml(g.gilens_role) + "</p>" + q(g.gilens_quote) : '<p class="follow-role">Excluded</p>' + q(g.exclusion_quote)) + "</div>";
      }).join("") + "</div>";
    }
    function render() {
      $$(".gr-tab", box).forEach(function (b) { b.setAttribute("aria-pressed", state.mode === "rotate" && +b.getAttribute("data-g") === state.g ? "true" : "false"); b.disabled = state.mode !== "rotate"; });
      $$(".seg button", box).forEach(function (b) { b.setAttribute("aria-pressed", b.getAttribute("data-m") === state.mode ? "true" : "false"); });
      var before = {};
      $$(".sig[data-sig]", view).forEach(function (el) { before[el.getAttribute("data-sig")] = el.getBoundingClientRect().top; });
      view.innerHTML = state.mode === "rotate" ? rotateView() : followView(state.mode);
      $$(".sig[data-sig]", view).forEach(function (el) {   /* FLIP: signals glide to their new rank */
        var id = el.getAttribute("data-sig");
        if (before[id] == null) return;
        var dy = before[id] - el.getBoundingClientRect().top;
        if (!dy) return;
        el.style.transition = "none"; el.style.transform = "translateY(" + dy + "px)";
        requestAnimationFrame(function () { requestAnimationFrame(function () { el.style.transition = ""; el.style.transform = ""; }); });
      });
    }
    box.querySelector(".gr-tabs").addEventListener("click", function (e) { var b = e.target.closest("button"); if (b && !b.disabled) { state.g = +b.getAttribute("data-g"); render(); } });
    box.querySelector(".seg").addEventListener("click", function (e) { var b = e.target.closest("button"); if (b) { state.mode = b.getAttribute("data-m"); render(); } });
    render();
  };

  /* Section 4: grammar aging */
  builders.aging = function (box) {
    var POS = { immediate: 6, slower: 50, open: 93 };
    var order = W.grammars.slice().sort(function (a, b) { return POS[a.aging] - POS[b.aging]; });
    box.innerHTML = '<div class="aging"><div class="aging-track">' + order.map(function (g) {
      return '<button type="button" class="aging-mark ' + grClass(g) + (g.aging === "open" ? " open" : "") + '" style="left:' + POS[g.aging] + '%" data-g="' + g.id + '" aria-label="' + escHtml(g.name) + '"><span>' + escHtml(g.name) + "</span></button>";
    }).join("") + '</div><div class="aging-ends"><span>Evidence available</span><span>Further evidence accumulates</span></div><div class="aging-detail" aria-live="polite"></div></div>';
    var detail = box.querySelector(".aging-detail");
    function show(id) {
      var g = W.grammars.filter(function (x) { return x.id === id; })[0];
      detail.className = "aging-detail " + grClass(g);
      detail.innerHTML = '<span class="gr-dot"></span><strong>' + escHtml(g.name) + "</strong>. " + q(g.aging_quote);
    }
    box.addEventListener("click", function (e) { var b = e.target.closest(".aging-mark"); if (b) show(b.getAttribute("data-g")); });
    show("structural");
  };

  /* Section 5: the convergence archive (from the Case Studies) */
  builders.archive = function (box) {
    var C = D.companions, rows = C.cases.rows, marks = C.marks.rows, tot = C.marks.total;
    function fam(d) { d = d.toLowerCase(); return /covid/.test(d) ? "covid" : /brexit/.test(d) ? "brexit" : /democracy/.test(d) ? "us" : /crypto/.test(d) ? "crypto" : /israel/.test(d) ? "israel" : d; }
    box.innerHTML = '<div class="arch-stats">' +
      [[marks.length, "rounds (Marks)"], [tot.cases, "case applications"], [tot.agents, "agents"], [tot.words, "words of output"]].map(function (s) {
        return '<div class="arch-stat"><b>' + escHtml(s[0]) + "</b><span>" + escHtml(s[1]) + "</span></div>";
      }).join("") + '</div><div class="arch-grid">' + marks.map(function (m) {
        return '<div class="arch-col"><h5>Mark ' + m.mark + '</h5><p class="arch-meta">' + m.cases + " cases · " + m.agents + " agents · " + escHtml(m.words) + " words<br>" + escHtml(m.test) + "</p>" +
          rows.filter(function (r) { return r.mark === m.mark; }).map(function (r) {
            var i = rows.indexOf(r);
            return '<button type="button" class="arch-case" data-i="' + i + '" data-fam="' + escHtml(fam(r.domain)) + '" aria-pressed="false">' + escHtml(r.domain) + "<small>" + escHtml(r.id === "Extra" ? "Extra case" : "Case " + r.id) + "</small></button>";
          }).join("") + "</div>";
      }).join("") + '</div><div class="arch-detail" aria-live="polite"></div>';
    var detail = box.querySelector(".arch-detail"), chips = $$(".arch-case", box);
    function show(i) {
      var r = rows[i];
      chips.forEach(function (c) { c.setAttribute("aria-pressed", +c.getAttribute("data-i") === i ? "true" : "false"); c.classList.toggle("related", c.getAttribute("data-fam") === fam(r.domain) && +c.getAttribute("data-i") !== i); });
      var repeats = chips.filter(function (c) { return c.getAttribute("data-fam") === fam(r.domain); }).length;
      detail.innerHTML = "<h5>" + escHtml(r.id === "Extra" ? "Extra case" : "Case " + r.id) + ": " + escHtml(r.domain) + "</h5>" +
        "<p>Mark " + r.mark + " · " + r.agents + (r.agents === 1 ? " agent" : " agents") + (r.best ? " · best output: " + escHtml(r.best) : "") + "</p>" +
        "<p><strong>Key finding:</strong> " + escHtml(r.finding) + "</p>" + (repeats > 1 ? '<p style="color:var(--muted)">This domain was run ' + repeats + " times; the other runs are outlined.</p>" : "");
    }
    box.addEventListener("click", function (e) { var b = e.target.closest(".arch-case"); if (b) show(+b.getAttribute("data-i")); });
    show(rows.length - 2);
  };

  /* Section 7: the agents' home grammars (from the Case Studies) */
  builders.agents = function (box) {
    function marksOf(s) { var m = s.match(/(\d)(?:–(\d))?/); var a = +m[1], b = +(m[2] || m[1]), out = []; for (var i = a; i <= b; i++) out.push(i); return out; }
    box.innerHTML = '<p style="margin:0 0 .8rem">Fifteen agents took part. Each has a documented home grammar: the pattern it produced most fluently. Bars show the rounds (Marks 1–5) each agent took part in.</p><div class="agents">' +
      D.companions.agents.rows.map(function (a) {
        var on = marksOf(a.rounds);
        return '<div class="agent' + (a.removed ? " removed" : "") + '"><div class="agent-name">' + escHtml(a.agent) + '</div><div class="agent-dev">' + escHtml(a.developer) + " · " + escHtml(a.rounds) + "</div>" +
          '<div class="agent-home">' + escHtml(a.home) + '</div><div class="agent-marks" aria-label="' + escHtml(a.rounds) + '">' + [1, 2, 3, 4, 5].map(function (k) { return '<i class="' + (on.indexOf(k) >= 0 ? "on" : "") + '"></i>'; }).join("") +
          '</div><div class="agent-notes">' + escHtml(a.notes) + "</div></div>";
      }).join("") + "</div>";
  };

  /* Section 9: the compact protocol as a cycle */
  builders.protocol = function (box) {
    var steps = D.protocol, cx = 160, cy = 160, r = 118, svg = ['<svg viewBox="0 0 320 320" role="img" aria-label="The compact protocol"><circle class="ring" cx="160" cy="160" r="118"/>'];
    var ring = steps.filter(function (s) { return s[0] !== "O"; });
    ring.forEach(function (s, i) {
      var a = -Math.PI / 2 + i * 2 * Math.PI / ring.length;
      svg.push('<g class="node" tabindex="0" role="button" data-k="' + s[0] + '" aria-label="Step ' + s[0] + ": " + escHtml(s[1]) + '"><circle cx="' + (cx + r * Math.cos(a)).toFixed(1) + '" cy="' + (cy + r * Math.sin(a)).toFixed(1) + '" r="24"/><text x="' + (cx + r * Math.cos(a)).toFixed(1) + '" y="' + (cy + r * Math.sin(a)).toFixed(1) + '">' + s[0] + "</text></g>");
    });
    svg.push('<g class="node" tabindex="0" role="button" data-k="O" aria-label="Step O: Reflexive declaration"><circle cx="160" cy="160" r="30"/><text x="160" y="160">O</text></g>');
    svg.push('<text class="centre" x="160" y="208">declare first</text></svg>');
    box.innerHTML = '<div class="proto">' + svg.join("") + '<div class="proto-text" aria-live="polite"></div></div>';
    var text = box.querySelector(".proto-text");
    function show(k) {
      var s = steps.filter(function (x) { return x[0] === k; })[0];
      $$(".node", box).forEach(function (n) { n.classList.toggle("on", n.getAttribute("data-k") === k); });
      text.innerHTML = "<h5>Step " + k + " — " + escHtml(s[1]) + "</h5><p>" + escHtml(s[2]) + "</p>";
    }
    $$(".node", box).forEach(function (n) {
      n.addEventListener("click", function () { show(n.getAttribute("data-k")); });
      n.addEventListener("keydown", function (e) { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); show(n.getAttribute("data-k")); } });
    });
    show("O");
  };

  /* Companions: the Toolkit's twelve grammar families */
  builders.families = function (box) {
    var F = D.companions.families;
    box.innerHTML = '<p style="margin:0 0 .8rem">' + escHtml(F.intro) + '</p><div class="fam-grid">' + F.rows.map(function (f) {
      return '<button type="button" class="fam" aria-expanded="false"><span class="fam-name">' + escHtml(f.family) + '</span><span class="fam-var">' + escHtml(f.variable) + '</span><span class="fam-more"><b>Typical signals</b>' + escHtml(f.signals) +
        "<b>Closure range</b>" + escHtml(f.closure) + (f.note ? "<b>Note</b>" + escHtml(f.note) : "") + "</span></button>";
    }).join("") + "</div>";
    box.addEventListener("click", function (e) { var b = e.target.closest(".fam"); if (b) b.setAttribute("aria-expanded", b.getAttribute("aria-expanded") === "true" ? "false" : "true"); });
  };

  $$("[data-explore]").forEach(function (fig) {
    var kind = fig.getAttribute("data-explore");
    var box = fig.classList.contains("ledger-tools") ? fig : fig.querySelector(".explore-body");
    if (builders[kind]) {
      try { builders[kind](box); } catch (err) { box.innerHTML = "<p>This interactive figure could not be shown.</p>"; if (window.console) console.error(err); }
    }
  });

  /* ------------------------------------------------------------ start */
  var start = location.hash.slice(1);
  if (start && document.getElementById(start)) goTo(start, { instant: true });
  else openPanel("cover", { instant: true, noScroll: true });
  narrow.addEventListener("change", function () { if (current) openPanel(current.id, { keepScroll: true, noScroll: true }); });
})();
