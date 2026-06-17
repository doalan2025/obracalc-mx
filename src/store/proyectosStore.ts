/**
 * Almacén local de proyectos (obras) y sus secciones de cálculo.
 *
 * Modelo:
 *   - Un PROYECTO es una obra con nombre, cliente, ubicación.
 *   - Cada cálculo guardado se llama SECCIÓN y pertenece a un proyecto.
 *   - Las secciones guardan el TIPO de calculadora, los INPUTS y el
 *     RESULTADO completo (ResultadoCalculo) para poder regenerar
 *     reportes sin recalcular.
 *
 * Persistencia 100 % local con AsyncStorage.
 */

import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { persistStorage } from './storage';
import type { ResultadoCalculo } from '@/core/types';

export type TipoCalculo =
  | 'concreto'
  | 'piedra'
  | 'muro-block'
  | 'repellado'
  | 'loseta'
  | 'acero'
  | 'castillo-trabe'
  | 'losa-aligerada'
  | 'losa-maciza'
  | 'firme'
  | 'pintura'
  | 'zapata'
  | 'yeso'
  | 'impermeabilizacion'
  | 'tablaroca'
  | 'escalera'
  | 'cisterna';

export const NOMBRES_TIPOS: Record<TipoCalculo, string> = {
  'concreto':           'Concreto',
  'piedra':             'Piedra / Bardas',
  'muro-block':         'Muro de block / tabique',
  'repellado':          'Repellado / Aplanado',
  'loseta':             'Pegado de loseta',
  'acero':              'Acero de refuerzo',
  'castillo-trabe':     'Castillo / Trabe / Columna',
  'losa-aligerada':     'Losa aligerada',
  'losa-maciza':        'Losa maciza',
  'firme':              'Firme de concreto',
  'pintura':            'Pintura',
  'zapata':             'Zapata',
  'yeso':               'Aplanado de yeso',
  'impermeabilizacion': 'Impermeabilización',
  'tablaroca':          'Tablaroca',
  'escalera':           'Escalera de concreto',
  'cisterna':           'Cisterna / Tinaco',
};

export type Proyecto = {
  id: string;
  nombre: string;
  cliente?: string;
  ubicacion?: string;
  notas?: string;
  fechaCreacion: number;
  fechaActualizacion: number;
};

export type Seccion = {
  id: string;
  proyectoId: string;
  tipo: TipoCalculo;
  etiqueta: string;
  /** Inputs del usuario (para mostrar/editar después). */
  inputs: Record<string, unknown>;
  /** Resultado guardado tal cual. */
  resultado: ResultadoCalculo;
  fechaCreacion: number;
};

type State = {
  proyectos: Proyecto[];
  secciones: Seccion[];
  /** Crea un proyecto y devuelve su id. */
  crearProyecto: (datos: Omit<Proyecto, 'id' | 'fechaCreacion' | 'fechaActualizacion'>) => string;
  actualizarProyecto: (id: string, cambios: Partial<Proyecto>) => void;
  eliminarProyecto: (id: string) => void;
  agregarSeccion: (
    seccion: Omit<Seccion, 'id' | 'fechaCreacion'>,
  ) => string;
  eliminarSeccion: (id: string) => void;
  /** Devuelve las secciones de un proyecto. */
  seccionesDe: (proyectoId: string) => Seccion[];
  /** Devuelve un proyecto por id. */
  proyectoPorId: (id: string) => Proyecto | undefined;
};

const generarId = (prefijo: string): string =>
  `${prefijo}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;

export const useProyectosStore = create<State>()(
  persist(
    (set, get) => ({
      proyectos: [],
      secciones: [],

      crearProyecto: (datos) => {
        const ahora = Date.now();
        const proyecto: Proyecto = {
          id: generarId('p'),
          ...datos,
          fechaCreacion: ahora,
          fechaActualizacion: ahora,
        };
        set((s) => ({ proyectos: [...s.proyectos, proyecto] }));
        return proyecto.id;
      },

      actualizarProyecto: (id, cambios) =>
        set((s) => ({
          proyectos: s.proyectos.map((p) =>
            p.id === id
              ? { ...p, ...cambios, fechaActualizacion: Date.now() }
              : p,
          ),
        })),

      eliminarProyecto: (id) =>
        set((s) => ({
          proyectos: s.proyectos.filter((p) => p.id !== id),
          secciones: s.secciones.filter((sec) => sec.proyectoId !== id),
        })),

      agregarSeccion: (seccion) => {
        const id = generarId('s');
        const ahora = Date.now();
        set((s) => {
          const nueva: Seccion = { id, fechaCreacion: ahora, ...seccion };
          // Actualizar fechaActualizacion del proyecto
          const proyectos = s.proyectos.map((p) =>
            p.id === seccion.proyectoId ? { ...p, fechaActualizacion: ahora } : p,
          );
          return { secciones: [...s.secciones, nueva], proyectos };
        });
        return id;
      },

      eliminarSeccion: (id) =>
        set((s) => ({ secciones: s.secciones.filter((sec) => sec.id !== id) })),

      seccionesDe: (proyectoId) =>
        get().secciones.filter((s) => s.proyectoId === proyectoId),

      proyectoPorId: (id) => get().proyectos.find((p) => p.id === id),
    }),
    {
      name: 'obracalc.proyectos',
      storage: createJSONStorage(() => persistStorage),
      version: 1,
    },
  ),
);
