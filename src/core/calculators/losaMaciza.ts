/**
 * Calculadora de losa maciza (México).
 *
 * Modelo:
 *  - Concreto = área × espesor × (1 + merma).
 *  - Acero en 2 sentidos (parrilla):
 *      • Sentido X: nVarX = ceil(ancho / sepX) + 1, longitud = largo
 *      • Sentido Y: nVarY = ceil(largo / sepY) + 1, longitud = ancho
 *  - Bastones (acero negativo en apoyos): factor configurable del peso
 *    de la parrilla (default 50 %).
 *  - Alambre recocido = 1.5 % del peso total del acero.
 *  - Mano de obra: por m² (concepto mo_losa).
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

export type InputLosaMaciza = {
  largo: number;
  ancho: number;
  espesorM?: number;       // default 0.10
  calibreParrilla?: CalibreVarilla; // default '#3'
  separacionXCm?: number;  // default 20
  separacionYCm?: number;  // default 20
  /** Factor de bastones sobre peso de parrilla (0–1). Default 0.5. */
  factorBastones?: number;
  traslapesAceroPct?: number; // default 10
  dosificacionId?: string;    // default f200_1:2:2.5
  mermaConcretoPct?: number;  // default 5
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
  const cementoKg = cementoM3 * DENSIDAD.cemento;
  const sacos50 = m3CementoASacos50(cementoM3);
  const sacos25 = m3CementoASacos25(cementoM3);
  const aguaL = sacos50 * dos.aguaPorSaco50;
  const aguaM3 = aguaL / 1000;

  // Acero parrilla (2 sentidos)
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
  const mlBastones =
    bastonesPesoKg / CALIBRES_VARILLA[calParr].kgPorMetro;

  const pesoAceroKg = pesoParrillaKg + bastonesPesoKg;
  const mlAceroTotal = mlTotalParrilla + mlBastones;
  const varillasComerciales = redondearArriba(
    mlAceroTotal / LONGITUD_VARILLA_COMERCIAL_M,
  );
  const alambreKg = pesoAceroKg * 0.015;

  // Costos
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

  const materiales: CantidadMaterial[] = [
    {
      material: 'concreto',
      etiqueta: 'Concreto fresco',
      cantidad: volumenConcretoM3,
      unidad: 'm³',
      equivalencias: [
        { etiqueta: 'Botes 19 L', valor: m3ABotes(volumenConcretoM3), unidad: 'botes' },
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
      equivalencias: [{ etiqueta: 'Botes 19 L', valor: m3ABotes(arenaM3), unidad: 'botes' }],
      precioUnitario: p.arenaM3 ?? 0,
      costoTotal: costoArena,
    },
    {
      material: 'grava',
      etiqueta: 'Grava',
      cantidad: gravaM3,
      unidad: 'm³',
      equivalencias: [{ etiqueta: 'Botes 19 L', valor: m3ABotes(gravaM3), unidad: 'botes' }],
      precioUnitario: p.gravaM3 ?? 0,
      costoTotal: costoGrava,
    },
    {
      material: 'agua',
      etiqueta: 'Agua',
      cantidad: aguaL,
      unidad: 'L',
      equivalencias: [{ etiqueta: 'Botes 19 L', valor: aguaL / 19, unidad: 'botes' }],
      precioUnitario: p.aguaM3 ?? 0,
      costoTotal: costoAgua,
    },
    {
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
    },
    {
      material: 'varilla_bastones',
      etiqueta: `Bastones ${calParr}`,
      cantidad: bastonesPesoKg,
      unidad: 'kg',
      equivalencias: [
        { etiqueta: 'Metros lineales', valor: mlBastones, unidad: 'ml' },
      ],
      precioUnitario: p.aceroKg ?? 0,
      costoTotal: bastonesPesoKg * (p.aceroKg ?? 0),
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

  // Mano de obra
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
      { etiqueta: 'Concreto', valor: `${volumenConcretoM3.toFixed(3)} m³` },
      { etiqueta: 'Cemento', valor: `${redondearArriba(sacos50)} sacos 50 kg` },
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
