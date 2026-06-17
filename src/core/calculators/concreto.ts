/**
 * Calculadora de concreto (losas, zapatas, firmes, plantillas).
 *
 * Convención de salida:
 *  - Volúmenes en m³, con equivalencia en botes de 19 L.
 *  - Cemento en kg, con equivalencia en sacos de 50 kg, sacos de 25 kg
 *    y botes de 19 L.
 *  - Cal (si aplica) en kg, con bultos de 25 kg.
 *  - Agua en litros y botes.
 */

import {
  BOTE_19L_M3,
  DENSIDAD,
  SACO_CEMENTO_25KG_KG,
  SACO_CEMENTO_50KG_KG,
  m3ABotes,
  m3CementoASacos25,
  m3CementoASacos50,
  redondearArriba,
} from '../constants/mexico';
import {
  DOSIFICACIONES_CONCRETO,
  type DosificacionConcreto,
} from '../constants/dosificaciones';
import type {
  CantidadMaterial,
  ConceptoManoObra,
  CostoManoObra,
  ResultadoCalculo,
} from '../types';
import { buscarConcepto } from '../manoObra';

export type ElementoConcreto =
  | 'losa'
  | 'firme'
  | 'zapata'
  | 'plantilla'
  | 'castillo'
  | 'trabe'
  | 'columna'
  | 'cadena'
  | 'generico';

export type InputConcreto = {
  /** Tipo de elemento — sólo afecta etiqueta y selección de M.O. */
  elemento: ElementoConcreto;
  /** Largo en metros. */
  largo: number;
  /** Ancho en metros. */
  ancho: number;
  /** Espesor o peralte en metros. */
  espesor: number;
  /** Id de la dosificación a usar. Default f150 (1:2:3). */
  dosificacionId?: string;
  /** Porcentaje de desperdicio (%). Default 5. */
  mermaPct?: number;
  /** Precios opcionales por unidad para cálculo de costos (MXN). */
  precios?: {
    cementoSaco50?: number;
    cementoSaco25?: number;
    arenaM3?: number;
    gravaM3?: number;
    agua_m3?: number;
  };
  /**
   * Cantidad de mano de obra a aplicar (usualmente m² o m³ según el concepto).
   * Si no se proporciona, se infiere a partir del elemento:
   *   losa, firme  → área = largo × ancho (m²)
   *   castillo, trabe, cadena → largo (ml)
   *   zapata, columna        → 1 pieza
   *   plantilla, generico    → 0 (sin mano de obra automática)
   */
  cantidadManoObra?: number;
  /** Conceptos de M.O. del usuario (catálogo configurado). */
  conceptosMO?: ConceptoManoObra[];
  /** Override de id de concepto de M.O. */
  conceptoMOId?: string;
};

const CONCEPTO_MO_POR_ELEMENTO: Record<ElementoConcreto, string | null> = {
  losa: 'mo_losa',
  firme: 'mo_firme',
  zapata: 'mo_zapata',
  plantilla: null,
  castillo: 'mo_castillo',
  trabe: 'mo_trabe',
  columna: 'mo_columna',
  cadena: 'mo_cadena',
  generico: null,
};

const inferirCantidadMO = (e: InputConcreto): number => {
  if (e.cantidadManoObra != null) return e.cantidadManoObra;
  switch (e.elemento) {
    case 'losa':
    case 'firme':
      return e.largo * e.ancho;
    case 'castillo':
    case 'trabe':
    case 'cadena':
      return e.largo;
    case 'zapata':
    case 'columna':
      return 1;
    default:
      return 0;
  }
};

export type SalidaConcreto = ResultadoCalculo & {
  dosificacion: DosificacionConcreto;
  /** Volumen final de concreto incluyendo merma (m³). */
  volumenConMerma: number;
};

/**
 * Calcula materiales y mano de obra para un elemento de concreto.
 * Función pura: misma entrada → misma salida.
 */
export function calcularConcreto(input: InputConcreto): SalidaConcreto {
  const dos =
    DOSIFICACIONES_CONCRETO[input.dosificacionId ?? 'f150_1:2:3'] ??
    DOSIFICACIONES_CONCRETO['f150_1:2:3'];

  const merma = (input.mermaPct ?? 5) / 100;
  const volNeto = input.largo * input.ancho * input.espesor;
  const volMerma = volNeto * (1 + merma);

  // Volumen seco total a partir del fresco
  const volSeco = volMerma * dos.factor;
  const sumaPartes = dos.cemento + dos.arena + dos.grava;

  const cementoM3 = (volSeco * dos.cemento) / sumaPartes;
  const arenaM3 = (volSeco * dos.arena) / sumaPartes;
  const gravaM3 = (volSeco * dos.grava) / sumaPartes;

  const cementoKg = cementoM3 * DENSIDAD.cemento;
  const sacos50 = m3CementoASacos50(cementoM3);
  const sacos25 = m3CementoASacos25(cementoM3);

  // Agua: por cada saco de 50 kg se usa "aguaPorSaco50" L (orientativo)
  const aguaL = sacos50 * dos.aguaPorSaco50;
  const aguaM3 = aguaL / 1000;

  // Costos materiales
  const p = input.precios ?? {};
  const costoCemento =
    (p.cementoSaco50 ?? 0) > 0
      ? redondearArriba(sacos50) * (p.cementoSaco50 ?? 0)
      : (p.cementoSaco25 ?? 0) > 0
        ? redondearArriba(sacos25) * (p.cementoSaco25 ?? 0)
        : 0;
  const costoArena = arenaM3 * (p.arenaM3 ?? 0);
  const costoGrava = gravaM3 * (p.gravaM3 ?? 0);
  const costoAgua = aguaM3 * (p.agua_m3 ?? 0);

  const materiales: CantidadMaterial[] = [
    {
      material: 'concreto',
      etiqueta: 'Concreto fresco',
      cantidad: volMerma,
      unidad: 'm³',
      equivalencias: [
        { etiqueta: 'Botes 19 L', valor: m3ABotes(volMerma), unidad: 'botes' },
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
        { etiqueta: 'Botes 19 L', valor: m3ABotes(cementoM3), unidad: 'botes' },
      ],
      precioUnitario: p.cementoSaco50 ?? p.cementoSaco25 ?? 0,
      costoTotal: costoCemento,
    },
    {
      material: 'arena',
      etiqueta: 'Arena',
      cantidad: arenaM3,
      unidad: 'm³',
      equivalencias: [
        { etiqueta: 'Botes 19 L', valor: m3ABotes(arenaM3), unidad: 'botes' },
      ],
      precioUnitario: p.arenaM3 ?? 0,
      costoTotal: costoArena,
    },
    {
      material: 'grava',
      etiqueta: 'Grava',
      cantidad: gravaM3,
      unidad: 'm³',
      equivalencias: [
        { etiqueta: 'Botes 19 L', valor: m3ABotes(gravaM3), unidad: 'botes' },
      ],
      precioUnitario: p.gravaM3 ?? 0,
      costoTotal: costoGrava,
    },
    {
      material: 'agua',
      etiqueta: 'Agua',
      cantidad: aguaL,
      unidad: 'L',
      equivalencias: [
        { etiqueta: 'Botes 19 L', valor: aguaL / 19, unidad: 'botes' },
      ],
      precioUnitario: p.agua_m3 ?? 0,
      costoTotal: costoAgua,
    },
  ];

  const costoMateriales = costoCemento + costoArena + costoGrava + costoAgua;

  // Mano de obra
  const conceptos = input.conceptosMO ?? [];
  const conceptoId =
    input.conceptoMOId ?? CONCEPTO_MO_POR_ELEMENTO[input.elemento];
  const concepto = conceptoId ? buscarConcepto(conceptos, conceptoId) : undefined;

  let manoObra: CostoManoObra[] = [];
  let costoManoObra = 0;
  if (concepto) {
    const cantidad = inferirCantidadMO(input);
    const total = cantidad * concepto.tarifa;
    manoObra = [
      {
        conceptoId: concepto.id,
        nombre: concepto.nombre,
        cantidad,
        unidad: concepto.unidad,
        tarifa: concepto.tarifa,
        total,
      },
    ];
    costoManoObra = total;
  }

  return {
    dosificacion: dos,
    volumenConMerma: volMerma,
    resumen: [
      { etiqueta: 'Volumen', valor: `${volMerma.toFixed(3)} m³` },
      { etiqueta: 'Cemento', valor: `${redondearArriba(sacos50)} sacos 50 kg` },
      { etiqueta: 'Arena', valor: `${arenaM3.toFixed(3)} m³` },
      { etiqueta: 'Grava', valor: `${gravaM3.toFixed(3)} m³` },
      { etiqueta: 'Botes 19 L', valor: `${Math.round(m3ABotes(volMerma))} botes` },
    ],
    materiales,
    manoObra,
    costoMateriales,
    costoManoObra,
    costoTotal: costoMateriales + costoManoObra,
  };
}

/** Re-export de constantes útiles para los consumidores del módulo. */
export const _internals = {
  BOTE_19L_M3,
  SACO_CEMENTO_50KG_KG,
  SACO_CEMENTO_25KG_KG,
};
