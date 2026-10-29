#!/usr/bin/env node
// Conector JUBA (Suprema Corte de Justicia de la Provincia de Buenos Aires).
//
// El buscador de JUBA es un formulario ASP.NET WebForms que arma los resultados con
// JavaScript, así que se usa un navegador real (Playwright + Chromium). Las fichas de
// texto completo también se leen con el navegador para que el HTML incrustado se
// convierta a texto igual que lo ve un usuario.
//
// Uso:
//   node scripts/juba.js buscar --texto "falta de servicio hospital" [--materia "Contencioso administrativa"] [--max 20]
//   node scripts/juba.js fallo --id 127154 [--sin-texto]
//
// Salida: JSON normalizado por stdout. Los campos que la fuente no trae quedan en null:
// el conector nunca completa datos por deducción.

const { chromium } = require('playwright');

const BASE = 'https://juba.scba.gov.ar';
const FUENTE = 'JUBA (SCBA)';
const MATERIAS = [
  'Civil y Comercial',
  'Conflicto de Poderes',
  'Contencioso administrativa',
  'Enjuiciamiento de Magistrados',
  'Inconstitucionalidad',
  'Laboral',
  'Penal',
  'Todos',
];
const TIMEOUT = 90000;

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

function limpiar(s) {
  if (s == null) return null;
  const t = s.replace(/ /g, ' ').replace(/[ \t]+/g, ' ').replace(/\s*\n\s*/g, '\n').trim();
  return t === '' ? null : t;
}

// Línea de referencia de un fallo tal como la muestra JUBA, p. ej.:
//   "SCBA LP B 73584  RSI-457-15 I 15/07/2015"
//   "SCBA LP B 50310   S 10/07/1990 Juez RODRIGUEZ VILLAR (SD)"
//   "CC0100 SN 141028 I 14/04/2026" (cámaras: causa sin letra)
// Se conserva la línea original y solo se extraen los datos que se reconocen sin ambigüedad.
function parseReferencia(ref) {
  const r = { referencia: ref.replace(/\s+/g, ' ').trim(), tribunal: null, departamento: null, causa: null, fecha: null };
  const m = ref.match(/^(\S+)\s+([A-Z]{2})\s+((?:[A-Za-z]{1,3}\s+)?[\d.]+)\b/);
  if (m) {
    r.tribunal = m[1];
    r.departamento = m[2];
    r.causa = m[3].replace(/\s+/g, ' ');
  }
  const f = ref.match(/\b(\d{1,2})\/(\d{1,2})\/(\d{4})\b/);
  if (f) r.fecha = `${f[1].padStart(2, '0')}/${f[2].padStart(2, '0')}/${f[3]}`;
  return r;
}

function parseFallo(bloque) {
  // bloque: texto de un fallo del sumario, con un renglón por dato.
  const lineas = bloque.split('\n').map((l) => l.trim()).filter(Boolean);
  if (lineas.length === 0) return null;
  const fallo = parseReferencia(lineas[0]);
  fallo.caratula = null;
  fallo.magistrados_votantes = null;
  fallo.publicacion = null;
  for (const l of lineas.slice(1)) {
    const m = l.match(/^(Carátula|Magistrados Votantes|Publicación):\s*(.*)$/);
    if (!m) continue;
    const clave = { 'Carátula': 'caratula', 'Magistrados Votantes': 'magistrados_votantes', 'Publicación': 'publicacion' }[m[1]];
    fallo[clave] = limpiar(m[2]);
  }
  return fallo;
}

async function extraerPagina(page) {
  const crudos = await page.$$eval('div.resultado', (divs) =>
    divs.map((div) => {
      const txt = (el) => (el ? el.innerText : null);
      // Los paneles de fallos están ocultos (display:none) y ahí innerText no respeta los
      // <br>: se convierten a mano y se decodifican las entidades.
      const textoOculto = (el) => {
        const aux = document.createElement('textarea');
        aux.innerHTML = el.innerHTML.replace(/<br\s*\/?>/gi, '\n').replace(/<[^>]+>/g, '');
        return aux.value;
      };
      const cont = div.querySelector('.contenido > div');
      const hijos = cont ? Array.from(cont.children) : [];
      const flex = div.querySelector('.grupo-flex');
      const ps = flex ? Array.from(flex.querySelectorAll('p')) : [];
      // Párrafos directos posteriores al encabezado: voces, texto del sumario.
      const parrafos = hijos.filter((e) => e.tagName === 'P' && !e.querySelector('a, span[id]')).map((e) => e.innerText);
      const normas = div.querySelector('#lblReferenciaNormativa');
      const fallos = (sel) =>
        Array.from(div.querySelectorAll(sel)).flatMap((td) =>
          Array.from(td.querySelectorAll('p'))
            .map((p) => ({
              texto: textoOculto(p),
              enlace: p.querySelector('a[href*="VerTextoCompleto"]')?.href || null,
            }))
            .filter((f) => f.texto.trim() !== '')
        );
      return {
        posicion: txt(div.querySelector('span[id*="lblCantidad"]')),
        materia: txt(div.querySelector('.grupo-flex h2')),
        id_sumario: ps.length ? ps[ps.length - 1].innerText : null,
        parrafos,
        normas: normas ? normas.innerText : null,
        coincidentes: fallos('td.FalloCoincidente'),
        no_coincidentes: fallos('td.FalloNoCoincidente'),
      };
    })
  );

  return crudos.map((c) => {
    const parrafos = c.parrafos.map(limpiar).filter(Boolean);
    // JUBA muestra las voces como "Voz - Subvoz | Voz - Subvoz |" antes del texto.
    let voces = null;
    if (parrafos.length > 1 && parrafos[0].includes('|')) {
      voces = parrafos.shift().split('|').map((v) => limpiar(v.replace(/\s+-\s+/g, ' - '))).filter(Boolean);
    }
    const normas = c.normas
      ? c.normas.split('|').map((n) => limpiar(n.replace(/Ver Norma/g, ' '))).filter(Boolean)
      : [];
    const fallos = [...c.coincidentes, ...c.no_coincidentes]
      .map((f) => {
        const fallo = parseFallo(f.texto);
        if (!fallo) return null;
        const id = f.enlace && f.enlace.match(/idFallo=(\d+)/);
        fallo.id_fallo = id ? id[1] : null;
        fallo.enlace_texto_completo = id ? `${BASE}/VerTextoCompleto.aspx?idFallo=${id[1]}` : null;
        return fallo;
      })
      .filter(Boolean);
    return {
      tipo: 'sumario',
      posicion: limpiar(c.posicion),
      id_sumario: limpiar(c.id_sumario),
      materia: limpiar(c.materia),
      voces,
      sumario: parrafos.length ? parrafos.join('\n') : null,
      normativa: normas,
      fallos,
    };
  });
}

async function buscar(browser, opts) {
  const texto = typeof opts.texto === 'string' ? opts.texto.trim() : '';
  if (!texto) throw new Error('Falta --texto');
  const materia = typeof opts.materia === 'string' ? opts.materia : 'Todos';
  if (!MATERIAS.includes(materia)) {
    throw new Error(`Materia inválida: "${materia}". Opciones: ${MATERIAS.join(', ')}`);
  }
  const max = opts.max === undefined ? 20 : parseInt(opts.max, 10);
  if (!Number.isInteger(max) || max < 1) throw new Error('--max tiene que ser un entero positivo');

  const page = await browser.newPage();
  const advertencias = [];
  await page.goto(`${BASE}/Buscar.aspx`, { timeout: TIMEOUT });
  await page.fill('[name="ctl00$cphMainContent$txtExpresionBusquedaRapida"]', texto);
  await page.selectOption('[name="ctl00$cphMainContent$ddlMateria"]', materia);
  page.on('dialog', (d) => {
    advertencias.push(`JUBA mostró un aviso: ${d.message()}`);
    d.dismiss().catch(() => {});
  });
  await page.click('#btnUnicaBusqueda');
  await page.waitForLoadState('networkidle', { timeout: TIMEOUT });

  const totales = {};
  for (const [clave, id] of [
    ['texto_del_sumario', 'cphMainContent_lnkResultadoTextoSumario'],
    ['voces', 'cphMainContent_lnkResultadosVoces'],
    ['texto_del_fallo', 'cphMainContent_lnkResultadoTextoFallo'],
  ]) {
    const t = await page.locator(`#${id}`).innerText().catch(() => null);
    const m = t && t.match(/\((\d+)\)/);
    totales[clave] = m ? parseInt(m[1], 10) : null;
  }

  const resultados = [];
  while (resultados.length < max) {
    const pagina = await extraerPagina(page);
    if (pagina.length === 0) break;
    resultados.push(...pagina);
    if (resultados.length >= max) break;
    const siguiente = page.locator('#cphMainContent_lnkSiguiente');
    if ((await siguiente.count()) === 0) break;
    const primero = pagina[0].posicion;
    await siguiente.click();
    await page.waitForLoadState('networkidle', { timeout: TIMEOUT });
    // La paginación es un postback parcial: esperar a que cambie el primer resultado.
    await page
      .waitForFunction(
        (anterior) => document.querySelector('span[id*="lblCantidad"]')?.innerText.trim() !== anterior,
        primero,
        { timeout: TIMEOUT }
      )
      .catch(() => advertencias.push('No se pudo avanzar a la página siguiente de resultados.'));
    if (advertencias.length) break;
  }

  await page.close();
  const esperados = totales.texto_del_sumario;
  if (esperados !== null && resultados.length < Math.min(esperados, max)) {
    advertencias.push(
      `JUBA informa ${esperados} sumarios pero solo mostró ${resultados.length}. Revisar la búsqueda directamente en ${BASE}/Buscar.aspx.`
    );
  }
  advertencias.push(
    'Los resultados de JUBA son sumarios (doctrina extraída por la SCBA). Antes de citar un fallo, abrí su texto completo con el subcomando "fallo".'
  );
  return {
    fuente: FUENTE,
    consulta: { texto, materia, max },
    consultado_en: new Date().toISOString(),
    url_busqueda: `${BASE}/Buscar.aspx`,
    totales,
    cantidad_devuelta: Math.min(resultados.length, max),
    resultados: resultados.slice(0, max),
    advertencias,
  };
}

async function fallo(browser, opts) {
  const id = String(opts.id || '').trim();
  if (!/^\d+$/.test(id)) throw new Error('Falta --id numérico (idFallo de JUBA)');
  const url = `${BASE}/VerTextoCompleto.aspx?idFallo=${id}`;
  const page = await browser.newPage();
  const resp = await page.goto(url, { timeout: TIMEOUT });
  if (!resp || !resp.ok()) throw new Error(`JUBA respondió ${resp ? resp.status() : 'sin respuesta'} para ${url}`);

  const campos = await page.evaluate(() => {
    const ids = {
      materia: 'lblMateria',
      tipo_de_fallo: 'lblTipoDeFallo',
      tribunal_emisor: 'lblTribunalEmisor',
      causa: 'lblCausa',
      fecha: 'lblFecha',
      nro_registro_interno: 'lblNroregistroInterno',
      caratula: 'lblCaratulaPublica',
      magistrados_votantes: 'lblmagistradosVotantes',
      tribunal_origen: 'lblTribunalOrigen',
      nnf: 'lblNNF',
      observacion: 'lblObservacion',
      sentencias_anuladas: 'lblSentenciasAnuladas',
      alcance: 'lblAlcance',
      observaciones: 'lblObservacionFallo',
    };
    const out = {};
    for (const [k, v] of Object.entries(ids)) {
      const el = document.getElementById(v);
      out[k] = el ? el.innerText : null;
    }
    // El texto completo está en la fila siguiente al encabezado "TEXTO COMPLETO".
    const titulo = Array.from(document.querySelectorAll('td.titportada')).find((td) =>
      td.innerText.trim().toUpperCase().startsWith('TEXTO COMPLETO')
    );
    const fila = titulo ? titulo.closest('tr').nextElementSibling : null;
    out.texto_completo = fila ? fila.innerText : null;
    return out;
  });
  await page.close();

  const datos = {};
  for (const [k, v] of Object.entries(campos)) datos[k] = limpiar(v);
  if (datos.fecha) {
    const f = datos.fecha.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    if (f) datos.fecha = `${f[1].padStart(2, '0')}/${f[2].padStart(2, '0')}/${f[3]}`;
  }
  if (opts['sin-texto']) delete datos.texto_completo;

  const advertencias = [];
  if (!datos.caratula && !datos.causa && !datos.fecha) {
    advertencias.push('La ficha no trajo datos del fallo: puede que el idFallo no exista.');
  }
  if (datos.sentencias_anuladas) {
    advertencias.push(`La ficha informa sentencias anuladas: ${datos.sentencias_anuladas}`);
  }
  return {
    fuente: FUENTE,
    consultado_en: new Date().toISOString(),
    id_fallo: id,
    enlace: url,
    ...datos,
    advertencias,
  };
}

async function main() {
  const { comando, opts } = parseArgs(process.argv.slice(2));
  const comandos = { buscar, fallo };
  if (!comandos[comando]) {
    process.stderr.write(
      'Uso:\n' +
        '  node scripts/juba.js buscar --texto "<términos>" [--materia "<materia>"] [--max N]\n' +
        '  node scripts/juba.js fallo --id <idFallo> [--sin-texto]\n' +
        `Materias: ${MATERIAS.join(', ')}\n`
    );
    process.exit(2);
  }
  const browser = await chromium.launch();
  try {
    const out = await comandos[comando](browser, opts);
    process.stdout.write(JSON.stringify(out, null, 2) + '\n');
  } finally {
    await browser.close();
  }
}

main().catch((e) => {
  process.stdout.write(JSON.stringify({ fuente: FUENTE, error: e.message }, null, 2) + '\n');
  process.exit(1);
});
