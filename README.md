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

### Conectores (opcional)

Los conectores de `scripts/` necesitan Node 18+. SAIJ y CSJN no tienen dependencias;
JUBA necesita Playwright y Chromium:

```bash
cd ~/jurisprudencia-ar/skills/jurisprudencia-ar/scripts && npm install && npx playwright install chromium
```

Ver `skills/jurisprudencia-ar/scripts/README.md`.

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
- [x] Verificar en vivo el acceso a cada fuente (resumen en `references/fuentes.md`).
- [x] Conector JUBA (SCBA): `skills/jurisprudencia-ar/scripts/juba.js`.
- [x] Conector SAIJ: `skills/jurisprudencia-ar/scripts/saij.js` (búsqueda y ficha).
- [x] Conector CSJN: `skills/jurisprudencia-ar/scripts/csjn.js` (solo ficha del fallo: el
      buscador de la Corte exige captcha; para buscar fallos de la Corte se usa SAIJ).
- [ ] Córdoba: Jurisemia exige captcha, así que no tiene conector automático.
- [ ] Correr los casos de `evals/evals.json` y ajustar.

## Aviso

Esta herramienta no reemplaza la consulta directa de las bases oficiales ni la lectura
completa del fallo antes de citarlo.
