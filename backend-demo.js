/*
  Backend de demostración: guarda todo en el navegador (localStorage).
  Sirve para ver el recorrido completo sin Firebase. No cobra dinero.
  Las imágenes se reducen y se guardan; los videos de prueba solo duran hasta recargar la página.
*/
(function () {
  'use strict';
  var C = window.PB_CONFIG;
  var KEY = 'pb-demo-v1';
  var DAY = 86400000;
  var COUNTERS = ['views', 'clicksWhatsapp', 'clicksPhone', 'clicksEmail', 'clicksWeb'];
  var AD_FIELDS = ['brand', 'headline', 'body', 'categoria', 'localidad', 'barrio', 'address', 'whatsapp', 'phone', 'mail', 'web', 'pal', 'tier'];
  var data = null;
  var videos = {};
  var L = { auth: [], pub: [], own: [], orders: [], config: [], notices: [] };

  var ACCOUNTS = {
    admin: { email: 'admin@demo.pb', pass: 'demo1234', name: 'Administrador de prueba' },
    adv: { email: 'anunciante@demo.pb', pass: 'demo1234', name: 'Anunciante de prueba' }
  };

  function blank() { return { users: {}, orders: {}, ads: {}, config: null, session: null, notices: [] }; }
  function clone(x) { return x == null ? x : JSON.parse(JSON.stringify(x)); }
  function rid() { return Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4); }
  function fail(code, msg) { var e = new Error(msg); e.code = code; return e; }
  function cfg() { return C.resolve(data.config); }

  function load() {
    var d = null;
    try { var r = localStorage.getItem(KEY); if (r) d = JSON.parse(r); } catch (e) {}
    if (!d || typeof d !== 'object' || !d.users) d = blank();
    if (!Array.isArray(d.notices)) d.notices = [];
    data = d;
    Object.keys(data.orders).forEach(function (id) {
      var m = data.orders[id].media;
      if (m && m.ephemeral && !videos[id]) data.orders[id].media = null;
    });
    Object.keys(data.ads).forEach(function (id) {
      var m = data.ads[id].media;
      if (m && m.ephemeral && !videos[id]) data.ads[id].media = null;
    });
  }
  function save() { try { localStorage.setItem(KEY, JSON.stringify(data)); return true; } catch (e) { return false; } }

  function currentUser() {
    var u = data.session ? data.users[data.session] : null;
    return u ? { uid: u.uid, email: u.email, name: u.name, admin: !!u.admin } : null;
  }
  function requireAdmin() {
    var u = currentUser();
    if (!u || !u.admin) throw fail('permission-denied', 'No tienes permisos de administrador.');
    return u;
  }

  function withId(map, k) { var o = clone(map[k]); o.id = k; return o; }
  function pubAds() { return Object.keys(data.ads).filter(function (k) { return data.ads[k].active === true; }).map(function (k) { return withId(data.ads, k); }); }
  function ownAds(e) { return Object.keys(data.ads).filter(function (k) { return e.admin || data.ads[k].uid === e.uid; }).map(function (k) { return withId(data.ads, k); }); }
  function ordersFor(e) {
    return Object.keys(data.orders).filter(function (k) { return e.admin || data.orders[k].uid === e.uid; })
      .map(function (k) { return withId(data.orders, k); })
      .sort(function (a, b) { return (b.createdAt || 0) - (a.createdAt || 0); });
  }
  function emitAuth() { var u = currentUser(); L.auth.slice().forEach(function (cb) { cb(u); }); }
  function emitPub() { L.pub.slice().forEach(function (cb) { cb(pubAds()); }); }
  function emitOwn() { L.own.slice().forEach(function (e) { e.cb(ownAds(e)); }); }
  function emitOrders() { L.orders.slice().forEach(function (e) { e.cb(ordersFor(e)); }); }
  function emitConfig() { L.config.slice().forEach(function (cb) { cb(clone(data.config)); }); }
  function emitNotices() { L.notices.slice().forEach(function (e) { e.cb(noticesFor(e)); }); }
  function emitAll() { emitAuth(); emitPub(); emitOwn(); emitOrders(); emitConfig(); emitNotices(); }
  function noticesFor(e) {
    return data.notices.filter(function (n) { return e.admin || n.uid === e.uid; }).map(clone).sort(function (a, b) { return b.at - a.at; });
  }
  // Avisos simulados: en la versión real son correos al anunciante.
  function notify(uid, subject, text) {
    var to = '';
    Object.keys(data.users).forEach(function (k) { if (data.users[k].uid === uid) to = data.users[k].email; });
    data.notices.push({ id: 'n' + rid(), uid: uid, to: to, subject: subject, text: text, at: Date.now() });
    if (data.notices.length > 150) data.notices = data.notices.slice(-150);
  }
  function what(o) {
    if (o.renewOf) return 'la renovación de tu anuncio';
    if (o.tier && o.designPieces > 0) return 'tu anuncio con diseño';
    if (o.tier) return 'tu anuncio';
    return 'tu pedido de diseño';
  }

  function sub(list, item) { list.push(item); return function () { var i = list.indexOf(item); if (i >= 0) list.splice(i, 1); }; }

  function prepMedia(file, id, onProgress, size) {
    return new Promise(function (resolve, reject) {
      if (file.type.indexOf('video/') === 0) {
        var url = URL.createObjectURL(file);
        videos[id] = url;
        if (onProgress) onProgress(100);
        resolve({ url: url, type: 'video', ephemeral: true });
        return;
      }
      var src = URL.createObjectURL(file);
      var img = new Image();
      img.onload = function () {
        var cv = document.createElement('canvas');
        if (size) {
          // A medida: se recorta al centro para que quede exactamente del tamaño del espacio.
          cv.width = size.w; cv.height = size.h;
          var k = Math.max(size.w / img.width, size.h / img.height), dw = img.width * k, dh = img.height * k;
          cv.getContext('2d').drawImage(img, (size.w - dw) / 2, (size.h - dh) / 2, dw, dh);
        } else {
          var max = 900, r = Math.min(1, max / Math.max(img.width, img.height));
          cv.width = Math.max(1, Math.round(img.width * r));
          cv.height = Math.max(1, Math.round(img.height * r));
          cv.getContext('2d').drawImage(img, 0, 0, cv.width, cv.height);
        }
        URL.revokeObjectURL(src);
        if (onProgress) onProgress(100);
        resolve({ url: cv.toDataURL('image/jpeg', 0.75), type: 'image' });
      };
      img.onerror = function () { URL.revokeObjectURL(src); reject(fail('bad-image', 'No se pudo leer esa imagen. Prueba con otra.')); };
      img.src = src;
    });
  }

  var B = { mode: 'demo', demoAccounts: ACCOUNTS };
  B.watchNotices = function (user, cb) {
    var e = { uid: user.uid, admin: !!user.admin, cb: cb };
    var off = sub(L.notices, e); cb(noticesFor(e)); return off;
  };

  B.init = function () {
    load();
    if (!Object.keys(data.ads).length && !Object.keys(data.users).length) B.seed(); // primera visita: ejemplos para ver el directorio
    window.addEventListener('storage', function (e) { if (e.key === KEY) { load(); emitAll(); } });
    return Promise.resolve();
  };
  B.onAuth = function (cb) { var off = sub(L.auth, cb); cb(currentUser()); return off; };

  B.signUp = async function (name, email, pass) {
    email = String(email || '').trim().toLowerCase();
    if (!/^\S+@\S+\.\S+$/.test(email)) throw fail('auth/invalid-email', 'Correo no válido.');
    if (String(pass || '').length < 6) throw fail('auth/weak-password', 'Contraseña débil.');
    if (data.users[email]) throw fail('auth/email-already-in-use', 'Ese correo ya existe.');
    data.users[email] = { uid: 'u' + rid(), email: email, name: String(name || '').trim().slice(0, 60), pass: pass, admin: false };
    data.session = email;
    save(); emitAuth(); emitOrders(); emitOwn();
  };
  B.signIn = async function (email, pass) {
    email = String(email || '').trim().toLowerCase();
    var u = data.users[email];
    if (!u || u.pass !== pass) throw fail('auth/invalid-credential', 'Credenciales incorrectas.');
    data.session = email;
    save(); emitAuth(); emitOrders(); emitOwn();
  };
  B.signOut = async function () { data.session = null; save(); emitAuth(); emitOrders(); emitOwn(); };
  B.resetPassword = async function () { return true; };
  B.ensureDemoUsers = function () {
    Object.keys(ACCOUNTS).forEach(function (k) {
      var a = ACCOUNTS[k];
      if (!data.users[a.email]) data.users[a.email] = { uid: 'u' + rid(), email: a.email, name: a.name, pass: a.pass, admin: k === 'admin' };
    });
    save();
  };

  B.watchPublicAds = function (cb) { var off = sub(L.pub, cb); cb(pubAds()); return off; };
  B.watchOwnAds = function (user, cb) {
    var e = { uid: user.uid, admin: !!user.admin, cb: cb };
    var off = sub(L.own, e); cb(ownAds(e)); return off;
  };
  B.watchConfig = function (cb) { var off = sub(L.config, cb); cb(clone(data.config)); return off; };
  B.watchOrders = function (user, cb) {
    var e = { uid: user.uid, admin: !!user.admin, cb: cb };
    var off = sub(L.orders, e); cb(ordersFor(e)); return off;
  };

  function allOrders() { return Object.keys(data.orders).map(function (k) { return withId(data.orders, k); }); }
  function allAds() { return Object.keys(data.ads).map(function (k) { return withId(data.ads, k); }); }

  // El anunciante envía su solicitud. No paga nada todavía.
  B.sendRequest = async function (d, onProgress) {
    var u = currentUser();
    if (!u) throw fail('auth/required', 'Inicia sesión para continuar.');
    var now = Date.now(), id = 'ord' + rid();
    var days = d.days == null ? C.termDays : Number(d.days);
    if (!C.durationFor(days)) throw fail('invalid', 'Elige una duración válida.');
    var o = { uid: u.uid, userEmail: u.email, status: 'revision', createdAt: now, designPieces: 0, designBrief: '', usePromo: false, days: days };
    if (d.renewOf) {
      var ad = data.ads[d.renewOf];
      if (!ad || ad.uid !== u.uid) throw fail('permission-denied', 'No puedes renovar este anuncio.');
      AD_FIELDS.forEach(function (f) { o[f] = ad[f]; });
      o.media = clone(ad.media || null);
      o.renewOf = d.renewOf;
    } else {
      var tier = d.tier || '';
      var pieces = Math.max(0, Math.min(C.design.maxPieces, parseInt(d.designPieces, 10) || 0));
      if (!tier && !pieces) throw fail('invalid', 'Elige un espacio o el servicio de diseño.');
      if (tier && !C.tiers[tier]) throw fail('invalid', 'Elige un espacio válido.');
      if (pieces && String(d.designBrief || '').trim().length < 10) throw fail('invalid', 'Cuéntanos qué necesitas para el diseño.');
      AD_FIELDS.forEach(function (f) { o[f] = d[f] == null ? '' : d[f]; });
      o.tier = tier;
      o.designPieces = pieces;
      o.designBrief = String(d.designBrief || '').slice(0, 400);
      o.usePromo = !!(d.usePromo && tier);
      if (d.file) o.media = await prepMedia(d.file, id, onProgress, tier && !pieces ? C.tiers[tier].size : null); else o.media = null;
    }
    var q = C.quote(o, data.config, allOrders(), allAds(), now);
    o.amount = q.ok ? q.amount : 0; // es solo un estimado: el monto final lo fija el administrador al aceptar
    data.orders[id] = o;
    notify(o.uid, 'Recibimos tu solicitud', 'Revisamos tu solicitud de ' + what(o) + ' y te avisamos si la aceptamos. No pagas nada todavía.');
    if (!save()) {
      delete data.orders[id];
      throw fail('storage-full', 'El navegador no tiene espacio para guardar esta prueba. Usa una imagen más pequeña o borra los datos de prueba.');
    }
    emitOrders(); emitNotices();
    return { orderId: id };
  };

  // Publica o renueva según el pedido (se llama cuando ya está pagado o es gratis).
  function publish(o, now) {
    var draft = false;
    if (o.renewOf) {
      var ad = data.ads[o.renewOf];
      if (!ad) throw fail('bad-state', 'El anuncio original ya no existe.');
      ad.endsAt = Math.max(now, ad.endsAt || 0) + (o.days || C.termDays) * DAY;
      ad.active = true; ad.expired = false;
    } else if (o.tier) {
      draft = o.designPieces > 0;
      var ex = { uid: o.uid, orderId: o.id, media: clone(o.media || null), createdAt: now, active: !draft, startsAt: draft ? null : now, endsAt: draft ? null : now + (o.days || C.termDays) * DAY };
      AD_FIELDS.forEach(function (f) { ex[f] = o[f]; });
      COUNTERS.forEach(function (k) { ex[k] = 0; });
      data.ads[o.id] = ex;
    }
    return draft;
  }
  function doneNotice(o, draft) {
    notify(o.uid, o.renewOf ? 'Renovación lista' : draft ? 'Estamos creando tu diseño' : o.tier ? 'Tu anuncio ya está publicado' : 'Tu diseño está en camino',
      o.renewOf ? 'Tu anuncio sigue publicado ' + C.durLabel(o.days || C.termDays) + ' más.' : draft ? 'Cuando el diseño esté listo, tu anuncio se publica y te avisamos.' : o.tier ? 'Tu anuncio ya se ve en el directorio durante ' + C.durLabel(o.days || C.termDays) + '.' : 'Te enviamos la pieza que pediste por los datos de contacto que dejaste.');
  }

  // El administrador acepta: se fija el monto y, si hay que pagar, el anunciante recibe cómo hacerlo.
  B.acceptOrder = async function (order) {
    requireAdmin();
    var o = data.orders[order.id], now = Date.now();
    if (!o || o.status !== 'revision') throw fail('bad-state', 'Solo se aceptan solicitudes en revisión.');
    o.id = order.id;
    var q = C.quote(o, data.config, allOrders(), allAds(), now);
    delete o.id;
    if (!q.ok) throw fail('invalid', q.error);
    o.amount = q.amount; o.promo = q.promo; o.acceptedAt = now;
    if (q.amount === 0) {
      o.id = order.id; var draft0 = publish(o, now); delete o.id;
      o.status = 'aprobado'; o.free = true; o.paidAt = now; o.decidedAt = now;
      doneNotice(o, draft0);
      save(); emitOrders(); emitPub(); emitOwn(); emitNotices();
      return { free: true, draft: draft0 };
    }
    o.status = 'por_pagar';
    notify(o.uid, 'Aceptamos tu solicitud: falta el pago', 'Aceptamos ' + what(o) + '. Paga ' + C.fmtMoney(o.amount) + ' por Nequi al ' + C.pago.nequi + ' (' + C.pago.titular + ') y avísanos desde tu cuenta. Cuando confirmemos el pago se publica.');
    save(); emitOrders(); emitNotices();
    return { free: false };
  };
  B.reportPaid = async function (id) {
    var u = currentUser(), o = data.orders[id];
    if (!u || !o || o.uid !== u.uid) throw fail('permission-denied', 'No puedes modificar ese pedido.');
    if (o.status !== 'por_pagar') throw fail('bad-state', 'Ese pedido no está esperando pago.');
    o.status = 'pago_reportado'; o.reportedAt = Date.now();
    notify(o.uid, 'Avisamos al administrador', 'Recibimos tu aviso de pago. Cuando lo confirmemos se publica tu anuncio.');
    save(); emitOrders(); emitNotices();
  };
  B.confirmPaid = async function (order) {
    requireAdmin();
    var o = data.orders[order.id], now = Date.now();
    if (!o || ['por_pagar', 'pago_reportado'].indexOf(o.status) < 0) throw fail('bad-state', 'Ese pedido no está esperando pago.');
    o.id = order.id; var draft = publish(o, now); delete o.id;
    o.status = 'aprobado'; o.paidAt = now; o.decidedAt = now;
    doneNotice(o, draft);
    save(); emitOrders(); emitPub(); emitOwn(); emitNotices();
    return { draft: draft };
  };
  B.rejectOrder = async function (id, reason) {
    requireAdmin();
    var o = data.orders[id];
    if (!o || ['revision', 'por_pagar', 'pago_reportado'].indexOf(o.status) < 0) throw fail('bad-state', 'Ese pedido ya no se puede rechazar.');
    var paid = o.status === 'pago_reportado';
    o.status = 'rechazado'; o.decidedAt = Date.now(); o.rejectReason = String(reason || '').slice(0, 200);
    notify(o.uid, 'No pudimos aceptar tu solicitud', 'No aceptamos ' + what(o) + (o.rejectReason ? ': ' + o.rejectReason : '.') + (paid ? ' Si ya habías pagado, te lo devolvemos.' : ' No se te cobró nada.'));
    save(); emitOrders(); emitNotices();
  };

  B.saveAd = async function (d, file, onProgress) {
    var u = requireAdmin(), now = Date.now();
    var id = d.id || 'ad' + rid();
    var ad = data.ads[id] || { uid: u.uid, orderId: null, createdAt: now, startsAt: null, endsAt: null, active: false };
    COUNTERS.forEach(function (k) { if (ad[k] == null) ad[k] = 0; });
    AD_FIELDS.forEach(function (f) { if (d[f] !== undefined) ad[f] = d[f]; });
    if (file) ad.media = await prepMedia(file, id, onProgress, C.tiers[ad.tier] && C.tiers[ad.tier].size);
    ad.active = !!d.active;
    if (d.endsAt) ad.endsAt = d.endsAt;
    if (ad.active) {
      if (!ad.startsAt) ad.startsAt = now;
      if (!ad.endsAt) ad.endsAt = now + C.termDays * DAY;
      if (ad.endsAt > now) ad.expired = false;
    }
    data.ads[id] = ad;
    if (!save()) throw fail('storage-full', 'El navegador no tiene espacio. Usa una imagen más pequeña.');
    emitPub(); emitOwn();
    return id;
  };
  B.setAdActive = async function (id, on) {
    requireAdmin();
    var ad = data.ads[id], now = Date.now();
    if (!ad) throw fail('bad-state', 'No se encontró el anuncio.');
    ad.active = !!on;
    if (on) { if (!ad.startsAt) ad.startsAt = now; if (!ad.endsAt) ad.endsAt = now + C.termDays * DAY; }
    save(); emitPub(); emitOwn();
  };
  B.renewAd = async function (id) {
    requireAdmin();
    var ad = data.ads[id], now = Date.now();
    if (!ad) throw fail('bad-state', 'No se encontró el anuncio.');
    ad.endsAt = Math.max(now, ad.endsAt || 0) + C.termDays * DAY;
    ad.active = true; ad.expired = false; if (!ad.startsAt) ad.startsAt = now;
    save(); emitPub(); emitOwn();
  };
  B.track = async function (id, field) {
    var ad = data.ads[id];
    if (!ad || COUNTERS.indexOf(field) < 0) return;
    ad[field] = (ad[field] || 0) + 1;
    save(); emitOwn();
  };
  B.saveConfig = async function (c) {
    requireAdmin();
    data.config = Object.assign({}, data.config || {}, c, { updatedAt: Date.now() });
    save(); emitConfig();
  };

  B.seed = function () {
    var now = Date.now();
    // [id, tier, marca, titular, descripción, categoría, localidad, barrio, dirección, whatsapp, web, paleta, días restantes]
    var ex = [
      ['exP', 'premium', 'Plus Ejemplo', 'Tu marca en todas partes', '', 'Servicios', 'Chapinero', 'Centro', '', '3000000000', '', 2, 28],
      ['ex1', 'banner', 'Café Ejemplo', 'Tu mañana empieza aquí', 'Café de origen, pan fresco y wifi rápido. Anuncio de ejemplo para ver cómo luce un banner principal.', 'Restaurantes', 'Chapinero', 'Quinta Camacho', 'Cra. 11 # 69-10', '3000000001', '', 0, 24],
      ['ex2', 'banner', 'Taller Muestra', 'Tu bici como nueva', 'Revisión completa en 48 horas, repuestos y accesorios. Anuncio de ejemplo.', 'Servicios', 'Teusaquillo', 'La Soledad', 'Calle 39 # 21-15', '3000000002', 'https://ejemplo.com', 1, 17],
      ['ex3', 'destacado', 'Sabor Andino', 'Almuerzos ejecutivos', 'Menú del día con sopa, principio y jugo natural. Anuncio de ejemplo.', 'Restaurantes', 'Suba', 'Niza', 'Av. Suba # 114-20', '3000000003', '', 3, 12],
      ['ex4', 'destacado', 'Estilo Norte', 'Ropa para toda ocasión', 'Colección nueva cada mes y cambios sin costo. Anuncio de ejemplo.', 'Ropa', 'Usaquén', 'Cedritos', 'Calle 140 # 11-30', '3000000004', 'https://ejemplo.com/ropa', 2, 20],
      ['ex5', 'mediano', 'Clases Demo', 'Aprende guitarra en un mes', 'Clases en grupo pequeño. Anuncio de ejemplo.', 'Educación', 'Kennedy', 'Castilla', '', '3000000005', '', 5, 9],
      ['ex6', 'mediano', 'TecnoFix', 'Reparación de celulares', 'Pantallas y baterías el mismo día. Anuncio de ejemplo.', 'Tecnología', 'Engativá', 'Boyacá Real', '', '3000000006', '', 0, 22],
      ['ex7', 'mediano', 'Hogar Sur', 'Muebles a tu medida', 'Cocinas, closets y reparaciones. Anuncio de ejemplo.', 'Hogar', 'Bosa', 'Centro', '', '3000000007', '', 4, 15],
      ['ex8', 'pequeno', 'Pan Prueba', 'Pan de masa madre', '', 'Restaurantes', 'Suba', 'Rincón', '', '3000000008', '', 1, 11],
      ['ex9', 'pequeno', 'Flores Test', 'Flores frescas', '', 'Hogar', 'Chapinero', 'Chicó', '', '3000000009', '', 5, 7],
      ['ex10', 'pequeno', 'Libros Piloto', 'Libros usados', '', 'Educación', 'La Candelaria', 'Centro', '', '3000000010', '', 4, 5],
      ['ex11', 'pequeno', 'Bella Piel', 'Limpieza facial', '', 'Belleza', 'Usaquén', 'Santa Ana', '', '3000000011', '', 2, 19],
      ['ex12', 'pequeno', 'Ferre Todo', 'Todo para tu obra', '', 'Ferreterías', 'Puente Aranda', 'Montevideo', '', '3000000012', '', 3, 13]
    ];
    ex.forEach(function (e) {
      if (data.ads[e[0]] && data.ads[e[0]].endsAt > now) return;
      var ad = {
        uid: 'ejemplo', orderId: null, tier: e[1], brand: e[2], headline: e[3], body: e[4], categoria: e[5], localidad: e[6], barrio: e[7],
        address: e[8], whatsapp: e[9], phone: '', mail: '', web: e[10], pal: e[11], media: null,
        createdAt: now, startsAt: now, endsAt: now + e[12] * DAY, active: true, example: true
      };
      COUNTERS.forEach(function (k) { ad[k] = 0; });
      data.ads[e[0]] = ad;
    });
    save(); emitPub(); emitOwn();
  };
  B.reset = function () { data = blank(); videos = {}; save(); emitAll(); };

  window.PBDemo = B;
})();
