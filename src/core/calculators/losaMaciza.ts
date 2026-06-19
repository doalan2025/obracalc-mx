/**
 * Calculadora de losa maciza (México).
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

export type InputLosaMaciza = {
  largo: number;
  ancho: number;
  espesorM?: number;
  calibreParrilla?: CalibreVarilla;
  separacionXCm?: number;
  separacionYCm?: number;
  factorBastones?: number;
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

export type SalidaLosaMaciza = ResultadoCalculo & {
  dosificacion: DosificacionConcreto;
  areaM2: number;
  volumenConcretoM3: number;
  parrilla: {
    calibre: CalibreVarilla;
    nVarX: number;
    nVarY: number;
    mlTotal: number;
    pesoKg: number;
    varillasComerciales: number;
  };
  bastonesPesoKg: number;
};

export function calcularLosaMaciza(input: InputLosaMaciza): SalidaLosaMaciza {
  const dos =
    DOSIFICACIONES_CONCRETO[input.dosificacionId ?? 'f200_1:2:2.5'] ??
    DOSIFICACIONES_CONCRETO['f200_1:2:2.5'];

  const espesor = input.espesorM ?? 0.1;
  const merma = (input.mermaConcretoPct ?? 5) / 100;
  const areaM2 = input.largo * input.ancho;
  const volumenConcretoM3 = areaM2 * espesor * (1 + merma);

  const volSeco = volumenConcretoM3 * dos.factor;
  const sumaPartes = dos.cemento + dos.arena + dos.grava;
  const cementoM3 = (volSeco * dos.cemento) / sumaPartes;
  const arenaM3 = (volSeco * dos.arena) / sumaPartes;
  const gravaM3 = (volSeco * dos.grava) / sumaPartes;
  const sacos50_aprox = (cementoM3 * DENSIDAD.cemento) / 50;
  const aguaL = sacos50_aprox * dos.aguaPorSaco50;

  // Acero parrilla
  const calParr = input.calibreParrilla ?? '#3';
  const sepX = (input.separacionXCm ?? 20) / 100;
  const sepY = (input.separacionYCm ?? 20) / 100;
  const traslapes = (input.traslapesAceroPct ?? 10) / 100;

  const nVarX = redondearArriba(input.ancho / sepX) + 1;
  const nVarY = redondearArriba(input.largo / sepY) + 1;
  const mlX = nVarX * input.largo * (1 + traslapes);
  const mlY = nVarY * input.ancho * (1 + traslapes);
  const mlTotalParrilla = mlX + mlY;
  const pesoParrillaKg =
    mlTotalParrilla * CALIBRES_VARILLA[calParr].kgPorMetro;

  const factorBast = input.factorBastones ?? 0.5;
  const bastonesPesoKg = pesoParrillaKg * factorBast;
  const mlBastones = bastonesPesoKg / CALIBRES_VARILLA[calParr].kgPorMetro;

  const pesoAceroKg = pesoParrillaKg + bastonesPesoKg;
  const mlAceroTotal = mlTotalParrilla + mlBastones;
  const varillasComerciales = redondearArriba(
    mlAceroTotal / LONGITUD_VARILLA_COMERCIAL_M,
  );
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

  // Acero
  materiales.push({
    material: 'varilla_parrilla',
    etiqueta: `Varilla ${calParr} parrilla (2 sentidos)`,
    cantidad: pesoParrillaKg,
    unidad: 'kg',
    equivalencias: [
      { etiqueta: 'Varillas sentido X', valor: nVarX, unidad: 'pza' },
      { etiqueta: 'Varillas sentido Y', valor: nVarY, unidad: 'pza' },
      { etiqueta: 'Metros lineales', valor: mlTotalParrilla, unidad: 'ml' },
    ],
    precioUnitario: p.aceroKg ?? 0,
    costoTotal: pesoParrillaKg * (p.aceroKg ?? 0),
  });

  if (bastonesPesoKg > 0) {
    materiales.push({
      material: 'varilla_bastones',
      etiqueta: `Bastones ${calParr}`,
      cantidad: bastonesPesoKg,
      unidad: 'kg',
      equivalencias: [
        { etiqueta: 'Metros lineales', valor: mlBastones, unidad: 'ml' },
      ],
      precioUnitario: p.aceroKg ?? 0,
      costoTotal: bastonesPesoKg * (p.aceroKg ?? 0),
    });
  }

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

  const conceptoId = input.conceptoMOId ?? 'mo_losa';
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
    areaM2,
    volumenConcretoM3,
    parrilla: {
      calibre: calParr,
      nVarX,
      nVarY,
      mlTotal: mlTotalParrilla,
      pesoKg: pesoParrillaKg,
      varillasComerciales,
    },
    bastonesPesoKg,
    resumen: [
      { etiqueta: 'Área', valor: `${areaM2.toFixed(2)} m²` },
      { etiqueta: 'Espesor', valor: `${(espesor * 100).toFixed(1)} cm` },
      { etiqueta: 'Volumen concreto', valor: `${volumenConcretoM3.toFixed(3)} m³` },
      { etiqueta: 'Acero parrilla', valor: `${pesoParrillaKg.toFixed(1)} kg` },
      { etiqueta: 'Bastones', valor: `${bastonesPesoKg.toFixed(1)} kg` },
    ],
    materiales,
    manoObra,
    costoMateriales,
    costoManoObra,
    costoTotal: costoMateriales + costoManoObra,
  };
}
