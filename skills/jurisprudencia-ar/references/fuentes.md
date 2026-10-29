# Fuentes

> **Estado:** verificado en vivo el 29/10/2026 salvo lo marcado como **[a verificar]**.
> Al usar la skill, si una URL cambió o no responde, informarlo en "Advertencias".

## Resumen de acceso (29/10/2026)

| Fuente | Búsqueda | Ficha del fallo | Conector |
|---|---|---|---|
| JUBA (SCBA) | Sí, con navegador (formulario ASP.NET con JavaScript) | Sí, texto completo | `scripts/juba.js` |
| SAIJ | Sí, API JSON pública | Sí, ficha JSON y PDF | `scripts/saij.js` |
| CSJN sjconsulta | **No: exige reCAPTCHA Enterprise** | Sí: análisis, sumarios, citantes y PDF (JSON público) | `scripts/csjn.js` (solo ficha) |
| Córdoba, Jurisemia | **No: exige Cloudflare Turnstile** | [a verificar] | No (no se evade el captcha) |
| CIJ | [a verificar] (redirige a csjn.gov.ar) | [a verificar] | Pendiente |
| PJN | No: la portada no respondió | [a verificar] | Pendiente |

Las portadas de SAIJ, CSJN y CIJ devuelven 403 a `curl`, pero las APIs y fichas que usan
los conectores responden a Node (`fetch`) sin problemas. WebFetch también llega, aunque
resume el contenido y no copia textos largos de forma literal: para citar textual, usar
los conectores.

## Nación y Federal

### CSJN: Secretaría de Jurisprudencia
- URL: https://sjconsulta.csjn.gov.ar/sjconsulta/
- Cobertura: fallos y sumarios de la Corte Suprema; colección *Fallos*.
- Fueros: todos (la Corte interviene por recurso extraordinario).
- Cita: `Fallos: <tomo>:<página>` cuando conste; si no, número de causa y fecha.
- Búsqueda: el formulario de **Sumarios (1863-2026)** (texto, voces, autos, fechas, tomo y
  página) envía un POST a `/sjconsulta/consultaSumarios/buscar.html` con un token de
  **reCAPTCHA Enterprise**. No se automatiza. Para encontrar fallos de la Corte por tema,
  usar SAIJ con `--solo-csjn`; para buscar en la CSJN, hacerlo a mano.
- Ficha de un fallo (pública, sin captcha), a partir del `idDocumento` que figura en los
  enlaces `verDocumentoByIdLinksJSP.html?idDocumento=N`:
  - `/sjconsulta/documentos/verDocumentoByIdLinksJSP.html?idDocumento=N`: autos, fecha,
    `Fallos: tomo:página`, cita `CS año:número` e `idAnalisis`.
  - `/sjconsulta/documentos/getDocumentosExterno.html?idAnalisis=N`: lo mismo a partir del
    `idAnalisis`.
  - `/sjconsulta/fallos/abrirAnalisis.html?idAnalisis=N` (JSON): expediente, tribunal de
    origen, tipo de recurso, **sentido del pronunciamiento** (confirma, revoca, etc.),
    materias, voces, cuestiones federales, **referencias normativas** (con marca de
    inconstitucionalidad) y votos.
  - `/sjconsulta/sumarios/getSumariosAnalisis.html?idAnalisis=N` (JSON): sumarios oficiales.
  - `/sjconsulta/documentos/getCitantes.html?idDocumento=N`: fallos posteriores que lo
    citan (útil para la vigencia de la doctrina).
  - `/sjconsulta/documentos/verDocumentoById.html?idDocumento=N`: PDF del fallo.
  - Con un identificador inexistente, la ficha responde HTTP 500.
- Conector: `scripts/csjn.js fallo --id <idDocumento>` o `--analisis <idAnalisis>`.

### CIJ: Centro de Información Judicial
- URL: https://www.cij.gov.ar (hoy redirige a
  https://www.csjn.gov.ar/tribunales-federales-nacionales/inicio.html)
- Cobertura: fallos recientes de la CSJN y de tribunales federales y nacionales difundidos
  como noticia, con PDF del fallo.
- Uso: útil para fallos recientes que todavía no están sumariados.

### SAIJ: Sistema Argentino de Información Jurídica
- URL: https://www.saij.gob.ar
- Cobertura: fallos y sumarios nacionales, federales y provinciales (incluye PBA y Córdoba).
- API de búsqueda (JSON, pública):
  `https://www.saij.gob.ar/busqueda?r=<consulta>&o=<offset>&p=<cantidad, máx. 25>&f=<facetas>&s=fecha-rango|DESC&v=colapsada`
  - `r` usa sintaxis Lucene con campo: `+texto: "frase"` busca en el texto de los
    **sumarios**; `+titulo: palabra` busca en el título, que en los **fallos** es la
    carátula (no el contenido). El campo y el `+` se aplican a un solo término: para
    exigir varios, repetirlos (`+texto: "a" +texto: "b"`). Sin campo, `r=despido` devuelve 0.
  - `f` son facetas separadas por `|`: `Total`, `Tipo de Documento/Jurisprudencia/Fallo` o
    `.../Sumario`, `Fecha`, `Tribunal/<NOMBRE>` (solo fallos; p. ej.
    `Tribunal/CORTE SUPREMA DE JUSTICIA DE LA NACION`) y `Jurisdicción/<Nacional|Federal|Local>`.
  - El total está en `categoriesResultList` → `Total` → `total`. `totalSearchResults` es la
    cantidad devuelta en la página.
  - Cada resultado trae la ficha como JSON serializado en `documentAbstract`. En los
    sumarios, el texto viene recortado y sin carátula ni fecha.
  - Los sumarios de la CSJN se numeran con prefijo **A** (`+numero-sumario: A*`). Es una
    deducción verificada en muestras, no documentada por SAIJ: confirmar con la ficha
    (`tipo-tribunal: CS`, jurisdicción Federal).
- Ficha completa: `https://www.saij.gob.ar/view-document?guid=<uuid>` (JSON con la ficha en
  `data`). Los fallos traen tribunal, sala, fecha, actor/demandado/sobre, magistrados,
  sumarios relacionados y `texto-doc` → PDF en
  `/descarga-archivo?guid=<uuid>&name=<archivo>`. Los sumarios traen carátula, fecha,
  provincia y el texto completo (con marcas `[[p]]`). Algunos sumarios no tienen fecha
  ni carátula en la fuente.
- Un `id-infojus` (p. ej. `FA23040046`, `SUJ0042712`) se resuelve con `r=id-infojus:<id>`.
- Conector: `scripts/saij.js`.

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
  manual, o usar SAIJ (`saij.js`, jurisdicción Local) como fuente alternativa para Córdoba.

## Fuentes secundarias (solo pistas)

Portales y revistas jurídicas (p. ej. Pensamiento Penal, Diario Judicial, Microjuris,
elDial). Varios requieren suscripción. Cualquier fallo hallado ahí se tiene que confirmar
en una fuente oficial antes de marcarlo como verificado.
