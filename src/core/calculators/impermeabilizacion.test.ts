import { describe, it, expect } from 'vitest';
import { calcularImpermeabilizacion } from './impermeabilizacion';
import { CONCEPTOS_MANO_OBRA_DEFAULT } from '../manoObra';

describe('Calculadora de impermeabilización', () => {
  it('membrana 50 m² con merma 5% y rollos de 10 m²', () => {
    const r = calcularImpermeabilizacion({
      modo: 'area', area: 50, tipo: 'membrana',
      conceptosMO: CONCEPTOS_MANO_OBRA_DEFAULT,
      tarifaMOM2: 60,
    });
    // m² a comprar = 50 × 1.05 = 52.5; rollos = ceil(52.5/10) = 6
    expect(r.rollos).toBe(6);
    expect(r.litros).toBe(0);
  });

  it('líquido acrílico 100 m², 2 manos, rendimiento 1.5', () => {
    const r = calcularImpermeabilizacion({
      modo: 'area', area: 100, tipo: 'liquido_acrilico',
      manos: 2, rendimientoM2PorL: 1.5, mermaPct: 0,
      conceptosMO: CONCEPTOS_MANO_OBRA_DEFAULT,
    });
    // litros = 100 × 2 / 1.5 = 133.33
    expect(r.litros).toBeCloseTo(133.33, 1);
    // cubetas = ceil(133.33/19) = 8
    expect(r.cubetas).toBe(8);
  });

  it('costo de membrana usa rolloPrecio', () => {
    const r = calcularImpermeabilizacion({
      modo: 'area', area: 30, tipo: 'membrana',
      conceptosMO: CONCEPTOS_MANO_OBRA_DEFAULT,
      precios: { rolloPrecio: 850 },
    });
    expect(r.costoMateriales).toBe(r.rollos * 850);
  });
});
