/* Ventana emergente de bienvenida (solo sitio público): muestra los 3 servicios. Sale una vez por visita. */
(function () {
  'use strict';
  var PB = window.PB, C = PB.C, el = PB.el;
  var KEY = 'pb-popup-visto', SHOW_ON = ['inicio', 'directorio', 'ofertas'];

  function seen() { try { return sessionStorage.getItem(KEY) === '1'; } catch (e) { return false; } }
  function mark() { try { sessionStorage.setItem(KEY, '1'); } catch (e) {} }

  function block(icon, title, price, items, label, go) {
    var b = el('div', 'pop-blk');
    var h = el('div', 'pop-h'); var ic = el('span', 'pop-ic'); ic.appendChild(PB.ic(icon)); h.appendChild(ic);
    var t = el('div'); t.appendChild(el('h3', '', title)); t.appendChild(price); h.appendChild(t); b.appendChild(h);
    var ul = el('ul', 'pop-items'); items.forEach(function (x) { ul.appendChild(el('li', '', x)); }); b.appendChild(ul);
    var btn = el('button', 'btn sm ghost', label); btn.type = 'button'; btn.addEventListener('click', go); b.appendChild(btn);
    return b;
  }

  function open() {
    if (document.getElementById('popWelcome')) return;
    var cfg = PB.cfg(), launch = PB.launchOn();
    var ov = el('div', 'pop-ov'); ov.id = 'popWelcome'; ov.setAttribute('role', 'dialog'); ov.setAttribute('aria-modal', 'true'); ov.setAttribute('aria-labelledby', 'popTitle');
    var box = el('div', 'pop-box');
    var x = el('button', 'pop-x', '×'); x.type = 'button'; x.setAttribute('aria-label', 'Cerrar'); box.appendChild(x);
    box.appendChild(el('p', 'eyebrow', 'Ofertas Bogotá'));
    var h = el('h2', 'h2', 'Impulsamos tu negocio en Bogotá y la Sabana'); h.id = 'popTitle'; box.appendChild(h);
    if (launch) box.appendChild(el('p', 'pop-launch', 'Lanzamiento: publicidad gratis hasta el ' + C.launchUntilLabel(PB.state.config)));

    function close() { ov.remove(); document.removeEventListener('keydown', onKey); mark(); }
    function onKey(e) { if (e.key === 'Escape') close(); }
    function goTo(hash, anchor) {
      close();
      if (location.hash === hash) { var n = anchor && document.getElementById(anchor); if (n) n.scrollIntoView({ behavior: 'smooth' }); return; }
      location.hash = hash;
      if (anchor) setTimeout(function () { var n = document.getElementById(anchor); if (n) n.scrollIntoView({ behavior: 'smooth' }); }, 350);
    }

    var grid = el('div', 'pop-grid');
    var p1 = el('p', 'pop-price'); if (launch) { p1.appendChild(el('s', '', 'Desde ' + PB.money(cfg.prices.pequeno))); p1.appendChild(el('b', '', ' $0 por lanzamiento')); } else p1.appendChild(el('b', '', 'Desde ' + PB.money(cfg.prices.pequeno)));
    grid.appendChild(block('megaphone', 'Publicidad', p1, ['Aparece por localidad, barrio y categoría', 'Ficha con WhatsApp, horario y mapa', 'Espacios pequeños, destacados y banners'], 'Publicar mi negocio', function () { goTo('#anunciar'); }));
    var p2 = el('p', 'pop-price'); p2.appendChild(el('b', '', 'Desde ' + PB.money(cfg.designPrice)));
    grid.appendChild(block('tag', 'Diseño publicitario', p2, ['Imágenes y banners para tu anuncio', 'Publicaciones para Instagram y Facebook', 'Paquetes de 3 y 5 imágenes'], 'Ver diseño', function () { goTo('#planes', 'diseno'); }));
    var p3 = el('p', 'pop-price'); p3.appendChild(el('b', '', 'Desde ' + PB.money(C.services.web[0].from)));
    grid.appendChild(block('globe', 'Desarrollo web', p3, ['Páginas para negocios pequeños y grandes', 'Catálogo con pedidos por WhatsApp', 'Diseño adaptable a celular y computador'], 'Ver páginas web', function () { goTo('#planes', 'web'); }));
    box.appendChild(grid);

    var acts = el('div', 'acts');
    var cta = el('button', 'btn yellow big', launch ? 'Publica gratis tu negocio' : 'Publica tu negocio'); cta.type = 'button'; cta.addEventListener('click', function () { goTo('#anunciar'); }); acts.appendChild(cta);
    var w = el('a', 'btn ghost', 'Escríbenos por WhatsApp'); w.href = PB.waLink(PB.waNum(C.pago.whatsapp), 'Hola, quiero información sobre los servicios de Ofertas Bogotá.'); w.target = '_blank'; w.rel = 'noopener'; acts.appendChild(w);
    box.appendChild(acts);

    ov.appendChild(box); document.body.appendChild(ov);
    x.addEventListener('click', close);
    ov.addEventListener('click', function (e) { if (e.target === ov) close(); });
    document.addEventListener('keydown', onKey);
    cta.focus();
  }

  PB.initPopup = function () {
    if (PB.entry !== 'public' || seen()) return;
    setTimeout(function () {
      if (seen() || SHOW_ON.indexOf(PB.state.view) < 0) return;
      open();
    }, 2000);
  };
})();
