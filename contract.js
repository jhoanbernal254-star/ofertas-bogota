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
  PB.contractLink = function (o, cls) {
    var a = el('a', cls || 'btn sm ghost', 'Ver contrato'); a.href = '#contrato-' + o.id; return a;
  };

  function blank(v, fallback) { return v ? v : (fallback || '—'); }
  function dline(label, val) { var p = el('p', 'ct-line'); p.appendChild(el('b', '', label + ' ')); p.appendChild(document.createTextNode(val)); return p; }
  function sec(title, nodes) { var s = el('section', 'ct-sec'); s.appendChild(el('h3', '', title)); nodes.forEach(function (n) { s.appendChild(n); }); return s; }
  function para(t) { return el('p', '', t); }

  PB.renderContrato = function () {
    var box = $('contractBody'); box.textContent = '';
    var o = state.orders.filter(function (x) { return x.id === state.contractId; })[0];
    if (!o) { box.appendChild(el('p', 'note', state.status === 'ok' && state.authReady ? 'No encontramos este contrato.' : 'Cargando…')); return; }
    var d = PB.contractData(o), L = C.legal, ad = d.ad;
    box.appendChild(el('h1', 'ct-title', 'Contrato de prestación de servicio de publicidad digital'));
    box.appendChild(el('p', 'ct-no', 'N.º ' + d.no));
    box.appendChild(para('Entre los suscritos, por una parte, OFERTAS BOGOTÁ, en adelante el “PRESTADOR”, y por la otra, el “ANUNCIANTE”, se celebra el presente contrato, que se rige por las siguientes cláusulas:'));

    var cols = el('div', 'ct-cols');
    var a = el('div'); a.appendChild(el('h4', '', 'PRESTADOR'));
    [['Nombre', L.name], ['NIT/CC', L.nit], ['Correo', L.email], ['Teléfono', L.phone], ['Sitio web', L.web]].forEach(function (r) { a.appendChild(dline(r[0] + ':', blank(r[1]))); });
    var b = el('div'); b.appendChild(el('h4', '', 'ANUNCIANTE'));
    [['Nombre o razón social', d.legalName], ['CC/NIT', d.docId], ['Negocio', o.brand], ['Correo', o.userEmail || o.mail], ['Teléfono', o.phone || o.whatsapp]].forEach(function (r) { b.appendChild(dline(r[0] + ':', blank(r[1]))); });
    cols.appendChild(a); cols.appendChild(b);
    box.appendChild(sec('1. Partes del contrato', [cols]));

    box.appendChild(sec('2. Objeto del contrato', [para('El PRESTADOR se obliga a realizar la difusión y promoción del negocio, producto o servicio del ANUNCIANTE en los canales digitales de Ofertas Bogotá (sitio web, redes sociales y/o medios aliados), de acuerdo con el plan contratado.')]));

    var plan = o.tier ? C.tiers[o.tier].label : 'Servicio de diseño';
    var desc = o.tier ? C.tiers[o.tier].note + '. Medida del espacio: ' + C.sizeLabel(o.tier) + '.' : '';
    if (o.designPieces) desc += ' Incluye diseño de ' + o.designPieces + (o.designPieces === 1 ? ' pieza.' : ' piezas.');
    if (o.renewOf) desc = 'Renovación del anuncio existente. ' + desc;
    var free = o.promo && !o.amount;
    box.appendChild(sec('3. Plan contratado y valor', [
      dline('Plan de publicidad:', plan), dline('Descripción:', desc.trim() || '—'),
      dline('Duración:', o.tier ? C.durLabel(o.days || C.termDays) : '—'),
      dline('Valor del servicio:', PB.money(o.amount) + ' COP' + (free ? ' (gratis por la promoción de lanzamiento)' : '')),
      dline('Fecha de pago:', o.paidAt ? PB.longDate(o.paidAt) : (free ? 'Sin pago (promoción)' : 'Pendiente')),
      dline('Comprobante / Referencia:', PB.ref(o))
    ]));

    var vig = ad && ad.startsAt && ad.endsAt
      ? 'El servicio de publicidad estará activo desde el ' + PB.longDate(ad.startsAt) + ' hasta el ' + PB.longDate(ad.endsAt) + ', por el tiempo establecido en el plan contratado.'
      : 'Las fechas de vigencia se fijan cuando el anuncio se publique, por el tiempo establecido en el plan contratado.';
    box.appendChild(sec('4. Vigencia', [para(vig)]));
    box.appendChild(sec('5. Responsabilidades', [
      para('Del PRESTADOR: publicar el anuncio según el plan contratado, mantenerlo activo durante la vigencia y brindar soporte del servicio.'),
      para('Del ANUNCIANTE: suministrar información, imágenes y contenido veraz, lícito y de su propiedad, y realizar el pago en los términos acordados.')]));
    box.appendChild(sec('6. Condiciones de publicación', [
      para('El contenido publicitario debe ser claro, veraz y no infringir derechos de terceros.'),
      para('Las imágenes y recursos deben ser entregados en la calidad y formatos solicitados por el PRESTADOR.'),
      para('Las modificaciones al anuncio podrán solicitarse durante la vigencia del plan, según disponibilidad.')]));
    box.appendChild(sec('7. Cancelación y reembolso', [
      para('No aplica reembolso una vez el anuncio haya sido publicado y se encuentre activo.'),
      para('En caso de cancelación antes de la publicación, se podrá solicitar la devolución del valor pagado, de acuerdo con la política de la plataforma.')]));
    box.appendChild(sec('8. Tratamiento de datos personales', [para('El ANUNCIANTE autoriza al PRESTADOR a tratar sus datos personales conforme a la Ley 1581 de 2012 y su normativa complementaria, únicamente para la gestión del servicio contratado.')]));
    box.appendChild(sec('9. Aceptación', [
      para('Con la firma o la aceptación electrónica de este documento, ambas partes manifiestan haber leído, entendido y aceptado la totalidad de las condiciones del presente contrato.'),
      para('Aceptación electrónica del ANUNCIANTE: ' + PB.fmtDateTime(o.createdAt) + ', al enviar la solicitud ' + PB.ref(o) + ' desde su cuenta ' + blank(o.userEmail) + '.')]));
    var sg = el('div', 'ct-sign');
    [['Firma del PRESTADOR', 'Ofertas Bogotá', 'CC/NIT: ' + blank(L.nit, '________')], ['Firma del ANUNCIANTE', blank(d.legalName, '________'), 'CC/NIT: ' + blank(d.docId, '________')]].forEach(function (s) {
      var c = el('div'); c.appendChild(el('div', 'ct-line-sign')); c.appendChild(el('b', '', s[0])); c.appendChild(el('span', '', s[1])); c.appendChild(el('span', '', s[2])); sg.appendChild(c);
    });
    box.appendChild(sg);
    box.appendChild(el('p', 'fine noprint', 'Documento generado automáticamente por ' + C.brand + '. Borrador pendiente de revisión legal.'));
  };
  PB.initContract = function () {
    $('ctPrint').addEventListener('click', function () { window.print(); });
  };
})();
