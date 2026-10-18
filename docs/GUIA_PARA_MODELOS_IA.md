# 📖 GUÍA MAESTRA Y CONTEXTO DEL PROYECTO PARA MODELOS DE IA
> **Movimiento por la Paz y la Vida — Sistema de Gestión Integral**
> *Documento técnico obligatorio de referencia para cualquier agente o modelo de Inteligencia Artificial que lea, modifique, depure o extienda este repositorio.*

---

## 1. RESUMEN EJECUTIVO Y PROPÓSITO
Esta aplicación es un software de escritorio y web diseñado para la gestión comunitaria, deportiva y administrativa del **Movimiento por la Paz y la Vida** en Venezuela. Administra gimnasios, inventario, personal, donaciones, pagos en divisas/bolívares con tasa BCV, y verificación de identidad ciudadana.

- **Filosofía**: Offline-First (100% funcional sin internet en canchas/gimnasios, con sincronización automática en la nube cuando hay red).
- **Entorno**: Aplicación de escritorio compilada con Electron y empaquetada como instalador `.exe` para Windows, además de servir en navegadores modernos vía Vite.
- **Idioma del sistema**: Español venezolano formal en UI, código, logs y comentarios.

---

## 2. STACK TECNOLÓGICO Y DEPENDENCIAS REALES

Cualquier IA que trabaje aquí **DEBE** limitarse estrictamente a este stack:

| Componente | Tecnología | Versión / Detalle |
|---|---|---|
| **Frontend Core** | React + TypeScript | React 18.3.1, TypeScript 5.5.3 |
| **Empaquetador Web** | Vite | 5.4.2 |
| **Entorno Desktop** | Electron | 33.2.0 (**`electron/main.cjs` en CommonJS**) |
| **Iconografía** | Lucide React | `lucide-react` 0.344.0 |
| **Manejo de Archivos/Excel** | SheetJS (XLSX) | `xlsx` 0.18.5 |
| **Estilos** | CSS Puro / Vanilla CSS | Variables CSS en `src/index.css`. **NO USAR TAILWINDCSS** (sólo está instalada la utilidad `tailwind-merge`). |
| **Base de Datos Remota** | Supabase REST API | Peticiones HTTP directas con `fetch()`. **NO usar `@supabase/supabase-js`**. |
| **Almacenamiento Local** | `localStorage` | Serialización JSON con prefijo `mpv_*`. |
| **Generación de Builds** | Electron Builder | `electron-builder` 25.1.8 |

---

## 3. ARQUITECTURA DE ARCHIVOS Y CARPETAS

```text
movimiento-paz-vida-app/
├── docs/                     # Documentación técnica y guías
├── electron/
│   └── main.cjs              # Proceso principal de Electron (CommonJS) - Control de ventanas, IPC, licencias
├── infra/
│   └── supabase_schema.sql   # Esquema DDL de PostgreSQL para Supabase
├── public/                   # Recursos estáticos (logos, audios, favicon)
├── src/
│   ├── components/           # Componentes modulares de interfaz
│   │   ├── Attendance.tsx            # Registro y control de asistencia general
│   │   ├── BasketballCourt.tsx       # Gestión de canchas de baloncesto y torneos
│   │   ├── CommunityCouncil.tsx      # Gestión de Consejos Comunales
│   │   ├── ContactUs.tsx             # Pantalla de soporte y contacto
│   │   ├── Dashboard.tsx             # Panel principal con métricas y resúmenes
│   │   ├── Donations.tsx             # Control de donaciones recibidas/entregadas
│   │   ├── Gym.tsx                   # Gestión de gimnasio (pesas, rutinas, suscripciones)
│   │   ├── Inventory.tsx             # Inventario de equipamiento deportivo e insumos
│   │   ├── LandingPage.tsx           # Vista pública previa al inicio de sesión
│   │   ├── LicenseModal.tsx          # Modal de activación y estado de licencia
│   │   ├── LoginModal.tsx            # Modal de autenticación dual (online/offline)
│   │   ├── Nutrition.tsx             # Planes nutricionales y dietas
│   │   ├── Payments.tsx              # Control de caja, pagos en USD/VES y tasas BCV
│   │   ├── PhysicalAssessment.tsx    # Evaluaciones antropométricas de atletas
│   │   ├── Settings.tsx              # Configuración general y de sincronización
│   │   ├── Spinning.tsx              # Control de bicicletas, cupos y reservas de spinning
│   │   ├── Staff.tsx                 # Nómina y control de entrenadores y personal
│   │   ├── SyncModal.tsx             # Diagnóstico de sincronización con Supabase
│   │   └── Users.tsx                 # Directorio maestro de beneficiarios y atletas
│   ├── services/             # Lógica de negocio y persistencia
│   │   ├── authVault.ts      # Bóveda de autenticación dual (Supabase + SHA-256 local)
│   │   ├── licenseTrial.ts   # Control de período de prueba y activación de licencia
│   │   ├── saime.ts          # Cascada de verificación de identidad ciudadana (Cédula)
│   │   ├── storage.ts        # SERVICIO CENTRAL: CRUD local, sync queue, HLC, Excel
│   │   └── supabase.ts       # Cliente HTTP REST para Supabase (Fetch API puro)
│   ├── App.tsx               # Componente raíz: enrutamiento por pestañas (activeTab)
│   ├── index.css             # Design System completo en Vanilla CSS
│   ├── main.tsx              # Punto de entrada de React
│   └── types.ts              # Tipos e interfaces globales de TypeScript
├── package.json              # Scripts y dependencias
└── vite.config.ts            # Configuración de Vite y proxy local para SAIME
```

---

## 4. PATRONES DE ARQUITECTURA CRÍTICOS (CÓMO FUNCIONA EL SISTEMA)

### 4.1 Enrutamiento y Navegación
- **NO existe React Router**.
- La navegación se gestiona mediante el estado `activeTab` en [`src/App.tsx`](file:///c:/Users/Usuario/Documents/movimiento-paz-vida-doc/movimiento-paz-vida-doc/movimiento-paz-vida-doc/movimiento-paz-vida-app/src/App.tsx).
- Para navegar entre módulos desde cualquier componente hijo se despacha un `CustomEvent` global:
  ```typescript
  window.dispatchEvent(new CustomEvent('mpv:tab-change', { detail: { tab: 'gym' } }));
  ```
- No agregues librerías de enrutamiento ni intentes cambiar a `BrowserRouter` o `HashRouter`.

### 4.2 Persistencia Local y Claves de LocalStorage
El servicio [`src/services/storage.ts`](file:///c:/Users/Usuario/Documents/movimiento-paz-vida-doc/movimiento-paz-vida-doc/movimiento-paz-vida-doc/movimiento-paz-vida-app/src/services/storage.ts) centraliza la lectura y escritura. Las claves estándar son:
- `mpv_users`: Atletas y beneficiarios registrados.
- `mpv_attendance`: Marcajes de asistencia deportiva y general.
- `mpv_staff`: Entrenadores y personal administrativo.
- `mpv_inventory`: Bienes, máquinas e insumos deportivos.
- `mpv_donations`: Donaciones recibidas y asignadas.
- `mpv_payments`: Pagos, aranceles y transacciones.
- `mpv_assessments`: Evaluaciones físicas y médicas.
- `mpv_councils`: Datos de consejos comunales vinculados.
- `mpv_basketball_tournaments`: Torneos y partidos de baloncesto.
- `mpv_gym_users`, `mpv_gym_plans`, `mpv_gym_attendance`: Módulo de gimnasio.
- `mpv_spinning_bikes`, `mpv_spinning_reservations`: Módulo de spinning.
- `mpv_sync_queue`: Cola de mutaciones pendientes por subir a Supabase.
- `mpv_hlc_state`: Estado del reloj lógico híbrido para resolución de conflictos.

### 4.3 Sistema de Sincronización Nube (Supabase via REST API)
- **Cero SDK**: No se usa `@supabase/supabase-js`. [`src/services/supabase.ts`](file:///c:/Users/Usuario/Documents/movimiento-paz-vida-doc/movimiento-paz-vida-doc/movimiento-paz-vida-doc/movimiento-paz-vida-app/src/services/supabase.ts) efectúa peticiones `fetch()` directamente a los endpoints REST de Supabase (`/rest/v1/...`) con headers:
  - `apikey: SUPABASE_KEY`
  - `Authorization: Bearer SUPABASE_KEY`
  - `Prefer: return=representation, resolution=merge-duplicates`
- **Resolución de Conflictos HLC**: Se utiliza Hybrid Logical Clocks (`hlc_timestamp`) para garantizar que la última escritura gane (*Last-Write-Wins*) sin corromper datos desincronizados.
- **Cola Offline**: Cuando no hay conexión o la petición falla, la acción se inserta en `mpv_sync_queue`. El sincronizador la reintenta exponencialmente al recuperar conectividad.

### 4.4 Autenticación Dual (Online / Offline Vault)
[`src/services/authVault.ts`](file:///c:/Users/Usuario/Documents/movimiento-paz-vida-doc/movimiento-paz-vida-doc/movimiento-paz-vida-doc/movimiento-paz-vida-app/src/services/authVault.ts) implementa:
1. Intento primario: Autenticación en línea contra el endpoint REST de Supabase.
2. Si falla por falta de internet: Comprobación local mediante hash criptográfico **SHA-256** del PIN/contraseña almacenado en la bóveda local.
3. Permite a los instructores entrar al sistema en zonas rurales o galpones sin red.

### 4.5 Cascada de Verificación de Identidad (SAIME / CNE)
[`src/services/saime.ts`](file:///c:/Users/Usuario/Documents/movimiento-paz-vida-doc/movimiento-paz-vida-doc/movimiento-paz-vida-doc/movimiento-paz-vida-app/src/services/saime.ts) consulta la Cédula de Identidad en 6 niveles en cascada:
1. Cache local (`mpv_saime_cache`).
2. Proxy local de Vite / API de Electron (`/api/cedula/...`).
3. Endpoint del CNE público.
4. Servicios web auxiliares de verificación ciudadana.
5. Si ninguna fuente responde: **Retorna `null` o pide ingreso manual**.
> ⚠️ **PROHIBICIÓN ESTRICTA**: NUNCA inventar nombres, apellidos, fechas de nacimiento ni datos ficticios de ciudadanos venezolanos. Si el servicio no responde, el usuario debe escribir los datos manualmente.

### 4.6 Sistema de Licencia y Modo Prueba (Trial)
- [`src/services/licenseTrial.ts`](file:///c:/Users/Usuario/Documents/movimiento-paz-vida-doc/movimiento-paz-vida-doc/movimiento-paz-vida-doc/movimiento-paz-vida-app/src/services/licenseTrial.ts) y [`electron/main.cjs`](file:///c:/Users/Usuario/Documents/movimiento-paz-vida-doc/movimiento-paz-vida-doc/movimiento-paz-vida-doc/movimiento-paz-vida-app/electron/main.cjs) validan la vigencia.
- Dispone de protección anti-manipulación contra retraso del reloj del sistema (*clock tampering*).
- Claves maestras de desbloqueo administrativo: `pazyvida123` y `pazyvida-admin-master-2026`.
- En modo pruebas de desarrollo, el trial puede estar configurado temporalmente en 60 segundos. Respeta esta lógica y no elimines la validación sin instrucción explícita.

---

## 5. ERRORES FRECUENTES Y ALUCINACIONES QUE DEBES EVITAR ABSOLUTAMENTE

Cualquier modelo de IA que trabaje en este código debe abstenerse estrictamente de cometer los siguientes errores:

1. **NO instalar ni importar `react-router` o `react-router-dom`**: La aplicación usa pestañas con `activeTab` y eventos `mpv:tab-change`.
2. **NO instalar ni usar TailwindCSS ni `@apply`**: El proyecto usa CSS nativo en `src/index.css`. Agregar clases de Tailwind que no existen romperá el diseño visual.
3. **NO convertir `electron/main.cjs` a ESM (`import/export`)**: Electron en este setup requiere CommonJS (`require`, `module.exports`). Si cambias la extensión o la sintaxis, Electron no levantará.
4. **NO usar `@supabase/supabase-js`**: Rompe el diseño ligero del proyecto. Toda llamada va por `src/services/supabase.ts` con `fetch`.
5. **NO inventar personas, cédulas o respuestas de SAIME**: Las alucinaciones con nombres falsos dañan la base de datos de atletas reales.
6. **NO reemplazar `localStorage` con IndexedDB o SQLite a menos que sea pedido explícitamente**: El sistema de exportación/importación y respaldo en Excel depende de las estructuras de `localStorage`.
7. **NO borrar ni ignorar los campos de auditoría**: Todos los registros manejan `id`, `created_at`, `updated_at`, `is_synced` y `hlc_timestamp`. Omitirlos rompe la sincronización.
8. **NO cambiar las firmas de los métodos en `StorageService`**: Muchos componentes dependen de métodos estáticos como `StorageService.getUsers()`, `StorageService.saveUser()`, etc.
9. **NO agregar textos en inglés en la interfaz de usuario**: El software está destinado a personal deportivo y social venezolano. Los botones, modales y mensajes deben estar en perfecto español venezolano.
10. **NO dejar código roto sin compilar**: Siempre debes verificar que el proyecto compile con `npm run build` antes de dar una tarea por finalizada.

---

## 6. COMANDOS DE DESARROLLO Y COMPILACIÓN

Los comandos oficiales configurados en `package.json` son:

```powershell
# Instalar dependencias
npm install

# Iniciar servidor de desarrollo web (Vite)
npm run dev

# Compilar TypeScript y empaquetar bundle con Vite (OBLIGATORIO PARA COMPROBAR ERRORES)
npm run build

# Previsualizar el build web localmente
npm run preview

# Ejecutar aplicación de escritorio en modo desarrollo (Electron + Vite)
npm run electron:dev

# Compilar para escritorio y generar instalador ejecutable de Windows (.exe)
npm run electron:build
```

---

## 7. PROTOCOLO OBLIGATORIO DE PRUEBAS Y VALIDACIÓN PARA IA

Antes de confirmar cualquier cambio al usuario:

1. **Chequeo de Tipos y Compilación**:
   Ejecuta siempre:
   ```powershell
   npm run build
   ```
   Si Vite o `tsc` devuelven errores de tipo o sintaxis, corrígelos inmediatamente antes de responder.
2. **Integridad de Almacenamiento**:
   Si tocas un modelo en [`src/types.ts`](file:///c:/Users/Usuario/Documents/movimiento-paz-vida-doc/movimiento-paz-vida-doc/movimiento-paz-vida-doc/movimiento-paz-vida-app/src/types.ts), verifica que [`src/services/storage.ts`](file:///c:/Users/Usuario/Documents/movimiento-paz-vida-doc/movimiento-paz-vida-doc/movimiento-paz-vida-doc/movimiento-paz-vida-app/src/services/storage.ts) serialice y deserialice adecuadamente con soporte de valores por defecto retrocompatibles.
3. **Respeto a las Operaciones Offline**:
   Asegúrate de que cualquier nueva operación de guardado o actualización invoque `addToSyncQueue()` para que funcione sin internet y se sincronice después.

---
*Este documento es la fuente canónica de verdad arquitectónica del Movimiento por la Paz y la Vida.*
