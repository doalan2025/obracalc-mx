/**
 * Botón "Guardar en proyecto" reutilizable.
 *
 * Se incrusta al final de cada pantalla de calculadora. Al presionarlo:
 *   - Si no hay proyectos, ofrece crear uno con un nombre.
 *   - Si hay proyectos, lista los existentes + opción de crear uno nuevo.
 *   - Una vez seleccionado, guarda la sección y muestra confirmación.
 */

import { useState } from 'react';
import { Alert, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { Save } from 'lucide-react-native';
import { Button, Card, colors, Label } from './UI';
import {
  useProyectosStore,
  type TipoCalculo,
} from '@/store/proyectosStore';
import type { ResultadoCalculo } from '@/core/types';
import { TextInput } from 'react-native';

type Props = {
  tipo: TipoCalculo;
  etiqueta: string;
  inputs: Record<string, unknown>;
  resultado: ResultadoCalculo;
};

export function GuardarEnProyectoButton({
  tipo,
  etiqueta,
  inputs,
  resultado,
}: Props) {
  const { proyectos, crearProyecto, agregarSeccion } = useProyectosStore();

  const [open, setOpen] = useState(false);
  const [modoNuevo, setModoNuevo] = useState(false);
  const [nuevoNombre, setNuevoNombre] = useState('');
  const [nuevoCliente, setNuevoCliente] = useState('');
  const [nuevaUbicacion, setNuevaUbicacion] = useState('');

  const guardarEn = (proyectoId: string) => {
    agregarSeccion({
      proyectoId,
      tipo,
      etiqueta,
      inputs,
      resultado,
    });
    setOpen(false);
    Alert.alert(
      '✅ Guardado',
      'La sección quedó guardada en el proyecto.',
      [
        { text: 'Seguir aquí', style: 'cancel' },
        {
          text: 'Ver proyecto',
          onPress: () => router.push(`/proyecto/${proyectoId}`),
        },
      ],
    );
  };

  const crearYGuardar = () => {
    if (!nuevoNombre.trim()) {
      Alert.alert('Falta el nombre', 'Escribe un nombre para el proyecto.');
      return;
    }
    const id = crearProyecto({
      nombre: nuevoNombre.trim(),
      cliente: nuevoCliente.trim() || undefined,
      ubicacion: nuevaUbicacion.trim() || undefined,
    });
    guardarEn(id);
    setNuevoNombre('');
    setNuevoCliente('');
    setNuevaUbicacion('');
    setModoNuevo(false);
  };

  return (
    <>
      <Pressable
        onPress={() => setOpen(true)}
        style={({ pressed }) => [
          styles.btn,
          { opacity: pressed ? 0.85 : 1 },
        ]}
      >
        <Save color="#fff" size={18} />
        <Text style={styles.btnText}>Guardar en proyecto</Text>
      </Pressable>

      <Modal
        visible={open}
        transparent
        animationType="slide"
        onRequestClose={() => setOpen(false)}
      >
        <View style={styles.overlay}>
          <View style={styles.modal}>
            <Text style={styles.title}>Guardar cálculo</Text>
            <Text style={styles.subtitle}>{etiqueta}</Text>

            <ScrollView style={{ maxHeight: 420 }}>
              {!modoNuevo ? (
                <>
                  {proyectos.length === 0 ? (
                    <Text style={styles.hint}>
                      Aún no tienes proyectos. Crea uno para guardar este cálculo.
                    </Text>
                  ) : (
                    <View>
                      <Label>Selecciona un proyecto:</Label>
                      {proyectos.map((p) => (
                        <Pressable
                          key={p.id}
                          onPress={() => guardarEn(p.id)}
                          style={({ pressed }) => [
                            styles.proyectoItem,
                            pressed && { backgroundColor: '#eef2ff' },
                          ]}
                        >
                          <Text style={styles.proyectoName}>{p.nombre}</Text>
                          {p.cliente ? (
                            <Text style={styles.proyectoSub}>
                              Cliente: {p.cliente}
                            </Text>
                          ) : null}
                        </Pressable>
                      ))}
                    </View>
                  )}
                  <Button
                    title="+ Crear nuevo proyecto"
                    onPress={() => setModoNuevo(true)}
                    variant="secondary"
                  />
                </>
              ) : (
                <>
                  <Label>Nombre del proyecto *</Label>
                  <View style={styles.input}>
                    <TextInput
                      value={nuevoNombre}
                      onChangeText={setNuevoNombre}
                      placeholder="Ej. Casa García"
                      placeholderTextColor="#94a3b8"
                      style={styles.inputText}
                    />
                  </View>
                  <Label>Cliente (opcional)</Label>
                  <View style={styles.input}>
                    <TextInput
                      value={nuevoCliente}
                      onChangeText={setNuevoCliente}
                      placeholder="Ej. Sr. García"
                      placeholderTextColor="#94a3b8"
                      style={styles.inputText}
                    />
                  </View>
                  <Label>Ubicación (opcional)</Label>
                  <View style={styles.input}>
                    <TextInput
                      value={nuevaUbicacion}
                      onChangeText={setNuevaUbicacion}
                      placeholder="Ej. Mérida, Yucatán"
                      placeholderTextColor="#94a3b8"
                      style={styles.inputText}
                    />
                  </View>
                  <Button title="Crear y guardar" onPress={crearYGuardar} />
                  <Button
                    title="Volver"
                    onPress={() => setModoNuevo(false)}
                    variant="secondary"
                  />
                </>
              )}
            </ScrollView>

            <Button title="Cancelar" onPress={() => setOpen(false)} variant="secondary" />
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  btn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: colors.success,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 10,
    marginTop: 8,
  },
  btnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.55)',
    justifyContent: 'flex-end',
  },
  modal: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: '85%',
  },
  title: { fontSize: 18, fontWeight: '700', color: colors.text },
  subtitle: { fontSize: 13, color: colors.textMuted, marginBottom: 12 },
  hint: { color: colors.textMuted, fontSize: 14, marginVertical: 12, textAlign: 'center' },
  proyectoItem: {
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
    borderRadius: 6,
  },
  proyectoName: { fontSize: 15, fontWeight: '700', color: colors.text },
  proyectoSub: { fontSize: 12, color: colors.textMuted, marginTop: 2 },
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
