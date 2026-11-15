/* Arranque: cabecera, rutas, pie y suscripciones a los datos. */
(function () {
  'use strict';
  var PB = window.PB, C = PB.C, $ = PB.$, el = PB.el, state = PB.state, B = PB.B;
  var VIEWS = ['inicio', 'directorio', 'ofertas', 'planes', 'anunciar', 'entrar', 'cuenta', 'pago', 'admin'];
  var ALL = ['inicio', 'directorio', 'ofertas', 'planes', 'ficha', 'anunciar', 'entrar', 'cuenta', 'pago', 'admin', 'legal', 'contrato'];
  var lastView = null;

  function parseHash() {
    var raw = location.hash.slice(1), q = '', i = raw.indexOf('?');
    if (i >= 0) { q = raw.slice(i + 1); raw = raw.slice(0, i); }
    if (raw.indexOf('anuncio-') === 0 && raw.length > 8) return { view: 'ficha', id: raw.slice(8) };
    if (raw.indexOf('contrato-') === 0 && raw.length > 9) return { view: 'contrato', id: raw.slice(9) };
    if (raw === 'terminos' || raw === 'privacidad') return { view: 'legal', id: raw };
    return { view: VIEWS.indexOf(raw) >= 0 ? raw : 'inicio', q: new URLSearchParams(q) };
  }

  function renderChrome() {
    var logged = !!state.user, admin = PB.isAdmin();
    $('loginLink').hidden = logged;
    $('logoutBtn').hidden = !logged;
    $('navCuenta').hidden = !logged;
    $('navAdmin').hidden = !admin; $('adminSep').hidden = !admin;
    var demo = B.mode === 'demo';
    $('demoBar').hidden = !demo; $('demoBanner').hidden = !demo; $('demoLogins').hidden = !demo;
    $('footText').textContent = C.brand + ' · ' + (demo ? 'Demostración, sin cobros reales' : 'Pagos por Nequi');
    // Enlaces extra del menú en celular
    var nx = $('navExtra'); nx.textContent = '';
    function link(text, href) { var a = el('a', '', text); a.href = href; nx.appendChild(a); }
    if (logged) {
      link('Mi panel', '#cuenta');
      if (admin) link('Administrar', '#admin');
      var out = el('button', '', 'Salir'); out.type = 'button'; out.addEventListener('click', doLogout); nx.appendChild(out);
    } else link('Ingresar', '#entrar');
  }
  async function doLogout() { try { await B.signOut(); } catch (e) {} location.hash = '#inicio'; }

  function renderFooter() {
    var fc = $('fCats'); fc.textContent = '';
    C.categorias.slice(0, 6).forEach(function (name) {
      var li = el('li'), a = el('a', '', name); a.href = '#directorio';
      a.addEventListener('click', function () { PB.setFilters({ cat: name }); });
      li.appendChild(a); fc.appendChild(li);
    });
    var fl = $('fLocs'); fl.textContent = '';
    C.localidadesTop.slice(0, 6).forEach(function (name) {
      var li = el('li'), a = el('a', '', name); a.href = '#directorio';
      a.addEventListener('click', function () { PB.setFilters({ loc: name }); });
      li.appendChild(a); fl.appendChild(li);
    });
  }

  function renderLegal(id) {
    var doc = window.PB_LEGAL && window.PB_LEGAL[id], box = $('legalBody');
    box.textContent = '';
    if (!doc) return;
    box.appendChild(el('h2', '', doc.title));
    box.appendChild(el('p', 'fine', 'Última actualización: ' + C.legal.updated + '. Borrador pendiente de revisión legal.'));
    doc.sections(C.legal).forEach(function (sec) {
      box.appendChild(el('h3', '', sec.t));
      sec.p.forEach(function (t) { box.appendChild(el('p', '', t)); });
    });
  }

  function route() {
    var p = parseHash(), v = p.view;
    if (['cuenta', 'pago', 'admin', 'contrato'].indexOf(v) >= 0 && !state.user && state.authReady) {
      state.afterLogin = '#' + v; v = 'entrar';
      if (location.hash !== '#entrar') location.hash = '#entrar';
    }
    if (v === 'directorio' && p.q && (p.q.get('cat') || p.q.get('loc') || p.q.get('q'))) {
      PB.setFilters({ cat: p.q.get('cat') || '', loc: p.q.get('loc') || '', q: p.q.get('q') || '' });
      history.replaceState(null, '', '#directorio');
    }
    state.fichaId = v === 'ficha' ? p.id : null;
    state.contractId = v === 'contrato' ? p.id : null;
    state.view = v;
    ALL.forEach(function (n) { $('v-' + n).hidden = n !== v; });
    Array.prototype.forEach.call(document.querySelectorAll('#mainNav a[data-view]'), function (a) {
      var w = a.getAttribute('data-view');
      if (w === v) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current');
    });
    var key = v + (p.id || '');
    if (key !== lastView) {
      lastView = key; PB.resetFicha(); window.scrollTo(0, 0);
      $('mainNav').classList.remove('open'); $('burger').setAttribute('aria-expanded', 'false');
      $('filterPanel').classList.remove('open');
    }
    if (v === 'entrar') PB.setAuthMode(PB.authMode());
    if (v === 'legal') renderLegal(p.id);
    PB.renderPlus();
  }

  function renderAll() {
    renderChrome();
    route();
    var v = state.view;
    // Solo se dibuja la pantalla visible (más las que alimentan al resto).
    if (v === 'inicio') PB.renderHome();
    else if (v === 'directorio') PB.renderDirectorio();
    else if (v === 'ofertas') PB.renderOfertas();
    else if (v === 'planes') PB.renderPlanes();
    else if (v === 'ficha') PB.renderFicha();
    else if (v === 'anunciar') PB.renderWizard();
    else if (v === 'cuenta') PB.renderCuenta();
    else if (v === 'pago') PB.renderPago();
    else if (v === 'admin') PB.renderAdmin();
    else if (v === 'contrato') PB.renderContrato();
  }
  PB.renderAll = renderAll;
  window.addEventListener('hashchange', renderAll);

  function onErr() { state.status = 'error'; renderAll(); }
  function subscribeUser() {
    ['unsubOrders', 'unsubOwn', 'unsubNotices'].forEach(function (k) { if (state[k]) { state[k](); state[k] = null; } });
    state.orders = []; state.myAds = []; state.notices = [];
    if (!state.user) return;
    if (B.watchNotices) state.unsubNotices = B.watchNotices(state.user, function (l) { state.notices = l; renderAll(); }, onErr);
    state.unsubOrders = B.watchOrders(state.user, function (l) { state.orders = l; renderAll(); }, onErr);
    state.unsubOwn = B.watchOwnAds(state.user, function (l) { state.myAds = l; renderAll(); }, onErr);
  }

  async function init() {
    PB.hydrate(document);
    PB.initPages(); PB.initPublish(); PB.initAccount(); PB.initContract(); PB.initAdmin();
    renderFooter();
    document.title = C.brand;
    $('logoutBtn').addEventListener('click', doLogout);
    $('burger').addEventListener('click', function () {
      var m = $('mainNav'), open = !m.classList.contains('open');
      m.classList.toggle('open', open); $('burger').setAttribute('aria-expanded', open ? 'true' : 'false');
    });
    $('ctBack').addEventListener('click', function (e) { if (history.length > 1) { e.preventDefault(); history.back(); } });
    $('legalBack').addEventListener('click', function (e) { if (history.length > 1) { e.preventDefault(); history.back(); } });
    $('seedBtn').addEventListener('click', function () { B.seed(); });
    $('resetBtn').addEventListener('click', function () { B.reset(); PB.resetAdminCfg(); location.hash = '#inicio'; });
    renderAll();
    var timer = setTimeout(function () { if (state.status === 'loading') { state.status = 'slow'; renderAll(); } }, 10000);
    try { await B.init(); } catch (e) { clearTimeout(timer); state.status = 'error'; renderAll(); return; }
    B.watchPublicAds(function (l) { state.ads = l || []; state.status = 'ok'; clearTimeout(timer); renderAll(); }, onErr);
    B.watchConfig(function (c) { state.config = c; renderAll(); }, onErr);
    B.onAuth(function (u) {
      var prev = state.user && state.user.uid;
      state.user = u; state.authReady = true;
      if ((u && u.uid) !== prev || (u && !state.unsubOrders)) { PB.resetAdminCfg(); subscribeUser(); }
      renderAll();
    });
  }
  init();
})();
