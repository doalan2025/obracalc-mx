import { describe, it, expect } from 'vitest';
import { calcularCisterna } from './cisterna';
import { CONCEPTOS_MANO_OBRA_DEFAULT } from '../manoObra';

describe('Calculadora de cisterna', () => {
  it('cisterna 2×1.5×1.5 m con tapa, 10 000 L', () => {
    const r = calcularCisterna({
      largoM: 2, anchoM: 1.5, alturaM: 1.5,
      conceptosMO: CONCEPTOS_MANO_OBRA_DEFAULT,
      tarifaMOM3: 1500,
    });
    // Volumen útil = 2 × 1.5 × 1.5 = 4.5 m³ = 4 500 L
    expect(r.volumenUtilM3).toBeCloseTo(4.5, 6);
    expect(r.capacidadLitros).toBeCloseTo(4500, 2);
    expect(r.volumenConcretoM3).toBeGreaterThan(0);
    expect(r.pesoAceroKg).toBeGreaterThan(0);
    expect(r.cubetasImpermeabilizante).toBeGreaterThan(0);
  });

  it('cisterna SIN tapa tiene menos concreto que CON tapa', () => {
    const con = calcularCisterna({
      largoM: 2, anchoM: 2, alturaM: 1.5, conTapa: true,
      conceptosMO: CONCEPTOS_MANO_OBRA_DEFAULT,
    });
    const sin = calcularCisterna({
      largoM: 2, anchoM: 2, alturaM: 1.5, conTapa: false,
      conceptosMO: CONCEPTOS_MANO_OBRA_DEFAULT,
    });
    expect(sin.volumenConcretoM3).toBeLessThan(con.volumenConcretoM3);
  });

  it('mayor altura → mayor volumen útil y litros', () => {
    const a = calcularCisterna({ largoM: 2, anchoM: 2, alturaM: 1, conceptosMO: CONCEPTOS_MANO_OBRA_DEFAULT });
    const b = calcularCisterna({ largoM: 2, anchoM: 2, alturaM: 2, conceptosMO: CONCEPTOS_MANO_OBRA_DEFAULT });
    expect(b.volumenUtilM3).toBeCloseTo(a.volumenUtilM3 * 2, 5);
    expect(b.capacidadLitros).toBeCloseTo(a.capacidadLitros * 2, 2);
  });
});
