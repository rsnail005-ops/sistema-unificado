<div align="center">

# 🏛️ Movimiento por la Paz y la Vida
### **Sistema Unificado de Almacenamiento y Gestión Nacional**

[![Versión](https://img.shields.io/badge/Versión-1.0.0--beta-blue?style=for-the-badge&logo=electron)](https://github.com/rsnail005-ops/sistema-unificado/releases)
[![Plataforma](https://img.shields.io/badge/Plataforma-Windows_Desktop-informational?style=for-the-badge&logo=windows)](https://github.com/rsnail005-ops/sistema-unificado)
[![Arquitectura](https://img.shields.io/badge/Arquitectura-Offline--First-success?style=for-the-badge)](https://github.com/rsnail005-ops/sistema-unificado)
[![Stack](https://img.shields.io/badge/Stack-React_18_+_Vite_+_TS-61DAFB?style=for-the-badge&logo=react)](https://github.com/rsnail005-ops/sistema-unificado)
[![Backend](https://img.shields.io/badge/Sync-Supabase_Cloud-3ECF8E?style=for-the-badge&logo=supabase)](https://supabase.com)

<p align="center">
  <b>Plataforma de escritorio para el registro, auditoría territorial, control de asistencias, gestión deportiva (GBP) y sincronización nacional en los 24 estados de Venezuela.</b>
</p>

---

</div>

## 📑 Tabla de Contenidos
- [Características Principales](#-características-principales)
- [Arquitectura Offline-First](#-arquitectura-offline-first)
- [Estructura del Proyecto](#-estructura-del-proyecto)
- [Instalación y Uso](#-instalación-y-uso)
  - [Descargar Ejecutable](#ejecutable-para-windows)
  - [Modo Desarrollo](#modo-desarrollo-desarrolladores)
- [Sistema de Actualizaciones Automáticas](#-sistema-de-actualizaciones-automáticas)
- [Matriz de Roles y Permisos](#-matriz-de-roles-y-permisos)
- [Configuración de Supabase](#-configuración-de-supabase)
- [Licencia e Información Institucional](#-información-institucional)

---

## 🌟 Características Principales

### 1. ⚡ Operación 100% Offline-First
* **Continuidad Total:** La aplicación nunca se detiene si se cae internet o la energía.
* **Base de Datos Reactiva Local:** Almacenamiento local ultrarrápido con persistencia en cliente y reloj lógico híbrido (**HLC**).
* **Cola de Sincronización Inteligente:** Registra cada cambio fuera de línea y los despacha ordenadamente a Supabase en cuanto detecta conectividad.

### 2. 🪪 Validación de Identidad Ciudadana
* **Verificación de Cédula:** Consulta en tiempo real con detección de formato oficial (`V-`, `E-`).
* **Autocompletado de Nombres:** Extracción inmediata de nombres y apellidos oficiales desde fuentes de registro civil (ArmandoData / IVSS / SAIME).

### 3. 🏋️ Gestión de la Gran Base de Paz (Gimnasio Vertical)
* **Control de Pisos y Áreas:** Crossfit, Musculación, Spinning, Artes Marciales, Danza y Cancha Multiuso.
* **Sala de Spinning Interactiva:** Mapa visual de bicicletas organizadas por filas con reserva y asignación por turno en vivo.
* **Control de Asistencia:** Registro ágil de entradas y salidas con cálculo automático de horas de permanencia y estado de solvencia.
* **Control Financiero:** Pagos de inscripciones, mensualidades, registro de transferencias, Pago Móvil, divisas en efectivo y cálculo de tasa oficial BCV.

### 4. 🔐 Bóveda Criptográfica y Seguridad
* **Auth Vault Local:** Cifrado seguro SHA-256 + Salt con Web Crypto API.
* **Despacho OTP:** Envío de códigos de verificación por correo electrónico mediante transporte SMTP integrado.
* **Jerarquía Territorial:** Control en cascada (Nacional → Estadal → Municipal → Parroquial).

### 5. 🚀 Sistema de Actualizaciones en Vivo
* **Detección Automática:** Verifica la versión en cada inicio y cada 30 minutos.
* **Modal Bloqueante:** Alerta visual de nueva versión obligatoria u opcional.
* **Descarga e Instalación Transparente:** Barra de progreso en vivo y reinicio automático para aplicar el nuevo instalador.

---

## 🔄 Arquitectura Offline-First

```
┌────────────────────────────────────────────────────────┐
│             MOVIMIENTO PAZ Y VIDA APP                  │
│                                                        │
│  ┌──────────────────┐          ┌───────────────────┐   │
│  │   UI (React 18)  │ ◄──────► │ Storage Reactivo  │   │
│  └─────────┬────────┘          └─────────┬─────────┘   │
│            │                             │             │
│            ▼                             ▼             │
│  ┌──────────────────┐          ┌───────────────────┐   │
│  │   Auth Vault     │          │  Cola Sync (HLC)  │   │
│  └──────────────────┘          └─────────┬─────────┘   │
└──────────────────────────────────────────┼─────────────┘
                                           │
                                 ¿Hay red? │
                                           ▼
                                 ┌───────────────────┐
                                 │   Supabase Cloud  │
                                 │  (PostgreSQL RLS) │
                                 └───────────────────┘
```

---

## 📁 Estructura del Proyecto

```text
movimiento-paz-vida-app/
├── docs/                      # Manuales de usuario y guías técnicas
│   ├── ARQUITECTURA_TECNICA.md
│   ├── GUIA_DESPLIEGUE_VPS_VENEZUELA.md
│   └── MANUAL_DE_USUARIO_BETA.md
├── electron/                  # Proceso nativo de escritorio
│   └── main.cjs               # IPC: descargas, instaladores, SMTP, diálogos
├── infra/                     # Base de datos y migraciones
│   ├── docker-compose.yml     # Servicios contenerizados
│   ├── supabase_schema.sql    # Esquema principal + RLS
│   └── migration_app_releases.sql # Tabla para auto-actualizaciones
├── public/                    # Recursos visuales e íconos
├── src/                       # Código fuente de la aplicación
│   ├── components/            # Vistas y componentes modulares
│   │   ├── AsistenciaView.tsx # Control de asistencias
│   │   ├── DashboardView.tsx  # Métricas territoriales
│   │   ├── DeveloperPanel.tsx # Panel de control de versiones
│   │   ├── GimnasioView.tsx   # Control de la Gran Base de Paz
│   │   ├── PagosView.tsx      # Gestión de pagos y divisas
│   │   ├── PersonasView.tsx   # Padrón sociocomunitario
│   │   ├── UpdateModal.tsx    # Modal de actualización interactivo
│   │   └── ...
│   ├── services/              # Lógica de negocio y APIs
│   │   ├── authVault.ts       # Criptografía local
│   │   ├── bcvService.ts      # Monitor de tasa oficial BCV
│   │   ├── storage.ts         # Motor offline-first
│   │   ├── supabase.ts        # Conexión con la nube
│   │   └── updateService.ts   # Motor de auto-actualizaciones
│   ├── types.ts               # Tipado estricto TypeScript
│   └── App.tsx                # Enrutador principal
├── package.json
└── vite.config.ts
```

---

## 💻 Instalación y Uso

### Ejecutable para Windows

Descarga la última versión empaquetada desde la sección de **[Releases](https://github.com/rsnail005-ops/sistema-unificado/releases)**:
* **Instalador:** `MPV-Setup-x.x.x.exe` (instala y crea acceso directo en el escritorio).
* **Portable:** `MPV-Portable-x.x.x.exe` (no requiere instalación, ideal para pendrives).

---

### Modo Desarrollo (Desarrolladores)

1. **Clonar el repositorio:**
   ```bash
   git clone https://github.com/rsnail005-ops/sistema-unificado.git
   cd sistema-unificado
   ```

2. **Instalar dependencias:**
   ```bash
   npm install
   ```

3. **Configurar variables de entorno (`.env`):**
   ```env
   VITE_SUPABASE_URL=https://oxliwrrrmefuisuzdtpr.supabase.co
   VITE_SUPABASE_ANON_KEY=sb_publishable_XE6powc_BwOMu-vh3CY6tQ_OJq3m4Z5
   ```

4. **Iniciar en modo web (navegador):**
   ```bash
   npm run dev
   ```

5. **Iniciar en modo escritorio nativo (Electron):**
   ```bash
   npm run electron:dev
   ```

6. **Compilar nuevos instaladores (.exe):**
   ```bash
   npm run build
   npx electron-builder --win
   ```

---

## 🔄 Sistema de Actualizaciones Automáticas

La aplicación cuenta con un flujo completo de entrega continua gestionado por el rol **Developer**:

```
Desarrollador                     Servidor Supabase                     Usuarios
     │                                    │                                 │
     ├─ Compila nueva versión             │                                 │
     ├─ Sube .exe a GitHub Releases       │                                 │
     ├─ Publica en Panel Dev ────────────►│ Guarda release                  │
     │                                    │                                 │
     │                                    │◄──── Polling cada 30 min ───────┤
     │                                    │      (o al abrir la app)        │
     │                                    │                                 │
     │                                    ├───── Detecta versión nueva ────►│
     │                                                                      │ Muestra UpdateModal
     │                                                                      │ Descarga .exe (%)
     │                                                                      │ Cierra y ejecuta instalador ✓
```

---

## 👥 Matriz de Roles y Permisos

| Rol | Alcance Territorial | Funciones Principales |
|---|---|---|
| 👑 `superadmin_nacional` | Nacional (24 Estados) | Gestión total de usuarios, auditoría nacional, configuración de servidores. |
| 💻 `developer` | Sistema Completo | Publicación de releases, monitoreo de versiones, depuración técnica. |
| 🏛️ `coordinador_estadal` | Todo el Estado asignado | Consulta y supervisión de municipios, reportes y métricas regionales. |
| 🏢 `coordinador_municipal`| Todo el Municipio asignado | Planificación de eventos, revisión de Grandes Bases de Paz locales. |
| 📋 `operador_base` | Gran Base de Paz / Parroquia | Registro de ciudadanos, control de asistencias, pagos y spinning. |

---

## ☁️ Configuración de Supabase

Para inicializar la base de datos remota con las políticas de seguridad (RLS):

1. Ingresa a tu proyecto en [Supabase Console](https://supabase.com).
2. Ve al módulo **SQL Editor**.
3. Ejecuta en orden:
   - `infra/supabase_schema.sql` *(tablas principales, auditoría y seguridad RLS)*.
   - `infra/migration_app_releases.sql` *(tabla de control para actualizaciones automáticas)*.

---

## 📜 Información Institucional

Desarrollado para el **Movimiento por la Paz y la Vida** — República Bolivariana de Venezuela.  
Diseñado para la masificación deportiva, cultural y sociocomunitaria en las **Grandes Bases de Paz**.