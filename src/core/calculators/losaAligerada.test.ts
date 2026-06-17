import { describe, it, expect } from 'vitest';
import { calcularLosaAligerada } from './losaAligerada';
import { CONCEPTOS_MANO_OBRA_DEFAULT } from '../manoObra';

describe('Calculadora de losa aligerada', () => {
  it('losa 4 × 5 m, espesor 20 cm, casetón 60×20×20, nervadura 10', () => {
    const r = calcularLosaAligerada({
      largo: 5,
      ancho: 4,
      espesorTotalM: 0.2,
      conceptosMO: CONCEPTOS_MANO_OBRA_DEFAULT,
    });

    // Geometría
    expect(r.areaM2).toBe(20);
    expect(r.volumenTotalM3).toBeCloseTo(4.0, 4);
    // anchoBanda = (20+10)/100 = 0.30 m → nBandas = floor(4 / 0.30) = 13
    // nNervaduras = 14; nCasPorBanda = floor(5/0.6) = 8
    expect(r.numNervaduras).toBe(14);
    expect(r.numCasetones).toBe(13 * 8);

    // Volumen casetón = 0.6 × 0.2 × 0.2 = 0.024 m³
    // Volumen casetones total = 104 × 0.024 = 2.496 m³
    expect(r.volumenCasetonesM3).toBeCloseTo(2.496, 4);

    // Volumen concreto neto = 4 - 2.496 = 1.504 m³ × 1.05 = 1.5792
    expect(r.volumenConcretoM3).toBeCloseTo(1.5792, 4);

    // Capa de compresión = 20 - 20 = 0 cm (con casetón de 20 cm de peralte
    // sobre losa de 20 cm; en la práctica se haría losa de 25 cm)
    expect(r.espesorCapaCompresionM).toBe(0);

    // Acero longitudinal: 2 × 5 × 14 × 1.10 = 154 ml; peso = 154 × 0.994 = 153.076 kg
    expect(r.detalleLongitudinal.mlTotal).toBeCloseTo(154, 4);
    expect(r.detalleLongitudinal.pesoKg).toBeCloseTo(153.076, 2);

    // Malla: 20 × 1.05 = 21 m²; rollos = ceil(21 / 15) = 2
    expect(r.mallaM2).toBeCloseTo(21, 4);
    expect(r.rollosMalla).toBe(2);

    // M.O. losa aligerada: 20 m² × $280 = $5 600
    expect(r.manoObra[0].conceptoId).toBe('mo_losa_aligerada');
    expect(r.manoObra[0].cantidad).toBe(20);
    expect(r.manoObra[0].total).toBe(20 * 280);
  });

  it('losa 5×6 m, espesor 25 cm, capa de compresión = 5 cm', () => {
    const r = calcularLosaAligerada({
      largo: 6,
      ancho: 5,
      espesorTotalM: 0.25,
      peralteCasetonCm: 20,
      conceptosMO: CONCEPTOS_MANO_OBRA_DEFAULT,
    });
    expect(r.espesorCapaCompresionM).toBeCloseTo(0.05, 6);
  });

  it('cambiar dimensiones de casetón cambia el conteo de bandas', () => {
    const ch = calcularLosaAligerada({
      largo: 4,
      ancho: 4,
      anchoCasetonCm: 20, // banda = 30
      conceptosMO: CONCEPTOS_MANO_OBRA_DEFAULT,
    });
    const gr = calcularLosaAligerada({
      largo: 4,
      ancho: 4,
      anchoCasetonCm: 50, // banda = 60
      conceptosMO: CONCEPTOS_MANO_OBRA_DEFAULT,
    });
    expect(gr.numNervaduras).toBeLessThan(ch.numNervaduras);
  });

  it('aumentar varillas por nervadura aumenta el peso longitudinal', () => {
    const v1 = calcularLosaAligerada({
      largo: 5,
      ancho: 4,
      varillasPorNervadura: 1,
      conceptosMO: CONCEPTOS_MANO_OBRA_DEFAULT,
    });
    const v2 = calcularLosaAligerada({
      largo: 5,
      ancho: 4,
      varillasPorNervadura: 2,
      conceptosMO: CONCEPTOS_MANO_OBRA_DEFAULT,
    });
    expect(v2.detalleLongitudinal.pesoKg).toBeCloseTo(
      v1.detalleLongitudinal.pesoKg * 2,
      4,
    );
  });

  it('cambiar tipo de malla cambia el peso pero NO los m²', () => {
    const a = calcularLosaAligerada({
      largo: 5, ancho: 4, mallaId: '6x6-10x10',
      conceptosMO: CONCEPTOS_MANO_OBRA_DEFAULT,
    });
    const b = calcularLosaAligerada({
      largo: 5, ancho: 4, mallaId: '4x4-10x10',
      conceptosMO: CONCEPTOS_MANO_OBRA_DEFAULT,
    });
    expect(a.mallaM2).toBeCloseTo(b.mallaM2, 6);
    const pesoA = a.materiales
      .find((m) => m.material === 'malla')!
      .equivalencias!.find((e) => e.unidad === 'kg')!.valor;
    const pesoB = b.materiales
      .find((m) => m.material === 'malla')!
      .equivalencias!.find((e) => e.unidad === 'kg')!.valor;
    expect(pesoB).toBeGreaterThan(pesoA);
  });

  it('costos completos sumando todos los materiales y M.O.', () => {
    const r = calcularLosaAligerada({
      largo: 5,
      ancho: 4,
      conceptosMO: CONCEPTOS_MANO_OBRA_DEFAULT,
      precios: {
        cementoSaco50: 250, arenaM3: 400, gravaM3: 500, aguaM3: 35,
        aceroKg: 28, alambreKg: 38, casetonPza: 35, mallaM2: 35,
      },
    });
    expect(r.costoMateriales).toBeGreaterThan(0);
    expect(r.costoManoObra).toBeGreaterThan(0);
    expect(r.costoTotal).toBeCloseTo(r.costoMateriales + r.costoManoObra, 3);
  });
});
