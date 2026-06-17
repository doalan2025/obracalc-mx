/**
 * Catálogo de mallas electrosoldadas comunes en México.
 *
 * Designación: cuadrícula × calibre. Ej. "6×6-10/10" = 15×15 cm de
 * cuadrícula con alambre calibre 10.
 *
 * Pesos aproximados por m² incluyen los dos sentidos de alambre.
 */

export type Malla = {
  id: string;
  nombre: string;
  /** Cuadrícula en cm (separación). */
  cuadriculaCm: number;
  /** Designación comercial. */
  calibre: string;
  /** Peso aproximado kg/m². */
  pesoKgM2: number;
};

export const MALLAS: Record<string, Malla> = {
  '6x6-10x10': { id: '6x6-10x10', nombre: '6×6-10/10 (15×15 cm, cal. 10)', cuadriculaCm: 15, calibre: '10', pesoKgM2: 1.49 },
  '6x6-8x8':   { id: '6x6-8x8',   nombre: '6×6-8/8 (15×15 cm, cal. 8)',    cuadriculaCm: 15, calibre: '8',  pesoKgM2: 2.05 },
  '6x6-6x6':   { id: '6x6-6x6',   nombre: '6×6-6/6 (15×15 cm, cal. 6)',    cuadriculaCm: 15, calibre: '6',  pesoKgM2: 2.93 },
  '4x4-10x10': { id: '4x4-10x10', nombre: '4×4-10/10 (10×10 cm, cal. 10)', cuadriculaCm: 10, calibre: '10', pesoKgM2: 2.23 },
};

/** Rollo comercial estándar de malla: 6.00 × 2.50 m = 15 m². */
export const ROLLO_MALLA_M2 = 15;
