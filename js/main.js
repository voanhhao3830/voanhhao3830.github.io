// Hao Vo — Personal Website interactions
(function () {
  "use strict";

  // Current year in footer
  var yearEl = document.getElementById("year");
  if (yearEl) yearEl.textContent = new Date().getFullYear();
  var timeOfDay = new Date().getHours();
  var timeOfDayText = "morning";
  if (timeOfDay < 12) {
    timeOfDayText = "morning";
  } else if (timeOfDay < 18) {
    timeOfDayText = "afternoon";
  } else {
    timeOfDayText = "evening";
  }
  // Sticky nav shadow on scroll
  var nav = document.getElementById("nav");
  var onScroll = function () {
    if (!nav) return;
    nav.classList.toggle("is-scrolled", window.scrollY > 8);
  };
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  // Mobile menu toggle
  var toggle = document.getElementById("navToggle");
  var links = document.querySelector(".nav__links");
  if (toggle && links) {
    toggle.addEventListener("click", function () {
      var open = links.classList.toggle("is-open");
      toggle.setAttribute("aria-expanded", String(open));
    });
    links.querySelectorAll("a").forEach(function (a) {
      a.addEventListener("click", function () {
        links.classList.remove("is-open");
        toggle.setAttribute("aria-expanded", "false");
      });
    });
  }

  // Scroll-reveal with stagger
  var reveals = document.querySelectorAll(".reveal");
  if ("IntersectionObserver" in window) {
    var io = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry, i) {
          if (entry.isIntersecting) {
            var el = entry.target;
            el.style.transitionDelay = Math.min(i * 70, 280) + "ms";
            el.classList.add("is-visible");
            io.unobserve(el);
          }
        });
      },
      { threshold: 0.12, rootMargin: "0px 0px -8% 0px" }
    );
    reveals.forEach(function (el) {
      io.observe(el);
    });
  } else {
    reveals.forEach(function (el) {
      el.classList.add("is-visible");
    });
  }
})();

/* =========================================================
   Hero perception scene — autonomous driving & robotics
   Perspective road grid + live detection bounding boxes.
   ========================================================= */
(function () {
  "use strict";

  var hero = document.getElementById("hero");
  var canvas = document.getElementById("scene");
  if (!hero || !canvas) return;
  var ctx = canvas.getContext("2d");
  if (!ctx) return;

  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var dpr = Math.min(window.devicePixelRatio || 1, 2);
  var W = 1, H = 1, vpX = 0, vpY = 0;

  function resize() {
    var r = hero.getBoundingClientRect();
    W = Math.max(1, r.width);
    H = Math.max(1, r.height);
    canvas.width = Math.round(W * dpr);
    canvas.height = Math.round(H * dpr);
    canvas.style.height = H + "px";
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    vpX = W * 0.5;
    vpY = H * 0.46;
  }

  // Map a road-relative position to screen space (perspective projection).
  function proj(lane, p) {
    var z = Math.pow(Math.max(0, Math.min(1, p)), 2.0);
    return {
      x: vpX + lane * (W * 0.66) * z,
      y: vpY + (H - vpY) * z,
      z: z
    };
  }

  var BLUE = "37,99,235";

  // Object catalog: world-space box dims (lane half-width, depth half, height px@z=1).
  var TYPES = {
    car:       { wl: 0.20, dp: 0.060, hh: 70,  label: "car" },
    pedestrian:{ wl: 0.055, dp: 0.030, hh: 135, label: "pedestrian" },
    robot_arm: { wl: 0.11, dp: 0.080, hh: 120, label: "robot arm" },
    humanoid:  { wl: 0.075, dp: 0.045, hh: 130, label: "humanoid" }
  };
  var TYPE_KEYS = Object.keys(TYPES);

  function spawn(p) {
    var key = TYPE_KEYS[(Math.random() * TYPE_KEYS.length) | 0];
    return {
      type: key,
      p: p == null ? Math.random() : p,
      lane: (Math.random() * 1.7 - 0.85),
      speed: 0.045 + Math.random() * 0.045
    };
  }

  var dets = [];
  for (var i = 0; i < 5; i++) dets.push(spawn(i / 5 + 0.05));

  // Scanning point-cloud particles drifting toward the horizon.
  var pts = [];
  for (var j = 0; j < 40; j++) {
    pts.push({ lane: Math.random() * 2 - 1, p: Math.random(), s: 0.4 + Math.random() * 0.7 });
  }

  // Project a 3D road point: lane offset, depth p, and world height (px) above ground.
  function corner(lane, p, hWorld) {
    var g = proj(lane, p);
    return { x: g.x, y: g.y - hWorld * g.z, z: g.z };
  }

  function line(a, b) { ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); }

  // Draw a 3D bounding cuboid around a road-space box.
  function cuboid(L, P, wl, dp, hh, a) {
    var p1 = Math.max(0.001, P - dp), p2 = Math.min(1, P + dp);
    var blb = corner(L - wl, p1, 0),  brb = corner(L + wl, p1, 0);
    var flb = corner(L - wl, p2, 0),  frb = corner(L + wl, p2, 0);
    var blt = corner(L - wl, p1, hh), brt = corner(L + wl, p1, hh);
    var flt = corner(L - wl, p2, hh), frt = corner(L + wl, p2, hh);

    // Translucent front face for a sense of volume
    ctx.beginPath();
    ctx.moveTo(flb.x, flb.y); ctx.lineTo(frb.x, frb.y);
    ctx.lineTo(frt.x, frt.y); ctx.lineTo(flt.x, flt.y); ctx.closePath();
    ctx.fillStyle = "rgba(" + BLUE + "," + (a * 0.07) + ")";
    ctx.fill();

    // Back edges (dimmer)
    ctx.strokeStyle = "rgba(" + BLUE + "," + (a * 0.45) + ")";
    ctx.lineWidth = 1;
    ctx.beginPath();
    line(blb, brb); line(blt, brt); line(blb, blt); line(brb, brt);
    ctx.stroke();

    // Connecting depth edges
    ctx.beginPath();
    line(blb, flb); line(brb, frb); line(blt, flt); line(brt, frt);
    ctx.stroke();

    // Front edges (brightest)
    ctx.strokeStyle = "rgba(" + BLUE + "," + a + ")";
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    line(flb, frb); line(flt, frt); line(flb, flt); line(frb, frt);
    ctx.stroke();

    return { flb: flb, frb: frb, flt: flt, frt: frt };
  }

  // ---- Object glyphs (drawn on the front face of the cuboid) ----
  function setPen(a, lw) {
    ctx.strokeStyle = "rgba(" + BLUE + "," + a + ")";
    ctx.fillStyle = "rgba(" + BLUE + "," + a + ")";
    ctx.lineWidth = lw;
    ctx.lineJoin = "round";
    ctx.lineCap = "round";
  }

  function gCar(cx, baseY, w, h, a) {
    setPen(a, Math.max(1.2, h * 0.05));
    var bodyH = h * 0.5, cabinH = h * 0.45;
    var bw = w * 0.92, by = baseY - bodyH;
    ctx.beginPath();
    // cabin + hood silhouette
    ctx.moveTo(cx - bw / 2, baseY);
    ctx.lineTo(cx - bw / 2, by);
    ctx.lineTo(cx - bw * 0.26, by);
    ctx.lineTo(cx - bw * 0.16, by - cabinH);
    ctx.lineTo(cx + bw * 0.16, by - cabinH);
    ctx.lineTo(cx + bw * 0.26, by);
    ctx.lineTo(cx + bw / 2, by);
    ctx.lineTo(cx + bw / 2, baseY);
    ctx.stroke();
    // windshield
    ctx.beginPath();
    ctx.moveTo(cx - bw * 0.13, by - cabinH * 0.85);
    ctx.lineTo(cx + bw * 0.13, by - cabinH * 0.85);
    ctx.stroke();
    // wheels
    var wr = h * 0.12;
    ctx.beginPath(); ctx.arc(cx - bw * 0.3, baseY, wr, 0, 6.2832);
    ctx.arc(cx + bw * 0.3, baseY, wr, 0, 6.2832); ctx.stroke();
  }

  function gPedestrian(cx, baseY, w, h, a) {
    setPen(a, Math.max(1.3, h * 0.045));
    var hd = h * 0.11, topY = baseY - h;
    ctx.beginPath(); ctx.arc(cx, topY + hd, hd, 0, 6.2832); ctx.stroke();
    var sy = topY + hd * 2.1, hipY = baseY - h * 0.42;
    ctx.beginPath();
    ctx.moveTo(cx, sy); ctx.lineTo(cx, hipY);            // torso
    ctx.moveTo(cx, sy + h * 0.05); ctx.lineTo(cx - h * 0.15, sy + h * 0.26); // arm
    ctx.moveTo(cx, sy + h * 0.05); ctx.lineTo(cx + h * 0.13, sy + h * 0.28); // arm (stride)
    ctx.moveTo(cx, hipY); ctx.lineTo(cx - h * 0.13, baseY); // leg
    ctx.moveTo(cx, hipY); ctx.lineTo(cx + h * 0.11, baseY); // leg
    ctx.stroke();
  }

  function gHumanoid(cx, baseY, w, h, a) {
    setPen(a, Math.max(1.3, h * 0.045));
    var topY = baseY - h, u = h;
    // head
    var hw = u * 0.18, hh2 = u * 0.14;
    ctx.strokeRect(cx - hw / 2, topY, hw, hh2);
    // visor
    ctx.beginPath();
    ctx.moveTo(cx - hw * 0.32, topY + hh2 * 0.55);
    ctx.lineTo(cx + hw * 0.32, topY + hh2 * 0.55);
    ctx.stroke();
    // antenna
    ctx.beginPath(); ctx.moveTo(cx, topY); ctx.lineTo(cx, topY - u * 0.06);
    ctx.stroke();
    ctx.beginPath(); ctx.arc(cx, topY - u * 0.07, u * 0.012, 0, 6.2832); ctx.fill();
    // torso
    var tY = topY + hh2 + u * 0.02, tW = u * 0.30, tH = u * 0.34;
    ctx.strokeRect(cx - tW / 2, tY, tW, tH);
    ctx.beginPath(); ctx.moveTo(cx, tY + u * 0.05); ctx.lineTo(cx, tY + tH * 0.7); ctx.stroke();
    // arms
    var aW = u * 0.07;
    ctx.strokeRect(cx - tW / 2 - aW - 1, tY + u * 0.02, aW, tH * 0.85);
    ctx.strokeRect(cx + tW / 2 + 1, tY + u * 0.02, aW, tH * 0.85);
    // legs
    var lY = tY + tH + u * 0.01, lH = baseY - lY, lW = u * 0.10;
    ctx.strokeRect(cx - lW - u * 0.015, lY, lW, lH);
    ctx.strokeRect(cx + u * 0.015, lY, lW, lH);
  }

  function gRobotArm(cx, baseY, w, h, a) {
    setPen(a, Math.max(1.6, h * 0.05));
    var u = h;
    // base plate
    ctx.fillRect(cx - u * 0.16, baseY - u * 0.05, u * 0.32, u * 0.05);
    var j0 = { x: cx, y: baseY - u * 0.06 };
    var j1 = { x: cx + u * 0.02, y: baseY - u * 0.45 };          // shoulder
    var j2 = { x: cx + u * 0.30, y: baseY - u * 0.62 };          // elbow
    var j3 = { x: cx + u * 0.46, y: baseY - u * 0.40 };          // wrist
    ctx.beginPath();
    ctx.moveTo(j0.x, j0.y); ctx.lineTo(j1.x, j1.y);
    ctx.lineTo(j2.x, j2.y); ctx.lineTo(j3.x, j3.y);
    ctx.stroke();
    // joints
    [j1, j2].forEach(function (j) {
      ctx.beginPath(); ctx.arc(j.x, j.y, u * 0.035, 0, 6.2832); ctx.stroke();
    });
    // gripper
    var gx = j3.x, gy = j3.y, g = u * 0.07;
    ctx.beginPath();
    ctx.moveTo(gx, gy); ctx.lineTo(gx + g, gy - g);
    ctx.moveTo(gx, gy); ctx.lineTo(gx + g, gy + g * 0.6);
    ctx.stroke();
  }

  var GLYPHS = {
    car: gCar, pedestrian: gPedestrian, humanoid: gHumanoid, robot_arm: gRobotArm
  };

  function draw(dt, phase) {
    ctx.clearRect(0, 0, W, H);

    // Converging side lines (road edges)
    for (var k = -3; k <= 3; k++) {
      var b = proj(k / 3, 1);
      ctx.beginPath();
      ctx.moveTo(vpX, vpY);
      ctx.lineTo(b.x, b.y);
      ctx.strokeStyle = "rgba(" + BLUE + ",0.06)";
      ctx.lineWidth = 1;
      ctx.stroke();
    }

    // Horizontal scan rows sweeping toward the viewer
    var N = 14;
    for (var n = 0; n < N; n++) {
      var p = (n / N + phase) % 1;
      var l = proj(-1, p), rg = proj(1, p);
      ctx.beginPath();
      ctx.moveTo(l.x, l.y);
      ctx.lineTo(rg.x, rg.y);
      ctx.strokeStyle = "rgba(" + BLUE + "," + (0.03 + 0.12 * p) + ")";
      ctx.lineWidth = 0.5 + p;
      ctx.stroke();
    }

    // Center lane dashes
    for (var m = 0; m < N; m++) {
      var pp = (m / N + phase) % 1;
      var t0 = proj(0, pp);
      var t1 = proj(0, Math.min(1, pp + 0.035));
      ctx.beginPath();
      ctx.moveTo(t0.x, t0.y);
      ctx.lineTo(t1.x, t1.y);
      ctx.strokeStyle = "rgba(" + BLUE + "," + (0.05 + 0.18 * pp) + ")";
      ctx.lineWidth = 1 + 2 * pp;
      ctx.stroke();
    }

    // Point-cloud particles
    for (var q = 0; q < pts.length; q++) {
      var pt = pts[q];
      pt.p += (reduce ? 0 : dt * (0.03 + pt.s * 0.04));
      if (pt.p > 1) { pt.p = 0.02; pt.lane = Math.random() * 2 - 1; }
      var sp = proj(pt.lane, pt.p);
      ctx.beginPath();
      ctx.arc(sp.x, sp.y, 0.6 + pt.s * 1.6 * sp.z, 0, 6.2832);
      ctx.fillStyle = "rgba(" + BLUE + "," + (0.10 + 0.45 * sp.z) + ")";
      ctx.fill();
    }

    // Sort far -> near so closer detections paint on top
    dets.sort(function (x, y) { return x.p - y.p; });

    // 3D detections with objects inside
    for (var d = 0; d < dets.length; d++) {
      var o = dets[d];
      o.p += (reduce ? 0 : dt * o.speed);
      if (o.p >= 1) { dets[d] = spawn(0.02); o = dets[d]; }

      var cfg = TYPES[o.type];
      var pr = proj(o.lane, o.p);
      var alpha = Math.min(1, o.p * 1.7) * (0.28 + 0.55 * pr.z);

      var face = cuboid(o.lane, o.p, cfg.wl, cfg.dp, cfg.hh, alpha);

      // Object glyph sits on the front face
      var cx = (face.flb.x + face.frb.x) / 2;
      var baseY = (face.flb.y + face.frb.y) / 2;
      var fw = Math.abs(face.frb.x - face.flb.x);
      var fh = Math.abs(face.flb.y - face.flt.y);
      if (fh > 18) {
        var g = GLYPHS[o.type];
        if (g) g(cx, baseY, fw, fh, Math.min(1, alpha + 0.12));
      }

      // Label chip above the box
      if (pr.z > 0.22) {
        ctx.font = "600 10px Inter, sans-serif";
        var label = cfg.label + "  " + (0.80 + pr.z * 0.18).toFixed(2);
        var tw = ctx.measureText(label).width + 12;
        var lx = face.flt.x;
        var ly = face.flt.y - 17;
        ctx.fillStyle = "rgba(" + BLUE + "," + (alpha * 0.95) + ")";
        ctx.fillRect(lx, ly, tw, 14);
        ctx.fillStyle = "rgba(255,255,255," + Math.min(1, alpha + 0.3) + ")";
        ctx.fillText(label, lx + 6, ly + 10.5);
      }
    }
  }

  var last = 0;
  var running = true;
  function loop(ts) {
    if (!running) return;
    var dt = last ? Math.min(0.05, (ts - last) / 1000) : 0.016;
    last = ts;
    var phase = (ts * 0.00007) % 1;
    draw(dt, phase);
    requestAnimationFrame(loop);
  }

  var ro = "ResizeObserver" in window ? new ResizeObserver(resize) : null;
  if (ro) ro.observe(hero); else window.addEventListener("resize", resize);
  resize();

  if (reduce) {
    draw(0, 0.5); // single representative frame
  } else {
    document.addEventListener("visibilitychange", function () {
      if (document.hidden) { running = false; }
      else if (!running) { running = true; last = 0; requestAnimationFrame(loop); }
    });
    requestAnimationFrame(loop);
  }
})();

