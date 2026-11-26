/* Panel del administrador: solicitudes, pagos, anuncios, pedidos, precios/cupos/vallas y editor. */
(function () {
  'use strict';
  var PB = window.PB, C = PB.C, $ = PB.$, el = PB.el, state = PB.state, B = PB.B;
  var adFilter = 'todos', orderFilter = 'todos', cfgFilled = false, editing = null, editFile = null, editFileTop = null, editCats = [];
  PB.resetAdminCfg = function () { cfgFilled = false; };

  function newRepCount() { return (state.reports || []).filter(function (r) { return r.status === 'nuevo'; }).length; }
  async function adminDo(fn, okText) {
    var m = $('admMsg');
    try { var r = await fn(); PB.setMsg(m, typeof okText === 'function' ? okText(r) : okText, 'ok'); }
    catch (err) { PB.setMsg(m, PB.errText(err), 'err'); }
  }

  function adArch(a) { return a.archived === true || (a.active !== true && !!a.startsAt); }
  function ordArch(o) { return o.archived === true || o.status === 'rechazado'; }
  function archBtn(kind, rec, val, label) {
    var b = el('button', 'btn sm ghost', label); b.type = 'button';
    b.addEventListener('click', function () {
      adminDo(async function () {
        if (!val && kind === 'ad' && rec.active !== true) await B.setAdActive(rec.id, true, rec);
        if (val || rec.archived === true) await B.setArchived(kind, rec.id, val);
      }, val ? 'Archivado.' : 'Restaurado.');
    });
    return b;
  }


  // ---------- Estructura del panel: menú, cabecera y dashboard ----------
  var SECS = [['dash', 'Dashboard', 'grid'], ['solicitudes', 'Solicitudes', 'inbox'], ['pedidos', 'Pedidos', 'cart'], ['anuncios', 'Anuncios', 'megaphone'],
    ['bandeja', 'Bandeja', 'chat'], ['reportes', 'Reportes', 'flag'], ['contratos', 'Contratos', 'calendar'], ['informes', 'Informes', 'filechart'], ['archivo', 'Archivo', 'archive'], ['config', 'Configuración', 'gear']];
  var admSec = 'dash', shellWired = false, badges = {};
  try { var sv = sessionStorage.getItem('pb-adm-sec'); if (sv && SECS.some(function (x) { return x[0] === sv; })) admSec = sv; } catch (e) {}
  function showSec() {
    var sec = admSec;
    Array.prototype.forEach.call(document.querySelectorAll('.adm-sec'), function (s) { s.hidden = s.getAttribute('data-sec') !== sec; });
    Array.prototype.forEach.call(document.querySelectorAll('#admNav button'), function (b) { b.classList.toggle('on', b.getAttribute('data-sec') === sec); });
  }
  PB.admGo = function (sec) {
    admSec = sec; try { sessionStorage.setItem('pb-adm-sec', sec); } catch (e) {}
    showSec(); $('admSide').classList.remove('open'); $('admShade').classList.remove('on');
    ['admBellMenu', 'admUserMenu'].forEach(function (id) { $(id).hidden = true; });
    window.scrollTo(0, 0);
  };
  function closeMenus() { ['admBellMenu', 'admUserMenu'].forEach(function (id) { $(id).hidden = true; }); $('admBell').setAttribute('aria-expanded', 'false'); $('admUser').setAttribute('aria-expanded', 'false'); }
  function wireShell() {
    if (shellWired) return; shellWired = true;
    $('admBurger').addEventListener('click', function () { $('admSide').classList.add('open'); $('admShade').classList.add('on'); });
    $('admShade').addEventListener('click', function () { $('admSide').classList.remove('open'); $('admShade').classList.remove('on'); });
    $('admBell').addEventListener('click', function (e) { e.stopPropagation(); var m = $('admBellMenu'), was = m.hidden; closeMenus(); m.hidden = !was; $('admBell').setAttribute('aria-expanded', String(was)); });
    $('admUser').addEventListener('click', function (e) { e.stopPropagation(); var m = $('admUserMenu'), was = m.hidden; closeMenus(); m.hidden = !was; $('admUser').setAttribute('aria-expanded', String(was)); });
    document.addEventListener('click', function (e) { if (!e.target.closest || !e.target.closest('.adm-dd')) closeMenus(); });
    $('admSettings').addEventListener('click', function () { PB.admGo('config'); });
    $('admOut').addEventListener('click', function () { $('logoutBtn').click(); });
    $('denySalir').addEventListener('click', function () { $('logoutBtn').click(); });
  }
  function ago(ms) {
    var m = Math.round((Date.now() - ms) / 60000);
    if (m < 1) return 'Ahora'; if (m < 60) return 'Hace ' + m + ' min';
    var h = Math.round(m / 60); if (h < 24) return 'Hace ' + h + ' h';
    var d = Math.round(h / 24); return 'Hace ' + d + (d === 1 ? ' día' : ' días');
  }
  function chart(orders) {
    var DAY = 864e5, today = new Date(); today.setHours(0, 0, 0, 0);
    var t0 = today.getTime() - 29 * DAY, req = [], pub = [], i;
    for (i = 0; i < 30; i++) { req.push(0); pub.push(0); }
    orders.forEach(function (o) {
      var k = Math.floor(((o.createdAt || 0) - t0) / DAY); if (k >= 0 && k < 30) req[k]++;
      if (o.status === 'aprobado') { var k2 = Math.floor(((o.decidedAt || o.createdAt || 0) - t0) / DAY); if (k2 >= 0 && k2 < 30) pub[k2]++; }
    });
    var max = Math.max(4, Math.max.apply(null, req.concat(pub))), W = 640, H = 220, L = 34, R = 10, T = 12, Bt = 26, pw = W - L - R, ph = H - T - Bt;
    function pt(arr) { return arr.map(function (v, j) { return (L + pw * j / 29).toFixed(1) + ',' + (T + ph - ph * v / max).toFixed(1); }).join(' '); }
    var g = '', step = Math.ceil(max / 4);
    for (i = 0; i <= max; i += step) { var y = (T + ph - ph * i / max).toFixed(1); g += '<line x1="' + L + '" x2="' + (W - R) + '" y1="' + y + '" y2="' + y + '" class="gr"/><text x="' + (L - 6) + '" y="' + (Number(y) + 4) + '" text-anchor="end" class="ax">' + i + '</text>'; }
    [0, 7, 14, 21, 29].forEach(function (j) { var d = new Date(t0 + j * DAY); g += '<text x="' + (L + pw * j / 29).toFixed(1) + '" y="' + (H - 6) + '" text-anchor="middle" class="ax">' + d.getDate() + '/' + (d.getMonth() + 1) + '</text>'; });
    return '<svg viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="Solicitudes y publicaciones de los últimos 30 días" preserveAspectRatio="none">' + g +
      '<polyline points="' + pt(req) + '" class="ln a"/><polyline points="' + pt(pub) + '" class="ln b"/></svg>';
  }
  function donut(parts) {
    var tot = parts.reduce(function (t, p) { return t + p[1]; }, 0), r = 52, cf = 2 * Math.PI * r, off = 0, s = '<circle cx="70" cy="70" r="' + r + '" class="dn-bg"/>';
    if (tot) parts.forEach(function (p) { if (!p[1]) return; var len = cf * p[1] / tot; s += '<circle cx="70" cy="70" r="' + r + '" class="dn" stroke="' + p[2] + '" stroke-dasharray="' + len.toFixed(1) + ' ' + (cf - len).toFixed(1) + '" stroke-dashoffset="' + (-off).toFixed(1) + '"/>'; off += len; });
    return '<svg viewBox="0 0 140 140" role="img" aria-label="Estado de los anuncios" class="dn-svg">' + s + '<text x="70" y="68" text-anchor="middle" class="dn-n">' + tot + '</text><text x="70" y="86" text-anchor="middle" class="dn-l">Anuncios</text></svg>';
  }
  function panel(title, cls) { var p = el('div', 'dpanel' + (cls ? ' ' + cls : '')); p.appendChild(el('h3', '', title)); return p; }

  function renderShell(review, toPay, active, soon, income, views, clicks) {
    wireShell();
    var orders = state.orders, ads = state.myAds, money = PB.money, u = state.user || {};
    var reps = (state.reports || []).filter(function (r) { return r.status === 'nuevo'; });
    var reqs = (state.notices || []).filter(function (n) { return n.dir === 'admin' && n.status === 'nuevo' && n.archivedAdmin !== true; });
    var reported = toPay.filter(function (o) { return o.status === 'pago_reportado'; });
    var ctReqN = orders.filter(function (o) { return o.contractStatus === 'solicitado'; }).length;
    badges = { solicitudes: review.length + reported.length, bandeja: reqs.length, reportes: reps.length, contratos: ctReqN };
    var name = u.name || 'Administrador', first = name.split(' ')[0];
    $('admHello').textContent = '¡Hola, ' + (u.name ? first : 'Administrador') + '!';
    $('admName').textContent = name; $('admMail').textContent = u.email || ''; $('admAv').textContent = (name[0] || 'A').toUpperCase();

    // Menú
    var nav = $('admNav'); nav.textContent = '';
    SECS.forEach(function (x) {
      var b = el('button', 'adm-it' + (x[0] === admSec ? ' on' : '')); b.type = 'button'; b.setAttribute('data-sec', x[0]);
      b.appendChild(PB.ic(x[2])); b.appendChild(el('span', '', x[1]));
      if (badges[x[0]]) b.appendChild(el('em', 'adm-bd', String(badges[x[0]])));
      b.addEventListener('click', function () { PB.admGo(x[0]); }); nav.appendChild(b);
    });

    // Campana
    var total = badges.solicitudes + badges.bandeja + badges.reportes + badges.contratos + soon.length;
    var dot = $('admBellN'); dot.hidden = !total; dot.textContent = String(total);
    var bm = $('admBellMenu'); bm.textContent = '';
    var items = [['solicitudes', review.length, 'solicitudes por revisar'], ['solicitudes', reported.length, 'pagos por confirmar'], ['bandeja', reqs.length, 'cambios pedidos por clientes'], ['reportes', reps.length, 'reportes nuevos'], ['contratos', ctReqN, 'contratos por enviar'], ['anuncios', soon.length, 'anuncios por vencer']].filter(function (x) { return x[1]; });
    if (!items.length) bm.appendChild(el('p', 'fine', 'Todo al día. No hay pendientes.'));
    items.forEach(function (x) { var b = el('button', '', x[1] + ' ' + x[2]); b.type = 'button'; b.addEventListener('click', function () { PB.admGo(x[0]); }); bm.appendChild(b); });

    // Dashboard
    var d = $('dash'); d.textContent = '';
    var freeN = orders.filter(function (o) { return o.status === 'aprobado' && o.tier && !o.renewOf && !(o.amount > 0); }).length;
    var cards = [
      ['megaphone', 'Anuncios activos', String(active.length), soon.length + ' vencen en 7 días', 'anuncios', 'c1'],
      ['inbox', 'Por revisar', String(review.length), toPay.length + ' esperando pago', 'solicitudes', 'c2'],
      ['cart', 'Cobrado', money(income), freeN + ' publicados gratis (lanzamiento)', 'pedidos', 'c3'],
      ['eye', 'Visitas', String(views), clicks + ' clics de contacto', 'informes', 'c4']];
    var row = el('div', 'dcards');
    cards.forEach(function (c) {
      var b = el('button', 'dcard ' + c[5]); b.type = 'button';
      var ic = el('span', 'dc-ic'); ic.appendChild(PB.ic(c[0])); b.appendChild(ic);
      var tx = el('span', 'dc-tx'); tx.appendChild(el('small', '', c[1])); tx.appendChild(el('b', '', c[2])); tx.appendChild(el('em', '', c[3])); b.appendChild(tx);
      b.addEventListener('click', function () { PB.admGo(c[4]); }); row.appendChild(b);
    });
    d.appendChild(row);

    var mid = el('div', 'dgrid2');
    var p1 = panel('Solicitudes y publicaciones · 30 días', 'wide');
    var lg = el('div', 'legend'); lg.innerHTML = '<span><i class="a"></i>Solicitudes</span><span><i class="b"></i>Publicadas</span>'; p1.appendChild(lg);
    var cw = el('div', 'chart'); cw.innerHTML = chart(orders); p1.appendChild(cw); mid.appendChild(p1);
    var p2 = panel('Estado de anuncios');
    var cnt = { activo: 0, porvencer: 0, pausado: 0, vencido: 0 };
    ads.forEach(function (a) { var k = PB.adStatus(a).k; if (k === 'borrador') k = 'pausado'; if (cnt[k] != null) cnt[k]++; });
    var parts = [['Activos', cnt.activo, '#22C55E'], ['Por vencer', cnt.porvencer, '#FFD21F'], ['Pausados', cnt.pausado, '#8B5CF6'], ['Vencidos', cnt.vencido, '#EF4444']];
    var dw = el('div', 'donutw'); var dd = el('div', 'dn-box'); dd.innerHTML = donut(parts); dw.appendChild(dd);
    var dl = el('ul', 'dn-leg'); parts.forEach(function (p) { var li = el('li'); li.innerHTML = '<i style="background:' + p[2] + '"></i>'; li.appendChild(el('span', '', p[0])); li.appendChild(el('b', '', String(p[1]))); dl.appendChild(li); });
    dw.appendChild(dl); p2.appendChild(dw); mid.appendChild(p2);
    d.appendChild(mid);

    var low = el('div', 'dgrid3');
    var p3 = panel('Últimas ventas', 'wide3');
    var sold = orders.filter(function (o) { return o.status === 'aprobado'; }).sort(function (a, b) { return (b.decidedAt || b.createdAt || 0) - (a.decidedAt || a.createdAt || 0); }).slice(0, 5);
    if (!sold.length) p3.appendChild(el('p', 'fine', 'Aún no hay ventas publicadas.'));
    else {
      var tb = el('table', 'dtable'); var th = el('tr'); ['Ref.', 'Negocio', 'Plan', 'Valor', 'Estado'].forEach(function (x) { th.appendChild(el('th', '', x)); }); tb.appendChild(th);
      sold.forEach(function (o) { var tr = el('tr'); [PB.ref(o), PB.clip(o.brand || o.userEmail || '—', 22), o.tier ? PB.tierLabel(o.tier) : 'Diseño', o.amount > 0 ? money(o.amount) : 'Gratis'].forEach(function (x) { tr.appendChild(el('td', '', x)); }); var td = el('td'); td.appendChild(el('span', 'okchip', 'Publicado')); tr.appendChild(td); tb.appendChild(tr); });
      var sw = el('div', 'tscroll'); sw.appendChild(tb); p3.appendChild(sw);
    }
    low.appendChild(p3);
    var p4 = panel('Planes más usados');
    var tc = {}, tt = 0;
    orders.forEach(function (o) { if (o.tier && ['aprobado', 'por_pagar', 'pago_reportado'].indexOf(o.status) >= 0) { tc[o.tier] = (tc[o.tier] || 0) + 1; tt++; } });
    var ks = Object.keys(tc).sort(function (a, b) { return tc[b] - tc[a]; }).slice(0, 4);
    if (!ks.length) p4.appendChild(el('p', 'fine', 'Aún no hay datos.'));
    ks.forEach(function (k) { var pc = Math.round(100 * tc[k] / tt), r = el('div', 'bar'); r.appendChild(el('div', 'bar-t', '')); r.firstChild.appendChild(el('span', '', PB.tierLabel(k))); r.firstChild.appendChild(el('b', '', pc + '%')); var tr = el('div', 'bar-b'), f = el('i'); f.style.width = pc + '%'; tr.appendChild(f); r.appendChild(tr); p4.appendChild(r); });
    low.appendChild(p4);
    var p5 = panel('Actividad reciente');
    var ev = [];
    orders.forEach(function (o) {
      var nm = PB.clip(o.brand || o.userEmail || 'cliente', 24);
      ev.push([o.createdAt || 0, 'Nueva solicitud: ' + nm]);
      if (o.status === 'aprobado') ev.push([o.decidedAt || o.createdAt || 0, 'Publicado: ' + nm]);
      if (o.status === 'rechazado') ev.push([o.decidedAt || o.createdAt || 0, 'Rechazada: ' + nm]);
    });
    (state.reports || []).forEach(function (r) { ev.push([r.createdAt || 0, 'Reporte: ' + PB.clip(r.brand || 'anuncio', 24)]); });
    (state.notices || []).forEach(function (n) { if (n.dir === 'admin') ev.push([n.at || 0, PB.clip(n.subject || 'Solicitud de cliente', 40)]); });
    ev.sort(function (a, b) { return b[0] - a[0]; });
    if (!ev.length) p5.appendChild(el('p', 'fine', 'Todavía no hay actividad.'));
    var ul = el('ul', 'act'); ev.slice(0, 6).forEach(function (e) { var li = el('li'); li.appendChild(el('span', '', e[1])); li.appendChild(el('small', '', ago(e[0]))); ul.appendChild(li); });
    if (ev.length) p5.appendChild(ul);
    low.appendChild(p5); d.appendChild(low);

    var ban = el('div', 'dbanner');
    var bt = el('div', 'bn-t');
    if (PB.launchOn()) { bt.appendChild(el('b', '', 'Publicidad GRATIS')); bt.appendChild(el('span', '', 'Hasta el ' + C.launchUntilLabel(state.config))); }
    else { bt.appendChild(el('b', '', 'Ofertas Bogotá')); bt.appendChild(el('span', '', 'Bogotá y la Sabana')); }
    ban.appendChild(bt); ban.appendChild(el('span', 'bn-url', 'www.ofertasbogota.lat')); d.appendChild(ban);

    showSec();
  }


  function renderContracts(orders) {
    var el2 = el;
    function card(o, mode) {
      var c = el2('div', 'card'), top = el2('div', 'crow');
      top.appendChild(el2('h3', '', C.contractNo(o) + ' · ' + PB.clip(o.brand || o.userEmail || '', 40)));
      top.appendChild(el2('span', 'meta', mode === 'enviado' ? 'Enviado ' + PB.fmtDate(o.contractSentAt || 0) : (o.contractRequestedAt ? 'Solicitado ' + PB.fmtDateTime(o.contractRequestedAt) : 'Sin solicitar')));
      c.appendChild(top);
      c.appendChild(el2('p', 'meta', 'Cuenta: ' + PB.clip(o.userEmail || '', 80) + ' · ' + PB.orderTitle(o) + ' · ' + PB.money(o.amount)));
      var d = PB.contractData(o), lg = null, dc = null;
      if (mode !== 'enviado') {
        var g = el2('div', 'grid4');
        [['Nombre legal / razón social', d.legalName, 80], ['Cédula o NIT', d.docId, 20]].forEach(function (f, i) {
          var w = el2('div', 'fld'), lb = el2('label', '', f[0]), inp = document.createElement('input'); inp.type = 'text'; inp.maxLength = f[2]; inp.value = f[1] || ''; inp.id = 'ct-' + i + '-' + o.id; lb.htmlFor = inp.id; w.appendChild(lb); w.appendChild(inp); g.appendChild(w); if (i) dc = inp; else lg = inp;
        });
        c.appendChild(g);
        if (!d.legalName || !d.docId) c.appendChild(el2('p', 'offwhy', 'Faltan datos legales. Complétalos antes de enviar.'));
      }
      var acts = el2('div', 'acts'); acts.appendChild(PB.contractLink(o, 'btn sm ghost'));
      var send = el2('button', 'btn sm yellow', mode === 'enviado' ? 'Reenviar aviso' : 'Enviar al cliente'); send.type = 'button';
      send.addEventListener('click', function () {
        adminDo(function () { return B.sendContract(o, lg ? { legalName: lg.value.trim(), docId: dc.value.trim() } : null); }, 'Contrato enviado. El cliente ya lo ve en su panel.');
      });
      acts.appendChild(send); c.appendChild(acts); return c;
    }
    var elig = orders.filter(function (o) { return PB.canContract(o); });
    var req = elig.filter(function (o) { return o.contractStatus === 'solicitado'; }).sort(function (a, b) { return (a.contractRequestedAt || 0) - (b.contractRequestedAt || 0); });
    var none = elig.filter(function (o) { return !o.contractStatus; });
    var sent = elig.filter(function (o) { return o.contractStatus === 'enviado'; }).sort(function (a, b) { return (b.contractSentAt || 0) - (a.contractSentAt || 0); });
    $('ctHead').textContent = 'Contratos' + (req.length ? ' (' + req.length + ' por enviar)' : '');
    [['ctReq', req, 'solicitado', 'No hay contratos solicitados.'], ['ctNone', none, 'ninguno', 'Todo lo aprobado ya fue solicitado o enviado.'], ['ctSent', sent, 'enviado', 'Aún no has enviado contratos.']].forEach(function (x) {
      var box = $(x[0]); box.textContent = ''; if (!x[1].length) box.appendChild(el('p', 'fine', x[3])); x[1].slice(0, 30).forEach(function (o) { box.appendChild(card(o, x[2])); });
    });
  }

  PB.renderAdmin = function () {
    var ok = PB.isAdmin();
    $('adminDenied').hidden = ok; $('adminBody').hidden = !ok;
    if (!ok) return;
    var now = Date.now(), orders = state.orders, ads = state.myAds, money = PB.money;
    var review = orders.filter(function (o) { return o.status === 'revision'; });
    var toPay = orders.filter(function (o) { return o.status === 'por_pagar' || o.status === 'pago_reportado'; });
    var active = ads.filter(PB.visible);
    var soon = ads.filter(function (a) { return PB.visible(a) && PB.daysLeft(a) <= 7; });
    var income = orders.filter(function (o) { return o.status === 'aprobado'; }).reduce(function (t, o) { return t + (o.amount || 0); }, 0);
    var views = ads.reduce(function (t, a) { return t + (a.views || 0); }, 0);
    var clicks = ads.reduce(function (t, a) { return t + (a.clicksWhatsapp || 0) + (a.clicksPhone || 0) + (a.clicksEmail || 0) + (a.clicksWeb || 0); }, 0);
    var promoUsed = orders.filter(function (o) { return o.promo === true && ['por_pagar', 'pago_reportado', 'aprobado'].indexOf(o.status) >= 0; }).length;
    renderShell(review, toPay, active, soon, income, views, clicks);
    renderContracts(orders);

    // Reportes
    var rl2 = $('reportList'); rl2.textContent = '';
    var reps = state.reports || [], newReps = reps.filter(function (r) { return r.status === 'nuevo'; });
    if (!newReps.length) rl2.appendChild(el('p', 'fine', reps.length ? 'No hay reportes nuevos.' : 'Todavía no hay reportes.'));
    newReps.forEach(function (r) {
      var c = el('div', 'card rep-card'), top = el('div', 'crow');
      top.appendChild(el('h3', '', PB.clip(r.brand || 'Anuncio', 40))); top.appendChild(el('span', 'meta', PB.fmtDateTime(r.createdAt))); c.appendChild(top);
      c.appendChild(el('p', '', r.reason));
      if (r.note) c.appendChild(el('p', 'fine', PB.clip(r.note, 300)));
      if (r.contact) c.appendChild(el('p', 'meta', 'Contacto de quien reporta: ' + PB.clip(r.contact, 60)));
      var ad = PB.findAd(r.adId), acts = el('div', 'acts');
      var vw = el('a', 'btn sm ghost', 'Ver anuncio'); vw.href = '#anuncio-' + r.adId; acts.appendChild(vw);
      if (ad && ad.active === true) { var off = el('button', 'btn sm danger', 'Retirar anuncio'); off.type = 'button'; off.addEventListener('click', function () { PB.askReason('Retirar "' + PB.clip(ad.brand, 30) + '"', 'El cliente recibirá este motivo.', function (why) { return B.deactivateAd(ad.id, why, ad).then(function () { return B.resolveReport(r.id, 'atendido'); }).then(function () { PB.setMsg($('admMsg'), 'Anuncio retirado y cliente avisado.', 'ok'); }); }); }); acts.appendChild(off); }
      var ds = el('button', 'btn sm ghost', 'Descartar reporte'); ds.type = 'button'; ds.addEventListener('click', function () { adminDo(function () { return B.resolveReport(r.id, 'descartado'); }, 'Reporte descartado.'); }); acts.appendChild(ds);
      c.appendChild(acts); rl2.appendChild(c);
    });
    // Bandeja: solicitudes de clientes
    var reqs = (state.notices || []).filter(function (n) { return n.dir === 'admin'; });
    var reqNew = reqs.filter(function (n) { return n.status === 'nuevo' && n.archivedAdmin !== true; });
    var reqOld = reqs.filter(function (n) { return !(n.status === 'nuevo' && n.archivedAdmin !== true); });
    $('inboxHead').textContent = 'Bandeja: solicitudes de clientes' + (reqNew.length ? ' (' + reqNew.length + ')' : '');
    function reqCard(n, done) {
      var ad = PB.findAd(n.adId), c = el('div', 'card' + (n.adminRead === false && !done ? ' nt-new' : '')), top = el('div', 'crow');
      top.appendChild(el('h3', '', n.subject)); top.appendChild(el('span', 'meta', PB.fmtDateTime(n.at))); c.appendChild(top);
      c.appendChild(el('p', 'meta', 'Cuenta: ' + PB.clip(n.userEmail || '', 80) + (ad ? ' · ' + PB.tierLabel(ad.tier) : ' · el anuncio ya no existe')));
      c.appendChild(el('p', '', n.text));
      if (n.newOffer) c.appendChild(el('p', 'fine', 'Nueva oferta: ' + n.newOffer + (ad && ad.offer ? ' (ahora: ' + ad.offer + ')' : '')));
      if (n.newText) c.appendChild(el('p', 'fine', 'Nuevo texto: ' + n.newText));
      var th = PB.thumbs({ media: n.media, media2: ad && n.media ? ad.media : null }, 'Imagen nueva propuesta', 'Imagen actual'); if (th) c.appendChild(th);
      if (done) { c.appendChild(el('p', 'meta', (n.status === 'atendido' ? 'Atendida' : n.status === 'rechazado' ? 'Rechazada' : 'Archivada') + (n.answer ? ' · ' + n.answer : ''))); return c; }
      var acts = el('div', 'acts');
      var yes = el('button', 'btn sm yellow', n.kind === 'baja' ? 'Desactivar el anuncio' : 'Aplicar el cambio'); yes.type = 'button'; yes.disabled = !ad;
      yes.addEventListener('click', function () { PB.modal(yes.textContent, 'Se aplica al anuncio y el cliente recibe tu aviso.', [{ id: 'c', label: 'Comentario para el cliente (opcional)', type: 'text', max: 200 }], 'Confirmar', function (v) { return B.answerChange(n, 'atendido', v.c, true, ad).then(function () { PB.setMsg($('admMsg'), 'Hecho y cliente avisado.', 'ok'); }); }); });
      var no = el('button', 'btn sm danger', 'Rechazar'); no.type = 'button';
      no.addEventListener('click', function () { PB.askReason('Rechazar la solicitud', 'El cliente verá tu respuesta.', function (why) { return B.answerChange(n, 'rechazado', why, false, ad).then(function () { PB.setMsg($('admMsg'), 'Solicitud rechazada y cliente avisado.', 'ok'); }); }); });
      acts.appendChild(yes); acts.appendChild(no);
      if (ad) { var vw = el('a', 'btn sm ghost', 'Ver ficha'); vw.href = '#anuncio-' + ad.id; acts.appendChild(vw); }
      c.appendChild(acts); return c;
    }
    var il = $('inboxList'); il.textContent = '';
    if (!reqNew.length) il.appendChild(el('p', 'fine', 'No hay solicitudes de clientes.'));
    reqNew.forEach(function (n) { il.appendChild(reqCard(n, false)); });

    // Por revisar
    var rl = $('reviewList'); rl.textContent = '';
    if (!review.length) rl.appendChild(el('p', 'fine', 'No hay solicitudes esperando revisión.'));
    var ctx = { orders: state.orders, ads: state.myAds, config: state.config };
    review.forEach(function (o) {
      var c = PB.simpleOrder(o, true);
      if (o.tier || o.renewOf) { var pv = el('div', 'apreview'); var tl = el('div', 'tile'); tl.appendChild(PB.poster(o, {})); pv.appendChild(tl); c.appendChild(pv); }
      if (o.tier) c.appendChild(el('p', 'meta', 'Duración: ' + C.durLabel(o.days || C.termDays) + ' · Medida del espacio: ' + C.sizeLabel(o.tier) + (o.designPieces ? ' (diseña la pieza con esta medida)' : '')));
      if (o.body) c.appendChild(el('p', 'fine', PB.clip(o.body, 300)));
      if (o.offer || o.hours) c.appendChild(el('p', 'meta', [o.offer && 'Oferta: ' + o.offer, o.hours && 'Horario: ' + o.hours].filter(Boolean).join(' · ')));
      c.appendChild(el('p', 'meta', [PB.adCats(o).join(', '), o.localidad, o.barrio, o.address].filter(Boolean).join(' · ')));
      c.appendChild(el('p', 'meta', 'Contacto: ' + [o.whatsapp && 'WhatsApp ' + o.whatsapp, o.phone && 'Tel ' + o.phone, o.mail, o.web].filter(Boolean).join(' · ')));
      if (o.designPieces) {
        c.appendChild(el('p', '', 'Diseño pedido (' + o.designPieces + (o.designPieces === 1 ? ' pieza' : ' piezas') + '): ' + PB.clip(o.designBrief, 400)));
        if (o.media && o.media.url && /^https:|^data:image\//.test(o.media.url)) { var rf = el('a', 'btn sm ghost', 'Ver archivo de referencia'); rf.href = o.media.url; rf.target = '_blank'; rf.rel = 'noopener noreferrer'; c.appendChild(rf); }
      }
      var q = C.quote(o, state.config, state.orders, state.myAds, now);
      if (q.ok) c.appendChild(el('p', 'quote', q.amount === 0 ? 'Si la aceptas se publica gratis (lanzamiento).' : 'Si la aceptas, se le cobran ' + money(q.amount) + (q.promo ? ' (espacio gratis por el lanzamiento)' : '') + '.'));
      else c.appendChild(el('p', 'msg err', q.error));
      var f = el('div', 'fld'), lb = el('label', '', 'Motivo si la rechazas (opcional)'), inp = el('input');
      inp.type = 'text'; inp.maxLength = 120; inp.id = 'why-' + o.id; lb.htmlFor = inp.id; f.appendChild(lb); f.appendChild(inp); c.appendChild(f);
      var acts = el('div', 'acts');
      var yes = el('button', 'btn sm yellow', q.ok && q.amount === 0 ? 'Aceptar y publicar' : 'Aceptar'); yes.type = 'button'; yes.disabled = !q.ok;
      yes.addEventListener('click', function () {
        adminDo(function () { return B.acceptOrder(o, ctx); }, function (r) {
          if (r && r.free) return r.draft ? 'Aceptada. Quedó como borrador: sube la pieza diseñada en "Editar" y publícala.' : 'Aceptada y publicada.';
          return 'Aceptada. Le mostramos cómo pagar; cuando pague, confírmalo en "Esperando pago".';
        });
      });
      var no = el('button', 'btn sm danger', 'Rechazar'); no.type = 'button';
      no.addEventListener('click', function () { adminDo(function () { return B.rejectOrder(o.id, inp.value.trim(), o); }, 'Rechazada. No se cobró nada.'); });
      acts.appendChild(yes); acts.appendChild(no); c.appendChild(acts); rl.appendChild(c);
    });

    // Esperando pago
    var pl = $('payList'); pl.textContent = '';
    if (!toPay.length) pl.appendChild(el('p', 'fine', 'Nada esperando pago.'));
    toPay.sort(function (a, b) { return (a.status === 'pago_reportado' ? 0 : 1) - (b.status === 'pago_reportado' ? 0 : 1); }).forEach(function (o) {
      var c = PB.simpleOrder(o, true);
      c.appendChild(el('p', 'meta', 'Referencia ' + PB.ref(o) + (o.status === 'pago_reportado' ? ' · el anunciante avisó que ya pagó: revisa tu Nequi' : ' · todavía no avisa el pago')));
      var acts = el('div', 'acts');
      var okb = el('button', 'btn sm yellow', 'Confirmar pago y publicar'); okb.type = 'button';
      okb.addEventListener('click', function () {
        adminDo(function () { return B.confirmPaid(o, ctx); }, function (r) {
          if (o.renewOf) return 'Pago confirmado. Renovado por ' + C.durLabel(o.days || C.termDays) + '.';
          if (!o.tier) return 'Pago confirmado. Entrega el diseño.';
          return r && r.draft ? 'Pago confirmado. Quedó como borrador: sube la pieza diseñada en "Editar" y publícala.' : 'Pago confirmado. El anuncio ya está publicado.';
        });
      });
      var no = el('button', 'btn sm danger', 'Cancelar pedido'); no.type = 'button';
      no.addEventListener('click', function () { adminDo(function () { return B.rejectOrder(o.id, 'No se completó el pago', o); }, 'Pedido cancelado.'); });
      acts.appendChild(okb); acts.appendChild(no);
      if (o.whatsapp) { var wa = el('a', 'btn sm ghost', 'Escribirle por WhatsApp'); wa.href = PB.waLink(PB.waNum(o.whatsapp), 'Hola, sobre tu anuncio en ' + C.brand + ' (referencia ' + PB.ref(o) + ').'); wa.target = '_blank'; wa.rel = 'noopener noreferrer'; acts.appendChild(wa); }
      c.appendChild(acts); pl.appendChild(c);
    });

    // Anuncios
    var af = $('adFilters'); af.textContent = '';
    [['todos', 'Todos'], ['activo', 'Activos'], ['porvencer', 'Por vencer'], ['vencido', 'Vencidos'], ['borrador', 'Borradores']].forEach(function (x) {
      var b = el('button', 'chip', x[1]); b.type = 'button'; b.setAttribute('aria-pressed', adFilter === x[0] ? 'true' : 'false');
      b.addEventListener('click', function () { adFilter = x[0]; PB.renderAdmin(); }); af.appendChild(b);
    });
    var al = $('adList'); al.textContent = '';
    var shownAds = ads.filter(function (a) { return !adArch(a); }).filter(function (a) { return adFilter === 'todos' || PB.adStatus(a).k === adFilter; }).sort(function (a, b) { return (a.endsAt || 9e15) - (b.endsAt || 9e15); });
    if (!shownAds.length) al.appendChild(el('p', 'fine', 'No hay anuncios en esta vista.'));
    function adCard(ad, archived) {
      var s = PB.adStatus(ad), c = el('div', 'card'), top = el('div', 'crow');
      top.appendChild(el('h3', '', PB.clip(ad.brand, 30) + ' · ' + PB.tierLabel(ad.tier)));
      top.appendChild(el('span', 'chipst st-' + s.k, s.t)); c.appendChild(top);
      c.appendChild(el('p', 'meta', [PB.adCats(ad).join(', '), ad.localidad, ad.barrio].filter(Boolean).join(' · ')));
      c.appendChild(el('p', 'meta', (ad.startsAt ? 'Desde ' + PB.fmtDate(ad.startsAt) : 'Sin publicar') + (ad.endsAt ? ' · vence ' + PB.fmtDate(ad.endsAt) : '')));
      c.appendChild(PB.statsLine(ad));
      var acts = el('div', 'acts');
      var ed = el('button', 'btn sm navy', 'Editar'); ed.type = 'button'; ed.addEventListener('click', function () { openEditor(ad); }); acts.appendChild(ed);
      var tg = el('button', 'btn sm ghost', ad.active === true ? 'Desactivar' : 'Activar'); tg.type = 'button';
      tg.addEventListener('click', function () {
        if (ad.active === true) PB.askReason('Desactivar "' + PB.clip(ad.brand, 30) + '"', 'El cliente recibirá este motivo en su bandeja.', function (why) { return B.deactivateAd(ad.id, why, ad).then(function () { PB.setMsg($('admMsg'), 'Anuncio desactivado y cliente avisado.', 'ok'); }); });
        else adminDo(function () { return B.setAdActive(ad.id, true, ad); }, 'Anuncio activado.');
      }); acts.appendChild(tg);
      var rn = el('button', 'btn sm ghost', 'Renovar ' + C.termDays + ' días'); rn.type = 'button';
      rn.addEventListener('click', function () { adminDo(function () { return B.renewAd(ad.id, ad); }, 'Renovado por ' + C.termDays + ' días.'); }); acts.appendChild(rn);
      var vw = el('a', 'btn sm ghost', 'Ver ficha'); vw.href = '#anuncio-' + ad.id; acts.appendChild(vw);
      acts.appendChild(PB.reportLink(ad));
      var num = PB.normPhone(ad.whatsapp) || PB.normPhone(ad.phone);
      if (num && (s.k === 'porvencer' || s.k === 'vencido')) {
        var rm = el('a', 'btn sm ghost', 'Recordar por WhatsApp');
        rm.href = PB.waLink(num, 'Hola, tu anuncio "' + PB.clip(ad.headline || ad.brand, 48) + '" en ' + C.brand + (s.k === 'vencido' ? ' ya venció.' : ' vence el ' + PB.fmtDate(ad.endsAt) + '.') + ' ¿Quieres renovarlo?');
        rm.target = '_blank'; rm.rel = 'noopener noreferrer'; acts.appendChild(rm);
      }
      acts.appendChild(archived ? archBtn('ad', ad, false, 'Restaurar') : archBtn('ad', ad, true, 'Archivar'));
      var th = PB.thumbs(ad, 'Imagen del anuncio', 'Banner superior'); if (th) c.appendChild(th);
      c.appendChild(acts); return c;
    }
    shownAds.forEach(function (ad) { al.appendChild(adCard(ad, false)); });

    // Pedidos
    var fl = $('orderFilters'); fl.textContent = '';
    [['todos', 'Todos'], ['revision', 'Por revisar'], ['por_pagar', 'Por pagar'], ['pago_reportado', 'Pago avisado'], ['aprobado', 'Publicados']].forEach(function (x) {
      var b = el('button', 'chip', x[1]); b.type = 'button'; b.setAttribute('aria-pressed', orderFilter === x[0] ? 'true' : 'false');
      b.addEventListener('click', function () { orderFilter = x[0]; PB.renderAdmin(); }); fl.appendChild(b);
    });
    var ol = $('orderList'); ol.textContent = '';
    var shown = orders.filter(function (o) { return !ordArch(o); }).filter(function (o) { return orderFilter === 'todos' || o.status === orderFilter; });
    if (!shown.length) ol.appendChild(el('p', 'fine', 'No hay pedidos en esta vista.'));
    function ordCard(o, archived) {
      var c = PB.simpleOrder(o, true);
      if (o.rejectReason) c.appendChild(el('p', 'meta', 'Motivo: ' + PB.clip(o.rejectReason, 200)));
      if (archived ? o.archived === true : o.status === 'aprobado') {
        var a = el('div', 'acts'); a.appendChild(archived ? archBtn('order', o, false, 'Restaurar') : archBtn('order', o, true, 'Archivar')); c.appendChild(a);
      }
      return c;
    }
    shown.forEach(function (o) { ol.appendChild(ordCard(o, false)); });

    // Archivo
    var aa = ads.filter(adArch), ao = orders.filter(ordArch);
    $('archSum').textContent = 'Archivo (' + (aa.length + ao.length + reqOld.length) + ')';
    var arI = $('archInbox'); arI.textContent = ''; if (!reqOld.length) arI.appendChild(el('p', 'fine', 'Nada archivado.')); reqOld.forEach(function (n) { arI.appendChild(reqCard(n, true)); });
    var arA = $('archAds'), arO = $('archOrders'); arA.textContent = ''; arO.textContent = '';
    if (!aa.length) arA.appendChild(el('p', 'fine', 'Nada archivado.'));
    aa.forEach(function (ad) {
      var c = adCard(ad, true);
      arA.appendChild(c);
    });
    if (!ao.length) arO.appendChild(el('p', 'fine', 'Nada archivado.'));
    ao.forEach(function (o) { arO.appendChild(ordCard(o, true)); });

    renderDb();
    if (!cfgFilled) { cfgFilled = true; fillConfig(); }
  };

  // ---------- Base de datos de clientes ----------
  function haystack(o) {
    return PB.norm([C.contractNo(o), PB.ref(o), o.id, o.brand, o.legalName, o.docId, o.phone, o.whatsapp, o.mail, o.userEmail, o.headline, o.localidad, o.barrio].join(' ').replace(/[.\s-]+/g, ' '));
  }
  function kv(box, k, v) { if (!v && v !== 0) return; var r = el('div', 'kv'); r.appendChild(el('b', '', k)); r.appendChild(el('span', '', String(v))); box.appendChild(r); }
  function renderDb() {
    var q = PB.norm($('db-q').value.replace(/[.\s-]+/g, ' ')).trim(), box = $('db-res'); box.textContent = '';
    var list = state.orders.slice().sort(function (a, b) { return b.createdAt - a.createdAt; });
    if (q) { var words = q.split(' '); list = list.filter(function (o) { var h = haystack(o); return words.every(function (w) { return h.indexOf(w) >= 0; }); }); }
    else list = list.slice(0, 10);
    $('db-count').textContent = q ? list.length + ' resultado' + (list.length === 1 ? '' : 's') : state.orders.length + ' pedidos en total';
    if (!list.length) box.appendChild(el('p', 'fine', 'No se encontró nada con esa búsqueda.'));
    list.slice(0, 30).forEach(function (o) {
      var d = PB.contractData(o), ad = d.ad, c = el('div', 'card dbrow'), top = el('div', 'crow');
      top.appendChild(el('h3', '', C.contractNo(o) + ' · ' + PB.clip(o.brand, 40)));
      top.appendChild(el('span', 'chipst st-' + o.status, PB.STATUS[o.status] || o.status)); c.appendChild(top);
      kv(c, 'Cliente', d.legalName); kv(c, 'Cédula / NIT', d.docId); kv(c, 'Cuenta', o.userEmail);
      kv(c, 'WhatsApp', o.whatsapp); kv(c, 'Teléfono', o.phone); kv(c, 'Correo', o.mail); kv(c, 'Web', o.web);
      kv(c, 'Plan', o.tier ? PB.orderTitle(o) : 'Solo diseño'); kv(c, 'Duración', o.tier ? C.durLabel(o.days || C.termDays) : '');
      kv(c, 'Valor', PB.money(o.amount) + ' · ' + PB.payLabel(o)); kv(c, 'Referencia', PB.ref(o));
      kv(c, 'Solicitud', PB.fmtDateTime(o.createdAt)); if (o.paidAt) kv(c, 'Pagado', PB.fmtDateTime(o.paidAt));
      kv(c, 'Ubicación', [o.address, o.barrio, o.localidad].filter(Boolean).join(' · ')); kv(c, 'Categorías', PB.adCats(o).join(', '));
      if (ad) { var s = PB.adStatus(ad); kv(c, 'Anuncio', s.t + (ad.endsAt ? ' · vence ' + PB.fmtDate(ad.endsAt) : '')); kv(c, 'Visitas / clics', (ad.views || 0) + ' / ' + ((ad.clicksWhatsapp || 0) + (ad.clicksPhone || 0) + (ad.clicksEmail || 0) + (ad.clicksWeb || 0))); }
      var acts = el('div', 'acts'); acts.appendChild(PB.contractLink(o));
      if (ad) { var vw = el('a', 'btn sm ghost', 'Ver ficha'); vw.href = '#anuncio-' + ad.id; acts.appendChild(vw); }
      var num = PB.normPhone(o.whatsapp) || PB.normPhone(o.phone);
      if (num) { var wa = el('a', 'btn sm ghost', 'WhatsApp'); wa.href = PB.waLink(num, 'Hola, te escribimos de ' + C.brand + ' sobre tu contrato ' + C.contractNo(o) + '.'); wa.target = '_blank'; wa.rel = 'noopener noreferrer'; acts.appendChild(wa); }
      c.appendChild(acts); box.appendChild(c);
    });
  }
  function csv() {
    var rows = [['Contrato', 'Referencia', 'Estado', 'Negocio', 'Cliente', 'Cédula/NIT', 'Cuenta', 'WhatsApp', 'Teléfono', 'Correo', 'Plan', 'Días', 'Valor', 'Solicitud', 'Pagado']];
    state.orders.forEach(function (o) {
      var d = PB.contractData(o);
      rows.push([C.contractNo(o), PB.ref(o), PB.STATUS[o.status] || o.status, o.brand, d.legalName, d.docId, o.userEmail, o.whatsapp, o.phone, o.mail, o.tier ? PB.tierLabel(o.tier) : 'Diseño', o.days || '', o.amount || 0, new Date(o.createdAt).toISOString(), o.paidAt ? new Date(o.paidAt).toISOString() : '']);
    });
    var text = rows.map(function (r) { return r.map(function (x) { return '"' + String(x == null ? '' : x).replace(/"/g, '""') + '"'; }).join(','); }).join('\n');
    var a = document.createElement('a'); a.href = URL.createObjectURL(new Blob(['\ufeff' + text], { type: 'text/csv;charset=utf-8' }));
    a.download = 'clientes-ofertas-bogota.csv'; document.body.appendChild(a); a.click(); a.remove();
  }

  function fillConfig() {
    var c = PB.cfg();
    $('a-premium').value = c.prices.premium; $('a-destacado').value = c.prices.destacado;
    $('a-mediano').value = c.prices.mediano; $('a-pequeno').value = c.prices.pequeno; $('a-design').value = c.designPrice;
    $('a-capp').value = c.caps.premium; $('a-capd').value = c.caps.destacado;
    $('a-lenabled').checked = c.launch.enabled; $('a-luntil').value = c.launch.until || '';
    var nb = $('noteBox'); nb.textContent = '';
    for (var i = 0; i < 3; i++) {
      var n = c.notes[i] || { enabled: false, title: '', text: '', link: '', until: '' }, g = el('div', 'card notebox');
      g.appendChild(el('h3', '', 'Mensaje ' + (i + 1)));
      var ck = el('label', 'check'); var cb = document.createElement('input'); cb.type = 'checkbox'; cb.id = 'n-on' + i; cb.checked = n.enabled; ck.appendChild(cb); ck.appendChild(el('span', '', 'Mostrar este mensaje')); g.appendChild(ck);
      [['n-t', 'Título (ej. Renueva con 10% menos)', n.title, 60, 'text'], ['n-x', 'Texto corto', n.text, 140, 'text'], ['n-l', 'Enlace (opcional, debe empezar por https://)', n.link, 200, 'text'], ['n-u', 'Mostrar hasta (opcional)', n.until, 10, 'date']].forEach(function (f) {
        var w = el('div', 'fld'), lb = el('label', '', f[1]), inp = document.createElement('input'); inp.type = f[4]; inp.id = f[0] + i; inp.value = f[2] || ''; if (f[3] && f[4] === 'text') inp.maxLength = f[3]; lb.htmlFor = inp.id; w.appendChild(lb); w.appendChild(inp); g.appendChild(w);
      });
      nb.appendChild(g);
    }
    fillFooterCfg();
  }

  function fInput(parent, id, label, val, max, area) {
    var w = el('div', 'fld'), lb = el('label', '', label), inp = document.createElement(area ? 'textarea' : 'input');
    if (area) inp.rows = 4; else inp.type = 'text';
    inp.id = id; inp.value = val || ''; if (max) inp.maxLength = max; lb.htmlFor = id; w.appendChild(lb); w.appendChild(inp); parent.appendChild(w); return inp;
  }
  function fillFooterCfg() {
    var c = PB.cfg(), f = c.footer, box = $('footBox'); box.textContent = '';
    function card(t) { var g = el('div', 'card notebox'); g.appendChild(el('h3', '', t)); box.appendChild(g); return g; }
    var g = card('Frases bajo el logo');
    fInput(g, 'f-tag', 'Frase principal', f.tagline, 160); fInput(g, 'f-tag2', 'Frase destacada (sale resaltada)', f.tagline2, 160);
    g = card('Redes sociales (enlace completo)');
    PB.FOOT_SOCIAL.forEach(function (s) { fInput(g, 'f-s-' + s[0], s[1], f.social[s[0]], 300); });
    g = card('Correos corporativos');
    PB.FOOT_MAILS.forEach(function (m) { fInput(g, 'f-m-' + m[0], m[1], f.emails[m[0]], 80); });
    g = card('Invitación a comerciantes');
    fInput(g, 'f-c-t', 'Título', f.cta.title, 60); fInput(g, 'f-c-x', 'Texto', f.cta.text, 140); fInput(g, 'f-c-b', 'Texto del botón', f.cta.button, 40);
    g = card('Las 4 insignias');
    f.badges.forEach(function (b, i) { fInput(g, 'f-b-t' + i, 'Insignia ' + (i + 1) + ': título', b.title, 40); fInput(g, 'f-b-x' + i, 'Insignia ' + (i + 1) + ': texto', b.text, 70); });
    g = card('Documentos de interés (barra inferior)');
    g.appendChild(el('p', 'fine', 'En "Enlace" puedes dejar el que viene (#terminos, etc.) o pegar un https:// si prefieres otro documento. Sin nombre no se muestra.'));
    f.docs.forEach(function (d, i) { fInput(g, 'f-d-l' + i, 'Documento ' + (i + 1) + ': nombre', d.label, 50); fInput(g, 'f-d-u' + i, 'Documento ' + (i + 1) + ': enlace', d.url, 300); });
    var lb = $('legalBox'); lb.textContent = '';
    var g2 = el('div', 'card notebox'); lb.appendChild(g2);
    ((window.PB_LEGAL_DOCS || {}).fields || []).forEach(function (x) {
      fInput(g2, 'l-' + x.k, x.label + (x.opt ? '' : ''), c.legalVals[x.k] || '', x.k === 'inventario_cookies' ? 3000 : 400, x.k === 'inventario_cookies' || x.k === 'nota_radicacion' || x.k === 'nota_inventario' || x.k === 'nota_compromiso');
      $('l-' + x.k).placeholder = PB.legalValue(x.k) || (x.opt ? 'Opcional' : 'Pendiente');
    });
  }
  function readFooterCfg() {
    var v = function (id) { return $(id).value.trim(); }, social = {}, emails = {}, legalVals = {}, bad = '';
    PB.FOOT_SOCIAL.forEach(function (s) { var u = v('f-s-' + s[0]); if (u && !/^https:\/\//.test(u)) bad = 'El enlace de ' + s[1] + ' debe empezar por https://'; social[s[0]] = u; });
    PB.FOOT_MAILS.forEach(function (m) { var u = v('f-m-' + m[0]); if (u && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(u)) bad = 'El correo de ' + m[1] + ' no parece válido.'; emails[m[0]] = u; });
    var docs = [];
    for (var i = 0; i < 6; i++) { var u = v('f-d-u' + i); if (u && !/^(https:\/\/|#)/.test(u)) bad = 'El enlace del documento ' + (i + 1) + ' debe empezar por https:// o #'; docs.push({ label: v('f-d-l' + i), url: u }); }
    var badges = []; for (var j = 0; j < 4; j++) badges.push({ title: v('f-b-t' + j), text: v('f-b-x' + j) });
    ((window.PB_LEGAL_DOCS || {}).fields || []).forEach(function (x) { legalVals[x.k] = v('l-' + x.k); });
    return { bad: bad, footer: { tagline: v('f-tag'), tagline2: v('f-tag2'), social: social, emails: emails, cta: { title: v('f-c-t'), text: v('f-c-x'), button: v('f-c-b') }, badges: badges, docs: docs }, legalVals: legalVals };
  }

  // ---------- Editor ----------
  function dateInput(ms) { var d = new Date(ms), p = function (x) { return (x < 10 ? '0' : '') + x; }; return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate()); }
  function renderEditCats() {
    var box = $('ed-cats'); box.textContent = '';
    C.categorias.forEach(function (name) {
      var on = editCats.indexOf(name) >= 0, b = el('button', 'cp'); b.type = 'button';
      b.setAttribute('aria-pressed', on ? 'true' : 'false'); b.disabled = !on && editCats.length >= C.maxCats;
      b.appendChild(PB.ic(PB.catIcon(name))); b.appendChild(el('span', '', name));
      b.addEventListener('click', function () { var i = editCats.indexOf(name); if (i >= 0) editCats.splice(i, 1); else editCats.push(name); renderEditCats(); });
      box.appendChild(b);
    });
  }
  function openEditor(ad) {
    editing = ad || null; editFile = null; editFileTop = null; $('ed-file').value = ''; $('ed-file-top').value = '';
    $('edTopNow').textContent = ad && ad.media2 ? 'Ya tiene imagen de banner. Sube otra solo si quieres reemplazarla.' : '';
    $('edTitle').textContent = ad ? 'Editar anuncio' : 'Crear anuncio';
    PB.fillLocs($('ed-loc'), 'Elige…');
    PB.fillSelect($('ed-tier'), 'Elige…', PB.TIER_ORDER.map(function (t) { return [t, C.tiers[t].label]; }));
    PB.fillSelect($('ed-pal'), 'Elige…', C.palettes.map(function (p, i) { return [String(i), p.n]; }));
    var a = ad || { tier: 'pequeno', pal: 0, active: true, endsAt: Date.now() + C.termDays * PB.DAY };
    $('ed-brand').value = a.brand || ''; $('ed-head').value = a.headline || ''; $('ed-body').value = a.body || '';
    $('ed-offer').value = a.offer || ''; $('ed-hours').value = a.hours || '';
    editCats = ad ? PB.adCats(ad).slice() : []; renderEditCats();
    $('ed-loc').value = a.localidad || ''; $('ed-barrio').value = a.barrio || ''; $('ed-addr').value = a.address || '';
    $('ed-wa').value = a.whatsapp || ''; $('ed-phone').value = a.phone || ''; $('ed-email').value = a.mail || ''; $('ed-web').value = a.web || '';
    $('ed-tier').value = a.tier || 'pequeno'; $('ed-pal').value = String(a.pal || 0);
    $('ed-ends').value = dateInput(a.endsAt || Date.now() + C.termDays * PB.DAY);
    $('ed-active').checked = a.active === true || !ad;
    PB.setMsg($('edMsg'), '', ''); $('edProg').hidden = true;
    $('dlgEdit').showModal();
  }

  PB.initAdmin = function () {
    $('saveCfg').addEventListener('click', function () {
      var n = function (id) { return Math.round(Number($(id).value)); };
      var prices = { premium: n('a-premium'), destacado: n('a-destacado'), mediano: n('a-mediano'), pequeno: n('a-pequeno') };
      var design = n('a-design'), capd = n('a-capd'), capp = n('a-capp');
      var okPrices = Object.keys(prices).every(function (k) { return prices[k] >= 1500; }) && design >= 1500;
      if (!okPrices) { PB.setMsg($('admMsg'), 'Cada precio debe ser de al menos $1.500.', 'err'); return; }
      if (!(capd >= 1 && capp >= 1)) { PB.setMsg($('admMsg'), 'Revisa los cupos: deben ser números válidos.', 'err'); return; }
      var notes = [];
      for (var i = 0; i < 3; i++) {
        var lk = $('n-l' + i).value.trim();
        if (lk && !/^https:\/\//.test(lk)) { PB.setMsg($('admMsg'), 'El enlace del mensaje ' + (i + 1) + ' debe empezar por https://', 'err'); return; }
        notes.push({ enabled: $('n-on' + i).checked, title: $('n-t' + i).value.trim(), text: $('n-x' + i).value.trim(), link: lk, until: $('n-u' + i).value || '' });
      }
      var fc = readFooterCfg(); if (fc.bad) { PB.setMsg($('admMsg'), fc.bad, 'err'); return; }
      adminDo(function () {
        return B.saveConfig({ footer: fc.footer, legalVals: fc.legalVals, prices: prices, designPrice: design, caps: { premium: capp, destacado: capd }, launch: { enabled: $('a-lenabled').checked, until: $('a-luntil').value || '' }, notes: notes });
      }, 'Guardado. Los visitantes ya ven los valores nuevos.');
    });
    $('db-q').addEventListener('input', renderDb);
    $('db-csv').addEventListener('click', csv);
    $('newAd').addEventListener('click', function () { openEditor(null); });
    $('edCancel').addEventListener('click', function () { $('dlgEdit').close(); });
    $('ed-file-top').addEventListener('change', function (e) {
      var f = e.target.files && e.target.files[0];
      if (f && !PB.checkFile(f, $('edMsg'))) { e.target.value = ''; editFileTop = null; return; }
      editFileTop = f || null; PB.setMsg($('edMsg'), '', '');
    });
    $('ed-file').addEventListener('change', function (e) {
      var f = e.target.files && e.target.files[0];
      if (f && !PB.checkFile(f, $('edMsg'))) { e.target.value = ''; editFile = null; return; }
      editFile = f || null; PB.setMsg($('edMsg'), '', '');
    });
    $('editForm').addEventListener('submit', async function (e) {
      e.preventDefault();
      var m = $('edMsg');
      function bad(t) { PB.setMsg(m, t, 'err'); }
      var brand = $('ed-brand').value.trim(), head = $('ed-head').value.trim();
      var hasM = !!(editFile || (editing && editing.media));
      if (brand.length < 2 && !hasM) return bad('Escribe el nombre del negocio.');
      if (head.length < 3 && !hasM) return bad('Escribe un título de al menos 3 letras, o sube una imagen.');
      if (!editCats.length || !$('ed-loc').value) return bad('Elige al menos una categoría y la localidad.');
      var wa = PB.normPhone($('ed-wa').value), ph = PB.normPhone($('ed-phone').value), ml = PB.normMail($('ed-email').value), wb = PB.normWeb($('ed-web').value);
      if (wa === null || ph === null) return bad('Revisa el número de WhatsApp o teléfono.');
      if (ml === null) return bad('El correo no parece válido.');
      if (wb === null) return bad('El sitio web no parece válido.');
      if (!wa && !ph && !ml && !wb) return bad('Pon al menos una forma de contacto.');
      var ends = $('ed-ends').value ? new Date($('ed-ends').value + 'T23:59:59').getTime() : null;
      $('edSave').disabled = true; $('edProg').hidden = !editFile; $('edProgFill').style.width = '0%';
      try {
        await B.saveAd({
          id: editing ? editing.id : null, brand: brand, headline: head, body: $('ed-body').value.trim(),
          offer: $('ed-offer').value.trim(), hours: $('ed-hours').value.trim(), cats: editCats.slice(), categoria: editCats[0], localidad: $('ed-loc').value,
          barrio: $('ed-barrio').value.trim(), address: $('ed-addr').value.trim(), whatsapp: wa || '', phone: ph || '', mail: ml || '', web: wb || '',
          tier: $('ed-tier').value || 'pequeno', pal: parseInt($('ed-pal').value, 10) || 0, active: $('ed-active').checked, endsAt: ends,
          startsAt: editing ? editing.startsAt : null, hadEnds: !!(editing && editing.endsAt)
        }, editFile, function (p) { $('edProgFill').style.width = p + '%'; }, editFileTop);
        $('dlgEdit').close(); PB.setMsg($('admMsg'), 'Anuncio guardado.', 'ok');
      } catch (err) { bad(PB.errText(err)); }
      $('edSave').disabled = false;
    });
  };
})();
