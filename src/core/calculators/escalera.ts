/**
 * Calculadora de escalera de concreto.
 *
 * Modelo:
 *  - Geometría: altura total H y huella (peldaño) configurable.
 *  - # de escalones = redondear(H / peraltUnitario).
 *  - Volumen escalón triangular = 0.5 × huella × peralte × ancho.
 *  - Losa de rampa: largo × ancho × espesor (longitud horizontal).
 *  - Acero: barras longitudinales bajo la rampa + bastones por escalón.
 *  - M.O.: por m² de área proyectada.
 */

import {
  DENSIDAD,
  m3ABotes,
  m3CementoASacos50,
  redondearArriba,
} from '../constants/mexico';
import {
  DOSIFICACIONES_CONCRETO,
  type DosificacionConcreto,
} from '../constants/dosificaciones';
import {
  CALIBRES_VARILLA,
  type CalibreVarilla,
} from '../constants/acero';
import type {
  CantidadMaterial,
  ConceptoManoObra,
  CostoManoObra,
  ResultadoCalculo,
} from '../types';
import { buscarConcepto } from '../manoObra';

export type InputEscalera = {
  /** Altura total a salvar, m. */
  alturaTotalM: number;
  /** Ancho de la escalera, m. */
  anchoM: number;
  /** Huella del peldaño en cm. Default 28. */
  huellaCm?: number;
  /** Peralte de cada peldaño en cm. Default 18. */
  peraltCm?: number;
  /** Espesor de losa de rampa en cm. Default 12. */
  espesorRampaCm?: number;
  /** # varillas longitudinales bajo la rampa. Default 5. */
  varillasLong?: number;
  calibreLong?: CalibreVarilla;
  /** % traslapes. Default 10. */
  traslapesPct?: number;
  dosificacionId?: string;
  mermaConcretoPct?: number;
  conceptosMO?: ConceptoManoObra[];
  conceptoMOId?: string;
  tarifaMOM2?: number;
  precios?: {
    cementoSaco50?: number;
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

  // Volumen de cada peldaño (triángulo) + losa rampa
  const volPeldano = 0.5 * huella * peralt * ancho;
  const volPeldanos = numEscalones * volPeldano;
  const volRampa = longRampa * ancho * espesor;
  const volumenConcretoM3 = (volPeldanos + volRampa) * (1 + merma);

  // Componentes
  const volSeco = volumenConcretoM3 * dos.factor;
  const sumaPartes = dos.cemento + dos.arena + dos.grava;
  const cementoM3 = (volSeco * dos.cemento) / sumaPartes;
  const arenaM3 = (volSeco * dos.arena) / sumaPartes;
  const gravaM3 = (volSeco * dos.grava) / sumaPartes;
  const cementoKg = cementoM3 * DENSIDAD.cemento;
  const sacos50 = m3CementoASacos50(cementoM3);
  const aguaL = sacos50 * dos.aguaPorSaco50;

  // Acero
  const numLong = input.varillasLong ?? 5;
  const calLong = input.calibreLong ?? '#3';
  const mlLong = numLong * longRampa * (1 + traslapes);
  const pesoLong = mlLong * CALIBRES_VARILLA[calLong].kgPorMetro;
  // Estribos / bastones por escalón ~ 1 estribo/escalón × ancho
  const mlEst = numEscalones * (ancho * 2 + 0.4) * (1 + traslapes);
  const pesoEst = mlEst * CALIBRES_VARILLA['#2'].kgPorMetro;

  const pesoAcero = pesoLong + pesoEst;
  const alambreKg = pesoAcero * 0.015;

  const p = input.precios ?? {};
  const costoCemento =
    (p.cementoSaco50 ?? 0) > 0
      ? redondearArriba(sacos50) * (p.cementoSaco50 ?? 0)
      : 0;
  const costoArena = arenaM3 * (p.arenaM3 ?? 0);
  const costoGrava = gravaM3 * (p.gravaM3 ?? 0);
  const costoAgua = (aguaL / 1000) * (p.aguaM3 ?? 0);
  const costoAcero = pesoAcero * (p.aceroKg ?? 0);
  const costoAlambre = alambreKg * (p.alambreKg ?? 0);

  const materiales: CantidadMaterial[] = [
    {
      material: 'concreto',
      etiqueta: 'Concreto fresco',
      cantidad: volumenConcretoM3,
      unidad: 'm³',
      equivalencias: [{ etiqueta: 'Botes 19 L', valor: m3ABotes(volumenConcretoM3), unidad: 'botes' }],
    },
    {
      material: 'cemento',
      etiqueta: 'Cemento gris',
      cantidad: cementoKg,
      unidad: 'kg',
      equivalencias: [
        { etiqueta: 'Sacos 50 kg', valor: redondearArriba(sacos50), unidad: 'sacos' },
      ],
      precioUnitario: p.cementoSaco50 ?? 0,
      costoTotal: costoCemento,
    },
    {
      material: 'arena',
      etiqueta: 'Arena',
      cantidad: arenaM3,
      unidad: 'm³',
      precioUnitario: p.arenaM3 ?? 0,
      costoTotal: costoArena,
    },
    {
      material: 'grava',
      etiqueta: 'Grava',
      cantidad: gravaM3,
      unidad: 'm³',
      precioUnitario: p.gravaM3 ?? 0,
      costoTotal: costoGrava,
    },
    {
      material: 'agua',
      etiqueta: 'Agua',
      cantidad: aguaL,
      unidad: 'L',
      precioUnitario: p.aguaM3 ?? 0,
      costoTotal: costoAgua,
    },
    {
      material: 'varilla_long',
      etiqueta: `Varilla ${calLong} (longitudinal rampa)`,
      cantidad: pesoLong,
      unidad: 'kg',
      equivalencias: [{ etiqueta: 'Metros lineales', valor: mlLong, unidad: 'ml' }],
      precioUnitario: p.aceroKg ?? 0,
      costoTotal: pesoLong * (p.aceroKg ?? 0),
    },
    {
      material: 'varilla_estribo',
      etiqueta: 'Estribos #2 por escalón',
      cantidad: pesoEst,
      unidad: 'kg',
      equivalencias: [{ etiqueta: 'Metros lineales', valor: mlEst, unidad: 'ml' }],
      precioUnitario: p.aceroKg ?? 0,
      costoTotal: pesoEst * (p.aceroKg ?? 0),
    },
    {
      material: 'alambre',
      etiqueta: 'Alambre recocido',
      cantidad: alambreKg,
      unidad: 'kg',
      precioUnitario: p.alambreKg ?? 0,
      costoTotal: costoAlambre,
    },
  ];

  const costoMateriales =
    costoCemento + costoArena + costoGrava + costoAgua + costoAcero + costoAlambre;

  // M.O. por m² proyectado
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
      { etiqueta: 'Huella × peralte', valor: `${(huella * 100).toFixed(0)} × ${(peralt * 100).toFixed(0)} cm` },
      { etiqueta: 'Longitud horizontal', valor: `${longHorizontal.toFixed(2)} m` },
      { etiqueta: 'Longitud de rampa', valor: `${longRampa.toFixed(2)} m` },
      { etiqueta: 'Concreto', valor: `${volumenConcretoM3.toFixed(3)} m³` },
      { etiqueta: 'Acero', valor: `${pesoAcero.toFixed(1)} kg` },
    ],
    materiales,
    manoObra,
    costoMateriales,
    costoManoObra,
    costoTotal: costoMateriales + costoManoObra,
  };
}
