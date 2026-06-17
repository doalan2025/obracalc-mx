import { describe, it, expect } from 'vitest';
import { calcularConcreto } from './concreto';
import { CONCEPTOS_MANO_OBRA_DEFAULT } from '../manoObra';

describe('Calculadora de concreto', () => {
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

    // Volumen final = 8.5 * 6.0 * 0.12 * 1.05 = 6.426
    expect(r.volumenConMerma).toBeCloseTo(6.426, 3);

    // Volumen seco = 6.426 * 1.54 = 9.896
    // Cemento m³ = 9.896 * 1/5.5 = 1.7993
    // Cemento kg = 1.79928 * 1440 = 2590.9632
    const cemento = r.materiales.find((m) => m.material === 'cemento')!;
    expect(cemento.cantidad).toBeCloseTo(2590.96, 1);

    // Sacos de 50 kg ≈ 51.82 → redondeo 52
    const eqSacos50 = cemento.equivalencias?.find((e) =>
      e.etiqueta.includes('50'),
    )!;
    expect(eqSacos50.valor).toBe(52);

    // Sacos de 25 kg ≈ 103.64 → redondeo 104
    const eqSacos25 = cemento.equivalencias?.find((e) =>
      e.etiqueta.includes('25'),
    )!;
    expect(eqSacos25.valor).toBe(104);

    // Arena m³ = 9.896 * 2/5.5 = 3.598
    const arena = r.materiales.find((m) => m.material === 'arena')!;
    expect(arena.cantidad).toBeCloseTo(3.598, 2);

    // Mano de obra: losa → mo_losa @ $320/m², cantidad = 8.5 * 6.0 = 51 m²
    expect(r.manoObra).toHaveLength(1);
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

  it('calcula costos de materiales con precios provistos', () => {
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
        arenaM3: 400,
        gravaM3: 500,
      },
    });
    // Existe costo total > 0 y es la suma de partes
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
