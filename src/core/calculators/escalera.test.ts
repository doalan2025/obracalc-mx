import { describe, it, expect } from 'vitest';
import { calcularEscalera } from './escalera';
import { CONCEPTOS_MANO_OBRA_DEFAULT } from '../manoObra';

describe('Calculadora de escalera', () => {
  it('escalera 2.7 m de altura, 1 m de ancho, peldaños 28×18', () => {
    const r = calcularEscalera({
      alturaTotalM: 2.7, anchoM: 1.0,
      huellaCm: 28, peraltCm: 18,
      tarifaMOM2: 600,
      conceptosMO: CONCEPTOS_MANO_OBRA_DEFAULT,
    });
    // Escalones = round(2.7 / 0.18) = 15
    expect(r.numEscalones).toBe(15);
    // Long horizontal = 15 × 0.28 = 4.2 m
    expect(r.longHorizontalM).toBeCloseTo(4.2, 4);
    // Long rampa = sqrt(2.7² + 4.2²) ≈ 4.99 m
    expect(r.longRampaM).toBeCloseTo(4.99, 1);
    expect(r.volumenConcretoM3).toBeGreaterThan(0);
  });

  it('costo total = materiales + M.O.', () => {
    const r = calcularEscalera({
      alturaTotalM: 3, anchoM: 1.2,
      conceptosMO: CONCEPTOS_MANO_OBRA_DEFAULT,
      tarifaMOM2: 600,
      precios: { cementoSaco50: 250, arenaM3: 400, gravaM3: 500, aceroKg: 28, alambreKg: 38 },
    });
    expect(r.costoTotal).toBeCloseTo(r.costoMateriales + r.costoManoObra, 3);
  });
});
