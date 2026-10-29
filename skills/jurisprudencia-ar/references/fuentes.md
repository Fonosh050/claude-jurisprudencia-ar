# Fuentes

> **Estado:** las URLs de portada son las oficiales conocidas. Los parámetros de búsqueda,
> endpoints y limitaciones marcados como **[a verificar]** todavía no se probaron en vivo.
> Al usar la skill, si una URL cambió o no responde, informarlo en "Advertencias".

## Nación y Federal

### CSJN: Secretaría de Jurisprudencia
- URL: https://sjconsulta.csjn.gov.ar/sjconsulta/
- Cobertura: fallos y sumarios de la Corte Suprema; colección *Fallos*.
- Fueros: todos (la Corte interviene por recurso extraordinario).
- Cita: `Fallos: <tomo>:<página>` cuando conste; si no, número de causa y fecha.
- Búsqueda: [a verificar] parámetros por voz, texto libre, carátula, fecha.

### CIJ: Centro de Información Judicial
- URL: https://www.cij.gov.ar
- Cobertura: fallos recientes de la CSJN y de tribunales federales y nacionales difundidos
  como noticia, con PDF del fallo.
- Uso: útil para fallos recientes que todavía no están sumariados.

### SAIJ: Sistema Argentino de Información Jurídica
- URL: https://www.saij.gob.ar
- Cobertura: fallos y sumarios nacionales, federales y provinciales (incluye PBA y Córdoba).
- Búsqueda: [a verificar] según clientes de terceros, expone una API JSON pública sin
  autenticación, con facetas como `Tipo de Documento/Jurisprudencia/Fallo` y
  `Tipo de Documento/Jurisprudencia/Sumario`, paginación con offset y hasta 25 resultados
  por página.

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

## Provincia de Buenos Aires

### JUBA: Suprema Corte de Justicia de la Provincia de Buenos Aires
- URL: https://www.scba.gov.ar/jurisprudencia/ (acceso a JUBA SCBA, JUBA buscador general,
  JUBA Tribunal de Casación Penal, listado de sentencias SCBA, buscador de sentencias PBA).
- Cobertura: SCBA, Tribunal de Casación Penal, cámaras y tribunales de la provincia,
  incluido el fuero contencioso administrativo provincial.
- Cita: número de causa (p. ej. `C. 123.456`, `L. 123.456`, `A. 12.345`, `P. 123.456`) y fecha.
- Búsqueda: [a verificar] sumarios por voces, texto libre, tribunal y fecha; posible
  acceso al texto completo de la sentencia.

## Córdoba

### Poder Judicial de Córdoba: TSJ
- URL: https://www.justiciacordoba.gob.ar
- Cobertura: Tribunal Superior de Justicia (Salas Contencioso Administrativa, Penal,
  Civil y Comercial, Laboral) y cámaras provinciales.
- Cita: número de sentencia o auto, sala, fecha y autos.
- Búsqueda: [a verificar] ubicación y funcionamiento del buscador oficial de jurisprudencia.

## Fuentes secundarias (solo pistas)

Portales y revistas jurídicas (p. ej. Pensamiento Penal, Diario Judicial, Microjuris,
elDial). Varios requieren suscripción. Cualquier fallo hallado ahí se tiene que confirmar
en una fuente oficial antes de marcarlo como verificado.
