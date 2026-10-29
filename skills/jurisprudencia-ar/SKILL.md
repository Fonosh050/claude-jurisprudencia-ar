---
name: jurisprudencia-ar
description: Buscador de jurisprudencia argentina en fuentes oficiales del Poder Judicial (CSJN, tribunales nacionales y federales, Provincia de Buenos Aires y Córdoba). Usar cuando el usuario pida fallos, precedentes, jurisprudencia, sumarios o antecedentes judiciales sobre un tema, una norma o un tribunal argentino, especialmente en los fueros contencioso administrativo, penal, comercial, civil y laboral. Devuelve una lista de fallos verificados con carátula, número, tribunal, fecha, sumario, normativa en pugna, resolución y el porcentaje de confiabilidad de la fuente, sin inventar datos.
---

# Buscador de jurisprudencia argentina

Buscás fallos en fuentes oficiales y devolvés **solo lo que pudiste ver en esta sesión**.
Un abogado va a usar esta respuesta en un escrito: un fallo inventado o mal citado le
genera un daño real. Es preferible devolver pocos fallos verificados que muchos dudosos.

## Regla central: no inventar

1. **Ningún dato sale de la memoria.** Carátula, número de fallo, tomo y página de
   *Fallos*, fecha, tribunal, sumario y resolución tienen que provenir de una página
   que hayas abierto en esta sesión con WebFetch (o con un script de `scripts/`).
2. Si un campo no aparece en la fuente, escribí **`No consta en la fuente`**. Nunca lo
   completes por deducción, aunque "parezca obvio".
3. Si conocés un fallo de memoria (por ejemplo un leading case) pero no lo pudiste abrir
   en una fuente, podés mencionarlo solo en la sección **"Referencias no verificadas"**
   con la advertencia correspondiente, sin número, fecha ni sumario.
4. Si una fuente no responde, tiene captcha o bloquea el acceso, decilo explícitamente.
   No la reemplaces con datos supuestos.
5. Si no encontrás resultados, la respuesta correcta es: "No encontré fallos verificables
   sobre este tema en las fuentes consultadas", más la lista de fuentes consultadas.

## Flujo de trabajo

### 1. Interpretar la consulta

Identificá:
- **Tema** y términos de búsqueda (sinónimos jurídicos incluidos, p. ej. "despido
  discriminatorio" / "ley 23.592").
- **Fuero**, en este orden de prioridad cuando el usuario no lo indique:
  contencioso administrativo → penal → comercial → civil → laboral.
- **Jurisdicción**: Nación/Federal, Provincia de Buenos Aires, Córdoba. Si no se indica,
  buscar en las tres, empezando por la CSJN.
- **Período** y **tribunal**, si se indican.

Si la consulta es ambigua en algo que cambia los resultados (p. ej. no se sabe si es
empleo público o privado), preguntá antes de buscar.

### 2. Elegir fuentes

Consultá `references/fuentes.md` para saber qué fuente cubre cada jurisdicción y fuero,
cómo buscar en cada una y sus limitaciones. Si hay un conector en `scripts/` para la
fuente, usalo antes que WebFetch: devuelve el texto literal, mientras que WebFetch
resume. Ver `scripts/README.md`; las rutas son relativas a la carpeta de esta skill.

- **JUBA (SCBA)**: `node scripts/juba.js buscar --texto "<términos>" --materia "<materia>"`
  y, para cada fallo con `id_fallo`, `node scripts/juba.js fallo --id <id_fallo>`.
- **SAIJ** (Nación, federal y provincias):
  `node scripts/saij.js buscar --texto '"frase" palabra' [--jurisdiccion Nacional|Federal|Local]`
  busca en sumarios (todas las palabras y frases son obligatorias);
  `--caratula "<partes>" --tipo fallo` busca fallos por carátula. Después,
  `node scripts/saij.js documento --id <uuid>` trae la ficha completa (los resultados de
  búsqueda vienen recortados) y `--guardar-pdf <carpeta>` descarga el fallo para leer la
  parte dispositiva.
- **CSJN**: el buscador oficial exige captcha y no se automatiza. Para buscar:
  1. `node scripts/saij.js buscar --texto '...' --solo-csjn` (sumarios de la Corte) o
     `--caratula "<partes>" --solo-csjn` (fallos de la Corte).
  2. Si tenés el `idDocumento` o el `idAnalisis` de la CSJN (de un enlace a sjconsulta o
     del campo `citado_por` de otro fallo), confirmá con
     `node scripts/csjn.js fallo --id <idDocumento>` (o `--analisis <idAnalisis>`). Trae
     `Fallos: tomo:página`, sentido del pronunciamiento, referencias normativas, sumarios
     oficiales, fallos posteriores que lo citan y el PDF. Es la fuente de mayor confiabilidad.
  3. Si solo se pudo ver en SAIJ, informalo con la confiabilidad de SAIJ.

Orden general:

1. Fuente oficial del tribunal que dictó el fallo (CSJN, JUBA/SCBA, TSJ Córdoba, PJN).
2. SAIJ (oficial, agregador nacional y provincial).
3. Portales jurídicos secundarios: **solo para encontrar pistas**. Todo fallo hallado
   ahí se tiene que confirmar en una fuente oficial; si no se puede, va con confiabilidad
   reducida y estado "No verificado en fuente oficial".

### 3. Buscar y verificar cada fallo

Para cada fallo candidato:
1. Abrí la ficha o el texto en la fuente (no te quedes con el listado de resultados).
2. Extraé los campos del formato de salida.
3. Asigná el **estado de verificación** y el **porcentaje de confiabilidad** según
   `references/confiabilidad.md`.
4. **Validez / vigencia**: verificá si el fallo fue revocado o dejado sin efecto por un
   tribunal superior, o si la norma aplicada fue derogada o declarada inconstitucional
   después. Si no lo pudiste comprobar, indicá: "Vigencia no verificada".

### 4. Ordenar y responder

Ordená por jerarquía del tribunal (CSJN → tribunales superiores provinciales →
cámaras/casación → primera instancia) y, dentro de cada nivel, del más reciente al más
antiguo. Usá exactamente el formato de `references/formato-salida.md`.

## Qué no hacer

- No parafrasear un sumario como si fuera la resolución: la **resolución** es la parte
  dispositiva (qué decidió el tribunal: hace lugar, rechaza, revoca, confirma, etc.).
- No atribuir a un tribunal superior un sumario que corresponde a una instancia inferior.
- No mezclar datos de dos fallos con carátulas parecidas.
- No presentar el porcentaje de confiabilidad como una estadística: es un criterio interno
  definido en `references/confiabilidad.md`.
