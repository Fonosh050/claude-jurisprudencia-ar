# Formato de salida

Encabezado de la respuesta:

```
## Jurisprudencia: <tema>
Fuero: <fuero/s> · Jurisdicción: <jurisdicción/es> · Período: <período o "sin límite">
Fuentes consultadas: <lista, indicando cuáles no respondieron o bloquearon el acceso>
Resultados verificados: <n>
```

Por cada fallo, en este orden:

```
### <n>. <Carátula tal como figura en la fuente>

| Campo | Dato |
|---|---|
| Número de fallo | <Fallos: t. p. / n.º de causa / n.º de registro / n.º de sentencia> |
| Tribunal | <tribunal, sala> |
| Fecha | <dd/mm/aaaa> |
| Fuero | <fuero> |
| Sumario | <2 a 4 líneas, fiel a la fuente> |
| Normativa en pugna | <normas discutidas: ley, artículo, decreto, ordenanza, artículo constitucional> |
| Resolución | <parte dispositiva: qué decidió el tribunal> |
| Vigencia | <Sin revocación conocida a la fecha de consulta / Revocado por ... / Vigencia no verificada> |
| Estado de verificación | <Verificado / Verificado parcialmente / No verificado en fuente oficial> |
| Confiabilidad de la fuente | <NN %> — <nombre de la fuente> |
| Enlace | <URL exacta abierta> |
```

Cualquier campo que no figure en la fuente: **`No consta en la fuente`**.

Cierre de la respuesta:

```
### Referencias no verificadas
<fallos conocidos o mencionados por fuentes secundarias que no se pudieron abrir en una
fuente oficial; solo carátula aproximada y motivo de la falta de verificación. Omitir la
sección si no hay ninguno.>

### Advertencias
- <fuentes caídas o bloqueadas, filtros que no se pudieron aplicar, etc.>
- Esta búsqueda no reemplaza la consulta de las bases oficiales ni la lectura completa
  del fallo antes de citarlo.
```
