/**
 * Calculadora de concreto (losas, zapatas, firmes, plantillas, castillos,
 * trabes, columnas, cadenas, elementos genéricos).
 *
 * Output limpio (México):
 *  - Cemento: kg con desglose en sacos 50 kg + 25 kg (combinación óptima).
 *  - Arena:   botes de 19 L.
 *  - Grava:   botes de 19 L.
 *  - Agua:    botes de 19 L.
 *  - NO se muestra "concreto fresco" como un material — es el resultado
 *    del cálculo, no algo que se compra.
 */

import { DENSIDAD, redondearArriba } from '../constants/mexico';
import {
  DOSIFICACIONES_CONCRETO,
  type DosificacionConcreto,
} from '../constants/dosificaciones';
import {
  materialArena,
  materialCementoFromKg,
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

export type ElementoConcreto =
  | 'losa'
  | 'firme'
  | 'zapata'
  | 'plantilla'
  | 'castillo'
  | 'trabe'
  | 'columna'
  | 'cadena'
  | 'generico';

export type InputConcreto = {
  elemento: ElementoConcreto;
  largo: number;
  ancho: number;
  espesor: number;
  dosificacionId?: string;
  mermaPct?: number;
  /** Tipo de bulto de cemento preferido (saco50 / saco25). Default saco50. */
  cementoPreferido?: PreferenciaCemento;
  precios?: {
    cementoSaco50?: number;
    cementoSaco25?: number;
    arenaM3?: number;
    gravaM3?: number;
    agua_m3?: number;
  };
  cantidadManoObra?: number;
  conceptosMO?: ConceptoManoObra[];
  conceptoMOId?: string;
};

const CONCEPTO_MO_POR_ELEMENTO: Record<ElementoConcreto, string | null> = {
  losa: 'mo_losa',
  firme: 'mo_firme',
  zapata: 'mo_zapata',
  plantilla: null,
  castillo: 'mo_castillo',
  trabe: 'mo_trabe',
  columna: 'mo_columna',
  cadena: 'mo_cadena',
  generico: null,
};

const inferirCantidadMO = (e: InputConcreto): number => {
  if (e.cantidadManoObra != null) return e.cantidadManoObra;
  switch (e.elemento) {
    case 'losa':
    case 'firme':
      return e.largo * e.ancho;
    case 'castillo':
    case 'trabe':
    case 'cadena':
      return e.largo;
    case 'zapata':
    case 'columna':
      return 1;
    default:
      return 0;
  }
};

export type SalidaConcreto = ResultadoCalculo & {
  dosificacion: DosificacionConcreto;
  /** Volumen final de concreto incluyendo merma (m³). */
  volumenConMerma: number;
  /** kg de cemento totales (informativo). */
  cementoKg: number;
};

export function calcularConcreto(input: InputConcreto): SalidaConcreto {
  const dos =
    DOSIFICACIONES_CONCRETO[input.dosificacionId ?? 'f150_1:2:3'] ??
    DOSIFICACIONES_CONCRETO['f150_1:2:3'];

  const merma = (input.mermaPct ?? 5) / 100;
  const volNeto = input.largo * input.ancho * input.espesor;
  const volMerma = volNeto * (1 + merma);

  // Volumen seco a partir del fresco
  const volSeco = volMerma * dos.factor;
  const sumaPartes = dos.cemento + dos.arena + dos.grava;

  const cementoM3 = (volSeco * dos.cemento) / sumaPartes;
  const arenaM3 = (volSeco * dos.arena) / sumaPartes;
  const gravaM3 = (volSeco * dos.grava) / sumaPartes;
  const cementoKg = cementoM3 * DENSIDAD.cemento;

  // Agua según dosificación (~aguaPorSaco50 L por saco de 50 kg)
  const sacos50_aprox = cementoKg / 50;
  const aguaL = sacos50_aprox * dos.aguaPorSaco50;

  // ---- Materiales (formato limpio) ----
  const p = input.precios ?? {};
  const materiales: CantidadMaterial[] = [];

  const matCemento = materialCementoFromKg(cementoKg, {
    saco50: p.cementoSaco50,
    saco25: p.cementoSaco25,
      preferencia: input.cementoPreferido,
  });
  if (matCemento) materiales.push(matCemento);

  const matArena = materialArena(arenaM3, p.arenaM3);
  if (matArena) materiales.push(matArena);

  const matGrava = materialGrava(gravaM3, p.gravaM3);
  if (matGrava) materiales.push(matGrava);

  const matAgua = materialAgua(aguaL, p.agua_m3);
  if (matAgua) materiales.push(matAgua);

  const costoMateriales = materiales.reduce(
    (acc, m) => acc + (m.costoTotal ?? 0),
    0,
  );

  // ---- Mano de obra ----
  const conceptos = input.conceptosMO ?? [];
  const conceptoId =
    input.conceptoMOId ?? CONCEPTO_MO_POR_ELEMENTO[input.elemento];
  const concepto = conceptoId ? buscarConcepto(conceptos, conceptoId) : undefined;

  let manoObra: CostoManoObra[] = [];
  let costoManoObra = 0;
  if (concepto) {
    const cantidad = inferirCantidadMO(input);
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
    volumenConMerma: volMerma,
    cementoKg,
    resumen: [
      { etiqueta: 'Volumen', valor: `${volMerma.toFixed(3)} m³` },
      { etiqueta: 'Dosificación', valor: dos.nombre },
      { etiqueta: 'Cemento', valor: `${redondearArriba(cementoKg)} kg` },
    ],
    materiales,
    manoObra,
    costoMateriales,
    costoManoObra,
    costoTotal: costoMateriales + costoManoObra,
  };
}
