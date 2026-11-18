(function () {
  var revealed = false;
  function reveal() {
    if (revealed) return;
    revealed = true;
    document.body.classList.add('is-ready');
  }
  try {
    var fontsReady = (document.fonts && document.fonts.ready) ? document.fonts.ready : Promise.resolve();
    Promise.race([
      fontsReady,
      new Promise(function (resolve) { setTimeout(resolve, 1500); })
    ]).then(reveal).catch(reveal);
  } catch (err) {
    reveal();
  }
  setTimeout(reveal, 2500);
})();

(function () {
  var header = document.getElementById('top');
  var toggle = header && header.querySelector('.nav-toggle');
  if (!toggle) return;
  function setOpen(open) {
    header.classList.toggle('menu-open', open);
    toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
    toggle.textContent = open ? 'Close' : 'Menu';
  }
  toggle.addEventListener('click', function () { setOpen(!header.classList.contains('menu-open')); });
  header.querySelectorAll('.nav-links a').forEach(function (a) {
    a.addEventListener('click', function () { setOpen(false); });
  });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && header.classList.contains('menu-open')) { setOpen(false); toggle.focus(); }
  });
  document.addEventListener('pointerdown', function (e) {
    if (header.classList.contains('menu-open') && !header.contains(e.target)) setOpen(false);
  });
  window.matchMedia('(min-width: 761px)').addEventListener('change', function (e) { if (e.matches) setOpen(false); });
})();

// Smooth wheel scrolling via Lenis. Touch keeps the device's native scrolling,
// and visitors who ask for reduced motion get plain scrolling and instant jumps.
var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
var lenis = (!reduceMotion && window.Lenis) ? new Lenis({ autoRaf: true, lerp: 0.1 }) : null;

(function () {
  document.querySelectorAll('a[href^="#"]').forEach(function (link) {
    link.addEventListener('click', function (e) {
      var href = link.getAttribute('href');
      var target = href.length > 1 ? document.getElementById(href.slice(1)) : null;
      if (!target) return;
      e.preventDefault();
      // The header is sticky, so "#top" means the top of the page, not the header's position.
      var toTop = href === '#top';
      if (lenis) {
        // Lenis reads the html scroll-padding-top itself, so sections land just below the sticky header.
        lenis.scrollTo(toTop ? 0 : target, {
          duration: 1.2,
          easing: function (t) { return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; }
        });
      } else if (toTop) {
        window.scrollTo({ top: 0, behavior: reduceMotion ? 'auto' : 'smooth' });
      } else {
        target.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'start' });
      }
    });
  });
})();

(function () {
  var compare = document.getElementById('compare');
  var before = document.getElementById('compareBefore');
  var handle = document.getElementById('compareHandle');
  if (!compare || !before || !handle) return;

  function setPos(pct) {
    pct = Math.min(100, Math.max(0, pct));
    before.style.clipPath = 'inset(0 ' + (100 - pct) + '% 0 0)';
    handle.style.left = pct + '%';
    handle.setAttribute('aria-valuenow', Math.round(pct));
  }
  function posFromClientX(clientX) {
    var r = compare.getBoundingClientRect();
    return ((clientX - r.left) / r.width) * 100;
  }

  var dragging = false;
  handle.addEventListener('pointerdown', function (e) {
    dragging = true;
    try { handle.setPointerCapture(e.pointerId); } catch (err) {}
  });
  compare.addEventListener('pointerdown', function (e) {
    if (e.target === handle) return;
    setPos(posFromClientX(e.clientX));
    dragging = true;
  });
  window.addEventListener('pointermove', function (e) {
    if (!dragging) return;
    setPos(posFromClientX(e.clientX));
  });
  window.addEventListener('pointerup', function () { dragging = false; });
  window.addEventListener('pointercancel', function () { dragging = false; });

  handle.addEventListener('keydown', function (e) {
    var current = parseFloat(handle.style.left) || 50;
    if (e.key === 'ArrowLeft') { setPos(current - 4); e.preventDefault(); }
    else if (e.key === 'ArrowRight') { setPos(current + 4); e.preventDefault(); }
  });
})();

(function () {
  if (reduceMotion) return;
  // Card tilt, applied at most once per frame however fast the mouse reports.
  document.querySelectorAll('.work-card').forEach(function (card) {
    var last = null, queued = false;
    function apply() {
      queued = false;
      if (!last) { card.style.transform = ''; return; }
      var r = card.getBoundingClientRect();
      var x = (last.clientX - r.left) / r.width - 0.5;
      var y = (last.clientY - r.top) / r.height - 0.5;
      card.style.transform = 'perspective(800px) rotateX(' + (-y * 7).toFixed(2) + 'deg) rotateY(' + (x * 7).toFixed(2) + 'deg) translateY(-3px)';
    }
    function queue() { if (!queued) { queued = true; requestAnimationFrame(apply); } }
    card.addEventListener('pointermove', function (e) { if (e.pointerType !== 'mouse') return; last = { clientX: e.clientX, clientY: e.clientY }; queue(); });
    card.addEventListener('pointerleave', function () { last = null; queue(); });
  });
})();

// Scroll-linked effects share one update per frame, run in step with Lenis when it is active.
// Element positions are measured up front (and again when the layout changes), so a frame only
// does arithmetic and writes GPU-friendly transforms; it never reads layout or repaints large areas.
var scrollFx = (function () {
  var effects = [], lastY = -1, lastVh = -1, queued = false, measureQueued = false;
  function frame() {
    queued = false;
    var y = window.scrollY || window.pageYOffset, vh = window.innerHeight;
    if (y === lastY && vh === lastVh) return;
    lastY = y; lastVh = vh;
    for (var i = 0; i < effects.length; i++) effects[i].update(y, vh);
  }
  function measure() {
    measureQueued = false;
    for (var i = 0; i < effects.length; i++) if (effects[i].measure) effects[i].measure();
    lastY = -1;
    frame();
  }
  function queueMeasure() { if (!measureQueued) { measureQueued = true; requestAnimationFrame(measure); } }
  if (lenis) lenis.on('scroll', frame);
  window.addEventListener('scroll', function () { if (!queued) { queued = true; requestAnimationFrame(frame); } }, { passive: true });
  window.addEventListener('resize', queueMeasure);
  window.addEventListener('load', queueMeasure);
  // Web fonts can change line widths without changing the page height, which the ResizeObserver would miss.
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(queueMeasure);
  if ('ResizeObserver' in window) new ResizeObserver(queueMeasure).observe(document.body);
  return { add: function (fx) { effects.push(fx); if (fx.measure) fx.measure(); lastY = -1; frame(); } };
})();

function pageTop(el) { return el.getBoundingClientRect().top + (window.scrollY || window.pageYOffset); }
function clamp01(t) { return t < 0 ? 0 : t > 1 ? 1 : t; }

// Ambient light: crossfade the background glow to the mood of whichever section sits at the middle
// of the screen and drift it as that section scrolls by.
(function () {
  var amb = document.querySelector('.ambient');
  var sections = [].slice.call(document.querySelectorAll('[data-mood]'));
  if (!amb || !sections.length) return;
  var moods = sections.map(function (s) { return s.getAttribute('data-mood'); });
  var layers = [].slice.call(amb.querySelectorAll('.amb'));
  var blobs = layers.map(function (l) { return l.children; });
  var tops = [], heights = [], front = 0, current = null, lastP = -1;
  scrollFx.add({
    measure: function () {
      tops = sections.map(pageTop);
      heights = sections.map(function (s) { return s.offsetHeight; });
    },
    update: function (y, vh) {
      var mid = y + vh * 0.5, k = 0;
      for (var i = 0; i < tops.length; i++) if (tops[i] <= mid) k = i;
      if (moods[k] !== current) {
        current = moods[k];
        layers[front].classList.remove('on');
        front = 1 - front;
        layers[front].setAttribute('data-mood', current);
        layers[front].classList.add('on');
        lastP = -1;
      }
      if (reduceMotion) return;
      var p =Math.round(clamp01((mid - tops[k]) / Math.max(1, heights[k])) * 400) / 400;
      if (p === lastP) return;
      lastP = p;
      var b = blobs[front];
      b[0].style.transform = 'translate3d(0,' + (-p * 0.2 * vh).toFixed(1) + 'px,0) scale(' + (1 + p * 0.18).toFixed(4) + ')';
      b[1].style.transform = 'translate3d(0,' + (p * 0.16 * vh).toFixed(1) + 'px,0)';
    }
  });
})();

// Statement: words light up one by one as the paragraph scrolls through the viewport.
(function () {
  var block = document.querySelector('.statement');
  var p = block && block.querySelector('p');
  if (!p || reduceMotion) return;
  // Screen readers get the sentence in one piece; the word-split copy is visual only.
  var spoken = document.createElement('span');
  spoken.className = 'sr-only';
  spoken.textContent = p.textContent;
  var visual = document.createElement('span');
  visual.setAttribute('aria-hidden', 'true');
  while (p.firstChild) visual.appendChild(p.firstChild);
  var words = [];
  (function split(node) {
    [].slice.call(node.childNodes).forEach(function (n) {
      if (n.nodeType === 1) { split(n); return; }
      if (n.nodeType !== 3) return;
      var frag = document.createDocumentFragment();
      n.textContent.split(/(\s+)/).forEach(function (part) {
        if (!part) return;
        if (/^\s+$/.test(part)) { frag.appendChild(document.createTextNode(part)); return; }
        var w = document.createElement('span');
        w.className = 'w';
        w.textContent = part;
        words.push(w);
        frag.appendChild(w);
      });
      n.parentNode.replaceChild(frag, n);
    });
  })(visual);
  p.appendChild(spoken);
  p.appendChild(visual);
  block.classList.add('is-scrubbing');

  var top = 0, lit = 0;
  scrollFx.add({
    measure: function () { top = pageTop(p); },
    update: function (y, vh) {
      // Starts lighting when the paragraph's top reaches 90% down the screen, fully lit by the time it reaches 40%.
      var n = Math.round(clamp01((vh * 0.9 - (top - y)) / (vh * 0.5)) * words.length);
      if (n === lit) return;
      // Only touch the words whose state changed.
      for (var i = Math.min(n, lit); i < Math.max(n, lit); i++) words[i].classList.toggle('lit', i < n);
      lit = n;
    }
  });
})();

// Statement band: slide the violet band in from the left as the statement rises into view,
// hold it while the statement is mid-screen, then slide it out to the right as it leaves.
// The band is a solid parallelogram wider than the screen, so moving it sideways looks the same as
// wiping it in and out, but costs only a GPU transform per frame.
(function () {
  var block = document.querySelector('.statement');
  var band = block && block.querySelector('.statement-band > div');
  if (!band || reduceMotion) return;
  function ease(t) { t = clamp01(t); return t * t * (3 - 2 * t); }
  var top = 0, height = 1, vw = 0, lastX = null;
  scrollFx.add({
    measure: function () { top = pageTop(block); height = block.offsetHeight; vw = window.innerWidth; },
    update: function (y, vh) {
      var t = top - y;
      // In: from the band's top entering at 95% of the screen until it reaches 50%.
      var r = ease((vh * 0.95 - t) / (vh * 0.45));
      // Out: once its top passes 15% of the screen, over most of the band's own height.
      var l = ease((vh * 0.15 - t) / (height * 0.85));
      var x = Math.round((r - 1 + l) * 1.1 * vw);
      if (x === lastX) return;
      lastX = x;
      band.style.transform = 'translate3d(' + x + 'px,0,0)';
    }
  });
})();

// Solid shapes attached to content (the rose wall behind the work cards, the discs behind the service numbers, the
// speech bubble behind "Let's talk."): each slides in from its side of the screen as it rises into view and back out
// as it leaves, the same motion as the statement band. Shapes marked data-stay (the bubble at the end of the page) don't
// leave once they've arrived; they only slide back if you scroll up past them. Shapes marked data-bounce give their parent
// .is-landed (a short pop animation in the CSS) each time they arrive. While a shape is away its parent gets
// .shape-away, which the service numbers use to go back to their outlined style. Only transforms change while scrolling.
(function () {
  var els = [].slice.call(document.querySelectorAll('[data-slide]'));
  if (!els.length || reduceMotion) return;
  function ease(t) { t = clamp01(t); return t * t * (3 - 2 * t); }
  var items = els.map(function (el) {
    return { el: el, host: el.parentNode, dir: el.getAttribute('data-slide') === 'left' ? -1 : 1, stay: el.hasAttribute('data-stay'), bounce: el.hasAttribute('data-bounce'), landed: false, last: null, away: null };
  });
  scrollFx.add({
    measure: function () {
      var W = document.documentElement.clientWidth, sy = window.scrollY || window.pageYOffset;
      items.forEach(function (it) {
        var r = it.el.getBoundingClientRect();
        // The rect includes the shape's current sideways offset (from scrolling, or the hero highlight's slam-in
        // animation), so read that back from the computed transform and take it out.
        var tf = getComputedStyle(it.el).transform, dx = 0;
        if (tf && tf !== 'none' && window.DOMMatrixReadOnly) dx = new DOMMatrixReadOnly(tf).m41;
        it.top = r.top + sy;
        it.h = r.height;
        // Far enough to clear the edge of the screen completely.
        it.dist = (it.dir > 0 ? W - (r.left - dx) : r.right - dx) + 20;
        it.last = null;
      });
    },
    update: function (y, vh) {
      for (var i = 0; i < items.length; i++) {
        var it = items[i], t = it.top - y;
        // In: from its top entering at 95% of the screen until it reaches 55%. Out: once its top passes 15%.
        var out = it.stay ? 0 : ease((vh * 0.15 - t) / Math.max(it.h * 0.85, vh * 0.3));
        var hide = clamp01(1 - ease((vh * 0.95 - t) / (vh * 0.4)) + out);
        var x = Math.round(hide * it.dist) * it.dir;
        if (x !== it.last) { it.last = x; it.el.style.transform = 'translate3d(' + x + 'px,0,0)'; }
        var away = hide > 0.5;
        if (away !== it.away) { it.away = away; it.host.classList.toggle('shape-away', away); }
        // data-bounce: pop once each time the shape fully lands; re-arm after it has slid a good way back out.
        if (it.bounce) {
          if (hide === 0 && !it.landed) { it.landed = true; it.host.classList.add('is-landed'); }
          else if (hide > 0.3 && it.landed) { it.landed = false; it.host.classList.remove('is-landed'); }
        }
      }
    }
  });
})();

// Process: the line above the four steps fills with gold as the section scrolls through, led by a gold dot.
(function () {
  var line = document.querySelector('.process-line'), row = document.querySelector('.process-row');
  var fill = line && line.querySelector('i'), dot = line && line.querySelector('b');
  if (!fill || !dot || !row || reduceMotion) return;
  line.classList.add('is-live');
  var top = 0, span = 1, width = 0, last = -1;
  scrollFx.add({
    measure: function () { top = pageTop(line); span = Math.max(1, pageTop(row) + row.offsetHeight - top); width = line.offsetWidth; last = -1; },
    update: function (y, vh) {
      // Starts as the line reaches 80% down the screen; complete once the last step is 55% down.
      var p = Math.round(clamp01((vh * 0.8 - (top - y)) / (span + vh * 0.25)) * 1000) / 1000;
      if (p === last) return;
      last = p;
      fill.style.transform = 'scaleX(' + p + ')';
      dot.style.transform = 'translate3d(' + (p * width).toFixed(1) + 'px,0,0)';
    }
  });
})();
