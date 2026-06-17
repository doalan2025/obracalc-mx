import { describe, it, expect } from 'vitest';
import { calcularAcero } from './acero';
import { CALIBRES_VARILLA } from '../constants/acero';

describe('Calculadora de acero de refuerzo', () => {
  it('caso simple: 4 varillas #3 de 3.00 m con traslapes 5%', () => {
    const r = calcularAcero({
      partidas: [
        { calibre: '#3', longitudPorPieza: 3, cantidad: 4 },
      ],
    });

    // ml base = 3 × 4 = 12; con 5% = 12.6
    const par = r.partidas[0];
    expect(par.mlBase).toBe(12);
    expect(par.mlConTraslapes).toBeCloseTo(12.6, 6);
    // Peso = 12.6 × 0.557 = 7.0182 kg
    expect(par.pesoKg).toBeCloseTo(7.0182, 4);
    // 12.6 / 12 = 1.05 → ceil = 2 varillas comerciales
    expect(par.varillasComerciales).toBe(2);
    expect(r.pesoTotalKg).toBeCloseTo(7.0182, 4);
    // Alambre 1.5% = 0.10527 kg
    expect(r.alambreKg).toBeCloseTo(7.0182 * 0.015, 5);
  });

  it('agrupa correctamente varias partidas del mismo calibre', () => {
    const r = calcularAcero({
      partidas: [
        { nombre: 'Castillo C1', calibre: '#3', longitudPorPieza: 3, cantidad: 4 },
        { nombre: 'Castillo C2', calibre: '#3', longitudPorPieza: 3, cantidad: 4 },
        { nombre: 'Trabe T1',    calibre: '#4', longitudPorPieza: 5, cantidad: 4 },
      ],
    });

    expect(r.porCalibre).toHaveLength(2);
    const c3 = r.porCalibre.find((c) => c.calibre === '#3')!;
    const c4 = r.porCalibre.find((c) => c.calibre === '#4')!;

    // Total #3: (3×4 + 3×4) × 1.05 = 25.2 ml; peso = 25.2 × 0.557 = 14.0364 kg
    expect(c3.mlTotal).toBeCloseTo(25.2, 6);
    expect(c3.pesoKg).toBeCloseTo(14.0364, 4);
    // 25.2 / 12 = 2.1 → ceil 3 varillas comerciales
    expect(c3.varillasComerciales).toBe(3);

    // Total #4: 5×4 × 1.05 = 21 ml; peso = 21 × 0.994 = 20.874 kg
    expect(c4.mlTotal).toBeCloseTo(21, 6);
    expect(c4.pesoKg).toBeCloseTo(20.874, 3);
    expect(c4.varillasComerciales).toBe(2); // 21/12 = 1.75 → 2
  });

  it('preserva orden del catálogo (de menor a mayor calibre)', () => {
    const r = calcularAcero({
      partidas: [
        { calibre: '#5', longitudPorPieza: 6, cantidad: 4 },
        { calibre: '#2', longitudPorPieza: 0.5, cantidad: 100 }, // estribos
        { calibre: '#3', longitudPorPieza: 4, cantidad: 4 },
      ],
    });
    expect(r.porCalibre.map((c) => c.calibre)).toEqual(['#2', '#3', '#5']);
  });

  it('porcentaje de traslapes y alambre personalizables', () => {
    const r = calcularAcero({
      partidas: [{ calibre: '#4', longitudPorPieza: 10, cantidad: 1 }],
      porcentajeTraslapesPct: 10,
      porcentajeAlambrePct: 2,
    });
    // ml = 10 × 1.10 = 11; peso = 11 × 0.994 = 10.934
    expect(r.partidas[0].mlConTraslapes).toBeCloseTo(11, 6);
    expect(r.pesoTotalKg).toBeCloseTo(10.934, 3);
    // alambre 2%
    expect(r.alambreKg).toBeCloseTo(10.934 * 0.02, 4);
  });

  it('costo total = acero + alambre cuando hay precios', () => {
    const r = calcularAcero({
      partidas: [
        { calibre: '#3', longitudPorPieza: 3, cantidad: 8 },
        { calibre: '#2', longitudPorPieza: 1.5, cantidad: 30 },
      ],
      precios: { aceroKg: 28, alambreKg: 38 },
    });
    // Verificación de coherencia
    expect(r.costoMateriales).toBeGreaterThan(0);
    const aceroEsperado = r.pesoTotalKg * 28;
    const alambreEsperado = r.alambreKg * 38;
    expect(r.costoMateriales).toBeCloseTo(aceroEsperado + alambreEsperado, 3);
  });

  it('longitud comercial personalizable cambia el conteo de varillas', () => {
    const def = calcularAcero({
      partidas: [{ calibre: '#3', longitudPorPieza: 6, cantidad: 5 }],
    });
    const con6m = calcularAcero({
      partidas: [{ calibre: '#3', longitudPorPieza: 6, cantidad: 5 }],
      longitudComercialM: 6,
    });
    // 30 × 1.05 = 31.5 ml
    // Con 12 m: 31.5/12 = 2.625 → 3 varillas
    // Con 6 m:  31.5/6 = 5.25  → 6 varillas
    expect(def.partidas[0].varillasComerciales).toBe(3);
    expect(con6m.partidas[0].varillasComerciales).toBe(6);
  });

  it('catálogo CALIBRES_VARILLA tiene los pesos teóricos esperados', () => {
    expect(CALIBRES_VARILLA['#3'].kgPorMetro).toBe(0.557);
    expect(CALIBRES_VARILLA['#4'].kgPorMetro).toBe(0.994);
    expect(CALIBRES_VARILLA['#5'].kgPorMetro).toBe(1.552);
    expect(CALIBRES_VARILLA['#8'].kgPorMetro).toBe(3.973);
  });

  it('lista vacía devuelve cero peso y materiales sólo con alambre', () => {
    const r = calcularAcero({ partidas: [] });
    expect(r.pesoTotalKg).toBe(0);
    expect(r.alambreKg).toBe(0);
    expect(r.porCalibre).toHaveLength(0);
    // Lista de materiales sólo trae el alambre con cantidad cero
    expect(r.materiales).toHaveLength(1);
    expect(r.materiales[0].material).toBe('alambre');
  });
});
