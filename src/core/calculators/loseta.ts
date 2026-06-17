/**
 * Calculadora de pegado de loseta (cerámica, porcelanato, etc.).
 *
 * Modelo (México):
 *  - Loseta a comprar = área × (1 + merma).
 *  - Piezas requeridas = área a comprar / (largo × ancho de pieza).
 *  - Adhesivo (pegazulejo): rendimiento configurable en m²/saco.
 *      Default 5 m²/saco de 20 kg.
 *  - Boquilla (lechada): peso configurable en kg/m². Default 0.5.
 *  - Mano de obra por m² del área NETA (sin merma) — el albañil cobra
 *    la superficie real instalada.
 */

import { redondearArriba } from '../constants/mexico';
import type {
  CantidadMaterial,
  ConceptoManoObra,
  CostoManoObra,
  ResultadoCalculo,
} from '../types';
import { buscarConcepto } from '../manoObra';

export type ModoEntradaLoseta = 'area' | 'dimensiones';

/** Formato de la pieza en centímetros. */
export type FormatoPieza = {
  largoCm: number;
  anchoCm: number;
};

/** Catálogo de formatos comunes en México. */
export const FORMATOS_LOSETA: Record<string, FormatoPieza & { id: string; nombre: string }> = {
  '30x30':  { id: '30x30',  nombre: '30 × 30',  largoCm: 30,  anchoCm: 30 },
  '40x40':  { id: '40x40',  nombre: '40 × 40',  largoCm: 40,  anchoCm: 40 },
  '45x45':  { id: '45x45',  nombre: '45 × 45',  largoCm: 45,  anchoCm: 45 },
  '60x60':  { id: '60x60',  nombre: '60 × 60',  largoCm: 60,  anchoCm: 60 },
  '30x60':  { id: '30x60',  nombre: '30 × 60',  largoCm: 30,  anchoCm: 60 },
  '60x120': { id: '60x120', nombre: '60 × 120', largoCm: 60,  anchoCm: 120 },
  '20x20':  { id: '20x20',  nombre: '20 × 20',  largoCm: 20,  anchoCm: 20 },
  '15x15':  { id: '15x15',  nombre: '15 × 15',  largoCm: 15,  anchoCm: 15 },
};

export type InputLoseta = {
  modo: ModoEntradaLoseta;
  /** Área en m² (sólo si modo === 'area'). */
  area?: number;
  /** Largo en m (sólo si modo === 'dimensiones'). */
  largo?: number;
  /** Ancho en m (sólo si modo === 'dimensiones'). */
  ancho?: number;
  /** Formato de la pieza. Si no se da, no se cuenta en piezas. */
  formato?: FormatoPieza;
  /** Merma de loseta (%). Default 8. */
  mermaPct?: number;
  /**
   * Rendimiento del adhesivo en m² por saco.
   * Default 5 m²/saco (asume saco de 20 kg).
   */
  rendimientoAdhesivoM2PorSaco?: number;
  /** Peso de boquilla por m² (kg/m²). Default 0.5. */
  pesoBoquillaKgM2?: number;
  /** Conceptos M.O. del usuario. */
  conceptosMO?: ConceptoManoObra[];
  /** Override de concepto M.O. */
  conceptoMOId?: string;
  /** Precios opcionales. */
  precios?: {
    losetaM2?: number;
    adhesivoSaco?: number;
    boquillaKg?: number;
  };
};

export type SalidaLoseta = ResultadoCalculo & {
  /** Área neta a cubrir, m². */
  areaNeta: number;
  /** Área a comprar (con merma), m². */
  areaConMerma: number;
};

export function calcularLoseta(input: InputLoseta): SalidaLoseta {
  const areaNeta =
    input.modo === 'area'
      ? input.area ?? 0
      : (input.largo ?? 0) * (input.ancho ?? 0);

  const merma = (input.mermaPct ?? 8) / 100;
  const areaConMerma = areaNeta * (1 + merma);

  // Piezas (si hay formato)
  let piezasNumero = 0;
  let m2PorPieza = 0;
  if (input.formato && input.formato.largoCm > 0 && input.formato.anchoCm > 0) {
    m2PorPieza =
      (input.formato.largoCm / 100) * (input.formato.anchoCm / 100);
    piezasNumero = redondearArriba(areaConMerma / m2PorPieza);
  }

  // Adhesivo
  const rendAdh = input.rendimientoAdhesivoM2PorSaco ?? 5;
  const sacosAdhesivo = areaNeta / rendAdh;
  const sacosAdhesivoEntero = redondearArriba(sacosAdhesivo);

  // Boquilla
  const pesoBoq = input.pesoBoquillaKgM2 ?? 0.5;
  const boquillaKg = areaNeta * pesoBoq;
  const boquillaKgEntero = redondearArriba(boquillaKg);

  // Costos
  const p = input.precios ?? {};
  const costoLoseta = areaConMerma * (p.losetaM2 ?? 0);
  const costoAdhesivo = sacosAdhesivoEntero * (p.adhesivoSaco ?? 0);
  const costoBoquilla = boquillaKgEntero * (p.boquillaKg ?? 0);

  const materiales: CantidadMaterial[] = [
    {
      material: 'loseta',
      etiqueta: input.formato
        ? `Loseta ${input.formato.largoCm}×${input.formato.anchoCm}`
        : 'Loseta',
      cantidad: areaConMerma,
      unidad: 'm²',
      equivalencias: input.formato
        ? [
            {
              etiqueta: 'Piezas',
              valor: piezasNumero,
              unidad: 'pza',
            },
          ]
        : undefined,
      precioUnitario: p.losetaM2 ?? 0,
      costoTotal: costoLoseta,
    },
    {
      material: 'adhesivo',
      etiqueta: 'Adhesivo (pegazulejo)',
      cantidad: sacosAdhesivoEntero,
      unidad: 'sacos',
      equivalencias: [
        {
          etiqueta: 'Sacos exactos (sin redondear)',
          valor: sacosAdhesivo,
          unidad: 'sacos',
        },
      ],
      precioUnitario: p.adhesivoSaco ?? 0,
      costoTotal: costoAdhesivo,
    },
    {
      material: 'boquilla',
      etiqueta: 'Boquilla (lechada)',
      cantidad: boquillaKgEntero,
      unidad: 'kg',
      precioUnitario: p.boquillaKg ?? 0,
      costoTotal: costoBoquilla,
    },
  ];

  const costoMateriales = costoLoseta + costoAdhesivo + costoBoquilla;

  // Mano de obra
  const conceptoId = input.conceptoMOId ?? 'mo_loseta';
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
    areaNeta,
    areaConMerma,
    resumen: [
      { etiqueta: 'Área neta', valor: `${areaNeta.toFixed(2)} m²` },
      { etiqueta: 'Área a comprar', valor: `${areaConMerma.toFixed(2)} m²` },
      ...(input.formato
        ? [
            {
              etiqueta: 'Piezas',
              valor: `${piezasNumero} (${input.formato.largoCm}×${input.formato.anchoCm})`,
            },
          ]
        : []),
      { etiqueta: 'Adhesivo', valor: `${sacosAdhesivoEntero} sacos` },
      { etiqueta: 'Boquilla', valor: `${boquillaKgEntero} kg` },
    ],
    materiales,
    manoObra,
    costoMateriales,
    costoManoObra,
    costoTotal: costoMateriales + costoManoObra,
  };
}
