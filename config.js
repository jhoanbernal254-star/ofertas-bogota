/*
  Configuración de Ofertas Bogotá.

  Mientras "mode" sea 'demo', todo funciona con datos de prueba guardados en tu navegador
  (sin cuentas reales y sin cobros). Cuando conectes Firebase (mira el README),
  cambia "mode" a 'firebase' y llena el bloque "firebase".

  Los precios, cupos y la promoción se pueden cambiar después desde el panel de administración.
  Los valores de aquí son los iniciales; lo que guardes desde el panel de administración tiene prioridad.
*/
window.PB_CONFIG = {
  mode: 'demo', // 'demo' | 'firebase'
  brand: 'Ofertas Bogotá', // nombre provisional, cámbialo cuando lo definas
  functionsRegion: 'us-central1',

  firebase: {
    apiKey: '',
    authDomain: '',
    projectId: '',
    storageBucket: '',
    messagingSenderId: '',
    appId: ''
  },

  // Datos para los textos legales (términos y privacidad). Llénalos con los datos reales.
  legal: { name: '[Nombre o razón social]', nit: '[NIT o cédula]', email: '[correo de contacto]', city: 'Bogotá, D. C.', updated: '9 de noviembre de 2026' },

  // Sin servicios de pago: las imágenes se reducen y se guardan dentro de la base de datos. Los videos necesitan almacenamiento aparte (de pago), por ahora no.
  limits: { imageMB: 8, videoMB: 0, allowVideo: false },

  // Datos para recibir los pagos (se muestran al anunciante cuando aceptamos su solicitud).
  pago: { nequi: '[número de Nequi]', titular: '[nombre del titular]', whatsapp: '3000000000' },
  termDays: 30,

  // Duraciones que puede elegir el anunciante (máximo 1 mes por pedido; puede renovar al terminar).
  // Los precios de los espacios son los del MES COMPLETO. El precio "de lista" de cada día se calcula hacia arriba
  // para que el mes quede con su descuento y siga costando lo mismo que antes:
  //   precio de lista del mes = precio del mes / (1 - descuento del mes)
  // "disc" es el descuento de cada duración sobre el precio de lista. 1 día, 3 días y 1 semana: sin descuento.
  durations: [
    { days: 1, label: '1 día', disc: 0 },
    { days: 3, label: '3 días', disc: 0 },
    { days: 7, label: '1 semana', disc: 0 },
    { days: 14, label: '2 semanas', disc: 0.1 },
    { days: 30, label: '1 mes', disc: 0.2 }
  ],

  terms: 'Primero envías tu solicitud y no pagas nada. Si la aceptamos, te mostramos cómo pagar y tu anuncio se publica cuando confirmamos el pago. Si no la aceptamos, no se cobra nada. Eliges cuánto dura (de 1 día a 1 mes) y puedes renovarla.',

  // Tipos de espacio. "group" es el filtro "Tipo de anuncio": banner, destacado o estándar.
  // "cap" es el máximo de anuncios activos al mismo tiempo (vacío = sin límite).
  tiers: {
    premium: { label: 'Banner Plus', short: 'Plus', price: 150000, group: 'plus', cap: 1, size: { w: 1600, h: 320 }, note: 'Una franja visible en todas las pantallas y filtros' },
    banner: { label: 'Banner principal', short: 'Banner', price: 60000, group: 'banner', cap: 3, size: { w: 1600, h: 500 }, note: 'Arriba de todo, en la portada' },
    destacado: { label: 'Anuncio destacado', short: 'Destacado', price: 40000, group: 'destacado', cap: 12, size: { w: 800, h: 500 }, note: 'En la sección de destacados' },
    mediano: { label: 'Espacio mediano', short: 'Mediano', price: 25000, group: 'estandar', size: { w: 600, h: 400 }, note: 'Publicación estándar grande' },
    pequeno: { label: 'Espacio pequeño', short: 'Pequeño', price: 15000, group: 'estandar', size: { w: 600, h: 600 }, note: 'Publicación estándar' }
  },
  groups: { banner: 'Banner principal', destacado: 'Anuncio destacado', estandar: 'Publicación estándar' },

  // Servicio de diseño: precio por pieza (imagen, banner o pieza gráfica).
  design: { pricePerPiece: 20000, maxPieces: 3 },

  // Promoción de lanzamiento: un espacio gratis por cuenta mientras haya cupos.
  // until = último día en que se puede pedir el espacio gratis (AAAA-MM-DD). Una vez pasa, la promoción desaparece sola.
  // Ponla un mes después del día en que lances. También se cambia desde el panel de administración.
  promo: { enabled: true, limit: 20, until: '2026-12-10' },

  categorias: ['Restaurantes', 'Ropa', 'Tecnología', 'Belleza', 'Ferreterías', 'Hogar', 'Salud', 'Educación', 'Servicios'],

  localidades: [
    'Usaquén', 'Chapinero', 'Santa Fe', 'San Cristóbal', 'Usme', 'Tunjuelito', 'Bosa', 'Kennedy', 'Fontibón', 'Engativá',
    'Suba', 'Barrios Unidos', 'Teusaquillo', 'Los Mártires', 'Antonio Nariño', 'Puente Aranda', 'La Candelaria',
    'Rafael Uribe Uribe', 'Ciudad Bolívar', 'Sumapaz'
  ],

  palettes: [
    { n: 'Cobalto', bg: '#1F3FFF', fg: '#FFFFFF' },
    { n: 'Mostaza', bg: '#F2B705', fg: '#121212' },
    { n: 'Coral', bg: '#FF5A4D', fg: '#190B0A' },
    { n: 'Menta', bg: '#3DDBA8', fg: '#062018' },
    { n: 'Papel', bg: '#F1EFE8', fg: '#14161A' },
    { n: 'Uva', bg: '#6A2C91', fg: '#FFFFFF' }
  ]
};

/*
  Junta los valores iniciales de arriba con lo que el administrador guardó en la base de datos
  (precios, cupos, precio del diseño y promoción). Lo usan la página y el modo demostración.
*/
window.PB_CONFIG.resolve = function (raw) {
  var C = window.PB_CONFIG, c = raw || {};
  function pos(v, d) { v = Number(v); return v > 0 ? v : d; }
  var prices = {}, caps = {};
  Object.keys(C.tiers).forEach(function (t) {
    prices[t] = pos(c.prices && c.prices[t], C.tiers[t].price);
    if (C.tiers[t].cap) caps[t] = pos(c.caps && c.caps[t], C.tiers[t].cap);
  });
  var pr = c.promo || {};
  var lim = Number(pr.limit);
  return {
    prices: prices,
    caps: caps,
    designPrice: pos(c.designPrice, C.design.pricePerPiece),
    promo: {
      enabled: typeof pr.enabled === 'boolean' ? pr.enabled : C.promo.enabled,
      limit: isFinite(lim) && pr.limit !== undefined && pr.limit !== null ? Math.max(0, Math.round(lim)) : C.promo.limit,
      until: typeof pr.until === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(pr.until) ? pr.until : C.promo.until
    }
  };
};

/* ¿La promoción de lanzamiento sigue abierta en este momento? (activa y antes de que termine el día de cierre, hora de Bogotá) */
window.PB_CONFIG.promoOpen = function (raw, now) {
  var c = window.PB_CONFIG.resolve(raw).promo;
  if (!c.enabled) return false;
  if (!c.until) return true;
  return (now == null ? Date.now() : now) <= new Date(c.until + 'T23:59:59-05:00').getTime();
};
window.PB_CONFIG.promoUntilLabel = function (raw) {
  var u = window.PB_CONFIG.resolve(raw).promo.until;
  if (!u) return '';
  var m = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
  var p = u.split('-');
  return Number(p[2]) + ' de ' + m[Number(p[1]) - 1] + ' de ' + p[0];
};

window.PB_CONFIG.fmtMoney = function (n) { return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(n || 0); };

/*
  Calcula cuánto se cobra por una solicitud y si se puede aceptar.
  Lo usan el panel del administrador y los dos backends. Es el administrador quien fija el monto al aceptar.
  orders: todos los pedidos; ads: todos los anuncios; now: hora actual en milisegundos.
  Devuelve { ok, error, amount, promo, space, design }.
*/
window.PB_CONFIG.quote = function (o, raw, orders, ads, now) {
  var C = window.PB_CONFIG, c = C.resolve(raw);
  var HOLD = ['por_pagar', 'pago_reportado'];
  function res(err) { return { ok: false, error: err }; }
  var pieces = Math.max(0, Math.min(C.design.maxPieces, Number(o.designPieces) || 0));
  var days = o.days == null ? C.termDays : Number(o.days);
  if (!C.durationFor(days)) return res('La duración pedida no es válida.');
  if (o.renewOf) {
    var base = ads.filter(function (a) { return a.id === o.renewOf; })[0];
    if (!base || base.uid !== o.uid) return res('El anuncio que se quiere renovar no existe o no es de esa cuenta.');
    if (!c.prices[base.tier]) return res('Ese espacio ya no se puede renovar.');
    var rp = C.priceFor(c.prices[base.tier], days);
    return { ok: true, amount: rp, promo: false, space: rp, design: 0 };
  }
  var tier = o.tier || '';
  if (!tier && !pieces) return res('El pedido no tiene espacio ni diseño.');
  if (tier && !c.prices[tier]) return res('El espacio pedido no existe.');
  if (tier && c.caps[tier]) {
    var live = ads.filter(function (a) { return a.tier === tier && a.active === true && (!a.endsAt || a.endsAt > now); }).length;
    var held = orders.filter(function (x) { return x.id !== o.id && x.tier === tier && !x.renewOf && HOLD.indexOf(x.status) >= 0; }).length;
    if (live + held >= c.caps[tier]) return res('No quedan cupos de ' + C.tiers[tier].label + '. Rechaza la solicitud o espera a que se libere uno.');
  }
  var promo = false;
  if (o.usePromo && tier) {
    if (!c.promo.enabled) return res('La promoción de lanzamiento está desactivada. Actívala en el panel o rechaza la solicitud.');
    // Cuenta el día en que el cliente envió la solicitud, no el día en que tú la revisas.
    if (!C.promoOpen(raw, o.createdAt || now)) return res('La promoción de lanzamiento ya terminó (cerró el ' + C.promoUntilLabel(raw) + '). Rechaza la solicitud o pídele que la envíe sin promoción.');
    var used = orders.filter(function (x) { return x.id !== o.id && x.promo === true && ['por_pagar', 'pago_reportado', 'aprobado'].indexOf(x.status) >= 0; });
    if (used.some(function (x) { return x.uid === o.uid; })) return res('Esta cuenta ya usó su mes gratis.');
    if (used.length >= c.promo.limit) return res('Ya se agotaron los cupos de la promoción de lanzamiento.');
    promo = true;
  }
  var space = tier ? C.priceFor(c.prices[tier], days) : 0;
  return { ok: true, amount: (promo ? 0 : space) + pieces * c.designPrice, promo: promo, space: space, design: pieces * c.designPrice };
};

/* Días de duración válidos y su precio. Se redondea hacia arriba a 500 para no perder dinero. */
window.PB_CONFIG.durationFor = function (days) {
  var list = window.PB_CONFIG.durations;
  for (var i = 0; i < list.length; i++) if (list[i].days === Number(days)) return list[i];
  return null;
};
window.PB_CONFIG.durLabel = function (days) {
  var d = window.PB_CONFIG.durationFor(days);
  return d ? d.label : days + ' días';
};
function pbCeil500(x) { return Math.ceil((x - 0.01) / 500) * 500; }
// Precio de lista (sin descuento) de una duración: el precio del mes "sin descuento" repartido por días.
window.PB_CONFIG.listFor = function (monthly, days) {
  var C = window.PB_CONFIG, m = C.durationFor(C.termDays);
  return pbCeil500(monthly / (1 - m.disc) * Number(days) / C.termDays);
};
// Precio que se cobra: el de lista menos el descuento de esa duración. El mes completo da exactamente el precio del mes.
window.PB_CONFIG.priceFor = function (monthly, days) {
  var C = window.PB_CONFIG, d = C.durationFor(days) || C.durationFor(C.termDays);
  return pbCeil500(monthly / (1 - C.durationFor(C.termDays).disc) * d.days / C.termDays * (1 - d.disc));
};
window.PB_CONFIG.discPct = function (days) {
  var d = window.PB_CONFIG.durationFor(days);
  return d && d.disc > 0 ? Math.round(d.disc * 100) : 0;
};
// Medida ideal de la imagen de cada espacio, por ejemplo "1600 × 320 px".
window.PB_CONFIG.sizeLabel = function (tier) {
  var t = window.PB_CONFIG.tiers[tier];
  return t && t.size ? t.size.w + ' × ' + t.size.h + ' px' : '';
};
