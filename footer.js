/* Pie de página (editable desde Admin → Configuración) y páginas legales (textos de legal-docs.js). */
(function () {
  var PB = window.PB, C = window.PB_CONFIG, el = PB.el;
  var SVG = 'http://www.w3.org/2000/svg';
  var ICONS = {
    whatsapp: '<path d="M4 20l1.3-4.2A8 8 0 1 1 8.4 18.8z" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/><path d="M9.3 8.6c.3 2.8 2.9 5.4 5.9 6.1l1-1.2-1.9-1-.9.7c-.9-.4-1.9-1.4-2.3-2.3l.7-.9-1-1.9z" fill="currentColor"/>',
    instagram: '<rect x="4" y="4" width="16" height="16" rx="4.5" fill="none" stroke="currentColor" stroke-width="1.8"/><circle cx="12" cy="12" r="3.6" fill="none" stroke="currentColor" stroke-width="1.8"/><circle cx="16.8" cy="7.2" r="1.1" fill="currentColor"/>',
    facebook: '<path d="M13.6 21v-7.6h2.6l.4-3h-3V8.5c0-.9.3-1.4 1.5-1.4h1.6V4.4A20 20 0 0 0 14.4 4C12 4 10.6 5.4 10.6 8v2.4H8v3h2.6V21z" fill="currentColor"/>',
    tiktok: '<path d="M14.6 3.5c.3 2.2 1.6 3.7 3.8 3.9v2.8c-1.4 0-2.700-.4-3.800-1.2v5.6a5 5 0 1 1-5-5c.3 0 .6 0 .9.1v2.9a2.2 2.2 0 1 0 1.3 2V3.5z" fill="currentColor"/>',
    youtube: '<rect x="3" y="6" width="18" height="12" rx="3.5" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="M10.2 9.3v5.4l4.800-2.7z" fill="currentColor"/>',
    mail: '<rect x="3.5" y="5.5" width="17" height="13" rx="2.5" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="M4 7.5l8 6 8-6" fill="none" stroke="currentColor" stroke-width="1.8"/>',
    shield: '<path d="M12 3l7 2.6v5.4c0 4.300-2.9 8-7 10-4.100-2-7-5.700-7-10V5.6z" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/><path d="M8.8 12l2.3 2.3 4.200-4.6" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>',
    tag: '<path d="M3.5 12.5V4.5h8l9 9-8 8z" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/><circle cx="8" cy="9" r="1.4" fill="currentColor"/>',
    pin: '<path d="M12 21s7-6 7-11.2A7 7 0 0 0 5 9.8C5 15 12 21 12 21z" fill="none" stroke="currentColor" stroke-width="1.8"/><circle cx="12" cy="10" r="2.4" fill="none" stroke="currentColor" stroke-width="1.8"/>',
    heart: '<path d="M12 20s-8-4.800-8-10.5A4.5 4.5 0 0 1 12 7a4.5 4.5 0 0 1 8 2.5C20 15.2 12 20 12 20z" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/>'
  };
  function icon(name) {
    var s = document.createElementNS(SVG, 'svg'); s.setAttribute('viewBox', '0 0 24 24'); s.setAttribute('width', '22'); s.setAttribute('height', '22'); s.setAttribute('aria-hidden', 'true');
    s.innerHTML = ICONS[name] || ''; return s;
  }
  function ext(a, href) { a.href = href; if (/^https:/.test(href)) { a.target = '_blank'; a.rel = 'noopener noreferrer'; } return a; }
  var SOCIAL = [['whatsapp', 'WhatsApp'], ['instagram', 'Instagram'], ['facebook', 'Facebook'], ['tiktok', 'TikTok'], ['youtube', 'YouTube']];
  var MAILS = [['administracion', 'Administración'], ['comercial', 'Comercial'], ['facturacion', 'Facturación'], ['soporte', 'Soporte'], ['pqrs', 'PQRS']];
  PB.FOOT_SOCIAL = SOCIAL; PB.FOOT_MAILS = MAILS;

  PB.renderFooter = function () {
    var f = PB.cfg().footer, g = $('fGrid'); if (!g) return;
    function $(id) { return document.getElementById(id); }
    g.textContent = '';
    // Marca
    var ab = el('div', 'fabout');
    var logo = el('a', 'logo'); logo.href = '#inicio'; logo.setAttribute('aria-label', 'Ofertas Bogotá, ir al inicio');
    var li = el('span', 'logo-ic'); li.appendChild(icon('tag')); logo.appendChild(li);
    var lt = el('span', 'logo-tx'), b = el('b', '', 'Ofertas'); b.appendChild(el('i', '', '.')); lt.appendChild(b); lt.appendChild(el('small', '', 'BOGOTÁ')); logo.appendChild(lt);
    ab.appendChild(logo);
    if (f.tagline) ab.appendChild(el('p', '', f.tagline));
    if (f.tagline2) ab.appendChild(el('p', 'hl', f.tagline2));
    var so = el('div', 'fsocial');
    SOCIAL.forEach(function (s) { var u = f.social[s[0]]; if (!u) return; var a = ext(el('a'), u); a.setAttribute('aria-label', s[1]); a.title = s[1]; a.appendChild(icon(s[0])); so.appendChild(a); });
    if (so.children.length) ab.appendChild(so);
    g.appendChild(ab);
    // Categorías y localidades
    function col(title, names, key, all, allHref) {
      var d = el('div'), ul = el('ul'); d.appendChild(el('h4', '', title));
      names.forEach(function (name) {
        var l = el('li'), a = el('a', '', name); a.href = '#directorio';
        a.addEventListener('click', function () { var o = {}; o[key] = name; PB.setFilters(o); });
        l.appendChild(a); ul.appendChild(l);
      });
      var l = el('li', 'all'), a = el('a', '', all + ' ›'); a.href = allHref;
      a.addEventListener('click', function () { PB.setFilters({}); }); l.appendChild(a); ul.appendChild(l);
      d.appendChild(ul); return d;
    }
    g.appendChild(col('Categorías', C.categorias.slice(0, 6), 'cat', 'Ver todas las categorías', '#directorio'));
    g.appendChild(col('Localidades', C.localidadesTop.slice(0, 6), 'loc', 'Ver todas las localidades', '#directorio'));
    // Comerciantes
    var cm = el('div'), cu = el('ul'); cm.appendChild(el('h4', '', 'Comerciantes'));
    [['Publicar un anuncio', '#anunciar'], ['Diseño gráfico', '#planes'], ['Páginas web', '#planes'], ['Planes y precios', '#planes'], ['Mi panel', '#cuenta', 'navCuenta'], ['Centro de ayuda', '#pqrs']].forEach(function (x) {
      var l = el('li'), a = el('a', '', x[0]); a.href = x[1]; if (x[2]) a.id = x[2]; l.appendChild(a); cu.appendChild(l);
    });
    cm.appendChild(cu); g.appendChild(cm);
    // Tarjeta de invitación
    var cta = el('div', 'fcta'); cta.appendChild(el('h4', '', f.cta.title)); cta.appendChild(el('p', '', f.cta.text));
    var bt = el('a', 'btn yellow'); bt.href = '#anunciar'; bt.textContent = f.cta.button + ' →'; cta.appendChild(bt); g.appendChild(cta);
    // Insignias
    var bd = $('fBadges'); bd.textContent = '';
    var bi = ['pin', 'tag', 'pin', 'heart']; bi[0] = 'shield';
    f.badges.forEach(function (x, i) {
      if (!x.title) return; var d = el('div', 'fbadge'), ic = el('span', 'fb-ic'); ic.appendChild(icon(bi[i % 4])); d.appendChild(ic);
      var t = el('div'); t.appendChild(el('b', '', x.title)); if (x.text) t.appendChild(el('small', '', x.text)); d.appendChild(t); bd.appendChild(d);
    });
    bd.hidden = !bd.children.length;
    // Correos
    var ml = $('fMails'); ml.textContent = '';
    MAILS.forEach(function (m) { var v = f.emails[m[0]]; if (!v) return; var s = el('span', 'fm'); s.appendChild(icon('mail')); s.appendChild(el('b', '', m[1] + ': ')); var a = el('a', '', v); a.href = 'mailto:' + v; s.appendChild(a); ml.appendChild(s); });
    ml.hidden = !ml.children.length;
    // Barra inferior
    var lk = $('legalLinks'); lk.textContent = '';
    f.docs.forEach(function (d, i) { if (!d.label || !d.url) return; if (lk.children.length) lk.appendChild(el('span', 'sep', '·')); lk.appendChild(ext(el('a', '', d.label), d.url)); });
    var mk = $('fMade'); mk.textContent = ''; var ma = el('a', '', 'Hecho en Colombia '); ma.href = '#colombia'; ma.appendChild(icon('heart')); ma.appendChild(el('span', 'flag')); mk.appendChild(ma);
  };

  /* ---------- Páginas legales ---------- */
  var DEFAULT = function (k, f, cfg) {
    var e = f.emails;
    return ({ correo_oficial: e.administracion, correo_privacidad: e.administracion, correo_atencion: e.pqrs, canal_seguridad: e.soporte,
      cargo_datos: 'Administración de Ofertas Bogotá', form_pqrs: 'https://ofertasbogota.lat/#pqrs', formulario_habilitado: 'el formulario de PQRS del sitio web', enlace_preferencias: 'la configuración de su navegador' })[k] || '';
  };
  PB.legalValue = function (k) {
    var cfg = PB.cfg(), v = cfg.legalVals[k]; if (v) return v;
    return DEFAULT(k, cfg.footer, cfg) || '';
  };
  var FIELDS = {}; ((window.PB_LEGAL_DOCS || {}).fields || []).forEach(function (x) { FIELDS[x.k] = x; });
  function renderInline(parent, segs) {
    var skipPunct = false;
    segs.forEach(function (s, i) {
      if (typeof s === 'string') {
        if (skipPunct) { s = s.replace(/^[.,;]\s*/, ''); skipPunct = false; }
        parent.appendChild(document.createTextNode(s));
      } else if (s.br) parent.appendChild(document.createElement('br'));
      else if (s.b) parent.appendChild(el('strong', '', s.b));
      else if (s.k) {
        var v = PB.legalValue(s.k);
        if (v) {
          if (/^https:/.test(v) && s.k !== 'inventario_cookies') { var a = el('a', '', v); a.href = v; a.target = '_blank'; a.rel = 'noopener noreferrer'; parent.appendChild(a); }
          else if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) { var m = el('a', '', v); m.href = 'mailto:' + v; parent.appendChild(m); }
          else parent.appendChild(document.createTextNode(v));
        } else if (FIELDS[s.k] && FIELDS[s.k].opt) {
          var last = parent.lastChild; if (last && last.nodeType === 3) last.nodeValue = last.nodeValue.replace(/\s+$/, ''); skipPunct = true;
        } else parent.appendChild(el('span', 'ph', '[por completar]'));
      }
    });
  }
  PB.renderLegalDoc = function (id, box) {
    var D = window.PB_LEGAL_DOCS, doc = D && D.docs[id]; box.textContent = ''; if (!doc) return;
    box.appendChild(el('h2', '', doc.title));
    box.appendChild(el('p', 'fine', 'Última actualización: ' + D.updated + '.'));
    var ul;
    doc.blocks.forEach(function (bl) {
      if (bl.h) box.appendChild(el('h3', '', bl.h));
      else if (bl.p) { var p = el('p'); renderInline(p, bl.p); if (p.textContent.trim()) box.appendChild(p); }
      else if (bl.ul) { ul = el('ul'); bl.ul.forEach(function (it) { var l = el('li'); renderInline(l, it); ul.appendChild(l); }); box.appendChild(ul); }
    });
    // Enlaces cruzados entre documentos
    var nav = el('nav', 'legal-nav'); nav.setAttribute('aria-label', 'Otros documentos');
    PB.cfg().footer.docs.forEach(function (d) { if (d.label && /^#/.test(d.url) && d.url !== '#' + id) { var a = el('a', '', d.label); a.href = d.url; nav.appendChild(a); } });
    box.appendChild(nav);
  };
  PB.LEGAL_IDS = ['quienes', 'terminos', 'privacidad', 'datos', 'cookies', 'pqrs', 'colombia'];
})();
