import { describe, it, expect } from 'vitest';
import { calcularRepellado } from './repellado';
import { CONCEPTOS_MANO_OBRA_DEFAULT } from '../manoObra';

describe('Calculadora de repellado / aplanado', () => {
  it('20 m² × 1.5 cm × 1 cara, dosificación 1:5, defaults', () => {
    const r = calcularRepellado({
      modo: 'area',
      area: 20,
      conceptosMO: CONCEPTOS_MANO_OBRA_DEFAULT,
    });

    expect(r.areaCara).toBe(20);
    expect(r.areaTotal).toBe(20);

    // Mortero = 20 × 0.015 × 1.12 = 0.336 m³
    expect(r.morteroM3).toBeCloseTo(0.336, 4);
    const mortero = r.materiales.find((m) => m.material === 'mortero')!;
    expect(mortero.cantidad).toBeCloseTo(0.336, 4);

    // 1:5 → no debe haber cal
    expect(r.materiales.find((m) => m.material === 'cal')).toBeUndefined();

    // M.O.: 20 × $120 (mo_repellado) = $2400
    expect(r.manoObra[0].conceptoId).toBe('mo_repellado');
    expect(r.manoObra[0].cantidad).toBe(20);
    expect(r.manoObra[0].total).toBe(20 * 120);
  });

  it('aplanado a 2 caras duplica el área total y el mortero', () => {
    const una = calcularRepellado({
      modo: 'dimensiones',
      largo: 5,
      alto: 2.5,
      caras: 1,
      conceptosMO: CONCEPTOS_MANO_OBRA_DEFAULT,
    });
    const dos = calcularRepellado({
      modo: 'dimensiones',
      largo: 5,
      alto: 2.5,
      caras: 2,
      conceptosMO: CONCEPTOS_MANO_OBRA_DEFAULT,
    });

    expect(una.areaCara).toBe(12.5);
    expect(una.areaTotal).toBe(12.5);
    expect(dos.areaCara).toBe(12.5);
    expect(dos.areaTotal).toBe(25);

    expect(dos.morteroM3).toBeCloseTo(una.morteroM3 * 2, 6);
    expect(dos.manoObra[0].total).toBeCloseTo(una.manoObra[0].total * 2, 4);
  });

  it('espesor mayor incrementa proporcionalmente el mortero', () => {
    const e15 = calcularRepellado({
      modo: 'area',
      area: 10,
      espesor: 0.015,
      conceptosMO: CONCEPTOS_MANO_OBRA_DEFAULT,
    });
    const e20 = calcularRepellado({
      modo: 'area',
      area: 10,
      espesor: 0.02,
      conceptosMO: CONCEPTOS_MANO_OBRA_DEFAULT,
    });
    // 2 cm / 1.5 cm = 1.333...
    expect(e20.morteroM3 / e15.morteroM3).toBeCloseTo(0.02 / 0.015, 5);
  });

  it('dosificación 1:1:6 con cal incluye el material cal', () => {
    const r = calcularRepellado({
      modo: 'area',
      area: 30,
      dosificacionId: 'repellado_1:1:6',
      conceptosMO: CONCEPTOS_MANO_OBRA_DEFAULT,
    });
    const cal = r.materiales.find((m) => m.material === 'cal')!;
    expect(cal).toBeDefined();
    expect(cal.cantidad).toBeGreaterThan(0);
    const eqBultos = cal.equivalencias!.find((e) => e.unidad === 'bultos')!;
    expect(eqBultos.valor).toBeGreaterThan(0);
  });

  it('aplica costos de materiales y suma con M.O.', () => {
    const r = calcularRepellado({
      modo: 'area',
      area: 50,
      espesor: 0.02,
      dosificacionId: 'repellado_1:1:6',
      conceptosMO: CONCEPTOS_MANO_OBRA_DEFAULT,
      precios: {
        cementoSaco50: 250,
        calBulto25: 130,
        arenaM3: 400,
        aguaM3: 35,
      },
    });
    expect(r.costoMateriales).toBeGreaterThan(0);
    expect(r.costoManoObra).toBeGreaterThan(0);
    expect(r.costoTotal).toBeCloseTo(r.costoMateriales + r.costoManoObra, 4);
  });

  it('respeta override de concepto M.O.', () => {
    const r = calcularRepellado({
      modo: 'area',
      area: 10,
      conceptosMO: CONCEPTOS_MANO_OBRA_DEFAULT,
      conceptoMOId: 'mo_jornal_albanil',
    });
    expect(r.manoObra[0].conceptoId).toBe('mo_jornal_albanil');
    // Tarifa default $500 × 10 m² = $5000 (aunque la unidad es jornal, la
    // función sólo multiplica cantidad × tarifa, queda a discreción del
    // usuario que la unidad concuerde con su criterio).
    expect(r.manoObra[0].total).toBe(10 * 500);
  });
});
