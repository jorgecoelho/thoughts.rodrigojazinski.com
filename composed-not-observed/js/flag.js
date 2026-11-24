/* Composed, Not Observed — web edition 0.0.7
   Plain JavaScript, no dependencies. Works from file:// and any static host.
   Without this script the page reads as one continuous essay.
   The sky computation is in sky.js (a port of the deposited script). */
(function () {
  "use strict";

  var D = JSON.parse(document.getElementById("essay-data").textContent);
  var CITE = document.getElementById("essay-cite").textContent;
  var SKY = window.SKY;
  var panels = Array.prototype.slice.call(document.querySelectorAll(".panel"));
  var ids = panels.map(function (p) { return p.id; });
  var narrow = window.matchMedia("(max-width: 899px)");
  var pop = document.getElementById("popover");
  var bar = document.querySelector(".progress span");
  var current = null;
  var TITLE = "Composed, Not Observed";
  var NS = "http://www.w3.org/2000/svg";
  var store = {
    get: function (k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
    set: function (k, v) { try { localStorage.setItem(k, v); } catch (e) { /* private mode */ } },
    del: function (k) { try { localStorage.removeItem(k); } catch (e) { /* private mode */ } }
  };
  var STARS = D.stars, BYHR = {};
  STARS.forEach(function (s) { BYHR[s.hr] = s; });

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
  function f2(x) { return (x < 0 ? "−" : "") + Math.abs(x).toFixed(2); }
  function f1(x) { return (x < 0 ? "−" : "") + Math.abs(x).toFixed(1); }
  function hm(h) { h = ((h % 24) + 24) % 24; var m = Math.round(h * 60); return String(Math.floor(m / 60) % 24).padStart(2, "0") + ":" + String(m % 60).padStart(2, "0"); }
  function hmS(h) { var m = Math.round(h * 60); return Math.floor(m / 60) + "h " + String(m % 60).padStart(2, "0") + "m"; }
  function n0(x) { return x.toLocaleString("en-GB"); }
  function median(a) { var s = a.slice().sort(function (x, y) { return x - y; }), n = s.length; return n % 2 ? s[(n - 1) / 2] : (s[n / 2 - 1] + s[n / 2]) / 2; }
  function mulberry32(a) { return function () { a |= 0; a = a + 0x6D2B79F5 | 0; var t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }

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
      p.dispatchEvent(new CustomEvent("panelopen"));
    }
    if (narrow.matches && !opts.noScroll) p.scrollIntoView({ block: "start", behavior: opts.instant ? "auto" : "smooth" });
    if (opts.focus) { var h = p.querySelector("h1, h2"); if (h) { h.setAttribute("tabindex", "-1"); h.focus({ preventScroll: true }); } }
    updateProgress();
    hidePop();
  }
  function setHash(h) { if (location.hash !== "#" + h) history.replaceState(null, "", "#" + h); }
  function flash(node) { node.classList.remove("flash"); void node.offsetWidth; node.classList.add("flash"); setTimeout(function () { node.classList.remove("flash"); }, 2400); }
  function goToNode(node, opts) {
    opts = opts || {};
    var panel = node.classList.contains("panel") ? node : node.closest(".panel");
    if (!panel) return;
    openPanel(panel.id, { focus: opts.focus, instant: opts.instant, noScroll: node !== panel });
    if (node.id) setHash(node.id);
    if (node !== panel) {
      requestAnimationFrame(function () {
        setTimeout(function () {
          var sc = scroller(panel);
          if (narrow.matches) node.scrollIntoView({ block: "center", behavior: "smooth" });
          else sc.scrollTo({ top: node.getBoundingClientRect().top - sc.getBoundingClientRect().top + sc.scrollTop - 90, behavior: opts.instant ? "auto" : "smooth" });
          if (!opts.noFlash) flash(node);
        }, narrow.matches ? 60 : 380);
      });
    }
  }
  function goTo(target, opts) { var n = target && document.getElementById(target); if (n) goToNode(n, opts); }

  panels.forEach(function (p) {
    p.querySelector(".spine").addEventListener("click", function () {
      if (narrow.matches && current === p) {
        p.classList.remove("open"); p.querySelector(".spine").setAttribute("aria-expanded", "false"); current = null; return;
      }
      openPanel(p.id); setHash(p.id);
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

  /* ------------------------------------------------------------ links and keyboard */
  document.addEventListener("click", function (e) {
    var a = e.target.closest("a");
    if (!a || e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
    if (a.classList.contains("demo")) { e.preventDefault(); return; }
    if (a.classList.contains("cite")) { e.preventDefault(); showCite(a); return; }
    if (a.classList.contains("claim")) { e.preventDefault(); showClaim(a, a.getAttribute("data-claim")); return; }
    var href = a.getAttribute("href") || "";
    if (href.charAt(0) === "#" && href.length > 1) { e.preventDefault(); goTo(href.slice(1), { focus: a.closest(".panel-nav") != null }); }
  });
  window.addEventListener("hashchange", function () { goTo(location.hash.slice(1)); });
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape") { hidePop(true); return; }
    var t = e.target;
    if (e.altKey || e.ctrlKey || e.metaKey || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName) || t.isContentEditable) return;
    if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
    if (t.closest && t.closest(".explore, .seg, .tools")) return;
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
    var r = anchor.getBoundingClientRect(), pw = pop.offsetWidth, ph = pop.offsetHeight;
    var left = Math.min(Math.max(8, r.left + r.width / 2 - pw / 2), window.innerWidth - pw - 8);
    var top = r.bottom + 8;
    if (top + ph > window.innerHeight - 8) top = Math.max(8, r.top - ph - 8);
    pop.style.left = left + "px"; pop.style.top = top + "px";
    pop.querySelector(".close").addEventListener("click", function () { hidePop(true); });
  }
  function hidePop(refocus) {
    if (pop.hidden) return;
    pop.hidden = true;
    if (popAnchor) { popAnchor.removeAttribute("aria-expanded"); if (refocus === true && popAnchor.focus) popAnchor.focus({ preventScroll: true }); }
    popAnchor = null;
  }
  document.addEventListener("click", function (e) {
    if (!pop.hidden && !pop.contains(e.target) && e.target !== popAnchor && !(popAnchor && popAnchor.contains && popAnchor.contains(e.target))) hidePop();
  });
  window.addEventListener("resize", function () { hidePop(); });
  pop.addEventListener("click", function (e) {
    var a = e.target.closest("a");
    if (a && !a.classList.contains("cite") && !a.classList.contains("claim") && (a.getAttribute("href") || "").charAt(0) === "#") hidePop();
  });

  function showCite(a) {
    var key = a.getAttribute("data-ref"), r = D.refs[key];
    if (!r) return;
    var search = r.kind === "search";
    showPop(a, '<div class="pop-kind">Reference</div><div class="pop-entry">' + r.entry + "</div>" +
      '<div class="pop-actions"><a class="primary" href="' + escHtml(r.url) + '" target="_blank" rel="noopener">' + (search ? "Search a library catalogue" : "Open the source") + ' ↗</a>' +
      '<a href="#ref-' + key + '">In the references</a></div><div class="pop-note">How it was checked: ' + escHtml(r.note) + "</div>");
  }
  var KIND_CLASS = { "Established": "est", "Checkable": "chk", "Proposal": "pro", "Proposal (applied)": "app", "Hypothesis": "hyp" };
  function kindTag(k) { return '<span class="kind kind-' + (KIND_CLASS[k] || "x") + '">' + escHtml(k) + "</span>"; }
  function showClaim(a, id) {
    var c = D.claims[id];
    if (!c) return;
    showPop(a, '<div class="pop-kind">Claim ' + id + " · " + escHtml(c.where) + "</div>" + '<p class="pop-meta">' + kindTag(c.kind) + "</p>" +
      '<div class="pop-entry">' + escHtml(c.claim) + "</div>" + '<p class="pop-small"><strong>How it can be checked.</strong> ' + escHtml(c.how) + "</p>" +
      '<div class="pop-actions"><a class="primary" href="#claim-' + id + '">See it in Appendix B →</a></div>');
  }
  function showGloss(span) {
    var term = span.getAttribute("data-gl"), def = D.glossary[term];
    if (!def) return;
    var slug = term.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
    showPop(span, '<div class="pop-kind">Glossary</div><dfn>' + escHtml(term) + "</dfn><div>" + def + '</div><div class="pop-actions"><a href="#gl-' + slug + '">All terms</a></div>');
  }
  function showStar(anchor, hr) {
    var s = BYHR[hr];
    if (!s) return;
    showPop(anchor, '<div class="pop-kind">Star · ' + escHtml(s.conName) + "</div>" +
      '<div class="star-card"><div class="star-mini">' + miniDisc(hr) + "</div><div>" +
      "<dfn>" + escHtml(s.label) + "</dfn>" +
      '<dl class="mini-dl"><dt>Stands for</dt><dd>' + escHtml(s.state) + "</dd><dt>On the disc since</dt><dd>" + escHtml(s.since) + (s.hr === 3748 ? "†" : "") + "</dd>" +
      "<dt>Size class</dt><dd>" + s.cls + "</dd><dt>Magnitude (V)</dt><dd>" + f2(s.vmag) + "</dd>" +
      "<dt>At 08:30</dt><dd>" + s.alt.toFixed(1) + "° up, azimuth " + Math.round(s.az) + "°</dd>" +
      "<dt>From its computed place</dt><dd>" + s.resM.toFixed(2) + " M, " + s.resDeg.toFixed(1) + "° of sky</dd></dl></div></div>" +
      (s.amb ? '<p class="pop-note">Which drawn star is ' + escHtml(s.name) + " rests on the annex's leader lines (section 2.3).</p>" : "") +
      '<p class="pop-note">White: where it is drawn. Ring: where the 27-star fit puts its computed place.</p>' +
      '<div class="pop-actions"><a class="primary" href="#star-' + hr + '">Its row in Appendix A →</a><a href="#fig2" data-focus-star="' + hr + '">In Figure 2</a></div>');
  }
  document.addEventListener("click", function (e) {
    var f = e.target.closest("[data-focus-star]");
    if (f) { var fig = document.getElementById("fig2"); if (fig && fig._focus) setTimeout(function () { fig._focus(+f.getAttribute("data-focus-star")); }, 450); }
  }, true);
  var hoverTimer = null;
  function hoverable(sel, show) {
    $$(sel).forEach(function (s) {
      if (s.classList.contains("demo")) return;
      s.setAttribute("role", "button");
      s.addEventListener("click", function (e) { e.stopPropagation(); show(s); });
      s.addEventListener("keydown", function (e) { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); show(s); } });
      s.addEventListener("mouseenter", function () { if (!narrow.matches) hoverTimer = setTimeout(function () { if (popAnchor !== s) show(s); }, 380); });
      s.addEventListener("mouseleave", function () { clearTimeout(hoverTimer); });
    });
  }
  hoverable(".gl", showGloss);
  hoverable(".star-ref", function (s) { showStar(s, +s.getAttribute("data-hr")); });

  /* ------------------------------------------------------------ settings, citation */
  $("[data-theme-toggle]").addEventListener("click", function () {
    var root = document.documentElement;
    var dark = root.dataset.theme ? root.dataset.theme === "dark" : window.matchMedia("(prefers-color-scheme: dark)").matches;
    root.dataset.theme = dark ? "light" : "dark";
    store.set("cno-theme", root.dataset.theme);
  });
  $("[data-size-toggle]").addEventListener("click", function () {
    var root = document.documentElement, next = { "": "l", l: "xl", xl: "" }[root.dataset.size || ""];
    if (next) root.dataset.size = next; else delete root.dataset.size;
    store.set("cno-size", next);
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
  var BM_KEY = "bookmark:composed-not-observed";
  var bmNodes = $$(".panel:not(#cover) .prose p, .panel:not(#cover) .prose li").filter(function (n) {
    return !n.closest("figure, table, nav, .explore, .tools, .cite-box") && !(n.tagName === "LI" && n.querySelector("p"));
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
      var old = marked.closest(".panel"); old.classList.remove("bm-panel");
      var sr = old.querySelector(".bm-sr"); if (sr) sr.remove();
    }
    marked = node;
    var resume = $(".resume");
    if (!node) { if (save) store.del(BM_KEY); if (resume) resume.hidden = true; bmLabel(); return; }
    var p = node.closest(".panel"), list = inPanel(p);
    node.classList.add("bm-on");
    if (!node.id) node.id = "bookmark";
    p.classList.add("bm-panel");
    p.querySelector(".spine").appendChild(el("span", { "class": "bm-sr" }, " (bookmarked)"));
    var label = p.querySelector(".spine-label").textContent + ", paragraph " + (list.indexOf(node) + 1);
    if (save) store.set(BM_KEY, JSON.stringify({ panel: p.id, n: list.indexOf(node), snip: snip(node), anchor: node.id, label: label }));
    if (resume) { resume.hidden = false; resume.querySelector("a").setAttribute("href", "#" + node.id); resume.querySelector("span").textContent = label; }
    bmLabel();
  }
  function bmLabel() {
    var on = bmHost && bmHost === marked;
    ribbon.setAttribute("aria-label", on ? "Remove bookmark" : "Bookmark this paragraph");
    ribbon.setAttribute("aria-pressed", on ? "true" : "false");
  }
  function bmShow(node) { if (bmHost === node) return; bmHost = node; node.appendChild(ribbon); bmLabel(); }
  function bmToggle(node) { bmSet(node === marked ? null : node, true); if (bmHost !== node) bmShow(node); bmLabel(); }
  bmNodes.forEach(function (n) { n.classList.add("bm-able"); });
  document.addEventListener("mouseover", function (e) { var n = e.target.closest && e.target.closest(".bm-able"); if (n) bmShow(n); });
  document.addEventListener("click", function (e) {
    if (e.target.closest(".bm")) { e.preventDefault(); bmToggle(bmHost); return; }
    var n = e.target.closest(".bm-able");
    if (!n || e.target.closest("a, button, input, select, textarea, .gl, .star-ref")) return;
    var sel = window.getSelection && window.getSelection();
    if (sel && !sel.isCollapsed) return;
    bmShow(n);
  });
  document.addEventListener("keydown", function (e) {
    var t = e.target;
    if (e.key !== "b" && e.key !== "B") return;
    if (e.altKey || e.ctrlKey || e.metaKey || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName) || t.isContentEditable) return;
    if (!current || current.id === "cover") return;
    var node = bmHost && bmHost.closest(".panel") === current ? bmHost : null;
    if (!node) node = inPanel(current).filter(function (n) { var r = n.getBoundingClientRect(); return r.bottom > 80 && r.top < window.innerHeight; })[0];
    if (!node) return;
    e.preventDefault(); bmToggle(node); ribbon.focus({ preventScroll: true });
  });
  (function () {
    var saved;
    try { saved = JSON.parse(store.get(BM_KEY) || "null"); } catch (err) { saved = null; }
    if (!saved) return;
    var p = document.getElementById(saved.panel), list = p && p.classList.contains("panel") ? inPanel(p) : [];
    var node = list[saved.n] && snip(list[saved.n]) === saved.snip ? list[saved.n] : list.filter(function (n) { return snip(n) === saved.snip; })[0];
    if (node) bmSet(node, !!(saved.anchor !== (node.id || "bookmark"))); else store.del(BM_KEY);
  })();

  /* ------------------------------------------------------------ drawing helpers: the disc as a diagram */
  var R_CLASS = { 1: 0.15, 2: 0.125, 3: 0.10, 4: 0.0714, 5: 0.05 };  /* circumradius in modules, from the construction file */
  function starPts(cx, cy, r) {
    var p = [];
    for (var k = 0; k < 10; k++) {
      var a = -Math.PI / 2 + k * Math.PI / 5, rr = k % 2 ? r * 0.382 : r;
      p.push((cx + rr * Math.cos(a)).toFixed(1) + "," + (cy + rr * Math.sin(a)).toFixed(1));
    }
    return p.join(" ");
  }
  /* a frame mapping modules to pixels: x right, y up, origin at the disc centre */
  function frame(W, H, scale, ox, oy) {
    ox = ox || 0; oy = oy || 0;
    return { W: W, H: H, s: scale, x: function (X) { return W / 2 + (X - ox) * scale; }, y: function (Y) { return H / 2 - (Y - oy) * scale; } };
  }
  function bandPath(F, uid) {
    /* the band between arcs of radii 8 and 8.5 M about (−2, −7), clipped to the disc */
    return '<clipPath id="clip-' + uid + '"><circle cx="' + F.x(0) + '" cy="' + F.y(0) + '" r="' + (3.5 * F.s) + '"/></clipPath>' +
      '<g clip-path="url(#clip-' + uid + ')"><circle class="band" cx="' + F.x(-2) + '" cy="' + F.y(-7) + '" r="' + (8.25 * F.s) + '" stroke-width="' + (0.5 * F.s) + '"/></g>';
  }
  function discBase(F, uid, opts) {
    opts = opts || {};
    return '<circle class="disc" cx="' + F.x(0) + '" cy="' + F.y(0) + '" r="' + (3.5 * F.s) + '"/>' + (opts.noBand ? "" : bandPath(F, uid));
  }
  function drawnStar(F, s, extra, k) {
    return '<polygon class="dstar' + (extra || "") + '" data-hr="' + s.hr + '" points="' + starPts(F.x(s.fx), F.y(s.fy), Math.max(2.6, R_CLASS[s.cls] * F.s * (k || 1.25))) + '"/>';
  }
  var uidN = 0;
  function miniDisc(hr) {
    var F = frame(120, 120, 15.5), u = "m" + (++uidN), s = BYHR[hr], h = '<svg viewBox="0 0 120 120" class="sky-svg" aria-hidden="true">' + discBase(F, u);
    STARS.forEach(function (t) { if (t.hr !== hr) h += drawnStar(F, t, " faint", 1); });
    h += '<line class="resline on" x1="' + F.x(s.fx) + '" y1="' + F.y(s.fy) + '" x2="' + F.x(s.mx) + '" y2="' + F.y(s.my) + '"/>';
    h += '<circle class="model on" cx="' + F.x(s.mx) + '" cy="' + F.y(s.my) + '" r="3.2"/>' + drawnStar(F, s, " hot", 1.8);
    return h + "</svg>";
  }

  /* ------------------------------------------------------------ sound: one recording at a time */
  var player = { audio: null, stop: null, owner: null };
  function stopSound() {
    if (player.audio) { player.audio.pause(); player.audio = null; }
    if (player.stop) { var f = player.stop; player.stop = null; f(); }
  }

  /* ------------------------------------------------------------ explorables */
  var builders = {};
  var skyApi = null;  /* the sky figure, so that other figures can set its moment */

  /* ---- cover: the 27 stars */
  builders.hero = function (box) {
    var F = frame(440, 440, 58), u = "hero", h = '<svg viewBox="0 0 440 440" class="sky-svg hero-svg" role="img" aria-label="The disc of the flag as a diagram: 27 stars and the band">';
    h += '<defs><radialGradient id="hero-g" cx="50%" cy="45%" r="60%"><stop offset="0" stop-color="#1b3a7a"/><stop offset="1" stop-color="#0b1838"/></radialGradient></defs>';
    h += '<circle cx="220" cy="220" r="' + (3.5 * F.s) + '" fill="url(#hero-g)"/>' + bandPath(F, u);
    STARS.forEach(function (s) { h += '<g class="hs" tabindex="0" data-hr="' + s.hr + '" role="button" aria-label="' + escHtml(s.label + ", " + s.state) + '"><circle cx="' + F.x(s.fx) + '" cy="' + F.y(s.fy) + '" r="13" class="hit"/>' + drawnStar(F, s, "", 1.35) + "</g>"; });
    box.innerHTML = h + "</svg>";
    var cap = box.closest("figure").querySelector(".hero-cap"), base = cap.innerHTML;
    function show(g) {
      $$(".hs", box).forEach(function (x) { x.classList.toggle("on", x === g); });
      if (!g) { cap.innerHTML = base; return; }
      var s = BYHR[+g.getAttribute("data-hr")];
      cap.innerHTML = "<b>" + escHtml(s.label) + "</b> · " + escHtml(s.conName) + " · <b>" + escHtml(s.state) + "</b> · on the disc since " + s.since + (s.hr === 3748 ? "†" : "");
    }
    box.addEventListener("mouseover", function (e) { var g = e.target.closest(".hs"); if (g) show(g); });
    box.addEventListener("focusin", function (e) { var g = e.target.closest(".hs"); if (g) show(g); });
    box.addEventListener("mouseleave", function () { show(null); });
    box.addEventListener("click", function (e) { var g = e.target.closest(".hs"); if (g) { e.stopPropagation(); showStar(g, +g.getAttribute("data-hr")); } });
  };

  /* ---- section 1: the Flag Anthem */
  builders.anthem = function (box) {
    var L = D.lyrics.stanzas;
    box.innerHTML = '<div class="anthem"><div class="an-player"><button type="button" class="try-play" aria-label="Play the Flag Anthem"><svg viewBox="0 0 16 16" aria-hidden="true"><path class="i-play" d="M4 2.5v11l9-5.5z"/><path class="i-stop" d="M4 3h3v10H4zM9 3h3v10H9z"/></svg><span>Play</span></button>' +
      '<div class="an-track"><input type="range" min="0" max="' + D.anthem.duration + '" step="0.1" value="0" aria-label="Position in the recording"><span class="an-time">0:00 / ' + mmss(D.anthem.duration) + "</span></div></div>" +
      '<p class="an-meta"><b>Hino à Bandeira Nacional</b> · words Olavo Bilac, music Francisco Braga · first performed 9 November 1906 · Brazilian Army band</p>' +
      '<div class="an-words">' + L.map(function (st, i) {
        var q = i === 2;
        return '<div class="an-st' + (q ? " quoted" : "") + (i % 2 ? " chorus" : "") + '">' + (q ? '<span class="an-tag">Quoted in section 1</span>' : "") + st.map(escHtml).join("<br>") +
          (q ? '<p class="an-en">' + escHtml(D.stanzaEn) + "</p>" : "") + "</div>";
      }).join("") + '</div><p class="an-foot">Odd stanzas are the verses; the refrain, “Recebe o afeto que se encerra…”, follows each. ' + escHtml(D.quotes.anthem_true.charAt(0).toUpperCase() + D.quotes.anthem_true.slice(1)) + " (" + xref("s4-5", "section 4.5") + ")</p></div>";
    var btn = $(".try-play", box), range = $("input", box), time = $(".an-time", box), raf = null;
    function mmssLocal(t) { return mmss(t) + " / " + mmss(D.anthem.duration); }
    function tick() { if (player.owner !== box || !player.audio) return; range.value = player.audio.currentTime; time.textContent = mmssLocal(player.audio.currentTime); raf = requestAnimationFrame(tick); }
    function setPlaying(on) { box.classList.toggle("playing", on); $("span", btn).textContent = on ? "Pause" : "Play"; }
    btn.addEventListener("click", function () {
      if (player.owner === box && player.audio) { stopSound(); return; }
      stopSound();
      var a = new Audio(D.anthem.file);
      a.currentTime = +range.value || 0;
      player.audio = a; player.owner = box;
      player.stop = function () { setPlaying(false); cancelAnimationFrame(raf); };
      a.addEventListener("ended", function () { if (player.audio === a) { stopSound(); range.value = 0; time.textContent = mmssLocal(0); } });
      a.addEventListener("error", function () { if (player.audio === a) stopSound(); time.textContent = "Recording unavailable"; });
      setPlaying(true);
      a.play().then(function () { raf = requestAnimationFrame(tick); }, function () { stopSound(); });
    });
    range.addEventListener("input", function () { if (player.owner === box && player.audio) player.audio.currentTime = +range.value; time.textContent = mmssLocal(+range.value); });
  };
  function mmss(t) { t = Math.max(0, Math.round(t)); return Math.floor(t / 60) + ":" + String(t % 60).padStart(2, "0"); }

  /* ---- shared: projected sky for a moment */
  var TABLE2 = STARS.filter(function (s) { return !s.amb; });
  function projected(list, kind) { return list.map(function (s) { return SKY.project(s.alt, s.az, kind); }); }
  function drawnPts(list) { return list.map(function (s) { return [s.fx, s.fy]; }); }

  /* ---- section 2.2: fit it yourself */
  builders.fit = function (box) {
    var kind = "stereographic", mirror = false, rot = 0, sc = 3, F = frame(420, 420, 50);
    box.innerHTML = '<div class="fit"><div class="fit-plot"></div><div class="fit-side">' +
      '<div class="seg" data-g="kind"><button type="button" data-v="orthographic">Orthographic</button><button type="button" data-v="stereographic">Stereographic</button><button type="button" data-v="equidistant">Equidistant</button></div>' +
      '<div class="seg" data-g="mirror"><button type="button" data-v="0">From the ground</button><button type="button" data-v="1">From outside (mirrored)</button></div>' +
      '<label class="sl"><span>Turn <output data-o="r"></output></span><input type="range" min="-180" max="180" step="1" data-k="r"></label>' +
      '<label class="sl"><span>Scale <output data-o="s"></output></span><input type="range" min="0.8" max="6" step="0.01" data-k="s"></label>' +
      '<div class="fit-out"><span>Rms distance, 24 stars</span><b data-o="rms"></b><span class="fit-vs"></span></div>' +
      '<div class="fit-btns"><button type="button" class="btn btn-primary" data-act="fit">Find the best fit</button><button type="button" class="btn" data-act="reset">Start again</button></div>' +
      '<p class="fit-note"></p><p class="legend"><span class="lg lg-drawn"></span>drawn star <span class="lg lg-model"></span>computed place, as you have turned and scaled it</p></div></div>';
    var plot = $(".fit-plot", box);
    function current() {
      var src = projected(TABLE2, kind).map(function (p) { return mirror ? [-p[0], p[1]] : p; }), dst = drawnPts(TABLE2), n = src.length;
      var cs = [0, 0], cd = [0, 0];
      src.forEach(function (p, i) { cs[0] += p[0] / n; cs[1] += p[1] / n; cd[0] += dst[i][0] / n; cd[1] += dst[i][1] / n; });
      var co = Math.cos(rot * Math.PI / 180), si = Math.sin(rot * Math.PI / 180);
      var fitted = src.map(function (p) { var x = p[0] - cs[0], y = p[1] - cs[1]; return [cd[0] + sc * (x * co - y * si), cd[1] + sc * (x * si + y * co)]; });
      var ss = 0; fitted.forEach(function (p, i) { ss += Math.pow(p[0] - dst[i][0], 2) + Math.pow(p[1] - dst[i][1], 2); });
      return { fitted: fitted, rms: Math.sqrt(ss / n) };
    }
    function draw() {
      var c = current(), h = '<svg viewBox="0 0 420 420" class="sky-svg" role="img" aria-label="Drawn stars and the computed sky as turned and scaled">' + discBase(F, "fit");
      TABLE2.forEach(function (s, i) { h += '<line class="resline" x1="' + F.x(s.fx) + '" y1="' + F.y(s.fy) + '" x2="' + F.x(c.fitted[i][0]) + '" y2="' + F.y(c.fitted[i][1]) + '"/>'; });
      TABLE2.forEach(function (s) { h += drawnStar(F, s); });
      c.fitted.forEach(function (p) { h += '<circle class="model" cx="' + F.x(p[0]) + '" cy="' + F.y(p[1]) + '" r="4"/>'; });
      plot.innerHTML = h + "</svg>";
      $("[data-o=r]", box).textContent = Math.round(rot) + "°";
      $("[data-o=s]", box).textContent = sc.toFixed(2) + " M per horizon radius";
      $("[data-o=rms]", box).textContent = c.rms.toFixed(3) + " M";
      $("[data-k=r]", box).value = rot; $("[data-k=s]", box).value = sc;
      $$(".seg button", box).forEach(function (b) {
        var g = b.parentNode.getAttribute("data-g");
        b.setAttribute("aria-pressed", (g === "kind" ? b.getAttribute("data-v") === kind : (b.getAttribute("data-v") === "1") === mirror) ? "true" : "false");
      });
      var best = D.fits.filter(function (f) { return f.kind === kind && f.mirror === mirror; })[0];
      $(".fit-vs", box).textContent = "Best possible here (Table 2): " + best.rms.toFixed(3) + " M";
    }
    box.addEventListener("input", function (e) { var k = e.target.getAttribute("data-k"); if (k === "r") rot = +e.target.value; if (k === "s") sc = +e.target.value; $(".fit-note", box).textContent = ""; draw(); });
    box.addEventListener("click", function (e) {
      var b = e.target.closest("button");
      if (!b) return;
      var g = b.parentNode.getAttribute("data-g");
      if (g === "kind") kind = b.getAttribute("data-v");
      if (g === "mirror") mirror = b.getAttribute("data-v") === "1";
      if (b.getAttribute("data-act") === "fit") {
        var f = SKY.procrustes(projected(TABLE2, kind), drawnPts(TABLE2), mirror);
        rot = f.rot; sc = f.scale;
        $(".fit-note", box).innerHTML = "The least-squares fit: turned " + Math.round(f.rot) + "°, " + f.scale.toFixed(2) + " M per horizon radius, rms " + f.rms.toFixed(3) + " M. " +
          (mirror ? "With the mirror, south stays at the bottom and the turn is small." : "Without the mirror, the best the fit can do is a half-turn, which puts south at the top (" + xref("s5-1", "section 5.1") + ").");
      }
      if (b.getAttribute("data-act") === "reset") { rot = 0; sc = 3; $(".fit-note", box).textContent = ""; }
      draw();
    });
    draw();
  };

  /* ---- section 2.3: the construction */
  builders.module = function (box) {
    var s = 26, W = 20 * s + 60, H = 14 * s + 60, ox = 30, oy = 30, grid = true;
    function X(m) { return ox + m * s; } function Y(m) { return oy + (14 - m) * s; }
    function draw() {
      var h = '<svg viewBox="0 0 ' + W + " " + H + '" class="mod-svg" role="img" aria-label="Construction diagram: a 20 by 14 module rectangle, the disc of radius 3.5 modules at its centre, and the band">';
      h += '<rect class="mod-rect" x="' + X(0) + '" y="' + Y(14) + '" width="' + 20 * s + '" height="' + 14 * s + '"/>';
      if (grid) for (var i = 1; i < 20; i++) h += '<line class="mod-grid" x1="' + X(i) + '" x2="' + X(i) + '" y1="' + Y(0) + '" y2="' + Y(14) + '"/>';
      if (grid) for (var j = 1; j < 14; j++) h += '<line class="mod-grid" y1="' + Y(j) + '" y2="' + Y(j) + '" x1="' + X(0) + '" x2="' + X(20) + '"/>';
      for (i = 0; i <= 20; i += 2) h += '<text class="mod-lab" x="' + X(i) + '" y="' + (Y(14) - 8) + '" text-anchor="middle">' + i + "</text>";
      for (j = 0; j <= 14; j += 2) h += '<text class="mod-lab" x="' + (X(0) - 8) + '" y="' + (Y(j) + 4) + '" text-anchor="end">' + j + "</text>";
      var F = { s: s, x: function (m) { return X(10 + m); }, y: function (m) { return Y(7 + m); } };
      h += '<line class="mod-dim" x1="' + X(10) + '" y1="' + Y(7) + '" x2="' + X(8) + '" y2="' + Y(0) + '"/>';
      h += '<circle class="mod-pt" cx="' + X(8) + '" cy="' + Y(0) + '" r="4"/><circle class="mod-pt" cx="' + X(10) + '" cy="' + Y(0) + '" r="3"/>';
      h += '<path class="mod-arc" d="M ' + X(0.5) + " " + Y(0) + " A " + 8.25 * s + " " + 8.25 * s + " 0 0 1 " + X(16.25) + " " + Y(0) + '"/>';
      h += discBase(F, "mod");
      STARS.forEach(function (t) { h += drawnStar(F, t, "", 1); });
      h += '<text class="mod-note" x="' + (X(8) - 6) + '" y="' + (Y(0) - 8) + '" text-anchor="end">centre of the band\'s arcs, 2 M left of the foot</text>';
      h += '<text class="mod-note" x="' + (X(13.7) + 4) + '" y="' + (Y(7) + 4) + '">disc radius 3.5 M</text><line class="mod-dim" x1="' + X(10) + '" y1="' + Y(7) + '" x2="' + X(13.5) + '" y2="' + Y(7) + '"/>';
      box.querySelector(".mod-plot").innerHTML = h + "</svg>";
    }
    box.innerHTML = '<div class="mod-plot"></div><p class="mod-ctl"><label><input type="checkbox" checked> Show the module grid</label> · 1 M is one fourteenth of the flag\'s height; the flag is 20 M long. The band is 0.5 M wide, between arcs of radii 8 M and 8.5 M (' + xref("s5-4", "section 5.4") + ").</p>";
    $("input", box).addEventListener("change", function (e) { grid = e.target.checked; draw(); });
    draw();
  };

  /* ---- section 3.5: one claim, eight texts */
  builders.statements = function (box) {
    var T = D.t1, Ev = D.events, sel = 0;
    var track = { 1: "c", 2: "e", 4: "c", 6: "c", 7: "e", 8: "b" };  /* the words section 3.5 names for each standard */
    var Q = { 1: D.quotes.decree, 2: D.quotes.idealised, 3: D.quotes.reverse, 4: D.quotes.portrays, 5: D.quotes.law1942, 6: D.quotes.law1968, 7: D.quotes.law1971, 8: D.quotes.law1992 };
    function flagFor(y) { return y >= 1992 ? "flag-1992" : y >= 1968 ? "flag-1968" : y >= 1960 ? "flag-1960" : "flag-1889"; }
    function starsFor(y) { return y >= 1992 ? 27 : y >= 1968 ? 23 : y >= 1960 ? 22 : 21; }
    var y0 = 1885, y1 = 1996;
    function px(y) { return ((y - y0) / (y1 - y0) * 100).toFixed(2) + "%"; }
    box.innerHTML = '<div class="stm"><div class="stm-axis">' +
      [1889, 1903, 1906, 1942, 1960, 1968, 1971, 1992].map(function (y) { return '<span class="stm-year' + (y === 1906 || y === 1971 ? " alt" : "") + '" style="left:' + px(y) + '">' + y + "</span>"; }).join("") + "</div>" +
      '<div class="stm-track"><span class="stm-tlab">Correspondence</span>' + Ev.map(function (e, i) { return e.row && (track[e.row] === "c" || track[e.row] === "b") ? '<button type="button" class="stm-dot c" data-i="' + i + '" style="left:' + px(e.y + (e.row === 2 ? 1.6 : 0)) + '" aria-label="' + escHtml(e.label) + '"></button>' : ""; }).join("") + "</div>" +
      '<div class="stm-track"><span class="stm-tlab">Evocation</span>' + Ev.map(function (e, i) { return e.row && (track[e.row] === "e" || track[e.row] === "b") ? '<button type="button" class="stm-dot e" data-i="' + i + '" style="left:' + px(e.y + (e.row === 2 ? 1.6 : 0)) + '" aria-label="' + escHtml(e.label) + '"></button>' : ""; }).join("") + "</div>" +
      '<div class="stm-track stars"><span class="stm-tlab">Stars</span>' + [[1889, 21], [1960, 22], [1968, 23], [1992, 27]].map(function (p) { return '<span class="stm-n" style="left:' + px(p[0]) + '">' + p[1] + "</span>"; }).join("") + "</div>" +
      '<div class="stm-chips">' + Ev.map(function (e, i) { return '<button type="button" class="chip" data-i="' + i + '">' + e.y + " · " + escHtml(e.label) + "</button>"; }).join("") + "</div>" +
      '<div class="stm-card" aria-live="polite"></div></div>';
    function render() {
      var e = Ev[sel], card = $(".stm-card", box), h;
      $$("[data-i]", box).forEach(function (b) { b.setAttribute("aria-pressed", +b.getAttribute("data-i") === sel ? "true" : "false"); });
      var fl = D.media[flagFor(e.y)];
      h = '<div class="stm-flag"><img src="' + fl + '" alt="The flag as it stood in ' + e.y + ", with " + starsFor(e.y) + ' stars"><span>' + starsFor(e.y) + " stars in " + e.y + "</span></div><div>";
      if (e.row) {
        var r = T[e.row], H = T[0];
        h += "<h4>" + escHtml(r[0]) + "</h4><blockquote>" + escHtml(Q[e.row]) + '</blockquote><dl class="stm-dl">';
        for (var k = 1; k < H.length; k++) h += "<dt>" + escHtml(H[k]) + "</dt><dd>" + escHtml(r[k]) + "</dd>";
        h += "</dl>";
        var tr = track[e.row];
        h += '<p class="muted">' + (tr === "c" ? "A standard of correspondence." : tr === "e" ? "A standard of evocation." : tr === "b" ? "Both at once: the stars correspond to the sky, and new stars must not disturb the aesthetic arrangement." : "Not placed on either track: " + (e.row === 3 ? "the critic holds the disc to the sky and finds it fails." : "the decree-law fixes the drawing and states no sky.")) + "</p>";
      } else {
        h += "<h4>" + escHtml(e.label) + "</h4><p>" + escHtml(D.quotes.guanabara.replace(/^"|"$/g, "")) + "</p><p class=\"muted\">The explanatory statement of the 1967 bill set the 1960 star aside for this reason (" + xref("s7-3", "section 7.3") + "); the bill's table gives Guanabara Alphard.</p>";
      }
      card.innerHTML = h + "</div>";
    }
    box.addEventListener("click", function (e) { var b = e.target.closest("[data-i]"); if (b) { sel = +b.getAttribute("data-i"); render(); } });
    render();
  };

  /* ---- section 4: the sky over Rio */
  builders.sky = function (box) {
    var st = { y: 1889, m: 11, d: 15, t: 8.5, mirror: false, labels: true, show: false }, W = 520, R = 240, playing = null;
    var CRUX = [4763, 4730, 4853, 4656, 4700];
    box.innerHTML = '<div class="sky"><div class="sky-plot"></div><div class="sky-side">' +
      '<div class="sky-date"></div><div class="sky-clock"><b data-o="t"></b><span data-o="lst"></span></div>' +
      '<label class="sl"><span>Local mean time at Rio</span><input type="range" min="0" max="24" step="0.0166667" data-k="t" aria-label="Local mean time"></label>' +
      '<div class="sky-btns"><button type="button" class="chip" data-p="8.5">08:30 · the law\'s minute</button><button type="button" class="chip" data-p="8.9667">08:58 · the Cross upright</button><button type="button" class="chip" data-p="5.1333">05:08 · sunrise</button><button type="button" class="chip" data-p="apr">22:08 · 21 April 1889</button><button type="button" class="chip" data-act="play">Play the morning</button></div>' +
      '<div class="seg" data-g="mirror"><button type="button" data-v="0">As seen from the ground</button><button type="button" data-v="1">From outside, as the law says</button></div>' +
      '<p class="sky-opts"><label><input type="checkbox" data-o2="labels" checked> Names</label> <label><input type="checkbox" data-o2="show"> Show the stars even in daylight</label></p>' +
      '<div class="sky-read" aria-live="polite"></div></div></div>';
    var plot = $(".sky-plot", box);
    function pxy(alt, az) { var p = SKY.project(alt, az, "stereographic"); return [W / 2 + (st.mirror ? -p[0] : p[0]) * R, W / 2 - p[1] * R]; }
    function skyColour(a) { return a > 0 ? "day" : a > -6 ? "civil" : a > -12 ? "naut" : a > -18 ? "astro" : "night"; }
    function draw() {
      var jd = SKY.jdForLmt(st.y, st.m, st.d, st.t), lst = SKY.lstDeg(jd), sun = SKY.sunRaDec(jd), sa = SKY.altAz(sun[0], sun[1], lst);
      var phase = skyColour(sa[0]), dim = sa[0] > -6 && !st.show;
      var h = '<svg viewBox="0 0 ' + W + " " + W + '" class="sky-svg dome ' + phase + (dim ? " washed" : "") + '" role="img" aria-label="The sky over Rio de Janeiro at ' + hm(st.t) + '">';
      h += '<circle class="dome-bg" cx="' + W / 2 + '" cy="' + W / 2 + '" r="' + R + '"/>';
      [30, 60].forEach(function (a) { h += '<circle class="alt-ring" cx="' + W / 2 + '" cy="' + W / 2 + '" r="' + (Math.tan((90 - a) * Math.PI / 360) * R) + '"/>'; });
      h += '<line class="meridian" x1="' + W / 2 + '" y1="' + (W / 2 - R) + '" x2="' + W / 2 + '" y2="' + (W / 2 + R) + '"/>';
      var lab = st.mirror ? { N: [0, -1], S: [0, 1], E: [1, 0], W: [-1, 0] } : { N: [0, -1], S: [0, 1], E: [-1, 0], W: [1, 0] };
      Object.keys(lab).forEach(function (k) { h += '<text class="card" x="' + (W / 2 + lab[k][0] * (R + 12)) + '" y="' + (W / 2 + lab[k][1] * (R + 12) + 4) + '" text-anchor="middle">' + k + "</text>"; });
      D.bg.forEach(function (b) {
        var aa = SKY.altAz(b[0], b[1], lst);
        if (aa[0] <= 0) return;
        var p = pxy(aa[0], aa[1]);
        h += '<circle class="bgs" cx="' + p[0].toFixed(1) + '" cy="' + p[1].toFixed(1) + '" r="' + Math.max(0.5, 2.6 - 0.45 * b[2]).toFixed(2) + '"/>';
      });
      Object.keys(D.leftOut).forEach(function (k) {
        var b = D.leftOut[k], aa = SKY.altAz(b[0], b[1], lst);
        if (aa[0] <= 0) return;
        var p = pxy(aa[0], aa[1]);
        h += '<circle class="left-out" cx="' + p[0].toFixed(1) + '" cy="' + p[1].toFixed(1) + '" r="5.5"/>' + (st.labels ? '<text class="lo-lab" x="' + (p[0] + 8).toFixed(1) + '" y="' + (p[1] + 3).toFixed(1) + '">' + escHtml(k) + "</text>" : "");
      });
      var crux = CRUX.map(function (hr) { var s = BYHR[hr], aa = SKY.altAz(s.ra, s.dec, lst); return aa[0] > 0 ? pxy(aa[0], aa[1]) : null; });
      if (crux[0] && crux[1]) h += '<line class="cline" x1="' + crux[0][0] + '" y1="' + crux[0][1] + '" x2="' + crux[1][0] + '" y2="' + crux[1][1] + '"/>';
      if (crux[2] && crux[3]) h += '<line class="cline" x1="' + crux[2][0] + '" y1="' + crux[2][1] + '" x2="' + crux[3][0] + '" y2="' + crux[3][1] + '"/>';
      var up = 0;
      STARS.forEach(function (s) {
        var aa = SKY.altAz(s.ra, s.dec, lst);
        if (aa[0] <= 0) return;
        up++;
        var p = pxy(aa[0], aa[1]), r = Math.max(2.2, 6 - 1.15 * s.vmag);
        h += '<g class="fs" data-hr="' + s.hr + '"><circle cx="' + p[0].toFixed(1) + '" cy="' + p[1].toFixed(1) + '" r="' + r.toFixed(2) + '"/>' +
          (st.labels ? '<text x="' + (p[0] + r + 3).toFixed(1) + '" y="' + (p[1] + 3).toFixed(1) + '">' + escHtml(s.name) + "</text>" : "") + "</g>";
      });
      if (sa[0] > -1) { var sp = pxy(Math.max(sa[0], 0.2), sa[1]); h += '<circle class="sun" cx="' + sp[0] + '" cy="' + sp[1] + '" r="11"/><text class="sun-lab" x="' + (sp[0] + 15) + '" y="' + (sp[1] + 4) + '">Sun</text>'; }
      h += '<circle class="horizon" cx="' + W / 2 + '" cy="' + W / 2 + '" r="' + R + '"/>';
      plot.innerHTML = h + "</svg>";
      var date = new Date(Date.UTC(st.y, st.m - 1, st.d));
      $(".sky-date", box).textContent = date.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" }) + ", Rio de Janeiro";
      $("[data-o=t]", box).textContent = hm(st.t);
      $("[data-o=lst]", box).textContent = "sidereal time " + hmS(lst / 15);
      $("[data-k=t]", box).value = st.t;
      var onMer = CRUX.filter(function (hr) { var ha = ((lst - BYHR[hr].ra) % 360 + 540) % 360 - 180; return Math.abs(ha) < 1.2; }).map(function (hr) { return BYHR[hr].name; });
      $(".sky-read", box).innerHTML = "<p><b>Sun</b> " + f1(sa[0]) + "° " + (sa[0] >= 0 ? "above" : "below") + " the horizon, azimuth " + Math.round(sa[1]) + "°. " +
        (phase === "day" ? "Daylight: no star could be seen with the naked eye." : phase === "night" ? "Full darkness." : "Twilight.") + "</p>" +
        "<p><b>" + up + " of 27</b> flag stars above the horizon." + (onMer.length ? " On the meridian now: " + onMer.join(", ") + "." : "") + "</p>" +
        '<p class="muted">The Cross crossed the meridian on 15 November: ' + escHtml(D.quotes.cross_times) + " (" + xref("s4-1", "section 4.1") + ").</p>";
      $$(".seg button", box).forEach(function (b) { b.setAttribute("aria-pressed", (b.getAttribute("data-v") === "1") === st.mirror ? "true" : "false"); });
    }
    function stop() { if (playing) { clearInterval(playing); playing = null; $("[data-act=play]", box).textContent = "Play the morning"; } }
    box.addEventListener("input", function (e) { if (e.target.getAttribute("data-k") === "t") { stop(); st.t = +e.target.value; draw(); } });
    box.addEventListener("change", function (e) { var k = e.target.getAttribute("data-o2"); if (k) { st[k] = e.target.checked; draw(); } });
    box.addEventListener("click", function (e) {
      var b = e.target.closest("button");
      if (!b) return;
      if (b.parentNode.getAttribute("data-g") === "mirror") st.mirror = b.getAttribute("data-v") === "1";
      var p = b.getAttribute("data-p");
      if (p) { stop(); if (p === "apr") { st.m = 4; st.d = 21; st.t = 22 + 8 / 60; } else { st.m = 11; st.d = 15; st.t = +p; } }
      if (b.getAttribute("data-act") === "play") {
        if (playing) { stop(); return; }
        st.m = 11; st.d = 15; if (st.t > 11.5 || st.t < 4) st.t = 4;
        b.textContent = "Pause";
        playing = setInterval(function () { st.t += 2 / 60; if (st.t >= 11.5) stop(); draw(); }, 60);
      }
      draw();
    });
    skyApi = { set: function (m, d, t) { stop(); st.m = m; st.d = d; st.t = t; draw(); } };
    draw();
  };

  /* ---- section 4.2: distance from the Sun */
  builders.sun = function (box) {
    var list = STARS.slice().sort(function (a, b) { return a.sunSep - b.sunSep; }), max = 180;
    box.innerHTML = '<div class="bars">' + list.map(function (s) {
      return '<div class="bar-row' + (s.con === "Sco" ? " hl" : "") + '"><span class="bar-lab"><span class="star-ref" tabindex="0" data-hr="' + s.hr + '">' + escHtml(s.name) + '</span></span><span class="bar-track"><i style="width:' + (s.sunSep / max * 100).toFixed(1) + '%"></i></span><span class="bar-n">' + s.sunSep.toFixed(1) + "°</span></div>";
    }).join("") + '</div><p class="legend"><span class="lg lg-hl"></span>the eight stars of Scorpius <span class="lg lg-plain"></span>the others. Scale 0° to 180°.</p>';
    hoverIn(box);
  };
  function hoverIn(box) {
    $$(".star-ref", box).forEach(function (s) {
      s.setAttribute("role", "button");
      s.addEventListener("click", function (e) { e.stopPropagation(); showStar(s, +s.getAttribute("data-hr")); });
      s.addEventListener("keydown", function (e) { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); showStar(s, +s.getAttribute("data-hr")); } });
    });
  }

  /* ---- section 4.4: the two great circles */
  function bandOffset(s) { return Math.hypot(s.fx + 2, s.fy + 7) - 8.25; }
  builders.hemi = function (box) {
    var list = STARS.slice().sort(function (a, b) { return b.ecl - a.ecl; });
    var sx = function (v, lo, hi) { return ((v - lo) / (hi - lo) * 100).toFixed(1) + "%"; };
    box.innerHTML = '<div class="hemi"><div class="hemi-row hemi-head"><span>Star</span><span>Ecliptic latitude (−60° to +10°)</span><span>Declination (−70° to +10°)</span><span>Drawn</span></div>' + list.map(function (s) {
      var key = s.hr === 5056 || s.hr === 5984 || s.hr === 2943, bo = bandOffset(s);
      return '<div class="hemi-row' + (key ? " key" : "") + '"><span><span class="star-ref" tabindex="0" data-hr="' + s.hr + '">' + escHtml(s.name) + "</span></span>" +
        '<span class="hemi-ax"><i class="zero" style="left:' + sx(0, -60, 10) + '"></i><b class="' + (s.ecl > 0 ? "n" : "s") + '" style="left:' + sx(s.ecl, -60, 10) + '" title="' + f1(s.ecl) + '°"></b></span>' +
        '<span class="hemi-ax"><i class="zero" style="left:' + sx(0, -70, 10) + '"></i><b class="' + (s.dec > 0 ? "n" : "s") + '" style="left:' + sx(s.dec, -70, 10) + '" title="' + f1(s.dec) + '°"></b></span>' +
        '<span class="hemi-band ' + (bo > 0 ? "above" : "below") + '">' + (bo > 0 ? "above" : "below") + " the band, " + Math.abs(bo).toFixed(2) + " M</span></div>";
    }).join("") + '</div><p class="legend"><span class="lg lg-n"></span>north of the circle <span class="lg lg-s"></span>south of it. The vertical line in each column is the ecliptic or the equator. Rows sorted by ecliptic latitude; Spica, Procyon and β Scorpii highlighted.</p>';
    hoverIn(box);
  };

  /* ---- section 4.5: Figure 1, interactive */
  builders.recur = function (box) {
    var R = D.recur, W = 720, H = 300, pl = 44, pr = 10, pt = 10, pb = 30;
    var day0 = Date.UTC(1889, 0, 1);
    function doy(ds) { var p = ds.split("-"); return (Date.UTC(+p[0], +p[1] - 1, +p[2]) - day0) / 864e5; }
    function X(d) { return pl + d / 365 * (W - pl - pr); }
    function Y(t) { return pt + ((t + 12) % 24) / 24 * (H - pt - pb); }  /* noon at top and bottom, midnight in the middle */
    function cls(a) { return a < -18 ? "night" : a < 0 ? "twi" : "day"; }
    var h = '<svg viewBox="0 0 ' + W + " " + H + '" class="chart-svg" role="img" aria-label="For each day of 1889, the time at which the flag\'s sky returned, coloured by the Sun\'s altitude">';
    [0, 6, 12, 18, 24].forEach(function (t) { var y = pt + t / 24 * (H - pt - pb); h += '<line class="grid" x1="' + pl + '" x2="' + (W - pr) + '" y1="' + y + '" y2="' + y + '"/><text class="ax" x="' + (pl - 6) + '" y="' + (y + 4) + '" text-anchor="end">' + ["12:00", "18:00", "00:00", "06:00", "12:00"][t / 6] + "</text>"; });
    ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"].forEach(function (m, i) { var d = (Date.UTC(1889, i, 1) - day0) / 864e5; h += '<text class="ax" x="' + (X(d) + 3) + '" y="' + (H - 10) + '">' + m + "</text>"; });
    R.forEach(function (r, i) { h += '<rect class="rd ' + cls(r[2]) + '" data-i="' + i + '" x="' + (X(doy(r[0])) - 1).toFixed(1) + '" y="' + (Y(r[1]) - 3).toFixed(1) + '" width="2.6" height="6" rx="1"/>'; });
    var law = R.filter(function (r) { return r[0] === "1889-11-15"; })[0], apr = R.filter(function (r) { return r[0] === "1889-04-21"; })[0];
    [[law, "08:30, 15 November"], [apr, "22:08, 21 April"]].forEach(function (p, k) { h += '<circle class="mark" cx="' + X(doy(p[0][0])) + '" cy="' + Y(p[0][1]) + '" r="8"/><text class="ax mk" x="' + (X(doy(p[0][0])) + (k ? 12 : -12)) + '" y="' + (Y(p[0][1]) - 10) + '" text-anchor="' + (k ? "start" : "end") + '">' + p[1] + "</text>"; });
    h += '<rect class="hit-all" x="' + pl + '" y="' + pt + '" width="' + (W - pl - pr) + '" height="' + (H - pt - pb) + '"/></svg>';
    box.innerHTML = '<div class="recur">' + h + '<div class="recur-read" aria-live="polite">Point at a day; choose it to see that moment in the sky above.</div><p class="legend"><span class="lg lg-night"></span>dark night (Sun more than 18° below the horizon) <span class="lg lg-twi"></span>twilight <span class="lg lg-day"></span>daylight</p></div>';
    var svg = $("svg", box), read = $(".recur-read", box);
    function nearest(e) {
      var r = svg.getBoundingClientRect(), x = (e.clientX - r.left) / r.width * W, d = (x - pl) / (W - pl - pr) * 365, best = null, bd = 9;
      R.forEach(function (row, i) { var dd = Math.abs(doy(row[0]) - d); if (dd < bd) { bd = dd; best = i; } });
      return best;
    }
    function describe(i) {
      var r = R[i], dt = new Date(r[0] + "T00:00:00Z").toLocaleDateString("en-GB", { day: "numeric", month: "long", timeZone: "UTC" });
      read.innerHTML = "<b>" + dt + " 1889</b>: the sky of 08:30 on 15 November returned at <b>" + hm(r[1]) + "</b>, with the Sun " + Math.abs(r[2]).toFixed(1) + "° " + (r[2] < 0 ? "below" : "above") + " the horizon (" + { night: "dark night", twi: "twilight", day: "daylight" }[cls(r[2])] + ").";
      $$(".rd.on", svg).forEach(function (x) { x.classList.remove("on"); });
      var n = svg.querySelector('.rd[data-i="' + i + '"]'); if (n) n.classList.add("on");
    }
    svg.addEventListener("mousemove", function (e) { var i = nearest(e); if (i != null) describe(i); });
    svg.addEventListener("click", function (e) {
      var i = nearest(e); if (i == null) return;
      var p = R[i][0].split("-");
      if (skyApi) { skyApi.set(+p[1], +p[2], R[i][1]); goTo("sky", { noFlash: false }); }
    });
  };

  /* ---- section 5.1: the six fits of Table 2 */
  builders.mirror = function (box) {
    var kind = "stereographic", mirror = true, F = frame(420, 420, 50);
    var KN = { orthographic: "Orthographic", stereographic: "Stereographic", equidistant: "Azimuthal equidistant" };
    box.innerHTML = '<div class="fit"><div class="fit-plot"></div><div class="fit-side"><div class="six">' +
      ["orthographic", "stereographic", "equidistant"].map(function (k) {
        return [false, true].map(function (m) {
          var f = SKY.procrustes(projected(TABLE2, k), drawnPts(TABLE2), m);
          return '<button type="button" class="six-b" data-k="' + k + '" data-m="' + (m ? 1 : 0) + '"><span>' + KN[k] + "</span><span>" + (m ? "from outside" : "from the ground") + "</span><b>" + f.rms.toFixed(3) + ' M</b><span class="muted">turned ' + Math.round(f.rot) + "°</span></button>";
        }).join("");
      }).join("") + '</div><p class="fit-note"></p><p class="legend"><span class="lg lg-drawn"></span>drawn <span class="lg lg-model"></span>computed, after the best fit</p></div></div>';
    function draw() {
      var f = SKY.procrustes(projected(TABLE2, kind), drawnPts(TABLE2), mirror), h = '<svg viewBox="0 0 420 420" class="sky-svg" role="img" aria-label="The best fit of the chosen projection">' + discBase(F, "mir");
      TABLE2.forEach(function (s, i) { h += '<line class="resline" x1="' + F.x(s.fx) + '" y1="' + F.y(s.fy) + '" x2="' + F.x(f.fitted[i][0]) + '" y2="' + F.y(f.fitted[i][1]) + '"/>'; });
      TABLE2.forEach(function (s) { h += drawnStar(F, s); });
      f.fitted.forEach(function (p) { h += '<circle class="model" cx="' + F.x(p[0]) + '" cy="' + F.y(p[1]) + '" r="4"/>'; });
      var S = f.apply([0, -1]), N = f.apply([0, 1]);
      h += '<text class="card on-disc" x="' + F.x(S[0]) + '" y="' + F.y(S[1]) + '" text-anchor="middle">S</text><text class="card on-disc" x="' + F.x(N[0]) + '" y="' + F.y(N[1]) + '" text-anchor="middle">N</text>';
      $(".fit-plot", box).innerHTML = h + "</svg>";
      $$(".six-b", box).forEach(function (b) { b.setAttribute("aria-pressed", b.getAttribute("data-k") === kind && (b.getAttribute("data-m") === "1") === mirror ? "true" : "false"); });
      var t2 = D.fits.filter(function (x) { return x.kind === kind && x.mirror === mirror; })[0];
      $(".fit-note", box).innerHTML = "Recomputed here: " + f.rms.toFixed(3) + " M; Table 2: " + t2.rms.toFixed(3) + " M. " + (mirror ? "South (S) stays at the bottom." : "The fit turns the sky about " + Math.round(Math.abs(f.rot)) + "°, so south (S) ends up near the top: a half-turn is the nearest rotation can come to a mirror.");
    }
    box.addEventListener("click", function (e) { var b = e.target.closest(".six-b"); if (b) { kind = b.getAttribute("data-k"); mirror = b.getAttribute("data-m") === "1"; draw(); } });
    draw();
  };

  /* ---- section 5.2: Figure 2, interactive (and the Spica close-up in 5.4) */
  builders.disc = function (box, fig) {
    var focus = fig.getAttribute("data-focus"), W = 520, t = 0, sel = null, preset = focus === "spica" ? "spica" : "all";
    var PRE = { all: { label: "All 27", s: 66, ox: 0, oy: 0 }, cru: { label: "The Cross", s: 150, ox: 0.05, oy: -0.9, con: "Cru" }, sco: { label: "Scorpius", s: 125, ox: 2.3, oy: -1.6, con: "Sco" },
      cma: { label: "Canis Major", s: 125, ox: -2.5, oy: -0.4, con: "CMa" }, tra: { label: "Triangulum Australe", s: 150, ox: 1.2, oy: -2.0, con: "TrA" }, spica: { label: "Spica and the band", s: 120, ox: 0.6, oy: 0.6, hr: 5056 } };
    box.innerHTML = '<div class="dfig">' + (focus ? "" : '<div class="seg dfig-pre">' + Object.keys(PRE).map(function (k) { return '<button type="button" data-p="' + k + '">' + PRE[k].label + "</button>"; }).join("") + "</div>") +
      '<div class="dfig-main"><div class="dfig-plot"></div><div class="dfig-side"><label class="sl"><span>Move the stars: drawn <output></output> computed</span><input type="range" min="0" max="1" step="0.01" value="0" aria-label="From drawn to computed places"></label>' +
      '<div class="dfig-card" aria-live="polite"></div><p class="legend"><span class="lg lg-drawn"></span>drawn <span class="lg lg-model"></span>computed place <span class="lg lg-ecl"></span>ecliptic <span class="lg lg-eq"></span>equator</p></div></div></div>';
    var plot = $(".dfig-plot", box);
    function draw() {
      var P = PRE[preset], F = frame(W, W, P.s, P.ox, P.oy), u = "d" + (++uidN);
      var h = '<svg viewBox="0 0 ' + W + " " + W + '" class="sky-svg" role="img" aria-label="Drawn stars, computed places and their residuals: ' + escHtml(P.label) + '"><clipPath id="vp-' + u + '"><rect width="' + W + '" height="' + W + '"/></clipPath><g clip-path="url(#vp-' + u + ')">' + discBase(F, u);
      h += '<circle class="hz" cx="' + F.x(0.293) + '" cy="' + F.y(-0.237) + '" r="' + (3.783 * F.s) + '"/>';
      ["ecliptic", "equator"].forEach(function (k) { if (D.lines[k]) h += '<polyline class="ln-' + k + '" points="' + D.lines[k].map(function (p) { return F.x(p[0]).toFixed(1) + "," + F.y(p[1]).toFixed(1); }).join(" ") + '"/>'; });
      h += '<circle class="zen" cx="' + F.x(0.293) + '" cy="' + F.y(-0.237) + '" r="3"/>';
      STARS.forEach(function (s) {
        var dim = P.con && s.con !== P.con ? " dim" : "";
        h += '<line class="resline' + dim + (sel === s.hr ? " on" : "") + '" x1="' + F.x(s.fx) + '" y1="' + F.y(s.fy) + '" x2="' + F.x(s.mx) + '" y2="' + F.y(s.my) + '"/>';
        h += '<circle class="model' + dim + (sel === s.hr ? " on" : "") + '" cx="' + F.x(s.mx) + '" cy="' + F.y(s.my) + '" r="4"/>';
      });
      STARS.forEach(function (s) {
        var dim = P.con && s.con !== P.con ? " dim" : "", x = s.fx + (s.mx - s.fx) * t, y = s.fy + (s.my - s.fy) * t;
        h += '<g class="ds-g" data-hr="' + s.hr + '" tabindex="0" role="button" aria-label="' + escHtml(s.label) + '"><circle class="hit" cx="' + F.x(x) + '" cy="' + F.y(y) + '" r="11"/>' +
          '<polygon class="dstar' + dim + (sel === s.hr ? " hot" : "") + '" points="' + starPts(F.x(x), F.y(y), Math.max(3, R_CLASS[s.cls] * F.s * 1.25)) + '"/></g>';
        if (preset !== "all" && !dim) h += '<text class="on-disc lab" x="' + (F.x(x) + 8) + '" y="' + (F.y(y) - 6) + '">' + escHtml(s.name) + "</text>";
      });
      plot.innerHTML = h + "</g></svg>";
      $$(".dfig-pre button", box).forEach(function (b) { b.setAttribute("aria-pressed", b.getAttribute("data-p") === preset ? "true" : "false"); });
      card();
    }
    function card() {
      var c = $(".dfig-card", box);
      if (sel == null) {
        c.innerHTML = preset === "spica" ? "<p>Spica's computed place lies <b>0.59 M below</b> the centre line of the band; it is drawn <b>0.40 M above</b> it, about one module from where the fit would put it and 28° from its place on the sky (" + xref("s5-4", "section 5.4") + ").</p>"
          : "<p>Choose a star. The median star lies " + median(STARS.map(function (s) { return s.resM; })).toFixed(2) + " M, or " + median(STARS.map(function (s) { return s.resDeg; })).toFixed(1) + "° of sky, from its computed place. The faint circle is the horizon under the fit, at 3.78 M; the dot near the centre, the zenith.</p>";
        return;
      }
      var s = BYHR[sel];
      c.innerHTML = "<h4>" + escHtml(s.label) + "</h4><p>" + escHtml(s.conName) + " · stands for " + escHtml(s.state) + "</p><p><b>" + s.resM.toFixed(2) + " M</b> from its computed place, <b>" + s.resDeg.toFixed(1) + "°</b> of sky.</p>" +
        (s.amb ? '<p class="muted">Which drawn star this is rests on the leader lines (section 2.3).</p>' : "");
    }
    box.addEventListener("input", function (e) { t = +e.target.value; $("output", box).textContent = Math.round(t * 100) + "%"; draw(); });
    box.addEventListener("click", function (e) {
      var b = e.target.closest("[data-p]"); if (b) { preset = b.getAttribute("data-p"); sel = PRE[preset].hr || null; draw(); return; }
      var g = e.target.closest(".ds-g"); if (g) { sel = +g.getAttribute("data-hr"); draw(); }
    });
    box.addEventListener("keydown", function (e) { var g = e.target.closest(".ds-g"); if (g && (e.key === "Enter" || e.key === " ")) { e.preventDefault(); sel = +g.getAttribute("data-hr"); draw(); } });
    $("output", box).textContent = "0%";
    if (preset === "spica") sel = 5056;
    fig._focus = function (hr) { sel = hr; preset = "all"; draw(); };
    draw();
  };

  /* ---- section 5.3: constellations fitted on their own */
  var CON_FIT = null;
  function conFits() {
    if (CON_FIT) return CON_FIT;
    var all = SKY.procrustes(projected(STARS, "stereographic"), drawnPts(STARS), true);
    CON_FIT = { all: all };
    ["Cru", "CMa", "TrA", "Sco"].forEach(function (c) {
      var g = STARS.filter(function (s) { return s.con === c; }), src = projected(g, "stereographic"), dst = drawnPts(g);
      var a = SKY.procrustes(src, dst, false), b = SKY.procrustes(src, dst, true), f = a.rms < b.rms ? a : b;
      var cx = 0, cy = 0; dst.forEach(function (p) { cx += p[0] / dst.length; cy += p[1] / dst.length; });
      var spread = Math.sqrt(dst.reduce(function (acc, p) { return acc + Math.pow(p[0] - cx, 2) + Math.pow(p[1] - cy, 2); }, 0) / dst.length);
      CON_FIT[c] = { stars: g, src: src, fit: f, scale: f.scale / all.scale, turn: f.rot - all.rot, shape: f.rms / spread };
    });
    return CON_FIT;
  }
  builders.shapes = function (box) {
    var C = conFits(), con = "Cru", sims = {};
    var NAMES = { Cru: "Crux", CMa: "Canis Major", TrA: "Triangulum Australe", Sco: "Scorpius" };
    box.innerHTML = '<div class="shp"><div class="seg">' + Object.keys(NAMES).map(function (k) { return '<button type="button" data-c="' + k + '">' + NAMES[k] + "</button>"; }).join("") + "</div>" +
      '<div class="shp-main"><div class="shp-plot"></div><div class="shp-side"><dl class="shp-dl"></dl><div class="shp-sim"></div><button type="button" class="btn" data-act="sim">Run 2,000 random placements</button></div></div></div>';
    function simulate(c) {
      var g = C[c], rnd = mulberry32(1889), out = [];
      for (var k = 0; k < 2000; k++) {
        var rd = g.stars.map(function () { var x, y; do { x = (rnd() * 2 - 1) * 3.5; y = (rnd() * 2 - 1) * 3.5; } while (x * x + y * y > 12.25); return [x, y]; });
        var a = SKY.procrustes(g.src, rd, false), b = SKY.procrustes(g.src, rd, true), cx = 0, cy = 0;
        rd.forEach(function (p) { cx += p[0] / rd.length; cy += p[1] / rd.length; });
        var sp = Math.sqrt(rd.reduce(function (acc, p) { return acc + Math.pow(p[0] - cx, 2) + Math.pow(p[1] - cy, 2); }, 0) / rd.length);
        out.push(Math.min(a.rms, b.rms) / sp);
      }
      return out.sort(function (x, y) { return x - y; });
    }
    function draw() {
      var g = C[con], pts = g.stars.map(function (s) { return [s.fx, s.fy]; }).concat(g.fit.fitted);
      var xs = pts.map(function (p) { return p[0]; }), ys = pts.map(function (p) { return p[1]; });
      var ox = (Math.min.apply(null, xs) + Math.max.apply(null, xs)) / 2, oy = (Math.min.apply(null, ys) + Math.max.apply(null, ys)) / 2;
      var span = Math.max(Math.max.apply(null, xs) - Math.min.apply(null, xs), Math.max.apply(null, ys) - Math.min.apply(null, ys), 0.6);
      var F = frame(380, 380, 270 / span, ox, oy), h = '<svg viewBox="0 0 380 380" class="sky-svg" role="img" aria-label="' + NAMES[con] + ': drawn stars and the group\'s own best fit"><rect class="disc-sq" width="380" height="380"/>';
      g.stars.forEach(function (s, i) { h += '<line class="resline" x1="' + F.x(s.fx) + '" y1="' + F.y(s.fy) + '" x2="' + F.x(g.fit.fitted[i][0]) + '" y2="' + F.y(g.fit.fitted[i][1]) + '"/>'; });
      g.fit.fitted.forEach(function (p) { h += '<circle class="model" cx="' + F.x(p[0]) + '" cy="' + F.y(p[1]) + '" r="5"/>'; });
      g.stars.forEach(function (s) { h += '<polygon class="dstar" points="' + starPts(F.x(s.fx), F.y(s.fy), 7) + '"/><text class="on-disc lab" x="' + (F.x(s.fx) + 9) + '" y="' + (F.y(s.fy) - 7) + '">' + escHtml(s.name) + "</text>"; });
      $(".shp-plot", box).innerHTML = h + "</svg>";
      var row = D.t3.filter(function (r) { return r[0] === NAMES[con]; })[0];
      $(".shp-dl", box).innerHTML = "<dt>Scale against the whole disc</dt><dd>×" + g.scale.toFixed(1) + ' <span class="muted">(Table 3: ' + escHtml(row[2]) + ")</span></dd>" +
        "<dt>Shape error</dt><dd>" + Math.round(g.shape * 100) + '% of the group\'s spread <span class="muted">(Table 3: ' + escHtml(row[3]) + ")</span></dd>" +
        "<dt>Turn against the whole disc</dt><dd>" + (g.turn >= 0 ? "+" : "−") + Math.abs(Math.round(g.turn)) + '° <span class="muted">(Table 3: ' + escHtml(row[4]) + ")</span></dd>";
      $$(".seg button", box).forEach(function (b) { b.setAttribute("aria-pressed", b.getAttribute("data-c") === con ? "true" : "false"); });
      histo();
    }
    function histo() {
      var s = sims[con], el2 = $(".shp-sim", box), g = C[con];
      if (!s) { el2.innerHTML = '<p class="muted">How often does chance do as well? Random placements of ' + g.stars.length + " stars, uniform in the disc, fitted the same way.</p>"; return; }
      var bins = new Array(30).fill(0); s.forEach(function (v) { bins[Math.min(29, Math.floor(v / 1.5 * 30))]++; });
      var mx = Math.max.apply(null, bins), W = 300, H = 90, h = '<svg viewBox="0 0 ' + W + " " + H + '" class="chart-svg" role="img" aria-label="Histogram of shape errors for random placements">';
      bins.forEach(function (b, i) { var bh = b / mx * (H - 22); h += '<rect class="hb" x="' + (i * W / 30 + 1) + '" y="' + (H - 16 - bh) + '" width="' + (W / 30 - 2) + '" height="' + bh + '" rx="1.5"/>'; });
      var xv = Math.min(1.5, g.shape) / 1.5 * W;
      h += '<line class="hv" x1="' + xv + '" x2="' + xv + '" y1="4" y2="' + (H - 16) + '"/><text class="ax" x="0" y="' + (H - 3) + '">0%</text><text class="ax" x="' + W + '" y="' + (H - 3) + '" text-anchor="end">150%</text></svg>';
      var below = s.filter(function (v) { return v <= g.shape; }).length;
      el2.innerHTML = h + "<p>Median of the random placements: <b>" + Math.round(s[1000] * 100) + "%</b>. At or below the drawing's " + Math.round(g.shape * 100) + "%: <b>" + below + " of 2,000</b>. <span class=\"muted\">Seed 1889, generated in your browser.</span></p>";
    }
    box.addEventListener("click", function (e) {
      var b = e.target.closest("[data-c]"); if (b) { con = b.getAttribute("data-c"); draw(); return; }
      if (e.target.closest("[data-act=sim]")) { var btn = e.target.closest("button"); btn.disabled = true; btn.textContent = "Running…"; setTimeout(function () { sims[con] = simulate(con); btn.disabled = false; btn.textContent = "Run 2,000 random placements"; histo(); }, 30); }
    });
    draw();
  };

  /* ---- section 5.5: sizes */
  function spearman(xs, ys) {
    function ranks(v) {
      var order = v.map(function (_, i) { return i; }).sort(function (a, b) { return v[a] - v[b]; }), r = new Array(v.length), i = 0;
      while (i < v.length) { var j = i; while (j + 1 < v.length && v[order[j + 1]] === v[order[i]]) j++; for (var k = i; k <= j; k++) r[order[k]] = (i + j) / 2 + 1; i = j + 1; }
      return r;
    }
    var rx = ranks(xs), ry = ranks(ys), mx = rx.reduce(function (a, b) { return a + b; }) / rx.length, my = ry.reduce(function (a, b) { return a + b; }) / ry.length, num = 0, dx = 0, dy = 0;
    for (var i = 0; i < rx.length; i++) { num += (rx[i] - mx) * (ry[i] - my); dx += Math.pow(rx[i] - mx, 2); dy += Math.pow(ry[i] - my, 2); }
    return num / Math.sqrt(dx * dy);
  }
  builders.sizes = function (box) {
    var only89 = false, W = 640, H = 300, pl = 70, pr = 20, pt = 20, pb = 36;
    box.innerHTML = '<div class="sizes"><div class="seg"><button type="button" data-v="0">All 27 stars</button><button type="button" data-v="1">The 21 stars of 1889</button></div><div class="sz-plot"></div><p class="sz-read" aria-live="polite"></p></div>';
    function X(v) { return pl + (v + 2) / 8 * (W - pl - pr); } function Y(c) { return pt + (c - 1) / 4 * (H - pt - pb); }
    function draw() {
      var L = STARS.filter(function (s) { return !only89 || s.since === "1889"; });
      var inv = []; L.forEach(function (a) { L.forEach(function (b) { if (a.vmag < b.vmag && a.cls > b.cls) inv.push([a, b]); }); });
      var h = '<svg viewBox="0 0 ' + W + " " + H + '" class="chart-svg" role="img" aria-label="Size class against magnitude">';
      for (var c = 1; c <= 5; c++) h += '<line class="grid" x1="' + pl + '" x2="' + (W - pr) + '" y1="' + Y(c) + '" y2="' + Y(c) + '"/><text class="ax" x="' + (pl - 8) + '" y="' + (Y(c) + 4) + '" text-anchor="end">class ' + c + "</text>";
      for (var v = -2; v <= 6; v++) h += '<text class="ax" x="' + X(v) + '" y="' + (H - 14) + '" text-anchor="middle">' + (v < 0 ? "−" + -v : v) + "</text>";
      h += '<text class="ax" x="' + (W - pr) + '" y="' + (H - 1) + '" text-anchor="end">magnitude V → fainter</text>';
      inv.forEach(function (p) { h += '<line class="inv" x1="' + X(p[0].vmag) + '" y1="' + Y(p[0].cls) + '" x2="' + X(p[1].vmag) + '" y2="' + Y(p[1].cls) + '"/>'; });
      var jit = {};
      L.forEach(function (s) {
        var k = s.cls + ":" + Math.round(s.vmag * 4); jit[k] = (jit[k] || 0) + 1;
        var y = Y(s.cls) + (jit[k] - 1) * 9 - 4;
        h += '<circle class="sz-dot' + (s.hr === 2618 ? " adh" : "") + '" cx="' + X(s.vmag) + '" cy="' + y + '" r="5"><title>' + escHtml(s.label + ": V " + s.vmag.toFixed(2) + ", class " + s.cls) + "</title></circle>";
        if (s.hr === 2618 || s.hr === 7228) h += '<text class="ax lab2" x="' + (X(s.vmag) + 8) + '" y="' + (y - 7) + '">' + escHtml(s.name) + "</text>";
      });
      $(".sz-plot", box).innerHTML = h + "</svg>";
      var pairs = 0; L.forEach(function (a, i) { L.slice(i + 1).forEach(function (b) { if (a.cls !== b.cls) pairs++; }); });
      $(".sz-read", box).innerHTML = "Rank correlation <b>" + spearman(L.map(function (s) { return s.vmag; }), L.map(function (s) { return s.cls; })).toFixed(2) + "</b> · " + pairs + " pairs in different classes, <b>" + inv.length + " inverted</b>" + (inv.length ? ", every one involving Adhara (lines)." : ".");
      $$(".seg button", box).forEach(function (b) { b.setAttribute("aria-pressed", (b.getAttribute("data-v") === "1") === only89 ? "true" : "false"); });
    }
    box.addEventListener("click", function (e) { var b = e.target.closest("[data-v]"); if (b) { only89 = b.getAttribute("data-v") === "1"; draw(); } });
    draw();
  };

  /* ---- section 5.6: four drawings */
  builders.drawings = function (box) {
    var keys = Object.keys(D.drawingImages), sel = keys[0];
    box.innerHTML = '<div class="drw"><div class="seg">' + keys.map(function (k) { return '<button type="button" data-k="' + escHtml(k) + '">' + escHtml(D.drawingImages[k].short) + "</button>"; }).join("") + '<button type="button" data-k="1992">1992, the annex measured</button></div>' +
      '<div class="drw-main"><figure class="drw-img"><img alt=""><figcaption></figcaption></figure><div class="drw-bars"></div></div></div>';
    function draw() {
      var img = $(".drw-img img", box), cap = $(".drw-img figcaption", box), bars = $(".drw-bars", box);
      $$(".seg button", box).forEach(function (b) { b.setAttribute("aria-pressed", b.getAttribute("data-k") === sel ? "true" : "false"); });
      if (sel === "1992") {
        img.src = D.media.d1992; img.alt = "Annex 2 of Law 8,421 of 1992"; cap.textContent = "Annex 2 of Law 8,421/1992, against which the other three are measured.";
        bars.innerHTML = "<p>The construction file used throughout agrees with this scan to 0.04 M (root-mean-square), the largest difference 0.07 M, for Alphard (" + xref("s2-3", "section 2.3") + ").</p>";
        return;
      }
      var info = D.drawingImages[sel], res = D.drawings[sel], list = STARS.filter(function (s) { return res[s.hr] != null; });
      img.src = D.media[info.img]; img.alt = sel; cap.textContent = sel + ".";
      var mx = 0.3;
      bars.innerHTML = '<p class="muted">Distance of each star from the 1992 annex, after a similarity fit (' + list.length + " stars):</p>" + '<div class="bars compact">' + list.map(function (s) {
        var v = res[s.hr];
        return '<div class="bar-row"><span class="bar-lab">' + escHtml(s.name) + '</span><span class="bar-track"><i style="width:' + (v / mx * 100).toFixed(1) + '%"></i><em style="left:' + (0.14 / mx * 100) + '%"></em></span><span class="bar-n">' + v.toFixed(2) + " M</span></div>";
      }).join("") + '</div><p class="legend">Scale 0 to 0.3 M; the mark at 0.14 M is the largest departure in any drawing. The disc is 7 M across.</p>';
    }
    box.addEventListener("click", function (e) { var b = e.target.closest("[data-k]"); if (b) { sel = b.getAttribute("data-k"); draw(); } });
    draw();
  };

  /* ---- section 6: Figure 3, interactive */
  builders.inverse = function (box) {
    var NL = 101, NT = 96, variant = "free", showLevel = true;
    function idx(li, ti) { return li * NT + ti; }
    function lat(li) { return -90 + li; } function lstH(ti) { return ti * 0.25; }
    var V = {};
    ["free", "fixed"].forEach(function (k) {
      var rms = D.inv[k].rms, ok = D.inv[k].ok, sorted = rms.slice().sort(function (a, b) { return a - b; }), best = 0;
      for (var i = 1; i < rms.length; i++) if (rms[i] < rms[best]) best = i;
      V[k] = { rms: rms, ok: ok, sorted: sorted, best: best };
    });
    function rank(k, v) { var s = V[k].sorted, lo = 0, hi = s.length; while (lo < hi) { var m = (lo + hi) >> 1; if (s[m] < v) lo = m + 1; else hi = m; } return lo + 1; }
    box.innerHTML = '<div class="inv"><div class="seg"><button type="button" data-v="free">Centre free</button><button type="button" data-v="fixed">Zenith fixed at the centre</button></div> <label class="inv-lv"><input type="checkbox" checked> Outline the cells within 10% of the best</label>' +
      '<div class="inv-main"><div class="inv-plot"><canvas width="' + NT * 6 + '" height="' + NL * 4 + '" aria-label="Heat map of fit by latitude and sidereal time"></canvas><svg class="inv-over" viewBox="0 0 ' + NT * 6 + " " + NL * 4 + '" preserveAspectRatio="none" aria-hidden="true"></svg>' +
      '<div class="inv-ax-y"><span>10° N</span><span>40° S</span><span>90° S</span></div><div class="inv-ax-x"><span>0h</span><span>6h</span><span>12h</span><span>18h</span><span>24h</span></div></div>' +
      '<div class="inv-side"><div class="inv-read" aria-live="polite"></div><div class="inv-prev"></div></div></div>' +
      '<p class="legend"><span class="lg lg-best"></span>best fit <span class="lg lg-worse"></span>twice its error or worse <span class="lg lg-grey"></span>a star below the horizon · <b>+</b> Rio at 12h · <b>○</b> the best cell</p></div>';
    var cv = $("canvas", box), ctx = cv.getContext("2d"), over = $(".inv-over", box);
    function ramp(f) {
      var dark = document.documentElement.dataset.theme === "dark" || (!document.documentElement.dataset.theme && window.matchMedia("(prefers-color-scheme: dark)").matches);
      var a = dark ? [214, 228, 255] : [12, 34, 92], b = dark ? [22, 34, 64] : [236, 241, 250];
      return "rgb(" + a.map(function (x, i) { return Math.round(x + (b[i] - x) * f); }).join(",") + ")";
    }
    function draw() {
      var v = V[variant], best = v.rms[v.best];
      for (var li = 0; li < NL; li++) for (var ti = 0; ti < NT; ti++) {
        var i = idx(li, ti), f = Math.min(1, (v.rms[i] - best) / best);
        ctx.fillStyle = v.ok[i] === "1" ? ramp(f) : "rgba(128,128,128,0.35)";
        ctx.fillRect(ti * 6, (NL - 1 - li) * 4, 6, 4);
      }
      var h = "";
      if (showLevel) for (li = 0; li < NL; li++) for (ti = 0; ti < NT; ti++) { i = idx(li, ti); if (v.rms[i] <= best * 1.1) h += '<rect class="lv" x="' + ti * 6 + '" y="' + (NL - 1 - li) * 4 + '" width="6" height="4"/>'; }
      var rio = idx(-23 + 90, 48);  /* 23° S, 12h */
      var bl = Math.floor(v.best / NT), bt = v.best % NT;
      h += '<text class="rio" x="' + (48 * 6 + 3) + '" y="' + ((NL - 1 - 67) * 4 + 7) + '" text-anchor="middle">+</text>';
      h += '<circle class="bestc" cx="' + (bt * 6 + 3) + '" cy="' + ((NL - 1 - bl) * 4 + 2) + '" r="7"/>';
      over.innerHTML = h;
      $$(".seg button", box).forEach(function (b) { b.setAttribute("aria-pressed", b.getAttribute("data-v") === variant ? "true" : "false"); });
      var rr = v.rms[rio];
      $(".inv-read", box).innerHTML = "<p><b>Best cell</b>: " + Math.abs(lat(bl)) + "° S, " + hmS(lstH(bt)) + ", rms " + best.toFixed(3) + " M.</p><p><b>Rio at 12h</b>: rms " + rr.toFixed(3) + " M, rank <b>" + n0(rank(variant, rr)) + "</b> of 9,696.</p>" +
        '<p class="muted">Point at a cell for its rank' + (variant === "fixed" ? "; choose it to see that sky laid on the disc." : ".") + "</p>";
      $(".inv-prev", box).innerHTML = "";
    }
    function cell(e) {
      var r = cv.getBoundingClientRect(), ti = Math.floor((e.clientX - r.left) / r.width * NT), li = NL - 1 - Math.floor((e.clientY - r.top) / r.height * NL);
      return ti >= 0 && ti < NT && li >= 0 && li < NL ? [li, ti] : null;
    }
    var tip = el("div", { "class": "inv-tip", hidden: "" }); $(".inv-plot", box).appendChild(tip);
    cv.addEventListener("mousemove", function (e) {
      var c = cell(e); if (!c) { tip.hidden = true; return; }
      var v = V[variant], i = idx(c[0], c[1]), la = lat(c[0]);
      tip.hidden = false;
      tip.innerHTML = (la < 0 ? Math.abs(la) + "° S" : la > 0 ? la + "° N" : "0°") + ", " + hmS(lstH(c[1])) + "<br>rms " + v.rms[i].toFixed(3) + " M · rank " + n0(rank(variant, v.rms[i])) + (v.ok[i] === "1" ? "" : "<br>a flag star below the horizon");
      var r = cv.getBoundingClientRect(), pr = $(".inv-plot", box).getBoundingClientRect();
      tip.style.left = (e.clientX - pr.left + 12) + "px"; tip.style.top = (e.clientY - pr.top + 12) + "px";
    });
    cv.addEventListener("mouseleave", function () { tip.hidden = true; });
    cv.addEventListener("click", function (e) {
      if (variant !== "fixed") return;
      var c = cell(e); if (!c) return;
      var la = lat(c[0]), lst = lstH(c[1]) * 15;
      var src = STARS.map(function (s) { var aa = SKY.altAz(s.ra, s.dec, lst, la); return SKY.project(aa[0], aa[1], "stereographic"); });
      var f = SKY.procrustes(src, drawnPts(STARS), true, true), F = frame(220, 220, 28), u = "inv" + (++uidN);
      var h = '<svg viewBox="0 0 220 220" class="sky-svg" role="img" aria-label="The chosen sky fitted to the disc">' + discBase(F, u);
      STARS.forEach(function (s, i) { h += '<line class="resline" x1="' + F.x(s.fx) + '" y1="' + F.y(s.fy) + '" x2="' + F.x(f.fitted[i][0]) + '" y2="' + F.y(f.fitted[i][1]) + '"/>'; });
      STARS.forEach(function (s) { h += drawnStar(F, s, "", 1); });
      f.fitted.forEach(function (p) { h += '<circle class="model" cx="' + F.x(p[0]) + '" cy="' + F.y(p[1]) + '" r="2.6"/>'; });
      $(".inv-prev", box).innerHTML = h + "</svg><p>" + (la < 0 ? Math.abs(la) + "° S" : la + "° N") + ", " + hmS(lst / 15) + ": rms recomputed here " + f.rms.toFixed(3) + " M (file: " + V.fixed.rms[idx(c[0], c[1])].toFixed(3) + " M).</p>";
    });
    box.addEventListener("click", function (e) { var b = e.target.closest("[data-v]"); if (b) { variant = b.getAttribute("data-v"); draw(); } });
    $(".inv-lv input", box).addEventListener("change", function (e) { showLevel = e.target.checked; draw(); });
    window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", draw);
    $("[data-theme-toggle]").addEventListener("click", function () { setTimeout(draw, 10); });
    draw();
  };

  /* ---- section 6.4: the controls, draw by draw */
  builders.controls = function (box) {
    var variant = "centre_free";
    var FAM = [
      { label: "Exact disc with random errors of 0.52 M (20 draws)", rows: function (v) { return D.rob.filter(function (r) { return r.check === "noise" && r.variant === v && /rms 0\.52 M/.test(r.detail); }); } },
      { label: "The drawing's departures, directions random (100 draws)", rows: function (v) { return D.ctl.filter(function (r) { return r.check === "random_direction" && r.variant === v; }); } },
      { label: "The drawing's departures, exchanged among the stars (100 draws)", rows: function (v) { return D.ctl.filter(function (r) { return r.check === "reassigned" && r.variant === v; }); } },
      { label: "The drawing's departures, all turned by one angle (100 draws)", rows: function (v) { return D.ctl.filter(function (r) { return r.check === "turned_together" && r.variant === v; }); } }
    ];
    box.innerHTML = '<div class="ctl"><div class="seg"><button type="button" data-v="centre_free">Centre free</button><button type="button" data-v="zenith_fixed">Zenith fixed</button></div><div class="ctl-plot"></div></div>';
    function X(r) { return (Math.log10(r) / Math.log10(9696) * 100).toFixed(2) + "%"; }
    function draw() {
      var drawing = D.rob.filter(function (r) { return r.check === "drawing" && r.variant === variant; })[0].rank;
      var h = '<div class="ctl-axis">' + [1, 10, 100, 1000, 9696].map(function (r) { return '<span style="left:' + X(r) + '">' + n0(r) + "</span>"; }).join("") + "</div>";
      FAM.forEach(function (f) {
        var rows = f.rows(variant), ranks = rows.map(function (r) { return r.rank; }), med = median(ranks);
        var asLow = ranks.filter(function (r) { return r >= drawing; }).length;
        h += '<div class="ctl-row"><div class="ctl-lab">' + escHtml(f.label) + '<span class="muted">median rank ' + n0(med) + (rows.length === 100 ? " · as low as the drawing in " + asLow : "") + '</span></div><div class="ctl-strip"><em style="left:' + X(drawing) + '"></em>' +
          ranks.map(function (r, i) { return '<i style="left:' + X(r) + ";top:" + (18 + ((i * 37) % 20) - 10) + 'px" title="rank ' + n0(r) + '"></i>'; }).join("") + '<b style="left:' + X(med) + '"></b></div></div>';
      });
      h += '<p class="legend"><span class="lg lg-dot"></span>one draw <span class="lg lg-med"></span>median <span class="lg lg-drawn-line"></span>the drawn disc, rank ' + n0(drawing) + ". Further left is closer to Rio.</p>";
      $(".ctl-plot", box).innerHTML = h;
      $$(".seg button", box).forEach(function (b) { b.setAttribute("aria-pressed", b.getAttribute("data-v") === variant ? "true" : "false"); });
    }
    box.addEventListener("click", function (e) { var b = e.target.closest("[data-v]"); if (b) { variant = b.getAttribute("data-v"); draw(); } });
    draw();
  };

  /* ---- section 7: stars and states */
  var TILES = { "Roraima": [1, 0, "RR"], "Amapá": [3, 0, "AP"], "Amazonas": [1, 1, "AM"], "Pará": [2, 1, "PA"], "Maranhão": [3, 1, "MA"], "Ceará": [4, 1, "CE"], "Rio Grande do Norte": [5, 1, "RN"],
    "Acre": [0, 2, "AC"], "Rondônia": [1, 2, "RO"], "Tocantins": [2, 2, "TO"], "Piauí": [3, 2, "PI"], "Pernambuco": [4, 2, "PE"], "Paraíba": [5, 2, "PB"],
    "Mato Grosso": [1, 3, "MT"], "Goiás": [2, 3, "GO"], "Distrito Federal": [3, 3, "DF"], "Bahia": [4, 3, "BA"], "Alagoas": [5, 3, "AL"],
    "Mato Grosso do Sul": [1, 4, "MS"], "São Paulo": [2, 4, "SP"], "Minas Gerais": [3, 4, "MG"], "Espírito Santo": [4, 4, "ES"], "Sergipe": [5, 4, "SE"],
    "Paraná": [2, 5, "PR"], "Rio de Janeiro": [3, 5, "RJ"], "Santa Catarina": [2, 6, "SC"], "Rio Grande do Sul": [2, 7, "RS"] };
  builders.federation = function (box) {
    var sel = 3748, F = frame(300, 300, 40);
    var NOTE = { 3748: "Guanabara's star in the table annexed to the bill of 1967; Mato Grosso do Sul's in 1992, after the fusion of Guanabara with the state of Rio de Janeiro in 1975 (section 7.3).",
      7228: "Stood for the Neutral Municipality in 1889, “the natural symbol of the Neutral Municipality” in the designer's words; for the Federal District in the 1992 annex.",
      5020: "Added in 1968 for Acre, a state since 1962; the bill's table of 1967 gives γ Hydrae.", 2943: "Chosen, in the designer's words, to stand for a state that “extends into the northern hemisphere”." };
    box.innerHTML = '<div class="fed"><div class="fed-tiles"></div><div class="fed-disc"></div><div class="fed-card" aria-live="polite"></div></div>' +
      '<div class="fed-time">' + [["1889", "21 stars: twenty states and the Neutral Municipality"], ["1960", "A star “of the first magnitude” for Guanabara, by decree"], ["1967", "The bill sets the 1960 star aside: the sky had no such star there; Guanabara is given Alphard"], ["1968", "Acre's star, γ Hydrae: 23 stars"], ["1975", "Guanabara merges with Rio de Janeiro; a star is left over"], ["1977", "Mato Grosso do Sul: no new star needed"], ["1992", "Rondônia, Amapá, Roraima, Tocantins: 27 stars"]].map(function (r) {
        return '<div class="ft"><b>' + r[0] + "</b><span>" + escHtml(r[1]) + "</span></div>"; }).join("") + "</div>";
    function draw() {
      var s = BYHR[sel];
      $(".fed-tiles", box).innerHTML = '<svg viewBox="0 0 330 420" class="tile-svg" role="img" aria-label="The states as a tile map">' + STARS.map(function (t) {
        var p = TILES[t.state];
        return '<g class="tile' + (t.hr === sel ? " on" : "") + (t.since !== "1889" ? " new" : "") + '" data-hr="' + t.hr + '" tabindex="0" role="button" aria-label="' + escHtml(t.state) + '"><rect x="' + (p[0] * 54 + 4) + '" y="' + (p[1] * 51 + 4) + '" width="50" height="47" rx="6"/><text x="' + (p[0] * 54 + 29) + '" y="' + (p[1] * 51 + 26) + '" text-anchor="middle">' + p[2] + '</text><text class="ty" x="' + (p[0] * 54 + 29) + '" y="' + (p[1] * 51 + 41) + '" text-anchor="middle">' + t.since + "</text></g>";
      }).join("") + "</svg>";
      var h = '<svg viewBox="0 0 300 300" class="sky-svg" role="img" aria-label="The disc with the chosen star">' + discBase(F, "fed" + (++uidN));
      STARS.forEach(function (t) { h += '<g class="fstar" data-hr="' + t.hr + '"><circle class="hit" cx="' + F.x(t.fx) + '" cy="' + F.y(t.fy) + '" r="10"/>' + drawnStar(F, t, t.hr === sel ? " hot" : "", t.hr === sel ? 2 : 1.25) + "</g>"; });
      $(".fed-disc", box).innerHTML = h + "</svg>";
      $(".fed-card", box).innerHTML = "<h4>" + escHtml(s.state) + "</h4><p><b>" + escHtml(s.label) + "</b> · " + escHtml(s.conName) + "</p><p>On the disc since " + s.since + (s.hr === 3748 ? "†" : "") + " · size class " + s.cls + "</p>" + (NOTE[sel] ? '<p class="muted">' + escHtml(NOTE[sel]) + "</p>" : "");
    }
    box.addEventListener("click", function (e) { var g = e.target.closest("[data-hr]"); if (g) { sel = +g.getAttribute("data-hr"); draw(); } });
    box.addEventListener("keydown", function (e) { var g = e.target.closest(".tile"); if (g && (e.key === "Enter" || e.key === " ")) { e.preventDefault(); sel = +g.getAttribute("data-hr"); draw(); } });
    draw();
  };

  /* ---- section 9: try it yourself, the mirrored Cross */
  builders.crosstest = function (box) {
    var C = [4763, 4730, 4853, 4656, 4700].map(function (h) { return BYHR[h]; });  /* Gacrux, Acrux, Mimosa, δ, ε */
    function upright(pts) {  /* rotate so that Gacrux is straight above Acrux */
      var g = pts[0], a = pts[1], ang = Math.atan2(g[0] - a[0], g[1] - a[1]), co = Math.cos(ang), si = Math.sin(ang);
      return pts.map(function (p) { var x = p[0] - a[0], y = p[1] - a[1]; return [x * co - y * si, x * si + y * co]; });
    }
    var flag = upright(C.map(function (s) { return [s.fx, s.fy]; }));
    var sky = upright(C.map(function (s) { var p = SKY.project(s.alt, s.az, "stereographic"); return [p[0], p[1]]; }));
    var answers = {}, step = 1, order = mulberry32(Date.now() % 100000)() < 0.5 ? [0, 1] : [1, 0], picked = null;
    function crossSvg(pts, show, labels) {
      var ys = pts.map(function (p) { return p[1]; }), span = Math.max.apply(null, ys) - Math.min.apply(null, ys), s = 160 / span, cy = (Math.max.apply(null, ys) + Math.min.apply(null, ys)) / 2;
      var X = function (x) { return 110 + x * s; }, Y = function (y) { return 110 - (y - cy) * s; };
      var h = '<svg viewBox="0 0 220 220" class="sky-svg"><rect class="disc-sq" width="220" height="220" rx="8"/><line class="cline" x1="' + X(pts[0][0]) + '" y1="' + Y(pts[0][1]) + '" x2="' + X(pts[1][0]) + '" y2="' + Y(pts[1][1]) + '"/>';
      pts.forEach(function (p, i) { if (i < 2 || show) h += '<polygon class="dstar" points="' + starPts(X(p[0]), Y(p[1]), i === 4 ? 5 : 8) + '"/>' + (labels ? '<text class="on-disc lab" x="' + (X(p[0]) + 10) + '" y="' + (Y(p[1]) + 4) + '">' + escHtml(C[i].name) + "</text>" : ""); });
      return h + "</svg>";
    }
    function render() {
      var h;
      if (step === 1) {
        h = '<div class="ct-grid"><div>' + crossSvg(flag, false, true) + '</div><div><p>The Cross stands upright: Gacrux at the top, Acrux at the foot. On which side of the long axis does each of the other three stars go?</p>' +
          [2, 3, 4].map(function (i) { return '<p class="ct-q"><b>' + escHtml(C[i].name) + '</b> <span class="seg"><button type="button" data-s="' + i + '" data-a="L">Left</button><button type="button" data-s="' + i + '" data-a="R">Right</button></span></p>'; }).join("") +
          '<button type="button" class="btn btn-primary" data-act="reveal"' + (Object.keys(answers).length < 3 ? " disabled" : "") + ">Compare with the flag and the sky</button></div></div>";
      } else if (step === 2) {
        var flagSide = { 2: "R", 3: "L", 4: "L" }, nFlag = [2, 3, 4].filter(function (i) { return answers[i] === flagSide[i]; }).length;
        h = '<div class="ct-grid two"><figure>' + crossSvg(flag, true, true) + "<figcaption>On the flag (from outside)</figcaption></figure><figure>" + crossSvg(sky.map(function (p) { return p; }), true, true) + "<figcaption>In the sky over Rio (from the ground)</figcaption></figure></div>" +
          "<p>You placed <b>" + nFlag + " of 3</b> stars on the flag's side. " + escHtml(D.quotes.mirror_sides) + " In the sky the sides are the other way round.</p>" +
          '<button type="button" class="btn btn-primary" data-act="next">Second part: which is the sky?</button>';
      } else {
        var imgs = [sky, sky.map(function (p) { return [-p[0], p[1]]; })];
        h = "<p>One of these is the Cross as it stood over Rio, seen from the ground; the other is its mirror image. Which is the sky?</p><div class=\"ct-grid two\">" + order.map(function (o, k) {
          return '<button type="button" class="ct-pick' + (picked != null ? (o === 0 ? " right" : " wrong") : "") + '" data-pick="' + k + '">' + crossSvg(imgs[o], true, false) + "<span>" + (picked != null ? (o === 0 ? "The sky" : "The mirror image, as on the flag") : "Choice " + (k + 1)) + "</span></button>";
        }).join("") + "</div>" + (picked != null ? "<p>" + (order[picked] === 0 ? "Right." : "That one is the mirror image.") + " " + escHtml(D.quotes.q7) + ' <span class="muted">Nothing you chose has been recorded.</span></p><button type="button" class="btn" data-act="again">Start again</button>' : "");
      }
      $(".ct-body", box).innerHTML = h;
      $$("[data-s]", box).forEach(function (b) { b.setAttribute("aria-pressed", answers[b.getAttribute("data-s")] === b.getAttribute("data-a") ? "true" : "false"); });
    }
    box.innerHTML = '<div class="ct"><div class="ct-body"></div></div>';
    box.addEventListener("click", function (e) {
      var b = e.target.closest("button"); if (!b) return;
      if (b.hasAttribute("data-s")) { answers[b.getAttribute("data-s")] = b.getAttribute("data-a"); }
      var a = b.getAttribute("data-act");
      if (a === "reveal") step = 2; if (a === "next") step = 3;
      if (a === "again") { step = 1; answers = {}; picked = null; order = order.reverse(); }
      if (b.hasAttribute("data-pick") && picked == null) picked = +b.getAttribute("data-pick");
      render();
    });
    render();
  };

  /* ---- appendices: filters */
  function chipFilter(box, rows, facets, countLabel) {
    var state = {};
    box.innerHTML = facets.map(function (f) {
      var vals = []; rows.forEach(function (r) { var v = r.getAttribute(f[0]); if (vals.indexOf(v) < 0) vals.push(v); });
      return '<div class="row"><span>' + f[1] + "</span>" + vals.map(function (v) { return '<button type="button" class="chip" data-f="' + f[0] + '" data-v="' + escHtml(v) + '">' + escHtml(f[2] ? f[2](v) : v) + '<span class="n">' + rows.filter(function (r) { return r.getAttribute(f[0]) === v; }).length + "</span></button>"; }).join("") + "</div>";
    }).join("") + '<div class="row"><span>Find</span><input type="search" placeholder="Words in the row" aria-label="Filter the rows"> <span class="tools-count"></span></div>';
    function apply() {
      var shown = 0;
      rows.forEach(function (r) {
        var ok = Object.keys(state).every(function (f) { return !state[f] || (f === "q" ? r.textContent.toLowerCase().indexOf(state.q) >= 0 : r.getAttribute(f) === state[f]); });
        r.classList.toggle("hidden-row", !ok); if (ok) shown++;
      });
      $(".tools-count", box).textContent = "Showing " + shown + " of " + rows.length + " " + countLabel;
      $$(".chip", box).forEach(function (c) { c.setAttribute("aria-pressed", state[c.getAttribute("data-f")] === c.getAttribute("data-v") ? "true" : "false"); });
    }
    box.addEventListener("click", function (e) { var c = e.target.closest(".chip"); if (!c) return; var f = c.getAttribute("data-f"), v = c.getAttribute("data-v"); state[f] = state[f] === v ? null : v; apply(); });
    $("input", box).addEventListener("input", function (e) { state.q = e.target.value.trim().toLowerCase(); apply(); });
    apply();
  }
  builders.startable = function (box) {
    var rows = $$('#stars tr[id^="star-"]');
    rows.forEach(function (r) { var s = BYHR[+r.getAttribute("data-hr")]; r.setAttribute("data-con", s.conName); r.setAttribute("data-since", s.since); r.setAttribute("data-cls", String(s.cls)); });
    chipFilter(box, rows, [["data-con", "Constellation"], ["data-since", "Since"], ["data-cls", "Class"]], "stars");
    rows.forEach(function (r) { r.addEventListener("click", function (e) { if (e.target.closest("a, .star-ref, .gl")) return; showStar(r.querySelector("td"), +r.getAttribute("data-hr")); }); r.classList.add("clickable"); });
  };
  builders.claimtable = function (box) {
    chipFilter(box, $$('#claims tr[id^="claim-"]'), [["data-kind", "Kind"]], "claims");
  };

  /* ---- search: this page's text, the stars, the glossary and the claims */
  function norm(s) { return String(s).normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[‘’]/g, "'").toLowerCase(); }
  (function () {
    var btn = el("button", { "class": "tool search-btn", type: "button", "aria-label": "Search (press /)", title: "Search (press /)" },
      '<svg viewBox="0 0 16 16" aria-hidden="true"><circle cx="6.8" cy="6.8" r="4.6" fill="none" stroke="currentColor" stroke-width="1.6"/><path d="m10.3 10.3 4 4" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/></svg>');
    var tools = $(".topbar-tools"); tools.insertBefore(btn, tools.firstChild);
    var dlg = el("div", { "class": "search", role: "dialog", "aria-modal": "true", "aria-label": "Search", hidden: "" });
    dlg.innerHTML = '<div class="search-box"><div class="search-head"><input type="search" placeholder="Search the text, the stars, states, glossary and claims" aria-label="Search"><button type="button" class="close" aria-label="Close search">×</button></div><div class="search-res"></div><p class="search-foot"><kbd>↑</kbd> <kbd>↓</kbd> to move, <kbd>Enter</kbd> to open, <kbd>Esc</kbd> to close. Accents are ignored.</p></div>';
    document.body.appendChild(dlg);
    var input = $("input", dlg), res = $(".search-res", dlg), idx = null, hits = [], cur = -1;
    function build() {
      idx = $$(".panel .prose h3, .panel .prose p, .panel .prose li, .panel .prose td").filter(function (n) {
        return !n.closest("figure, .explore, nav, .tools") && !(n.tagName === "LI" && n.querySelector("p")) && n.textContent.trim().length > 2;
      }).map(function (n) { return { n: n, t: norm(n.textContent), raw: n.textContent.replace(/\s+/g, " ").trim() }; });
    }
    function snippet(raw, toks) {
      var t = norm(raw), i = t.indexOf(toks[0]), start = Math.max(0, i - 60), h = escHtml((start ? "…" : "") + raw.slice(start, start + 200) + (start + 200 < raw.length ? "…" : ""));
      toks.forEach(function (tk) { h = h.replace(new RegExp("(" + tk.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + ")", "gi"), "<mark>$1</mark>"); });
      return h;
    }
    function run() {
      var q = norm(input.value.trim()); hits = []; cur = -1;
      if (q.length < 2) { res.innerHTML = '<p class="muted">Type at least two letters: a star (<em>Spica</em>), a state (<em>Acre</em>), a law (<em>1971</em>), a person (<em>Prado</em>), or any words.</p>'; return; }
      if (!idx) build();
      var toks = q.split(/\s+/), h = "";
      var st = STARS.filter(function (s) { return toks.every(function (t) { return norm(s.label + " " + s.state + " " + s.conName).indexOf(t) >= 0; }); });
      if (st.length) { h += '<h3 class="sr-h">Stars · ' + st.length + "</h3>"; st.forEach(function (s) { hits.push({ kind: "star", id: s.hr }); h += '<button type="button" class="sr" data-i="' + (hits.length - 1) + '"><span class="sr-t">' + escHtml(s.label) + '</span><span class="sr-s">' + escHtml(s.state + " · " + s.conName + " · since " + s.since) + "</span></button>"; }); }
      var gl = Object.keys(D.glossary).filter(function (k) { return toks.every(function (t) { return norm(k + " " + D.glossary[k]).indexOf(t) >= 0; }); });
      if (gl.length) { h += '<h3 class="sr-h">Glossary · ' + gl.length + "</h3>"; gl.forEach(function (k) { hits.push({ kind: "gl", id: k }); h += '<button type="button" class="sr" data-i="' + (hits.length - 1) + '"><span class="sr-t">' + escHtml(k) + '</span><span class="sr-s">' + escHtml(D.glossary[k].replace(/<[^>]+>/g, "").slice(0, 140)) + "</span></button>"; }); }
      var cl = Object.keys(D.claims).filter(function (k) { return toks.every(function (t) { return norm(k + " " + D.claims[k].claim).indexOf(t) >= 0; }); });
      if (cl.length) { h += '<h3 class="sr-h">Claims · ' + cl.length + "</h3>"; cl.forEach(function (k) { hits.push({ kind: "claim", id: k }); h += '<button type="button" class="sr" data-i="' + (hits.length - 1) + '"><span class="sr-t">' + k + " · " + escHtml(D.claims[k].kind) + '</span><span class="sr-s">' + snippet(D.claims[k].claim, toks) + "</span></button>"; }); }
      var nodes = idx.filter(function (x) { return toks.every(function (t) { return x.t.indexOf(t) >= 0; }); });
      if (nodes.length) { h += '<h3 class="sr-h">In the text · ' + nodes.length + (nodes.length > 40 ? ", first 40 shown" : "") + "</h3>"; nodes.slice(0, 40).forEach(function (x) { hits.push({ kind: "node", n: x.n }); var p = x.n.closest(".panel"); h += '<button type="button" class="sr" data-i="' + (hits.length - 1) + '"><span class="sr-t">' + escHtml(p ? p.querySelector(".spine-label").textContent : "") + '</span><span class="sr-s">' + snippet(x.raw, toks) + "</span></button>"; }); }
      res.innerHTML = h || '<p class="muted">Nothing found.</p>';
    }
    function openHit(i) {
      var x = hits[i]; if (!x) return;
      close();
      if (x.kind === "node") goToNode(x.n);
      else if (x.kind === "gl") { var g = document.getElementById("gl-" + x.id.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")); if (g) goToNode(g); }
      else if (x.kind === "claim") goTo("claim-" + x.id);
      else goTo("star-" + x.id);
    }
    function open() { hidePop(); dlg.hidden = false; input.focus(); input.select(); run(); }
    function close() { dlg.hidden = true; }
    btn.addEventListener("click", open);
    $(".close", dlg).addEventListener("click", function () { close(); btn.focus(); });
    dlg.addEventListener("click", function (e) { if (e.target === dlg) close(); var b = e.target.closest(".sr"); if (b) openHit(+b.getAttribute("data-i")); });
    input.addEventListener("input", run);
    input.addEventListener("keydown", function (e) {
      var items = $$(".sr", res);
      if (e.key === "ArrowDown" || e.key === "ArrowUp") {
        e.preventDefault(); cur = Math.max(0, Math.min(items.length - 1, cur + (e.key === "ArrowDown" ? 1 : -1)));
        items.forEach(function (b, i) { b.classList.toggle("cur", i === cur); }); if (items[cur]) items[cur].scrollIntoView({ block: "nearest" });
      } else if (e.key === "Enter") { e.preventDefault(); openHit(cur >= 0 ? cur : 0); }
      else if (e.key === "Escape") { close(); btn.focus(); }
    });
    document.addEventListener("keydown", function (e) {
      var t = e.target;
      if (e.key !== "/" || e.altKey || e.ctrlKey || e.metaKey || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName) || t.isContentEditable) return;
      e.preventDefault(); open();
    });
  })();

  $$("[data-explore]").forEach(function (fig) {
    var kind = fig.getAttribute("data-explore");
    var box = fig.classList.contains("tools") ? fig : fig.querySelector(".explore-body");
    if (builders[kind]) {
      try { if (box !== fig) box.innerHTML = ""; builders[kind](box, fig); } catch (err) { box.innerHTML = "<p>This interactive figure could not be shown.</p>"; if (window.console) console.error(err); }
    }
  });
  panels.forEach(function (p) { p.querySelector(".spine").addEventListener("click", stopSound); });

  /* ------------------------------------------------------------ start */
  var start = location.hash.slice(1);
  if (start && document.getElementById(start)) goTo(start, { instant: true });
  else openPanel("cover", { instant: true, noScroll: true });
  narrow.addEventListener("change", function () { if (current) openPanel(current.id, { keepScroll: true, noScroll: true }); });
})();
