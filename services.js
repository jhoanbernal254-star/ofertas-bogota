/* "Planes y servicios": lanzamiento, diseño, páginas web, paquetes, preguntas frecuentes y contacto. */
(function () {
  'use strict';
  var PB = window.PB, C = PB.C, $ = PB.$, el = PB.el, S = C.services;

  function wa(text) { return PB.waLink(PB.waNum(C.pago.whatsapp), text); }
  function waBtn(label, text, cls) { var a = el('a', 'btn ' + (cls || 'navy'), label); a.href = wa(text); a.target = '_blank'; a.rel = 'noopener'; return a; }
  function head(eyebrow, title, sub) {
    var h = el('div', 'svc-head'); h.appendChild(el('p', 'eyebrow', eyebrow)); h.appendChild(el('h2', 'h2', title));
    if (sub) h.appendChild(el('p', 'lede', sub)); return h;
  }
  function list(items) { var ul = el('ul', 'svc-list'); items.forEach(function (x) { var li = el('li'); li.appendChild(PB.ic('check')); li.appendChild(el('span', '', x)); ul.appendChild(li); }); return ul; }

  PB.renderServices = function () {
    var box = $('plMore'); if (!box) return; box.textContent = '';
    var slot = $('plLaunchSlot'); if (slot) slot.textContent = '';
    var cfg = PB.cfg();

    // 1. Lanzamiento
    if (PB.launchOn()) {
      var l = el('section', 'svc launch-box');
      l.appendChild(el('p', 'eyebrow', 'Promoción de lanzamiento'));
      l.appendChild(el('h2', 'h2', 'Publicidad gratis hasta el ' + C.launchUntilLabel(state())));
      l.appendChild(el('p', '', 'Todos los espacios publicitarios cuestan $0 para todos los negocios y emprendimientos de Bogotá y la Sabana. Verás el precio normal tachado: durante el lanzamiento no lo pagas.'));
      l.appendChild(list(['Publicación de tu negocio en Ofertas Bogotá', 'Información comercial, contacto y enlace directo a WhatsApp', 'Presencia en búsquedas por localidad, barrio y categoría', 'Sin compromiso de permanencia', 'Revisamos cada solicitud antes de publicar']));
      l.appendChild(el('p', 'fine', 'El diseño publicitario y la creación de páginas web se cobran por separado. Puedes aportar tu propio material sin contratar el diseño.'));
      var ac = el('div', 'acts'); var a = el('a', 'btn yellow big', 'Publica gratis tu negocio'); a.href = '#anunciar'; ac.appendChild(a); l.appendChild(ac);
      if (slot) slot.appendChild(l);
    }

    // 3. Diseño
    var d = el('section', 'svc'); d.id = 'diseno';
    d.appendChild(head('Diseño publicitario', 'Creamos tus imágenes publicitarias', '¿Quieres anunciarte pero no tienes imágenes? Las diseñamos según tu negocio. Es un servicio independiente: no necesitas comprar un plan de publicidad.'));
    var g = el('div', 'svc-grid');
    S.design.forEach(function (it) {
      var c = el('div', 'svc-card'); c.appendChild(el('h3', '', it.name));
      var price = it.id === 'img1' ? cfg.designPrice : it.id === 'img3' ? C.designCost(3, cfg.designPrice) : it.id === 'img5' ? C.designCost(5, cfg.designPrice) : it.price;
      c.appendChild(el('div', 'price', PB.money(price))); c.appendChild(el('p', 'meta', it.note));
      c.appendChild(waBtn('Pedir por WhatsApp', 'Hola, quiero el servicio de diseño: ' + it.name + ' (' + PB.money(price) + ').', 'ghost')); g.appendChild(c);
    });
    d.appendChild(g);
    d.appendChild(el('h3', 'h3', '¿Qué podemos diseñar?')); d.appendChild(list(S.designCan));
    var ac2 = el('div', 'acts'); var ob = el('a', 'btn navy', 'Pedir un diseño en línea'); ob.href = '#anunciar'; ob.addEventListener('click', function () { PB.pick('', 30); }); ac2.appendChild(ob); d.appendChild(ac2);
    d.appendChild(el('p', 'fine', 'Los precios pueden variar según la complejidad y los cambios solicitados.'));
    box.appendChild(d);

    // 4. Páginas web
    var w = el('section', 'svc'); w.id = 'web';
    w.appendChild(head('Páginas web', 'Tu negocio también en internet', 'Desarrollamos sitios web para emprendedores, comerciantes y empresas pequeñas o grandes. Es un servicio independiente de la publicidad.'));
    var wg = el('div', 'svc-grid three');
    S.web.forEach(function (p) {
      var c = el('div', 'svc-card' + (p.id === 'catalogo' ? ' hot' : '')); if (p.id === 'catalogo') c.appendChild(el('span', 'badge-hot', p.tag));
      c.appendChild(el('h3', '', p.name));
      c.appendChild(el('div', 'price', p.from ? 'Desde ' + PB.money(p.from) : 'Según cotización'));
      c.appendChild(list(p.items));
      c.appendChild(waBtn(p.from ? 'Solicitar esta web' : 'Pedir cotización', 'Hola, me interesa el plan "' + p.name + '" para mi negocio.', p.id === 'catalogo' ? 'yellow' : 'navy'));
      wg.appendChild(c);
    });
    w.appendChild(wg); w.appendChild(el('p', 'fine', S.webNote)); box.appendChild(w);

    // 5. Paquetes
    var k = el('section', 'svc'); k.id = 'paquetes';
    k.appendChild(head('Paquetes combinados', 'Varios servicios en uno', 'Para negocios que necesitan publicidad, diseño y página web.'));
    var kg = el('div', 'svc-grid');
    S.combos.forEach(function (p) {
      var c = el('div', 'svc-card'); c.appendChild(el('h3', '', p.name));
      c.appendChild(el('div', 'price', p.price ? PB.money(p.price) : 'Según cotización'));
      c.appendChild(list(p.items)); c.appendChild(el('p', 'meta', p.note));
      c.appendChild(waBtn('Pedir este paquete', 'Hola, me interesa el ' + p.name + '.', 'ghost')); kg.appendChild(c);
    });
    k.appendChild(kg); box.appendChild(k);

    // 6. Preguntas frecuentes
    var f = el('section', 'svc'); f.id = 'preguntas';
    f.appendChild(head('Preguntas frecuentes', 'Lo que más nos preguntan'));
    S.faq.forEach(function (q) { var dt = el('details', 'faq'); dt.appendChild(el('summary', '', q[0])); dt.appendChild(el('p', '', q[1])); f.appendChild(dt); });
    box.appendChild(f);

    // 7. Contacto
    var ct = el('section', 'svc contact-box'); ct.id = 'contacto';
    ct.appendChild(el('h2', 'h2', 'Escríbenos y empezamos'));
    ct.appendChild(el('p', '', 'Ofertas Bogotá: conectamos negocios con personas. Cobertura: ' + C.site.cobertura));
    var ca = el('div', 'acts');
    ca.appendChild(waBtn('WhatsApp ' + C.legal.phone, 'Hola, quiero información sobre los servicios de Ofertas Bogotá.', 'yellow'));
    var ig = el('a', 'btn ghost-w', 'Instagram @' + C.site.instagram); ig.href = 'https://instagram.com/' + C.site.instagram; ig.target = '_blank'; ig.rel = 'noopener'; ca.appendChild(ig);
    ct.appendChild(ca); box.appendChild(ct);
  };
  function state() { return PB.state.config; }
})();
