/* Panel del administrador: solicitudes, pagos, anuncios, pedidos, precios/cupos/vallas y editor. */
(function () {
  'use strict';
  var PB = window.PB, C = PB.C, $ = PB.$, el = PB.el, state = PB.state, B = PB.B;
  var adFilter = 'todos', orderFilter = 'todos', cfgFilled = false, editing = null, editFile = null, editCats = [];
  PB.resetAdminCfg = function () { cfgFilled = false; };

  function newRepCount() { return (state.reports || []).filter(function (r) { return r.status === 'nuevo'; }).length; }
  async function adminDo(fn, okText) {
    var m = $('admMsg');
    try { var r = await fn(); PB.setMsg(m, typeof okText === 'function' ? okText(r) : okText, 'ok'); }
    catch (err) { PB.setMsg(m, PB.errText(err), 'err'); }
  }

  PB.renderAdmin = function () {
    var ok = PB.isAdmin();
    $('adminDenied').hidden = ok; $('adminBody').hidden = !ok;
    if (!ok) return;
    var now = Date.now(), orders = state.orders, ads = state.myAds, money = PB.money;
    var review = orders.filter(function (o) { return o.status === 'revision'; });
    var toPay = orders.filter(function (o) { return o.status === 'por_pagar' || o.status === 'pago_reportado'; });
    var active = ads.filter(PB.visible);
    var soon = ads.filter(function (a) { return PB.visible(a) && PB.daysLeft(a) <= 7; });
    var income = orders.filter(function (o) { return o.status === 'aprobado'; }).reduce(function (t, o) { return t + (o.amount || 0); }, 0);
    var views = ads.reduce(function (t, a) { return t + (a.views || 0); }, 0);
    var clicks = ads.reduce(function (t, a) { return t + (a.clicksWhatsapp || 0) + (a.clicksPhone || 0) + (a.clicksEmail || 0) + (a.clicksWeb || 0); }, 0);
    var promoUsed = orders.filter(function (o) { return o.promo === true && ['por_pagar', 'pago_reportado', 'aprobado'].indexOf(o.status) >= 0; }).length;
    var st = $('stats'); st.textContent = '';
    [[review.length, 'Por revisar'], [toPay.length, 'Esperando pago'], [active.length, 'Anuncios activos'], [soon.length, 'Vencen en 7 días'], [money(income), 'Cobrado'], [views, 'Visitas'], [clicks, 'Clics de contacto'], [newRepCount(), 'Reportes nuevos'], [promoUsed, 'Espacios gratis (lanzamiento)']].forEach(function (x) {
      var d = el('div', 'stat'); d.appendChild(el('b', '', String(x[0]))); d.appendChild(el('span', '', x[1])); st.appendChild(d);
    });

    // Reportes
    var rl2 = $('reportList'); rl2.textContent = '';
    var reps = state.reports || [], newReps = reps.filter(function (r) { return r.status === 'nuevo'; });
    if (!newReps.length) rl2.appendChild(el('p', 'fine', reps.length ? 'No hay reportes nuevos.' : 'Todavía no hay reportes.'));
    newReps.forEach(function (r) {
      var c = el('div', 'card rep-card'), top = el('div', 'crow');
      top.appendChild(el('h3', '', PB.clip(r.brand || 'Anuncio', 40))); top.appendChild(el('span', 'meta', PB.fmtDateTime(r.createdAt))); c.appendChild(top);
      c.appendChild(el('p', '', r.reason));
      if (r.note) c.appendChild(el('p', 'fine', PB.clip(r.note, 300)));
      if (r.contact) c.appendChild(el('p', 'meta', 'Contacto de quien reporta: ' + PB.clip(r.contact, 60)));
      var ad = PB.findAd(r.adId), acts = el('div', 'acts');
      var vw = el('a', 'btn sm ghost', 'Ver anuncio'); vw.href = '#anuncio-' + r.adId; acts.appendChild(vw);
      if (ad && ad.active === true) { var off = el('button', 'btn sm danger', 'Retirar anuncio'); off.type = 'button'; off.addEventListener('click', function () { adminDo(async function () { await B.setAdActive(ad.id, false, ad); await B.resolveReport(r.id, 'retirado'); }, 'Anuncio retirado y reporte cerrado.'); }); acts.appendChild(off); }
      var ds = el('button', 'btn sm ghost', 'Descartar reporte'); ds.type = 'button'; ds.addEventListener('click', function () { adminDo(function () { return B.resolveReport(r.id, 'descartado'); }, 'Reporte descartado.'); }); acts.appendChild(ds);
      c.appendChild(acts); rl2.appendChild(c);
    });
    // Por revisar
    var rl = $('reviewList'); rl.textContent = '';
    if (!review.length) rl.appendChild(el('p', 'fine', 'No hay solicitudes esperando revisión.'));
    var ctx = { orders: state.orders, ads: state.myAds, config: state.config };
    review.forEach(function (o) {
      var c = PB.simpleOrder(o, true);
      if (o.tier || o.renewOf) { var pv = el('div', 'apreview'); var tl = el('div', 'tile'); tl.appendChild(PB.poster(o, {})); pv.appendChild(tl); c.appendChild(pv); }
      if (o.tier) c.appendChild(el('p', 'meta', 'Duración: ' + C.durLabel(o.days || C.termDays) + ' · Medida del espacio: ' + C.sizeLabel(o.tier) + (o.designPieces ? ' (diseña la pieza con esta medida)' : '')));
      if (o.body) c.appendChild(el('p', 'fine', PB.clip(o.body, 300)));
      if (o.offer || o.hours) c.appendChild(el('p', 'meta', [o.offer && 'Oferta: ' + o.offer, o.hours && 'Horario: ' + o.hours].filter(Boolean).join(' · ')));
      c.appendChild(el('p', 'meta', [PB.adCats(o).join(', '), o.localidad, o.barrio, o.address].filter(Boolean).join(' · ')));
      c.appendChild(el('p', 'meta', 'Contacto: ' + [o.whatsapp && 'WhatsApp ' + o.whatsapp, o.phone && 'Tel ' + o.phone, o.mail, o.web].filter(Boolean).join(' · ')));
      if (o.designPieces) {
        c.appendChild(el('p', '', 'Diseño pedido (' + o.designPieces + (o.designPieces === 1 ? ' pieza' : ' piezas') + '): ' + PB.clip(o.designBrief, 400)));
        if (o.media && o.media.url && /^https:|^data:image\//.test(o.media.url)) { var rf = el('a', 'btn sm ghost', 'Ver archivo de referencia'); rf.href = o.media.url; rf.target = '_blank'; rf.rel = 'noopener noreferrer'; c.appendChild(rf); }
      }
      var q = C.quote(o, state.config, state.orders, state.myAds, now);
      if (q.ok) c.appendChild(el('p', 'quote', q.amount === 0 ? 'Si la aceptas se publica gratis (lanzamiento).' : 'Si la aceptas, se le cobran ' + money(q.amount) + (q.promo ? ' (espacio gratis por el lanzamiento)' : '') + '.'));
      else c.appendChild(el('p', 'msg err', q.error));
      var f = el('div', 'fld'), lb = el('label', '', 'Motivo si la rechazas (opcional)'), inp = el('input');
      inp.type = 'text'; inp.maxLength = 120; inp.id = 'why-' + o.id; lb.htmlFor = inp.id; f.appendChild(lb); f.appendChild(inp); c.appendChild(f);
      var acts = el('div', 'acts');
      var yes = el('button', 'btn sm yellow', q.ok && q.amount === 0 ? 'Aceptar y publicar' : 'Aceptar'); yes.type = 'button'; yes.disabled = !q.ok;
      yes.addEventListener('click', function () {
        adminDo(function () { return B.acceptOrder(o, ctx); }, function (r) {
          if (r && r.free) return r.draft ? 'Aceptada. Quedó como borrador: sube la pieza diseñada en "Editar" y publícala.' : 'Aceptada y publicada.';
          return 'Aceptada. Le mostramos cómo pagar; cuando pague, confírmalo en "Esperando pago".';
        });
      });
      var no = el('button', 'btn sm danger', 'Rechazar'); no.type = 'button';
      no.addEventListener('click', function () { adminDo(function () { return B.rejectOrder(o.id, inp.value.trim()); }, 'Rechazada. No se cobró nada.'); });
      acts.appendChild(yes); acts.appendChild(no); c.appendChild(acts); rl.appendChild(c);
    });

    // Esperando pago
    var pl = $('payList'); pl.textContent = '';
    if (!toPay.length) pl.appendChild(el('p', 'fine', 'Nada esperando pago.'));
    toPay.sort(function (a, b) { return (a.status === 'pago_reportado' ? 0 : 1) - (b.status === 'pago_reportado' ? 0 : 1); }).forEach(function (o) {
      var c = PB.simpleOrder(o, true);
      c.appendChild(el('p', 'meta', 'Referencia ' + PB.ref(o) + (o.status === 'pago_reportado' ? ' · el anunciante avisó que ya pagó: revisa tu Nequi' : ' · todavía no avisa el pago')));
      var acts = el('div', 'acts');
      var okb = el('button', 'btn sm yellow', 'Confirmar pago y publicar'); okb.type = 'button';
      okb.addEventListener('click', function () {
        adminDo(function () { return B.confirmPaid(o, ctx); }, function (r) {
          if (o.renewOf) return 'Pago confirmado. Renovado por ' + C.durLabel(o.days || C.termDays) + '.';
          if (!o.tier) return 'Pago confirmado. Entrega el diseño.';
          return r && r.draft ? 'Pago confirmado. Quedó como borrador: sube la pieza diseñada en "Editar" y publícala.' : 'Pago confirmado. El anuncio ya está publicado.';
        });
      });
      var no = el('button', 'btn sm danger', 'Cancelar pedido'); no.type = 'button';
      no.addEventListener('click', function () { adminDo(function () { return B.rejectOrder(o.id, 'No se completó el pago'); }, 'Pedido cancelado.'); });
      acts.appendChild(okb); acts.appendChild(no);
      if (o.whatsapp) { var wa = el('a', 'btn sm ghost', 'Escribirle por WhatsApp'); wa.href = PB.waLink(PB.waNum(o.whatsapp), 'Hola, sobre tu anuncio en ' + C.brand + ' (referencia ' + PB.ref(o) + ').'); wa.target = '_blank'; wa.rel = 'noopener noreferrer'; acts.appendChild(wa); }
      c.appendChild(acts); pl.appendChild(c);
    });

    // Anuncios
    var af = $('adFilters'); af.textContent = '';
    [['todos', 'Todos'], ['activo', 'Activos'], ['porvencer', 'Por vencer'], ['vencido', 'Vencidos'], ['borrador', 'Borradores'], ['pausado', 'Pausados']].forEach(function (x) {
      var b = el('button', 'chip', x[1]); b.type = 'button'; b.setAttribute('aria-pressed', adFilter === x[0] ? 'true' : 'false');
      b.addEventListener('click', function () { adFilter = x[0]; PB.renderAdmin(); }); af.appendChild(b);
    });
    var al = $('adList'); al.textContent = '';
    var shownAds = ads.filter(function (a) { return adFilter === 'todos' || PB.adStatus(a).k === adFilter; }).sort(function (a, b) { return (a.endsAt || 9e15) - (b.endsAt || 9e15); });
    if (!shownAds.length) al.appendChild(el('p', 'fine', 'No hay anuncios en esta vista.'));
    shownAds.forEach(function (ad) {
      var s = PB.adStatus(ad), c = el('div', 'card'), top = el('div', 'crow');
      top.appendChild(el('h3', '', PB.clip(ad.brand, 30) + ' · ' + PB.tierLabel(ad.tier)));
      top.appendChild(el('span', 'chipst st-' + s.k, s.t)); c.appendChild(top);
      c.appendChild(el('p', 'meta', [PB.adCats(ad).join(', '), ad.localidad, ad.barrio].filter(Boolean).join(' · ')));
      c.appendChild(el('p', 'meta', (ad.startsAt ? 'Desde ' + PB.fmtDate(ad.startsAt) : 'Sin publicar') + (ad.endsAt ? ' · vence ' + PB.fmtDate(ad.endsAt) : '')));
      c.appendChild(PB.statsLine(ad));
      var acts = el('div', 'acts');
      var ed = el('button', 'btn sm navy', 'Editar'); ed.type = 'button'; ed.addEventListener('click', function () { openEditor(ad); }); acts.appendChild(ed);
      var tg = el('button', 'btn sm ghost', ad.active === true ? 'Desactivar' : 'Activar'); tg.type = 'button';
      tg.addEventListener('click', function () { adminDo(function () { return B.setAdActive(ad.id, ad.active !== true, ad); }, ad.active === true ? 'Anuncio desactivado.' : 'Anuncio activado.'); }); acts.appendChild(tg);
      var rn = el('button', 'btn sm ghost', 'Renovar ' + C.termDays + ' días'); rn.type = 'button';
      rn.addEventListener('click', function () { adminDo(function () { return B.renewAd(ad.id, ad); }, 'Renovado por ' + C.termDays + ' días.'); }); acts.appendChild(rn);
      var vw = el('a', 'btn sm ghost', 'Ver ficha'); vw.href = '#anuncio-' + ad.id; acts.appendChild(vw);
      acts.appendChild(PB.reportLink(ad));
      var num = PB.normPhone(ad.whatsapp) || PB.normPhone(ad.phone);
      if (num && (s.k === 'porvencer' || s.k === 'vencido')) {
        var rm = el('a', 'btn sm ghost', 'Recordar por WhatsApp');
        rm.href = PB.waLink(num, 'Hola, tu anuncio "' + PB.clip(ad.headline || ad.brand, 48) + '" en ' + C.brand + (s.k === 'vencido' ? ' ya venció.' : ' vence el ' + PB.fmtDate(ad.endsAt) + '.') + ' ¿Quieres renovarlo?');
        rm.target = '_blank'; rm.rel = 'noopener noreferrer'; acts.appendChild(rm);
      }
      c.appendChild(acts); al.appendChild(c);
    });

    // Pedidos
    var fl = $('orderFilters'); fl.textContent = '';
    [['todos', 'Todos'], ['revision', 'Por revisar'], ['por_pagar', 'Por pagar'], ['pago_reportado', 'Pago avisado'], ['aprobado', 'Publicados'], ['rechazado', 'Rechazados']].forEach(function (x) {
      var b = el('button', 'chip', x[1]); b.type = 'button'; b.setAttribute('aria-pressed', orderFilter === x[0] ? 'true' : 'false');
      b.addEventListener('click', function () { orderFilter = x[0]; PB.renderAdmin(); }); fl.appendChild(b);
    });
    var ol = $('orderList'); ol.textContent = '';
    var shown = orders.filter(function (o) { return orderFilter === 'todos' || o.status === orderFilter; });
    if (!shown.length) ol.appendChild(el('p', 'fine', 'No hay pedidos en esta vista.'));
    shown.forEach(function (o) { ol.appendChild(PB.simpleOrder(o, true)); });

    renderDb();
    if (!cfgFilled) { cfgFilled = true; fillConfig(); }
  };

  // ---------- Base de datos de clientes ----------
  function haystack(o) {
    return PB.norm([C.contractNo(o), PB.ref(o), o.id, o.brand, o.legalName, o.docId, o.phone, o.whatsapp, o.mail, o.userEmail, o.headline, o.localidad, o.barrio].join(' ').replace(/[.\s-]+/g, ' '));
  }
  function kv(box, k, v) { if (!v && v !== 0) return; var r = el('div', 'kv'); r.appendChild(el('b', '', k)); r.appendChild(el('span', '', String(v))); box.appendChild(r); }
  function renderDb() {
    var q = PB.norm($('db-q').value.replace(/[.\s-]+/g, ' ')).trim(), box = $('db-res'); box.textContent = '';
    var list = state.orders.slice().sort(function (a, b) { return b.createdAt - a.createdAt; });
    if (q) { var words = q.split(' '); list = list.filter(function (o) { var h = haystack(o); return words.every(function (w) { return h.indexOf(w) >= 0; }); }); }
    else list = list.slice(0, 10);
    $('db-count').textContent = q ? list.length + ' resultado' + (list.length === 1 ? '' : 's') : state.orders.length + ' pedidos en total';
    if (!list.length) box.appendChild(el('p', 'fine', 'No se encontró nada con esa búsqueda.'));
    list.slice(0, 30).forEach(function (o) {
      var d = PB.contractData(o), ad = d.ad, c = el('div', 'card dbrow'), top = el('div', 'crow');
      top.appendChild(el('h3', '', C.contractNo(o) + ' · ' + PB.clip(o.brand, 40)));
      top.appendChild(el('span', 'chipst st-' + o.status, PB.STATUS[o.status] || o.status)); c.appendChild(top);
      kv(c, 'Cliente', d.legalName); kv(c, 'Cédula / NIT', d.docId); kv(c, 'Cuenta', o.userEmail);
      kv(c, 'WhatsApp', o.whatsapp); kv(c, 'Teléfono', o.phone); kv(c, 'Correo', o.mail); kv(c, 'Web', o.web);
      kv(c, 'Plan', o.tier ? PB.orderTitle(o) : 'Solo diseño'); kv(c, 'Duración', o.tier ? C.durLabel(o.days || C.termDays) : '');
      kv(c, 'Valor', PB.money(o.amount) + ' · ' + PB.payLabel(o)); kv(c, 'Referencia', PB.ref(o));
      kv(c, 'Solicitud', PB.fmtDateTime(o.createdAt)); if (o.paidAt) kv(c, 'Pagado', PB.fmtDateTime(o.paidAt));
      kv(c, 'Ubicación', [o.address, o.barrio, o.localidad].filter(Boolean).join(' · ')); kv(c, 'Categorías', PB.adCats(o).join(', '));
      if (ad) { var s = PB.adStatus(ad); kv(c, 'Anuncio', s.t + (ad.endsAt ? ' · vence ' + PB.fmtDate(ad.endsAt) : '')); kv(c, 'Visitas / clics', (ad.views || 0) + ' / ' + ((ad.clicksWhatsapp || 0) + (ad.clicksPhone || 0) + (ad.clicksEmail || 0) + (ad.clicksWeb || 0))); }
      var acts = el('div', 'acts'); acts.appendChild(PB.contractLink(o));
      if (ad) { var vw = el('a', 'btn sm ghost', 'Ver ficha'); vw.href = '#anuncio-' + ad.id; acts.appendChild(vw); }
      var num = PB.normPhone(o.whatsapp) || PB.normPhone(o.phone);
      if (num) { var wa = el('a', 'btn sm ghost', 'WhatsApp'); wa.href = PB.waLink(num, 'Hola, te escribimos de ' + C.brand + ' sobre tu contrato ' + C.contractNo(o) + '.'); wa.target = '_blank'; wa.rel = 'noopener noreferrer'; acts.appendChild(wa); }
      c.appendChild(acts); box.appendChild(c);
    });
  }
  function csv() {
    var rows = [['Contrato', 'Referencia', 'Estado', 'Negocio', 'Cliente', 'Cédula/NIT', 'Cuenta', 'WhatsApp', 'Teléfono', 'Correo', 'Plan', 'Días', 'Valor', 'Solicitud', 'Pagado']];
    state.orders.forEach(function (o) {
      var d = PB.contractData(o);
      rows.push([C.contractNo(o), PB.ref(o), PB.STATUS[o.status] || o.status, o.brand, d.legalName, d.docId, o.userEmail, o.whatsapp, o.phone, o.mail, o.tier ? PB.tierLabel(o.tier) : 'Diseño', o.days || '', o.amount || 0, new Date(o.createdAt).toISOString(), o.paidAt ? new Date(o.paidAt).toISOString() : '']);
    });
    var text = rows.map(function (r) { return r.map(function (x) { return '"' + String(x == null ? '' : x).replace(/"/g, '""') + '"'; }).join(','); }).join('\n');
    var a = document.createElement('a'); a.href = URL.createObjectURL(new Blob(['\ufeff' + text], { type: 'text/csv;charset=utf-8' }));
    a.download = 'clientes-ofertas-bogota.csv'; document.body.appendChild(a); a.click(); a.remove();
  }

  function fillConfig() {
    var c = PB.cfg();
    $('a-premium').value = c.prices.premium; $('a-banner').value = c.prices.banner; $('a-destacado').value = c.prices.destacado;
    $('a-mediano').value = c.prices.mediano; $('a-pequeno').value = c.prices.pequeno; $('a-design').value = c.designPrice;
    $('a-capp').value = c.caps.premium; $('a-capb').value = c.caps.banner; $('a-capd').value = c.caps.destacado;
    $('a-lenabled').checked = c.launch.enabled; $('a-luntil').value = c.launch.until || '';
  }

  // ---------- Editor ----------
  function dateInput(ms) { var d = new Date(ms), p = function (x) { return (x < 10 ? '0' : '') + x; }; return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate()); }
  function renderEditCats() {
    var box = $('ed-cats'); box.textContent = '';
    C.categorias.forEach(function (name) {
      var on = editCats.indexOf(name) >= 0, b = el('button', 'cp'); b.type = 'button';
      b.setAttribute('aria-pressed', on ? 'true' : 'false'); b.disabled = !on && editCats.length >= C.maxCats;
      b.appendChild(PB.ic(PB.catIcon(name))); b.appendChild(el('span', '', name));
      b.addEventListener('click', function () { var i = editCats.indexOf(name); if (i >= 0) editCats.splice(i, 1); else editCats.push(name); renderEditCats(); });
      box.appendChild(b);
    });
  }
  function openEditor(ad) {
    editing = ad || null; editFile = null; $('ed-file').value = '';
    $('edTitle').textContent = ad ? 'Editar anuncio' : 'Crear anuncio';
    PB.fillLocs($('ed-loc'), 'Elige…');
    PB.fillSelect($('ed-tier'), 'Elige…', PB.TIER_ORDER.map(function (t) { return [t, C.tiers[t].label]; }));
    PB.fillSelect($('ed-pal'), 'Elige…', C.palettes.map(function (p, i) { return [String(i), p.n]; }));
    var a = ad || { tier: 'pequeno', pal: 0, active: true, endsAt: Date.now() + C.termDays * PB.DAY };
    $('ed-brand').value = a.brand || ''; $('ed-head').value = a.headline || ''; $('ed-body').value = a.body || '';
    $('ed-offer').value = a.offer || ''; $('ed-hours').value = a.hours || '';
    editCats = ad ? PB.adCats(ad).slice() : []; renderEditCats();
    $('ed-loc').value = a.localidad || ''; $('ed-barrio').value = a.barrio || ''; $('ed-addr').value = a.address || '';
    $('ed-wa').value = a.whatsapp || ''; $('ed-phone').value = a.phone || ''; $('ed-email').value = a.mail || ''; $('ed-web').value = a.web || '';
    $('ed-tier').value = a.tier || 'pequeno'; $('ed-pal').value = String(a.pal || 0);
    $('ed-ends').value = dateInput(a.endsAt || Date.now() + C.termDays * PB.DAY);
    $('ed-active').checked = a.active === true || !ad;
    PB.setMsg($('edMsg'), '', ''); $('edProg').hidden = true;
    $('dlgEdit').showModal();
  }

  PB.initAdmin = function () {
    $('saveCfg').addEventListener('click', function () {
      var n = function (id) { return Math.round(Number($(id).value)); };
      var prices = { premium: n('a-premium'), banner: n('a-banner'), destacado: n('a-destacado'), mediano: n('a-mediano'), pequeno: n('a-pequeno') };
      var design = n('a-design'), capb = n('a-capb'), capd = n('a-capd'), capp = n('a-capp');
      var okPrices = Object.keys(prices).every(function (k) { return prices[k] >= 1500; }) && design >= 1500;
      if (!okPrices) { PB.setMsg($('admMsg'), 'Cada precio debe ser de al menos $1.500.', 'err'); return; }
      if (!(capb >= 1 && capd >= 1 && capp >= 1)) { PB.setMsg($('admMsg'), 'Revisa los cupos: deben ser números válidos.', 'err'); return; }
      adminDo(function () {
        return B.saveConfig({ prices: prices, designPrice: design, caps: { premium: capp, banner: capb, destacado: capd }, launch: { enabled: $('a-lenabled').checked, until: $('a-luntil').value || '' } });
      }, 'Guardado. Los visitantes ya ven los valores nuevos.');
    });
    $('db-q').addEventListener('input', renderDb);
    $('db-csv').addEventListener('click', csv);
    $('newAd').addEventListener('click', function () { openEditor(null); });
    $('edCancel').addEventListener('click', function () { $('dlgEdit').close(); });
    $('ed-file').addEventListener('change', function (e) {
      var f = e.target.files && e.target.files[0];
      if (f && !PB.checkFile(f, $('edMsg'))) { e.target.value = ''; editFile = null; return; }
      editFile = f || null; PB.setMsg($('edMsg'), '', '');
    });
    $('editForm').addEventListener('submit', async function (e) {
      e.preventDefault();
      var m = $('edMsg');
      function bad(t) { PB.setMsg(m, t, 'err'); }
      var brand = $('ed-brand').value.trim(), head = $('ed-head').value.trim();
      var hasM = !!(editFile || (editing && editing.media));
      if (brand.length < 2 && !hasM) return bad('Escribe el nombre del negocio.');
      if (head.length < 3 && !hasM) return bad('Escribe un título de al menos 3 letras, o sube una imagen.');
      if (!editCats.length || !$('ed-loc').value) return bad('Elige al menos una categoría y la localidad.');
      var wa = PB.normPhone($('ed-wa').value), ph = PB.normPhone($('ed-phone').value), ml = PB.normMail($('ed-email').value), wb = PB.normWeb($('ed-web').value);
      if (wa === null || ph === null) return bad('Revisa el número de WhatsApp o teléfono.');
      if (ml === null) return bad('El correo no parece válido.');
      if (wb === null) return bad('El sitio web no parece válido.');
      if (!wa && !ph && !ml && !wb) return bad('Pon al menos una forma de contacto.');
      var ends = $('ed-ends').value ? new Date($('ed-ends').value + 'T23:59:59').getTime() : null;
      $('edSave').disabled = true; $('edProg').hidden = !editFile; $('edProgFill').style.width = '0%';
      try {
        await B.saveAd({
          id: editing ? editing.id : null, brand: brand, headline: head, body: $('ed-body').value.trim(),
          offer: $('ed-offer').value.trim(), hours: $('ed-hours').value.trim(), cats: editCats.slice(), categoria: editCats[0], localidad: $('ed-loc').value,
          barrio: $('ed-barrio').value.trim(), address: $('ed-addr').value.trim(), whatsapp: wa || '', phone: ph || '', mail: ml || '', web: wb || '',
          tier: $('ed-tier').value || 'pequeno', pal: parseInt($('ed-pal').value, 10) || 0, active: $('ed-active').checked, endsAt: ends,
          startsAt: editing ? editing.startsAt : null, hadEnds: !!(editing && editing.endsAt)
        }, editFile, function (p) { $('edProgFill').style.width = p + '%'; });
        $('dlgEdit').close(); PB.setMsg($('admMsg'), 'Anuncio guardado.', 'ok');
      } catch (err) { bad(PB.errText(err)); }
      $('edSave').disabled = false;
    });
  };
})();
