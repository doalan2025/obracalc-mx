/**
 * Calculadora de zapatas (aisladas y corridas).
 *
 * Modelo:
 *  - Zapata AISLADA: a × b × h
 *      Acero parrilla en 2 sentidos (igual que losa maciza pequeña).
 *      M.O. por pieza (mo_zapata).
 *  - Zapata CORRIDA: ancho × altura × largo
 *      Acero longitudinal (default 4 var) + estribos.
 *      M.O. por ml.
 */

import {
  DENSIDAD,
  m3ABotes,
  m3CementoASacos25,
  m3CementoASacos50,
  redondearArriba,
} from '../constants/mexico';
import {
  DOSIFICACIONES_CONCRETO,
  type DosificacionConcreto,
} from '../constants/dosificaciones';
import {
  CALIBRES_VARILLA,
  type CalibreVarilla,
} from '../constants/acero';
import type {
  CantidadMaterial,
  ConceptoManoObra,
  CostoManoObra,
  ResultadoCalculo,
} from '../types';
import { buscarConcepto } from '../manoObra';

export type TipoZapata = 'aislada' | 'corrida';

export type InputZapata = {
  tipo: TipoZapata;
  /** Lado A (aislada) o ancho (corrida), m. */
  a: number;
  /** Lado B (aislada) o altura (corrida), m. */
  b: number;
  /** Altura (aislada) o largo (corrida), m. */
  h: number;
  /** Cantidad de zapatas iguales. Default 1. */
  cantidad?: number;
  // Acero
  calibreParrilla?: CalibreVarilla; // aislada
  separacionXCm?: number;           // aislada
  separacionYCm?: number;           // aislada
  /** Para corrida: # varillas longitudinales. Default 4. */
  varillasLong?: number;
  /** Para corrida: calibre longitudinal. Default '#3'. */
  calibreLong?: CalibreVarilla;
  /** Para corrida: separación de estribos cm. Default 20. */
  separacionEstribosCm?: number;
  calibreEstribo?: CalibreVarilla;
  recubrimientoCm?: number;
  ganchoEstriboCm?: number;
  traslapesAceroPct?: number;
  dosificacionId?: string;
  mermaConcretoPct?: number;
  conceptosMO?: ConceptoManoObra[];
  conceptoMOId?: string;
  precios?: {
    cementoSaco50?: number;
    cementoSaco25?: number;
    arenaM3?: number;
    gravaM3?: number;
    aguaM3?: number;
    aceroKg?: number;
    alambreKg?: number;
  };
};

export type SalidaZapata = ResultadoCalculo & {
  dosificacion: DosificacionConcreto;
  volumenConcretoM3: number;
  pesoAceroKg: number;
};

export function calcularZapata(input: InputZapata): SalidaZapata {
  const dos =
    DOSIFICACIONES_CONCRETO[input.dosificacionId ?? 'f200_1:2:2.5'] ??
    DOSIFICACIONES_CONCRETO['f200_1:2:2.5'];

  const cantidad = input.cantidad ?? 1;
  const merma = (input.mermaConcretoPct ?? 5) / 100;
  const traslapes = (input.traslapesAceroPct ?? 10) / 100;

  const volumenUna = input.a * input.b * input.h;
  const volumenConcretoM3 = volumenUna * cantidad * (1 + merma);

  // Componentes
  const volSeco = volumenConcretoM3 * dos.factor;
  const sumaPartes = dos.cemento + dos.arena + dos.grava;
  const cementoM3 = (volSeco * dos.cemento) / sumaPartes;
  const arenaM3 = (volSeco * dos.arena) / sumaPartes;
  const gravaM3 = (volSeco * dos.grava) / sumaPartes;
  const cementoKg = cementoM3 * DENSIDAD.cemento;
  const sacos50 = m3CementoASacos50(cementoM3);
  const sacos25 = m3CementoASacos25(cementoM3);
  const aguaL = sacos50 * dos.aguaPorSaco50;
  const aguaM3 = aguaL / 1000;

  // ---- Acero ----
  let pesoAceroKg = 0;
  let mlAceroTotal = 0;
  const calParr = input.calibreParrilla ?? '#3';
  const calLong = input.calibreLong ?? '#3';
  const calEst = input.calibreEstribo ?? '#2';

  const aceroBlocks: CantidadMaterial[] = [];

  if (input.tipo === 'aislada') {
    const sepX = (input.separacionXCm ?? 15) / 100;
    const sepY = (input.separacionYCm ?? 15) / 100;
    const nVarX = redondearArriba(input.b / sepX) + 1;
    const nVarY = redondearArriba(input.a / sepY) + 1;
    const mlX = nVarX * input.a * (1 + traslapes);
    const mlY = nVarY * input.b * (1 + traslapes);
    const mlPorPieza = mlX + mlY;
    mlAceroTotal = mlPorPieza * cantidad;
    pesoAceroKg = mlAceroTotal * CALIBRES_VARILLA[calParr].kgPorMetro;
    aceroBlocks.push({
      material: 'varilla_parrilla',
      etiqueta: `Varilla ${calParr} parrilla`,
      cantidad: pesoAceroKg,
      unidad: 'kg',
      equivalencias: [
        { etiqueta: 'Varillas X / pieza', valor: nVarX, unidad: 'pza' },
        { etiqueta: 'Varillas Y / pieza', valor: nVarY, unidad: 'pza' },
        { etiqueta: 'Metros lineales totales', valor: mlAceroTotal, unidad: 'ml' },
      ],
      precioUnitario: input.precios?.aceroKg ?? 0,
      costoTotal: pesoAceroKg * (input.precios?.aceroKg ?? 0),
    });
  } else {
    // Corrida
    const numLong = input.varillasLong ?? 4;
    const longTotal = input.h; // largo de la zapata corrida
    const mlLong = numLong * longTotal * cantidad * (1 + traslapes);
    const pesoLongKg = mlLong * CALIBRES_VARILLA[calLong].kgPorMetro;

    const recCm = input.recubrimientoCm ?? 5;
    const ganchoCm = input.ganchoEstriboCm ?? 8;
    const sepEstCm = input.separacionEstribosCm ?? 20;
    const longEstCm = Math.max(
      0,
      2 * (input.a * 100 + input.b * 100) - 8 * recCm + 2 * ganchoCm,
    );
    const cantEst = redondearArriba((longTotal * 100) / sepEstCm + 1);
    const mlEst = (cantEst * cantidad * longEstCm) / 100;
    const pesoEstKg = mlEst * CALIBRES_VARILLA[calEst].kgPorMetro;

    pesoAceroKg = pesoLongKg + pesoEstKg;
    mlAceroTotal = mlLong + mlEst;

    aceroBlocks.push(
      {
        material: 'varilla_long',
        etiqueta: `Varilla ${calLong} longitudinal`,
        cantidad: pesoLongKg,
        unidad: 'kg',
        equivalencias: [
          { etiqueta: 'Metros lineales', valor: mlLong, unidad: 'ml' },
        ],
        precioUnitario: input.precios?.aceroKg ?? 0,
        costoTotal: pesoLongKg * (input.precios?.aceroKg ?? 0),
      },
      {
        material: 'varilla_estribo',
        etiqueta: `Estribos ${calEst}`,
        cantidad: pesoEstKg,
        unidad: 'kg',
        equivalencias: [
          { etiqueta: 'Metros lineales', valor: mlEst, unidad: 'ml' },
          { etiqueta: 'Cantidad', valor: cantEst * cantidad, unidad: 'pza' },
        ],
        precioUnitario: input.precios?.aceroKg ?? 0,
        costoTotal: pesoEstKg * (input.precios?.aceroKg ?? 0),
      },
    );
  }

  const alambreKg = pesoAceroKg * 0.015;

  // Costos
  const p = input.precios ?? {};
  const costoCemento =
    (p.cementoSaco50 ?? 0) > 0
      ? redondearArriba(sacos50) * (p.cementoSaco50 ?? 0)
      : (p.cementoSaco25 ?? 0) > 0
        ? redondearArriba(sacos25) * (p.cementoSaco25 ?? 0)
        : 0;
  const costoArena = arenaM3 * (p.arenaM3 ?? 0);
  const costoGrava = gravaM3 * (p.gravaM3 ?? 0);
  const costoAgua = aguaM3 * (p.aguaM3 ?? 0);
  const costoAcero = pesoAceroKg * (p.aceroKg ?? 0);
  const costoAlambre = alambreKg * (p.alambreKg ?? 0);

  const materiales: CantidadMaterial[] = [
    {
      material: 'concreto',
      etiqueta: 'Concreto fresco',
      cantidad: volumenConcretoM3,
      unidad: 'm³',
      equivalencias: [{ etiqueta: 'Botes 19 L', valor: m3ABotes(volumenConcretoM3), unidad: 'botes' }],
    },
    {
      material: 'cemento',
      etiqueta: 'Cemento gris',
      cantidad: cementoKg,
      unidad: 'kg',
      equivalencias: [
        { etiqueta: 'Sacos 50 kg', valor: redondearArriba(sacos50), unidad: 'sacos' },
        { etiqueta: 'Sacos 25 kg', valor: redondearArriba(sacos25), unidad: 'sacos' },
      ],
      precioUnitario: p.cementoSaco50 ?? p.cementoSaco25 ?? 0,
      costoTotal: costoCemento,
    },
    {
      material: 'arena',
      etiqueta: 'Arena',
      cantidad: arenaM3,
      unidad: 'm³',
      equivalencias: [{ etiqueta: 'Botes 19 L', valor: m3ABotes(arenaM3), unidad: 'botes' }],
      precioUnitario: p.arenaM3 ?? 0,
      costoTotal: costoArena,
    },
    {
      material: 'grava',
      etiqueta: 'Grava',
      cantidad: gravaM3,
      unidad: 'm³',
      equivalencias: [{ etiqueta: 'Botes 19 L', valor: m3ABotes(gravaM3), unidad: 'botes' }],
      precioUnitario: p.gravaM3 ?? 0,
      costoTotal: costoGrava,
    },
    {
      material: 'agua',
      etiqueta: 'Agua',
      cantidad: aguaL,
      unidad: 'L',
      precioUnitario: p.aguaM3 ?? 0,
      costoTotal: costoAgua,
    },
    ...aceroBlocks,
    {
      material: 'alambre',
      etiqueta: 'Alambre recocido',
      cantidad: alambreKg,
      unidad: 'kg',
      precioUnitario: p.alambreKg ?? 0,
      costoTotal: costoAlambre,
    },
  ];

  const costoMateriales =
    costoCemento + costoArena + costoGrava + costoAgua + costoAcero + costoAlambre;

  // Mano de obra
  const conceptoId =
    input.conceptoMOId ??
    (input.tipo === 'aislada' ? 'mo_zapata' : 'mo_cadena');
  const concepto = buscarConcepto(input.conceptosMO ?? [], conceptoId);
  let manoObra: CostoManoObra[] = [];
  let costoManoObra = 0;
  if (concepto) {
    const cantidadMO =
      input.tipo === 'aislada' ? cantidad : input.h * cantidad;
    const total = cantidadMO * concepto.tarifa;
    manoObra = [
      {
        conceptoId: concepto.id,
        nombre: concepto.nombre,
        cantidad: cantidadMO,
        unidad: concepto.unidad,
        tarifa: concepto.tarifa,
        total,
      },
    ];
    costoManoObra = total;
  }

  return {
    dosificacion: dos,
    volumenConcretoM3,
    pesoAceroKg,
    resumen: [
      { etiqueta: 'Tipo', valor: input.tipo === 'aislada' ? 'Zapata aislada' : 'Zapata corrida' },
      { etiqueta: 'Dimensiones', valor: `${input.a} × ${input.b} × ${input.h} m × ${cantidad} pza` },
      { etiqueta: 'Concreto', valor: `${volumenConcretoM3.toFixed(3)} m³` },
      { etiqueta: 'Acero total', valor: `${pesoAceroKg.toFixed(2)} kg` },
      { etiqueta: 'Cemento', valor: `${redondearArriba(sacos50)} sacos 50 kg` },
    ],
    materiales,
    manoObra,
    costoMateriales,
    costoManoObra,
    costoTotal: costoMateriales + costoManoObra,
  };
}
