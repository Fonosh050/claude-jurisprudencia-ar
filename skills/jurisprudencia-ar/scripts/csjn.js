#!/usr/bin/env node
// Conector CSJN (Secretaría de Jurisprudencia, sjconsulta.csjn.gov.ar).
//
// El BUSCADOR de sumarios de la Corte exige reCAPTCHA Enterprise, así que este conector
// no busca: lee la ficha oficial de un fallo ya identificado. Para encontrar fallos de la
// Corte por tema usar SAIJ (saij.js, faceta de tribunal) u otra fuente, y después
// confirmarlos acá. Endpoints públicos que usa (verificados el 29/10/2026):
//   /documentos/verDocumentoByIdLinksJSP.html?idDocumento=N  → autos, fecha, Fallos tomo:página
//   /documentos/getDocumentosExterno.html?idAnalisis=N       → lo mismo, a partir del análisis
//   /fallos/abrirAnalisis.html?idAnalisis=N                  → análisis documental (JSON)
//   /sumarios/getSumariosAnalisis.html?idAnalisis=N          → sumarios oficiales (JSON)
//   /documentos/getCitantes.html?idDocumento=N               → fallos posteriores que lo citan
//   /documentos/verDocumentoById.html?idDocumento=N          → PDF del fallo
//
// Uso:
//   node csjn.js fallo --id <idDocumento> [--sin-sumarios] [--guardar-pdf <carpeta>]
//   node csjn.js fallo --analisis <idAnalisis> [...]
//
// Salida: JSON normalizado por stdout. Lo que la fuente no trae queda en null.

const BASE = 'https://sjconsulta.csjn.gov.ar/sjconsulta';
const FUENTE = 'CSJN - Secretaría de Jurisprudencia';
const TIMEOUT = 45000;

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

async function pedir(ruta) {
  const url = `${BASE}${ruta}`;
  let resp;
  try {
    resp = await fetch(url, { signal: AbortSignal.timeout(TIMEOUT) });
  } catch (e) {
    throw new Error(`No se pudo conectar con la CSJN: ${e.cause?.code || e.message}`);
  }
  if (resp.status === 403) throw new Error(`La CSJN respondió 403 (acceso denegado) para ${url}`);
  if (!resp.ok) throw new Error(`La CSJN respondió HTTP ${resp.status} para ${url}`);
  return { url, resp };
}

async function pedirTexto(ruta) {
  const { url, resp } = await pedir(ruta);
  return { url, texto: await resp.text() };
}

async function pedirJSON(ruta) {
  const { url, texto } = await pedirTexto(ruta);
  if (texto.trim() === '') return { url, json: null };
  try {
    return { url, json: JSON.parse(texto) };
  } catch {
    throw new Error(`La CSJN no devolvió JSON para ${url}`);
  }
}

function vacio(v) {
  return v === undefined || v === null || (typeof v === 'string' && v.trim() === '');
}

function limpio(v) {
  if (vacio(v)) return null;
  return String(v).replace(/\s+/g, ' ').trim();
}

function valor(v) {
  return v && typeof v === 'object' ? limpio(v.valor) : null;
}

function decodificarEntidades(s) {
  const nombres = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ' };
  return s.replace(/&(#\d+|#x[0-9a-f]+|[a-z]+);/gi, (m, e) => {
    if (e[0] === '#') return String.fromCodePoint(e[1].toLowerCase() === 'x' ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10));
    const l = e.toLowerCase();
    if (nombres[l]) return nombres[l];
    const acentos = { aacute: 'á', eacute: 'é', iacute: 'í', oacute: 'ó', uacute: 'ú', ntilde: 'ñ', uuml: 'ü' };
    const may = { Aacute: 'Á', Eacute: 'É', Iacute: 'Í', Oacute: 'Ó', Uacute: 'Ú', Ntilde: 'Ñ', Uuml: 'Ü' };
    return may[e] || acentos[l] || m;
  });
}

// La ficha HTML del fallo trae los datos en variables de JavaScript:
//   var idDocumento = 7535142;  var idAnalisis = '753514';  tomo = '342';  autos = "...";
function variablesFicha(html) {
  // Algunas variables se declaran vacías y se asignan más abajo: vale la última no vacía.
  const simple = (nombre) => {
    const valores = [...html.matchAll(new RegExp(`\\b${nombre}\\s*=\\s*'([^']*)'\\s*;`, 'g'))]
      .map((m) => m[1])
      .filter((x) => x.trim() !== '');
    return valores.length ? valores[valores.length - 1] : null;
  };
  const numero = (nombre) => {
    const m = html.match(new RegExp(`\\bvar\\s+${nombre}\\s*=\\s*(\\d+)\\s*;`));
    return m ? m[1] : null;
  };
  let autos = null;
  const ma = html.match(/\bautos\s*=\s*("(?:[^"\\]|\\.)*")\s*;/);
  if (ma) {
    try {
      autos = JSON.parse(ma[1]);
    } catch {
      autos = ma[1].slice(1, -1);
    }
  }
  const titulo = html.match(/<title>([\s\S]*?)<\/title>/i);
  return {
    idDocumento: numero('idDocumento'),
    idAnalisis: simple('idAnalisis'),
    analisisPublico: simple('analisisPublico'),
    tomo: simple('tomo'),
    pagina: simple('pagina'),
    numeroID: simple('numeroID'),
    anioFallo: simple('anioFallo'),
    fecha: simple('fecha'),
    autos: limpio(autos),
    titulo: titulo ? limpio(decodificarEntidades(titulo[1])) : null,
  };
}

function referenciaNormativa(r) {
  const partes = [valor(r.norma)];
  if (!vacio(r.numeroNorma)) partes.push(String(r.numeroNorma) + (vacio(r.anioNorma) ? '' : `/${r.anioNorma}`));
  if (!vacio(r.denominacion)) partes.push(limpio(r.denominacion));
  if (r.jurisdiccion) partes.push(`(${valor(r.jurisdiccion)})`);
  if (!vacio(r.articulo)) partes.push(`art. ${limpio(r.articulo)}`);
  if (!vacio(r.inciso)) partes.push(`inc. ${limpio(r.inciso)}`);
  if (!vacio(r.parrafo)) partes.push(`párr. ${limpio(r.parrafo)}`);
  if (!vacio(r.apartado)) partes.push(`ap. ${limpio(r.apartado)}`);
  return {
    norma: partes.filter(Boolean).join(' '),
    declarada_inconstitucional: r.inconstitucional === 'S',
  };
}

function analisis(a) {
  const exp = a.reciboEntrada?.reciboEntradaExpedientes?.[0]?.expediente;
  return {
    caratula_expediente: limpio(a.caratula),
    expediente: limpio(a.identificacionExpediente),
    tribunal_de_origen: limpio(exp?.camara?.descripcionLarga || exp?.camara?.descripcion),
    objeto_del_juicio: limpio(exp?.objetoJuicio?.descripcion),
    competencia: valor(a.competencia),
    tipo_de_recurso: valor(a.tipoRecurso) || limpio(a.recursoExpediente?.tipoRecurso?.descripcion),
    sentido_del_pronunciamiento: valor(a.sentidoPronunciamiento),
    declara_inconstitucionalidad: a.inconstitucional === true,
    materias: (a.materias || []).map(valor).filter(Boolean),
    voces: (a.voces || []).map((v) => valor(v.tipoVoz)).filter(Boolean),
    cuestiones_federales: (a.cuestionesFederales || []).map((c) => valor(c.tipoCuestionFederal)).filter(Boolean),
    referencias_normativas: (a.referenciasNormativas || []).map(referenciaNormativa),
    votos: limpio(a.stringVotosAnalisis),
    fallo_destacado: limpio(a.falloDestacado?.titulo),
  };
}

function sumario(s) {
  return {
    id: s.id ?? null,
    voces: limpio(s.voces),
    texto: limpio(s.texto),
    fallos: !vacio(s.tomo) && !vacio(s.pagina) ? `${s.tomo}:${s.pagina}` : null,
    fecha: limpio(s.fechaString),
    votos: limpio(s.stringVotosAnalisis),
  };
}

function citantes(htmlJson) {
  // getCitantes devuelve HTML (como string JSON) con enlaces "Fallos: t:p" agrupados por año.
  const html = typeof htmlJson === 'string' ? htmlJson : '';
  const vistos = new Set();
  const out = [];
  for (const m of html.matchAll(/idAnalisis=(\d+)[^>]*>([^<]+)</g)) {
    if (vistos.has(m[1])) continue;
    vistos.add(m[1]);
    out.push({ cita: limpio(decodificarEntidades(m[2])), id_analisis: m[1] });
  }
  return out;
}

async function fallo(opts) {
  const porDocumento = typeof opts.id === 'string' && /^\d+$/.test(opts.id.trim());
  const porAnalisis = typeof opts.analisis === 'string' && /^\d+$/.test(opts.analisis.trim());
  if (!porDocumento && !porAnalisis) throw new Error('Falta --id <idDocumento> o --analisis <idAnalisis> (numéricos)');

  const urls = [];
  const advertencias = [];
  const ruta = porDocumento
    ? `/documentos/verDocumentoByIdLinksJSP.html?idDocumento=${opts.id.trim()}`
    : `/documentos/getDocumentosExterno.html?idAnalisis=${opts.analisis.trim()}`;
  let ficha;
  try {
    ficha = await pedirTexto(ruta);
  } catch (e) {
    // Con un identificador inexistente la CSJN responde HTTP 500.
    if (!/HTTP 500/.test(e.message)) throw e;
    ficha = { url: `${BASE}${ruta}`, texto: '' };
  }
  urls.push(ficha.url);
  const v = variablesFicha(ficha.texto);

  const idDocumento = v.idDocumento || (porDocumento ? opts.id.trim() : null);
  if (!v.autos && !v.fecha && !v.idAnalisis) {
    return {
      fuente: FUENTE,
      consultado_en: new Date().toISOString(),
      encontrado: false,
      id_documento: porDocumento ? opts.id.trim() : null,
      id_analisis: porAnalisis ? opts.analisis.trim() : null,
      urls_consultadas: urls,
      advertencias: ['La CSJN no devolvió datos para ese identificador (o respondió con error): puede que no exista.'],
    };
  }

  const out = {
    fuente: FUENTE,
    consultado_en: new Date().toISOString(),
    encontrado: true,
    id_documento: idDocumento,
    id_analisis: vacio(v.idAnalisis) ? null : v.idAnalisis,
    caratula: v.autos || v.titulo,
    fecha: limpio(v.fecha),
    fallos: !vacio(v.tomo) && !vacio(v.pagina) ? `Fallos: ${v.tomo}:${v.pagina}` : null,
    cita_cs: !vacio(v.anioFallo) && !vacio(v.numeroID) ? `CS ${v.anioFallo}:${v.numeroID}` : null,
    analisis: null,
    sumarios: null,
    citado_por: null,
    enlace: idDocumento ? `${BASE}/documentos/verDocumentoByIdLinksJSP.html?idDocumento=${idDocumento}` : null,
    pdf: idDocumento ? `${BASE}/documentos/verDocumentoById.html?idDocumento=${idDocumento}` : null,
    pdf_guardado: null,
  };

  if (out.id_analisis && v.analisisPublico === 'S') {
    const a = await pedirJSON(`/fallos/abrirAnalisis.html?idAnalisis=${out.id_analisis}`);
    urls.push(a.url);
    if (a.json) out.analisis = analisis(a.json);
    if (!opts['sin-sumarios']) {
      const s = await pedirJSON(`/sumarios/getSumariosAnalisis.html?idAnalisis=${out.id_analisis}`);
      urls.push(s.url);
      out.sumarios = Array.isArray(s.json) ? s.json.filter((x) => x.publico !== 'N').map(sumario) : [];
    }
  } else {
    advertencias.push('El fallo no tiene análisis documental público: no hay datos de recurso, sentido del pronunciamiento ni normativa.');
  }

  if (idDocumento) {
    const c = await pedirJSON(`/documentos/getCitantes.html?idDocumento=${idDocumento}`);
    urls.push(c.url);
    out.citado_por = citantes(c.json);
  }

  if (idDocumento && typeof opts['guardar-pdf'] === 'string') {
    out.pdf_guardado = await guardarPdf(idDocumento, opts['guardar-pdf']);
  }

  if (!out.fallos) advertencias.push('La ficha no informa tomo y página de Fallos.');
  advertencias.push(
    'El sentido del pronunciamiento es una clasificación de la Secretaría de Jurisprudencia: la parte dispositiva textual está en el PDF.'
  );
  if (out.citado_por && out.citado_por.length) {
    advertencias.push('"citado_por" lista fallos posteriores que lo citan; revisarlos si hace falta controlar si la doctrina se mantuvo.');
  }
  return { ...out, urls_consultadas: urls, advertencias };
}

async function guardarPdf(idDocumento, carpeta) {
  const fs = require('fs');
  const path = require('path');
  const { resp } = await pedir(`/documentos/verDocumentoById.html?idDocumento=${idDocumento}`);
  const buf = Buffer.from(await resp.arrayBuffer());
  if (buf.subarray(0, 5).toString() !== '%PDF-') throw new Error('La descarga del fallo no es un PDF');
  fs.mkdirSync(carpeta, { recursive: true });
  const destino = path.resolve(carpeta, `csjn-${idDocumento}.pdf`);
  fs.writeFileSync(destino, buf);
  return destino;
}

async function main() {
  const { comando, opts } = parseArgs(process.argv.slice(2));
  if (comando === 'buscar') {
    throw new Error(
      'El buscador de la CSJN exige reCAPTCHA y este conector no lo evade. Buscá con saij.js (--tipo fallo --tribunal "CORTE SUPREMA DE JUSTICIA DE LA NACION") o en sjconsulta.csjn.gov.ar, y confirmá cada fallo con "csjn.js fallo".'
    );
  }
  if (comando !== 'fallo') {
    process.stderr.write(
      'Uso:\n' +
        '  node csjn.js fallo --id <idDocumento> [--sin-sumarios] [--guardar-pdf <carpeta>]\n' +
        '  node csjn.js fallo --analisis <idAnalisis> [--sin-sumarios] [--guardar-pdf <carpeta>]\n'
    );
    process.exit(2);
  }
  const out = await fallo(opts);
  process.stdout.write(JSON.stringify(out, null, 2) + '\n');
}

if (require.main === module) {
  main().catch((e) => {
    process.stdout.write(JSON.stringify({ fuente: FUENTE, error: e.message }, null, 2) + '\n');
    process.exit(1);
  });
}

module.exports = { fallo, variablesFicha, analisis, citantes, referenciaNormativa };
