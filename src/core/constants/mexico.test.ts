import { describe, it, expect } from 'vitest';
import {
  BOTE_19L_M3,
  BULTO_CAL_EN_BOTES,
  BULTO_CAL_25KG_KG,
  DENSIDAD,
  SACO_CEMENTO_50KG_KG,
  SACO_50KG_EN_BOTES,
  SACO_25KG_EN_BOTES,
  VOLUMEN_BULTO_CAL_25KG_M3,
  VOLUMEN_SACO_50KG_M3,
  m3ABotes,
  m3CalABultos25,
  m3CementoASacos25,
  m3CementoASacos50,
  redondearArriba,
} from './mexico';

describe('Constantes México', () => {
  it('1 bote = 19 L = 0.019 m³', () => {
    expect(BOTE_19L_M3).toBe(0.019);
  });

  it('1 saco de 50 kg ocupa ~0.0347 m³', () => {
    expect(VOLUMEN_SACO_50KG_M3).toBeCloseTo(50 / 1440, 5);
    expect(VOLUMEN_SACO_50KG_M3).toBeCloseTo(0.03472, 4);
  });

  it('1 saco de 50 kg ≈ 1.83 botes de 19 L', () => {
    expect(SACO_50KG_EN_BOTES).toBeCloseTo(1.827, 2);
  });

  it('1 saco de 25 kg ≈ 0.913 botes de 19 L', () => {
    expect(SACO_25KG_EN_BOTES).toBeCloseTo(0.913, 2);
    // El de 25 kg debe ser exactamente la mitad del de 50 kg
    expect(SACO_25KG_EN_BOTES * 2).toBeCloseTo(SACO_50KG_EN_BOTES, 6);
  });

  it('1 bulto de cal de 25 kg ≈ 1.75 botes', () => {
    expect(VOLUMEN_BULTO_CAL_25KG_M3).toBeCloseTo(BULTO_CAL_25KG_KG / DENSIDAD.cal, 6);
    expect(BULTO_CAL_EN_BOTES).toBeCloseTo(1.754, 2);
  });

  it('m3ABotes y botesAm3 son inversos', () => {
    expect(m3ABotes(0.019)).toBeCloseTo(1, 6);
    expect(m3ABotes(1)).toBeCloseTo(1 / 0.019, 6);
  });

  it('m3CementoASacos50 convierte volumen a sacos correctamente', () => {
    // 1 saco 50 kg ocupa ~0.03472 m³
    expect(m3CementoASacos50(VOLUMEN_SACO_50KG_M3)).toBeCloseTo(1, 6);
    // 0.1 m³ de cemento → 0.1 * 1440 / 50 = 2.88 sacos
    expect(m3CementoASacos50(0.1)).toBeCloseTo(2.88, 5);
  });

  it('m3CementoASacos25 da el doble que m3CementoASacos50', () => {
    expect(m3CementoASacos25(0.1)).toBeCloseTo(m3CementoASacos50(0.1) * 2, 6);
  });

  it('m3CalABultos25 convierte volumen de cal a bultos', () => {
    // 1 m³ de cal a granel → 750 kg → 30 bultos de 25 kg
    expect(m3CalABultos25(1)).toBeCloseTo(30, 5);
  });

  it('redondearArriba comporta como Math.ceil', () => {
    expect(redondearArriba(0.1)).toBe(1);
    expect(redondearArriba(7.0)).toBe(7);
    expect(redondearArriba(7.01)).toBe(8);
  });

  it('Densidad de cemento es 1440 kg/m³ y la de cal 750 kg/m³', () => {
    expect(DENSIDAD.cemento).toBe(1440);
    expect(DENSIDAD.cal).toBe(750);
  });

  it('SACO_CEMENTO_50KG_KG es 50', () => {
    expect(SACO_CEMENTO_50KG_KG).toBe(50);
  });
});
