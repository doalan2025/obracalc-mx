import { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { Card, colors, Label, NumberField } from '@/components/UI';
import { ResultadoCalculoView } from '@/components/ResultadoCalculo';
import { calcularZapata, type TipoZapata } from '@/core/calculators/zapata';
import { useManoObraStore } from '@/store/manoObraStore';
import { usePreciosStore } from '@/store/preciosStore';
import { parsearNumero } from '@/utils/formato';

export default function CalcZapataScreen() {
  const { conceptos } = useManoObraStore();
  const { precios } = usePreciosStore();

  const [tipo, setTipo] = useState<TipoZapata>('aislada');
  const [a, setA] = useState('1.2');
  const [b, setB] = useState('1.2');
  const [h, setH] = useState('0.30');
  const [cantidad, setCantidad] = useState('4');

  const resultado = useMemo(() => {
    const A = parsearNumero(a);
    const B = parsearNumero(b);
    const H = parsearNumero(h);
    if (!isFinite(A) || !isFinite(B) || !isFinite(H)) return null;
    return calcularZapata({
      tipo,
      a: A, b: B, h: H,
      cantidad: parsearNumero(cantidad),
      conceptosMO: conceptos,
      precios: {
        cementoSaco50: precios.cementoSaco50,
        arenaM3: precios.arenaM3,
        gravaM3: precios.gravaM3,
        aguaM3: precios.aguaM3,
        aceroKg: precios.aceroKg,
        alambreKg: precios.alambreKg,
      },
    });
  }, [tipo, a, b, h, cantidad, conceptos, precios]);

  return (
    <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
      <Card>
        <Text style={styles.section}>Tipo de zapata</Text>
        <View style={styles.chipRow}>
          <Text onPress={() => setTipo('aislada')} style={[styles.chip, tipo === 'aislada' && styles.chipActive]}>Aislada</Text>
          <Text onPress={() => setTipo('corrida')} style={[styles.chip, tipo === 'corrida' && styles.chipActive]}>Corrida</Text>
        </View>
      </Card>

      <Card>
        <Text style={styles.section}>Dimensiones</Text>
        {tipo === 'aislada' ? (
          <>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <View style={{ flex: 1 }}>
                <NumberField label="Lado A" value={a} onChange={setA} suffix="m" />
              </View>
              <View style={{ flex: 1 }}>
                <NumberField label="Lado B" value={b} onChange={setB} suffix="m" />
              </View>
            </View>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <View style={{ flex: 1 }}>
                <NumberField label="Altura (h)" value={h} onChange={setH} suffix="m" />
              </View>
              <View style={{ flex: 1 }}>
                <NumberField label="Cantidad" value={cantidad} onChange={setCantidad} suffix="pza" />
              </View>
            </View>
          </>
        ) : (
          <>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <View style={{ flex: 1 }}>
                <NumberField label="Ancho" value={a} onChange={setA} suffix="m" />
              </View>
              <View style={{ flex: 1 }}>
                <NumberField label="Altura" value={b} onChange={setB} suffix="m" />
              </View>
            </View>
            <NumberField label="Largo total" value={h} onChange={setH} suffix="m" />
          </>
        )}
      </Card>

      <ResultadoCalculoView
        resultado={resultado}
        tipo="zapata"
        etiqueta={`Zapata ${tipo} ${a}×${b}×${h}`}
        inputs={{ tipo, a, b, h, cantidad }}
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
