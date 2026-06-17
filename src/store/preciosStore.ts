/**
 * Catálogo de precios de materiales (MXN).
 * El usuario los edita una vez en Configuración y la app los aplica
 * automáticamente a todas las calculadoras.
 */

import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { persistStorage } from './storage';

export type PreciosMateriales = {
  /** Cemento gris saco de 50 kg (MXN). */
  cementoSaco50: number;
  /** Cemento gris saco de 25 kg (MXN). */
  cementoSaco25: number;
  /** Bulto de cal 25 kg (MXN). */
  calBulto25: number;
  /** Arena por m³ (MXN). */
  arenaM3: number;
  /** Grava por m³ (MXN). */
  gravaM3: number;
  /** Agua por m³ (MXN). */
  aguaM3: number;
  /** Block hueco 12×20×40 cm — pieza (MXN). */
  block12: number;
  /** Block hueco 15×20×40 cm — pieza (MXN). */
  block15: number;
  /** Block hueco 20×20×40 cm — pieza (MXN). */
  block20: number;
  /** Tabique rojo recocido — pieza (MXN). */
  tabiqueRojo: number;
  /** Loseta cerámica por m² (MXN). */
  losetaM2: number;
  /** Adhesivo para loseta — saco 20 kg (MXN). */
  adhesivoSaco: number;
  /** Boquilla — kg (MXN). */
  boquillaKg: number;
  /** Acero de refuerzo (varilla corrugada) — kg (MXN). */
  aceroKg: number;
  /** Alambre recocido para amarres — kg (MXN). */
  alambreKg: number;
  /** Casetón (poliestireno o concreto) — pieza (MXN). */
  casetonPza: number;
  /** Malla electrosoldada — m² (MXN). */
  mallaM2: number;
  /** Pintura — cubeta de 19 L (MXN). */
  pinturaCubeta: number;
  /** Pintura — galón (MXN). */
  pinturaGalon: number;
  /** Yeso — saco 40 kg (MXN). */
  yesoSaco: number;
  /** Membrana asfáltica — rollo 10 m² (MXN). */
  membranaRollo: number;
  /** Impermeabilizante líquido — cubeta 19 L (MXN). */
  impermeabilizanteCubeta: number;
  /** Lámina de tablaroca 1.22×2.44 (MXN). */
  laminaTablaroca: number;
  /** Piedra (braza, río, etc.) por m³ a granel (MXN). */
  piedraM3: number;
  /** Piedra por tonelada (MXN). Alternativa al m³. */
  piedraTon: number;
};

const PRECIOS_DEFAULT: PreciosMateriales = {
  cementoSaco50: 250,
  cementoSaco25: 140,
  calBulto25: 130,
  arenaM3: 400,
  gravaM3: 500,
  aguaM3: 35,
  block12: 18,
  block15: 22,
  block20: 28,
  tabiqueRojo: 4.5,
  losetaM2: 220,
  adhesivoSaco: 220,
  boquillaKg: 35,
  aceroKg: 28,
  alambreKg: 38,
  casetonPza: 35,
  mallaM2: 35,
  pinturaCubeta: 1500,
  pinturaGalon: 380,
  yesoSaco: 110,
  membranaRollo: 850,
  impermeabilizanteCubeta: 1200,
  laminaTablaroca: 220,
  piedraM3: 350,
  piedraTon: 230,
};

type State = {
  precios: PreciosMateriales;
  actualizar: (cambios: Partial<PreciosMateriales>) => void;
  restaurarDefaults: () => void;
};

export const usePreciosStore = create<State>()(
  persist(
    (set) => ({
      precios: PRECIOS_DEFAULT,
      actualizar: (cambios) =>
        set((s) => ({ precios: { ...s.precios, ...cambios } })),
      restaurarDefaults: () => set({ precios: PRECIOS_DEFAULT }),
    }),
    {
      name: 'obracalc.precios',
      storage: createJSONStorage(() => persistStorage),
      version: 6,
      migrate: (persistedState, version) => {
        // Migraciones acumulativas: cualquier versión < 6 recibe los
        // defaults nuevos por encima de los valores guardados.
        const s = persistedState as { precios?: Partial<PreciosMateriales> };
        if (version < 6 && s?.precios) {
          s.precios = { ...PRECIOS_DEFAULT, ...s.precios };
        }
        return s as never;
      },
    },
  ),
);
