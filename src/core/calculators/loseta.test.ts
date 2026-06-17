import { describe, it, expect } from 'vitest';
import { calcularLoseta, FORMATOS_LOSETA } from './loseta';
import { CONCEPTOS_MANO_OBRA_DEFAULT } from '../manoObra';

describe('Calculadora de pegado de loseta', () => {
  it('20 m² piso 45×45 con merma 8% y defaults', () => {
    const r = calcularLoseta({
      modo: 'area',
      area: 20,
      formato: FORMATOS_LOSETA['45x45'],
      conceptosMO: CONCEPTOS_MANO_OBRA_DEFAULT,
    });

    expect(r.areaNeta).toBe(20);
    // 20 × 1.08 = 21.6 m² a comprar
    expect(r.areaConMerma).toBeCloseTo(21.6, 4);

    // 1 pieza = 0.45 × 0.45 = 0.2025 m²
    // Piezas = ceil(21.6 / 0.2025) = ceil(106.666...) = 107
    const loseta = r.materiales.find((m) => m.material === 'loseta')!;
    expect(loseta.cantidad).toBeCloseTo(21.6, 4);
    const eqPiezas = loseta.equivalencias!.find((e) => e.unidad === 'pza')!;
    expect(eqPiezas.valor).toBe(107);

    // Adhesivo: 20 / 5 = 4 sacos exactos → ceil = 4
    const adh = r.materiales.find((m) => m.material === 'adhesivo')!;
    expect(adh.cantidad).toBe(4);

    // Boquilla: 20 × 0.5 = 10 kg
    const boq = r.materiales.find((m) => m.material === 'boquilla')!;
    expect(boq.cantidad).toBe(10);

    // M.O.: 20 m² × $150 = $3000
    expect(r.manoObra[0].conceptoId).toBe('mo_loseta');
    expect(r.manoObra[0].cantidad).toBe(20);
    expect(r.manoObra[0].total).toBe(20 * 150);
  });

  it('formatos diferentes producen distintas piezas para misma área', () => {
    const a = calcularLoseta({
      modo: 'area',
      area: 10,
      formato: FORMATOS_LOSETA['30x30'],
      conceptosMO: CONCEPTOS_MANO_OBRA_DEFAULT,
    });
    const b = calcularLoseta({
      modo: 'area',
      area: 10,
      formato: FORMATOS_LOSETA['60x60'],
      conceptosMO: CONCEPTOS_MANO_OBRA_DEFAULT,
    });

    const piezasA = a.materiales
      .find((m) => m.material === 'loseta')!
      .equivalencias!.find((e) => e.unidad === 'pza')!.valor;
    const piezasB = b.materiales
      .find((m) => m.material === 'loseta')!
      .equivalencias!.find((e) => e.unidad === 'pza')!.valor;

    // 30×30 (0.09 m²) → más piezas que 60×60 (0.36 m²)
    expect(piezasA).toBeGreaterThan(piezasB);
    expect(piezasA / piezasB).toBeCloseTo(4, 0); // factor 4
  });

  it('rendimiento de adhesivo personalizado afecta la cantidad de sacos', () => {
    const def = calcularLoseta({
      modo: 'area',
      area: 30,
      conceptosMO: CONCEPTOS_MANO_OBRA_DEFAULT,
    });
    const bajo = calcularLoseta({
      modo: 'area',
      area: 30,
      rendimientoAdhesivoM2PorSaco: 3, // peor rendimiento
      conceptosMO: CONCEPTOS_MANO_OBRA_DEFAULT,
    });

    const sacosDef = def.materiales.find((m) => m.material === 'adhesivo')!.cantidad;
    const sacosBajo = bajo.materiales.find((m) => m.material === 'adhesivo')!.cantidad;
    expect(sacosBajo).toBeGreaterThan(sacosDef);
  });

  it('peso de boquilla personalizado escala los kg', () => {
    const r = calcularLoseta({
      modo: 'area',
      area: 50,
      pesoBoquillaKgM2: 0.3,
      conceptosMO: CONCEPTOS_MANO_OBRA_DEFAULT,
    });
    // 50 × 0.3 = 15 kg
    const boq = r.materiales.find((m) => m.material === 'boquilla')!;
    expect(boq.cantidad).toBe(15);
  });

  it('sin formato sólo regresa m² (no piezas)', () => {
    const r = calcularLoseta({
      modo: 'dimensiones',
      largo: 4,
      ancho: 3,
      conceptosMO: CONCEPTOS_MANO_OBRA_DEFAULT,
    });
    expect(r.areaNeta).toBe(12);
    const loseta = r.materiales.find((m) => m.material === 'loseta')!;
    expect(loseta.equivalencias).toBeUndefined();
  });

  it('costos completos cuando se pasan precios', () => {
    const r = calcularLoseta({
      modo: 'area',
      area: 15,
      formato: FORMATOS_LOSETA['30x60'],
      conceptosMO: CONCEPTOS_MANO_OBRA_DEFAULT,
      precios: {
        losetaM2: 220,
        adhesivoSaco: 220,
        boquillaKg: 35,
      },
    });
    expect(r.costoMateriales).toBeGreaterThan(0);
    expect(r.costoManoObra).toBeGreaterThan(0);
    expect(r.costoTotal).toBeCloseTo(r.costoMateriales + r.costoManoObra, 4);
  });

  it('formatos del catálogo son consistentes', () => {
    expect(FORMATOS_LOSETA['60x60'].largoCm).toBe(60);
    expect(FORMATOS_LOSETA['60x60'].anchoCm).toBe(60);
    expect(FORMATOS_LOSETA['30x60'].largoCm).toBe(30);
    expect(FORMATOS_LOSETA['30x60'].anchoCm).toBe(60);
  });
});
