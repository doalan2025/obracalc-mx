import { describe, it, expect } from 'vitest';
import { calcularPiedra } from './piedra';
import { CONCEPTOS_MANO_OBRA_DEFAULT } from '../manoObra';

describe('Calculadora de mampostería de piedra', () => {
  it('barda 10 × 2.5 × 0.4 m con dosificación 1:1:6 y defaults', () => {
    const r = calcularPiedra({
      tipo: 'barda',
      largo: 10,
      altura: 2.5,
      espesor: 0.4,
      conceptosMO: CONCEPTOS_MANO_OBRA_DEFAULT,
    });

    // Geometría
    expect(r.volumenMuro).toBeCloseTo(10, 6);
    expect(r.areaFachada).toBeCloseTo(25, 6);

    // Distribución default 67/33
    expect(r.piedraAsentadaM3).toBeCloseTo(6.7, 6);
    // mortero "antes" de merma = 10 × 0.33 = 3.3 m³
    expect(r.morteroM3).toBeCloseTo(3.3, 6);

    // Piedra a comprar = 6.7 × 1.10 × (1 + 0.10) = 8.107 m³
    const piedra = r.materiales.find((m) => m.material === 'piedra')!;
    expect(piedra.cantidad).toBeCloseTo(8.107, 3);
    // Toneladas a 1500 kg/m³
    const eqTon = piedra.equivalencias?.find((e) => e.unidad === 't')!;
    expect(eqTon.valor).toBeCloseTo(8.107 * 1.5, 2);

    // Mortero final = 3.3 × 1.05 = 3.465 m³
    const mortero = r.materiales.find((m) => m.material === 'mortero')!;
    expect(mortero.cantidad).toBeCloseTo(3.465, 3);

    // Cemento m³ = 3.465 × 1.27 / 8 = 0.5500...
    // Cemento kg = 0.55007 × 1440 ≈ 792.10
    const cemento = r.materiales.find((m) => m.material === 'cemento')!;
    expect(cemento.cantidad).toBeCloseTo(792.1, 0);

    // Sacos 50 kg = ceil(792.10 / 50) = 16
    const eqSacos50 = cemento.equivalencias?.find((e) => e.etiqueta.includes('50'))!;
    expect(eqSacos50.valor).toBe(16);

    // Sacos 25 kg = ceil(792.10 / 25) = 32
    const eqSacos25 = cemento.equivalencias?.find((e) => e.etiqueta.includes('25'))!;
    expect(eqSacos25.valor).toBe(32);

    // Cal sí debe estar (dosificación 1:1:6)
    const cal = r.materiales.find((m) => m.material === 'cal')!;
    expect(cal).toBeDefined();
    expect(cal.cantidad).toBeCloseTo(412.5, 0); // ≈ 0.55 m³ × 750 kg/m³
    const eqBultos = cal.equivalencias?.find((e) => e.etiqueta.includes('25'))!;
    // ceil(0.55007 × 750 / 25) = ceil(16.50) = 17
    expect(eqBultos.valor).toBe(17);

    // Arena = 3.465 × 1.27 × 6/8 = 3.30 m³
    const arena = r.materiales.find((m) => m.material === 'arena')!;
    expect(arena.cantidad).toBeCloseTo(3.3, 2);

    // Mano de obra default por m² (mo_piedra @ $180/m² × 25 m² = 4 500)
    expect(r.manoObra).toHaveLength(1);
    expect(r.manoObra[0].conceptoId).toBe('mo_piedra');
    expect(r.manoObra[0].cantidad).toBe(25);
    expect(r.manoObra[0].total).toBe(25 * 180);
  });

  it('dosificación 1:5 (sin cal) NO debe incluir el material cal', () => {
    const r = calcularPiedra({
      tipo: 'barda',
      largo: 5,
      altura: 2,
      espesor: 0.4,
      dosificacionId: 'pega_1:4', // 1:4, sin cal
      conceptosMO: CONCEPTOS_MANO_OBRA_DEFAULT,
    });
    const cal = r.materiales.find((m) => m.material === 'cal');
    expect(cal).toBeUndefined();

    // Pero cemento, arena, mortero y piedra sí
    expect(r.materiales.find((m) => m.material === 'cemento')).toBeDefined();
    expect(r.materiales.find((m) => m.material === 'arena')).toBeDefined();
    expect(r.materiales.find((m) => m.material === 'piedra')).toBeDefined();
  });

  it('M.O. cobrada por m³ usa la tarifa explícita', () => {
    const r = calcularPiedra({
      tipo: 'cimiento',
      largo: 5,
      altura: 0.6,
      espesor: 0.5,
      modoCobroMO: 'm3',
      tarifaMOM3: 800,
      conceptosMO: CONCEPTOS_MANO_OBRA_DEFAULT,
    });
    // Volumen = 1.5 m³ × $800 = $1 200
    expect(r.manoObra[0].cantidad).toBeCloseTo(1.5, 6);
    expect(r.manoObra[0].unidad).toBe('m3');
    expect(r.manoObra[0].tarifa).toBe(800);
    expect(r.manoObra[0].total).toBeCloseTo(1200, 2);
  });

  it('cambiar fracción de piedra altera la cantidad de mortero', () => {
    const baseInput = {
      tipo: 'barda' as const,
      largo: 4,
      altura: 2,
      espesor: 0.4,
      conceptosMO: CONCEPTOS_MANO_OBRA_DEFAULT,
    };
    const con67 = calcularPiedra(baseInput);
    const con80 = calcularPiedra({ ...baseInput, fraccionPiedra: 0.8 });

    // Mortero "antes de merma" debe bajar al subir fracción de piedra
    expect(con80.morteroM3).toBeLessThan(con67.morteroM3);
    // Y la piedra asentada debe subir
    expect(con80.piedraAsentadaM3).toBeGreaterThan(con67.piedraAsentadaM3);
  });

  it('respeta densidad de piedra personalizada para toneladas', () => {
    const r = calcularPiedra({
      tipo: 'barda',
      largo: 10,
      altura: 2,
      espesor: 0.4,
      densidadPiedra: 2000, // basalto pesado
      conceptosMO: CONCEPTOS_MANO_OBRA_DEFAULT,
    });
    const piedra = r.materiales.find((m) => m.material === 'piedra')!;
    const toneladas = piedra.equivalencias!.find((e) => e.unidad === 't')!.valor;
    // Toneladas = m³ × 2000 / 1000 = m³ × 2
    expect(toneladas).toBeCloseTo(piedra.cantidad * 2, 4);
  });

  it('costo total incluye piedra, cemento, cal, arena y mano de obra', () => {
    const r = calcularPiedra({
      tipo: 'barda',
      largo: 6,
      altura: 2,
      espesor: 0.4,
      conceptosMO: CONCEPTOS_MANO_OBRA_DEFAULT,
      precios: {
        piedraM3: 350,
        cementoSaco50: 250,
        calBulto25: 130,
        arenaM3: 400,
        aguaM3: 35,
      },
    });
    expect(r.costoMateriales).toBeGreaterThan(0);
    expect(r.costoManoObra).toBeGreaterThan(0);
    expect(r.costoTotal).toBeCloseTo(r.costoMateriales + r.costoManoObra, 4);
    // La piedra debería ser un componente significativo
    const piedra = r.materiales.find((m) => m.material === 'piedra')!;
    expect(piedra.costoTotal).toBeGreaterThan(0);
  });

  it('dimensiones cero producen materiales y M.O. en cero', () => {
    const r = calcularPiedra({
      tipo: 'barda',
      largo: 0,
      altura: 0,
      espesor: 0,
      conceptosMO: CONCEPTOS_MANO_OBRA_DEFAULT,
    });
    expect(r.volumenMuro).toBe(0);
    expect(r.costoMateriales).toBe(0);
    expect(r.costoManoObra).toBe(0);
    expect(r.costoTotal).toBe(0);
  });
});
