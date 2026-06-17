# ObraCalc MX

Calculadora **profesional** de materiales y mano de obra para obras de
construcción en México, **100 % offline**, en pesos mexicanos, con conteo en
**botes de 19 L**, sacos de cemento de **50 kg y 25 kg**, bultos de cal de
**25 kg** y catálogos de varilla, block, loseta, malla electrosoldada,
casetón y dosificaciones típicas mexicanas.

Un solo código (Expo + React Native + TypeScript) corre en **Android, iOS y
Windows 11** (como PWA instalable).

---

## ⚙️ Requisitos

- Node.js 18+ (recomendado 20 o 22)
- npm 10+
- Para Android: Android Studio o un dispositivo físico con Expo Go
- Para iOS: macOS + Xcode (o un dispositivo iOS con Expo Go)
- Para Windows 11: cualquier navegador Chromium (Edge / Chrome)

## 🚀 Primer arranque

```bash
npm install --legacy-peer-deps
npm test           # 81 tests del motor de cálculo
```

## ▶️ Ejecutar

```bash
# Móvil (Android/iOS) con Expo Go
npm run start

# Web / Windows 11 (servidor de desarrollo)
npm run web
```

### Instalar en Windows 11 como app nativa

1. `npm run build:web` → genera `./dist/` con la PWA estática.
2. Sirve la carpeta:
   ```bash
   npx serve dist
   ```
3. Abre la URL en **Microsoft Edge**.
4. En la barra de direcciones aparece el ícono **«Instalar app»** (o
   menú `⋯` → *Aplicaciones* → *Instalar este sitio como una aplicación*).
5. La app queda como aplicación de Windows con su propio ícono en menú
   inicio, barra de tareas y funciona offline una vez instalada.

---

## 🧮 Las 10 calculadoras LISTAS

| # | Calculadora | Qué calcula |
|---|-------------|-------------|
| 1 | **Concreto** | Losas, firmes, zapatas, plantillas: m³ + sacos 50/25 kg + botes 19 L |
| 2 | **Piedra / Bardas** | Piedra (m³ + ton), mortero (cemento, cal, arena), M.O. m² o m³ |
| 3 | **Castillo / Trabe / Columna / Cadena** | Concreto + acero longitudinal + estribos detallados con recubrimiento y ganchos |
| 4 | **Losa aligerada** | Casetón + nervaduras + capa de compresión + acero + malla |
| 5 | **Firme de concreto** | Con/sin malla electrosoldada |
| 6 | **Pintura** | Vinílica, esmalte, impermeabilizante: cubetas 19 L, galones, litros, manos |
| 7 | **Muro de block / tabique** | Block 12/15/20 o tabique rojo, con descuento de vanos |
| 8 | **Repellado / aplanado** | Mortero por área y espesor, 1 o 2 caras |
| 9 | **Pegado de loseta** | 8 formatos preconfigurados + adhesivo + boquilla |
| 10 | **Acero de refuerzo** | Despieces por calibre #2 a #12, varillas comerciales, alambre |

---

## 🏗️ Sistema de Proyectos (PROFESIONAL)

Convierte cálculos sueltos en una **obra** completa que puedes presentar al
cliente:

1. **Crear proyecto** con nombre, cliente y ubicación.
2. **Guardar** el resultado de cualquier calculadora dentro del proyecto
   con el botón **"Guardar en proyecto"**.
3. Cada cálculo guardado se llama **sección** (cimentación, muros, losa,
   pintura, etc.).
4. La pantalla del proyecto muestra:
   - Lista de secciones con sus costos.
   - **Lista consolidada** de materiales (suma cantidades de TODAS las
     secciones por tipo de material).
   - **Resumen general**: materiales + M.O. + total de la obra.
5. **Generar reporte PDF** profesional con un toque (`expo-print`).
   - En móvil se abre el diálogo de compartir (WhatsApp, correo, etc.)
   - En Windows 11 se abre la ventana de impresión del navegador para
     guardar como PDF.

### Reporte PDF profesional

El PDF incluye:
- Encabezado con marca **OBRACALC MX**
- Datos del cliente, ubicación y fechas
- Una tabla por sección (materiales con cantidades, equivalencias y costos)
- Detalle de mano de obra por sección
- **Lista consolidada** de materiales del proyecto completo
- **Total grande** con desglose materiales / M.O.

---

## 🧠 Convenciones México (núcleo del motor)

| Item                       | Valor                          |
|----------------------------|--------------------------------|
| Bote (cubeta) de albañil   | **19 L = 0.019 m³**            |
| Saco de cemento estándar   | 50 kg (≈ 1.83 botes 19 L)      |
| Saco de cemento chico      | 25 kg (≈ 0.91 botes 19 L)      |
| Bulto de cal               | 25 kg (≈ 1.75 botes 19 L)      |
| Cubeta de pintura          | 19 L (4 galones)               |
| Galón                      | 3.785 L                        |
| Densidad cemento (granel)  | 1 440 kg/m³                    |
| Densidad cal (granel)      | 750 kg/m³                      |
| Longitud varilla comercial | 12 m                           |
| Rollo de malla             | 6 × 2.5 = 15 m²                |

### Catálogos precargados

- **4 dosificaciones de concreto** (f'c 100 / 150 / 200 / 250)
- **5 dosificaciones de mortero** (pega, pega+cal, repellado, repellado+cal, firme)
- **11 calibres de varilla** (#2, #2.5, #3, #4, #5, #6, #7, #8, #9, #10, #12) con peso teórico
- **4 mallas electrosoldadas** (6×6-10/10, 6×6-8/8, 6×6-6/6, 4×4-10/10)
- **4 piezas de muro** (block 12, 15, 20, tabique rojo) con rendimientos
- **8 formatos de loseta** (15×15 hasta 60×120)
- **3 tipos de elemento de piedra** (barda, cimiento, muro de carga)

---

## 🧱 Mano de obra (16 conceptos editables)

| Concepto                  | Unidad | Tarifa default |
|---------------------------|:------:|---------------:|
| Pegado de block           | m²     | $95            |
| Pegado de tabique rojo    | m²     | $110           |
| Pegado de piedra          | m²     | $180           |
| Repellado / aplanado      | m²     | $120           |
| Pegado de loseta          | m²     | $150           |
| Castillo armado y colado  | ml     | $140           |
| Trabe armada y colada     | ml     | $220           |
| Columna armada y colada   | pza    | $650           |
| Elaboración de losa maciza| m²     | $320           |
| Losa aligerada            | m²     | $280           |
| Firme de concreto         | m²     | $85            |
| Cadena de cerramiento     | ml     | $130           |
| Zapata armada y colada    | pza    | $450           |
| Aplicación de pintura     | m²     | $35            |
| Jornal albañil            | día    | $500           |
| Jornal ayudante           | día    | $350           |

---

## 📂 Estructura del proyecto

```
obracalc-mx/
├── app/                              # Expo Router (pantallas)
│   ├── (tabs)/
│   │   ├── _layout.tsx
│   │   ├── index.tsx                 # Galería de calculadoras
│   │   ├── proyectos.tsx             # Lista de proyectos
│   │   └── configuracion.tsx
│   ├── calc/                         # 10 calculadoras
│   │   ├── concreto.tsx              ✅
│   │   ├── piedra.tsx                ✅
│   │   ├── castillo-trabe.tsx        ✅
│   │   ├── losa-aligerada.tsx        ✅
│   │   ├── firme.tsx                 ✅
│   │   ├── pintura.tsx               ✅
│   │   ├── muro-block.tsx            ✅
│   │   ├── repellado.tsx             ✅
│   │   ├── loseta.tsx                ✅
│   │   └── acero.tsx                 ✅
│   ├── proyecto/[id].tsx             # Detalle de proyecto + PDF
│   ├── config/{mano-obra,precios}.tsx
│   └── _layout.tsx
├── src/
│   ├── core/
│   │   ├── constants/
│   │   │   ├── mexico.ts             # Botes 19 L, sacos 50/25, densidades
│   │   │   ├── dosificaciones.ts     # 4 concretos + 5 morteros
│   │   │   ├── acero.ts              # Calibres #2 a #12
│   │   │   └── malla.ts              # Mallas electrosoldadas
│   │   ├── calculators/              # 10 funciones puras + tests
│   │   │   ├── concreto.ts / .test.ts
│   │   │   ├── piedra.ts / .test.ts
│   │   │   ├── castilloTrabe.ts / .test.ts
│   │   │   ├── losaAligerada.ts / .test.ts
│   │   │   ├── firme.ts / .test.ts
│   │   │   ├── pintura.ts / .test.ts
│   │   │   ├── muroBlock.ts / .test.ts
│   │   │   ├── repellado.ts / .test.ts
│   │   │   ├── loseta.ts / .test.ts
│   │   │   └── acero.ts / .test.ts
│   │   ├── manoObra.ts               # 16 conceptos default
│   │   └── types.ts
│   ├── store/                        # Zustand persist (AsyncStorage)
│   │   ├── storage.ts
│   │   ├── manoObraStore.ts
│   │   ├── preciosStore.ts           (v5)
│   │   └── proyectosStore.ts
│   ├── components/
│   │   ├── UI.tsx                    # Card, Button, NumberField, Row, Pill
│   │   └── GuardarEnProyectoButton.tsx
│   └── utils/
│       ├── formato.ts / .test.ts     # MXN, decimales
│       └── reportePDF.ts             # Generador de PDF profesional
├── app.json
├── tsconfig.json
├── vitest.config.ts
└── package.json
```

---

## ✅ Estado actual

- ✅ **81 tests** unitarios pasando (`npm test`).
- ✅ **TypeScript estricto** sin errores (`npx tsc --noEmit`).
- ✅ **10 calculadoras** completas con función pura + tests + pantalla.
- ✅ **Sistema de Proyectos** completo (crear, guardar cálculos, lista
       consolidada, eliminar).
- ✅ **Reporte PDF** profesional (móvil + Windows 11).
- ✅ **Mano de obra** y **precios** editables y persistentes.
- ✅ Funciona en Android, iOS, Web y como PWA en Windows 11.
- ✅ 100 % offline. Toda la información se guarda en el dispositivo.

## 🚧 Calculadoras que se pueden agregar después

Si más adelante quieres extender la app, el patrón está estandarizado:

- Cimentaciones (zapatas aisladas, corridas, ciclópeo)
- Impermeabilización (mortero o membrana, kg/m²)
- Yeso (aplanado de yeso por m²)
- Excavación / movimiento de tierras
- Escaleras (huellas + peraltes + acero)
- Tinacos / cisternas (volumen + área superficial)
- Plafones de tablaroca / yeso
- Instalaciones hidrosanitarias y eléctricas (longitudes, accesorios)

Cada una sigue el mismo patrón:
1. Función pura en `src/core/calculators/<nombre>.ts`
2. Tests en `<nombre>.test.ts`
3. Pantalla en `app/calc/<nombre>.tsx`
4. Botón `GuardarEnProyectoButton` al final
5. Registrar en `app/_layout.tsx` y `app/(tabs)/index.tsx`
