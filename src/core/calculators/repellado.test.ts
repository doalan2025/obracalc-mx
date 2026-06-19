import { describe, it, expect } from 'vitest';
import { calcularRepellado } from './repellado';
import { CONCEPTOS_MANO_OBRA_DEFAULT } from '../manoObra';

describe('Calculadora de repellado (formato limpio)', () => {
  it('20 m² × 1.5 cm × 1 cara, 1:5 sin cal', () => {
    const r = calcularRepellado({
      modo: 'area',
      area: 20,
      conceptosMO: CONCEPTOS_MANO_OBRA_DEFAULT,
    });

    expect(r.areaCara).toBe(20);
    expect(r.areaTotal).toBe(20);

    // Mortero base (cálculo interno)
    expect(r.morteroM3).toBeCloseTo(0.336, 4);

    // NO debe haber "mortero" en el output limpio
    expect(r.materiales.find((m) => m.material === 'mortero')).toBeUndefined();

    // 1:5 → no debe haber cal
    expect(r.materiales.find((m) => m.material === 'cal')).toBeUndefined();

    // Cemento debe estar
    expect(r.materiales.find((m) => m.material === 'cemento')).toBeDefined();
    // Arena en botes
    const arena = r.materiales.find((m) => m.material === 'arena')!;
    expect(arena.unidad).toBe('botes');

    // M.O.: 20 × $120 = $2400
    expect(r.manoObra[0].conceptoId).toBe('mo_repellado');
    expect(r.manoObra[0].total).toBe(20 * 120);
  });

  it('2 caras duplica área total y mortero', () => {
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
    expect(dos.areaTotal).toBe(25);
    expect(dos.morteroM3).toBeCloseTo(una.morteroM3 * 2, 6);
    expect(dos.manoObra[0].total).toBeCloseTo(una.manoObra[0].total * 2, 4);
  });

  it('espesor mayor escala el mortero', () => {
    const e15 = calcularRepellado({
      modo: 'area', area: 10, espesor: 0.015,
      conceptosMO: CONCEPTOS_MANO_OBRA_DEFAULT,
    });
    const e20 = calcularRepellado({
      modo: 'area', area: 10, espesor: 0.02,
      conceptosMO: CONCEPTOS_MANO_OBRA_DEFAULT,
    });
    expect(e20.morteroM3 / e15.morteroM3).toBeCloseTo(0.02 / 0.015, 5);
  });

  it('dosificación 1:1:6 incluye cal en bultos', () => {
    const r = calcularRepellado({
      modo: 'area',
      area: 30,
      dosificacionId: 'repellado_1:1:6',
      conceptosMO: CONCEPTOS_MANO_OBRA_DEFAULT,
    });
    const cal = r.materiales.find((m) => m.material === 'cal')!;
    expect(cal).toBeDefined();
    expect(cal.unidad).toBe('bultos');
    expect(cal.cantidad).toBeGreaterThan(0);
  });

  it('aplica costos y suma con M.O.', () => {
    const r = calcularRepellado({
      modo: 'area',
      area: 50,
      espesor: 0.02,
      dosificacionId: 'repellado_1:1:6',
      conceptosMO: CONCEPTOS_MANO_OBRA_DEFAULT,
      precios: {
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

  it('respeta override de concepto M.O.', () => {
    const r = calcularRepellado({
      modo: 'area',
      area: 10,
      conceptosMO: CONCEPTOS_MANO_OBRA_DEFAULT,
      conceptoMOId: 'mo_jornal_albanil',
    });
    expect(r.manoObra[0].conceptoId).toBe('mo_jornal_albanil');
    expect(r.manoObra[0].total).toBe(10 * 500);
  });
});
