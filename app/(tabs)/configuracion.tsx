import { router } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Hammer, Coins, ChevronRight } from 'lucide-react-native';
import { colors } from '@/components/UI';

export default function ConfiguracionScreen() {
  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.intro}>
        Define una sola vez las tarifas de tu albañil y los precios de
        materiales. Todas las calculadoras los aplican en automático.
      </Text>

      <Pressable
        style={({ pressed }) => [styles.item, pressed && { opacity: 0.85 }]}
        onPress={() => router.push('/config/mano-obra')}
      >
        <Hammer color={colors.primary} size={24} />
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>Mano de obra</Text>
          <Text style={styles.subtitle}>
            Tarifas por m², ml, m³, pieza o jornal
          </Text>
        </View>
        <ChevronRight color={colors.textMuted} size={20} />
      </Pressable>

      <Pressable
        style={({ pressed }) => [styles.item, pressed && { opacity: 0.85 }]}
        onPress={() => router.push('/config/precios')}
      >
        <Coins color={colors.primary} size={24} />
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>Precios de materiales</Text>
          <Text style={styles.subtitle}>
            Cemento, cal, arena, grava, block, loseta…
          </Text>
        </View>
        <ChevronRight color={colors.textMuted} size={20} />
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16 },
  intro: {
    color: colors.textMuted,
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 16,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: colors.card,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 10,
  },
  title: { fontSize: 16, fontWeight: '700', color: colors.text },
  subtitle: { fontSize: 13, color: colors.textMuted, marginTop: 2 },
});
