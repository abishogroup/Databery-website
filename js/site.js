/* ============================================================
   DATABERY — sitewide behavior
   Reveals (IntersectionObserver, once) · mono count-ups ·
   card hairline traces · reticle cursor ·
   methodology signal line · nav · contact form.
   All motion is triggered and finishes; the hero canvas is the
   only continuously-animating element on the site.
   ============================================================ */
(function () {
  "use strict";

  var reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  document.documentElement.classList.add(reduced ? "no-anim" : "js-anim");

  /* ---------- nav ---------- */
  var toggle = document.querySelector(".nav__toggle");
  var links = document.querySelector(".nav__links");
  if (toggle && links) {
    toggle.addEventListener("click", function () {
      var open = links.classList.toggle("open");
      toggle.setAttribute("aria-expanded", open ? "true" : "false");
    });
    links.addEventListener("click", function (e) {
      if (e.target.closest("a")) {
        links.classList.remove("open");
        toggle.setAttribute("aria-expanded", "false");
      }
    });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && links.classList.contains("open")) {
        links.classList.remove("open");
        toggle.setAttribute("aria-expanded", "false");
        toggle.focus();
      }
    });
  }

  /* ---------- reveal on scroll (once, staggered children) ---------- */
  var revealEls = document.querySelectorAll("[data-reveal]");
  document.querySelectorAll("[data-stagger]").forEach(function (group) {
    var kids = group.querySelectorAll(":scope > [data-reveal]");
    kids.forEach(function (k, i) { k.style.setProperty("--rd", (i * 60) + "ms"); });
  });
  /* track grid: longer 90ms stagger so the "more coming" card resolves last */
  document.querySelectorAll("[data-track-stagger]").forEach(function (group) {
    var kids = group.querySelectorAll(":scope > [data-reveal]");
    kids.forEach(function (k, i) { k.style.setProperty("--rd", (i * 90) + "ms"); });
  });
  if (!reduced && "IntersectionObserver" in window) {
    var ro = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) { en.target.classList.add("in"); ro.unobserve(en.target); }
      });
    }, { threshold: 0.12, rootMargin: "0px 0px -40px 0px" });
    revealEls.forEach(function (el) { ro.observe(el); });
  } else {
    revealEls.forEach(function (el) { el.classList.add("in"); });
  }

  /* ---------- mono count-ups (once, on entry) ---------- */
  function runCount(el) {
    var target = parseFloat(el.getAttribute("data-count"));
    var decimals = (el.getAttribute("data-count").split(".")[1] || "").length;
    var prefix = el.getAttribute("data-prefix") || "";
    var suffix = el.getAttribute("data-suffix") || "";
    var dur = 1300, t0 = null;
    function fmt(v) {
      var s = v.toFixed(decimals);
      if (target >= 1000) s = Number(s).toLocaleString("en-US");
      return prefix + s + suffix;
    }
    if (reduced) { el.textContent = fmt(target); return; }
    function tick(ts) {
      if (t0 === null) t0 = ts;
      var p = Math.min((ts - t0) / dur, 1);
      var e = 1 - Math.pow(1 - p, 4);
      el.textContent = fmt(target * e);
      if (p < 1) requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  }
  var counters = document.querySelectorAll("[data-count]");
  if (counters.length) {
    if (!reduced && "IntersectionObserver" in window) {
      var co = new IntersectionObserver(function (entries) {
        entries.forEach(function (en) {
          if (en.isIntersecting) { runCount(en.target); co.unobserve(en.target); }
        });
      }, { threshold: 0.4 });
      counters.forEach(function (el) { co.observe(el); });
    } else {
      counters.forEach(runCount);
    }
  }

  /* ---------- card hairline trace (drawn amber border on hover) ---------- */
  document.querySelectorAll(".card").forEach(function (card) {
    var svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("class", "card-trace");
    svg.setAttribute("aria-hidden", "true");
    var rect = document.createElementNS("http://www.w3.org/2000/svg", "rect");
    rect.setAttribute("x", "0.75"); rect.setAttribute("y", "0.75");
    rect.setAttribute("width", "calc(100% - 1.5px)");
    rect.setAttribute("height", "calc(100% - 1.5px)");
    rect.setAttribute("rx", "2");
    rect.setAttribute("pathLength", "100");
    svg.appendChild(rect);
    card.appendChild(svg);
  });

  /* ---------- methodology signal line (how we work) ---------- */
  var method = document.querySelector(".method");
  if (method) {
    var lineWrap = method.querySelector(".method__line");
    var drawPath = lineWrap.querySelector(".draw");
    var steps = method.querySelectorAll(".step");
    var lh = 0;

    function sizeLine() {
      lh = method.offsetHeight;
      lineWrap.querySelectorAll("line").forEach(function (l) {
        l.setAttribute("y2", lh);
      });
      drawPath.style.strokeDasharray = lh;
      drawPath.style.strokeDashoffset = reduced ? 0 : lh;
    }
    sizeLine();
    window.addEventListener("resize", sizeLine, { passive: true });

    if (!reduced) {
      var mPending = false;
      function updateLine() {
        mPending = false;
        var r = method.getBoundingClientRect();
        var progress = Math.min(Math.max((window.innerHeight * 0.66 - r.top) / r.height, 0), 1);
        drawPath.style.strokeDashoffset = lh * (1 - progress);
        var drawnY = r.top + r.height * progress;
        steps.forEach(function (s) {
          var sr = s.getBoundingClientRect();
          s.classList.toggle("active", sr.top <= drawnY && sr.bottom > drawnY);
        });
        if (progress >= 1) steps[steps.length - 1].classList.add("active");
      }
      window.addEventListener("scroll", function () {
        if (!mPending) { mPending = true; requestAnimationFrame(updateLine); }
      }, { passive: true });
      updateLine();
    } else {
      steps.forEach(function (s) { s.classList.remove("active"); });
    }
  }

  /* ---------- Web3Forms AJAX submission ----------
     Posts to the form's action (https://api.web3forms.com/submit),
     parses the JSON response, and only shows success when
     Web3Forms returns success:true. Native required/type validation
     runs first; a clear inline error is shown on any failure. */
  function wireForm(form, opts) {
    if (!form) return;
    opts = opts || {};
    var btn = form.querySelector('[type="submit"]');
    var label = btn ? btn.textContent : "";
    var done = opts.done ? document.getElementById(opts.done) : null;
    var inlineMsg = opts.inlineMsg ? form.querySelector(opts.inlineMsg) : null;

    // one reusable error element inside the form (unless the form has an inline message slot)
    var err = null;
    if (!inlineMsg) {
      err = form.querySelector(".form-err");
      if (!err) {
        err = document.createElement("p");
        err.className = "form-err";
        err.setAttribute("role", "alert");
        err.hidden = true;
        form.appendChild(err);
      }
    }

    function fail(message) {
      if (btn) { btn.disabled = false; if (!opts.icon) btn.textContent = label; }
      var text = message || ("That did not send. Please try again, or email " + (opts.fallback || "abisho@databery.com") + ".");
      if (inlineMsg) { inlineMsg.textContent = text; inlineMsg.className = (inlineMsg.className.replace(/\bis-\w+\b/g, "")).trim() + " is-err"; }
      else { err.hidden = false; err.textContent = text; }
    }

    form.addEventListener("submit", function (e) {
      e.preventDefault();
      if (err) err.hidden = true;
      if (inlineMsg) { inlineMsg.textContent = ""; inlineMsg.className = inlineMsg.className.replace(/\bis-\w+\b/g, "").trim(); }
      if (!form.reportValidity()) return;
      if (btn) { btn.disabled = true; if (!opts.icon) btn.textContent = "Sending…"; }

      fetch(form.action, {
        method: "POST",
        body: new FormData(form),
        headers: { Accept: "application/json" }
      }).then(function (res) {
        return res.json().then(function (data) { return { ok: res.ok, data: data }; },
          function () { return { ok: res.ok, data: {} }; });
      }).then(function (r) {
        if (!r.ok || !r.data.success) throw new Error(r.data && r.data.message);
        form.classList.add("sent");
        if (done) { done.classList.add("show"); done.setAttribute("tabindex", "-1"); done.focus(); }
        if (inlineMsg) {
          var row = form.querySelector(".news-form__row");
          if (row) row.hidden = true;
          inlineMsg.textContent = "You are on the list. Thank you.";
          inlineMsg.className = (inlineMsg.className.replace(/\bis-\w+\b/g, "")).trim() + " is-ok";
        }
      }).catch(function (ex) { fail(ex && ex.message ? null : null); });
    });
  }
  wireForm(document.getElementById("contact-form"), { done: "form-done", fallback: "abisho@databery.com" });
  wireForm(document.getElementById("fellowship-form"), { done: "fellowship-done", fallback: "abisho@databery.com" });
  wireForm(document.getElementById("newsletter-form"), { inlineMsg: ".news-form__msg", icon: true, fallback: "abisho@databery.com" });

  /* ---------- fellowship: pre-select track from the card link ---------- */
  var trackSelect = document.getElementById("a-track");
  if (trackSelect) {
    document.querySelectorAll("[data-track]").forEach(function (a) {
      a.addEventListener("click", function () {
        trackSelect.value = a.getAttribute("data-track");
      });
    });
  }

  /* ---------- copy-on-click (email) ---------- */
  document.querySelectorAll("[data-copy]").forEach(function (el) {
    var tag = el.querySelector(".tag");
    var original = tag ? tag.textContent : "";
    el.addEventListener("click", function () {
      var text = el.getAttribute("data-copy");
      var done = function () {
        if (!tag) return;
        el.classList.add("copied");
        tag.textContent = "Copied";
        setTimeout(function () { tag.textContent = original; el.classList.remove("copied"); }, 1600);
      };
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(done, function () { window.location.href = "mailto:" + text; });
      } else {
        window.location.href = "mailto:" + text;
      }
    });
  });

  /* ---------- cursor: a single amber dot ----------
     Tracks the pointer directly; opens into a small ring over
     anything actionable. Skipped for touch and reduced motion. */
  if (!reduced && window.matchMedia("(pointer: fine)").matches) {
    var dot = document.createElement("div");
    dot.className = "cur-dot";
    dot.appendChild(document.createElement("i"));
    document.body.appendChild(dot);
    document.documentElement.classList.add("cursor-on");

    document.addEventListener("pointermove", function (e) {
      if (e.pointerType !== "mouse") return;
      dot.style.transform = "translate3d(" + e.clientX + "px," + e.clientY + "px,0)";
      document.documentElement.classList.add("cursor-live");
    }, { passive: true });

    document.addEventListener("pointerover", function (e) {
      var t = e.target.closest ? e.target.closest("a,button,.card,[data-cursor]") : null;
      dot.classList.toggle("is-active", !!t);
      var field = e.target.closest ? e.target.closest("input,textarea") : null;
      document.documentElement.classList.toggle("cur-hide", !!field);
    }, { passive: true });

    document.addEventListener("pointerdown", function () { dot.classList.add("is-down"); }, { passive: true });
    document.addEventListener("pointerup", function () { dot.classList.remove("is-down"); }, { passive: true });

    document.documentElement.addEventListener("pointerleave", function () {
      document.documentElement.classList.remove("cursor-live");
    }, { passive: true });
    window.addEventListener("blur", function () {
      document.documentElement.classList.remove("cursor-live");
    });
  }

  /* ---------- footer year ---------- */
  var yr = document.getElementById("yr");
  if (yr) yr.textContent = new Date().getFullYear();
})();
