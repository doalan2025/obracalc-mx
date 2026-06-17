/**
 * Constantes y unidades de obra usadas en México.
 *
 * Convenciones:
 *  - Bote (cubeta) de albañil: 19 L = 0.019 m³
 *  - Saco de cemento estándar: 50 kg
 *  - Saco de cemento chico:    25 kg
 *  - Bulto de cal:             25 kg
 *  - Moneda: MXN
 */

export const MONEDA = 'MXN';

/** 1 bote de 19 L expresado en metros cúbicos. */
export const BOTE_19L_M3 = 0.019;

/** Litros por bote. */
export const LITROS_POR_BOTE = 19;

export const SACO_CEMENTO_50KG_KG = 50;
export const SACO_CEMENTO_25KG_KG = 25;
export const BULTO_CAL_25KG_KG = 25;

/**
 * Densidades aparentes (kg/m³) tal como se manejan en obra
 * (no son densidades reales de partícula sino "a granel").
 */
export const DENSIDAD = {
  cemento: 1440,
  cal: 750,
  arena: 1500,
  grava: 1600,
  agua: 1000,
} as const;

/**
 * Conversiones útiles. Se calculan a partir de las densidades
 * para mantener consistencia.
 */

/** Volumen aparente (m³) que ocupa 1 saco de cemento de 50 kg. */
export const VOLUMEN_SACO_50KG_M3 = SACO_CEMENTO_50KG_KG / DENSIDAD.cemento;

/** Volumen aparente (m³) que ocupa 1 saco de cemento de 25 kg. */
export const VOLUMEN_SACO_25KG_M3 = SACO_CEMENTO_25KG_KG / DENSIDAD.cemento;

/** Volumen aparente (m³) que ocupa 1 bulto de cal de 25 kg. */
export const VOLUMEN_BULTO_CAL_25KG_M3 = BULTO_CAL_25KG_KG / DENSIDAD.cal;

/** Cuántos botes de 19 L equivalen a 1 saco de cemento de 50 kg. */
export const SACO_50KG_EN_BOTES = VOLUMEN_SACO_50KG_M3 / BOTE_19L_M3;

/** Cuántos botes de 19 L equivalen a 1 saco de cemento de 25 kg. */
export const SACO_25KG_EN_BOTES = VOLUMEN_SACO_25KG_M3 / BOTE_19L_M3;

/** Cuántos botes de 19 L equivalen a 1 bulto de cal de 25 kg. */
export const BULTO_CAL_EN_BOTES = VOLUMEN_BULTO_CAL_25KG_M3 / BOTE_19L_M3;

/** Convierte m³ a botes de 19 L. */
export const m3ABotes = (m3: number): number => m3 / BOTE_19L_M3;

/** Convierte botes de 19 L a m³. */
export const botesAm3 = (botes: number): number => botes * BOTE_19L_M3;

/** Convierte m³ de cemento a sacos de 50 kg (suelto, sin redondear). */
export const m3CementoASacos50 = (m3: number): number =>
  (m3 * DENSIDAD.cemento) / SACO_CEMENTO_50KG_KG;

/** Convierte m³ de cemento a sacos de 25 kg (suelto, sin redondear). */
export const m3CementoASacos25 = (m3: number): number =>
  (m3 * DENSIDAD.cemento) / SACO_CEMENTO_25KG_KG;

/** Convierte m³ de cal a bultos de 25 kg (suelto, sin redondear). */
export const m3CalABultos25 = (m3: number): number =>
  (m3 * DENSIDAD.cal) / BULTO_CAL_25KG_KG;

/** Redondea hacia arriba a entero (lo que se compra en obra). */
export const redondearArriba = (n: number): number => Math.ceil(n);
