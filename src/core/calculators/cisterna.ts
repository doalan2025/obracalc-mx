/**
 * Calculadora de cisterna / tinaco rectangular.
 *
 * Modelo:
 *  - Volumen útil = largo × ancho × altura (en m³, con 1 m³ = 1 000 L).
 *  - Concreto de paredes y losa: simplificación geométrica:
 *      • Losa de fondo:    largoExt × anchoExt × espesorLosa
 *      • 4 paredes:        2(largoExt + anchoExt) × alturaExt × espesorMuro
 *      • Tapa (opcional):  largoExt × anchoExt × espesorLosa
 *    largoExt = largo + 2*espesorMuro, anchoExt = ancho + 2*espesorMuro,
 *    alturaExt = altura + espesorLosa
 *  - Acero: parrilla de losa + acero vertical y horizontal en muros.
 *  - Impermeabilización interior: superficie interior × 1 (con merma).
 *  - M.O. por m³ útil (concepto mo_cisterna) o tarifa libre.
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

export type InputCisterna = {
  /** Largo interior, m. */
  largoM: number;
  /** Ancho interior, m. */
  anchoM: number;
  /** Altura interior (lámina de agua), m. */
  alturaM: number;
  /** Espesor de muros, cm. Default 15. */
  espesorMuroCm?: number;
  /** Espesor de losas (fondo y tapa), cm. Default 12. */
  espesorLosaCm?: number;
  /** ¿Lleva tapa de concreto? Default true. */
  conTapa?: boolean;
  /** Calibre del acero. Default '#3'. */
  calibreAcero?: CalibreVarilla;
  /** Separación de acero cm. Default 20. */
  separacionAceroCm?: number;
  traslapesPct?: number;
  /** Rendimiento impermeabilizante m²/L. Default 1.5. */
  rendimientoImpM2PorL?: number;
  manosImp?: number;
  dosificacionId?: string;
  mermaConcretoPct?: number;
  conceptosMO?: ConceptoManoObra[];
  conceptoMOId?: string;
  tarifaMOM3?: number;
  precios?: {
    cementoSaco50?: number;
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

  // Volumen de concreto: estructura completa - hueco interior
  const volExt = Lext * Wext * Hext;
  const volHueco = Li * Wi * Hi;
  // Si no hay tapa, agregar el espacio que ocuparía la tapa
  const volSinTapa = !conTapa ? Lext * Wext * eLosa : 0;
  const volumenConcretoM3 = (volExt - volHueco - volSinTapa) * (1 + merma);

  // Componentes
  const volSeco = volumenConcretoM3 * dos.factor;
  const sumaPartes = dos.cemento + dos.arena + dos.grava;
  const cementoM3 = (volSeco * dos.cemento) / sumaPartes;
  const arenaM3 = (volSeco * dos.arena) / sumaPartes;
  const gravaM3 = (volSeco * dos.grava) / sumaPartes;
  const cementoKg = cementoM3 * DENSIDAD.cemento;
  const sacos50 = m3CementoASacos50(cementoM3);
  const aguaL = sacos50 * dos.aguaPorSaco50;

  // Acero (estimación): superficie de losas + muros × 2 sentidos × 1/sep
  const areaLosaFondo = Lext * Wext;
  const areaLosaTapa = conTapa ? Lext * Wext : 0;
  const areaMuros = 2 * (Lext + Wext) * Hext;
  const areaTotalAcero = areaLosaFondo + areaLosaTapa + areaMuros;
  // Aprox: ml de acero = 2 sentidos × area / sep
  const mlAcero = (2 * areaTotalAcero) / sep * (1 + traslapes);
  const pesoAceroKg = mlAcero * CALIBRES_VARILLA[cal].kgPorMetro;
  const alambreKg = pesoAceroKg * 0.015;

  // Impermeabilización interior
  const superficieInteriorM2 = Li * Wi + 2 * (Li + Wi) * Hi;
  const manos = input.manosImp ?? 2;
  const rend = input.rendimientoImpM2PorL ?? 1.5;
  const litrosImp = (superficieInteriorM2 * manos) / rend;
  const cubetasImp = redondearArriba(litrosImp / 19);

  // Costos
  const p = input.precios ?? {};
  const costoCemento =
    (p.cementoSaco50 ?? 0) > 0 ? redondearArriba(sacos50) * (p.cementoSaco50 ?? 0) : 0;
  const costoArena = arenaM3 * (p.arenaM3 ?? 0);
  const costoGrava = gravaM3 * (p.gravaM3 ?? 0);
  const costoAgua = (aguaL / 1000) * (p.aguaM3 ?? 0);
  const costoAcero = pesoAceroKg * (p.aceroKg ?? 0);
  const costoAlambre = alambreKg * (p.alambreKg ?? 0);
  const costoImp = cubetasImp * (p.impermeabilizanteCubeta ?? 0);

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
      equivalencias: [{ etiqueta: 'Sacos 50 kg', valor: redondearArriba(sacos50), unidad: 'sacos' }],
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
      material: 'varilla',
      etiqueta: `Varilla ${cal}`,
      cantidad: pesoAceroKg,
      unidad: 'kg',
      equivalencias: [{ etiqueta: 'Metros lineales', valor: mlAcero, unidad: 'ml' }],
      precioUnitario: p.aceroKg ?? 0,
      costoTotal: costoAcero,
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
      material: 'impermeabilizante',
      etiqueta: 'Impermeabilizante interior',
      cantidad: litrosImp,
      unidad: 'L',
      equivalencias: [{ etiqueta: 'Cubetas 19 L', valor: cubetasImp, unidad: 'cubetas' }],
      precioUnitario: p.impermeabilizanteCubeta ?? 0,
      costoTotal: costoImp,
    },
  ];

  const costoMateriales =
    costoCemento + costoArena + costoGrava + costoAgua + costoAcero + costoAlambre + costoImp;

  // M.O. por m³ útil
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
      { etiqueta: 'Volumen útil', valor: `${volumenUtilM3.toFixed(2)} m³ (${(capacidadLitros / 1000).toFixed(2)} m³ = ${capacidadLitros.toFixed(0)} L)` },
      { etiqueta: 'Concreto', valor: `${volumenConcretoM3.toFixed(3)} m³` },
      { etiqueta: 'Acero', valor: `${pesoAceroKg.toFixed(1)} kg` },
      { etiqueta: 'Impermeab. cubetas', valor: `${cubetasImp}` },
    ],
    materiales,
    manoObra,
    costoMateriales,
    costoManoObra,
    costoTotal: costoMateriales + costoManoObra,
  };
}
