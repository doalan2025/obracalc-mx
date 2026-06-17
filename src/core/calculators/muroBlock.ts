/**
 * Calculadora de muros de block / tabique (mampostería de pieza).
 *
 * Modelo (México):
 *  - Cada tipo de pieza tiene rendimientos típicos:
 *      • piezas por m² de muro (con junta de 1 cm).
 *      • volumen de mortero fresco por m² de muro.
 *  - El mortero se calcula con la dosificación elegida (igual que en
 *    los módulos de concreto y piedra).
 *  - Se descuenta el área de vanos (puertas/ventanas) si el usuario
 *    los introduce.
 *
 * Salidas:
 *  - Piezas (con merma).
 *  - Mortero en m³, con cemento (kg, sacos 50/25, botes), cal opcional
 *    (kg, bultos 25, botes), arena (m³, botes) y agua (L, botes).
 *  - Mano de obra por m² (concepto definido por el usuario).
 */

import {
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

export type Vano = {
  /** Etiqueta libre (puerta principal, ventana sala...). */
  nombre?: string;
  ancho: number; // m
  alto: number; // m
};

export type InputMuroBlock = {
  tipoPieza: TipoPiezaMuro;
  /** Largo del muro en m. */
  largo: number;
  /** Altura del muro en m. */
  altura: number;
  /** Vanos a descontar (puertas, ventanas). Opcional. */
  vanos?: Vano[];
  /** Id de la dosificación de mortero. Default 'pega_1:4'. */
  dosificacionId?: string;
  /** Merma de piezas (%). Default 5. */
  mermaPiezasPct?: number;
  /** Merma de mortero (%). Default 5. */
  mermaMorteroPct?: number;
  /** Conceptos M.O. del usuario. */
  conceptosMO?: ConceptoManoObra[];
  /** Override de id de concepto de M.O. */
  conceptoMOId?: string;
  /** Precios opcionales (MXN). */
  precios?: {
    piezaPrecio?: number; // resuelto en el caller usando precioKey
    cementoSaco50?: number;
    cementoSaco25?: number;
    calBulto25?: number;
    arenaM3?: number;
    aguaM3?: number;
  };
};

export type SalidaMuroBlock = ResultadoCalculo & {
  pieza: RendimientoPieza;
  dosificacion: DosificacionMortero;
  /** Área neta del muro (después de descontar vanos), m². */
  areaNeta: number;
  /** Área bruta sin descuento, m². */
  areaBruta: number;
  /** Área total descontada por vanos, m². */
  areaVanos: number;
};

export function calcularMuroBlock(input: InputMuroBlock): SalidaMuroBlock {
  const pieza = PIEZAS_MURO[input.tipoPieza];
  const dos =
    DOSIFICACIONES_MORTERO[input.dosificacionId ?? 'pega_1:4'] ??
    DOSIFICACIONES_MORTERO['pega_1:4'];

  const areaBruta = input.largo * input.altura;
  const areaVanos = (input.vanos ?? []).reduce(
    (acc, v) => acc + v.ancho * v.alto,
    0,
  );
  const areaNeta = Math.max(0, areaBruta - areaVanos);

  // Piezas con merma
  const mermaPiezas = (input.mermaPiezasPct ?? 5) / 100;
  const piezasNominal = areaNeta * pieza.piezasM2;
  const piezasConMerma = piezasNominal * (1 + mermaPiezas);

  // Mortero con merma
  const mermaMortero = (input.mermaMorteroPct ?? 5) / 100;
  const morteroM3 = areaNeta * pieza.morteroM2 * (1 + mermaMortero);

  // Componentes del mortero
  const volumenSeco = morteroM3 * dos.factor;
  const sumaPartes = dos.cemento + dos.cal + dos.arena;

  const cementoMort_M3 = sumaPartes > 0 ? (volumenSeco * dos.cemento) / sumaPartes : 0;
  const calMort_M3 = sumaPartes > 0 ? (volumenSeco * dos.cal) / sumaPartes : 0;
  const arenaMort_M3 = sumaPartes > 0 ? (volumenSeco * dos.arena) / sumaPartes : 0;

  const cementoKg = cementoMort_M3 * DENSIDAD.cemento;
  const sacos50 = m3CementoASacos50(cementoMort_M3);
  const sacos25 = m3CementoASacos25(cementoMort_M3);

  const calKg = calMort_M3 * DENSIDAD.cal;
  const bultosCal25 = calMort_M3 > 0 ? m3CalABultos25(calMort_M3) : 0;

  // Agua: ~30 L por saco 50 kg en mortero
  const aguaL = sacos50 * 30;
  const aguaM3 = aguaL / 1000;

  // Costos
  const p = input.precios ?? {};
  const piezasACobrar = redondearArriba(piezasConMerma);
  const costoPiezas = piezasACobrar * (p.piezaPrecio ?? 0);
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
      material: 'piezas',
      etiqueta: pieza.nombre,
      cantidad: piezasACobrar,
      unidad: 'pza',
      precioUnitario: p.piezaPrecio ?? 0,
      costoTotal: costoPiezas,
    },
    {
      material: 'mortero',
      etiqueta: 'Mortero fresco',
      cantidad: morteroM3,
      unidad: 'm³',
      equivalencias: [
        { etiqueta: 'Botes 19 L', valor: m3ABotes(morteroM3), unidad: 'botes' },
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
    costoPiezas + costoCemento + costoCal + costoArena + costoAgua;

  // Mano de obra: por m² del área neta
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
    dosificacion: dos,
    areaBruta,
    areaVanos,
    areaNeta,
    resumen: [
      { etiqueta: 'Área neta', valor: `${areaNeta.toFixed(2)} m²` },
      { etiqueta: 'Piezas', valor: `${piezasACobrar} pza` },
      { etiqueta: 'Mortero', valor: `${morteroM3.toFixed(3)} m³` },
      { etiqueta: 'Cemento', valor: `${redondearArriba(sacos50)} sacos 50 kg` },
    ],
    materiales,
    manoObra,
    costoMateriales,
    costoManoObra,
    costoTotal: costoMateriales + costoManoObra,
  };
}
