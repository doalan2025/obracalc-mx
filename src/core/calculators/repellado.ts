/**
 * Calculadora de repellado / aplanado (México).
 *
 * Modelo:
 *  - Volumen de mortero fresco = área × espesor × (1 + merma).
 *  - La merma típica en aplanados es alta (10–15 %) porque parte del
 *    mortero se cae al suelo durante la aplicación.
 *  - El usuario decide si aplica a 1 cara o a 2 caras (típico cuando
 *    se aplana un muro por dentro y por fuera).
 *  - Componentes del mortero a partir de la dosificación y volumen seco.
 *
 * Salidas:
 *  - Mortero en m³ con equivalencia en botes 19 L.
 *  - Cemento (kg, sacos 50/25, botes), cal (kg, bultos 25, botes),
 *    arena (m³, botes), agua (L, botes).
 *  - Mano de obra por m² total (área × caras).
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

export type ModoEntradaRepellado = 'area' | 'dimensiones';

export type InputRepellado = {
  /** Cómo se introduce la superficie. */
  modo: ModoEntradaRepellado;
  /** Área en m² (sólo si modo === 'area'). */
  area?: number;
  /** Largo en m (sólo si modo === 'dimensiones'). */
  largo?: number;
  /** Alto en m (sólo si modo === 'dimensiones'). */
  alto?: number;
  /** Caras a aplanar: 1 (sólo interior) o 2 (interior y exterior). Default 1. */
  caras?: 1 | 2;
  /** Espesor del aplanado en metros. Default 0.015 (1.5 cm). */
  espesor?: number;
  /** Id de dosificación de mortero. Default 'repellado_1:5'. */
  dosificacionId?: string;
  /** Merma del mortero (%). Default 12. */
  mermaPct?: number;
  /** Conceptos de M.O. del usuario. */
  conceptosMO?: ConceptoManoObra[];
  /** Override del concepto de M.O. */
  conceptoMOId?: string;
  /** Precios opcionales. */
  precios?: {
    cementoSaco50?: number;
    cementoSaco25?: number;
    calBulto25?: number;
    arenaM3?: number;
    aguaM3?: number;
  };
};

export type SalidaRepellado = ResultadoCalculo & {
  dosificacion: DosificacionMortero;
  /** Área de UNA cara, m². */
  areaCara: number;
  /** Área total a aplanar (área × caras), m². */
  areaTotal: number;
  /** Volumen de mortero fresco (con merma), m³. */
  morteroM3: number;
};

export function calcularRepellado(input: InputRepellado): SalidaRepellado {
  const dos =
    DOSIFICACIONES_MORTERO[input.dosificacionId ?? 'repellado_1:5'] ??
    DOSIFICACIONES_MORTERO['repellado_1:5'];

  const areaCara =
    input.modo === 'area'
      ? input.area ?? 0
      : (input.largo ?? 0) * (input.alto ?? 0);

  const caras = input.caras ?? 1;
  const areaTotal = areaCara * caras;

  const espesor = input.espesor ?? 0.015;
  const merma = (input.mermaPct ?? 12) / 100;

  const morteroM3 = areaTotal * espesor * (1 + merma);

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

  const aguaL = sacos50 * 30;
  const aguaM3 = aguaL / 1000;

  // Costos
  const p = input.precios ?? {};
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

  const costoMateriales = costoCemento + costoCal + costoArena + costoAgua;

  // Mano de obra: por m² del área TOTAL (área × caras)
  const conceptoId = input.conceptoMOId ?? 'mo_repellado';
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
  }

  return {
    dosificacion: dos,
    areaCara,
    areaTotal,
    morteroM3,
    resumen: [
      { etiqueta: 'Área por cara', valor: `${areaCara.toFixed(2)} m²` },
      { etiqueta: 'Caras', valor: `${caras}` },
      { etiqueta: 'Área total', valor: `${areaTotal.toFixed(2)} m²` },
      { etiqueta: 'Espesor', valor: `${(espesor * 100).toFixed(1)} cm` },
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
