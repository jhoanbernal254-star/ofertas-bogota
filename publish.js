/* Formulario "Publica tu negocio": 5 pasos. */
(function () {
  'use strict';
  var PB = window.PB, C = PB.C, $ = PB.$, el = PB.el, state = PB.state;
  var TIERS = ['pequeno', 'mediano', 'destacado', 'banner', 'premium'];

  var W = PB.wiz = { step: 1, tier: 'destacado', days: 30, need: false, pieces: 1, promo: false, pal: 0, cats: [], file: null, fileURL: null, fileDims: null, file2: null, busy: false };
  function designOnly() { return W.tier === ''; }
  function wantsDesign() { return W.need || designOnly(); }
  function effFile() { return wantsDesign() ? W.file2 : W.file; }

  // Un espacio gratis por cuenta (no cuenta si ese pedido fue rechazado).
  function promoUsed() {
    var u = state.user;
    return !!u && state.orders.some(function (o) { return o.uid === u.uid && (o.promo || o.usePromo) && o.status !== 'rechazado'; });
  }
  function totals() {
    var c = PB.cfg();
    var space = W.tier ? C.priceFor(c.prices[W.tier], W.days) : 0;
    var promo = !!(W.promo && W.tier && C.promoOpen(state.config) && !promoUsed());
    var pieces = wantsDesign() ? W.pieces : 0;
    return { space: space, promo: promo, pieces: pieces, design: pieces * c.designPrice, total: (promo ? 0 : space) + pieces * c.designPrice, c: c };
  }
  function vals() {
    return {
      brand: $('f-brand').value.trim(), headline: $('f-head').value.trim(), body: $('f-body').value.trim(),
      offer: $('f-offer').value.trim(), hours: $('f-hours').value.trim(),
      loc: $('f-loc').value, barrio: $('f-barrio').value.trim(), addr: $('f-addr').value.trim(),
      wa: $('f-wa').value, phone: $('f-phone').value, mail: $('f-email').value, web: $('f-web').value, brief: $('f-brief').value.trim()
    };
  }

  // ---------- Pasos ----------
  function renderSteps() {
    Array.prototype.forEach.call(document.querySelectorAll('#form .wstep'), function (s) { s.hidden = Number(s.getAttribute('data-step')) !== W.step; });
    Array.prototype.forEach.call($('wprog').children, function (li) {
      var n = Number(li.getAttribute('data-step'));
      li.className = n === W.step ? 'on' : (n < W.step ? 'done' : '');
      if (n === W.step) li.setAttribute('aria-current', 'step'); else li.removeAttribute('aria-current');
    });
    $('wBack').hidden = W.step === 1;
    $('wNext').hidden = W.step === 5;
    $('payBtn').hidden = W.step !== 5;
  }
  PB.wizPick = function (tier, days, need) {
    if (tier !== undefined && tier !== null) W.tier = tier;
    if (days) W.days = days;
    if (need) W.need = true;
    W.step = 1;
    PB.renderWizard();
  };

  function bad(step, text, id) {
    W.step = step; renderSteps();
    PB.setMsg($('msg'), text, 'err');
    if (id) { var n = $(id); if (n) n.focus(); }
    return false;
  }
  // Devuelve true si el paso está completo; si no, muestra el mensaje y se queda en él.
  function validate(step) {
    var v = vals();
    var only = designOnly();
    if (step === 1) {
      if (v.brand.length < 2) return bad(1, 'Escribe el nombre de tu negocio.', 'f-brand');
      if (!only && !wantsDesign() && !W.file && v.headline.length < 3) return bad(1, 'Escribe el título de tu anuncio (mínimo 3 letras), o sube tu diseño en el paso 3.', 'f-head');
      var wa = PB.normPhone(v.wa), ph = PB.normPhone(v.phone), ml = PB.normMail(v.mail), wb = PB.normWeb(v.web);
      if (wa === null) return bad(1, 'El WhatsApp no parece válido. Escribe solo el número.', 'f-wa');
      if (ph === null) return bad(1, 'El teléfono no parece válido.', 'f-phone');
      if (ml === null) return bad(1, 'El correo no parece válido.', 'f-email');
      if (wb === null) return bad(1, 'El sitio web no parece válido.', 'f-web');
      if (!wa && !ph && !ml && !wb) return bad(1, 'Pon al menos una forma de contacto.', 'f-wa');
    }
    if (step === 2 && !only) {
      if (!v.loc) return bad(2, 'Elige la localidad o el municipio.', 'f-loc');
      if (!W.cats.length) return bad(2, 'Elige al menos una categoría.', null);
    }
    if (step === 3) {
      if (wantsDesign()) { if (v.brief.length < 10) return bad(3, 'Cuéntanos qué necesitas para el diseño (mínimo 10 letras).', 'f-brief'); }
      else if (!only && !W.file) return bad(3, 'Sube tu imagen, o elige "Necesito un diseño".', 'f-file');
    }
    if (step === 4 && W.tier && PB.capLeft(W.tier) === 0) return bad(4, 'Ese espacio no tiene cupos. Elige otro.', null);
    if (step === 5 && !$('x-terms').checked) return bad(5, 'Acepta las condiciones para continuar.', 'x-terms');
    PB.setMsg($('msg'), '', '');
    return true;
  }
  function goStep(n) { W.step = n; renderSteps(); PB.renderWizard(); window.scrollTo(0, 0); }

  // ---------- Dibujo ----------
  function renderCats() {
    var box = $('catPick'); box.textContent = '';
    C.categorias.forEach(function (name) {
      var on = W.cats.indexOf(name) >= 0;
      var b = el('button', 'cp'); b.type = 'button';
      b.setAttribute('aria-pressed', on ? 'true' : 'false');
      b.disabled = !on && W.cats.length >= C.maxCats;
      b.appendChild(PB.ic(PB.catIcon(name))); b.appendChild(el('span', '', name));
      b.addEventListener('click', function () {
        var i = W.cats.indexOf(name);
        if (i >= 0) W.cats.splice(i, 1); else if (W.cats.length < C.maxCats) W.cats.push(name);
        PB.renderWizard();
      });
      box.appendChild(b);
    });
  }
  function renderPlans() {
    var box = $('plans'); box.textContent = '';
    var c = PB.cfg();
    TIERS.forEach(function (t) {
      var left = PB.capLeft(t);
      var b = el('button', 'plan'); b.type = 'button';
      b.appendChild(el('b', '', C.tiers[t].label));
      var pr = el('span', 'pr', PB.money(C.priceFor(c.prices[t], W.days)));
      if (C.discPct(W.days) > 0) { pr.appendChild(document.createTextNode(' ')); pr.appendChild(el('s', '', PB.money(C.listFor(c.prices[t], W.days)))); }
      b.appendChild(pr);
      b.appendChild(el('small', '', left === Infinity ? C.tiers[t].note : (left > 0 ? 'Quedan ' + left + ' de ' + c.caps[t] + ' cupos' : 'Sin cupos por ahora')));
      b.appendChild(el('small', 'size', 'Medida: ' + C.sizeLabel(t)));
      b.disabled = left === 0;
      b.setAttribute('aria-pressed', W.tier === t ? 'true' : 'false');
      b.addEventListener('click', function () { W.tier = t; PB.renderWizard(); });
      box.appendChild(b);
    });
    var d = el('button', 'plan'); d.type = 'button';
    d.appendChild(el('b', '', 'Solo diseño'));
    d.appendChild(el('span', 'pr', 'Desde ' + PB.money(c.designPrice)));
    d.appendChild(el('small', '', 'Te creamos la pieza, sin publicar'));
    d.setAttribute('aria-pressed', designOnly() ? 'true' : 'false');
    d.addEventListener('click', function () { W.tier = ''; if (W.pieces < 1) W.pieces = 1; PB.renderWizard(); });
    box.appendChild(d);
  }
  function previewAd() {
    var v = vals(), f = effFile();
    var tier = W.tier || 'destacado';
    return {
      id: 'preview', tier: tier, brand: v.brand || 'Tu negocio',
      headline: (W.file && !wantsDesign()) ? '' : (v.headline || 'Título de tu anuncio'),
      body: v.body || 'Cuenta qué ofreces, horarios o promociones.',
      cats: W.cats.length ? W.cats : ['Otros sectores'], localidad: v.loc || 'Localidad', barrio: v.barrio, offer: v.offer, pal: W.pal,
      media: (W.file && !wantsDesign()) ? { url: W.fileURL, type: 'image' } : null, f: f
    };
  }
  function renderPreview() {
    var box = $('preview'); box.textContent = '';
    $('pvWrap').hidden = designOnly();
    if (designOnly()) return;
    var ad = previewAd();
    if (ad.tier === 'premium' || ad.tier === 'banner') { var t = el('div', 'tile'); t.appendChild(PB.poster(ad, {})); box.appendChild(t); }
    else { var card = PB.bizCard(ad); card.removeAttribute('href'); card.tabIndex = -1; card.style.pointerEvents = 'none'; box.appendChild(card); }
  }
  function renderSum() {
    var t = totals(), sum = $('sum'); sum.textContent = '';
    function row(a, b, cls) { var r = el('div', 'row' + (cls ? ' ' + cls : '')); r.appendChild(el('span', '', a)); r.appendChild(el('span', '', b)); sum.appendChild(r); }
    sum.appendChild(el('div', 'sum-h', t.total === 0 ? 'Total' : 'Total (se paga solo si aceptamos)'));
    sum.appendChild(el('div', 'sum-t', PB.money(t.total)));
    if (W.tier) {
      var dp = C.discPct(W.days);
      if (dp > 0) {
        var lst = C.listFor(t.c.prices[W.tier], W.days);
        row(C.tiers[W.tier].label + ' · ' + C.durLabel(W.days), PB.money(lst));
        row('Descuento ' + dp + '%', '-' + PB.money(lst - t.space));
      } else row(C.tiers[W.tier].label + ' · ' + C.durLabel(W.days), PB.money(t.space));
    }
    if (t.promo) row('Espacio gratis de lanzamiento', '-' + PB.money(t.space));
    if (t.pieces) row('Diseño · ' + t.pieces + (t.pieces === 1 ? ' pieza' : ' piezas'), PB.money(t.design));
  }
  function renderRecap() {
    var v = vals(), t = totals(), box = $('recap'); box.textContent = '';
    function row(a, b) { if (!b) return; var r = el('div'); r.appendChild(el('span', '', a)); r.appendChild(el('span', '', b)); box.appendChild(r); }
    row('Negocio', v.brand);
    if (!designOnly()) {
      row('Título', (W.file && !wantsDesign()) ? '' : v.headline);
      row('Oferta', v.offer); row('Horario', v.hours);
      row('Ubicación', [v.addr, v.barrio, v.loc].filter(Boolean).join(' · '));
      row('Categorías', W.cats.join(', '));
    }
    row('Contacto', [v.wa && 'WhatsApp ' + v.wa, v.phone && 'Tel ' + v.phone, v.mail, v.web].filter(Boolean).join(' · '));
    row('Diseño', wantsDesign() ? 'Lo creamos nosotros (' + t.pieces + (t.pieces === 1 ? ' pieza' : ' piezas') + ')' : (W.file ? 'Tu imagen: ' + W.file.name : 'Sin imagen (tarjeta de color)'));
    if (W.tier) row('Espacio', C.tiers[W.tier].label + ' · ' + C.durLabel(W.days));
    row('Total', t.total === 0 ? 'Gratis' : PB.money(t.total));
  }

  PB.renderWizard = function () {
    var c = PB.cfg();
    if (W.tier && PB.capLeft(W.tier) === 0) {
      var ok = TIERS.filter(function (t) { return PB.capLeft(t) > 0; })[0];
      W.tier = ok || '';
    }
    renderSteps();
    renderCats();
    // zonas según localidad
    var loc = $('f-loc').value, fb = $('f-barrio');
    fb.disabled = !loc;
    var dl = $('zonaList'); dl.textContent = '';
    (C.zonas[loc] || []).forEach(function (z) { var o = document.createElement('option'); o.value = z; dl.appendChild(o); });
    // paso 3
    var need = wantsDesign();
    $('optOwn').setAttribute('aria-pressed', need ? 'false' : 'true');
    $('optNeed').setAttribute('aria-pressed', need ? 'true' : 'false');
    $('optNeed').disabled = false;
    $('needNote').textContent = 'Nuestro equipo lo crea por ' + PB.money(c.designPrice) + ' la pieza. Podrás pedir ajustes.';
    $('grpOwn').hidden = need;
    $('designMore').hidden = !need;
    var pc = $('pieces'); pc.textContent = '';
    for (var i = 1; i <= C.design.maxPieces; i++) (function (n) {
      var b = el('button', 'chip', n + (n === 1 ? ' pieza' : ' piezas')); b.type = 'button';
      b.setAttribute('aria-pressed', W.pieces === n ? 'true' : 'false');
      b.addEventListener('click', function () { W.pieces = n; PB.renderWizard(); });
      pc.appendChild(b);
    })(i);
    var tz = W.tier ? C.tiers[W.tier].size : null;
    $('fileHint').textContent = 'JPG, PNG o WebP de hasta ' + C.limits.imageMB + ' MB.' + (tz ? ' Medida ideal para tu espacio: ' + tz.w + ' × ' + tz.h + ' px. Si es de otro tamaño, la recortamos al centro.' : '');
    var sw = $('sizeWarn'), fd = W.fileDims;
    if (tz && fd && !need && Math.abs(fd.w / fd.h - tz.w / tz.h) / (tz.w / tz.h) > 0.06) {
      sw.hidden = false;
      sw.textContent = 'Tu imagen mide ' + fd.w + ' × ' + fd.h + ' px. Se recortará para ajustarse a ' + tz.w + ' × ' + tz.h + ' px. Revisa la vista previa o súbela con esa medida.';
    } else sw.hidden = true;
    $('picked').hidden = !W.file;
    if (W.file) $('pickedName').textContent = W.file.name + ' · ' + (W.file.size / 1048576).toFixed(1) + ' MB';
    // paso 4
    $('durBox').hidden = designOnly();
    var du = $('durs'); du.textContent = '';
    C.durations.forEach(function (d) {
      var b = el('button', 'chip', d.label + (W.tier ? ' · ' + PB.money(C.priceFor(c.prices[W.tier], d.days)) : '') + (C.discPct(d.days) ? ' (-' + C.discPct(d.days) + '%)' : '')); b.type = 'button';
      b.setAttribute('aria-pressed', W.days === d.days ? 'true' : 'false');
      b.addEventListener('click', function () { W.days = d.days; PB.renderWizard(); });
      du.appendChild(b);
    });
    renderPlans();
    // paso 5
    var showPromo = C.promoOpen(state.config) && !!W.tier && !promoUsed();
    $('promoBox').hidden = !showPromo;
    $('promoUntil').textContent = C.promoUntilLabel(state.config);
    if (!showPromo) { W.promo = false; $('x-promo').checked = false; }
    renderRecap(); renderSum(); renderPreview();
  };

  // ---------- Archivo ----------
  function checkFile(f, msgNode) {
    if (!/^image\//.test(f.type)) { PB.setMsg(msgNode, 'Ese archivo no sirve. Sube una imagen.', 'err'); return false; }
    if (f.size > C.limits.imageMB * 1048576) { PB.setMsg(msgNode, 'El archivo pesa ' + (f.size / 1048576).toFixed(1) + ' MB. El máximo es ' + C.limits.imageMB + ' MB.', 'err'); return false; }
    return true;
  }
  PB.checkFile = checkFile;
  function clearFile() {
    if (W.fileURL) URL.revokeObjectURL(W.fileURL);
    W.file = null; W.fileURL = null; W.fileDims = null; $('f-file').value = '';
    PB.renderWizard();
  }
  function resetAll() {
    clearFile();
    $('form').reset();
    ['c-brand:40', 'c-head:60', 'c-body:300', 'c-offer:16', 'c-hours:70', 'c-barrio:60', 'c-addr:100', 'c-brief:400'].forEach(function (s) { var p = s.split(':'); $(p[0]).textContent = '0/' + p[1]; });
    W.step = 1; W.need = false; W.cats = []; W.promo = false; W.file2 = null; W.pieces = 1;
    PB.renderWizard();
  }

  async function submit() {
    if (W.busy) return;
    for (var s = 1; s <= 5; s++) if (!validate(s)) return;
    if (!state.user) {
      state.afterLogin = '#anunciar';
      PB.setMsg($('authMsg'), 'Entra o crea tu cuenta para enviar. Lo que escribiste se queda como está.', '');
      location.hash = '#entrar';
      return;
    }
    var v = vals(), only = designOnly(), design = wantsDesign(), t = totals(), file = effFile(), msg = $('msg');
    W.busy = true; $('payBtn').disabled = true;
    $('prog').hidden = !file; $('progFill').style.width = '0%';
    PB.setMsg(msg, file ? 'Preparando tu imagen…' : 'Enviando tu solicitud…', '');
    try {
      var res = await PB.B.sendRequest({
        tier: W.tier, days: W.days, designPieces: design ? W.pieces : 0, designBrief: design ? v.brief : '',
        usePromo: t.promo,
        brand: v.brand, headline: (only || (W.file && !design)) ? '' : v.headline, body: only ? '' : v.body,
        offer: only ? '' : v.offer, hours: only ? '' : v.hours,
        cats: only ? [] : W.cats.slice(), categoria: only ? '' : W.cats[0], localidad: only ? '' : v.loc,
        barrio: v.barrio, address: v.addr,
        whatsapp: PB.normPhone(v.wa) || '', phone: PB.normPhone(v.phone) || '', mail: PB.normMail(v.mail) || '', web: PB.normWeb(v.web) || '',
        pal: W.pal, file: file
      }, function (p) { $('progFill').style.width = p + '%'; });
      PB.setMsg(msg, '', '');
      state.payOrder = res.orderId;
      resetAll();
      location.hash = '#pago';
    } catch (err) { PB.setMsg(msg, PB.errText(err), 'err'); }
    W.busy = false; $('payBtn').disabled = false; $('prog').hidden = true;
  }

  // ---------- Conexión ----------
  PB.initPublish = function () {
    PB.fillLocs($('f-loc'), 'Elige…');
    var pl = $('pals');
    C.palettes.forEach(function (p, i) {
      var b = el('button', 'sw'); b.type = 'button'; b.style.background = p.bg; b.title = p.n;
      b.setAttribute('aria-label', 'Color ' + p.n); b.setAttribute('aria-pressed', i === W.pal ? 'true' : 'false');
      b.addEventListener('click', function () {
        W.pal = i;
        Array.prototype.forEach.call(pl.children, function (x) { x.setAttribute('aria-pressed', x === b ? 'true' : 'false'); });
        renderPreview();
      });
      pl.appendChild(b);
    });
    [['f-brand', 'c-brand', 40], ['f-head', 'c-head', 60], ['f-body', 'c-body', 300], ['f-offer', 'c-offer', 16], ['f-hours', 'c-hours', 70], ['f-barrio', 'c-barrio', 60], ['f-addr', 'c-addr', 100], ['f-brief', 'c-brief', 400]].forEach(function (f) {
      $(f[0]).addEventListener('input', function () { $(f[1]).textContent = $(f[0]).value.length + '/' + f[2]; renderPreview(); renderRecap(); });
    });
    $('f-loc').addEventListener('input', function () { $('f-barrio').value = ''; PB.renderWizard(); });
    $('optOwn').addEventListener('click', function () { W.need = false; if (designOnly()) W.tier = 'pequeno'; PB.renderWizard(); });
    $('optNeed').addEventListener('click', function () { W.need = true; PB.renderWizard(); });
    $('x-promo').addEventListener('change', function () { W.promo = $('x-promo').checked; renderSum(); renderRecap(); });
    $('termsText').textContent = C.terms || '';
    $('f-file').addEventListener('change', function (e) {
      var f = e.target.files && e.target.files[0];
      if (!f) { clearFile(); return; }
      if (!checkFile(f, $('msg'))) { clearFile(); return; }
      if (W.fileURL) URL.revokeObjectURL(W.fileURL);
      W.file = f; W.fileURL = URL.createObjectURL(f); W.fileDims = null;
      (function (url) { var im = new Image(); im.onload = function () { if (W.fileURL === url) { W.fileDims = { w: im.naturalWidth, h: im.naturalHeight }; PB.renderWizard(); } }; im.src = url; })(W.fileURL);
      PB.setMsg($('msg'), '', '');
      PB.renderWizard();
    });
    $('f-file2').addEventListener('change', function (e) {
      var f = e.target.files && e.target.files[0];
      if (f && !checkFile(f, $('msg'))) { e.target.value = ''; W.file2 = null; return; }
      W.file2 = f || null; PB.setMsg($('msg'), '', '');
    });
    $('clearFile').addEventListener('click', clearFile);
    $('wNext').addEventListener('click', function () { if (validate(W.step)) goStep(W.step + 1); });
    $('wBack').addEventListener('click', function () { PB.setMsg($('msg'), '', ''); goStep(Math.max(1, W.step - 1)); });
    $('form').addEventListener('submit', function (e) { e.preventDefault(); if (W.step < 5) { if (validate(W.step)) goStep(W.step + 1); return; } submit(); });
    $('wprog').addEventListener('click', function (e) {
      var li = e.target.closest('li'); if (!li) return;
      var n = Number(li.getAttribute('data-step'));
      if (n < W.step) goStep(n);
    });
  };
})();
