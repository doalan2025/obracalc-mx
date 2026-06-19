import { describe, it, expect } from 'vitest';
import { calcularCastilloTrabe } from './castilloTrabe';
import { CONCEPTOS_MANO_OBRA_DEFAULT } from '../manoObra';

describe('Calculadora de castillos / trabes / columnas / cadenas', () => {
  it('castillo C-1: 4 piezas de 2.50 m, 15×15 cm, 4#3 + estribos #2 @15', () => {
    const r = calcularCastilloTrabe({
      tipo: 'castillo',
      etiqueta: 'C-1',
      longitudPorPieza: 2.5,
      cantidadPiezas: 4,
      baseCm: 15,
      peraltCm: 15,
      conceptosMO: CONCEPTOS_MANO_OBRA_DEFAULT,
    });

    // Concreto: 0.15 × 0.15 × 2.5 × 4 × 1.05 = 0.23625 m³
    expect(r.volumenConcretoM3).toBeCloseTo(0.23625, 5);

    // Acero longitudinal: 4 var × 2.5 m × 1.10 traslapes × 4 pzs = 44 ml
    expect(r.detalleLongitudinal.calibre).toBe('#3');
    expect(r.detalleLongitudinal.numVarillas).toBe(4);
    expect(r.detalleLongitudinal.mlTotal).toBeCloseTo(44, 4);
    // Peso = 44 × 0.557 = 24.508 kg
    expect(r.detalleLongitudinal.pesoKg).toBeCloseTo(24.508, 3);
    // Varillas comerciales = ceil(44/12) = 4
    expect(r.detalleLongitudinal.varillasComerciales).toBe(4);

    // Estribos: longitud por estribo = 2(15+15) - 8(2.5) + 2(10) = 60 - 20 + 20 = 60 cm
    expect(r.detalleEstribos.longitudPorEstriboCm).toBe(60);
    // Cantidad por pieza = ceil(250/15 + 1) = ceil(17.67) = 18
    expect(r.detalleEstribos.cantidadPorPieza).toBe(18);
    // ml total = 18 × 0.60 × 4 = 43.2 ml
    expect(r.detalleEstribos.mlTotal).toBeCloseTo(43.2, 4);
    // Peso del alambrón #2: 43.2 m × 0.2857 kg/m (1 kg = 3.5 m) = 12.343 kg
    expect(r.detalleEstribos.pesoKg).toBeCloseTo(43.2 / 3.5, 3);

    // M.O.: castillo → ml × tarifa $140
    expect(r.manoObra).toHaveLength(1);
    expect(r.manoObra[0].conceptoId).toBe('mo_castillo');
    expect(r.manoObra[0].cantidad).toBeCloseTo(2.5 * 4, 6);
    expect(r.manoObra[0].total).toBeCloseTo(2.5 * 4 * 140, 4);
  });

  it('trabe T-1: 1 pieza de 5.00 m, 20×30 cm, 4#4 + estribos #3 @20', () => {
    const r = calcularCastilloTrabe({
      tipo: 'trabe',
      etiqueta: 'T-1',
      longitudPorPieza: 5,
      cantidadPiezas: 1,
      baseCm: 20,
      peraltCm: 30,
      calibreLong: '#4',
      numVarillasLong: 4,
      calibreEstribo: '#3',
      separacionEstriboCm: 20,
      dosificacionId: 'f250_1:2:2',
      conceptosMO: CONCEPTOS_MANO_OBRA_DEFAULT,
    });

    // Concreto: 0.20 × 0.30 × 5 × 1.05 = 0.315 m³
    expect(r.volumenConcretoM3).toBeCloseTo(0.315, 4);
    // f'c=250 dosificación
    expect(r.dosificacion.id).toBe('f250_1:2:2');

    // Long: 4 × 5 × 1.10 = 22 ml; peso = 22 × 0.994 = 21.868
    expect(r.detalleLongitudinal.mlTotal).toBeCloseTo(22, 4);
    expect(r.detalleLongitudinal.pesoKg).toBeCloseTo(21.868, 3);

    // M.O. trabe: 5 ml × $220 = $1100
    expect(r.manoObra[0].conceptoId).toBe('mo_trabe');
    expect(r.manoObra[0].total).toBe(5 * 220);
  });

  it('columna: cobro por pieza, no por ml', () => {
    const r = calcularCastilloTrabe({
      tipo: 'columna',
      longitudPorPieza: 3,
      cantidadPiezas: 2,
      baseCm: 25,
      peraltCm: 25,
      conceptosMO: CONCEPTOS_MANO_OBRA_DEFAULT,
    });
    expect(r.manoObra[0].conceptoId).toBe('mo_columna');
    // 2 pza × $650 = $1300
    expect(r.manoObra[0].cantidad).toBe(2);
    expect(r.manoObra[0].unidad).toBe('pza');
    expect(r.manoObra[0].total).toBe(2 * 650);
  });

  it('cadena de cerramiento usa concepto mo_cadena', () => {
    const r = calcularCastilloTrabe({
      tipo: 'cadena',
      longitudPorPieza: 10,
      cantidadPiezas: 1,
      baseCm: 15,
      peraltCm: 15,
      conceptosMO: CONCEPTOS_MANO_OBRA_DEFAULT,
    });
    expect(r.manoObra[0].conceptoId).toBe('mo_cadena');
    expect(r.manoObra[0].total).toBe(10 * 130); // tarifa default $130
  });

  it('separación de estribos cambia su cantidad por pieza', () => {
    const sep15 = calcularCastilloTrabe({
      tipo: 'castillo',
      longitudPorPieza: 3,
      cantidadPiezas: 1,
      baseCm: 15,
      peraltCm: 15,
      separacionEstriboCm: 15,
      conceptosMO: CONCEPTOS_MANO_OBRA_DEFAULT,
    });
    const sep20 = calcularCastilloTrabe({
      tipo: 'castillo',
      longitudPorPieza: 3,
      cantidadPiezas: 1,
      baseCm: 15,
      peraltCm: 15,
      separacionEstriboCm: 20,
      conceptosMO: CONCEPTOS_MANO_OBRA_DEFAULT,
    });
    expect(sep15.detalleEstribos.cantidadPorPieza).toBeGreaterThan(
      sep20.detalleEstribos.cantidadPorPieza,
    );
  });

  it('costo total = materiales + M.O. y suma todos los componentes', () => {
    const r = calcularCastilloTrabe({
      tipo: 'castillo',
      longitudPorPieza: 2.5,
      cantidadPiezas: 6,
      baseCm: 15,
      peraltCm: 15,
      conceptosMO: CONCEPTOS_MANO_OBRA_DEFAULT,
      precios: {
        cementoSaco50: 250,
        arenaM3: 400,
        gravaM3: 500,
        aguaM3: 35,
        aceroKg: 28,
        alambreKg: 38,
      },
    });
    expect(r.costoMateriales).toBeGreaterThan(0);
    expect(r.costoManoObra).toBeGreaterThan(0);
    expect(r.costoTotal).toBeCloseTo(r.costoMateriales + r.costoManoObra, 3);
  });

  it('alambre recocido es 1.5% del peso total del acero', () => {
    const r = calcularCastilloTrabe({
      tipo: 'castillo',
      longitudPorPieza: 2.5,
      cantidadPiezas: 4,
      baseCm: 15,
      peraltCm: 15,
      conceptosMO: CONCEPTOS_MANO_OBRA_DEFAULT,
    });
    const pesoAcero =
      r.detalleLongitudinal.pesoKg + r.detalleEstribos.pesoKg;
    const alambre = r.materiales.find((m) => m.material === 'alambre')!;
    expect(alambre.cantidad).toBeCloseTo(pesoAcero * 0.015, 5);
  });
});
