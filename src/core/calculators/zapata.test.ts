import { describe, it, expect } from 'vitest';
import { calcularZapata } from './zapata';
import { CONCEPTOS_MANO_OBRA_DEFAULT } from '../manoObra';

describe('Calculadora de zapata', () => {
  it('zapata aislada 1.2×1.2×0.30 m, 4 piezas', () => {
    const r = calcularZapata({
      tipo: 'aislada',
      a: 1.2, b: 1.2, h: 0.3,
      cantidad: 4,
      conceptosMO: CONCEPTOS_MANO_OBRA_DEFAULT,
    });
    // Volumen = 1.2*1.2*0.3*4*1.05 = 1.8144
    expect(r.volumenConcretoM3).toBeCloseTo(1.8144, 4);
    // M.O. zapata: 4 pza × $450
    expect(r.manoObra[0].conceptoId).toBe('mo_zapata');
    expect(r.manoObra[0].total).toBe(4 * 450);
  });

  it('zapata corrida 0.6×0.4×10 m', () => {
    const r = calcularZapata({
      tipo: 'corrida',
      a: 0.6, b: 0.4, h: 10,
      conceptosMO: CONCEPTOS_MANO_OBRA_DEFAULT,
    });
    // Volumen = 0.6*0.4*10*1.05 = 2.52 m³
    expect(r.volumenConcretoM3).toBeCloseTo(2.52, 4);
    // M.O. usa cadena (ml): 10 ml × $130
    expect(r.manoObra[0].cantidad).toBe(10);
    expect(r.manoObra[0].total).toBe(10 * 130);
  });

  it('aislada incluye parrilla en 2 sentidos', () => {
    const r = calcularZapata({
      tipo: 'aislada',
      a: 1.5, b: 1.5, h: 0.3, cantidad: 1,
      conceptosMO: CONCEPTOS_MANO_OBRA_DEFAULT,
    });
    expect(r.materiales.find((m) => m.material === 'varilla_parrilla')).toBeDefined();
    expect(r.materiales.find((m) => m.material === 'varilla_long')).toBeUndefined();
  });

  it('corrida incluye longitudinal y estribos', () => {
    const r = calcularZapata({
      tipo: 'corrida',
      a: 0.5, b: 0.4, h: 8,
      conceptosMO: CONCEPTOS_MANO_OBRA_DEFAULT,
    });
    expect(r.materiales.find((m) => m.material === 'varilla_long')).toBeDefined();
    expect(r.materiales.find((m) => m.material === 'varilla_estribo')).toBeDefined();
    expect(r.materiales.find((m) => m.material === 'varilla_parrilla')).toBeUndefined();
  });

  it('costos sumados consistentemente', () => {
    const r = calcularZapata({
      tipo: 'aislada', a: 1, b: 1, h: 0.25, cantidad: 6,
      conceptosMO: CONCEPTOS_MANO_OBRA_DEFAULT,
      precios: { cementoSaco50: 250, arenaM3: 400, gravaM3: 500, aceroKg: 28, alambreKg: 38 },
    });
    expect(r.costoTotal).toBeCloseTo(r.costoMateriales + r.costoManoObra, 3);
  });
});
