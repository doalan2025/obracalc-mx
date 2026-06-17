import { describe, it, expect } from 'vitest';
import { calcularYeso } from './yeso';
import { CONCEPTOS_MANO_OBRA_DEFAULT } from '../manoObra';

describe('Calculadora de yeso', () => {
  it('30 m² × 1.5 cm × 1 cara con merma 10%', () => {
    const r = calcularYeso({
      modo: 'area', area: 30,
      conceptosMO: CONCEPTOS_MANO_OBRA_DEFAULT,
      tarifaMOM2: 80,
    });
    // yesoKg = 30 × 0.015 × 950 × 1.10 = 470.25
    expect(r.yesoKg).toBeCloseTo(470.25, 2);
    // Sacos = ceil(470.25 / 40) = 12
    expect(r.sacos).toBe(12);
    // Tarifa default mo_yeso = $110/m² × 30 m²
    expect(r.manoObra[0].total).toBe(30 * 110);
  });

  it('2 caras duplica área y cantidad', () => {
    const a = calcularYeso({ modo: 'dimensiones', largo: 5, alto: 3, caras: 1, conceptosMO: CONCEPTOS_MANO_OBRA_DEFAULT });
    const b = calcularYeso({ modo: 'dimensiones', largo: 5, alto: 3, caras: 2, conceptosMO: CONCEPTOS_MANO_OBRA_DEFAULT });
    expect(b.areaTotal).toBe(a.areaTotal * 2);
    expect(b.yesoKg).toBeCloseTo(a.yesoKg * 2, 4);
  });

  it('costo se multiplica por sacos', () => {
    const r = calcularYeso({
      modo: 'area', area: 50,
      conceptosMO: CONCEPTOS_MANO_OBRA_DEFAULT,
      precios: { sacoPrecio: 110 },
    });
    expect(r.costoMateriales).toBe(r.sacos * 110);
  });
});
