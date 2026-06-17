import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { colors } from '@/components/UI';

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <StatusBar style="dark" />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: colors.primary },
          headerTintColor: '#fff',
          headerTitleStyle: { fontWeight: '700' },
          contentStyle: { backgroundColor: colors.bg },
        }}
      >
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen
          name="calc/concreto"
          options={{ title: 'Calculadora de concreto' }}
        />
        <Stack.Screen
          name="calc/piedra"
          options={{ title: 'Pegado de piedra / Bardas' }}
        />
        <Stack.Screen
          name="calc/muro-block"
          options={{ title: 'Muro de block / tabique' }}
        />
        <Stack.Screen
          name="calc/repellado"
          options={{ title: 'Repellado / aplanado' }}
        />
        <Stack.Screen
          name="calc/loseta"
          options={{ title: 'Pegado de loseta' }}
        />
        <Stack.Screen
          name="calc/acero"
          options={{ title: 'Acero de refuerzo' }}
        />
        <Stack.Screen
          name="calc/castillo-trabe"
          options={{ title: 'Castillo / Trabe / Columna' }}
        />
        <Stack.Screen
          name="calc/losa-aligerada"
          options={{ title: 'Losa aligerada' }}
        />
        <Stack.Screen
          name="calc/firme"
          options={{ title: 'Firme de concreto' }}
        />
        <Stack.Screen
          name="calc/pintura"
          options={{ title: 'Pintura' }}
        />
        <Stack.Screen
          name="calc/losa-maciza"
          options={{ title: 'Losa maciza' }}
        />
        <Stack.Screen
          name="calc/zapata"
          options={{ title: 'Zapata' }}
        />
        <Stack.Screen
          name="calc/yeso"
          options={{ title: 'Aplanado de yeso' }}
        />
        <Stack.Screen
          name="calc/impermeabilizacion"
          options={{ title: 'Impermeabilización' }}
        />
        <Stack.Screen
          name="calc/tablaroca"
          options={{ title: 'Tablaroca' }}
        />
        <Stack.Screen
          name="calc/escalera"
          options={{ title: 'Escalera de concreto' }}
        />
        <Stack.Screen
          name="calc/cisterna"
          options={{ title: 'Cisterna / Tinaco' }}
        />
        <Stack.Screen
          name="proyecto/[id]"
          options={{ title: 'Proyecto' }}
        />
        <Stack.Screen
          name="config/mano-obra"
          options={{ title: 'Mano de obra' }}
        />
        <Stack.Screen
          name="config/precios"
          options={{ title: 'Precios de materiales' }}
        />
      </Stack>
    </SafeAreaProvider>
  );
}
