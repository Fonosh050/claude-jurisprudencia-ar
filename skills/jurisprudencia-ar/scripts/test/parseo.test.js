// Pruebas de parseo sin red. Los fixtures reproducen la estructura de las respuestas
// reales de SAIJ y de la CSJN observadas el 29/10/2026.
const test = require('node:test');
const assert = require('node:assert');
const saij = require('../saij.js');
const csjn = require('../csjn.js');

test('SAIJ: cada palabra o frase es obligatoria en su campo', () => {
  assert.deepStrictEqual(saij.terminosObligatorios('texto', '"plazo razonable" +sumario'), [
    '+texto: "plazo razonable"',
    '+texto: sumario',
  ]);
  assert.strictEqual(
    saij.armarConsulta({ texto: '"plazo razonable"', 'solo-csjn': true }, 'sumario'),
    '+texto: "plazo razonable" +numero-sumario: A*'
  );
  assert.throws(() => saij.armarConsulta({}, 'fallo'), /Falta --texto/);
});

test('SAIJ: --solo-csjn en fallos usa la faceta de tribunal', () => {
  assert.match(saij.armarFacetas({ 'solo-csjn': true }, 'fallo'), /Tribunal\/CORTE SUPREMA DE JUSTICIA DE LA NACION/);
  assert.match(saij.armarFacetas({ 'solo-csjn': true }, 'sumario'), /\|Tribunal\|/);
});

test('SAIJ: el total sale de la faceta Total → total', () => {
  const sr = { totalSearchResults: 1, categoriesResultList: [{ facetName: 'Total', facetChildren: [{ facetName: 'total', facetHits: 394.0 }] }] };
  assert.strictEqual(saij.totalDeFacetas(sr), 394);
  assert.strictEqual(saij.totalDeFacetas({}), 0);
});

test('SAIJ: normaliza un fallo', () => {
  const f = saij.normalizar({
    document: {
      metadata: {
        uuid: '123456789-640-0403-2ots-eupmocsollaf',
        'document-content-type': 'jurisprudencia',
        'friendly-url': { subdomain: 'sentencia', description: 'altamirano-fa23040046-2023-03-07' },
      },
      content: {
        'numero-fallo': 23040046,
        tribunal: 'CAMARA NACIONAL DE APELACIONES DEL TRABAJO',
        jurisdiccion: { codigo: 'NACIONAL', descripcion: 'Nacional' },
        fecha: '2023-03-07',
        actor: 'Altamirano, Emilse Fabiana',
        demandado: 'Morillo, María Lujan y otros',
        sobre: 'despido',
        'sumarios-relacionados': { 'sumario-relacionado': 'E0024633' },
        'texto-doc': { uuid: 'rstuvwfa-llos-comp-uest-o23040046pdf', 'file-name': '23040046.PDF' },
        'id-infojus': 'FA23040046',
      },
    },
  });
  assert.strictEqual(f.tipo, 'fallo');
  assert.strictEqual(f.fecha, '07/03/2023');
  assert.strictEqual(f.caratula, 'Altamirano, Emilse Fabiana c/ Morillo, María Lujan y otros s/ despido');
  assert.strictEqual(f.jurisdiccion, 'Nacional');
  assert.deepStrictEqual(f.sumarios_relacionados, ['E0024633']);
  assert.match(f.pdf, /descarga-archivo\?guid=rstuvwfa-llos-comp-uest-o23040046pdf&name=23040046.PDF/);
  assert.strictEqual(f.enlace, 'https://www.saij.gob.ar/sentencia/altamirano-fa23040046-2023-03-07/123456789-640-0403-2ots-eupmocsollaf');
  assert.strictEqual(f.magistrados, null);
});

test('SAIJ: normaliza un sumario y limpia las marcas de párrafo', () => {
  const s = saij.normalizar({
    document: {
      metadata: { uuid: 'u1', 'document-content-type': 'sumario' },
      content: {
        'numero-sumario': 'J0042712',
        texto: '[[p]]Primer   párrafo.[[/p]][[p]]Segundo.[[/p]]',
        descriptores: { descriptor: [{ elegido: { termino: 'personal municipal' } }, { elegido: { termino: 'sumario administrativo' } }] },
      },
    },
  });
  assert.strictEqual(s.tipo, 'sumario');
  assert.strictEqual(s.texto, 'Primer párrafo.\nSegundo.');
  assert.deepStrictEqual(s.descriptores, ['personal municipal', 'sumario administrativo']);
  assert.strictEqual(s.fecha, null);
  assert.strictEqual(s.caratula, null);
});

test('CSJN: lee las variables de la ficha (última asignación no vacía)', () => {
  const html = `<title>Telef&oacute;nica c/ Municipalidad</title><script>
    var idDocumento = 7535142; var idAnalisis = '753514'; var analisisPublico = 'S';
    var numeroID = ''; var anioFallo = '';
    $(document).ready(function() { var tomo = ''; var pagina = '';
      tomo = '342'; pagina = '1061'; numeroID = '3441'; anioFallo = '2019'; fecha = '02/07/2019';
      autos = "Telef\\u00F3nica M\\u00F3viles c\\/ Municipalidad de Gral. G\\u00FCemes s\\/ acci\\u00F3n\\r\\ndeclarativa ";
    });</script>`;
  const v = csjn.variablesFicha(html);
  assert.strictEqual(v.idDocumento, '7535142');
  assert.strictEqual(v.idAnalisis, '753514');
  assert.strictEqual(v.tomo, '342');
  assert.strictEqual(v.pagina, '1061');
  assert.strictEqual(v.numeroID, '3441');
  assert.strictEqual(v.fecha, '02/07/2019');
  assert.strictEqual(v.autos, 'Telefónica Móviles c/ Municipalidad de Gral. Güemes s/ acción declarativa');
  assert.strictEqual(v.titulo, 'Telefónica c/ Municipalidad');
});

test('CSJN: arma referencias normativas y análisis', () => {
  assert.deepStrictEqual(
    csjn.referenciaNormativa({ norma: { valor: 'ORDENANZA' }, numeroNorma: 299, anioNorma: 2010, jurisdiccion: { valor: 'SALTA' }, articulo: '17', inconstitucional: 'S' }),
    { norma: 'ORDENANZA 299/2010 (SALTA) art. 17', declarada_inconstitucional: true }
  );
  const a = csjn.analisis({
    sentidoPronunciamiento: { valor: 'REVOCA' },
    tipoRecurso: { valor: 'RECURSO DE QUEJA' },
    identificacionExpediente: 'FSA 011000507/2010/1/RH001',
    inconstitucional: true,
    materias: [{ valor: 'ADMINISTRATIVO' }],
    referenciasNormativas: [],
  });
  assert.strictEqual(a.sentido_del_pronunciamiento, 'REVOCA');
  assert.strictEqual(a.tipo_de_recurso, 'RECURSO DE QUEJA');
  assert.strictEqual(a.declara_inconstitucionalidad, true);
  assert.strictEqual(a.competencia, null);
});

test('CSJN: extrae los fallos que citan, sin duplicados', () => {
  const html =
    "<a href='/sjconsulta/documentos/getDocumentosExterno.html?idAnalisis=830716' onclick='x'>Fallos: 349:905</a>" +
    "<a href='/sjconsulta/documentos/getDocumentosExterno.html?idAnalisis=830716' onclick='x'>Fallos: 349:905</a>" +
    "<a href='/sjconsulta/documentos/getDocumentosExterno.html?idAnalisis=817036' onclick='x'>Fallos: 348:1383</a>";
  assert.deepStrictEqual(csjn.citantes(html), [
    { cita: 'Fallos: 349:905', id_analisis: '830716' },
    { cita: 'Fallos: 348:1383', id_analisis: '817036' },
  ]);
  assert.deepStrictEqual(csjn.citantes(null), []);
});
