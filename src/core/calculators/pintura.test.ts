import { describe, it, expect } from 'vitest';
import { calcularPintura, LITROS_CUBETA, LITROS_GALON } from './pintura';
import { CONCEPTOS_MANO_OBRA_DEFAULT } from '../manoObra';

describe('Calculadora de pintura', () => {
  it('100 m², 2 manos, rendimiento 10 m²/L, merma 5%', () => {
    const r = calcularPintura({
      modo: 'area',
      area: 100,
      manos: 2,
      rendimientoM2PorL: 10,
      tarifaMOM2: 30,
    });
    // L base = 100 × 2 / 10 = 20 L; con 5% = 21 L
    expect(r.litrosTotales).toBeCloseTo(21, 4);
    // Cubetas = ceil(21/19) = 2
    expect(r.cubetas).toBe(2);
    // Galones = ceil(21/3.785) = ceil(5.547) = 6
    expect(r.galones).toBe(6);
    // M.O. con tarifa explícita: 100 m² × $30 = $3000
    expect(r.manoObra[0].total).toBe(3000);
  });

  it('rendimiento más bajo aumenta los litros', () => {
    const a = calcularPintura({ modo: 'area', area: 50, rendimientoM2PorL: 10 });
    const b = calcularPintura({ modo: 'area', area: 50, rendimientoM2PorL: 6 });
    expect(b.litrosTotales).toBeGreaterThan(a.litrosTotales);
  });

  it('más manos escalan los litros linealmente', () => {
    const m1 = calcularPintura({ modo: 'area', area: 60, manos: 1, mermaPct: 0 });
    const m3 = calcularPintura({ modo: 'area', area: 60, manos: 3, mermaPct: 0 });
    expect(m3.litrosTotales).toBeCloseTo(m1.litrosTotales * 3, 6);
  });

  it('costo por cubeta tiene prioridad sobre galón y litro', () => {
    const r = calcularPintura({
      modo: 'area',
      area: 200,
      precios: { cubetaPrecio: 1500, galonPrecio: 400, litroPrecio: 100 },
    });
    // litros = 200 × 2 / 10 × 1.05 = 42; cubetas = 3
    // costo = 3 × 1500 = 4500
    expect(r.costoMateriales).toBe(3 * 1500);
  });

  it('si no hay precio de cubeta usa galón', () => {
    const r = calcularPintura({
      modo: 'area',
      area: 50,
      precios: { galonPrecio: 400, litroPrecio: 100 },
    });
    // litros = 50 × 2 / 10 × 1.05 = 10.5; galones = ceil(10.5/3.785) = 3
    expect(r.galones).toBe(3);
    expect(r.costoMateriales).toBe(3 * 400);
  });

  it('constantes son las esperadas', () => {
    expect(LITROS_CUBETA).toBe(19);
    expect(LITROS_GALON).toBeCloseTo(3.785, 5);
  });

  it('dimensiones × área producen el mismo m²', () => {
    const a = calcularPintura({ modo: 'area', area: 25 });
    const b = calcularPintura({ modo: 'dimensiones', largo: 5, alto: 5 });
    expect(a.areaM2).toBe(b.areaM2);
  });
});
