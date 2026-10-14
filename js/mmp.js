/* ============================================================
   Moisture Master Pros — site behaviour
   One file, no dependencies. Every block guards its own markup,
   so any page can carry any subset of these features.
   ============================================================ */
(function () {
  'use strict';

  var $  = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var clamp = function (v, a, b) { return Math.min(b, Math.max(a, v)); };
  var lerp  = function (a, b, t) { return a + (b - a) * t; };
  var reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* =========================================================
     SERVICE AREA
     Prefix ranges, not a ZIP list — the real coverage map goes
     in here once MMP confirms it. Everything downstream (hero
     gate, booking funnel, contact form) reads this one source.
     ========================================================= */
  /* Exactly the 49 ZIP codes MMP confirmed, not prefix ranges. A ZIP is
     either on this list or it is not covered; there is no guessing at the
     edges of a county. Add or remove codes here and every gate on the site
     follows, because they all read this one table. */
  var AREA = [
    { name: 'Philadelphia', zips:
      '19103 19106 19118 19119 19127 19128 19129 19130 19146 19147 ' },
    { name: 'the Philadelphia suburbs', zips:
      '19003 19004 19006 19008 19010 19034 19035 19041 19046 19063 19064 19066 ' +
      '19072 19073 19081 19083 19085 19086 19087 19096 19301 19312 19317 19333 ' +
      '19348 19355 19380 19382 19422 19428 19444 19462 ' },
    { name: 'northern Delaware', zips:
      '19701 19702 19707 19801 19803 19806 19807 ' }
  ];

  /* Florida is sold but not yet staffed. It gets its own answer rather than
     being lumped in with "we do not cover you". */
  function isSoon(z) { var n = parseInt(z.slice(0, 3), 10); return n >= 320 && n <= 349; }

  function lookupZip(z) {
    if (!/^\d{5}$/.test(z)) return { state: 'bad' };
    for (var i = 0; i < AREA.length; i++) {
      if (AREA[i].zips.indexOf(z + ' ') > -1) return { state: 'in', name: AREA[i].name };
    }
    if (isSoon(z)) return { state: 'soon', name: 'Florida' };
    return { state: 'out' };
  }

  function saveZip(z, res) {
    try {
      sessionStorage.setItem('mmp-zip', z);
      sessionStorage.setItem('mmp-zip-state', res.state);
      if (res.name) sessionStorage.setItem('mmp-zip-name', res.name);
    } catch (e) {}
  }
  function readZip() {
    try {
      return {
        zip: sessionStorage.getItem('mmp-zip') || '',
        state: sessionStorage.getItem('mmp-zip-state') || '',
        name: sessionStorage.getItem('mmp-zip-name') || ''
      };
    } catch (e) { return { zip: '', state: '', name: '' }; }
  }

  var ICON_OK  = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>';
  var ICON_SOON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M12 7.4V12l3 1.8"/></svg>';
  var ICON_NO  = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><circle cx="12" cy="12" r="9"/><path d="M12 8v5M12 16.2v.2"/></svg>';

  /* ---------- ZIP gates (there may be several on a page) ---------- */
  $$('[data-zip]').forEach(function (gate) {
    var form = $('form', gate);
    var input = $('input', gate);
    var out = $('[data-zip-out]', gate);
    if (!form || !input || !out) return;

    function render(z) {
      var res = lookupZip(z);
      var tone = res.state === 'in' ? 'ok' : res.state === 'bad' ? 'bad' : 'no';
      out.className = 'zip-out show ' + tone + (gate.classList.contains('light') ? ' light' : '');

      if (res.state === 'bad') {
        out.innerHTML = '<b>' + ICON_NO + 'That does not look like a ZIP code</b>' +
          '<p>Enter the five digit ZIP of the property you need help with.</p>';
        return;
      }
      saveZip(z, res);
      var next = gate.getAttribute('data-zip-next') || 'book.html';

      if (res.state === 'in') {
        out.innerHTML = '<b>' + ICON_OK + 'Good news, we cover ' + res.name + '</b>' +
          '<p>A Moisture Master Pros crew works in ' + z + '. Pick how you would like to start.</p>' +
          '<div class="row">' +
            '<a class="b b-sm" href="' + next + '?zip=' + z + '">Choose how to start</a>' +
            '<a class="b b-sm b-ghost" href="tel:+18334664788">Call 1-833-466-4788</a>' +
          '</div>';
      } else if (res.state === 'soon') {
        out.innerHTML = '<b>' + ICON_SOON + 'Florida is coming soon</b>' +
          '<p>We are opening in Florida but crews are not working there yet. A video consultation is available today, anywhere in the US, and we will tell you the moment we are live near you.</p>' +
          '<div class="row">' +
            '<a class="b b-sm" href="' + next + '?path=video&amp;zip=' + z + '">Book a video consultation</a>' +
            '<a class="b b-sm b-ghost" href="contact.html?waitlist=' + z + '">Tell me when you open</a>' +
          '</div>';
      } else {
        out.innerHTML = '<b>' + ICON_NO + 'We do not cover ' + z + ' yet</b>' +
          '<p>Crews work across Philadelphia, the surrounding suburbs and northern Delaware. A video consultation is available anywhere in the US.</p>' +
          '<div class="row">' +
            '<a class="b b-sm" href="' + next + '?path=video&amp;zip=' + z + '">Book a video consultation</a>' +
            '<a class="b b-sm b-ghost" href="contact.html?waitlist=' + z + '">Tell me when you expand</a>' +
          '</div>';
      }
      document.dispatchEvent(new CustomEvent('mmp:zip', { detail: { zip: z, res: res } }));
    }

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      render(input.value.trim());
    });
    input.addEventListener('input', function () {
      input.value = input.value.replace(/[^\d]/g, '').slice(0, 5);
    });

    // A ZIP already answered earlier in the visit, or handed over in the URL.
    var pre = new URLSearchParams(location.search).get('zip') || readZip().zip;
    if (pre && gate.hasAttribute('data-zip-restore')) { input.value = pre; render(pre); }
  });

  /* =========================================================
     HERO INTRO
     Layered over a hero that is already painted, so it can never
     delay content. Shown once per visit, skipped on small screens,
     reduced motion, and metered connections.
     ========================================================= */
  (function () {
    var intro = $('[data-intro]');
    if (!intro) return;

    var seen = false;
    try { seen = sessionStorage.getItem('mmp-intro') === '1'; } catch (e) {}
    var small = matchMedia('(max-width:760px)').matches;
    var conn = navigator.connection || {};
    var thrifty = conn.saveData === true || /2g/.test(conn.effectiveType || '');

    if (seen || small || reduced || thrifty) { intro.remove(); return; }

    var vid = $('video', intro);
    var done = false;
    function finish() {
      if (done) return;
      done = true;
      try { sessionStorage.setItem('mmp-intro', '1'); } catch (e) {}
      intro.classList.remove('in');
      setTimeout(function () { intro.remove(); }, 950);
    }

    // Any sign the visitor wants to get on with it ends the intro.
    intro.addEventListener('click', finish);
    addEventListener('keydown', function (e) { if (e.key === 'Escape' || e.key === ' ') finish(); });
    addEventListener('wheel', finish, { passive: true, once: true });
    addEventListener('touchstart', finish, { passive: true, once: true });

    /* Fail closed. The overlay is only ever revealed once playback has
       genuinely STARTED (the 'playing' event), never merely because the file
       is buffered. A browser that refuses to autoplay, or a tab opened in the
       background, therefore shows the plain hero instead of a frozen frame. */
    var bail = setTimeout(finish, 1800);

    vid.muted = true;
    vid.defaultMuted = true;
    vid.playsInline = true;

    vid.addEventListener('canplay', function () {
      if (done) return;
      var p = vid.play();
      if (p && p.catch) p.catch(finish);
    }, { once: true });

    vid.addEventListener('playing', function () {
      if (done) return;
      clearTimeout(bail);
      intro.classList.add('in');

      /* 'playing' can fire in a throttled or unfocused window without the
         frames ever advancing. Confirm real movement, or get out of the way
         rather than parking a frozen still over the page. */
      var mark = vid.currentTime;
      setTimeout(function () {
        if (!done && vid.currentTime <= mark + 0.05) finish();
      }, 900);

      var ms = isFinite(vid.duration) && vid.duration > 1 ? vid.duration * 1000 - 600 : 4200;
      setTimeout(finish, Math.max(1500, ms));
    }, { once: true });

    vid.addEventListener('ended', finish);
    vid.addEventListener('error', finish);
    vid.addEventListener('stalled', finish);
    vid.load();
  })();

  /* =========================================================
     NAV
     ========================================================= */
  var nav = $('.nav');
  if (nav) {
    var burger = $('.burger', nav);
    var links = $('.links', nav);
    if (burger && links) {
      burger.addEventListener('click', function () {
        var open = burger.getAttribute('aria-expanded') === 'true';
        burger.setAttribute('aria-expanded', String(!open));
        links.classList.toggle('open', !open);
      });
      links.addEventListener('click', function (e) {
        if (e.target.closest('a')) {
          burger.setAttribute('aria-expanded', 'false');
          links.classList.remove('open');
        }
      });
    }

    // Services dropdown: hover on a pointer device, click everywhere.
    $$('.drop', nav).forEach(function (drop) {
      var btn = $('button', drop);
      if (!btn) return;
      var fine = matchMedia('(hover:hover) and (min-width:1001px)').matches;
      btn.addEventListener('click', function (e) {
        e.stopPropagation();
        drop.setAttribute('data-open', drop.getAttribute('data-open') === 'true' ? 'false' : 'true');
      });
      if (fine) {
        drop.addEventListener('mouseenter', function () { drop.setAttribute('data-open', 'true'); });
        drop.addEventListener('mouseleave', function () { drop.setAttribute('data-open', 'false'); });
      }
      document.addEventListener('click', function (e) {
        if (!drop.contains(e.target)) drop.setAttribute('data-open', 'false');
      });
    });

    addEventListener('scroll', function () {
      nav.classList.toggle('scrolled', scrollY > 10);
    }, { passive: true });

    /* The nav sits on whatever section is under it. Sections opt in with
       data-nav="navy" and the bar inverts as they pass beneath. */
    var zones = $$('[data-nav]');
    if (zones.length) {
      var paint = function () {
        var y = nav.offsetHeight * 0.5;
        var on = 'white';
        for (var i = 0; i < zones.length; i++) {
          var r = zones[i].getBoundingClientRect();
          if (r.top <= y && r.bottom > y) { on = zones[i].getAttribute('data-nav'); }
        }
        nav.setAttribute('data-on', on);
      };
      addEventListener('scroll', paint, { passive: true });
      addEventListener('resize', paint);
      paint();
    }
  }

  /* =========================================================
     REVEAL
     ========================================================= */
  var rise = $$('[data-r]');
  if (rise.length) {
    if (reduced || !('IntersectionObserver' in window)) {
      rise.forEach(function (el) { el.classList.add('in'); });
    } else {
      var io = new IntersectionObserver(function (es) {
        es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } });
      }, { rootMargin: '0px 0px -12% 0px', threshold: 0.08 });
      rise.forEach(function (el) { io.observe(el); });
    }
  }

  /* =========================================================
     THE MOLD TEST
     Round one: scrub the growth off, which is satisfying and
     completely pointless. Round two: find the water that grew
     it. The game is the argument the company actually makes.
     ========================================================= */
  var gameRoot = $('[data-game]');
  if (gameRoot) initGame(gameRoot);

  function initGame(root) {
    var stage = $('.game-stage', root);
    var cv = $('canvas', stage);
    if (!cv) return;
    var ctx = cv.getContext('2d', { willReadFrequently: true });
    var brush = $('.game-brush', stage);
    var cut = $('.game-cut', stage);
    var say = $('.game-say', stage);
    var bar = $('[data-bar]', root);
    var pctEl = $('[data-pct]', root);
    var roundEl = $('[data-round]', root);
    var hint = $('[data-hint]', root);

    var W = 0, H = 0, dpr = 1, ink0 = 0, round = 1, finished = false, touched = false;

    /* Deterministic, so a resize repaints the same growth rather than
       dealing you a fresh wall halfway through cleaning it. */
    var seed = 20260915;
    function rnd() { seed = (seed * 1664525 + 1013904223) % 4294967296; return seed / 4294967296; }

    var COL = [];
    for (var i = 0; i < 6; i++) {
      var blobs = [], n = 20 + Math.floor(rnd() * 14);
      for (var j = 0; j < n; j++) {
        var a = rnd() * 6.283, d = Math.pow(rnd(), 0.65);
        blobs.push({ x: Math.cos(a) * d, y: Math.sin(a) * d * 0.78, r: 0.22 + rnd() * 0.8, o: 0.3 + rnd() * 0.55 });
      }
      COL.push({ cx: 0.14 + rnd() * 0.72, cy: 0.18 + rnd() * 0.58, R: 0.05 + rnd() * 0.075, blobs: blobs });
    }
    var SPECK = [];
    for (var k = 0; k < 220; k++) SPECK.push({ x: 0.06 + rnd() * 0.88, y: 0.08 + rnd() * 0.84, r: rnd(), o: rnd() });

    // A small offscreen copy is all the coverage maths needs, and reading
    // 80x50 pixels is cheap enough to do while the pointer is moving.
    /* 160x100, not 80x50: at the coarser grid the soft growth averaged below
       the visibility threshold, so the baseline came out at ~100 cells and the
       meter barely moved. Still only 16k pixels to read. */
    var MW = 160, MH = 100;
    var mini = document.createElement('canvas');
    mini.width = MW; mini.height = MH;
    var mctx = mini.getContext('2d', { willReadFrequently: true });

    function paintMold(alpha) {
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.globalCompositeOperation = 'source-over';
      ctx.clearRect(0, 0, W, H);
      ctx.globalAlpha = alpha == null ? 1 : alpha;
      var S = Math.min(W, H);

      COL.forEach(function (c) {
        var R = c.R * S;
        c.blobs.forEach(function (b) {
          var x = c.cx * W + b.x * R * 1.9;
          var y = c.cy * H + b.y * R * 1.9;
          var r = Math.max(2, b.r * R * 0.6);
          var g = ctx.createRadialGradient(x, y, 0, x, y, r);
          g.addColorStop(0, 'rgba(22,28,18,' + (b.o * 0.96) + ')');
          g.addColorStop(0.36, 'rgba(58,66,40,' + (b.o * 0.66) + ')');
          g.addColorStop(0.8, 'rgba(96,98,64,' + (b.o * 0.2) + ')');
          g.addColorStop(1, 'rgba(120,118,82,0)');
          ctx.fillStyle = g;
          ctx.beginPath(); ctx.arc(x, y, r, 0, 6.283); ctx.fill();

          // A harder core on the denser blobs, so the colony has edges
          // instead of reading as one soft smudge.
          if (b.o > 0.55) {
            ctx.fillStyle = 'rgba(16,23,13,' + (b.o * 0.5) + ')';
            ctx.beginPath(); ctx.arc(x, y, r * 0.3, 0, 6.283); ctx.fill();
          }
        });
      });

      SPECK.forEach(function (p) {
        ctx.fillStyle = 'rgba(30,34,20,' + (0.14 + p.o * 0.38) + ')';
        ctx.beginPath();
        ctx.arc(p.x * W, p.y * H, 0.6 + p.r * 1.8, 0, 6.283);
        ctx.fill();
      });
      ctx.globalAlpha = 1;
    }

    function ink() {
      mctx.clearRect(0, 0, MW, MH);
      mctx.drawImage(cv, 0, 0, MW, MH);
      var d = mctx.getImageData(0, 0, MW, MH).data, n = 0;
      for (var i = 3; i < d.length; i += 4) if (d[i] > 40) n++;
      return n;
    }

    function size() {
      var r = stage.getBoundingClientRect();
      // Bail until the stage has a real box. Measuring the baseline against a
      // half-laid-out canvas was giving an ink0 five times too small, which
      // pinned the meter near zero however much the player scrubbed.
      if (r.width < 80 || r.height < 60) return;
      // Once scrubbing starts, a resize must not repaint the wall underneath
      // the player or re-baseline their progress.
      if (touched) return;

      W = r.width; H = r.height;
      dpr = Math.min(devicePixelRatio || 1, 2);
      cv.width = W * dpr; cv.height = H * dpr;
      cv.style.width = W + 'px'; cv.style.height = H + 'px';
      if (round === 1 && !finished) { paintMold(); ink0 = ink(); report(0); }
      if (brush) brush.style.setProperty('--r', Math.max(52, Math.min(W, H) * 0.17) + 'px');
    }

    function report(p) {
      if (bar) bar.style.width = (p * 100) + '%';
      if (pctEl) pctEl.textContent = Math.round(p * 100) + '%';
    }

    /* ---------- round one: scrubbing ---------- */
    var down = false, lastX = null, lastY = null, checkAt = 0;

    function at(e) {
      var r = stage.getBoundingClientRect();
      return [e.clientX - r.left, e.clientY - r.top];
    }
    function wipe(x, y) {
      var rad = Math.max(26, Math.min(W, H) * 0.085);
      ctx.globalCompositeOperation = 'destination-out';
      var g = ctx.createRadialGradient(x, y, rad * 0.2, x, y, rad);
      g.addColorStop(0, 'rgba(0,0,0,1)');
      g.addColorStop(0.86, 'rgba(0,0,0,1)');
      g.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.arc(x, y, rad, 0, 6.283); ctx.fill();
    }
    function stroke(x, y) {
      touched = true;
      // Interpolate, or a fast drag leaves untouched gaps between samples.
      if (lastX != null) {
        var dx = x - lastX, dy = y - lastY;
        var steps = Math.ceil(Math.sqrt(dx * dx + dy * dy) / 12);
        for (var i = 1; i < steps; i++) wipe(lastX + dx * i / steps, lastY + dy * i / steps);
      }
      wipe(x, y);
      lastX = x; lastY = y;

      var now = performance.now();
      if (now - checkAt > 110) {
        checkAt = now;
        var p = ink0 ? clamp(1 - ink() / ink0, 0, 1) : 0;
        report(p);
        if (p >= 0.74 && !finished) { finished = true; endRoundOne(); }
      }
    }

    stage.addEventListener('pointerdown', function (e) {
      if (round !== 1 || finished) return;
      down = true; lastX = lastY = null;
      try { stage.setPointerCapture(e.pointerId); } catch (err) {}
      var c = at(e); stroke(c[0], c[1]);
    });
    stage.addEventListener('pointermove', function (e) {
      var c = at(e);
      if (brush) { brush.style.left = c[0] + 'px'; brush.style.top = c[1] + 'px'; }
      stage.classList.toggle('live', round === 1 && !finished);
      if (!down || round !== 1 || finished) return;
      e.preventDefault();
      stroke(c[0], c[1]);
    });
    ['pointerup', 'pointercancel', 'pointerleave'].forEach(function (ev) {
      stage.addEventListener(ev, function () {
        if (down && round === 1 && !finished && ink0) {
          var p = clamp(1 - ink() / ink0, 0, 1);
          report(p);
          if (p >= 0.74) { finished = true; endRoundOne(); }
        }
        down = false; lastX = lastY = null;
      });
    });
    stage.addEventListener('pointerleave', function () { stage.classList.remove('live'); });

    function endRoundOne() {
      stage.classList.remove('live');
      report(1);
      if (roundEl) roundEl.textContent = 'Round 1 complete';

      // It grows back. That is the whole point of the exercise.
      var t0 = performance.now();
      (function grow(now) {
        var p = clamp((now - t0) / 1400, 0, 1);
        paintMold(p * 0.95);
        if (p < 1) requestAnimationFrame(grow);
        else {
          tell('It came back.',
            'Nothing you did touched the water feeding it. That is why people pay for remediation twice.',
            'Find the source', startRoundTwo);
        }
      })(t0);
    }

    /* ---------- round two: hunt the source with a moisture meter ----------
       A hidden point, a reading that climbs as the pointer closes on it, and
       a click to log the finding. The player has to search rather than pick
       one of four, which is what leak detection actually is. */
    var area = $('[data-probe-area]', root);
    var probe = $('[data-probe]', root);
    var heat = $('[data-heat]', root);
    var readEl = $('[data-read]', root);
    var cueEl = $('[data-cue]', root);

    // In the cutaway's own coordinates: the parapet, top left.
    var SRC = { x: 0.163, y: 0.085 };
    var HIT = 76;              // reading needed to log a find
    var lastRead = 0, tries = 0, solved = false;

    function readingAt(u, v) {
      var ar = area ? area.clientWidth / Math.max(1, area.clientHeight) : 1.6;
      var dx = (u - SRC.x) * ar, dy = v - SRC.y;
      var d = Math.sqrt(dx * dx + dy * dy);
      var r = 100 * Math.exp(-(d / 0.46) * (d / 0.46) * 1.45);
      return clamp(Math.round(r + 4), 4, 99);
    }

    function moveProbe(e) {
      if (round !== 2 || solved || !area) return;
      var r = area.getBoundingClientRect();
      var u = (e.clientX - r.left) / r.width;
      var v = (e.clientY - r.top) / r.height;
      if (u < 0 || u > 1 || v < 0 || v > 1) { area.classList.remove('live'); return; }
      area.classList.add('live');

      var val = readingAt(u, v);
      probe.style.left = u * 100 + '%';
      probe.style.top = v * 100 + '%';
      probe.style.setProperty('--w', (val / 100).toFixed(2));
      probe.setAttribute('data-hot', val >= HIT ? '1' : '0');
      if (readEl) readEl.textContent = val;

      heat.style.left = SRC.x * 100 + '%';
      heat.style.top = SRC.y * 100 + '%';
      heat.style.setProperty('--o', (Math.max(0, val - 12) / 110).toFixed(2));

      if (cueEl) {
        cueEl.textContent = val >= HIT ? 'Click to log it'
          : val > lastRead + 1 ? 'Warmer'
          : val < lastRead - 1 ? 'Colder'
          : 'Sweep the wall';
      }
      lastRead = val;
    }

    function logFinding(e) {
      if (round !== 2 || solved || !area) return;
      var r = area.getBoundingClientRect();
      var val = readingAt((e.clientX - r.left) / r.width, (e.clientY - r.top) / r.height);
      if (val >= HIT) {
        solved = true;
        cut.classList.add('won');
        if (cueEl) cueEl.textContent = 'Source located';
        if (bar) bar.style.width = '100%';
        setTimeout(function () {
          tell('Found it.',
            (tries === 0 ? 'First sweep. ' : '') +
            'A failed parapet, tracking down the party wall and surfacing a floor below. Close that and the ceiling stays clean.',
            'Book a real assessment', null, 'book.html?path=inspection');
        }, 950);
      } else {
        tries++;
        if (hint) {
          hint.innerHTML = '<b>' + val + '% there.</b> ' + (val < 30
            ? 'Barely damp. The water is nowhere near here.'
            : 'Getting closer, but this is run-off, not the entry point.');
        }
      }
    }

    function startRoundTwo() {
      round = 2;
      solved = false; tries = 0; lastRead = 0;
      say.classList.remove('on');
      cut.classList.add('on');
      stage.classList.remove('live');
      if (roundEl) roundEl.textContent = 'Round 2 \u00B7 find the source';
      if (bar) bar.style.width = '0%';
      if (pctEl) pctEl.textContent = '';
      if (hint) hint.innerHTML = hint.getAttribute('data-two') || hint.innerHTML;
    }

    if (area) {
      area.addEventListener('pointermove', moveProbe);
      area.addEventListener('pointerdown', moveProbe);
      area.addEventListener('pointerup', logFinding);
      area.addEventListener('pointerleave', function () { area.classList.remove('live'); });
    }

    /* ---------- the message card ---------- */
    function tell(title, body, cta, fn, href) {
      say.innerHTML = '';
      var box = document.createElement('div');
      var h = document.createElement('h3'); h.textContent = title;
      var p = document.createElement('p'); p.textContent = body;
      var row = document.createElement('div'); row.className = 'row';
      box.appendChild(h); box.appendChild(p); box.appendChild(row);

      if (href) {
        var a = document.createElement('a');
        a.className = 'b'; a.href = href; a.textContent = cta;
        row.appendChild(a);
        var again = document.createElement('button');
        again.type = 'button'; again.className = 'b b-ghost'; again.textContent = 'Play again';
        again.addEventListener('click', reset);
        row.appendChild(again);
      } else {
        var b = document.createElement('button');
        b.type = 'button'; b.className = 'b'; b.textContent = cta;
        b.addEventListener('click', fn);
        row.appendChild(b);
      }
      say.appendChild(box);
      say.classList.add('on');
    }

    function reset() {
      round = 1; finished = false; tries = 0; solved = false; lastRead = 0;
      touched = false;
      say.classList.remove('on');
      cut.classList.remove('on', 'won');
      if (area) area.classList.remove('live');
      if (roundEl) roundEl.textContent = 'Round 1 · clean the wall';
      if (hint) hint.innerHTML = hint.getAttribute('data-one') || '';
      paintMold(); ink0 = ink(); report(0);
    }

    // Stash the two hint texts so reset and round two can swap between them.
    if (hint && !hint.getAttribute('data-one')) hint.setAttribute('data-one', hint.innerHTML);

    size();
    requestAnimationFrame(size);
    addEventListener('load', size);
    var gt;
    addEventListener('resize', function () { clearTimeout(gt); gt = setTimeout(size, 200); });
    if ('ResizeObserver' in window) new ResizeObserver(function () { size(); }).observe(stage);
  }

  /* =========================================================
     SERVICES — category filter
     ========================================================= */
  var cats = $('[data-cats]');
  if (cats) {
    var cards = $$('[data-cat]');
    var count = $('[data-cat-count]');
    cats.addEventListener('click', function (e) {
      var btn = e.target.closest('button');
      if (!btn) return;
      var want = btn.getAttribute('data-go');
      $$('button', cats).forEach(function (b) { b.setAttribute('aria-current', String(b === btn)); });
      var n = 0;
      cards.forEach(function (c) {
        var show = want === 'all' || c.getAttribute('data-cat') === want;
        c.classList.toggle('svc-hide', !show);
        if (show) n++;
      });
      if (count) count.textContent = n;
    });
  }

  /* =========================================================
     BEFORE / AFTER
     ========================================================= */
  $$('[data-ba]').forEach(function (ba) {
    var set = function (clientX) {
      var r = ba.getBoundingClientRect();
      ba.style.setProperty('--p', clamp((clientX - r.left) / r.width, 0, 1) * 100 + '%');
    };
    var down = false;
    ba.addEventListener('pointerdown', function (e) { down = true; ba.setPointerCapture(e.pointerId); set(e.clientX); });
    ba.addEventListener('pointermove', function (e) { if (down) set(e.clientX); });
    ba.addEventListener('pointerup',   function () { down = false; });
    ba.addEventListener('pointercancel', function () { down = false; });
    // hovering alone should also work — it is the most obvious gesture
    ba.addEventListener('mousemove', function (e) { if (!down) set(e.clientX); });
  });

  /* =========================================================
     COUNTERS
     ========================================================= */
  var nums = $$('[data-count]');
  if (nums.length && !reduced && 'IntersectionObserver' in window) {
    var nio = new IntersectionObserver(function (es) {
      es.forEach(function (e) {
        if (!e.isIntersecting) return;
        nio.unobserve(e.target);
        var el = e.target;
        var to = parseFloat(el.getAttribute('data-count'));
        var dec = parseInt(el.getAttribute('data-dec') || '0', 10);
        var pre = el.getAttribute('data-pre') || '';
        var suf = el.getAttribute('data-suf') || '';
        var t0 = performance.now(), dur = 1500;
        var step = function (now) {
          var p = clamp((now - t0) / dur, 0, 1);
          var e2 = 1 - Math.pow(1 - p, 3);
          el.textContent = pre + (to * e2).toFixed(dec).replace(/\B(?=(\d{3})+(?!\d))/g, ',') + suf;
          if (p < 1) requestAnimationFrame(step);
        };
        requestAnimationFrame(step);
      });
    }, { threshold: 0.4 });
    nums.forEach(function (n) { nio.observe(n); });
  }

  /* =========================================================
     ASSESSMENT
     The same question set MMP already runs, scored into a risk
     band. One question per screen, answers advance automatically,
     and nothing is asked of the visitor before they see a result.
     ========================================================= */
  var qApp = $('[data-quiz-app]');
  if (qApp) initAssessment(qApp);

  function initAssessment(root) {
    var cfg = {};
    try { cfg = JSON.parse(root.getAttribute('data-quiz-config') || '{}'); } catch (e) {}
    var qs = $$('[data-q]', root);
    var rail = $('[data-q-rail]', root);
    var nowEl = $('[data-q-now]', root);
    var totEl = $('[data-q-total]', root);
    var back = $('[data-q-back]', root);
    var result = $('[data-q-result]', root);
    var i = 0, score = 0, answers = {};

    if (totEl) totEl.textContent = qs.length;

    function paint() {
      qs.forEach(function (q, n) { q.classList.toggle('on', n === i); });
      if (rail) rail.style.width = ((i + 1) / qs.length) * 100 + '%';
      if (nowEl) nowEl.textContent = i + 1;
      if (back) back.style.visibility = i === 0 ? 'hidden' : 'visible';
    }

    function finish() {
      score = 0;
      Object.keys(answers).forEach(function (k) { score += answers[k].w; });
      var pct = Math.round((score / (cfg.max || 27)) * 100);
      var band = (cfg.bands || []).find(function (b) { return pct <= b.max; }) ||
                 (cfg.bands || [])[(cfg.bands || []).length - 1];

      var tag = $('[data-band-tag]', root);
      if (tag && band) {
        tag.textContent = band.name;
        tag.className = 'kicker ' + band.name.split(' ')[0].toLowerCase();
      }
      var head = $('[data-band-head]', root); if (head && band) head.textContent = band.head;
      var body = $('[data-band-body]', root); if (body && band) body.textContent = band.body;
      var sc = $('[data-score]', root); if (sc) sc.textContent = pct;

      var cta = $('[data-band-cta]', root);
      var alt = $('[data-band-alt]', root);
      if (cta && band && /low/i.test(band.name)) {
        cta.textContent = 'Book a video consultation';
        cta.setAttribute('href', 'book.html?path=video');
        if (alt) {
          alt.textContent = 'Discuss a repair project';
          alt.setAttribute('href', 'book.html?path=project');
        }
      }

      root.classList.add('done');
      result.classList.add('on');
      setTimeout(function () {
        var g = $('[data-gauge]', root);
        if (g) g.style.left = clamp(pct, 2, 98) + '%';
      }, 120);

      console.log('[MMP] assessment completed (not sent anywhere):', { score: score, pct: pct, answers: answers });
      root.scrollIntoView({ block: 'start', behavior: reduced ? 'auto' : 'smooth' });
    }

    qs.forEach(function (q) {
      var key = q.getAttribute('data-key');
      q.addEventListener('click', function (e) {
        var opt = e.target.closest('.q-opt');
        if (!opt) return;
        $$('.q-opt', q).forEach(function (o) { o.setAttribute('aria-pressed', String(o === opt)); });
        answers[key] = { label: opt.textContent.trim(), w: parseInt(opt.getAttribute('data-w') || '0', 10) };
        setTimeout(function () {
          if (i >= qs.length - 1) finish();
          else { i++; paint(); }
        }, 190);
      });
    });

    if (back) back.addEventListener('click', function () { i = clamp(i - 1, 0, qs.length - 1); paint(); });
    var again = $('[data-q-restart]', root);
    if (again) again.addEventListener('click', function () {
      i = 0; score = 0; answers = {};
      $$('.q-opt', root).forEach(function (o) { o.removeAttribute('aria-pressed'); });
      root.classList.remove('done');
      result.classList.remove('on');
      paint();
    });

    paint();
  }

  /* =========================================================
     SERVICE INDEX  home page
     Hover or keyboard focus picks the scene. On touch, whichever
     row is nearest the middle of the viewport wins, so the stage
     keeps pace with the scroll without anyone tapping.
     ========================================================= */
  (function initSvcIndex() {
    var root = $('[data-svcx]');
    if (!root) return;

    var rows = $$('.sx-row', root);
    var scenes = $$('.sx-scene', root);
    if (!rows.length || rows.length !== scenes.length) return;

    var cur = 0;
    var pointing = false;

    function show(i) {
      if (i === cur || i < 0 || i >= rows.length) return;
      rows[cur].classList.remove('on');
      scenes[cur].classList.remove('on');
      cur = i;
      rows[cur].classList.add('on');
      scenes[cur].classList.add('on');
    }

    rows.forEach(function (r, i) {
      r.addEventListener('mouseenter', function () { pointing = true; show(i); });
      r.addEventListener('focus', function () { show(i); });
    });
    root.addEventListener('mouseleave', function () { pointing = false; });

    // Scroll driven on narrow screens, where there is no hover to read.
    var mq = window.matchMedia('(max-width:980px)');
    var ticking = false;

    function pick() {
      ticking = false;
      if (pointing || !mq.matches) return;
      var mid = window.innerHeight * 0.55;
      var best = cur, dist = Infinity;
      rows.forEach(function (r, i) {
        var b = r.getBoundingClientRect();
        var d = Math.abs((b.top + b.height / 2) - mid);
        if (d < dist) { dist = d; best = i; }
      });
      show(best);
    }

    window.addEventListener('scroll', function () {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(pick);
    }, { passive: true });

    pick();
  })();

  /* =========================================================
     SIXTEEN GALLONS
     1.6 gallons per improperly sealed opening, per storm. The
     jugs are the point: the number on its own means nothing.
     ========================================================= */
  (function initGallons() {
    var root = $('[data-gallons]');
    if (!root) return;

    var PER_OPENING = 1.6;
    var SEAL_EACH = 34;      // roughly what one opening costs to put right
    var FIX_COST = 6000;     // the job Josh quoted: 2,600 remediation + 2,900 restoration
    var LIMITS = { windows: [4, 20], storms: [1, 20] };
    var state = { windows: 10, storms: 1 };

    var jugs = $('[data-jugs]', root);
    var sealSeg = $('[data-seg="seal"]', root);
    var fixSeg = $('[data-seg="fix"]', root);

    function out(name, value) {
      var el = $('[data-out="' + name + '"]', root);
      if (el) el.textContent = value;
    }

    function money(n) { return '$' + Math.round(n).toLocaleString('en-US'); }

    function paint() {
      var gallons = state.windows * PER_OPENING * state.storms;
      var sealCost = state.windows * SEAL_EACH;
      var multiple = Math.round(FIX_COST / sealCost);

      out('windows', state.windows);
      out('storms', state.storms);
      out('gallons', gallons.toFixed(1));
      out('sealCost', money(sealCost));
      out('multiple', multiple + 'x');

      // one jug per whole gallon, with a part filled one for the remainder
      var whole = Math.floor(gallons);
      var part = gallons - whole > 0.08;
      var capped = Math.min(whole, 60);
      out('jugCount', capped + (whole > capped ? '+' : ''));

      jugs.textContent = '';
      for (var i = 0; i < capped; i++) {
        var j = document.createElement('span');
        j.className = 'jug';
        j.style.animationDelay = Math.min(i * 28, 1200) + 'ms';
        j.innerHTML = '<i style="animation-delay:' + (Math.min(i * 28, 1200) + 180) + 'ms"></i>';
        jugs.appendChild(j);
      }
      if (part && capped === whole) {
        var p = document.createElement('span');
        p.className = 'jug part';
        p.style.animationDelay = Math.min(capped * 28, 1200) + 'ms';
        p.innerHTML = '<i style="animation-delay:' + (Math.min(capped * 28, 1200) + 180) + 'ms"></i>';
        jugs.appendChild(p);
      }

      // the bar is the argument: sealing against what it costs to not seal
      if (sealSeg && fixSeg) {
        sealSeg.style.flexGrow = '1';
        fixSeg.style.flexGrow = String(Math.max(multiple, 2));
      }

      $$('[data-step]', root).forEach(function (b) {
        var key = b.getAttribute('data-step');
        var dir = Number(b.getAttribute('data-d'));
        var next = state[key] + dir;
        b.disabled = next < LIMITS[key][0] || next > LIMITS[key][1];
      });
    }

    root.addEventListener('click', function (e) {
      var btn = e.target.closest('[data-step]');
      if (!btn) return;
      var key = btn.getAttribute('data-step');
      var next = state[key] + Number(btn.getAttribute('data-d'));
      if (next < LIMITS[key][0] || next > LIMITS[key][1]) return;
      state[key] = next;
      paint();
    });

    paint();
  })();

  /* =========================================================
     THE DAMAGE CHAIN
     Reveals one step at a time so it reads as a sequence
     rather than five boxes that all arrive together.
     ========================================================= */
  (function initChain() {
    var chain = $('[data-chain]');
    if (!chain) return;
    var steps = $$('[data-ch]', chain);
    if (!steps.length) return;

    if (reduced || !('IntersectionObserver' in window)) {
      steps.forEach(function (s) { s.classList.add('on'); });
      return;
    }

    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (!en.isIntersecting) return;
        steps.forEach(function (s, i) {
          setTimeout(function () { s.classList.add('on'); }, i * 140);
        });
        io.disconnect();
      });
    }, { threshold: 0.25 });
    io.observe(chain);
  })();

  /* =========================================================
     CASE STUDY FILTER
     ========================================================= */
  (function initCases() {
    var bar = $('[data-cases-filter]');
    var list = $('[data-cases]');
    if (!bar || !list) return;

    var cards = $$('.cs', list);
    var count = $('[data-cs-count]');
    var empty = $('[data-cs-empty]');

    bar.addEventListener('click', function (e) {
      var btn = e.target.closest('[data-cgo]');
      if (!btn) return;
      var want = btn.getAttribute('data-cgo');
      $$('[data-cgo]', bar).forEach(function (b) {
        b.setAttribute('aria-current', String(b === btn));
      });
      var shown = 0;
      cards.forEach(function (c) {
        var hit = want === 'all' || c.getAttribute('data-sector') === want;
        c.classList.toggle('hide', !hit);
        if (hit) shown++;
      });
      if (count) count.textContent = shown;
      if (empty) empty.classList.toggle('on', shown === 0);
    });
  })();

  /* =========================================================
     BUILDING DIAGRAM  commercial
     The list and the hotspots drive each other, so it reads
     the same whether you start from the drawing or the text.
     ========================================================= */
  (function initBuilding() {
    var root = $('[data-bld]');
    if (!root) return;

    var rows = $$('.bld-row', root);
    var pts = $$('.bld-pt', root);
    if (!rows.length || rows.length !== pts.length) return;

    var cur = 0;
    pts[0].classList.add('on');

    function show(i) {
      if (i === cur || i < 0 || i >= rows.length) return;
      rows[cur].classList.remove('on');
      pts[cur].classList.remove('on');
      cur = i;
      rows[cur].classList.add('on');
      pts[cur].classList.add('on');
    }

    rows.forEach(function (r, i) {
      r.addEventListener('mouseenter', function () { show(i); });
      r.addEventListener('focus', function () { show(i); });
      r.addEventListener('click', function () { show(i); });
    });
    pts.forEach(function (p, i) {
      p.addEventListener('mouseenter', function () { show(i); });
      p.addEventListener('click', function () {
        show(i);
        rows[i].focus();
      });
    });
  })();

  /* =========================================================
     ACCORDION
     ========================================================= */
  $$('.acc-btn').forEach(function (btn) {
    var panel = btn.nextElementSibling;
    btn.addEventListener('click', function () {
      var open = btn.getAttribute('aria-expanded') === 'true';
      var group = btn.closest('.acc');
      if (group) {
        $$('.acc-btn', group).forEach(function (b) {
          if (b !== btn) { b.setAttribute('aria-expanded', 'false'); b.nextElementSibling.style.maxHeight = null; }
        });
      }
      btn.setAttribute('aria-expanded', String(!open));
      panel.style.maxHeight = open ? null : panel.scrollHeight + 'px';
    });
  });

  /* =========================================================
     BOOKING FUNNEL
     ZIP first, then the path, then the details. The ZIP result
     decides which paths are even offered.
     ========================================================= */
  var funnel = $('[data-funnel]');
  if (funnel) initFunnel(funnel);

  function initFunnel(root) {
    var panes = $$('.pane', root);
    var bar = $('[data-steps]', root);
    var chosen = null;

    function go(n) {
      panes.forEach(function (p, i) { p.classList.toggle('on', i === n); });
      if (bar) {
        $$('div', bar).forEach(function (d, i) {
          d.classList.toggle('on', i === n);
          d.classList.toggle('done', i < n);
        });
      }
      var top = root.getBoundingClientRect().top + scrollY - 110;
      scrollTo({ top: top, behavior: reduced ? 'auto' : 'smooth' });
    }
    root.addEventListener('click', function (e) {
      var s = e.target.closest('[data-step]');
      if (s) { e.preventDefault(); go(parseInt(s.getAttribute('data-step'), 10)); }
    });

    /* The ZIP answer gates the paths: outside the coverage map, an on-site
       repair project is not something we can promise, so it is disabled
       rather than quietly failing after the form is filled in. */
    function applyZip(state) {
      // 'soon' is Florida, which is announced but not staffed. It blocks the
      // on-site paths exactly like 'out' does.
      $$('[data-needs-area]', root).forEach(function (el) {
        var blocked = state === 'out' || state === 'soon';
        el.toggleAttribute('disabled', blocked);
        el.style.opacity = blocked ? '.45' : '';
        el.style.pointerEvents = blocked ? 'none' : '';
        var note = $('[data-area-note]', el);
        if (note) {
          note.textContent = !blocked ? (note.getAttribute('data-original') || note.textContent)
            : state === 'soon' ? 'Not available in Florida yet'
            : 'Outside our service area';
        }
      });
      var warn = $('[data-area-warn]', root);
      if (warn) {
        warn.classList.toggle('hide', state !== 'out' && state !== 'soon');
        var t = $('[data-warn-text]', warn);
        if (t) {
          t.textContent = state === 'soon'
            ? 'We are opening in Florida but crews are not working there yet. A video consultation is available today.'
            : 'On-site options are switched off for that address. A video consultation still works, anywhere in the US.';
        }
        var h = $('[data-warn-head]', warn);
        if (h) h.textContent = state === 'soon' ? 'Florida is coming soon' : 'That ZIP is outside our service area';
      }
    }
    document.addEventListener('mmp:zip', function (e) {
      var st = e.detail.res.state;
      applyZip(st);
      if (st === 'bad') return;
      setTimeout(function () {
        // A requested path resumes here, once we know we can honour it.
        if (!applyWanted()) go(1);
      }, 700);
    });
    var stored = readZip();
    if (stored.state) {
      applyZip(stored.state);
      if (stored.state !== 'bad' && applyWanted()) { /* jumped to details */ }
    }

    // path choice
    $$('.pick[data-path]', root).forEach(function (p) {
      p.addEventListener('click', function () {
        $$('.pick[data-path]', root).forEach(function (o) { o.setAttribute('aria-pressed', 'false'); });
        p.setAttribute('aria-pressed', 'true');
        chosen = p.getAttribute('data-path');
        var f = $('[name=path]', root);
        if (f) f.value = chosen;
        var title = $('[data-path-title]', root);
        if (title) title.textContent = p.getAttribute('data-label') || '';
        $$('[data-only]', root).forEach(function (el) {
          el.classList.toggle('hide', el.getAttribute('data-only').split(' ').indexOf(chosen) === -1);
        });
        setTimeout(function () { go(2); }, 260);
      });
    });

    /* A path handed over in the URL, from the hero, a service page or the
       game. It must NOT jump straight to the details form: the ZIP gate is
       the whole point of this funnel, and skipping it let an out-of-area
       visitor fill in the entire form before being told no. The request is
       held until the ZIP has been answered. */
    var wanted = new URLSearchParams(location.search).get('path');

    function applyWanted() {
      if (!wanted) return false;
      var target = $('.pick[data-path="' + wanted + '"]', root);
      if (!target || target.hasAttribute('disabled')) { wanted = null; return false; }
      wanted = null;
      target.click();
      return true;
    }

    /* ---------- the questionnaire ----------
       One question per screen. Picking an answer advances automatically, so
       the only thing anybody has to type is their contact details at the end. */
    var quiz = $('[data-quiz]', root);
    if (quiz) {
      var qs = $$('[data-q]', quiz);
      var rail = $('[data-q-rail]', quiz);
      var nowEl = $('[data-q-now]', quiz);
      var totEl = $('[data-q-total]', quiz);
      var backBtn = $('[data-q-back]', quiz);
      var qi = 0;
      var answers = {};
      if (totEl) totEl.textContent = qs.length;

      function paintQ() {
        qs.forEach(function (q, i) { q.classList.toggle('on', i === qi); });
        if (rail) rail.style.width = ((qi + 1) / qs.length) * 100 + '%';
        if (nowEl) nowEl.textContent = qi + 1;
        if (backBtn) backBtn.style.visibility = qi === 0 ? 'hidden' : 'visible';
        var focus = qs[qi].querySelector('input, button');
        if (focus && qi > 0) setTimeout(function () { focus.focus({ preventScroll: true }); }, 60);
      }
      function goQ(n) { qi = clamp(n, 0, qs.length - 1); paintQ(); }

      $$('[data-q-opts]', quiz).forEach(function (group) {
        var key = group.getAttribute('data-q-opts');
        group.addEventListener('click', function (e) {
          var opt = e.target.closest('.q-opt');
          if (!opt) return;
          $$('.q-opt', group).forEach(function (o) { o.setAttribute('aria-pressed', String(o === opt)); });
          answers[key] = opt.textContent.trim();
          setTimeout(function () { goQ(qi + 1); }, 180);
        });
      });

      if (backBtn) backBtn.addEventListener('click', function () { goQ(qi - 1); });
      quiz.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' && e.target.classList.contains('q-opt')) e.preventDefault();
      });

      quiz.addEventListener('submit', function (e) {
        e.preventDefault();
        if (!quiz.reportValidity()) return;
        var data = Object.fromEntries(new FormData(quiz).entries());
        Object.keys(answers).forEach(function (k) { data[k] = answers[k]; });
        data.zip = data.zip || readZip().zip;
        data.path = chosen || 'unspecified';
        console.log('[MMP] questionnaire captured (not yet sent anywhere):', data);
        go(3);
        var echo = $('[data-echo]', root);
        if (echo) echo.textContent = (data.name || 'You') + ' \u00B7 ' + (data.zip || '');
      });

      paintQ();
    }

    // Submission is a front-end stub until the CRM endpoint is wired up.
    var form = $('form[data-lead]', root);
    if (form) {
      form.addEventListener('submit', function (e) {
        e.preventDefault();
        var data = Object.fromEntries(new FormData(form).entries());
        data.zip = data.zip || readZip().zip;
        data.path = chosen || 'unspecified';
        console.log('[MMP] lead captured (not yet sent anywhere):', data);
        go(3);
        var echo = $('[data-echo]', root);
        if (echo) {
          echo.textContent = (data.name || 'You') + ' · ' + (data.zip || '') +
            (data.email ? ' · ' + data.email : '');
        }
      });
    }
  }

  /* =========================================================
     VIDEO
     ========================================================= */
  $$('[data-video]').forEach(function (box) {
    box.addEventListener('click', function () {
      if (box.classList.contains('on')) return;
      var id = box.getAttribute('data-video');
      var f = document.createElement('iframe');
      f.src = 'https://www.youtube-nocookie.com/embed/' + id +
              '?autoplay=1&rel=0&modestbranding=1&playsinline=1';
      f.title = box.getAttribute('data-title') || 'Moisture Master Pros';
      f.allow = 'accelerated-motion; autoplay; encrypted-media; picture-in-picture';
      f.setAttribute('allowfullscreen', '');
      box.appendChild(f);
      box.classList.add('on');
    });
  });

  /* =========================================================
     REVIEWS
     Each row is duplicated once so the 50% translate loops with
     no seam. The clones are copies of visible text, so they are
     hidden from assistive tech and from crawlers.
     ========================================================= */
  $$('[data-marquee]').forEach(function (track) {
    var cards = $$('.rvx-card', track);
    if (!cards.length) return;
    cards.forEach(function (c) {
      var clone = c.cloneNode(true);
      clone.setAttribute('aria-hidden', 'true');
      track.appendChild(clone);
    });
  });

  /* =========================================================
     STANDALONE LEAD FORMS
     The funnel owns its own form. Any other data-lead form on the
     site (the contact page) is handled here, so it never falls
     through to a native submit and blanks the page.
     ========================================================= */
  $$('form[data-lead]').forEach(function (form) {
    if (form.closest('[data-funnel]')) return;
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      if (!form.reportValidity()) return;
      var data = Object.fromEntries(new FormData(form).entries());
      console.log('[MMP] lead captured (not yet sent anywhere):', data);
      var done = document.createElement('div');
      done.className = 'zip-out ok show';
      done.style.marginTop = '0';
      done.innerHTML = '<b>' + ICON_OK + 'Message sent</b>' +
        '<p>Thanks ' + (data.name ? String(data.name).split(' ')[0].replace(/[<>&]/g, '') : '') +
        ' \u2014 someone will come back to you the same working day. ' +
        'If water is moving right now, call 1-833-466-4788 rather than waiting.</p>';
      form.replaceWith(done);
      done.scrollIntoView({ block: 'center', behavior: reduced ? 'auto' : 'smooth' });
    });
  });

  /* =========================================================
     YEAR
     ========================================================= */
  $$('[data-year]').forEach(function (el) { el.textContent = new Date().getFullYear(); });
})();
