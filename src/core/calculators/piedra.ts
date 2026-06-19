/**
 * Calculadora de mampostería de piedra (bardas, cimientos, muros).
 *
 * Output limpio (México):
 *  - Piedra: m³ a granel + toneladas (compra a granel).
 *  - Cemento: kg → sacos 50 + 25 kg optimizados.
 *  - Cal: bultos 25 kg.
 *  - Arena: botes 19 L.
 *  - Agua: botes 19 L.
 *  - NO se muestra "mortero fresco" como material.
 */

import { DENSIDAD, m3ABotes } from '../constants/mexico';
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

export type TipoElementoPiedra = 'barda' | 'cimiento' | 'muro_carga';
export type ModoCobroPiedra = 'm2' | 'm3';

export type InputPiedra = {
  tipo: TipoElementoPiedra;
  largo: number;
  altura: number;
  espesor: number;
  dosificacionId?: string;
  fraccionPiedra?: number;
  factorEsponjamientoPiedra?: number;
  mermaPiedraPct?: number;
  mermaMorteroPct?: number;
  densidadPiedra?: number;
  modoCobroMO?: ModoCobroPiedra;
  tarifaMOM3?: number;
  conceptosMO?: ConceptoManoObra[];
  conceptoMOId?: string;
  /** Tipo de bulto de cemento preferido (saco50 / saco25). Default saco50. */
  cementoPreferido?: PreferenciaCemento;
  precios?: {
    piedraM3?: number;
    cementoSaco50?: number;
    cementoSaco25?: number;
    calBulto25?: number;
    arenaM3?: number;
    aguaM3?: number;
  };
};

export type SalidaPiedra = ResultadoCalculo & {
  dosificacion: DosificacionMortero;
  volumenMuro: number;
  areaFachada: number;
  piedraAsentadaM3: number;
  morteroM3: number;
};

const CONCEPTO_MO_M2 = 'mo_piedra';

export function calcularPiedra(input: InputPiedra): SalidaPiedra {
  const dos =
    DOSIFICACIONES_MORTERO[input.dosificacionId ?? 'pega_1:1:6'] ??
    DOSIFICACIONES_MORTERO['pega_1:1:6'];

  const volumenMuro = input.largo * input.altura * input.espesor;
  const areaFachada = input.largo * input.altura;

  const fracPiedra = input.fraccionPiedra ?? 0.67;
  const piedraAsentadaM3 = volumenMuro * fracPiedra;
  const morteroM3 = volumenMuro * (1 - fracPiedra);

  const factorEsp = input.factorEsponjamientoPiedra ?? 1.1;
  const mermaPiedra = (input.mermaPiedraPct ?? 10) / 100;
  const piedraComprarM3 = piedraAsentadaM3 * factorEsp * (1 + mermaPiedra);

  const densidadPiedra = input.densidadPiedra ?? 1500;
  const piedraTon = (piedraComprarM3 * densidadPiedra) / 1000;

  const mermaMortero = (input.mermaMorteroPct ?? 5) / 100;
  const morteroFinalM3 = morteroM3 * (1 + mermaMortero);

  // Componentes del mortero
  const volumenSeco = morteroFinalM3 * dos.factor;
  const sumaPartes = dos.cemento + dos.cal + dos.arena;

  const cementoMort_M3 = sumaPartes > 0 ? (volumenSeco * dos.cemento) / sumaPartes : 0;
  const calMort_M3 = sumaPartes > 0 ? (volumenSeco * dos.cal) / sumaPartes : 0;
  const arenaMort_M3 = sumaPartes > 0 ? (volumenSeco * dos.arena) / sumaPartes : 0;

  // Agua: ~30 L por saco de cemento de 50 kg
  const sacos50_aprox = (cementoMort_M3 * DENSIDAD.cemento) / 50;
  const aguaL = sacos50_aprox * 30;

  const p = input.precios ?? {};

  // ---- Materiales ----
  const materiales: CantidadMaterial[] = [];

  // 1. Piedra
  const costoPiedra = piedraComprarM3 * (p.piedraM3 ?? 0);
  materiales.push({
    material: 'piedra',
    etiqueta: 'Piedra (a granel)',
    cantidad: piedraComprarM3,
    unidad: 'm³',
    equivalencias: [
      { etiqueta: 'Toneladas', valor: piedraTon, unidad: 't' },
      { etiqueta: 'Botes 19 L', valor: m3ABotes(piedraComprarM3), unidad: 'botes' },
    ],
    precioUnitario: p.piedraM3 ?? 0,
    costoTotal: costoPiedra,
  });

  // 2. Cemento (sacos optimizados)
  const matCemento = materialCementoFromM3(cementoMort_M3, {
    saco50: p.cementoSaco50,
    saco25: p.cementoSaco25,
      preferencia: input.cementoPreferido,
  });
  if (matCemento) materiales.push(matCemento);

  // 3. Cal (bultos)
  const matCal = materialCalFromM3(calMort_M3, p.calBulto25);
  if (matCal) materiales.push(matCal);

  // 4. Arena (botes)
  const matArena = materialArena(arenaMort_M3, p.arenaM3);
  if (matArena) materiales.push(matArena);

  // 5. Agua (botes)
  const matAgua = materialAgua(aguaL, p.aguaM3);
  if (matAgua) materiales.push(matAgua);

  const costoMateriales = materiales.reduce(
    (acc, m) => acc + (m.costoTotal ?? 0),
    0,
  );

  // ---- Mano de obra ----
  const modoMO: ModoCobroPiedra = input.modoCobroMO ?? 'm2';
  let manoObra: CostoManoObra[] = [];
  let costoManoObra = 0;

  if (modoMO === 'm3') {
    const tarifa = input.tarifaMOM3 ?? 0;
    const total = volumenMuro * tarifa;
    manoObra = [
      {
        conceptoId: 'piedra_m3',
        nombre: 'Mampostería de piedra (por m³)',
        cantidad: volumenMuro,
        unidad: 'm3',
        tarifa,
        total,
      },
    ];
    costoManoObra = total;
  } else {
    const conceptoId = input.conceptoMOId ?? CONCEPTO_MO_M2;
    const concepto = buscarConcepto(input.conceptosMO ?? [], conceptoId);
    if (concepto) {
      const total = areaFachada * concepto.tarifa;
      manoObra = [
        {
          conceptoId: concepto.id,
          nombre: concepto.nombre,
          cantidad: areaFachada,
          unidad: concepto.unidad,
          tarifa: concepto.tarifa,
          total,
        },
      ];
      costoManoObra = total;
    }
  }

  return {
    dosificacion: dos,
    volumenMuro,
    areaFachada,
    piedraAsentadaM3,
    morteroM3,
    resumen: [
      { etiqueta: 'Volumen muro', valor: `${volumenMuro.toFixed(3)} m³` },
      { etiqueta: 'Área fachada', valor: `${areaFachada.toFixed(2)} m²` },
      { etiqueta: 'Piedra a comprar', valor: `${piedraComprarM3.toFixed(3)} m³` },
      { etiqueta: 'Toneladas piedra', valor: `${piedraTon.toFixed(2)} t` },
    ],
    materiales,
    manoObra,
    costoMateriales,
    costoManoObra,
    costoTotal: costoMateriales + costoManoObra,
  };
}

export const _internals = { BOTE_19L_M3: 0.019 };
