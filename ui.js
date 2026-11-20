/* Núcleo de la página: estado, utilidades, íconos y tarjetas. Lo usan las demás pantallas a través de window.PB. */
(function () {
  'use strict';
  var C = window.PB_CONFIG;
  var PB = window.PB = {};
  PB.C = C;
  PB.B = (C.mode === 'firebase' && window.PBFirebase) ? window.PBFirebase : window.PBDemo;
  PB.DAY = 86400000;
  PB.reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  PB.STATUS = { revision: 'En revisión', por_pagar: 'Aceptada: falta pagar', pago_reportado: 'Pago avisado', aprobado: 'Publicado', rechazado: 'No aceptada' };
  PB.OPEN = ['revision', 'por_pagar', 'pago_reportado'];
  PB.TIER_ORDER = ['premium', 'banner', 'destacado', 'mediano', 'pequeno'];

  PB.state = {
    status: 'loading', authReady: false, user: null,
    ads: [], myAds: [], orders: [], notices: [], config: null,
    filters: { q: '', loc: '', zona: '', cat: '' },
    view: 'inicio', fichaId: null, payOrder: null, afterLogin: '#cuenta',
    rank: {}, bIdx: 0, bTimer: null, pIdx: 0, pTimer: null, allLocs: false
  };

  // ---------- Utilidades ----------
  PB.$ = function (id) { return document.getElementById(id); };
  PB.el = function (tag, cls, text) { var n = document.createElement(tag); if (cls) n.className = cls; if (text !== undefined) n.textContent = text; return n; };
  PB.clip = function (s, n) { return String(s == null ? '' : s).slice(0, n); };
  var moneyFmt = new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 });
  PB.money = function (n) { return moneyFmt.format(n || 0); };
  PB.fmtDate = function (ms) { return new Date(ms).toLocaleDateString('es-CO', { day: 'numeric', month: 'short', year: 'numeric' }); };
  PB.longDate = function (ms) { return new Date(ms).toLocaleDateString('es-CO', { day: 'numeric', month: 'long', year: 'numeric' }); };
  PB.fmtDateTime = function (ms) { return new Date(ms).toLocaleString('es-CO', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }); };
  PB.setMsg = function (node, text, kind) { node.textContent = text || ''; node.className = 'msg' + (kind ? ' ' + kind : ''); };
  PB.norm = function (s) { return String(s == null ? '' : s).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, ''); };
  PB.cfg = function () { return C.resolve(PB.state.config); };
  // ---------- Lanzamiento gratis y precios tachados ----------
  PB.launchOn = function () { return C.launchOpen(PB.state.config); };
  // Precio de un espacio: en lanzamiento sale el precio normal tachado y $0.
  PB.priceNode = function (amount, cls) {
    var s = PB.el('span', cls || 'ptag');
    if (PB.launchOn()) { s.classList.add('launch'); s.appendChild(PB.el('s', '', PB.money(amount))); s.appendChild(PB.el('b', '', '$0')); }
    else s.appendChild(PB.el('b', '', PB.money(amount)));
    return s;
  };
  // Elección hecha en la página pública (espacio, duración, diseño): se guarda para el formulario de /mipanel.
  PB.pick = function (tier, days, need) {
    try { sessionStorage.setItem('pb-pick', JSON.stringify({ tier: tier, days: days || 30, need: !!need })); } catch (e) {}
  };
  PB.takePick = function () {
    try { var v = JSON.parse(sessionStorage.getItem('pb-pick') || 'null'); sessionStorage.removeItem('pb-pick'); return v; } catch (e) { return null; }
  };
  PB.palOf = function (i) { i = parseInt(i, 10); return C.palettes[i >= 0 && i < C.palettes.length ? i : 0]; };
  PB.isAdmin = function () { return !!(PB.state.user && PB.state.user.admin); };
  PB.safeMedia = function (m) { return !!(m && m.url && /^(https:|blob:|data:image\/)/.test(m.url) && (m.type === 'image' || m.type === 'video')); };
  PB.tierLabel = function (t) { return C.tiers[t] ? C.tiers[t].label : 'Sin espacio'; };
  PB.daysLeft = function (ad) { return Math.ceil((Number(ad.endsAt) - Date.now()) / PB.DAY); };
  PB.visible = function (ad) { return !!ad && ad.active === true && Number(ad.endsAt) > Date.now(); };
  PB.findAd = function (id) {
    var s = PB.state;
    return s.ads.filter(function (x) { return x.id === id; })[0] || s.myAds.filter(function (x) { return x.id === id; })[0] || null;
  };
  PB.go = function (hash) { if (location.hash === hash) window.dispatchEvent(new Event('hashchange')); else location.hash = hash; };
  PB.adCats = function (ad) {
    if (Array.isArray(ad.cats) && ad.cats.length) return ad.cats.slice(0, C.maxCats);
    return ad.categoria ? [ad.categoria] : [];
  };
  PB.waNum = function (n) { var d = String(n || '').replace(/\D/g, ''); return d.length === 10 ? '57' + d : d; };
  PB.waLink = function (num, text) { return 'https://wa.me/' + num + '?text=' + encodeURIComponent(text); };

  // ---------- Datos de contacto ----------
  PB.normPhone = function (s) {
    var d = String(s || '').replace(/\D/g, '');
    if (!d) return '';
    if (d.length === 10) d = '57' + d;
    return d.length >= 7 && d.length <= 15 ? d : null;
  };
  PB.normMail = function (s) {
    s = String(s || '').trim().toLowerCase();
    if (!s) return '';
    return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(s) && s.length <= 100 ? s : null;
  };
  PB.normWeb = function (s) {
    s = String(s || '').trim();
    if (!s) return '';
    if (!/^https?:\/\//i.test(s)) s = 'https://' + s;
    try {
      var u = new URL(s);
      if ((u.protocol !== 'https:' && u.protocol !== 'http:') || u.hostname.indexOf('.') < 0) return null;
      return u.href.length <= 200 ? u.href : null;
    } catch (e) { return null; }
  };
  PB.errText = function (e) {
    var c = (e && e.code) || '';
    if (c === 'auth/invalid-credential' || c === 'auth/wrong-password' || c === 'auth/user-not-found') return 'Correo o contraseña incorrectos.';
    if (c === 'auth/email-already-in-use') return 'Ese correo ya tiene una cuenta. Entra con tu contraseña.';
    if (c === 'auth/weak-password') return 'La contraseña debe tener mínimo 8 caracteres, con letras y números.';
    if (c === 'auth/invalid-email') return 'Ese correo no es válido.';
    if (c === 'auth/too-many-requests') return 'Demasiados intentos. Espera unos minutos.';
    if (c === 'auth/network-request-failed') return 'No hay conexión. Revisa tu internet.';
    if (c === 'permission-denied' || c === 'functions/permission-denied') return 'Tu cuenta no tiene permiso para esto.';
    if (e && e.message && /^(Ese|Inicia|Solo|No |El navegador|Tu |Completa|Elige|Ya |La |Cuéntanos|Escribe)/.test(e.message)) return e.message;
    return 'No se pudo completar. Inténtalo de nuevo.';
  };

  // ---------- Íconos ----------
  var P = {
    tag: '<path d="M12.586 2.586A2 2 0 0 0 11.172 2H4a2 2 0 0 0-2 2v7.172a2 2 0 0 0 .586 1.414l8.704 8.704a2.426 2.426 0 0 0 3.42 0l6.58-6.58a2.426 2.426 0 0 0 0-3.42z"/><circle cx="7.5" cy="7.5" r="1" fill="currentColor"/>',
    search: '<circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>',
    pin: '<path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/>',
    utensils: '<path d="M3 2v7c0 1.1.9 2 2 2h4a2 2 0 0 0 2-2V2"/><path d="M7 2v20"/><path d="M21 15V2a5 5 0 0 0-5 5v6c0 1.1.9 2 2 2h3Zm0 0v7"/>',
    cpu: '<rect width="16" height="16" x="4" y="4" rx="2"/><rect width="6" height="6" x="9" y="9" rx="1"/><path d="M15 2v2M15 20v2M2 15h2M2 9h2M20 15h2M20 9h2M9 2v2M9 20v2"/>',
    sparkles: '<path d="M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.936A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .963 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.581a.5.5 0 0 1 0 .964L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.963 0z"/><path d="M20 3v4M22 5h-4M4 17v2M5 18H3"/>',
    shirt: '<path d="M20.38 3.46 16 2a4 4 0 0 1-8 0L3.62 3.46a2 2 0 0 0-1.34 2.23l.58 3.47a1 1 0 0 0 .99.84H6v10c0 1.1.9 2 2 2h8a2 2 0 0 0 2-2V10h2.15a1 1 0 0 0 .99-.84l.58-3.47a2 2 0 0 0-1.34-2.23z"/>',
    stethoscope: '<path d="M11 2v2M5 2v2M5 3H4a2 2 0 0 0-2 2v4a6 6 0 0 0 12 0V5a2 2 0 0 0-2-2h-1"/><path d="M8 15a6 6 0 0 0 12 0v-3"/><circle cx="20" cy="10" r="2"/>',
    car: '<path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.4 2.9A3.7 3.7 0 0 0 2 12v4c0 .6.4 1 1 1h2"/><circle cx="7" cy="17" r="2"/><path d="M9 17h6"/><circle cx="17" cy="17" r="2"/>',
    sofa: '<path d="M20 9V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v3"/><path d="M2 16a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-5a2 2 0 0 0-4 0v1.5a.5.5 0 0 1-.5.5h-11a.5.5 0 0 1-.5-.5V11a2 2 0 0 0-4 0z"/><path d="M4 18v2M20 18v2"/>',
    briefcase: '<path d="M16 20V4a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/><rect width="20" height="14" x="2" y="6" rx="2"/>',
    store: '<path d="m2 7 4.41-4.41A2 2 0 0 1 7.83 2h8.34a2 2 0 0 1 1.42.59L22 7"/><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/><path d="M15 22v-4a2 2 0 0 0-2-2h-2a2 2 0 0 0-2 2v4"/><path d="M2 7h20"/><path d="M22 7v3a2 2 0 0 1-2 2 2.7 2.7 0 0 1-2-.8 2.7 2.7 0 0 1-4 0 2.7 2.7 0 0 1-4 0 2.7 2.7 0 0 1-4 0A2.7 2.7 0 0 1 4 12a2 2 0 0 1-2-2V7"/>',
    megaphone: '<path d="m3 11 18-5v12L3 14v-3z"/><path d="M11.6 16.8a3 3 0 1 1-5.8-1.6"/>',
    clock: '<circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>',
    phone: '<path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/>',
    globe: '<circle cx="12" cy="12" r="10"/><path d="M2 12h20"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>',
    mail: '<rect width="20" height="16" x="2" y="4" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/>',
    share: '<circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><path d="m8.59 13.51 6.83 3.98M15.41 6.51l-6.82 3.98"/>',
    chat: '<path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z"/>',
    calendar: '<path d="M21 7.5V6a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h3.5"/><path d="M16 2v4M8 2v4M3 10h5"/><circle cx="16" cy="16" r="6"/><path d="M16 13.5V16l1.6 1.2"/>',
    upload: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" x2="12" y1="3" y2="15"/>',
    palette: '<circle cx="13.5" cy="6.5" r="1" fill="currentColor"/><circle cx="17.5" cy="10.5" r="1" fill="currentColor"/><circle cx="8.5" cy="7.5" r="1" fill="currentColor"/><circle cx="6.5" cy="12.5" r="1" fill="currentColor"/><path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.648-.746 1.648-1.688 0-.437-.18-.835-.437-1.125-.29-.289-.438-.652-.438-1.125a1.64 1.64 0 0 1 1.668-1.668h1.996c3.051 0 5.555-2.503 5.555-5.554C21.965 6.012 17.461 2 12 2z"/>',
    check: '<path d="M20 6 9 17l-5-5"/>',
    arrow: '<path d="M5 12h14M12 5l7 7-7 7"/>',
    chevron: '<path d="m9 18 6-6-6-6"/>',
    star: '<polygon fill="currentColor" points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>',
    plus: '<path d="M5 12h14M12 5v14"/>',
    imageplus: '<path d="M16 5h6M19 2v6"/><path d="M21 11.5V19a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h7.5"/><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/><circle cx="9" cy="9" r="2"/>',
    layers: '<path d="m12.83 2.18a2 2 0 0 0-1.66 0L2.6 6.08a1 1 0 0 0 0 1.83l8.58 3.91a2 2 0 0 0 1.66 0l8.58-3.9a1 1 0 0 0 0-1.83Z"/><path d="m22 17.65-9.17 4.16a2 2 0 0 1-1.66 0L2 17.65"/><path d="m22 12.65-9.17 4.16a2 2 0 0 1-1.66 0L2 12.65"/>',
    menu: '<path d="M4 6h16M4 12h16M4 18h16"/>',
    x: '<path d="M18 6 6 18M6 6l12 12"/>',
    eye: '<path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>'
  };
  PB.svg = function (name) {
    return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">' + (P[name] || P.tag) + '</svg>';
  };
  PB.ic = function (name, cls) { var s = PB.el('span', 'ic' + (cls ? ' ' + cls : '')); s.innerHTML = PB.svg(name); return s; };
  PB.hydrate = function (root) {
    Array.prototype.forEach.call((root || document).querySelectorAll('.ic[data-ic]'), function (n) {
      if (!n.firstChild) n.innerHTML = PB.svg(n.getAttribute('data-ic'));
    });
  };
  PB.catIcon = function (name) { var m = C.catMeta[name]; return m ? m.icon : 'store'; };

  // ---------- Listas y selectores ----------
  PB.fillSelect = function (sel, first, items) {
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
  };
  // Localidades y municipios en dos grupos.
  PB.fillLocs = function (sel, first) {
    var cur = sel.value;
    sel.textContent = '';
    var o0 = document.createElement('option'); o0.value = ''; o0.textContent = first; sel.appendChild(o0);
    [['Localidades de Bogotá', C.localidades], ['Municipios cercanos', C.municipios]].forEach(function (g) {
      var og = document.createElement('optgroup'); og.label = g[0];
      g[1].forEach(function (n) { var o = document.createElement('option'); o.value = n; o.textContent = n; og.appendChild(o); });
      sel.appendChild(og);
    });
    sel.value = cur;
  };
  PB.rankOf = function (id) { var r = PB.state.rank; if (r[id] == null) r[id] = Math.random(); return r[id]; };
  PB.byRank = function (a, b) { return PB.rankOf(a.id) - PB.rankOf(b.id); };
  PB.tierRank = function (t) { var i = PB.TIER_ORDER.indexOf(t); return i < 0 ? 9 : i; };

  // ---------- Anuncios: imagen, valla y tarjeta ----------
  PB.mediaNode = function (m, full) {
    var box = PB.el('div', 'pmedia');
    if (m.type === 'video') {
      var v = document.createElement('video');
      v.src = m.url; v.playsInline = true; v.preload = 'metadata';
      if (full) { v.controls = true; } else { v.muted = true; v.loop = true; v.autoplay = !PB.reduce; }
      box.appendChild(v);
    } else {
      var im = document.createElement('img');
      im.src = m.url; im.alt = ''; im.loading = 'lazy';
      box.appendChild(im);
    }
    return box;
  };
  PB.locLine = function (ad) {
    var parts = [];
    if (ad.barrio) parts.push(ad.barrio);
    if (ad.localidad) parts.push(ad.localidad);
    return parts.join(', ');
  };
  // Imagen del negocio o, si no tiene, un bloque de color con el ícono de su categoría.
  PB.imageBlock = function (ad, full) {
    if (PB.safeMedia(ad.media)) return PB.mediaNode(ad.media, !!full);
    var pal = PB.palOf(ad.pal);
    var ph = PB.el('div', 'ph');
    ph.style.setProperty('--pbg', pal.bg);
    ph.style.setProperty('--pfg', pal.fg);
    ph.appendChild(PB.ic(PB.catIcon(PB.adCats(ad)[0])));
    return ph;
  };
  PB.isFeatured = function (ad) { return ['destacado', 'banner', 'premium'].indexOf(ad.tier) >= 0; };
  PB.bizCard = function (ad) {
    var featured = PB.isFeatured(ad);
    var a = PB.el('a', 'deal' + (featured ? '' : ' plain') + (ad.tier === 'pequeno' ? ' compact' : ''));
    a.href = '#anuncio-' + ad.id;
    var img = PB.el('div', 'deal-img');
    img.appendChild(PB.imageBlock(ad, false));
    if (ad.offer) img.appendChild(PB.el('span', 'pill y', PB.clip(ad.offer, 16)));
    if (featured && ad.tier !== 'pequeno') { var f = PB.el('span', 'pill n'); f.appendChild(PB.ic('star')); f.appendChild(document.createTextNode(' Destacado')); img.appendChild(f); }
    a.appendChild(img);
    var b = PB.el('div', 'deal-b');
    var cats = PB.adCats(ad);
    if (cats.length && ad.tier !== 'pequeno') { var t = PB.el('div', 'tags'); cats.slice(0, 2).forEach(function (c) { t.appendChild(PB.el('span', 'tag', c)); }); b.appendChild(t); }
    b.appendChild(PB.el('h3', '', PB.clip(ad.brand || ad.headline || 'Negocio', 40)));
    if (ad.headline) b.appendChild(PB.el('p', 'deal-h', PB.clip(ad.headline, 60)));
    var op = ad.hours && PB.openNow ? PB.openNow(ad.hours) : null;
    if (op) b.appendChild(PB.el('p', 'deal-open ' + (op.open ? 'on' : 'off'), op.open ? 'Abierto ahora' : 'Cerrado ahora'));
    var loc = PB.locLine(ad);
    if (loc) { var l = PB.el('p', 'deal-loc'); l.appendChild(PB.ic('pin')); l.appendChild(document.createTextNode(' ' + loc)); b.appendChild(l); }
    a.appendChild(b);
    return a;
  };
  // Valla (Plus y banner) o vista previa de un anuncio en un espacio.
  PB.poster = function (ad, o) {
    o = o || {};
    var tier = ad.tier || 'destacado';
    var pal = PB.palOf(ad.pal);
    var withMedia = PB.safeMedia(ad.media);
    var imgOnly = withMedia && !ad.headline;
    var p = PB.el(o.click ? 'button' : 'article', 'poster s-' + tier + (withMedia ? ' hasmedia' : '') + (imgOnly ? ' imgonly' : '') + (o.click ? ' click' : ''));
    if (o.click) { p.type = 'button'; p.setAttribute('aria-label', 'Ver ficha de ' + PB.clip(ad.brand || ad.headline || 'este anuncio', 30)); }
    p.style.setProperty('--pbg', pal.bg);
    p.style.setProperty('--pfg', pal.fg);
    if (withMedia) { p.appendChild(PB.mediaNode(ad.media, false)); if (!imgOnly) p.appendChild(PB.el('div', 'pshade')); }
    if (!imgOnly) {
      var top = PB.el('div', 'ptop');
      top.appendChild(PB.el('span', 'ptag', tier === 'premium' ? 'Plus' : tier === 'banner' ? 'Banner' : tier === 'destacado' ? 'Destacado' : 'Anuncio'));
      top.appendChild(PB.el('span', 'pbrand', PB.clip(ad.brand, 40)));
      var mid = PB.el('div', 'pmid');
      mid.appendChild(PB.el('h3', 'phead', PB.clip(ad.headline, 60)));
      if (ad.body) mid.appendChild(PB.el('p', 'pbody', PB.clip(ad.body, 300)));
      p.appendChild(top); p.appendChild(mid);
      p.appendChild(PB.el('p', 'ploc', PB.locLine(ad)));
    }
    if (o.click) p.addEventListener('click', function () { location.hash = '#anuncio-' + ad.id; });
    return p;
  };
  PB.tile = function (ad, o) { var t = PB.el('div', 'tile'); t.appendChild(PB.poster(ad, o)); return t; };

  // ---------- Conteo de visitas y clics ----------
  var tracked = {};
  PB.trackOnce = function (ad, field) {
    var s = PB.state;
    if (!ad || !s.authReady) return;
    if (PB.isAdmin() || (s.user && ad.uid === s.user.uid)) return;
    var k = ad.id + ':' + field;
    if (tracked[k]) return;
    try { if (sessionStorage.getItem('pb-t-' + k)) { tracked[k] = true; return; } sessionStorage.setItem('pb-t-' + k, '1'); } catch (e) {}
    tracked[k] = true;
    PB.B.track(ad.id, field).catch(function () {});
  };

  // ---------- Pedidos: textos comunes ----------
  PB.orderTitle = function (o) {
    if (o.renewOf) return 'Renovación · ' + PB.clip(o.brand, 30);
    if (!o.tier) return 'Diseño · ' + o.designPieces + (o.designPieces === 1 ? ' pieza' : ' piezas');
    return PB.tierLabel(o.tier) + ' (' + C.durLabel(o.days || C.termDays) + ')' + (o.designPieces ? ' + diseño' : '') + ' · ' + PB.clip(o.brand, 30);
  };
  PB.payLabel = function (o) {
    if (o.status === 'revision') return 'Sin cobrar todavía';
    if (o.status === 'rechazado') return 'No se cobró';
    if (o.promo && !o.amount) return 'Gratis (lanzamiento)';
    if (o.status === 'por_pagar') return 'Por pagar';
    if (o.status === 'pago_reportado') return 'Pago avisado, por confirmar';
    return 'Pagado';
  };
  PB.ref = function (o) { return String(o.id || '').slice(-6).toUpperCase(); };
  PB.statusLine = function (o) {
    if (o.status === 'revision') return 'Recibimos tu solicitud. La revisamos y te avisamos si la aceptamos. No pagas nada todavía.';
    if (o.status === 'por_pagar') return o.amount ? 'Aceptamos tu solicitud. Falta el pago para publicarla.' : 'Aceptamos tu solicitud.';
    if (o.status === 'pago_reportado') return 'Avisaste que pagaste. Cuando confirmemos el pago se publica.';
    if (o.status === 'aprobado') {
      if (o.renewOf) return 'Tu anuncio fue renovado por ' + C.durLabel(o.days || C.termDays) + '.';
      if (!o.tier) return 'Tu diseño está listo. Te contactamos por los datos que dejaste.';
      var ad = PB.findAd(o.id);
      if (ad && o.designPieces > 0 && ad.active !== true && !ad.startsAt) return 'Estamos preparando tu diseño. Cuando esté listo se publica y te avisamos.';
      if (ad && PB.visible(ad)) return 'Tu anuncio está publicado hasta el ' + PB.fmtDate(ad.endsAt) + '.';
      return 'Tu anuncio fue aprobado.';
    }
    if (o.status === 'rechazado') return 'No pudimos aceptar esta solicitud' + (o.rejectReason ? ': ' + o.rejectReason : '.') + ' No se te cobró nada.';
    return '';
  };
  // Cómo pagar: se muestra cuando el administrador ya aceptó la solicitud.
  PB.payBox = function (o, msgNode) {
    var box = PB.el('div', 'paybox');
    if (C.pago.nequi) {
      box.appendChild(PB.el('p', '', 'Paga ' + PB.money(o.amount) + ' por Nequi al ' + C.pago.nequi + ' (' + C.pago.titular + ').'));
      box.appendChild(PB.el('p', 'fine', 'En el mensaje del pago escribe tu referencia: ' + PB.ref(o) + '. Luego envíanos el comprobante por WhatsApp.'));
    } else {
      box.appendChild(PB.el('p', '', 'Valor a pagar: ' + PB.money(o.amount) + '. Escríbenos por WhatsApp y te enviamos la llave de pago.'));
      box.appendChild(PB.el('p', 'fine', 'Indica tu referencia: ' + PB.ref(o) + '. Cuando pagues, envía el comprobante por el mismo chat y pulsa "Ya pagué".'));
    }
    var acts = PB.el('div', 'acts');
    var wa = PB.el('a', 'btn sm ghost', C.pago.nequi ? 'Enviar comprobante por WhatsApp' : 'Pedir llave de pago por WhatsApp');
    wa.href = PB.waLink(PB.waNum(C.pago.whatsapp), (C.pago.nequi ? 'Hola, pagué ' + PB.money(o.amount) + ' por mi anuncio en ' : 'Hola, quiero pagar ' + PB.money(o.amount) + ' por mi anuncio en ') + C.brand + '. Referencia ' + PB.ref(o) + '.');
    wa.target = '_blank'; wa.rel = 'noopener noreferrer'; acts.appendChild(wa);
    if (o.status === 'por_pagar') {
      var yp = PB.el('button', 'btn sm yellow', 'Ya pagué'); yp.type = 'button';
      yp.addEventListener('click', async function () {
        try { await PB.B.reportPaid(o.id); } catch (err) { if (msgNode) PB.setMsg(msgNode, PB.errText(err), 'err'); }
      });
      acts.appendChild(yp);
    } else {
      acts.appendChild(PB.el('span', 'meta', 'Avisaste del pago. Esperando que lo confirmemos.'));
    }
    box.appendChild(acts);
    return box;
  };
})();
