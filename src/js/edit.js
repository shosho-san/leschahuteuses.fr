/* Les Chahuteuses — mode édition en ligne.
   Chargé uniquement pour une éditrice connectée (cookie co_editor).
   Permet de modifier textes et agenda directement sur la page. */
(function () {
  'use strict';

  var C = window.CHAHUT;
  if (!C) return;

  var dirty = false;
  var statusEl, saveBtn, dirtyEl;

  // ── Helpers ────────────────────────────────────────────────────────────────
  function el(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  }
  function pad(n) { return (n < 10 ? '0' : '') + n; }
  function todayISO() {
    var d = new Date();
    return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
  }
  function isPast(iso) {
    var d = new Date(iso + 'T00:00:00'), t = new Date(); t.setHours(0, 0, 0, 0);
    return !isNaN(d.getTime()) && d < t;
  }
  function markDirty() { dirty = true; updateDirty(); }
  function updateDirty() {
    if (dirtyEl) dirtyEl.style.display = dirty ? '' : 'none';
    if (saveBtn) saveBtn.classList.toggle('co-btn-pulse', dirty);
  }
  function setStatus(msg) { if (statusEl) statusEl.textContent = msg || ''; }

  // ── CSS du mode édition ────────────────────────────────────────────────────
  function injectCSS() {
    var css = `
.co-edit-mode { padding-bottom: 90px; }
.co-edit-mode [data-field] { cursor: text; border-radius: 4px; transition: outline .15s, background .15s; }
.co-edit-mode [data-field]:hover { outline: 2px dashed rgba(245,166,35,.9); outline-offset: 3px; }
.co-edit-mode [data-field]:focus { outline: 2px solid #f5a623; outline-offset: 3px; background: rgba(245,166,35,.1); }

.co-bar { position: fixed; left: 50%; bottom: 18px; transform: translateX(-50%); z-index: 9999;
  display: flex; align-items: center; gap: .9rem; background: #1a0a2e; color: #fff;
  padding: .6rem .9rem .6rem 1.1rem; border-radius: 40px; font-family: system-ui, sans-serif;
  box-shadow: 0 10px 40px rgba(0,0,0,.45); max-width: 94vw; flex-wrap: wrap; justify-content: center; }
.co-bar-title { font-weight: 700; font-size: .85rem; white-space: nowrap; }
.co-bar-status { font-size: .8rem; color: #b9a8d0; min-width: 0; }
.co-bar-dirty { font-size: .78rem; color: #f5a623; }
.co-btn { border: 0; border-radius: 24px; padding: .55rem 1.1rem; font-size: .85rem;
  font-weight: 700; cursor: pointer; font-family: inherit; }
.co-btn-save { background: #f4641b; color: #fff; }
.co-btn-save:hover { background: #ff8c42; }
.co-btn-quit { background: rgba(255,255,255,.12); color: #fff; }
.co-btn-quit:hover { background: rgba(255,255,255,.22); }
.co-btn-pulse { animation: coPulse 1.4s infinite; }
@keyframes coPulse { 0%,100% { box-shadow: 0 0 0 0 rgba(244,100,27,.55); } 50% { box-shadow: 0 0 0 7px rgba(244,100,27,0); } }

.co-agenda-edit { max-width: 760px; margin: 0 auto; display: flex; flex-direction: column; gap: 1.2rem; }
.co-event-card { background: #fff; border-radius: 16px; padding: 1.4rem 1.5rem; text-align: left;
  box-shadow: 0 6px 24px rgba(0,0,0,.18); }
.co-event-head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 1rem; }
.co-event-num { font-weight: 700; font-size: .82rem; letter-spacing: 1px; text-transform: uppercase; color: #7a6050; }
.co-row { margin-bottom: .85rem; }
.co-row-2 { display: flex; gap: .85rem; margin-bottom: .85rem; }
.co-row-2 > div { flex: 1; }
.co-label { display: block; font-size: .75rem; font-weight: 600; color: #2d1b00; margin-bottom: .3rem; }
.co-input { width: 100%; padding: .6rem .7rem; border: 1px solid #e0d5cc; border-radius: 9px;
  font-size: .95rem; font-family: inherit; color: #2d1b00; }
.co-input:focus { outline: 2px solid #f5a623; border-color: #f5a623; }
.co-textarea { resize: vertical; min-height: 70px; }
.co-check { display: flex; align-items: center; gap: .5rem; font-size: .9rem; color: #2d1b00;
  margin-bottom: .85rem; cursor: pointer; }
.co-check input { width: 18px; height: 18px; accent-color: #f4641b; }
.co-btn-del { background: #fdecea; color: #b3261e; padding: .4rem .9rem; }
.co-btn-del:hover { background: #f9d6d2; }
.co-btn-add { align-self: center; background: #1a0a2e; color: #fff; padding: .7rem 1.6rem; }
.co-btn-add:hover { background: #2d1060; }
.co-past { color: #b3261e; font-weight: 600; }
.co-img-box { display: flex; align-items: center; gap: .8rem; flex-wrap: wrap; }
.co-img-thumb { width: 92px; height: 92px; object-fit: cover; border-radius: 10px; border: 1px solid #e0d5cc; }
.co-btn-file { background: #1a0a2e; color: #fff; cursor: pointer; display: inline-block; }
.co-btn-file:hover { background: #2d1060; }
.co-img-hint { font-size: .75rem; color: #7a6050; margin-top: .35rem; }
`;
    var s = document.createElement('style');
    s.id = 'co-edit-css';
    s.textContent = css;
    document.head.appendChild(s);
  }

  // ── Barre d'outils ─────────────────────────────────────────────────────────
  function buildToolbar() {
    var bar = el('div', 'co-bar');
    bar.appendChild(el('span', 'co-bar-title', '✎ Mode édition'));
    dirtyEl = el('span', 'co-bar-dirty', '● modifs non enregistrées');
    dirtyEl.style.display = 'none';
    bar.appendChild(dirtyEl);
    statusEl = el('span', 'co-bar-status', '');
    bar.appendChild(statusEl);

    saveBtn = el('button', 'co-btn co-btn-save', 'Enregistrer');
    saveBtn.type = 'button';
    saveBtn.onclick = save;
    bar.appendChild(saveBtn);

    var quit = el('button', 'co-btn co-btn-quit', 'Quitter');
    quit.type = 'button';
    quit.onclick = doQuit;
    bar.appendChild(quit);

    document.body.appendChild(bar);
  }

  // ── Textes éditables en ligne ──────────────────────────────────────────────
  function enhanceTexts() {
    document.querySelectorAll('[data-field]').forEach(function (node) {
      var key = node.getAttribute('data-field');
      var multi = node.hasAttribute('data-multiline');
      try { node.contentEditable = 'plaintext-only'; }
      catch (e) { node.contentEditable = 'true'; }
      node.spellcheck = false;
      node.addEventListener('input', function () {
        // textContent pour les champs simples : insensible à text-transform CSS
        // (les libellés en majuscules ne sont pas enregistrés en majuscules).
        var val = multi ? node.innerText : node.textContent;
        if (!multi) val = val.replace(/\s*\n\s*/g, ' ');
        C.content.texts[key] = val;
        markDirty();
      });
      node.addEventListener('paste', function (e) {
        e.preventDefault();
        var t = (e.clipboardData || window.clipboardData).getData('text/plain');
        document.execCommand('insertText', false, multi ? t : t.replace(/\s*\n\s*/g, ' '));
      });
    });
  }

  // ── Agenda éditable ────────────────────────────────────────────────────────
  function blankEvent() {
    return {
      id: 'evt-' + Math.random().toString(36).slice(2, 10),
      title: 'Nouvel événement', date: todayISO(),
      timeStart: '19:00', timeEnd: '', venue: '',
      accessible: true, ticketUrl: '', image: '', description: ''
    };
  }

  function row(labelText, input) {
    var d = el('div', 'co-row');
    d.appendChild(el('label', 'co-label', labelText));
    d.appendChild(input);
    return d;
  }
  function cell(labelText, input) {
    var d = document.createElement('div');
    d.appendChild(el('label', 'co-label', labelText));
    d.appendChild(input);
    return d;
  }
  function input(type, value, onchange) {
    var i = document.createElement('input');
    i.type = type; i.value = value || ''; i.className = 'co-input';
    i.addEventListener('input', function () { onchange(i.value); markDirty(); });
    return i;
  }

  // ── Upload d'image ─────────────────────────────────────────────────────────
  function uploadImage(file, ev) {
    if (!/^image\//.test(file.type)) { setStatus('⚠ Choisis un fichier image'); return; }
    if (file.size > 4 * 1024 * 1024) { setStatus('⚠ Image trop lourde (4 Mo max)'); return; }
    setStatus('Envoi de l\'image…');
    var reader = new FileReader();
    reader.onload = function () {
      fetch('/api/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ data: reader.result })
      }).then(function (r) {
        return r.json().catch(function () { return {}; })
          .then(function (b) { return { ok: r.ok, status: r.status, body: b }; });
      }).then(function (res) {
        if (res.ok && res.body.path) {
          ev.image = res.body.path;
          markDirty();
          renderAgendaEdit();
          setStatus('✓ Image ajoutée — pense à enregistrer');
        } else if (res.status === 401) {
          setStatus('Session expirée');
          if (confirm('Ta session a expiré. Se reconnecter ?')) location.href = '/admin';
        } else {
          setStatus('⚠ ' + (res.body.error || 'Échec de l\'envoi de l\'image'));
        }
      }).catch(function () { setStatus('⚠ Erreur réseau'); });
    };
    reader.readAsDataURL(file);
  }

  function imageRow(ev) {
    var wrap = el('div', 'co-row');
    wrap.appendChild(el('label', 'co-label', 'Affiche / image de l\'événement'));
    var box = el('div', 'co-img-box');

    if (ev.image) {
      var thumb = document.createElement('img');
      thumb.className = 'co-img-thumb';
      thumb.src = ev.image;
      thumb.alt = '';
      box.appendChild(thumb);
    }

    var fileBtn = el('label', 'co-btn co-btn-file', ev.image ? 'Remplacer' : '📷 Choisir une image');
    var file = document.createElement('input');
    file.type = 'file';
    file.accept = 'image/png,image/jpeg,image/webp,image/gif';
    file.style.display = 'none';
    file.addEventListener('change', function () {
      if (file.files && file.files[0]) uploadImage(file.files[0], ev);
    });
    fileBtn.appendChild(file);
    box.appendChild(fileBtn);

    if (ev.image) {
      var rm = el('button', 'co-btn co-btn-del', 'Retirer');
      rm.type = 'button';
      rm.onclick = function () { ev.image = ''; markDirty(); renderAgendaEdit(); };
      box.appendChild(rm);
    }

    wrap.appendChild(box);
    wrap.appendChild(el('div', 'co-img-hint', 'JPG, PNG, WebP ou GIF — 4 Mo maximum.'));
    return wrap;
  }

  function eventCard(ev, idx) {
    var card = el('div', 'co-event-card');
    var head = el('div', 'co-event-head');
    var label = 'Événement ' + (idx + 1);
    var num = el('span', 'co-event-num', label);
    if (isPast(ev.date)) {
      num.appendChild(el('span', 'co-past', '  · date passée'));
    }
    head.appendChild(num);
    var del = el('button', 'co-btn co-btn-del', 'Supprimer');
    del.type = 'button';
    del.onclick = function () {
      if (confirm('Supprimer « ' + (ev.title || 'cet événement') + ' » ?')) {
        C.content.events.splice(idx, 1);
        markDirty();
        renderAgendaEdit();
      }
    };
    head.appendChild(del);
    card.appendChild(head);

    card.appendChild(row('Titre', input('text', ev.title, function (v) { ev.title = v; })));
    card.appendChild(row('Date', input('date', ev.date, function (v) { ev.date = v; })));

    var times = el('div', 'co-row-2');
    times.appendChild(cell('Heure de début', input('time', ev.timeStart, function (v) { ev.timeStart = v; })));
    times.appendChild(cell('Heure de fin', input('time', ev.timeEnd, function (v) { ev.timeEnd = v; })));
    card.appendChild(times);

    card.appendChild(row('Lieu', input('text', ev.venue, function (v) { ev.venue = v; })));

    var checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.checked = !!ev.accessible;
    checkbox.addEventListener('change', function () { ev.accessible = checkbox.checked; markDirty(); });
    var check = el('label', 'co-check');
    check.appendChild(checkbox);
    check.appendChild(document.createTextNode('Accessible PMR'));
    card.appendChild(check);

    card.appendChild(row('Lien billetterie (https://…)',
      input('url', ev.ticketUrl, function (v) { ev.ticketUrl = v; })));

    var ta = document.createElement('textarea');
    ta.className = 'co-input co-textarea';
    ta.rows = 3;
    ta.value = ev.description || '';
    ta.addEventListener('input', function () { ev.description = ta.value; markDirty(); });
    card.appendChild(row('Description', ta));
    card.appendChild(imageRow(ev));

    return card;
  }

  function renderAgendaEdit() {
    var root = document.getElementById('agenda-root');
    if (!root) return;
    root.textContent = '';
    var wrap = el('div', 'co-agenda-edit');
    C.content.events.forEach(function (ev, idx) { wrap.appendChild(eventCard(ev, idx)); });
    var add = el('button', 'co-btn co-btn-add', '+ Ajouter un événement');
    add.type = 'button';
    add.onclick = function () {
      C.content.events.push(blankEvent());
      markDirty();
      renderAgendaEdit();
    };
    wrap.appendChild(add);
    root.appendChild(wrap);
  }

  // ── Formats éditables ──────────────────────────────────────────────────────
  function blankFormat() {
    return {
      id: 'fmt-' + Math.random().toString(36).slice(2, 10),
      emoji: '🎉', badge: '', title: 'Nouveau format',
      description: '', linkText: 'En savoir plus →', linkUrl: ''
    };
  }

  function formatEditorCard(fmt, idx) {
    var card = el('div', 'co-event-card');
    var head = el('div', 'co-event-head');
    head.appendChild(el('span', 'co-event-num', 'Format ' + (idx + 1)));
    var del = el('button', 'co-btn co-btn-del', 'Supprimer');
    del.type = 'button';
    del.onclick = function () {
      if (confirm('Supprimer « ' + (fmt.title || 'ce format') + ' » ?')) {
        C.content.formats.splice(idx, 1);
        markDirty();
        renderFormatsEdit();
      }
    };
    head.appendChild(del);
    card.appendChild(head);

    var top = el('div', 'co-row-2');
    top.appendChild(cell('Emoji', input('text', fmt.emoji, function (v) { fmt.emoji = v; })));
    top.appendChild(cell('Badge', input('text', fmt.badge, function (v) { fmt.badge = v; })));
    card.appendChild(top);

    card.appendChild(row('Titre', input('text', fmt.title, function (v) { fmt.title = v; })));

    var ta = document.createElement('textarea');
    ta.className = 'co-input co-textarea';
    ta.rows = 5;
    ta.value = fmt.description || '';
    ta.addEventListener('input', function () { fmt.description = ta.value; markDirty(); });
    card.appendChild(row('Description (un paragraphe par ligne)', ta));

    var lk = el('div', 'co-row-2');
    lk.appendChild(cell('Texte du lien', input('text', fmt.linkText, function (v) { fmt.linkText = v; })));
    lk.appendChild(cell('Lien (https://… ou #section)', input('text', fmt.linkUrl, function (v) { fmt.linkUrl = v; })));
    card.appendChild(lk);

    return card;
  }

  function renderFormatsEdit() {
    var root = document.getElementById('formats-root');
    if (!root) return;
    root.textContent = '';
    var wrap = el('div', 'co-agenda-edit');
    C.content.formats.forEach(function (fmt, idx) { wrap.appendChild(formatEditorCard(fmt, idx)); });
    var add = el('button', 'co-btn co-btn-add', '+ Ajouter un format');
    add.type = 'button';
    add.onclick = function () {
      C.content.formats.push(blankFormat());
      markDirty();
      renderFormatsEdit();
    };
    wrap.appendChild(add);
    root.appendChild(wrap);
  }

  // ── Enregistrement ─────────────────────────────────────────────────────────
  function save() {
    setStatus('Enregistrement…');
    fetch('/api/content', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ events: C.content.events, formats: C.content.formats, texts: C.content.texts })
    }).then(function (r) {
      return r.json().catch(function () { return {}; })
        .then(function (body) { return { ok: r.ok, status: r.status, body: body }; });
    }).then(function (res) {
      if (res.ok) {
        dirty = false; updateDirty();
        setStatus('✓ Enregistré et publié en ligne');
      } else if (res.status === 401) {
        setStatus('Session expirée');
        if (confirm('Ta session a expiré. Se reconnecter ?')) location.href = '/admin';
      } else {
        setStatus('⚠ ' + (res.body && res.body.error ? res.body.error : 'Échec de l\'enregistrement'));
      }
    }).catch(function () { setStatus('⚠ Erreur réseau'); });
  }

  function doQuit() {
    if (dirty && !confirm('Des modifications ne sont pas enregistrées. Quitter quand même ?')) return;
    fetch('/admin/logout', { method: 'POST' })
      .then(function () { location.href = '/'; })
      .catch(function () { location.href = '/'; });
  }

  // ── Démarrage ──────────────────────────────────────────────────────────────
  fetch('/api/session', { cache: 'no-store' })
    .then(function (r) { return r.json(); })
    .then(function (s) {
      if (!s.authenticated) { location.href = '/admin'; return null; }
      return fetch('/api/content', { cache: 'no-store' }).then(function (r) { return r.json(); });
    })
    .then(function (data) {
      if (!data) return;
      C.content = data;        // le setter normalise
      C.render();              // rend les textes + agenda
      injectCSS();
      buildToolbar();
      enhanceTexts();
      renderAgendaEdit();      // remplace l'agenda par les formulaires
      renderFormatsEdit();     // remplace les formats par les formulaires
      C.revealNow();           // tout visible, pas d'animation en édition
      document.body.classList.add('co-edit-mode');
      setStatus('Clique sur un texte ou un champ pour le modifier.');
    })
    .catch(function () { /* silencieux */ });

  window.addEventListener('beforeunload', function (e) {
    if (dirty) { e.preventDefault(); e.returnValue = ''; }
  });
  window.addEventListener('keydown', function (e) {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') { e.preventDefault(); save(); }
  });
})();
