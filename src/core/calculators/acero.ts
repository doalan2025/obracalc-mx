/**
 * Calculadora de acero de refuerzo (varillas corrugadas).
 *
 * Modelo (México):
 *  - Cada PARTIDA describe un grupo de varillas: calibre + longitud
 *    por pieza + cantidad de piezas. Por ej. "Longitudinales del
 *    castillo C1: #3 × 3.0 m × 4 piezas".
 *  - Se aplica un % de incremento por traslapes (default 5 %).
 *  - El peso total por calibre se convierte en varillas comerciales
 *    de 12 m, redondeando hacia arriba.
 *  - Alambre recocido para amarres ≈ % del peso total (default 1.5 %).
 *  - Esta calculadora NO incluye mano de obra directa: el costo de
 *    armado va incluido en castillos / trabes / columnas / losas.
 */

import { redondearArriba } from '../constants/mexico';
import {
  CALIBRES_VARILLA,
  LONGITUD_VARILLA_COMERCIAL_M,
  type CalibreVarilla,
} from '../constants/acero';
import type { CantidadMaterial, ResultadoCalculo } from '../types';

export type PartidaAcero = {
  /** Etiqueta libre (Castillo C1, Trabe T-2, Estribos…). */
  nombre?: string;
  calibre: CalibreVarilla;
  /** Longitud por pieza en metros. */
  longitudPorPieza: number;
  /** Cantidad de piezas. */
  cantidad: number;
};

export type InputAcero = {
  partidas: PartidaAcero[];
  /** % de incremento por traslapes y desperdicio. Default 5. */
  porcentajeTraslapesPct?: number;
  /** % de alambre recocido sobre el peso total del acero. Default 1.5. */
  porcentajeAlambrePct?: number;
  /** Longitud de varilla comercial (m). Default 12. */
  longitudComercialM?: number;
  /** Precios opcionales. */
  precios?: {
    aceroKg?: number;
    alambreKg?: number;
  };
};

export type SalidaPartida = {
  partida: PartidaAcero;
  /** Metros lineales totales (antes de traslapes). */
  mlBase: number;
  /** Metros lineales con traslapes. */
  mlConTraslapes: number;
  /** Peso total en kg. */
  pesoKg: number;
  /** Varillas comerciales requeridas (redondeo arriba). */
  varillasComerciales: number;
};

export type ResumenPorCalibre = {
  calibre: CalibreVarilla;
  pulgadas: string;
  pesoKg: number;
  mlTotal: number;
  varillasComerciales: number;
};

export type SalidaAcero = ResultadoCalculo & {
  partidas: SalidaPartida[];
  porCalibre: ResumenPorCalibre[];
  pesoTotalKg: number;
  alambreKg: number;
};

export function calcularAcero(input: InputAcero): SalidaAcero {
  const traslapes = (input.porcentajeTraslapesPct ?? 5) / 100;
  const pctAlambre = (input.porcentajeAlambrePct ?? 1.5) / 100;
  const longComercial = input.longitudComercialM ?? LONGITUD_VARILLA_COMERCIAL_M;

  // Calcular cada partida
  const partidas: SalidaPartida[] = input.partidas.map((p) => {
    const cal = CALIBRES_VARILLA[p.calibre];
    const mlBase = p.longitudPorPieza * p.cantidad;
    const mlConTraslapes = mlBase * (1 + traslapes);
    const pesoKg = mlConTraslapes * cal.kgPorMetro;
    const varillasComerciales = redondearArriba(mlConTraslapes / longComercial);
    return { partida: p, mlBase, mlConTraslapes, pesoKg, varillasComerciales };
  });

  // Agrupar por calibre
  const porCalibreMap: Map<
    CalibreVarilla,
    { pesoKg: number; mlTotal: number; mlConTraslapesTotal: number }
  > = new Map();
  partidas.forEach((sp) => {
    const cur = porCalibreMap.get(sp.partida.calibre) ?? {
      pesoKg: 0,
      mlTotal: 0,
      mlConTraslapesTotal: 0,
    };
    cur.pesoKg += sp.pesoKg;
    cur.mlTotal += sp.mlBase;
    cur.mlConTraslapesTotal += sp.mlConTraslapes;
    porCalibreMap.set(sp.partida.calibre, cur);
  });

  const porCalibre: ResumenPorCalibre[] = [];
  // Mantener orden del catálogo
  (Object.keys(CALIBRES_VARILLA) as CalibreVarilla[]).forEach((cal) => {
    const v = porCalibreMap.get(cal);
    if (!v) return;
    const calInfo = CALIBRES_VARILLA[cal];
    porCalibre.push({
      calibre: cal,
      pulgadas: calInfo.pulgadas,
      pesoKg: v.pesoKg,
      mlTotal: v.mlConTraslapesTotal,
      varillasComerciales: redondearArriba(v.mlConTraslapesTotal / longComercial),
    });
  });

  const pesoTotalKg = partidas.reduce((acc, sp) => acc + sp.pesoKg, 0);
  const alambreKg = pesoTotalKg * pctAlambre;

  // Costos
  const p = input.precios ?? {};
  const costoAcero = pesoTotalKg * (p.aceroKg ?? 0);
  const costoAlambre = alambreKg * (p.alambreKg ?? 0);

  // Lista de materiales: una entrada por calibre + alambre
  const materiales: CantidadMaterial[] = porCalibre.map((c) => {
    // Costo de este calibre = peso × precio/kg (solo si hay precio)
    const costo = (p.aceroKg ?? 0) > 0 ? c.pesoKg * (p.aceroKg ?? 0) : 0;
    return {
      material: `varilla_${c.calibre}`,
      etiqueta: `Varilla ${c.calibre} (${c.pulgadas})`,
      cantidad: c.pesoKg,
      unidad: 'kg',
      equivalencias: [
        { etiqueta: 'Metros lineales', valor: c.mlTotal, unidad: 'ml' },
        {
          etiqueta: `Varillas comerciales (${longComercial} m)`,
          valor: c.varillasComerciales,
          unidad: 'pza',
        },
      ],
      precioUnitario: p.aceroKg ?? 0,
      costoTotal: costo,
    };
  });

  materiales.push({
    material: 'alambre',
    etiqueta: 'Alambre recocido',
    cantidad: alambreKg,
    unidad: 'kg',
    precioUnitario: p.alambreKg ?? 0,
    costoTotal: costoAlambre,
  });

  const costoMateriales = costoAcero + costoAlambre;

  return {
    partidas,
    porCalibre,
    pesoTotalKg,
    alambreKg,
    resumen: [
      { etiqueta: 'Peso total acero', valor: `${pesoTotalKg.toFixed(2)} kg` },
      { etiqueta: 'Alambre recocido', valor: `${alambreKg.toFixed(2)} kg` },
      ...porCalibre.map((c) => ({
        etiqueta: `Varillas ${c.calibre}`,
        valor: `${c.varillasComerciales} pza`,
      })),
    ],
    materiales,
    manoObra: [],
    costoMateriales,
    costoManoObra: 0,
    costoTotal: costoMateriales,
  };
}
