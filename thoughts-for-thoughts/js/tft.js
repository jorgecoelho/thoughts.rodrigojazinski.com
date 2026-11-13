/* Thoughts for thoughts — web edition 0.0.4 (No. 00)
   Plain JavaScript, no dependencies. Works from file:// and any static host.
   Without this script the page reads as one continuous essay. */
(function () {
  "use strict";

  var D = JSON.parse(document.getElementById("essay-data").textContent);
  var CITE = document.getElementById("essay-cite").textContent;
  var panels = Array.prototype.slice.call(document.querySelectorAll(".panel"));
  var ids = panels.map(function (p) { return p.id; });
  var narrow = window.matchMedia("(max-width: 899px)");
  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)");
  var pop = document.getElementById("popover");
  var bar = document.querySelector(".progress span");
  var current = null;
  var TITLE = "Thoughts for thoughts";
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
  function xref(id, label) { return '<a class="xref" href="#' + id + '">' + label + "</a>"; }

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
      document.title = (id === "cover" ? "" : p.querySelector(".spine-label").textContent + " — ") + TITLE;
    }
    if (narrow.matches && !opts.noScroll) {
      p.scrollIntoView({ block: "start", behavior: opts.instant ? "auto" : "smooth" });
    } else if (!narrow.matches && !opts.noShelfScroll) {
      var shelf = document.getElementById("shelf");
      var left = p.offsetLeft;
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
    if (a.classList.contains("demo")) { e.preventDefault(); return; }
    if (a.classList.contains("cite")) { e.preventDefault(); showCite(a); return; }
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
  pop.addEventListener("click", function (e) {
    var a = e.target.closest("a");
    if (!a) return;
    if (a.classList.contains("cite")) return;
    if ((a.getAttribute("href") || "").charAt(0) === "#") hidePop();
  });

  function showCite(a) {
    var key = a.getAttribute("data-ref");
    var r = D.refs[key];
    if (!r) return;
    var search = r.kind === "search", none = r.kind === "none";
    showPop(a,
      '<div class="pop-kind">Reference</div>' +
      '<div class="pop-entry">' + r.entry + "</div>" +
      '<div class="pop-actions">' +
      (none ? "" : '<a class="primary" href="' + escHtml(r.url) + '" target="_blank" rel="noopener">' + (search ? "Search for this work" : "Open the source") + ' ↗</a>') +
      '<a href="#ref-' + key + '">In the references</a></div>' +
      '<div class="pop-note">' + escHtml(none ? "This is " + r.note + "." : search ? "No verified open link was found for this work." : "Link: " + r.note + ".") + "</div>");
  }


  function showGloss(span) {
    var term = span.getAttribute("data-gl");
    var def = D.glossary[term];
    if (!def) return;
    var slug = term.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
    showPop(span, '<div class="pop-kind">Glossary</div><dfn>' + escHtml(term) + "</dfn><div>" + def + '</div><div class="pop-actions"><a href="#gl-' + slug + '">All terms</a></div>');
  }
  var glTimer = null;
  $$(".gl:not(.demo)").forEach(function (s) {
    s.setAttribute("role", "button");
    s.addEventListener("click", function () { showGloss(s); });
    s.addEventListener("keydown", function (e) { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); showGloss(s); } });
    s.addEventListener("mouseenter", function () { if (!narrow.matches) glTimer = setTimeout(function () { if (popAnchor !== s) showGloss(s); }, 350); });
    s.addEventListener("mouseleave", function () { clearTimeout(glTimer); });
  });

  /* ------------------------------------------------------------ settings, citation */
  $("[data-theme-toggle]").addEventListener("click", function () {
    var root = document.documentElement;
    var dark = root.dataset.theme ? root.dataset.theme === "dark" : window.matchMedia("(prefers-color-scheme: dark)").matches;
    root.dataset.theme = dark ? "light" : "dark";
    store.set("tft-theme", root.dataset.theme);
  });
  $("[data-size-toggle]").addEventListener("click", function () {
    var root = document.documentElement;
    var next = { "": "l", l: "xl", xl: "" }[root.dataset.size || ""];
    if (next) root.dataset.size = next; else delete root.dataset.size;
    store.set("tft-size", next);
  });
  $$("[data-copy-cite]").forEach(function (b) {
    b.addEventListener("click", function () {
      var done = function () { var t = b.textContent; b.textContent = "Copied"; setTimeout(function () { b.textContent = t; }, 1600); };
      if (navigator.clipboard) navigator.clipboard.writeText(CITE).then(done, function () { window.prompt("Citation", CITE); });
      else window.prompt("Citation", CITE);
    });
  });
  /* Save as PDF: the browser's print dialogue, with the print layout in the stylesheet */
  $$("[data-print]").forEach(function (b) {
    b.addEventListener("click", function (e) { e.preventDefault(); hidePop(); window.print(); });
  });

  /* ------------------------------------------------------------ bookmark
     One ribbon per thought, placed only when the reader presses it. Stored under
     "bookmark:<slug>" so the index can show it too. Added at run time: the built
     page, and so the paper's text, is unchanged. */
  var BM_KEY = "bookmark:thoughts-for-thoughts";
  var bmNodes = $$(".panel:not(#cover) .prose p, .panel:not(#cover) .prose li").filter(function (n) {
    return !n.closest("figure, table, nav, .explore") && !(n.tagName === "LI" && n.querySelector("p"));
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

  /* ------------------------------------------------------------ sound: one thing at a time */
  var player = { stop: null };
  function stopSound() {
    if (player.stop) { var f = player.stop; player.stop = null; f(); }
  }

  /* ------------------------------------------------------------ explorables
     Each figure is built to the specification the paper prints just above it.
     Every figure has a reset control; the specification is its text equivalent. */
  var builders = {};
  var SVGNS = "http://www.w3.org/2000/svg";

  /* mulberry32: a small seeded generator, so that every run can be repeated from its seed */
  function rng(seed) {
    var a = seed >>> 0;
    return function () {
      a = (a + 0x6D2B79F5) >>> 0;
      var t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function newSeed() {
    try { var u = new Uint32Array(1); crypto.getRandomValues(u); return u[0] % 1000000; } catch (e) { return Math.floor(Math.random() * 1000000); }
  }
  function frac(s) { var p = String(s).split("/"); return p.length > 1 ? +p[0] / +p[1] : +p[0]; }
  function fmt(x, d) { return x.toFixed(d == null ? 3 : d); }
  function num(n) { return n.toLocaleString("en-GB"); }
  function seg(options, value, onChange, label) {
    var w = el("div", { "class": "seg", role: "group", "aria-label": label || "" });
    options.forEach(function (o) {
      var b = el("button", { type: "button", "aria-pressed": o[0] === value ? "true" : "false" }, o[1]);
      b.addEventListener("click", function () {
        $$("button", w).forEach(function (x) { x.setAttribute("aria-pressed", x === b ? "true" : "false"); });
        onChange(o[0]);
      });
      w.appendChild(b);
    });
    w.set = function (v) { $$("button", w).forEach(function (x, i) { x.setAttribute("aria-pressed", options[i][0] === v ? "true" : "false"); }); };
    return w;
  }
  function btn(label, cls, onClick) {
    var b = el("button", { type: "button", "class": cls || "fbtn" }, label);
    b.addEventListener("click", onClick);
    return b;
  }
  function svg(tag, attrs) {
    var e = document.createElementNS(SVGNS, tag);
    Object.keys(attrs || {}).forEach(function (k) { e.setAttribute(k, attrs[k]); });
    return e;
  }
  function bitsCount(h) { var k = 0; for (var i = 0; i < 6; i++) k += (h >> i) & 1; return k; }

  /* ---------------------------------------------------------------- Figure 1. Profile builder */
  builders.profile = function (box) {
    var F1 = D.fig1, COMPS = ["Space", "Constraint", "Operator", "Reading", "Consequence"];
    var STATUS = [["written", "As written"], ["empty", "Empty"], ["distributed", "Distributed"], ["uncertain", "Uncertain"], ["disputed", "Disputed"]];
    var KEY = "tft-profiles";
    function blank() { return { system: "", own: "", unit: "", c: {}, s: {}, closure: "" }; }
    var st = { A: blank(), B: blank(), map: {}, note: {}, breakAt: "", breakWhy: "", committed: false, tab: "A" };
    var saved = null;
    try { saved = JSON.parse(store.get(KEY) || "null"); } catch (e) { saved = null; }
    if (saved && saved.A && saved.B) { st = Object.assign(st, saved, { tab: "A" }); }

    box.innerHTML = "";
    var tabs = seg([["A", "Profile A"], ["B", "Profile B"], ["cmp", "Compare A and B"]], "A", function (v) { st.tab = v; draw(); }, "Profile builder views");
    var bar = el("div", { "class": "f-bar" }); bar.appendChild(tabs);
    var status = el("span", { "class": "f-status", "aria-live": "polite" });
    bar.appendChild(status);
    var main = el("div", { "class": "pb-main" });
    var tools = el("div", { "class": "f-tools" });
    tools.appendChild(btn("Save in this browser", "fbtn", function () {
      store.set(KEY, JSON.stringify({ A: st.A, B: st.B, map: st.map, note: st.note, breakAt: st.breakAt, breakWhy: st.breakWhy, committed: st.committed }));
      say(store.get(KEY) ? "Saved in this browser. Nothing is sent anywhere." : "Your browser did not allow saving.");
    }));
    tools.appendChild(btn("Forget what is saved", "fbtn", function () { store.del(KEY); say("Nothing is saved in this browser now."); }));
    tools.appendChild(btn("Copy as text", "fbtn", function () {
      var t = asText();
      if (navigator.clipboard) navigator.clipboard.writeText(t).then(function () { say("Copied."); }, function () { window.prompt("Profiles", t); });
      else window.prompt("Profiles", t);
    }));
    tools.appendChild(btn("Reset", "fbtn fbtn-quiet", function () {
      st = { A: blank(), B: blank(), map: {}, note: {}, breakAt: "", breakWhy: "", committed: false, tab: "A" }; tabs.set("A"); draw(); say("Cleared on this page. Anything saved in this browser stays until you choose “Forget what is saved”.");
    }));
    box.appendChild(bar); box.appendChild(main); box.appendChild(tools);
    if (saved) say("Your saved profiles were loaded from this browser.");

    function say(t) { status.textContent = t; }
    function sysName(p) { if (p.system === "own") return p.own || "A system you name"; var s = F1.systems.filter(function (x) { return x.id === p.system; })[0]; return s ? s.name : ""; }
    function sysRow(p) { var s = F1.systems.filter(function (x) { return x.id === p.system; })[0]; return s && s.row ? s.row : null; }
    function asText() {
      var out = [];
      ["A", "B"].forEach(function (k) {
        var p = st[k];
        out.push("Profile " + k + ": " + (sysName(p) || "(no system chosen)") + (p.unit ? " — unit of analysis: " + p.unit : ""));
        COMPS.forEach(function (c) { out.push("  " + c + (p.s[c] && p.s[c] !== "written" ? " [" + p.s[c] + "]" : "") + ": " + (p.c[c] || "")); });
        if (p.closure) out.push("  Closure falls at: " + p.closure);
      });
      COMPS.forEach(function (c) { if (st.map[c] || st.note[c]) out.push("Mapping, " + c + ": " + (st.map[c] || "") + (st.note[c] ? " — " + st.note[c] : "")); });
      if (st.breakAt || st.breakWhy) out.push("Where it breaks: " + (st.breakAt || "") + (st.breakWhy ? " — " + st.breakWhy : ""));
      return out.join("\n");
    }

    function editor(k) {
      var p = st[k], wrap = el("div", { "class": "pb-edit" });
      var top = el("div", { "class": "pb-top" });
      var sel = el("select", { "aria-label": "System for profile " + k });
      sel.innerHTML = '<option value="">Choose a system…</option>' + F1.systems.map(function (s) { return '<option value="' + s.id + '">' + escHtml(s.name) + "</option>"; }).join("") + '<option value="own">Name your own…</option>';
      sel.value = p.system;
      var own = el("input", { type: "text", placeholder: "Name the system", "aria-label": "Name of your own system" }); own.value = p.own; own.hidden = p.system !== "own";
      var unit = el("input", { type: "text", placeholder: "Unit of analysis, e.g. a single consultation", "aria-label": "Unit of analysis" }); unit.value = p.unit;
      sel.addEventListener("change", function () { p.system = sel.value; own.hidden = p.system !== "own"; if (!own.hidden) own.focus(); st.committed = false; });
      own.addEventListener("input", function () { p.own = own.value; });
      unit.addEventListener("input", function () { p.unit = unit.value; });
      var l1 = el("label", { "class": "pb-field" }, "<span>System</span>"); l1.appendChild(sel); l1.appendChild(own);
      var l2 = el("label", { "class": "pb-field pb-unit" }, "<span>Unit of analysis</span>"); l2.appendChild(unit);
      top.appendChild(l1); top.appendChild(l2);
      wrap.appendChild(top);
      wrap.appendChild(el("p", { "class": "pb-hint" }, escHtml(F1.unit) + ". " + escHtml(F1.statuses)));
      COMPS.forEach(function (c) {
        var row = el("div", { "class": "pb-row" });
        row.appendChild(el("div", { "class": "pb-def" }, "<b>" + c + "</b><span>" + escHtml(F1.components[c]) + "</span>"));
        var ta = el("textarea", { rows: "2", "aria-label": c + " of profile " + k }); ta.value = p.c[c] || "";
        ta.addEventListener("input", function () { p.c[c] = ta.value; });
        var ss = el("select", { "aria-label": "State of " + c }); ss.innerHTML = STATUS.map(function (s) { return '<option value="' + s[0] + '">' + s[1] + "</option>"; }).join("");
        ss.value = p.s[c] || "written";
        ss.addEventListener("change", function () { p.s[c] = ss.value; row.classList.toggle("pb-marked", ss.value !== "written"); });
        row.classList.toggle("pb-marked", (p.s[c] || "written") !== "written");
        var cell = el("div", { "class": "pb-in" }); cell.appendChild(ta); cell.appendChild(ss);
        row.appendChild(cell);
        wrap.appendChild(row);
      });
      var cl = el("label", { "class": "pb-field pb-closure" }, "<span>Where closure falls</span>");
      var cs = el("select", { "aria-label": "Where closure falls in profile " + k });
      cs.innerHTML = ["", "Operator", "Reading", "Consequence", "Nowhere: it never closes", "Not clear"].map(function (o) { return '<option value="' + o + '">' + (o || "Choose…") + "</option>"; }).join("");
      cs.value = p.closure; cs.addEventListener("change", function () { p.closure = cs.value; });
      cl.appendChild(cs);
      wrap.appendChild(cl);
      wrap.appendChild(el("p", { "class": "pb-hint" }, escHtml(F1.closure)));
      wrap.appendChild(el("p", { "class": "pb-next" }, k === "A" ? '<button type="button" class="linkish" data-go="B">Now profile a second system →</button>' : '<button type="button" class="linkish" data-go="cmp">Compare the two →</button>'));
      $("[data-go]", wrap).addEventListener("click", function (e) { st.tab = e.target.getAttribute("data-go"); tabs.set(st.tab); draw(); });
      return wrap;
    }

    function essayRow(name) {
      var r = F1.profiles[name];
      return '<table class="pb-essay"><caption>' + escHtml(name) + ", as profiled in section 4.1</caption><tbody>" +
        COMPS.map(function (c) { return "<tr><th>" + c + "</th><td>" + escHtml(r[c]) + "</td></tr>"; }).join("") + "</tbody></table>";
    }

    function compare() {
      var wrap = el("div", { "class": "pb-cmp" });
      if (!st.A.system || !st.B.system) {
        wrap.appendChild(el("p", { "class": "pb-hint" }, "Choose a system for both profiles first. A comparison is only meaningful between profiles drawn at the same unit of analysis."));
        return wrap;
      }
      if (st.A.unit && st.B.unit && st.A.unit.trim().toLowerCase() !== st.B.unit.trim().toLowerCase())
        wrap.appendChild(el("p", { "class": "pb-warn" }, "The two units of analysis differ (“" + escHtml(st.A.unit) + "” and “" + escHtml(st.B.unit) + "”). Section 3 asks for profiles drawn at the same scale."));
      var g = el("div", { "class": "pb-grid", role: "table", "aria-label": "Mapping between the two profiles" });
      g.innerHTML = '<div class="pb-gh" role="row"><span role="columnheader"></span><span role="columnheader">A · ' + escHtml(sysName(st.A)) + '</span><span role="columnheader">B · ' + escHtml(sysName(st.B)) + '</span><span role="columnheader">Your mapping</span></div>';
      COMPS.forEach(function (c) {
        var r = el("div", { "class": "pb-gr", role: "row" });
        var cellTxt = function (p) { var v = p.c[c] ? escHtml(p.c[c]) : '<i class="muted">not filled</i>'; var s = p.s[c] && p.s[c] !== "written" ? ' <span class="pb-tag">' + p.s[c] + "</span>" : ""; return v + s; };
        r.innerHTML = '<b role="rowheader">' + c + '</b><span role="cell">' + cellTxt(st.A) + '</span><span role="cell">' + cellTxt(st.B) + "</span>";
        var m = el("span", { role: "cell", "class": "pb-map" });
        var ms = el("select", { "aria-label": "Mapping for " + c });
        ms.innerHTML = ["", "maps", "maps, with a difference", "does not map"].map(function (o) { return '<option value="' + o + '">' + (o || "Choose…") + "</option>"; }).join("");
        ms.value = st.map[c] || ""; ms.addEventListener("change", function () { st.map[c] = ms.value; r.className = "pb-gr pb-" + (ms.value ? ms.value.split(",")[0].replace(/ /g, "-") : "none"); });
        r.className = "pb-gr pb-" + (st.map[c] ? st.map[c].split(",")[0].replace(/ /g, "-") : "none");
        var mn = el("input", { type: "text", placeholder: "What corresponds, what is lost", "aria-label": "Mapping note for " + c }); mn.value = st.note[c] || "";
        mn.addEventListener("input", function () { st.note[c] = mn.value; });
        m.appendChild(ms); m.appendChild(mn); r.appendChild(m);
        g.appendChild(r);
      });
      wrap.appendChild(g);
      var br = el("div", { "class": "pb-break" });
      br.innerHTML = '<h4>Where does the comparison break?</h4><p class="pb-hint">Find the point where it fails and say why. Commit your answer before you look at the essay’s.</p>';
      var bs = el("select", { "aria-label": "Component where the comparison breaks" });
      bs.innerHTML = '<option value="">At which component…</option>' + COMPS.map(function (c) { return '<option value="' + c + '">' + c + "</option>"; }).join("");
      bs.value = st.breakAt; bs.addEventListener("change", function () { st.breakAt = bs.value; });
      var bw = el("textarea", { rows: "2", placeholder: "Why it breaks there", "aria-label": "Why the comparison breaks there" }); bw.value = st.breakWhy;
      bw.addEventListener("input", function () { st.breakWhy = bw.value; });
      br.appendChild(bs); br.appendChild(bw);
      var commit = btn(st.committed ? "Committed" : "Commit my break point", "fbtn fbtn-primary", function () {
        if (!st.breakAt) { say("Choose the component where it breaks first."); bs.focus(); return; }
        st.committed = true; draw();
      });
      br.appendChild(commit);
      wrap.appendChild(br);
      if (st.committed) {
        var rev = el("div", { "class": "pb-reveal" });
        var ids = [st.A.system, st.B.system].sort().join("+");
        var h = "<p><b>Your break point:</b> " + escHtml(st.breakAt) + (st.breakWhy ? ". " + escHtml(st.breakWhy) : "") + "</p>";
        if (ids === "feed+iching") {
          h += '<blockquote class="pb-quote"><p>' + escHtml(F1["break"]) + " " + escHtml(F1.breakAfter) + '</p><footer>The essay’s break point, <a class="xref" href="#s4-2">section 4.2</a></footer></blockquote>';
        } else {
          h += '<p class="pb-hint">The essay states its own break point for one pair: the I Ching and a recommendation feed (<a class="xref" href="#s4-2">section 4.2</a>). Choose those two to compare yours with it.</p>';
        }
        var rows = [sysRow(st.A), sysRow(st.B)].filter(Boolean).filter(function (v, i, a) { return a.indexOf(v) === i; });
        if (rows.length) h += '<div class="pb-essays">' + rows.map(essayRow).join("") + "</div>";
        rev.innerHTML = h;
        wrap.appendChild(rev);
      }
      return wrap;
    }

    function draw() {
      main.innerHTML = "";
      main.appendChild(st.tab === "cmp" ? compare() : editor(st.tab));
    }
    draw();
  };

  /* ---------------------------------------------------------------- Sixteen cowries (illustration, Note 3) */
  builders.cowries = function (box) {
    var C = [1]; for (var k = 1; k <= 16; k++) C[k] = C[k - 1] * (17 - k) / k;
    var seed = newSeed(), R = rng(seed), hist = null, n = 0, last = null;
    box.innerHTML = "";
    var top = el("div", { "class": "f-bar" });
    var shells = el("div", { "class": "cw-shells", "aria-live": "polite" });
    var read = el("p", { "class": "cw-read" });
    var chart = el("div", { "class": "cw-chart" });
    var meta = el("p", { "class": "f-meta" });
    top.appendChild(btn("Throw sixteen shells", "fbtn fbtn-primary", function () { throwOnce(); }));
    top.appendChild(btn("Throw 1,000 times", "fbtn", function () { for (var i = 0; i < 1000; i++) throwOnce(true); throwOnce(); }));
    top.appendChild(btn("Reset", "fbtn fbtn-quiet", function () { seed = newSeed(); R = rng(seed); hist = null; n = 0; last = null; draw(); }));
    box.appendChild(top); box.appendChild(shells); box.appendChild(read); box.appendChild(chart); box.appendChild(meta);
    function throwOnce(quiet) {
      var conf = [], up = 0;
      for (var i = 0; i < 16; i++) { var u = R() < 0.5 ? 1 : 0; conf.push(u); up += u; }
      if (!hist) hist = new Array(17).fill(0);
      hist[up]++; n++; last = conf;
      if (!quiet) draw();
    }
    function draw() {
      shells.innerHTML = "";
      if (last) {
        last.forEach(function (u, i) {
          var s = el("span", { "class": "cw-shell" + (u ? " up" : ""), title: "Shell " + (i + 1) + ": mouth " + (u ? "up" : "down") });
          shells.appendChild(s);
        });
        var up = last.reduce(function (a, b) { return a + b; }, 0);
        read.innerHTML = "This configuration is one of " + num(65536) + ". The reading sees only the count: <b>" + up + " mouth" + (up === 1 ? "" : "s") + " up</b>, an outcome shared by " +
          num(C[up]) + " configuration" + (C[up] === 1 ? "" : "s") + " (probability " + (C[up] / 65536 < 0.001 ? (C[up] / 65536).toExponential(1) : fmt(C[up] / 65536)) + ").";
      } else {
        read.innerHTML = '<span class="muted">Throw the shells. ' + escHtml(D.cowries.text) + "</span>";
      }
      chart.innerHTML = "";
      var W = 520, H = 150, pad = 22, bw = (W - pad * 2) / 17;
      var s = svg("svg", { viewBox: "0 0 " + W + " " + H, role: "img", "aria-label": "Counts of mouths up, observed against Note 3" });
      var maxP = C[8] / 65536;
      for (var k = 0; k <= 16; k++) {
        var x = pad + k * bw, ph = (C[k] / 65536) / maxP * (H - 40);
        s.appendChild(svg("rect", { x: x + 2, y: H - 20 - ph, width: bw - 4, height: ph, "class": "cw-exp" }));
        if (hist) {
          var oh = (hist[k] / n) / maxP * (H - 40);
          s.appendChild(svg("rect", { x: x + bw * 0.3, y: H - 20 - Math.min(oh, H - 24), width: bw * 0.4, height: Math.min(oh, H - 24), "class": "cw-obs" }));
        }
        var t = svg("text", { x: x + bw / 2, y: H - 6, "class": "cw-ax", "text-anchor": "middle" }); t.textContent = k; s.appendChild(t);
      }
      chart.appendChild(s);
      meta.innerHTML = '<span class="sw sw-exp"></span>Note 3: C(16, <i>k</i>) of 65,536 <span class="sw sw-obs"></span>Observed' + (n ? " in " + num(n) + " throw" + (n === 1 ? "" : "s") : "") +
        ' · seed ' + seed + ' · <span class="muted">16 binary outcomes give 65,536 configurations; reading the count gives 17 outcomes, far from equally likely.</span>';
    }
    draw();
  };

  /* ---------------------------------------------------------------- Figure 2. Casting simulator */
  builders.casting = function (box) {
    var F2 = D.fig2, TYPES = [6, 7, 8, 9];
    var P = { yarrow: {}, coins: {} };
    TYPES.forEach(function (t) { P.yarrow[t] = frac(F2.yarrow[t]); P.coins[t] = frac(F2.coins[t]); });
    var st = { proc: "yarrow", seed: newSeed(), lines: [], steps: [], fixed: null, n: 10000, result: null };
    var R = rng(st.seed);
    function yang(t) { return t === 7 || t === 9; }
    function moving(t) { return t === 6 || t === 9; }
    /* one line by the procedure of Note 1; returns the total and the steps that made it */
    function castLine(r, proc) {
      if (proc === "coins") {
        var f = [r() < 0.5 ? 3 : 2, r() < 0.5 ? 3 : 2, r() < 0.5 ? 3 : 2];
        return { t: f[0] + f[1] + f[2], parts: f };
      }
      var d = [r() < 0.25 ? 2 : 3, r() < 0.5 ? 2 : 3, r() < 0.5 ? 2 : 3];
      return { t: d[0] + d[1] + d[2], parts: d };
    }
    function hexOf(types) { var h = 0; types.forEach(function (t, i) { if (yang(t)) h |= 1 << i; }); return h; }
    function changedOf(types) { var h = 0; types.forEach(function (t, i) { if (t === 7 || t === 6) h |= 1 << i; }); return h; }

    box.innerHTML = "";
    var bar = el("div", { "class": "f-bar" });
    var procSeg = seg([["yarrow", "Yarrow stalks"], ["coins", "Three coins"]], st.proc, function (v) { st.proc = v; st.lines = []; st.steps = []; st.result = null; draw(); }, "Casting procedure");
    bar.appendChild(procSeg);
    bar.appendChild(btn("Reset", "fbtn fbtn-quiet", function () { st.lines = []; st.steps = []; st.result = null; st.fixed = null; st.seed = newSeed(); R = rng(st.seed); seedIn.value = st.seed; draw(); }));
    box.appendChild(bar);

    var grid = el("div", { "class": "cs-grid" });
    box.appendChild(grid);

    /* one cast, line by line */
    var one = el("section", { "class": "cs-one" });
    one.innerHTML = '<h4 class="f-h">Cast one hexagram, line by line</h4>';
    var oneBtns = el("div", { "class": "f-row" });
    var nextBtn = btn("Cast the next line", "fbtn fbtn-primary", function () { castNext(); });
    oneBtns.appendChild(nextBtn);
    oneBtns.appendChild(btn("Cast all six", "fbtn", function () { while (st.lines.length < 6) castNext(true); draw(); }));
    oneBtns.appendChild(btn("Start again", "fbtn fbtn-quiet", function () { st.lines = []; st.steps = []; draw(); }));
    one.appendChild(oneBtns);
    var oneOut = el("div", { "class": "cs-oneout", "aria-live": "polite" });
    one.appendChild(oneOut);
    grid.appendChild(one);

    /* many casts */
    var many = el("section", { "class": "cs-many" });
    many.innerHTML = '<h4 class="f-h">Run many casts</h4>';
    var mrow = el("div", { "class": "f-row" });
    var nSel = el("select", { "aria-label": "Number of casts" });
    nSel.innerHTML = [100, 1000, 10000, 100000].map(function (v) { return '<option value="' + v + '">' + num(v) + " casts</option>"; }).join("");
    nSel.value = String(st.n); nSel.addEventListener("change", function () { st.n = +nSel.value; });
    var seedIn = el("input", { type: "number", min: "0", max: "4294967295", value: String(st.seed), "aria-label": "Seed", "class": "f-seed" });
    var seedL = el("label", { "class": "f-inline" }, "seed "); seedL.appendChild(seedIn);
    mrow.appendChild(nSel); mrow.appendChild(seedL);
    mrow.appendChild(btn("New seed", "fbtn fbtn-quiet", function () { st.seed = newSeed(); seedIn.value = st.seed; }));
    mrow.appendChild(btn("Run", "fbtn fbtn-primary", function () { st.seed = (+seedIn.value) >>> 0; seedIn.value = st.seed; run(); }));
    many.appendChild(mrow);
    var fixRow = el("p", { "class": "f-meta cs-fix" });
    many.appendChild(fixRow);
    var out = el("div", { "class": "cs-out", "aria-live": "polite" });
    many.appendChild(out);

    /* the six-cube: beside both on wide screens, between them on narrow ones */
    var cubeWrap = el("div", { "class": "cs-cubewrap" });
    var cubeBox = el("div", { "class": "cs-cube" });
    cubeWrap.appendChild(cubeBox);
    var cubeNote = el("p", { "class": "f-meta" });
    cubeWrap.appendChild(cubeNote);
    grid.appendChild(cubeWrap);
    grid.appendChild(many);

    /* layout: vertices by number of yang lines (rows), ordered by value within each row */
    var rows = [[], [], [], [], [], [], []];
    for (var h = 0; h < 64; h++) rows[bitsCount(h)].push(h);
    var W = 360, H = 330, pos = {};
    rows.forEach(function (r, k) {
      var y = H - 22 - k * ((H - 44) / 6);
      var gap = (W - 30) / Math.max(r.length, 1);
      r.forEach(function (hh, i) { pos[hh] = [15 + gap * (i + 0.5), y]; });
    });
    var cube = svg("svg", { viewBox: "0 0 " + W + " " + H, role: "img", "aria-label": "The 64 hexagrams as vertices of a six-cube, by number of yang lines" });
    var gE = svg("g", { "class": "cs-edges" }), gP = svg("g", { "class": "cs-path" }), gV = svg("g", { "class": "cs-verts" });
    for (var a = 0; a < 64; a++) for (var i = 0; i < 6; i++) { var b = a ^ (1 << i); if (b > a) gE.appendChild(svg("line", { x1: pos[a][0], y1: pos[a][1], x2: pos[b][0], y2: pos[b][1] })); }
    var verts = [];
    for (var v = 0; v < 64; v++) {
      var c = svg("circle", { cx: pos[v][0], cy: pos[v][1], r: 4.2, tabindex: "0", role: "button", "aria-label": "Fix the cast hexagram: " + bitsCount(v) + " yang lines, " + hexLabel(v) });
      var t = svg("title"); t.textContent = hexLabel(v) + " (" + bitsCount(v) + " yang). Click to fix the cast hexagram."; c.appendChild(t);
      (function (vv) {
        c.addEventListener("click", function () { st.fixed = st.fixed === vv ? null : vv; st.result = null; draw(); });
        c.addEventListener("keydown", function (e) { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); st.fixed = st.fixed === vv ? null : vv; st.result = null; draw(); } });
      })(v);
      verts.push(c); gV.appendChild(c);
    }
    for (var k = 0; k <= 6; k++) { var lt = svg("text", { x: W - 2, y: H - 22 - k * ((H - 44) / 6) + 3, "class": "cs-k", "text-anchor": "end" }); lt.textContent = k; cube.appendChild(lt); }
    var kl = svg("text", { x: W - 2, y: 10, "class": "cs-k", "text-anchor": "end" }); kl.textContent = "yang lines"; cube.appendChild(kl);
    cube.appendChild(gE); cube.appendChild(gP); cube.appendChild(gV);
    cubeBox.appendChild(cube);

    function hexLabel(hh) { var s = ""; for (var i = 5; i >= 0; i--) s += (hh >> i) & 1; return "lines 6→1: " + s; }
    function hexSvg(types, changed, label) {
      var s = '<svg class="hex" viewBox="0 0 60 66" role="img" aria-label="' + label + '">';
      for (var i = 0; i < 6; i++) {
        var y = 58 - i * 10.4, t = types[i];
        if (t == null) { s += '<rect x="4" y="' + y + '" width="52" height="5" class="hx-empty"/>'; continue; }
        var on = changed ? (t === 7 || t === 6) : yang(t), cls = !changed && moving(t) ? "hx-move" : "hx";
        s += on ? '<rect x="4" y="' + y + '" width="52" height="5" class="' + cls + '"/>' : '<rect x="4" y="' + y + '" width="22" height="5" class="' + cls + '"/><rect x="34" y="' + y + '" width="22" height="5" class="' + cls + '"/>';
      }
      return s + "</svg>";
    }
    var NAMES = { 6: "old yin, moving", 7: "young yang", 8: "young yin", 9: "old yang, moving" };
    function castNext(quiet) {
      if (st.lines.length >= 6) { st.lines = []; st.steps = []; }
      var r = castLine(R, st.proc);
      st.lines.push(r.t); st.steps.push(r.parts);
      if (!quiet) draw();
    }
    function drawOne() {
      var L = st.lines, html = '<div class="cs-hexes">';
      var types = [0, 1, 2, 3, 4, 5].map(function (i) { return L[i]; });
      html += '<figure><figcaption>Cast</figcaption>' + hexSvg(types, false, "Cast hexagram") + "</figure>";
      if (L.length === 6) {
        var hm = L.filter(moving).length;
        html += '<span class="cs-arrow" aria-hidden="true">→</span><figure><figcaption>Changed</figcaption>' + hexSvg(types, true, "Changed hexagram") + "</figure>";
        html += '<p class="cs-dist"><b>' + hm + "</b> moving line" + (hm === 1 ? "" : "s") + ": the changed hexagram is " + hm + " edge" + (hm === 1 ? "" : "s") + " from the cast one on the cube (their Hamming distance).</p>";
      }
      html += "</div><ol class=\"cs-steps\">";
      st.steps.forEach(function (p, i) {
        var how = st.proc === "coins" ? "coins " + p.join(" + ") : "divisions " + p.map(function (x) { return x === 2 ? "larger (2)" : "smaller (3)"; }).join(", ");
        html += "<li>Line " + (i + 1) + ": " + how + " = <b>" + L[i] + "</b>, " + NAMES[L[i]] + "</li>";
      });
      html += "</ol>";
      if (!L.length) html += '<p class="muted">' + escHtml(st.proc === "coins" ? "Coins: " + F2.coinRule + "." : "Yarrow stalks: " + F2.yarrowRule + "; the larger remainder scores 2 and the smaller 3.") + "</p>";
      oneOut.innerHTML = html;
      nextBtn.textContent = L.length >= 6 ? "Cast a new hexagram" : "Cast line " + (L.length + 1);
    }
    function run() {
      var r = rng(st.seed), n = st.n, P0 = P[st.proc];
      var lineCount = { 6: 0, 7: 0, 8: 0, 9: 0 }, castHist = new Array(64).fill(0), chK = new Array(7).fill(0), movSum = 0, none = 0, lines = 0;
      for (var c = 0; c < n; c++) {
        var types = [];
        for (var i = 0; i < 6; i++) {
          var t = castLine(r, st.proc).t;
          if (st.fixed != null) { var want = (st.fixed >> i) & 1; while ((yang(t) ? 1 : 0) !== want) t = castLine(r, st.proc).t; }
          types.push(t); lineCount[t]++; lines++;
        }
        var m = types.filter(moving).length;
        movSum += m; if (!m) none++;
        castHist[hexOf(types)]++; chK[bitsCount(changedOf(types))]++;
      }
      /* what Notes 1 and 2 give for this run */
      var expLine = {}, cond = st.fixed != null;
      TYPES.forEach(function (t) {
        if (!cond) expLine[t] = P0[t];
      });
      var pMoveYang = P0[9] / (P0[7] + P0[9]), pMoveYin = P0[6] / (P0[6] + P0[8]);
      var k = cond ? bitsCount(st.fixed) : null;
      var expMov = cond ? k * pMoveYang + (6 - k) * pMoveYin : 6 * (P0[6] + P0[9]);
      var expNone = cond ? Math.pow(1 - pMoveYang, k) * Math.pow(1 - pMoveYin, 6 - k) : Math.pow(1 - (P0[6] + P0[9]), 6);
      /* changed hexagram: each line yang afterwards with its own probability; distribution of the number of yang lines */
      var pY = [];
      for (var j = 0; j < 6; j++) {
        if (!cond) pY.push(P0[7] + P0[6]);
        else pY.push(((st.fixed >> j) & 1) ? 1 - pMoveYang : pMoveYin);
      }
      var dist = [1];
      pY.forEach(function (p) { var nd = new Array(dist.length + 1).fill(0); dist.forEach(function (q, x) { nd[x] += q * (1 - p); nd[x + 1] += q * p; }); dist = nd; });
      st.result = { n: n, lines: lines, lineCount: lineCount, castHist: castHist, chK: chK, mov: movSum / n, none: none / n, expLine: expLine, expMov: expMov, expNone: expNone, dist: dist, cond: cond, k: k, seed: st.seed, proc: st.proc };
      draw();
    }
    function tol(p, n) { return 3 * Math.sqrt(p * (1 - p) / n); }
    function okCell(obs, exp, t) { var ok = Math.abs(obs - exp) <= t; return '<td class="' + (ok ? "ok" : "off") + '">' + (ok ? "within" : "outside") + "</td>"; }
    function drawRun() {
      var R0 = st.result;
      fixRow.innerHTML = st.fixed == null ? "Cast hexagram: any. <span class=\"muted\">Click a vertex of the cube to see the transitions from that hexagram alone.</span>"
        : "Cast hexagram fixed: " + bitsCount(st.fixed) + " yang lines (" + hexLabel(st.fixed) + "). Each line is cast by the procedure until it has the required kind. <button type=\"button\" class=\"linkish\" data-unfix>Any hexagram</button>";
      var u = $("[data-unfix]", fixRow); if (u) u.addEventListener("click", function () { st.fixed = null; st.result = null; draw(); });
      if (!R0 || R0.proc !== st.proc) { out.innerHTML = '<p class="muted">Choose how many casts and press Run. Observed frequencies are compared with Notes 1 and 2, within a tolerance of three standard errors.</p>'; return; }
      var h = "<table class=\"cs-table\"><caption>" + num(R0.n) + " casts by " + (R0.proc === "coins" ? "three coins" : "yarrow stalks") + ", seed " + R0.seed + "</caption>";
      h += "<thead><tr><th></th><th>Observed</th><th>Notes 1–2</th><th>Tolerance</th><th></th></tr></thead><tbody>";
      if (!R0.cond) {
        TYPES.forEach(function (t) {
          var o = R0.lineCount[t] / R0.lines, e = R0.expLine[t], tl = tol(e, R0.lines);
          h += "<tr><th>" + escHtml(D.fig2.table[t].name) + "</th><td>" + fmt(o, 4) + "</td><td>" + escHtml(D.fig2.table[t][R0.proc]) + " = " + fmt(e, 4) + "</td><td>± " + fmt(tl, 4) + "</td>" + okCell(o, e, tl) + "</tr>";
        });
      }
      var sdMov = 0; // standard error of the mean number of moving lines
      var pMY = P[R0.proc][9] / (P[R0.proc][7] + P[R0.proc][9]), pMN = P[R0.proc][6] / (P[R0.proc][6] + P[R0.proc][8]);
      if (R0.cond) sdMov = Math.sqrt(R0.k * pMY * (1 - pMY) + (6 - R0.k) * pMN * (1 - pMN));
      else { var pm = P[R0.proc][6] + P[R0.proc][9]; sdMov = Math.sqrt(6 * pm * (1 - pm)); }
      var tm = 3 * sdMov / Math.sqrt(R0.n);
      h += "<tr><th>Mean moving lines" + (R0.cond ? " from this hexagram" : "") + "</th><td>" + fmt(R0.mov) + "</td><td>" + (R0.cond ? (R0.proc === "yarrow" ? "(k + 3)/4 = " + fmt(R0.expMov) : "3/2") : "3/2") + "</td><td>± " + fmt(tm) + "</td>" + okCell(R0.mov, R0.expMov, tm) + "</tr>";
      var tn = tol(R0.expNone, R0.n);
      h += "<tr><th>No moving line</th><td>" + fmt(R0.none) + "</td><td>" + fmt(R0.expNone) + "</td><td>± " + fmt(tn) + "</td>" + okCell(R0.none, R0.expNone, tn) + "</tr>";
      h += "</tbody></table>";
      if (!R0.cond) {
        var e = 1 / 64, tc = tol(e, R0.n), outside = R0.castHist.filter(function (c) { return Math.abs(c / R0.n - e) > tc; }).length;
        h += '<p class="f-meta"><b>Cast hexagrams.</b> ' + outside + " of the 64 fall outside 1/64 ± " + fmt(tc, 4) + " (by chance alone, about " + fmt(64 * 0.0027, 2) + " would). " + castStrip(R0) + "</p>";
      }
      h += '<div class="cs-ch"><b>Changed hexagrams, by number of yang lines</b>' + chChart(R0) + "</div>";
      h += '<p class="f-meta">Random numbers: mulberry32 from seed ' + R0.seed + "; " + (R0.proc === "coins" ? "each coin scores 3 when u &lt; 1/2, else 2." : "the first division gives the larger remainder when u &lt; 1/4, the second and third when u &lt; 1/2.") + " Ordinary random variation within the tolerance is not a failure.</p>";
      out.innerHTML = h;
    }
    function castStrip(R0) {
      var max = Math.max.apply(null, R0.castHist), s = '<span class="cs-strip" aria-hidden="true">';
      R0.castHist.forEach(function (c) { s += '<i style="height:' + Math.max(2, Math.round(c / max * 22)) + 'px"></i>'; });
      return s + "</span>";
    }
    function chChart(R0) {
      var W2 = 300, H2 = 92, bw = (W2 - 20) / 7, mx = Math.max.apply(null, R0.dist.concat(R0.chK.map(function (c) { return c / R0.n; })));
      var s = '<svg viewBox="0 0 ' + W2 + " " + H2 + '" role="img" aria-label="Changed hexagrams by number of yang lines, observed against the probabilities">';
      for (var k = 0; k <= 6; k++) {
        var x = 10 + k * bw, eh = R0.dist[k] / mx * (H2 - 26), oh = (R0.chK[k] / R0.n) / mx * (H2 - 26);
        s += '<rect class="cw-exp" x="' + (x + 2) + '" y="' + (H2 - 16 - eh) + '" width="' + (bw - 4) + '" height="' + eh + '"/>';
        s += '<rect class="cw-obs" x="' + (x + bw * 0.3) + '" y="' + (H2 - 16 - oh) + '" width="' + (bw * 0.4) + '" height="' + oh + '"/>';
        s += '<text class="cw-ax" x="' + (x + bw / 2) + '" y="' + (H2 - 4) + '" text-anchor="middle">' + k + "</text>";
      }
      return s + '</svg><span class="f-meta"><span class="sw sw-exp"></span>expected ' + (R0.cond ? "from this hexagram" : "(each line yang afterwards with probability " + (R0.proc === "coins" ? "1/2" : "3/8") + ")") + ' <span class="sw sw-obs"></span>observed</span>';
    }
    function drawCube() {
      gP.innerHTML = "";
      verts.forEach(function (c, v) { c.setAttribute("class", "cs-v" + (st.fixed === v ? " fixed" : "")); });
      var L = st.lines;
      if (L.length === 6) {
        var from = hexOf(L), to = changedOf(L), cur = from;
        for (var i = 0; i < 6; i++) {
          if (!moving(L[i])) continue;
          var nx = cur ^ (1 << i);
          gP.appendChild(svg("line", { x1: pos[cur][0], y1: pos[cur][1], x2: pos[nx][0], y2: pos[nx][1] }));
          cur = nx;
        }
        verts[from].setAttribute("class", verts[from].getAttribute("class") + " cast");
        verts[to].setAttribute("class", verts[to].getAttribute("class") + " changed");
        cubeNote.innerHTML = '<span class="sw sw-cast"></span>cast <span class="sw sw-changed"></span>changed. The path changes the moving lines one at a time, from the bottom line up; its length is the number of moving lines.';
      } else {
        cubeNote.innerHTML = "64 vertices, one per hexagram, in rows by number of yang lines; each of the 192 edges changes one line. Cast a hexagram to see its path, or click a vertex to fix the cast hexagram for a run.";
      }
    }
    function draw() { drawOne(); drawRun(); drawCube(); }
    draw();
  };

  /* ---------------------------------------------------------------- Figure 3. Number scrabble */
  builders.scrabble = function (box) {
    var SQ = D.square, LINES = [];
    SQ.forEach(function (r) { LINES.push(r.slice()); });
    for (var c = 0; c < 3; c++) LINES.push([SQ[0][c], SQ[1][c], SQ[2][c]]);
    LINES.push([SQ[0][0], SQ[1][1], SQ[2][2]]); LINES.push([SQ[0][2], SQ[1][1], SQ[2][0]]);
    var st = { own: {}, first: "you", view: "list", showSets: false, over: null };
    var memo = {};
    function wins(own, who) { return LINES.filter(function (l) { return l.every(function (n) { return own[n] === who; }); })[0] || null; }
    function free(own) { var f = []; for (var n = 1; n <= 9; n++) if (!own[n]) f.push(n); return f; }
    function key(own) { var s = ""; for (var n = 1; n <= 9; n++) s += own[n] === "you" ? "x" : own[n] === "page" ? "o" : "."; return s; }
    /* the value of a position for the page, with the given player to move: +1 page wins, 0 draw, -1 page loses */
    function value(own, toMove) {
      var k = key(own) + toMove;
      if (k in memo) return memo[k];
      var v;
      if (wins(own, "page")) v = 1; else if (wins(own, "you")) v = -1; else if (!free(own).length) v = 0;
      else {
        var vals = free(own).map(function (n) { own[n] = toMove; var x = value(own, toMove === "page" ? "you" : "page"); delete own[n]; return x; });
        v = toMove === "page" ? Math.max.apply(null, vals) : Math.min.apply(null, vals);
      }
      memo[k] = v; return v;
    }
    function pageMove() {
      var best = -2, opts = [];
      free(st.own).forEach(function (n) {
        st.own[n] = "page"; var v = value(st.own, "you"); delete st.own[n];
        if (v > best) { best = v; opts = [n]; } else if (v === best) opts.push(n);
      });
      if (!opts.length) return;
      st.own[opts[Math.floor(Math.random() * opts.length)]] = "page";
    }
    function check() {
      var w = wins(st.own, "you") ? "you" : wins(st.own, "page") ? "page" : !free(st.own).length ? "draw" : null;
      st.over = w;
    }
    function play(n) {
      if (st.over || st.own[n]) return;
      st.own[n] = "you"; check();
      if (!st.over) { pageMove(); check(); }
      draw();
    }
    function reset() { st.own = {}; st.over = null; if (st.first === "page") pageMove(); draw(); }

    box.innerHTML = "";
    var bar = el("div", { "class": "f-bar" });
    var viewSeg = seg([["list", "List of numbers"], ["board", "Magic square"]], "list", function (v) { st.view = v; draw(); }, "Representation");
    bar.appendChild(viewSeg);
    var firstSeg = seg([["you", "You start"], ["page", "The page starts"]], "you", function (v) { st.first = v; reset(); }, "Who starts");
    bar.appendChild(firstSeg);
    var setsBtn = btn("Show the eight winning sets", "fbtn", function () { st.showSets = !st.showSets; setsBtn.setAttribute("aria-pressed", st.showSets ? "true" : "false"); draw(); });
    setsBtn.setAttribute("aria-pressed", "false");
    bar.appendChild(setsBtn);
    bar.appendChild(btn("New game", "fbtn fbtn-quiet", reset));
    box.appendChild(bar);
    var stage = el("div", { "class": "ns-stage" });
    var status = el("p", { "class": "ns-status", "aria-live": "polite" });
    box.appendChild(stage); box.appendChild(status);

    function held(who) { var a = []; for (var n = 1; n <= 9; n++) if (st.own[n] === who) a.push(n); return a; }
    function winLine() { return wins(st.own, "you") || wins(st.own, "page"); }
    function draw() {
      stage.innerHTML = "";
      var wl = winLine();
      if (st.view === "list") {
        var row = el("div", { "class": "ns-list", role: "group", "aria-label": "Numbers 1 to 9" });
        for (var n = 1; n <= 9; n++) {
          var o = st.own[n];
          var b = el("button", { type: "button", "class": "ns-num" + (o ? " " + o : "") + (wl && wl.indexOf(n) >= 0 ? " win" : ""), "aria-label": n + (o ? (o === "you" ? ", yours" : ", the page's") : ", free") }, String(n));
          if (o || st.over) b.disabled = true;
          (function (nn) { b.addEventListener("click", function () { play(nn); }); })(n);
          row.appendChild(b);
        }
        stage.appendChild(row);
        var hv = el("div", { "class": "ns-held" });
        var y = held("you"), p = held("page");
        hv.innerHTML = '<p><span class="ns-who you">You</span> ' + (y.length ? y.join(", ") : "—") + '</p><p><span class="ns-who page">Page</span> ' + (p.length ? p.join(", ") : "—") + "</p>" +
          '<p class="f-meta">Win by holding three numbers that sum to 15.</p>';
        stage.appendChild(hv);
        if (st.showSets) {
          var ul = el("ul", { "class": "ns-sets" });
          LINES.map(function (l) { return l.slice().sort(function (a, b) { return a - b; }); }).sort(function (a, b) { return a[0] - b[0] || a[1] - b[1]; }).forEach(function (l) {
            var cls = l.every(function (n) { return st.own[n] === "you"; }) ? "you" : l.every(function (n) { return st.own[n] === "page"; }) ? "page" : l.some(function (n) { return st.own[n] === "you"; }) && l.some(function (n) { return st.own[n] === "page"; }) ? "dead" : "";
            ul.appendChild(el("li", { "class": cls }, l.map(function (n) { return '<span class="' + (st.own[n] || "") + '">' + n + "</span>"; }).join(" + ") + " = 15"));
          });
          stage.appendChild(ul);
        }
      } else {
        var W = 240, s = svg("svg", { viewBox: "0 0 " + W + " " + W, "class": "ns-board", role: "group", "aria-label": "Magic square board" });
        for (var i = 1; i < 3; i++) { s.appendChild(svg("line", { x1: i * 80, y1: 6, x2: i * 80, y2: W - 6, "class": "ns-grid" })); s.appendChild(svg("line", { x1: 6, y1: i * 80, x2: W - 6, y2: i * 80, "class": "ns-grid" })); }
        function centre(n) { for (var r = 0; r < 3; r++) for (var c = 0; c < 3; c++) if (SQ[r][c] === n) return [c * 80 + 40, r * 80 + 40]; }
        if (st.showSets) LINES.forEach(function (l) { var a = centre(l[0]), b = centre(l[2]); s.appendChild(svg("line", { x1: a[0], y1: a[1], x2: b[0], y2: b[1], "class": "ns-setline" })); });
        SQ.forEach(function (r, ri) {
          r.forEach(function (n, ci) {
            var g = svg("g", { "class": "ns-cell" + (st.own[n] ? " taken" : ""), tabindex: st.own[n] || st.over ? "-1" : "0", role: "button", "aria-label": "Cell for " + n + (st.own[n] ? (st.own[n] === "you" ? ", yours" : ", the page's") : ", free") });
            g.appendChild(svg("rect", { x: ci * 80 + 4, y: ri * 80 + 4, width: 72, height: 72, rx: 6 }));
            var lab = svg("text", { x: ci * 80 + 12, y: ri * 80 + 20, "class": "ns-small" }); lab.textContent = n; g.appendChild(lab);
            var cx = ci * 80 + 40, cy = ri * 80 + 42;
            if (st.own[n] === "you") { g.appendChild(svg("path", { d: "M" + (cx - 16) + " " + (cy - 16) + "L" + (cx + 16) + " " + (cy + 16) + "M" + (cx + 16) + " " + (cy - 16) + "L" + (cx - 16) + " " + (cy + 16), "class": "ns-x" })); }
            if (st.own[n] === "page") { g.appendChild(svg("circle", { cx: cx, cy: cy, r: 17, "class": "ns-o" })); }
            (function (nn) {
              g.addEventListener("click", function () { play(nn); });
              g.addEventListener("keydown", function (e) { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); play(nn); } });
            })(n);
            s.appendChild(g);
          });
        });
        if (wl) { var a2 = centre(wl[0]), b2 = centre(wl[2]); s.appendChild(svg("line", { x1: a2[0], y1: a2[1], x2: b2[0], y2: b2[1], "class": "ns-winline" })); }
        stage.appendChild(s);
        stage.appendChild(el("p", { "class": "f-meta ns-map" }, "Each cell carries its number (small, top left): choosing a number is occupying its cell. You play ×, the page plays ○." + (st.showSets ? " The eight winning sets are the eight lines." : "")));
      }
      var y2 = held("you"), p2 = held("page");
      var pos = "You hold " + (y2.join(", ") || "nothing") + "; the page holds " + (p2.join(", ") || "nothing") + ".";
      status.textContent = (st.over === "you" ? "You win. " : st.over === "page" ? "The page wins. " : st.over === "draw" ? "A draw: with best play on both sides, every game is one. " : "Your move. ") + pos;
    }
    reset();
  };

  /* ---------------------------------------------------------------- Figure 4. Mode walk */
  builders.mode = function (box) {
    var NAMES = ["C", "C♯/D♭", "D", "D♯/E♭", "E", "F", "F♯/G♭", "G", "G♯/A♭", "A", "A♯/B♭", "B"];
    var WHITE = [0, 2, 4, 5, 7, 9, 11];
    var MODES = [["Ionian", 0], ["Dorian", 2], ["Phrygian", 4], ["Lydian", 5], ["Mixolydian", 7], ["Aeolian", 9]];
    var LEVELS = ["root", "fifth", "triad", "diatonic", "chromatic"];
    var st = { mode: 1, view: "circle", walk: [], i: 0, sound: false, own: false };
    function scale(final) { return WHITE.map(function (p) { return (p - final + 12) % 12; }).sort(function (a, b) { return a - b; }); } // intervals above the final
    /* depth in the adapted basic space: 5 = present at every level (the final) ... 1 = chromatic only */
    function depth(iv, sc) {
      if (iv === 0) return 5;
      if (iv === 7) return 4;
      if (iv === sc[2]) return 3;
      if (sc.indexOf(iv) >= 0) return 2;
      return 1;
    }
    function defaultWalk() { var f = MODES[st.mode][1], sc = scale(f); return sc.map(function (iv) { return iv; }).concat([12]); }
    var ac = null;
    function tone(iv) {
      if (!st.sound) return;
      try {
        ac = ac || new (window.AudioContext || window.webkitAudioContext)();
        var f = MODES[st.mode][1], midi = 60 + f + iv, hz = 440 * Math.pow(2, (midi - 69) / 12);
        var o = ac.createOscillator(), g = ac.createGain();
        o.type = "triangle"; o.frequency.value = hz;
        g.gain.setValueAtTime(0.0001, ac.currentTime); g.gain.exponentialRampToValueAtTime(0.18, ac.currentTime + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, ac.currentTime + 0.6);
        o.connect(g); g.connect(ac.destination); o.start(); o.stop(ac.currentTime + 0.65);
      } catch (e) { /* no audio */ }
    }
    box.innerHTML = "";
    var bar = el("div", { "class": "f-bar" });
    var modeSel = el("select", { "aria-label": "Mode" });
    modeSel.innerHTML = MODES.map(function (m, i) { return '<option value="' + i + '">' + m[0] + " on " + NAMES[m[1]] + "</option>"; }).join("");
    modeSel.value = String(st.mode);
    modeSel.addEventListener("change", function () { st.mode = +modeSel.value; st.walk = defaultWalk(); st.i = 0; st.own = false; draw(); });
    bar.appendChild(modeSel);
    var viewSeg = seg([["circle", "Circle"], ["list", "List of note names"]], "circle", function (v) { st.view = v; draw(); }, "Representation");
    bar.appendChild(viewSeg);
    var soundBtn = btn("Sound off", "fbtn", function () { st.sound = !st.sound; soundBtn.textContent = st.sound ? "Sound on" : "Sound off"; soundBtn.setAttribute("aria-pressed", st.sound ? "true" : "false"); });
    soundBtn.setAttribute("aria-pressed", "false");
    bar.appendChild(soundBtn);
    box.appendChild(bar);
    var ctr = el("div", { "class": "f-row" });
    var backB = btn("← Back", "fbtn", function () { if (st.i > 0) { st.i--; tone(st.walk[st.i]); draw(); } });
    var stepB = btn("Step →", "fbtn fbtn-primary", function () { if (st.i < st.walk.length - 1) { st.i++; tone(st.walk[st.i]); draw(); } });
    var playB = btn("Play the walk", "fbtn", function () { playAll(); });
    ctr.appendChild(backB); ctr.appendChild(stepB); ctr.appendChild(playB);
    ctr.appendChild(btn("Make your own walk", "fbtn", function () { st.walk = [0]; st.i = 0; st.own = true; draw(); }));
    ctr.appendChild(btn("Reset", "fbtn fbtn-quiet", function () { stopSound(); st.walk = defaultWalk(); st.i = 0; st.own = false; draw(); }));
    box.appendChild(ctr);
    var stage = el("div", { "class": "mw-stage" });
    var info = el("p", { "class": "mw-info", "aria-live": "polite" });
    box.appendChild(stage); box.appendChild(info);
    var timer = null;
    function playAll() {
      stopSound();
      st.i = 0; tone(st.walk[0]); draw();
      timer = setInterval(function () {
        if (st.i >= st.walk.length - 1) { stopSound(); return; }
        st.i++; tone(st.walk[st.i]); draw();
      }, 650);
      player.stop = function () { clearInterval(timer); timer = null; };
    }
    function draw() {
      var f = MODES[st.mode][1], sc = scale(f);
      stage.innerHTML = "";
      if (st.view === "circle") {
        var W = 320, C = W / 2, RAD = [0, 138, 108, 78, 48, 18]; // by depth 1..5
        var s = svg("svg", { viewBox: "0 0 " + W + " " + W, "class": "mw-circle", role: "group", "aria-label": "The twelve pitches on a circle, each at the radius of its level" });
        [1, 2, 3, 4, 5].forEach(function (d) {
          s.appendChild(svg("circle", { cx: C, cy: C, r: RAD[d], "class": "mw-ring" }));
          var t = svg("text", { x: C + 3, y: C - RAD[d] - 3, "class": "mw-ringlab" }); t.textContent = LEVELS[5 - d]; s.appendChild(t);
        });
        function at(iv) { var d = depth(iv % 12, sc), a = (iv % 12) / 12 * 2 * Math.PI - Math.PI / 2; return [C + RAD[d] * Math.cos(a) * (d === 5 ? 0 : 1), C + RAD[d] * Math.sin(a) * (d === 5 ? 0 : 1)]; }
        var pts = st.walk.slice(0, st.i + 1).map(at);
        if (pts.length > 1) s.appendChild(svg("polyline", { points: pts.map(function (p) { return p.join(","); }).join(" "), "class": "mw-path" }));
        for (var iv = 0; iv < 12; iv++) {
          var p = at(iv), d = depth(iv, sc);
          var g = svg("g", { "class": "mw-pc d" + d + (st.walk[st.i] % 12 === iv ? " on" : ""), tabindex: "0", role: "button", "aria-label": NAMES[(f + iv) % 12] + ", " + LEVELS[5 - d] + " level" });
          g.appendChild(svg("circle", { cx: p[0], cy: p[1], r: d === 5 ? 13 : 10 }));
          var lab = svg("text", { x: p[0], y: p[1] + 3.5, "text-anchor": "middle" }); lab.textContent = NAMES[(f + iv) % 12].split("/")[0]; g.appendChild(lab);
          (function (ivv) {
            var add = function () { if (!st.own) { st.walk = [0]; st.own = true; st.i = 0; } st.walk = st.walk.slice(0, st.i + 1).concat([ivv]); st.i = st.walk.length - 1; tone(ivv); draw(); };
            g.addEventListener("click", add);
            g.addEventListener("keydown", function (e) { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); add(); } });
          })(iv);
          s.appendChild(g);
        }
        stage.appendChild(s);
      } else {
        var ol = el("ol", { "class": "mw-list" });
        st.walk.forEach(function (iv, k) { ol.appendChild(el("li", { "class": k === st.i ? "on" : k < st.i ? "past" : "" }, NAMES[(f + iv) % 12])); });
        stage.appendChild(ol);
      }
      var cur = st.walk[st.i], d0 = depth(cur % 12, sc), name = NAMES[(f + cur) % 12];
      var lv = st.view === "circle" ? " Level: <b>" + LEVELS[5 - d0] + "</b> (present at " + d0 + " of the 5 levels: " + LEVELS.slice(0, d0 === 1 ? 5 : 5).filter(function (l, i) { return i >= 5 - d0; }).join(", ") + ")." : "";
      info.innerHTML = "Step " + (st.i + 1) + " of " + st.walk.length + ": <b>" + name + "</b>." + lv +
        (st.own ? ' <span class="muted">Your own walk: choose pitches on the circle.</span>' : ' <span class="muted">Up the mode from its final to the octave.</span>');
      backB.disabled = st.i === 0; stepB.disabled = st.i >= st.walk.length - 1;
    }
    st.walk = defaultWalk();
    draw();
  };

  /* ---------------------------------------------------------------- Figure 5. Rule explorer */
  builders.rules = function (box) {
    var WIDTH = 101, STEPS = 100;
    var st = { rule: 110, init: "single", seed: newSeed() };
    box.innerHTML = "";
    var bar = el("div", { "class": "f-bar" });
    var ruleIn = el("input", { type: "number", min: "0", max: "255", value: "110", "aria-label": "Rule number", "class": "f-seed" });
    var rl = el("label", { "class": "f-inline" }, "Rule "); rl.appendChild(ruleIn);
    bar.appendChild(rl);
    [0, 1, 30, 110].forEach(function (r) { bar.appendChild(btn("Rule " + r, "chip", function () { st.rule = r; draw(); })); });
    bar.appendChild(btn("Reset", "fbtn fbtn-quiet", function () { st.rule = 110; st.init = "single"; st.seed = newSeed(); initSeg.set("single"); draw(); }));
    box.appendChild(bar);
    ruleIn.addEventListener("change", function () { var v = Math.max(0, Math.min(255, Math.round(+ruleIn.value || 0))); st.rule = v; draw(); });
    var table = el("div", { "class": "ca-table", role: "group", "aria-label": "Rule table: press an output to flip that bit" });
    box.appendChild(table);
    var row2 = el("div", { "class": "f-row" });
    var initSeg = seg([["single", "Single cell"], ["zeros", "All zeros"], ["random", "Random"]], "single", function (v) { st.init = v; draw(); }, "First row");
    row2.appendChild(initSeg);
    var seedIn = el("input", { type: "number", min: "0", value: String(st.seed), "aria-label": "Seed for the random row", "class": "f-seed" });
    var sl = el("label", { "class": "f-inline" }, "seed "); sl.appendChild(seedIn);
    seedIn.addEventListener("change", function () { st.seed = (+seedIn.value) >>> 0; draw(); });
    row2.appendChild(sl);
    box.appendChild(row2);
    var canvas = el("canvas", { "class": "ca-canvas", width: String(WIDTH * 4), height: String((STEPS + 1) * 4), role: "img" });
    box.appendChild(canvas);
    var conv = el("p", { "class": "f-meta ca-conv" });
    box.appendChild(conv);

    function firstRow() {
      var r = new Array(WIDTH).fill(0);
      if (st.init === "single") r[(WIDTH - 1) / 2] = 1;
      if (st.init === "random") { var R = rng(st.seed); for (var i = 0; i < WIDTH; i++) r[i] = R() < 0.5 ? 1 : 0; }
      return r;
    }
    function step(row) {
      var n = row.length, out = new Array(n);
      for (var i = 0; i < n; i++) out[i] = (st.rule >> (4 * row[(i - 1 + n) % n] + 2 * row[i] + row[(i + 1) % n])) & 1;
      return out;
    }
    function colours() {
      var cs = getComputedStyle(box);
      return { on: cs.getPropertyValue("--ink").trim() || "#222", off: cs.getPropertyValue("--sheet").trim() || "#fff" };
    }
    function draw() {
      ruleIn.value = st.rule; seedIn.value = st.seed;
      seedIn.parentNode.hidden = st.init !== "random";
      table.innerHTML = "";
      for (var b = 7; b >= 0; b--) {
        var cell = el("div", { "class": "ca-cell" });
        var nb = el("span", { "class": "ca-nb", "aria-hidden": "true" });
        [4, 2, 1].forEach(function (m) { nb.appendChild(el("i", { "class": (b & m) ? "on" : "" })); });
        var bit = (st.rule >> b) & 1;
        var o = el("button", { type: "button", "class": "ca-out" + (bit ? " on" : ""), "aria-label": "Neighbourhood " + ((b >> 2) & 1) + ((b >> 1) & 1) + (b & 1) + " gives " + bit + "; flip it" });
        (function (bb) { o.addEventListener("click", function () { st.rule ^= (1 << bb); draw(); }); })(b);
        cell.appendChild(nb); cell.appendChild(o);
        cell.appendChild(el("span", { "class": "ca-bits" }, String((b >> 2) & 1) + ((b >> 1) & 1) + (b & 1)));
        table.appendChild(cell);
      }
      var ctx = canvas.getContext("2d"), c = colours(), row = firstRow(), size = 4;
      ctx.fillStyle = c.off; ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = c.on;
      var rows = [row];
      for (var t = 0; t <= STEPS; t++) {
        for (var i = 0; i < WIDTH; i++) if (row[i]) ctx.fillRect(i * size, t * size, size, size);
        row = step(row); rows.push(row);
      }
      var bin = ""; for (var k = 7; k >= 0; k--) bin += (st.rule >> k) & 1;
      var collapse = st.rule === 0 || st.rule === 255;
      canvas.setAttribute("aria-label", "Rule " + st.rule + ", " + (STEPS + 1) + " rows of " + WIDTH + " cells");
      conv.innerHTML = "<b>Rule " + st.rule + "</b> = " + bin + " in binary: the neighbourhood (left, centre, right), read as a three-digit binary number from 7 (111) to 0 (000), picks the bit that gives the cell's next state. " +
        "Updating is synchronous; the row of " + WIDTH + " cells wraps around at its ends (periodic boundary). First row: " +
        (st.init === "single" ? "a single 1 at cell " + ((WIDTH + 1) / 2) + ", the rest 0." : st.init === "zeros" ? "all 0." : "random from seed " + st.seed + " (mulberry32; a cell is 1 when u &lt; 1/2).") +
        " Time runs down the page, " + (STEPS + 1) + " rows." + (collapse ? ' <span class="ca-flag">The table gives one constant output for every neighbourhood: a collapsing operator (<a class="xref" href="#s6-3">section 6.3</a>).</span>' : "");
    }
    draw();

    /* Game of Life */
    var life = el("section", { "class": "gl-life" });
    life.innerHTML = '<h4 class="f-h">The Game of Life</h4><p class="f-meta">A live cell with two or three live neighbours survives, a dead cell with exactly three comes alive, and every other cell is dead at the next step (section 6.1).</p>';
    var lbar = el("div", { "class": "f-row" });
    var PAT = {
      glider: [[1, 0], [2, 1], [0, 2], [1, 2], [2, 2]],
      blinker: [[0, 1], [1, 1], [2, 1]],
      block: [[0, 0], [1, 0], [0, 1], [1, 1]],
      "R-pentomino": [[1, 0], [2, 0], [0, 1], [1, 1], [1, 2]]
    };
    var LW = 48, LH = 32, ls = { pat: "glider", grid: null, gen: 0, timer: null };
    var patSeg = seg(Object.keys(PAT).map(function (k) { return [k, k.charAt(0).toUpperCase() + k.slice(1)]; }), "glider", function (v) { ls.pat = v; lreset(); }, "Starting pattern");
    lbar.appendChild(patSeg);
    var lstep = btn("Step", "fbtn", function () { lpause(); ltick(); });
    var lrun = btn("Run", "fbtn fbtn-primary", function () { if (ls.timer) lpause(); else lplay(); });
    lbar.appendChild(lstep); lbar.appendChild(lrun);
    lbar.appendChild(btn("Reset", "fbtn fbtn-quiet", function () { lreset(); }));
    life.appendChild(lbar);
    var lc = el("canvas", { "class": "gl-canvas", width: String(LW * 8), height: String(LH * 8), role: "img", "aria-label": "Game of Life" });
    life.appendChild(lc);
    var lgen = el("p", { "class": "f-meta", "aria-live": "off" });
    life.appendChild(lgen);
    box.appendChild(life);
    function lreset() {
      lpause();
      ls.grid = []; for (var y = 0; y < LH; y++) ls.grid.push(new Array(LW).fill(0));
      var ox = ls.pat === "glider" ? 2 : Math.floor(LW / 2) - 1, oy = ls.pat === "glider" ? 2 : Math.floor(LH / 2) - 1;
      PAT[ls.pat].forEach(function (p) { ls.grid[oy + p[1]][ox + p[0]] = 1; });
      ls.gen = 0; ldraw();
    }
    function ltick() {
      var g = ls.grid, n = [];
      for (var y = 0; y < LH; y++) {
        n.push(new Array(LW));
        for (var x = 0; x < LW; x++) {
          var c = 0;
          for (var dy = -1; dy <= 1; dy++) for (var dx = -1; dx <= 1; dx++) if (dx || dy) c += g[(y + dy + LH) % LH][(x + dx + LW) % LW];
          n[y][x] = (g[y][x] && (c === 2 || c === 3)) || (!g[y][x] && c === 3) ? 1 : 0;
        }
      }
      ls.grid = n; ls.gen++; ldraw();
    }
    function lplay() { stopSound(); ls.timer = setInterval(ltick, reduce.matches ? 400 : 120); lrun.textContent = "Pause"; player.stop = function () { clearInterval(ls.timer); ls.timer = null; lrun.textContent = "Run"; }; }
    function lpause() { if (ls.timer) stopSound(); }
    function ldraw() {
      var ctx = lc.getContext("2d"), c = colours(), live = 0;
      ctx.fillStyle = c.off; ctx.fillRect(0, 0, lc.width, lc.height);
      ctx.fillStyle = c.on;
      for (var y = 0; y < LH; y++) for (var x = 0; x < LW; x++) if (ls.grid[y][x]) { live++; ctx.fillRect(x * 8 + 1, y * 8 + 1, 6, 6); }
      lgen.textContent = "Generation " + ls.gen + " · " + live + " live cells · " + LW + " × " + LH + " grid that wraps around at its edges.";
    }
    lreset();
    /* redraw both canvases when the theme changes */
    new MutationObserver(function () { draw(); ldraw(); }).observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
  };

  $$("[data-explore]").forEach(function (fig) {
    var kind = fig.getAttribute("data-explore");
    var box = fig.querySelector(".explore-body");
    if (builders[kind]) {
      try { builders[kind](box); } catch (err) { box.innerHTML = "<p>This interactive figure could not be shown.</p>"; if (window.console) console.error(err); }
    }
  });
  panels.forEach(function (p) { p.querySelector(".spine").addEventListener("click", stopSound); });

  /* ------------------------------------------------------------ start */
  var start = location.hash.slice(1);
  if (start === "save-pdf") { openPanel("cover", { instant: true, noScroll: true }); setTimeout(function () { window.print(); }, 400); }
  else if (start && document.getElementById(start)) goTo(start, { instant: true });
  else openPanel("cover", { instant: true, noScroll: true });
  narrow.addEventListener("change", function () { if (current) openPanel(current.id, { keepScroll: true, noScroll: true }); });
})();
