import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { CONCEPTOS_MANO_OBRA_DEFAULT } from '@/core/manoObra';
import type { ConceptoManoObra, UnidadManoObra } from '@/core/types';
import { persistStorage } from './storage';

type State = {
  conceptos: ConceptoManoObra[];
  actualizarTarifa: (id: string, tarifa: number) => void;
  actualizarConcepto: (
    id: string,
    cambios: Partial<Omit<ConceptoManoObra, 'id'>>,
  ) => void;
  agregar: (concepto: Omit<ConceptoManoObra, 'id'>) => void;
  eliminar: (id: string) => void;
  restaurarDefaults: () => void;
};

export const useManoObraStore = create<State>()(
  persist(
    (set) => ({
      conceptos: CONCEPTOS_MANO_OBRA_DEFAULT,
      actualizarTarifa: (id, tarifa) =>
        set((s) => ({
          conceptos: s.conceptos.map((c) =>
            c.id === id ? { ...c, tarifa } : c,
          ),
        })),
      actualizarConcepto: (id, cambios) =>
        set((s) => ({
          conceptos: s.conceptos.map((c) =>
            c.id === id ? { ...c, ...cambios } : c,
          ),
        })),
      agregar: (concepto) =>
        set((s) => ({
          conceptos: [
            ...s.conceptos,
            {
              id: `mo_${Date.now().toString(36)}`,
              nombre: concepto.nombre,
              unidad: concepto.unidad as UnidadManoObra,
              tarifa: concepto.tarifa,
            },
          ],
        })),
      eliminar: (id) =>
        set((s) => ({ conceptos: s.conceptos.filter((c) => c.id !== id) })),
      restaurarDefaults: () =>
        set({ conceptos: CONCEPTOS_MANO_OBRA_DEFAULT }),
    }),
    {
      name: 'obracalc.manoObra',
      storage: createJSONStorage(() => persistStorage),
      version: 1,
    },
  ),
);
