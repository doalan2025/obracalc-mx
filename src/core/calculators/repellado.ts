/**
 * Calculadora de repellado / aplanado.
 * Output limpio: cemento (sacos 50+25), cal (bultos), arena/agua (botes).
 */

import { DENSIDAD } from '../constants/mexico';
import {
  DOSIFICACIONES_MORTERO,
  type DosificacionMortero,
} from '../constants/dosificaciones';
import {
  materialArena,
  materialCalFromM3,
  materialCementoFromM3,
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

export type ModoEntradaRepellado = 'area' | 'dimensiones';

export type InputRepellado = {
  modo: ModoEntradaRepellado;
  area?: number;
  largo?: number;
  alto?: number;
  caras?: 1 | 2;
  espesor?: number;
  dosificacionId?: string;
  mermaPct?: number;
  conceptosMO?: ConceptoManoObra[];
  conceptoMOId?: string;
  /** Tipo de bulto de cemento preferido (saco50 / saco25). Default saco50. */
  cementoPreferido?: PreferenciaCemento;
  precios?: {
    cementoSaco50?: number;
    cementoSaco25?: number;
    calBulto25?: number;
    arenaM3?: number;
    aguaM3?: number;
  };
};

export type SalidaRepellado = ResultadoCalculo & {
  dosificacion: DosificacionMortero;
  areaCara: number;
  areaTotal: number;
  morteroM3: number;
};

export function calcularRepellado(input: InputRepellado): SalidaRepellado {
  const dos =
    DOSIFICACIONES_MORTERO[input.dosificacionId ?? 'repellado_1:5'] ??
    DOSIFICACIONES_MORTERO['repellado_1:5'];

  const areaCara =
    input.modo === 'area'
      ? input.area ?? 0
      : (input.largo ?? 0) * (input.alto ?? 0);

  const caras = input.caras ?? 1;
  const areaTotal = areaCara * caras;

  const espesor = input.espesor ?? 0.015;
  const merma = (input.mermaPct ?? 12) / 100;

  const morteroM3 = areaTotal * espesor * (1 + merma);

  const volumenSeco = morteroM3 * dos.factor;
  const sumaPartes = dos.cemento + dos.cal + dos.arena;

  const cementoMort_M3 = sumaPartes > 0 ? (volumenSeco * dos.cemento) / sumaPartes : 0;
  const calMort_M3 = sumaPartes > 0 ? (volumenSeco * dos.cal) / sumaPartes : 0;
  const arenaMort_M3 = sumaPartes > 0 ? (volumenSeco * dos.arena) / sumaPartes : 0;

  const sacos50_aprox = (cementoMort_M3 * DENSIDAD.cemento) / 50;
  const aguaL = sacos50_aprox * 30;

  const p = input.precios ?? {};

  const materiales: CantidadMaterial[] = [];

  const matCemento = materialCementoFromM3(cementoMort_M3, {
    saco50: p.cementoSaco50,
    saco25: p.cementoSaco25,
      preferencia: input.cementoPreferido,
  });
  if (matCemento) materiales.push(matCemento);

  const matCal = materialCalFromM3(calMort_M3, p.calBulto25);
  if (matCal) materiales.push(matCal);

  const matArena = materialArena(arenaMort_M3, p.arenaM3);
  if (matArena) materiales.push(matArena);

  const matAgua = materialAgua(aguaL, p.aguaM3);
  if (matAgua) materiales.push(matAgua);

  const costoMateriales = materiales.reduce(
    (acc, m) => acc + (m.costoTotal ?? 0),
    0,
  );

  const conceptoId = input.conceptoMOId ?? 'mo_repellado';
  const concepto = buscarConcepto(input.conceptosMO ?? [], conceptoId);
  let manoObra: CostoManoObra[] = [];
  let costoManoObra = 0;
  if (concepto) {
    const total = areaTotal * concepto.tarifa;
    manoObra = [
      {
        conceptoId: concepto.id,
        nombre: concepto.nombre,
        cantidad: areaTotal,
        unidad: concepto.unidad,
        tarifa: concepto.tarifa,
        total,
      },
    ];
    costoManoObra = total;
  }

  return {
    dosificacion: dos,
    areaCara,
    areaTotal,
    morteroM3,
    resumen: [
      { etiqueta: 'Área por cara', valor: `${areaCara.toFixed(2)} m²` },
      { etiqueta: 'Caras', valor: `${caras}` },
      { etiqueta: 'Área total', valor: `${areaTotal.toFixed(2)} m²` },
      { etiqueta: 'Espesor', valor: `${(espesor * 100).toFixed(1)} cm` },
    ],
    materiales,
    manoObra,
    costoMateriales,
    costoManoObra,
    costoTotal: costoMateriales + costoManoObra,
  };
}
