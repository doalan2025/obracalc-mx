import { useState } from 'react';
import {
  Alert,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { router } from 'expo-router';
import { ChevronRight, Plus, Trash2 } from 'lucide-react-native';
import { Button, Card, colors, Label } from '@/components/UI';
import { useProyectosStore } from '@/store/proyectosStore';
import { formatoMXN } from '@/utils/formato';

export default function ProyectosScreen() {
  const { proyectos, secciones, crearProyecto, eliminarProyecto } =
    useProyectosStore();

  const [open, setOpen] = useState(false);
  const [nombre, setNombre] = useState('');
  const [cliente, setCliente] = useState('');
  const [ubicacion, setUbicacion] = useState('');

  const crear = () => {
    if (!nombre.trim()) {
      Alert.alert('Falta nombre', 'Escribe un nombre para el proyecto.');
      return;
    }
    const id = crearProyecto({
      nombre: nombre.trim(),
      cliente: cliente.trim() || undefined,
      ubicacion: ubicacion.trim() || undefined,
    });
    setNombre(''); setCliente(''); setUbicacion('');
    setOpen(false);
    router.push(`/proyecto/${id}`);
  };

  return (
    <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 80 }}>
      {proyectos.length === 0 ? (
        <Card>
          <Text style={styles.title}>Aún no tienes proyectos</Text>
          <Text style={styles.body}>
            Crea un proyecto para una obra y empieza a guardar tus cálculos
            (concreto, piedra, muros, losas, pintura...). Después podrás
            generar un reporte consolidado en PDF para tu cliente.
          </Text>
          <Button title="+ Crear primer proyecto" onPress={() => setOpen(true)} />
        </Card>
      ) : (
        <>
          {proyectos
            .slice()
            .sort((a, b) => b.fechaActualizacion - a.fechaActualizacion)
            .map((p) => {
              const secs = secciones.filter((s) => s.proyectoId === p.id);
              const totalMat = secs.reduce(
                (acc, s) => acc + s.resultado.costoMateriales,
                0,
              );
              const totalMO = secs.reduce(
                (acc, s) => acc + s.resultado.costoManoObra,
                0,
              );
              const total = totalMat + totalMO;
              return (
                <Pressable
                  key={p.id}
                  onPress={() => router.push(`/proyecto/${p.id}`)}
                  style={({ pressed }) => [styles.card, pressed && { opacity: 0.85 }]}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.cardTitle}>{p.nombre}</Text>
                      {p.cliente ? (
                        <Text style={styles.cardSub}>👤 {p.cliente}</Text>
                      ) : null}
                      {p.ubicacion ? (
                        <Text style={styles.cardSub}>📍 {p.ubicacion}</Text>
                      ) : null}
                      <Text style={styles.cardMeta}>
                        {secs.length} secciones · {formatoMXN(total)}
                      </Text>
                    </View>
                    <ChevronRight color={colors.textMuted} size={20} />
                  </View>
                  <Pressable
                    onPress={() =>
                      Alert.alert(
                        'Eliminar proyecto',
                        `¿Seguro que quieres eliminar "${p.nombre}" y sus ${secs.length} secciones?`,
                        [
                          { text: 'Cancelar' },
                          {
                            text: 'Eliminar',
                            style: 'destructive',
                            onPress: () => eliminarProyecto(p.id),
                          },
                        ],
                      )
                    }
                    style={styles.trashBtn}
                    hitSlop={10}
                  >
                    <Trash2 color={colors.danger} size={18} />
                  </Pressable>
                </Pressable>
              );
            })}
          <Pressable
            onPress={() => setOpen(true)}
            style={({ pressed }) => [styles.fab, pressed && { opacity: 0.85 }]}
          >
            <Plus color="#fff" size={20} />
            <Text style={styles.fabText}>Nuevo proyecto</Text>
          </Pressable>
        </>
      )}

      <Modal
        visible={open}
        transparent
        animationType="slide"
        onRequestClose={() => setOpen(false)}
      >
        <View style={styles.overlay}>
          <View style={styles.modal}>
            <Text style={styles.title}>Nuevo proyecto</Text>
            <Label>Nombre *</Label>
            <View style={styles.input}>
              <TextInput
                value={nombre}
                onChangeText={setNombre}
                placeholder="Ej. Casa García"
                placeholderTextColor="#94a3b8"
                style={styles.inputText}
              />
            </View>
            <Label>Cliente</Label>
            <View style={styles.input}>
              <TextInput
                value={cliente}
                onChangeText={setCliente}
                placeholder="Ej. Sr. García"
                placeholderTextColor="#94a3b8"
                style={styles.inputText}
              />
            </View>
            <Label>Ubicación</Label>
            <View style={styles.input}>
              <TextInput
                value={ubicacion}
                onChangeText={setUbicacion}
                placeholder="Ej. Mérida, Yucatán"
                placeholderTextColor="#94a3b8"
                style={styles.inputText}
              />
            </View>
            <Button title="Crear proyecto" onPress={crear} />
            <Button title="Cancelar" onPress={() => setOpen(false)} variant="secondary" />
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: 18, fontWeight: '700', color: colors.text, marginBottom: 8 },
  body: { color: colors.textMuted, fontSize: 14, lineHeight: 20, marginBottom: 12 },
  card: {
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 10,
  },
  cardTitle: { fontSize: 16, fontWeight: '700', color: colors.text },
  cardSub: { fontSize: 13, color: colors.textMuted, marginTop: 2 },
  cardMeta: {
    fontSize: 13,
    color: colors.primary,
    marginTop: 6,
    fontWeight: '700',
  },
  trashBtn: {
    position: 'absolute',
    right: 10,
    bottom: 10,
    padding: 4,
  },
  fab: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: colors.primary,
    paddingVertical: 14,
    borderRadius: 999,
    marginTop: 12,
  },
  fabText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(15,23,42,0.55)',
    justifyContent: 'flex-end',
  },
  modal: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
  },
  input: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    paddingHorizontal: 12,
    marginBottom: 8,
  },
  inputText: { paddingVertical: 10, fontSize: 16, color: colors.text },
});
