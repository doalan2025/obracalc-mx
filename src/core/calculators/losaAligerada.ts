/**
 * Calculadora de losa aligerada (casetón + nervaduras + capa de
 * compresión + malla electrosoldada).
 * Output limpio: cemento (sacos), arena/grava/agua (botes), acero, malla.
 */

import { DENSIDAD, redondearArriba } from '../constants/mexico';
import {
  DOSIFICACIONES_CONCRETO,
  type DosificacionConcreto,
} from '../constants/dosificaciones';
import {
  CALIBRES_VARILLA,
  LONGITUD_VARILLA_COMERCIAL_M,
  type CalibreVarilla,
} from '../constants/acero';
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

export type InputLosaAligerada = {
  largo: number;
  ancho: number;
  espesorTotalM?: number;
  largoCasetonCm?: number;
  anchoCasetonCm?: number;
  peralteCasetonCm?: number;
  anchoNervaduraCm?: number;
  calibreLong?: CalibreVarilla;
  varillasPorNervadura?: number;
  traslapesAceroPct?: number;
  calibreEstribo?: CalibreVarilla;
  separacionEstriboCm?: number;
  recubrimientoCm?: number;
  ganchoEstriboCm?: number;
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
    aceroKg?: number;
    alambreKg?: number;
    casetonPza?: number;
    mallaM2?: number;
  };
};

export type SalidaLosaAligerada = ResultadoCalculo & {
  dosificacion: DosificacionConcreto;
  malla: Malla;
  areaM2: number;
  volumenTotalM3: number;
  volumenCasetonesM3: number;
  volumenConcretoM3: number;
  espesorCapaCompresionM: number;
  numCasetones: number;
  numNervaduras: number;
  longNervaduraM: number;
  detalleLongitudinal: {
    calibre: CalibreVarilla;
    pesoKg: number;
    mlTotal: number;
    varillasComerciales: number;
  };
  detalleEstribos: {
    calibre: CalibreVarilla;
    pesoKg: number;
    mlTotal: number;
    cantidadTotal: number;
  };
  mallaM2: number;
  rollosMalla: number;
};

export function calcularLosaAligerada(
  input: InputLosaAligerada,
): SalidaLosaAligerada {
  const dos =
    DOSIFICACIONES_CONCRETO[input.dosificacionId ?? 'f250_1:2:2'] ??
    DOSIFICACIONES_CONCRETO['f250_1:2:2'];
  const malla =
    MALLAS[input.mallaId ?? '6x6-10x10'] ?? MALLAS['6x6-10x10'];

  const espesorTotal = input.espesorTotalM ?? 0.2;
  const largoCasetonCm = input.largoCasetonCm ?? 60;
  const anchoCasetonCm = input.anchoCasetonCm ?? 20;
  const peralteCasetonCm = input.peralteCasetonCm ?? 20;
  const anchoNervaduraCm = input.anchoNervaduraCm ?? 10;

  const espesorCapaCompresion = Math.max(
    0,
    espesorTotal - peralteCasetonCm / 100,
  );

  const anchoBandaM = (anchoCasetonCm + anchoNervaduraCm) / 100;
  const nBandas = Math.max(0, Math.floor(input.ancho / anchoBandaM));
  const nNervaduras = nBandas + 1;
  const nCasPorBanda = Math.max(0, Math.floor(input.largo / (largoCasetonCm / 100)));
  const numCasetones = nBandas * nCasPorBanda;

  const areaM2 = input.largo * input.ancho;
  const volumenTotalM3 = areaM2 * espesorTotal;
  const volumenPorCaseton =
    (largoCasetonCm / 100) * (anchoCasetonCm / 100) * (peralteCasetonCm / 100);
  const volumenCasetonesM3 = numCasetones * volumenPorCaseton;
  const merma = (input.mermaConcretoPct ?? 5) / 100;
  const volumenConcretoNeto = Math.max(0, volumenTotalM3 - volumenCasetonesM3);
  const volumenConcretoM3 = volumenConcretoNeto * (1 + merma);

  const volSeco = volumenConcretoM3 * dos.factor;
  const sumaPartes = dos.cemento + dos.arena + dos.grava;
  const cementoM3 = (volSeco * dos.cemento) / sumaPartes;
  const arenaM3 = (volSeco * dos.arena) / sumaPartes;
  const gravaM3 = (volSeco * dos.grava) / sumaPartes;
  const sacos50_aprox = (cementoM3 * DENSIDAD.cemento) / 50;
  const aguaL = sacos50_aprox * dos.aguaPorSaco50;

  // Acero
  const calLong = input.calibreLong ?? '#4';
  const varPorNerv = input.varillasPorNervadura ?? 2;
  const traslapesAcero = (input.traslapesAceroPct ?? 10) / 100;
  const longNervaduraM = input.largo;
  const mlLongTotal =
    varPorNerv * longNervaduraM * nNervaduras * (1 + traslapesAcero);
  const pesoLongKg = mlLongTotal * CALIBRES_VARILLA[calLong].kgPorMetro;
  const varLongCom = redondearArriba(mlLongTotal / LONGITUD_VARILLA_COMERCIAL_M);

  const calEst = input.calibreEstribo ?? '#2';
  const sepEstCm = input.separacionEstriboCm ?? 25;
  const recCm = input.recubrimientoCm ?? 2.5;
  const ganchoCm = input.ganchoEstriboCm ?? 8;
  const altoNervCm = espesorTotal * 100;
  const longEstriboCm = Math.max(
    0,
    2 * (anchoNervaduraCm + altoNervCm) - 8 * recCm + 2 * ganchoCm,
  );
  const estribosPorNervadura = redondearArriba(
    (longNervaduraM * 100) / sepEstCm + 1,
  );
  const cantEstribosTotal = estribosPorNervadura * nNervaduras;
  const mlEstribosTotal = (cantEstribosTotal * longEstriboCm) / 100;
  const pesoEstribosKg = mlEstribosTotal * CALIBRES_VARILLA[calEst].kgPorMetro;

  const pesoAceroKg = pesoLongKg + pesoEstribosKg;
  const alambreKg = pesoAceroKg * 0.015;

  const traslapesMalla = (input.traslapesMallaPct ?? 5) / 100;
  const mallaM2 = areaM2 * (1 + traslapesMalla);
  const rollosMalla = redondearArriba(mallaM2 / ROLLO_MALLA_M2);
  const pesoMallaKg = mallaM2 * malla.pesoKgM2;

  const p = input.precios ?? {};

  const materiales: CantidadMaterial[] = [];

  // Casetones
  materiales.push({
    material: 'casetones',
    etiqueta: `Casetón ${largoCasetonCm}×${anchoCasetonCm}×${peralteCasetonCm}`,
    cantidad: numCasetones,
    unidad: 'pza',
    precioUnitario: p.casetonPza ?? 0,
    costoTotal: numCasetones * (p.casetonPza ?? 0),
  });

  // Materiales del concreto
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

  // Acero longitudinal
  materiales.push({
    material: 'varilla_long',
    etiqueta: `Varilla ${calLong} (longitudinal)`,
    cantidad: pesoLongKg,
    unidad: 'kg',
    equivalencias: [
      { etiqueta: 'Metros lineales', valor: mlLongTotal, unidad: 'ml' },
      {
        etiqueta: `Varillas comerciales (${LONGITUD_VARILLA_COMERCIAL_M} m)`,
        valor: varLongCom,
        unidad: 'pza',
      },
    ],
    precioUnitario: p.aceroKg ?? 0,
    costoTotal: pesoLongKg * (p.aceroKg ?? 0),
  });

  // Estribos
  const equivEstr: { etiqueta: string; valor: number; unidad: string }[] = [
    { etiqueta: 'Metros lineales', valor: mlEstribosTotal, unidad: 'ml' },
    { etiqueta: 'Estribos por nervadura', valor: estribosPorNervadura, unidad: 'pza' },
    { etiqueta: 'Estribos totales', valor: cantEstribosTotal, unidad: 'pza' },
  ];
  if (calEst === '#2') {
    equivEstr.push({ etiqueta: 'Alambrón (3.5 m/kg)', valor: pesoEstribosKg, unidad: 'kg' });
  }

  materiales.push({
    material: 'varilla_estribo',
    etiqueta: calEst === '#2' ? `Alambrón ${calEst}` : `Estribos ${calEst}`,
    cantidad: pesoEstribosKg,
    unidad: 'kg',
    equivalencias: equivEstr,
    precioUnitario: p.aceroKg ?? 0,
    costoTotal: pesoEstribosKg * (p.aceroKg ?? 0),
  });

  materiales.push({
    material: 'alambre',
    etiqueta: 'Alambre recocido',
    cantidad: alambreKg,
    unidad: 'kg',
    precioUnitario: p.alambreKg ?? 0,
    costoTotal: alambreKg * (p.alambreKg ?? 0),
  });

  // Malla
  materiales.push({
    material: 'malla',
    etiqueta: `Malla electrosoldada ${malla.calibre}`,
    cantidad: rollosMalla,
    unidad: 'rollos',
    equivalencias: [
      { etiqueta: 'Cobertura', valor: mallaM2, unidad: 'm²' },
      { etiqueta: 'Peso aproximado', valor: pesoMallaKg, unidad: 'kg' },
    ],
    precioUnitario: p.mallaM2 ?? 0,
    costoTotal: mallaM2 * (p.mallaM2 ?? 0),
  });

  const costoMateriales = materiales.reduce(
    (acc, m) => acc + (m.costoTotal ?? 0),
    0,
  );

  // M.O.
  const conceptoId = input.conceptoMOId ?? 'mo_losa_aligerada';
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
    volumenTotalM3,
    volumenCasetonesM3,
    volumenConcretoM3,
    espesorCapaCompresionM: espesorCapaCompresion,
    numCasetones,
    numNervaduras: nNervaduras,
    longNervaduraM,
    detalleLongitudinal: {
      calibre: calLong,
      pesoKg: pesoLongKg,
      mlTotal: mlLongTotal,
      varillasComerciales: varLongCom,
    },
    detalleEstribos: {
      calibre: calEst,
      pesoKg: pesoEstribosKg,
      mlTotal: mlEstribosTotal,
      cantidadTotal: cantEstribosTotal,
    },
    mallaM2,
    rollosMalla,
    resumen: [
      { etiqueta: 'Área', valor: `${areaM2.toFixed(2)} m²` },
      { etiqueta: 'Capa compresión', valor: `${(espesorCapaCompresion * 100).toFixed(1)} cm` },
      { etiqueta: 'Casetones', valor: `${numCasetones} pza` },
      { etiqueta: 'Nervaduras', valor: `${nNervaduras} × ${longNervaduraM} m` },
      { etiqueta: 'Volumen concreto', valor: `${volumenConcretoM3.toFixed(3)} m³` },
      { etiqueta: 'Acero total', valor: `${pesoAceroKg.toFixed(1)} kg` },
      { etiqueta: 'Malla', valor: `${rollosMalla} rollos` },
    ],
    materiales,
    manoObra,
    costoMateriales,
    costoManoObra,
    costoTotal: costoMateriales + costoManoObra,
  };
}
