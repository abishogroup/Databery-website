/* ============================================================
   DATABERY — hero signal field
   A band of drifting grey static; one amber waveform resolves
   out of the noise on load, then breathes. Mouse repels the
   noise; the signal is unaffected. Vanilla canvas, rAF,
   transform/paint only. Paused when offscreen or tab hidden.
   ============================================================ */
(function () {
  "use strict";

  var canvas = document.getElementById("signal-field");
  if (!canvas) return;

  var reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var ctx = canvas.getContext("2d");
  var dpr = Math.min(window.devicePixelRatio || 1, 2);

  var W = 0, H = 0;                 // css pixels
  var particles = [];
  var mouse = { x: -9999, y: -9999 };
  var start = null;                 // timestamp of first frame
  var RESOLVE_DELAY = 0.3;          // s before the signal starts resolving
  var RESOLVE_DUR = 1.2;            // s for signal to emerge from noise
  var running = false, visible = true, focused = true;

  var isMobile = window.matchMedia("(max-width: 760px)").matches;
  var COUNT = isMobile ? 80 : 220;

  var AMBER = "139,92,246";         // #8B5CF6 — brand violet
  var STATIC = "140,147,163";       // #8C93A3

  function size() {
    var r = canvas.getBoundingClientRect();
    W = r.width; H = r.height;
    canvas.width = Math.round(W * dpr);
    canvas.height = Math.round(H * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function seed() {
    particles.length = 0;
    for (var i = 0; i < COUNT; i++) {
      particles.push({
        x: Math.random() * W,
        y: Math.random() * H,
        hx: 0, hy: 0,                       // displacement from mouse repulsion
        vx: (Math.random() - 0.5) * 0.22,
        vy: (Math.random() - 0.5) * 0.05,
        len: 2 + Math.random() * 12,
        a: 0.05 + Math.random() * 0.24,
        flicker: Math.random() * Math.PI * 2
      });
    }
  }

  /* the waveform: layered sines, tapered at the edges */
  function sigY(x, t, amp) {
    var base = H * 0.82;
    var nx = x / W;
    var envelope = Math.sin(Math.PI * Math.min(Math.max(nx, 0), 1)); // taper ends
    envelope = 0.25 + 0.75 * envelope;
    var y =
      Math.sin(x * 0.006 + t * 0.8) * 0.52 +
      Math.sin(x * 0.0113 - t * 0.45) * 0.3 +
      Math.sin(x * 0.021 + t * 1.25) * 0.18;
    return base + y * amp * envelope;
  }

  function easeOutExpo(p) { return p >= 1 ? 1 : 1 - Math.pow(2, -10 * p); }

  function drawSignal(t, elapsed) {
    var p = reduced ? 1 : easeOutExpo(Math.min(Math.max((elapsed - RESOLVE_DELAY) / RESOLVE_DUR, 0), 1));
    if (p <= 0) return;

    // breathing amplitude once resolved
    var amp = (H * 0.06) * (1 + 0.14 * Math.sin(t * 0.4));
    var chaos = (1 - p);                       // jitter that dies as the signal locks in

    var step = isMobile ? 6 : 3;
    var pass, lw, alpha;
    for (pass = 0; pass < 2; pass++) {
      lw = pass === 0 ? 5 : 1.6;               // wide faint halo + thin core (cheap glow)
      alpha = (pass === 0 ? 0.10 : 0.92) * p;
      ctx.beginPath();
      for (var x = 0; x <= W; x += step) {
        var jitter = chaos * (Math.random() - 0.5) * H * 0.3;
        var y = sigY(x, t, amp) + jitter;
        if (x === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      }
      ctx.strokeStyle = "rgba(" + AMBER + "," + alpha + ")";
      ctx.lineWidth = lw;
      ctx.lineJoin = "round";
      ctx.stroke();
    }
  }

  function drawNoise(t) {
    var i, pt;
    for (i = 0; i < particles.length; i++) {
      pt = particles[i];

      // drift
      pt.x += pt.vx; pt.y += pt.vy;
      if (pt.x < -14) pt.x = W + 14; else if (pt.x > W + 14) pt.x = -14;
      if (pt.y < -4) pt.y = H + 4; else if (pt.y > H + 4) pt.y = -4;

      // mouse repulsion (noise only — the signal never flinches)
      if (!isMobile) {
        var dx = pt.x - mouse.x, dy = pt.y - mouse.y;
        var d2 = dx * dx + dy * dy;
        var R = 110;
        if (d2 < R * R && d2 > 0.01) {
          var d = Math.sqrt(d2);
          var f = (1 - d / R) * 2.2;
          pt.hx += (dx / d) * f;
          pt.hy += (dy / d) * f;
        }
      }
      pt.hx *= 0.9; pt.hy *= 0.9;               // ease back home

      var a = pt.a * (0.7 + 0.3 * Math.sin(t * 2 + pt.flicker));
      ctx.strokeStyle = "rgba(" + STATIC + "," + a + ")";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(pt.x + pt.hx, pt.y + pt.hy);
      ctx.lineTo(pt.x + pt.hx + pt.len, pt.y + pt.hy);
      ctx.stroke();
    }
  }

  function frame(ts) {
    if (!running) return;
    if (start === null) start = ts;
    var elapsed = (ts - start) / 1000;
    var t = ts / 1000;

    ctx.clearRect(0, 0, W, H);
    drawNoise(t);
    drawSignal(t, elapsed);
    requestAnimationFrame(frame);
  }

  function play() {
    if (running || reduced) return;
    running = true;
    requestAnimationFrame(frame);
  }
  function pause() { running = false; }

  size();
  seed();
  canvas.classList.add("on");

  if (reduced) {
    // static hero: one resolved frame, no loop, no interaction
    ctx.clearRect(0, 0, W, H);
    drawNoise(1.5);
    drawSignal(4, 99);
    return;
  }

  play();

  window.addEventListener("resize", function () {
    var wasMobile = isMobile;
    isMobile = window.matchMedia("(max-width: 760px)").matches;
    size();
    if (wasMobile !== isMobile) { COUNT = isMobile ? 80 : 220; seed(); }
  }, { passive: true });

  if (!isMobile) {
    canvas.parentElement.addEventListener("pointermove", function (e) {
      var r = canvas.getBoundingClientRect();
      mouse.x = e.clientX - r.left;
      mouse.y = e.clientY - r.top;
    }, { passive: true });
    canvas.parentElement.addEventListener("pointerleave", function () {
      mouse.x = -9999; mouse.y = -9999;
    }, { passive: true });
  }

  // stop burning frames when the hero is offscreen or the tab is hidden
  new IntersectionObserver(function (entries) {
    visible = entries[0].isIntersecting;
    if (visible && focused) play(); else pause();
  }, { threshold: 0 }).observe(canvas);

  document.addEventListener("visibilitychange", function () {
    focused = !document.hidden;
    if (visible && focused) play(); else pause();
  });
})();
