# Confiabilidad de la fuente y estado de verificación

El porcentaje **no es una estadística**: es un criterio de esta skill para que el lector sepa
de qué tipo de fuente sale el dato. Siempre se informa junto con el nombre de la fuente.

## 1. Porcentaje base según la fuente

| Fuente | % base | Motivo |
|---|---|---|
| CSJN: Secretaría de Jurisprudencia (sjconsulta) o texto del fallo publicado por la Corte | 95 % | Publicación oficial del propio tribunal |
| Sitio oficial del tribunal que dictó el fallo (JUBA/SCBA, TSJ Córdoba, PJN/cámaras) | 90 % | Publicación oficial del tribunal o de su poder judicial |
| CIJ (Centro de Información Judicial) | 90 % | Órgano de difusión oficial de la CSJN |
| SAIJ (Ministerio de Justicia de la Nación) | 85 % | Oficial, pero el sumario lo elabora un tercero distinto del tribunal |
| Revista o portal jurídico reconocido con texto completo del fallo | 60 % | No oficial; puede tener errores de transcripción |
| Nota periodística, blog, red social | 35 % | Sin control editorial jurídico |

## 2. Ajustes sobre el porcentaje base

| Situación | Ajuste |
|---|---|
| Solo se leyó el sumario, no el texto completo | −10 |
| Algún campo central (número, fecha o tribunal) no consta en la fuente | −10 |
| El dato está confirmado en dos fuentes oficiales independientes | +5 (tope 99 %) |

Nunca se informa 100 %.

## 3. Estado de verificación

- **Verificado**: el fallo se abrió en una fuente oficial en esta sesión y los datos
  coinciden.
- **Verificado parcialmente**: se abrió en fuente oficial, pero solo el sumario o faltan
  campos.
- **No verificado en fuente oficial**: solo aparece en fuentes secundarias. Se muestra
  igual, con la advertencia y el porcentaje que corresponda.

Un fallo que no se pudo abrir en ninguna fuente **no va en la lista**: va en
"Referencias no verificadas", sin datos.
