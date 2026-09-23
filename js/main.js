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

document.querySelectorAll('a[href^="#"]').forEach(function (link) {
  link.addEventListener('click', function (e) {
    var target = document.querySelector(link.getAttribute('href'));
    if (target) {
      e.preventDefault();
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  });
});

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

  handle.addEventListener('keydown', function (e) {
    var current = parseFloat(handle.style.left) || 50;
    if (e.key === 'ArrowLeft') { setPos(current - 4); e.preventDefault(); }
    else if (e.key === 'ArrowRight') { setPos(current + 4); e.preventDefault(); }
  });
})();

(function () {
  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduceMotion) return;
  document.querySelectorAll('.work-card').forEach(function (card) {
    card.addEventListener('pointermove', function (e) {
      var r = card.getBoundingClientRect();
      var x = (e.clientX - r.left) / r.width - 0.5;
      var y = (e.clientY - r.top) / r.height - 0.5;
      card.style.transform = 'perspective(800px) rotateX(' + (-y * 7).toFixed(2) + 'deg) rotateY(' + (x * 7).toFixed(2) + 'deg) translateY(-3px)';
    });
    card.addEventListener('pointerleave', function () { card.style.transform = ''; });
  });
})();
