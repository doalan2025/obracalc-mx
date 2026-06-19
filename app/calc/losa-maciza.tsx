import { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { Card, colors, Label, NumberField } from '@/components/UI';
import { ResultadoCalculoView } from '@/components/ResultadoCalculo';
import {
  CALIBRES_VARILLA,
  type CalibreVarilla,
} from '@/core/constants/acero';
import {
  DOSIFICACIONES_CONCRETO,
  type DosificacionConcreto,
} from '@/core/constants/dosificaciones';
import { calcularLosaMaciza } from '@/core/calculators/losaMaciza';
import { useManoObraStore } from '@/store/manoObraStore';
import { usePreciosStore } from '@/store/preciosStore';
import { parsearNumero } from '@/utils/formato';

const CALIBRES_LIST = (Object.keys(CALIBRES_VARILLA) as CalibreVarilla[]).slice(0, 6);

export default function CalcLosaMacizaScreen() {
  const { conceptos } = useManoObraStore();
  const { precios, preferenciaCemento } = usePreciosStore();

  const [largo, setLargo] = useState('5');
  const [ancho, setAncho] = useState('4');
  const [espesorCm, setEspesorCm] = useState('10');
  const [calibre, setCalibre] = useState<CalibreVarilla>('#3');
  const [sepX, setSepX] = useState('20');
  const [sepY, setSepY] = useState('20');
  const [factorBast, setFactorBast] = useState('50');
  const [dosId, setDosId] = useState('f200_1:2:2.5');

  const resultado = useMemo(() => {
    const L = parsearNumero(largo);
    const A = parsearNumero(ancho);
    if (!isFinite(L) || !isFinite(A) || L <= 0 || A <= 0) return null;
    return calcularLosaMaciza({
      largo: L,
      ancho: A,
      espesorM: parsearNumero(espesorCm) / 100,
      calibreParrilla: calibre,
      separacionXCm: parsearNumero(sepX),
      separacionYCm: parsearNumero(sepY),
      factorBastones: parsearNumero(factorBast) / 100,
      dosificacionId: dosId,
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
  }, [largo, ancho, espesorCm, calibre, sepX, sepY, factorBast, dosId, conceptos, precios]);

  const dosOpciones: DosificacionConcreto[] = Object.values(DOSIFICACIONES_CONCRETO);

  return (
    <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
      <Card>
        <Text style={styles.section}>Dimensiones</Text>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <View style={{ flex: 1 }}>
            <NumberField label="Largo" value={largo} onChange={setLargo} suffix="m" />
          </View>
          <View style={{ flex: 1 }}>
            <NumberField label="Ancho" value={ancho} onChange={setAncho} suffix="m" />
          </View>
        </View>
        <NumberField label="Espesor" value={espesorCm} onChange={setEspesorCm} suffix="cm" />
      </Card>
      <Card>
        <Text style={styles.section}>Acero (parrilla 2 sentidos)</Text>
        <Label>Calibre</Label>
        <View style={styles.chipRow}>
          {CALIBRES_LIST.map((c) => (
            <Text key={c} onPress={() => setCalibre(c)} style={[styles.chip, calibre === c && styles.chipActive]}>
              {c}
            </Text>
          ))}
        </View>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <View style={{ flex: 1 }}>
            <NumberField label="Separación X" value={sepX} onChange={setSepX} suffix="cm" />
          </View>
          <View style={{ flex: 1 }}>
            <NumberField label="Separación Y" value={sepY} onChange={setSepY} suffix="cm" />
          </View>
        </View>
        <NumberField
          label="Bastones (% del peso de parrilla)"
          value={factorBast}
          onChange={setFactorBast}
          suffix="%"
        />
      </Card>
      <Card>
        <Text style={styles.section}>Concreto</Text>
        <View style={styles.chipRow}>
          {dosOpciones.map((d) => (
            <Text key={d.id} onPress={() => setDosId(d.id)} style={[styles.chip, dosId === d.id && styles.chipActive]}>
              {d.nombre.split('—')[0].trim()}
            </Text>
          ))}
        </View>
      </Card>
      <ResultadoCalculoView
        resultado={resultado}
        tipo="losa-maciza"
        etiqueta={`Losa maciza ${largo}×${ancho}`}
        inputs={{ largo, ancho, espesorCm, calibre, sepX, sepY, factorBast, dosId }}
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
