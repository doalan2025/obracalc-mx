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
  DOSIFICACIONES_CONCRETO,
  type DosificacionConcreto,
} from '@/core/constants/dosificaciones';
import { MALLAS } from '@/core/constants/malla';
import { calcularFirme } from '@/core/calculators/firme';
import { useManoObraStore } from '@/store/manoObraStore';
import { usePreciosStore } from '@/store/preciosStore';
import {
  formatoEntero,
  formatoMXN,
  formatoNumero,
  parsearNumero,
} from '@/utils/formato';
import { GuardarEnProyectoButton } from '@/components/GuardarEnProyectoButton';

const MALLA_IDS = Object.keys(MALLAS);

export default function CalcFirmeScreen() {
  const { conceptos } = useManoObraStore();
  const { precios, preferenciaCemento } = usePreciosStore();

  const [modo, setModo] = useState<'area' | 'dimensiones'>('area');
  const [area, setArea] = useState('30');
  const [largo, setLargo] = useState('6');
  const [ancho, setAncho] = useState('5');
  const [espesorCm, setEspesorCm] = useState('10');
  const [conMalla, setConMalla] = useState(true);
  const [mallaId, setMallaId] = useState('6x6-10x10');
  const [dosId, setDosId] = useState('f150_1:2:3');

  const resultado = useMemo(() => {
    return calcularFirme({
      modo,
      area: parsearNumero(area),
      largo: parsearNumero(largo),
      ancho: parsearNumero(ancho),
      espesorM: parsearNumero(espesorCm) / 100,
      conMalla,
      mallaId,
      dosificacionId: dosId,
      conceptosMO: conceptos,
      cementoPreferido: preferenciaCemento,

      precios: {
        cementoSaco50: precios.cementoSaco50,
        arenaM3: precios.arenaM3,
        gravaM3: precios.gravaM3,
        aguaM3: precios.aguaM3,
        mallaM2: precios.mallaM2,
      },
    });
  }, [modo, area, largo, ancho, espesorCm, conMalla, mallaId, dosId, conceptos, precios]);

  const dosOpciones: DosificacionConcreto[] = Object.values(DOSIFICACIONES_CONCRETO);

  return (
    <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
      <Card>
        <Text style={styles.section}>1. Superficie</Text>
        <View style={[styles.chipRow, { marginBottom: 8 }]}>
          <Text onPress={() => setModo('area')} style={[styles.chip, modo === 'area' && styles.chipActive]}>
            Área (m²)
          </Text>
          <Text onPress={() => setModo('dimensiones')} style={[styles.chip, modo === 'dimensiones' && styles.chipActive]}>
            Largo × ancho
          </Text>
        </View>
        {modo === 'area' ? (
          <NumberField label="Área" value={area} onChange={setArea} suffix="m²" />
        ) : (
          <>
            <NumberField label="Largo" value={largo} onChange={setLargo} suffix="m" />
            <NumberField label="Ancho" value={ancho} onChange={setAncho} suffix="m" />
          </>
        )}
        <NumberField label="Espesor del firme" value={espesorCm} onChange={setEspesorCm} suffix="cm" />
      </Card>

      <Card>
        <Text style={styles.section}>2. Refuerzo (malla)</Text>
        <View style={[styles.chipRow, { marginBottom: 8 }]}>
          <Text onPress={() => setConMalla(true)} style={[styles.chip, conMalla && styles.chipActive]}>
            Con malla
          </Text>
          <Text onPress={() => setConMalla(false)} style={[styles.chip, !conMalla && styles.chipActive]}>
            Sin malla
          </Text>
        </View>
        {conMalla ? (
          <View style={styles.chipRow}>
            {MALLA_IDS.map((id) => (
              <Text
                key={id}
                onPress={() => setMallaId(id)}
                style={[styles.chip, mallaId === id && styles.chipActive]}
              >
                {MALLAS[id].nombre.split(' ')[0]}
              </Text>
            ))}
          </View>
        ) : null}
      </Card>

      <Card>
        <Text style={styles.section}>3. Dosificación de concreto</Text>
        <View style={styles.chipRow}>
          {dosOpciones.map((d) => (
            <Text
              key={d.id}
              onPress={() => setDosId(d.id)}
              style={[styles.chip, dosId === d.id && styles.chipActive]}
            >
              {d.nombre.split('—')[0].trim()}
            </Text>
          ))}
        </View>
      </Card>

      <Card>
        <Text style={styles.section}>Resumen</Text>
        <Row left="Área" right={`${formatoNumero(resultado.areaM2, 2)} m²`} />
        <Row left="Espesor" right={`${espesorCm} cm`} />
        <Row left="Concreto" right={`${formatoNumero(resultado.volumenConcretoM3, 3)} m³`} bold />
        {resultado.malla ? (
          <Row left="Malla" right={`${formatoNumero(resultado.mallaM2, 1)} m² (${resultado.rollosMalla} rollos)`} />
        ) : null}
      </Card>

      <Card>
        <Text style={styles.section}>Materiales</Text>
        {resultado.materiales.map((m) => (
          <View key={m.material} style={styles.matBlock}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <Text style={styles.matName}>{m.etiqueta}</Text>
              <Text style={styles.matValue}>
                {m.unidad === 'kg' || m.unidad === 'L'
                  ? `${formatoEntero(m.cantidad)} ${m.unidad}`
                  : `${formatoNumero(m.cantidad, 3)} ${m.unidad}`}
              </Text>
            </View>
            {m.equivalencias?.map((e, i) => (
              <Text key={i} style={styles.matEq}>
                └─ {e.etiqueta}:{' '}
                {e.unidad === 'sacos' || e.unidad === 'botes' || e.unidad === 'rollos'
                  ? formatoEntero(e.valor)
                  : formatoNumero(e.valor, 2)}{' '}
                {e.unidad}
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
        {resultado.manoObra.map((mo) => (
          <View key={mo.conceptoId}>
            <Row left={mo.nombre} right={`${formatoNumero(mo.cantidad, 2)} ${mo.unidad} × ${formatoMXN(mo.tarifa)}`} />
            <Row left="Total M.O." right={formatoMXN(mo.total)} bold />
          </View>
        ))}
      </Card>

      <Card>
        <Row left="Costo materiales" right={formatoMXN(resultado.costoMateriales)} />
        <Row left="Costo mano de obra" right={formatoMXN(resultado.costoManoObra)} />
        <Row left="TOTAL" right={formatoMXN(resultado.costoTotal)} bold />
      </Card>

      <GuardarEnProyectoButton
        tipo="firme"
        etiqueta={`Firme ${formatoNumero(resultado.areaM2, 1)} m²`}
        inputs={{ modo, area, largo, ancho, espesorCm, conMalla, mallaId, dosId }}
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
  matBlock: {
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border,
  },
  matName: { fontSize: 14, fontWeight: '700', color: colors.text },
  matValue: { fontSize: 14, color: colors.text, fontWeight: '600' },
  matEq: { fontSize: 13, color: colors.textMuted, marginTop: 2 },
  matCost: { fontSize: 13, color: colors.success, marginTop: 4, fontWeight: '700' },
});
