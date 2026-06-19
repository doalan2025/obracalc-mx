/**
 * Calculadora de muros de block / tabique (mampostería de pieza).
 *
 * VERSIÓN 2 (recetas mexicanas reales para mezcla "pega-block"):
 *  - El usuario selecciona una RECETA real de las que se usan en obra:
 *      A) Cemento + cal + arena cernida (mezcla tradicional, recomendada)
 *      B) Mortero premezclado en bulto + arena fina
 *      C) Cemento (25 kg) + cal + arena (variante con más cemento)
 *  - Cada receta declara los ingredientes EXACTOS de una "bacha"
 *    (mezcla batida) y cuánto m³ de mortero rinde.
 *  - La app calcula:
 *      • Cuántas bachas se requieren para la cantidad de mortero
 *        necesaria (según piezas/m² × espesor del block).
 *      • Multiplica ingredientes × bachas.
 *      • Reporta:
 *          - Block / tabique:       piezas
 *          - Cemento (si aplica):   sacos 50 kg + sacos 25 kg
 *                                   (eligiendo la combinación que
 *                                   minimiza desperdicio)
 *          - Cal:                   bultos 25 kg
 *          - Mortero premezclado:   bultos 50 kg (sólo receta B)
 *          - Arena:                 botes 19 L
 *          - Agua:                  botes 19 L
 */

import { redondearArriba } from '../constants/mexico';
import {
  opcionesSacosCemento,
  type PreferenciaCemento,
} from '../materialesHelper';
import type {
  CantidadMaterial,
  ConceptoManoObra,
  CostoManoObra,
  ResultadoCalculo,
} from '../types';
import { buscarConcepto } from '../manoObra';

// =====================================================================
// Catálogo de piezas (block / tabique)
// =====================================================================

export type TipoPiezaMuro =
  | 'block_12'
  | 'block_15'
  | 'block_20'
  | 'tabique_rojo';

export type RendimientoPieza = {
  id: TipoPiezaMuro;
  nombre: string;
  /** Piezas por m² de muro (incluye junta). */
  piezasM2: number;
  /** Volumen de mortero fresco por m² de muro (m³/m²). */
  morteroM2: number;
  /** Concepto de M.O. por defecto. */
  conceptoMOId: string;
  /** Clave del precio en PreciosMateriales. */
  precioKey: 'block12' | 'block15' | 'block20' | 'tabiqueRojo';
};

export const PIEZAS_MURO: Record<TipoPiezaMuro, RendimientoPieza> = {
  block_12: {
    id: 'block_12',
    nombre: 'Block hueco 12×20×40',
    piezasM2: 12.5,
    morteroM2: 0.012,
    conceptoMOId: 'mo_block',
    precioKey: 'block12',
  },
  block_15: {
    id: 'block_15',
    nombre: 'Block hueco 15×20×40',
    piezasM2: 12.5,
    morteroM2: 0.015,
    conceptoMOId: 'mo_block',
    precioKey: 'block15',
  },
  block_20: {
    id: 'block_20',
    nombre: 'Block hueco 20×20×40',
    piezasM2: 12.5,
    morteroM2: 0.020,
    conceptoMOId: 'mo_block',
    precioKey: 'block20',
  },
  tabique_rojo: {
    id: 'tabique_rojo',
    nombre: 'Tabique rojo recocido 6×12×24',
    piezasM2: 70,
    morteroM2: 0.025,
    conceptoMOId: 'mo_tabique',
    precioKey: 'tabiqueRojo',
  },
};

// =====================================================================
// Recetas reales para mezcla pega-block (México)
// =====================================================================

export type RecetaPegaBlock =
  | 'cal_5botes'
  | 'cal_25kg'
  | 'mortero_premezclado';

export type IngredientesBacha = {
  /** Cemento gris en kg por bacha (puede ser 0 si la receta usa mortero premezclado). */
  cementoKg?: number;
  /** Bultos de mortero premezclado de 50 kg por bacha (alternativa al cemento). */
  morteroBultos50?: number;
  /** Bultos de cal de 25 kg por bacha. */
  calBultos25?: number;
  /** Botes de 19 L de arena por bacha. */
  arenaBotes19L: number;
  /** Botes de 19 L de agua por bacha. */
  aguaBotes19L: number;
};

export type Receta = {
  id: RecetaPegaBlock;
  nombre: string;
  descripcion: string;
  /** Volumen de mortero fresco que produce 1 bacha (m³). */
  rinde_m3: number;
  ingredientes: IngredientesBacha;
};

/**
 * Recetas precargadas (proporciones reales de obra en México).
 *
 * NOTA: el rendimiento (m³ por bacha) es una estimación en obra
 * del volumen útil que produce cada mezcla. Es ajustable por receta
 * si el albañil tiene una preferencia distinta.
 */
export const RECETAS_PEGA_BLOCK: Record<RecetaPegaBlock, Receta> = {
  cal_5botes: {
    id: 'cal_5botes',
    nombre: 'Cemento + cal + arena (recomendada)',
    descripcion:
      '16 kg de cemento + 1 bulto de cal de 25 kg + 5 botes de arena cernida (criba #5) + 2 botes de agua',
    rinde_m3: 0.13,
    ingredientes: {
      cementoKg: 16,
      calBultos25: 1,
      arenaBotes19L: 5,
      aguaBotes19L: 2,
    },
  },
  cal_25kg: {
    id: 'cal_25kg',
    nombre: 'Cemento (25 kg) + cal + arena',
    descripcion:
      '25 kg de cemento (½ saco de 50 ó 1 saco de 25) + 1 bulto de cal 25 kg + 5 botes de arena + 2 botes de agua',
    rinde_m3: 0.13,
    ingredientes: {
      cementoKg: 25,
      calBultos25: 1,
      arenaBotes19L: 5,
      aguaBotes19L: 2,
    },
  },
  mortero_premezclado: {
    id: 'mortero_premezclado',
    nombre: 'Mortero premezclado en bulto',
    descripcion:
      '1 bulto de mortero de 50 kg + 6 botes de arena fina + 2 botes de agua',
    rinde_m3: 0.14,
    ingredientes: {
      morteroBultos50: 1,
      arenaBotes19L: 6,
      aguaBotes19L: 2,
    },
  },
};

// =====================================================================
// Re-exporta helpers desde el módulo común
// =====================================================================

export {
  opcionesSacosCemento,
  optimizarSacosCemento,
} from '../materialesHelper';

// =====================================================================
// API
// =====================================================================

export type Vano = {
  nombre?: string;
  ancho: number; // m
  alto: number; // m
};

export type InputMuroBlock = {
  tipoPieza: TipoPiezaMuro;
  largo: number;
  altura: number;
  vanos?: Vano[];
  /** Id de receta de mezcla. Default 'cal_5botes'. */
  recetaId?: RecetaPegaBlock;
  /** Merma de piezas (%). Default 5. */
  mermaPiezasPct?: number;
  /** Merma de mortero (%). Default 5. */
  mermaMorteroPct?: number;
  /** Tipo de bulto de cemento preferido (saco50 / saco25). Default saco50. */
  cementoPreferido?: PreferenciaCemento;
  conceptosMO?: ConceptoManoObra[];
  conceptoMOId?: string;
  precios?: {
    piezaPrecio?: number;
    cementoSaco50?: number;
    cementoSaco25?: number;
    calBulto25?: number;
    morteroBulto50?: number;
    arenaM3?: number;
    aguaM3?: number;
  };
};

export type SalidaMuroBlock = ResultadoCalculo & {
  pieza: RendimientoPieza;
  receta: Receta;
  areaBruta: number;
  areaVanos: number;
  areaNeta: number;
  morteroNecesarioM3: number;
  bachasNecesarias: number;
  /** Detalle de cemento si la receta lo usa.
   *  Devuelve LAS DOS opciones puras (50 kg y 25 kg).
   *  El usuario decide cuál comprar (la app marca la preferida). */
  cemento?: {
    kgTotal: number;
    /** Bultos si compra 50 kg. */
    bultos50: number;
    sobrante50Kg: number;
    /** Bultos si compra 25 kg. */
    bultos25: number;
    sobrante25Kg: number;
    /** Tipo preferido por el usuario (default 'saco50'). */
    preferencia: PreferenciaCemento;
  };
};

// =====================================================================
// Cálculo
// =====================================================================

/** 1 bote de 19 L = 0.019 m³ */
const M3_POR_BOTE = 0.019;

export function calcularMuroBlock(input: InputMuroBlock): SalidaMuroBlock {
  const pieza = PIEZAS_MURO[input.tipoPieza];
  const receta = RECETAS_PEGA_BLOCK[input.recetaId ?? 'cal_5botes'];

  // ---- Geometría ----
  const areaBruta = input.largo * input.altura;
  const areaVanos = (input.vanos ?? []).reduce(
    (acc, v) => acc + v.ancho * v.alto,
    0,
  );
  const areaNeta = Math.max(0, areaBruta - areaVanos);

  // ---- Piezas ----
  const mermaPiezas = (input.mermaPiezasPct ?? 5) / 100;
  const piezasNominal = areaNeta * pieza.piezasM2;
  const piezasACobrar = redondearArriba(piezasNominal * (1 + mermaPiezas));

  // ---- Cantidad de mezcla necesaria ----
  const mermaMortero = (input.mermaMorteroPct ?? 5) / 100;
  const morteroNecesarioM3 = areaNeta * pieza.morteroM2 * (1 + mermaMortero);

  // ---- Cuántas bachas se necesitan ----
  const bachasNecesarias =
    receta.rinde_m3 > 0
      ? redondearArriba(morteroNecesarioM3 / receta.rinde_m3)
      : 0;

  // ---- Multiplicar ingredientes × bachas ----
  const ing = receta.ingredientes;
  const cementoTotalKg = (ing.cementoKg ?? 0) * bachasNecesarias;
  const calTotalBultos = redondearArriba(
    (ing.calBultos25 ?? 0) * bachasNecesarias,
  );
  const morteroTotalBultos = redondearArriba(
    (ing.morteroBultos50 ?? 0) * bachasNecesarias,
  );
  const arenaTotalBotes = redondearArriba(
    ing.arenaBotes19L * bachasNecesarias,
  );
  const aguaTotalBotes = redondearArriba(
    ing.aguaBotes19L * bachasNecesarias,
  );

  // ---- Opciones de sacos de cemento (ambas puras) ----
  const opciones = opcionesSacosCemento(cementoTotalKg);
  const preferencia: PreferenciaCemento = input.cementoPreferido ?? 'saco50';
  const elegida = preferencia === 'saco50' ? opciones.opcion50 : opciones.opcion25;

  // ---- Volumen de arena (para costo en m³ si aplica) ----
  const arenaM3 = arenaTotalBotes * M3_POR_BOTE;
  const aguaM3 = aguaTotalBotes * M3_POR_BOTE;

  // ---- Costos ----
  const p = input.precios ?? {};
  const costoPiezas = piezasACobrar * (p.piezaPrecio ?? 0);
  // Costo según preferencia (un solo tipo, no mezcla)
  const costoCemento =
    preferencia === 'saco50'
      ? opciones.opcion50.sacos * (p.cementoSaco50 ?? 0)
      : opciones.opcion25.sacos * (p.cementoSaco25 ?? 0);
  const costoCal = calTotalBultos * (p.calBulto25 ?? 0);
  const costoMortero = morteroTotalBultos * (p.morteroBulto50 ?? 0);
  const costoArena = arenaM3 * (p.arenaM3 ?? 0);
  const costoAgua = aguaM3 * (p.aguaM3 ?? 0);

  // ---- Lista de materiales (sólo lo que se compra realmente) ----
  const materiales: CantidadMaterial[] = [
    {
      material: 'piezas',
      etiqueta: pieza.nombre,
      cantidad: piezasACobrar,
      unidad: 'pza',
      precioUnitario: p.piezaPrecio ?? 0,
      costoTotal: costoPiezas,
    },
  ];

  // Cemento (si la receta lo usa)
  if (cementoTotalKg > 0) {
    const tamElegido = preferencia === 'saco50' ? 50 : 25;
    const tamOtro = preferencia === 'saco50' ? 25 : 50;
    const otra = preferencia === 'saco50' ? opciones.opcion25 : opciones.opcion50;

    const equivalencias: { etiqueta: string; valor: number; unidad: string }[] = [
      {
        etiqueta: `Bultos de ${tamElegido} kg`,
        valor: elegida.sacos,
        unidad: 'bultos',
      },
    ];
    if (elegida.sobranteKg > 0.5) {
      equivalencias.push({
        etiqueta: 'Sobrante aprox.',
        valor: elegida.sobranteKg,
        unidad: 'kg',
      });
    }
    equivalencias.push({
      etiqueta: `o ${otra.sacos} bultos de ${tamOtro} kg`,
      valor: otra.sacos,
      unidad: 'bultos',
    });

    materiales.push({
      material: 'cemento',
      etiqueta: 'Cemento gris',
      cantidad: cementoTotalKg,
      unidad: 'kg',
      equivalencias,
      precioUnitario: preferencia === 'saco50' ? p.cementoSaco50 ?? 0 : p.cementoSaco25 ?? 0,
      costoTotal: costoCemento,
    });
  }

  // Mortero premezclado (sólo receta B)
  if (morteroTotalBultos > 0) {
    materiales.push({
      material: 'mortero_premezclado',
      etiqueta: 'Mortero premezclado (bulto 50 kg)',
      cantidad: morteroTotalBultos,
      unidad: 'bultos',
      precioUnitario: p.morteroBulto50 ?? 0,
      costoTotal: costoMortero,
    });
  }

  // Cal
  if (calTotalBultos > 0) {
    materiales.push({
      material: 'cal',
      etiqueta: 'Cal (bulto 25 kg)',
      cantidad: calTotalBultos,
      unidad: 'bultos',
      precioUnitario: p.calBulto25 ?? 0,
      costoTotal: costoCal,
    });
  }

  // Arena (siempre en botes 19 L como pidió el usuario)
  materiales.push({
    material: 'arena',
    etiqueta: 'Arena (botes 19 L)',
    cantidad: arenaTotalBotes,
    unidad: 'botes',
    equivalencias: [{ etiqueta: 'Equivalente en m³', valor: arenaM3, unidad: 'm³' }],
    precioUnitario: p.arenaM3 ?? 0,
    costoTotal: costoArena,
  });

  // Agua (siempre en botes 19 L)
  materiales.push({
    material: 'agua',
    etiqueta: 'Agua (botes 19 L)',
    cantidad: aguaTotalBotes,
    unidad: 'botes',
    equivalencias: [{ etiqueta: 'Equivalente en litros', valor: aguaTotalBotes * 19, unidad: 'L' }],
    precioUnitario: p.aguaM3 ?? 0,
    costoTotal: costoAgua,
  });

  const costoMateriales =
    costoPiezas +
    costoCemento +
    costoCal +
    costoMortero +
    costoArena +
    costoAgua;

  // ---- Mano de obra ----
  const conceptoId = input.conceptoMOId ?? pieza.conceptoMOId;
  const concepto = buscarConcepto(input.conceptosMO ?? [], conceptoId);
  let manoObra: CostoManoObra[] = [];
  let costoManoObra = 0;
  if (concepto) {
    const total = areaNeta * concepto.tarifa;
    manoObra = [
      {
        conceptoId: concepto.id,
        nombre: concepto.nombre,
        cantidad: areaNeta,
        unidad: concepto.unidad,
        tarifa: concepto.tarifa,
        total,
      },
    ];
    costoManoObra = total;
  }

  return {
    pieza,
    receta,
    areaBruta,
    areaVanos,
    areaNeta,
    morteroNecesarioM3,
    bachasNecesarias,
    cemento:
      cementoTotalKg > 0
        ? {
            kgTotal: cementoTotalKg,
            bultos50: opciones.opcion50.sacos,
            sobrante50Kg: opciones.opcion50.sobranteKg,
            bultos25: opciones.opcion25.sacos,
            sobrante25Kg: opciones.opcion25.sobranteKg,
            preferencia,
          }
        : undefined,
    resumen: [
      { etiqueta: 'Área neta', valor: `${areaNeta.toFixed(2)} m²` },
      { etiqueta: 'Receta', valor: receta.nombre },
      { etiqueta: 'Bachas', valor: `${bachasNecesarias}` },
      { etiqueta: 'Piezas', valor: `${piezasACobrar} pza` },
    ],
    materiales,
    manoObra,
    costoMateriales,
    costoManoObra,
    costoTotal: costoMateriales + costoManoObra,
  };
}
