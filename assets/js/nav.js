// Everything on this site that needs a little JavaScript. Four independent
// blocks; nothing on any page depends on any of them having run.

// ---------------------------------------------------------------------------
// Mobile navigation. The nav is a plain list that CSS hides below 62rem; this
// only flips the disclosure state so assistive tech and CSS agree.
// ---------------------------------------------------------------------------
(function () {
  var toggle = document.querySelector('.nav-toggle');
  var nav = document.getElementById('site-nav');
  if (!toggle || !nav) return;

  toggle.addEventListener('click', function () {
    var open = nav.getAttribute('data-open') === 'true';
    nav.setAttribute('data-open', String(!open));
    toggle.setAttribute('aria-expanded', String(!open));
    toggle.textContent = open ? 'Menu' : 'Close';
  });

  // Collapse again when the viewport grows past the breakpoint.
  window.matchMedia('(min-width: 62rem)').addEventListener('change', function (e) {
    if (!e.matches) return;
    nav.setAttribute('data-open', 'false');
    toggle.setAttribute('aria-expanded', 'false');
    toggle.textContent = 'Menu';
  });
})();

// ---------------------------------------------------------------------------
// External links open in a new tab. The markdown render hook does this for
// prose and layouts/_partials/link-attrs.html does it for template-authored
// anchors; this is the safety net for anything added later that forgets both.
// ---------------------------------------------------------------------------
(function () {
  var here = window.location.host;
  var links = document.querySelectorAll('a[href^="http"], a[href^="//"]');
  Array.prototype.forEach.call(links, function (a) {
    if (a.host === here || a.hasAttribute('target')) return;
    a.setAttribute('target', '_blank');
    a.setAttribute('rel', a.rel ? a.rel + ' noopener' : 'noopener');
  });
})();

// ---------------------------------------------------------------------------
// Header sub-menus. CSS opens them on hover, which is the mouse path and needs
// no script. Everything else is here: the click a touch device makes, and the
// keyboard.
//
// Focus opens the panel only when focus lands INSIDE it, never on the toggle.
// :focus-within in CSS was the obvious way and it broke Escape: closing the
// panel returns focus to the toggle, the toggle sits inside the item, so the
// rule re-opened it the moment it closed.
// ---------------------------------------------------------------------------
(function () {
  var items = document.querySelectorAll('.nav-item--sub');
  if (!items.length) return;

  function panelOf(item) { return item.querySelector('.nav-sub'); }
  function toggleOf(item) { return item.querySelector('.nav-sub-toggle'); }

  function open(item) {
    var panel = panelOf(item);
    var toggle = toggleOf(item);
    if (panel) panel.setAttribute('data-open', 'true');
    if (toggle) toggle.setAttribute('aria-expanded', 'true');
  }
  function close(item) {
    var panel = panelOf(item);
    var toggle = toggleOf(item);
    if (panel) panel.removeAttribute('data-open');
    if (toggle) toggle.setAttribute('aria-expanded', 'false');
  }
  function closeAll(except) {
    Array.prototype.forEach.call(items, function (i) { if (i !== except) close(i); });
  }

  Array.prototype.forEach.call(items, function (item) {
    var toggle = toggleOf(item);
    var panel = panelOf(item);
    if (!toggle || !panel) return;

    toggle.addEventListener('click', function () {
      var isOpen = panel.getAttribute('data-open') === 'true';
      closeAll(item);
      if (isOpen) close(item); else open(item);
    });

    // Tabbing into the panel keeps it open. A link inside is only reachable
    // once the panel is displayed, so this holds it rather than opening it.
    panel.addEventListener('focusin', function () { open(item); });

    // Focus leaving the item closes it. relatedTarget is where focus went;
    // null means it left the document, which counts too.
    item.addEventListener('focusout', function (e) {
      if (e.relatedTarget && item.contains(e.relatedTarget)) return;
      close(item);
    });
  });

  document.addEventListener('keydown', function (e) {
    if (e.key !== 'Escape') return;
    var item = document.activeElement && document.activeElement.closest('.nav-item--sub');
    closeAll();
    // Focus returns to the control that opened it — safe, because focus on the
    // toggle does not re-open the panel.
    if (item) { var t = toggleOf(item); if (t) t.focus(); }
  });

  document.addEventListener('click', function (e) {
    if (!e.target.closest('.nav-item--sub')) closeAll();
  });
})();

// ---------------------------------------------------------------------------
// Header search. The field in the bar is a popover under the magnifier: the row
// never changes size, so opening it cannot wrap the last nav item onto a
// second line or cover the wordmark.
//
// The magnifier is a real submit, so with no JavaScript — or on a narrow screen
// where the bar has no field at all — the first click reaches /search/.
// ---------------------------------------------------------------------------
(function () {
  // Where the popover exists at all, matching the breakpoint in the
  // stylesheet. Asked as a media query rather than inferred from the field's
  // `display`: the closed popover is also display:none, so a check for that
  // could not tell "this bar has no field" from "the field is shut" — and
  // reading it that way silently disabled search on the desktop bar.
  var POPOVER = window.matchMedia('(min-width: 62.0625rem)');

  var forms = document.querySelectorAll('.masthead__search .site-search[data-search]');

  Array.prototype.forEach.call(forms, function (form) {
    var toggle = form.querySelector('[data-search-toggle]');
    var input = form.querySelector('input[type="search"]');
    if (!toggle || !input) return;

    function close() {
      form.removeAttribute('data-open');
      toggle.setAttribute('aria-expanded', 'false');
    }

    toggle.addEventListener('click', function (e) {
      if (!POPOVER.matches) return;                            // plain submit
      if (form.getAttribute('data-open') === 'true') return;   // let it submit
      e.preventDefault();
      form.setAttribute('data-open', 'true');
      toggle.setAttribute('aria-expanded', 'true');
      input.focus();
    });

    input.addEventListener('keydown', function (e) {
      if (e.key !== 'Escape') return;
      input.value = '';
      close();
      toggle.focus();
    });

    // Clicking away dismisses it. Whatever was typed stays in the field, so
    // reopening picks the query back up rather than losing it to a stray click.
    document.addEventListener('click', function (e) {
      if (form.getAttribute('data-open') !== 'true') return;
      if (form.contains(e.target)) return;
      close();
    });

    // Crossing the breakpoint with it open would leave an orphaned panel.
    POPOVER.addEventListener('change', close);
  });
})();
