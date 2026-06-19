/**
 * Calculadora de cisterna / tinaco rectangular.
 * Output limpio: cemento (sacos), arena/grava/agua (botes), acero (kg+ml),
 * impermeabilizante (cubetas 19 L).
 */

import { DENSIDAD, redondearArriba } from '../constants/mexico';
import {
  DOSIFICACIONES_CONCRETO,
  type DosificacionConcreto,
} from '../constants/dosificaciones';
import {
  CALIBRES_VARILLA,
  type CalibreVarilla,
} from '../constants/acero';
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

export type InputCisterna = {
  largoM: number;
  anchoM: number;
  alturaM: number;
  espesorMuroCm?: number;
  espesorLosaCm?: number;
  conTapa?: boolean;
  calibreAcero?: CalibreVarilla;
  separacionAceroCm?: number;
  traslapesPct?: number;
  rendimientoImpM2PorL?: number;
  manosImp?: number;
  dosificacionId?: string;
  mermaConcretoPct?: number;
  conceptosMO?: ConceptoManoObra[];
  conceptoMOId?: string;
  tarifaMOM3?: number;
  /** Tipo de bulto de cemento preferido (saco50 / saco25). Default saco50. */
  cementoPreferido?: PreferenciaCemento;
  precios?: {
    cementoSaco50?: number;
    cementoSaco25?: number;
    arenaM3?: number;
    gravaM3?: number;
    aguaM3?: number;
    aceroKg?: number;
    alambreKg?: number;
    impermeabilizanteCubeta?: number;
  };
};

export type SalidaCisterna = ResultadoCalculo & {
  dosificacion: DosificacionConcreto;
  volumenUtilM3: number;
  capacidadLitros: number;
  volumenConcretoM3: number;
  pesoAceroKg: number;
  superficieInteriorM2: number;
  cubetasImpermeabilizante: number;
};

export function calcularCisterna(input: InputCisterna): SalidaCisterna {
  const dos =
    DOSIFICACIONES_CONCRETO[input.dosificacionId ?? 'f250_1:2:2'] ??
    DOSIFICACIONES_CONCRETO['f250_1:2:2'];

  const eMuro = (input.espesorMuroCm ?? 15) / 100;
  const eLosa = (input.espesorLosaCm ?? 12) / 100;
  const conTapa = input.conTapa ?? true;
  const merma = (input.mermaConcretoPct ?? 5) / 100;
  const traslapes = (input.traslapesPct ?? 10) / 100;
  const cal = input.calibreAcero ?? '#3';
  const sep = (input.separacionAceroCm ?? 20) / 100;

  const Li = input.largoM;
  const Wi = input.anchoM;
  const Hi = input.alturaM;

  const Lext = Li + 2 * eMuro;
  const Wext = Wi + 2 * eMuro;
  const Hext = Hi + eLosa + (conTapa ? eLosa : 0);

  const volumenUtilM3 = Li * Wi * Hi;
  const capacidadLitros = volumenUtilM3 * 1000;

  const volExt = Lext * Wext * Hext;
  const volHueco = Li * Wi * Hi;
  const volSinTapa = !conTapa ? Lext * Wext * eLosa : 0;
  const volumenConcretoM3 = (volExt - volHueco - volSinTapa) * (1 + merma);

  const volSeco = volumenConcretoM3 * dos.factor;
  const sumaPartes = dos.cemento + dos.arena + dos.grava;
  const cementoM3 = (volSeco * dos.cemento) / sumaPartes;
  const arenaM3 = (volSeco * dos.arena) / sumaPartes;
  const gravaM3 = (volSeco * dos.grava) / sumaPartes;
  const sacos50_aprox = (cementoM3 * DENSIDAD.cemento) / 50;
  const aguaL = sacos50_aprox * dos.aguaPorSaco50;

  // Acero
  const areaLosaFondo = Lext * Wext;
  const areaLosaTapa = conTapa ? Lext * Wext : 0;
  const areaMuros = 2 * (Lext + Wext) * Hext;
  const areaTotalAcero = areaLosaFondo + areaLosaTapa + areaMuros;
  const mlAcero = ((2 * areaTotalAcero) / sep) * (1 + traslapes);
  const pesoAceroKg = mlAcero * CALIBRES_VARILLA[cal].kgPorMetro;
  const alambreKg = pesoAceroKg * 0.015;

  // Impermeabilización interior
  const superficieInteriorM2 = Li * Wi + 2 * (Li + Wi) * Hi;
  const manos = input.manosImp ?? 2;
  const rend = input.rendimientoImpM2PorL ?? 1.5;
  const litrosImp = (superficieInteriorM2 * manos) / rend;
  const cubetasImp = redondearArriba(litrosImp / 19);

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

  materiales.push({
    material: 'varilla',
    etiqueta: `Varilla ${cal}`,
    cantidad: pesoAceroKg,
    unidad: 'kg',
    equivalencias: [{ etiqueta: 'Metros lineales', valor: mlAcero, unidad: 'ml' }],
    precioUnitario: p.aceroKg ?? 0,
    costoTotal: pesoAceroKg * (p.aceroKg ?? 0),
  });

  materiales.push({
    material: 'alambre',
    etiqueta: 'Alambre recocido',
    cantidad: alambreKg,
    unidad: 'kg',
    precioUnitario: p.alambreKg ?? 0,
    costoTotal: alambreKg * (p.alambreKg ?? 0),
  });

  materiales.push({
    material: 'impermeabilizante',
    etiqueta: 'Impermeabilizante interior (cubeta 19 L)',
    cantidad: cubetasImp,
    unidad: 'cubetas',
    equivalencias: [{ etiqueta: 'Litros aproximados', valor: litrosImp, unidad: 'L' }],
    precioUnitario: p.impermeabilizanteCubeta ?? 0,
    costoTotal: cubetasImp * (p.impermeabilizanteCubeta ?? 0),
  });

  const costoMateriales = materiales.reduce(
    (acc, m) => acc + (m.costoTotal ?? 0),
    0,
  );

  // M.O.
  const conceptoId = input.conceptoMOId ?? 'mo_cisterna';
  const concepto = buscarConcepto(input.conceptosMO ?? [], conceptoId);
  let manoObra: CostoManoObra[] = [];
  let costoManoObra = 0;
  if (concepto) {
    const total = volumenUtilM3 * concepto.tarifa;
    manoObra = [
      {
        conceptoId: concepto.id,
        nombre: concepto.nombre,
        cantidad: volumenUtilM3,
        unidad: concepto.unidad,
        tarifa: concepto.tarifa,
        total,
      },
    ];
    costoManoObra = total;
  } else if ((input.tarifaMOM3 ?? 0) > 0) {
    const total = volumenUtilM3 * (input.tarifaMOM3 ?? 0);
    manoObra = [
      {
        conceptoId: 'cisterna_m3',
        nombre: 'Cisterna construida',
        cantidad: volumenUtilM3,
        unidad: 'm3',
        tarifa: input.tarifaMOM3 ?? 0,
        total,
      },
    ];
    costoManoObra = total;
  }

  return {
    dosificacion: dos,
    volumenUtilM3,
    capacidadLitros,
    volumenConcretoM3,
    pesoAceroKg,
    superficieInteriorM2,
    cubetasImpermeabilizante: cubetasImp,
    resumen: [
      {
        etiqueta: 'Volumen útil',
        valor: `${volumenUtilM3.toFixed(2)} m³ (${capacidadLitros.toFixed(0)} L)`,
      },
      { etiqueta: 'Concreto', valor: `${volumenConcretoM3.toFixed(3)} m³` },
      { etiqueta: 'Acero', valor: `${pesoAceroKg.toFixed(1)} kg` },
      { etiqueta: 'Imperm. cubetas', valor: `${cubetasImp}` },
    ],
    materiales,
    manoObra,
    costoMateriales,
    costoManoObra,
    costoTotal: costoMateriales + costoManoObra,
  };
}
