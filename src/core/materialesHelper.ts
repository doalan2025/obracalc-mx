/**
 * Helpers de materiales — generan entradas de `CantidadMaterial`
 * estandarizadas para todas las calculadoras.
 *
 * Convenciones México (lo que el albañil compra realmente):
 *  - Cemento → bultos de 50 kg O bultos de 25 kg (UN SOLO TIPO,
 *              nunca combinación mixta). El usuario elige su
 *              preferencia y la app calcula con ese tipo.
 *  - Cal     → bultos de 25 kg (entero, redondeo arriba).
 *  - Arena   → botes de 19 L (entero).
 *  - Grava   → botes de 19 L (entero).
 *  - Agua    → botes de 19 L (entero).
 */

import {
  BULTO_CAL_25KG_KG,
  DENSIDAD,
  LITROS_POR_BOTE,
  m3ABotes,
  m3CalABultos25,
  redondearArriba,
} from './constants/mexico';
import type { CantidadMaterial } from './types';

// =====================================================================
// Preferencia de cemento
// =====================================================================

/** Tipo de bulto de cemento que prefiere el usuario. */
export type PreferenciaCemento = 'saco50' | 'saco25';

// =====================================================================
// Opciones de sacos de cemento (ambas puras, no mezclas)
// =====================================================================

/**
 * Para X kg necesarios devuelve LAS DOS opciones puras:
 *   - opcion50: usar SOLO bultos de 50 kg (ceil(kg/50)).
 *   - opcion25: usar SOLO bultos de 25 kg (ceil(kg/25)).
 *
 * En obra real el albañil compra UN SOLO TIPO de bulto, no mezcla.
 *
 * Ejemplos:
 *   - 48 kg → opcion50 = 1 bulto · opcion25 = 2 bultos
 *   - 70 kg → opcion50 = 2 bultos (sobran 30) · opcion25 = 3 bultos (sobran 5)
 *   - 100 kg → opcion50 = 2 bultos · opcion25 = 4 bultos
 */
export function opcionesSacosCemento(kg: number): {
  opcion50: { sacos: number; totalKg: number; sobranteKg: number };
  opcion25: { sacos: number; totalKg: number; sobranteKg: number };
} {
  if (kg <= 0) {
    return {
      opcion50: { sacos: 0, totalKg: 0, sobranteKg: 0 },
      opcion25: { sacos: 0, totalKg: 0, sobranteKg: 0 },
    };
  }
  const s50 = redondearArriba(kg / 50);
  const s25 = redondearArriba(kg / 25);
  return {
    opcion50: { sacos: s50, totalKg: s50 * 50, sobranteKg: s50 * 50 - kg },
    opcion25: { sacos: s25, totalKg: s25 * 25, sobranteKg: s25 * 25 - kg },
  };
}

/**
 * @deprecated Usa `opcionesSacosCemento`. Esta función mantiene
 * compatibilidad con la API anterior pero ahora devuelve sólo bultos
 * de 50 kg (no más combinaciones mixtas).
 */
export function optimizarSacosCemento(kg: number): {
  sacos50: number;
  sacos25: number;
  totalKg: number;
  sobranteKg: number;
} {
  if (kg <= 0) return { sacos50: 0, sacos25: 0, totalKg: 0, sobranteKg: 0 };
  const opt = opcionesSacosCemento(kg);
  return {
    sacos50: opt.opcion50.sacos,
    sacos25: 0,
    totalKg: opt.opcion50.totalKg,
    sobranteKg: opt.opcion50.sobranteKg,
  };
}

// =====================================================================
// Generadores de CantidadMaterial estandarizadas
// =====================================================================

/**
 * Cemento — recibe kg necesarios, una preferencia (saco50 / saco25)
 * y los precios opcionales. Devuelve la entrada con la opción preferida
 * como cantidad principal y la otra como alternativa informativa.
 */
export function materialCementoFromKg(
  kg: number,
  precios?: {
    saco50?: number;
    saco25?: number;
    preferencia?: PreferenciaCemento;
  },
): CantidadMaterial | null {
  if (kg <= 0) return null;
  const opt = opcionesSacosCemento(kg);
  const pref: PreferenciaCemento = precios?.preferencia ?? 'saco50';

  const elegida = pref === 'saco50' ? opt.opcion50 : opt.opcion25;
  const otra = pref === 'saco50' ? opt.opcion25 : opt.opcion50;
  const tamElegido = pref === 'saco50' ? 50 : 25;
  const tamOtro = pref === 'saco50' ? 25 : 50;
  const precioElegido = pref === 'saco50' ? precios?.saco50 : precios?.saco25;

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
  // Alternativa (informativa, sin afectar costo)
  equivalencias.push({
    etiqueta: `o ${otra.sacos} bultos de ${tamOtro} kg`,
    valor: otra.sacos,
    unidad: 'bultos',
  });

  const costoTotal = elegida.sacos * (precioElegido ?? 0);

  return {
    material: 'cemento',
    etiqueta: 'Cemento gris',
    cantidad: kg,
    unidad: 'kg',
    equivalencias,
    precioUnitario: precioElegido ?? 0,
    costoTotal,
  };
}

/** Cemento — recibe m³ de cemento (volumen seco) y convierte a kg. */
export function materialCementoFromM3(
  m3: number,
  precios?: {
    saco50?: number;
    saco25?: number;
    preferencia?: PreferenciaCemento;
  },
): CantidadMaterial | null {
  return materialCementoFromKg(m3 * DENSIDAD.cemento, precios);
}

/** Cal — recibe m³ de cal (volumen seco) y devuelve bultos de 25 kg. */
export function materialCalFromM3(
  m3: number,
  precioBulto25?: number,
): CantidadMaterial | null {
  if (m3 <= 0) return null;
  const bultos = redondearArriba(m3CalABultos25(m3));
  return {
    material: 'cal',
    etiqueta: 'Cal (bulto 25 kg)',
    cantidad: bultos,
    unidad: 'bultos',
    equivalencias: [
      {
        etiqueta: 'Peso aproximado',
        valor: bultos * BULTO_CAL_25KG_KG,
        unidad: 'kg',
      },
    ],
    precioUnitario: precioBulto25 ?? 0,
    costoTotal: bultos * (precioBulto25 ?? 0),
  };
}

/** Cal — recibe número de bultos directamente. */
export function materialCalFromBultos(
  bultos: number,
  precioBulto25?: number,
): CantidadMaterial | null {
  if (bultos <= 0) return null;
  const b = redondearArriba(bultos);
  return {
    material: 'cal',
    etiqueta: 'Cal (bulto 25 kg)',
    cantidad: b,
    unidad: 'bultos',
    equivalencias: [
      { etiqueta: 'Peso aproximado', valor: b * BULTO_CAL_25KG_KG, unidad: 'kg' },
    ],
    precioUnitario: precioBulto25 ?? 0,
    costoTotal: b * (precioBulto25 ?? 0),
  };
}

/** Arena — recibe m³ y devuelve botes de 19 L. */
export function materialArena(
  m3: number,
  precioM3?: number,
): CantidadMaterial | null {
  if (m3 <= 0) return null;
  const botes = redondearArriba(m3ABotes(m3));
  return {
    material: 'arena',
    etiqueta: 'Arena (botes 19 L)',
    cantidad: botes,
    unidad: 'botes',
    equivalencias: [
      { etiqueta: 'Equivalente en m³', valor: m3, unidad: 'm³' },
    ],
    precioUnitario: precioM3 ?? 0,
    costoTotal: m3 * (precioM3 ?? 0),
  };
}

/** Arena — recibe directamente número de botes. */
export function materialArenaFromBotes(
  botes: number,
  precioM3?: number,
): CantidadMaterial | null {
  if (botes <= 0) return null;
  const b = redondearArriba(botes);
  const m3 = b * 0.019;
  return {
    material: 'arena',
    etiqueta: 'Arena (botes 19 L)',
    cantidad: b,
    unidad: 'botes',
    equivalencias: [{ etiqueta: 'Equivalente en m³', valor: m3, unidad: 'm³' }],
    precioUnitario: precioM3 ?? 0,
    costoTotal: m3 * (precioM3 ?? 0),
  };
}

/** Grava — recibe m³ y devuelve botes de 19 L. */
export function materialGrava(
  m3: number,
  precioM3?: number,
): CantidadMaterial | null {
  if (m3 <= 0) return null;
  const botes = redondearArriba(m3ABotes(m3));
  return {
    material: 'grava',
    etiqueta: 'Grava (botes 19 L)',
    cantidad: botes,
    unidad: 'botes',
    equivalencias: [
      { etiqueta: 'Equivalente en m³', valor: m3, unidad: 'm³' },
    ],
    precioUnitario: precioM3 ?? 0,
    costoTotal: m3 * (precioM3 ?? 0),
  };
}

/** Agua — recibe litros y devuelve botes de 19 L. */
export function materialAgua(
  litros: number,
  precioM3?: number,
): CantidadMaterial | null {
  if (litros <= 0) return null;
  const botes = redondearArriba(litros / LITROS_POR_BOTE);
  const m3 = (botes * LITROS_POR_BOTE) / 1000;
  return {
    material: 'agua',
    etiqueta: 'Agua (botes 19 L)',
    cantidad: botes,
    unidad: 'botes',
    equivalencias: [
      {
        etiqueta: 'Equivalente en litros',
        valor: botes * LITROS_POR_BOTE,
        unidad: 'L',
      },
    ],
    precioUnitario: precioM3 ?? 0,
    costoTotal: m3 * (precioM3 ?? 0),
  };
}

/** Agua — recibe directamente número de botes. */
export function materialAguaFromBotes(
  botes: number,
  precioM3?: number,
): CantidadMaterial | null {
  if (botes <= 0) return null;
  const b = redondearArriba(botes);
  const m3 = (b * LITROS_POR_BOTE) / 1000;
  return {
    material: 'agua',
    etiqueta: 'Agua (botes 19 L)',
    cantidad: b,
    unidad: 'botes',
    equivalencias: [
      { etiqueta: 'Equivalente en litros', valor: b * LITROS_POR_BOTE, unidad: 'L' },
    ],
    precioUnitario: precioM3 ?? 0,
    costoTotal: m3 * (precioM3 ?? 0),
  };
}
