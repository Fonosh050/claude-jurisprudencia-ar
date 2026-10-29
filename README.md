# jurisprudencia-ar

Skill para Claude Code que busca jurisprudencia argentina en fuentes oficiales del Poder
Judicial (CSJN, tribunales nacionales y federales, Provincia de Buenos Aires y Córdoba) y
devuelve fallos verificados, sin inventar datos.

Para cada fallo informa: carátula, número de fallo, tribunal, fecha, sumario, normativa en
pugna, resolución, vigencia, estado de verificación, porcentaje de confiabilidad de la
fuente y enlace.

Fueros prioritarios: contencioso administrativo, penal, comercial, civil y laboral.

## Instalación

Para todos tus proyectos:

```bash
git clone <URL-del-repo> ~/jurisprudencia-ar
```

```bash
mkdir -p ~/.claude/skills && ln -s ~/jurisprudencia-ar/skills/jurisprudencia-ar ~/.claude/skills/jurisprudencia-ar
```

Para un solo proyecto, copiá `skills/jurisprudencia-ar` en `.claude/skills/` del proyecto.

### Permisos recomendados

Para que Claude Code consulte las fuentes sin pedir permiso en cada llamada, agregá en
`.claude/settings.json` (o `~/.claude/settings.json`):

```json
{
  "permissions": {
    "allow": [
      "WebFetch(domain:www.saij.gob.ar)",
      "WebFetch(domain:sjconsulta.csjn.gov.ar)",
      "WebFetch(domain:www.csjn.gov.ar)",
      "WebFetch(domain:www.cij.gov.ar)",
      "WebFetch(domain:www.pjn.gov.ar)",
      "WebFetch(domain:www.scba.gov.ar)",
      "WebFetch(domain:juba.scba.gov.ar)",
      "WebFetch(domain:www.justiciacordoba.gob.ar)"
    ]
  }
}
```

## Uso

Pedile a Claude, por ejemplo:

> Buscá jurisprudencia de la SCBA sobre responsabilidad del Estado por falta de servicio
> en hospitales públicos, de 2020 en adelante.

## Estado y hoja de ruta

- [x] Reglas anti-invención, formato de salida y escala de confiabilidad.
- [x] Mapa de fuentes por jurisdicción y fuero.
- [ ] Verificar en vivo los buscadores de cada fuente (marcados como *[a verificar]* en
      `references/fuentes.md`).
- [ ] Conectores en `scripts/` con salida JSON normalizada (SAIJ, CSJN, JUBA, Córdoba).
- [ ] Correr los casos de `evals/evals.json` y ajustar.

## Aviso

Esta herramienta no reemplaza la consulta directa de las bases oficiales ni la lectura
completa del fallo antes de citarlo.
