/* Contrato de publicidad digital: se arma solo con los datos del pedido. */
(function () {
  'use strict';
  var PB = window.PB, C = PB.C, $ = PB.$, el = PB.el, state = PB.state;

  // Datos del contrato de un pedido (si es renovación, toma los datos legales de otro pedido de la misma cuenta).
  PB.contractData = function (o) {
    var src = o;
    if (!o.legalName) src = state.orders.filter(function (x) { return x.uid === o.uid && x.legalName; })[0] || o;
    var ad = o.renewOf ? PB.findAd(o.renewOf) : (o.tier ? PB.findAd(o.id) : null);
    return { no: C.contractNo(o), legalName: src.legalName || '', docId: src.docId || '', ad: ad };
  };
  PB.canContract = function (o) { return o.status === 'aprobado' || o.status === 'por_pagar' || o.status === 'pago_reportado'; };
  PB.contractReady = function (o) { return PB.isAdmin() || o.contractStatus === 'enviado'; };
  PB.contractLink = function (o, cls) {
    var a = el('a', cls || 'btn sm ghost', 'Ver contrato'); a.href = '#contrato-' + o.id; return a;
  };

  function blank(v, fallback) { return v ? v : (fallback || '—'); }
  var IMG = window.PB_CT_IMG || {};
  function img(k, cls) { var i = el('img', cls); i.src = IMG[k] || ''; i.alt = ''; return i; }
  function line(label, val) { var p = el('p', 'ct-l'); p.appendChild(el('b', '', label + ' ')); p.appendChild(document.createTextNode(val)); return p; }
  function title(n, text, icon) {
    var h = el('div', 'ct-h'); h.appendChild(img(icon, 'ct-ic')); h.appendChild(el('span', '', n + '. ' + text)); return h;
  }
  function boxOf(nodes) { var b = el('div', 'ct-box'); nodes.forEach(function (n) { b.appendChild(n); }); return b; }
  function block(n, text, icon, nodes) { var s = el('section', 'ct-b'); s.appendChild(title(n, text, icon)); s.appendChild(boxOf(nodes)); return s; }
  function ul(items) { var u = el('ul'); items.forEach(function (t) { u.appendChild(el('li', '', t)); }); return u; }
  function page() { var p = el('div', 'ct-page'); p.appendChild(img('header', 'ct-top')); var body = el('div', 'ct-in'); p.appendChild(body); p.appendChild(img('footer', 'ct-bot')); return { p: p, body: body }; }
  function pair(a, b) { var r = el('div', 'ct-pair'); r.appendChild(a); r.appendChild(b); return r; }

  PB.renderContrato = function () {
    var box = $('contractBody'); box.textContent = '';
    var o = state.orders.filter(function (x) { return x.id === state.contractId; })[0];
    if (!o) { box.appendChild(el('p', 'note', state.status === 'ok' && state.authReady ? 'No encontramos este contrato.' : 'Cargando…')); return; }
    if (!PB.contractReady(o)) {
      box.appendChild(el('p', 'note', o.contractStatus === 'solicitado' ? 'Tu contrato está en revisión. Cuando lo enviemos te avisamos y lo verás en Contratos.' : 'Este contrato todavía no se ha enviado. Pídelo desde la sección Contratos de tu panel.'));
      var back = el('a', 'btn ghost', 'Ir a mi panel'); back.href = '#cuenta'; box.appendChild(back); return;
    }
    var d = PB.contractData(o), L = C.legal, ad = d.ad;
    var P1 = page(), P2 = page(), in1 = P1.body, in2 = P2.body;

    var ttl = el('div', 'ct-title');
    ttl.appendChild(img('title1', 'ct-t1'));
    var tt = el('div'); tt.appendChild(el('h1', '', 'CONTRATO DE PRESTACIÓN DE SERVICIO DE PUBLICIDAD DIGITAL'));
    tt.appendChild(el('p', 'ct-no', 'N.º: ' + d.no));
    ttl.appendChild(tt); ttl.appendChild(img('title2', 'ct-t2'));
    in1.appendChild(ttl);
    var intro = el('p', 'ct-intro'); intro.innerHTML = '';
    [['Entre los suscritos, por una parte, ', 0], ['OFERTAS BOGOTÁ', 1], [', en adelante el ', 0], ['“PRESTADOR”', 1], [', y por la otra, el ', 0], ['“ANUNCIANTE”', 1], [', se celebra el presente contrato de prestación de servicio de publicidad digital, el cual se rige por las siguientes cláusulas:', 0]].forEach(function (x) { intro.appendChild(x[1] ? el('b', '', x[0]) : document.createTextNode(x[0])); });
    in1.appendChild(intro);

    // 1. Partes
    var a = el('div', 'ct-col'); a.appendChild(el('h4', '', 'PRESTADOR:'));
    a.appendChild(el('p', 'ct-l', L.name));
    if (L.nit) a.appendChild(line('Identificación (NIT/CC):', L.nit));
    if (L.email) a.appendChild(line('Correo:', L.email));
    if (L.phone) a.appendChild(line('WhatsApp:', L.phone));
    if (L.web) a.appendChild(line('Sitio web:', L.web));
    var b = el('div', 'ct-col'); b.appendChild(el('h4', '', 'ANUNCIANTE:'));
    b.appendChild(line('Nombre o razón social:', blank(d.legalName))); b.appendChild(line('Identificación (CC/NIT):', blank(d.docId)));
    b.appendChild(line('Negocio / Emprendimiento:', blank(o.brand))); b.appendChild(line('Correo:', blank(o.userEmail || o.mail)));
    b.appendChild(line('Teléfono:', blank(o.phone || o.whatsapp)));
    var two = el('div', 'ct-two'); two.appendChild(a); two.appendChild(b);
    in1.appendChild(block(1, 'PARTES DEL CONTRATO', 'i1', [two]));

    in1.appendChild(block(2, 'OBJETO DEL CONTRATO', 'i2', [el('p', '', 'El PRESTADOR se obliga a realizar la difusión y promoción del negocio, producto o servicio del ANUNCIANTE en los canales digitales de Ofertas Bogotá (sitio web, redes sociales y/o medios aliados), de acuerdo con el plan contratado.')]));

    var plan = o.tier ? C.tiers[o.tier].label : 'Servicio de diseño';
    var desc = o.tier ? C.tiers[o.tier].note + '. Medida: ' + C.sizeLabel(o.tier) + '.' : '';
    if (o.designPieces) desc += ' Incluye diseño de ' + o.designPieces + (o.designPieces === 1 ? ' pieza.' : ' piezas.');
    if (o.renewOf) desc = 'Renovación del anuncio existente. ' + desc;
    var free = o.promo && !o.amount;
    var l3 = el('div', 'ct-col'); l3.appendChild(line('Plan de publicidad:', plan)); l3.appendChild(line('Descripción:', desc.trim() || '—')); l3.appendChild(line('Duración:', o.tier ? C.durLabel(o.days || C.termDays) : '—'));
    var r3 = el('div', 'ct-col'); r3.appendChild(line('Valor del servicio:', PB.money(o.amount) + ' COP' + (free ? ' (gratis, promoción de lanzamiento)' : '')));
    r3.appendChild(line('Fecha de pago:', o.paidAt ? PB.longDate(o.paidAt) : (free ? 'Sin pago (promoción)' : 'Pendiente')));
    r3.appendChild(line('Comprobante / Referencia:', PB.ref(o)));
    var two3 = el('div', 'ct-two'); two3.appendChild(l3); two3.appendChild(r3);
    in1.appendChild(block(3, 'PLAN CONTRATADO Y VALOR', 'i3', [two3]));

    var vig = ad && ad.startsAt && ad.endsAt
      ? 'El servicio de publicidad estará activo desde el ' + PB.longDate(ad.startsAt) + ' hasta el ' + PB.longDate(ad.endsAt) + ', por el tiempo establecido en el plan contratado.'
      : 'El servicio de publicidad estará activo desde la fecha en que se publique el anuncio, por el tiempo establecido en el plan contratado. Las fechas exactas quedan registradas en la plataforma.';
    var resp = [el('p', '', ''), ul(['Del PRESTADOR: publicar el anuncio según el plan contratado, mantenerlo activo durante la vigencia y brindar soporte del servicio.', 'Del ANUNCIANTE: suministrar información, imágenes y contenido veraz, lícito y de su propiedad, y realizar el pago en los términos acordados.'])];
    resp.shift();
    in1.appendChild(pair(block(4, 'VIGENCIA', 'i4', [el('p', '', vig)]), block(5, 'RESPONSABILIDADES', 'i5', resp)));

    in2.appendChild(pair(
      block(6, 'CONDICIONES DE PUBLICACIÓN', 'i6', [ul(['El contenido publicitario debe ser claro, veraz y no infringir derechos de terceros.', 'Las imágenes y recursos deben ser entregados en la calidad y formatos solicitados por el PRESTADOR.', 'Las modificaciones al anuncio podrán solicitarse durante la vigencia del plan, según disponibilidad.'])]),
      block(7, 'CANCELACIÓN Y REEMBOLSO', 'i7', [ul(['No aplica reembolso una vez el anuncio haya sido publicado y se encuentre activo.', 'En caso de cancelación antes de la publicación, se podrá solicitar la devolución del valor pagado, de acuerdo con la política de la plataforma.'])])));
    in2.appendChild(pair(
      block(8, 'TRATAMIENTO DE DATOS PERSONALES', 'i8', [el('p', '', 'El ANUNCIANTE autoriza al PRESTADOR a tratar sus datos personales conforme a la Ley 1581 de 2012 y su normativa complementaria, únicamente para la gestión del servicio contratado.')]),
      block(9, 'ACEPTACIÓN', 'i9', [el('p', '', 'Con la firma o la aceptación electrónica de este documento, ambas partes manifiestan haber leído, entendido y aceptado la totalidad de las condiciones del presente contrato.'), el('p', 'ct-acc', 'Aceptado electrónicamente por el ANUNCIANTE el ' + PB.fmtDateTime(o.createdAt) + ' al enviar la solicitud ' + PB.ref(o) + ' desde ' + blank(o.userEmail) + '.')])));
    var sg = el('div', 'ct-sign');
    var s1 = el('div', 'ct-s'); s1.appendChild(img('logo', 'ct-sl')); var t1 = el('div'); t1.appendChild(el('div', 'ct-rule')); t1.appendChild(el('p', '', 'Firma del ')); t1.firstChild.nextSibling.appendChild(el('b', '', 'PRESTADOR')); t1.appendChild(el('p', '', 'Ofertas Bogotá')); s1.appendChild(t1);
    var s2 = el('div', 'ct-s'); s2.appendChild(img('shop', 'ct-sl')); var t2 = el('div'); t2.appendChild(el('div', 'ct-rule')); t2.appendChild(el('p', '', 'Firma del ')); t2.firstChild.nextSibling.appendChild(el('b', '', 'ANUNCIANTE')); t2.appendChild(el('p', '', 'Nombre: ' + blank(d.legalName, '________________'))); t2.appendChild(el('p', '', 'CC/NIT: ' + blank(d.docId, '________________'))); s2.appendChild(t2);
    sg.appendChild(s1); sg.appendChild(s2); in2.appendChild(sg);
    box.appendChild(P1.p); box.appendChild(P2.p);
  };
  PB.initContract = function () {
    $('ctPrint').addEventListener('click', function () { window.print(); });
  };
})();
