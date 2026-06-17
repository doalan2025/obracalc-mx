/**
 * Calculadora de losa aligerada (sistema casetón + nervaduras + capa
 * de compresión + malla electrosoldada).
 *
 * Modelo simplificado (México):
 *  - Las nervaduras van en una sola dirección (la dirección "largo").
 *  - Banda = casetón + nervadura. Su ancho es:
 *        anchoBanda = anchoCaseton + anchoNervadura
 *  - Cantidad de bandas en sentido transversal:
 *        nBandas = floor(ancho / anchoBanda)
 *    Como hay una nervadura más al final, las nervaduras totales son:
 *        nNervaduras = nBandas + 1
 *  - Cantidad de casetones por banda en sentido longitudinal:
 *        nCasPorBanda = floor(largo / largoCaseton)
 *  - Total casetones = nBandas × nCasPorBanda.
 *  - Volumen ocupado por casetones se descuenta del concreto total.
 *  - Acero longitudinal: nVarillasPorNervadura × longitud × cantNervaduras × (1 + traslapes).
 *  - Estribos #2 con la fórmula de castillos/trabes adaptada al peralte.
 *  - Malla electrosoldada: largo × ancho × (1 + traslapes), en m² y rollos.
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
import {
  CALIBRES_VARILLA,
  LONGITUD_VARILLA_COMERCIAL_M,
  type CalibreVarilla,
} from '../constants/acero';
import { MALLAS, ROLLO_MALLA_M2, type Malla } from '../constants/malla';
import type {
  CantidadMaterial,
  ConceptoManoObra,
  CostoManoObra,
  ResultadoCalculo,
} from '../types';
import { buscarConcepto } from '../manoObra';

export type InputLosaAligerada = {
  /** Largo del entrepiso (en sentido de las nervaduras), m. */
  largo: number;
  /** Ancho del entrepiso (transversal), m. */
  ancho: number;
  /** Espesor TOTAL de la losa, m. Default 0.20. */
  espesorTotalM?: number;

  // Casetón
  /** Largo del casetón, cm. Default 60. */
  largoCasetonCm?: number;
  /** Ancho del casetón, cm. Default 20. */
  anchoCasetonCm?: number;
  /** Peralte (alto) del casetón, cm. Default 20. */
  peralteCasetonCm?: number;
  /** Ancho de la nervadura, cm. Default 10. */
  anchoNervaduraCm?: number;

  // Acero longitudinal
  /** Calibre del acero longitudinal de las nervaduras. Default '#4'. */
  calibreLong?: CalibreVarilla;
  /** Número de varillas longitudinales por nervadura. Default 2. */
  varillasPorNervadura?: number;
  /** % de incremento por traslapes. Default 10. */
  traslapesAceroPct?: number;

  // Estribos
  calibreEstribo?: CalibreVarilla;
  separacionEstriboCm?: number;
  recubrimientoCm?: number;
  ganchoEstriboCm?: number;

  // Malla electrosoldada
  mallaId?: string;
  /** % de traslape en malla. Default 5. */
  traslapesMallaPct?: number;

  // Concreto
  dosificacionId?: string;
  mermaConcretoPct?: number;

  // Mano de obra
  conceptosMO?: ConceptoManoObra[];
  conceptoMOId?: string;

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
  /** Área del entrepiso, m². */
  areaM2: number;
  /** Volumen total (incluye casetones), m³. */
  volumenTotalM3: number;
  /** Volumen ocupado por los casetones, m³. */
  volumenCasetonesM3: number;
  /** Volumen NETO de concreto (con merma), m³. */
  volumenConcretoM3: number;
  /** Espesor de la capa de compresión, m. */
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

  // Geometría de bandas
  const anchoBandaM = (anchoCasetonCm + anchoNervaduraCm) / 100;
  const nBandas = Math.max(0, Math.floor(input.ancho / anchoBandaM));
  const nNervaduras = nBandas + 1;
  const nCasPorBanda = Math.max(0, Math.floor(input.largo / (largoCasetonCm / 100)));
  const numCasetones = nBandas * nCasPorBanda;

  // Volumen
  const areaM2 = input.largo * input.ancho;
  const volumenTotalM3 = areaM2 * espesorTotal;
  const volumenPorCaseton =
    (largoCasetonCm / 100) * (anchoCasetonCm / 100) * (peralteCasetonCm / 100);
  const volumenCasetonesM3 = numCasetones * volumenPorCaseton;
  const merma = (input.mermaConcretoPct ?? 5) / 100;
  const volumenConcretoNeto = Math.max(
    0,
    volumenTotalM3 - volumenCasetonesM3,
  );
  const volumenConcretoM3 = volumenConcretoNeto * (1 + merma);

  // Componentes del concreto
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

  // ---- Acero longitudinal de nervaduras ----
  const calLong = input.calibreLong ?? '#4';
  const varPorNerv = input.varillasPorNervadura ?? 2;
  const traslapesAcero = (input.traslapesAceroPct ?? 10) / 100;
  const longNervaduraM = input.largo;
  const mlLongTotal =
    varPorNerv * longNervaduraM * nNervaduras * (1 + traslapesAcero);
  const pesoLongKg = mlLongTotal * CALIBRES_VARILLA[calLong].kgPorMetro;
  const varLongCom = redondearArriba(mlLongTotal / LONGITUD_VARILLA_COMERCIAL_M);

  // ---- Estribos ----
  const calEst = input.calibreEstribo ?? '#2';
  const sepEstCm = input.separacionEstriboCm ?? 25;
  const recCm = input.recubrimientoCm ?? 2.5;
  const ganchoCm = input.ganchoEstriboCm ?? 8;
  // Estribo en nervadura: ancho = anchoNervadura, alto = peralteCaseton + capa compresion ≈ espesorTotal × 100
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
  const pesoEstribosKg =
    mlEstribosTotal * CALIBRES_VARILLA[calEst].kgPorMetro;

  // ---- Acero total y alambre ----
  const pesoAceroKg = pesoLongKg + pesoEstribosKg;
  const alambreKg = pesoAceroKg * 0.015;

  // ---- Malla electrosoldada ----
  const traslapesMalla = (input.traslapesMallaPct ?? 5) / 100;
  const mallaM2 = areaM2 * (1 + traslapesMalla);
  const rollosMalla = redondearArriba(mallaM2 / ROLLO_MALLA_M2);
  const pesoMallaKg = mallaM2 * malla.pesoKgM2;

  // ---- Costos ----
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
  const costoAcero = pesoAceroKg * (p.aceroKg ?? 0);
  const costoAlambre = alambreKg * (p.alambreKg ?? 0);
  const costoCasetones = numCasetones * (p.casetonPza ?? 0);
  const costoMalla = mallaM2 * (p.mallaM2 ?? 0);

  // ---- Materiales ----
  const materiales: CantidadMaterial[] = [
    {
      material: 'casetones',
      etiqueta: `Casetón ${largoCasetonCm}×${anchoCasetonCm}×${peralteCasetonCm}`,
      cantidad: numCasetones,
      unidad: 'pza',
      precioUnitario: p.casetonPza ?? 0,
      costoTotal: costoCasetones,
    },
    {
      material: 'concreto',
      etiqueta: 'Concreto fresco',
      cantidad: volumenConcretoM3,
      unidad: 'm³',
      equivalencias: [
        {
          etiqueta: 'Botes 19 L',
          valor: m3ABotes(volumenConcretoM3),
          unidad: 'botes',
        },
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
    {
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
    },
    {
      material: 'varilla_estribo',
      etiqueta: `Estribos ${calEst}`,
      cantidad: pesoEstribosKg,
      unidad: 'kg',
      equivalencias: [
        { etiqueta: 'Metros lineales', valor: mlEstribosTotal, unidad: 'ml' },
        {
          etiqueta: 'Estribos por nervadura',
          valor: estribosPorNervadura,
          unidad: 'pza',
        },
        {
          etiqueta: 'Estribos totales',
          valor: cantEstribosTotal,
          unidad: 'pza',
        },
      ],
      precioUnitario: p.aceroKg ?? 0,
      costoTotal: pesoEstribosKg * (p.aceroKg ?? 0),
    },
    {
      material: 'alambre',
      etiqueta: 'Alambre recocido',
      cantidad: alambreKg,
      unidad: 'kg',
      precioUnitario: p.alambreKg ?? 0,
      costoTotal: costoAlambre,
    },
    {
      material: 'malla',
      etiqueta: `Malla electrosoldada ${malla.calibre}`,
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
    },
  ];

  const costoMateriales =
    costoCasetones +
    costoCemento +
    costoArena +
    costoGrava +
    costoAgua +
    costoAcero +
    costoAlambre +
    costoMalla;

  // ---- Mano de obra ----
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
      { etiqueta: 'Concreto', valor: `${volumenConcretoM3.toFixed(3)} m³` },
      { etiqueta: 'Cemento', valor: `${redondearArriba(sacos50)} sacos 50 kg` },
      { etiqueta: 'Acero total', valor: `${pesoAceroKg.toFixed(1)} kg` },
      { etiqueta: 'Malla', valor: `${mallaM2.toFixed(1)} m² (${rollosMalla} rollos)` },
    ],
    materiales,
    manoObra,
    costoMateriales,
    costoManoObra,
    costoTotal: costoMateriales + costoManoObra,
  };
}
