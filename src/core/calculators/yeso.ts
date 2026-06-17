/**
 * Calculadora de aplanado de yeso.
 *
 * Modelo:
 *  - Por m² de pared: ~1.5 cm de espesor estándar.
 *  - Yeso necesario kg = área × espesor × densidad × (1 + merma)
 *      (densidad aparente del yeso ~ 950 kg/m³)
 *  - Saco de yeso estándar: 40 kg.
 *  - Mano de obra: por m² (concepto mo_yeso).
 */

import { redondearArriba } from '../constants/mexico';
import type {
  CantidadMaterial,
  ConceptoManoObra,
  CostoManoObra,
  ResultadoCalculo,
} from '../types';
import { buscarConcepto } from '../manoObra';

export const SACO_YESO_KG = 40;
export const DENSIDAD_YESO = 950;

export type InputYeso = {
  modo: 'area' | 'dimensiones';
  area?: number;
  largo?: number;
  alto?: number;
  /** Espesor en cm. Default 1.5. */
  espesorCm?: number;
  caras?: 1 | 2;
  /** Merma %. Default 10. */
  mermaPct?: number;
  /** kg por saco. Default 40. */
  sacoKg?: number;
  conceptosMO?: ConceptoManoObra[];
  conceptoMOId?: string;
  tarifaMOM2?: number;
  precios?: {
    sacoPrecio?: number;
  };
};

export type SalidaYeso = ResultadoCalculo & {
  areaTotal: number;
  yesoKg: number;
  sacos: number;
};

export function calcularYeso(input: InputYeso): SalidaYeso {
  const areaCara =
    input.modo === 'area'
      ? input.area ?? 0
      : (input.largo ?? 0) * (input.alto ?? 0);
  const caras = input.caras ?? 1;
  const areaTotal = areaCara * caras;

  const espesorM = (input.espesorCm ?? 1.5) / 100;
  const merma = (input.mermaPct ?? 10) / 100;
  const sacoKg = input.sacoKg ?? SACO_YESO_KG;

  const yesoKg = areaTotal * espesorM * DENSIDAD_YESO * (1 + merma);
  const sacos = redondearArriba(yesoKg / sacoKg);

  const p = input.precios ?? {};
  const costoYeso = sacos * (p.sacoPrecio ?? 0);

  const materiales: CantidadMaterial[] = [
    {
      material: 'yeso',
      etiqueta: `Yeso (sacos de ${sacoKg} kg)`,
      cantidad: sacos,
      unidad: 'sacos',
      equivalencias: [{ etiqueta: 'Peso aproximado', valor: yesoKg, unidad: 'kg' }],
      precioUnitario: p.sacoPrecio ?? 0,
      costoTotal: costoYeso,
    },
  ];

  // Mano de obra
  const conceptoId = input.conceptoMOId ?? 'mo_yeso';
  const concepto = buscarConcepto(input.conceptosMO ?? [], conceptoId);
  let manoObra: CostoManoObra[] = [];
  let costoManoObra = 0;
  if (concepto) {
    const total = areaTotal * concepto.tarifa;
    manoObra = [
      {
        conceptoId: concepto.id,
        nombre: concepto.nombre,
        cantidad: areaTotal,
        unidad: concepto.unidad,
        tarifa: concepto.tarifa,
        total,
      },
    ];
    costoManoObra = total;
  } else if ((input.tarifaMOM2 ?? 0) > 0) {
    const total = areaTotal * (input.tarifaMOM2 ?? 0);
    manoObra = [
      {
        conceptoId: 'yeso_m2',
        nombre: 'Aplanado de yeso',
        cantidad: areaTotal,
        unidad: 'm2',
        tarifa: input.tarifaMOM2 ?? 0,
        total,
      },
    ];
    costoManoObra = total;
  }

  return {
    areaTotal,
    yesoKg,
    sacos,
    resumen: [
      { etiqueta: 'Área total', valor: `${areaTotal.toFixed(2)} m²` },
      { etiqueta: 'Yeso', valor: `${yesoKg.toFixed(1)} kg = ${sacos} sacos` },
    ],
    materiales,
    manoObra,
    costoMateriales: costoYeso,
    costoManoObra,
    costoTotal: costoYeso + costoManoObra,
  };
}
