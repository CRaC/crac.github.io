// Table of contents: mark the section the reader is currently in.
//
// Driven by scroll position rather than by IntersectionObserver alone, because
// what the reader wants highlighted is "the heading I am under", which is the
// last heading above the reading line — not whichever heading happens to be
// intersecting the viewport.
(function () {
  var toc = document.querySelector('.toc');
  if (!toc) return;

  var links = Array.prototype.slice.call(toc.querySelectorAll('a[href^="#"]'));
  if (!links.length) return;

  var targets = links
    .map(function (a) {
      var el = document.getElementById(decodeURIComponent(a.hash.slice(1)));
      return el ? { link: a, el: el } : null;
    })
    .filter(Boolean);
  if (!targets.length) return;

  var current = null;

  function update() {
    // The reading line sits a third of the way down the viewport, below the
    // sticky header.
    var line = window.scrollY + window.innerHeight / 3;
    var active = targets[0];

    for (var i = 0; i < targets.length; i++) {
      if (targets[i].el.getBoundingClientRect().top + window.scrollY <= line) {
        active = targets[i];
      } else {
        break;
      }
    }

    // At the very bottom the last section is the one being read, even if its
    // heading is above the reading line by less than a screenful.
    if (window.scrollY + window.innerHeight >= document.documentElement.scrollHeight - 4) {
      active = targets[targets.length - 1];
    }

    if (active === current) return;
    if (current) current.link.removeAttribute('aria-current');
    active.link.setAttribute('aria-current', 'true');
    current = active;
  }

  var queued = false;
  function onScroll() {
    if (queued) return;
    queued = true;
    requestAnimationFrame(function () { queued = false; update(); });
  }

  update();
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onScroll);
})();
