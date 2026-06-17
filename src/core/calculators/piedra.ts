/**
 * Calculadora de mampostería de piedra (bardas, cimientos, muros).
 *
 * Modelo (México):
 *  - El muro de piedra se compone de:
 *      • Piedra (≈ 67 % del volumen del muro)
 *      • Mortero (≈ 33 % del volumen del muro)
 *  - La piedra a granel tiene esponjamiento, por lo que se compra
 *    más de la que ocupa asentada en el muro.
 *  - El mortero se calcula con la misma lógica que en el módulo de
 *    concreto: volumen seco = volumen fresco × 1.27, y los componentes
 *    salen de la dosificación (cemento:cal:arena).
 *
 * Salidas:
 *  - Piedra en m³ y toneladas (asumiendo 1500 kg/m³ a granel).
 *  - Mortero en m³ con todos los componentes y equivalencias en
 *    botes 19 L, sacos 50/25 kg de cemento y bultos 25 kg de cal.
 *  - Mano de obra elegida por el usuario: por m² de fachada o por m³.
 */

import {
  BOTE_19L_M3,
  BULTO_CAL_25KG_KG,
  DENSIDAD,
  m3ABotes,
  m3CalABultos25,
  m3CementoASacos25,
  m3CementoASacos50,
  redondearArriba,
} from '../constants/mexico';
import {
  DOSIFICACIONES_MORTERO,
  type DosificacionMortero,
} from '../constants/dosificaciones';
import type {
  CantidadMaterial,
  ConceptoManoObra,
  CostoManoObra,
  ResultadoCalculo,
} from '../types';
import { buscarConcepto } from '../manoObra';

/** Tipo de elemento — afecta defaults y mano de obra. */
export type TipoElementoPiedra = 'barda' | 'cimiento' | 'muro_carga';

/** Cómo cobra el albañil. */
export type ModoCobroPiedra = 'm2' | 'm3';

export type InputPiedra = {
  tipo: TipoElementoPiedra;
  /** Largo del muro en metros. */
  largo: number;
  /** Altura del muro en metros. */
  altura: number;
  /** Espesor del muro en metros. */
  espesor: number;
  /** Id de dosificación de mortero. Default 'pega_1:1:6' (con cal). */
  dosificacionId?: string;
  /**
   * Fracción del volumen del muro ocupada por piedra (0–1).
   * Default 0.67. El resto será mortero.
   */
  fraccionPiedra?: number;
  /**
   * Factor de esponjamiento de la piedra (cuánta piedra suelta hay que
   * comprar por cada m³ asentado en el muro).
   * Default 1.10 (la piedra suelta a granel ocupa ~10 % más).
   */
  factorEsponjamientoPiedra?: number;
  /** Merma adicional de piedra (%). Default 10. */
  mermaPiedraPct?: number;
  /** Merma adicional de mortero (%). Default 5. */
  mermaMorteroPct?: number;
  /** Densidad aparente de la piedra suelta (kg/m³). Default 1500. */
  densidadPiedra?: number;
  /** Modo de cobro de M.O. Default 'm2'. */
  modoCobroMO?: ModoCobroPiedra;
  /** Tarifa M.O. por m³ (MXN). Sólo se usa si modoCobroMO === 'm3'. */
  tarifaMOM3?: number;
  /** Conceptos de M.O. del usuario. */
  conceptosMO?: ConceptoManoObra[];
  /** Override de id del concepto de M.O. cuando modoCobroMO === 'm2'. */
  conceptoMOId?: string;
  /** Precios opcionales para cálculo de costos (MXN). */
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
  /** Volumen total del muro asentado (m³). */
  volumenMuro: number;
  /** Área de fachada (m²). */
  areaFachada: number;
  /** Volumen de piedra asentado (m³, sin esponjamiento). */
  piedraAsentadaM3: number;
  /** Volumen de mortero fresco (m³, sin merma). */
  morteroM3: number;
};

/** Concepto de M.O. por defecto para cobro por m². */
const CONCEPTO_MO_M2 = 'mo_piedra';

export function calcularPiedra(input: InputPiedra): SalidaPiedra {
  // Dosificación: para piedra el default es 1:1:6 con cal
  const dos =
    DOSIFICACIONES_MORTERO[input.dosificacionId ?? 'pega_1:1:6'] ??
    DOSIFICACIONES_MORTERO['pega_1:1:6'];

  // Volumen del muro y área de fachada
  const volumenMuro = input.largo * input.altura * input.espesor;
  const areaFachada = input.largo * input.altura;

  // Distribución del volumen del muro
  const fracPiedra = input.fraccionPiedra ?? 0.67;
  const fracMortero = 1 - fracPiedra;

  // Volumen asentado de piedra (sin esponjamiento ni merma)
  const piedraAsentadaM3 = volumenMuro * fracPiedra;

  // Volumen de mortero fresco (sin merma)
  const morteroM3 = volumenMuro * fracMortero;

  // Aplicar esponjamiento + merma a la piedra
  const factorEsp = input.factorEsponjamientoPiedra ?? 1.1;
  const mermaPiedra = (input.mermaPiedraPct ?? 10) / 100;
  const piedraComprarM3 = piedraAsentadaM3 * factorEsp * (1 + mermaPiedra);

  const densidadPiedra = input.densidadPiedra ?? 1500;
  const piedraTon = (piedraComprarM3 * densidadPiedra) / 1000;

  // Aplicar merma al mortero
  const mermaMortero = (input.mermaMorteroPct ?? 5) / 100;
  const morteroFinalM3 = morteroM3 * (1 + mermaMortero);

  // Componentes del mortero a partir del volumen seco
  const volumenSeco = morteroFinalM3 * dos.factor;
  const sumaPartes = dos.cemento + dos.cal + dos.arena;

  const cementoMort_M3 = (volumenSeco * dos.cemento) / sumaPartes;
  const calMort_M3 = (volumenSeco * dos.cal) / sumaPartes;
  const arenaMort_M3 = (volumenSeco * dos.arena) / sumaPartes;

  const cementoKg = cementoMort_M3 * DENSIDAD.cemento;
  const sacos50 = m3CementoASacos50(cementoMort_M3);
  const sacos25 = m3CementoASacos25(cementoMort_M3);

  const calKg = calMort_M3 * DENSIDAD.cal;
  const bultosCal25 = calMort_M3 > 0 ? m3CalABultos25(calMort_M3) : 0;

  // Agua: ~30 L por saco de cemento de 50 kg en mortero (orientativo)
  const aguaL = sacos50 * 30;
  const aguaM3 = aguaL / 1000;

  // Costos materiales
  const p = input.precios ?? {};
  const costoPiedra = piedraComprarM3 * (p.piedraM3 ?? 0);
  const costoCemento =
    (p.cementoSaco50 ?? 0) > 0
      ? redondearArriba(sacos50) * (p.cementoSaco50 ?? 0)
      : (p.cementoSaco25 ?? 0) > 0
        ? redondearArriba(sacos25) * (p.cementoSaco25 ?? 0)
        : 0;
  const costoCal =
    bultosCal25 > 0 && (p.calBulto25 ?? 0) > 0
      ? redondearArriba(bultosCal25) * (p.calBulto25 ?? 0)
      : 0;
  const costoArena = arenaMort_M3 * (p.arenaM3 ?? 0);
  const costoAgua = aguaM3 * (p.aguaM3 ?? 0);

  const materiales: CantidadMaterial[] = [
    {
      material: 'piedra',
      etiqueta: 'Piedra (a granel)',
      cantidad: piedraComprarM3,
      unidad: 'm³',
      equivalencias: [
        {
          etiqueta: 'Toneladas',
          valor: piedraTon,
          unidad: 't',
        },
        {
          etiqueta: 'Botes 19 L',
          valor: m3ABotes(piedraComprarM3),
          unidad: 'botes',
        },
      ],
      precioUnitario: p.piedraM3 ?? 0,
      costoTotal: costoPiedra,
    },
    {
      material: 'mortero',
      etiqueta: 'Mortero fresco (con merma)',
      cantidad: morteroFinalM3,
      unidad: 'm³',
      equivalencias: [
        { etiqueta: 'Botes 19 L', valor: m3ABotes(morteroFinalM3), unidad: 'botes' },
      ],
    },
    {
      material: 'cemento',
      etiqueta: 'Cemento gris',
      cantidad: cementoKg,
      unidad: 'kg',
      equivalencias: [
        { etiqueta: 'Sacos 50 kg', valor: redondearArriba(sacos50), unidad: 'sacos' },
        { etiqueta: 'Sacos 25 kg', valor: redondearArriba(sacos25), unidad: 'sacos' },
        { etiqueta: 'Botes 19 L', valor: m3ABotes(cementoMort_M3), unidad: 'botes' },
      ],
      precioUnitario: p.cementoSaco50 ?? p.cementoSaco25 ?? 0,
      costoTotal: costoCemento,
    },
  ];

  if (calMort_M3 > 0) {
    materiales.push({
      material: 'cal',
      etiqueta: 'Cal',
      cantidad: calKg,
      unidad: 'kg',
      equivalencias: [
        {
          etiqueta: `Bultos ${BULTO_CAL_25KG_KG} kg`,
          valor: redondearArriba(bultosCal25),
          unidad: 'bultos',
        },
        { etiqueta: 'Botes 19 L', valor: m3ABotes(calMort_M3), unidad: 'botes' },
      ],
      precioUnitario: p.calBulto25 ?? 0,
      costoTotal: costoCal,
    });
  }

  materiales.push(
    {
      material: 'arena',
      etiqueta: 'Arena',
      cantidad: arenaMort_M3,
      unidad: 'm³',
      equivalencias: [
        { etiqueta: 'Botes 19 L', valor: m3ABotes(arenaMort_M3), unidad: 'botes' },
      ],
      precioUnitario: p.arenaM3 ?? 0,
      costoTotal: costoArena,
    },
    {
      material: 'agua',
      etiqueta: 'Agua',
      cantidad: aguaL,
      unidad: 'L',
      equivalencias: [
        { etiqueta: 'Botes 19 L', valor: aguaL / 19, unidad: 'botes' },
      ],
      precioUnitario: p.aguaM3 ?? 0,
      costoTotal: costoAgua,
    },
  );

  const costoMateriales =
    costoPiedra + costoCemento + costoCal + costoArena + costoAgua;

  // Mano de obra
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
      { etiqueta: 'Mortero', valor: `${morteroFinalM3.toFixed(3)} m³` },
      {
        etiqueta: 'Cemento',
        valor: `${redondearArriba(sacos50)} sacos 50 kg`,
      },
    ],
    materiales,
    manoObra,
    costoMateriales,
    costoManoObra,
    costoTotal: costoMateriales + costoManoObra,
  };
}

/** Convertir BOTE_19L_M3 (re-export para tests). */
export const _internals = { BOTE_19L_M3 };
