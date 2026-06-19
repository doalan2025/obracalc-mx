import { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { Card, colors, NumberField } from '@/components/UI';
import { ResultadoCalculoView } from '@/components/ResultadoCalculo';
import { calcularEscalera } from '@/core/calculators/escalera';
import { useManoObraStore } from '@/store/manoObraStore';
import { usePreciosStore } from '@/store/preciosStore';
import { parsearNumero } from '@/utils/formato';

export default function CalcEscaleraScreen() {
  const { conceptos } = useManoObraStore();
  const { precios, preferenciaCemento } = usePreciosStore();

  const [altura, setAltura] = useState('2.7');
  const [ancho, setAncho] = useState('1.0');
  const [huella, setHuella] = useState('28');
  const [peralt, setPeralt] = useState('18');
  const [espesor, setEspesor] = useState('12');

  const resultado = useMemo(() => {
    const H = parsearNumero(altura);
    const A = parsearNumero(ancho);
    if (!isFinite(H) || !isFinite(A) || H <= 0 || A <= 0) return null;
    return calcularEscalera({
      alturaTotalM: H,
      anchoM: A,
      huellaCm: parsearNumero(huella),
      peraltCm: parsearNumero(peralt),
      espesorRampaCm: parsearNumero(espesor),
      conceptosMO: conceptos,
      cementoPreferido: preferenciaCemento,

      precios: {
        cementoSaco50: precios.cementoSaco50,
        arenaM3: precios.arenaM3,
        gravaM3: precios.gravaM3,
        aguaM3: precios.aguaM3,
        aceroKg: precios.aceroKg,
        alambreKg: precios.alambreKg,
      },
    });
  }, [altura, ancho, huella, peralt, espesor, conceptos, precios]);

  return (
    <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
      <Card>
        <Text style={styles.section}>Geometría</Text>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <View style={{ flex: 1 }}>
            <NumberField label="Altura total" value={altura} onChange={setAltura} suffix="m" />
          </View>
          <View style={{ flex: 1 }}>
            <NumberField label="Ancho" value={ancho} onChange={setAncho} suffix="m" />
          </View>
        </View>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <View style={{ flex: 1 }}>
            <NumberField label="Huella" value={huella} onChange={setHuella} suffix="cm" />
          </View>
          <View style={{ flex: 1 }}>
            <NumberField label="Peralte" value={peralt} onChange={setPeralt} suffix="cm" />
          </View>
        </View>
        <NumberField label="Espesor de rampa" value={espesor} onChange={setEspesor} suffix="cm" />
      </Card>
      <ResultadoCalculoView
        resultado={resultado}
        tipo="escalera"
        etiqueta={`Escalera ${altura} m altura`}
        inputs={{ altura, ancho, huella, peralt, espesor }}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  section: { fontSize: 16, fontWeight: '700', color: colors.text, marginBottom: 8 },
});
