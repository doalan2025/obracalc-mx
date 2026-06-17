/**
 * Dosificaciones típicas usadas en México.
 *
 * Convención:
 *  - Las "partes" son por VOLUMEN aparente.
 *  - factor = relación volumen seco / volumen final de mezcla.
 *    Para concreto se usa 1.54 (acepta el acomodo de la grava).
 *    Para mortero se usa 1.27 (acomodo de arena).
 */

export type DosificacionConcreto = {
  id: string;
  nombre: string;
  fc: number; // resistencia kg/cm² (orientativa)
  cemento: number;
  arena: number;
  grava: number;
  factor: number;
  /** Litros de agua por saco de cemento de 50 kg (rango medio). */
  aguaPorSaco50: number;
};

export const DOSIFICACIONES_CONCRETO: Record<string, DosificacionConcreto> = {
  'f100_1:3:5': {
    id: 'f100_1:3:5',
    nombre: "f'c=100 — Plantilla 1:3:5",
    fc: 100,
    cemento: 1,
    arena: 3,
    grava: 5,
    factor: 1.54,
    aguaPorSaco50: 32,
  },
  'f150_1:2:3': {
    id: 'f150_1:2:3',
    nombre: "f'c=150 — Uso general 1:2:3",
    fc: 150,
    cemento: 1,
    arena: 2,
    grava: 3,
    factor: 1.54,
    aguaPorSaco50: 28,
  },
  'f200_1:2:2.5': {
    id: 'f200_1:2:2.5',
    nombre: "f'c=200 — Estructural ligero 1:2:2.5",
    fc: 200,
    cemento: 1,
    arena: 2,
    grava: 2.5,
    factor: 1.54,
    aguaPorSaco50: 25,
  },
  'f250_1:2:2': {
    id: 'f250_1:2:2',
    nombre: "f'c=250 — Estructural 1:2:2",
    fc: 250,
    cemento: 1,
    arena: 2,
    grava: 2,
    factor: 1.54,
    aguaPorSaco50: 22,
  },
};

export type DosificacionMortero = {
  id: string;
  nombre: string;
  uso: 'pega' | 'repellado' | 'firme' | 'general';
  cemento: number;
  cal: number;
  arena: number;
  factor: number;
};

export const DOSIFICACIONES_MORTERO: Record<string, DosificacionMortero> = {
  'pega_1:4': {
    id: 'pega_1:4',
    nombre: 'Pega de block 1:4 (cemento:arena)',
    uso: 'pega',
    cemento: 1,
    cal: 0,
    arena: 4,
    factor: 1.27,
  },
  'pega_1:1:6': {
    id: 'pega_1:1:6',
    nombre: 'Pega 1:1:6 (cemento:cal:arena)',
    uso: 'pega',
    cemento: 1,
    cal: 1,
    arena: 6,
    factor: 1.27,
  },
  'repellado_1:5': {
    id: 'repellado_1:5',
    nombre: 'Repellado 1:5',
    uso: 'repellado',
    cemento: 1,
    cal: 0,
    arena: 5,
    factor: 1.27,
  },
  'repellado_1:1:6': {
    id: 'repellado_1:1:6',
    nombre: 'Repellado 1:1:6 (con cal)',
    uso: 'repellado',
    cemento: 1,
    cal: 1,
    arena: 6,
    factor: 1.27,
  },
  'firme_1:3': {
    id: 'firme_1:3',
    nombre: 'Firme 1:3',
    uso: 'firme',
    cemento: 1,
    cal: 0,
    arena: 3,
    factor: 1.27,
  },
};
