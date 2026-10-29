# Fuentes

> **Estado:** verificado en vivo el 29/10/2026 salvo lo marcado como **[a verificar]**.
> Al usar la skill, si una URL cambió o no responde, informarlo en "Advertencias".

## Resumen de acceso (29/10/2026)

| Fuente | WebFetch | Desde servidor (curl/scripts) | Búsqueda | Conector |
|---|---|---|---|---|
| JUBA (SCBA) | Sí | Sí | Funciona con navegador (formulario ASP.NET con JavaScript) | `scripts/juba.js` |
| Córdoba, Jurisemia | Sí | Sí | **Bloqueada por captcha** (Cloudflare Turnstile) | No (no se evade el captcha) |
| SAIJ | Sí | **403** | La API JSON responde pero devuelve 0 resultados | Pendiente |
| CSJN sjconsulta | Sí, sin captcha | **403** | [a verificar]: formulario de sumarios | Pendiente |
| CIJ | Redirige a csjn.gov.ar | **403** | [a verificar] | Pendiente |
| PJN | Solo devuelve el título | Conexión cortada | No accesible | Pendiente |

Los 403 los devuelve el propio sitio, no un proxy: parecen bloquear direcciones IP de
servidores en la nube. Desde una computadora personal pueden responder.

## Nación y Federal

### CSJN: Secretaría de Jurisprudencia
- URL: https://sjconsulta.csjn.gov.ar/sjconsulta/
- Cobertura: fallos y sumarios de la Corte Suprema; colección *Fallos*.
- Fueros: todos (la Corte interviene por recurso extraordinario).
- Cita: `Fallos: <tomo>:<página>` cuando conste; si no, número de causa y fecha.
- Búsqueda: el formulario de **Sumarios (1863-2026)** carga sin captcha y tiene estos campos:
  texto (todas las palabras / algunas / frase exacta / palabras cercanas), voces, autos,
  fecha exacta, fecha desde/hasta, tomo y página. [a verificar]: cómo envía la consulta y
  el formato de los resultados.
- Acceso: responde a WebFetch; desde servidores devuelve 403.

### CIJ: Centro de Información Judicial
- URL: https://www.cij.gov.ar (hoy redirige a
  https://www.csjn.gov.ar/tribunales-federales-nacionales/inicio.html)
- Cobertura: fallos recientes de la CSJN y de tribunales federales y nacionales difundidos
  como noticia, con PDF del fallo.
- Uso: útil para fallos recientes que todavía no están sumariados.

### SAIJ: Sistema Argentino de Información Jurídica
- URL: https://www.saij.gob.ar
- Cobertura: fallos y sumarios nacionales, federales y provinciales (incluye PBA y Córdoba).
- Búsqueda: el menú Jurisprudencia lleva a `/buscador/jurisprudencia-nacional`,
  `/buscador/jurisprudencia-federal` y `/buscador/jurisprudencia-corte-suprema`, con filtros
  por carátula, jurisdicción, tribunal, tema, texto, fechas e Id-Doc.
- API: `https://www.saij.gob.ar/busqueda?o=<offset>&p=<cantidad>&f=<facetas>&r=<consulta>&v=colapsada`
  devuelve JSON (`queryObjectData`, `searchResults.totalSearchResults`,
  `searchResults.documentResultList`). Facetas: p. ej.
  `Total|Tipo de Documento/Jurisprudencia/Fallo`. **Al 29/10/2026 devuelve 0 resultados
  incluso para "despido"**, y la página `resultados.jsp` muestra "Ocurrió un error".
  [a verificar]: el formato correcto de `r` o si es una falla del sitio.
- Acceso: responde a WebFetch; desde servidores devuelve 403.

### PJN: Poder Judicial de la Nación
- URL: https://www.pjn.gov.ar
- Cobertura: cámaras nacionales y federales. Relevantes por fuero:
  - Contencioso administrativo: Cámara Nacional de Apelaciones en lo Contencioso
    Administrativo Federal (CNACAF).
  - Penal: Cámara Federal de Casación Penal, Cámara Nacional de Casación en lo Criminal y
    Correccional, Cámara Nacional en lo Criminal y Correccional.
  - Comercial: Cámara Nacional de Apelaciones en lo Comercial.
  - Civil: Cámara Nacional de Apelaciones en lo Civil; Civil y Comercial Federal.
  - Laboral: Cámara Nacional de Apelaciones del Trabajo.
- Búsqueda: [a verificar] buscador de jurisprudencia y boletines de cada cámara.
- Acceso: al 29/10/2026 la portada no respondió (WebFetch devuelve solo el título; desde
  servidores la conexión se corta).

## Provincia de Buenos Aires

### JUBA: Suprema Corte de Justicia de la Provincia de Buenos Aires
- URL: https://www.scba.gov.ar/jurisprudencia/ (acceso a JUBA SCBA, JUBA buscador general,
  JUBA Tribunal de Casación Penal, listado de sentencias SCBA, buscador de sentencias PBA).
- Cobertura: SCBA, Tribunal de Casación Penal, cámaras y tribunales de la provincia,
  incluido el fuero contencioso administrativo provincial.
- Cita: número de causa (p. ej. `C. 123.456`, `L. 123.456`, `A. 12.345`, `P. 123.456`) y fecha.
- Búsqueda rápida: https://juba.scba.gov.ar/Buscar.aspx. Texto libre más materia (Civil y
  Comercial, Conflicto de Poderes, Contencioso administrativa, Enjuiciamiento de
  Magistrados, Inconstitucionalidad, Laboral, Penal, Todos). Es un formulario ASP.NET con
  postback: un POST directo no trae resultados, hace falta un navegador. Informa tres
  totales (texto del sumario, voces, texto del fallo) y muestra los sumarios **del texto del
  sumario**, 20 por página, con botón "Siguiente". Cada sumario trae código (p. ej.
  `B4003883`), voces, texto, normas citadas y los fallos que lo aplican. Los resultados no
  tienen URL propia.
- Ficha del fallo: `https://juba.scba.gov.ar/VerTextoCompleto.aspx?idFallo=<id>` (GET
  simple). Trae materia, tipo de fallo, tribunal emisor, causa, fecha, registro, carátula,
  magistrados, sentencias anuladas y el **texto completo**. No todos los fallos tienen
  idFallo (los más antiguos suelen tener solo la referencia de publicación, p. ej.
  `AyS 1990-II, 721`).
- Limitación observada: a veces informa más sumarios de los que muestra (p. ej. "4" y
  muestra 2, sin página siguiente).
- Conector: `scripts/juba.js` (ver `scripts/README.md`).

## Córdoba

### Poder Judicial de Córdoba: TSJ
- URL: https://www.justiciacordoba.gob.ar
- Cobertura: Tribunal Superior de Justicia (Salas Contencioso Administrativa, Penal,
  Civil y Comercial, Laboral) y cámaras provinciales.
- Cita: número de sentencia o auto, sala, fecha y autos.
- Búsqueda: buscador semántico **Jurisemia**, https://www.justiciacordoba.gob.ar/Jurisemia/
  (catálogo: Boletín Judicial; texto de búsqueda obligatorio y filtro por campos).
- Limitación: **exige Cloudflare Turnstile (captcha)**. Sin resolverlo, la búsqueda no se
  ejecuta. No hay conector automático: informarlo en "Advertencias" y sugerir la consulta
  manual, o usar SAIJ como fuente alternativa para Córdoba.

## Fuentes secundarias (solo pistas)

Portales y revistas jurídicas (p. ej. Pensamiento Penal, Diario Judicial, Microjuris,
elDial). Varios requieren suscripción. Cualquier fallo hallado ahí se tiene que confirmar
en una fuente oficial antes de marcarlo como verificado.
