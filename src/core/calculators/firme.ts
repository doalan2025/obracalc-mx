/**
 * Calculadora de firme de concreto (con o sin malla electrosoldada).
 *
 * Modelo (México):
 *  - Firme = capa de concreto sobre suelo o losa, sin acero estructural.
 *  - Espesor típico: 8 a 12 cm.
 *  - Refuerzo opcional con malla electrosoldada (default 6×6-10/10).
 *  - Dosificación común: f'c 150 (1:2:3) o 200 (1:2:2.5).
 *  - Mano de obra: por m² (concepto mo_firme).
 */

import {
  DENSIDAD,
  m3ABotes,
  m3CementoASacos25,
  m3CementoASacos50,
  redondearArriba,
} from '../constants/mexico';
import {
  DOSIFICACIONES_CONCRETO,
  type DosificacionConcreto,
} from '../constants/dosificaciones';
import { MALLAS, ROLLO_MALLA_M2, type Malla } from '../constants/malla';
import type {
  CantidadMaterial,
  ConceptoManoObra,
  CostoManoObra,
  ResultadoCalculo,
} from '../types';
import { buscarConcepto } from '../manoObra';

export type ModoEntradaFirme = 'area' | 'dimensiones';

export type InputFirme = {
  modo: ModoEntradaFirme;
  area?: number;
  largo?: number;
  ancho?: number;
  /** Espesor del firme, m. Default 0.10 (10 cm). */
  espesorM?: number;
  /** ¿Incluir malla electrosoldada? Default true. */
  conMalla?: boolean;
  mallaId?: string;
  traslapesMallaPct?: number;
  dosificacionId?: string;
  mermaConcretoPct?: number;
  conceptosMO?: ConceptoManoObra[];
  conceptoMOId?: string;
  precios?: {
    cementoSaco50?: number;
    cementoSaco25?: number;
    arenaM3?: number;
    gravaM3?: number;
    aguaM3?: number;
    mallaM2?: number;
  };
};

export type SalidaFirme = ResultadoCalculo & {
  dosificacion: DosificacionConcreto;
  malla: Malla | null;
  areaM2: number;
  volumenConcretoM3: number;
  mallaM2: number;
  rollosMalla: number;
};

export function calcularFirme(input: InputFirme): SalidaFirme {
  const dos =
    DOSIFICACIONES_CONCRETO[input.dosificacionId ?? 'f150_1:2:3'] ??
    DOSIFICACIONES_CONCRETO['f150_1:2:3'];

  const conMalla = input.conMalla ?? true;
  const malla = conMalla
    ? MALLAS[input.mallaId ?? '6x6-10x10'] ?? MALLAS['6x6-10x10']
    : null;

  const areaM2 =
    input.modo === 'area'
      ? input.area ?? 0
      : (input.largo ?? 0) * (input.ancho ?? 0);

  const espesor = input.espesorM ?? 0.1;
  const merma = (input.mermaConcretoPct ?? 5) / 100;
  const volumenConcretoM3 = areaM2 * espesor * (1 + merma);

  // Componentes
  const volSeco = volumenConcretoM3 * dos.factor;
  const sumaPartes = dos.cemento + dos.arena + dos.grava;
  const cementoM3 = (volSeco * dos.cemento) / sumaPartes;
  const arenaM3 = (volSeco * dos.arena) / sumaPartes;
  const gravaM3 = (volSeco * dos.grava) / sumaPartes;
  const cementoKg = cementoM3 * DENSIDAD.cemento;
  const sacos50 = m3CementoASacos50(cementoM3);
  const sacos25 = m3CementoASacos25(cementoM3);
  const aguaL = sacos50 * dos.aguaPorSaco50;
  const aguaM3 = aguaL / 1000;

  // Malla
  const traslapesMalla = (input.traslapesMallaPct ?? 5) / 100;
  const mallaM2 = malla ? areaM2 * (1 + traslapesMalla) : 0;
  const rollosMalla = malla ? redondearArriba(mallaM2 / ROLLO_MALLA_M2) : 0;
  const pesoMallaKg = malla ? mallaM2 * malla.pesoKgM2 : 0;

  // Costos
  const p = input.precios ?? {};
  const costoCemento =
    (p.cementoSaco50 ?? 0) > 0
      ? redondearArriba(sacos50) * (p.cementoSaco50 ?? 0)
      : (p.cementoSaco25 ?? 0) > 0
        ? redondearArriba(sacos25) * (p.cementoSaco25 ?? 0)
        : 0;
  const costoArena = arenaM3 * (p.arenaM3 ?? 0);
  const costoGrava = gravaM3 * (p.gravaM3 ?? 0);
  const costoAgua = aguaM3 * (p.aguaM3 ?? 0);
  const costoMalla = mallaM2 * (p.mallaM2 ?? 0);

  const materiales: CantidadMaterial[] = [
    {
      material: 'concreto',
      etiqueta: 'Concreto fresco',
      cantidad: volumenConcretoM3,
      unidad: 'm³',
      equivalencias: [
        { etiqueta: 'Botes 19 L', valor: m3ABotes(volumenConcretoM3), unidad: 'botes' },
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
      precioUnitario: p.aguaM3 ?? 0,
      costoTotal: costoAgua,
    },
  ];

  if (malla) {
    materiales.push({
      material: 'malla',
      etiqueta: `Malla electrosoldada cal. ${malla.calibre}`,
      cantidad: mallaM2,
      unidad: 'm²',
      equivalencias: [
        {
          etiqueta: `Rollos (${ROLLO_MALLA_M2} m²)`,
          valor: rollosMalla,
          unidad: 'rollos',
        },
        { etiqueta: 'Peso aproximado', valor: pesoMallaKg, unidad: 'kg' },
      ],
      precioUnitario: p.mallaM2 ?? 0,
      costoTotal: costoMalla,
    });
  }

  const costoMateriales =
    costoCemento + costoArena + costoGrava + costoAgua + costoMalla;

  // Mano de obra
  const conceptoId = input.conceptoMOId ?? 'mo_firme';
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
  }

  return {
    dosificacion: dos,
    malla,
    areaM2,
    volumenConcretoM3,
    mallaM2,
    rollosMalla,
    resumen: [
      { etiqueta: 'Área', valor: `${areaM2.toFixed(2)} m²` },
      { etiqueta: 'Espesor', valor: `${(espesor * 100).toFixed(1)} cm` },
      { etiqueta: 'Concreto', valor: `${volumenConcretoM3.toFixed(3)} m³` },
      { etiqueta: 'Cemento', valor: `${redondearArriba(sacos50)} sacos 50 kg` },
      ...(malla
        ? [{ etiqueta: 'Malla', valor: `${mallaM2.toFixed(1)} m² (${rollosMalla} rollos)` }]
        : []),
    ],
    materiales,
    manoObra,
    costoMateriales,
    costoManoObra,
    costoTotal: costoMateriales + costoManoObra,
  };
}
