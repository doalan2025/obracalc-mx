import { describe, it, expect } from 'vitest';
import { calcularConcreto } from './concreto';
import { CONCEPTOS_MANO_OBRA_DEFAULT } from '../manoObra';

describe('Calculadora de concreto (formato limpio)', () => {
  it('losa 8.5 × 6.0 × 0.12 con f200 (1:2:2.5) y 5% merma', () => {
    const r = calcularConcreto({
      elemento: 'losa',
      largo: 8.5,
      ancho: 6.0,
      espesor: 0.12,
      dosificacionId: 'f200_1:2:2.5',
      mermaPct: 5,
      conceptosMO: CONCEPTOS_MANO_OBRA_DEFAULT,
    });

    // Volumen final = 8.5 × 6.0 × 0.12 × 1.05 = 6.426
    expect(r.volumenConMerma).toBeCloseTo(6.426, 3);

    // Cemento ≈ 2591 kg
    expect(r.cementoKg).toBeCloseTo(2590.96, 0);

    // NO debe haber "concreto fresco" en la lista de materiales
    expect(r.materiales.find((m) => m.material === 'concreto')).toBeUndefined();

    // Cemento aparece con sacos optimizados
    const cemento = r.materiales.find((m) => m.material === 'cemento')!;
    expect(cemento).toBeDefined();
    const sacos50 = cemento.equivalencias?.find((e) => e.etiqueta.includes('50'))?.valor;
    expect(sacos50).toBeGreaterThan(0);
    // 2590.96 / 50 = 51.82 → 51 sacos completos + residuo 40.96 (>25) → 52 sacos 50
    expect(sacos50).toBe(52);

    // Arena en BOTES (no m³ como cantidad principal)
    const arena = r.materiales.find((m) => m.material === 'arena')!;
    expect(arena.unidad).toBe('botes');
    expect(arena.cantidad).toBeGreaterThan(0);
    // Arena m³ = 9.896 × 2/5.5 = 3.598 m³ → ceil(3.598/0.019) = 190 botes
    expect(arena.cantidad).toBe(190);

    // Grava en BOTES
    const grava = r.materiales.find((m) => m.material === 'grava')!;
    expect(grava.unidad).toBe('botes');
    expect(grava.cantidad).toBe(237); // 4.498/0.019 → ceil

    // Agua en BOTES
    const agua = r.materiales.find((m) => m.material === 'agua')!;
    expect(agua.unidad).toBe('botes');

    // Mano de obra
    expect(r.manoObra[0].conceptoId).toBe('mo_losa');
    expect(r.manoObra[0].cantidad).toBeCloseTo(51, 6);
    expect(r.manoObra[0].total).toBeCloseTo(51 * 320, 6);
  });

  it('respeta override de concepto y cantidad de mano de obra', () => {
    const r = calcularConcreto({
      elemento: 'losa',
      largo: 4,
      ancho: 4,
      espesor: 0.1,
      conceptosMO: CONCEPTOS_MANO_OBRA_DEFAULT,
      conceptoMOId: 'mo_losa_aligerada',
      cantidadManoObra: 16,
    });
    expect(r.manoObra[0].conceptoId).toBe('mo_losa_aligerada');
    expect(r.manoObra[0].cantidad).toBe(16);
    expect(r.manoObra[0].total).toBe(16 * 280);
  });

  it('castillo aplica M.O. por metro lineal', () => {
    const r = calcularConcreto({
      elemento: 'castillo',
      largo: 3,
      ancho: 0.15,
      espesor: 0.15,
      conceptosMO: CONCEPTOS_MANO_OBRA_DEFAULT,
    });
    expect(r.manoObra[0].conceptoId).toBe('mo_castillo');
    expect(r.manoObra[0].unidad).toBe('ml');
    expect(r.manoObra[0].cantidad).toBe(3);
    expect(r.manoObra[0].total).toBe(3 * 140);
  });

  it('plantilla no aplica mano de obra automática', () => {
    const r = calcularConcreto({
      elemento: 'plantilla',
      largo: 5,
      ancho: 5,
      espesor: 0.05,
      dosificacionId: 'f100_1:3:5',
      conceptosMO: CONCEPTOS_MANO_OBRA_DEFAULT,
    });
    expect(r.manoObra).toHaveLength(0);
    expect(r.costoManoObra).toBe(0);
  });

  it('calcula costos de materiales con precios', () => {
    const r = calcularConcreto({
      elemento: 'firme',
      largo: 4,
      ancho: 4,
      espesor: 0.08,
      dosificacionId: 'f150_1:2:3',
      mermaPct: 5,
      conceptosMO: CONCEPTOS_MANO_OBRA_DEFAULT,
      precios: {
        cementoSaco50: 250,
        cementoSaco25: 140,
        arenaM3: 400,
        gravaM3: 500,
      },
    });
    expect(r.costoMateriales).toBeGreaterThan(0);
    expect(r.costoTotal).toBe(r.costoMateriales + r.costoManoObra);
  });

  it('usa dosificación por defecto si no se especifica', () => {
    const r = calcularConcreto({
      elemento: 'generico',
      largo: 1,
      ancho: 1,
      espesor: 1,
      conceptosMO: CONCEPTOS_MANO_OBRA_DEFAULT,
    });
    expect(r.dosificacion.id).toBe('f150_1:2:3');
  });
});
