import { useMemo } from 'react';
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Stack, useLocalSearchParams, router } from 'expo-router';
import { FileText, Trash2, Share2 } from 'lucide-react-native';
import { Button, Card, colors, Pill, Row } from '@/components/UI';
import {
  NOMBRES_TIPOS,
  useProyectosStore,
  type Seccion,
} from '@/store/proyectosStore';
import { formatoMXN, formatoNumero } from '@/utils/formato';
import { generarYCompartirReportePDF } from '@/utils/reportePDF';

/** Consolida materiales sumando cantidades por (material + unidad). */
function consolidarMateriales(secciones: Seccion[]) {
  const mapa = new Map<
    string,
    { etiqueta: string; cantidad: number; unidad: string; costoTotal: number }
  >();
  secciones.forEach((s) => {
    s.resultado.materiales.forEach((m) => {
      const key = `${m.material}|${m.unidad}`;
      const cur = mapa.get(key) ?? {
        etiqueta: m.etiqueta,
        cantidad: 0,
        unidad: m.unidad,
        costoTotal: 0,
      };
      cur.cantidad += m.cantidad;
      cur.costoTotal += m.costoTotal ?? 0;
      mapa.set(key, cur);
    });
  });
  return Array.from(mapa.values()).sort((a, b) =>
    a.etiqueta.localeCompare(b.etiqueta, 'es-MX'),
  );
}

export default function ProyectoDetalle() {
  const params = useLocalSearchParams<{ id: string }>();
  const { proyectoPorId, secciones, eliminarSeccion, eliminarProyecto } =
    useProyectosStore();
  const proyecto = proyectoPorId(params.id);

  const seccionesDeEsta = useMemo(
    () => secciones.filter((s) => s.proyectoId === params.id),
    [secciones, params.id],
  );

  const totalMat = seccionesDeEsta.reduce(
    (acc, s) => acc + s.resultado.costoMateriales,
    0,
  );
  const totalMO = seccionesDeEsta.reduce(
    (acc, s) => acc + s.resultado.costoManoObra,
    0,
  );
  const total = totalMat + totalMO;

  const consolidado = useMemo(
    () => consolidarMateriales(seccionesDeEsta),
    [seccionesDeEsta],
  );

  if (!proyecto) {
    return (
      <View style={{ flex: 1, padding: 24, justifyContent: 'center' }}>
        <Text>Proyecto no encontrado.</Text>
        <Button title="Volver" onPress={() => router.back()} />
      </View>
    );
  }

  const exportar = async () => {
    try {
      await generarYCompartirReportePDF(proyecto, seccionesDeEsta);
    } catch (e) {
      Alert.alert('Error al generar PDF', String((e as Error).message ?? e));
    }
  };

  return (
    <>
      <Stack.Screen options={{ title: proyecto.nombre }} />
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 60 }}>
        <Card>
          <Text style={styles.title}>{proyecto.nombre}</Text>
          {proyecto.cliente ? (
            <Text style={styles.sub}>👤 {proyecto.cliente}</Text>
          ) : null}
          {proyecto.ubicacion ? (
            <Text style={styles.sub}>📍 {proyecto.ubicacion}</Text>
          ) : null}
          <Text style={styles.metadato}>
            Creado: {new Date(proyecto.fechaCreacion).toLocaleDateString('es-MX')}
          </Text>
        </Card>

        <Card>
          <Text style={styles.section}>Resumen general</Text>
          <Row left="Secciones" right={`${seccionesDeEsta.length}`} />
          <Row left="Costo materiales" right={formatoMXN(totalMat)} />
          <Row left="Costo mano de obra" right={formatoMXN(totalMO)} />
          <Row left="TOTAL" right={formatoMXN(total)} bold />
        </Card>

        {seccionesDeEsta.length === 0 ? (
          <Card>
            <Text style={styles.body}>
              Aún no hay cálculos guardados. Abre cualquier calculadora,
              llena los datos y presiona "Guardar en proyecto".
            </Text>
            <Button
              title="Ir a calculadoras"
              onPress={() => router.push('/(tabs)')}
            />
          </Card>
        ) : (
          <>
            <Card>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                <Text style={styles.section}>Secciones del proyecto</Text>
              </View>
              {seccionesDeEsta
                .slice()
                .sort((a, b) => b.fechaCreacion - a.fechaCreacion)
                .map((s) => (
                  <View key={s.id} style={styles.seccion}>
                    <View style={{ flex: 1 }}>
                      <View style={{ flexDirection: 'row', gap: 6, alignItems: 'center', marginBottom: 4 }}>
                        <Pill text={NOMBRES_TIPOS[s.tipo]} />
                      </View>
                      <Text style={styles.seccionEt}>{s.etiqueta}</Text>
                      <Text style={styles.seccionMeta}>
                        {formatoMXN(s.resultado.costoTotal)} ·{' '}
                        {new Date(s.fechaCreacion).toLocaleDateString('es-MX')}
                      </Text>
                    </View>
                    <Pressable
                      onPress={() =>
                        Alert.alert(
                          'Eliminar sección',
                          `¿Eliminar "${s.etiqueta}"?`,
                          [
                            { text: 'Cancelar' },
                            {
                              text: 'Eliminar',
                              style: 'destructive',
                              onPress: () => eliminarSeccion(s.id),
                            },
                          ],
                        )
                      }
                      hitSlop={10}
                    >
                      <Trash2 color={colors.danger} size={18} />
                    </Pressable>
                  </View>
                ))}
            </Card>

            <Card>
              <Text style={styles.section}>Lista consolidada de materiales</Text>
              {consolidado.map((m) => (
                <Row
                  key={m.etiqueta}
                  left={m.etiqueta}
                  right={`${formatoNumero(m.cantidad, m.unidad === 'kg' || m.unidad === 'L' || m.unidad === 'pza' ? 0 : 2)} ${m.unidad}${m.costoTotal > 0 ? ' · ' + formatoMXN(m.costoTotal) : ''}`}
                />
              ))}
            </Card>

            <Pressable
              onPress={exportar}
              style={({ pressed }) => [styles.btnPrimary, pressed && { opacity: 0.85 }]}
            >
              <FileText color="#fff" size={18} />
              <Text style={styles.btnPrimaryText}>Generar reporte PDF</Text>
            </Pressable>
          </>
        )}

        <Button
          title="Eliminar proyecto"
          variant="danger"
          onPress={() =>
            Alert.alert(
              'Eliminar proyecto',
              `¿Seguro que quieres eliminar "${proyecto.nombre}" y todas sus secciones?`,
              [
                { text: 'Cancelar' },
                {
                  text: 'Eliminar',
                  style: 'destructive',
                  onPress: () => {
                    eliminarProyecto(proyecto.id);
                    router.back();
                  },
                },
              ],
            )
          }
        />
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: 20, fontWeight: '700', color: colors.text, marginBottom: 4 },
  sub: { fontSize: 14, color: colors.textMuted, marginTop: 2 },
  metadato: { fontSize: 12, color: colors.textMuted, marginTop: 8 },
  section: { fontSize: 16, fontWeight: '700', color: colors.text, marginBottom: 8 },
  body: { color: colors.textMuted, fontSize: 14, lineHeight: 20, marginBottom: 12 },
  seccion: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  seccionEt: { fontSize: 14, fontWeight: '700', color: colors.text },
  seccionMeta: { fontSize: 12, color: colors.textMuted, marginTop: 2 },
  btnPrimary: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: colors.primary,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 10,
    marginTop: 8,
    marginBottom: 8,
  },
  btnPrimaryText: { color: '#fff', fontWeight: '700', fontSize: 15 },
});
