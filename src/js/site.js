/* Les Chahuteuses — site public.
   Charge /api/content, remplit les zones éditables, rend l'agenda,
   gère la nav et les animations. Si le contenu est indisponible,
   le HTML statique par défaut reste affiché. */
(function () {
  'use strict';

  // ── Menu mobile (référencé par onclick dans le HTML) ──────────────────────
  window.toggleMenu = function () {
    document.getElementById('navLinks').classList.toggle('open');
  };
  window.closeMenu = function () {
    document.getElementById('navLinks').classList.remove('open');
  };

  // ── Helpers ───────────────────────────────────────────────────────────────
  function el(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  }

  function frDate(iso) {
    var d = new Date(iso + 'T12:00:00');
    if (isNaN(d.getTime())) return iso || '';
    var s = d.toLocaleDateString('fr-FR',
      { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
    return s.charAt(0).toUpperCase() + s.slice(1);
  }
  function frTime(t) { return t ? t.replace(':', 'h') : ''; }

  function setField(node, text) {
    if (node.hasAttribute('data-multiline')) {
      node.textContent = '';
      String(text).split('\n').forEach(function (line, i) {
        if (i) node.appendChild(document.createElement('br'));
        node.appendChild(document.createTextNode(line));
      });
    } else {
      node.textContent = text;
    }
  }

  // ── Données ───────────────────────────────────────────────────────────────
  var content = { events: [], formats: [], texts: {} };

  function normalize(data) {
    return {
      events: Array.isArray(data && data.events) ? data.events : [],
      formats: Array.isArray(data && data.formats) ? data.formats : [],
      texts: (data && data.texts && typeof data.texts === 'object') ? data.texts : {}
    };
  }

  function upcomingEvents() {
    var today = new Date(); today.setHours(0, 0, 0, 0);
    return content.events
      .filter(function (e) {
        var d = new Date((e && e.date) + 'T00:00:00');
        return !isNaN(d.getTime()) && d >= today;
      })
      .sort(function (a, b) { return a.date < b.date ? -1 : (a.date > b.date ? 1 : 0); });
  }

  // ── Rendu ─────────────────────────────────────────────────────────────────
  function renderTexts() {
    document.querySelectorAll('[data-field]').forEach(function (node) {
      var key = node.getAttribute('data-field');
      if (content.texts[key] != null) setField(node, content.texts[key]);
    });
  }

  function eventChips(ev) {
    var d = el('div', 'event-details');
    d.appendChild(el('span', 'event-chip', '📅 ' + frDate(ev.date)));
    if (ev.timeStart) {
      d.appendChild(el('span', 'event-chip',
        '🕖 ' + frTime(ev.timeStart) + (ev.timeEnd ? ' – ' + frTime(ev.timeEnd) : '')));
    }
    if (ev.venue) d.appendChild(el('span', 'event-chip', '📍 ' + ev.venue));
    if (ev.accessible) d.appendChild(el('span', 'event-chip', '♿ Accessible PMR'));
    return d;
  }

  function ticketButton(ev) {
    if (!ev.ticketUrl) return null;
    var a = el('a', 'btn btn-event', '🎟️ Billetterie HelloAsso');
    a.href = ev.ticketUrl; a.target = '_blank'; a.rel = 'noopener';
    return a;
  }

  function eventImage(ev, cls) {
    if (!ev.image) return null;
    var img = document.createElement('img');
    img.className = cls;
    img.src = ev.image;
    img.alt = ev.title || 'Affiche de l\'événement';
    img.loading = 'lazy';
    return img;
  }

  // Premier événement — bloc mis en avant
  function featuredEvent(ev) {
    var inner = el('div', 'event-inner reveal');
    var col = document.createElement('div');
    col.appendChild(el('p', 'event-label', 'À venir'));
    col.appendChild(el('h2', 'event-title', ev.title));
    col.appendChild(eventChips(ev));
    if (ev.description) col.appendChild(el('p', 'event-desc', ev.description));
    var btn = ticketButton(ev);
    if (btn) col.appendChild(btn);
    inner.appendChild(col);
    inner.appendChild(eventImage(ev, 'event-photo') || el('div', 'event-visual', '🎭'));
    return inner;
  }

  // Événements suivants — cartes complètes (toutes les infos affichées)
  function secondaryEvent(ev) {
    var card = el('div', 'event-card');
    var img = eventImage(ev, 'event-card-img');
    if (img) card.appendChild(img);
    card.appendChild(el('h3', 'event-title', ev.title));
    card.appendChild(eventChips(ev));
    if (ev.description) card.appendChild(el('p', 'event-desc', ev.description));
    var btn = ticketButton(ev);
    if (btn) card.appendChild(btn);
    return card;
  }

  function renderAgenda() {
    var root = document.getElementById('agenda-root');
    if (!root) return;
    root.textContent = '';
    var events = upcomingEvents();

    if (!events.length) {
      root.appendChild(el('div', 'event-empty reveal',
        'Pas de date programmée pour le moment — revenez bientôt, ou suivez-nous sur les réseaux !'));
      return;
    }

    root.appendChild(featuredEvent(events[0]));

    if (events.length > 1) {
      var more = el('div', 'event-more reveal');
      more.appendChild(el('p', 'event-more-title', 'Les prochaines dates'));
      events.slice(1).forEach(function (ev) { more.appendChild(secondaryEvent(ev)); });
      root.appendChild(more);
    }
  }

  // ── Formats ───────────────────────────────────────────────────────────────
  function formatCard(fmt) {
    var card = el('div', 'format-card cabaret reveal');
    if (fmt.emoji) card.appendChild(el('span', 'format-emoji', fmt.emoji));
    if (fmt.badge) card.appendChild(el('span', 'format-badge badge-gold', fmt.badge));
    card.appendChild(el('h3', 'format-title', fmt.title));
    String(fmt.description || '').split('\n').forEach(function (par) {
      par = par.trim();
      if (par) card.appendChild(el('p', 'format-desc', par));
    });
    if (fmt.linkUrl && fmt.linkText) {
      var a = el('a', 'format-link gold', fmt.linkText);
      a.href = fmt.linkUrl;
      if (/^https?:/i.test(fmt.linkUrl)) { a.target = '_blank'; a.rel = 'noopener'; }
      card.appendChild(a);
    }
    return card;
  }

  function renderFormats() {
    var root = document.getElementById('formats-root');
    if (!root) return;
    root.textContent = '';
    content.formats.forEach(function (fmt) { root.appendChild(formatCard(fmt)); });
  }

  function render() {
    renderTexts();
    renderAgenda();
    renderFormats();
  }

  // ── Animations « reveal » ─────────────────────────────────────────────────
  var revealObs = new IntersectionObserver(function (entries) {
    entries.forEach(function (e, i) {
      if (e.isIntersecting) {
        setTimeout(function () { e.target.classList.add('visible'); }, i * 90);
        revealObs.unobserve(e.target);
      }
    });
  }, { threshold: 0.08 });

  function observeReveals() {
    document.querySelectorAll('.reveal:not(.visible)').forEach(function (n) {
      revealObs.observe(n);
    });
  }
  function revealNow() {
    document.querySelectorAll('.reveal').forEach(function (n) { n.classList.add('visible'); });
  }

  // ── Navigation ────────────────────────────────────────────────────────────
  function setupNav() {
    var navbar = document.getElementById('navbar');
    var navLinks = document.querySelectorAll('.nav-links a[href^="#"]');
    window.addEventListener('scroll', function () {
      navbar.classList.toggle('scrolled', window.scrollY > 50);
      var current = '';
      document.querySelectorAll('section[id]').forEach(function (s) {
        if (window.scrollY >= s.offsetTop - 120) current = s.id;
      });
      navLinks.forEach(function (a) {
        a.classList.toggle('active', a.getAttribute('href') === '#' + current);
      });
    });
  }

  // ── Vidéos récentes ───────────────────────────────────────────────────────
  function filterRecentVideos() {
    var cards = document.querySelectorAll('.video-card[data-published]');
    if (!cards.length) return;

    var cutoff = new Date();
    cutoff.setFullYear(cutoff.getFullYear() - 1);
    cutoff.setHours(0, 0, 0, 0);

    var visible = 0;
    cards.forEach(function (card) {
      var published = new Date(card.getAttribute('data-published') + 'T00:00:00');
      var keep = !isNaN(published.getTime()) && published >= cutoff;
      card.hidden = !keep;
      card.classList.toggle('featured', keep && visible === 0);
      if (keep) visible++;
    });

    var empty = document.getElementById('videos-empty');
    if (empty) empty.classList.toggle('visible', visible === 0);
  }

  // ── Carrousel Instagram ───────────────────────────────────────────────────
  function formatInstagramDate(iso) {
    var d = new Date(iso);
    if (isNaN(d.getTime())) return 'Instagram';
    return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
  }

  function instagramCard(post) {
    var a = el('a', 'insta-card');
    a.href = post.permalink || 'https://www.instagram.com/histoiresdeq/';
    a.target = '_blank';
    a.rel = 'noopener';

    var img = document.createElement('img');
    img.src = post.image || '';
    img.alt = post.title || 'Publication Instagram Histoires de Q';
    img.loading = 'lazy';
    a.appendChild(img);

    var body = el('span', 'insta-body');
    body.appendChild(el('span', 'insta-tag', formatInstagramDate(post.timestamp)));
    body.appendChild(el('strong', null, post.title || 'Publication Instagram'));
    body.appendChild(el('span', null, post.description || 'Voir la publication sur Instagram.'));
    a.appendChild(body);
    return a;
  }

  function loadInstagramFeed() {
    var track = document.getElementById('insta-track');
    if (!track) return Promise.resolve();

    return fetch('/api/instagram?_=' + Date.now(), { cache: 'no-store' })
      .then(function (r) { if (!r.ok) throw new Error('instagram'); return r.json(); })
      .then(function (data) {
        var posts = Array.isArray(data && data.posts) ? data.posts : [];
        if (!posts.length) return;
        track.textContent = '';
        posts.forEach(function (post) { track.appendChild(instagramCard(post)); });
      })
      .catch(function () { /* on garde la carte statique de secours */ });
  }

  function setupInstagramCarousel() {
    var track = document.getElementById('insta-track');
    if (!track) return;

    function step(dir) {
      var card = track.querySelector('.insta-card');
      var amount = card ? card.getBoundingClientRect().width + 16 : track.clientWidth * 0.8;
      track.scrollBy({ left: dir * amount, behavior: 'smooth' });
    }

    var prev = document.querySelector('[data-insta-prev]');
    var next = document.querySelector('[data-insta-next]');
    var actions = document.querySelector('.insta-actions');
    if (actions && track.scrollWidth <= track.clientWidth + 1) actions.style.display = 'none';
    if (prev) prev.addEventListener('click', function () { step(-1); });
    if (next) next.addEventListener('click', function () { step(1); });
  }

  // ── Mode édition (chargé seulement pour une éditrice connectée) ────────────
  function maybeLoadEditor() {
    if (/(?:^|;\s*)co_editor=1(?:;|$)/.test(document.cookie)) {
      var s = document.createElement('script');
      s.src = 'js/edit.js?v=3';
      s.defer = true;
      document.body.appendChild(s);
    }
  }

  // Exposé pour edit.js
  window.CHAHUT = {
    get content() { return content; },
    set content(v) { content = normalize(v); },
    render: render,
    observeReveals: observeReveals,
    revealNow: revealNow,
    frDate: frDate,
    frTime: frTime,
    upcomingEvents: upcomingEvents
  };

  // ── Démarrage ─────────────────────────────────────────────────────────────
  fetch('/api/content', { cache: 'no-store' })
    .then(function (r) { if (!r.ok) throw new Error('content'); return r.json(); })
    .then(function (data) { content = normalize(data); render(); })
    .catch(function () { /* indisponible → on garde le HTML statique par défaut */ })
    .then(function () {
      setupNav();
      filterRecentVideos();
      return loadInstagramFeed();
    })
    .then(function () {
      setupInstagramCarousel();
      observeReveals();
      maybeLoadEditor();
    });
})();
