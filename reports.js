/* Informes: del anunciante (por anuncio) y general del administrador. Se imprimen o guardan en PDF. */
(function () {
  'use strict';
  var PB = window.PB, C = PB.C, $ = PB.$, el = PB.el, state = PB.state;
  var IMG = window.PB_CT_IMG || {};
  var NAVY = '#0F1B3F', YEL = '#FFC933', GRAY = '#C9D1E6', BLUE = '#3B5BDB';
  var NS = 'http://www.w3.org/2000/svg';

  function nf(n) { return Math.round(n || 0).toLocaleString('es-CO'); }
  function pct(a, b) { return b > 0 ? (a / b * 100) : 0; }
  function pf(n) { return (Math.round(n * 10) / 10).toLocaleString('es-CO') + ' %'; }
  PB.contacts = function (ad) { return (ad.clicksWhatsapp || 0) + (ad.clicksPhone || 0) + (ad.clicksEmail || 0) + (ad.clicksWeb || 0); };
  PB.webLabel = function (url) {
    var u = String(url || '').toLowerCase();
    if (/instagram\.com/.test(u)) return 'Instagram';
    if (/facebook\.com|fb\.com|fb\.me/.test(u)) return 'Facebook';
    if (/tiktok\.com/.test(u)) return 'TikTok';
    if (/youtube\.com|youtu\.be/.test(u)) return 'YouTube';
    if (/wa\.me|whatsapp\.com/.test(u)) return 'WhatsApp (enlace)';
    return u ? 'Sitio web' : 'Sitio web o redes';
  };
  function svg(tag, attrs, text) {
    var n = document.createElementNS(NS, tag);
    Object.keys(attrs || {}).forEach(function (k) { n.setAttribute(k, attrs[k]); });
    if (text != null) n.textContent = text;
    return n;
  }
  // Barras horizontales: items = [{label, value, color}]
  function hbars(items, fmt) {
    var rowH = 30, W = 560, L = 150, h = Math.max(1, items.length) * rowH + 6;
    var max = Math.max.apply(null, items.map(function (i) { return i.value; }).concat([1]));
    var s = svg('svg', { viewBox: '0 0 ' + W + ' ' + h, class: 'rp-chart', role: 'img' });
    items.forEach(function (it, i) {
      var y = i * rowH + 4, w = Math.max(it.value > 0 ? 3 : 0, (W - L - 70) * it.value / max);
      s.appendChild(svg('text', { x: L - 8, y: y + 17, 'text-anchor': 'end', 'font-size': 12, fill: '#333' }, PB.clip(it.label, 22)));
      s.appendChild(svg('rect', { x: L, y: y + 3, width: W - L - 70, height: 18, rx: 4, fill: '#EEF1F9' }));
      s.appendChild(svg('rect', { x: L, y: y + 3, width: w, height: 18, rx: 4, fill: it.color || NAVY }));
      s.appendChild(svg('text', { x: L + w + 6, y: y + 17, 'font-size': 12, 'font-weight': 700, fill: NAVY }, (fmt || nf)(it.value)));
    });
    return s;
  }
  // Barras verticales: items = [{label, value}]
  function vbars(items, fmt) {
    var W = 560, H = 190, B = 28, T = 20, n = Math.max(1, items.length), gap = 14, bw = (W - gap * (n + 1)) / n;
    var max = Math.max.apply(null, items.map(function (i) { return i.value; }).concat([1]));
    var s = svg('svg', { viewBox: '0 0 ' + W + ' ' + H, class: 'rp-chart', role: 'img' });
    s.appendChild(svg('line', { x1: 0, y1: H - B, x2: W, y2: H - B, stroke: GRAY }));
    items.forEach(function (it, i) {
      var h = (H - B - T) * it.value / max, x = gap + i * (bw + gap);
      s.appendChild(svg('rect', { x: x, y: H - B - h, width: bw, height: Math.max(h, it.value > 0 ? 2 : 0), rx: 4, fill: NAVY }));
      s.appendChild(svg('text', { x: x + bw / 2, y: H - B - h - 5, 'text-anchor': 'middle', 'font-size': 11, 'font-weight': 700, fill: NAVY }, (fmt || nf)(it.value)));
      s.appendChild(svg('text', { x: x + bw / 2, y: H - 10, 'text-anchor': 'middle', 'font-size': 11, fill: '#333' }, it.label));
    });
    return s;
  }
  function kpi(value, label, hint) {
    var k = el('div', 'rp-k'); k.appendChild(el('b', '', value)); k.appendChild(el('span', '', label)); if (hint) k.appendChild(el('small', '', hint)); return k;
  }
  function sect(title, nodes) {
    var s = el('section', 'rp-s'); s.appendChild(el('h2', '', title)); (nodes || []).forEach(function (n) { if (n) s.appendChild(n); }); return s;
  }
  function tips(list) {
    var u = el('ul', 'rp-tips');
    if (!list.length) list = ['Todo va bien por ahora. Sigue así y revisa el informe de nuevo en unos días.'];
    list.forEach(function (t) { u.appendChild(el('li', '', t)); });
    return u;
  }
  function table(head, rows) {
    var t = el('table', 'rp-t'), th = el('tr');
    head.forEach(function (h) { th.appendChild(el('th', '', h)); }); t.appendChild(th);
    if (!rows.length) { var e = el('tr'); var td = el('td', '', 'Sin datos todavía.'); td.colSpan = head.length; e.appendChild(td); t.appendChild(e); }
    rows.forEach(function (r) { var tr = el('tr'); r.forEach(function (c) { tr.appendChild(el('td', '', String(c))); }); t.appendChild(tr); });
    return t;
  }
  function frame(titleText, subText) {
    var box = el('div', 'rp-page');
    var top = el('img', 'ct-top'); top.src = IMG.header || ''; top.alt = ''; box.appendChild(top);
    var inn = el('div', 'rp-in');
    inn.appendChild(el('h1', '', titleText));
    inn.appendChild(el('p', 'rp-sub', subText));
    box.appendChild(inn);
    var bot = el('img', 'ct-bot'); bot.src = IMG.footer || ''; bot.alt = ''; box.appendChild(bot);
    return { box: box, inn: inn };
  }
  function note(text) { return el('p', 'rp-note', text); }

  // ---------- Informe del anunciante ----------
  function adReport(ad) {
    var now = Date.now(), views = ad.views || 0, ct = PB.contacts(ad), st = PB.adStatus(ad);
    var start = ad.startsAt || ad.createdAt || null, days = start ? Math.max(1, Math.ceil((Math.min(now, ad.endsAt || now) - start) / PB.DAY)) : 0;
    var rate = pct(ct, views);
    var pub = state.ads.filter(PB.visible);
    var avgViews = pub.length ? pub.reduce(function (t, a) { return t + (a.views || 0); }, 0) / pub.length : 0;
    var avgCt = pub.length ? pub.reduce(function (t, a) { return t + PB.contacts(a); }, 0) / pub.length : 0;
    var byViews = pub.slice().sort(function (a, b) { return (b.views || 0) - (a.views || 0); });
    var posV = byViews.map(function (a) { return a.id; }).indexOf(ad.id) + 1;
    var byCt = pub.slice().sort(function (a, b) { return PB.contacts(b) - PB.contacts(a); });
    var posC = byCt.map(function (a) { return a.id; }).indexOf(ad.id) + 1;
    var f = frame('Informe de resultados', PB.clip(ad.brand, 50) + ' · ' + PB.tierLabel(ad.tier) + ' · generado el ' + PB.longDate(now));
    var inn = f.inn;

    inn.appendChild(sect('Resumen de tu anuncio', [el('p', 'rp-p', 'Estado: ' + st.t + (ad.startsAt ? ' · publicado el ' + PB.longDate(ad.startsAt) : '') + (ad.endsAt ? ' · vigente hasta el ' + PB.longDate(ad.endsAt) : '') + '.')]));
    var g = el('div', 'rp-kpis');
    g.appendChild(kpi(nf(views), 'Visitas a tu anuncio', days ? '≈ ' + (Math.round(views / days * 10) / 10).toLocaleString('es-CO') + ' por día' : ''));
    g.appendChild(kpi(nf(ct), 'Contactos totales', 'Personas que te buscaron'));
    g.appendChild(kpi(pf(rate), 'Tasa de contacto', 'Contactos por cada 100 visitas'));
    g.appendChild(kpi(days ? String(days) : '—', 'Días publicado', ad.endsAt && st.k !== 'vencido' ? 'Quedan ' + Math.max(0, PB.daysLeft(ad)) + ' días' : ''));
    inn.appendChild(g);

    var webName = PB.webLabel(ad.web);
    inn.appendChild(sect('¿Cómo te contactaron?', [
      hbars([
        { label: 'WhatsApp', value: ad.clicksWhatsapp || 0, color: '#1FA855' },
        { label: 'Llamadas', value: ad.clicksPhone || 0, color: NAVY },
        { label: 'Correo', value: ad.clicksEmail || 0, color: BLUE },
        { label: webName, value: ad.clicksWeb || 0, color: YEL }
      ]),
      note('Cada barra cuenta las veces que alguien pulsó ese botón en tu ficha. ' + (ad.web ? 'Tu enlace de "' + webName + '" apunta a: ' + PB.clip(ad.web, 70) + '.' : 'No tienes sitio web o red social en tu ficha.'))]));

    inn.appendChild(sect('Cómo vas frente a los demás anuncios', [
      table(['Indicador', 'Tu anuncio', 'Promedio de la plataforma', 'Tu puesto'], [
        ['Visitas', nf(views), nf(avgViews), posV ? posV + ' de ' + pub.length : '—'],
        ['Contactos', nf(ct), nf(avgCt), posC ? posC + ' de ' + pub.length : '—']
      ]),
      note('El promedio se calcula con los ' + pub.length + ' anuncios activos hoy.')]));

    var t = [];
    if (!ad.media) t.push('Sube una imagen a tu anuncio: las fichas con foto llaman más la atención y generan más contactos.');
    if (!ad.offer) t.push('Agrega un sello de oferta (por ejemplo "2x1" o "-20%"). Los clientes buscan promociones.');
    if (!ad.hours) t.push('Escribe tu horario de atención para que sepan cuándo escribirte o visitarte.');
    if (!ad.body || ad.body.length < 40) t.push('Mejora tu descripción: cuenta qué vendes, qué te hace diferente y cómo llegar.');
    if (PB.adCats(ad).length < 3) t.push('Estás en ' + PB.adCats(ad).length + ' categoría(s). Puedes aparecer hasta en 3, así te encuentran más personas.');
    if (!ad.clicksPhone && !ad.phone) t.push('Agrega un teléfono fijo o celular para que también puedan llamarte.');
    if (views >= 20 && rate < 3) t.push('Tienes visitas pero pocos contactos (' + pf(rate) + '). Prueba con un título más claro, una oferta más fuerte o una imagen nueva.');
    if (views < avgViews * 0.6 && pub.length > 3) t.push('Tus visitas están por debajo del promedio. Un espacio más alto (Destacado o Banner) te mostraría más.');
    if (ad.endsAt && PB.daysLeft(ad) <= 7 && PB.daysLeft(ad) >= 0) t.push('Tu anuncio vence en ' + PB.daysLeft(ad) + ' día(s). Renuévalo desde Mi panel para no perder tu lugar.');
    if (st.k === 'vencido') t.push('Tu anuncio ya venció. Renuévalo desde Mi panel para volver a aparecer.');
    inn.appendChild(sect('Puntos para mejorar', [tips(t)]));
    inn.appendChild(note('Estos datos son acumulados desde que se publicó el anuncio. Para dudas escríbenos por WhatsApp al ' + C.legal.phone + '.'));
    return f.box;
  }

  // ---------- Informe general del administrador ----------
  function adminReport() {
    var now = Date.now(), ads = state.myAds, orders = state.orders;
    var approved = orders.filter(function (o) { return o.status === 'aprobado'; });
    var income = approved.reduce(function (t, o) { return t + (o.amount || 0); }, 0);
    var views = ads.reduce(function (t, a) { return t + (a.views || 0); }, 0);
    var cts = ads.reduce(function (t, a) { return t + PB.contacts(a); }, 0);
    var active = ads.filter(PB.visible);
    var soon = active.filter(function (a) { return PB.daysLeft(a) <= 7; });
    var f = frame('Informe general de Ofertas Bogotá', 'Todos los clientes · generado el ' + PB.longDate(now));
    var inn = f.inn;

    var g = el('div', 'rp-kpis');
    g.appendChild(kpi(PB.money(income), 'Cobrado', approved.length + ' pedidos pagados'));
    g.appendChild(kpi(String(active.length), 'Anuncios activos', soon.length + ' vencen en 7 días'));
    g.appendChild(kpi(nf(views), 'Visitas totales', ''));
    g.appendChild(kpi(nf(cts), 'Contactos totales', pf(pct(cts, views)) + ' de las visitas'));
    inn.appendChild(sect('Resumen', [g]));

    // Ingresos por mes (últimos 6)
    var months = [], d0 = new Date(now); d0.setDate(1);
    for (var i = 5; i >= 0; i--) { var d = new Date(d0.getFullYear(), d0.getMonth() - i, 1); months.push({ y: d.getFullYear(), m: d.getMonth(), label: d.toLocaleDateString('es-CO', { month: 'short' }), value: 0 }); }
    approved.forEach(function (o) { var d = new Date(o.paidAt || o.createdAt); months.forEach(function (m) { if (m.y === d.getFullYear() && m.m === d.getMonth()) m.value += (o.amount || 0); }); });
    inn.appendChild(sect('Ingresos por mes', [vbars(months, function (v) { return v >= 1000 ? Math.round(v / 1000) + ' mil' : String(v); }), note('Valores en pesos colombianos, según la fecha de pago confirmada.')]));

    // Ventas por plan
    var rowsTier = C ? PB.TIER_ORDER.map(function (t) {
      var nw = approved.filter(function (o) { return o.tier === t && !o.renewOf; }), rn = approved.filter(function (o) { return o.tier === t && o.renewOf; });
      var act = active.filter(function (a) { return a.tier === t; }).length;
      return { t: t, nw: nw.length, rn: rn.length, money: nw.concat(rn).reduce(function (s, o) { return s + (o.amount || 0); }, 0), act: act };
    }) : [];
    inn.appendChild(sect('Qué se vendió más', [
      hbars(rowsTier.map(function (r) { return { label: C.tiers[r.t].label, value: r.money, color: YEL }; }), PB.money),
      table(['Plan', 'Ventas nuevas', 'Renovaciones', 'Activos hoy', 'Cupos'], rowsTier.map(function (r) { var cap = PB.cfg().caps[r.t]; return [C.tiers[r.t].label, r.nw, r.rn, r.act, cap ? r.act + ' de ' + cap : 'sin límite']; }))]));

    // Rankings
    function rank(list, key, n) { return list.slice().sort(function (a, b) { return key(b) - key(a); }).slice(0, n); }
    var top = rank(ads, function (a) { return a.views || 0; }, 5);
    var topC = rank(ads, PB.contacts, 5);
    var conv = rank(ads.filter(function (a) { return (a.views || 0) >= 10; }), function (a) { return pct(PB.contacts(a), a.views); }, 5);
    var low = ads.filter(function (a) { return PB.visible(a) && a.startsAt && (now - a.startsAt) > 3 * PB.DAY; }).sort(function (a, b) { return (a.views || 0) - (b.views || 0); }).slice(0, 5);
    function rowAd(a) { return [PB.clip(a.brand, 28), PB.tierLabel(a.tier), nf(a.views), nf(PB.contacts(a)), pf(pct(PB.contacts(a), a.views))]; }
    var head = ['Negocio', 'Plan', 'Visitas', 'Contactos', 'Tasa'];
    inn.appendChild(sect('Los que más visitas tuvieron', [table(head, top.map(rowAd))]));
    inn.appendChild(sect('Los que más contactos generaron', [table(head, topC.map(rowAd))]));
    inn.appendChild(sect('Los que mejor convierten (con 10 visitas o más)', [table(head, conv.map(rowAd))]));
    inn.appendChild(sect('Los de menor rendimiento (activos hace más de 3 días)', [table(head, low.map(rowAd))]));

    // Renovaciones
    var expired = ads.filter(function (a) { return a.endsAt && a.endsAt <= now; });
    var renewedIds = {}; approved.forEach(function (o) { if (o.renewOf) renewedIds[o.renewOf] = true; });
    var didRenew = expired.filter(function (a) { return renewedIds[a.id]; }), noRenew = expired.filter(function (a) { return !renewedIds[a.id] && !PB.visible(a); });
    inn.appendChild(sect('Quién renueva y quién no', [
      table(['Indicador', 'Cantidad'], [['Anuncios que ya vencieron', expired.length], ['Renovaron', didRenew.length], ['No han renovado', noRenew.length], ['Vencen en los próximos 7 días', soon.length]]),
      noRenew.length ? note('Para contactar: ' + noRenew.slice(0, 8).map(function (a) { return a.brand + (a.whatsapp ? ' (' + a.whatsapp + ')' : ''); }).join('; ') + (noRenew.length > 8 ? '…' : '')) : null]));

    // Categorías y localidades
    function agg(keyFn) { var m = {}; ads.forEach(function (a) { keyFn(a).forEach(function (k) { if (!k) return; var r = m[k] = m[k] || { n: 0, v: 0 }; r.n++; r.v += (a.views || 0); }); }); return Object.keys(m).map(function (k) { return { label: k, n: m[k].n, v: m[k].v }; }).sort(function (a, b) { return b.v - a.v; }); }
    var cats = agg(PB.adCats).slice(0, 6), locs = agg(function (a) { return [a.localidad]; }).slice(0, 6);
    inn.appendChild(sect('Categorías con más visitas', [hbars(cats.map(function (c) { return { label: c.label, value: c.v, color: NAVY }; })), note('Anuncios por categoría: ' + (cats.map(function (c) { return c.label + ' ' + c.n; }).join(' · ') || '—'))]));
    inn.appendChild(sect('Localidades con más visitas', [hbars(locs.map(function (c) { return { label: c.label, value: c.v, color: BLUE }; }))]));

    // Pedidos
    var by = {}; orders.forEach(function (o) { by[o.status] = (by[o.status] || 0) + 1; });
    var promoUsed = orders.filter(function (o) { return o.promo === true && o.status !== 'rechazado'; }).length;
    inn.appendChild(sect('Pedidos', [table(['Estado', 'Cantidad'], Object.keys(PB.STATUS).map(function (k) { return [PB.STATUS[k], by[k] || 0]; }).concat([['Espacios gratis usados', promoUsed + ' de ' + PB.cfg().promo.limit]]))]));

    // Puntos a mejorar
    var t = [];
    rowsTier.forEach(function (r) { if (!r.nw && !r.rn) t.push('El plan ' + C.tiers[r.t].label + ' no tiene ventas: revisa su precio o ofrécelo directamente a negocios que ya estén en la plataforma.'); });
    rowsTier.forEach(function (r) { var cap = PB.cfg().caps[r.t]; if (cap && r.act >= cap) t.push('El plan ' + C.tiers[r.t].label + ' está lleno (' + r.act + ' de ' + cap + '). Puedes subir su precio o abrir más cupos.'); });
    if (expired.length >= 3 && didRenew.length / expired.length < 0.5) t.push('Menos de la mitad renueva. Escríbeles unos 5 días antes de que venza, con su informe de resultados.');
    if (noRenew.length) t.push(noRenew.length + ' cliente(s) vencidos no han renovado: mándales su informe y una oferta de renovación.');
    if (soon.length) t.push(soon.length + ' anuncio(s) vencen en 7 días: es el momento de recordarles.');
    var sinImg = ads.filter(function (a) { return PB.visible(a) && !a.media; }).length;
    if (active.length && sinImg / active.length > 0.3) t.push(sinImg + ' de ' + active.length + ' anuncios activos no tienen imagen. Anímalos a subir una: se ven más y generan más contactos.');
    if (views >= 50 && pct(cts, views) < 3) t.push('Solo ' + pf(pct(cts, views)) + ' de las visitas termina en un contacto. Revisa títulos, ofertas e imágenes de los de menor rendimiento.');
    var pend = orders.filter(function (o) { return o.status === 'por_pagar' && now - (o.acceptedAt || o.createdAt) > 2 * PB.DAY; }).length;
    if (pend) t.push(pend + ' pedido(s) aceptados llevan más de 2 días sin pagar: escríbeles por WhatsApp.');
    var rej = orders.filter(function (o) { return o.status === 'rechazado'; }).length;
    if (orders.length >= 5 && rej / orders.length > 0.3) t.push('Muchas solicitudes se rechazan (' + rej + ' de ' + orders.length + '). Aclara en el formulario qué se acepta.');
    var emptyLocs = C.localidades.filter(function (l) { return !ads.some(function (a) { return a.localidad === l; }); });
    if (emptyLocs.length) t.push('Localidades sin ningún negocio: ' + emptyLocs.slice(0, 8).join(', ') + (emptyLocs.length > 8 ? '…' : '') + '. Son oportunidades para conseguir clientes.');
    inn.appendChild(sect('Puntos a mejorar', [tips(t)]));
    inn.appendChild(note('Las cifras de visitas y contactos son acumuladas desde la publicación de cada anuncio.'));
    return f.box;
  }

  PB.renderInforme = function () {
    var box = $('reportBody'); box.textContent = '';
    var id = state.reportId;
    if (id === 'admin') {
      if (!PB.isAdmin()) { box.appendChild(el('p', 'note', state.authReady ? 'Solo el administrador puede ver este informe.' : 'Cargando…')); return; }
      box.appendChild(adminReport()); return;
    }
    var ad = state.myAds.filter(function (a) { return a.id === id; })[0];
    if (!ad) { box.appendChild(el('p', 'note', state.status === 'ok' && state.authReady ? 'No encontramos este informe.' : 'Cargando…')); return; }
    box.appendChild(adReport(ad));
  };
  PB.reportLink = function (ad, cls) { var a = el('a', cls || 'btn sm ghost', 'Ver informe'); a.href = '#informe-' + ad.id; return a; };
  PB.initReports = function () {
    $('rpPrint').addEventListener('click', function () { window.print(); });
    $('rpBack').addEventListener('click', function (e) { if (history.length > 1) { e.preventDefault(); history.back(); } });
  };
})();
