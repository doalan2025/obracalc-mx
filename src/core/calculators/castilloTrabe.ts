/**
 * Calculadora integral de elementos lineales armados:
 *   castillos · trabes · cadenas de cerramiento · columnas.
 *
 * Modelo (México):
 *  - Concreto = sección × longitud × cantidad de piezas, con merma.
 *    Componentes (cemento, arena, grava, agua) según dosificación.
 *  - Acero LONGITUDINAL: N varillas × (longitud + traslapes) × piezas.
 *  - Acero TRANSVERSAL (estribos): número y longitud por estribo.
 *      Longitud de estribo = 2(b+h) - 8r + 2×ganchoCm
 *      Cantidad de estribos por pieza = ceil(longitud / separación) + 1
 *  - Alambre recocido para amarres ≈ 1.5 % del peso de acero.
 *  - Mano de obra:
 *      castillo, trabe, cadena → cobro por metro lineal (ml × tarifa)
 *      columna                  → cobro por pieza (pza × tarifa)
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
import type {
  CantidadMaterial,
  ConceptoManoObra,
  CostoManoObra,
  ResultadoCalculo,
} from '../types';
import { buscarConcepto } from '../manoObra';

export type TipoElementoLineal =
  | 'castillo'
  | 'trabe'
  | 'cadena'
  | 'columna';

const CONCEPTO_MO_POR_TIPO: Record<TipoElementoLineal, string> = {
  castillo: 'mo_castillo',
  trabe: 'mo_trabe',
  cadena: 'mo_cadena',
  columna: 'mo_columna',
};

/** ¿Se cobra por ml o por pieza? */
const MODO_COBRO_POR_TIPO: Record<TipoElementoLineal, 'ml' | 'pza'> = {
  castillo: 'ml',
  trabe: 'ml',
  cadena: 'ml',
  columna: 'pza',
};

export type InputCastilloTrabe = {
  tipo: TipoElementoLineal;
  /** Etiqueta libre (C-1, T-2…). */
  etiqueta?: string;
  /** Longitud o altura por pieza, en metros. */
  longitudPorPieza: number;
  /** Cantidad de piezas iguales. */
  cantidadPiezas: number;
  /** Base de la sección, cm. */
  baseCm: number;
  /** Peralte (alto) de la sección, cm. */
  peraltCm: number;
  /** Recubrimiento del acero (cm). Default 2.5. */
  recubrimientoCm?: number;
  /** Calibre del acero longitudinal. Default '#3'. */
  calibreLong?: CalibreVarilla;
  /** Número de varillas longitudinales. Default 4. */
  numVarillasLong?: number;
  /** Calibre de los estribos. Default '#2'. */
  calibreEstribo?: CalibreVarilla;
  /** Separación entre estribos en cm. Default 15. */
  separacionEstriboCm?: number;
  /** Longitud de gancho de cada estribo (cm). Default 10. */
  ganchoEstriboCm?: number;
  /** % de incremento por traslapes / desperdicio en acero longitudinal. Default 10. */
  traslapesAceroPct?: number;
  /** Id de dosificación del concreto. Default 'f200_1:2:2.5'. */
  dosificacionId?: string;
  /** % de merma del concreto. Default 5. */
  mermaConcretoPct?: number;
  /** Conceptos de M.O. del usuario. */
  conceptosMO?: ConceptoManoObra[];
  /** Override del concepto de M.O. */
  conceptoMOId?: string;
  /** Precios opcionales (MXN). */
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

export type SalidaCastilloTrabe = ResultadoCalculo & {
  dosificacion: DosificacionConcreto;
  /** Volumen de concreto fresco con merma (m³). */
  volumenConcretoM3: number;
  /** Detalle del acero longitudinal. */
  detalleLongitudinal: {
    calibre: CalibreVarilla;
    numVarillas: number;
    mlPorPieza: number;
    mlTotal: number;
    pesoKg: number;
    varillasComerciales: number;
  };
  /** Detalle del acero transversal (estribos). */
  detalleEstribos: {
    calibre: CalibreVarilla;
    cantidadPorPieza: number;
    longitudPorEstriboCm: number;
    mlTotal: number;
    pesoKg: number;
    varillasComerciales: number;
  };
};

export function calcularCastilloTrabe(
  input: InputCastilloTrabe,
): SalidaCastilloTrabe {
  // ------- Concreto -------
  const dos =
    DOSIFICACIONES_CONCRETO[input.dosificacionId ?? 'f200_1:2:2.5'] ??
    DOSIFICACIONES_CONCRETO['f200_1:2:2.5'];
  const merma = (input.mermaConcretoPct ?? 5) / 100;

  const seccionM2 = (input.baseCm / 100) * (input.peraltCm / 100);
  const volNeto = seccionM2 * input.longitudPorPieza * input.cantidadPiezas;
  const volMerma = volNeto * (1 + merma);

  const volSeco = volMerma * dos.factor;
  const sumaPartes = dos.cemento + dos.arena + dos.grava;

  const cementoM3 = (volSeco * dos.cemento) / sumaPartes;
  const arenaM3 = (volSeco * dos.arena) / sumaPartes;
  const gravaM3 = (volSeco * dos.grava) / sumaPartes;

  const cementoKg = cementoM3 * DENSIDAD.cemento;
  const sacos50 = m3CementoASacos50(cementoM3);
  const sacos25 = m3CementoASacos25(cementoM3);

  const aguaL = sacos50 * dos.aguaPorSaco50;
  const aguaM3 = aguaL / 1000;

  // ------- Acero longitudinal -------
  const calLong = input.calibreLong ?? '#3';
  const numLong = input.numVarillasLong ?? 4;
  const traslapesAcero = (input.traslapesAceroPct ?? 10) / 100;

  const mlLongPorPieza =
    numLong * input.longitudPorPieza * (1 + traslapesAcero);
  const mlLongTotal = mlLongPorPieza * input.cantidadPiezas;
  const pesoLongKg = mlLongTotal * CALIBRES_VARILLA[calLong].kgPorMetro;
  const varLongComerciales = redondearArriba(
    mlLongTotal / LONGITUD_VARILLA_COMERCIAL_M,
  );

  // ------- Estribos -------
  const calEst = input.calibreEstribo ?? '#2';
  const recCm = input.recubrimientoCm ?? 2.5;
  const ganchoCm = input.ganchoEstriboCm ?? 10;
  const sepCm = input.separacionEstriboCm ?? 15;

  // Longitud por estribo (cm)
  const longEstriboCm = Math.max(
    0,
    2 * (input.baseCm + input.peraltCm) - 8 * recCm + 2 * ganchoCm,
  );

  // Cantidad por pieza
  const cantEstribosPorPieza = redondearArriba(
    (input.longitudPorPieza * 100) / sepCm + 1,
  );

  const mlEstribosPorPieza = (cantEstribosPorPieza * longEstriboCm) / 100;
  const mlEstribosTotal = mlEstribosPorPieza * input.cantidadPiezas;
  const pesoEstribosKg =
    mlEstribosTotal * CALIBRES_VARILLA[calEst].kgPorMetro;
  const varEstComerciales = redondearArriba(
    mlEstribosTotal / LONGITUD_VARILLA_COMERCIAL_M,
  );

  // Acero total + alambre
  const pesoAceroKg = pesoLongKg + pesoEstribosKg;
  const alambreKg = pesoAceroKg * 0.015;

  // ------- Costos -------
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

  // ------- Materiales -------
  const materiales: CantidadMaterial[] = [
    {
      material: 'concreto',
      etiqueta: 'Concreto fresco',
      cantidad: volMerma,
      unidad: 'm³',
      equivalencias: [
        { etiqueta: 'Botes 19 L', valor: m3ABotes(volMerma), unidad: 'botes' },
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
      etiqueta: `Varilla longitudinal ${calLong} (${CALIBRES_VARILLA[calLong].pulgadas})`,
      cantidad: pesoLongKg,
      unidad: 'kg',
      equivalencias: [
        { etiqueta: 'Metros lineales', valor: mlLongTotal, unidad: 'ml' },
        {
          etiqueta: `Varillas comerciales (${LONGITUD_VARILLA_COMERCIAL_M} m)`,
          valor: varLongComerciales,
          unidad: 'pza',
        },
      ],
      precioUnitario: p.aceroKg ?? 0,
      costoTotal: pesoLongKg * (p.aceroKg ?? 0),
    },
    {
      material: 'varilla_estribo',
      etiqueta: `Estribos ${calEst} (${CALIBRES_VARILLA[calEst].pulgadas})`,
      cantidad: pesoEstribosKg,
      unidad: 'kg',
      equivalencias: [
        { etiqueta: 'Metros lineales', valor: mlEstribosTotal, unidad: 'ml' },
        {
          etiqueta: 'Estribos por pieza',
          valor: cantEstribosPorPieza,
          unidad: 'pza',
        },
        {
          etiqueta: 'Estribos totales',
          valor: cantEstribosPorPieza * input.cantidadPiezas,
          unidad: 'pza',
        },
        {
          etiqueta: `Varillas comerciales (${LONGITUD_VARILLA_COMERCIAL_M} m)`,
          valor: varEstComerciales,
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
  ];

  const costoMateriales =
    costoCemento +
    costoArena +
    costoGrava +
    costoAgua +
    costoAcero +
    costoAlambre;

  // ------- Mano de obra -------
  const conceptoId = input.conceptoMOId ?? CONCEPTO_MO_POR_TIPO[input.tipo];
  const concepto = buscarConcepto(input.conceptosMO ?? [], conceptoId);
  const modo = MODO_COBRO_POR_TIPO[input.tipo];

  let manoObra: CostoManoObra[] = [];
  let costoManoObra = 0;
  if (concepto) {
    const cantidad =
      modo === 'pza'
        ? input.cantidadPiezas
        : input.longitudPorPieza * input.cantidadPiezas;
    const total = cantidad * concepto.tarifa;
    manoObra = [
      {
        conceptoId: concepto.id,
        nombre: concepto.nombre,
        cantidad,
        unidad: concepto.unidad,
        tarifa: concepto.tarifa,
        total,
      },
    ];
    costoManoObra = total;
  }

  return {
    dosificacion: dos,
    volumenConcretoM3: volMerma,
    detalleLongitudinal: {
      calibre: calLong,
      numVarillas: numLong,
      mlPorPieza: mlLongPorPieza,
      mlTotal: mlLongTotal,
      pesoKg: pesoLongKg,
      varillasComerciales: varLongComerciales,
    },
    detalleEstribos: {
      calibre: calEst,
      cantidadPorPieza: cantEstribosPorPieza,
      longitudPorEstriboCm: longEstriboCm,
      mlTotal: mlEstribosTotal,
      pesoKg: pesoEstribosKg,
      varillasComerciales: varEstComerciales,
    },
    resumen: [
      {
        etiqueta: 'Sección',
        valor: `${input.baseCm}×${input.peraltCm} cm`,
      },
      {
        etiqueta: 'Longitud × piezas',
        valor: `${input.longitudPorPieza} m × ${input.cantidadPiezas} = ${(
          input.longitudPorPieza * input.cantidadPiezas
        ).toFixed(2)} ml`,
      },
      { etiqueta: 'Concreto', valor: `${volMerma.toFixed(3)} m³` },
      { etiqueta: 'Cemento', valor: `${redondearArriba(sacos50)} sacos 50 kg` },
      { etiqueta: `Acero ${calLong}`, valor: `${pesoLongKg.toFixed(2)} kg` },
      { etiqueta: `Estribos ${calEst}`, valor: `${pesoEstribosKg.toFixed(2)} kg` },
    ],
    materiales,
    manoObra,
    costoMateriales,
    costoManoObra,
    costoTotal: costoMateriales + costoManoObra,
  };
}
