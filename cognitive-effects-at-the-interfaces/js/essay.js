/* Cognitive effects at the interfaces — web edition 1.0.0
   Plain JavaScript, no dependencies. Works from file:// and any static host.
   Without this script the page reads as one continuous essay. */
(function () {
  "use strict";

  var D = JSON.parse(document.getElementById("essay-data").textContent);
  var CITE = document.getElementById("essay-cite").textContent;
  var panels = Array.prototype.slice.call(document.querySelectorAll(".panel"));
  var ids = panels.map(function (p) { return p.id; });
  var narrow = window.matchMedia("(max-width: 899px)");
  var pop = document.getElementById("popover");
  var bar = document.querySelector(".progress span");
  var current = null;
  var store = {
    get: function (k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
    set: function (k, v) { try { localStorage.setItem(k, v); } catch (e) { /* private mode */ } }
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
      if (id !== "cover") store.set("cei-last", id);
      document.title = (id === "cover" ? "" : p.querySelector(".spine-label").textContent + " — ") + "Cognitive effects at the interfaces";
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

  /* ------------------------------------------------------------ settings, citation, resume */
  var themeBtn = $("[data-theme-toggle]");
  themeBtn.addEventListener("click", function () {
    var root = document.documentElement;
    var dark = root.dataset.theme ? root.dataset.theme === "dark" : window.matchMedia("(prefers-color-scheme: dark)").matches;
    root.dataset.theme = dark ? "light" : "dark";
    store.set("cei-theme", root.dataset.theme);
  });
  $("[data-size-toggle]").addEventListener("click", function () {
    var root = document.documentElement;
    var next = { "": "l", l: "xl", xl: "" }[root.dataset.size || ""];
    if (next) root.dataset.size = next; else delete root.dataset.size;
    store.set("cei-size", next);
  });
  $$("[data-copy-cite]").forEach(function (b) {
    b.addEventListener("click", function () {
      var done = function () { var t = b.textContent; b.textContent = "Copied"; setTimeout(function () { b.textContent = t; }, 1600); };
      if (navigator.clipboard) navigator.clipboard.writeText(CITE).then(done, function () { window.prompt("Citation", CITE); });
      else window.prompt("Citation", CITE);
    });
  });
  var last = store.get("cei-last");
  var resume = $(".resume");
  if (resume && last && last !== "cover" && document.getElementById(last)) {
    resume.hidden = false;
    resume.querySelector("a").setAttribute("href", "#" + last);
    resume.querySelector("span").textContent = document.querySelector("#" + last + " .spine-label").textContent;
  }

  /* ------------------------------------------------------------ explorables */
  var builders = {};
  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)");

  /* Figure 1: the chain */
  builders.chain = function (box) {
    var C = D.chain;
    var W = 900, H = 470, colX = [40, 335, 630], bw = 230, bh = 40;
    var ys = function (n) { var top = 92, span = 330; return Array.apply(null, Array(n)).map(function (_, i) { return top + (n === 1 ? 0 : i * span / (n - 1)); }); };
    var cols = [
      { key: "level", head: "LEVEL", sub: "where the feature lives", items: C.levels.map(function (l) { return l.name; }) },
      { key: "mech", head: "CANDIDATE MECHANISM", sub: "how it might act", items: C.mechanisms.map(function (m) { return m.name; }) },
      { key: "out", head: "OUTCOME", sub: "what is affected", items: C.outcomes.map(function (o, i) { return (i + 1) + ". " + o.name; }) }
    ];
    var svg = ['<svg class="chain-svg" viewBox="0 0 ' + W + " " + H + '" role="img" aria-label="Figure 1: five levels, six candidate mechanisms, five outcomes">'];
    var pos = cols.map(function (c) { return ys(c.items.length); });
    for (var a = 0; a < 2; a++) {
      pos[a].forEach(function (y1, i) {
        pos[a + 1].forEach(function (y2, j) {
          svg.push('<line class="edge" data-from="' + a + "-" + i + '" data-to="' + (a + 1) + "-" + j + '" x1="' + (colX[a] + bw) + '" y1="' + y1 + '" x2="' + colX[a + 1] + '" y2="' + y2 + '"/>');
        });
      });
    }
    cols.forEach(function (c, ci) {
      svg.push('<text class="colhead" x="' + colX[ci] + '" y="38">' + c.head + '</text><text class="colsub" x="' + colX[ci] + '" y="58">' + c.sub + "</text>");
      c.items.forEach(function (name, i) {
        var y = pos[ci][i];
        svg.push('<g class="node" tabindex="0" role="button" data-node="' + ci + "-" + i + '" aria-label="' + escHtml(name) + '"><rect x="' + colX[ci] + '" y="' + (y - bh / 2) + '" width="' + bw + '" height="' + bh + '" rx="6"/><text x="' + (colX[ci] + 14) + '" y="' + (y + 4.5) + '">' + escHtml(name) + "</text></g>");
      });
    });
    svg.push("</svg>");
    box.innerHTML = svg.join("") + '<div class="chain-detail" aria-live="polite"></div>';
    var detail = box.querySelector(".chain-detail");
    var nodes = $$(".node", box), edges = $$(".edge", box);

    function highlight(on, edgeTest) {
      nodes.forEach(function (n) { n.classList.toggle("on", on.indexOf(n.getAttribute("data-node")) >= 0); });
      edges.forEach(function (e) { e.classList.toggle("on", edgeTest(e.getAttribute("data-from"), e.getAttribute("data-to"))); });
    }
    function select(key) {
      var ci = +key.split("-")[0], i = +key.split("-")[1];
      if (ci === 1) {
        var m = C.mechanisms[i];
        highlight([key], function (f, t) { return t === key || f === key; });
        var name = m.name.toLowerCase();
        var claims = Object.keys(D.claims).filter(function (id) { return D.claims[id].mechanism.toLowerCase().indexOf(name) >= 0; });
        detail.innerHTML = "<h4>" + escHtml(m.name) + "</h4><p>" + escHtml(m.means) + ". Example: " + escHtml(m.example) + ".</p>" +
          (claims.length ? "<p>" + claims.length + " ledger claim" + (claims.length > 1 ? "s" : "") + " name this mechanism:</p><ul>" + claims.map(function (id) {
            var c = D.claims[id];
            return '<li><a class="claim" href="#claim-' + id + '" data-claim="' + id + '">' + id + "</a> " + gradeChip(c.grade) + " <span>" + escHtml(c.claim) + "</span></li>";
          }).join("") + "</ul>" : "<p>No ledger claim names this mechanism.</p>");
      } else if (ci === 0) {
        var l = C.levels[i];
        highlight([key], function (f) { return f === key; });
        detail.innerHTML = "<h4>" + escHtml(l.name) + "</h4><p><strong>What varies:</strong> " + escHtml(l.varies) + ".</p><p><strong>Examples from the sample:</strong> " + escHtml(l.examples.replace(/\*/g, "")) + ".</p>";
      } else {
        var o = C.outcomes[i];
        highlight([key], function (f, t) { return t === key; });
        detail.innerHTML = "<h4>" + escHtml(o.name) + "</h4><p>" + escHtml(o.means.replace(/\*/g, "")) + "</p>";
      }
    }
    function bestPath() {
      highlight(["0-0", "1-3", "2-1"], function (f, t) { return (f === "0-0" && t === "1-3") || (f === "1-3" && t === "2-1"); });
      detail.innerHTML = "<h4>The best-evidenced path</h4><p>Number-word inversion (numeral lexicon) acts through <strong>alignment</strong> on <strong>formalisation</strong>: children writing numbers from dictation make order-specific transcoding errors (claim <a class=\"claim\" href=\"#claim-A2\" data-claim=\"A2\">A2</a>, Strong). Choose any box to explore.</p>";
    }
    nodes.forEach(function (n) {
      n.addEventListener("click", function () { select(n.getAttribute("data-node")); });
      n.addEventListener("keydown", function (e) { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); select(n.getAttribute("data-node")); } });
    });
    bestPath();
  };

  /* Table A: the anatomy of four numbers */
  builders.anatomy = function (box) {
    var nums = ["11", "35", "53", "97"];
    var audioFor = { "English|11": ["en-us-eleven", "en-au-eleven"], "Turkish|11": ["tr-on-bir"], "Turkish|35": ["tr-otuz"], "Basque|11": ["eu-hamaika"] };
    function order(lang, n) {
      var L = lang.toLowerCase();
      if (/traditional/.test(L)) return { tag: "units first, base twenty", cls: "reversed", first: -1 };
      if (/basque/.test(L)) return n === "11" ? { tag: "opaque word", cls: "other", first: -1 } : { tag: "base twenty", cls: "other", first: -1 };
      if (/arabic/.test(L)) return { tag: "units first", cls: "reversed", first: 1 };
      if (/english/.test(L)) return n === "11" ? { tag: "opaque word", cls: "other", first: -1 } : { tag: "tens first", cls: "aligned", first: 0 };
      if (/russian/.test(L)) return n === "11" ? { tag: "units first (teen)", cls: "reversed", first: 1 } : { tag: "tens first", cls: "aligned", first: 0 };
      return { tag: "tens first", cls: "aligned", first: 0 };
    }
    box.innerHTML = '<div class="seg" role="group" aria-label="Choose a number">' + nums.map(function (n) { return '<button type="button" data-n="' + n + '">' + n + "</button>"; }).join("") +
      '</div><button type="button" class="anat-dictate">Dictate <span aria-hidden="true">▶</span></button><div class="anat-grid"></div><p class="anat-legend">Highlighted digit: the part of the written number that the spoken form says first. Base-twenty forms do not map onto the written tens and units, so no digit is highlighted. <strong>Dictate</strong> writes each number down in the order it is heard.</p>';
    var grid = box.querySelector(".anat-grid"), shown = "35", timers = [];
    function render(n) {
      shown = n;
      $$(".seg button", box).forEach(function (b) { b.setAttribute("aria-pressed", b.getAttribute("data-n") === n ? "true" : "false"); });
      grid.innerHTML = D.anatomy.map(function (row) {
        var f = row.forms[n] || { form: "", gloss: "" };
        var o = order(row.language, n);
        var digits = n.split("").map(function (d, i) { return '<span class="' + (i === o.first ? "first" : "") + '">' + d + "</span>"; }).join("");
        var key = (row.language.indexOf("English") === 0 ? "English" : row.language.split(",")[0]) + "|" + n;
        var aud = (audioFor[key] || []).map(function (id) {
          var it = D.audio[id];
          return it ? '<button class="say" type="button" data-audio="' + id + '" aria-label="Play ' + escHtml(it.label) + '" title="' + escHtml(it.label) + '"><svg viewBox="0 0 16 16" aria-hidden="true"><path d="M3 6h2.5L9 3v10L5.5 10H3z"/><path d="M11 5.5a3.5 3.5 0 0 1 0 5M12.6 3.8a6 6 0 0 1 0 8.4" fill="none" stroke="currentColor" stroke-width="1.3"/></svg></button>' : "";
        }).join("");
        var gloss = f.gloss.replace(/^"/, "\u201c").replace(/"$/, "\u201d").replace(/" /g, "\u201d ").replace(/ "/g, " \u201c");
        return '<div class="anat-card"><div class="anat-lang">' + escHtml(row.language) + '</div><div class="anat-form">' + escHtml(f.form) + aud + '</div><div class="anat-gloss">' + escHtml(gloss) +
          '</div><div class="anat-order"><span class="digits" aria-label="digits" data-first="' + o.first + '">' + digits + '</span><span class="anat-tag tag-' + o.cls + '">' + o.tag + "</span></div></div>";
      }).join("");
    }
    /* Dictation: the digit heard first is written first. Tens-first forms fill left to right,
       units-first forms right to left; opaque and base-twenty forms arrive whole. */
    function dictate() {
      timers.forEach(clearTimeout); timers = [];
      render(shown);
      var fast = reduce.matches, t1 = fast ? 0 : 500, t2 = fast ? 0 : 1250;
      $$(".digits", grid).forEach(function (d, k) {
        var spans = $$("span", d), first = +d.getAttribute("data-first");
        spans.forEach(function (sp) { sp.classList.add("wait"); });
        var show = function (sp, cls) { sp.classList.remove("wait"); sp.classList.add(cls); };
        var lag = fast ? 0 : k * 60;
        if (first < 0) timers.push(setTimeout(function () { spans.forEach(function (sp) { show(sp, "land-whole"); }); }, t2 + lag));
        else {
          timers.push(setTimeout(function () { show(spans[first], "land"); }, t1 + lag));
          timers.push(setTimeout(function () { show(spans[1 - first], "land"); }, t2 + lag));
        }
      });
    }
    box.querySelector(".anat-dictate").addEventListener("click", dictate);
    box.querySelector(".seg").addEventListener("click", function (e) { var b = e.target.closest("button"); if (b) { timers.forEach(clearTimeout); render(b.getAttribute("data-n")); } });
    render("35");
  };

  /* Russian: noun form after a numeral */
  builders.russian = function (box) {
    var forms = { 1: ["стол", "nominative singular", "f1"], 2: ["стола", "genitive singular", "f2"], 3: ["столов", "genitive plural", "f3"] };
    function cls(n) {
      var t = n % 100, u = n % 10;
      if (t >= 11 && t <= 14) return 3;
      if (u === 1) return 1;
      if (u >= 2 && u <= 4) return 2;
      return 3;
    }
    function why(n) {
      var t = n % 100, u = n % 10;
      if (t >= 11 && t <= 14) return "The last two digits are " + t + ", one of the exceptions 11 to 14, so the noun takes the third form.";
      return "The remainder after dividing by ten (n mod 10) is " + u + ". " + (u === 1 ? "A last digit of 1 takes the first form." : u >= 2 && u <= 4 ? "A last digit of 2 to 4 takes the second form." : "A last digit of 0 or 5 to 9 takes the third form.");
    }
    var strip = "";
    for (var i = 0; i <= 31; i++) strip += '<button type="button" class="f' + cls(i) + '" data-n="' + i + '">' + i + "</button>";
    [101, 111, 112, 121, 214, 222].forEach(function (k) { strip += '<button type="button" class="f' + cls(k) + '" data-n="' + k + '">' + k + "</button>"; });
    box.innerHTML = '<div class="ru-top"><label class="ru-input">Number <button type="button" data-d="-1" aria-label="One less">−</button><input type="number" min="0" max="9999" value="21" aria-label="Number"><button type="button" data-d="1" aria-label="One more">+</button></label>' +
      '<div class="ru-out" aria-live="polite"></div></div><p class="ru-why"></p><div class="ru-strip"></div><div class="ru-legend">' +
      [1, 2, 3].map(function (k) { return '<span><i class="f' + k + '"></i>' + forms[k][0] + " · " + forms[k][1] + "</span>"; }).join("") + "</div>";
    box.querySelector(".ru-strip").innerHTML = strip;
    var input = box.querySelector("input"), out = box.querySelector(".ru-out"), w = box.querySelector(".ru-why");
    function render() {
      var n = Math.max(0, Math.min(9999, parseInt(input.value, 10) || 0));
      var f = forms[cls(n)];
      out.innerHTML = n + ' <span class="noun">' + f[0] + "</span>";
      w.textContent = why(n) + " (" + f[1] + ")";
      $$(".ru-strip button", box).forEach(function (b) { b.classList.toggle("on", +b.getAttribute("data-n") === n); });
    }
    input.addEventListener("input", render);
    box.addEventListener("click", function (e) {
      var b = e.target.closest("button");
      if (!b) return;
      if (b.hasAttribute("data-d")) input.value = Math.max(0, (parseInt(input.value, 10) || 0) + +b.getAttribute("data-d"));
      else if (b.hasAttribute("data-n")) input.value = b.getAttribute("data-n");
      render();
    });
    render();
  };

  /* Quantifier scope: the raffle */
  builders.scope = function (box) {
    var person = '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="7" r="4"/><path d="M4 21c0-4.4 3.6-8 8-8s8 3.6 8 8z"/></svg>';
    var readings = {
      a: { nums: [7, 7, 7, 7, 7], label: "(2a) one shared number", f: "∃<i>n</i> ∀<i>s</i> Has(<i>s</i>, <i>n</i>): there is one number that every student has." },
      b: { nums: [3, 8, 1, 5, 9], label: "(2b) a number for each", f: "∀<i>s</i> ∃<i>n</i> Has(<i>s</i>, <i>n</i>): every student has some number, possibly a different one." }
    };
    box.innerHTML = '<p style="margin:0 0 .7rem">A teacher hands out raffle tickets. The sentence is true in both pictures; logic separates them by the order of ∀ (“for every”) and ∃ (“there is”).</p>' +
      '<div class="seg" role="group" aria-label="Choose a reading"><button type="button" data-r="a">' + readings.a.label + '</button><button type="button" data-r="b">' + readings.b.label + "</button></div>" +
      '<div class="scope-row">' + [1, 2, 3, 4, 5].map(function (i) { return '<div class="student">' + person + '<span class="ticket">7</span>Student ' + i + "</div>"; }).join("") + "</div>" +
      '<div class="scope-formula" aria-live="polite"></div>';
    var tickets = $$(".ticket", box), formula = box.querySelector(".scope-formula");
    function render(r) {
      $$(".seg button", box).forEach(function (b) { b.setAttribute("aria-pressed", b.getAttribute("data-r") === r ? "true" : "false"); });
      tickets.forEach(function (t, i) {
        t.classList.add("flip");
        setTimeout(function () { t.textContent = readings[r].nums[i]; t.classList.remove("flip"); }, 150 + i * 40);
      });
      formula.innerHTML = readings[r].f;
    }
    box.querySelector(".seg").addEventListener("click", function (e) { var b = e.target.closest("button"); if (b) render(b.getAttribute("data-r")); });
    render("a");
  };

  /* ---- drawing helpers shared by the notation figures. Strokes carry their
     length (--len) and a delay (--d) so a place that changes can draw itself in;
     with reduced motion the animation is off and the strokes simply appear. */
  function ln(x1, y1, x2, y2, i, cls) {
    var len = Math.round(Math.sqrt((x2 - x1) * (x2 - x1) + (y2 - y1) * (y2 - y1)) + 1);
    return '<line class="ink' + (cls ? " " + cls : "") + '" x1="' + x1 + '" y1="' + y1 + '" x2="' + x2 + '" y2="' + y2 + '" style="--len:' + len + ";--d:" + (i || 0) * 0.05 + 's"/>';
  }
  function blob(d, i) { return '<path class="blob" d="' + d + '" style="--d:' + (i || 0) * 0.05 + 's"/>'; }
  function hit(x, y, w, h) { return '<rect class="hit" x="' + x + '" y="' + y + '" width="' + w + '" height="' + h + '"/>'; }
  function gap(x, y, w, h) { return '<rect class="gap" x="' + x + '" y="' + y + '" width="' + w + '" height="' + h + '" rx="4"/>'; }
  function digitsOf(n, base) { var out = []; do { out.unshift(n % base); n = Math.floor(n / base); } while (n > 0); return out; }

  /* Kaktovik digit after the description in Section 10: strokes for fives above,
     strokes for units below; drawn in a 120 x 140 box. */
  function kakGlyph(v) {
    var fives = Math.floor(v / 5), units = v % 5, s = [], k = 0;
    if (v === 0) return '<path class="ink" d="M38 70 L60 48 L82 70 L60 92 Z" style="--len:130;--d:0s"/>';
    for (var i = 0; i < fives; i++) s.push(ln(26, 24 + i * 15, 94, 24 + i * 15, k++));
    for (var j = 0; j < units; j++) { var x = 60 - (units - 1) * 9 + j * 18; s.push(ln(x, fives ? 76 : 44, x, fives ? 118 : 96, k++)); }
    return s.join("");
  }
  /* A row of Kaktovik digits; returns svg markup and width at the given scale. */
  function kakRow(ds, scale, changed) {
    var w = 120 * scale, out = [];
    ds.forEach(function (d, i) {
      out.push('<g data-p="' + (ds.length - 1 - i) + '" class="place' + (changed && changed(i) ? " new" : "") + '" transform="translate(' + (i * w) + ' 0) scale(' + scale + ')">' +
        '<rect class="cell" x="4" y="4" width="112" height="132" rx="8"/>' + kakGlyph(d) + "</g>");
    });
    return { svg: out.join(""), w: ds.length * w, h: 140 * scale };
  }

  /* Babylonian: base sixty, tens wedges then unit wedges, an empty place left as a gap. */
  function babPlace(d, x0) {
    var t = Math.floor(d / 10), u = d % 10, s = [], k = 0, x, y;
    if (d === 0) return { svg: gap(x0, 14, 26, 72), w: 26 };
    for (var i = 0; i < t; i++) {
      x = x0 + (i % 3) * 17; y = 26 + Math.floor(i / 3) * 30;
      s.push(blob("M" + x + " " + y + "l8 -5v10z", k), ln(x + 6, y - 4, x + 15, y - 11, k), ln(x + 6, y + 4, x + 15, y + 11, k)); k++;
    }
    var ux = x0 + (t ? Math.min(t, 3) * 17 + 6 : 0);
    for (var j = 0; j < u; j++) {
      x = ux + (j % 3) * 12 + 5; y = 10 + Math.floor(j / 3) * 28;
      s.push(blob("M" + (x - 5) + " " + y + "h10l-5 7z", k), ln(x, y + 6, x, y + 24, k)); k++;
    }
    return { svg: s.join(""), w: (t ? Math.min(t, 3) * 17 + 6 : 0) + (u ? Math.min(u, 3) * 12 : 0) };
  }
  /* Maya: base twenty, written top to bottom; bars for five, dots for one, a shell for zero. */
  function mayaPlace(d, y0) {
    var b = Math.floor(d / 5), c = d % 5, s = [], k = 0;
    if (d === 0) return '<path class="ink shell" d="M14 ' + (y0 + 26) + 'q18 -16 36 0q-18 14 -36 0zM20 ' + (y0 + 26) + 'q12 -6 24 0M24 ' + (y0 + 31) + 'q8 -3 16 0" style="--len:120;--d:0s"/>';
    for (var i = 0; i < b; i++) s.push(ln(8, y0 + 40 - i * 11, 56, y0 + 40 - i * 11, k++, "bar"));
    var dy = y0 + 40 - b * 11 - (b ? 1 : -2);
    for (var j = 0; j < c; j++) { var cx = 32 - (c - 1) * 6.5 + j * 13; s.push(blob("M" + (cx - 4.5) + " " + dy + "a4.5 4.5 0 1 0 9 0a4.5 4.5 0 1 0 -9 0", k++)); }
    return s.join("");
  }
  /* Chinese rod numerals: units upright, tens lying down, alternating by place; an empty place left as a gap. */
  function rodPlace(d, x0, upright) {
    var s = [], k = 0, i;
    if (d === 0) return gap(x0 + 4, 8, 36, 52);
    if (upright) {
      var n = d > 5 ? d - 5 : d, xs = 22 - (n - 1) * 3.5;
      if (d > 5) s.push(ln(x0 + 6, 12, x0 + 38, 12, k++));
      for (i = 0; i < n; i++) s.push(ln(x0 + xs + i * 7, d > 5 ? 20 : 12, x0 + xs + i * 7, 56, k++));
    } else {
      var m = d > 5 ? d - 5 : d, top = d > 5 ? 34 : 34 - (m - 1) * 4;
      if (d > 5) s.push(ln(x0 + 22, 8, x0 + 22, 28, k++));
      for (i = 0; i < m; i++) s.push(ln(x0 + 6, top + i * 7, x0 + 38, top + i * 7, k++));
    }
    return s.join("");
  }

  /* Section 12, question 15: one number in five notations */
  builders.notation = function (box) {
    var MAX = 9999, prev = {}, timer = null;
    var systems = [
      { id: "ha", name: "Hindu-Arabic", base: 10, note: "Ten digits and a zero; shown also in Devanagari." },
      { id: "rod", name: "Chinese rod numerals", base: 10, note: "Units upright, tens lying down, alternating by place." },
      { id: "bab", name: "Babylonian", base: 60, note: "Base sixty, built from tens and units inside each place." },
      { id: "maya", name: "Maya", base: 20, note: "Base twenty, read from the top down." },
      { id: "kak", name: "Kaktovik Iñupiaq", base: 20, note: "Base twenty, each digit built from fives and units." }
    ];
    var presets = [11, 35, 53, 97, 60, 400, 3600, 2026];
    box.innerHTML = '<div class="nt-top"><label class="ru-input">Number <button type="button" data-d="-1" aria-label="One less">−</button><input type="number" min="1" max="' + MAX + '" value="35" aria-label="Number from 1 to ' + MAX + '"><button type="button" data-d="1" aria-label="One more">+</button></label>' +
      '<button type="button" class="nt-count" aria-pressed="false">Count up <span aria-hidden="true">▶</span></button>' +
      '<div class="nt-presets" role="group" aria-label="Examples">' + presets.map(function (p) { return '<button type="button" data-n="' + p + '">' + p + "</button>"; }).join("") + "</div></div>" +
      '<input class="nt-range" type="range" min="1" max="' + MAX + '" value="35" aria-label="Number">' +
      '<p class="nt-hint">Try 60, 400 and 3600: each is a round number in one system and not in the others. Hover a place to see its value in the sum.</p>' +
      '<div class="nt-grid">' + systems.map(function (y) {
        return '<div class="nt-card" data-sys="' + y.id + '"><div class="nt-head"><span class="nt-name">' + y.name + '</span><span class="nt-base">base ' + y.base + '</span></div><div class="nt-glyph"></div><div class="nt-sum" aria-live="polite"></div><div class="nt-note">' + y.note + "</div></div>";
      }).join("") + "</div>" + worldStrip();
    var input = box.querySelector('input[type="number"]'), range = box.querySelector(".nt-range"), countBtn = box.querySelector(".nt-count");

    function worldStrip() {
      var ids = ["rods", "maya-red", "nishapur"].filter(function (id) { return D.figures && D.figures[id]; });
      if (!ids.length) return "";
      return '<div class="nt-world"><p class="label">In the world</p><div class="nt-world-row">' + ids.map(function (id) {
        var f = D.figures[id];
        return '<figure><img src="' + escHtml(f.file) + '" alt="' + escHtml(f.caption) + '" loading="lazy"><figcaption>' + escHtml(f.caption) + ' · <a href="#credits">credit</a></figcaption></figure>';
      }).join("") + "</div></div>";
    }
    function sum(ds, base) {
      return ds.map(function (d, i) {
        var pv = Math.pow(base, ds.length - 1 - i);
        return '<span data-p="' + (ds.length - 1 - i) + '">' + (pv === 1 ? d : d + " × " + pv.toLocaleString("en-GB")) + "</span>";
      }).join(" + ");
    }
    function changedFn(id, ds) {
      var old = prev[id] || [];
      prev[id] = ds.slice();
      return function (i) { var p = ds.length - 1 - i, o = old.length - 1 - p; return o < 0 || old[o] !== ds[i]; };
    }
    function render(n) {
      n = Math.max(1, Math.min(MAX, n | 0));
      input.value = n; range.value = n;
      systems.forEach(function (y) {
        var card = box.querySelector('[data-sys="' + y.id + '"]'), g = card.querySelector(".nt-glyph");
        var ds = digitsOf(n, y.base), ch = changedFn(y.id, ds), html = "";
        if (y.id === "ha") {
          html = '<div class="nt-ha">' + ds.map(function (d, i) {
            return '<span data-p="' + (ds.length - 1 - i) + '" class="place' + (ch(i) ? " new" : "") + '"><b>' + d + "</b><i>" + String.fromCharCode(0x966 + d) + "</i></span>";
          }).join("") + "</div>";
        } else if (y.id === "rod") {
          html = '<svg viewBox="0 0 ' + ds.length * 46 + ' 64" style="width:' + ds.length * 46 * 0.9 + 'px" aria-hidden="true">' + ds.map(function (d, i) {
            var p = ds.length - 1 - i;
            return '<g data-p="' + p + '" class="place' + (ch(i) ? " new" : "") + '">' + hit(i * 46, 0, 46, 64) + rodPlace(d, i * 46, p % 2 === 0) + "</g>";
          }).join("") + "</svg>";
        } else if (y.id === "bab") {
          var x = 0, parts = ds.map(function (d, i) {
            var r = babPlace(d, x), out = '<g data-p="' + (ds.length - 1 - i) + '" class="place' + (ch(i) ? " new" : "") + '">' + hit(x - 6, 0, r.w + 12, 100) + r.svg + "</g>";
            x += r.w + 20; return out;
          });
          html = '<svg viewBox="-2 0 ' + (x - 16) + ' 100" style="width:' + (x - 16) * 0.82 + 'px" aria-hidden="true">' + parts.join("") + "</svg>";
        } else if (y.id === "maya") {
          html = '<svg viewBox="0 0 64 ' + ds.length * 56 + '" style="height:' + ds.length * 56 * 0.72 + 'px" aria-hidden="true">' + ds.map(function (d, i) {
            return '<g data-p="' + (ds.length - 1 - i) + '" class="place' + (ch(i) ? " new" : "") + '">' + hit(0, i * 56, 64, 56) + (i ? '<line class="sep" x1="4" x2="60" y1="' + i * 56 + '" y2="' + i * 56 + '"/>' : "") + mayaPlace(d, i * 56) + "</g>";
          }).join("") + "</svg>";
        } else {
          var row = kakRow(ds, 0.42, ch);
          html = '<svg viewBox="0 0 ' + row.w + " " + row.h + '" style="width:' + row.w + 'px" aria-hidden="true">' + row.svg + "</svg>";
        }
        g.innerHTML = html;
        card.querySelector(".nt-sum").innerHTML = "= " + sum(ds, y.base);
      });
    }
    function stop() { clearInterval(timer); timer = null; countBtn.setAttribute("aria-pressed", "false"); countBtn.firstChild.textContent = "Count up "; }
    countBtn.addEventListener("click", function () {
      if (timer) return stop();
      countBtn.setAttribute("aria-pressed", "true"); countBtn.firstChild.textContent = "Stop ";
      timer = setInterval(function () { var n = +input.value + 1; if (n > MAX) return stop(); render(n); }, reduce.matches ? 400 : 160);
    });
    input.addEventListener("input", function () { if (input.value) render(+input.value); });
    range.addEventListener("input", function () { render(+range.value); });
    box.addEventListener("click", function (e) {
      var b = e.target.closest("button");
      if (!b || b === countBtn) return;
      if (b.hasAttribute("data-d")) render(+input.value + +b.getAttribute("data-d"));
      else if (b.hasAttribute("data-n")) { stop(); render(+b.getAttribute("data-n")); }
    });
    box.addEventListener("mouseover", function (e) {
      var t = e.target.closest("[data-p]"), card = e.target.closest(".nt-card");
      $$(".hl", box).forEach(function (el) { el.classList.remove("hl"); });
      if (t && card) $$('[data-p="' + t.getAttribute("data-p") + '"]', card).forEach(function (el) { el.classList.add("hl"); });
    });
    render(35);
  };

  /* Kaktovik: digits and place value in base twenty */
  builders.kaktovik = function (box) {
    var prev = [];
    box.innerHTML = '<div class="kak"><svg aria-hidden="true"></svg><div><div class="kak-n" aria-live="polite"></div><div class="kak-sum"></div>' +
      '<input type="range" min="0" max="399" value="18" aria-label="Number from 0 to 399"><p class="kak-hint">Below 20 a number is one digit. From 20, a second digit counts the twenties, as the Iñupiaq words do.</p></div></div>';
    var svg = box.querySelector("svg"), range = box.querySelector("input"), n = box.querySelector(".kak-n"), sum = box.querySelector(".kak-sum");
    function render() {
      var v = +range.value, ds = digitsOf(v, 20), old = prev;
      prev = ds.slice();
      var row = kakRow(ds, 1, function (i) { var o = old.length - ds.length + i; return o < 0 || old[o] !== ds[i]; });
      svg.setAttribute("viewBox", "0 0 " + row.w + " 140");
      svg.style.width = row.w + "px";
      svg.innerHTML = row.svg;
      n.textContent = v;
      var parts = function (d) { var f = Math.floor(d / 5), u = d % 5; return d === 0 ? "zero" : (f ? f + " × five" : "") + (f && u ? " + " : "") + (u ? u + " unit" + (u > 1 ? "s" : "") : ""); };
      sum.innerHTML = ds.length === 1 ? (v === 0 ? "Zero has its own symbol (shown schematically)." : parts(v)) +
        (v === 18 ? ' — Iñupiaq <em>akimiaq piŋasut</em>, “fifteen three”' : "") :
        ds[0] + " twent" + (ds[0] > 1 ? "ies" : "y") + " + " + ds[1] + " &nbsp;<span class=\"kak-parts\">(" + parts(ds[0]) + " | " + parts(ds[1]) + ")</span>";
    }
    range.addEventListener("input", render);
    render();
  };

  /* Kaktovik long division, worked step by step: 30,561 ÷ 61 = 501 */
  builders.kakdiv = function (box) {
    var C = 0.36, W = 120 * C, H = 140 * C, X0 = 4, LINE = 6;
    // rows: [step shown from, first column, digits, kind]
    var rows = [
      [0, 0, [3, 16, 8, 1], "num"],
      [1, 0, [3, 1], "sub"], [1, 1, [15, 8], "rem"],
      [2, 1, [15, 5], "sub"], [2, 2, [3, 1], "rem"],
      [3, 2, [3, 1], "sub"], [3, 3, [0], "rem"]
    ];
    var quotient = [[1, 1], [2, 5], [3, 1]];  // [column, digit], one per step
    var text = [
      "30,561 ÷ 61 in base twenty. The dividend has four Kaktovik digits (3, 16, 8, 1: 3 × 8,000 + 16 × 400 + 8 × 20 + 1) and the divisor two (3, 1: 3 × 20 + 1).",
      "Step 1. The first two digits make 3 × 20 + 16 = 76. The divisor goes into 76 once: write 1 above, subtract 61, leaving 15, and bring down the next digit.",
      "Step 2. 15 × 20 + 8 = 308. The divisor goes into 308 five times (5 × 61 = 305, written 15, 5): write 5 above, subtract, leaving 3, and bring down the last digit.",
      "Step 3. 3 × 20 + 1 = 61, the divisor itself, so it goes in once with nothing left. The quotient is 1, 5, 1 in base twenty: 400 + 5 × 20 + 1 = 501."
    ];
    var step = 0, seen = 0;
    box.innerHTML = '<div class="kd"><svg aria-hidden="true"></svg><div class="kd-side"><p class="kd-text" aria-live="polite"></p><div class="kd-btns"><button type="button" data-s="-1">← Back</button><button type="button" data-s="1">Next step →</button></div></div></div>';
    var svg = box.querySelector("svg"), txt = box.querySelector(".kd-text");
    function render() {
      var out = [], top = H + 18, divW = 2 * W + 26, x0 = X0 + divW;
      // divisor and bracket
      out.push('<g class="place" transform="translate(' + X0 + " " + top + ')">' + kakRow([3, 1], C).svg + "</g>");
      out.push('<path class="frame" d="M' + (divW - 10) + " " + (top + H + 6) + " q10 " + (-H / 2) + " 0 " + (-H - 6) + " h" + (4 * W + 10) + '"/>');
      quotient.forEach(function (q, i) {
        if (step > i) out.push('<g class="place' + (step === i + 1 && seen < step ? " new" : "") + '" transform="translate(' + (x0 + q[0] * W) + ' 0)">' + kakRow([q[1]], C).svg + "</g>");
      });
      var y = top;
      rows.forEach(function (r) {
        if (r[0] > step) return;
        var g = kakRow(r[2], C);
        out.push('<g class="place' + (r[0] === step && seen < step ? " new" : "") + (r[0] === step && step ? " cur" : "") + '" transform="translate(' + (x0 + r[1] * W) + " " + y + ')">' + g.svg + "</g>");
        if (r[3] === "sub") out.push('<line class="rule" x1="' + (x0 + r[1] * W - 4) + '" x2="' + (x0 + (r[1] + r[2].length) * W + 4) + '" y1="' + (y + H + LINE / 2) + '" y2="' + (y + H + LINE / 2) + '"/><text class="minus" x="' + (x0 + r[1] * W - 14) + '" y="' + (y + H / 2 + 5) + '">−</text>');
        y += H + LINE;
      });
      var w = x0 + 4 * W + 8, h = top + 7 * (H + LINE);
      svg.setAttribute("viewBox", "0 0 " + w + " " + h);
      svg.style.width = w + "px";
      svg.innerHTML = out.join("");
      txt.textContent = text[step];
      seen = Math.max(seen, step);
      box.querySelector('[data-s="-1"]').disabled = step === 0;
      box.querySelector('[data-s="1"]').disabled = step === 3;
    }
    box.addEventListener("click", function (e) {
      var b = e.target.closest("[data-s]");
      if (!b) return;
      step = Math.max(0, Math.min(3, step + +b.getAttribute("data-s")));
      if (+b.getAttribute("data-s") < 0) seen = step;
      render();
    });
    render();
  };

  /* Section 8: the rotation task, top-down */
  builders.rotation = function (box) {
    var objs = [["sq", "M-9 -9h18v18h-18z"], ["ci", "M-10 0a10 10 0 1 0 20 0a10 10 0 1 0 -20 0"], ["tr", "M0 -11l11 19h-22z"]];
    var T1 = 70, T2 = 250, xs = [130, 190, 250];
    box.innerHTML = '<div class="rot"><svg viewBox="0 0 380 320" role="img" aria-label="Top-down view of the rotation task: two tables, a person between them, and a fixed uphill direction">' +
      '<defs><marker id="rot-arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0 0L10 5L0 10z"/></marker></defs>' +
      '<rect class="table" x="100" y="' + (T1 - 26) + '" width="180" height="52" rx="8"/><text class="lbl" x="190" y="' + (T1 - 34) + '">Table 1: the row as seen</text>' +
      '<rect class="table" x="100" y="' + (T2 - 26) + '" width="180" height="52" rx="8"/><text class="lbl" x="190" y="' + (T2 + 44) + '">Table 2: the row rebuilt</text>' +
      '<line class="axis" x1="44" y1="160" x2="336" y2="160" marker-start="url(#rot-arrow)" marker-end="url(#rot-arrow)"/><text class="lbl ax" x="40" y="150" text-anchor="start">downhill</text><text class="lbl ax" x="340" y="150" text-anchor="end">uphill</text>' +
      objs.map(function (o, i) { return '<g class="obj o-' + o[0] + '" transform="translate(' + xs[i] + " " + T1 + ')"><path d="' + o[1] + '"/></g>'; }).join("") +
      objs.map(function (o, i) { return '<g class="obj ghost o-' + o[0] + '" data-i="' + i + '" style="transform:translate(' + xs[i] + "px," + T1 + 'px)"><path d="' + o[1] + '"/></g>'; }).join("") +
      '<g class="viewer" style="transform:translate(190px,160px)"><g class="turn"><circle r="15"/><path class="nose" d="M-7 -12 L0 -24 L7 -12"/></g></g><text class="hand hw" x="148" y="194">your left</text><text class="hand he" x="232" y="194">your right</text>' +
      '</svg><div class="rot-side"><div class="rot-btns"><button type="button" data-a="turn">1. Turn around</button><button type="button" data-a="rel" disabled>2a. Rebuild by left and right</button><button type="button" data-a="abs" disabled>2b. Rebuild by uphill and downhill</button><button type="button" data-a="reset">Start again</button></div><p class="rot-text" aria-live="polite"></p></div></div>';
    var turn = box.querySelector(".turn"), ghosts = $$(".ghost", box), txt = box.querySelector(".rot-text"), turned = false;
    var say = {
      start: "You face Table 1. The square is on your left and towards downhill; the triangle is on your right and towards uphill.",
      turn: "You have turned 180 degrees to face Table 2. Your left now points uphill. Rebuild the row: which description do you keep?",
      rel: "Kept by left and right: the square is still on your left, so by the fixed bearings the row is reversed. Dutch speakers tended to rebuild the row this way.",
      abs: "Kept by uphill and downhill: the square is still towards downhill, so it is now on your right. Tzeltal speakers tended to rebuild the row this way."
    };
    function hands(back) {
      box.querySelector(".hw").textContent = back ? "your right" : "your left";
      box.querySelector(".he").textContent = back ? "your left" : "your right";
    }
    function place(order) {
      ghosts.forEach(function (g, i) { g.style.transform = "translate(" + order[i] + "px," + T2 + "px)"; g.classList.add("on"); });
    }
    function reset() {
      turned = false; turn.classList.remove("back"); hands(false);
      ghosts.forEach(function (g, i) { g.classList.remove("on"); g.style.transform = "translate(" + xs[i] + "px," + T1 + "px)"; });
      $$("[data-a=rel],[data-a=abs]", box).forEach(function (b) { b.disabled = true; b.setAttribute("aria-pressed", "false"); });
      txt.textContent = say.start;
    }
    box.addEventListener("click", function (e) {
      var b = e.target.closest("[data-a]");
      if (!b) return;
      var a = b.getAttribute("data-a");
      if (a === "reset") return reset();
      if (a === "turn") { turned = true; turn.classList.add("back"); hands(true); $$("[data-a=rel],[data-a=abs]", box).forEach(function (x) { x.disabled = false; }); txt.textContent = say.turn; return; }
      if (!turned) return;
      $$("[data-a=rel],[data-a=abs]", box).forEach(function (x) { x.setAttribute("aria-pressed", x === b ? "true" : "false"); });
      // Facing Table 2 (south), the viewer's left is uphill (east). Relative keeps the square on the left; absolute keeps it downhill (west).
      place(a === "rel" ? [xs[2], xs[1], xs[0]] : xs.slice());
      txt.textContent = say[a];
    });
    reset();
  };

  /* Evidence ledger filters */
  builders.ledger = function (box) {
    var rows = $$('tr[id^="claim-"]');
    if (!rows.length) return;
    var grades = ["Strong", "Moderate", "Suggestive", "Contested", "Open"];
    var domains = { A: "Arithmetic", L: "Logic", G: "Geometry and space", N: "Notation" };
    var count = function (attr, v) { return rows.filter(function (r) { return r.getAttribute(attr) === v; }).length; };
    box.innerHTML = '<div class="row"><span>Grade</span>' + grades.map(function (g) {
      return '<button type="button" class="chip" data-f="grade" data-v="' + g + '" aria-pressed="false"><span class="dot" style="background:var(--g-' + g.toLowerCase() + ')"></span>' + g + '<span class="n">' + count("data-grade", g) + "</span></button>";
    }).join("") + '</div><div class="row"><span>Domain</span>' + Object.keys(domains).map(function (k) {
      return '<button type="button" class="chip" data-f="domain" data-v="' + k + '" aria-pressed="false">' + domains[k] + '<span class="n">' + count("data-domain", k) + "</span></button>";
    }).join("") + '</div><div class="row"><span>Search</span><input type="search" placeholder="e.g. transparency, Pirahã, Mandarin" aria-label="Search the ledger"> <span class="ledger-count" aria-live="polite"></span></div>';
    rows.forEach(function (r) {
      var g = r.getAttribute("data-grade");
      var cells = r.querySelectorAll("td");
      cells.forEach(function (td) { if (td.textContent.trim() === g) td.innerHTML = gradeChip(g); });
    });
    var state = { grade: null, domain: null, q: "" };
    var counter = box.querySelector(".ledger-count");
    function apply() {
      var shown = 0;
      rows.forEach(function (r) {
        var ok = (!state.grade || r.getAttribute("data-grade") === state.grade) && (!state.domain || r.getAttribute("data-domain") === state.domain) &&
          (!state.q || r.textContent.toLowerCase().indexOf(state.q) >= 0);
        r.classList.toggle("hidden-row", !ok);
        if (ok) shown++;
      });
      counter.textContent = "Showing " + shown + " of " + rows.length + " claims";
      $$(".chip", box).forEach(function (c) { c.setAttribute("aria-pressed", state[c.getAttribute("data-f")] === c.getAttribute("data-v") ? "true" : "false"); });
    }
    box.addEventListener("click", function (e) {
      var c = e.target.closest(".chip");
      if (!c) return;
      var f = c.getAttribute("data-f"), v = c.getAttribute("data-v");
      state[f] = state[f] === v ? null : v;
      apply();
    });
    box.querySelector("input").addEventListener("input", function (e) { state.q = e.target.value.trim().toLowerCase(); apply(); });
    apply();
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
