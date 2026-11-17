/* Catalogues of Scientific Methods and Epistemological Science, and their Register — web edition 0.0.8
   One script for the three pages of one dataset. Plain JavaScript, no dependencies.
   Works from file:// and any static host. Without this script each page reads as one
   continuous document.

   Modules (each a self-contained block, reusable by copying):
     frame       spines, drawers, links, keyboard, popover, glossary, settings, bookmark
     record      M1 record layer and M2 codes with their reasons ("why this code")
     fingerprint M4 small glyphs of a work's codes beside each entry heading
     trail       M12 entries opened in this visit; remembered only when the reader asks
     field       M3 every work as one mark, with lenses (M5) and the 30 shared works outlined
     matrix, concordance, sensitivity, axes, families, questions   (Catalogue of Scientific Methods)
     threads, modes                                                (Catalogue of Epistemological Science)
     compare     M11 two to four works side by side
     genealogy   M8 the register's links over time (Register; each catalogue's own links)
     browse      the works by any facet: section, tradition, period, codes, type, check
     sections, tally, sequence, ledger, search, statuses */
(function () {
  "use strict";

  var D = JSON.parse(document.getElementById("cat-data").textContent);
  var CITE = document.getElementById("cat-cite").textContent;
  var DOC = D.doc, R = D.reg, SLUG = D.slugs[DOC];
  var panels = Array.prototype.slice.call(document.querySelectorAll(".panel"));
  var ids = panels.map(function (p) { return p.id; });
  var narrow = window.matchMedia("(max-width: 899px)");
  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)");
  var pop = document.getElementById("popover");
  var bar = document.querySelector(".progress span");
  var current = null;
  var TITLE = D.names[DOC];
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

  /* ------------------------------------------------------------ the register */
  var AX = D.axes;                       /* [name, pole A, pole B] */
  var POLE = { A: "a", B: "b", X: "x", "-": "na" };
  var GROUPS = { carrier: ["mind", "experience", "language", "body"], arrangement: ["practice", "community", "institution", "network", "system"],
                 position: ["relation", "situated", "tradition", "plural"] };
  var LOCG = {};
  Object.keys(GROUPS).forEach(function (g) { GROUPS[g].forEach(function (c) { LOCG[c] = g; }); });
  var ALL = Object.keys(R).sort();
  function inM(id) { return R[id].m.indexOf("M") >= 0; }
  function inE(id) { return R[id].m.indexOf("E") >= 0; }
  function inDoc(id) { return DOC === "R" || R[id].m.indexOf(DOC) >= 0; }
  function hrefFor(id) {
    if (inDoc(id)) return "#" + id;
    return D.slugs[R[id].m.charAt(0)] + ".html#" + id;
  }
  function md(s) { return escHtml(s).replace(/\*([^*]+)\*/g, "<em>$1</em>"); }
  function linkIds(html) {
    return html.replace(/(^|[^\w-])(R-\d{4})(?![\w-])/g, function (m, pre, id) {
      return R[id] ? pre + '<a class="rid" href="' + hrefFor(id) + '" data-rid="' + id + '">' + id + "</a>" : m;
    }).replace(/(^|[^\w-])(C-\d{2})(?![\w-])/g, function (m, pre, id) {
      return D.claims[id] ? pre + '<a class="cid" href="' + claimHref(id) + '" data-cid="' + id + '">' + id + "</a>" : m;
    });
  }
  function claimHref(id) {
    var c = D.claims[id];
    return DOC === "R" || c.maps.indexOf(DOC) >= 0 ? "#" + id : D.slugs[c.maps[0]] + ".html#" + id;
  }
  /* "Popper 1934", "Collins & Evans 2007", "Oreskes et al. 1994", as the catalogues cite them */
  function shortName(id) {
    var w = R[id], a = w.a.replace(/\s*\(Eds?\.\)/, "");
    if (a.indexOf(",") < 0) return a + " " + w.y;
    var parts = a.split(/,\s*(?:&\s*)?|\s+&\s+/).filter(Boolean);
    var n = Math.ceil(parts.length / 2);
    var name = n > 2 || /et al\./.test(a) ? parts[0] + " et al." : n === 2 ? parts[0] + " & " + parts[2] : parts[0];
    return name + " " + w.y;
  }
  function ridChip(id) { return '<a class="rid" href="' + hrefFor(id) + '" data-rid="' + id + '">' + escHtml(shortName(id)) + ", " + id + "</a>"; }
  function poleName(i, c) { return { A: AX[i][1], B: AX[i][2], X: AX[i][1] + " and " + AX[i][2].toLowerCase(), "-": "n/a" }[c]; }
  function knowing(id) { var k = R[id].kn.split("|"); return { loc: k[0], who: k[1], how: k[2] }; }
  function fpM(id, big) {
    var s = R[id].ax, h = "";
    for (var i = 0; i < 6; i++) h += '<i class="c-' + POLE[s.charAt(i)] + '" title="' + escHtml(AX[i][0] + ": " + poleName(i, s.charAt(i))) + '"></i>';
    return '<span class="fp fp-m' + (big ? " big" : "") + '" role="img" aria-label="Codes on the six axes: ' + escHtml(s.split("").map(function (c, i) { return poleName(i, c); }).join(", ")) + '">' + h + "</span>";
  }
  function fpE(id) {
    var k = knowing(id);
    return '<span class="fp fp-e" role="img" aria-label="Location ' + k.loc + ", knower " + k.who + ", decision " + k.how + '">' +
      '<b class="lg-' + LOCG[k.loc] + '">' + k.loc + "</b><b>" + k.who + "</b><b>" + k.how + "</b></span>";
  }

  /* ------------------------------------------------------------ frame: drawers */
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
      place(id);
    }
    if (narrow.matches && !opts.noScroll) {
      p.scrollIntoView({ block: "start", behavior: opts.instant ? "auto" : "smooth" });
    } else if (!narrow.matches && !opts.noShelfScroll) {
      var shelf = document.getElementById("shelf");
      var left = p.offsetLeft;
      if (left < shelf.scrollLeft || left + 300 > shelf.scrollLeft + shelf.clientWidth) shelf.scrollTo({ left: Math.max(0, left - 40 * 2), behavior: "smooth" });
    }
    if (opts.focus) {
      var h = p.querySelector("h1, h2");
      if (h) { h.setAttribute("tabindex", "-1"); h.focus({ preventScroll: true }); }
    }
    updateProgress();
    hidePop();
    p.dispatchEvent(new CustomEvent("panelopen"));
  }
  function setHash(h) { if (location.hash !== "#" + h) history.replaceState(null, "", "#" + h); }
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
      if (/^R-\d{4}$/.test(target)) place(panel.id, target);
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

  /* ------------------------------------------------------------ frame: links and keyboard */
  document.addEventListener("click", function (e) {
    var a = e.target.closest("a");
    if (!a || e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
    if (a.classList.contains("demo")) { e.preventDefault(); return; }
    if (a.hasAttribute("data-rid") && !a.closest(".popover .pop-actions")) { e.preventDefault(); showRecord(a, a.getAttribute("data-rid")); return; }
    if (a.hasAttribute("data-cid") && !a.closest(".popover .pop-actions")) { e.preventDefault(); showClaim(a, a.getAttribute("data-cid")); return; }
    var href = a.getAttribute("href") || "";
    if (href.charAt(0) === "#" && href.length > 1) {
      e.preventDefault();
      hidePop();
      goTo(href.slice(1), { focus: a.closest(".panel-nav") != null });
    }
  });
  window.addEventListener("hashchange", function () { goTo(location.hash.slice(1)); });
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

  /* ------------------------------------------------------------ frame: popover */
  var popAnchor = null;
  function showPop(anchor, html, wide) {
    if (popAnchor === anchor && !pop.hidden) { hidePop(true); return; }
    if (popAnchor) popAnchor.removeAttribute("aria-expanded");
    popAnchor = anchor;
    anchor.setAttribute("aria-expanded", "true");
    pop.className = "popover" + (wide ? " wide" : "");
    pop.innerHTML = '<button class="close" type="button" aria-label="Close">×</button>' + html;
    pop.hidden = false;
    pop.scrollTop = 0;
    if (narrow.matches && wide) {
      pop.style.left = ""; pop.style.top = "";
    } else {
      var r = anchor.getBoundingClientRect();
      var pw = pop.offsetWidth, ph = pop.offsetHeight;
      var left = Math.min(Math.max(8, r.left + r.width / 2 - pw / 2), window.innerWidth - pw - 8);
      var top = r.bottom + 8;
      if (top + ph > window.innerHeight - 8) top = Math.max(8, r.top - ph - 8);
      if (top + ph > window.innerHeight - 8) top = Math.max(8, window.innerHeight - ph - 8);
      pop.style.left = left + "px";
      pop.style.top = top + "px";
    }
    pop.querySelector(".close").addEventListener("click", function () { hidePop(true); });
  }
  function hidePop(refocus) {
    if (pop.hidden) return;
    pop.hidden = true;
    if (popAnchor) {
      popAnchor.removeAttribute("aria-expanded");
      if (refocus === true && popAnchor.focus) popAnchor.focus({ preventScroll: true });
    }
    popAnchor = null;
  }
  document.addEventListener("click", function (e) {
    if (!pop.hidden && !pop.contains(e.target) && e.target !== popAnchor && !(popAnchor && popAnchor.contains(e.target))) hidePop();
  });
  window.addEventListener("resize", function () { hidePop(); });
  pop.addEventListener("click", function (e) {
    var a = e.target.closest("a[data-rid], a[data-cid]");
    if (a && !a.closest(".pop-actions")) {
      e.preventDefault(); e.stopPropagation();
      var keep = popAnchor;
      if (a.hasAttribute("data-rid")) { popAnchor = null; showRecord(keep, a.getAttribute("data-rid")); }
      else { popAnchor = null; showClaim(keep, a.getAttribute("data-cid")); }
    }
  });

  /* ------------------------------------------------------------ record: M1 entry cards, M2 codes with reasons */
  var RELS = { extends: "extends", critiques: "critiques", answers: "answers" };
  function changedAxes(id) {
    var rep = R[id].rep || {}, out = [];
    if (rep.method_axes) for (var i = 0; i < 6; i++) if (rep.method_axes.charAt(i) !== R[id].ax.charAt(i)) out.push({ q: AX[i][0], was: poleName(i, rep.method_axes.charAt(i)), now: poleName(i, R[id].ax.charAt(i)) });
    if (rep.knowing) {
      var a = rep.knowing.split("|"), b = R[id].kn.split("|"), names = ["location", "knower", "decision"];
      for (var j = 0; j < 3; j++) if (a[j] !== b[j]) out.push({ q: names[j], was: a[j], now: b[j] });
    }
    return out;
  }
  function recordHtml(id) {
    var w = R[id], both = w.m.length === 2;
    var where = both ? "in both catalogues" : (w.m === "M" ? D.names.M : D.names.E) + " only";
    var h = '<div class="pop-kind">Register · ' + id + " · " + escHtml(where) + "</div>";
    h += '<div class="rec-title">' + escHtml(w.a) + " (" + escHtml(w.y) + "). <em>" + md(w.t).replace(/<\/?em>/g, "") + "</em></div>";
    h += '<p class="rec-meta">' + [w.tr, w.pe, w.ty, "claim type: " + w.ct].map(escHtml).join(" · ") + "</p>";
    h += '<p class="rec-in"><span>In</span> ' + Object.keys(w.s).map(function (k) {
      return '<a href="' + (k === DOC ? "#" + id : D.slugs[k] + ".html#" + id) + '"><em>' + escHtml(D.names[k]) + "</em>, §" + escHtml(D.sections[w.s[k]] || "") + "</a>";
    }).join("; ") + "</p>";
    var codes = "";
    if (inM(id)) {
      codes += '<div class="rec-codes"><div class="rec-codes-h">Six axes ' + fpM(id, true) + "</div><ol class=\"rec-axes\">";
      for (var i = 0; i < 6; i++) codes += '<li><span>' + escHtml(AX[i][0]) + '</span> <b class="pole c-' + POLE[w.ax.charAt(i)] + '">' + escHtml(poleName(i, w.ax.charAt(i))) + "</b></li>";
      codes += "</ol></div>";
    }
    if (inE(id)) {
      var k = knowing(id);
      codes += '<div class="rec-codes"><div class="rec-codes-h">Three questions</div><ol class="rec-axes">' +
        "<li><span>Where is knowledge located?</span> <b class=\"ans lg-" + LOCG[k.loc] + '">' + k.loc + "</b></li>" +
        "<li><span>Who counts as a knower?</span> <b class=\"ans\">" + k.who + "</b></li>" +
        "<li><span>How are rival claims decided?</span> <b class=\"ans\">" + k.how + "</b></li></ol></div>";
    }
    h += '<div class="rec-codegrid' + (both ? " two" : "") + '">' + codes + "</div>";
    var ch = changedAxes(id);
    h += '<details class="rec-why"><summary>Why these codes</summary><p>' + linkIds(md(w.why)) + "</p>" +
      (ch.length ? '<p class="rec-changed"><strong>Changed in the coding review:</strong> ' + ch.map(function (c) { return escHtml(c.q) + ", " + escHtml(c.was) + " → " + escHtml(c.now); }).join("; ") + ".</p>" : "") +
      '<p class="pop-note">From the coding log, published with the register: one paragraph per entry.</p></details>';
    h += '<p class="rec-sum"><strong>Summary.</strong> ' + linkIds(md(w.sum)) + "</p>";
    if (w.sb && w.sb !== "the work") h += '<p class="rec-small"><strong>Summary basis.</strong> ' + linkIds(md(w.sb)) + "</p>";
    h += '<p class="rec-small"><strong>Reading</strong> (the author\'s interpretation). ' + linkIds(md(w.rd.replace(/^A reading: (.)/, function (m, c) { return c.toUpperCase(); }))) + "</p>";
    if (w.ln.length) h += '<p class="rec-small"><strong>Links.</strong> ' + w.ln.map(function (l) { return RELS[l[1]] + " " + ridChip(l[0]); }).join("; ") + "</p>";
    if (w.lf.length) h += '<p class="rec-small"><strong>Linked from.</strong> ' + w.lf.map(function (l) { return ridChip(l[0]) + " (" + RELS[l[1]] + ")"; }).join("; ") + "</p>";
    h += '<p class="pop-note">Bibliographic check: ' + escHtml(w.chk) + ".</p>";
    var acts = [];
    if (inDoc(id) && document.getElementById(id)) acts.push('<a class="primary" href="#' + id + '">Go to the entry</a>');
    Object.keys(w.s).forEach(function (k) { if (k !== DOC) acts.push('<a' + (acts.length ? "" : ' class="primary"') + ' href="' + D.slugs[k] + ".html#" + id + '">Read it in ' + D.numbers[k] + " " + escHtml(D.names[k].replace("Catalogue of ", "")) + " →</a>"); });
    if (DOC !== "R") acts.push('<a href="' + D.slugs.R + ".html#" + id + '">In the register</a>');
    acts.push('<a href="' + proposeHref(id) + '">Propose a change</a>');
    h += '<div class="pop-actions">' + acts.join("") + "</div>";
    return h;
  }
  function proposeHref(id) {
    var w = R[id];
    var lines = ["Entry: " + id + " · " + w.a + " (" + w.y + "). " + w.t.replace(/\*/g, ""), "Version: " + D.version, ""];
    if (inM(id)) lines.push("Six axes as coded: " + w.ax.split("").map(function (c, i) { return poleName(i, c); }).join(" · "));
    if (inE(id)) lines.push("Three questions as coded: " + w.kn.replace(/\|/g, " · "));
    lines.push("", "What I propose (a code, the summary, the record, a link), and why:", "", "");
    return "mailto:" + D.propose + "?subject=" + encodeURIComponent("Register " + id + ": a proposed change (version " + D.version + ")") + "&body=" + encodeURIComponent(lines.join("\n"));
  }
  function showRecord(anchor, id) {
    if (!R[id]) return;
    showPop(anchor, recordHtml(id), true);
    trailAdd(id);
  }
  function showClaim(anchor, id) {
    var c = D.claims[id];
    if (!c) return;
    showPop(anchor,
      '<div class="pop-kind">Claims ledger · ' + id + "</div>" +
      '<p class="pop-meta"><span class="status">' + escHtml(c.status) + '</span> <span class="grade-t">Grade: ' + escHtml(c.grade) + "</span></p>" +
      '<div class="pop-entry">' + linkIds(md(c.st)) + "</div>" +
      (c.basis.length ? '<p class="pop-small"><strong>Basis.</strong> ' + c.basis.map(function (b) { return R[b] ? ridChip(b) : escHtml(b); }).join("; ") + "</p>" : "") +
      (c.change ? '<p class="pop-small"><strong>What would change it.</strong> ' + linkIds(md(c.change)) + "</p>" : "") +
      '<div class="pop-actions"><a class="primary" href="' + claimHref(id) + '">' + (claimHref(id).charAt(0) === "#" ? "See it in the ledger →" : "See it in the other catalogue →") + "</a></div>", true);
  }

  /* glossary */
  function showGloss(span) {
    var term = span.getAttribute("data-gl");
    var def = D.glossary[term];
    if (!def) return;
    var slug = term.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
    showPop(span, '<div class="pop-kind">Glossary</div><dfn>' + escHtml(term) + "</dfn><div>" + linkIds(def) + '</div><div class="pop-actions"><a href="#gl-' + slug + '">All terms</a></div>');
  }
  var glTimer = null;
  $$(".gl:not(.demo)").forEach(function (s) {
    s.setAttribute("role", "button");
    s.addEventListener("click", function () { showGloss(s); });
    s.addEventListener("keydown", function (e) { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); showGloss(s); } });
    s.addEventListener("mouseenter", function () { if (!narrow.matches) glTimer = setTimeout(function () { if (popAnchor !== s) showGloss(s); }, 350); });
    s.addEventListener("mouseleave", function () { clearTimeout(glTimer); });
  });

  /* ------------------------------------------------------------ frame: settings, citation */
  $("[data-theme-toggle]").addEventListener("click", function () {
    var root = document.documentElement;
    var dark = root.dataset.theme ? root.dataset.theme === "dark" : window.matchMedia("(prefers-color-scheme: dark)").matches;
    root.dataset.theme = dark ? "light" : "dark";
    store.set("cat-theme", root.dataset.theme);
  });
  $("[data-size-toggle]").addEventListener("click", function () {
    var root = document.documentElement;
    var next = { "": "l", l: "xl", xl: "" }[root.dataset.size || ""];
    if (next) root.dataset.size = next; else delete root.dataset.size;
    store.set("cat-size", next);
  });
  $$("[data-copy-cite]").forEach(function (b) {
    b.addEventListener("click", function () {
      var done = function () { var t = b.textContent; b.textContent = "Copied"; setTimeout(function () { b.textContent = t; }, 1600); };
      if (navigator.clipboard) navigator.clipboard.writeText(CITE).then(done, function () { window.prompt("Citation", CITE); });
      else window.prompt("Citation", CITE);
    });
  });

  /* ------------------------------------------------------------ fingerprint: M4 beside each entry heading (added at run time; the text is unchanged) */
  $$(".prose h3[id^='R-']").forEach(function (h) {
    var id = h.id;
    if (!R[id]) return;
    var g = "";
    if ((DOC === "M" || DOC === "R") && inM(id)) g += fpM(id);
    if ((DOC === "E" || DOC === "R") && inE(id)) g += fpE(id);
    if (R[id].m.length === 2) g += '<span class="fp-both" title="In both catalogues">both</span>';
    var b = el("button", { "class": "fp-btn", type: "button", "aria-label": "Codes of " + id + ", with the reasons" }, g);
    b.addEventListener("click", function () { showRecord(b, id); });
    h.appendChild(b);
  });

  /* ------------------------------------------------------------ bookmark
     One ribbon per page, placed only when the reader presses it ("bookmark:<slug>", shown by the index). */
  var BM_KEY = "bookmark:" + SLUG;
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

  /* ------------------------------------------------------------ trail: M12
     The entries opened in this visit, across the three pages of the dataset. Kept in memory
     only, unless the reader presses "Remember": then the trail, and where the reader stopped,
     are kept in this browser under "cat-trail" until they press "Forget". */
  var TRAIL_KEY = "cat-trail";
  var trail = { remember: false, items: [], place: null };
  (function () {
    var saved;
    try { saved = JSON.parse(store.get(TRAIL_KEY) || "null"); } catch (err) { saved = null; }
    if (saved && saved.remember) trail = { remember: true, items: (saved.items || []).filter(function (x) { return R[x]; }), place: saved.place || null };
  })();
  var lastPlace = trail.place;
  function trailSave() {
    if (trail.remember) store.set(TRAIL_KEY, JSON.stringify(trail));
    var n = $(".trail-n");
    if (n) n.textContent = trail.items.length;
  }
  function trailAdd(id) {
    trail.items = trail.items.filter(function (x) { return x !== id; });
    trail.items.unshift(id);
    if (trail.items.length > 60) trail.items.length = 60;
    trail.place = { doc: DOC, anchor: id, label: id + " · " + shortName(id), at: Date.now(), page: hrefFor(id).charAt(0) === "#" ? SLUG + ".html#" + id : hrefFor(id) };
    trailSave();
  }
  function place(panelId, anchor) {
    if (panelId === "cover" && !anchor) return;
    var p = document.getElementById(panelId);
    if (!p) return;
    trail.place = { doc: DOC, anchor: anchor || panelId, label: D.names[DOC].replace("Catalogue of ", "") + " · " + (anchor ? anchor + " · " + shortName(anchor) : p.querySelector(".spine-label").textContent), at: Date.now(), page: SLUG + ".html#" + (anchor || panelId) };
    trailSave();
  }
  function trailHtml() {
    var h = '<div class="pop-kind">Your trail through the register</div>';
    if (!trail.items.length) h += '<p class="pop-small">Entries you open, on any of the three pages, are listed here, newest first.</p>';
    else h += '<ol class="trail-list">' + trail.items.map(function (x) { return "<li>" + ridChip(x) + ' <span class="trail-where">' + (R[x].m.length === 2 ? "both" : R[x].m === "M" ? D.numbers.M : D.numbers.E) + "</span></li>"; }).join("") + "</ol>";
    h += '<div class="trail-tools"><button type="button" class="chip" data-trail-remember aria-pressed="' + trail.remember + '">' + (trail.remember ? "Remembered in this browser" : "Remember in this browser") + '</button>' +
      '<button type="button" class="chip" data-trail-forget>Forget</button></div>' +
      '<p class="pop-note">' + (trail.remember ? "Your trail and where you stopped are kept in this browser only, until you press Forget." : "Kept only while this page is open. Press Remember to keep the trail, and where you stopped, in this browser.") + "</p>";
    return h;
  }
  var trailBtn = $("[data-trail]");
  trailBtn.addEventListener("click", function () { showPop(trailBtn, trailHtml(), true); });
  pop.addEventListener("click", function (e) {
    if (e.target.closest("[data-trail-remember]")) {
      trail.remember = !trail.remember;
      if (trail.remember) trailSave(); else store.del(TRAIL_KEY);
      popAnchor = null; showPop(trailBtn, trailHtml(), true);
    } else if (e.target.closest("[data-trail-forget]")) {
      trail = { remember: false, items: [], place: null };
      store.del(TRAIL_KEY); trailSave();
      popAnchor = null; showPop(trailBtn, trailHtml(), true);
    }
  });
  trailSave();
  (function () {
    var r = $(".trail-resume");
    if (!r || !lastPlace || !trail.remember) return;
    r.hidden = false;
    var a = r.querySelector("a");
    a.setAttribute("href", lastPlace.doc === DOC ? "#" + lastPlace.anchor : lastPlace.page);
    a.querySelector("span").textContent = lastPlace.label;
  })();

  /* ------------------------------------------------------------ explorables */
  var builders = {};
  function seg(options, value, onChange) {
    var s = el("div", { "class": "seg", role: "group" });
    options.forEach(function (o) {
      var b = el("button", { type: "button", "aria-pressed": String(o[0] === value) }, o[1]);
      b.addEventListener("click", function () {
        $$("button", s).forEach(function (x) { x.setAttribute("aria-pressed", String(x === b)); });
        onChange(o[0]);
      });
      s.appendChild(b);
    });
    return s;
  }
  function select(options, value, onChange, label) {
    var w = el("label", { "class": "sel" }, label ? '<span>' + escHtml(label) + "</span>" : "");
    var s = el("select");
    options.forEach(function (o) { var op = el("option", { value: o[0] }, escHtml(o[1])); if (o[0] === value) op.selected = true; s.appendChild(op); });
    s.addEventListener("change", function () { onChange(s.value); });
    w.appendChild(s);
    return w;
  }
  function chipList(list) { return '<p class="chips">' + list.map(ridChip).join(" ") + "</p>"; }
  function yearOf(id) {
    var s = R[id].y, bce = /BCE/.test(s), m;
    if ((m = s.match(/(\d+)(?:st|nd|rd|th)(?:–(\d+)(?:st|nd|rd|th))? c\./))) {
      var a = +m[1], b = m[2] ? +m[2] : a;
      return bce ? [-a * 100, -(b - 1) * 100] : [(a - 1) * 100, b * 100];
    }
    var n = (s.match(/\d{2,4}/g) || []).map(Number);
    if (!n.length) return [0, 0];
    var lo = Math.min.apply(null, n), hi = Math.max.apply(null, n);
    return bce ? [-hi, -lo] : [lo, hi];
  }
  function periodOf(id) {
    var y = yearOf(id)[0];
    return y < 1600 ? "Before 1600" : y < 1800 ? "1600–1799" : y < 1900 ? "1800–1899" : y < 1950 ? "1900–1949" : y < 1980 ? "1950–1979" : y < 2000 ? "1980–1999" : "2000 onwards";
  }

  /* ---- field: M3 every work as one mark; lenses rearrange the same marks (M5) */
  builders.field = function (box, fig) {
    var start = fig.getAttribute("data-lens") || "R";
    var lens = start === "R" ? "R" : start;
    var groupBy = { R: "member", M: "sec", E: "sec" };
    var hilite = "";
    var GBY = {
      R: [["member", "Catalogue"], ["tradition", "Tradition"], ["period", "Period of first publication"], ["type", "Type of work"], ["check", "Bibliographic check"]],
      M: [["sec", "Section"]].concat(AX.map(function (a, i) { return ["ax" + i, "Axis " + (i + 1) + ": " + a[0]]; })),
      E: [["sec", "Section"], ["q0", "Where is knowledge located?"], ["q1", "Who counts as a knower?"], ["q2", "How are rival claims decided?"]]
    };
    var HL = {
      R: [["", "Highlight nothing"], ["shared", "Highlight the 30 works in both"]],
      M: [["", "Highlight nothing"]].concat((D.m ? D.m.families : []).map(function (f, i) { return ["fam" + i, "Family: " + f.name]; })),
      E: [["", "Highlight nothing"]].concat((D.e ? D.e.modes : []).map(function (m, i) { return ["mode" + i, "Mode (works that fit it): " + m.name]; }))
    };
    var head = el("div", { "class": "field-tools" });
    var lensSeg = seg([["R", "Register · " + ALL.length], ["M", D.numbers.M + " Methods · " + ALL.filter(inM).length], ["E", D.numbers.E + " Epistemology · " + ALL.filter(inE).length]], lens, function (v) { lens = v; hilite = ""; tools(); paint(); layout(); });
    head.appendChild(lensSeg);
    var opts = el("div", { "class": "field-opts" });
    head.appendChild(opts);
    var key = el("div", { "class": "field-key" });
    var stage = el("div", { "class": "field", role: "group", "aria-label": "Works in the register; use the arrow keys to move between them" });
    var hint = el("p", { "class": "field-hint" });
    box.appendChild(head); box.appendChild(key); box.appendChild(stage); box.appendChild(hint);
    var marks = {}, labels = [];
    ALL.forEach(function (id, n) {
      var b = el("button", { "class": "mk" + (R[id].m.length === 2 ? " sh" : ""), type: "button", tabindex: n ? "-1" : "0", "data-id": id, "aria-label": id + " " + shortName(id) });
      b.addEventListener("click", function () { showRecord(b, id); });
      b.addEventListener("mouseenter", function () { hint.innerHTML = '<b>' + id + "</b> · " + escHtml(R[id].a) + " (" + escHtml(R[id].y) + "). <em>" + md(R[id].t).replace(/<\/?em>/g, "") + "</em>"; });
      marks[id] = b; stage.appendChild(b);
    });
    function tools() {
      opts.innerHTML = "";
      opts.appendChild(select(GBY[lens], groupBy[lens], function (v) { groupBy[lens] = v; layout(); }, "Group by"));
      opts.appendChild(select(HL[lens], hilite, function (v) { hilite = v; paint(); }, ""));
    }
    function inLens(id) { return lens === "R" || R[id].m.indexOf(lens) >= 0; }
    function highlighted(id) {
      if (!hilite) return null;
      if (hilite === "shared") return R[id].m.length === 2;
      if (hilite.indexOf("fam") === 0) return D.m.families[+hilite.slice(3)].reps.indexOf(id) >= 0;
      if (hilite.indexOf("mode") === 0) {
        var md_ = D.e.modes[+hilite.slice(4)], k = R[id].kn.split("|");
        return inE(id) && md_.answers.every(function (s, i) { return s.indexOf(k[i]) >= 0; });
      }
      return null;
    }
    function paint() {
      var nH = 0;
      ALL.forEach(function (id) {
        var b = marks[id], w = R[id], h = "";
        if (lens === "M" && inM(id)) h = w.ax.split("").map(function (c) { return '<i class="c-' + POLE[c] + '"></i>'; }).join("");
        else if (lens === "E" && inE(id)) h = '<i class="lg-' + LOCG[w.kn.split("|")[0]] + '"></i>';
        else if (lens === "R") h = w.m === "ME" ? '<i class="cat-M"></i><i class="cat-E"></i>' : '<i class="cat-' + w.m + '"></i>';
        b.innerHTML = h;
        var hl = highlighted(id);
        if (hl) nH++;
        b.classList.toggle("out", !inLens(id) || hl === false);
        b.classList.toggle("hl", !!hl);
      });
      key.innerHTML = lens === "M" ? '<span class="k c-a">Pole A</span><span class="k c-b">Pole B</span><span class="k c-x">Both</span><span class="k c-na">Not applicable</span><span>Each mark: axes 1–6, left to right</span>'
        : lens === "E" ? '<span class="k lg-carrier">Location: what carries it</span><span class="k lg-arrangement">what arrangement produces it</span><span class="k lg-position">from what position</span>'
        : '<span class="k cat-M">' + escHtml(D.names.M) + '</span><span class="k cat-E">' + escHtml(D.names.E) + "</span>";
      key.innerHTML += '<span class="k-sh">Outlined: in both catalogues</span>' + (hilite ? '<span class="k-hl">' + nH + " highlighted</span>" : "");
    }
    function groupKey(id) {
      var w = R[id], g = groupBy[lens];
      if (g === "member") return w.m === "M" ? "Only in the " + D.names.M : w.m === "E" ? "Only in the " + D.names.E : "In both catalogues";
      if (g === "tradition") return w.tr;
      if (g === "period") return periodOf(id);
      if (g === "type") return w.ty;
      if (g === "check") return w.chk;
      if (g === "sec") return "§" + D.sections[w.s[lens]];
      if (g.charAt(0) === "a") { var i = +g.slice(2), c = w.ax.charAt(i); return { A: AX[i][1], B: AX[i][2], X: "Both", "-": "Not applicable" }[c]; }
      return w.kn.split("|")[+g.slice(1)];
    }
    function groups() {
      var out = {}, order = [];
      ALL.forEach(function (id) {
        if (!inLens(id)) return;
        var k = groupKey(id);
        if (!out[k]) { out[k] = []; order.push(k); }
        out[k].push(id);
      });
      var g = groupBy[lens];
      if (g === "member") order = ["Only in the " + D.names.M, "In both catalogues", "Only in the " + D.names.E];
      else if (g === "sec") order.sort(function (a, b) { return parseInt(a.slice(1), 10) - parseInt(b.slice(1), 10); });
      else if (g === "period") order = ["Before 1600", "1600–1799", "1800–1899", "1900–1949", "1950–1979", "1980–1999", "2000 onwards"].filter(function (k) { return out[k]; });
      else if (g.charAt(0) === "a") { var i = +g.slice(2); order = [AX[i][1], AX[i][2], "Both", "Not applicable"].filter(function (k) { return out[k]; }); }
      else if (g === "check") order = ["verified", "standard record", "partly"].filter(function (k) { return out[k]; });
      else order.sort(function (a, b) { return out[b].length - out[a].length || (a < b ? -1 : 1); });
      var res = order.map(function (k) { return [k, out[k]]; });
      if (lens !== "R") res.push(["Not in this catalogue", ALL.filter(function (id) { return !inLens(id); })]);
      return res;
    }
    var order = [];
    function layout() {
      var w = stage.clientWidth || box.clientWidth || 600;
      var sw = w < 520 ? 18 : 24, sh = w < 520 ? 11 : 14, gap = 3;
      var per = Math.max(1, Math.floor((w + gap) / (sw + gap)));
      stage.style.setProperty("--mw", sw + "px"); stage.style.setProperty("--mh", sh + "px");
      labels.forEach(function (l) { l.remove(); }); labels = [];
      var y = 0; order = [];
      groups().forEach(function (g) {
        var l = el("div", { "class": "fl" + (g[0] === "Not in this catalogue" ? " out" : "") }, "<b>" + escHtml(g[0]) + "</b> · " + g[1].length);
        l.style.transform = "translate(0," + y + "px)";
        stage.appendChild(l); labels.push(l);
        y += 22;
        g[1].forEach(function (id, n) {
          marks[id].style.transform = "translate(" + (n % per) * (sw + gap) + "px," + (y + Math.floor(n / per) * (sh + gap)) + "px)";
          order.push(id);
        });
        y += Math.ceil(g[1].length / per) * (sh + gap) + 14;
      });
      stage.style.height = y + "px";
    }
    stage.addEventListener("keydown", function (e) {
      var b = e.target.closest(".mk");
      if (!b) return;
      var i = order.indexOf(b.getAttribute("data-id")), j = i;
      if (e.key === "ArrowRight" || e.key === "ArrowDown") j = Math.min(order.length - 1, i + 1);
      else if (e.key === "ArrowLeft" || e.key === "ArrowUp") j = Math.max(0, i - 1);
      else if (e.key === "Home") j = 0;
      else if (e.key === "End") j = order.length - 1;
      else return;
      e.preventDefault(); e.stopPropagation();
      b.setAttribute("tabindex", "-1");
      var nb = marks[order[j]];
      nb.setAttribute("tabindex", "0"); nb.focus();
      nb.dispatchEvent(new Event("mouseenter"));
    });
    tools(); paint();
    hint.textContent = "Point at a mark to see the work; choose it to open its entry.";
    var p = fig.closest(".panel");
    /* marks move only when the reader changes the lens or the grouping; layouts caused by
       opening the panel or resizing the window place them at once */
    function relayout() {
      if (!stage.offsetParent) return;
      stage.classList.add("still");
      layout();
      void stage.offsetWidth;
      stage.classList.remove("still");
    }
    if (p) p.addEventListener("panelopen", function () { setTimeout(relayout, 30); setTimeout(relayout, 480); });
    window.addEventListener("resize", relayout);
    relayout();
    setTimeout(relayout, 450);
  };
  builders.checks = function (box, fig) {
    fig.setAttribute("data-lens", "R");
    builders.field(box, fig);
    var s = $("select", box);
    if (s) { s.value = "check"; s.dispatchEvent(new Event("change")); }
  };

  /* ---- axes (§3): choose a pole, see its works */
  builders.axes = function (box) {
    var M = ALL.filter(inM), sel = null;
    var grid = el("div", { "class": "axes-grid" }), out = el("div", { "class": "axes-out" });
    AX.forEach(function (a, i) {
      var n = { A: 0, B: 0, X: 0, "-": 0 };
      M.forEach(function (id) { n[R[id].ax.charAt(i)]++; });
      var row = el("div", { "class": "axes-row" });
      row.innerHTML = '<span class="axes-name">' + (i + 1) + " " + escHtml(a[0]) + "</span>";
      [["A", a[1]], ["X", "Both"], ["B", a[2]], ["-", "n/a"]].forEach(function (p) {
        var b = el("button", { type: "button", "class": "pole-btn c-" + POLE[p[0]], "aria-pressed": "false" }, escHtml(p[1]) + ' <span class="n">' + n[p[0]] + "</span>");
        b.addEventListener("click", function () {
          var same = sel && sel[0] === i && sel[1] === p[0];
          $$(".pole-btn", grid).forEach(function (x) { x.setAttribute("aria-pressed", "false"); });
          sel = same ? null : [i, p[0]];
          if (sel) b.setAttribute("aria-pressed", "true");
          show();
        });
        row.appendChild(b);
      });
      grid.appendChild(row);
    });
    function show() {
      if (!sel) { out.innerHTML = '<p class="muted">Choose a pole on any axis.</p>'; return; }
      var list = M.filter(function (id) { return R[id].ax.charAt(sel[0]) === sel[1]; });
      out.innerHTML = "<p><strong>" + escHtml(AX[sel[0]][0]) + ": " + escHtml(poleName(sel[0], sel[1])) + "</strong> · " + list.length + " works</p>" +
        '<ul class="worklist">' + list.map(function (id) { return "<li>" + fpM(id) + " " + ridChip(id) + "</li>"; }).join("") + "</ul>";
    }
    box.appendChild(grid); box.appendChild(out); show();
  };

  /* ---- matrix (§14.1): works × axes, sortable (Bertin) */
  builders.matrix = function (box) {
    var M = ALL.filter(inM), sortAxis = -1;
    var rank = { A: 0, X: 1, B: 2, "-": 3 };
    var tools = el("div", { "class": "matrix-tools" }, "<span>Sort by</span>");
    var wrap = el("div", { "class": "matrix-wrap" });
    var opts = [["-1", "Register order"]].concat(AX.map(function (a, i) { return [String(i), "Axis " + (i + 1)]; }));
    tools.appendChild(seg(opts, "-1", function (v) { sortAxis = +v; draw(); }));
    function draw() {
      var rows = M.slice();
      if (sortAxis >= 0) rows.sort(function (x, y) {
        var a = R[x].ax, b = R[y].ax;
        var k = rank[a.charAt(sortAxis)] - rank[b.charAt(sortAxis)];
        if (k) return k;
        for (var i = 0; i < 6; i++) { var d = rank[a.charAt(i)] - rank[b.charAt(i)]; if (d) return d; }
        return x < y ? -1 : 1;
      });
      var h = '<table class="matrix"><thead><tr><th>Work</th>' + AX.map(function (a, i) { return '<th title="' + escHtml(a[0]) + '"' + (i === sortAxis ? ' class="on"' : "") + ">" + (i + 1) + "</th>"; }).join("") + "</tr></thead><tbody>";
      var prev = null;
      rows.forEach(function (id) {
        var s = R[id].ax;
        h += "<tr" + (sortAxis >= 0 && prev === s ? ' class="same"' : "") + "><th>" + ridChip(id) + "</th>" + s.split("").map(function (c, i) { return '<td class="c-' + POLE[c] + '" title="' + escHtml(AX[i][0] + ": " + poleName(i, c)) + '">' + (c === "-" ? "" : c) + "</td>"; }).join("") + "</tr>";
        prev = s;
      });
      h += "</tbody><tfoot>" + ["A", "B", "X", "-"].map(function (c) {
        return "<tr><th>" + { A: "Pole A", B: "Pole B", X: "Both", "-": "Not applicable" }[c] + "</th>" + AX.map(function (a, i) { return "<td>" + M.filter(function (id) { return R[id].ax.charAt(i) === c; }).length + "</td>"; }).join("") + "</tr>";
      }).join("") + "</tfoot></table>";
      wrap.innerHTML = h;
    }
    box.appendChild(tools); box.appendChild(wrap); draw();
  };

  /* ---- concordance (§14.1): pairs of axes */
  builders.concordance = function (box) {
    var M = ALL.filter(inM), sel = null;
    var grid = el("div", { "class": "conc" }), out = el("div", { "class": "conc-out" });
    var h = '<table class="conc-t"><thead><tr><th></th>' + AX.map(function (a, j) { return j ? '<th title="' + escHtml(a[0]) + '">' + (j + 1) + "</th>" : ""; }).join("") + "</tr></thead><tbody>";
    for (var i = 0; i < 5; i++) {
      h += '<tr><th title="' + escHtml(AX[i][0]) + '">' + (i + 1) + "</th>";
      for (var j = 1; j < 6; j++) {
        if (j <= i) { h += "<td></td>"; continue; }
        var b = pairs(i, j), sh = b.length ? Math.round(100 * b.same.length / b.length) : 0;
        h += '<td><button type="button" class="conc-cell" data-i="' + i + '" data-j="' + j + '" style="--share:' + sh + '%" aria-label="Axes ' + (i + 1) + " and " + (j + 1) + ": " + b.same.length + " of " + b.length + ' same pole"><b>' + sh + '%</b><span>' + b.same.length + "/" + b.length + "</span></button></td>";
      }
      h += "</tr>";
    }
    grid.innerHTML = h + "</tbody></table>";
    function pairs(i, j) {
      var r = M.filter(function (id) { var a = R[id].ax.charAt(i), b = R[id].ax.charAt(j); return "AB".indexOf(a) >= 0 && "AB".indexOf(b) >= 0 && a && b; });
      var res = r.slice();
      res.same = r.filter(function (id) { return R[id].ax.charAt(i) === R[id].ax.charAt(j); });
      res.opp = r.filter(function (id) { return R[id].ax.charAt(i) !== R[id].ax.charAt(j); });
      return res;
    }
    grid.addEventListener("click", function (e) {
      var b = e.target.closest(".conc-cell");
      if (!b) return;
      $$(".conc-cell", grid).forEach(function (x) { x.classList.toggle("on", x === b); });
      var i = +b.getAttribute("data-i"), j = +b.getAttribute("data-j"), p = pairs(i, j);
      function by(list, a, c) { return list.filter(function (id) { return R[id].ax.charAt(i) === a && R[id].ax.charAt(j) === c; }); }
      function block(label, list) { return list.length ? "<p><strong>" + escHtml(label) + "</strong> · " + list.length + "</p>" + chipList(list) : ""; }
      out.innerHTML = "<p><strong>Axis " + (i + 1) + " (" + escHtml(AX[i][0]) + ") × axis " + (j + 1) + " (" + escHtml(AX[j][0]) + ")</strong>: " + p.length + " works coded on a pole of both; " + p.same.length + " on the same pole, " + p.opp.length + " on opposite poles.</p>" +
        block(AX[i][1] + " and " + AX[j][1].toLowerCase(), by(p, "A", "A")) + block(AX[i][2] + " and " + AX[j][2].toLowerCase(), by(p, "B", "B")) +
        block(AX[i][1] + " but " + AX[j][2].toLowerCase(), by(p, "A", "B")) + block(AX[i][2] + " but " + AX[j][1].toLowerCase(), by(p, "B", "A"));
    });
    out.innerHTML = '<p class="muted">Choose a cell. The share is the share of works on the same pole, as in the table above.</p>';
    box.appendChild(grid); box.appendChild(out);
  };

  /* ---- sensitivity (§14.1): recode "both" */
  builders.sensitivity = function (box) {
    var M = ALL.filter(inM), mode = "as";
    var out = el("div", { "class": "sens" });
    box.appendChild(seg([["as", "As coded"], ["A", "Every “both” as pole A"], ["B", "Every “both” as pole B"]], mode, function (v) { mode = v; draw(); }));
    box.appendChild(out);
    function draw() {
      var h = "";
      AX.forEach(function (a, i) {
        var n = { A: 0, B: 0, X: 0 };
        M.forEach(function (id) { var c = R[id].ax.charAt(i); if (n[c] != null) n[c]++; });
        var A = n.A + (mode === "A" ? n.X : 0), B = n.B + (mode === "B" ? n.X : 0), X = mode === "as" ? n.X : 0, tot = n.A + n.B + n.X;
        h += '<div class="sens-row"><span class="sens-name">' + (i + 1) + " " + escHtml(a[0]) + '</span><div class="sens-bar">' +
          '<i class="c-a" style="width:' + (100 * A / tot) + '%">' + escHtml(a[1]) + " " + A + "</i>" + (X ? '<i class="c-x" style="width:' + (100 * X / tot) + '%">' + X + "</i>" : "") +
          '<i class="c-b" style="width:' + (100 * B / tot) + '%">' + escHtml(a[2]) + " " + B + "</i></div>" +
          '<span class="sens-v">' + ((n.A + n.X > n.B) === (n.A > n.B + n.X) ? "Larger pole unchanged" : "Larger pole depends on the recoding") + "</span></div>";
      });
      out.innerHTML = h + '<p class="muted">Works coded not applicable (' + "on each axis, as in the table) are not shown and not recoded.</p>";
    }
    draw();
  };

  /* ---- families (§14.2) */
  builders.families = function (box) {
    var F = D.m.families, sel = 0;
    var list = el("div", { "class": "fam-list" }), out = el("div", { "class": "fam-out" });
    F.forEach(function (f, i) {
      var b = el("button", { type: "button", "class": "chip", "aria-pressed": String(i === sel) }, escHtml(f.name));
      b.addEventListener("click", function () { sel = i; $$(".chip", list).forEach(function (x, k) { x.setAttribute("aria-pressed", String(k === i)); }); show(); });
      list.appendChild(b);
    });
    function show() {
      var f = F[sel];
      out.innerHTML = '<h4>' + escHtml(f.name) + '</h4><p><span class="muted">Typical position:</span> ' + escHtml(f.typical) + "</p>" +
        '<table class="mini"><thead><tr><th>Representative entry</th>' + AX.map(function (a, i) { return '<th title="' + escHtml(a[0]) + '">' + (i + 1) + "</th>"; }).join("") + "</tr></thead><tbody>" +
        f.reps.map(function (id) { return "<tr><th>" + ridChip(id) + "</th>" + R[id].ax.split("").map(function (c, i) { return '<td class="c-' + POLE[c] + '" title="' + escHtml(poleName(i, c)) + '">' + escHtml(c === "-" ? "n/a" : poleName(i, c)) + "</td>"; }).join("") + "</tr>"; }).join("") +
        "</tbody></table>" +
        '<div class="fam-two"><p><span class="muted">What it makes visible</span><br>' + escHtml(f.visible) + '</p><p><span class="muted">What it leaves to other families</span><br>' + escHtml(f.leaves) + "</p></div>";
    }
    box.appendChild(list); box.appendChild(out); show();
  };

  /* ---- test questions (§14.4) */
  builders.questions = function (box) {
    var Q = D.m.tq, q = "qa", sel = 0;
    var top = el("div", { "class": "q-top" });
    var qtext = el("p", { "class": "q-text" });
    top.appendChild(seg([["qa", "Q-A · number words and arithmetic"], ["qb", "Q-B · accompanying material and listening"]], q, function (v) { q = v; show(); }));
    var list = el("div", { "class": "fam-list" }), out = el("div", { "class": "q-out" });
    Q.forEach(function (m, i) {
      var b = el("button", { type: "button", "class": "chip", "aria-pressed": String(i === sel) }, escHtml(m.method.replace(/\s*\(.*\)$/, "")));
      b.addEventListener("click", function () { sel = i; $$(".chip", list).forEach(function (x, k) { x.setAttribute("aria-pressed", String(k === i)); }); show(); });
      list.appendChild(b);
    });
    function show() {
      qtext.innerHTML = "<strong>" + (q === "qa" ? "Q-A." : "Q-B.") + "</strong> " + escHtml(q === "qa" ? D.m.qa : D.m.qb);
      var m = Q[sel], emph = {};
      m.axes.forEach(function (a) { emph[a[0] - 1] = a[1]; });
      out.innerHTML = '<p class="q-method"><strong>' + escHtml(m.method) + "</strong></p><p>" + escHtml(m[q]) + "</p>" +
        '<div class="q-axes">' + AX.map(function (a, i) {
          var e = emph[i];
          return '<div class="q-ax' + (e ? " on" : "") + '"><span>' + (i + 1) + " " + escHtml(a[0]) + "</span>" + (e ? '<b class="pole c-' + POLE[e] + '">' + escHtml(e === "A" ? a[1] : a[2]) + "</b>" : '<b class="pole none">not emphasised</b>') + "</div>";
        }).join("") + "</div>" + (m.ids.length ? chipList(m.ids) : "");
    }
    box.appendChild(top); box.appendChild(qtext); box.appendChild(list); box.appendChild(out); show();
  };

  /* ---- compare: M11 two to four works side by side */
  builders.compare = function (box, fig) {
    var preset = fig.getAttribute("data-preset");
    var pool = ALL.filter(inDoc).sort(function (a, b) { return shortName(a) < shortName(b) ? -1 : 1; });
    var showM = DOC === "M", showE = DOC === "E";
    var presets = [];
    if (preset === "tensions") (DOC === "M" ? D.m.tensions : D.e.tensions).forEach(function (t) { presets.push([DOC === "M" ? t.label + ": " + t.question : t.name, t.pair]); });
    if (preset === "examples") presets.push(["The four examples", D.e.examples]);
    var cur = presets.length ? presets[0][1].slice() : pool.slice(0, 2);
    var top = el("div", { "class": "cmp-top" }), pickers = el("div", { "class": "cmp-pick" }), out = el("div", { "class": "cmp-out" });
    if (presets.length > 1) top.appendChild(select(presets.map(function (p, i) { return [String(i), p[0]]; }), "0", function (v) { cur = presets[+v][1].slice(); draw(); }, preset === "tensions" ? "Tension" : ""));
    function draw() {
      pickers.innerHTML = "";
      cur.forEach(function (id, k) {
        pickers.appendChild(select(pool.map(function (x) { return [x, shortName(x) + " · " + x]; }), id, function (v) { cur[k] = v; draw(); }, "Work " + (k + 1)));
      });
      var rows = [];
      if (showM) AX.forEach(function (a, i) { rows.push([a[0], cur.map(function (id) { return R[id].ax.charAt(i); }), function (c) { return '<b class="pole c-' + POLE[c] + '">' + escHtml(poleName(i, c)) + "</b>"; }]); });
      if (showE) ["Where is knowledge located?", "Who counts as a knower?", "How are rival claims decided?"].forEach(function (qq, i) {
        rows.push([qq, cur.map(function (id) { return R[id].kn.split("|")[i]; }), function (c) { return '<b class="ans' + (i === 0 ? " lg-" + LOCG[c] : "") + '">' + escHtml(c) + "</b>"; }]);
      });
      var h = '<table class="cmp"><thead><tr><th></th>' + cur.map(function (id) { return "<th>" + ridChip(id) + "</th>"; }).join("") + "<th></th></tr></thead><tbody>";
      var agree = 0;
      rows.forEach(function (r) {
        var same = r[1].every(function (c) { return c === r[1][0]; });
        if (same) agree++;
        h += "<tr" + (same ? ' class="agree"' : "") + "><th>" + escHtml(r[0]) + "</th>" + r[1].map(function (c) { return "<td>" + r[2](c) + "</td>"; }).join("") + '<td class="cmp-mark">' + (same ? "same" : "") + "</td></tr>";
      });
      out.innerHTML = h + "</tbody></table><p class=\"muted\">" + (cur.length > 2 ? "All " + cur.length + " works agree" : "The two works agree") + " on " + agree + " of " + rows.length + (showM ? " axes" : " questions") + ".</p>";
    }
    box.appendChild(top); box.appendChild(pickers); box.appendChild(out); draw();
  };

  /* ---- threads: M7 three questions as parallel sets */
  builders.threads = function (box) {
    var E = ALL.filter(inE), sel = null;
    var cols = [[], [], []];
    var count = [{}, {}, {}];
    E.forEach(function (id) { R[id].kn.split("|").forEach(function (c, q) { count[q][c] = (count[q][c] || 0) + 1; }); });
    cols[0] = ["carrier", "arrangement", "position"].reduce(function (a, g) { return a.concat(GROUPS[g].filter(function (c) { return count[0][c]; }).sort(function (x, y) { return count[0][y] - count[0][x]; })); }, []);
    cols[1] = Object.keys(count[1]).sort(function (x, y) { return count[1][y] - count[1][x]; });
    cols[2] = Object.keys(count[2]).sort(function (x, y) { return count[2][y] - count[2][x]; });
    var W = 660, unit = 3.2, gap = 6, X = [130, 290, 480], NW = [10, 110, 10];
    var H = 0, pos = [{}, {}, {}];
    cols.forEach(function (c, q) {
      var y = 24;
      c.forEach(function (code) { pos[q][code] = { y: y, h: count[q][code] * unit }; y += count[q][code] * unit + gap; });
      H = Math.max(H, y);
    });
    var wrap = el("div", { "class": "threads-wrap" }), out = el("div", { "class": "threads-out" });
    box.appendChild(el("p", { "class": "threads-hint" }, "Swipe sideways inside the figure to see the third question."));
    box.appendChild(wrap); box.appendChild(out);
    function bands(q, filter) {
      var map = {}, keys = [];
      E.forEach(function (id) {
        if (filter && !filter(id)) return;
        var k = R[id].kn.split("|"), key = k[q] + "→" + k[q + 1];
        if (!map[key]) { map[key] = 0; keys.push(key); }
        map[key]++;
      });
      return { map: map, keys: keys };
    }
    function draw() {
      var all = [bands(0), bands(1)];
      var f = sel ? function (id) { return R[id].kn.split("|")[sel[0]] === sel[1]; } : null;
      var part = f ? [bands(0, f), bands(1, f)] : null;
      var s = '<svg class="threads" viewBox="0 0 ' + W + " " + (H + 10) + '" role="img" aria-label="Answers to the three questions, joined work by work">';
      ["Where is knowledge located?", "Who counts as a knower?", "How are rival claims decided?"].forEach(function (t, q) {
        s += '<text class="th-h" x="' + (q === 0 ? 4 : q === 1 ? X[1] + NW[1] / 2 : X[2]) + '" y="12" text-anchor="' + (q === 1 ? "middle" : "start") + '">' + t + "</text>";
      });
      [0, 1].forEach(function (q) {
        var outOff = {}, inOff = {};
        var keys = all[q].keys.slice().sort(function (a, b) {
          var A = a.split("→"), B = b.split("→");
          return (cols[q].indexOf(A[0]) - cols[q].indexOf(B[0])) || (cols[q + 1].indexOf(A[1]) - cols[q + 1].indexOf(B[1]));
        });
        var inOrder = keys.slice().sort(function (a, b) {
          var A = a.split("→"), B = b.split("→");
          return (cols[q + 1].indexOf(A[1]) - cols[q + 1].indexOf(B[1])) || (cols[q].indexOf(A[0]) - cols[q].indexOf(B[0]));
        });
        var yIn = {};
        inOrder.forEach(function (k) { var t = k.split("→")[1]; inOff[t] = inOff[t] || 0; yIn[k] = pos[q + 1][t].y + inOff[t]; inOff[t] += all[q].map[k] * unit; });
        keys.forEach(function (k) {
          var p = k.split("→"), n = all[q].map[k], w = n * unit;
          outOff[p[0]] = outOff[p[0]] || 0;
          var y0 = pos[q][p[0]].y + outOff[p[0]] + w / 2, y1 = yIn[k] + w / 2;
          outOff[p[0]] += w;
          var x0 = X[q] + NW[q], x1 = X[q + 1], mx = (x0 + x1) / 2;
          var d = "M" + x0 + "," + y0 + " C" + mx + "," + y0 + " " + mx + "," + y1 + " " + x1 + "," + y1;
          var grp = q === 0 ? LOCG[p[0]] : "";
          s += '<path class="band' + (grp ? " lg-" + grp : "") + (sel ? " dim" : "") + '" d="' + d + '" stroke-width="' + Math.max(1, w - 0.6) + '"><title>' + p[0] + " → " + p[1] + ": " + n + "</title></path>";
          if (part && part[q].map[k]) s += '<path class="band sel" d="' + d + '" stroke-width="' + Math.max(1, part[q].map[k] * unit - 0.6) + '"></path>';
        });
      });
      cols.forEach(function (c, q) {
        c.forEach(function (code) {
          var p = pos[q][code], on = sel && sel[0] === q && sel[1] === code;
          s += '<g class="node' + (on ? " on" : "") + '" data-q="' + q + '" data-c="' + code + '" tabindex="0" role="button" aria-label="' + code + ", " + count[q][code] + ' works">' +
            '<rect x="' + X[q] + '" y="' + p.y + '" width="' + NW[q] + '" height="' + Math.max(2, p.h) + '" class="' + (q === 0 ? "lg-" + LOCG[code] : "") + '"></rect>' +
            '<text x="' + (q === 0 ? X[q] - 6 : q === 1 ? X[q] + 6 : X[q] + NW[q] + 6) + '" y="' + (p.y + Math.max(p.h, 10) / 2 + 4) + '" text-anchor="' + (q === 0 ? "end" : "start") + '">' + code + ' <tspan class="n">' + count[q][code] + "</tspan></text></g>";
        });
      });
      wrap.innerHTML = s + "</svg>";
      if (!sel) { out.innerHTML = '<p class="muted">Choose an answer in any column.</p>'; return; }
      var list = E.filter(f);
      var names = ["location", "knower", "decision"];
      out.innerHTML = "<p><strong>" + names[sel[0]] + ": " + escHtml(sel[1]) + "</strong> · " + list.length + " works</p>" +
        '<ul class="worklist">' + list.map(function (id) { return "<li>" + fpE(id) + " " + ridChip(id) + "</li>"; }).join("") + "</ul>";
    }
    wrap.addEventListener("click", function (e) {
      var g = e.target.closest(".node");
      if (!g) return;
      var q = +g.getAttribute("data-q"), c = g.getAttribute("data-c");
      sel = sel && sel[0] === q && sel[1] === c ? null : [q, c];
      draw();
    });
    wrap.addEventListener("keydown", function (e) { if ((e.key === "Enter" || e.key === " ") && e.target.closest(".node")) { e.preventDefault(); e.target.closest(".node").dispatchEvent(new MouseEvent("click", { bubbles: true })); } });
    draw();
  };

  /* ---- modes (§13.4, §13.5) */
  builders.modes = function (box) {
    var MO = D.e.modes, sel = 0, E = ALL.filter(inE);
    var list = el("div", { "class": "fam-list" }), out = el("div", { "class": "fam-out" });
    MO.forEach(function (m, i) {
      var b = el("button", { type: "button", "class": "chip", "aria-pressed": String(i === sel) }, escHtml(m.name));
      b.addEventListener("click", function () { sel = i; $$(".chip", list).forEach(function (x, k) { x.setAttribute("aria-pressed", String(k === i)); }); show(); });
      list.appendChild(b);
    });
    function fits(m, id) { var k = R[id].kn.split("|"); return m.answers.every(function (s, i) { return s.indexOf(k[i]) >= 0; }); }
    function show() {
      var m = MO[sel], fit = E.filter(function (id) { return fits(m, id); });
      var none = E.filter(function (id) { return !MO.some(function (x) { return fits(x, id); }); }).length;
      out.innerHTML = "<h4>" + escHtml(m.name) + "</h4>" +
        '<div class="mode-ans">' + ["Location", "Knower", "Decision"].map(function (t, i) { return '<p><span class="muted">' + t + "</span><br>" + m.answers[i].map(function (c) { return '<b class="ans' + (i === 0 ? " lg-" + LOCG[c] : "") + '">' + c + "</b>"; }).join(" ") + "</p>"; }).join("") + "</div>" +
        '<div class="fam-two"><p><span class="muted">What it makes easy to ask</span><br>' + escHtml(m.easy) + '</p><p><span class="muted">What it leaves to other modes</span><br>' + escHtml(m.leaves) + "</p></div>" +
        '<p class="mode-case"><span class="muted">In the worked case (§13.5)</span><br>' + escHtml(m.case) + "</p>" +
        "<p><strong>Representative entries</strong></p>" + chipList(m.reps) +
        "<p><strong>Works that fit this mode, read strictly</strong> · " + fit.length + "</p>" +
        '<ul class="worklist">' + fit.map(function (id) { return "<li>" + fpE(id) + " " + ridChip(id) + "</li>"; }).join("") + "</ul>" +
        '<p class="muted">Applying the rule to all ' + E.length + " works: no work fits two modes; " + none + " fit none, and are read from the answers they share with one or more modes.</p>";
    }
    box.appendChild(list); box.appendChild(out); show();
  };

  /* ---- genealogy: M8 the register's links over time */
  builders.genealogy = function (box, fig) {
    var scope = fig.getAttribute("data-scope") || "R";
    var ALL = scopeWorks(scope);
    var SEG = [[-450, 1000, 70], [1000, 1600, 60], [1600, 1800, 90], [1800, 1900, 110], [1900, 1950, 170], [1950, 1980, 230], [1980, 2000, 230], [2000, 2025, 160]];
    var W = SEG.reduce(function (a, s) { return a + s[2]; }, 0) + 40, base = 210, H = 420;
    function x(y) {
      var off = 20;
      for (var i = 0; i < SEG.length; i++) {
        var s = SEG[i];
        if (y <= s[1] || i === SEG.length - 1) return off + Math.max(0, Math.min(1, (y - s[0]) / (s[1] - s[0]))) * s[2];
        off += s[2];
      }
      return off;
    }
    var rel = { extends: true, critiques: true, answers: true }, sel = null;
    var tools = el("div", { "class": "gen-tools" });
    ["extends", "critiques", "answers"].forEach(function (r) {
      var n = 0; ALL.forEach(function (id) { R[id].ln.forEach(function (l) { if (l[1] === r && ALL.indexOf(l[0]) >= 0) n++; }); });
      var b = el("button", { type: "button", "class": "chip rel-" + r, "aria-pressed": "true" }, '<span class="dot"></span>' + r + ' <span class="n">' + n + "</span>");
      b.addEventListener("click", function () { rel[r] = !rel[r]; b.setAttribute("aria-pressed", String(rel[r])); draw(); });
      tools.appendChild(b);
    });
    var wrap = el("div", { "class": "gen-wrap" }), out = el("div", { "class": "gen-out" });
    box.appendChild(tools); box.appendChild(wrap); box.appendChild(out);
    function draw() {
      var s = '<svg class="gen" viewBox="0 0 ' + W + " " + H + '" width="' + W + '" height="' + H + '" role="img" aria-label="Links between works, by year of first publication">';
      var off = 20;
      SEG.forEach(function (sg, i) {
        s += '<line class="gen-tick" x1="' + off + '" x2="' + off + '" y1="' + (base - 190) + '" y2="' + (base + 190) + '"></line><text class="gen-y" x="' + (off + 3) + '" y="' + (H - 4) + '">' + (sg[0] < 0 ? Math.abs(sg[0]) + " BCE" : sg[0]) + "</text>";
        off += sg[2];
      });
      s += '<line class="gen-base" x1="20" x2="' + (W - 20) + '" y1="' + base + '" y2="' + base + '"></line>';
      var focus = sel ? [sel].concat(R[sel].ln.map(function (l) { return l[0]; }), R[sel].lf.map(function (l) { return l[0]; })) : null;
      ALL.forEach(function (id) {
        R[id].ln.forEach(function (l) {
          if (!rel[l[1]] || ALL.indexOf(l[0]) < 0) return;
          var a = x(yearOf(id)[0]), b = x(yearOf(l[0])[0]), up = l[1] === "extends";
          var r = Math.abs(a - b) / 2, h = Math.min(185, Math.max(8, r * 0.9));
          var on = sel && (id === sel || l[0] === sel);
          s += '<path class="arc rel-' + l[1] + (sel ? (on ? " on" : " dim") : "") + '" d="M' + a + "," + base + " C" + a + "," + (base + (up ? -h : h) * 1.33) + " " + b + "," + (base + (up ? -h : h) * 1.33) + " " + b + "," + base + '"></path>';
        });
      });
      ALL.forEach(function (id) {
        var yy = yearOf(id), a = x(yy[0]), b = x(yy[1]);
        var cls = R[id].m === "ME" ? "both" : "cat-" + R[id].m;
        var dim = focus && focus.indexOf(id) < 0;
        if (b - a > 2) s += '<line class="gen-span' + (dim ? " dim" : "") + '" x1="' + a + '" x2="' + b + '" y1="' + base + '" y2="' + base + '"></line>';
        s += '<circle class="gen-dot ' + cls + (dim ? " dim" : "") + (id === sel ? " on" : "") + '" cx="' + a + '" cy="' + base + '" r="' + (id === sel ? 5.5 : 3.6) + '" data-id="' + id + '" tabindex="-1"><title>' + id + " " + escHtml(shortName(id)) + "</title></circle>";
      });
      s += '<text class="gen-lab" x="24" y="18">above: extends</text><text class="gen-lab" x="24" y="' + (H - 22) + '">below: critiques, answers</text>';
      wrap.innerHTML = s + "</svg>";
    }
    wrap.addEventListener("click", function (e) {
      var c = e.target.closest(".gen-dot");
      if (!c) return;
      var id = c.getAttribute("data-id");
      sel = sel === id ? null : id;
      draw();
      out.innerHTML = sel ? "<p>" + ridChip(sel) + " · links " + R[sel].ln.length + ", linked from " + R[sel].lf.length + '</p><p><button type="button" class="chip" data-open="' + sel + '">Open the entry</button></p>' : "";
    });
    out.addEventListener("click", function (e) { var b = e.target.closest("[data-open]"); if (b) showRecord(b, b.getAttribute("data-open")); });
    out.innerHTML = '<p class="muted">Choose a dot to follow one work\'s links. Dots: blue, the Catalogue of Scientific Methods; plum, the Catalogue of Epistemological Science; both colours, in both.</p>';
    draw();
  };

  /* ---- shared helpers for the browse, tally and sections modules */
  function scopeWorks(scope) { return ALL.filter(function (id) { return scope === "R" || R[id].m.indexOf(scope) >= 0; }); }
  function secLabel(id, k) { return (DOC === "R" ? D.numbers[k] + " " : "") + "§" + D.sections[R[id].s[k]]; }
  function workLine(id) {
    var g = "";
    if (inM(id) && DOC !== "E") g += fpM(id);
    if (inE(id) && DOC !== "M") g += " " + fpE(id);
    return "<li>" + g + " " + ridChip(id) + ' <span class="wl-meta">' + escHtml(R[id].tr) + "</span></li>";
  }
  function listBlock(title, list) {
    return "<p><strong>" + title + "</strong> · " + list.length + (list.length === 1 ? " work" : " works") + '</p><ul class="worklist">' + list.map(workLine).join("") + "</ul>";
  }
  function goToNode(node) {
    var panel = node.closest(".panel");
    if (!panel) return;
    openPanel(panel.id, { noScroll: true });
    setTimeout(function () {
      if (narrow.matches) node.scrollIntoView({ block: "center", behavior: "smooth" });
      else { var sc = scroller(panel); sc.scrollTo({ top: node.getBoundingClientRect().top - sc.getBoundingClientRect().top + sc.scrollTop - 90, behavior: "smooth" }); }
      flash(node);
    }, narrow.matches ? 60 : 380);
  }

  /* ---- browse: the works by any facet (topics, codes, sections, traditions, periods) */
  builders.browse = function (box, fig) {
    var scope = fig.getAttribute("data-scope") || DOC, works = scopeWorks(scope);
    var F = [];
    if (scope === "R") F.push({ k: "cat", name: "Catalogue", val: function (id) { return [R[id].m === "ME" ? "In both" : R[id].m === "M" ? "Only " + D.numbers.M + " Scientific Methods" : "Only " + D.numbers.E + " Epistemological Science"]; } });
    F.push({ k: "sec", name: "Section", val: function (id) { return Object.keys(R[id].s).filter(function (k) { return scope === "R" || k === scope; }).map(function (k) { return secLabel(id, k); }); } });
    F.push({ k: "tr", name: "Tradition", val: function (id) { return [R[id].tr]; } });
    F.push({ k: "pe", name: "Period of first publication", val: function (id) { return [periodOf(id)]; } });
    if (scope !== "E") AX.forEach(function (a, i) { F.push({ k: "ax" + i, name: "Axis " + (i + 1) + ": " + a[0], val: function (id) { return inM(id) ? [{ A: a[1], B: a[2], X: "Both", "-": "Not applicable" }[R[id].ax.charAt(i)]] : []; } }); });
    if (scope !== "M") ["Where is knowledge located?", "Who counts as a knower?", "How are rival claims decided?"].forEach(function (q, i) { F.push({ k: "q" + i, name: q, val: function (id) { return inE(id) ? [R[id].kn.split("|")[i]] : []; } }); });
    F.push({ k: "ct", name: "Claim type", val: function (id) { return [R[id].ct]; } });
    F.push({ k: "ty", name: "Type of work", val: function (id) { return [R[id].ty]; } });
    if (scope === "R") F.push({ k: "chk", name: "Bibliographic check", val: function (id) { return [R[id].chk]; } });
    var sel = {}, q = "", sort = "reg", showAll = false;
    var top = el("div", { "class": "br-top" });
    var input = el("input", { type: "search", placeholder: "Filter by name, title or words in the summary", "aria-label": "Filter the works" });
    top.appendChild(input);
    top.appendChild(select([["reg", "Register order"], ["year", "Year of first publication"], ["name", "Author"]], sort, function (v) { sort = v; draw(); }, "Sort"));
    var clear = el("button", { type: "button", "class": "chip" }, "Clear all");
    top.appendChild(clear);
    var facets = el("div", { "class": "br-facets" }), out = el("div", { "class": "br-out" });
    box.appendChild(top); box.appendChild(facets); box.appendChild(out);
    var open = {};
    function textOk(id) {
      if (!q) return true;
      var hay = norm(id + " " + R[id].a + " " + R[id].y + " " + R[id].t + " " + R[id].sum);
      return q.split(/\s+/).every(function (t) { return hay.indexOf(t) >= 0; });
    }
    function passes(id, except) {
      if (!textOk(id)) return false;
      return F.every(function (f) {
        if (f.k === except || !sel[f.k] || !sel[f.k].length) return true;
        var v = f.val(id);
        return sel[f.k].some(function (x) { return v.indexOf(x) >= 0; });
      });
    }
    function draw() {
      facets.innerHTML = "";
      F.forEach(function (f) {
        var counts = {}, order = [];
        works.forEach(function (id) { if (!passes(id, f.k)) return; f.val(id).forEach(function (v) { if (!(v in counts)) { counts[v] = 0; order.push(v); } counts[v]++; }); });
        var all = {};
        works.forEach(function (id) { f.val(id).forEach(function (v) { all[v] = 1; }); });
        var vals = Object.keys(all);
        if (f.k === "sec") vals.sort(function (a, b) { return a.localeCompare(b, "en", { numeric: true }); });
        else if (f.k === "pe") vals = ["Before 1600", "1600–1799", "1800–1899", "1900–1949", "1950–1979", "1980–1999", "2000 onwards"].filter(function (v) { return all[v]; });
        else vals.sort(function (a, b) { return (counts[b] || 0) - (counts[a] || 0) || (a < b ? -1 : 1); });
        var n = (sel[f.k] || []).length;
        var d = el("details", { "class": "br-facet" });
        if (open[f.k] || n) d.open = true;
        d.addEventListener("toggle", function () { open[f.k] = d.open; });
        d.innerHTML = "<summary>" + escHtml(f.name) + (n ? ' <span class="br-n">' + n + " chosen</span>" : "") + "</summary>";
        var wrap = el("div", { "class": "br-chips" });
        vals.forEach(function (v) {
          var on = (sel[f.k] || []).indexOf(v) >= 0, c = counts[v] || 0;
          var b = el("button", { type: "button", "class": "chip" + (c ? "" : " zero"), "aria-pressed": String(on) }, escHtml(v) + ' <span class="n">' + c + "</span>");
          b.addEventListener("click", function () {
            sel[f.k] = sel[f.k] || [];
            var i = sel[f.k].indexOf(v);
            if (i >= 0) sel[f.k].splice(i, 1); else sel[f.k].push(v);
            showAll = false; draw();
          });
          wrap.appendChild(b);
        });
        d.appendChild(wrap);
        facets.appendChild(d);
      });
      var res = works.filter(function (id) { return passes(id); });
      if (sort === "year") res.sort(function (a, b) { return yearOf(a)[0] - yearOf(b)[0] || (a < b ? -1 : 1); });
      if (sort === "name") res.sort(function (a, b) { return shortName(a).localeCompare(shortName(b)); });
      var chosen = F.filter(function (f) { return sel[f.k] && sel[f.k].length; }).map(function (f) { return escHtml(f.name) + ": " + sel[f.k].map(escHtml).join(" or "); });
      var shown = showAll ? res : res.slice(0, 60);
      out.innerHTML = '<p class="br-count"><strong>' + res.length + "</strong> of " + works.length + " works" + (chosen.length ? " · " + chosen.join(" · ") : "") + (q ? " · words: “" + escHtml(input.value) + "”" : "") + "</p>" +
        '<ul class="worklist">' + shown.map(workLine).join("") + "</ul>" +
        (res.length > shown.length ? '<p><button type="button" class="chip" data-more>Show all ' + res.length + "</button></p>" : "");
    }
    out.addEventListener("click", function (e) { if (e.target.closest("[data-more]")) { showAll = true; draw(); } });
    input.addEventListener("input", function () { q = norm(input.value.trim()); showAll = false; draw(); });
    clear.addEventListener("click", function () { sel = {}; q = ""; input.value = ""; draw(); });
    draw();
  };

  /* ---- sections at a glance */
  builders.sections = function (box, fig) {
    var scope = fig.getAttribute("data-scope"), works = scopeWorks(scope), by = {};
    works.forEach(function (id) { var s = R[id].s[scope]; (by[s] = by[s] || []).push(id); });
    var keys = Object.keys(by).sort(function (a, b) { return parseInt(a.slice(1), 10) - parseInt(b.slice(1), 10); });
    var grid = el("div", { "class": "sec-grid" });
    keys.forEach(function (k) {
      var list = by[k], name = D.sections[k], num = parseInt(name, 10);
      var ys = list.map(yearOf), lo = Math.min.apply(null, ys.map(function (y) { return y[0]; })), hi = Math.max.apply(null, ys.map(function (y) { return y[1]; }));
      var tr = {};
      list.forEach(function (id) { tr[R[id].tr] = (tr[R[id].tr] || 0) + 1; });
      var top = Object.keys(tr).sort(function (a, b) { return tr[b] - tr[a]; }).slice(0, 3);
      var shared = list.filter(function (id) { return R[id].m.length === 2; }).length;
      var marks = list.map(function (id) {
        return scope === "M" ? '<i class="sm">' + R[id].ax.split("").map(function (c) { return '<b class="c-' + POLE[c] + '"></b>'; }).join("") + "</i>"
          : '<i class="sm one lg-' + LOCG[R[id].kn.split("|")[0]] + '"></i>';
      }).join("");
      var fmt = function (y) { return y < 0 ? -y + " BCE" : String(y); };
      var a = el("a", { "class": "sec-card", href: "#s" + num });
      a.innerHTML = '<span class="sec-num">§' + num + '</span><span class="sec-name">' + escHtml(name.replace(/^\d+ /, "")) + "</span>" +
        '<span class="sec-facts"><b>' + list.length + "</b> works · " + fmt(lo) + "–" + fmt(hi) + (shared ? " · " + shared + " shared" : "") + "</span>" +
        '<span class="sec-marks" aria-hidden="true">' + marks + "</span>" +
        '<span class="sec-tr">' + top.map(function (t) { return escHtml(t) + " " + tr[t]; }).join(" · ") + "</span>";
      grid.appendChild(a);
    });
    box.appendChild(grid);
  };

  /* ---- tally: works under each code, as bars */
  builders.tally = function (box, fig) {
    var dim = fig.getAttribute("data-dim"), scope = fig.getAttribute("data-scope"), out = el("div", { "class": "tally-out" }), wrap = el("div", { "class": "tally" });
    box.appendChild(wrap); box.appendChild(out);
    out.innerHTML = '<p class="muted">Choose a bar to list its works.</p>';
    var rows = [];
    function show(title, list, node) {
      $$(".on", wrap).forEach(function (x) { x.classList.remove("on"); });
      if (node) node.classList.add("on");
      out.innerHTML = listBlock(escHtml(title), list);
    }
    if (dim === "axes") {
      var M = ALL.filter(inM);
      AX.forEach(function (a, i) {
        var row = el("div", { "class": "tally-row" }, '<span class="tally-name">' + (i + 1) + " " + escHtml(a[0]) + "</span>");
        var bar = el("div", { "class": "tally-stack" });
        [["A", a[1]], ["X", "Both"], ["B", a[2]], ["-", "Not applicable"]].forEach(function (p) {
          var list = M.filter(function (id) { return R[id].ax.charAt(i) === p[0]; });
          if (!list.length) return;
          var s = el("button", { type: "button", "class": "c-" + POLE[p[0]], style: "flex:" + list.length, title: p[1] + ": " + list.length }, '<span>' + escHtml(p[1]) + " " + list.length + "</span>");
          s.addEventListener("click", function () { show(a[0] + ": " + p[1], list, s); });
          bar.appendChild(s);
        });
        row.appendChild(bar); wrap.appendChild(row);
      });
      return;
    }
    var works, groups;
    if (dim === "q") {
      works = ALL.filter(inE);
      groups = ["Where is knowledge located?", "Who counts as a knower?", "How are rival claims decided?"].map(function (t, i) { return { title: t, val: function (id) { return R[id].kn.split("|")[i]; }, loc: i === 0 }; });
    } else {
      works = ALL;
      groups = [{ title: dim === "tradition" ? "Tradition" : "Claim type", val: function (id) { return dim === "tradition" ? R[id].tr : R[id].ct; }, split: true }];
    }
    groups.forEach(function (g) {
      var counts = {};
      works.forEach(function (id) { var v = g.val(id); (counts[v] = counts[v] || []).push(id); });
      var keys = Object.keys(counts).sort(function (a, b) { return counts[b].length - counts[a].length || (a < b ? -1 : 1); });
      if (g.loc) keys.sort(function (a, b) { return ["carrier", "arrangement", "position"].indexOf(LOCG[a]) - ["carrier", "arrangement", "position"].indexOf(LOCG[b]) || counts[b].length - counts[a].length; });
      var max = Math.max.apply(null, keys.map(function (k) { return counts[k].length; }));
      var block = el("div", { "class": "tally-group" }, "<h4>" + escHtml(g.title) + "</h4>");
      keys.forEach(function (k) {
        var list = counts[k];
        var b = el("button", { type: "button", "class": "tally-bar" + (g.loc ? " lg-" + LOCG[k] : "") });
        var fill = g.split ? '<i class="cat-M" style="width:' + (100 * list.filter(inM).filter(function (x) { return !inE(x); }).length / max) + '%"></i><i class="both" style="width:' + (100 * list.filter(function (x) { return R[x].m.length === 2; }).length / max) + '%"></i><i class="cat-E" style="width:' + (100 * list.filter(inE).filter(function (x) { return !inM(x); }).length / max) + '%"></i>'
          : '<i style="width:' + (100 * list.length / max) + '%"></i>';
        b.innerHTML = '<span class="tb-label">' + escHtml(k) + '</span><span class="tb-bar">' + fill + '</span><span class="tb-n">' + list.length + "</span>";
        b.addEventListener("click", function () { show(g.title + ": " + k, list, b); });
        block.appendChild(b);
      });
      wrap.appendChild(block);
    });
    if (groups[0].split) wrap.insertAdjacentHTML("afterbegin", '<p class="field-key"><span class="k cat-M">Only ' + escHtml(D.names.M) + '</span><span class="k both-k">In both</span><span class="k cat-E">Only ' + escHtml(D.names.E) + "</span></p>");
  };

  /* ---- sequence (−01 §13.3): location codes, section by section */
  builders.sequence = function (box) {
    var E = ALL.filter(inE), by = {}, out = el("div", { "class": "tally-out" }), wrap = el("div", { "class": "seq" });
    E.forEach(function (id) { var s = R[id].s.E; (by[s] = by[s] || []).push(id); });
    var codes = GROUPS.carrier.concat(GROUPS.arrangement, GROUPS.position);
    var maxN = Math.max.apply(null, Object.keys(by).map(function (k) { return by[k].length; }));
    Object.keys(by).sort(function (a, b) { return parseInt(a.slice(1), 10) - parseInt(b.slice(1), 10); }).forEach(function (k) {
      var list = by[k], name = D.sections[k];
      var row = el("div", { "class": "seq-row" }, '<span class="seq-name">§' + escHtml(name) + ' <span class="muted">' + list.length + "</span></span>");
      var bar = el("div", { "class": "tally-stack", style: "width:" + (100 * list.length / maxN) + "%" });
      codes.forEach(function (c) {
        var l = list.filter(function (id) { return R[id].kn.split("|")[0] === c; });
        if (!l.length) return;
        var s = el("button", { type: "button", "class": "lg-" + LOCG[c], style: "flex:" + l.length, title: c + ": " + l.length }, "<span>" + c + " " + l.length + "</span>");
        s.addEventListener("click", function () { $$(".on", wrap).forEach(function (x) { x.classList.remove("on"); }); s.classList.add("on"); out.innerHTML = listBlock("§" + escHtml(name) + ": " + c, l); });
        bar.appendChild(s);
      });
      row.appendChild(bar); wrap.appendChild(row);
    });
    box.appendChild(el("p", { "class": "field-key" }, '<span class="k lg-carrier">What carries it</span><span class="k lg-arrangement">What arrangement produces it</span><span class="k lg-position">From what position</span>'));
    box.appendChild(wrap); box.appendChild(out);
  };

  /* ---- ledger: filter the claims in this panel */
  builders.ledger = function (box, fig) {
    var panel = fig.closest(".panel"), heads = $$("h4[id^='C-']", panel), blocks = [];
    heads.forEach(function (h) {
      var b = el("div", { "class": "claim-block" });
      h.parentNode.insertBefore(b, h);
      var n = h;
      while (n && !(n !== h && /^H[234]$/.test(n.tagName))) { var next = n.nextElementSibling; b.appendChild(n); n = next; }
      blocks.push([h.id, b]);
    });
    var facets = [["status", "Status"], ["grade", "Grade"]].concat(DOC === "R" ? [["maps", "Catalogue"]] : []);
    var sel = {};
    function val(id, f) { var c = D.claims[id]; return f === "maps" ? c.maps.map(function (m) { return D.numbers[m] + " " + D.names[m].replace("Catalogue of ", ""); }) : [c[f]]; }
    var tools = el("div", { "class": "ledger-tools" }), count = el("p", { "class": "br-count" });
    facets.forEach(function (f) {
      var vals = {};
      blocks.forEach(function (b) { val(b[0], f[0]).forEach(function (v) { vals[v] = (vals[v] || 0) + 1; }); });
      var row = el("div", { "class": "row" }, "<span>" + f[1] + "</span>");
      Object.keys(vals).forEach(function (v) {
        var c = el("button", { type: "button", "class": "chip", "aria-pressed": "false" }, escHtml(v) + ' <span class="n">' + vals[v] + "</span>");
        c.addEventListener("click", function () { sel[f[0]] = sel[f[0]] === v ? null : v; $$(".chip", row).forEach(function (x) { x.setAttribute("aria-pressed", String(x === c && sel[f[0]] === v)); }); apply(); });
        row.appendChild(c);
      });
      tools.appendChild(row);
    });
    function apply() {
      var shown = 0;
      blocks.forEach(function (b) {
        var ok = facets.every(function (f) { return !sel[f[0]] || val(b[0], f[0]).indexOf(sel[f[0]]) >= 0; });
        b[1].hidden = !ok; if (ok) shown++;
      });
      count.textContent = "Showing " + shown + " of " + blocks.length + " claims";
    }
    box.appendChild(tools); box.appendChild(count); apply();
  };

  /* ---- search: works, this page's text, glossary terms, claims */
  function norm(s) { return String(s).normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[‘’]/g, "'").toLowerCase(); }
  (function () {
    var btn = el("button", { "class": "tool search-btn", type: "button", "aria-label": "Search (press /)", title: "Search (press /)" },
      '<svg viewBox="0 0 16 16" aria-hidden="true"><circle cx="6.8" cy="6.8" r="4.6" fill="none" stroke="currentColor" stroke-width="1.6"/><path d="m10.3 10.3 4 4" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/></svg>');
    var tools = $(".topbar-tools");
    tools.insertBefore(btn, tools.firstChild);
    var dlg = el("div", { "class": "search", role: "dialog", "aria-modal": "true", "aria-label": "Search", hidden: "" });
    dlg.innerHTML = '<div class="search-box"><div class="search-head"><input type="search" placeholder="Search works, codes, this page’s text, glossary and claims" aria-label="Search"><button type="button" class="close" aria-label="Close search">×</button></div><div class="search-res" role="listbox"></div><p class="search-foot">Works come from the whole register; text, glossary and claims from this page. <kbd>↑</kbd> <kbd>↓</kbd> to move, <kbd>Enter</kbd> to open, <kbd>Esc</kbd> to close.</p></div>';
    document.body.appendChild(dlg);
    var input = $("input", dlg), res = $(".search-res", dlg), idx = null, hits = [], cur = -1;
    function build() {
      idx = { works: ALL.map(function (id) {
        var w = R[id], codes = "";
        if (inM(id)) codes += w.ax.split("").map(function (c, i) { return poleName(i, c); }).join(" ");
        if (inE(id)) codes += " " + w.kn.replace(/\|/g, " ");
        return { id: id, head: norm(id + " " + w.a + " " + w.y + " " + w.t), rest: norm(w.tr + " " + w.ty + " " + w.ct + " " + codes + " " + w.sum + " " + w.rd) };
      }), nodes: $$(".panel .prose h2, .panel .prose h3, .panel .prose h4, .panel .prose p, .panel .prose li, .panel .prose td").filter(function (n) {
        return !n.closest("figure, .explore, nav") && !(n.tagName === "LI" && n.querySelector("p")) && n.textContent.trim().length > 2;
      }).map(function (n) { return { n: n, t: norm(n.textContent), raw: n.textContent.replace(/\s+/g, " ").trim() }; }) };
    }
    function snippet(raw, toks) {
      var t = norm(raw), i = t.indexOf(toks[0]), start = Math.max(0, i - 60);
      var s = (start ? "…" : "") + raw.slice(start, start + 200) + (start + 200 < raw.length ? "…" : "");
      var h = escHtml(s);
      toks.forEach(function (tk) {
        var re = new RegExp("(" + tk.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + ")", "gi");
        h = h.replace(re, "<mark>$1</mark>");
      });
      return h;
    }
    function run() {
      var q = norm(input.value.trim());
      hits = []; cur = -1;
      if (q.length < 2) { res.innerHTML = '<p class="muted">Type at least two letters: an author, a title, a code such as <em>situated</em> or <em>coherence</em>, a tradition, or any words in the text.</p>'; return; }
      if (!idx) build();
      var toks = q.split(/\s+/);
      var works = idx.works.map(function (w) {
        var sc = 0;
        for (var i = 0; i < toks.length; i++) { var t = toks[i]; if (w.head.indexOf(t) >= 0) sc += 3; else if (w.rest.indexOf(t) >= 0) sc += 1; else return null; }
        return [sc, w.id];
      }).filter(Boolean).sort(function (a, b) { return b[0] - a[0] || (a[1] < b[1] ? -1 : 1); });
      var gl = Object.keys(D.glossary).filter(function (k) { return toks.every(function (t) { return norm(k + " " + D.glossary[k]).indexOf(t) >= 0; }); });
      var cl = Object.keys(D.claims).filter(function (k) { return (DOC === "R" || D.claims[k].maps.indexOf(DOC) >= 0) && toks.every(function (t) { return norm(k + " " + D.claims[k].st).indexOf(t) >= 0; }); });
      var nodes = idx.nodes.filter(function (x) { return toks.every(function (t) { return x.t.indexOf(t) >= 0; }); });
      var h = "";
      if (works.length) {
        h += '<h3 class="sr-h">Works in the register · ' + works.length + "</h3>";
        works.slice(0, 25).forEach(function (w) { hits.push({ kind: "work", id: w[1] }); h += '<button type="button" class="sr" data-i="' + (hits.length - 1) + '">' + (inM(w[1]) ? fpM(w[1]) : fpE(w[1])) + ' <span class="sr-t">' + escHtml(shortName(w[1])) + " · " + w[1] + "</span><span class=\"sr-s\">" + escHtml(R[w[1]].t.replace(/\*/g, "")) + " · " + (R[w[1]].m.length === 2 ? "both catalogues" : D.numbers[R[w[1]].m]) + "</span></button>"; });
      }
      if (gl.length) {
        h += '<h3 class="sr-h">Glossary · ' + gl.length + "</h3>";
        gl.slice(0, 8).forEach(function (k) { hits.push({ kind: "gl", id: k }); h += '<button type="button" class="sr" data-i="' + (hits.length - 1) + '"><span class="sr-t">' + escHtml(k) + '</span><span class="sr-s">' + escHtml(D.glossary[k].replace(/<[^>]+>/g, "").slice(0, 140)) + "</span></button>"; });
      }
      if (cl.length) {
        h += '<h3 class="sr-h">Claims · ' + cl.length + "</h3>";
        cl.forEach(function (k) { hits.push({ kind: "claim", id: k }); h += '<button type="button" class="sr" data-i="' + (hits.length - 1) + '"><span class="sr-t">' + k + '</span><span class="sr-s">' + snippet(D.claims[k].st.replace(/\*/g, ""), toks) + "</span></button>"; });
      }
      if (nodes.length) {
        h += '<h3 class="sr-h">On this page · ' + nodes.length + (nodes.length > 40 ? ", first 40 shown" : "") + "</h3>";
        nodes.slice(0, 40).forEach(function (x) { hits.push({ kind: "node", n: x.n }); var p = x.n.closest(".panel"); h += '<button type="button" class="sr" data-i="' + (hits.length - 1) + '"><span class="sr-t">' + escHtml(p ? p.querySelector(".spine-label").textContent : "") + '</span><span class="sr-s">' + snippet(x.raw, toks) + "</span></button>"; });
      }
      res.innerHTML = h || '<p class="muted">Nothing found.</p>';
    }
    function openHit(i) {
      var x = hits[i];
      if (!x) return;
      close();
      if (x.kind === "node") { goToNode(x.n); return; }
      if (x.kind === "gl") { var slug = x.id.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""); var g = document.getElementById("gl-" + slug); if (g) goToNode(g); return; }
      if (x.kind === "claim") { var c = document.getElementById(x.id); if (c) goToNode(c); return; }
      var anchor = document.getElementById(x.id) || btn;
      if (anchor !== btn) { goToNode(anchor); setTimeout(function () { showRecord(anchor.querySelector(".fp-btn") || anchor, x.id); }, narrow.matches ? 500 : 800); }
      else showRecord(btn, x.id);
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
        e.preventDefault();
        cur = Math.max(0, Math.min(items.length - 1, cur + (e.key === "ArrowDown" ? 1 : -1)));
        items.forEach(function (b, i) { b.classList.toggle("cur", i === cur); });
        if (items[cur]) items[cur].scrollIntoView({ block: "nearest" });
      } else if (e.key === "Enter") { e.preventDefault(); openHit(cur >= 0 ? cur : 0); }
      else if (e.key === "Escape") { close(); btn.focus(); }
    });
    document.addEventListener("keydown", function (e) {
      var t = e.target;
      if (e.key !== "/" || e.altKey || e.ctrlKey || e.metaKey || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName) || t.isContentEditable) return;
      e.preventDefault(); open();
    });
  })();

  /* ---- statuses and section notes: the text's own labels, made visible (classes only; the words are unchanged) */
  var STATUS = /^(Checkable claim|Proposal|Direction|Question|Illustration)\b/;
  $$(".prose em, .prose strong").forEach(function (n) {
    if (n.closest("figure, h2, h3, h4, table")) return;
    var m = n.textContent.trim().match(STATUS);
    if (m && n.textContent.trim().length < 60) n.classList.add("st", "st-" + m[1].split(" ")[0].toLowerCase());
  });
  $$(".prose p > strong:first-child").forEach(function (s) {
    if (/^(What this section adds|Closing)\.?$/.test(s.textContent.trim())) s.parentNode.classList.add("adds");
  });

  $$("[data-explore]").forEach(function (fig) {
    var kind = fig.getAttribute("data-explore");
    var box = fig.querySelector(".explore-body");
    if (builders[kind]) {
      try { box.innerHTML = ""; builders[kind](box, fig); } catch (err) { box.innerHTML = "<p>This interactive figure could not be shown.</p>"; if (window.console) console.error(err); }
    }
  });

  /* ------------------------------------------------------------ start */
  var start = location.hash.slice(1);
  if (start && document.getElementById(start)) goTo(start, { instant: true });
  else openPanel("cover", { instant: true, noScroll: true });
  narrow.addEventListener("change", function () { if (current) openPanel(current.id, { keepScroll: true, noScroll: true }); });
})();
