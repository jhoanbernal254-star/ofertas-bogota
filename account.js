/* Entrar, Mi panel (pedidos con línea de tiempo y anuncios) y la página de estado del pedido. */
(function () {
  'use strict';
  var PB = window.PB, C = PB.C, $ = PB.$, el = PB.el, state = PB.state, B = PB.B;

  // ---------- Estado de anuncios ----------
  PB.adStatus = function (ad) {
    var now = Date.now();
    if (ad.active !== true) {
      if (ad.expired || (ad.endsAt && ad.endsAt <= now)) return { k: 'vencido', t: 'Vencido' };
      if (!ad.startsAt) return { k: 'borrador', t: 'Borrador' };
      return { k: 'pausado', t: 'Pausado' };
    }
    if (ad.endsAt <= now) return { k: 'vencido', t: 'Vencido' };
    var d = PB.daysLeft(ad);
    if (d <= 7) return { k: 'porvencer', t: 'Vence en ' + d + (d === 1 ? ' día' : ' días') };
    return { k: 'activo', t: 'Activo' };
  };
  PB.statsLine = function (ad) {
    var d = el('div', 'mini-stats');
    [['Visitas', ad.views], ['WhatsApp', ad.clicksWhatsapp], ['Llamadas', ad.clicksPhone], ['Correo', ad.clicksEmail], ['Web', ad.clicksWeb]].forEach(function (x) {
      var s = el('span'); s.appendChild(document.createTextNode(x[0] + ' ')); s.appendChild(el('b', '', String(x[1] || 0))); d.appendChild(s);
    });
    return d;
  };
  // Tarjeta sencilla de pedido (la usa el administrador).
  PB.simpleOrder = function (o, forAdmin) {
    var c = el('div', 'card');
    var top = el('div', 'crow');
    top.appendChild(el('h3', '', PB.orderTitle(o)));
    top.appendChild(el('span', 'chipst st-' + o.status, PB.STATUS[o.status] || o.status));
    c.appendChild(top);
    if (forAdmin) c.appendChild(el('p', 'meta', 'Contrato ' + C.contractNo(o) + ' · Ref. ' + PB.ref(o)));
    c.appendChild(el('p', 'meta', PB.money(o.amount) + ' · ' + PB.payLabel(o) + ' · ' + PB.fmtDateTime(o.createdAt)));
    if (forAdmin) c.appendChild(el('p', 'meta', 'Cuenta: ' + PB.clip(o.userEmail, 80)));
    if (o.alert) c.appendChild(el('p', 'msg err', 'Aviso: ' + PB.clip(o.alert, 200)));
    if (forAdmin) { var th = PB.thumbs(o, o.designPieces && !o.tier ? 'Referencia' : 'Imagen del anuncio', 'Banner superior'); if (th) c.appendChild(th); }
    return c;
  };

  // ---------- Línea de tiempo ----------
  PB.timeline = function (o) {
    var ad = o.tier && !o.renewOf ? PB.findAd(o.id) : null;
    var st = o.status, paid = st === 'aprobado';
    var steps = [];
    steps.push({ k: 'done', t: 'Solicitud registrada', s: PB.fmtDateTime(o.createdAt) });
    if (st === 'rechazado') {
      steps.push({ k: 'bad', t: 'No aceptada', s: o.rejectReason ? o.rejectReason : 'No se te cobró nada.' });
    } else {
      steps.push(st === 'revision'
        ? { k: 'cur', t: 'En revisión', s: 'Revisamos tu solicitud. No pagas nada todavía.' }
        : { k: 'done', t: 'Aceptada', s: 'Tu solicitud fue aprobada.' });
      var payK = paid ? 'done' : (st === 'por_pagar' || st === 'pago_reportado') ? 'cur' : 'pend';
      var free = o.promo && !o.amount;
      steps.push({ k: payK, t: free ? 'Sin cobro (lanzamiento)' : 'Pago por Nequi', s: free ? 'Tu espacio es gratis por el lanzamiento.' : st === 'por_pagar' ? 'Falta tu pago de ' + PB.money(o.amount) + '.' : st === 'pago_reportado' ? 'Avisaste el pago; lo estamos confirmando.' : paid ? 'Pago confirmado.' : 'Se activa cuando aceptemos la solicitud.' });
      if (o.designPieces > 0) {
        var designed = paid && ad && (ad.startsAt || ad.active === true);
        steps.push({ k: designed ? 'done' : paid ? 'cur' : 'pend', t: 'Diseño', s: designed ? 'Pieza lista.' : paid ? 'Estamos creando tu pieza.' : 'Empezamos cuando se confirme el pago.' });
      }
      if (o.tier && !o.renewOf) {
        var live = !!(ad && PB.visible(ad));
        steps.push({ k: live ? 'done' : 'pend', t: 'Publicado', s: live ? 'En línea hasta el ' + PB.fmtDate(ad.endsAt) + '.' : 'Aparecerás en el directorio.' });
      } else if (o.renewOf) {
        steps.push({ k: paid ? 'done' : 'pend', t: 'Renovado', s: paid ? 'Renovado por ' + C.durLabel(o.days || C.termDays) + '.' : 'Se renueva al confirmar el pago.' });
      } else {
        steps.push({ k: paid ? 'done' : 'pend', t: 'Entrega del diseño', s: paid ? 'Te contactamos por los datos que dejaste.' : 'Después del pago.' });
      }
    }
    var ol = el('ol', 'tl');
    steps.forEach(function (s) {
      var li = el('li', s.k);
      var c = el('span', 'tl-c'); c.appendChild(PB.ic(s.k === 'bad' ? 'x' : s.k === 'pend' ? 'clock' : 'check'));
      li.appendChild(c);
      var t = el('div', 'tl-t'); t.appendChild(el('b', '', s.t)); t.appendChild(el('small', '', s.s));
      li.appendChild(t); ol.appendChild(li);
    });
    return ol;
  };

  // ---------- Mi panel ----------
  async function renew(ad, days) {
    var m = $('myMsg');
    try { var res = await B.sendRequest({ renewOf: ad.id, days: days }); PB.setMsg(m, '', ''); state.payOrder = res.orderId; location.hash = '#pago'; }
    catch (err) { PB.setMsg(m, PB.errText(err), 'err'); }
  }
  function arch(kind, rec, val, label) {
    var b = el('button', 'btn sm ghost', label); b.type = 'button';
    b.addEventListener('click', async function () { try { await B.setClientArchived(kind, rec.id, val); } catch (err) { PB.setMsg($('myMsg'), PB.errText(err), 'err'); } });
    return b;
  }
  function patch(n, p, label) {
    var b = el('button', 'btn sm ghost', label); b.type = 'button';
    b.addEventListener('click', async function () { try { await B.patchNotice(n.id, p); } catch (err) { PB.setMsg($('myMsg'), PB.errText(err), 'err'); } });
    return b;
  }
  function askChange(ad, kind) {
    var baja = kind === 'baja';
    var fields = baja
      ? [{ id: 'text', label: 'Cuéntanos por qué quieres eliminar tu anuncio', type: 'textarea', max: 500 }]
      : [{ id: 'text', label: '¿Qué quieres cambiar? (obligatorio)', type: 'textarea', max: 500 },
         { id: 'offer', label: 'Nueva oferta corta (opcional, ej. -20%)', type: 'text', max: 20 },
         { id: 'body', label: 'Nuevo texto del anuncio (opcional)', type: 'textarea', max: 300 },
         { id: 'file', label: 'Nueva imagen (opcional)', type: 'file', hint: 'Primero la revisa el administrador; no se publica sola.' }];
    PB.modal(baja ? 'Pedir que eliminemos tu anuncio' : 'Pedir un cambio en tu anuncio', 'Le llega al administrador. Cuando la revise te respondemos aquí en tu bandeja.', fields, 'Enviar solicitud', async function (v) {
      if (!v.text || v.text.length < 5) throw new Error('Cuéntanos qué necesitas (mínimo 5 letras).');
      await B.sendChange({ adId: ad.id, brand: ad.brand, kind: kind, text: v.text, newOffer: v.offer, newText: v.body }, v.file);
      PB.setMsg($('myMsg'), 'Solicitud enviada. La revisamos y te respondemos en tu bandeja.', 'ok');
    });
  }
  PB.renderCuenta = function () {
    var la = $('myAds'), lo = $('myList'), ln = $('myNotices'), lar = $('myArchList');
    la.textContent = ''; lo.textContent = ''; ln.textContent = ''; lar.textContent = '';
    $('noticeNote').textContent = 'Aquí te avisamos si aceptamos, rechazamos o desactivamos algo, y la respuesta a tus solicitudes de cambio.';
    if (!state.user) return;
    $('pName').textContent = state.user.name || state.user.email;
    $('pMail').textContent = state.user.name ? state.user.email : '';

    // Bandeja
    var all = state.notices.filter(function (n) { return n.archivedClient !== true; });
    var unread = all.filter(function (n) { return n.dir !== 'admin' && n.read !== true; });
    $('noticeHead').textContent = 'Bandeja de notificaciones' + (unread.length ? ' (' + unread.length + ' sin leer)' : '');
    var ra = $('readAll'); ra.hidden = !unread.length;
    ra.onclick = async function () { try { for (var i = 0; i < unread.length; i++) await B.patchNotice(unread[i].id, { read: true }); } catch (err) { PB.setMsg($('myMsg'), PB.errText(err), 'err'); } };
    if (!all.length) ln.appendChild(el('p', 'fine', 'Todavía no tienes notificaciones.'));
    all.slice(0, 30).forEach(function (n) {
      var mine = n.dir === 'admin', isNew = !mine && n.read !== true;
      var c = el('div', 'card' + (isNew ? ' nt-new' : ''));
      var top = el('div', 'crow'); var h = el('h3', '', n.subject); if (isNew) h.appendChild(el('span', 'nt-badge', 'Nuevo')); top.appendChild(h); top.appendChild(el('span', 'meta', PB.fmtDateTime(n.at)));
      c.appendChild(top);
      if (mine) {
        c.appendChild(el('p', 'meta', 'Enviada por ti · ' + (n.status === 'atendido' ? 'Atendida' : n.status === 'rechazado' ? 'No se pudo' : 'En revisión')));
        c.appendChild(el('p', '', n.text));
        if (n.answer) c.appendChild(el('p', 'fine', 'Respuesta: ' + n.answer));
      } else c.appendChild(el('p', '', n.text));
      var acts = el('div', 'acts');
      if (isNew) acts.appendChild(patch(n, { read: true }, 'Marcar leída'));
      acts.appendChild(patch(n, { archivedClient: true, read: true }, 'Archivar'));
      c.appendChild(acts); ln.appendChild(c);
    });

    // Pedidos
    var ords = state.orders.filter(function (o) { return o.clientArchived !== true; }), ordsA = state.orders.filter(function (o) { return o.clientArchived === true; });
    if (!ords.length) lo.appendChild(el('p', 'fine', 'Todavía no tienes solicitudes. Cuando publiques tu negocio, aquí sigues cada etapa.'));
    function ordCard(o, archived) {
      var c = el('div', 'ocard');
      var top = el('div', 'crow');
      top.appendChild(el('h3', '', PB.orderTitle(o)));
      top.appendChild(el('span', 'chipst st-' + o.status, PB.STATUS[o.status] || o.status));
      c.appendChild(top);
      c.appendChild(el('p', 'meta', 'Ref. ' + PB.ref(o) + ' · ' + PB.money(o.amount) + ' · ' + PB.payLabel(o)));
      c.appendChild(PB.timeline(o));
      if (!archived && (o.status === 'por_pagar' || o.status === 'pago_reportado')) c.appendChild(PB.payBox(o, $('myMsg')));
      var ca = el('div', 'acts');
      if (PB.canContract(o)) { ca.appendChild(PB.contractLink(o)); ca.appendChild(el('span', 'meta', 'Contrato ' + C.contractNo(o))); }
      var ad = o.tier && !o.renewOf ? PB.findAd(o.id) : null;
      var done = o.status === 'rechazado' || (o.status === 'aprobado' && (!o.tier || o.renewOf || !ad || !PB.visible(ad)));
      if (archived) ca.appendChild(arch('order', o, false, 'Restaurar')); else if (done) ca.appendChild(arch('order', o, true, 'Archivar'));
      if (ca.childNodes.length) c.appendChild(ca);
      return c;
    }
    ords.forEach(function (o) { lo.appendChild(ordCard(o, false)); });

    // Anuncios
    var mineAll = state.myAds.filter(function (a) { return a.uid === state.user.uid; });
    var mine = mineAll.filter(function (a) { return a.clientArchived !== true; }), mineA = mineAll.filter(function (a) { return a.clientArchived === true; });
    if (!mine.length) la.appendChild(el('p', 'fine', 'Todavía no tienes anuncios publicados.'));
    function adCard(ad, archived) {
      var st = PB.adStatus(ad), c = el('div', 'card');
      var top = el('div', 'crow');
      top.appendChild(el('h3', '', PB.clip(ad.brand, 30) + ' · ' + PB.tierLabel(ad.tier)));
      top.appendChild(el('span', 'chipst st-' + st.k, st.t));
      c.appendChild(top);
      if (ad.active !== true && ad.offReason) c.appendChild(el('p', 'offwhy', 'Desactivado por el administrador. Motivo: ' + ad.offReason));
      c.appendChild(el('p', 'meta', ad.endsAt ? (st.k === 'vencido' ? 'Venció el ' : 'Vence el ') + PB.fmtDate(ad.endsAt) : 'Aún sin fecha: se publica cuando el diseño esté listo.'));
      c.appendChild(PB.statsLine(ad));
      var acts = el('div', 'acts');
      var v = el('a', 'btn sm ghost', 'Ver ficha'); v.href = '#anuncio-' + ad.id; acts.appendChild(v);
      if (ad.startsAt) acts.appendChild(PB.reportLink(ad, 'btn sm navy'));
      var pending = state.orders.some(function (o) { return o.renewOf === ad.id && PB.OPEN.indexOf(o.status) >= 0; });
      var asked = state.notices.some(function (n) { return n.dir === 'admin' && n.adId === ad.id && n.status === 'nuevo'; });
      if (!archived && ad.endsAt && (st.k === 'porvencer' || st.k === 'vencido') && !pending) {
        var sel = el('select'); sel.setAttribute('aria-label', 'Duración de la renovación');
        C.durations.forEach(function (d) { var op = el('option', '', d.label + ' · ' + PB.money(C.priceFor(PB.cfg().prices[ad.tier], d.days)) + (C.discPct(d.days) ? ' (-' + C.discPct(d.days) + '%)' : '')); op.value = String(d.days); sel.appendChild(op); });
        sel.value = String(C.termDays);
        var r = el('button', 'btn sm yellow', 'Renovar'); r.type = 'button';
        r.addEventListener('click', function () { renew(ad, Number(sel.value)); });
        acts.appendChild(sel); acts.appendChild(r);
      }
      if (pending) acts.appendChild(el('span', 'meta', 'Renovación en proceso'));
      if (!archived && ad.startsAt && ad.active === true) {
        if (asked) acts.appendChild(el('span', 'meta', 'Solicitud enviada: la estamos revisando'));
        else {
          var ch = el('button', 'btn sm ghost', 'Pedir un cambio'); ch.type = 'button'; ch.addEventListener('click', function () { askChange(ad, 'cambio'); }); acts.appendChild(ch);
          var rm = el('button', 'btn sm ghost', 'Pedir eliminar'); rm.type = 'button'; rm.addEventListener('click', function () { askChange(ad, 'baja'); }); acts.appendChild(rm);
        }
      }
      if (archived) acts.appendChild(arch('ad', ad, false, 'Restaurar'));
      else if (ad.startsAt && ad.active !== true && !pending) acts.appendChild(arch('ad', ad, true, 'Archivar'));
      c.appendChild(acts); return c;
    }
    mine.forEach(function (ad) { la.appendChild(adCard(ad, false)); });

    // Archivo
    $('myArchSum').textContent = 'Archivo (' + (mineA.length + ordsA.length) + ')';
    if (!mineA.length && !ordsA.length) lar.appendChild(el('p', 'fine', 'Nada archivado.'));
    mineA.forEach(function (ad) { lar.appendChild(adCard(ad, true)); });
    ordsA.forEach(function (o) { lar.appendChild(ordCard(o, true)); });
  };

  // ---------- Estado del pedido (después de enviar) ----------
  PB.renderPago = function () {
    var card = $('payCard'); card.textContent = '';
    if (!state.user) {
      card.appendChild(el('p', '', 'Entra a tu cuenta para ver el estado de tu pedido.'));
      var a = el('a', 'btn navy', 'Ingresar'); a.href = '#entrar'; card.appendChild(a); return;
    }
    var o = state.orders.filter(function (x) { return x.id === state.payOrder; })[0];
    if (!o) {
      card.appendChild(el('p', '', state.payOrder ? 'Buscando tu pedido…' : 'No hay un pedido para mostrar.'));
      var l = el('a', 'btn ghost', 'Ir a mi panel'); l.href = '#cuenta'; card.appendChild(l); return;
    }
    var first = (state.user.name || '').split(' ')[0];
    var title = { revision: '¡Listo' + (first ? ', ' + first : '') + '!', por_pagar: 'Aceptada: falta pagar', pago_reportado: 'Pago avisado', aprobado: '¡Publicado!', rechazado: 'No aceptada' };
    card.appendChild(el('h1', '', title[o.status] || o.status));
    card.appendChild(el('p', '', o.status === 'revision' ? 'Recibimos tu solicitud. La revisamos y te avisamos aquí mismo.' : PB.statusLine(o)));
    card.appendChild(el('p', 'meta', PB.orderTitle(o) + ' · Ref. ' + PB.ref(o) + (o.status === 'revision' ? '' : ' · ' + PB.money(o.amount))));
    card.appendChild(PB.timeline(o));
    if (o.status === 'por_pagar' || o.status === 'pago_reportado') card.appendChild(PB.payBox(o, null));
    var acts = el('div', 'acts');
    if (PB.canContract(o)) acts.appendChild(PB.contractLink(o, 'btn ghost'));
    var my = el('a', 'btn navy', 'Ir a mi panel'); my.href = '#cuenta'; acts.appendChild(my);
    var hm = el('a', 'btn ghost', 'Volver al inicio'); hm.href = '#inicio'; acts.appendChild(hm);
    card.appendChild(acts);
  };

  // ---------- Entrar ----------
  var authMode = 'in';
  PB.setAuthMode = function (mode) {
    authMode = mode;
    var up = mode === 'up';
    $('nameFld').hidden = !up;
    $('h-auth').textContent = up ? 'Crear cuenta' : 'Ingresar';
    $('authSubmit').textContent = up ? 'Crear cuenta' : 'Ingresar';
    $('authToggle').textContent = up ? 'Ya tengo cuenta' : 'Crear una cuenta';
    $('au-pass').setAttribute('autocomplete', up ? 'new-password' : 'current-password');
    $('authReset').hidden = up;
    var adm = PB.entry === 'admin';
    if (adm) { $('h-auth').textContent = 'Acceso de administración'; $('authToggle').hidden = true; $('nameFld').hidden = true; }
    if (state.authNotice) { PB.setMsg($('authMsg'), state.authNotice, 'err'); state.authNotice = ''; }
  };
  async function demoLogin(kind) {
    try {
      B.ensureDemoUsers();
      var a = B.demoAccounts[kind];
      await B.signIn(a.email, a.pass);
      location.hash = PB.entry === 'admin' ? '#admin' : '#cuenta';
    } catch (err) { PB.setMsg($('authMsg'), PB.errText(err), 'err'); }
  }
  PB.initAccount = function () {
    PB.setAuthMode('in');
    $('authToggle').addEventListener('click', function () { PB.setAuthMode(authMode === 'in' ? 'up' : 'in'); PB.setMsg($('authMsg'), '', ''); });
    $('authForm').addEventListener('submit', async function (e) {
      e.preventDefault();
      var m = $('authMsg'), email = $('au-email').value.trim(), pass = $('au-pass').value, name = $('au-name').value.trim();
      if (!email) { PB.setMsg(m, 'Escribe tu correo.', 'err'); $('au-email').focus(); return; }
      if (!pass) { PB.setMsg(m, 'Escribe tu contraseña.', 'err'); $('au-pass').focus(); return; }
      if (authMode === 'up' && name.length < 2) { PB.setMsg(m, 'Escribe tu nombre.', 'err'); $('au-name').focus(); return; }
      if (authMode === 'up' && (pass.length < 8 || !/\d/.test(pass) || !/[A-Za-z]/.test(pass))) { PB.setMsg(m, 'La contraseña debe tener mínimo 8 caracteres, con letras y números.', 'err'); $('au-pass').focus(); return; }
      $('authSubmit').disabled = true;
      try {
        if (authMode === 'up') await B.signUp(name, email, pass); else await B.signIn(email, pass);
        $('au-pass').value = ''; PB.setMsg(m, '', '');
        var to = state.afterLogin || PB.homeHash(); state.afterLogin = PB.homeHash();
        location.hash = to;
      } catch (err) { PB.setMsg(m, PB.errText(err), 'err'); }
      $('authSubmit').disabled = false;
    });
    $('authReset').addEventListener('click', async function () {
      var m = $('authMsg'), email = $('au-email').value.trim();
      if (!email) { PB.setMsg(m, 'Escribe tu correo arriba y pulsa de nuevo.', 'err'); $('au-email').focus(); return; }
      try { await B.resetPassword(email); } catch (err) { /* no revelar si el correo existe */ }
      PB.setMsg(m, 'Si ese correo tiene cuenta, te enviamos un enlace para cambiar la contraseña.', 'ok');
    });
    $('loginAdmin').addEventListener('click', function () { demoLogin('admin'); });
    $('loginAdv').addEventListener('click', function () { demoLogin('adv'); });
  };
  PB.authMode = function () { return authMode; };
})();
