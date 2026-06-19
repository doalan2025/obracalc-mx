/**
 * Calculadora de zapatas (aisladas y corridas).
 * Output limpio: cemento (sacos), arena/grava/agua (botes), acero (kg+ml).
 */

import { DENSIDAD, redondearArriba } from '../constants/mexico';
import {
  DOSIFICACIONES_CONCRETO,
  type DosificacionConcreto,
} from '../constants/dosificaciones';
import {
  CALIBRES_VARILLA,
  type CalibreVarilla,
} from '../constants/acero';
import {
  materialArena,
  materialCementoFromM3,
  materialGrava,
  materialAgua,
} from '../materialesHelper';
import type { PreferenciaCemento } from '../materialesHelper';
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
  a: number;
  b: number;
  h: number;
  cantidad?: number;
  calibreParrilla?: CalibreVarilla;
  separacionXCm?: number;
  separacionYCm?: number;
  varillasLong?: number;
  calibreLong?: CalibreVarilla;
  separacionEstribosCm?: number;
  calibreEstribo?: CalibreVarilla;
  recubrimientoCm?: number;
  ganchoEstriboCm?: number;
  traslapesAceroPct?: number;
  dosificacionId?: string;
  mermaConcretoPct?: number;
  conceptosMO?: ConceptoManoObra[];
  conceptoMOId?: string;
  /** Tipo de bulto de cemento preferido (saco50 / saco25). Default saco50. */
  cementoPreferido?: PreferenciaCemento;
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

  const volSeco = volumenConcretoM3 * dos.factor;
  const sumaPartes = dos.cemento + dos.arena + dos.grava;
  const cementoM3 = (volSeco * dos.cemento) / sumaPartes;
  const arenaM3 = (volSeco * dos.arena) / sumaPartes;
  const gravaM3 = (volSeco * dos.grava) / sumaPartes;
  const sacos50_aprox = (cementoM3 * DENSIDAD.cemento) / 50;
  const aguaL = sacos50_aprox * dos.aguaPorSaco50;

  // Acero
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
    const numLong = input.varillasLong ?? 4;
    const longTotal = input.h;
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
        etiqueta: calEst === '#2' ? `Alambrón ${calEst} para estribos` : `Estribos ${calEst}`,
        cantidad: pesoEstKg,
        unidad: 'kg',
        equivalencias: [
          { etiqueta: 'Metros lineales', valor: mlEst, unidad: 'ml' },
          { etiqueta: 'Cantidad estribos', valor: cantEst * cantidad, unidad: 'pza' },
          ...(calEst === '#2'
            ? [{ etiqueta: 'Alambrón (3.5 m/kg)', valor: pesoEstKg, unidad: 'kg' }]
            : []),
        ],
        precioUnitario: input.precios?.aceroKg ?? 0,
        costoTotal: pesoEstKg * (input.precios?.aceroKg ?? 0),
      },
    );
  }

  const alambreKg = pesoAceroKg * 0.015;

  const p = input.precios ?? {};

  const materiales: CantidadMaterial[] = [];

  const matCemento = materialCementoFromM3(cementoM3, {
    saco50: p.cementoSaco50,
    saco25: p.cementoSaco25,
      preferencia: input.cementoPreferido,
  });
  if (matCemento) materiales.push(matCemento);

  const matArena = materialArena(arenaM3, p.arenaM3);
  if (matArena) materiales.push(matArena);

  const matGrava = materialGrava(gravaM3, p.gravaM3);
  if (matGrava) materiales.push(matGrava);

  const matAgua = materialAgua(aguaL, p.aguaM3);
  if (matAgua) materiales.push(matAgua);

  materiales.push(...aceroBlocks);

  materiales.push({
    material: 'alambre',
    etiqueta: 'Alambre recocido',
    cantidad: alambreKg,
    unidad: 'kg',
    precioUnitario: p.alambreKg ?? 0,
    costoTotal: alambreKg * (p.alambreKg ?? 0),
  });

  const costoMateriales = materiales.reduce(
    (acc, m) => acc + (m.costoTotal ?? 0),
    0,
  );

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
      {
        etiqueta: 'Dimensiones',
        valor: `${input.a} × ${input.b} × ${input.h} m × ${cantidad} pza`,
      },
      { etiqueta: 'Volumen concreto', valor: `${volumenConcretoM3.toFixed(3)} m³` },
      { etiqueta: 'Acero total', valor: `${pesoAceroKg.toFixed(2)} kg` },
    ],
    materiales,
    manoObra,
    costoMateriales,
    costoManoObra,
    costoTotal: costoMateriales + costoManoObra,
  };
}
