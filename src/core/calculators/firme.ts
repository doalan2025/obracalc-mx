/**
 * Calculadora de firme de concreto (con o sin malla electrosoldada).
 * Output limpio: cemento (sacos), arena/grava/agua (botes), malla (rollos).
 */

import { DENSIDAD, redondearArriba } from '../constants/mexico';
import {
  DOSIFICACIONES_CONCRETO,
  type DosificacionConcreto,
} from '../constants/dosificaciones';
import { MALLAS, ROLLO_MALLA_M2, type Malla } from '../constants/malla';
import {
  materialArena,
  materialCementoFromM3,
  materialGrava,
  materialAgua,
} from '../materialesHelper';
import type { PreferenciaCemento } from '../materialesHelper';
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
  espesorM?: number;
  conMalla?: boolean;
  mallaId?: string;
  traslapesMallaPct?: number;
  dosificacionId?: string;
  mermaConcretoPct?: number;
  conceptosMO?: ConceptoManoObra[];
  conceptoMOId?: string;
  /** Tipo de bulto de cemento preferido (saco50 / saco25). Default saco50. */
  cementoPreferido?: PreferenciaCemento;
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

  const volSeco = volumenConcretoM3 * dos.factor;
  const sumaPartes = dos.cemento + dos.arena + dos.grava;
  const cementoM3 = (volSeco * dos.cemento) / sumaPartes;
  const arenaM3 = (volSeco * dos.arena) / sumaPartes;
  const gravaM3 = (volSeco * dos.grava) / sumaPartes;
  const sacos50_aprox = (cementoM3 * DENSIDAD.cemento) / 50;
  const aguaL = sacos50_aprox * dos.aguaPorSaco50;

  const traslapesMalla = (input.traslapesMallaPct ?? 5) / 100;
  const mallaM2 = malla ? areaM2 * (1 + traslapesMalla) : 0;
  const rollosMalla = malla ? redondearArriba(mallaM2 / ROLLO_MALLA_M2) : 0;
  const pesoMallaKg = malla ? mallaM2 * malla.pesoKgM2 : 0;

  const p = input.precios ?? {};

  const materiales: CantidadMaterial[] = [];

  const matCemento = materialCementoFromM3(cementoM3, {
    saco50: p.cementoSaco50,
    saco25: p.cementoSaco25,
      preferencia: input.cementoPreferido,
  });
  if (matCemento) materiales.push(matCemento);

  const matArena = materialArena(arenaM3, p.arenaM3);
  if (matArena) materiales.push(matArena);

  const matGrava = materialGrava(gravaM3, p.gravaM3);
  if (matGrava) materiales.push(matGrava);

  const matAgua = materialAgua(aguaL, p.aguaM3);
  if (matAgua) materiales.push(matAgua);

  if (malla) {
    const costoMalla = mallaM2 * (p.mallaM2 ?? 0);
    materiales.push({
      material: 'malla',
      etiqueta: `Malla electrosoldada cal. ${malla.calibre}`,
      cantidad: rollosMalla,
      unidad: 'rollos',
      equivalencias: [
        { etiqueta: 'Cobertura', valor: mallaM2, unidad: 'm²' },
        { etiqueta: 'Peso aproximado', valor: pesoMallaKg, unidad: 'kg' },
      ],
      precioUnitario: p.mallaM2 ?? 0,
      costoTotal: costoMalla,
    });
  }

  const costoMateriales = materiales.reduce(
    (acc, m) => acc + (m.costoTotal ?? 0),
    0,
  );

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
      { etiqueta: 'Volumen concreto', valor: `${volumenConcretoM3.toFixed(3)} m³` },
      ...(malla ? [{ etiqueta: 'Malla', valor: `${rollosMalla} rollos` }] : []),
    ],
    materiales,
    manoObra,
    costoMateriales,
    costoManoObra,
    costoTotal: costoMateriales + costoManoObra,
  };
}
