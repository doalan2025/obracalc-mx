import { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { Card, colors, Label, NumberField } from '@/components/UI';
import { ResultadoCalculoView } from '@/components/ResultadoCalculo';
import { calcularCisterna } from '@/core/calculators/cisterna';
import { useManoObraStore } from '@/store/manoObraStore';
import { usePreciosStore } from '@/store/preciosStore';
import { parsearNumero } from '@/utils/formato';

export default function CalcCisternaScreen() {
  const { conceptos } = useManoObraStore();
  const { precios } = usePreciosStore();

  const [largo, setLargo] = useState('2');
  const [ancho, setAncho] = useState('1.5');
  const [altura, setAltura] = useState('1.5');
  const [eMuro, setEMuro] = useState('15');
  const [eLosa, setELosa] = useState('12');
  const [conTapa, setConTapa] = useState(true);

  const resultado = useMemo(() => {
    const L = parsearNumero(largo);
    const W = parsearNumero(ancho);
    const H = parsearNumero(altura);
    if (!isFinite(L) || !isFinite(W) || !isFinite(H) || L <= 0 || W <= 0 || H <= 0) return null;
    return calcularCisterna({
      largoM: L,
      anchoM: W,
      alturaM: H,
      espesorMuroCm: parsearNumero(eMuro),
      espesorLosaCm: parsearNumero(eLosa),
      conTapa,
      conceptosMO: conceptos,
      precios: {
        cementoSaco50: precios.cementoSaco50,
        arenaM3: precios.arenaM3,
        gravaM3: precios.gravaM3,
        aguaM3: precios.aguaM3,
        aceroKg: precios.aceroKg,
        alambreKg: precios.alambreKg,
        impermeabilizanteCubeta: precios.impermeabilizanteCubeta,
      },
    });
  }, [largo, ancho, altura, eMuro, eLosa, conTapa, conceptos, precios]);

  return (
    <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
      <Card>
        <Text style={styles.section}>Dimensiones interiores</Text>
        <NumberField label="Largo" value={largo} onChange={setLargo} suffix="m" />
        <NumberField label="Ancho" value={ancho} onChange={setAncho} suffix="m" />
        <NumberField label="Altura útil (lámina de agua)" value={altura} onChange={setAltura} suffix="m" />
      </Card>
      <Card>
        <Text style={styles.section}>Construcción</Text>
        <NumberField label="Espesor de muros" value={eMuro} onChange={setEMuro} suffix="cm" />
        <NumberField label="Espesor de losas" value={eLosa} onChange={setELosa} suffix="cm" />
        <Label>Tapa</Label>
        <View style={styles.chipRow}>
          <Text onPress={() => setConTapa(true)} style={[styles.chip, conTapa && styles.chipActive]}>Con tapa</Text>
          <Text onPress={() => setConTapa(false)} style={[styles.chip, !conTapa && styles.chipActive]}>Sin tapa</Text>
        </View>
      </Card>
      <ResultadoCalculoView
        resultado={resultado}
        tipo="cisterna"
        etiqueta={`Cisterna ${largo}×${ancho}×${altura} m`}
        inputs={{ largo, ancho, altura, eMuro, eLosa, conTapa }}
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
