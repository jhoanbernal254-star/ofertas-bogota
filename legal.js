/*
  Textos legales de Ofertas Bogotá: BORRADOR para que lo revise un abogado antes de publicar.
  Los datos entre corchetes ([...]) se llenan en config.js, bloque "legal".
  Cada documento es una lista de secciones: { t: título, p: [párrafos] }.
*/
window.PB_LEGAL = {
  terminos: {
    title: 'Términos y condiciones',
    sections: function (L) {
      return [
        { t: '1. Quiénes somos', p: [
          L.name + ' (' + L.nit + '), en adelante "la plataforma", opera el directorio de ofertas y negocios de Bogotá "Ofertas Bogotá". Para cualquier duda escríbenos a ' + L.email + '.'
        ] },
        { t: '2. Qué hace la plataforma', p: [
          'La plataforma permite que negocios y personas publiquen anuncios pagos y que el público los consulte y contacte directamente. La plataforma no vende los productos o servicios anunciados ni es parte de la relación entre el anunciante y quien lo contacta.'
        ] },
        { t: '3. Quién puede anunciar', p: [
          'Puede anunciar cualquier persona mayor de edad o empresa que cree una cuenta con datos verdaderos y sea responsable del contenido que publica. Eres responsable de la cuenta y de mantener tu contraseña en reserva.'
        ] },
        { t: '4. Espacios, precios y duración', p: [
          'Los espacios disponibles (Banner Plus, Banner principal, Anuncio destacado, Espacio mediano y Espacio pequeño), sus precios y sus cupos se muestran en la página de contratación. Los precios están en pesos colombianos (COP). Puedes elegir cuánto dura la publicación (1 día, 3 días, 1 semana, 2 semanas o 1 mes, que es el máximo por pedido). La duración se cuenta desde que se publica y puedes renovarla pagando de nuevo. El precio depende del espacio y de la duración elegida; las duraciones más largas pueden tener descuento.',
          'Los cupos de Banner Plus, Banner principal y Anuncio destacado son limitados. Un cupo se reserva cuando se paga el pedido.'
        ] },
        { t: '5. Pagos', p: [
          'Primero envías una solicitud y no pagas nada. Si la aceptamos, te indicamos el valor y cómo pagar (transferencia por Nequi). El pedido se considera pagado y tu anuncio se publica cuando confirmamos el pago. Si no aceptamos tu solicitud, no se te cobra nada.'
        ] },
        { t: '6. Revisión y aprobación', p: [
          'Todo anuncio pasa por una revisión antes de publicarse. Podemos rechazar o retirar anuncios que incumplan estos términos. Si no aceptamos tu solicitud, no se te cobra nada.',
          'Si retiramos un anuncio ya publicado por incumplir estos términos, no habrá devolución por el tiempo restante.'
        ] },
        { t: '7. Contenido permitido y prohibido', p: [
          'Tu anuncio debe ser verdadero, legal y no engañar al público. No se permiten anuncios que sean ilegales, discriminatorios, violentos, sexualmente explícitos, que vendan productos prohibidos o regulados sin la autorización correspondiente, que suplanten a otras personas o marcas, ni que infrinjan derechos de autor o de imagen.',
          'Garantizas que tienes los derechos sobre las imágenes, videos, textos y marcas que subes, y nos autorizas a mostrarlos en la plataforma durante la vigencia de tu anuncio.'
        ] },
        { t: '8. Datos de contacto publicados', p: [
          'Los datos de contacto que escribas (WhatsApp, teléfono, correo, sitio web, dirección) se muestran públicamente en la ficha de tu anuncio. Escribe solo lo que quieras que vea todo el mundo.'
        ] },
        { t: '9. Servicio de diseño', p: [
          'Si contratas diseño, te creamos la pieza según el brief que escribas y con la medida del espacio elegido. El precio es por pieza. Podemos pedirte más información si el brief no es suficiente. El diseño se entrega para usarlo en la plataforma.'
        ] },
        { t: '10. Estadísticas', p: [
          'Mostramos visitas y clics de contacto de tu anuncio como referencia. Son cifras aproximadas y no garantizan resultados de ventas.'
        ] },
        { t: '11. Responsabilidad', p: [
          'La plataforma no garantiza ventas, visitas ni disponibilidad ininterrumpida del servicio. No somos responsables por las ofertas, precios, calidad o cumplimiento de los anunciantes, ni por los acuerdos entre anunciantes y clientes. El anunciante responde por lo que publica.'
        ] },
        { t: '12. Cambios', p: [
          'Podemos actualizar estos términos y los precios. Los cambios aplican a los pedidos nuevos; los pedidos ya pagados se respetan hasta el fin de su vigencia.'
        ] },
        { t: '13. Ley aplicable', p: [
          'Estos términos se rigen por las leyes de la República de Colombia. Las diferencias se resolverán ante las autoridades competentes en ' + L.city + '.'
        ] }
      ];
    }
  },
  privacidad: {
    title: 'Política de privacidad y tratamiento de datos',
    sections: function (L) {
      return [
        { t: '1. Responsable', p: [
          L.name + ' (' + L.nit + '), con domicilio en ' + L.city + ', es la responsable del tratamiento de tus datos personales. Contacto: ' + L.email + '.',
          'Esta política se redacta teniendo en cuenta la Ley 1581 de 2012 y sus normas complementarias sobre protección de datos personales en Colombia.'
        ] },
        { t: '2. Qué datos recogemos', p: [
          'Datos de tu cuenta: nombre, correo y contraseña (la contraseña se guarda cifrada por el proveedor de autenticación; nosotros no la vemos).',
          'Datos de tu anuncio: nombre del negocio, textos, imágenes o videos, categoría, localidad, barrio, dirección y datos de contacto. Estos datos se publican a propósito.',
          'Datos de tus pedidos: espacio contratado, valor, estado y fechas. Los pagos se hacen por transferencia (Nequi) y la plataforma no guarda números de tarjeta ni claves bancarias.',
          'Estadísticas de uso: número de visitas y clics de contacto por anuncio, sin identificar a la persona que visita.'
        ] },
        { t: '3. Para qué los usamos', p: [
          'Para crear y administrar tu cuenta, publicar tu anuncio, procesar y confirmar tus pagos, avisarte del estado de tus pedidos y de los vencimientos, atender tus solicitudes y mejorar el servicio.'
        ] },
        { t: '4. Con quién los compartimos', p: [
          'Usamos proveedores que procesan datos por nuestra cuenta: Google Firebase (cuentas y base de datos). Los datos de contacto de tu anuncio los ve cualquier visitante. No vendemos tus datos.'
        ] },
        { t: '5. Tus derechos', p: [
          'Puedes conocer, actualizar, rectificar y solicitar la supresión de tus datos, revocar la autorización que nos diste, y consultar cómo los usamos. Para ejercer estos derechos escribe a ' + L.email + ' desde el correo de tu cuenta. Respondemos en los plazos que fija la ley.',
          'Puedes quitar tu anuncio o pedir que cerremos tu cuenta. Podemos conservar la información que la ley nos obligue a guardar, como registros de pagos.'
        ] },
        { t: '6. Seguridad', p: [
          'Aplicamos medidas razonables para proteger tus datos, como cuentas con contraseña, reglas de acceso a la base de datos y conexiones cifradas. Ningún sistema es perfecto; si tienes un problema de seguridad, escríbenos.'
        ] },
        { t: '7. Menores de edad', p: [
          'El servicio es para personas mayores de edad. No recogemos datos de menores a propósito.'
        ] },
        { t: '8. Cambios y vigencia', p: [
          'Podemos actualizar esta política y publicaremos la versión vigente en esta página. Los datos se conservan mientras tengas una cuenta activa o mientras la ley lo requiera.'
        ] }
      ];
    }
  }
};
