/** Tipos compartidos del dominio. */

export type UnidadManoObra = 'm2' | 'ml' | 'm3' | 'pza' | 'jornal';

export type ConceptoManoObra = {
  id: string;
  nombre: string;
  unidad: UnidadManoObra;
  /** Tarifa en MXN. */
  tarifa: number;
};

export type CantidadMaterial = {
  /** Identificador interno del material: cemento, arena, grava, etc. */
  material: string;
  /** Etiqueta amigable para el usuario. */
  etiqueta: string;
  /** Cantidad en la unidad principal. */
  cantidad: number;
  /** Unidad principal (m³, kg, m², pza, etc.). */
  unidad: string;
  /**
   * Equivalencias en otras unidades comunes.
   *  - Para volúmenes: botes de 19 L.
   *  - Para cemento:   sacos de 50 kg y de 25 kg.
   *  - Para cal:       bultos de 25 kg.
   */
  equivalencias?: { etiqueta: string; valor: number; unidad: string }[];
  /** Costo unitario MXN (opcional). */
  precioUnitario?: number;
  /** Costo total MXN (opcional). */
  costoTotal?: number;
};

export type CostoManoObra = {
  conceptoId: string;
  nombre: string;
  cantidad: number;
  unidad: UnidadManoObra;
  tarifa: number;
  total: number;
};

export type ResultadoCalculo = {
  /** Resumen breve para mostrar arriba. */
  resumen: { etiqueta: string; valor: string }[];
  /** Lista detallada de materiales. */
  materiales: CantidadMaterial[];
  /** Mano de obra calculada. */
  manoObra: CostoManoObra[];
  /** Costo total de materiales (MXN). */
  costoMateriales: number;
  /** Costo total de mano de obra (MXN). */
  costoManoObra: number;
  /** Total general (MXN). */
  costoTotal: number;
};
