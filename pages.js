/* Páginas públicas: inicio, directorio, ofertas, planes y ficha del negocio. */
(function () {
  'use strict';
  var PB = window.PB, C = PB.C, $ = PB.$, el = PB.el, state = PB.state;

  // ---------- Filtros ----------
  function emptyFilters() { return { q: '', loc: '', zona: '', cat: '' }; }
  PB.setFilters = function (f) { state.filters = Object.assign(emptyFilters(), f || {}); };
  function filtering() { var f = state.filters; return !!(f.q || f.loc || f.zona || f.cat); }
  function matches(ad) {
    var f = state.filters;
    if (f.loc && ad.localidad !== f.loc) return false;
    if (f.cat && PB.adCats(ad).indexOf(f.cat) < 0) return false;
    if (f.zona && PB.norm(ad.barrio).indexOf(PB.norm(f.zona.trim())) < 0) return false;
    if (f.q) {
      var hay = PB.norm([ad.brand, ad.headline, ad.body, ad.barrio, PB.adCats(ad).join(' '), ad.localidad, ad.address, ad.offer].join(' '));
      var words = PB.norm(f.q).split(/\s+/).filter(Boolean);
      if (!words.every(function (w) { return hay.indexOf(w) >= 0; })) return false;
    }
    return true;
  }
  function sortAds(list) {
    return list.slice().sort(function (a, b) { return (PB.tierRank(a.tier) - PB.tierRank(b.tier)) || PB.byRank(a, b); });
  }
  function visibleAds() { return state.ads.filter(PB.visible); }
  function countBy(fn) {
    var n = {};
    visibleAds().forEach(function (ad) { fn(ad).forEach(function (k) { n[k] = (n[k] || 0) + 1; }); });
    return n;
  }
  function plural(n, one, many) { return n + ' ' + (n === 1 ? one : many); }

  // ---------- Banner Plus y banners (vallas) ----------
  PB.renderPlus = function () {
    var box = $('plusBox');
    if (state.pTimer) { clearInterval(state.pTimer); state.pTimer = null; }
    box.textContent = '';
    // Franja de arriba: Plus + anuncios Destacados que tienen imagen de banner. El Plus se intercala para verse más veces.
    var withTop = state.ads.filter(function (a) { return C.hasTop(a.tier) && PB.visible(a) && PB.safeMedia(a.media2); }).sort(PB.byRank);
    var plus = withTop.filter(function (a) { return a.tier === 'premium'; }), dest = withTop.filter(function (a) { return a.tier !== 'premium'; });
    var list = plus.slice(), pi = 0;
    dest.forEach(function (d) { list.push(d); if (plus.length) list.push(plus[pi++ % plus.length]); }); // el Plus se ve más veces
    var show = list.length && ['admin', 'pago', 'anunciar', 'entrar', 'contrato', 'informe'].indexOf(state.view) < 0;
    box.hidden = !show;
    if (!show) return;
    if (state.pIdx >= list.length) state.pIdx = 0;
    box.appendChild(PB.topBanner(list[state.pIdx]));
    if (list.length > 1 && !PB.reduce) state.pTimer = setInterval(function () { state.pIdx = (state.pIdx + 1) % list.length; PB.renderPlus(); }, 7000);
  };

  // ---------- Inicio ----------
  var TIER_ASC = ['pequeno', 'mediano', 'destacado', 'premium'];
  // Carrusel de cuadros con negocios/promociones activos, en orden aleatorio por visita (sin ventaja por plan).
  var vitOrder = {}, vitTimer = null, vitWired = false;
  function renderVit(vis) {
    var sec = $('secVit'), tr = $('vitTrack');
    if (!sec || !tr) return;
    var list = vis.filter(function (a) { return PB.safeMedia(a.media) || a.headline; });
    sec.hidden = !list.length;
    clearInterval(vitTimer);
    if (!list.length) return;
    list.forEach(function (a) { if (vitOrder[a.id] == null) vitOrder[a.id] = Math.random(); });
    list.sort(function (a, b) { return vitOrder[a.id] - vitOrder[b.id]; });
    var keep = tr.scrollLeft; tr.textContent = '';
    list.slice(0, 20).forEach(function (a) {
      var l = el('a', 'vit-card'); l.href = '#anuncio-' + a.id;
      var im = el('div', 'vit-img'); im.appendChild(PB.imageBlock(a, false)); l.appendChild(im);
      var cap = el('div', 'vit-cap'); cap.appendChild(el('b', '', PB.clip(a.brand || a.headline, 28)));
      if (a.offer) cap.appendChild(el('span', 'pill y', PB.clip(a.offer, 16)));
      l.appendChild(cap); tr.appendChild(l);
    });
    tr.scrollLeft = keep;
    function step(dir) {
      var w = (tr.firstChild ? tr.firstChild.offsetWidth : 240) + 14;
      if (dir > 0 && tr.scrollLeft + tr.clientWidth >= tr.scrollWidth - 4) tr.scrollTo({ left: 0, behavior: 'smooth' });
      else if (dir < 0 && tr.scrollLeft <= 4) tr.scrollTo({ left: tr.scrollWidth, behavior: 'smooth' });
      else tr.scrollBy({ left: dir * w, behavior: 'smooth' });
    }
    if (!vitWired) { vitWired = true; $('vitPrev').addEventListener('click', function () { step(-1); }); $('vitNext').addEventListener('click', function () { step(1); }); }
    if (!PB.reduce && list.length > 1) vitTimer = setInterval(function () { if (!tr.matches(':hover, :focus-within') && state.view === 'inicio') step(1); }, 4000);
  }

  PB.renderHome = function () {
    var vis = visibleAds();
    var ready = state.status === 'ok';
    var hc = $('heroCount');
    hc.hidden = !ready;
    if (ready) { hc.textContent = ''; hc.appendChild(el('b', '', String(vis.length))); hc.appendChild(document.createTextNode(vis.length === 1 ? ' negocio activo hoy en la plataforma' : ' negocios activos hoy en la plataforma')); }

    renderVit(vis);

    // Categorías
    var counts = countBy(PB.adCats);
    var cg = $('catGrid'); cg.textContent = '';
    C.categorias.forEach(function (name) {
      var m = C.catMeta[name] || {}, n = counts[name] || 0;
      var b = el('button', 'cat'); b.type = 'button';
      var ic = el('span', 'cat-ic'); ic.appendChild(PB.ic(m.icon || 'store')); b.appendChild(ic);
      b.appendChild(el('b', '', name));
      b.appendChild(el('small', '', m.desc || ''));
      var c = el('span', 'cat-c'); c.textContent = plural(n, 'negocio', 'negocios') + ' →'; b.appendChild(c);
      b.addEventListener('click', function () { PB.setFilters({ cat: name }); PB.go('#directorio'); });
      cg.appendChild(b);
    });

    // Ofertas destacadas
    var dest = sortAds(vis.filter(function (a) { return a.tier === 'destacado' || a.tier === 'premium'; })).slice(0, 6);
    $('secDest').hidden = !dest.length;
    var gd = $('gridDest'); gd.textContent = '';
    dest.forEach(function (a) { gd.appendChild(PB.bizCard(a)); });

    // Ubicación
    var lc = countBy(function (ad) { return ad.localidad ? [ad.localidad] : []; });
    var names = state.allLocs ? C.localidades : C.localidadesTop;
    var lg = $('locGrid'); lg.textContent = '';
    names.forEach(function (name) {
      var z = (C.zonas[name] || []).length, n = lc[name] || 0;
      var b = el('button', 'loc'); b.type = 'button';
      b.appendChild(el('b', '', name));
      b.appendChild(el('small', '', plural(z, 'zona', 'zonas') + ' · ' + plural(n, 'negocio', 'negocios')));
      b.addEventListener('click', function () { PB.setFilters({ loc: name }); PB.go('#directorio'); });
      lg.appendChild(b);
    });
    var ml = $('muniList'); ml.textContent = '';
    C.municipios.forEach(function (name) {
      var b = el('button', '', name); b.type = 'button';
      b.addEventListener('click', function () { PB.setFilters({ loc: name }); PB.go('#directorio'); });
      ml.appendChild(b);
    });
    var more = $('locMore'); more.textContent = '';
    more.appendChild(document.createTextNode(state.allLocs ? 'Ver menos ' : 'Ver las ' + C.localidades.length + ' localidades '));
    more.appendChild(PB.ic('arrow'));

    // Para comerciantes
    var cfg = PB.cfg();
    $('bizDesign').textContent = 'Diseño publicitario desde ' + PB.money(cfg.designPrice);
    var bp = $('bizPlans'); bp.textContent = '';
    TIER_ASC.forEach(function (t) {
      var row = el('div', 'bp');
      var l = el('div'); l.appendChild(el('b', '', C.tiers[t].label)); l.appendChild(el('small', '', C.tiers[t].note));
      var p = el('div', 'bp-p'); p.appendChild(el('span', '', '30 días')); p.appendChild(PB.priceNode(cfg.prices[t], 'ptag sm'));
      row.appendChild(l); row.appendChild(p); bp.appendChild(row);
    });
    void ready;
  };

  // ---------- Directorio ----------
  function emptyBox(box, filteringNow, anyVisible) {
    box.textContent = '';
    box.hidden = false;
    if (filteringNow && anyVisible) {
      box.appendChild(el('p', '', 'Ningún negocio coincide con esos filtros.'));
      var cl = el('button', 'btn sm ghost', 'Limpiar filtros'); cl.type = 'button'; cl.addEventListener('click', clearFilters);
      var a1 = el('div', 'acts'); a1.style.justifyContent = 'center'; a1.appendChild(cl); box.appendChild(a1);
    } else {
      box.appendChild(el('p', '', 'Todavía no hay negocios publicados.'));
      var go = el('a', 'btn sm yellow', 'Publica tu negocio'); go.href = '#anunciar';
      var a2 = el('div', 'acts'); a2.style.justifyContent = 'center'; a2.appendChild(go); box.appendChild(a2);
    }
  }
  function clearFilters() { PB.setFilters(); PB.renderDirectorio(); }
  PB.renderDirectorio = function () {
    var ready = state.status === 'ok';
    var vis = visibleAds();
    var list = sortAds(vis.filter(matches));
    var f = state.filters;
    // Sincroniza los campos con el filtro (sin pisar lo que se está escribiendo)
    if ($('fl-q').value !== f.q) $('fl-q').value = f.q;
    if ($('fl-loc').value !== f.loc) $('fl-loc').value = f.loc;
    if ($('fl-zona').value !== f.zona) $('fl-zona').value = f.zona;
    var cl = $('catList'); cl.textContent = '';
    var counts = countBy(PB.adCats);
    [''].concat(C.categorias).forEach(function (name) {
      var b = el('button'); b.type = 'button';
      b.setAttribute('aria-pressed', f.cat === name ? 'true' : 'false');
      b.appendChild(name ? PB.ic(PB.catIcon(name)) : PB.ic('layers'));
      b.appendChild(el('span', '', name || 'Todas las categorías'));
      b.addEventListener('click', function () { state.filters.cat = name; PB.renderDirectorio(); });
      cl.appendChild(b);
    });
    void counts;
    $('resultCount').textContent = ready ? plural(list.length, 'resultado', 'resultados') : '';
    var g = $('dirGrid'); g.textContent = '';
    list.forEach(function (a) { g.appendChild(PB.bizCard(a)); });
    var n = $('dataNote'), t = '';
    if (state.status === 'error') t = 'No se pudieron leer los datos del sitio. Recarga la página.';
    else if (state.status === 'slow') t = 'Los datos tardan en responder. Lo que ves puede estar desactualizado.';
    n.textContent = t; n.hidden = !t; n.className = 'note' + (state.status === 'error' ? ' bad' : '');
    var eb = $('emptyBox');
    if (ready && !list.length) emptyBox(eb, filtering(), vis.length > 0); else eb.hidden = true;
  };

  // ---------- Ofertas ----------
  PB.renderOfertas = function () {
    var ready = state.status === 'ok';
    var list = sortAds(visibleAds().filter(function (a) { return !!a.offer; }));
    $('offerCount').textContent = ready ? plural(list.length, 'oferta vigente', 'ofertas vigentes') : '';
    var g = $('offerGrid'); g.textContent = '';
    list.forEach(function (a) { g.appendChild(PB.bizCard(a)); });
    var eb = $('offerEmpty');
    if (ready && !list.length) {
      eb.textContent = ''; eb.hidden = false;
      eb.appendChild(el('p', '', 'Todavía no hay ofertas publicadas. ¿Tienes una promoción? Agrégale un sello de oferta a tu anuncio.'));
      var go = el('a', 'btn sm yellow', 'Publica tu negocio'); go.href = '#anunciar';
      var a2 = el('div', 'acts'); a2.style.justifyContent = 'center'; a2.appendChild(go); eb.appendChild(a2);
    } else eb.hidden = true;
  };

  // ---------- Planes y precios ----------
  var FEATURES = {
    pequeno: ['Ficha con contacto y WhatsApp', 'Aparece en búsquedas y filtros', 'Estadísticas de visitas y clics'],
    mediano: ['Todo lo del espacio pequeño', 'Foto grande en el directorio', 'Hasta 3 categorías'],
    destacado: ['Todo lo del espacio mediano', 'Banner de lado a lado arriba de todas las páginas', 'Tarjeta en las ofertas destacadas de la portada', 'Prioridad en los resultados y sello amarillo'],
    premium: ['Banner de lado a lado arriba de todas las páginas', 'Rota con solo 4 anuncios más (5 cupos)', 'Primero en las ofertas destacadas de la portada', 'Todo lo del plan Destacado']
  };
  var planDays = 30;
  PB.renderPlanes = function () {
    var cfg = PB.cfg();
    var du = $('plDurs'); du.textContent = '';
    C.durations.forEach(function (d) {
      var b = el('button', 'chip', d.label + (C.discPct(d.days) ? ' (-' + C.discPct(d.days) + '%)' : '')); b.type = 'button';
      b.setAttribute('aria-pressed', planDays === d.days ? 'true' : 'false');
      b.addEventListener('click', function () { planDays = d.days; PB.renderPlanes(); });
      du.appendChild(b);
    });
    var g = $('plGrid'); g.textContent = '';
    TIER_ASC.forEach(function (t) {
      var hot = t === 'destacado';
      var c = el('div', 'plan-card' + (hot ? ' hot' : ''));
      if (hot) c.appendChild(el('span', 'badge-hot', 'Más elegido'));
      c.appendChild(el('h3', '', C.tiers[t].label));
      c.appendChild(el('p', '', C.tiers[t].note));
      var pr = el('div', 'price');
      if (PB.launchOn()) pr.appendChild(PB.priceNode(C.priceFor(cfg.prices[t], planDays)));
      else { pr.appendChild(document.createTextNode(PB.money(C.priceFor(cfg.prices[t], planDays)))); if (C.discPct(planDays) > 0) pr.appendChild(el('s', '', PB.money(C.listFor(cfg.prices[t], planDays)))); }
      c.appendChild(pr);
      if (PB.launchOn()) c.appendChild(el('div', 'launch-tag', 'Gratis por lanzamiento'));
      c.appendChild(el('div', 'per', 'por ' + C.durLabel(planDays)));
      var ul = el('ul');
      FEATURES[t].forEach(function (x) { var li = el('li'); li.appendChild(PB.ic('check')); li.appendChild(el('span', '', x)); ul.appendChild(li); });
      var left = capLeft(t);
      var li2 = el('li'); li2.appendChild(PB.ic('layers'));
      li2.appendChild(el('span', '', 'Medida de la imagen: ' + C.sizeLabel(t) + (left === Infinity ? '' : ' · ' + (left > 0 ? 'quedan ' + left + ' de ' + cfg.caps[t] + ' cupos' : 'sin cupos por ahora'))));
      ul.appendChild(li2);
      c.appendChild(ul);
      var pick = el('button', 'btn ' + (hot ? 'yellow' : 'navy'), left === 0 ? 'Sin cupos' : 'Elegir este espacio'); pick.type = 'button'; pick.disabled = left === 0;
      pick.style.marginTop = 'auto';
      pick.addEventListener('click', function () { PB.pick(t, planDays); PB.go('#anunciar'); });
      c.appendChild(pick);
      g.appendChild(c);
    });
    if (PB.renderServices) PB.renderServices();
  };
  function capLeft(tier) {
    var cap = PB.cfg().caps[tier];
    if (!cap) return Infinity;
    var used = state.ads.filter(function (a) { return a.tier === tier && PB.visible(a); }).length;
    return Math.max(0, cap - used);
  }
  PB.capLeft = capLeft;

  // ---------- Ficha del negocio ----------
  var fichaShown = null;
  PB.resetFicha = function () { fichaShown = null; };
  function irow(icon, label, node) {
    var r = el('div', 'irow'); r.appendChild(PB.ic(icon));
    var d = el('div'); d.appendChild(el('small', '', label)); d.appendChild(node); r.appendChild(d);
    return r;
  }
  PB.renderFicha = function () {
    var body = $('fichaBody');
    var ad = state.fichaId ? PB.findAd(state.fichaId) : null;
    var sig = ad ? [ad.id, ad.active, ad.endsAt, ad.headline, ad.body, ad.offer, ad.hours, ad.brand, ad.pal, ad.media && ad.media.url, state.ads.length].join(':') : 'none:' + state.status;
    if (sig === fichaShown) return;
    fichaShown = sig;
    body.textContent = '';
    if (!ad) {
      var nf = el('div', 'in narrow');
      nf.appendChild(el('p', 'note', state.status === 'ok' ? 'No encontramos este negocio. Puede que su anuncio ya no esté vigente.' : 'Cargando…'));
      var back = el('a', 'btn navy', 'Ver el directorio'); back.href = '#directorio'; back.style.marginTop = '16px';
      nf.appendChild(back);
      body.appendChild(nf);
      return;
    }
    var cats = PB.adCats(ad);
    var wa = PB.normPhone(ad.whatsapp), ph = PB.normPhone(ad.phone), ml = PB.normMail(ad.mail), wb = PB.normWeb(ad.web);

    // Parte oscura de arriba
    var band = el('div', 'fch'), bi = el('div', 'in');
    var crumbs = el('p', 'crumbs');
    var h = el('a', '', 'Inicio'); h.href = '#inicio'; crumbs.appendChild(h);
    if (ad.localidad) {
      crumbs.appendChild(document.createTextNode(' / '));
      var lc = el('a', '', ad.localidad); lc.href = '#directorio';
      lc.addEventListener('click', function () { PB.setFilters({ loc: ad.localidad }); });
      crumbs.appendChild(lc);
    }
    crumbs.appendChild(document.createTextNode(' / ' + PB.clip(ad.brand || ad.headline, 40)));
    bi.appendChild(crumbs);
    var grid = el('div', 'fch-grid');
    var fimg = el('div', 'fimg');
    fimg.appendChild(PB.imageBlock(ad, true));
    if (ad.offer) { var fp = el('div', 'fprice'); fp.appendChild(el('b', '', PB.clip(ad.offer, 16))); if (ad.headline) fp.appendChild(el('small', '', PB.clip(ad.headline, 34))); fimg.appendChild(fp); }
    grid.appendChild(fimg);
    var info = el('div', 'finfo');
    if (PB.isFeatured(ad)) { var fb = el('span', 'fbadge'); fb.appendChild(PB.ic('star')); fb.appendChild(document.createTextNode(' Negocio destacado')); info.appendChild(fb); }
    info.appendChild(el('h1', '', PB.clip(ad.brand || ad.headline || 'Negocio', 40)));
    if (ad.headline) info.appendChild(el('p', 'fsub', PB.clip(ad.headline, 60)));
    var addr = [ad.address, ad.barrio, ad.localidad].filter(Boolean).join(' · ');
    if (addr) { var fa = el('p', 'faddr'); fa.appendChild(PB.ic('pin')); fa.appendChild(el('span', '', PB.clip(addr, 160))); info.appendChild(fa); }
    var opn = ad.hours ? PB.openNow(ad.hours) : null;
    if (opn) info.appendChild(el('p', 'fopen ' + (opn.open ? 'on' : 'off'), opn.text));
    if (!PB.visible(ad)) info.appendChild(el('p', 'ended', 'Este anuncio no está vigente en este momento.'));
    var btns = el('div', 'fbtns');
    function cbtn(cls, icon, text, href, field, ext) {
      var a = el('a', 'btn ' + cls); a.appendChild(PB.ic(icon)); a.appendChild(el('span', '', text));
      a.href = href;
      if (ext) { a.target = '_blank'; a.rel = 'noopener noreferrer nofollow ugc'; }
      if (field) a.addEventListener('click', function () { PB.trackOnce(ad, field); });
      btns.appendChild(a);
    }
    if (wa) cbtn('yellow', 'chat', 'Escribir por WhatsApp', 'https://wa.me/' + wa + '?text=' + encodeURIComponent('Hola, vi tu anuncio en ' + C.brand + '.'), 'clicksWhatsapp', true);
    if (addr || ad.brand) cbtn('out', 'pin', 'Cómo llegar', PB.mapsLink(ad), null, true);
    if (ph) cbtn('out', 'phone', 'Llamar', 'tel:+' + ph, 'clicksPhone', false);
    if (ml) cbtn('out', 'mail', 'Correo', 'mailto:' + ml, 'clicksEmail', false);
    if (wb) cbtn('out', 'globe', 'Sitio web', wb, 'clicksWeb', true);
    var sh = el('button', 'btn out'); sh.type = 'button'; sh.appendChild(PB.ic('share')); sh.appendChild(el('span', '', 'Compartir'));
    var sm = el('p', 'msg'); sm.setAttribute('role', 'status'); sm.style.color = '#B8C5E6';
    sh.addEventListener('click', function () { PB.shareAd(ad, sm); });
    btns.appendChild(sh);
    info.appendChild(btns); info.appendChild(sm);
    grid.appendChild(info);
    bi.appendChild(grid); band.appendChild(bi); body.appendChild(band);

    // Parte clara de abajo
    var main = el('div', 'in fbody');
    var left = el('div');
    left.appendChild(el('h2', '', 'Sobre el negocio'));
    left.appendChild(el('p', '', ad.body ? PB.clip(ad.body, 300) : 'Este negocio todavía no agregó una descripción.'));
    left.appendChild(el('h3', '', 'Encuéntralo también en'));
    left.appendChild(el('p', 'fine', 'Una sola publicación, visible en todas sus clasificaciones.'));
    var chips = el('div', 'chips-row');
    function chiplink(icon, text, f) {
      var b = el('button', 'chiplink'); b.type = 'button'; b.appendChild(PB.ic(icon)); b.appendChild(el('span', '', text));
      b.addEventListener('click', function () { PB.setFilters(f); PB.go('#directorio'); });
      chips.appendChild(b);
    }
    cats.forEach(function (c) { chiplink(PB.catIcon(c), c, { cat: c }); });
    if (ad.localidad) chiplink('pin', ad.localidad, { loc: ad.localidad });
    if (ad.barrio) chiplink('pin', ad.barrio, { loc: ad.localidad || '', zona: ad.barrio });
    left.appendChild(chips);
    main.appendChild(left);

    var card = el('aside', 'fcard');
    card.appendChild(el('h3', '', 'Información de contacto'));
    if (ad.hours) card.appendChild(irow('clock', 'Horario', el('span', '', PB.clip(ad.hours, 70))));
    if (ad.address || ad.barrio) { var ml2 = el('a', '', 'Abrir en Google Maps'); ml2.href = PB.mapsLink(ad); ml2.target = '_blank'; ml2.rel = 'noopener noreferrer'; card.appendChild(irow('pin', 'Cómo llegar', ml2)); }
    if (ad.address) card.appendChild(irow('pin', 'Dirección', el('span', '', PB.clip(ad.address, 100))));
    if (ph || wa) card.appendChild(irow('phone', 'Teléfono', el('span', '', (ad.phone || ad.whatsapp))));
    if (ml) card.appendChild(irow('mail', 'Correo', el('span', '', ml)));
    if (wb) { var wl = el('a', '', wb.replace(/^https?:\/\//, '').replace(/\/$/, '')); wl.href = wb; wl.target = '_blank'; wl.rel = 'noopener noreferrer nofollow ugc'; card.appendChild(irow('globe', 'Sitio web', wl)); }
    if (ad.endsAt) { var vg = el('div', 'vigente'); vg.appendChild(PB.ic('calendar')); vg.appendChild(el('span', '', 'Anuncio vigente hasta el ' + PB.longDate(ad.endsAt))); card.appendChild(vg); }
    var rp = el('button', 'btn sm ghost', 'Reportar este anuncio'); rp.type = 'button'; rp.style.marginTop = '12px';
    rp.addEventListener('click', function () { PB.openReport(ad); });
    card.appendChild(rp);
    main.appendChild(card);
    body.appendChild(main);

    // También te puede interesar
    var rel = visibleAds().filter(function (a) {
      if (a.id === ad.id) return false;
      return PB.adCats(a).some(function (c) { return cats.indexOf(c) >= 0; }) || (ad.localidad && a.localidad === ad.localidad);
    });
    rel = sortAds(rel).slice(0, 3);
    if (rel.length) {
      var rw = el('div', 'in related');
      rw.appendChild(el('h2', '', 'También te puede interesar'));
      var rg = el('div', 'deals');
      rel.forEach(function (a) { rg.appendChild(PB.bizCard(a)); });
      rw.appendChild(rg); body.appendChild(rw);
    }
    if (PB.visible(ad)) PB.trackOnce(ad, 'views');
  };

  // ---------- Conexión de los controles ----------
  PB.initPages = function () {
    PB.fillLocs($('hs-loc'), 'Toda Bogotá y la Sabana');
    PB.fillSelect($('hs-cat'), 'Todas las categorías', C.categorias);
    PB.fillLocs($('fl-loc'), 'Toda Bogotá y la Sabana');
    $('heroBadge').textContent = C.localidades.length + ' localidades · ' + C.municipios.length + ' municipios de la Sabana';
    var pop = $('popular');
    // Búsquedas populares: se muestran 3 en fila y van rotando solas (se pausan al pasar el mouse).
    var popI = 0, popHover = false, POPN = 3;
    function drawPop() {
      pop.textContent = '';
      for (var k = 0; k < Math.min(POPN, C.popular.length); k++) (function (p) {
        var b = el('button', '', p[0]); b.type = 'button';
        b.addEventListener('click', function () { PB.setFilters({ q: p[1], loc: p[2], cat: p[3] }); PB.go('#directorio'); });
        pop.appendChild(b);
      })(C.popular[(popI + k) % C.popular.length]);
    }
    drawPop();
    pop.addEventListener('mouseenter', function () { popHover = true; });
    pop.addEventListener('mouseleave', function () { popHover = false; });
    pop.addEventListener('focusin', function () { popHover = true; });
    pop.addEventListener('focusout', function () { popHover = false; });
    if (C.popular.length > POPN) setInterval(function () {
      if (popHover || document.hidden || state.view !== 'inicio') return;
      popI = (popI + POPN) % C.popular.length;
      if (PB.reduce) { drawPop(); return; }
      pop.classList.add('out');
      setTimeout(function () { drawPop(); pop.classList.remove('out'); }, 350);
    }, 4500);
    $('heroSearch').addEventListener('submit', function (e) {
      e.preventDefault();
      PB.setFilters({ q: $('hs-q').value.trim(), loc: $('hs-loc').value, cat: $('hs-cat').value });
      PB.go('#directorio');
    });
    $('dirSearch').addEventListener('submit', function (e) { e.preventDefault(); });
    $('fl-q').addEventListener('input', function () { state.filters.q = $('fl-q').value; PB.renderDirectorio(); });
    $('fl-loc').addEventListener('input', function () { state.filters.loc = $('fl-loc').value; PB.renderDirectorio(); });
    $('fl-zona').addEventListener('input', function () { state.filters.zona = $('fl-zona').value; PB.renderDirectorio(); });
    $('clearFilters').addEventListener('click', clearFilters);
    $('filterToggle').addEventListener('click', function () {
      var p = $('filterPanel'), open = !p.classList.contains('open');
      p.classList.toggle('open', open);
      $('filterToggle').setAttribute('aria-expanded', open ? 'true' : 'false');
    });
    $('locMore').addEventListener('click', function () { state.allLocs = !state.allLocs; PB.renderHome(); });
  };
})();
