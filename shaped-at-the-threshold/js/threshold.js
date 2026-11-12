/* Shaped at the Threshold — web edition 0.0.8
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
  var TITLE = "Shaped at the Threshold";
  var store = {
    get: function (k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
    set: function (k, v) { try { localStorage.setItem(k, v); } catch (e) { /* private mode */ } }
  };

  function $(sel, root) { return (root || document).querySelector(sel); }
  function $$(sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }
  function escHtml(s) { return String(s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); }
  function scroller(p) { return p.querySelector(".panel-scroll"); }
  function gradeClass(g) { return g === "Open (untested)" ? "openu" : /^Open/.test(g) ? "open" : g === "Not graded" ? "none" : g.toLowerCase(); }
  function gradeChip(g) { return '<span class="grade grade-' + gradeClass(g) + '">' + escHtml(g) + "</span>"; }
  function lnk(id) { return '<a class="lnk" href="#link-' + id + '" data-link="' + id + '">' + id + "</a>"; }
  function predA(id) { return '<a class="pred" href="#pred-' + id + '" data-pred="' + id + '">' + id + "</a>"; }
  function cite(key, label) { return '<a class="cite" href="#ref-' + key + '" data-ref="' + key + '">' + label + "</a>"; }
  function xref(id, label) { return '<a class="xref" href="#' + id + '">' + label + "</a>"; }
  /* plain text from the paper's tables, escaped, with ledger links, predictions and sections made into links */
  function linkify(s) {
    return escHtml(s)
      .replace(/(^|[^\w-])(L\d{1,2}[ab]?)(?![\w])/g, function (m, pre, id) { return D.links[id] ? pre + lnk(id) : m; })
      .replace(/(^|[^\w.\-])([67][a-h])(?![\w])/g, function (m, pre, id) { return D.preds[id] ? pre + predA(id) : m; })
      .replace(/\b(sections? )(\d{1,2})(?:\.(\d))?\b/g, function (m, w, a, b) { var id = "s" + a + (b ? "-" + b : ""); return document.getElementById(id) ? w + xref(id, a + (b ? "." + b : "")) : m; });
  }

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
      if (id !== "cover") store.set("sat-last", id);
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
    if (a.classList.contains("lnk")) { e.preventDefault(); showLink(a, a.getAttribute("data-link")); return; }
    if (a.classList.contains("pred")) { e.preventDefault(); showPred(a, a.getAttribute("data-pred")); return; }
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
    if (a.classList.contains("lnk") || a.classList.contains("pred") || a.classList.contains("cite")) return;
    if ((a.getAttribute("href") || "").charAt(0) === "#") hidePop();
  });

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
      '<a href="#ref-' + key + '">In the references</a></div>' +
      '<div class="pop-note">' + escHtml(search ? "No verified open link was found for this work." : "Link: " + r.note + ".") + "</div>");
  }

  function showLink(a, id) {
    var c = D.links[id];
    if (!c) return;
    showPop(a,
      '<div class="pop-kind">Evidence ledger · ' + id + "</div>" +
      '<div class="pop-entry">' + escHtml(c.link) + "</div>" +
      '<p class="pop-meta">' + gradeChip(c.grade) + ' <span class="eff eff-' + c.effect.toLowerCase() + '">' + escHtml(c.effect) + '</span> <span class="dist">' + escHtml(c.code) + "</span></p>" +
      '<p class="pop-small"><strong>Sources and designs.</strong> ' + escHtml(c.sources) + "</p>" +
      '<p class="pop-small"><strong>Distance from the albums.</strong> ' + escHtml(c.distance) + "</p>" +
      '<div class="pop-actions"><a class="primary" href="#link-' + id + '">See it in the ledger →</a></div>');
  }

  function showPred(a, id) {
    var p = D.preds[id];
    if (!p) return;
    showPop(a,
      '<div class="pop-kind">Prediction ' + escHtml(p.label) + " · " + (p.album === "tomze" ? "Com Defeito de Fabricação" : "Biophilia") + "</div>" +
      '<div class="pop-entry">' + escHtml(p.text) + "</div>" +
      '<p class="pop-small"><strong>Fails if.</strong> ' + escHtml(p.fails) + "</p>" +
      '<div class="pop-actions"><a class="primary" href="#pred-' + id + '">See it in the table →</a><a href="#contrasts" data-choose="' + id + '">What tests it</a></div>');
  }
  document.addEventListener("click", function (e) {
    var a = e.target.closest("[data-choose]");
    if (!a) return;
    var fig = document.getElementById("contrasts");
    if (fig && fig._choose) fig._choose(a.getAttribute("data-choose"));
  }, true);

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

  /* ------------------------------------------------------------ settings, citation, resume */
  $("[data-theme-toggle]").addEventListener("click", function () {
    var root = document.documentElement;
    var dark = root.dataset.theme ? root.dataset.theme === "dark" : window.matchMedia("(prefers-color-scheme: dark)").matches;
    root.dataset.theme = dark ? "light" : "dark";
    store.set("sat-theme", root.dataset.theme);
  });
  $("[data-size-toggle]").addEventListener("click", function () {
    var root = document.documentElement;
    var next = { "": "l", l: "xl", xl: "" }[root.dataset.size || ""];
    if (next) root.dataset.size = next; else delete root.dataset.size;
    store.set("sat-size", next);
  });
  $$("[data-copy-cite]").forEach(function (b) {
    b.addEventListener("click", function () {
      var done = function () { var t = b.textContent; b.textContent = "Copied"; setTimeout(function () { b.textContent = t; }, 1600); };
      if (navigator.clipboard) navigator.clipboard.writeText(CITE).then(done, function () { window.prompt("Citation", CITE); });
      else window.prompt("Citation", CITE);
    });
  });
  var last = store.get("sat-last");
  var resume = $(".resume");
  if (resume && last && last !== "cover" && document.getElementById(last)) {
    resume.hidden = false;
    resume.querySelector("a").setAttribute("href", "#" + last);
    resume.querySelector("span").textContent = document.querySelector("#" + last + " .spine-label").textContent;
  }

  /* ------------------------------------------------------------ sound: one recording at a time */
  var player = { audio: null, stop: null };
  function stopSound() {
    if (player.audio) { player.audio.pause(); player.audio = null; }
    if (player.stop) { var f = player.stop; player.stop = null; f(); }
  }

  /* ------------------------------------------------------------ explorables */
  var builders = {};

  /* Try it yourself: the listening demonstrations, drawn as the notes in each file */
  var STEPS = {
    dowling: [
      { file: "try-1", title: "Listen", show: "grey",
        text: "Listen. Is there a tune in it? Which?" },
      { file: "try-2", title: "The tune alone", show: "tune",
        text: "The tune alone. It is “Twinkle, Twinkle, Little Star”." },
      { file: "try-3", title: "Named", show: "grey", reveal: "Show the tune's notes",
        text: "The same audio as the first, sample for sample. Now listen for “Twinkle, Twinkle”. Nothing in the signal has changed, only the cue: if you hear it now, that is an access effect (" + xref("s2-1", "section 2.1") + ")." },
      { file: "try-4", title: "An octave above", show: "both",
        text: "The tune moved an octave above the distractors, with no name given. In " + cite("dowling-1973", "Dowling (1973)") + ", six practised listeners could not pick the tunes out while the ranges overlapped. Here they no longer overlap (" + xref("s4-2", "section 4.2") + ", the detectability hypothesis)." },
      { file: "try-5", title: "A catch trial", show: "grey", reveal: "Reveal",
        text: "Listen for “Twinkle, Twinkle” again.",
        after: "It is not there; a different familiar tune, “Frère Jacques”, is. Did you hear the named tune anyway (a false report, " + lnk("L11b") + "), or miss the tune that is there (" + lnk("L10") + ")? Dowling's six listeners did not report the absent tune, and none noticed the substitute." },
      { file: "try-6", title: "White noise", show: "noise", reveal: "Reveal",
        text: "Thirty seconds of white noise. Listen for “White Christmas”, and stop the moment you hear it.",
        after: "There is nothing in the file but noise. In " + cite("merckelbach-2001", "Merckelbach and van de Ven (2001)") + ", 14 of 44 students given this instruction pressed a button at least once (" + lnk("L11a") + "). False recognition may depend on how much structure the signal offers for a name to fasten on (" + xref("s4-3", "section 4.3") + ")." }
    ],
    weakmask: [
      { file: "try-7", title: "Weak", show: "amp", reveal: "Show the tune",
        text: "The tune, very quiet, under a louder line well above it. Knowing what to listen for may help, but there is little signal to follow." },
      { file: "try-8", title: "Masked", show: "amp", reveal: "Show the tune",
        text: "The tune at full level among three competing notes in its own range at every step. The signal is all there; the task is to follow the right line. A cue may help with masking, by telling the listener which of several competing streams to follow, more than with weakness (" + xref("s4-2", "section 4.2") + ")." }
    ]
  };
  builders["try"] = function (box) {
    var set = box.closest("figure").getAttribute("data-set");
    var steps = STEPS[set];
    var step = 0, revealed = false, raf = null;
    box.innerHTML = '<div class="try">' +
      '<div class="try-steps" role="tablist">' + steps.map(function (s, i) { return '<button type="button" role="tab" data-i="' + i + '"><b>' + (set === "dowling" ? i + 1 : "") + "</b> " + escHtml(s.title) + "</button>"; }).join("") + "</div>" +
      '<div class="try-main"><div class="try-roll"></div>' +
      '<div class="try-side"><div class="try-controls"><button type="button" class="try-play" aria-label="Play"><svg viewBox="0 0 16 16" aria-hidden="true"><path class="i-play" d="M4 2.5v11l9-5.5z"/><path class="i-stop" d="M3.5 3.5h9v9h-9z"/></svg><span>Play</span></button>' +
      '<span class="try-time" aria-live="off"></span></div><p class="try-text"></p><button type="button" class="try-reveal"></button><p class="try-after" aria-live="polite"></p>' +
      '<div class="try-nav"><button type="button" data-d="-1">← Previous</button><button type="button" data-d="1">Next →</button></div></div></div></div>';
    var roll = $(".try-roll", box), playBtn = $(".try-play", box), timeEl = $(".try-time", box);
    function draw() {
      var s = steps[step], d = D.demo[s.file];
      var W = 640, H = 240, padL = 8, padR = 8, padT = 12, padB = 22;
      var out = ['<svg viewBox="0 0 ' + W + " " + H + '" role="img" aria-label="' + escHtml(s.title + ": " + (s.show === "noise" ? "white noise, no notes" : "the notes in the recording, one repetition")) + '">'];
      if (s.show === "noise") {
        var seed = 7;
        var rnd = function () { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
        for (var k = 0; k < 900; k++) out.push('<rect class="speck" x="' + (padL + rnd() * (W - padL - padR)).toFixed(1) + '" y="' + (padT + rnd() * (H - padT - padB)).toFixed(1) + '" width="2" height="2" opacity="' + (0.15 + rnd() * 0.5).toFixed(2) + '"/>');
        out.push('<text class="roll-axis" x="' + padL + '" y="' + (H - 6) + '">30 seconds of noise; no notes</text>');
      } else {
        var ms = d.notes.map(function (n) { return n.m; });
        var lo = Math.min.apply(null, ms) - 1, hi = Math.max.apply(null, ms) + 1;
        var x = function (t) { return padL + t / d.rep * (W - padL - padR); };
        var y = function (m) { return H - padB - (m - lo) / (hi - lo) * (H - padT - padB); };
        for (var m = lo; m <= hi; m++) out.push('<line class="roll-line' + (m % 12 === 0 ? " c" : "") + '" x1="' + padL + '" x2="' + (W - padR) + '" y1="' + y(m).toFixed(1) + '" y2="' + y(m).toFixed(1) + '"/>');
        var bh = Math.max(4, (H - padT - padB) / (hi - lo) * 0.72);
        d.notes.forEach(function (n, i) {
          var cls = "note" + (n.tune ? " t" : " o");
          out.push('<rect class="' + cls + '" data-i="' + i + '" x="' + x(n.t).toFixed(1) + '" y="' + (y(n.m) - bh / 2).toFixed(1) + '" width="' + Math.max(3, x(n.t + n.d) - x(n.t) - 2).toFixed(1) + '" height="' + bh.toFixed(1) + '" rx="' + (bh / 2).toFixed(1) + '" style="--a:' + (0.25 + 0.75 * n.a).toFixed(2) + '"/>');
        });
        out.push('<text class="roll-axis" x="' + padL + '" y="' + (H - 6) + '">one repetition, ' + d.rep + " s" + (d.repeats > 1 ? " (plays " + d.repeats + " times)" : "") + '</text><text class="roll-axis" x="' + (W - padR) + '" y="' + (H - 6) + '" text-anchor="end">pitch ↑ · time →</text>');
      }
      out.push('<line class="playhead" x1="0" x2="0" y1="' + padT + '" y2="' + (H - padB) + '" style="opacity:0"/></svg>');
      roll.innerHTML = out.join("");
      roll.className = "try-roll show-" + s.show + (revealed ? " revealed" : "");
    }
    function render() {
      var s = steps[step];
      $$(".try-steps button", box).forEach(function (b, i) { b.setAttribute("aria-selected", i === step ? "true" : "false"); b.classList.toggle("seen", i < step); });
      $(".try-text", box).innerHTML = s.text;
      var rv = $(".try-reveal", box);
      rv.hidden = !s.reveal;
      rv.textContent = revealed ? (s.after ? "Hide" : "Hide the tune") : (s.reveal || "");
      rv.setAttribute("aria-pressed", revealed ? "true" : "false");
      $(".try-after", box).innerHTML = revealed && s.after ? s.after : "";
      $("[data-d='-1']", box).disabled = step === 0;
      $("[data-d='1']", box).disabled = step === steps.length - 1;
      timeEl.textContent = "";
      draw();
    }
    function setPlaying(on) {
      box.classList.toggle("playing", on);
      $("span", playBtn).textContent = on ? "Stop" : "Play";
      playBtn.setAttribute("aria-label", on ? "Stop" : "Play");
    }
    function tick() {
      if (!player.audio || player.owner !== box) return;
      var s = steps[step], d = D.demo[s.file], t = player.audio.currentTime;
      timeEl.textContent = t.toFixed(1) + " s";
      var ph = $(".playhead", roll);
      var cyc = d.rep + d.gap, pos = d.repeats > 1 ? t % cyc : t;
      if (s.show !== "noise" && ph) {
        var W = 640, x = 8 + Math.min(pos, d.rep) / d.rep * (W - 16);
        ph.setAttribute("x1", x); ph.setAttribute("x2", x); ph.style.opacity = pos <= d.rep ? 1 : 0;
        $$(".note", roll).forEach(function (r) {
          var n = d.notes[+r.getAttribute("data-i")];
          r.classList.toggle("on", pos >= n.t && pos < n.t + n.d);
        });
      } else if (ph) {
        var W2 = 640; ph.setAttribute("x1", 8 + t / 30 * (W2 - 16)); ph.setAttribute("x2", 8 + t / 30 * (W2 - 16)); ph.style.opacity = 1;
      }
      raf = requestAnimationFrame(tick);
    }
    function play() {
      if (player.audio && player.owner === box) { stopSound(); return; }
      stopSound();
      var a = new Audio(D.demo[steps[step].file].file);
      player.audio = a; player.owner = box;
      player.stop = function () { setPlaying(false); cancelAnimationFrame(raf); var ph = $(".playhead", roll); if (ph) ph.style.opacity = 0; $$(".note.on", roll).forEach(function (r) { r.classList.remove("on"); }); };
      a.addEventListener("ended", function () { if (player.audio === a) stopSound(); });
      a.addEventListener("error", function () { if (player.audio === a) stopSound(); timeEl.textContent = "Recording unavailable"; });
      setPlaying(true);
      a.play().then(function () { raf = requestAnimationFrame(tick); }, function () { stopSound(); });
    }
    box.addEventListener("click", function (e) {
      var b = e.target.closest("button");
      if (!b) return;
      if (b === playBtn) return play();
      if (b.classList.contains("try-reveal")) { revealed = !revealed; render(); return; }
      var i = b.hasAttribute("data-i") ? +b.getAttribute("data-i") : b.hasAttribute("data-d") ? step + +b.getAttribute("data-d") : null;
      if (i === null || i === step || i < 0 || i >= steps.length) return;
      if (player.owner === box) stopSound();
      step = i; revealed = false; render();
    });
    render();
  };

  /* Figure 1, interactive */
  builders.levels = function (box) {
    var F = D.fig1, cols = F.columns;
    var band = { availability: "Availability", access: "Access effects", framing: "Framing effects" };
    box.innerHTML = '<div class="lv">' +
      '<div class="lv-bands"><span class="b-av">' + band.availability + '</span><span class="b-ac">' + band.access + '</span><span class="b-fr">' + band.framing + "</span></div>" +
      '<div class="lv-grid">' + cols.map(function (c) {
        return '<div class="lv-col lv-' + c.band + '" data-col="' + c.id + '"><div class="lv-head"><b>' + escHtml(c.head) + "</b><span>" + escHtml(c.sub) + "</span></div>" +
          '<div class="lv-level"><b>' + escHtml(c.level) + "</b><span>" + escHtml(c.means) + "</span></div>" +
          '<button type="button" class="lv-mat" data-col="' + c.id + '" aria-pressed="false"><b>' + escHtml(c.material) + "</b><span>" + escHtml(c.acts) + "</span></button>" +
          '<div class="lv-measure"><i>Measured by</i> ' + escHtml(c.measure) + "</div></div>";
      }).join("") + '<div class="lv-search" aria-hidden="true"><span>sets the search</span></div></div>' +
      '<div class="lv-detail" aria-live="polite"></div></div>';
    var detail = $(".lv-detail", box);
    function select(id) {
      var c = cols.filter(function (x) { return x.id === id; })[0];
      $$(".lv-col", box).forEach(function (el) { el.classList.toggle("on", el.getAttribute("data-col") === id); });
      $$(".lv-mat", box).forEach(function (el) { el.setAttribute("aria-pressed", el.getAttribute("data-col") === id ? "true" : "false"); });
      box.querySelector(".lv").classList.toggle("search-on", id === "report" || id === "uptake");
      var fs = F.functions.filter(function (f) { return f.level === id; });
      var h = "<h4>" + escHtml(c.material) + ' <span class="arrow">→</span> ' + escHtml(c.head.toLowerCase()) + "</h4>";
      if (c.table) h += '<dl class="lv-dl"><dt>' + escHtml(c.table.term) + "</dt><dd>" + escHtml(c.table.means) + "</dd><dt>Typical measure</dt><dd>" + escHtml(c.table.measure) + "</dd></dl>";
      if (id === "signal") h += "<p>" + linkify(F.caption) + " The question then moves from what is accessible to what is available: see the boundary case in " + xref("s7-5", "section 7.5") + ".</p>";
      if (id === "judgement") h += '<p class="muted">Judgement is the fourth level that Figure 1 adds to the three of section 2.1: how the sound is liked, imagined or explained. Changes here are framing effects.</p>';
      if (id === "report") h += '<p class="muted">The credit also sets the search that uptake carries out: the dashed link in the figure.</p>';
      fs.forEach(function (f) {
        h += '<div class="lv-fn"><div class="lv-fn-head"><b>' + escHtml(f.name) + '</b> <span class="muted">' + escHtml(f.mechanism) + " · " + escHtml(f.effect) + "</span></div>" +
          '<div class="lv-links">' + f.links.map(function (i) { return '<span class="lv-link">' + lnk(i) + gradeChip(D.links[i].grade) + "</span>"; }).join("") +
          (f.costs.length ? '<span class="lv-cost">attentional costs:</span>' + f.costs.map(function (i) { return '<span class="lv-link">' + lnk(i) + gradeChip(D.links[i].grade) + "</span>"; }).join("") : "") + "</div></div>";
      });
      detail.innerHTML = h;
    }
    box.addEventListener("click", function (e) {
      var b = e.target.closest(".lv-mat, .lv-col");
      if (b && !e.target.closest("a")) select(b.getAttribute("data-col"));
    });
    select("report");
  };

  /* Hits and false alarms */
  function zinv(p) { /* inverse of the standard normal distribution (Acklam) */
    var a = [-39.6968302866538, 220.946098424521, -275.928510446969, 138.357751867269, -30.6647980661472, 2.50662827745924],
        b = [-54.4760987982241, 161.585836858041, -155.698979859887, 66.8013118877197, -13.2806815528857],
        c = [-0.00778489400243029, -0.322396458041136, -2.40075827716184, -2.54973253934373, 4.37466414146497, 2.93816398269878],
        d = [0.00778469570904146, 0.32246712907004, 2.445134137143, 3.75440866190742], q, r;
    if (p < 0.02425) { q = Math.sqrt(-2 * Math.log(p)); return (((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) / ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1); }
    if (p > 1 - 0.02425) return -zinv(1 - p);
    q = p - 0.5; r = q * q;
    return (((((a[0] * r + a[1]) * r + a[2]) * r + a[3]) * r + a[4]) * r + a[5]) * q / (((((b[0] * r + b[1]) * r + b[2]) * r + b[3]) * r + b[4]) * r + 1);
  }
  function fmt(x) { var s = x.toFixed(2); return (s === "-0.00" ? "0.00" : s).replace("-", "−"); }
  builders.sdt = function (box) {
    var rows = D.sdt;
    box.innerHTML = '<div class="sdt"><div class="sdt-ctrl">' +
      '<div class="sdt-presets">' + rows.map(function (r, i) { return '<button type="button" class="chip" data-p="' + i + '">' + escHtml(r.cond) + "</button>"; }).join("") + "</div>" +
      '<label class="sl"><span>Hits <output data-o="h"></output> of 10 passages with the borrowing</span><input type="range" min="1" max="9" step="1" data-k="h"></label>' +
      '<label class="sl"><span>False alarms <output data-o="f"></output> of 10 passages without it</span><input type="range" min="1" max="9" step="1" data-k="f"></label>' +
      '<div class="sdt-out"><div><span>Sensitivity (d′)</span><b data-o="d"></b></div><div><span>Criterion</span><b data-o="c"></b></div></div>' +
      '<p class="sdt-reading" aria-live="polite"></p></div><div class="sdt-plot"></div></div>';
    var hIn = $("[data-k=h]", box), fIn = $("[data-k=f]", box), plot = $(".sdt-plot", box), base = rows[0];
    var zb = { d: zinv(base.hits / 10) - zinv(base.fa / 10), c: -(zinv(base.hits / 10) + zinv(base.fa / 10)) / 2 };
    function pdf(x, m) { return Math.exp(-0.5 * (x - m) * (x - m)) / Math.sqrt(2 * Math.PI); }
    function draw(dp, k) {
      var W = 520, H = 230, x0 = -3.6, x1 = 5.2, pb = 26;
      var X = function (v) { return (v - x0) / (x1 - x0) * W; }, Y = function (v) { return H - pb - v / 0.42 * (H - pb - 14); };
      function curve(m, from) {
        var p = [], v;
        for (v = (from == null ? x0 : from); v <= x1 + 1e-9; v += 0.05) p.push(X(v).toFixed(1) + "," + Y(pdf(v, m)).toFixed(1));
        return p;
      }
      var noise = curve(0), sig = curve(dp);
      var fa = curve(0, k), hit = curve(dp, k);
      var area = function (pts) { return "M" + X(k).toFixed(1) + "," + Y(0) + " L" + pts.join(" L") + " L" + X(x1) + "," + Y(0) + "Z"; };
      plot.innerHTML = '<svg viewBox="0 0 ' + W + " " + H + '" role="img" aria-label="Two distributions, without and with the borrowing, separated by d′; the criterion marks where the listener starts saying yes">' +
        '<path class="a-fa" d="' + area(fa) + '"/><path class="a-hit" d="' + area(hit) + '"/>' +
        '<polyline class="c-noise" points="' + noise.join(" ") + '"/><polyline class="c-sig" points="' + sig.join(" ") + '"/>' +
        '<line class="axis" x1="0" x2="' + W + '" y1="' + Y(0) + '" y2="' + Y(0) + '"/>' +
        '<line class="crit" x1="' + X(k) + '" x2="' + X(k) + '" y1="10" y2="' + Y(0) + '"/><text class="lab l-crit" x="' + (X(k) + 5) + '" y="' + (Y(0) - 6) + '">criterion</text>' +
        '<text class="lab l-noise" x="' + (X(0) - 34) + '" y="' + Y(0.2) + '" text-anchor="end">without the borrowing</text>' +
        '<text class="lab l-sig" x="' + (X(dp) + 34) + '" y="' + Y(0.2) + '" text-anchor="start">with it</text>' +
        '<line class="dbar" x1="' + X(0) + '" x2="' + X(dp) + '" y1="' + (H - 10) + '" y2="' + (H - 10) + '"/><text class="lab" x="' + ((X(0) + X(dp)) / 2) + '" y="' + (H - 13) + '" text-anchor="middle">d′</text></svg>' +
        '<p class="sdt-legend">The listener says yes to anything right of the criterion: <span class="sw sw-hit"></span>hits <span class="sw sw-fa"></span>false alarms</p>';
    }
    function update(preset) {
      var h = +hIn.value, f = +fIn.value, zh = zinv(h / 10), zf = zinv(f / 10), dp = zh - zf, c = -(zh + zf) / 2;
      $("[data-o=h]", box).textContent = h; $("[data-o=f]", box).textContent = f;
      $("[data-o=d]", box).textContent = fmt(dp); $("[data-o=c]", box).textContent = fmt(c);
      var match = rows.map(function (r, i) { return r.hits === h && r.fa === f ? i : -1; }).filter(function (i) { return i >= 0; });
      var pi = preset != null ? preset : (match.length ? match[0] : -1);
      $$(".sdt-presets button", box).forEach(function (b) { b.setAttribute("aria-pressed", +b.getAttribute("data-p") === pi ? "true" : "false"); });
      var rd = $(".sdt-reading", box);
      if (pi >= 0) rd.innerHTML = "<strong>" + escHtml(rows[pi].cond) + ".</strong> " + escHtml(rows[pi].reading) + (pi > 0 ? "." : ".");
      else rd.innerHTML = "Against no credit (6 hits, 3 false alarms): d′ " + (dp - zb.d >= 0 ? "+" : "−") + Math.abs(dp - zb.d).toFixed(2) + ", criterion " + (c - zb.c >= 0 ? "+" : "−") + Math.abs(c - zb.c).toFixed(2) + ". Only a rise in d′ shows that the listener separates borrowed passages from clean ones better; a fall in the criterion alone means saying yes more readily.";
      draw(dp, -zf);
    }
    box.addEventListener("input", function () { update(null); });
    box.addEventListener("click", function (e) {
      var b = e.target.closest("[data-p]");
      if (!b) return;
      var r = rows[+b.getAttribute("data-p")];
      hIn.value = r.hits; fIn.value = r.fa; update(+b.getAttribute("data-p"));
    });
    hIn.value = base.hits; fIn.value = base.fa; update(0);
  };

  /* Three relations between material and recording */
  builders.carrier = function (box) {
    var C = D.carrier, names = ["Supplementary", "Embedded", "Operative"];
    var wave = function (x, y, w, cut) {
      var s = "", n = 22, i, h;
      for (i = 0; i < n; i++) {
        h = 6 + 16 * Math.abs(Math.sin(i * 1.7) * Math.cos(i * 0.6));
        var cls = cut && (i % 5 === 3 || i > 17) ? "wv off" : "wv";
        s += '<rect class="' + cls + '" x="' + (x + i * w / n).toFixed(1) + '" y="' + (y - h / 2).toFixed(1) + '" width="' + (w / n * 0.55).toFixed(1) + '" height="' + h.toFixed(1) + '" rx="1"/>';
      }
      return s;
    };
    var art = {
      Supplementary: '<svg viewBox="0 0 200 110" aria-hidden="true">' + wave(12, 55, 110) + '<rect class="mat" x="138" y="22" width="50" height="66" rx="3"/><line class="txt" x1="146" x2="180" y1="36" y2="36"/><line class="txt" x1="146" x2="176" y1="46" y2="46"/><line class="txt" x1="146" x2="180" y1="56" y2="56"/><line class="txt" x1="146" x2="168" y1="66" y2="66"/><text x="12" y="104">recording</text><text x="138" y="104">booklet</text></svg>',
      Embedded: '<svg viewBox="0 0 200 110" aria-hidden="true"><rect class="mat" x="8" y="10" width="184" height="80" rx="6"/><circle class="dot" cx="24" cy="24" r="3"/><circle class="dot" cx="176" cy="78" r="2"/><circle class="dot" cx="160" cy="22" r="2.5"/>' + wave(42, 52, 116) + '<text x="8" y="104">the recording inside the material</text></svg>',
      Operative: '<svg viewBox="0 0 200 110" aria-hidden="true"><rect class="mat" x="8" y="10" width="184" height="80" rx="6"/>' + wave(42, 52, 116, true) + '<circle class="knob" cx="170" cy="74" r="9"/><line class="knob-l" x1="170" y1="74" x2="176" y2="68"/><text x="8" y="104">the material changes what plays</text></svg>'
    };
    var where = { Supplementary: [["tz", "Com Defeito de Fabricação", C.albums[0]]], Embedded: [["bj", "Biophilia", C.albums[1]]], Operative: [["bj", "Biophilia", C.albums[2]]] };
    box.innerHTML = '<div class="car"><div class="car-row">' + names.map(function (n) {
      return '<button type="button" class="car-card" data-n="' + n + '" aria-pressed="false">' + art[n] + "<b>" + n + "</b>" +
        where[n].map(function (w) { return '<span class="album album-' + w[0] + '">' + escHtml(w[1]) + "</span>"; }).join("") + "</button>";
    }).join("") + '</div><div class="car-detail" aria-live="polite"></div></div>';
    function select(n) {
      $$(".car-card", box).forEach(function (b) { b.setAttribute("aria-pressed", b.getAttribute("data-n") === n ? "true" : "false"); });
      var i = names.indexOf(n);
      $(".car-detail", box).innerHTML = "<p><strong>" + n + ".</strong> " + escHtml(C.defs[n]) + "</p><p>" + escHtml(C.can[i]) + "</p>" +
        where[n].map(function (w) { return '<p class="album-line album-' + w[0] + '">' + linkify(w[2]) + "</p>"; }).join("");
    }
    box.addEventListener("click", function (e) { var b = e.target.closest(".car-card"); if (b) select(b.getAttribute("data-n")); });
    select("Supplementary");
  };

  /* The fourteen defects */
  builders.defects = function (box) {
    var T = D.tracks, codes = ["Specific work", "Composer or performer", "Style, genre or tradition", "Non-musical"];
    var kind = { "Specific work": "retrieval", "Composer or performer": "schema", "Style, genre or tradition": "category", "Non-musical": "frame only" };
    var cls = function (c) { return "code-" + codes.indexOf(c); };
    var count = function (c) { return T.filter(function (t) { return t.code === c; }).length; };
    var srcAbbr = { "Official site": "S", "Costa, Oliveira Filho and Maia (2008)": "C", "Freire (2013)": "F", "Rollefson (2007)": "R" };
    box.innerHTML = '<div class="df">' +
      '<div class="df-strip" aria-hidden="true">' + T.map(function (t) { return '<span class="' + cls(t.code) + '" style="flex:1" title="' + t.n + " " + escHtml(t.name) + '"></span>'; }).join("") + "</div>" +
      '<div class="df-filter">' + codes.map(function (c) { return '<button type="button" class="chip ' + cls(c) + '" data-c="' + escHtml(c) + '" aria-pressed="false"><span class="dot"></span>' + escHtml(c) + '<span class="n">' + count(c) + "</span></button>"; }).join("") + "</div>" +
      '<ol class="df-list">' + T.map(function (t) {
        return '<li class="df-item" data-code="' + escHtml(t.code) + '"><button type="button" class="df-row" aria-expanded="false"><span class="df-n">Defeito ' + t.n + '</span><span class="df-name">' + escHtml(t.name) + '</span><span class="df-credit">' + escHtml(t.credit) + '</span><span class="df-code ' + cls(t.code) + '">' + escHtml(t.code) + "</span>" +
          '<span class="df-src" title="' + escHtml(t.sources.join("; ")) + '">' + t.sources.map(function (s) { return "<i>" + srcAbbr[s] + "</i>"; }).join("") + "</span></button>" +
          '<div class="df-more" hidden><p><strong>What kind of cue:</strong> ' + kind[t.code] + ". " + escHtml(D.cues[t.code].charAt(0).toUpperCase() + D.cues[t.code].slice(1)) + ".</p>" +
          "<p><strong>Attested by</strong> " + escHtml(t.sources.join("; ")) + (t.sources.length > 1 ? " (more than one source, and they agree)." : " (a single source).") + "</p>" +
          (t.listen ? '<p><a href="' + escHtml(t.listen) + '">Official audio ↗</a></p>' : "") + "</div></li>";
      }).join("") + "</ol>" +
      '<p class="df-key">Sources: <i>S</i> official site · <i>C</i> Costa, Oliveira Filho and Maia (2008) · <i>F</i> Freire (2013) · <i>R</i> Rollefson (2007)</p></div>';
    var state = null;
    box.addEventListener("click", function (e) {
      var c = e.target.closest("[data-c]");
      if (c) {
        state = state === c.getAttribute("data-c") ? null : c.getAttribute("data-c");
        $$("[data-c]", box).forEach(function (b) { b.setAttribute("aria-pressed", b.getAttribute("data-c") === state ? "true" : "false"); });
        $$(".df-item", box).forEach(function (li) { li.classList.toggle("dim", !!state && li.getAttribute("data-code") !== state); });
        return;
      }
      var r = e.target.closest(".df-row");
      if (r) {
        var more = r.nextElementSibling, open = r.getAttribute("aria-expanded") === "true";
        r.setAttribute("aria-expanded", open ? "false" : "true");
        more.hidden = open;
      }
    });
  };

  /* Biophilia's ten songs */
  builders.starfield = function (box) {
    var S = D.songs, W = 620, H = 340;
    var pos = { Cosmogony: [310, 170] };
    var ring = S.filter(function (s) { return s.song !== "Cosmogony"; });
    ring.forEach(function (s, i) {
      var a = -Math.PI / 2 + i * 2 * Math.PI / ring.length, rx = 235 + (i % 2) * 22, ry = 118 + (i % 3) * 12;
      pos[s.song] = [310 + rx * Math.cos(a), 170 + ry * Math.sin(a)];
    });
    var seed = 11, rnd = function () { seed = (seed * 16807) % 2147483647; return seed / 2147483647; }, bg = "";
    for (var k = 0; k < 140; k++) bg += '<circle class="bgstar" cx="' + (rnd() * W).toFixed(1) + '" cy="' + (rnd() * H).toFixed(1) + '" r="' + (0.4 + rnd() * 1.1).toFixed(2) + '"/>';
    var lines = ring.map(function (s) { return '<line class="thread" x1="310" y1="170" x2="' + pos[s.song][0].toFixed(1) + '" y2="' + pos[s.song][1].toFixed(1) + '"/>'; }).join("");
    var stars = S.map(function (s) {
      var p = pos[s.song], big = s.song === "Cosmogony";
      return '<g class="star' + (s.fixed ? " fixed" : "") + (s.boundary ? " boundary" : "") + '" tabindex="0" role="button" data-s="' + escHtml(s.song) + '" aria-label="' + escHtml(s.song) + '" transform="translate(' + p[0].toFixed(1) + " " + p[1].toFixed(1) + ')">' +
        '<circle class="halo" r="' + (big ? 20 : 13) + '"/><circle class="core" r="' + (big ? 7 : 4.5) + '"/><text y="' + (big ? 36 : 27) + '" text-anchor="middle">' + escHtml(s.song) + "</text></g>";
    }).join("");
    box.innerHTML = '<div class="sf"><div class="sf-sky"><svg viewBox="0 0 ' + W + " " + H + '" role="group" aria-label="The ten songs of Biophilia">' + bg + lines + stars + "</svg>" +
      '<p class="sf-legend"><span class="lg fixed"></span>fixed version in the app <span class="lg boundary"></span>boundary case</p></div><div class="sf-card" aria-live="polite"></div></div>';
    function select(name) {
      var s = S.filter(function (x) { return x.song === name; })[0];
      $$(".star", box).forEach(function (g) { g.classList.toggle("on", g.getAttribute("data-s") === name); });
      $(".sf-card", box).innerHTML = "<h4>" + escHtml(s.song) + '</h4><dl><dt>Natural phenomenon</dt><dd>' + escHtml(s.phenomenon) + "</dd><dt>Musical concept</dt><dd>" + escHtml(s.concept) + "</dd></dl>" +
        (s.fixed ? '<p class="badge fixed">Fixed version in the app</p>' : "") + (s.boundary ? '<p class="badge boundary">Boundary case (' + xref("s7-5", "section 7.5") + ")</p>" : "") +
        s.notes.map(function (n) { return "<p>" + linkify(n.charAt(0).toUpperCase() + n.slice(1)) + (/[.)]$/.test(n) ? "" : ".") + "</p>"; }).join("") +
        (s.links.length ? '<p class="sf-links">' + s.links.map(function (l) { return '<a href="' + escHtml(l[1]) + '">' + escHtml(l[0]) + " ↗</a>"; }).join(" · ") + "</p>" : "") +
        (s.fixed ? "" : '<p class="muted">' + escHtml(D.fixed) + "</p>");
    }
    box.addEventListener("click", function (e) { var g = e.target.closest(".star"); if (g) select(g.getAttribute("data-s")); });
    box.addEventListener("keydown", function (e) { var g = e.target.closest(".star"); if (g && (e.key === "Enter" || e.key === " ")) { e.preventDefault(); select(g.getAttribute("data-s")); } });
    select("Cosmogony");
  };

  /* Where the evidence is */
  builders.evidence = function (box) {
    var cols = ["Direct", "Near", "Analogical", "Context", "None located"];
    var fns = D.fig1.functions;
    var role = function (r) { return r ? '<span class="role role-' + r + '">' + r + "</span>" : '<span class="role role-none">—</span>'; };
    var h = '<div class="ev"><div class="ev-table" role="table"><div class="ev-row ev-headrow" role="row"><div role="columnheader">Function</div>' + cols.map(function (c) { return '<div role="columnheader">' + c + "</div>"; }).join("") + "</div>";
    fns.forEach(function (f) {
      var r81 = D.f81[f.name] || {};
      h += '<div class="ev-row" role="row"><div class="ev-fn" role="rowheader"><b>' + escHtml(f.name) + '</b><span class="eff eff-' + (/^Access/.test(f.effect) ? "access" : "framing") + '">' + escHtml(f.effect.split(";")[0]) + "</span>" +
        '<span class="ev-roles"><span class="album album-tz">Tom Zé</span>' + role(r81.tomze_role) + '<span class="album album-bj">Biophilia</span>' + role(r81.bjork_role) + "</span></div>";
      cols.forEach(function (c) {
        var dots = f.links.concat(f.costs).filter(function (i) { return D.links[i].code === c; });
        h += '<div class="ev-cell" role="cell" data-label="' + c + '">' + dots.map(function (i) {
          var L = D.links[i];
          return '<a class="ev-dot grade-' + gradeClass(L.grade) + (f.costs.indexOf(i) >= 0 ? " cost" : "") + '" href="#link-' + i + '" data-link="' + i + '" title="' + escHtml(i + ": " + L.link + " (" + L.grade + ")") + '">' + i + "</a>";
        }).join("") + "</div>";
      });
      h += "</div>";
    });
    h += '</div><p class="ev-legend">' + ["Strong", "Suggestive", "Contested", "Open (null)", "Open (untested)"].map(function (g) { return '<span><i class="ev-dot grade-' + gradeClass(g) + '"></i>' + g + "</span>"; }).join("") +
      '<span><i class="ev-dot cost"></i>attentional cost</span></p></div>';
    box.innerHTML = h;
    $$(".ev-dot[data-link]", box).forEach(function (a) { a.classList.add("lnk"); });
  };

  /* Predictions, contrasts and designs */
  builders.contrasts = function (box) {
    var fig = box.closest("figure");
    fig.id = "contrasts";
    var P = D.preds, ids6 = Object.keys(P).filter(function (k) { return k[0] === "6"; }), ids7 = Object.keys(P).filter(function (k) { return k[0] === "7"; });
    var chips = function (ks) { return ks.map(function (k) { return '<button type="button" class="chip pc pc-' + P[k].kind + '" data-k="' + k + '" aria-pressed="false">' + k + "</button>"; }).join(""); };
    box.innerHTML = '<div class="ct"><div class="ct-pick"><p><span class="album album-tz">Com Defeito de Fabricação</span></p><div>' + chips(ids6) + '</div><p><span class="album album-bj">Biophilia</span></p><div>' + chips(ids7) + "</div>" +
      '<p class="ct-key"><span class="pc-key pc-access"></span>access <span class="pc-key pc-exploratory"></span>exploratory <span class="pc-key pc-framing"></span>framing</p></div><div class="ct-card" aria-live="polite"></div></div>';
    function choose(k) {
      var p = P[k];
      $$(".pc", box).forEach(function (b) { b.setAttribute("aria-pressed", b.getAttribute("data-k") === k ? "true" : "false"); });
      var cs = D.contrasts.filter(function (c) { return c.preds.indexOf(k) >= 0; });
      var ds = D.designs.filter(function (d) { return d.preds.indexOf(k) >= 0; });
      var th = D.threats[p.album];
      var alts = D.alts.filter(function (a) { return th.alts.indexOf(a.alt) >= 0; });
      $(".ct-card", box).innerHTML = '<h4><span class="ct-id">' + escHtml(p.label) + "</span> " + escHtml(p.text) + "</h4>" +
        '<dl class="ct-dl"><dt>Measure and comparison</dt><dd>' + linkify(p.measure) + "</dd><dt>Fails if</dt><dd>" + linkify(p.fails) + "</dd><dt>Basis</dt><dd>" + linkify(p.basis) + "</dd></dl>" +
        "<h5>Contrasts that test it (" + xref("s9-2", "section 9.2") + ")</h5>" + (cs.length ? '<ul class="ct-list">' + cs.map(function (c) { return "<li><b>" + escHtml(c.contrast) + ".</b> " + escHtml(c.estimates) + "</li>"; }).join("") + "</ul>" : '<p class="muted">None named in the table.</p>') +
        "<h5>Designs that carry it (" + xref("s9-1", "section 9.1") + ")</h5>" + (ds.length ? '<p class="ct-designs">' + ds.map(function (d) { return xref("design-" + d.n, "Design " + d.n + ": " + escHtml(d.name)); }).join(" · ") + "</p>" : '<p class="muted">None named.</p>') +
        "<h5>Main threats for this album (" + xref("s9-3", "section 9.3") + ")</h5><p>" + escHtml(th.text) + '</p><ul class="ct-list">' + alts.map(function (a) { return "<li><b>" + escHtml(a.alt) + ".</b> " + escHtml(a.mimic) + ". <i>Control:</i> " + escHtml(a.control) + "</li>"; }).join("") + "</ul>";
    }
    fig._choose = function (k) { choose(k); };
    box.addEventListener("click", function (e) { var b = e.target.closest(".pc"); if (b) choose(b.getAttribute("data-k")); });
    choose("6a");
  };

  /* Evidence ledger filters */
  builders.ledger = function (box) {
    var rows = $$('tr[id^="link-"]');
    if (!rows.length) return;
    var grades = ["Strong", "Suggestive", "Contested", "Open (null)", "Open (untested)", "Not graded"];
    var effects = ["Access", "Framing", "Other"], dists = ["Direct", "Near", "Analogical", "Context", "None located"];
    var count = function (attr, v) { return rows.filter(function (r) { return r.getAttribute(attr) === v; }).length; };
    var chips = function (f, attr, vs) { return vs.map(function (v) { return '<button type="button" class="chip" data-f="' + f + '" data-v="' + escHtml(v) + '" aria-pressed="false">' + (f === "grade" ? '<span class="dot grade-' + gradeClass(v) + '"></span>' : "") + escHtml(v) + '<span class="n">' + count(attr, v) + "</span></button>"; }).join(""); };
    box.innerHTML = '<div class="lg-bar" aria-hidden="true">' + grades.map(function (g) { var n = count("data-grade", g); return n ? '<span class="grade-' + gradeClass(g) + '" style="flex:' + n + '">' + n + "</span>" : ""; }).join("") + "</div>" +
      '<div class="row"><span>Grade</span>' + chips("grade", "data-grade", grades) + "</div>" +
      '<div class="row"><span>Effect</span>' + chips("effect", "data-effect", effects) + "</div>" +
      '<div class="row"><span>Distance</span>' + chips("dist", "data-dist", dists) + "</div>" +
      '<div class="row"><span>Search</span><input type="search" placeholder="e.g. credit, Dowling, white noise" aria-label="Search the ledger"> <span class="ledger-count" aria-live="polite"></span></div>';
    rows.forEach(function (r) {
      var g = r.getAttribute("data-grade");
      $$("td", r).forEach(function (td) { if (td.textContent.trim() === g) td.innerHTML = gradeChip(g); });
    });
    var state = { grade: null, effect: null, dist: null, q: "" };
    var attr = { grade: "data-grade", effect: "data-effect", dist: "data-dist" };
    var counter = $(".ledger-count", box);
    function apply() {
      var shown = 0;
      rows.forEach(function (r) {
        var ok = ["grade", "effect", "dist"].every(function (f) { return !state[f] || r.getAttribute(attr[f]) === state[f]; }) && (!state.q || r.textContent.toLowerCase().indexOf(state.q) >= 0);
        r.classList.toggle("hidden-row", !ok);
        if (ok) shown++;
      });
      counter.textContent = "Showing " + shown + " of " + rows.length + " links";
      $$(".chip", box).forEach(function (c) { c.setAttribute("aria-pressed", state[c.getAttribute("data-f")] === c.getAttribute("data-v") ? "true" : "false"); });
    }
    box.addEventListener("click", function (e) {
      var c = e.target.closest(".chip");
      if (!c) return;
      var f = c.getAttribute("data-f"), v = c.getAttribute("data-v");
      state[f] = state[f] === v ? null : v;
      apply();
    });
    $("input", box).addEventListener("input", function (e) { state.q = e.target.value.trim().toLowerCase(); apply(); });
    apply();
  };

  $$("[data-explore]").forEach(function (fig) {
    var kind = fig.getAttribute("data-explore");
    var box = fig.classList.contains("ledger-tools") ? fig : fig.querySelector(".explore-body");
    if (builders[kind]) {
      try { builders[kind](box); } catch (err) { box.innerHTML = "<p>This interactive figure could not be shown.</p>"; if (window.console) console.error(err); }
    }
  });
  panels.forEach(function (p) { p.querySelector(".spine").addEventListener("click", stopSound); });

  /* ------------------------------------------------------------ start */
  var start = location.hash.slice(1);
  if (start && document.getElementById(start)) goTo(start, { instant: true });
  else openPanel("cover", { instant: true, noScroll: true });
  narrow.addEventListener("change", function () { if (current) openPanel(current.id, { keepScroll: true, noScroll: true }); });
})();
