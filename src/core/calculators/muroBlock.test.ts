import { describe, it, expect } from 'vitest';
import { calcularMuroBlock, PIEZAS_MURO } from './muroBlock';
import { CONCEPTOS_MANO_OBRA_DEFAULT } from '../manoObra';

describe('Calculadora de muro de block / tabique', () => {
  it('block 15 — muro 10 × 2.5 m, sin vanos, dosificación 1:4', () => {
    const r = calcularMuroBlock({
      tipoPieza: 'block_15',
      largo: 10,
      altura: 2.5,
      conceptosMO: CONCEPTOS_MANO_OBRA_DEFAULT,
    });

    // Geometría
    expect(r.areaBruta).toBe(25);
    expect(r.areaVanos).toBe(0);
    expect(r.areaNeta).toBe(25);

    // Piezas: 25 × 12.5 × 1.05 = 328.125 → ceil = 329
    const pz = r.materiales.find((m) => m.material === 'piezas')!;
    expect(pz.cantidad).toBe(329);

    // Mortero: 25 × 0.015 × 1.05 = 0.39375 m³
    const mortero = r.materiales.find((m) => m.material === 'mortero')!;
    expect(mortero.cantidad).toBeCloseTo(0.39375, 4);

    // Dosificación 1:4 → no debe haber cal
    expect(r.materiales.find((m) => m.material === 'cal')).toBeUndefined();

    // Cemento m³ = 0.39375 × 1.27 / 5 = 0.10001 m³
    // Cemento kg = 0.10001 × 1440 = 144.0
    const cemento = r.materiales.find((m) => m.material === 'cemento')!;
    expect(cemento.cantidad).toBeCloseTo(144, 0);

    // Sacos 50 kg = ceil(144 / 50) = 3
    const eqSacos50 = cemento.equivalencias!.find((e) => e.etiqueta.includes('50'))!;
    expect(eqSacos50.valor).toBe(3);

    // Sacos 25 kg = ceil(144 / 25) = 6
    const eqSacos25 = cemento.equivalencias!.find((e) => e.etiqueta.includes('25'))!;
    expect(eqSacos25.valor).toBe(6);

    // Mano de obra: 25 m² × $95 (mo_block) = $2 375
    expect(r.manoObra).toHaveLength(1);
    expect(r.manoObra[0].conceptoId).toBe('mo_block');
    expect(r.manoObra[0].cantidad).toBe(25);
    expect(r.manoObra[0].total).toBe(25 * 95);
  });

  it('descuenta correctamente vanos del área neta', () => {
    const r = calcularMuroBlock({
      tipoPieza: 'block_15',
      largo: 6,
      altura: 3,
      vanos: [
        { ancho: 1.0, alto: 2.1 }, // puerta = 2.1 m²
        { ancho: 1.5, alto: 1.2 }, // ventana = 1.8 m²
      ],
      conceptosMO: CONCEPTOS_MANO_OBRA_DEFAULT,
    });
    expect(r.areaBruta).toBe(18);
    expect(r.areaVanos).toBeCloseTo(3.9, 6);
    expect(r.areaNeta).toBeCloseTo(14.1, 6);
    // M.O. paga sólo el área neta
    expect(r.manoObra[0].cantidad).toBeCloseTo(14.1, 6);
    expect(r.manoObra[0].total).toBeCloseTo(14.1 * 95, 4);
  });

  it('block 12 vs block 20: difieren en mortero pero NO en piezas/m²', () => {
    const base = {
      largo: 5,
      altura: 2,
      conceptosMO: CONCEPTOS_MANO_OBRA_DEFAULT,
    };
    const b12 = calcularMuroBlock({ ...base, tipoPieza: 'block_12' });
    const b20 = calcularMuroBlock({ ...base, tipoPieza: 'block_20' });

    const pz12 = b12.materiales.find((m) => m.material === 'piezas')!.cantidad;
    const pz20 = b20.materiales.find((m) => m.material === 'piezas')!.cantidad;
    expect(pz12).toBe(pz20);

    const mort12 = b12.materiales.find((m) => m.material === 'mortero')!.cantidad;
    const mort20 = b20.materiales.find((m) => m.material === 'mortero')!.cantidad;
    expect(mort20).toBeGreaterThan(mort12);
  });

  it('tabique rojo usa concepto mo_tabique y rinde 70 pz/m²', () => {
    const r = calcularMuroBlock({
      tipoPieza: 'tabique_rojo',
      largo: 4,
      altura: 2.5,
      conceptosMO: CONCEPTOS_MANO_OBRA_DEFAULT,
    });
    // 10 m² × 70 × 1.05 = 735 → ceil = 735
    const pz = r.materiales.find((m) => m.material === 'piezas')!;
    expect(pz.cantidad).toBe(735);
    expect(r.manoObra[0].conceptoId).toBe('mo_tabique');
    expect(r.manoObra[0].total).toBe(10 * 110); // tarifa default $110
  });

  it('dosificación 1:1:6 incluye cal en los materiales', () => {
    const r = calcularMuroBlock({
      tipoPieza: 'block_15',
      largo: 5,
      altura: 2,
      dosificacionId: 'pega_1:1:6',
      conceptosMO: CONCEPTOS_MANO_OBRA_DEFAULT,
    });
    const cal = r.materiales.find((m) => m.material === 'cal')!;
    expect(cal).toBeDefined();
    expect(cal.cantidad).toBeGreaterThan(0);
    const eqBultos = cal.equivalencias!.find((e) => e.unidad === 'bultos')!;
    expect(eqBultos.valor).toBeGreaterThan(0);
  });

  it('costo total con precios provistos = materiales + M.O.', () => {
    const r = calcularMuroBlock({
      tipoPieza: 'block_15',
      largo: 6,
      altura: 2.4,
      conceptosMO: CONCEPTOS_MANO_OBRA_DEFAULT,
      precios: {
        piezaPrecio: 22,
        cementoSaco50: 250,
        arenaM3: 400,
        aguaM3: 35,
      },
    });
    expect(r.costoMateriales).toBeGreaterThan(0);
    expect(r.costoManoObra).toBeGreaterThan(0);
    expect(r.costoTotal).toBeCloseTo(r.costoMateriales + r.costoManoObra, 4);
  });

  it('rendimientos del catálogo PIEZAS_MURO son consistentes', () => {
    expect(PIEZAS_MURO.block_12.piezasM2).toBe(12.5);
    expect(PIEZAS_MURO.block_15.piezasM2).toBe(12.5);
    expect(PIEZAS_MURO.block_20.piezasM2).toBe(12.5);
    expect(PIEZAS_MURO.tabique_rojo.piezasM2).toBe(70);
    // El mortero crece con el espesor del block
    expect(PIEZAS_MURO.block_15.morteroM2).toBeGreaterThan(
      PIEZAS_MURO.block_12.morteroM2,
    );
    expect(PIEZAS_MURO.block_20.morteroM2).toBeGreaterThan(
      PIEZAS_MURO.block_15.morteroM2,
    );
  });
});
