/**
 * Catálogo por defecto de conceptos de mano de obra (México).
 * Las tarifas son estimaciones iniciales que el usuario puede editar
 * desde la pantalla de Configuración. Se persisten en AsyncStorage.
 */

import type { ConceptoManoObra } from './types';

export const CONCEPTOS_MANO_OBRA_DEFAULT: ConceptoManoObra[] = [
  { id: 'mo_block',          nombre: 'Pegado de block',                    unidad: 'm2',     tarifa: 95 },
  { id: 'mo_tabique',        nombre: 'Pegado de tabique rojo',             unidad: 'm2',     tarifa: 110 },
  { id: 'mo_piedra',         nombre: 'Pegado de piedra',                   unidad: 'm2',     tarifa: 180 },
  { id: 'mo_repellado',      nombre: 'Repellado / aplanado',               unidad: 'm2',     tarifa: 120 },
  { id: 'mo_loseta',         nombre: 'Pegado de loseta',                   unidad: 'm2',     tarifa: 150 },
  { id: 'mo_castillo',       nombre: 'Castillo armado y colado',           unidad: 'ml',     tarifa: 140 },
  { id: 'mo_trabe',          nombre: 'Trabe armada y colada',              unidad: 'ml',     tarifa: 220 },
  { id: 'mo_columna',        nombre: 'Columna armada y colada',            unidad: 'pza',    tarifa: 650 },
  { id: 'mo_losa',           nombre: 'Elaboración de losa maciza',         unidad: 'm2',     tarifa: 320 },
  { id: 'mo_losa_aligerada', nombre: 'Losa aligerada',                     unidad: 'm2',     tarifa: 280 },
  { id: 'mo_firme',          nombre: 'Firme de concreto',                  unidad: 'm2',     tarifa: 85 },
  { id: 'mo_cadena',         nombre: 'Cadena de cerramiento',              unidad: 'ml',     tarifa: 130 },
  { id: 'mo_zapata',         nombre: 'Zapata armada y colada',             unidad: 'pza',    tarifa: 450 },
  { id: 'mo_pintura',        nombre: 'Aplicación de pintura',              unidad: 'm2',     tarifa: 35 },
  { id: 'mo_yeso',           nombre: 'Aplanado de yeso',                   unidad: 'm2',     tarifa: 110 },
  { id: 'mo_impermeabilizacion', nombre: 'Impermeabilización',             unidad: 'm2',     tarifa: 70 },
  { id: 'mo_tablaroca',      nombre: 'Plafón / muro de tablaroca',         unidad: 'm2',     tarifa: 220 },
  { id: 'mo_escalera',       nombre: 'Escalera de concreto',               unidad: 'm2',     tarifa: 600 },
  { id: 'mo_cisterna',       nombre: 'Cisterna construida',                unidad: 'm3',     tarifa: 1500 },
  { id: 'mo_jornal_albanil', nombre: 'Jornal albañil',                     unidad: 'jornal', tarifa: 500 },
  { id: 'mo_jornal_ayudante',nombre: 'Jornal ayudante',                    unidad: 'jornal', tarifa: 350 },
];

/** Busca un concepto por id en una lista (devuelve undefined si no existe). */
export const buscarConcepto = (
  conceptos: ConceptoManoObra[],
  id: string,
): ConceptoManoObra | undefined => conceptos.find((c) => c.id === id);
