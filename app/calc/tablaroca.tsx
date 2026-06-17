import { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { Card, colors, NumberField } from '@/components/UI';
import { ResultadoCalculoView } from '@/components/ResultadoCalculo';
import { calcularTablaroca } from '@/core/calculators/tablaroca';
import { useManoObraStore } from '@/store/manoObraStore';
import { usePreciosStore } from '@/store/preciosStore';
import { parsearNumero } from '@/utils/formato';

export default function CalcTablarocaScreen() {
  const { conceptos } = useManoObraStore();
  const { precios } = usePreciosStore();

  const [modo, setModo] = useState<'area' | 'dimensiones'>('area');
  const [area, setArea] = useState('30');
  const [largo, setLargo] = useState('5');
  const [ancho, setAncho] = useState('6');
  const [tipo, setTipo] = useState<'plafon' | 'muro'>('plafon');
  const [merma, setMerma] = useState('10');

  const resultado = useMemo(() =>
    calcularTablaroca({
      modo,
      area: parsearNumero(area),
      largo: parsearNumero(largo),
      ancho: parsearNumero(ancho),
      tipo,
      mermaPct: parsearNumero(merma),
      conceptosMO: conceptos,
      precios: { laminaPrecio: precios.laminaTablaroca },
    }),
    [modo, area, largo, ancho, tipo, merma, conceptos, precios],
  );

  return (
    <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
      <Card>
        <Text style={styles.section}>Tipo</Text>
        <View style={styles.chipRow}>
          <Text onPress={() => setTipo('plafon')} style={[styles.chip, tipo === 'plafon' && styles.chipActive]}>Plafón</Text>
          <Text onPress={() => setTipo('muro')} style={[styles.chip, tipo === 'muro' && styles.chipActive]}>Muro</Text>
        </View>
      </Card>
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
            <NumberField label="Ancho / alto" value={ancho} onChange={setAncho} suffix="m" />
          </>
        )}
        <NumberField label="Merma" value={merma} onChange={setMerma} suffix="%" />
      </Card>
      <ResultadoCalculoView
        resultado={resultado}
        tipo="tablaroca"
        etiqueta={`${tipo === 'plafon' ? 'Plafón' : 'Muro'} tablaroca ${resultado.areaM2.toFixed(1)} m²`}
        inputs={{ modo, area, largo, ancho, tipo, merma }}
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
