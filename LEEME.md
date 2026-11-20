# Ofertas Bogotá — sitio final

Carpetas:
- `/` (index.html) → sitio público: ofertasbogota.lat
- `/mipanel/` → clientes (crear cuenta, publicar, pagos, contratos, informes)
- `/admin/` → administración (solo cuentas registradas en `admins`)
- `assets/css` y `assets/js` → estilos y código separados

## Subir a GitHub
Borra todo lo anterior del repositorio y sube el CONTENIDO de esta carpeta (incluye `CNAME` y `.nojekyll`, que son archivos ocultos: súbelos también).

## Dominio ofertasbogota.lat (en tu proveedor de dominio)
Registros A para el dominio raíz: 185.199.108.153, 185.199.109.153, 185.199.110.153, 185.199.111.153
Registro CNAME `www` → TU-USUARIO.github.io
En GitHub: Settings → Pages → Custom domain = ofertasbogota.lat y activa "Enforce HTTPS".

## Firebase (obligatorio)
1. Authentication → Settings → Authorized domains: agrega `ofertasbogota.lat` y `www.ofertasbogota.lat`.
2. Firestore → Reglas: pega `firestore.rules` y Publica.
3. Authentication → Templates: pon el idioma en Español (verificación de correo y recuperar contraseña son gratis).
4. Admin: sigue siendo el documento `admins/<uid>` (campo rol = admin). Solo ese usuario entra a /admin.
5. Antes de abrir al público borra los datos de prueba (colecciones orders, ads, reports).
