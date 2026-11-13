/* Lógica de la página. Habla con el backend (demo o Firebase) a través de la misma interfaz. */
(function () {
  'use strict';
  var C = window.PB_CONFIG;
  var B = (C.mode === 'firebase' && window.PBFirebase) ? window.PBFirebase : window.PBDemo;
  var DAY = 86400000;
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var VIEWS = ['inicio', 'anunciar', 'entrar', 'cuenta', 'pago', 'admin'];
  var STATUS = { revision: 'En revisión', por_pagar: 'Aceptada: falta pagar', pago_reportado: 'Pago avisado', aprobado: 'Publicado', rechazado: 'No aceptada' };
  var OPEN = ['revision', 'por_pagar', 'pago_reportado'];
  var TIER_ORDER = ['premium', 'banner', 'destacado', 'mediano', 'pequeno'];

  var state = {
    status: 'loading', authReady: false, user: null,
    ads: [], myAds: [], orders: [], notices: [], unsubNotices: null, config: null,
    filters: { q: '', loc: '', barrio: '', cat: '', tipo: '' },
    sel: { tier: 'destacado', days: 30, pieces: 1, design: false, pal: 0, promo: false }, fileDims: null,
    file: null, fileURL: null, editFile: null,
    authMode: 'in', afterLogin: '#cuenta',
    payOrder: null, demoOrder: null, fichaId: null,
    adFilter: 'todos', orderFilter: 'todos', cfgFilled: false,
    unsubOrders: null, unsubOwn: null, busy: false, bIdx: 0, bTimer: null, rank: {}, view: 'inicio', pIdx: 0, pTimer: null
  };

  function $(id) { return document.getElementById(id); }
  function el(tag, cls, text) { var n = document.createElement(tag); if (cls) n.className = cls; if (text !== undefined) n.textContent = text; return n; }
  function clip(s, n) { return String(s == null ? '' : s).slice(0, n); }
  var moneyFmt = new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 });
  function money(n) { return moneyFmt.format(n || 0); }
  function fmtDate(ms) { return new Date(ms).toLocaleDateString('es-CO', { day: 'numeric', month: 'short', year: 'numeric' }); }
  function fmtDateTime(ms) { return new Date(ms).toLocaleString('es-CO', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }); }
  function setMsg(node, text, kind) { node.textContent = text || ''; node.className = 'msg' + (kind ? ' ' + kind : ''); }
  function norm(s) { return String(s == null ? '' : s).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, ''); }
  function cfg() { return C.resolve(state.config); }
  function palOf(i) { i = parseInt(i, 10); return C.palettes[i >= 0 && i < C.palettes.length ? i : 0]; }
  function isAdmin() { return !!(state.user && state.user.admin); }
  function safeMedia(m) { return !!(m && m.url && /^(https:|blob:|data:image\/)/.test(m.url) && (m.type === 'image' || m.type === 'video')); }
  function tierLabel(t) { return C.tiers[t] ? C.tiers[t].label : 'Sin espacio'; }
  function daysLeft(ad) { return Math.ceil((Number(ad.endsAt) - Date.now()) / DAY); }
  function visible(ad) { return !!ad && ad.active === true && Number(ad.endsAt) > Date.now(); }
  function findAd(id) {
    var a = state.ads.filter(function (x) { return x.id === id; })[0];
    return a || state.myAds.filter(function (x) { return x.id === id; })[0] || null;
  }

  // ---------- Datos de contacto ----------
  function normPhone(s) {
    var d = String(s || '').replace(/\D/g, '');
    if (!d) return '';
    if (d.length === 10) d = '57' + d;
    return d.length >= 7 && d.length <= 15 ? d : null;
  }
  function normMail(s) {
    s = String(s || '').trim().toLowerCase();
    if (!s) return '';
    return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(s) && s.length <= 100 ? s : null;
  }
  function normWeb(s) {
    s = String(s || '').trim();
    if (!s) return '';
    if (!/^https?:\/\//i.test(s)) s = 'https://' + s;
    try {
      var u = new URL(s);
      if ((u.protocol !== 'https:' && u.protocol !== 'http:') || u.hostname.indexOf('.') < 0) return null;
      return u.href.length <= 200 ? u.href : null;
    } catch (e) { return null; }
  }
  function errText(e) {
    var c = (e && e.code) || '';
    if (c === 'auth/invalid-credential' || c === 'auth/wrong-password' || c === 'auth/user-not-found') return 'Correo o contraseña incorrectos.';
    if (c === 'auth/email-already-in-use') return 'Ese correo ya tiene una cuenta. Entra con tu contraseña.';
    if (c === 'auth/weak-password') return 'La contraseña debe tener al menos 6 caracteres.';
    if (c === 'auth/invalid-email') return 'Ese correo no es válido.';
    if (c === 'auth/too-many-requests') return 'Demasiados intentos. Espera unos minutos.';
    if (c === 'auth/network-request-failed') return 'No hay conexión. Revisa tu internet.';
    if (c === 'permission-denied' || c === 'functions/permission-denied') return 'Tu cuenta no tiene permiso para esto.';
    if (e && e.message && /^(Ese|Inicia|Solo|No |El navegador|Tu |Completa|Elige|Ya |La |Cuéntanos|Escribe)/.test(e.message)) return e.message;
    return 'No se pudo completar. Inténtalo de nuevo.';
  }

  // ---------- Anuncios ----------
  function mediaNode(m, full) {
    var box = el('div', 'pmedia');
    if (m.type === 'video') {
      var v = document.createElement('video');
      v.src = m.url; v.playsInline = true; v.preload = 'metadata';
      if (full) { v.controls = true; } else { v.muted = true; v.loop = true; v.autoplay = !reduce; }
      box.appendChild(v);
    } else {
      var im = document.createElement('img');
      im.src = m.url; im.alt = '';
      box.appendChild(im);
    }
    return box;
  }
  function locLine(ad) {
    var parts = [];
    if (ad.categoria) parts.push(ad.categoria);
    if (ad.localidad) parts.push(ad.localidad + (ad.barrio ? ', ' + ad.barrio : ''));
    return parts.join(' · ');
  }
  function poster(ad, o) {
    o = o || {};
    var tier = ad.tier || 'destacado';
    var pal = palOf(ad.pal);
    var withMedia = safeMedia(ad.media);
    var imgOnly = withMedia && !ad.headline;
    var p = el(o.click ? 'button' : 'article', 'poster s-' + tier + (o.ph ? ' ph' : '') + (withMedia ? ' hasmedia' : '') + (imgOnly ? ' imgonly' : '') + (o.click ? ' click' : ''));
    if (o.click) { p.type = 'button'; p.setAttribute('aria-label', 'Ver ficha de ' + clip(ad.brand || ad.headline || 'este anuncio', 30)); }
    p.style.setProperty('--pbg', pal.bg);
    p.style.setProperty('--pfg', pal.fg);
    if (withMedia) { p.appendChild(mediaNode(ad.media, false)); if (!imgOnly) p.appendChild(el('div', 'pshade')); }
    if (imgOnly) {
      if (o.click) p.addEventListener('click', function () { location.hash = '#anuncio-' + ad.id; });
      return p;
    }
    var top = el('div', 'ptop');
    top.appendChild(el('span', 'ptag', tier === 'premium' ? 'Plus' : tier === 'banner' ? 'Banner' : tier === 'destacado' ? 'Destacado' : 'Anuncio'));
    top.appendChild(el('span', 'pbrand', clip(ad.brand, 30)));
    var mid = el('div', 'pmid');
    mid.appendChild(el('h3', 'phead', clip(ad.headline, 48)));
    if (ad.body) mid.appendChild(el('p', 'pbody', clip(ad.body, 300)));
    p.appendChild(top);
    p.appendChild(mid);
    p.appendChild(el('p', 'ploc', locLine(ad)));
    if (o.click) p.addEventListener('click', function () { location.hash = '#anuncio-' + ad.id; });
    return p;
  }
  function tile(ad, o) { var t = el('div', 'tile g-' + (ad.tier || 'destacado')); t.appendChild(poster(ad, o)); return t; }
  function rankOf(id) { if (state.rank[id] == null) state.rank[id] = Math.random(); return state.rank[id]; }
  function byRank(a, b) { return rankOf(a.id) - rankOf(b.id); }

  // ---------- Inicio ----------
  function fillSelect(sel, first, items) {
    var cur = sel.value;
    sel.textContent = '';
    var o0 = document.createElement('option'); o0.value = ''; o0.textContent = first; sel.appendChild(o0);
    items.forEach(function (it) {
      var o = document.createElement('option');
      o.value = typeof it === 'string' ? it : it[0];
      o.textContent = typeof it === 'string' ? it : it[1];
      sel.appendChild(o);
    });
    sel.value = cur;
  }
  function matches(ad) {
    var f = state.filters;
    if (f.loc && ad.localidad !== f.loc) return false;
    if (f.cat && ad.categoria !== f.cat) return false;
    if (f.tipo && C.tiers[ad.tier] && C.tiers[ad.tier].group !== f.tipo) return false;
    if (f.barrio && norm(ad.barrio).indexOf(norm(f.barrio.trim())) < 0) return false;
    if (f.q) {
      var hay = norm([ad.brand, ad.headline, ad.body, ad.barrio, ad.categoria, ad.localidad, ad.address].join(' '));
      var words = norm(f.q).split(/\s+/).filter(Boolean);
      if (!words.every(function (w) { return hay.indexOf(w) >= 0; })) return false;
    }
    return true;
  }
  function renderHome() {
    var ready = state.status === 'ok';
    var vis = state.ads.filter(visible);
    var list = vis.filter(matches);
    $('totalCount').textContent = ready ? vis.length + (vis.length === 1 ? ' anuncio vigente' : ' anuncios vigentes') : '';
    var filtering = !!(state.filters.q || state.filters.loc || state.filters.barrio || state.filters.cat || state.filters.tipo);
    $('resultCount').textContent = ready && filtering ? list.length + (list.length === 1 ? ' resultado' : ' resultados') : '';

    var banners = list.filter(function (a) { return a.tier === 'banner'; }).sort(byRank);
    var dest = list.filter(function (a) { return a.tier === 'destacado'; }).sort(byRank);
    var std = list.filter(function (a) { return a.tier === 'mediano'; }).sort(byRank).concat(list.filter(function (a) { return a.tier === 'pequeno'; }).sort(byRank));

    renderBanner(banners);
    $('secDest').hidden = !dest.length;
    var gd = $('gridDest'); gd.textContent = '';
    dest.forEach(function (a) { gd.appendChild(tile(a, { click: true })); });
    $('secStd').hidden = !std.length;
    var gs = $('gridStd'); gs.textContent = '';
    std.forEach(function (a) { gs.appendChild(tile(a, { click: true })); });

    var eb = $('emptyBox');
    eb.textContent = '';
    var n = $('dataNote'), t = '';
    if (state.status === 'error') t = 'No se pudieron leer los datos del sitio. Recarga la página.';
    else if (state.status === 'slow') t = 'Los datos tardan en responder. Lo que ves puede estar desactualizado.';
    n.textContent = t; n.hidden = !t; n.className = 'note' + (state.status === 'error' ? ' bad' : '');
    if (ready && !list.length) {
      eb.hidden = false;
      if (filtering && vis.length) {
        eb.appendChild(el('p', '', 'Ningún anuncio coincide con esos filtros.'));
        var cl = el('button', 'btn sm ghost', 'Limpiar filtros'); cl.type = 'button'; cl.addEventListener('click', clearFilters);
        var a1 = el('div', 'acts'); a1.appendChild(cl); eb.appendChild(a1);
      } else {
        eb.appendChild(el('p', '', 'Todavía no hay anuncios publicados.'));
        var go = el('a', 'btn sm', 'Anuncia tu negocio'); go.href = '#anunciar';
        var a2 = el('div', 'acts'); a2.appendChild(go); eb.appendChild(a2);
      }
    } else { eb.hidden = true; }
  }
  function renderBanner(banners) {
    var box = $('bannerBox');
    if (state.bTimer) { clearInterval(state.bTimer); state.bTimer = null; }
    box.textContent = '';
    box.hidden = !banners.length;
    if (!banners.length) return;
    if (state.bIdx >= banners.length) state.bIdx = 0;
    var cur = banners[state.bIdx];
    var t = el('div', 'tile'); t.appendChild(poster(cur, { click: true }));
    box.appendChild(t);
    if (banners.length > 1) {
      var nav = el('div', 'banner-nav');
      banners.forEach(function (b, i) {
        var d = el('button', 'dot'); d.type = 'button';
        d.setAttribute('aria-label', 'Banner ' + (i + 1) + ' de ' + banners.length);
        d.setAttribute('aria-current', i === state.bIdx ? 'true' : 'false');
        d.addEventListener('click', function () { state.bIdx = i; renderBanner(banners); });
        nav.appendChild(d);
      });
      box.appendChild(nav);
      if (!reduce) state.bTimer = setInterval(function () { state.bIdx = (state.bIdx + 1) % banners.length; renderBanner(banners); }, 7000);
    }
  }
  // Banner Plus: franja visible en todas las pantallas, sin importar los filtros.
  function renderPlus() {
    var box = $('plusBox');
    if (state.pTimer) { clearInterval(state.pTimer); state.pTimer = null; }
    box.textContent = '';
    var list = state.ads.filter(function (a) { return a.tier === 'premium' && visible(a); }).sort(byRank);
    var show = list.length && ['admin', 'pago'].indexOf(state.view) < 0;
    box.hidden = !show;
    if (!show) return;
    if (state.pIdx >= list.length) state.pIdx = 0;
    box.appendChild(poster(list[state.pIdx], { click: true }));
    if (list.length > 1 && !reduce) state.pTimer = setInterval(function () { state.pIdx = (state.pIdx + 1) % list.length; renderPlus(); }, 8000);
  }
  function clearFilters() {
    state.filters = { q: '', loc: '', barrio: '', cat: '', tipo: '' };
    $('fl-q').value = ''; $('fl-loc').value = ''; $('fl-barrio').value = ''; $('fl-cat').value = ''; $('fl-tipo').value = '';
    renderHome();
  }
  function buildFilters() {
    fillSelect($('fl-loc'), 'Todas las localidades', C.localidades);
    fillSelect($('fl-cat'), 'Todos los comercios', C.categorias);
    fillSelect($('fl-tipo'), 'Todos los tipos', Object.keys(C.groups).map(function (k) { return [k, C.groups[k]]; }));
    var map = { 'fl-q': 'q', 'fl-loc': 'loc', 'fl-barrio': 'barrio', 'fl-cat': 'cat', 'fl-tipo': 'tipo' };
    Object.keys(map).forEach(function (id) {
      $(id).addEventListener('input', function () { state.filters[map[id]] = $(id).value; renderHome(); });
    });
    $('filters').addEventListener('submit', function (e) { e.preventDefault(); });
    $('clearFilters').addEventListener('click', clearFilters);
    $('filterToggle').addEventListener('click', function () {
      var open = $('filterPanel').hidden;
      $('filterPanel').hidden = !open;
      $('filterToggle').setAttribute('aria-expanded', open ? 'true' : 'false');
    });
  }

  // ---------- Ficha ----------
  var tracked = {};
  function trackOnce(ad, field) {
    if (!ad || !state.authReady) return;
    if (isAdmin() || (state.user && ad.uid === state.user.uid)) return;
    var k = ad.id + ':' + field;
    if (tracked[k]) return;
    try { if (sessionStorage.getItem('pb-t-' + k)) { tracked[k] = true; return; } sessionStorage.setItem('pb-t-' + k, '1'); } catch (e) {}
    tracked[k] = true;
    B.track(ad.id, field).catch(function () {});
  }
  var fichaShown = null;
  function renderFicha() {
    var body = $('fichaBody');
    var ad = state.fichaId ? findAd(state.fichaId) : null;
    var sig = ad ? ad.id + ':' + ad.active + ':' + ad.endsAt + ':' + ad.headline + ':' + ad.body + ':' + (ad.media && ad.media.url) : 'none:' + state.status;
    if (sig === fichaShown) return;
    fichaShown = sig;
    body.textContent = '';
    if (!ad) {
      body.appendChild(el('p', 'note', state.status === 'ok' ? 'No encontramos este anuncio. Puede que ya no esté vigente.' : 'Cargando anuncio…'));
      return;
    }
    var wrap = el('div', 'ficha');
    var left = el('div');
    if (safeMedia(ad.media)) {
      var m = mediaNode(ad.media, true);
      var node = m.firstChild;
      node.style.width = '100%'; node.style.maxHeight = '70vh'; node.style.objectFit = 'contain'; node.style.background = '#000'; node.style.display = 'block';
      left.appendChild(node);
    } else {
      var big = Object.assign({}, ad, { tier: 'banner' });
      left.appendChild(poster(big, {}));
    }
    var info = el('div', 'ficha-info');
    info.appendChild(el('p', 'eyebrow', ad.headline ? clip(ad.brand, 30) : 'Anuncio'));
    info.appendChild(el('h2', '', clip(ad.headline || ad.brand || 'Anunciante', 48)));
    var tags = el('div', 'tags');
    [ad.categoria, ad.localidad, ad.barrio].forEach(function (t) { if (t) tags.appendChild(el('span', 'tag', t)); });
    info.appendChild(tags);
    if (!visible(ad)) info.appendChild(el('p', 'ended', 'Este anuncio no está vigente en este momento.'));
    if (ad.body) info.appendChild(el('p', '', clip(ad.body, 300)));
    if (ad.address) info.appendChild(el('p', 'meta', 'Dirección: ' + clip(ad.address, 100)));
    var btns = el('div', 'contact-btns');
    function cbtn(cls, text, href, field, ext) {
      var a = el('a', 'btn ' + cls, text);
      a.href = href;
      if (ext) { a.target = '_blank'; a.rel = 'noopener noreferrer nofollow ugc'; }
      a.addEventListener('click', function () { trackOnce(ad, field); });
      btns.appendChild(a);
    }
    var wa = normPhone(ad.whatsapp), ph = normPhone(ad.phone), ml = normMail(ad.mail), wb = normWeb(ad.web);
    if (wa) cbtn('wa', 'WhatsApp', 'https://wa.me/' + wa + '?text=' + encodeURIComponent('Hola, vi tu anuncio en ' + C.brand + '.'), 'clicksWhatsapp', true);
    if (ph) cbtn('', 'Llamar', 'tel:+' + ph, 'clicksPhone', false);
    if (ml) cbtn('ghost', 'Correo', 'mailto:' + ml, 'clicksEmail', false);
    if (wb) cbtn('ghost', 'Sitio web', wb, 'clicksWeb', true);
    info.appendChild(btns);
    if (wa) info.appendChild(el('p', 'meta', 'WhatsApp: ' + wa.replace(/^57(\d{10})$/, '$1')));
    var share = el('div', 'acts');
    var cp = el('button', 'btn sm ghost', 'Copiar enlace'); cp.type = 'button';
    var cm = el('p', 'msg'); cm.setAttribute('role', 'status');
    cp.addEventListener('click', function () {
      var url = location.href.split('#')[0] + '#anuncio-' + ad.id;
      var done = function () { setMsg(cm, 'Enlace copiado.', 'ok'); };
      var fallback = function () { setMsg(cm, url, ''); };
      try { navigator.clipboard.writeText(url).then(done, fallback); } catch (e) { fallback(); }
    });
    share.appendChild(cp);
    info.appendChild(share); info.appendChild(cm);
    wrap.appendChild(left); wrap.appendChild(info);
    body.appendChild(wrap);
    if (visible(ad)) trackOnce(ad, 'views');
  }

  // ---------- Anunciar ----------
  function capLeft(tier) {
    var cap = cfg().caps[tier];
    if (!cap) return Infinity;
    var used = state.ads.filter(function (a) { return a.tier === tier && visible(a); }).length;
    return Math.max(0, cap - used);
  }
  function designOnly() { return state.sel.tier === ''; }
  // El mes gratis es uno por cuenta: si ya hay un pedido con promoción (que no falló ni se rechazó), no se ofrece de nuevo.
  function promoUsed() {
    var u = state.user;
    return !!u && state.orders.some(function (o) { return o.uid === u.uid && (o.promo || o.usePromo) && o.status !== 'rechazado'; });
  }
  function totals() {
    var c = cfg(), s = state.sel;
    var space = s.tier ? C.priceFor(c.prices[s.tier], s.days) : 0;
    var promo = !!(s.promo && s.tier && PB_CONFIG.promoOpen(state.config) && !promoUsed());
    var pieces = (s.design || designOnly()) ? s.pieces : 0;
    return { space: space, promo: promo, pieces: pieces, design: pieces * c.designPrice, total: (promo ? 0 : space) + pieces * c.designPrice, c: c };
  }
  function renderPlans() {
    var box = $('plans');
    box.textContent = '';
    var c = cfg();
    TIER_ORDER.forEach(function (t) {
      var left = capLeft(t);
      var b = el('button', 'plan');
      b.type = 'button';
      b.appendChild(el('b', '', C.tiers[t].label));
      var pr = el('span', 'pr', money(C.priceFor(c.prices[t], state.sel.days)));
      if (C.discPct(state.sel.days) > 0) { pr.appendChild(document.createTextNode(' ')); var old = document.createElement('s'); old.textContent = money(C.listFor(c.prices[t], state.sel.days)); pr.appendChild(old); }
      pr.appendChild(document.createTextNode(' · ' + C.durLabel(state.sel.days)));
      b.appendChild(pr);
      b.appendChild(el('small', '', left === Infinity ? C.tiers[t].note : (left > 0 ? 'Quedan ' + left + ' de ' + c.caps[t] + ' cupos' : 'Sin cupos por ahora')));
      b.appendChild(el('small', 'size', 'Medida: ' + C.sizeLabel(t)));
      b.disabled = left === 0;
      b.setAttribute('aria-pressed', state.sel.tier === t ? 'true' : 'false');
      b.addEventListener('click', function () { state.sel.tier = t; renderForm(); });
      box.appendChild(b);
    });
    var d = el('button', 'plan');
    d.type = 'button';
    d.appendChild(el('b', '', 'Solo diseño'));
    d.appendChild(el('span', 'pr', 'Desde ' + money(c.designPrice)));
    d.appendChild(el('small', '', 'Te creamos la pieza, sin publicar'));
    d.setAttribute('aria-pressed', designOnly() ? 'true' : 'false');
    d.addEventListener('click', function () { state.sel.tier = ''; if (state.sel.pieces < 1) state.sel.pieces = 1; renderForm(); });
    box.appendChild(d);
  }
  function renderForm() {
    var c = cfg();
    if (state.sel.tier && capLeft(state.sel.tier) === 0) {
      var ok = TIER_ORDER.filter(function (t) { return capLeft(t) > 0; })[0];
      state.sel.tier = ok || '';
      if (!ok && state.sel.pieces < 1) state.sel.pieces = 1;
    }
    renderPlans();
    var only = designOnly();
    $('grpListing').hidden = only;
    $('grpAd').hidden = only || !!state.file;
    $('pvWrap').hidden = only;
    $('x-design').checked = only || state.sel.design;
    $('x-design').disabled = only;
    $('designMore').hidden = !($('x-design').checked);
    $('designPriceTxt').textContent = '(' + money(c.designPrice) + ')';
    $('l-file').textContent = only ? 'Logo o referencia (opcional)' : 'Imagen (si la subes, no hace falta titular ni descripción)';
    var pc = $('pieces');
    pc.textContent = '';
    for (var i = 1; i <= C.design.maxPieces; i++) {
      (function (n) {
        var b = el('button', 'chip', n + (n === 1 ? ' pieza' : ' piezas'));
        b.type = 'button';
        b.setAttribute('aria-pressed', state.sel.pieces === n ? 'true' : 'false');
        b.addEventListener('click', function () { state.sel.pieces = n; renderForm(); });
        pc.appendChild(b);
      })(i);
    }
    $('durBox').hidden = only;
    var du = $('durs'); du.textContent = '';
    C.durations.forEach(function (d) {
      var b = el('button', 'chip', d.label + (state.sel.tier ? ' · ' + money(C.priceFor(c.prices[state.sel.tier], d.days)) : '') + (C.discPct(d.days) ? ' (-' + C.discPct(d.days) + '%)' : ''));
      b.type = 'button';
      b.setAttribute('aria-pressed', state.sel.days === d.days ? 'true' : 'false');
      b.addEventListener('click', function () { state.sel.days = d.days; renderForm(); });
      du.appendChild(b);
    });
    // Medida del espacio elegido y aviso si la imagen subida es de otra proporción
    var tz = state.sel.tier && !($('x-design').checked) ? C.tiers[state.sel.tier].size : null;
    $('fileHint').textContent = 'Imagen (JPG, PNG o WebP) de hasta ' + C.limits.imageMB + ' MB.' + (tz ? ' Medida ideal para este espacio: ' + tz.w + ' × ' + tz.h + ' px. Si es de otro tamaño, la recortamos al centro para que quede a medida.' : ' La reducimos para que cargue rápido.');
    var sw = $('sizeWarn'), fd = state.fileDims;
    if (tz && fd && Math.abs(fd.w / fd.h - tz.w / tz.h) / (tz.w / tz.h) > 0.06) {
      sw.hidden = false;
      sw.textContent = 'Tu imagen mide ' + fd.w + ' × ' + fd.h + ' px. Se va a recortar para ajustarse a ' + tz.w + ' × ' + tz.h + ' px. Revisa la vista previa o súbela con esa medida.';
    } else sw.hidden = true;
    var showPromo = PB_CONFIG.promoOpen(state.config) && !!state.sel.tier && !promoUsed();
    $('promoBox').hidden = !showPromo;
    $('promoUntil').textContent = PB_CONFIG.promoUntilLabel(state.config);
    if (!showPromo) { state.sel.promo = false; $('x-promo').checked = false; }
    updatePreview();
    updatePrice();
  }
  function updatePrice() {
    var t = totals(), s = state.sel;
    var sum = $('sum');
    sum.textContent = '';
    function row(a, b, cls) { var r = el('div', 'row' + (cls ? ' ' + cls : '')); r.appendChild(el('span', '', a)); r.appendChild(el('span', '', b)); sum.appendChild(r); }
    if (s.tier) {
      var dp = C.discPct(s.days);
      if (dp > 0) {
        var lst = C.listFor(t.c.prices[s.tier], s.days);
        row(C.tiers[s.tier].label + ' · ' + C.durLabel(s.days), money(lst));
        row('Descuento ' + dp + '%', '-' + money(lst - t.space));
      } else row(C.tiers[s.tier].label + ' · ' + C.durLabel(s.days), money(t.space));
    }
    if (t.promo) row('Mes gratis de lanzamiento', '-' + money(t.space));
    if (t.pieces) row('Diseño · ' + t.pieces + (t.pieces === 1 ? ' pieza' : ' piezas'), money(t.design));
    row(t.total === 0 ? 'Total' : 'Total (se paga solo si aceptamos)', money(t.total), 'total');
  }
  function currentAd() {
    return {
      brand: $('f-brand').value.trim(), headline: $('f-head').value.trim(), body: $('f-body').value.trim(),
      categoria: $('f-cat').value, localidad: $('f-loc').value, barrio: $('f-barrio').value.trim(), address: $('f-addr').value.trim(),
      whatsapp: $('f-wa').value, phone: $('f-phone').value, mail: $('f-email').value, web: $('f-web').value, pal: state.sel.pal
    };
  }
  function updatePreview() {
    if (designOnly()) return;
    var a = currentAd();
    var shown = {
      tier: state.sel.tier || 'destacado', brand: a.brand || 'Tu negocio', headline: state.file ? '' : (a.headline || 'Tu titular aquí'),
      body: a.body || 'Cuenta qué ofreces, horarios o promociones.', categoria: a.categoria || 'Tipo de comercio',
      localidad: a.localidad || 'Localidad', barrio: a.barrio, pal: a.pal,
      media: state.file ? { url: state.fileURL, type: /^video\//.test(state.file.type) ? 'video' : 'image' } : null
    };
    var box = $('preview');
    box.setAttribute('data-tier', shown.tier);
    box.textContent = '';
    var t = el('div', 'tile'); t.appendChild(poster(shown, { ph: !(state.file || (a.brand && a.headline)) }));
    box.appendChild(t);
  }
  function clearFile() {
    if (state.fileURL) URL.revokeObjectURL(state.fileURL);
    state.file = null; state.fileURL = null;
    $('f-file').value = '';
    state.fileDims = null;
    $('picked').hidden = true;
    renderForm();
  }
  function checkFile(f, msgNode) {
    var isVid = /^video\/(mp4|webm|quicktime)$/.test(f.type), isImg = /^image\//.test(f.type);
    if (isVid && !C.limits.allowVideo) { setMsg(msgNode, 'Por ahora solo se aceptan imágenes. Los videos llegan más adelante.', 'err'); return false; }
    if (!isVid && !isImg) { setMsg(msgNode, 'Ese archivo no sirve. Sube una imagen.', 'err'); return false; }
    var maxMB = isVid ? C.limits.videoMB : C.limits.imageMB;
    if (f.size > maxMB * 1048576) { setMsg(msgNode, 'El archivo pesa ' + (f.size / 1048576).toFixed(1) + ' MB. El máximo es ' + maxMB + ' MB.', 'err'); return false; }
    return true;
  }
  function buildForm() {
    fillSelect($('f-cat'), 'Elige…', C.categorias);
    fillSelect($('f-loc'), 'Elige…', C.localidades);
    var pl = $('pals');
    C.palettes.forEach(function (p, i) {
      var b = el('button', 'sw'); b.type = 'button'; b.style.background = p.bg; b.title = p.n;
      b.setAttribute('aria-label', 'Color ' + p.n);
      b.setAttribute('aria-pressed', i === state.sel.pal ? 'true' : 'false');
      b.addEventListener('click', function () {
        state.sel.pal = i;
        Array.prototype.forEach.call(pl.children, function (x) { x.setAttribute('aria-pressed', x === b ? 'true' : 'false'); });
        updatePreview();
      });
      pl.appendChild(b);
    });
    [['f-brand', 'c-brand', 30], ['f-barrio', 'c-barrio', 60], ['f-addr', 'c-addr', 100], ['f-head', 'c-head', 48], ['f-body', 'c-body', 300], ['f-brief', 'c-brief', 400]].forEach(function (f) {
      $(f[0]).addEventListener('input', function () { $(f[1]).textContent = $(f[0]).value.length + '/' + f[2]; updatePreview(); });
    });
    ['f-cat', 'f-loc'].forEach(function (id) { $(id).addEventListener('input', updatePreview); });
    $('x-design').addEventListener('change', function () { state.sel.design = $('x-design').checked; renderForm(); });
    $('x-promo').addEventListener('change', function () { state.sel.promo = $('x-promo').checked; updatePrice(); });
    $('termsText').textContent = C.terms || '';
    $('f-file').addEventListener('change', function (e) {
      var f = e.target.files && e.target.files[0];
      if (!f) { clearFile(); return; }
      if (!checkFile(f, $('msg'))) { clearFile(); return; }
      if (state.fileURL) URL.revokeObjectURL(state.fileURL);
      state.file = f; state.fileURL = URL.createObjectURL(f); state.fileDims = null;
      (function (url) { var im = new Image(); im.onload = function () { if (state.fileURL === url) { state.fileDims = { w: im.naturalWidth, h: im.naturalHeight }; renderForm(); } }; im.src = url; })(state.fileURL);
      $('pickedName').textContent = f.name + ' · ' + (f.size / 1048576).toFixed(1) + ' MB';
      $('picked').hidden = false;
      setMsg($('msg'), '', '');
      renderForm();
    });
    $('clearFile').addEventListener('click', clearFile);
  }

  function handleResult(res) {
    state.payOrder = res.orderId;
    location.hash = '#pago';
  }
  $('form').addEventListener('submit', async function (e) {
    e.preventDefault();
    if (state.busy) return;
    var msg = $('msg'), s = state.sel, only = designOnly(), a = currentAd();
    function bad(text, id) { setMsg(msg, text, 'err'); if (id) $(id).focus(); }
    if (a.brand.length < 2 && (only || !state.file)) return bad('Escribe el nombre de tu negocio.', 'f-brand');
    if (!only) {
      if (!a.categoria) return bad('Elige el tipo de comercio.', 'f-cat');
      if (!a.localidad) return bad('Elige la localidad.', 'f-loc');
      if (!state.file && !s.design && a.headline.length < 3) return bad('Escribe un titular de al menos 3 letras, o sube una imagen.', 'f-head');
    }
    var wa = normPhone(a.whatsapp), ph = normPhone(a.phone), ml = normMail(a.mail), wb = normWeb(a.web);
    if (wa === null) return bad('El WhatsApp no parece válido. Escribe solo el número.', 'f-wa');
    if (ph === null) return bad('El teléfono no parece válido.', 'f-phone');
    if (ml === null) return bad('El correo no parece válido.', 'f-email');
    if (wb === null) return bad('El sitio web no parece válido. Debe empezar por http o https.', 'f-web');
    if (!wa && !ph && !ml && !wb) return bad('Pon al menos una forma de contacto.', 'f-wa');
    var design = s.design || only;
    if (design && $('f-brief').value.trim().length < 10) return bad('Cuéntanos qué necesitas para el diseño.', 'f-brief');
    if (!only && !design && !state.file) return bad('Sube una imagen, o pide que te la diseñemos.', 'f-file');
    if (!$('x-terms').checked) return bad('Acepta las condiciones para continuar.', 'x-terms');
    if (!state.user) {
      state.afterLogin = '#anunciar';
      setMsg($('authMsg'), 'Entra o crea tu cuenta para continuar. Lo que escribiste se queda como está.', '');
      location.hash = '#entrar';
      return;
    }
    state.busy = true;
    $('payBtn').disabled = true;
    $('prog').hidden = !state.file;
    $('progFill').style.width = '0%';
    setMsg(msg, state.file ? 'Preparando tu imagen…' : 'Enviando tu solicitud…', '');
    try {
      var res = await B.sendRequest({
        tier: s.tier, days: s.days, designPieces: design ? s.pieces : 0, designBrief: design ? $('f-brief').value.trim() : '', usePromo: !!(s.promo && s.tier && PB_CONFIG.promoOpen(state.config) && !promoUsed()),
        brand: a.brand, headline: (only || state.file) ? '' : a.headline, body: (only || state.file) ? '' : a.body, categoria: only ? '' : a.categoria, localidad: only ? '' : a.localidad,
        barrio: a.barrio, address: a.address, whatsapp: wa || '', phone: ph || '', mail: ml || '', web: wb || '', pal: a.pal, file: state.file
      }, function (p) { $('progFill').style.width = p + '%'; });
      setMsg(msg, '', '');
      clearFile();
      handleResult(res);
    } catch (err) { setMsg(msg, errText(err), 'err'); }
    state.busy = false;
    $('payBtn').disabled = false;
    $('prog').hidden = true;
  });

  // ---------- Pedidos y cuenta ----------
  function orderTitle(o) {
    if (o.renewOf) return 'Renovación · ' + clip(o.brand, 30);
    if (!o.tier) return 'Diseño · ' + o.designPieces + (o.designPieces === 1 ? ' pieza' : ' piezas');
    return tierLabel(o.tier) + ' (' + C.durLabel(o.days || C.termDays) + ')' + (o.designPieces ? ' + diseño' : '') + ' · ' + clip(o.brand, 30);
  }
  function payLabel(o) {
    if (o.status === 'revision') return 'Sin cobrar todavía';
    if (o.status === 'rechazado') return 'No se cobró';
    if (o.promo && !o.amount) return 'Gratis (promoción)';
    if (o.status === 'por_pagar') return 'Por pagar';
    if (o.status === 'pago_reportado') return 'Pago avisado, por confirmar';
    return 'Pagado';
  }
  function ref(o) { return String(o.id || '').slice(-6).toUpperCase(); }
  function waNum(n) { var d = String(n || '').replace(/\D/g, ''); return d.length === 10 ? '57' + d : d; }
  // Cómo pagar: se muestra cuando el administrador ya aceptó la solicitud.
  function payBox(o) {
    var box = el('div', 'paybox');
    box.appendChild(el('p', '', 'Paga ' + money(o.amount) + ' por Nequi al ' + C.pago.nequi + ' (' + C.pago.titular + ').'));
    box.appendChild(el('p', 'fine', 'En el mensaje del pago escribe tu referencia: ' + ref(o) + '. Luego envíanos el comprobante por WhatsApp.'));
    var acts = el('div', 'acts');
    var wa = el('a', 'btn sm ghost', 'Enviar comprobante por WhatsApp');
    wa.href = waLink(waNum(C.pago.whatsapp), 'Hola, pagué ' + money(o.amount) + ' por mi anuncio en ' + C.brand + '. Referencia ' + ref(o) + '.');
    wa.target = '_blank'; wa.rel = 'noopener noreferrer'; acts.appendChild(wa);
    if (o.status === 'por_pagar') {
      var yp = el('button', 'btn sm', 'Ya pagué'); yp.type = 'button';
      yp.addEventListener('click', async function () {
        try { await B.reportPaid(o.id); } catch (err) { setMsg($('myMsg'), errText(err), 'err'); }
      });
      acts.appendChild(yp);
    } else {
      acts.appendChild(el('span', 'meta', 'Avisaste del pago. Esperando que el administrador lo confirme.'));
    }
    box.appendChild(acts);
    return box;
  }
  function orderCard(o, forAdmin) {
    var c = el('div', 'card');
    var top = el('div', 'crow');
    top.appendChild(el('h3', '', orderTitle(o)));
    top.appendChild(el('span', 'chipst st-' + o.status, STATUS[o.status] || o.status));
    c.appendChild(top);
    c.appendChild(el('p', 'meta', money(o.amount) + ' · ' + payLabel(o) + ' · ' + fmtDateTime(o.createdAt)));
    if (forAdmin) c.appendChild(el('p', 'meta', 'Cuenta: ' + clip(o.userEmail, 80)));
    if (o.alert) c.appendChild(el('p', 'msg err', 'Aviso: ' + clip(o.alert, 200)));
    return c;
  }
  function statusLine(o) {
    if (o.status === 'revision') return 'Recibimos tu solicitud. La revisamos y te avisamos si la aceptamos. No pagas nada todavía.';
    if (o.status === 'por_pagar') return o.amount ? 'Aceptamos tu solicitud. Falta el pago para publicarla.' : 'Aceptamos tu solicitud.';
    if (o.status === 'pago_reportado') return 'Avisaste que pagaste. Cuando confirmemos el pago se publica.';
    if (o.status === 'aprobado') {
      if (o.renewOf) return 'Tu anuncio fue renovado por ' + C.durLabel(o.days || C.termDays) + '.';
      if (!o.tier) return 'Tu diseño está listo. Te contactamos por los datos que dejaste.';
      var ad = findAd(o.id);
      if (ad && o.designPieces > 0 && ad.active !== true && !ad.startsAt) return 'Estamos preparando tu diseño. Cuando esté listo se publica y te avisamos.';
      if (ad && visible(ad)) return 'Tu anuncio está publicado hasta el ' + fmtDate(ad.endsAt) + '.';
      return 'Tu anuncio fue aprobado.';
    }
    if (o.status === 'rechazado') return 'No pudimos aceptar esta solicitud' + (o.rejectReason ? ': ' + o.rejectReason : '.') + ' No se te cobró nada.';
    return '';
  }
  function adStatus(ad) {
    var now = Date.now();
    if (ad.active !== true) {
      if (ad.expired || (ad.endsAt && ad.endsAt <= now)) return { k: 'vencido', t: 'Vencido' };
      if (!ad.startsAt) return { k: 'borrador', t: 'Borrador' };
      return { k: 'pausado', t: 'Pausado' };
    }
    if (ad.endsAt <= now) return { k: 'vencido', t: 'Vencido' };
    var d = daysLeft(ad);
    if (d <= 7) return { k: 'porvencer', t: 'Vence en ' + d + (d === 1 ? ' día' : ' días') };
    return { k: 'activo', t: 'Activo' };
  }
  function statsLine(ad) {
    var d = el('div', 'mini-stats');
    [['Visitas', ad.views], ['WhatsApp', ad.clicksWhatsapp], ['Llamadas', ad.clicksPhone], ['Correo', ad.clicksEmail], ['Web', ad.clicksWeb]].forEach(function (x) {
      var s = el('span', ''); s.appendChild(document.createTextNode(x[0] + ' ')); s.appendChild(el('b', '', String(x[1] || 0))); d.appendChild(s);
    });
    return d;
  }
  async function renew(ad, days) {
    var m = $('myMsg');
    try { var res = await B.sendRequest({ renewOf: ad.id, days: days }); setMsg(m, '', ''); handleResult(res); }
    catch (err) { setMsg(m, errText(err), 'err'); }
  }
  function renderCuenta() {
    var la = $('myAds'), lo = $('myList');
    la.textContent = ''; lo.textContent = '';
    var ln = $('myNotices'); ln.textContent = '';
    $('noticeNote').textContent = 'Así se verían los correos que recibe el anunciante. En la demostración no se envía nada: los avisos se guardan aquí.';
    $('noticeHead').hidden = $('noticeNote').hidden = ln.hidden = !B.watchNotices;
    if (!state.user) return;
    if (B.watchNotices) {
      if (!state.notices.length) ln.appendChild(el('p', 'fine', 'Todavía no tienes avisos.'));
      state.notices.slice(0, 20).forEach(function (n) {
        var c = el('div', 'card notice');
        var top = el('div', 'crow');
        top.appendChild(el('h3', '', n.subject));
        top.appendChild(el('span', 'meta', fmtDateTime(n.at)));
        c.appendChild(top);
        c.appendChild(el('p', 'fine', 'Para: ' + (n.to || '—')));
        c.appendChild(el('p', '', n.text));
        ln.appendChild(c);
      });
    }
    var mine = state.myAds.filter(function (a) { return a.uid === state.user.uid; });
    if (!mine.length) la.appendChild(el('p', 'fine', 'Todavía no tienes anuncios publicados.'));
    mine.forEach(function (ad) {
      var st = adStatus(ad);
      var c = el('div', 'card');
      var top = el('div', 'crow');
      top.appendChild(el('h3', '', clip(ad.brand, 30) + ' · ' + tierLabel(ad.tier)));
      top.appendChild(el('span', 'chipst st-' + st.k, st.t));
      c.appendChild(top);
      c.appendChild(el('p', 'meta', ad.endsAt ? (st.k === 'vencido' ? 'Venció el ' : 'Vence el ') + fmtDate(ad.endsAt) : 'Aún sin fecha: se publica cuando el diseño esté listo.'));
      c.appendChild(statsLine(ad));
      var acts = el('div', 'acts');
      var v = el('a', 'btn sm ghost', 'Ver ficha'); v.href = '#anuncio-' + ad.id; acts.appendChild(v);
      var pending = state.orders.some(function (o) { return o.renewOf === ad.id && OPEN.indexOf(o.status) >= 0; });
      if (ad.endsAt && (st.k === 'porvencer' || st.k === 'vencido') && !pending) {
        var sel = el('select'); sel.setAttribute('aria-label', 'Duración de la renovación');
        C.durations.forEach(function (d) { var op = el('option', '', d.label + ' · ' + money(C.priceFor(cfg().prices[ad.tier], d.days)) + (C.discPct(d.days) ? ' (-' + C.discPct(d.days) + '%)' : '')); op.value = String(d.days); sel.appendChild(op); });
        sel.value = String(C.termDays);
        var r = el('button', 'btn sm', 'Renovar'); r.type = 'button';
        r.addEventListener('click', function () { renew(ad, Number(sel.value)); });
        acts.appendChild(sel); acts.appendChild(r);
      }
      if (pending) acts.appendChild(el('span', 'meta', 'Renovación en proceso (mira tus pedidos)'));
      c.appendChild(acts);
      la.appendChild(c);
    });
    if (!state.orders.length) lo.appendChild(el('p', 'fine', 'Todavía no tienes pedidos.'));
    state.orders.forEach(function (o) {
      var c = orderCard(o, false);
      c.appendChild(el('p', '', statusLine(o)));
      if (o.status === 'por_pagar' || o.status === 'pago_reportado') c.appendChild(payBox(o));
      lo.appendChild(c);
    });
  }
  function renderPago() {
    var card = $('payCard');
    card.textContent = '';
    if (!state.user) {
      card.appendChild(el('p', '', 'Entra a tu cuenta para ver el estado de tu pedido.'));
      var a = el('a', 'btn', 'Entrar'); a.href = '#entrar'; card.appendChild(a);
      return;
    }
    var o = state.orders.filter(function (x) { return x.id === state.payOrder; })[0];
    if (!o) {
      card.appendChild(el('p', '', state.payOrder ? 'Buscando tu pedido…' : 'No hay un pedido para mostrar.'));
      var l = el('a', 'btn ghost', 'Ir a mi cuenta'); l.href = '#cuenta'; card.appendChild(l);
      return;
    }
    var big = { revision: 'Solicitud enviada', por_pagar: 'Aceptada: falta pagar', pago_reportado: 'Pago avisado', aprobado: 'Publicado', rechazado: 'No aceptada' };
    card.appendChild(el('p', 'status-big st-' + o.status, big[o.status] || o.status));
    card.appendChild(el('p', '', statusLine(o)));
    card.appendChild(el('p', 'meta', orderTitle(o) + (o.status === 'revision' ? '' : ' · ' + money(o.amount))));
    if (o.status === 'por_pagar' || o.status === 'pago_reportado') card.appendChild(payBox(o));
    var acts = el('div', 'acts');
    var my = el('a', 'btn', 'Ir a mi cuenta'); my.href = '#cuenta'; acts.appendChild(my);
    card.appendChild(acts);
  }

  // ---------- Administrar ----------
  async function adminDo(fn, okText) {
    var m = $('admMsg');
    try { var r = await fn(); setMsg(m, typeof okText === 'function' ? okText(r) : okText, 'ok'); }
    catch (err) { setMsg(m, errText(err), 'err'); }
  }
  function waLink(num, text) { return 'https://wa.me/' + num + '?text=' + encodeURIComponent(text); }
  function renderAdmin() {
    var ok = isAdmin();
    $('adminDenied').hidden = ok;
    $('adminBody').hidden = !ok;
    if (!ok) return;
    var now = Date.now();
    var orders = state.orders, ads = state.myAds;
    var review = orders.filter(function (o) { return o.status === 'revision'; });
    var toPay = orders.filter(function (o) { return o.status === 'por_pagar' || o.status === 'pago_reportado'; });
    var active = ads.filter(visible);
    var soon = ads.filter(function (a) { return visible(a) && daysLeft(a) <= 7; });
    var income = orders.filter(function (o) { return o.status === 'aprobado'; }).reduce(function (t, o) { return t + (o.amount || 0); }, 0);
    var views = ads.reduce(function (t, a) { return t + (a.views || 0); }, 0);
    var clicks = ads.reduce(function (t, a) { return t + (a.clicksWhatsapp || 0) + (a.clicksPhone || 0) + (a.clicksEmail || 0) + (a.clicksWeb || 0); }, 0);
    var promoUsed = orders.filter(function (o) { return o.promo === true && ['por_pagar', 'pago_reportado', 'aprobado'].indexOf(o.status) >= 0; }).length;
    var st = $('stats'); st.textContent = '';
    [[review.length, 'Por revisar'], [toPay.length, 'Esperando pago'], [active.length, 'Anuncios activos'], [soon.length, 'Vencen en 7 días'], [money(income), 'Cobrado'], [views, 'Visitas'], [clicks, 'Clics de contacto'], [promoUsed + ' de ' + cfg().promo.limit, 'Mes gratis usado']].forEach(function (x) {
      var d = el('div', 'stat'); d.appendChild(el('b', '', String(x[0]))); d.appendChild(el('span', '', x[1])); st.appendChild(d);
    });

    // Por revisar
    var rl = $('reviewList'); rl.textContent = '';
    if (!review.length) rl.appendChild(el('p', 'fine', 'No hay solicitudes esperando revisión.'));
    var ctx = { orders: state.orders, ads: state.myAds, config: state.config };
    review.forEach(function (o) {
      var c = orderCard(o, true);
      if (o.tier || o.renewOf) {
        var pv = el('div', 'apreview'); var tl = el('div', 'tile'); tl.appendChild(poster(o, {})); pv.appendChild(tl); c.appendChild(pv);
      }
      if (o.tier) c.appendChild(el('p', 'meta', 'Duración: ' + C.durLabel(o.days || C.termDays) + ' · Medida del espacio: ' + C.sizeLabel(o.tier) + (o.designPieces ? ' (diseña la pieza con esta medida)' : '')));
      if (o.body) c.appendChild(el('p', 'fine', clip(o.body, 300)));
      c.appendChild(el('p', 'meta', [o.categoria, o.localidad, o.barrio, o.address].filter(Boolean).join(' · ')));
      c.appendChild(el('p', 'meta', 'Contacto: ' + [o.whatsapp && 'WhatsApp ' + o.whatsapp, o.phone && 'Tel ' + o.phone, o.mail, o.web].filter(Boolean).join(' · ')));
      if (o.designPieces) {
        c.appendChild(el('p', '', 'Diseño pedido (' + o.designPieces + (o.designPieces === 1 ? ' pieza' : ' piezas') + '): ' + clip(o.designBrief, 400)));
        if (o.media && o.media.url && /^https:|^data:image\//.test(o.media.url)) {
          var rf = el('a', 'btn sm ghost', 'Ver archivo de referencia'); rf.href = o.media.url; rf.target = '_blank'; rf.rel = 'noopener noreferrer'; c.appendChild(rf);
        }
      }
      var q = C.quote(o, state.config, state.orders, state.myAds, now);
      if (q.ok) c.appendChild(el('p', 'quote', q.amount === 0 ? 'Si la aceptas se publica gratis (mes de lanzamiento).' : 'Si la aceptas, se le cobran ' + money(q.amount) + (q.promo ? ' (espacio gratis por la promoción)' : '') + '.'));
      else c.appendChild(el('p', 'msg err', q.error));
      var f = el('div', 'fld');
      var lb = el('label', '', 'Motivo si la rechazas (opcional)'); var inp = el('input'); inp.type = 'text'; inp.maxLength = 120; inp.id = 'why-' + o.id; lb.htmlFor = inp.id;
      f.appendChild(lb); f.appendChild(inp); c.appendChild(f);
      var acts = el('div', 'acts');
      var yes = el('button', 'btn sm', q.ok && q.amount === 0 ? 'Aceptar y publicar' : 'Aceptar'); yes.type = 'button'; yes.disabled = !q.ok;
      yes.addEventListener('click', function () {
        adminDo(function () { return B.acceptOrder(o, ctx); }, function (r) {
          if (r && r.free) return r.draft ? 'Aceptada. Quedó como borrador: sube la pieza diseñada en "Editar" y publícala.' : 'Aceptada y publicada.';
          return 'Aceptada. Le mostramos cómo pagar; cuando pague, confírmalo en "Esperando pago".';
        });
      });
      var no = el('button', 'btn sm danger', 'Rechazar'); no.type = 'button';
      no.addEventListener('click', function () { adminDo(function () { return B.rejectOrder(o.id, inp.value.trim()); }, 'Rechazada. No se cobró nada.'); });
      acts.appendChild(yes); acts.appendChild(no); c.appendChild(acts);
      rl.appendChild(c);
    });

    // Esperando pago
    var pl = $('payList'); pl.textContent = '';
    if (!toPay.length) pl.appendChild(el('p', 'fine', 'Nada esperando pago.'));
    toPay.sort(function (a, b) { return (a.status === 'pago_reportado' ? 0 : 1) - (b.status === 'pago_reportado' ? 0 : 1); }).forEach(function (o) {
      var c = orderCard(o, true);
      c.appendChild(el('p', 'meta', 'Referencia ' + ref(o) + (o.status === 'pago_reportado' ? ' · el anunciante avisó que ya pagó: revisa tu Nequi' : ' · todavía no avisa el pago')));
      var acts = el('div', 'acts');
      var ok = el('button', 'btn sm', 'Confirmar pago y publicar'); ok.type = 'button';
      ok.addEventListener('click', function () {
        adminDo(function () { return B.confirmPaid(o, ctx); }, function (r) {
          if (o.renewOf) return 'Pago confirmado. Renovado por ' + C.durLabel(o.days || C.termDays) + '.';
          if (!o.tier) return 'Pago confirmado. Entrega el diseño.';
          return r && r.draft ? 'Pago confirmado. Quedó como borrador: sube la pieza diseñada en "Editar" y publícala.' : 'Pago confirmado. El anuncio ya está publicado.';
        });
      });
      var no = el('button', 'btn sm danger', 'Cancelar pedido'); no.type = 'button';
      no.addEventListener('click', function () { adminDo(function () { return B.rejectOrder(o.id, 'No se completó el pago'); }, 'Pedido cancelado.'); });
      acts.appendChild(ok); acts.appendChild(no);
      if (o.whatsapp) { var wa = el('a', 'btn sm ghost', 'Escribirle por WhatsApp'); wa.href = waLink(waNum(o.whatsapp), 'Hola, sobre tu anuncio en ' + C.brand + ' (referencia ' + ref(o) + ').'); wa.target = '_blank'; wa.rel = 'noopener noreferrer'; acts.appendChild(wa); }
      c.appendChild(acts);
      pl.appendChild(c);
    });

    // Anuncios
    var af = $('adFilters'); af.textContent = '';
    [['todos', 'Todos'], ['activo', 'Activos'], ['porvencer', 'Por vencer'], ['vencido', 'Vencidos'], ['borrador', 'Borradores'], ['pausado', 'Pausados']].forEach(function (x) {
      var b = el('button', 'chip', x[1]); b.type = 'button'; b.setAttribute('aria-pressed', state.adFilter === x[0] ? 'true' : 'false');
      b.addEventListener('click', function () { state.adFilter = x[0]; renderAdmin(); });
      af.appendChild(b);
    });
    var al = $('adList'); al.textContent = '';
    var shownAds = ads.filter(function (a) { return state.adFilter === 'todos' || adStatus(a).k === state.adFilter; })
      .sort(function (a, b) { return (a.endsAt || 9e15) - (b.endsAt || 9e15); });
    if (!shownAds.length) al.appendChild(el('p', 'fine', 'No hay anuncios en esta vista.'));
    shownAds.forEach(function (ad) {
      var s = adStatus(ad);
      var c = el('div', 'card');
      var top = el('div', 'crow');
      top.appendChild(el('h3', '', clip(ad.brand, 30) + ' · ' + tierLabel(ad.tier)));
      top.appendChild(el('span', 'chipst st-' + s.k, s.t));
      c.appendChild(top);
      c.appendChild(el('p', 'meta', [ad.categoria, ad.localidad, ad.barrio].filter(Boolean).join(' · ')));
      c.appendChild(el('p', 'meta', (ad.startsAt ? 'Desde ' + fmtDate(ad.startsAt) : 'Sin publicar') + (ad.endsAt ? ' · vence ' + fmtDate(ad.endsAt) : '')));
      c.appendChild(statsLine(ad));
      var acts = el('div', 'acts');
      var ed = el('button', 'btn sm', 'Editar'); ed.type = 'button'; ed.addEventListener('click', function () { openEditor(ad); }); acts.appendChild(ed);
      var tg = el('button', 'btn sm ghost', ad.active === true ? 'Desactivar' : 'Activar'); tg.type = 'button';
      tg.addEventListener('click', function () { adminDo(function () { return B.setAdActive(ad.id, ad.active !== true, ad); }, ad.active === true ? 'Anuncio desactivado.' : 'Anuncio activado.'); });
      acts.appendChild(tg);
      var rn = el('button', 'btn sm ghost', 'Renovar ' + C.termDays + ' días'); rn.type = 'button';
      rn.addEventListener('click', function () { adminDo(function () { return B.renewAd(ad.id, ad); }, 'Renovado por ' + C.termDays + ' días.'); });
      acts.appendChild(rn);
      var vw = el('a', 'btn sm ghost', 'Ver ficha'); vw.href = '#anuncio-' + ad.id; acts.appendChild(vw);
      var num = normPhone(ad.whatsapp) || normPhone(ad.phone);
      if (num && (s.k === 'porvencer' || s.k === 'vencido')) {
        var rm = el('a', 'btn sm ghost', 'Recordar por WhatsApp');
        rm.href = waLink(num, 'Hola, tu anuncio "' + clip(ad.headline, 48) + '" en ' + C.brand + (s.k === 'vencido' ? ' ya venció.' : ' vence el ' + fmtDate(ad.endsAt) + '.') + ' ¿Quieres renovarlo?');
        rm.target = '_blank'; rm.rel = 'noopener noreferrer'; acts.appendChild(rm);
      }
      c.appendChild(acts); al.appendChild(c);
    });

    // Pedidos
    var fl = $('orderFilters'); fl.textContent = '';
    [['todos', 'Todos'], ['revision', 'Por revisar'], ['por_pagar', 'Por pagar'], ['pago_reportado', 'Pago avisado'], ['aprobado', 'Publicados'], ['rechazado', 'Rechazados']].forEach(function (x) {
      var b = el('button', 'chip', x[1]); b.type = 'button'; b.setAttribute('aria-pressed', state.orderFilter === x[0] ? 'true' : 'false');
      b.addEventListener('click', function () { state.orderFilter = x[0]; renderAdmin(); });
      fl.appendChild(b);
    });
    var ol = $('orderList'); ol.textContent = '';
    var shown = orders.filter(function (o) { return state.orderFilter === 'todos' || o.status === state.orderFilter; });
    if (!shown.length) ol.appendChild(el('p', 'fine', 'No hay pedidos en esta vista.'));
    shown.forEach(function (o) {
      var c = orderCard(o, true);
      ol.appendChild(c);
    });

    if (!state.cfgFilled) { state.cfgFilled = true; fillConfig(); }
  }
  function fillConfig() {
    var c = cfg();
    $('a-banner').value = c.prices.banner; $('a-destacado').value = c.prices.destacado;
    $('a-mediano').value = c.prices.mediano; $('a-pequeno').value = c.prices.pequeno;
    $('a-premium').value = c.prices.premium; $('a-capp').value = c.caps.premium;
    $('a-design').value = c.designPrice; $('a-capb').value = c.caps.banner; $('a-capd').value = c.caps.destacado;
    $('a-plimit').value = c.promo.limit; $('a-penabled').checked = c.promo.enabled; $('a-puntil').value = c.promo.until || '';
  }
  $('saveCfg').addEventListener('click', function () {
    var n = function (id) { return Math.round(Number($(id).value)); };
    var prices = { premium: n('a-premium'), banner: n('a-banner'), destacado: n('a-destacado'), mediano: n('a-mediano'), pequeno: n('a-pequeno') };
    var design = n('a-design'), capb = n('a-capb'), capd = n('a-capd'), capp = n('a-capp'), lim = n('a-plimit');
    var okPrices = Object.keys(prices).every(function (k) { return prices[k] >= 1500; }) && design >= 1500;
    if (!okPrices) { setMsg($('admMsg'), 'Cada precio debe ser de al menos $1.500.', 'err'); return; }
    if (!(capb >= 1 && capd >= 1 && capp >= 1) || !(lim >= 0)) { setMsg($('admMsg'), 'Revisa los cupos: deben ser números válidos.', 'err'); return; }
    adminDo(function () {
      return B.saveConfig({ prices: prices, designPrice: design, caps: { premium: capp, banner: capb, destacado: capd }, promo: { enabled: $('a-penabled').checked, limit: lim, until: $('a-puntil').value || '' } });
    }, 'Guardado. Los visitantes ya ven los valores nuevos.');
  });

  // ---------- Editor de anuncios (administrador) ----------
  var editing = null;
  function dateInput(ms) { var d = new Date(ms); var p = function (x) { return (x < 10 ? '0' : '') + x; }; return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate()); }
  function openEditor(ad) {
    editing = ad || null;
    state.editFile = null;
    $('ed-file').value = '';
    $('edTitle').textContent = ad ? 'Editar anuncio' : 'Crear anuncio';
    fillSelect($('ed-cat'), 'Elige…', C.categorias);
    fillSelect($('ed-loc'), 'Elige…', C.localidades);
    fillSelect($('ed-tier'), 'Elige…', TIER_ORDER.map(function (t) { return [t, C.tiers[t].label]; }));
    fillSelect($('ed-pal'), 'Elige…', C.palettes.map(function (p, i) { return [String(i), p.n]; }));
    var a = ad || { brand: '', headline: '', body: '', categoria: '', localidad: '', barrio: '', address: '', whatsapp: '', phone: '', mail: '', web: '', tier: 'pequeno', pal: 0, active: true, endsAt: Date.now() + C.termDays * DAY };
    $('ed-brand').value = a.brand || ''; $('ed-head').value = a.headline || ''; $('ed-body').value = a.body || '';
    $('ed-cat').value = a.categoria || ''; $('ed-loc').value = a.localidad || ''; $('ed-barrio').value = a.barrio || ''; $('ed-addr').value = a.address || '';
    $('ed-wa').value = a.whatsapp || ''; $('ed-phone').value = a.phone || ''; $('ed-email').value = a.mail || ''; $('ed-web').value = a.web || '';
    $('ed-tier').value = a.tier || 'pequeno'; $('ed-pal').value = String(a.pal || 0);
    $('ed-ends').value = dateInput(a.endsAt || Date.now() + C.termDays * DAY);
    $('ed-active').checked = a.active === true || !ad;
    setMsg($('edMsg'), '', ''); $('edProg').hidden = true;
    $('dlgEdit').showModal();
  }
  $('newAd').addEventListener('click', function () { openEditor(null); });
  $('edCancel').addEventListener('click', function () { $('dlgEdit').close(); });
  $('ed-file').addEventListener('change', function (e) {
    var f = e.target.files && e.target.files[0];
    if (f && !checkFile(f, $('edMsg'))) { e.target.value = ''; state.editFile = null; return; }
    state.editFile = f || null; setMsg($('edMsg'), '', '');
  });
  $('editForm').addEventListener('submit', async function (e) {
    e.preventDefault();
    var m = $('edMsg');
    function bad(t) { setMsg(m, t, 'err'); }
    var brand = $('ed-brand').value.trim(), head = $('ed-head').value.trim();
    var hasM = !!(state.editFile || (editing && editing.media));
    if (brand.length < 2 && !hasM) return bad('Escribe el nombre del negocio.');
    if (head.length < 3 && !hasM) return bad('Escribe un titular de al menos 3 letras, o sube una imagen.');
    if (!$('ed-cat').value || !$('ed-loc').value) return bad('Elige el tipo de comercio y la localidad.');
    var wa = normPhone($('ed-wa').value), ph = normPhone($('ed-phone').value), ml = normMail($('ed-email').value), wb = normWeb($('ed-web').value);
    if (wa === null || ph === null) return bad('Revisa el número de WhatsApp o teléfono.');
    if (ml === null) return bad('El correo no parece válido.');
    if (wb === null) return bad('El sitio web no parece válido.');
    if (!wa && !ph && !ml && !wb) return bad('Pon al menos una forma de contacto.');
    var ends = $('ed-ends').value ? new Date($('ed-ends').value + 'T23:59:59').getTime() : null;
    $('edSave').disabled = true;
    $('edProg').hidden = !state.editFile; $('edProgFill').style.width = '0%';
    try {
      await B.saveAd({
        id: editing ? editing.id : null, brand: brand, headline: head, body: $('ed-body').value.trim(), categoria: $('ed-cat').value, localidad: $('ed-loc').value,
        barrio: $('ed-barrio').value.trim(), address: $('ed-addr').value.trim(), whatsapp: wa || '', phone: ph || '', mail: ml || '', web: wb || '',
        tier: $('ed-tier').value || 'pequeno', pal: parseInt($('ed-pal').value, 10) || 0, active: $('ed-active').checked, endsAt: ends,
        startsAt: editing ? editing.startsAt : null, hadEnds: !!(editing && editing.endsAt)
      }, state.editFile, function (p) { $('edProgFill').style.width = p + '%'; });
      $('dlgEdit').close();
      setMsg($('admMsg'), 'Anuncio guardado.', 'ok');
    } catch (err) { bad(errText(err)); }
    $('edSave').disabled = false;
  });

  // ---------- Entrar ----------
  function setAuthMode(mode) {
    state.authMode = mode;
    var up = mode === 'up';
    $('nameFld').hidden = !up;
    $('h-auth').textContent = up ? 'Crear cuenta' : 'Entrar';
    $('authSubmit').textContent = up ? 'Crear cuenta' : 'Entrar';
    $('authToggle').textContent = up ? 'Ya tengo cuenta' : 'Crear una cuenta';
    $('au-pass').setAttribute('autocomplete', up ? 'new-password' : 'current-password');
    $('authReset').hidden = up;
  }
  $('authToggle').addEventListener('click', function () { setAuthMode(state.authMode === 'in' ? 'up' : 'in'); setMsg($('authMsg'), '', ''); });
  $('authForm').addEventListener('submit', async function (e) {
    e.preventDefault();
    var m = $('authMsg');
    var email = $('au-email').value.trim(), pass = $('au-pass').value, name = $('au-name').value.trim();
    if (!email) { setMsg(m, 'Escribe tu correo.', 'err'); $('au-email').focus(); return; }
    if (!pass) { setMsg(m, 'Escribe tu contraseña.', 'err'); $('au-pass').focus(); return; }
    if (state.authMode === 'up' && name.length < 2) { setMsg(m, 'Escribe tu nombre.', 'err'); $('au-name').focus(); return; }
    $('authSubmit').disabled = true;
    try {
      if (state.authMode === 'up') await B.signUp(name, email, pass); else await B.signIn(email, pass);
      $('au-pass').value = '';
      setMsg(m, '', '');
      location.hash = state.afterLogin || '#cuenta';
      state.afterLogin = '#cuenta';
    } catch (err) { setMsg(m, errText(err), 'err'); }
    $('authSubmit').disabled = false;
  });
  $('authReset').addEventListener('click', async function () {
    var m = $('authMsg'), email = $('au-email').value.trim();
    if (!email) { setMsg(m, 'Escribe tu correo arriba y pulsa de nuevo.', 'err'); $('au-email').focus(); return; }
    try { await B.resetPassword(email); } catch (err) { /* no revelar si el correo existe */ }
    setMsg(m, 'Si ese correo tiene cuenta, te enviamos un enlace para cambiar la contraseña.', 'ok');
  });
  async function demoLogin(kind) {
    try {
      B.ensureDemoUsers();
      var a = B.demoAccounts[kind];
      await B.signIn(a.email, a.pass);
      location.hash = kind === 'admin' ? '#admin' : '#cuenta';
    } catch (err) { setMsg($('authMsg'), errText(err), 'err'); }
  }
  $('loginAdmin').addEventListener('click', function () { demoLogin('admin'); });
  $('loginAdv').addEventListener('click', function () { demoLogin('adv'); });

  // ---------- Cabecera y rutas ----------
  function renderChrome() {
    var who = $('who');
    who.textContent = '';
    if (state.user) {
      who.appendChild(el('span', '', state.user.name || state.user.email));
      if (isAdmin()) who.appendChild(el('span', 'chipst st-aprobado', 'Admin'));
      var out = el('button', 'btn sm ghost', 'Salir'); out.type = 'button';
      out.addEventListener('click', async function () { await B.signOut(); location.hash = '#inicio'; });
      who.appendChild(out);
    } else {
      var a = el('a', 'btn sm', 'Entrar'); a.href = '#entrar'; who.appendChild(a);
    }
    $('navCuenta').hidden = !state.user;
    $('navAdmin').hidden = !isAdmin();
    $('demoBanner').hidden = B.mode !== 'demo';
    $('demoLogins').hidden = B.mode !== 'demo';
    $('footText').textContent = C.brand + ' · ' + (B.mode === 'demo' ? 'Demostración, sin cobros reales' : 'Pagos por Nequi');
    document.title = C.brand;
    $('brandLink').textContent = C.brand;
    $('h-inicio').textContent = C.brand;
  }
  function parseHash() {
    var h = location.hash.slice(1);
    if (h.indexOf('anuncio-') === 0 && h.length > 8) return { view: 'ficha', id: h.slice(8) };
    if (h === 'terminos' || h === 'privacidad') return { view: 'legal', id: h };
    return { view: VIEWS.indexOf(h) >= 0 ? h : 'inicio' };
  }
  var lastView = null;
  function renderLegal(id) {
    var doc = window.PB_LEGAL && window.PB_LEGAL[id];
    var box = $('legalBody');
    box.textContent = '';
    if (!doc) return;
    box.appendChild(el('h2', '', doc.title));
    box.appendChild(el('p', 'fine', 'Última actualización: ' + C.legal.updated + '. Borrador pendiente de revisión legal.'));
    doc.sections(C.legal).forEach(function (sec) {
      box.appendChild(el('h3', '', sec.t));
      sec.p.forEach(function (t) { box.appendChild(el('p', '', t)); });
    });
  }
  $('legalBack').addEventListener('click', function (e) {
    if (history.length > 1) { e.preventDefault(); history.back(); }
  });
  function route() {
    var p = parseHash(), v = p.view;
    if (['cuenta', 'pago', 'admin'].indexOf(v) >= 0 && !state.user && state.authReady) {
      state.afterLogin = '#' + v; v = 'entrar';
      if (location.hash !== '#entrar') location.hash = '#entrar';
    }
    state.fichaId = v === 'ficha' ? p.id : null;
    state.view = v;
    $('houseBox').hidden = v !== 'inicio';
    ['inicio', 'ficha', 'anunciar', 'entrar', 'cuenta', 'pago', 'admin', 'legal'].forEach(function (n) { $('v-' + n).hidden = n !== v; });
    Array.prototype.forEach.call(document.querySelectorAll('.nav a'), function (a) {
      var w = a.getAttribute('data-view');
      if (w === v || (v === 'ficha' && w === 'inicio')) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current');
    });
    var key = v + (p.id || '');
    if (key !== lastView) { lastView = key; fichaShown = null; window.scrollTo(0, 0); }
    if (v === 'entrar') setAuthMode(state.authMode);
    if (v === 'legal') renderLegal(p.id);
    renderPlus();
  }
  window.addEventListener('hashchange', function () { route(); renderAll(); });

  function renderAll() {
    renderChrome();
    renderHome();
    renderFicha();
    renderForm();
    renderCuenta();
    renderPago();
    renderAdmin();
    route();
  }
  $('seedBtn').addEventListener('click', function () { B.seed(); });
  $('resetBtn').addEventListener('click', function () { B.reset(); state.cfgFilled = false; location.hash = '#inicio'; });

  function onErr() { state.status = 'error'; renderAll(); }
  function subscribeUser() {
    if (state.unsubOrders) { state.unsubOrders(); state.unsubOrders = null; }
    if (state.unsubOwn) { state.unsubOwn(); state.unsubOwn = null; }
    if (state.unsubNotices) { state.unsubNotices(); state.unsubNotices = null; }
    state.orders = []; state.myAds = []; state.notices = [];
    if (!state.user) return;
    if (B.watchNotices) state.unsubNotices = B.watchNotices(state.user, function (l) { state.notices = l; renderAll(); }, onErr);
    state.unsubOrders = B.watchOrders(state.user, function (l) { state.orders = l; renderAll(); }, onErr);
    state.unsubOwn = B.watchOwnAds(state.user, function (l) { state.myAds = l; renderAll(); }, onErr);
  }

  async function init() {
    buildFilters();
    buildForm();
    setAuthMode('in');
    var q = new URLSearchParams(location.search);

    renderAll();
    var timer = setTimeout(function () { if (state.status === 'loading') { state.status = 'slow'; renderAll(); } }, 10000);
    try { await B.init(); } catch (e) { clearTimeout(timer); state.status = 'error'; renderAll(); return; }
    B.watchPublicAds(function (l) { state.ads = l || []; state.status = 'ok'; clearTimeout(timer); renderAll(); }, onErr);
    B.watchConfig(function (c) { state.config = c; renderAll(); }, onErr);
    B.onAuth(function (u) {
      var prev = state.user && state.user.uid;
      state.user = u; state.authReady = true;
      if ((u && u.uid) !== prev || (u && !state.unsubOrders)) { state.cfgFilled = false; subscribeUser(); }
      renderAll();
    });
  }
  init();
})();
