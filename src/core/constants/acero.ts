/**
 * Catálogo de calibres de varilla corrugada usados en México.
 *
 * Pesos teóricos según norma NMX-B-506-CANACERO / ASTM A615 con
 * densidad del acero 7 850 kg/m³.
 *
 * EXCEPCIÓN: el calibre #2 corresponde en la práctica al "ALAMBRÓN"
 * de obra (alambre liso para hacer estribos/anillos), cuya equivalencia
 * comercial en México es **3.50 metros por kilogramo**, es decir
 * 0.2857 kg/m. Esto es ~14% más de masa que la varilla corrugada
 * teórica del mismo diámetro y refleja la práctica real de obra.
 *
 * Longitud comercial estándar: 12 m.
 */

export const LONGITUD_VARILLA_COMERCIAL_M = 12;

/** Densidad del acero en kg/m³. */
export const DENSIDAD_ACERO = 7850;

/**
 * Convención mexicana para el alambrón #2 usado en estribos:
 * 1 kg = 3.50 m → kg/m = 1 / 3.50 ≈ 0.2857.
 */
export const METROS_POR_KG_ALAMBRON_2 = 3.5;
export const KG_POR_METRO_ALAMBRON_2 = 1 / METROS_POR_KG_ALAMBRON_2;

export type CalibreVarilla =
  | '#2'
  | '#2.5'
  | '#3'
  | '#4'
  | '#5'
  | '#6'
  | '#7'
  | '#8'
  | '#9'
  | '#10'
  | '#12';

export type Calibre = {
  id: CalibreVarilla;
  /** Designación en pulgadas. */
  pulgadas: string;
  /** Diámetro nominal en mm. */
  diametroMm: number;
  /** Peso lineal teórico kg/m. */
  kgPorMetro: number;
};

export const CALIBRES_VARILLA: Record<CalibreVarilla, Calibre> = {
  '#2':   { id: '#2',   pulgadas: '1/4"',     diametroMm: 6.4,  kgPorMetro: KG_POR_METRO_ALAMBRON_2 },
  '#2.5': { id: '#2.5', pulgadas: '5/16"',    diametroMm: 7.9,  kgPorMetro: 0.388 },
  '#3':   { id: '#3',   pulgadas: '3/8"',     diametroMm: 9.5,  kgPorMetro: 0.557 },
  '#4':   { id: '#4',   pulgadas: '1/2"',     diametroMm: 12.7, kgPorMetro: 0.994 },
  '#5':   { id: '#5',   pulgadas: '5/8"',     diametroMm: 15.9, kgPorMetro: 1.552 },
  '#6':   { id: '#6',   pulgadas: '3/4"',     diametroMm: 19.1, kgPorMetro: 2.235 },
  '#7':   { id: '#7',   pulgadas: '7/8"',     diametroMm: 22.2, kgPorMetro: 3.041 },
  '#8':   { id: '#8',   pulgadas: '1"',       diametroMm: 25.4, kgPorMetro: 3.973 },
  '#9':   { id: '#9',   pulgadas: '1 1/8"',   diametroMm: 28.6, kgPorMetro: 5.060 },
  '#10':  { id: '#10',  pulgadas: '1 1/4"',   diametroMm: 31.8, kgPorMetro: 6.224 },
  '#12':  { id: '#12',  pulgadas: '1 1/2"',   diametroMm: 38.1, kgPorMetro: 8.938 },
};

/** Devuelve la lista de calibres ordenada de menor a mayor. */
export const calibresOrdenados = (): Calibre[] =>
  Object.values(CALIBRES_VARILLA);
