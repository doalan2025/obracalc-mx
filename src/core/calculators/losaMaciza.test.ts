import { describe, it, expect } from 'vitest';
import { calcularLosaMaciza } from './losaMaciza';
import { CONCEPTOS_MANO_OBRA_DEFAULT } from '../manoObra';

describe('Calculadora de losa maciza', () => {
  it('losa 5×4×0.10 m con #3 @20×20 y bastones 50%', () => {
    const r = calcularLosaMaciza({
      largo: 5,
      ancho: 4,
      conceptosMO: CONCEPTOS_MANO_OBRA_DEFAULT,
    });
    expect(r.areaM2).toBe(20);
    // Concreto = 20 × 0.10 × 1.05 = 2.1 m³
    expect(r.volumenConcretoM3).toBeCloseTo(2.1, 4);

    // nVarX = ceil(4/0.2)+1 = 21; longitud=5 → 21*5*1.10 = 115.5 ml
    // nVarY = ceil(5/0.2)+1 = 26; longitud=4 → 26*4*1.10 = 114.4 ml
    expect(r.parrilla.nVarX).toBe(21);
    expect(r.parrilla.nVarY).toBe(26);
    expect(r.parrilla.mlTotal).toBeCloseTo(115.5 + 114.4, 4);
    // Peso = 229.9 × 0.557 = 128.05 kg
    expect(r.parrilla.pesoKg).toBeCloseTo(128.05, 1);

    // Bastones = 50%
    expect(r.bastonesPesoKg).toBeCloseTo(r.parrilla.pesoKg * 0.5, 5);

    // M.O.: 20 m² × $320 = $6400
    expect(r.manoObra[0].conceptoId).toBe('mo_losa');
    expect(r.manoObra[0].total).toBe(20 * 320);
  });

  it('separación menor → más varillas y más peso', () => {
    const a = calcularLosaMaciza({
      largo: 4, ancho: 4, separacionXCm: 20, separacionYCm: 20,
      conceptosMO: CONCEPTOS_MANO_OBRA_DEFAULT,
    });
    const b = calcularLosaMaciza({
      largo: 4, ancho: 4, separacionXCm: 15, separacionYCm: 15,
      conceptosMO: CONCEPTOS_MANO_OBRA_DEFAULT,
    });
    expect(b.parrilla.pesoKg).toBeGreaterThan(a.parrilla.pesoKg);
    expect(b.parrilla.nVarX).toBeGreaterThan(a.parrilla.nVarX);
  });

  it('factorBastones controla la cantidad de bastones', () => {
    const sin = calcularLosaMaciza({
      largo: 4, ancho: 4, factorBastones: 0,
      conceptosMO: CONCEPTOS_MANO_OBRA_DEFAULT,
    });
    const con = calcularLosaMaciza({
      largo: 4, ancho: 4, factorBastones: 1,
      conceptosMO: CONCEPTOS_MANO_OBRA_DEFAULT,
    });
    expect(sin.bastonesPesoKg).toBe(0);
    expect(con.bastonesPesoKg).toBeCloseTo(con.parrilla.pesoKg, 5);
  });

  it('costos sumados consistentemente', () => {
    const r = calcularLosaMaciza({
      largo: 5, ancho: 4,
      conceptosMO: CONCEPTOS_MANO_OBRA_DEFAULT,
      precios: { cementoSaco50: 250, arenaM3: 400, gravaM3: 500, aguaM3: 35, aceroKg: 28, alambreKg: 38 },
    });
    expect(r.costoTotal).toBeCloseTo(r.costoMateriales + r.costoManoObra, 3);
  });
});
