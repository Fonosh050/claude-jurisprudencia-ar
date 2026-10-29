# Conectores

Scripts que consultan las fuentes oficiales y devuelven JSON normalizado por stdout.
Nunca completan datos: lo que la fuente no trae queda en `null`, y los problemas de
acceso van en `advertencias` (o en `error`, con código de salida 1).

## Instalación

Requieren Node 18 o posterior:

```bash
npm install && npx playwright install chromium
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
