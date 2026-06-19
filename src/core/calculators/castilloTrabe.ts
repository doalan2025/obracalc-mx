/**
 * Calculadora de castillos / trabes / cadenas / columnas.
 * Output limpio: cemento (sacos), arena/grava/agua (botes), acero (kg+ml).
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

export type TipoElementoLineal = 'castillo' | 'trabe' | 'cadena' | 'columna';

const CONCEPTO_MO_POR_TIPO: Record<TipoElementoLineal, string> = {
  castillo: 'mo_castillo',
  trabe: 'mo_trabe',
  cadena: 'mo_cadena',
  columna: 'mo_columna',
};

const MODO_COBRO_POR_TIPO: Record<TipoElementoLineal, 'ml' | 'pza'> = {
  castillo: 'ml',
  trabe: 'ml',
  cadena: 'ml',
  columna: 'pza',
};

export type InputCastilloTrabe = {
  tipo: TipoElementoLineal;
  etiqueta?: string;
  longitudPorPieza: number;
  cantidadPiezas: number;
  baseCm: number;
  peraltCm: number;
  recubrimientoCm?: number;
  calibreLong?: CalibreVarilla;
  numVarillasLong?: number;
  calibreEstribo?: CalibreVarilla;
  separacionEstriboCm?: number;
  ganchoEstriboCm?: number;
  traslapesAceroPct?: number;
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
  };
};

export type SalidaCastilloTrabe = ResultadoCalculo & {
  dosificacion: DosificacionConcreto;
  volumenConcretoM3: number;
  detalleLongitudinal: {
    calibre: CalibreVarilla;
    numVarillas: number;
    mlPorPieza: number;
    mlTotal: number;
    pesoKg: number;
    varillasComerciales: number;
  };
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
  // ---- Concreto ----
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
  const sacos50_aprox = (cementoM3 * DENSIDAD.cemento) / 50;
  const aguaL = sacos50_aprox * dos.aguaPorSaco50;

  // ---- Acero longitudinal ----
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

  // ---- Estribos ----
  const calEst = input.calibreEstribo ?? '#2';
  const recCm = input.recubrimientoCm ?? 2.5;
  const ganchoCm = input.ganchoEstriboCm ?? 10;
  const sepCm = input.separacionEstriboCm ?? 15;

  const longEstriboCm = Math.max(
    0,
    2 * (input.baseCm + input.peraltCm) - 8 * recCm + 2 * ganchoCm,
  );
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

  const pesoAceroKg = pesoLongKg + pesoEstribosKg;
  const alambreKg = pesoAceroKg * 0.015;

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

  // Acero longitudinal
  materiales.push({
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
  });

  // Estribos: si es alambrón #2, mostrar también metros (1 kg = 3.5 m)
  const equivalenciasEstribos: { etiqueta: string; valor: number; unidad: string }[] = [
    { etiqueta: 'Metros lineales', valor: mlEstribosTotal, unidad: 'ml' },
    { etiqueta: 'Estribos por pieza', valor: cantEstribosPorPieza, unidad: 'pza' },
    {
      etiqueta: 'Estribos totales',
      valor: cantEstribosPorPieza * input.cantidadPiezas,
      unidad: 'pza',
    },
  ];
  if (calEst === '#2') {
    // Alambrón: 1 kg = 3.5 m
    equivalenciasEstribos.push({
      etiqueta: 'Equivalente alambrón (3.5 m/kg)',
      valor: pesoEstribosKg,
      unidad: 'kg',
    });
  } else {
    equivalenciasEstribos.push({
      etiqueta: `Varillas comerciales (${LONGITUD_VARILLA_COMERCIAL_M} m)`,
      valor: varEstComerciales,
      unidad: 'pza',
    });
  }

  materiales.push({
    material: 'varilla_estribo',
    etiqueta:
      calEst === '#2'
        ? `Alambrón #2 para estribos (${CALIBRES_VARILLA[calEst].pulgadas})`
        : `Estribos ${calEst} (${CALIBRES_VARILLA[calEst].pulgadas})`,
    cantidad: pesoEstribosKg,
    unidad: 'kg',
    equivalencias: equivalenciasEstribos,
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

  const costoMateriales = materiales.reduce(
    (acc, m) => acc + (m.costoTotal ?? 0),
    0,
  );

  // ---- Mano de obra ----
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
      { etiqueta: 'Sección', valor: `${input.baseCm}×${input.peraltCm} cm` },
      {
        etiqueta: 'Longitud × piezas',
        valor: `${input.longitudPorPieza} m × ${input.cantidadPiezas} = ${(
          input.longitudPorPieza * input.cantidadPiezas
        ).toFixed(2)} ml`,
      },
      { etiqueta: 'Volumen concreto', valor: `${volMerma.toFixed(3)} m³` },
      { etiqueta: `Acero ${calLong}`, valor: `${pesoLongKg.toFixed(2)} kg` },
      {
        etiqueta: calEst === '#2' ? `Alambrón ${calEst}` : `Estribos ${calEst}`,
        valor: `${pesoEstribosKg.toFixed(2)} kg`,
      },
    ],
    materiales,
    manoObra,
    costoMateriales,
    costoManoObra,
    costoTotal: costoMateriales + costoManoObra,
  };
}
