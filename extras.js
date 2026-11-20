/* Extras de la ficha: horario "Abierto ahora", Cómo llegar, compartir con imagen y reportar anuncio. */
(function () {
  'use strict';
  var PB = window.PB, C = PB.C, $ = PB.$, el = PB.el, state = PB.state;

  // ---------- Horario ----------
  var DAYS = { lun: 1, mar: 2, mie: 3, jue: 4, vie: 5, sab: 6, dom: 0 };
  var DNAME = ['dom', 'lun', 'mar', 'mié', 'jue', 'vie', 'sáb'];
  function clean(s) {
    return String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
      .replace(/a\s*\.?\s*m\s*\.?/g, 'am').replace(/p\s*\.?\s*m\s*\.?/g, 'pm')
      .replace(/[–—−]/g, '-').replace(/\s+/g, ' ');
  }
  function toMin(h, m, ap) {
    h = Number(h); m = Number(m || 0);
    if (ap === 'pm' && h < 12) h += 12;
    if (ap === 'am' && h === 12) h = 0;
    return h * 60 + m;
  }
  // Devuelve { week: [[ [ini, fin], ... ] x7] } (índice 0 = domingo) o null si no se entiende.
  PB.parseHours = function (text) {
    var t = clean(text).trim();
    if (!t) return null;
    var week = [[], [], [], [], [], [], []];
    if (/24 ?(horas|h)\b/.test(t) && !/\d\s*(am|pm)/.test(t)) {
      var all = /lun|mar|mie|jue|vie|sab|dom/.test(t) ? null : true;
      if (all) { for (var i = 0; i < 7; i++) week[i].push([0, 1440]); return { week: week }; }
    }
    var parts = t.split(/[;\/|\n]+/), found = false;
    parts.forEach(function (seg) {
      var re = /(\d{1,2})(?::(\d{2}))?\s*(am|pm)?\s*(?:-|a|hasta)\s*(\d{1,2})(?::(\d{2}))?\s*(am|pm)?/g, m, last = 0, text2 = seg;
      while ((m = re.exec(seg))) {
        var daysTxt = seg.slice(last, m.index); last = re.lastIndex;
        var h1 = Number(m[1]), h2 = Number(m[4]), a1 = m[3], a2 = m[6];
        if (h1 > 23 || h2 > 24 || (m[2] && Number(m[2]) > 59) || (m[5] && Number(m[5]) > 59)) continue;
        if (!a1 && !a2 && h1 <= 12 && h2 <= 12 && h2 <= h1) a2 = 'pm';
        if (!a1 && a2) a1 = (h1 <= h2 || a2 === 'am') ? a2 : 'am';
        if (a1 && !a2) a2 = a1 === 'am' && h2 < h1 ? 'pm' : a1;
        var s = toMin(h1, m[2], a1), e = toMin(h2, m[5], a2);
        var days = [], dm, dre = /(lun|mar|mie|jue|vie|sab|dom)[a-z]*/g, prev = null, idx = [];
        if (/todos los dias|diario|todos/.test(daysTxt)) { days = [0, 1, 2, 3, 4, 5, 6]; }
        else {
          while ((dm = dre.exec(daysTxt))) idx.push({ d: DAYS[dm[1]], at: dm.index, end: dre.lastIndex });
          for (var k = 0; k < idx.length; k++) {
            var between = k ? daysTxt.slice(idx[k - 1].end, idx[k].at) : '';
            if (k && /^\s*(-|a|al|hasta)\s*$/.test(between) && prev !== null) {
              var x = prev; while (x !== idx[k].d) { x = (x + 1) % 7; days.push(x); }
              prev = null;
            } else { days.push(idx[k].d); prev = idx[k].d; }
          }
          if (!idx.length) days = [0, 1, 2, 3, 4, 5, 6];
        }
        days.forEach(function (d) { week[d].push(e <= s ? [s, e + 1440] : [s, e]); });
        found = true;
      }
      void text2;
    });
    return found ? { week: week } : null;
  };
  function fmtMin(x) {
    x = ((x % 1440) + 1440) % 1440;
    var h = Math.floor(x / 60), m = x % 60, ap = h >= 12 ? 'p. m.' : 'a. m.', h12 = h % 12 || 12;
    return h12 + (m ? ':' + (m < 10 ? '0' : '') + m : '') + ' ' + ap;
  }
  function bogotaNow(now) {
    var p = new Intl.DateTimeFormat('en-US', { timeZone: 'America/Bogota', weekday: 'short', hour: 'numeric', minute: 'numeric', hour12: false }).formatToParts(new Date(now || Date.now()));
    var o = {}; p.forEach(function (x) { o[x.type] = x.value; });
    return { dow: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(o.weekday), min: (Number(o.hour) % 24) * 60 + Number(o.minute) };
  }
  // { open: true/false, text } o null si no se puede saber.
  PB.openNow = function (hoursText, now) {
    var p = PB.parseHours(hoursText);
    if (!p) return null;
    var t = bogotaNow(now), wk = p.week;
    // ¿Abierto? (incluye el turno de ayer que pasa de medianoche)
    var open = null;
    wk[t.dow].forEach(function (s) { if (t.min >= s[0] && t.min < s[1]) open = s[1]; });
    wk[(t.dow + 6) % 7].forEach(function (s) { if (s[1] > 1440 && t.min + 1440 < s[1] && t.min + 1440 >= s[0]) open = s[1] - 1440; });
    if (open !== null) return { open: true, text: open >= 1440 ? 'Abierto 24 horas' : 'Abierto ahora · cierra a las ' + fmtMin(open) };
    for (var k = 0; k < 8; k++) {
      var d = (t.dow + k) % 7, slots = wk[d].slice().sort(function (a, b) { return a[0] - b[0]; });
      for (var j = 0; j < slots.length; j++) {
        if (k === 0 && slots[j][0] <= t.min) continue;
        return { open: false, text: 'Cerrado · abre ' + (k === 0 ? 'hoy' : k === 1 ? 'mañana' : 'el ' + DNAME[d]) + ' a las ' + fmtMin(slots[j][0]) };
      }
    }
    return { open: false, text: 'Cerrado ahora' };
  };

  // ---------- Cómo llegar ----------
  PB.mapsLink = function (ad) {
    var muni = C.municipios.indexOf(ad.localidad) >= 0;
    var parts = [];
    if (ad.address) parts.push(ad.address); else if (ad.brand) parts.push(ad.brand);
    if (ad.barrio) parts.push(ad.barrio);
    if (ad.localidad) parts.push(muni ? ad.localidad : 'Localidad ' + ad.localidad);
    parts.push(muni ? 'Cundinamarca, Colombia' : 'Bogotá, Colombia');
    return 'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(parts.join(', '));
  };

  // ---------- Compartir con imagen ----------
  function cardImage(ad) {
    return new Promise(function (resolve) {
      var pal = PB.palOf(ad.pal), cv = document.createElement('canvas'); cv.width = 1080; cv.height = 1080;
      var g = cv.getContext('2d');
      g.fillStyle = pal.bg; g.fillRect(0, 0, 1080, 1080);
      g.fillStyle = pal.fg; g.textBaseline = 'top';
      function wrap(text, x, y, w, lh, maxLines) {
        var words = String(text).split(' '), line = '', n = 0;
        for (var i = 0; i < words.length; i++) {
          var test = line ? line + ' ' + words[i] : words[i];
          if (g.measureText(test).width > w && line) { g.fillText(line, x, y); y += lh; n++; line = words[i]; if (n >= maxLines) return y; } else line = test;
        }
        g.fillText(line, x, y); return y + lh;
      }
      g.font = '700 40px Arial, sans-serif'; g.fillText('OFERTAS BOGOTÁ', 80, 80);
      g.font = '800 96px Arial, sans-serif'; var y = wrap(ad.brand || 'Negocio', 80, 200, 920, 108, 3);
      g.font = '600 52px Arial, sans-serif'; if (ad.headline) y = wrap(ad.headline, 80, y + 20, 920, 64, 3);
      if (ad.offer) { g.fillStyle = '#FFD21F'; g.fillRect(80, y + 30, Math.min(900, 60 + g.measureText(ad.offer).width * 1.4), 110); g.fillStyle = '#0B1535'; g.font = '800 70px Arial, sans-serif'; g.fillText(ad.offer, 110, y + 50); }
      g.fillStyle = pal.fg; g.font = '600 44px Arial, sans-serif';
      var loc = PB.locLine(ad); if (loc) g.fillText(loc, 80, 940);
      cv.toBlob(function (b) { resolve(b); }, 'image/jpeg', 0.9);
    });
  }
  function adImage(ad) {
    var m = PB.safeMedia(ad.media);
    if (m && /^data:image\//.test(m.url || '')) return fetch(m.url).then(function (r) { return r.blob(); }).catch(function () { return cardImage(ad); });
    return cardImage(ad);
  }
  PB.shareAd = async function (ad, msgNode) {
    var url = location.href.split('#')[0] + '#anuncio-' + ad.id;
    var line = [ad.brand, ad.headline, ad.offer].filter(Boolean).join(' · ');
    var text = line + (PB.locLine(ad) ? '\n' + PB.locLine(ad) : '') + '\nMíralo en ' + C.brand + ': ' + url;
    var blob = null;
    try { blob = await adImage(ad); } catch (e) {}
    try {
      if (blob && navigator.canShare && navigator.share) {
        var file = new File([blob], (PB.norm(ad.brand || 'anuncio').replace(/\s+/g, '-') || 'anuncio') + '.jpg', { type: blob.type || 'image/jpeg' });
        if (navigator.canShare({ files: [file] })) { await navigator.share({ files: [file], title: ad.brand || C.brand, text: text }); return; }
      }
    } catch (e) { if (e && e.name === 'AbortError') return; }
    // Sin compartir archivos (computador): abre WhatsApp con el nombre y el enlace, y deja bajar la imagen.
    window.open('https://wa.me/?text=' + encodeURIComponent(text), '_blank', 'noopener');
    if (msgNode) {
      PB.setMsg(msgNode, 'Se abrió WhatsApp con el nombre y el enlace. ', '');
      if (blob) { var a = el('a', '', 'Descargar imagen para adjuntar'); a.href = URL.createObjectURL(blob); a.download = 'anuncio.jpg'; a.style.color = 'inherit'; a.style.textDecoration = 'underline'; msgNode.appendChild(a); }
    }
  };

  // ---------- Reportar ----------
  var REASONS = ['Información falsa o engañosa', 'Contenido inapropiado', 'El negocio ya no existe o los datos son incorrectos', 'Usa imágenes o marcas que no son suyas', 'Otro motivo'];
  PB.REPORT_REASONS = REASONS;
  PB.openReport = function (ad) {
    var dlg = $('dlgReport');
    $('rep-ad').textContent = PB.clip(ad.brand || ad.headline || 'Anuncio', 50);
    PB.fillSelect($('rep-reason'), 'Elige el motivo…', REASONS);
    $('rep-note').value = ''; $('rep-contact').value = ''; PB.setMsg($('rep-msg'), '', '');
    $('rep-send').disabled = false;
    dlg.dataset.ad = ad.id;
    dlg.showModal();
  };
  PB.initExtras = function () {
    var dlg = $('dlgReport');
    $('rep-cancel').addEventListener('click', function () { dlg.close(); });
    $('repForm').addEventListener('submit', async function (e) {
      e.preventDefault();
      var m = $('rep-msg'), ad = PB.findAd(dlg.dataset.ad), reason = $('rep-reason').value;
      if (!ad) { PB.setMsg(m, 'No encontramos el anuncio.', 'err'); return; }
      if (!reason) { PB.setMsg(m, 'Elige el motivo del reporte.', 'err'); return; }
      var key = 'pb-rep-' + ad.id, prev = 0;
      try { prev = Number(localStorage.getItem(key) || 0); } catch (x) {}
      if (prev && Date.now() - prev < 86400000) { PB.setMsg(m, 'Ya recibimos tu reporte de este anuncio. Gracias.', 'ok'); return; }
      $('rep-send').disabled = true;
      try {
        await PB.B.sendReport({ adId: ad.id, brand: String(ad.brand || '').slice(0, 60), reason: reason, note: $('rep-note').value.trim().slice(0, 300), contact: $('rep-contact').value.trim().slice(0, 60) });
        try { localStorage.setItem(key, String(Date.now())); } catch (x) {}
        PB.setMsg(m, 'Gracias. Revisaremos este anuncio.', 'ok');
        setTimeout(function () { if (dlg.open) dlg.close(); }, 1400);
      } catch (err) { PB.setMsg(m, PB.errText(err), 'err'); $('rep-send').disabled = false; }
    });
    // Ayuda en vivo bajo el horario del formulario
    var h = $('f-hours'), hint = $('hoursHint');
    if (h && hint) {
      var upd = function () {
        var v = h.value.trim();
        if (!v) { hint.textContent = 'Escríbelo así para mostrar "Abierto ahora": Lun–Sáb 8 a. m. – 6 p. m.'; return; }
        var r = PB.openNow(v);
        hint.textContent = r ? 'Lo entendimos: tu ficha mostrará "Abierto ahora" dentro de ese horario. Ahora mismo: ' + r.text + '.' : 'No pudimos leer ese horario, así que se mostrará solo como texto. Prueba con: Lun–Sáb 8 a. m. – 6 p. m.';
      };
      h.addEventListener('input', upd); upd();
    }
  };
})();
