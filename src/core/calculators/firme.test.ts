import { describe, it, expect } from 'vitest';
import { calcularFirme } from './firme';
import { CONCEPTOS_MANO_OBRA_DEFAULT } from '../manoObra';

describe('Calculadora de firme de concreto', () => {
  it('30 m² × 10 cm con malla 6×6-10/10 y dosificación f150', () => {
    const r = calcularFirme({
      modo: 'area',
      area: 30,
      conceptosMO: CONCEPTOS_MANO_OBRA_DEFAULT,
    });
    // Volumen = 30 × 0.10 × 1.05 = 3.15 m³
    expect(r.volumenConcretoM3).toBeCloseTo(3.15, 4);
    // Malla = 30 × 1.05 = 31.5 m² → ceil(31.5/15) = 3 rollos
    expect(r.mallaM2).toBeCloseTo(31.5, 4);
    expect(r.rollosMalla).toBe(3);
    // M.O. firme: 30 × $85 = $2 550
    expect(r.manoObra[0].conceptoId).toBe('mo_firme');
    expect(r.manoObra[0].total).toBe(30 * 85);
  });

  it('sin malla: el material malla no aparece y mallaM2 = 0', () => {
    const r = calcularFirme({
      modo: 'area',
      area: 20,
      conMalla: false,
      conceptosMO: CONCEPTOS_MANO_OBRA_DEFAULT,
    });
    expect(r.mallaM2).toBe(0);
    expect(r.rollosMalla).toBe(0);
    expect(r.malla).toBeNull();
    expect(r.materiales.find((m) => m.material === 'malla')).toBeUndefined();
  });

  it('espesor mayor escala el concreto proporcionalmente', () => {
    const e10 = calcularFirme({ modo: 'area', area: 10, espesorM: 0.10, conceptosMO: CONCEPTOS_MANO_OBRA_DEFAULT });
    const e15 = calcularFirme({ modo: 'area', area: 10, espesorM: 0.15, conceptosMO: CONCEPTOS_MANO_OBRA_DEFAULT });
    expect(e15.volumenConcretoM3 / e10.volumenConcretoM3).toBeCloseTo(1.5, 5);
  });

  it('costos totales suman materiales + M.O.', () => {
    const r = calcularFirme({
      modo: 'area',
      area: 50,
      conceptosMO: CONCEPTOS_MANO_OBRA_DEFAULT,
      precios: { cementoSaco50: 250, arenaM3: 400, gravaM3: 500, aguaM3: 35, mallaM2: 35 },
    });
    expect(r.costoTotal).toBeCloseTo(r.costoMateriales + r.costoManoObra, 3);
  });

  it('cambio de dosificación afecta cantidades pero no área', () => {
    const f150 = calcularFirme({ modo: 'area', area: 20, dosificacionId: 'f150_1:2:3', conceptosMO: CONCEPTOS_MANO_OBRA_DEFAULT });
    const f250 = calcularFirme({ modo: 'area', area: 20, dosificacionId: 'f250_1:2:2', conceptosMO: CONCEPTOS_MANO_OBRA_DEFAULT });
    expect(f250.areaM2).toBe(f150.areaM2);
    const cementoF250 = f250.materiales.find((m) => m.material === 'cemento')!.cantidad;
    const cementoF150 = f150.materiales.find((m) => m.material === 'cemento')!.cantidad;
    expect(cementoF250).toBeGreaterThan(cementoF150);
  });
});
