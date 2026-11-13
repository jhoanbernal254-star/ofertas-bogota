/*
  Backend real con Firebase, solo con servicios del plan gratuito: cuentas (Authentication) y datos (Firestore).
  Las imágenes se reducen en el navegador y se guardan dentro del documento (no se usa Storage ni Cloud Functions).
  El cobro es manual (Nequi): el administrador acepta la solicitud, el anunciante paga y el administrador confirma.
  Solo se usa si config.js tiene mode: 'firebase'. Las reglas de seguridad están en firestore.rules.
*/
(function () {
  'use strict';
  var C = window.PB_CONFIG;
  if (C.mode !== 'firebase') return;

  var V = '10.14.1';
  var BASE = 'https://www.gstatic.com/firebasejs/' + V + '/';
  var A, F, auth, db;
  var listeners = [];
  var DAY = 86400000;
  var COUNTERS = ['views', 'clicksWhatsapp', 'clicksPhone', 'clicksEmail', 'clicksWeb'];
  var B = { mode: 'firebase' };

  function fail(code, msg) { var e = new Error(msg); e.code = code; return e; }
  async function userFrom(u) {
    var admin = false;
    try { var s = await F.getDoc(F.doc(db, 'admins', u.uid)); admin = s.exists(); } catch (e) {}
    return { uid: u.uid, email: u.email, name: u.displayName || '', admin: admin };
  }
  async function emitCurrent() {
    var u = auth.currentUser;
    var cu = u ? await userFrom(u) : null;
    listeners.slice().forEach(function (cb) { cb(cu); });
  }
  function snapList(snap) {
    var list = [];
    snap.forEach(function (d) { var o = d.data(); o.id = d.id; list.push(o); });
    return list;
  }
  // Reduce la imagen y la devuelve como texto (data URL) para guardarla en Firestore.
  function prepImage(file, onProgress, size) {
    return new Promise(function (resolve, reject) {
      if (!/^image\//.test(file.type)) { reject(fail('bad-file', 'Por ahora solo se aceptan imágenes.')); return; }
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
        var q = 0.75, url = cv.toDataURL('image/jpeg', q);
        while (url.length > 400000 && q > 0.35) { q -= 0.1; url = cv.toDataURL('image/jpeg', q); }
        if (url.length > 400000) { reject(fail('too-big', 'La imagen es muy pesada. Prueba con otra más pequeña.')); return; }
        if (onProgress) onProgress(100);
        resolve({ url: url, type: 'image' });
      };
      img.onerror = function () { URL.revokeObjectURL(src); reject(fail('bad-image', 'No se pudo leer esa imagen. Prueba con otra.')); };
      img.src = src;
    });
  }

  B.init = async function () {
    var m = await Promise.all([
      import(BASE + 'firebase-app.js'),
      import(BASE + 'firebase-auth.js'),
      import(BASE + 'firebase-firestore.js')
    ]);
    var app = m[0].initializeApp(C.firebase);
    A = m[1]; F = m[2];
    auth = A.getAuth(app);
    db = F.getFirestore(app);
    A.onAuthStateChanged(auth, function () { emitCurrent(); });
  };
  B.onAuth = function (cb) {
    listeners.push(cb);
    if (auth && auth.authStateReady) auth.authStateReady().then(emitCurrent);
    return function () { var i = listeners.indexOf(cb); if (i >= 0) listeners.splice(i, 1); };
  };

  B.signUp = async function (name, email, pass) {
    var cred = await A.createUserWithEmailAndPassword(auth, String(email).trim(), pass);
    var nm = String(name || '').trim().slice(0, 60);
    if (nm) await A.updateProfile(cred.user, { displayName: nm });
    await emitCurrent();
  };
  B.signIn = async function (email, pass) { await A.signInWithEmailAndPassword(auth, String(email).trim(), pass); };
  B.signOut = function () { return A.signOut(auth); };
  B.resetPassword = function (email) { return A.sendPasswordResetEmail(auth, String(email).trim()); };

  B.watchPublicAds = function (cb, err) {
    return F.onSnapshot(F.query(F.collection(db, 'ads'), F.where('active', '==', true)), function (s) { cb(snapList(s)); }, err);
  };
  B.watchOwnAds = function (user, cb, err) {
    var q = user.admin ? F.collection(db, 'ads') : F.query(F.collection(db, 'ads'), F.where('uid', '==', user.uid));
    return F.onSnapshot(q, function (s) { cb(snapList(s)); }, err);
  };
  B.watchConfig = function (cb, err) {
    return F.onSnapshot(F.doc(db, 'config', 'site'), function (s) { cb(s.exists() ? s.data() : null); }, err);
  };
  B.watchOrders = function (user, cb, err) {
    var q = user.admin
      ? F.query(F.collection(db, 'orders'), F.orderBy('createdAt', 'desc'), F.limit(300))
      : F.query(F.collection(db, 'orders'), F.where('uid', '==', user.uid));
    return F.onSnapshot(q, function (snap) {
      var list = snapList(snap);
      list.sort(function (a, b) { return (b.createdAt || 0) - (a.createdAt || 0); });
      cb(list);
    }, err);
  };

  function ordersWithIds(list) { return list; }

  // El anunciante envía su solicitud. No paga nada todavía.
  B.sendRequest = async function (d, onProgress) {
    var u = auth.currentUser;
    if (!u) throw fail('auth/required', 'Inicia sesión para continuar.');
    var o = {
      uid: u.uid, userEmail: u.email || '', status: 'revision', createdAt: Date.now(),
      tier: d.renewOf ? '' : (d.tier || ''), renewOf: d.renewOf || '', designPieces: d.renewOf ? 0 : (d.designPieces || 0),
      designBrief: String(d.designBrief || '').slice(0, 400), usePromo: !!(d.usePromo && d.tier && !d.renewOf),
      brand: d.brand || '', headline: d.headline || '', body: d.body || '', categoria: d.categoria || '', localidad: d.localidad || '',
      barrio: d.barrio || '', address: d.address || '', whatsapp: d.whatsapp || '', phone: d.phone || '', mail: d.mail || '', web: d.web || '',
      pal: d.pal || 0, media: null, amount: 0, days: d.days == null ? C.termDays : Number(d.days)
    };
    if (!C.durationFor(o.days)) throw fail('invalid', 'Elige una duración válida.');
    if (d.renewOf) {
      var snap = await F.getDoc(F.doc(db, 'ads', d.renewOf));
      if (!snap.exists() || snap.data().uid !== u.uid) throw fail('permission-denied', 'No puedes renovar este anuncio.');
      var ad = snap.data();
      ['brand', 'headline', 'body', 'categoria', 'localidad', 'barrio', 'address', 'whatsapp', 'phone', 'mail', 'web', 'pal'].forEach(function (k) { o[k] = ad[k] == null ? o[k] : ad[k]; });
      o.tier = ad.tier; o.media = ad.media || null;
    } else if (d.file) {
      o.media = await prepImage(d.file, onProgress, o.tier && !o.designPieces ? C.tiers[o.tier].size : null);
    }
    var q = C.quote(o, null, [], [], Date.now());
    o.amount = q.ok ? q.amount : 0; // es solo un estimado: el monto final lo fija el administrador al aceptar
    var ref = await F.addDoc(F.collection(db, 'orders'), o);
    return { orderId: ref.id };
  };

  function adFromOrder(o, now) {
    var draft = o.designPieces > 0;
    var ad = {
      uid: o.uid, orderId: o.id, tier: o.tier, brand: o.brand, headline: o.headline, body: o.body || '',
      categoria: o.categoria, localidad: o.localidad, barrio: o.barrio || '', address: o.address || '',
      whatsapp: o.whatsapp || '', phone: o.phone || '', mail: o.mail || '', web: o.web || '', pal: o.pal || 0,
      media: o.media ? { url: o.media.url, type: o.media.type } : null,
      createdAt: now, active: !draft, startsAt: draft ? null : now, endsAt: draft ? null : now + (o.days || C.termDays) * DAY
    };
    COUNTERS.forEach(function (k) { ad[k] = 0; });
    return { ad: ad, draft: draft };
  }
  // Publica o renueva en el mismo lote de escritura. existingAd: el anuncio que se renueva.
  function publishInto(batch, o, existingAd, now) {
    if (o.renewOf) {
      var base = Math.max(now, existingAd && existingAd.endsAt ? existingAd.endsAt : 0);
      batch.update(F.doc(db, 'ads', o.renewOf), { endsAt: base + (o.days || C.termDays) * DAY, active: true, expired: false });
      return false;
    }
    if (o.tier) {
      var r = adFromOrder(o, now);
      batch.set(F.doc(db, 'ads', o.id), r.ad);
      return r.draft;
    }
    return false;
  }

  // ctx = { orders, ads, config }: lo que el panel del administrador ya tiene cargado.
  B.acceptOrder = async function (order, ctx) {
    var now = Date.now();
    var q = C.quote(order, ctx.config, ctx.orders, ctx.ads, now);
    if (!q.ok) throw fail('invalid', q.error);
    var batch = F.writeBatch(db);
    var oref = F.doc(db, 'orders', order.id);
    if (q.amount === 0) {
      var base = ctx.ads.filter(function (a) { return a.id === order.renewOf; })[0];
      var draft = publishInto(batch, order, base, now);
      batch.update(oref, { status: 'aprobado', amount: 0, promo: q.promo, free: true, acceptedAt: now, paidAt: now, decidedAt: now });
      await batch.commit();
      return { free: true, draft: draft };
    }
    batch.update(oref, { status: 'por_pagar', amount: q.amount, promo: q.promo, acceptedAt: now });
    await batch.commit();
    return { free: false };
  };
  B.reportPaid = function (id) {
    return F.updateDoc(F.doc(db, 'orders', id), { status: 'pago_reportado', reportedAt: Date.now() });
  };
  B.confirmPaid = async function (order, ctx) {
    var now = Date.now();
    var batch = F.writeBatch(db);
    var base = ctx.ads.filter(function (a) { return a.id === order.renewOf; })[0];
    var draft = publishInto(batch, order, base, now);
    batch.update(F.doc(db, 'orders', order.id), { status: 'aprobado', paidAt: now, decidedAt: now });
    await batch.commit();
    return { draft: draft };
  };
  B.rejectOrder = function (id, reason) {
    return F.updateDoc(F.doc(db, 'orders', id), { status: 'rechazado', decidedAt: Date.now(), rejectReason: String(reason || '').slice(0, 200) });
  };

  B.saveAd = async function (d, file, onProgress) {
    var now = Date.now();
    var fields = {
      brand: d.brand, headline: d.headline, body: d.body, categoria: d.categoria, localidad: d.localidad, barrio: d.barrio,
      address: d.address, whatsapp: d.whatsapp, phone: d.phone, mail: d.mail, web: d.web, pal: d.pal, tier: d.tier, active: !!d.active
    };
    if (file) { fields.media = await prepImage(file, onProgress, C.tiers[d.tier] && C.tiers[d.tier].size); }
    if (d.endsAt) fields.endsAt = d.endsAt;
    if (fields.active) {
      if (!d.startsAt) fields.startsAt = now;
      if (!d.endsAt && !d.hadEnds) fields.endsAt = now + C.termDays * DAY;
      if ((fields.endsAt || 0) > now) fields.expired = false;
    }
    if (d.id) {
      await F.updateDoc(F.doc(db, 'ads', d.id), fields);
      return d.id;
    }
    var ref = F.doc(F.collection(db, 'ads'));
    var ad = Object.assign({ uid: auth.currentUser.uid, orderId: null, createdAt: now, startsAt: fields.active ? now : null, endsAt: fields.endsAt || null, media: null }, fields);
    if (fields.active && !ad.endsAt) ad.endsAt = now + C.termDays * DAY;
    COUNTERS.forEach(function (k) { ad[k] = 0; });
    await F.setDoc(ref, ad);
    return ref.id;
  };
  B.setAdActive = async function (id, on, ad) {
    var now = Date.now();
    var f = { active: !!on };
    if (on) {
      if (!ad || !ad.startsAt) f.startsAt = now;
      if (!ad || !ad.endsAt) f.endsAt = now + C.termDays * DAY;
    }
    await F.updateDoc(F.doc(db, 'ads', id), f);
  };
  B.renewAd = async function (id, ad) {
    var now = Date.now();
    var f = { endsAt: Math.max(now, ad && ad.endsAt ? ad.endsAt : 0) + C.termDays * DAY, active: true, expired: false };
    if (!ad || !ad.startsAt) f.startsAt = now;
    await F.updateDoc(F.doc(db, 'ads', id), f);
  };
  B.track = async function (id, field) {
    if (COUNTERS.indexOf(field) < 0) return;
    var u = {};
    u[field] = F.increment(1);
    await F.updateDoc(F.doc(db, 'ads', id), u);
  };
  B.saveConfig = function (c) {
    return F.setDoc(F.doc(db, 'config', 'site'), Object.assign({}, c, { updatedAt: Date.now() }), { merge: true });
  };

  window.PBFirebase = B;
})();
