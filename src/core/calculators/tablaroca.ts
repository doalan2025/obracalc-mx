/**
 * Calculadora de plafones / muros de tablaroca (yeso/durock).
 *
 * Modelo (México):
 *  - Lámina estándar: 1.22 × 2.44 m = 2.9768 m².
 *  - Tornillos: 24 por lámina (default).
 *  - Pasta para juntas: 0.5 kg/m² (default).
 *  - Cinta de papel: 3 ml/m² (default).
 *  - Perfil canal U (perimetral): 0.6 ml/m² (default).
 *  - Perfil poste / canal C (montenes): 1.6 ml/m² (default, c/41 cm).
 *  - Mano de obra: por m² (concepto mo_tablaroca).
 */

import { redondearArriba } from '../constants/mexico';
import type {
  CantidadMaterial,
  ConceptoManoObra,
  CostoManoObra,
  ResultadoCalculo,
} from '../types';
import { buscarConcepto } from '../manoObra';

export const M2_POR_LAMINA = 1.22 * 2.44;

export type InputTablaroca = {
  modo: 'area' | 'dimensiones';
  area?: number;
  largo?: number;
  ancho?: number; // o alto si es muro
  /** Plafón o muro. Sólo afecta la M.O. */
  tipo?: 'plafon' | 'muro';
  /** Merma %. Default 10. */
  mermaPct?: number;
  tornillosPorLamina?: number;
  pastaKgM2?: number;
  cintaMlM2?: number;
  /** Perfil canal U perimetral, ml por m². Default 0.6. */
  canalUMlM2?: number;
  /** Postes / canales C, ml por m². Default 1.6. */
  posteMlM2?: number;
  conceptosMO?: ConceptoManoObra[];
  conceptoMOId?: string;
  tarifaMOM2?: number;
  precios?: {
    laminaPrecio?: number;
    tornilloPrecio?: number;
    pastaKg?: number;
    cintaMl?: number;
    canalUMl?: number;
    posteMl?: number;
  };
};

export type SalidaTablaroca = ResultadoCalculo & {
  areaM2: number;
  laminas: number;
  tornillos: number;
  pastaKg: number;
  cintaMl: number;
  canalUMl: number;
  posteMl: number;
};

export function calcularTablaroca(input: InputTablaroca): SalidaTablaroca {
  const areaM2 =
    input.modo === 'area'
      ? input.area ?? 0
      : (input.largo ?? 0) * (input.ancho ?? 0);
  const merma = (input.mermaPct ?? 10) / 100;
  const areaConMerma = areaM2 * (1 + merma);

  const laminas = redondearArriba(areaConMerma / M2_POR_LAMINA);
  const tornillosPorLam = input.tornillosPorLamina ?? 24;
  const tornillos = laminas * tornillosPorLam;
  const pastaKg = areaConMerma * (input.pastaKgM2 ?? 0.5);
  const cintaMl = areaConMerma * (input.cintaMlM2 ?? 3);
  const canalUMl = areaConMerma * (input.canalUMlM2 ?? 0.6);
  const posteMl = areaConMerma * (input.posteMlM2 ?? 1.6);

  const p = input.precios ?? {};

  const materiales: CantidadMaterial[] = [
    {
      material: 'lamina_tablaroca',
      etiqueta: 'Lámina de tablaroca (1.22×2.44)',
      cantidad: laminas,
      unidad: 'pza',
      precioUnitario: p.laminaPrecio ?? 0,
      costoTotal: laminas * (p.laminaPrecio ?? 0),
    },
    {
      material: 'tornillos',
      etiqueta: 'Tornillos',
      cantidad: tornillos,
      unidad: 'pza',
      precioUnitario: p.tornilloPrecio ?? 0,
      costoTotal: tornillos * (p.tornilloPrecio ?? 0),
    },
    {
      material: 'pasta',
      etiqueta: 'Pasta para juntas',
      cantidad: pastaKg,
      unidad: 'kg',
      precioUnitario: p.pastaKg ?? 0,
      costoTotal: pastaKg * (p.pastaKg ?? 0),
    },
    {
      material: 'cinta',
      etiqueta: 'Cinta de papel',
      cantidad: cintaMl,
      unidad: 'ml',
      precioUnitario: p.cintaMl ?? 0,
      costoTotal: cintaMl * (p.cintaMl ?? 0),
    },
    {
      material: 'canal_u',
      etiqueta: 'Perfil canal U (perimetral)',
      cantidad: canalUMl,
      unidad: 'ml',
      precioUnitario: p.canalUMl ?? 0,
      costoTotal: canalUMl * (p.canalUMl ?? 0),
    },
    {
      material: 'poste',
      etiqueta: 'Postes / canales C',
      cantidad: posteMl,
      unidad: 'ml',
      precioUnitario: p.posteMl ?? 0,
      costoTotal: posteMl * (p.posteMl ?? 0),
    },
  ];

  const costoMateriales = materiales.reduce(
    (acc, m) => acc + (m.costoTotal ?? 0),
    0,
  );

  const conceptoId = input.conceptoMOId ?? 'mo_tablaroca';
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
        conceptoId: 'tablaroca_m2',
        nombre: 'Tablaroca',
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
    laminas,
    tornillos,
    pastaKg,
    cintaMl,
    canalUMl,
    posteMl,
    resumen: [
      { etiqueta: 'Área', valor: `${areaM2.toFixed(2)} m²` },
      { etiqueta: 'Láminas', valor: `${laminas} pza` },
      { etiqueta: 'Tornillos', valor: `${tornillos} pza` },
      { etiqueta: 'Pasta', valor: `${pastaKg.toFixed(1)} kg` },
    ],
    materiales,
    manoObra,
    costoMateriales,
    costoManoObra,
    costoTotal: costoMateriales + costoManoObra,
  };
}
