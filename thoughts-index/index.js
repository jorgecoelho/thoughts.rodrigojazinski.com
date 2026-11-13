/* Thoughts — index (prototype). Plain JavaScript; without it every card is open. */
(function () {
  "use strict";
  var thoughts = Array.prototype.slice.call(document.querySelectorAll(".thought"));

  function setOpen(t, on, push) {
    t.classList.toggle("open", on);
    t.querySelector(".spine").setAttribute("aria-expanded", on ? "true" : "false");
    if (push) history.replaceState(null, "", on ? "#" + t.id : location.pathname + location.search);
  }

  thoughts.forEach(function (t) {
    t.querySelector(".spine").addEventListener("click", function () {
      var on = !t.classList.contains("open");
      thoughts.forEach(function (o) { if (o !== t && o.classList.contains("open")) setOpen(o, false); });
      setOpen(t, on, true);
      if (on) setTimeout(function () {
        var r = t.getBoundingClientRect();
        if (r.top < 0 || r.top > window.innerHeight * 0.5) t.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 120);
    });
  });

  document.addEventListener("click", function (e) {
    var b = e.target.closest("[data-cite]");
    if (!b) return;
    var text = b.getAttribute("data-cite"), label = b.textContent;
    var done = function () { b.textContent = "Copied"; setTimeout(function () { b.textContent = label; }, 1600); };
    if (navigator.clipboard) navigator.clipboard.writeText(text).then(done, function () { window.prompt("Citation", text); });
    else window.prompt("Citation", text);
  });

  /* bookmarks are placed by the reader inside each thought; here they only show */
  thoughts.forEach(function (t) {
    var b;
    try { b = JSON.parse(localStorage.getItem("bookmark:" + t.id) || "null"); } catch (e) { b = null; }
    var read = t.querySelector(".act-primary");
    if (!b || !b.anchor || !read) return;
    t.classList.add("bm-thought");
    t.querySelector(".spine").insertAdjacentHTML("beforeend", '<span class="bm-sr"> (bookmarked)</span>');
    var a = document.createElement("a");
    a.className = "act act-bm";
    a.href = read.getAttribute("href") + "#" + b.anchor;
    a.textContent = "Return to your bookmark: " + b.label + " ";
    a.insertAdjacentHTML("beforeend", '<span aria-hidden="true">→</span>');
    read.parentNode.insertBefore(a, read.nextSibling);
  });

  var target = location.hash && document.getElementById(location.hash.slice(1));
  if (target && target.classList.contains("thought")) setOpen(target, true);
})();
