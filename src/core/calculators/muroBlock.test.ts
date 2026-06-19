import { describe, it, expect } from 'vitest';
import {
  calcularMuroBlock,
  opcionesSacosCemento,
  optimizarSacosCemento,
  PIEZAS_MURO,
  RECETAS_PEGA_BLOCK,
} from './muroBlock';
import { CONCEPTOS_MANO_OBRA_DEFAULT } from '../manoObra';

describe('Opciones de sacos de cemento', () => {
  it('0 kg → 0 sacos en ambas opciones', () => {
    const r = opcionesSacosCemento(0);
    expect(r.opcion50.sacos).toBe(0);
    expect(r.opcion25.sacos).toBe(0);
  });
  it('48 kg → 1 bulto 50 kg ó 2 bultos 25 kg', () => {
    const r = opcionesSacosCemento(48);
    expect(r.opcion50.sacos).toBe(1);
    expect(r.opcion50.sobranteKg).toBe(2);
    expect(r.opcion25.sacos).toBe(2);
    expect(r.opcion25.sobranteKg).toBe(2);
  });
  it('70 kg → 2 bultos 50 ó 3 bultos 25 (25 kg más eficiente)', () => {
    const r = opcionesSacosCemento(70);
    expect(r.opcion50.sacos).toBe(2);
    expect(r.opcion50.sobranteKg).toBe(30);
    expect(r.opcion25.sacos).toBe(3);
    expect(r.opcion25.sobranteKg).toBe(5);
  });
  it('100 kg → 2 bultos 50 ó 4 bultos 25 (sin sobrante)', () => {
    const r = opcionesSacosCemento(100);
    expect(r.opcion50.sacos).toBe(2);
    expect(r.opcion50.sobranteKg).toBe(0);
    expect(r.opcion25.sacos).toBe(4);
    expect(r.opcion25.sobranteKg).toBe(0);
  });
  it('optimizarSacosCemento (compat) ahora es 50 puro', () => {
    const r = optimizarSacosCemento(48);
    expect(r.sacos50).toBe(1);
    expect(r.sacos25).toBe(0); // ya NO mezcla
  });
});

describe('Calculadora muro de block — recetas mexicanas', () => {
  it('block 15 — muro 10×2.5 m, receta cal_5botes, preferencia saco50 (default)', () => {
    const r = calcularMuroBlock({
      tipoPieza: 'block_15',
      largo: 10,
      altura: 2.5,
      recetaId: 'cal_5botes',
      conceptosMO: CONCEPTOS_MANO_OBRA_DEFAULT,
    });

    expect(r.areaBruta).toBe(25);
    expect(r.receta.id).toBe('cal_5botes');

    // Mortero ≈ 0.394 m³ → bachas = 4
    expect(r.bachasNecesarias).toBe(4);

    // Cemento: 4 × 16 kg = 64 kg
    expect(r.cemento?.kgTotal).toBe(64);
    // Opción 50 kg: ceil(64/50) = 2 bultos (sobran 36 kg)
    expect(r.cemento?.bultos50).toBe(2);
    expect(r.cemento?.sobrante50Kg).toBe(36);
    // Opción 25 kg: ceil(64/25) = 3 bultos (sobran 11 kg)
    expect(r.cemento?.bultos25).toBe(3);
    expect(r.cemento?.sobrante25Kg).toBe(11);
    // Default = saco50
    expect(r.cemento?.preferencia).toBe('saco50');

    // Cal: 4 bultos
    const cal = r.materiales.find((m) => m.material === 'cal')!;
    expect(cal.cantidad).toBe(4);

    // Arena: 4 × 5 = 20 botes
    const arena = r.materiales.find((m) => m.material === 'arena')!;
    expect(arena.cantidad).toBe(20);

    // Agua: 4 × 2 = 8 botes
    const agua = r.materiales.find((m) => m.material === 'agua')!;
    expect(agua.cantidad).toBe(8);

    // Piezas: 25 × 12.5 × 1.05 = 328.125 → 329
    const pz = r.materiales.find((m) => m.material === 'piezas')!;
    expect(pz.cantidad).toBe(329);

    // M.O.: 25 × 95 = 2 375
    expect(r.manoObra[0].total).toBe(25 * 95);
  });

  it('preferencia saco25 cambia el costo y la equivalencia principal', () => {
    const r = calcularMuroBlock({
      tipoPieza: 'block_15',
      largo: 10,
      altura: 2.5,
      recetaId: 'cal_5botes',
      cementoPreferido: 'saco25',
      conceptosMO: CONCEPTOS_MANO_OBRA_DEFAULT,
      precios: { cementoSaco50: 250, cementoSaco25: 140 },
    });
    // Costo con saco25 = 3 × 140 = 420
    const cementoMat = r.materiales.find((m) => m.material === 'cemento')!;
    expect(cementoMat.costoTotal).toBe(3 * 140);
    expect(cementoMat.precioUnitario).toBe(140);
    expect(r.cemento?.preferencia).toBe('saco25');
  });

  it('receta mortero_premezclado — sin cemento ni cal', () => {
    const r = calcularMuroBlock({
      tipoPieza: 'block_15',
      largo: 10,
      altura: 2.5,
      recetaId: 'mortero_premezclado',
      conceptosMO: CONCEPTOS_MANO_OBRA_DEFAULT,
    });
    expect(r.cemento).toBeUndefined();
    expect(r.materiales.find((m) => m.material === 'cemento')).toBeUndefined();
    expect(r.materiales.find((m) => m.material === 'cal')).toBeUndefined();
    const mortero = r.materiales.find((m) => m.material === 'mortero_premezclado')!;
    expect(mortero.cantidad).toBe(3);
  });

  it('receta cal_25kg usa 25 kg de cemento por bacha', () => {
    const r = calcularMuroBlock({
      tipoPieza: 'block_15',
      largo: 10,
      altura: 2.5,
      recetaId: 'cal_25kg',
      conceptosMO: CONCEPTOS_MANO_OBRA_DEFAULT,
    });
    // 4 bachas × 25 kg = 100 kg
    expect(r.cemento?.kgTotal).toBe(100);
    // Opción 50: ceil(100/50) = 2 bultos
    expect(r.cemento?.bultos50).toBe(2);
    // Opción 25: ceil(100/25) = 4 bultos
    expect(r.cemento?.bultos25).toBe(4);
  });

  it('descuenta vanos del área neta', () => {
    const r = calcularMuroBlock({
      tipoPieza: 'block_15',
      largo: 6,
      altura: 3,
      vanos: [
        { ancho: 1.0, alto: 2.1 },
        { ancho: 1.5, alto: 1.2 },
      ],
      conceptosMO: CONCEPTOS_MANO_OBRA_DEFAULT,
    });
    expect(r.areaNeta).toBeCloseTo(14.1, 6);
    expect(r.manoObra[0].cantidad).toBeCloseTo(14.1, 6);
  });

  it('block 12 vs block 20: diferente mortero', () => {
    const base = {
      largo: 5,
      altura: 2,
      conceptosMO: CONCEPTOS_MANO_OBRA_DEFAULT,
    };
    const b12 = calcularMuroBlock({ ...base, tipoPieza: 'block_12' });
    const b20 = calcularMuroBlock({ ...base, tipoPieza: 'block_20' });
    expect(b20.morteroNecesarioM3).toBeGreaterThan(b12.morteroNecesarioM3);
  });

  it('tabique rojo usa 70 piezas/m²', () => {
    const r = calcularMuroBlock({
      tipoPieza: 'tabique_rojo',
      largo: 4,
      altura: 2.5,
      conceptosMO: CONCEPTOS_MANO_OBRA_DEFAULT,
    });
    const pz = r.materiales.find((m) => m.material === 'piezas')!;
    expect(pz.cantidad).toBe(735);
    expect(r.manoObra[0].conceptoId).toBe('mo_tabique');
  });

  it('costo total = materiales + M.O.', () => {
    const r = calcularMuroBlock({
      tipoPieza: 'block_15',
      largo: 6,
      altura: 2.4,
      recetaId: 'cal_5botes',
      conceptosMO: CONCEPTOS_MANO_OBRA_DEFAULT,
      precios: {
        piezaPrecio: 22,
        cementoSaco50: 250,
        cementoSaco25: 140,
        calBulto25: 130,
        arenaM3: 400,
        aguaM3: 35,
      },
    });
    expect(r.costoTotal).toBeCloseTo(r.costoMateriales + r.costoManoObra, 4);
  });

  it('catálogos consistentes', () => {
    expect(PIEZAS_MURO.block_12.piezasM2).toBe(12.5);
    expect(PIEZAS_MURO.tabique_rojo.piezasM2).toBe(70);
    expect(RECETAS_PEGA_BLOCK.cal_5botes.ingredientes.cementoKg).toBe(16);
    expect(RECETAS_PEGA_BLOCK.cal_5botes.ingredientes.calBultos25).toBe(1);
    expect(RECETAS_PEGA_BLOCK.cal_5botes.ingredientes.arenaBotes19L).toBe(5);
    expect(RECETAS_PEGA_BLOCK.cal_5botes.ingredientes.aguaBotes19L).toBe(2);
    expect(RECETAS_PEGA_BLOCK.mortero_premezclado.ingredientes.morteroBultos50).toBe(1);
  });
});
