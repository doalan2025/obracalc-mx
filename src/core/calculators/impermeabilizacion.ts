/**
 * Calculadora de impermeabilización (membrana asfáltica o líquida).
 *
 * Modelo:
 *  - Membrana: rollo de 1 × 10 m = 10 m². Se aplica en 1 capa.
 *  - Líquido: rendimiento variable (m²/L). Se aplican varias manos.
 *  - Sellador primario: opcional, ~0.25 L/m² (default).
 *  - Mano de obra: por m² (concepto mo_impermeabilizacion).
 */

import { redondearArriba } from '../constants/mexico';
import type {
  CantidadMaterial,
  ConceptoManoObra,
  CostoManoObra,
  ResultadoCalculo,
} from '../types';
import { buscarConcepto } from '../manoObra';

export type TipoImpermeabilizante = 'membrana' | 'liquido_acrilico' | 'asfaltico';

export const M2_POR_ROLLO_MEMBRANA = 10;
export const LITROS_POR_CUBETA_LIQUIDO = 19;

export type InputImpermeabilizacion = {
  modo: 'area' | 'dimensiones';
  area?: number;
  largo?: number;
  ancho?: number;
  tipo: TipoImpermeabilizante;
  /** Manos (sólo aplica a líquido). Default 2. */
  manos?: number;
  /** Rendimiento m²/L para líquido. Default 1.5. */
  rendimientoM2PorL?: number;
  /** Rollo de membrana en m². Default 10. */
  m2PorRollo?: number;
  /** Incluir sellador primario? Default true para líquido. */
  conSelladorPrimario?: boolean;
  /** Rendimiento sellador m²/L. Default 4. */
  rendSelladorM2PorL?: number;
  mermaPct?: number;
  conceptosMO?: ConceptoManoObra[];
  conceptoMOId?: string;
  tarifaMOM2?: number;
  precios?: {
    rolloPrecio?: number;        // por rollo de membrana
    cubetaPrecio?: number;       // por cubeta 19 L
    litroPrecio?: number;
    selladorLitro?: number;
  };
};

export type SalidaImpermeabilizacion = ResultadoCalculo & {
  areaM2: number;
  rollos: number;
  litros: number;
  cubetas: number;
};

export function calcularImpermeabilizacion(
  input: InputImpermeabilizacion,
): SalidaImpermeabilizacion {
  const areaM2 =
    input.modo === 'area'
      ? input.area ?? 0
      : (input.largo ?? 0) * (input.ancho ?? 0);
  const merma = (input.mermaPct ?? 5) / 100;
  const m2PorRollo = input.m2PorRollo ?? M2_POR_ROLLO_MEMBRANA;

  let rollos = 0;
  let litros = 0;
  let cubetas = 0;
  const materiales: CantidadMaterial[] = [];

  const p = input.precios ?? {};

  if (input.tipo === 'membrana') {
    const m2Comprar = areaM2 * (1 + merma);
    rollos = redondearArriba(m2Comprar / m2PorRollo);
    materiales.push({
      material: 'membrana',
      etiqueta: 'Membrana asfáltica',
      cantidad: rollos,
      unidad: 'rollos',
      equivalencias: [
        { etiqueta: 'm² totales', valor: rollos * m2PorRollo, unidad: 'm²' },
      ],
      precioUnitario: p.rolloPrecio ?? 0,
      costoTotal: rollos * (p.rolloPrecio ?? 0),
    });
  } else {
    const manos = input.manos ?? 2;
    const rend = input.rendimientoM2PorL ?? 1.5;
    litros = rend > 0 ? (areaM2 * manos) / rend : 0;
    litros *= 1 + merma;
    cubetas = redondearArriba(litros / LITROS_POR_CUBETA_LIQUIDO);
    materiales.push({
      material: 'imp_liquido',
      etiqueta: input.tipo === 'asfaltico' ? 'Impermeabilizante asfáltico' : 'Impermeabilizante acrílico',
      cantidad: litros,
      unidad: 'L',
      equivalencias: [
        { etiqueta: 'Cubetas 19 L', valor: cubetas, unidad: 'cubetas' },
      ],
      precioUnitario: p.cubetaPrecio ?? p.litroPrecio ?? 0,
      costoTotal:
        (p.cubetaPrecio ?? 0) > 0
          ? cubetas * (p.cubetaPrecio ?? 0)
          : litros * (p.litroPrecio ?? 0),
    });

    if (input.conSelladorPrimario ?? true) {
      const rendSell = input.rendSelladorM2PorL ?? 4;
      const litrosSell = rendSell > 0 ? areaM2 / rendSell : 0;
      materiales.push({
        material: 'sellador',
        etiqueta: 'Sellador primario',
        cantidad: litrosSell,
        unidad: 'L',
        precioUnitario: p.selladorLitro ?? 0,
        costoTotal: litrosSell * (p.selladorLitro ?? 0),
      });
    }
  }

  const costoMateriales = materiales.reduce(
    (acc, m) => acc + (m.costoTotal ?? 0),
    0,
  );

  // Mano de obra
  const conceptoId = input.conceptoMOId ?? 'mo_impermeabilizacion';
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
        conceptoId: 'imp_m2',
        nombre: 'Impermeabilización',
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
    rollos,
    litros,
    cubetas,
    resumen: [
      { etiqueta: 'Área', valor: `${areaM2.toFixed(2)} m²` },
      ...(input.tipo === 'membrana'
        ? [{ etiqueta: 'Rollos', valor: `${rollos}` }]
        : [
            { etiqueta: 'Litros', valor: `${litros.toFixed(2)} L` },
            { etiqueta: 'Cubetas 19 L', valor: `${cubetas}` },
          ]),
    ],
    materiales,
    manoObra,
    costoMateriales,
    costoManoObra,
    costoTotal: costoMateriales + costoManoObra,
  };
}
