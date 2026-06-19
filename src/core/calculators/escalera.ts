/**
 * Calculadora de escalera de concreto.
 * Output limpio: cemento (sacos), arena/grava/agua (botes), acero (kg+ml).
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

export type InputEscalera = {
  alturaTotalM: number;
  anchoM: number;
  huellaCm?: number;
  peraltCm?: number;
  espesorRampaCm?: number;
  varillasLong?: number;
  calibreLong?: CalibreVarilla;
  traslapesPct?: number;
  dosificacionId?: string;
  mermaConcretoPct?: number;
  conceptosMO?: ConceptoManoObra[];
  conceptoMOId?: string;
  tarifaMOM2?: number;
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
  };
};

export type SalidaEscalera = ResultadoCalculo & {
  dosificacion: DosificacionConcreto;
  numEscalones: number;
  longHorizontalM: number;
  longRampaM: number;
  volumenConcretoM3: number;
};

export function calcularEscalera(input: InputEscalera): SalidaEscalera {
  const dos =
    DOSIFICACIONES_CONCRETO[input.dosificacionId ?? 'f200_1:2:2.5'] ??
    DOSIFICACIONES_CONCRETO['f200_1:2:2.5'];

  const huella = (input.huellaCm ?? 28) / 100;
  const peralt = (input.peraltCm ?? 18) / 100;
  const espesor = (input.espesorRampaCm ?? 12) / 100;
  const merma = (input.mermaConcretoPct ?? 5) / 100;
  const traslapes = (input.traslapesPct ?? 10) / 100;
  const ancho = input.anchoM;

  const numEscalones = Math.max(1, Math.round(input.alturaTotalM / peralt));
  const longHorizontal = numEscalones * huella;
  const longRampa = Math.sqrt(input.alturaTotalM ** 2 + longHorizontal ** 2);

  const volPeldano = 0.5 * huella * peralt * ancho;
  const volPeldanos = numEscalones * volPeldano;
  const volRampa = longRampa * ancho * espesor;
  const volumenConcretoM3 = (volPeldanos + volRampa) * (1 + merma);

  const volSeco = volumenConcretoM3 * dos.factor;
  const sumaPartes = dos.cemento + dos.arena + dos.grava;
  const cementoM3 = (volSeco * dos.cemento) / sumaPartes;
  const arenaM3 = (volSeco * dos.arena) / sumaPartes;
  const gravaM3 = (volSeco * dos.grava) / sumaPartes;
  const sacos50_aprox = (cementoM3 * DENSIDAD.cemento) / 50;
  const aguaL = sacos50_aprox * dos.aguaPorSaco50;

  // Acero
  const numLong = input.varillasLong ?? 5;
  const calLong = input.calibreLong ?? '#3';
  const mlLong = numLong * longRampa * (1 + traslapes);
  const pesoLong = mlLong * CALIBRES_VARILLA[calLong].kgPorMetro;
  // Estribos #2 (alambrón)
  const mlEst = numEscalones * (ancho * 2 + 0.4) * (1 + traslapes);
  const pesoEst = mlEst * CALIBRES_VARILLA['#2'].kgPorMetro;

  const pesoAcero = pesoLong + pesoEst;
  const alambreKg = pesoAcero * 0.015;

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
    material: 'varilla_long',
    etiqueta: `Varilla ${calLong} (longitudinal rampa)`,
    cantidad: pesoLong,
    unidad: 'kg',
    equivalencias: [{ etiqueta: 'Metros lineales', valor: mlLong, unidad: 'ml' }],
    precioUnitario: p.aceroKg ?? 0,
    costoTotal: pesoLong * (p.aceroKg ?? 0),
  });

  materiales.push({
    material: 'varilla_estribo',
    etiqueta: 'Alambrón #2 para estribos por escalón',
    cantidad: pesoEst,
    unidad: 'kg',
    equivalencias: [
      { etiqueta: 'Metros lineales', valor: mlEst, unidad: 'ml' },
      { etiqueta: 'Alambrón (3.5 m/kg)', valor: pesoEst, unidad: 'kg' },
    ],
    precioUnitario: p.aceroKg ?? 0,
    costoTotal: pesoEst * (p.aceroKg ?? 0),
  });

  materiales.push({
    material: 'alambre',
    etiqueta: 'Alambre recocido',
    cantidad: alambreKg,
    unidad: 'kg',
    precioUnitario: p.alambreKg ?? 0,
    costoTotal: alambreKg * (p.alambreKg ?? 0),
  });

  const costoMateriales = materiales.reduce(
    (acc, m) => acc + (m.costoTotal ?? 0),
    0,
  );

  // M.O.
  const areaProyectada = longHorizontal * ancho;
  const conceptoId = input.conceptoMOId ?? 'mo_escalera';
  const concepto = buscarConcepto(input.conceptosMO ?? [], conceptoId);
  let manoObra: CostoManoObra[] = [];
  let costoManoObra = 0;
  if (concepto) {
    const total = areaProyectada * concepto.tarifa;
    manoObra = [
      {
        conceptoId: concepto.id,
        nombre: concepto.nombre,
        cantidad: areaProyectada,
        unidad: concepto.unidad,
        tarifa: concepto.tarifa,
        total,
      },
    ];
    costoManoObra = total;
  } else if ((input.tarifaMOM2 ?? 0) > 0) {
    const total = areaProyectada * (input.tarifaMOM2 ?? 0);
    manoObra = [
      {
        conceptoId: 'escalera_m2',
        nombre: 'Escalera de concreto',
        cantidad: areaProyectada,
        unidad: 'm2',
        tarifa: input.tarifaMOM2 ?? 0,
        total,
      },
    ];
    costoManoObra = total;
  }

  return {
    dosificacion: dos,
    numEscalones,
    longHorizontalM: longHorizontal,
    longRampaM: longRampa,
    volumenConcretoM3,
    resumen: [
      { etiqueta: 'Escalones', valor: `${numEscalones}` },
      {
        etiqueta: 'Huella × peralte',
        valor: `${(huella * 100).toFixed(0)} × ${(peralt * 100).toFixed(0)} cm`,
      },
      { etiqueta: 'Longitud rampa', valor: `${longRampa.toFixed(2)} m` },
      { etiqueta: 'Volumen concreto', valor: `${volumenConcretoM3.toFixed(3)} m³` },
      { etiqueta: 'Acero', valor: `${pesoAcero.toFixed(1)} kg` },
    ],
    materiales,
    manoObra,
    costoMateriales,
    costoManoObra,
    costoTotal: costoMateriales + costoManoObra,
  };
}
