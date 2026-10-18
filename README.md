# Movimiento por la Paz y la Vida — Aplicación Nacional de Almacenamiento

Sistema de escritorio y multiplataforma **Offline-First** diseñado para el registro, consulta, auditoría y sincronización nacional de actividades sociocomunitarias, gestión de Grandes Bases de Paz (Gimnasios Verticales), asistencias, control de pagos y eventos en los 24 estados de la República Bolivariana de Venezuela.

---

## 🏛️ Características Principales

1. **Operación 100% Offline-First:**
   - La aplicación funciona plenamente sin conexión a internet.
   - Base de datos reactiva local con almacenamiento seguro y reloj lógico híbrido (HLC).
   - Cola de sincronización bidireccional automática con backend Supabase en cuanto se restablece la red.

2. **Validación de Identidad Ciudadana:**
   - Verificación de Cédula de Identidad en tiempo real contra registros públicos (ArmandoData / IVSS / SAIME).
   - Detección automática de nombres y apellidos oficiales.

3. **Gestión Integral de la Gran Base de Paz (GBP):**
   - **Gimnasio Vertical:** Control de pisos (Crossfit, Musculación, Spinning, Artes Marciales, Danza, Cancha).
   - **Sala de Spinning:** Diagrama interactivo de bicicletas en filas con asignación por turnos.
   - **Control de Asistencia:** Registro de entrada y salida en tiempo real con cálculo de horas y solvencia.
   - **Control de Pagos:** Registro de mensualidades, inscripciones, transferencias, Pago Móvil, divisas y emisión de recibos.
   - **Importación / Exportación Excel:** Integración con plantillas oficiales `.xlsx` procesadas 100% en el cliente.

4. **Bóveda de Seguridad Local (Auth Vault):**
   - Cifrado SHA-256 + Salt con Web Crypto API.
   - Despacho de códigos de verificación OTP por correo electrónico (integración SMTP en Electron).
   - Niveles de rol: `superadmin_nacional`, `coordinador_estadal`, `operador_municipal`.
   - Control de acceso territorial en cascada (Estado → Municipio → Parroquia).

---

## 📁 Estructura del Proyecto

```text
movimiento-paz-vida-app/
│
├── dist-electron/             # Binarios empaquetados para Windows (.exe)
│   ├── MovimientoPazVida 1.0.0-beta.exe          # Versión portable (sin instalación)
│   └── MovimientoPazVida Setup 1.0.0-beta.exe    # Instalador oficial de Windows
│
├── docs/                      # Documentación técnica y manuales
│   ├── ARQUITECTURA_TECNICA.md                   # Especificación técnica de la plataforma
│   ├── GUIA_DESPLIEGUE_VPS_VENEZUELA.md          # Despliegue en servidores y VPS nacionales
│   ├── MANUAL_DE_USUARIO_BETA.md                 # Guía paso a paso para operadores
│   ├── Plan_Arquitectura_Movimiento_Paz_Vida.docx# Documento Word oficial original
│   └── datos/                                    # Plantillas y datos oficiales
│       └── Base_de_Datos_Gimnasio_Paz_y_Vida.xlsx# Matriz Excel de control GBP
│
├── electron/                  # Proceso principal de Electron (Desktop)
│   └── main.cjs               # IPC Handlers: SAIME, SMTP Nodemailer, diálogos nativos
│
├── infra/                     # Infraestructura de servidores y backend
│   ├── docker-compose.yml     # Servicios contenerizados (PostgreSQL, MinIO, Nginx)
│   └── supabase_schema.sql    # Esquema SQL con Row Level Security (RLS)
│
├── public/                    # Recursos públicos e íconos institucionales
│   ├── icon.ico               # Ícono de Windows
│   └── icon.png               # Ícono en alta resolución
│
├── scripts/                   # Scripts auxiliares de entorno
│   └── iniciar-aplicacion.sh  # Lanzador para sistemas Linux / macOS
│
├── src/                       # Código fuente de la interfaz (React 18 + TypeScript)
│   ├── App.tsx                # Componente principal y enrutador de vistas
│   ├── index.css              # Sistema de estilos y diseño visual
│   ├── main.tsx               # Entrada de la aplicación React
│   ├── types.ts               # Definición de tipos de datos y modelos
│   ├── components/            # Módulos y vistas del sistema
│   │   ├── AsistenciaView.tsx # Control de asistencias diarias
│   │   ├── AuditView.tsx      # Trazabilidad y registro de auditoría
│   │   ├── AuthModal.tsx      # Modal de gestión de sesión y roles
│   │   ├── DashboardView.tsx  # Métricas, estadísticas y mapa territorial
│   │   ├── DesktopHeader.tsx  # Barra superior con estado de red y usuario
│   │   ├── DocumentosView.tsx # Gestor documental y lector Excel/PDF/Word
│   │   ├── EventosView.tsx    # Planificación de jornadas y actividades
│   │   ├── GimnasioView.tsx   # Control de la Gran Base de Paz (pisos y spinning)
│   │   ├── LoginScreen.tsx    # Pantalla de inicio de sesión y registro territorial
│   │   ├── PagosView.tsx      # Control financiero de aportes y mensualidades
│   │   ├── PersonasView.tsx   # Padrón sociocomunitario de ciudadanos
│   │   ├── SettingsModal.tsx  # Configuración de conexión y servidores SMTP
│   │   ├── Sidebar.tsx        # Menú lateral de navegación
│   │   └── SyncQueueView.tsx  # Cola de sincronización HLC con el servidor
│   ├── data/
│   │   └── venezuela.ts       # División político-territorial completa (24 estados)
│   └── services/
│       ├── authVault.ts       # Bóveda criptográfica y autenticación local
│       ├── documentParser.ts  # Extractor offline de texto para Office y PDF
│       ├── saime.ts           # Integración y consulta de Cédulas
│       └── storage.ts         # Motor de almacenamiento reactivo offline
│
├── index.html                 # Plantilla HTML base
├── package.json               # Dependencias y scripts de ejecución
├── tsconfig.json              # Configuración del compilador TypeScript
└── vite.config.ts             # Configuración de Vite y proxy de consultas
```

---

## 🚀 Cómo Iniciar la Aplicación

### Ejecutable Directo de Windows (.exe):
Ejecuta directamente el archivo binario empaquetado en:
- **Versión Portable:** `dist-electron/MovimientoPazVida 1.0.0-beta.exe`
- **Instalador Oficial:** `dist-electron/MovimientoPazVida Setup 1.0.0-beta.exe`

### En Modo Desarrollo (Código Fuente):
1. **Instalar dependencias:**
   ```bash
   npm install
   ```
2. **Ejecutar servidor web de desarrollo:**
   ```bash
   npm run dev
   ```
3. **Ejecutar en ventana de escritorio nativa:**
   ```bash
   npm run electron:dev
   ```

### Compilar Nuevos Ejecutables:
- **Para Windows (Instalador y Portable):**
  ```bash
  npm run dist:win
  ```
- **Para Linux (AppImage y binario empaquetado):**
  ```bash
  npm run dist:appimage
  ```

---

## ☁️ Integración y Sincronización con Supabase

El sistema cuenta con un motor de sincronización distribuida bidireccional conectado a **Supabase**:

- **Verificación de Servidor en Tiempo Real:** Monitoreo activo de la URL del servidor, estado de conexión (en línea/fuera de línea) y latencia en milisegundos (`ms`).
- **Botón de Sincronización Inteligente:** Ubicado en la barra superior (`DesktopHeader`), permite procesar la cola de cambios acumulados offline y despacharlos al servidor con un solo clic.
- **Notificaciones Toast Dinámicas:** Mensajes flotantes inmediatos que informan el resultado del lote sincronizado (registros enviados exitosamente, errores detectados y conflictos HLC).
- **Registro de Actividad Cronológica (por Hora):** Registro en vivo con estampas de tiempo (`HH:MM:SS`) de cada llamada a la API y cada registro transmitido.
- **Auditoría e Inspección de Datos:** Visualización en tabla y modal del payload JSON completo enviado a Supabase, con fecha/hora de creación y de sincronización efectiva.

### Configuración del Servidor Remoto (Supabase):
1. **Archivo `.env`:**
   ```env
   VITE_SUPABASE_URL=https://oxliwrrrmefuisuzdtpr.supabase.co
   VITE_SUPABASE_ANON_KEY=sb_publishable_XE6powc_BwOMu-vh3CY6tQ_OJq3m4Z5
   ```
2. **Crear Tablas en Supabase:**
   - Abre tu proyecto en Supabase → **SQL Editor**.
   - Abre y copia el contenido de [supabase_schema.sql](file:///c:/Users/Usuario/Documents/movimiento-paz-vida-doc/movimiento-paz-vida-doc/movimiento-paz-vida-doc/movimiento-paz-vida-app/infra/supabase_schema.sql).
   - Haz clic en **Run** para crear la tabla `registros`, `cola_sync`, `audit_log` y sus políticas de seguridad (RLS).

---

## 🔒 Primer Inicio y Credenciales

Al abrir la aplicación por primera vez:
1. La pantalla de bienvenida te permitirá **Registrar tu cuenta de Operador o Administrador**.
2. Al ingresar tu número de cédula (ejemplo: `V-18452391`), el sistema consultará automáticamente tu nombre oficial mediante la integración de identidad.
3. Asigna tu estado, municipio y parroquia de responsabilidad.
4. Define tu contraseña segura.
5. El sistema quedará listo para operar de manera local y sincronizable.

#   s i s t e m a - u n i f i c a d o  
 