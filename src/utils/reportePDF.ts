/**
 * Generador de reporte PDF profesional para un proyecto.
 *
 * Estrategia:
 *  - Construye un HTML bonito con todos los datos del proyecto y sus
 *    secciones.
 *  - Usa `expo-print.printToFileAsync` para convertirlo en PDF.
 *  - Usa `expo-sharing` (móvil) o un fallback a `window.open` (web)
 *    para compartirlo por WhatsApp, correo, etc.
 *
 * El HTML está auto-contenido (sin recursos externos) para que el PDF
 * sea idéntico en cualquier plataforma y no requiera internet.
 */

import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { Platform } from 'react-native';
import {
  NOMBRES_TIPOS,
  type Proyecto,
  type Seccion,
} from '@/store/proyectosStore';

/** Escape mínimo para contenido de texto en HTML. */
function esc(s: unknown): string {
  return String(s ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

const fmtMXN = (n: number) =>
  new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(n);

const fmtNum = (n: number, dec = 2) =>
  new Intl.NumberFormat('es-MX', {
    minimumFractionDigits: dec,
    maximumFractionDigits: dec,
  }).format(n);

const fmtFecha = (ts: number) =>
  new Date(ts).toLocaleDateString('es-MX', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });

/** Suma materiales por (material+unidad) entre todas las secciones. */
function consolidar(secciones: Seccion[]) {
  const mapa = new Map<
    string,
    { etiqueta: string; cantidad: number; unidad: string; costoTotal: number }
  >();
  secciones.forEach((s) => {
    s.resultado.materiales.forEach((m) => {
      const key = `${m.material}|${m.unidad}`;
      const cur = mapa.get(key) ?? {
        etiqueta: m.etiqueta,
        cantidad: 0,
        unidad: m.unidad,
        costoTotal: 0,
      };
      cur.cantidad += m.cantidad;
      cur.costoTotal += m.costoTotal ?? 0;
      mapa.set(key, cur);
    });
  });
  return Array.from(mapa.values()).sort((a, b) =>
    a.etiqueta.localeCompare(b.etiqueta, 'es-MX'),
  );
}

function buildHtml(proyecto: Proyecto, secciones: Seccion[]): string {
  const totalMat = secciones.reduce((acc, s) => acc + s.resultado.costoMateriales, 0);
  const totalMO = secciones.reduce((acc, s) => acc + s.resultado.costoManoObra, 0);
  const total = totalMat + totalMO;
  const consolidado = consolidar(secciones);

  const seccionesHtml = secciones
    .slice()
    .sort((a, b) => a.fechaCreacion - b.fechaCreacion)
    .map((s, idx) => {
      const matRows = s.resultado.materiales
        .map((m) => {
          const eqStr =
            m.equivalencias
              ?.map(
                (e) =>
                  `<div class="eq">${esc(e.etiqueta)}: <b>${fmtNum(
                    e.valor,
                    e.unidad === 'sacos' ||
                      e.unidad === 'botes' ||
                      e.unidad === 'pza' ||
                      e.unidad === 'rollos' ||
                      e.unidad === 'cubetas' ||
                      e.unidad === 'galones' ||
                      e.unidad === 'bultos'
                      ? 0
                      : 2,
                  )} ${esc(e.unidad)}</b></div>`,
              )
              .join('') ?? '';
          const cantidadFmt =
            m.unidad === 'kg' || m.unidad === 'L' || m.unidad === 'pza'
              ? fmtNum(m.cantidad, 0)
              : fmtNum(m.cantidad, 3);
          return `
            <tr>
              <td>
                <div class="mat-name">${esc(m.etiqueta)}</div>
                ${eqStr}
              </td>
              <td class="num">${cantidadFmt} ${esc(m.unidad)}</td>
              <td class="num">${m.costoTotal ? fmtMXN(m.costoTotal) : '—'}</td>
            </tr>`;
        })
        .join('');

      const moRows =
        s.resultado.manoObra
          .map(
            (mo) => `
            <tr>
              <td><b>${esc(mo.nombre)}</b></td>
              <td class="num">${fmtNum(mo.cantidad, 2)} ${esc(mo.unidad)} × ${fmtMXN(mo.tarifa)}</td>
              <td class="num">${fmtMXN(mo.total)}</td>
            </tr>`,
          )
          .join('') ||
        `<tr><td colspan="3" class="muted">Sin mano de obra asignada.</td></tr>`;

      return `
        <section class="seccion">
          <h3>${idx + 1}. ${esc(s.etiqueta)}</h3>
          <div class="tag">${esc(NOMBRES_TIPOS[s.tipo])}</div>
          <table>
            <thead>
              <tr><th>Material</th><th class="num">Cantidad</th><th class="num">Costo</th></tr>
            </thead>
            <tbody>${matRows}</tbody>
          </table>
          <h4>Mano de obra</h4>
          <table>
            <thead>
              <tr><th>Concepto</th><th class="num">Cálculo</th><th class="num">Total</th></tr>
            </thead>
            <tbody>${moRows}</tbody>
          </table>
          <div class="subtotales">
            <div>Materiales: <b>${fmtMXN(s.resultado.costoMateriales)}</b></div>
            <div>Mano de obra: <b>${fmtMXN(s.resultado.costoManoObra)}</b></div>
            <div class="total-sec">TOTAL sección: <b>${fmtMXN(s.resultado.costoTotal)}</b></div>
          </div>
        </section>`;
    })
    .join('');

  const consolidadoHtml = consolidado
    .map(
      (m) => `
      <tr>
        <td>${esc(m.etiqueta)}</td>
        <td class="num">${fmtNum(
          m.cantidad,
          m.unidad === 'kg' || m.unidad === 'L' || m.unidad === 'pza' ? 0 : 2,
        )} ${esc(m.unidad)}</td>
        <td class="num">${m.costoTotal > 0 ? fmtMXN(m.costoTotal) : '—'}</td>
      </tr>`,
    )
    .join('');

  return `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<title>Reporte ${esc(proyecto.nombre)}</title>
<style>
  * { box-sizing: border-box; }
  body {
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
    color: #0f172a;
    margin: 0;
    padding: 28px 36px;
    font-size: 11px;
    line-height: 1.45;
  }
  header {
    border-bottom: 3px solid #1f6feb;
    padding-bottom: 14px;
    margin-bottom: 18px;
  }
  header .marca { font-size: 11px; color: #1f6feb; font-weight: 700; letter-spacing: 1px; }
  header h1 { font-size: 22px; margin: 4px 0 0; color: #0f172a; }
  header .meta { font-size: 11px; color: #64748b; margin-top: 4px; }
  .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px 24px; margin-bottom: 12px; }
  .grid div { font-size: 11px; }
  .grid b { color: #0f172a; }
  h2 { font-size: 14px; margin: 18px 0 8px; color: #1f6feb; border-bottom: 1px solid #e2e8f0; padding-bottom: 4px; }
  h3 { font-size: 13px; margin: 14px 0 4px; color: #0f172a; }
  h4 { font-size: 12px; margin: 10px 0 4px; color: #475569; }
  table { width: 100%; border-collapse: collapse; margin-top: 4px; }
  th, td {
    text-align: left;
    padding: 6px 8px;
    border-bottom: 1px solid #e2e8f0;
    vertical-align: top;
    font-size: 11px;
  }
  th { background: #f8fafc; color: #475569; font-weight: 700; }
  td.num, th.num { text-align: right; white-space: nowrap; }
  .seccion { margin-bottom: 16px; page-break-inside: avoid; }
  .tag {
    display: inline-block;
    background: #eef2ff;
    color: #3730a3;
    border-radius: 999px;
    padding: 2px 8px;
    font-size: 10px;
    font-weight: 700;
    margin-bottom: 8px;
  }
  .mat-name { font-weight: 700; }
  .eq { font-size: 10px; color: #64748b; padding-left: 8px; }
  .muted { color: #94a3b8; font-style: italic; padding: 8px; }
  .subtotales {
    margin-top: 8px; padding: 8px 10px; background: #f1f5f9;
    border-radius: 6px; font-size: 11px;
  }
  .subtotales div { display: flex; justify-content: space-between; }
  .subtotales .total-sec {
    margin-top: 4px; padding-top: 4px;
    border-top: 1px solid #cbd5e1; font-weight: 700; color: #1f6feb;
  }
  .total-grande {
    margin-top: 16px;
    padding: 16px 18px;
    background: #1f6feb;
    color: #fff;
    border-radius: 8px;
    font-size: 14px;
  }
  .total-grande .v { font-size: 22px; font-weight: 700; }
  footer {
    margin-top: 24px;
    padding-top: 12px;
    border-top: 1px solid #e2e8f0;
    text-align: center;
    color: #94a3b8;
    font-size: 10px;
  }
</style>
</head>
<body>
<header>
  <div class="marca">OBRACALC MX</div>
  <h1>${esc(proyecto.nombre)}</h1>
  <div class="meta">Reporte generado el ${esc(fmtFecha(Date.now()))}</div>
</header>

<div class="grid">
  ${proyecto.cliente ? `<div><b>Cliente:</b> ${esc(proyecto.cliente)}</div>` : ''}
  ${proyecto.ubicacion ? `<div><b>Ubicación:</b> ${esc(proyecto.ubicacion)}</div>` : ''}
  <div><b>Creado:</b> ${esc(fmtFecha(proyecto.fechaCreacion))}</div>
  <div><b>Secciones:</b> ${secciones.length}</div>
</div>

${proyecto.notas ? `<p>${esc(proyecto.notas)}</p>` : ''}

<h2>Secciones del proyecto</h2>
${seccionesHtml || '<p class="muted">Este proyecto aún no tiene secciones guardadas.</p>'}

${
  consolidado.length > 0
    ? `
<h2>Lista consolidada de materiales</h2>
<table>
  <thead>
    <tr><th>Material</th><th class="num">Cantidad total</th><th class="num">Costo</th></tr>
  </thead>
  <tbody>${consolidadoHtml}</tbody>
</table>`
    : ''
}

<div class="total-grande">
  <div style="display:flex; justify-content: space-between; align-items: center;">
    <div>
      <div>Materiales: ${fmtMXN(totalMat)}</div>
      <div>Mano de obra: ${fmtMXN(totalMO)}</div>
    </div>
    <div style="text-align:right;">
      <div style="font-size:11px; opacity:0.85;">TOTAL DEL PROYECTO</div>
      <div class="v">${fmtMXN(total)}</div>
    </div>
  </div>
</div>

<footer>
  Reporte generado con ObraCalc MX · Sin internet, sin nube · México
</footer>
</body>
</html>`;
}

/** Construye el HTML, lo convierte a PDF y lo comparte. */
export async function generarYCompartirReportePDF(
  proyecto: Proyecto,
  secciones: Seccion[],
): Promise<void> {
  const html = buildHtml(proyecto, secciones);

  if (Platform.OS === 'web') {
    // En web, abrimos una ventana imprimible — el usuario la guarda
    // como PDF desde el diálogo del navegador (Edge / Chrome).
    const w = (globalThis as { open?: (url?: string, target?: string) => Window | null }).open?.('', '_blank');
    if (!w) {
      throw new Error('Permite ventanas emergentes para generar el reporte.');
    }
    (w as unknown as { document: { open: () => void; write: (s: string) => void; close: () => void } }).document.open();
    (w as unknown as { document: { open: () => void; write: (s: string) => void; close: () => void } }).document.write(html);
    (w as unknown as { document: { open: () => void; write: (s: string) => void; close: () => void } }).document.close();
    setTimeout(() => {
      try {
        (w as unknown as { print?: () => void }).print?.();
      } catch { /* ignore */ }
    }, 300);
    return;
  }

  // Móvil: convertir a PDF y compartir
  const { uri } = await Print.printToFileAsync({ html, base64: false });

  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(uri, {
      mimeType: 'application/pdf',
      dialogTitle: `Reporte ${proyecto.nombre}`,
      UTI: 'com.adobe.pdf',
    });
  }
}
