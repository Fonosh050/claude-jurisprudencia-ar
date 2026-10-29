#!/usr/bin/env node
// Conector SAIJ (Sistema Argentino de Información Jurídica, Ministerio de Justicia).
//
// SAIJ expone una API JSON pública sin autenticación:
//   /busqueda?r=<consulta>&o=<offset>&p=<cantidad>&f=<facetas>&s=<orden>&v=colapsada
//   /view-document?guid=<uuid>
// Cada resultado trae su ficha como JSON serializado dentro de "documentAbstract", y
// view-document la trae dentro de "data".
//
// Comportamiento verificado el 29/10/2026:
// - "+texto: ..." busca en el texto de los SUMARIOS (los fallos no tienen ese campo).
// - "+titulo: ..." busca en el título: en los fallos es la carátula, no el contenido.
// - Las frases van entre comillas. El conector exige todas las palabras y frases de
//   --texto y --caratula (AND); --consulta pasa una consulta Lucene sin modificar.
// - El total de la consulta está en la faceta Total → total; "totalSearchResults" es
//   la cantidad devuelta en la página.
// - SAIJ rechaza con 403 a muchas IP de servidores en la nube: correr desde una
//   computadora personal.
//
// Uso:
//   node saij.js buscar --texto '"plazo razonable" "sumario administrativo"' [--jurisdiccion Nacional] [--max 10]
//   node saij.js buscar --texto '"plazo razonable"' --solo-csjn
//   node saij.js buscar --caratula "Sulca" --tipo fallo --tribunal "CORTE SUPREMA DE JUSTICIA DE LA NACION"
//   node saij.js documento --id <uuid | id-infojus como FA23040046 o SUJ0042712> [--guardar-pdf <carpeta>]
//
// Salida: JSON normalizado por stdout. Lo que la fuente no trae queda en null.

const BASE = 'https://www.saij.gob.ar';
const FUENTE = 'SAIJ';
const TIPOS = {
  sumario: 'Tipo de Documento/Jurisprudencia/Sumario',
  fallo: 'Tipo de Documento/Jurisprudencia/Fallo',
  jurisprudencia: 'Tipo de Documento/Jurisprudencia',
};
const JURISDICCIONES = ['Nacional', 'Federal', 'Local', 'Internacional'];
const POR_PAGINA = 25;
const TRIBUNAL_CSJN = 'CORTE SUPREMA DE JUSTICIA DE LA NACION';
const TIMEOUT = 30000;

function parseArgs(argv) {
  const [comando, ...resto] = argv;
  const opts = {};
  for (let i = 0; i < resto.length; i++) {
    const a = resto[i];
    if (!a.startsWith('--')) throw new Error(`Argumento inesperado: ${a}`);
    const clave = a.slice(2);
    const sig = resto[i + 1];
    if (sig === undefined || sig.startsWith('--')) {
      opts[clave] = true;
    } else {
      opts[clave] = sig;
      i++;
    }
  }
  return { comando, opts };
}

async function getJSON(url) {
  let resp;
  try {
    resp = await fetch(url, { headers: { Accept: 'application/json' }, signal: AbortSignal.timeout(TIMEOUT) });
  } catch (e) {
    throw new Error(`No se pudo conectar con SAIJ: ${e.cause?.code || e.message}`);
  }
  if (resp.status === 403) {
    throw new Error(
      'SAIJ respondió 403 (acceso denegado). Suele pasar desde servidores en la nube: probá desde una computadora personal o consultá con WebFetch.'
    );
  }
  if (!resp.ok) throw new Error(`SAIJ respondió HTTP ${resp.status} para ${url}`);
  const texto = await resp.text();
  try {
    return JSON.parse(texto);
  } catch {
    throw new Error(`SAIJ no devolvió JSON para ${url} (¿cambió la API o hay una página de error?)`);
  }
}

function vacio(v) {
  return v === undefined || v === null || (typeof v === 'string' && v.trim() === '');
}

function texto(v) {
  if (vacio(v)) return null;
  if (typeof v === 'object') return vacio(v.texto) ? null : String(v.texto).trim();
  return String(v).replace(/\s+/g, ' ').trim();
}

// Texto largo (sumarios): SAIJ marca los párrafos con [[p]]...[[/p]]. Se conservan como
// saltos de línea.
function textoLargo(v) {
  if (vacio(v)) return null;
  const t = String(v)
    .replace(/\[\[\/p\]\]/gi, '\n')
    .replace(/\[\[[^\]]*\]\]/g, '')
    .split('\n')
    .map((l) => l.replace(/\s+/g, ' ').trim())
    .filter(Boolean)
    .join('\n');
  return t || null;
}

function fechaDMA(v) {
  const t = texto(v);
  if (!t) return null;
  const m = t.match(/^(\d{4})-(\d{2})-(\d{2})/);
  return m ? `${m[3]}/${m[2]}/${m[1]}` : t;
}

function lista(v) {
  if (vacio(v)) return [];
  return Array.isArray(v) ? v : [v];
}

function descriptores(content) {
  const d = content.descriptores;
  if (!d || typeof d !== 'object') return [];
  return lista(d.descriptor)
    .map((x) => texto(x?.elegido?.termino))
    .filter(Boolean);
}

function urlAmigable(meta) {
  const f = meta['friendly-url'] || {};
  if (f.subdomain && f.description && meta.uuid) return `${BASE}/${f.subdomain}/${f.description}/${meta.uuid}`;
  return meta.uuid ? `${BASE}/view-document?guid=${encodeURIComponent(meta.uuid)}` : null;
}

// Normaliza la ficha de un fallo o sumario. Sirve tanto para documentAbstract como para
// view-document (este último trae más campos).
function normalizar(doc) {
  const meta = doc.document?.metadata || {};
  const c = doc.document?.content || {};
  const tipoContenido = meta['document-content-type'] || null;
  const esSumario = !vacio(c['numero-sumario']);
  const jur = c.jurisdiccion;

  let caratula = texto(c.caratula);
  if (!caratula && !vacio(c.actor)) {
    // En los fallos SAIJ separa la carátula en actor / demandado / sobre: se unen tal como
    // vienen (los campos originales también se devuelven).
    caratula = [texto(c.actor), vacio(c.demandado) ? null : `c/ ${texto(c.demandado)}`, vacio(c.sobre) ? null : `s/ ${texto(c.sobre)}`]
      .filter(Boolean)
      .join(' ');
  }

  const out = {
    tipo: esSumario ? 'sumario' : tipoContenido === 'jurisprudencia' ? 'fallo' : tipoContenido,
    uuid: meta.uuid || null,
    id_infojus: texto(c['id-infojus']),
    numero: texto(esSumario ? c['numero-sumario'] : c['numero-fallo']),
    caratula,
    actor: texto(c.actor),
    demandado: texto(c.demandado),
    sobre: texto(c.sobre),
    tribunal: texto(c.tribunal),
    tipo_tribunal: texto(c['tipo-tribunal']),
    sala: texto(c.sala),
    instancia: texto(c.instancia),
    tipo_fallo: texto(c['tipo-fallo']),
    fecha: fechaDMA(c.fecha),
    jurisdiccion: jur && typeof jur === 'object' ? texto(jur.descripcion) : texto(jur),
    provincia: texto(c.provincia),
    localidad: texto(c.localidad),
    materia: texto(c.materia),
    magistrados: texto(c.magistrados),
    titulo: texto(c.titulo),
    descriptores: descriptores(c),
    texto: textoLargo(c.texto),
    sumarios_relacionados: lista(c['sumarios-relacionados']?.['sumario-relacionado']).map(String),
    pdf: null,
    enlace: urlAmigable(meta),
  };
  const td = c['texto-doc'];
  if (td && typeof td === 'object' && td.uuid) {
    out.pdf = `${BASE}/descarga-archivo?guid=${encodeURIComponent(td.uuid)}&name=${encodeURIComponent(td['file-name'] || 'fallo.pdf')}`;
  }
  return out;
}

function totalDeFacetas(sr) {
  const total = (sr.categoriesResultList || []).find((c) => c.facetName === 'Total');
  const hijo = total && (total.facetChildren || []).find((c) => c.facetName === 'total');
  return hijo ? Math.round(Number(hijo.facetHits)) : 0;
}

// Cada palabra o "frase entre comillas" pasa a ser obligatoria en el campo: en SAIJ
// "+texto: a b" solo aplica el campo y el "+" al primer término.
function terminosObligatorios(campo, valor) {
  const terminos = valor.match(/"[^"]+"|[^\s"]+/g) || [];
  return terminos
    .map((t) => t.replace(/^\+/, ''))
    .filter((t) => t && t !== '""')
    .map((t) => `+${campo}: ${t}`);
}

function armarConsulta(opts, tipo) {
  const partes = [];
  if (typeof opts.texto === 'string') partes.push(...terminosObligatorios('texto', opts.texto));
  if (typeof opts.caratula === 'string') partes.push(...terminosObligatorios('titulo', opts.caratula));
  if (typeof opts.consulta === 'string' && opts.consulta.trim()) partes.push(opts.consulta.trim());
  if (partes.length === 0) throw new Error('Falta --texto, --caratula o --consulta');
  // Los sumarios de la CSJN en SAIJ se numeran con prefijo "A" (verificado en muestras el
  // 29/10/2026: todos tipo-tribunal CS, jurisdicción Federal). Los sumarios no tienen
  // faceta de tribunal, así que se filtra por número.
  if (opts['solo-csjn'] && tipo === 'sumario') partes.push('+numero-sumario: A*');
  return partes.join(' ');
}

function armarFacetas(opts, tipo) {
  const f = ['Total', TIPOS[tipo], 'Fecha'];
  const tribunal = typeof opts.tribunal === 'string' ? opts.tribunal.trim() : opts['solo-csjn'] && tipo !== 'sumario' ? TRIBUNAL_CSJN : null;
  f.push(tribunal ? `Tribunal/${tribunal}` : 'Tribunal');
  f.push(typeof opts.jurisdiccion === 'string' ? `Jurisdicción/${opts.jurisdiccion}` : 'Jurisdicción');
  return f.join('|');
}

function urlBusqueda(r, f, offset, cantidad) {
  const q = new URLSearchParams({ r, o: String(offset), p: String(cantidad), f, s: 'fecha-rango|DESC', v: 'colapsada' });
  return `${BASE}/busqueda?${q}`;
}

async function buscar(opts) {
  // Con --texto la búsqueda va a sumarios (único tipo con ese campo); si no, a fallos.
  const tipo = typeof opts.tipo === 'string' ? opts.tipo : typeof opts.texto === 'string' ? 'sumario' : 'fallo';
  if (!TIPOS[tipo]) throw new Error(`--tipo inválido: "${tipo}". Opciones: ${Object.keys(TIPOS).join(', ')}`);
  if (typeof opts.jurisdiccion === 'string' && !JURISDICCIONES.includes(opts.jurisdiccion)) {
    throw new Error(`--jurisdiccion inválida: "${opts.jurisdiccion}". Opciones: ${JURISDICCIONES.join(', ')}`);
  }
  const max = opts.max === undefined ? 10 : parseInt(opts.max, 10);
  const desde = opts.offset === undefined ? 0 : parseInt(opts.offset, 10);
  if (!Number.isInteger(max) || max < 1) throw new Error('--max tiene que ser un entero positivo');
  if (!Number.isInteger(desde) || desde < 0) throw new Error('--offset tiene que ser un entero no negativo');

  const r = armarConsulta(opts, tipo);
  const f = armarFacetas(opts, tipo);
  const advertencias = [];
  if (tipo === 'fallo' && typeof opts.texto === 'string') {
    advertencias.push('El campo "texto" solo existe en sumarios: con --tipo fallo la búsqueda por --texto puede no traer resultados.');
  }
  if (typeof opts.caratula === 'string' && tipo === 'sumario') {
    advertencias.push('En sumarios, "titulo" son las voces del sumario, no la carátula.');
  }

  const resultados = [];
  let total = null;
  const urls = [];
  let offset = desde;
  while (resultados.length < max) {
    const cantidad = Math.min(POR_PAGINA, max - resultados.length);
    const url = urlBusqueda(r, f, offset, cantidad);
    urls.push(url);
    const data = await getJSON(url);
    const sr = data.searchResults || {};
    if (total === null) total = totalDeFacetas(sr);
    const docs = sr.documentResultList || [];
    for (const d of docs) {
      try {
        resultados.push(normalizar(JSON.parse(d.documentAbstract)));
      } catch {
        advertencias.push('Se descartó un resultado cuya ficha no se pudo leer.');
      }
    }
    if (docs.length < cantidad) break;
    offset += docs.length;
  }

  if (opts['solo-csjn'] && tipo === 'sumario') {
    advertencias.push(
      'Filtro CSJN por prefijo "A" del número de sumario: confirmá con "documento" que tipo_tribunal sea CS y jurisdiccion Federal.'
    );
  }
  if (tipo === 'sumario') {
    advertencias.push(
      'Las fichas de búsqueda de los sumarios no traen carátula ni tribunal: usá el subcomando "documento" con el uuid para obtenerlos.'
    );
  }
  return {
    fuente: FUENTE,
    consulta: { r, facetas: f, tipo, max, offset: desde },
    consultado_en: new Date().toISOString(),
    urls_consultadas: urls,
    total,
    cantidad_devuelta: resultados.length,
    resultados,
    advertencias,
  };
}

async function documento(opts) {
  const id = typeof opts.id === 'string' ? opts.id.trim() : '';
  if (!id) throw new Error('Falta --id (uuid o id-infojus)');
  let uuid = id;
  const urls = [];
  if (!id.startsWith('123456789')) {
    // id-infojus (p. ej. FA23040046, SUJ0042712): se resuelve a uuid con una búsqueda.
    const url = urlBusqueda(`id-infojus:${id}`, 'Total', 0, 1);
    urls.push(url);
    const docs = (await getJSON(url)).searchResults?.documentResultList || [];
    if (docs.length === 0) {
      return {
        fuente: FUENTE,
        consultado_en: new Date().toISOString(),
        id,
        encontrado: false,
        urls_consultadas: urls,
        advertencias: [`SAIJ no tiene ningún documento con id-infojus ${id}.`],
      };
    }
    uuid = JSON.parse(docs[0].documentAbstract).document.metadata.uuid;
  }
  const url = `${BASE}/view-document?guid=${encodeURIComponent(uuid)}`;
  urls.push(url);
  const data = await getJSON(url);
  if (vacio(data.data)) {
    return {
      fuente: FUENTE,
      consultado_en: new Date().toISOString(),
      id,
      encontrado: false,
      urls_consultadas: urls,
      advertencias: [`SAIJ no devolvió el documento ${uuid}.`],
    };
  }
  const ficha = normalizar(JSON.parse(data.data));
  const advertencias = [];
  let pdfGuardado = null;
  if (ficha.pdf && typeof opts['guardar-pdf'] === 'string') {
    pdfGuardado = await guardarPdf(ficha.pdf, opts['guardar-pdf'], ficha.numero || ficha.uuid);
  }
  if (ficha.tipo === 'fallo' && ficha.pdf) {
    advertencias.push('El texto completo del fallo está en el PDF: la resolución (parte dispositiva) hay que leerla ahí.');
  }
  if (ficha.tipo === 'fallo' && !ficha.pdf) {
    advertencias.push('SAIJ no tiene el texto completo de este fallo.');
  }
  return {
    fuente: FUENTE,
    consultado_en: new Date().toISOString(),
    id,
    encontrado: true,
    ...ficha,
    pdf_guardado: pdfGuardado,
    urls_consultadas: urls,
    advertencias,
  };
}

async function guardarPdf(url, carpeta, nombre) {
  const fs = require('fs');
  const path = require('path');
  let resp;
  try {
    resp = await fetch(url, { signal: AbortSignal.timeout(TIMEOUT * 2) });
  } catch (e) {
    throw new Error(`No se pudo descargar el PDF: ${e.cause?.code || e.message}`);
  }
  if (!resp.ok) throw new Error(`SAIJ respondió HTTP ${resp.status} al descargar el PDF`);
  const buf = Buffer.from(await resp.arrayBuffer());
  if (buf.subarray(0, 5).toString() !== '%PDF-') throw new Error('La descarga del texto completo no es un PDF');
  fs.mkdirSync(carpeta, { recursive: true });
  const destino = path.resolve(carpeta, `saij-${String(nombre).replace(/[^\w.-]/g, '_')}.pdf`);
  fs.writeFileSync(destino, buf);
  return destino;
}

async function main() {
  const { comando, opts } = parseArgs(process.argv.slice(2));
  const comandos = { buscar, documento };
  if (!comandos[comando]) {
    process.stderr.write(
      'Uso:\n' +
        '  node saij.js buscar --texto \'"frase exacta" palabra\' [--solo-csjn] [--jurisdiccion Nacional|Federal|Local] [--max N] [--offset N]\n' +
        '  node saij.js buscar --caratula "<partes>" [--tipo fallo] [--tribunal "CORTE SUPREMA DE JUSTICIA DE LA NACION"]\n' +
        '  node saij.js documento --id <uuid | id-infojus> [--guardar-pdf <carpeta>]\n'
    );
    process.exit(2);
  }
  const out = await comandos[comando](opts);
  process.stdout.write(JSON.stringify(out, null, 2) + '\n');
}

if (require.main === module) {
  main().catch((e) => {
    process.stdout.write(JSON.stringify({ fuente: FUENTE, error: e.message }, null, 2) + '\n');
    process.exit(1);
  });
}

module.exports = { buscar, documento, terminosObligatorios, normalizar, totalDeFacetas, armarConsulta, armarFacetas, urlBusqueda };
