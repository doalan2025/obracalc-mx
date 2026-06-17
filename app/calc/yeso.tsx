import { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { Card, colors, Label, NumberField } from '@/components/UI';
import { ResultadoCalculoView } from '@/components/ResultadoCalculo';
import { calcularYeso } from '@/core/calculators/yeso';
import { useManoObraStore } from '@/store/manoObraStore';
import { usePreciosStore } from '@/store/preciosStore';
import { parsearNumero } from '@/utils/formato';

export default function CalcYesoScreen() {
  const { conceptos } = useManoObraStore();
  const { precios } = usePreciosStore();

  const [modo, setModo] = useState<'area' | 'dimensiones'>('area');
  const [area, setArea] = useState('30');
  const [largo, setLargo] = useState('5');
  const [alto, setAlto] = useState('3');
  const [caras, setCaras] = useState<1 | 2>(1);
  const [espesorCm, setEspesorCm] = useState('1.5');
  const [merma, setMerma] = useState('10');

  const resultado = useMemo(() =>
    calcularYeso({
      modo,
      area: parsearNumero(area),
      largo: parsearNumero(largo),
      alto: parsearNumero(alto),
      caras,
      espesorCm: parsearNumero(espesorCm),
      mermaPct: parsearNumero(merma),
      conceptosMO: conceptos,
      precios: { sacoPrecio: precios.yesoSaco },
    }),
    [modo, area, largo, alto, caras, espesorCm, merma, conceptos, precios],
  );

  return (
    <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
      <Card>
        <Text style={styles.section}>Superficie</Text>
        <View style={[styles.chipRow, { marginBottom: 8 }]}>
          <Text onPress={() => setModo('area')} style={[styles.chip, modo === 'area' && styles.chipActive]}>Área</Text>
          <Text onPress={() => setModo('dimensiones')} style={[styles.chip, modo === 'dimensiones' && styles.chipActive]}>Largo × alto</Text>
        </View>
        {modo === 'area' ? (
          <NumberField label="Área" value={area} onChange={setArea} suffix="m²" />
        ) : (
          <>
            <NumberField label="Largo" value={largo} onChange={setLargo} suffix="m" />
            <NumberField label="Alto" value={alto} onChange={setAlto} suffix="m" />
          </>
        )}
        <Label>Caras</Label>
        <View style={styles.chipRow}>
          <Text onPress={() => setCaras(1)} style={[styles.chip, caras === 1 && styles.chipActive]}>1 cara</Text>
          <Text onPress={() => setCaras(2)} style={[styles.chip, caras === 2 && styles.chipActive]}>2 caras</Text>
        </View>
      </Card>
      <Card>
        <Text style={styles.section}>Detalles</Text>
        <NumberField label="Espesor" value={espesorCm} onChange={setEspesorCm} suffix="cm" />
        <NumberField label="Merma" value={merma} onChange={setMerma} suffix="%" />
      </Card>
      <ResultadoCalculoView
        resultado={resultado}
        tipo="yeso"
        etiqueta={`Yeso ${resultado.areaTotal.toFixed(1)} m²`}
        inputs={{ modo, area, largo, alto, caras, espesorCm, merma }}
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
