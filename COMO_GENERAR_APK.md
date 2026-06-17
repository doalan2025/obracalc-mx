# 📱 Cómo generar el APK de ObraCalc MX

Hay 3 formas de obtener un APK instalable en Android. La más sencilla es la 1.

---

## ✅ Opción 1 (recomendada) — EAS Build de Expo (en la nube)

**Ventajas:** No necesitas Android Studio ni instalar nada pesado.
La compilación corre en los servidores de Expo (gratis para apps personales).

### Requisitos

- Cuenta gratuita en https://expo.dev (registrarse toma 30 segundos)
- Node.js 18+ instalado en tu computadora

### Pasos

```bash
# 1. Descomprimir el paquete que te di
tar -xzf obracalc-mx.tar.gz   # o unzip obracalc-mx.zip
cd obracalc-mx

# 2. Instalar dependencias
npm install --legacy-peer-deps

# 3. Instalar la CLI de EAS (sólo la primera vez)
npm install -g eas-cli

# 4. Iniciar sesión en Expo
eas login            # te pedirá email y password de tu cuenta expo.dev

# 5. Configurar el proyecto (sólo la primera vez)
eas build:configure
# → cuando pregunte por iOS/Android, elegir Android

# 6. Generar el APK (perfil "preview" del archivo eas.json)
eas build -p android --profile preview
```

### Qué pasa después

- Sube tu código a los servidores de Expo (toma ~1 minuto).
- La compilación toma **8 a 15 minutos** (según la cola del momento).
- Cuando termina, te aparece un **link directo al APK** en tu terminal y
  también en https://expo.dev/accounts/<tu_usuario>/projects/obracalc-mx/builds.
- Bajas el APK, lo pasas al celular Android, lo abres y se instala.
  - En Android: Configuración → "Permitir instalación de fuentes desconocidas"
    para el navegador o el explorador de archivos.

### Costo

- **Gratis** para builds personales (free tier de EAS).
- Si quieres compilar muchas veces al día puede aplicar límite de cola, pero
  para uso personal es más que suficiente.

---

## 🛠️ Opción 2 — Construcción local con Android Studio

**Cuándo usarla:** Si no quieres depender de Expo Cloud o vas a compilar muchas
veces seguidas.

### Requisitos

- **Android Studio** instalado (https://developer.android.com/studio)
- **Android SDK** y **JDK 17** (Android Studio los instala)
- Variables de entorno `ANDROID_HOME` y `JAVA_HOME` configuradas

### Pasos

```bash
cd obracalc-mx
npm install --legacy-peer-deps

# Generar carpetas nativas android/ + ios/
npx expo prebuild

# Compilar el APK de producción
cd android
./gradlew assembleRelease

# El APK final queda en:
# android/app/build/outputs/apk/release/app-release.apk
```

### Ventajas

- 100 % local, sin nube.
- Compilación más rápida después de la primera vez.
- Puedes firmar el APK con tu propio keystore.

### Desventajas

- Tienes que instalar Android Studio (~5 GB).
- La primera compilación tarda mucho (~15-30 min descargando dependencias).

---

## ⚡ Opción 3 — Probar SIN compilar el APK (Expo Go)

**Cuándo usarla:** Para probar la app rápidamente en tu celular antes de
compilar el APK definitivo.

### Pasos

```bash
cd obracalc-mx
npm install --legacy-peer-deps
npm run start
```

1. Aparece un código QR en la terminal.
2. Instalas la app **Expo Go** en tu celular Android (gratis en Play Store).
3. Abres Expo Go y escaneas el QR.
4. La app se carga en tu celular en ~30 segundos.

⚠️ Esta versión NO se queda instalada (es como "preview"). El APK definitivo
se obtiene con la Opción 1 o 2.

---

## 🪟 Bonus — Versión para Windows 11 (PWA)

Si además del APK quieres la versión para Windows 11:

```bash
cd obracalc-mx
npm install --legacy-peer-deps

# Generar la PWA estática
npm run build:web   # crea la carpeta dist/

# Servirla localmente para instalarla en Edge
npx serve dist
```

1. Abre la URL que muestra (`http://localhost:3000`).
2. En **Microsoft Edge** aparece el botón **«Instalar app»** en la barra de
   direcciones.
3. La app queda con ícono propio en menú inicio y barra de tareas, **funciona
   offline**, y se ve idéntica al móvil.

---

## 💡 ¿Cuál elegir?

| Necesidad | Opción |
|---|---|
| Sólo quiero el APK rápido y no quiero instalar nada pesado | **1 (EAS Build)** |
| Voy a compilar muchas veces y no quiero depender de la nube | 2 (local) |
| Sólo quiero probar la app sin compilar nada | 3 (Expo Go) |
| Quiero usarla en Windows 11 | Bonus PWA |
