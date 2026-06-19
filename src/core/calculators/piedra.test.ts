import { describe, it, expect } from 'vitest';
import { calcularPiedra } from './piedra';
import { CONCEPTOS_MANO_OBRA_DEFAULT } from '../manoObra';

describe('Calculadora de piedra (formato limpio)', () => {
  it('barda 10 × 2.5 × 0.4 m con dosificación 1:1:6', () => {
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
    expect(r.piedraAsentadaM3).toBeCloseTo(6.7, 6);
    expect(r.morteroM3).toBeCloseTo(3.3, 6);

    // Piedra ~8.107 m³
    const piedra = r.materiales.find((m) => m.material === 'piedra')!;
    expect(piedra.cantidad).toBeCloseTo(8.107, 3);
    const eqTon = piedra.equivalencias?.find((e) => e.unidad === 't')!;
    expect(eqTon.valor).toBeCloseTo(8.107 * 1.5, 2);

    // NO debe haber "mortero" como material en el output limpio
    expect(r.materiales.find((m) => m.material === 'mortero')).toBeUndefined();

    // Cemento debe aparecer con sacos optimizados
    const cemento = r.materiales.find((m) => m.material === 'cemento')!;
    expect(cemento).toBeDefined();
    expect(cemento.cantidad).toBeCloseTo(792.1, 0); // ~792 kg

    // Sacos 50 kg ≈ 16
    const sacos50 = cemento.equivalencias?.find((e) => e.etiqueta.includes('50'))?.valor;
    expect(sacos50).toBeGreaterThan(0);

    // Cal debe estar (dosificación 1:1:6)
    const cal = r.materiales.find((m) => m.material === 'cal')!;
    expect(cal).toBeDefined();
    // La cantidad ahora ES en bultos directamente
    expect(cal.unidad).toBe('bultos');
    expect(cal.cantidad).toBeGreaterThan(0);

    // Arena en BOTES
    const arena = r.materiales.find((m) => m.material === 'arena')!;
    expect(arena.unidad).toBe('botes');
    expect(arena.cantidad).toBeGreaterThan(0);

    // M.O. default por m² (mo_piedra @ $180/m² × 25 m² = 4 500)
    expect(r.manoObra).toHaveLength(1);
    expect(r.manoObra[0].conceptoId).toBe('mo_piedra');
    expect(r.manoObra[0].cantidad).toBe(25);
    expect(r.manoObra[0].total).toBe(25 * 180);
  });

  it('dosificación 1:4 (sin cal) NO debe incluir cal', () => {
    const r = calcularPiedra({
      tipo: 'barda',
      largo: 5,
      altura: 2,
      espesor: 0.4,
      dosificacionId: 'pega_1:4',
      conceptosMO: CONCEPTOS_MANO_OBRA_DEFAULT,
    });
    expect(r.materiales.find((m) => m.material === 'cal')).toBeUndefined();
    expect(r.materiales.find((m) => m.material === 'cemento')).toBeDefined();
    expect(r.materiales.find((m) => m.material === 'arena')).toBeDefined();
    expect(r.materiales.find((m) => m.material === 'piedra')).toBeDefined();
  });

  it('M.O. cobrada por m³', () => {
    const r = calcularPiedra({
      tipo: 'cimiento',
      largo: 5,
      altura: 0.6,
      espesor: 0.5,
      modoCobroMO: 'm3',
      tarifaMOM3: 800,
      conceptosMO: CONCEPTOS_MANO_OBRA_DEFAULT,
    });
    expect(r.manoObra[0].cantidad).toBeCloseTo(1.5, 6);
    expect(r.manoObra[0].unidad).toBe('m3');
    expect(r.manoObra[0].total).toBeCloseTo(1200, 2);
  });

  it('cambiar fracción de piedra altera cantidades', () => {
    const baseInput = {
      tipo: 'barda' as const,
      largo: 4,
      altura: 2,
      espesor: 0.4,
      conceptosMO: CONCEPTOS_MANO_OBRA_DEFAULT,
    };
    const con67 = calcularPiedra(baseInput);
    const con80 = calcularPiedra({ ...baseInput, fraccionPiedra: 0.8 });
    expect(con80.morteroM3).toBeLessThan(con67.morteroM3);
    expect(con80.piedraAsentadaM3).toBeGreaterThan(con67.piedraAsentadaM3);
  });

  it('densidad personalizada afecta toneladas', () => {
    const r = calcularPiedra({
      tipo: 'barda',
      largo: 10,
      altura: 2,
      espesor: 0.4,
      densidadPiedra: 2000,
      conceptosMO: CONCEPTOS_MANO_OBRA_DEFAULT,
    });
    const piedra = r.materiales.find((m) => m.material === 'piedra')!;
    const ton = piedra.equivalencias!.find((e) => e.unidad === 't')!.valor;
    expect(ton).toBeCloseTo(piedra.cantidad * 2, 4);
  });

  it('costo total incluye todos los componentes', () => {
    const r = calcularPiedra({
      tipo: 'barda',
      largo: 6,
      altura: 2,
      espesor: 0.4,
      conceptosMO: CONCEPTOS_MANO_OBRA_DEFAULT,
      precios: {
        piedraM3: 350,
        cementoSaco50: 250,
        cementoSaco25: 140,
        calBulto25: 130,
        arenaM3: 400,
        aguaM3: 35,
      },
    });
    expect(r.costoMateriales).toBeGreaterThan(0);
    expect(r.costoManoObra).toBeGreaterThan(0);
    expect(r.costoTotal).toBeCloseTo(r.costoMateriales + r.costoManoObra, 4);
  });

  it('dimensiones cero → todo cero', () => {
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
