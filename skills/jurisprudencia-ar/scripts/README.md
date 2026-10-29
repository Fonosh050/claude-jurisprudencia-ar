# Conectores

Scripts que consultan las fuentes oficiales y devuelven JSON normalizado por stdout.
Nunca completan datos: lo que la fuente no trae queda en `null`, y los problemas de
acceso van en `advertencias` (o en `error`, con código de salida 1).

## Instalación

Requieren Node 18 o posterior. `saij.js` y `csjn.js` no tienen dependencias. `juba.js`
necesita Playwright:

```bash
npm install && npx playwright install chromium
```

Pruebas de parseo (sin red):

```bash
npm test
```

## JUBA (SCBA): `juba.js`

Buscar sumarios (20 por página en JUBA; `--max` pagina hasta juntar N):

```bash
node juba.js buscar --texto "falta de servicio hospital" --materia "Contencioso administrativa" --max 20
```

Materias: `Civil y Comercial`, `Conflicto de Poderes`, `Contencioso administrativa`,
`Enjuiciamiento de Magistrados`, `Inconstitucionalidad`, `Laboral`, `Penal`, `Todos`
(por defecto).

Cada resultado es un **sumario** con `id_sumario`, `materia`, `voces`, `sumario`,
`normativa` y `fallos`. Cada fallo trae `referencia` (la línea original de JUBA),
`tribunal`, `departamento`, `causa`, `fecha` (dd/mm/aaaa), `caratula`,
`magistrados_votantes`, `publicacion` y, si existe, `id_fallo` y `enlace_texto_completo`.

Leer la ficha y el texto completo de un fallo:

```bash
node juba.js fallo --id 127154
```

Devuelve `materia`, `tipo_de_fallo`, `tribunal_emisor`, `causa`, `fecha`,
`nro_registro_interno`, `caratula`, `magistrados_votantes`, `sentencias_anuladas`,
`texto_completo`, `enlace` y otros campos de la ficha. `--sin-texto` omite el texto completo.

Limitaciones:
- El sumario lo redacta la SCBA. Para la **resolución** (parte dispositiva) hay que leer
  `texto_completo`.
- Los fallos antiguos a veces no tienen `id_fallo`, solo la referencia de publicación.
- JUBA a veces informa más sumarios de los que muestra. El conector lo avisa en
  `advertencias`.

## SAIJ: `saij.js`

Buscar sumarios por texto (cada palabra o frase entre comillas es obligatoria):

```bash
node saij.js buscar --texto '"plazo razonable" "sumario administrativo"' --max 10
```

Opciones: `--jurisdiccion Nacional|Federal|Local|Internacional`, `--solo-csjn`,
`--offset N`, `--tipo sumario|fallo|jurisprudencia`.

Buscar fallos por carátula (el `titulo` de un fallo en SAIJ es su carátula, no su
contenido), opcionalmente filtrando por tribunal:

```bash
node saij.js buscar --caratula "Telefónica Güemes" --solo-csjn
node saij.js buscar --caratula "Altamirano Morillo" --tribunal "CAMARA NACIONAL DE APELACIONES DEL TRABAJO"
```

`--consulta '<Lucene>'` agrega una consulta sin modificar (p. ej. `+numero-sumario: A*`).

La salida trae `total` (de la consulta completa), `resultados` normalizados (`tipo`,
`uuid`, `numero`, `caratula`, `actor`, `demandado`, `sobre`, `tribunal`, `sala`, `fecha`,
`jurisdiccion`, `provincia`, `descriptores`, `texto`, `sumarios_relacionados`, `pdf`,
`enlace`) y `urls_consultadas`.

Ficha completa de un fallo o sumario, por uuid o id-infojus:

```bash
node saij.js documento --id FA23040046 --guardar-pdf ./fallos
```

Limitaciones:
- Los resultados de búsqueda de sumarios vienen con el texto recortado y sin carátula ni
  fecha: completarlos con `documento`.
- Algunos sumarios no tienen fecha ni carátula en SAIJ (quedan en `null`).
- `--solo-csjn` en sumarios se basa en el prefijo "A" del número de sumario. Es una
  deducción verificada en muestras: confirmar con `documento` (`tipo_tribunal: CS`).

## CSJN: `csjn.js`

El buscador de la Secretaría de Jurisprudencia exige reCAPTCHA y **no se automatiza**.
El conector lee la ficha pública de un fallo ya identificado:

```bash
node csjn.js fallo --id 7535142                # idDocumento (de un enlace verDocumentoByIdLinksJSP)
node csjn.js fallo --analisis 753514           # idAnalisis (p. ej. de "citado_por")
node csjn.js fallo --id 7535142 --sin-sumarios --guardar-pdf ./fallos
```

Devuelve `caratula`, `fecha`, `fallos` (`Fallos: 342:1061`), `cita_cs`, `analisis`
(expediente, tribunal de origen, tipo de recurso, `sentido_del_pronunciamiento`,
materias, voces, cuestiones federales, `referencias_normativas` con marca de
inconstitucionalidad y votos), `sumarios` oficiales, `citado_por` (fallos posteriores que
lo citan), `enlace` y `pdf`.

Limitaciones:
- El sentido del pronunciamiento es una clasificación de la Secretaría: la parte
  dispositiva textual está en el PDF.
- Los fallos sin análisis documental público solo traen carátula, fecha y cita.
