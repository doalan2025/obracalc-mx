import { describe, it, expect } from 'vitest';
import { calcularTablaroca, M2_POR_LAMINA } from './tablaroca';
import { CONCEPTOS_MANO_OBRA_DEFAULT } from '../manoObra';

describe('Calculadora de tablaroca', () => {
  it('plafón 30 m² con valores default', () => {
    const r = calcularTablaroca({
      modo: 'area', area: 30,
      conceptosMO: CONCEPTOS_MANO_OBRA_DEFAULT,
      tarifaMOM2: 180,
    });
    // Área con merma = 33; láminas = ceil(33 / 2.9768) = 12
    expect(r.laminas).toBe(12);
    expect(r.tornillos).toBe(12 * 24);
    // Pasta = 33 × 0.5 = 16.5
    expect(r.pastaKg).toBeCloseTo(16.5, 4);
    // Tarifa default mo_tablaroca = $220/m² × 30 m²
    expect(r.manoObra[0].total).toBe(30 * 220);
  });

  it('parámetros personalizados afectan cantidades', () => {
    const r = calcularTablaroca({
      modo: 'area', area: 50,
      tornillosPorLamina: 30, pastaKgM2: 0.7,
      conceptosMO: CONCEPTOS_MANO_OBRA_DEFAULT,
    });
    expect(r.tornillos).toBe(r.laminas * 30);
    expect(r.pastaKg).toBeCloseTo(50 * 1.10 * 0.7, 4);
  });

  it('M2_POR_LAMINA es ~2.98', () => {
    expect(M2_POR_LAMINA).toBeCloseTo(2.9768, 3);
  });
});
