import { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { Card, colors, Label, NumberField } from '@/components/UI';
import { ResultadoCalculoView } from '@/components/ResultadoCalculo';
import { calcularImpermeabilizacion, type TipoImpermeabilizante } from '@/core/calculators/impermeabilizacion';
import { useManoObraStore } from '@/store/manoObraStore';
import { usePreciosStore } from '@/store/preciosStore';
import { parsearNumero } from '@/utils/formato';

const TIPOS: { v: TipoImpermeabilizante; label: string }[] = [
  { v: 'membrana',         label: 'Membrana asfáltica' },
  { v: 'liquido_acrilico', label: 'Líquido acrílico' },
  { v: 'asfaltico',        label: 'Líquido asfáltico' },
];

export default function CalcImpermeabilizacionScreen() {
  const { conceptos } = useManoObraStore();
  const { precios } = usePreciosStore();

  const [modo, setModo] = useState<'area' | 'dimensiones'>('area');
  const [area, setArea] = useState('50');
  const [largo, setLargo] = useState('10');
  const [ancho, setAncho] = useState('5');
  const [tipo, setTipo] = useState<TipoImpermeabilizante>('liquido_acrilico');
  const [manos, setManos] = useState('2');
  const [rend, setRend] = useState('1.5');

  const resultado = useMemo(() =>
    calcularImpermeabilizacion({
      modo,
      area: parsearNumero(area),
      largo: parsearNumero(largo),
      ancho: parsearNumero(ancho),
      tipo,
      manos: parsearNumero(manos),
      rendimientoM2PorL: parsearNumero(rend),
      conceptosMO: conceptos,
      precios: {
        rolloPrecio: precios.membranaRollo,
        cubetaPrecio: precios.impermeabilizanteCubeta,
      },
    }),
    [modo, area, largo, ancho, tipo, manos, rend, conceptos, precios],
  );

  return (
    <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
      <Card>
        <Text style={styles.section}>Superficie</Text>
        <View style={[styles.chipRow, { marginBottom: 8 }]}>
          <Text onPress={() => setModo('area')} style={[styles.chip, modo === 'area' && styles.chipActive]}>Área</Text>
          <Text onPress={() => setModo('dimensiones')} style={[styles.chip, modo === 'dimensiones' && styles.chipActive]}>Largo × ancho</Text>
        </View>
        {modo === 'area' ? (
          <NumberField label="Área" value={area} onChange={setArea} suffix="m²" />
        ) : (
          <>
            <NumberField label="Largo" value={largo} onChange={setLargo} suffix="m" />
            <NumberField label="Ancho" value={ancho} onChange={setAncho} suffix="m" />
          </>
        )}
      </Card>
      <Card>
        <Text style={styles.section}>Tipo de impermeabilizante</Text>
        <View style={styles.chipRow}>
          {TIPOS.map((t) => (
            <Text key={t.v} onPress={() => setTipo(t.v)} style={[styles.chip, tipo === t.v && styles.chipActive]}>
              {t.label}
            </Text>
          ))}
        </View>
        {tipo !== 'membrana' ? (
          <>
            <NumberField label="Manos" value={manos} onChange={setManos} suffix="manos" />
            <NumberField label="Rendimiento" value={rend} onChange={setRend} suffix="m²/L" />
          </>
        ) : null}
      </Card>
      <ResultadoCalculoView
        resultado={resultado}
        tipo="impermeabilizacion"
        etiqueta={`Imperm. ${TIPOS.find((t) => t.v === tipo)?.label} ${resultado.areaM2.toFixed(1)} m²`}
        inputs={{ modo, area, largo, ancho, tipo, manos, rend }}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  section: { fontSize: 16, fontWeight: '700', color: colors.text, marginBottom: 8 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  chip: { paddingHorizontal: 10, paddingVertical: 6, backgroundColor: '#f1f5f9', borderRadius: 999, fontSize: 13, color: colors.text, overflow: 'hidden' },
  chipActive: { backgroundColor: colors.primary, color: '#fff', fontWeight: '700' },
});
