/**
 * Calculadora de pintura.
 *
 * Modelo (México):
 *  - Litros necesarios = (área × manos) / rendimiento m²/L
 *  - Equivalencias:
 *      • Cubeta estándar: 19 L (4 galones)
 *      • Galón: 3.785 L
 *  - Aplica a vinílica, látex, esmalte y similares: el usuario captura el
 *    rendimiento y la app hace los redondeos.
 *  - Mano de obra: por m² del área pintada total (área × manos NO; sólo área).
 */

import { redondearArriba } from '../constants/mexico';
import type {
  CantidadMaterial,
  ConceptoManoObra,
  CostoManoObra,
  ResultadoCalculo,
} from '../types';
import { buscarConcepto } from '../manoObra';

export const LITROS_GALON = 3.785;
export const LITROS_CUBETA = 19;

export type TipoPintura = 'vinilica' | 'esmalte' | 'impermeabilizante' | 'otro';

export type ModoEntradaPintura = 'area' | 'dimensiones';

export type InputPintura = {
  modo: ModoEntradaPintura;
  area?: number;
  largo?: number;
  alto?: number;
  /** Número de manos (capas). Default 2. */
  manos?: number;
  /** Rendimiento en m²/L (por mano). Default 10. */
  rendimientoM2PorL?: number;
  /** Tipo (sólo etiqueta). Default 'vinilica'. */
  tipo?: TipoPintura;
  /** % de merma adicional. Default 5. */
  mermaPct?: number;
  /** Conceptos M.O. del usuario. */
  conceptosMO?: ConceptoManoObra[];
  /** Override de concepto M.O. */
  conceptoMOId?: string;
  /** Tarifa M.O. por m² si no hay concepto en el catálogo. */
  tarifaMOM2?: number;
  precios?: {
    cubetaPrecio?: number; // MXN por cubeta de 19 L
    galonPrecio?: number;  // MXN por galón
    litroPrecio?: number;  // MXN por litro
  };
};

export type SalidaPintura = ResultadoCalculo & {
  areaM2: number;
  manos: number;
  litrosTotales: number;
  cubetas: number;
  galones: number;
};

export function calcularPintura(input: InputPintura): SalidaPintura {
  const areaM2 =
    input.modo === 'area'
      ? input.area ?? 0
      : (input.largo ?? 0) * (input.alto ?? 0);

  const manos = input.manos ?? 2;
  const rend = input.rendimientoM2PorL ?? 10;
  const merma = (input.mermaPct ?? 5) / 100;

  const litrosBase = rend > 0 ? (areaM2 * manos) / rend : 0;
  const litrosTotales = litrosBase * (1 + merma);

  const cubetas = redondearArriba(litrosTotales / LITROS_CUBETA);
  const galones = redondearArriba(litrosTotales / LITROS_GALON);

  // Costos: usar el más conveniente — el usuario decide en qué unidad cargar el precio
  const p = input.precios ?? {};
  // Precio por L equivalente (ordenado por mejor): cubeta < galón < litro
  let costoPintura = 0;
  if ((p.cubetaPrecio ?? 0) > 0) {
    costoPintura = cubetas * (p.cubetaPrecio ?? 0);
  } else if ((p.galonPrecio ?? 0) > 0) {
    costoPintura = galones * (p.galonPrecio ?? 0);
  } else if ((p.litroPrecio ?? 0) > 0) {
    costoPintura = litrosTotales * (p.litroPrecio ?? 0);
  }

  const materiales: CantidadMaterial[] = [
    {
      material: 'pintura',
      etiqueta: `Pintura (${input.tipo ?? 'vinilica'})`,
      cantidad: litrosTotales,
      unidad: 'L',
      equivalencias: [
        {
          etiqueta: `Cubetas (${LITROS_CUBETA} L)`,
          valor: cubetas,
          unidad: 'cubetas',
        },
        {
          etiqueta: `Galones (${LITROS_GALON} L)`,
          valor: galones,
          unidad: 'galones',
        },
      ],
      precioUnitario: p.cubetaPrecio ?? p.galonPrecio ?? p.litroPrecio ?? 0,
      costoTotal: costoPintura,
    },
  ];

  // Mano de obra
  const conceptoId = input.conceptoMOId ?? 'mo_pintura';
  const concepto = buscarConcepto(input.conceptosMO ?? [], conceptoId);
  let manoObra: CostoManoObra[] = [];
  let costoManoObra = 0;
  if (concepto) {
    const total = areaM2 * concepto.tarifa;
    manoObra = [
      {
        conceptoId: concepto.id,
        nombre: concepto.nombre,
        cantidad: areaM2,
        unidad: concepto.unidad,
        tarifa: concepto.tarifa,
        total,
      },
    ];
    costoManoObra = total;
  } else if ((input.tarifaMOM2 ?? 0) > 0) {
    const total = areaM2 * (input.tarifaMOM2 ?? 0);
    manoObra = [
      {
        conceptoId: 'pintura_m2',
        nombre: 'Aplicación de pintura',
        cantidad: areaM2,
        unidad: 'm2',
        tarifa: input.tarifaMOM2 ?? 0,
        total,
      },
    ];
    costoManoObra = total;
  }

  return {
    areaM2,
    manos,
    litrosTotales,
    cubetas,
    galones,
    resumen: [
      { etiqueta: 'Área', valor: `${areaM2.toFixed(2)} m²` },
      { etiqueta: 'Manos', valor: `${manos}` },
      { etiqueta: 'Pintura', valor: `${litrosTotales.toFixed(2)} L` },
      { etiqueta: 'Cubetas 19 L', valor: `${cubetas}` },
      { etiqueta: 'Galones', valor: `${galones}` },
    ],
    materiales,
    manoObra,
    costoMateriales: costoPintura,
    costoManoObra,
    costoTotal: costoPintura + costoManoObra,
  };
}
