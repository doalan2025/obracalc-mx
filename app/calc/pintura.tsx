import { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import {
  Card,
  colors,
  Label,
  NumberField,
  Row,
} from '@/components/UI';
import {
  calcularPintura,
  type TipoPintura,
} from '@/core/calculators/pintura';
import { useManoObraStore } from '@/store/manoObraStore';
import { usePreciosStore } from '@/store/preciosStore';
import {
  formatoEntero,
  formatoMXN,
  formatoNumero,
  parsearNumero,
} from '@/utils/formato';
import { GuardarEnProyectoButton } from '@/components/GuardarEnProyectoButton';

const TIPOS: { v: TipoPintura; label: string; rendimiento: string }[] = [
  { v: 'vinilica',          label: 'Vinílica/Látex',     rendimiento: '10' },
  { v: 'esmalte',           label: 'Esmalte',            rendimiento: '12' },
  { v: 'impermeabilizante', label: 'Impermeabilizante',  rendimiento: '1.5' },
  { v: 'otro',              label: 'Otro',               rendimiento: '10' },
];

export default function CalcPinturaScreen() {
  const { conceptos } = useManoObraStore();
  const { precios } = usePreciosStore();

  const [modo, setModo] = useState<'area' | 'dimensiones'>('area');
  const [area, setArea] = useState('100');
  const [largo, setLargo] = useState('10');
  const [alto, setAlto] = useState('2.5');
  const [tipo, setTipo] = useState<TipoPintura>('vinilica');
  const [rendimiento, setRendimiento] = useState('10');
  const [manos, setManos] = useState('2');
  const [merma, setMerma] = useState('5');

  const cambiarTipo = (t: TipoPintura) => {
    setTipo(t);
    const def = TIPOS.find((x) => x.v === t);
    if (def) setRendimiento(def.rendimiento);
  };

  const resultado = useMemo(() => {
    return calcularPintura({
      modo,
      area: parsearNumero(area),
      largo: parsearNumero(largo),
      alto: parsearNumero(alto),
      manos: parsearNumero(manos),
      rendimientoM2PorL: parsearNumero(rendimiento),
      tipo,
      mermaPct: parsearNumero(merma),
      conceptosMO: conceptos,
      precios: {
        cubetaPrecio: precios.pinturaCubeta,
        galonPrecio: precios.pinturaGalon,
      },
    });
  }, [modo, area, largo, alto, manos, rendimiento, tipo, merma, conceptos, precios]);

  return (
    <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
      <Card>
        <Text style={styles.section}>1. Superficie</Text>
        <View style={[styles.chipRow, { marginBottom: 8 }]}>
          <Text onPress={() => setModo('area')} style={[styles.chip, modo === 'area' && styles.chipActive]}>
            Área (m²)
          </Text>
          <Text onPress={() => setModo('dimensiones')} style={[styles.chip, modo === 'dimensiones' && styles.chipActive]}>
            Largo × alto
          </Text>
        </View>
        {modo === 'area' ? (
          <NumberField label="Área" value={area} onChange={setArea} suffix="m²" />
        ) : (
          <>
            <NumberField label="Largo" value={largo} onChange={setLargo} suffix="m" />
            <NumberField label="Alto" value={alto} onChange={setAlto} suffix="m" />
          </>
        )}
      </Card>

      <Card>
        <Text style={styles.section}>2. Tipo y rendimiento</Text>
        <View style={[styles.chipRow, { marginBottom: 8 }]}>
          {TIPOS.map((t) => (
            <Text
              key={t.v}
              onPress={() => cambiarTipo(t.v)}
              style={[styles.chip, tipo === t.v && styles.chipActive]}
            >
              {t.label}
            </Text>
          ))}
        </View>
        <NumberField
          label="Rendimiento por mano"
          value={rendimiento}
          onChange={setRendimiento}
          suffix="m²/L"
        />
        <Text style={styles.hint}>
          Vinílica lisa: 10–12 m²/L · Vinílica rugosa: 6–8 m²/L · Esmalte: 12 m²/L ·
          Impermeabilizante: 1–2 m²/L
        </Text>
        <NumberField label="Manos" value={manos} onChange={setManos} suffix="manos" />
        <NumberField label="Merma" value={merma} onChange={setMerma} suffix="%" />
      </Card>

      <Card>
        <Text style={styles.section}>Resumen</Text>
        <Row left="Área" right={`${formatoNumero(resultado.areaM2, 2)} m²`} />
        <Row left="Manos" right={`${resultado.manos}`} />
        <Row left="Litros totales" right={`${formatoNumero(resultado.litrosTotales, 2)} L`} bold />
        <Row left="Cubetas (19 L)" right={`${resultado.cubetas}`} bold />
        <Row left="Galones (3.785 L)" right={`${resultado.galones}`} />
      </Card>

      <Card>
        <Text style={styles.section}>Materiales</Text>
        {resultado.materiales.map((m) => (
          <View key={m.material} style={styles.matBlock}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <Text style={styles.matName}>{m.etiqueta}</Text>
              <Text style={styles.matValue}>
                {formatoNumero(m.cantidad, 2)} {m.unidad}
              </Text>
            </View>
            {m.equivalencias?.map((e, i) => (
              <Text key={i} style={styles.matEq}>
                └─ {e.etiqueta}: {formatoEntero(e.valor)} {e.unidad}
              </Text>
            ))}
            {m.costoTotal ? (
              <Text style={styles.matCost}>Costo: {formatoMXN(m.costoTotal)}</Text>
            ) : null}
          </View>
        ))}
      </Card>

      <Card>
        <Text style={styles.section}>Mano de obra</Text>
        {resultado.manoObra.length === 0 ? (
          <Text style={{ color: colors.textMuted }}>
            Configura "Aplicación de pintura" en Configuración.
          </Text>
        ) : (
          resultado.manoObra.map((mo) => (
            <View key={mo.conceptoId}>
              <Row left={mo.nombre} right={`${formatoNumero(mo.cantidad, 2)} ${mo.unidad} × ${formatoMXN(mo.tarifa)}`} />
              <Row left="Total M.O." right={formatoMXN(mo.total)} bold />
            </View>
          ))
        )}
      </Card>

      <Card>
        <Row left="Costo materiales" right={formatoMXN(resultado.costoMateriales)} />
        <Row left="Costo mano de obra" right={formatoMXN(resultado.costoManoObra)} />
        <Row left="TOTAL" right={formatoMXN(resultado.costoTotal)} bold />
      </Card>

      <GuardarEnProyectoButton
        tipo="pintura"
        etiqueta={`Pintura ${formatoNumero(resultado.areaM2, 1)} m²`}
        inputs={{ modo, area, largo, alto, tipo, rendimiento, manos, merma }}
        resultado={resultado}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  section: { fontSize: 16, fontWeight: '700', color: colors.text, marginBottom: 8 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  chip: {
    paddingHorizontal: 10, paddingVertical: 6,
    backgroundColor: '#f1f5f9', borderRadius: 999,
    fontSize: 13, color: colors.text, overflow: 'hidden',
  },
  chipActive: { backgroundColor: colors.primary, color: '#fff', fontWeight: '700' },
  hint: { fontSize: 12, color: colors.textMuted, marginTop: 6, fontStyle: 'italic' },
  matBlock: {
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border,
  },
  matName: { fontSize: 14, fontWeight: '700', color: colors.text },
  matValue: { fontSize: 14, color: colors.text, fontWeight: '600' },
  matEq: { fontSize: 13, color: colors.textMuted, marginTop: 2 },
  matCost: { fontSize: 13, color: colors.success, marginTop: 4, fontWeight: '700' },
});
