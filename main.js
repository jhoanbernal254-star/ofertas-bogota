/* Arranque: cabecera, rutas, pie y suscripciones a los datos. */
(function () {
  'use strict';
  var PB = window.PB, C = PB.C, $ = PB.$, el = PB.el, state = PB.state, B = PB.B;
  var VIEWS = ['inicio', 'directorio', 'ofertas', 'planes', 'anunciar', 'entrar', 'cuenta', 'pago', 'admin'];
  var ALL = ['inicio', 'directorio', 'ofertas', 'planes', 'ficha', 'anunciar', 'entrar', 'cuenta', 'pago', 'admin', 'legal', 'contrato', 'informe'];
  var lastView = null;

  // Tres entradas: la página pública (/), el panel del cliente (/mipanel) y la administración (/admin).
  var ENTRY = document.body.getAttribute('data-entry') || 'public';
  var ROOT = new URL(document.body.getAttribute('data-root') || './', location.href);
  PB.entry = ENTRY;
  var DEFAULT_VIEW = { 'public': 'inicio', mipanel: 'cuenta', admin: 'admin' };
  var PUBLIC_VIEWS = ['inicio', 'directorio', 'ofertas', 'planes', 'ficha', 'legal'];
  function owns(v) {
    if (PUBLIC_VIEWS.indexOf(v) >= 0) return ENTRY === 'public';
    if (v === 'admin') return ENTRY === 'admin';
    if (v === 'contrato' || v === 'informe' || v === 'entrar') return ENTRY !== 'public';
    return ENTRY === 'mipanel'; // anunciar, cuenta, pago
  }
  function ownerPath(v) { return PUBLIC_VIEWS.indexOf(v) >= 0 ? '' : (v === 'admin' ? 'admin' : 'mipanel'); }
  PB.homeHash = function () { return '#' + DEFAULT_VIEW[ENTRY]; };
  PB.state.afterLogin = PB.homeHash();
  document.body.classList.add('entry-' + ENTRY);

  function parseHash() {
    var raw = location.hash.slice(1), q = '', i = raw.indexOf('?');
    if (i >= 0) { q = raw.slice(i + 1); raw = raw.slice(0, i); }
    if (raw.indexOf('anuncio-') === 0 && raw.length > 8) return { view: 'ficha', id: raw.slice(8) };
    if (raw.indexOf('informe-') === 0 && raw.length > 8) return { view: 'informe', id: raw.slice(8) };
    if (raw.indexOf('contrato-') === 0 && raw.length > 9) return { view: 'contrato', id: raw.slice(9) };
    if (PB.LEGAL_IDS.indexOf(raw) >= 0) return { view: 'legal', id: raw };
    return { view: VIEWS.indexOf(raw) >= 0 ? raw : DEFAULT_VIEW[ENTRY], q: new URLSearchParams(q) };
  }

  function renderChrome() {
    PB.renderFooter();
    var logged = !!state.user, admin = PB.isAdmin();
    $('loginLink').hidden = logged;
    $('logoutBtn').hidden = !logged;
    $('navCuenta').hidden = !logged;
    var demo = B.mode === 'demo';
    $('demoBar').hidden = !demo; $('demoBanner').hidden = !demo; $('demoLogins').hidden = !demo;
    $('footText').textContent = C.brand + ' · ' + (demo ? 'Demostración, sin cobros reales' : 'Bogotá y la Sabana') + ' · v' + (C.version || '?');
    var lb = $('launchBar'), lon = PB.launchOn() && ENTRY !== 'admin';
    lb.hidden = !lon; if (lon) $('launchText').textContent = 'Lanzamiento: publica tu negocio gratis hasta el ' + C.launchUntilLabel(state.config) + '.';
    $('brandLink').setAttribute('href', ENTRY === 'admin' ? '#admin' : '#inicio');
    // Enlaces extra del menú en celular
    var nx = $('navExtra'); nx.textContent = '';
    function link(text, href) { var a = el('a', '', text); a.href = href; nx.appendChild(a); }
    if (logged) {
      link('Mi panel', '#cuenta');
      if (admin && ENTRY === 'admin') link('Administrar', '#admin');
      var out = el('button', '', 'Salir'); out.type = 'button'; out.addEventListener('click', doLogout); nx.appendChild(out);
    } else link('Ingresar', '#entrar');
  }
  async function doLogout() { try { await B.signOut(); } catch (e) {} location.hash = '#inicio'; }

  function renderLegal(id) { PB.renderLegalDoc(id, $('legalBody')); }

  function route() {
    var p = parseHash(), v = p.view;
    if (!owns(v)) { location.replace(new URL(ownerPath(v), ROOT).href + location.hash); return false; }
    if (['cuenta', 'pago', 'admin', 'contrato', 'informe'].indexOf(v) >= 0 && !state.user && state.authReady) {
      state.afterLogin = '#' + v; v = 'entrar';
      if (location.hash !== '#entrar') location.hash = '#entrar';
    }
    if (v === 'entrar' && state.user) {
      // Ya hay sesión: no se vuelve a pedir la contraseña, se manda directo al panel.
      var to = state.afterLogin && state.afterLogin !== '#entrar' ? state.afterLogin : PB.homeHash();
      state.afterLogin = PB.homeHash();
      location.hash = to; return false;
    }
    if (v === 'directorio' && p.q && (p.q.get('cat') || p.q.get('loc') || p.q.get('q'))) {
      PB.setFilters({ cat: p.q.get('cat') || '', loc: p.q.get('loc') || '', q: p.q.get('q') || '' });
      history.replaceState(null, '', '#directorio');
    }
    state.fichaId = v === 'ficha' ? p.id : null;
    state.contractId = v === 'contrato' ? p.id : null;
    state.reportId = v === 'informe' ? p.id : null;
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
    return true;
  }

  function renderAll() {
    try { renderChrome(); } catch (e) { console.error('[PB] chrome', e); }
    var routed; try { routed = route(); } catch (e) { console.error('[PB] ruta', e); routed = true; }
    if (routed === false) return;
    var v = state.view;
    // Solo se dibuja la pantalla visible (más las que alimentan al resto).
    try { renderView(v); } catch (e) { console.error('[PB] pantalla ' + v, e); }
  }
  function renderView(v) {
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
    else if (v === 'informe') PB.renderInforme();
  }
  PB.renderAll = renderAll;
  window.addEventListener('hashchange', renderAll);

  function onErr() { state.status = 'error'; renderAll(); }
  function subscribeUser() {
    ['unsubOrders', 'unsubOwn', 'unsubNotices', 'unsubReports'].forEach(function (k) { if (state[k]) { state[k](); state[k] = null; } });
    state.orders = []; state.myAds = []; state.notices = []; state.reports = [];
    if (!state.user) return;
    if (B.watchNotices) state.unsubNotices = B.watchNotices(state.user, function (l) { state.notices = l; renderAll(); }, onErr);
    if (state.user.admin && B.watchReports) state.unsubReports = B.watchReports(state.user, function (l) { state.reports = l; renderAll(); }, onErr);
    state.unsubOrders = B.watchOrders(state.user, function (l) { state.orders = l; renderAll(); }, onErr);
    state.unsubOwn = B.watchOwnAds(state.user, function (l) { state.myAds = l; renderAll(); }, onErr);
  }

  async function init() {
    PB.hydrate(document);
    ['initPages', 'initPopup', 'initExtras', 'initPublish', 'initAccount', 'initContract', 'initReports', 'initAdmin'].forEach(function (f) { try { if (PB[f]) PB[f](); } catch (e) { console.error('[PB] ' + f, e); } });
    if (PB.initHeroSky) PB.initHeroSky();
    document.title = C.brand;
    $('logoutBtn').addEventListener('click', doLogout);
    $('burger').addEventListener('click', function () {
      var m = $('mainNav'), open = !m.classList.contains('open');
      m.classList.toggle('open', open); $('burger').setAttribute('aria-expanded', open ? 'true' : 'false');
    });
    if ($('ctBack')) $('ctBack').addEventListener('click', function (e) { if (history.length > 1) { e.preventDefault(); history.back(); } });
    $('legalBack').addEventListener('click', function (e) { if (history.length > 1) { e.preventDefault(); history.back(); } });
    $('seedBtn').addEventListener('click', function () { B.seed(); });
    $('resetBtn').addEventListener('click', function () { B.reset(); (PB.resetAdminCfg && PB.resetAdminCfg()); location.hash = '#inicio'; });
    renderAll();
    var timer = setTimeout(function () { if (state.status === 'loading') { state.status = 'slow'; renderAll(); } }, 10000);
    try { await B.init(); } catch (e) { clearTimeout(timer); state.status = 'error'; renderAll(); return; }
    B.watchPublicAds(function (l) { state.ads = l || []; state.status = 'ok'; clearTimeout(timer); renderAll(); }, onErr);
    B.watchConfig(function (c) { state.config = c; renderAll(); }, onErr);
    B.onAuth(function (u) {
      if (ENTRY === 'admin' && u && !u.admin) {
        // Esta entrada es solo para administradores: se cierra la sesión de cualquier otra cuenta.
        state.authNotice = 'Esta cuenta no tiene acceso a la administración. Si eres cliente, entra desde "Mi panel".';
        B.signOut().catch(function () {}); u = null; state.user = null; location.hash = '#entrar';
      }
      var prev = state.user && state.user.uid;
      state.user = u; state.authReady = true;
      if ((u && u.uid) !== prev || (u && !state.unsubOrders)) { (PB.resetAdminCfg && PB.resetAdminCfg()); subscribeUser(); }
      renderAll();
    });
  }
  if (ENTRY === 'admin') {
    var idle = null, IDLE = 20 * 60 * 1000;
    var bump = function () { clearTimeout(idle); idle = setTimeout(function () { if (state.user) { B.signOut().catch(function () {}); state.authNotice = 'Cerramos tu sesión por inactividad.'; location.hash = '#entrar'; renderAll(); } }, IDLE); };
    ['click', 'keydown', 'touchstart'].forEach(function (ev) { window.addEventListener(ev, bump, { passive: true }); }); bump();
  }
  init();
})();
