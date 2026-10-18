# Manual de Usuario — Fase Beta
## Aplicación Nacional de Almacenamiento de Datos
### Movimiento por la Paz y la Vida

---

## 1. Introducción y Objetivo de la Fase Beta

Este manual está diseñado para que el equipo directivo y evaluadores del **Movimiento por la Paz y la Vida** puedan validar de forma práctica todas las capacidades del sistema en su versión Beta:
- Validación de Identidad por Cédula (SAIME).
- Operación 100% Fuera de Línea (Offline) con persistencia local instantánea.
- Cola de sincronización y resolución de conflictos al reconectar a internet.
- Extracción de contenido de documentos Word (.docx), Excel (.xlsx) y PDF.
- Búsqueda y filtrado territorial por los 24 Estados de Venezuela.

---

## 2. Acceso Obligatorio, Registro y Validación de Identidad

### A. Pantalla de Inicio de Sesión Obligatoria:
Al abrir la aplicación, el sistema exige autenticación obligatoria antes de permitir el acceso al tablero y a los registros:
- Ingrese con su correo institucional o Cédula y su contraseña.
- **Credenciales predeterminadas para evaluación (Superadministrador):**
  - **Usuario:** `admin@pazvida.gob.ve`
  - **Contraseña:** `PazVida2026!`

### B. Registro de Nuevos Operadores y Código al Correo:
Si el operador no posee cuenta:
1. Haga clic en la pestaña **"Registrarse (Crear Cuenta)"**.
2. Ingrese su número de Cédula venezolana y presione **"Verificar SAIME"** para validar su identidad en el Registro Civil.
3. Ingrese sus nombres, apellidos, correo electrónico y contraseña.
4. Seleccione su rol (Superadministrador, Coordinador Estadal u Operador Municipal) y su estado asignado.
5. Al hacer clic en **"Registrar y Enviar Código al Correo"**, el sistema generará y despachará un código de seguridad de 6 dígitos (OTP) a su correo electrónico.
6. Ingrese el código de 6 dígitos en la pantalla de verificación para activar la cuenta e ingresar automáticamente al sistema.

### C. Bóveda Oculta y Seguridad Criptográfica:
- Los usuarios, correos y contraseñas se almacenan en una base de datos independiente (`mpv_secure_auth_vault_x89`).
- Las contraseñas se resguardan mediante **hashing criptográfico unidireccional SHA-256 con Salt aleatorio y Pepper**, garantizando que nunca se almacenen contraseñas en texto claro.

---

## 3. Demostración de Funcionamiento Offline (Sin Internet)

Para comprobar la arquitectura **Offline-First**:
1. En la barra superior de la aplicación, ubique el interruptor de red: **[Modo En Línea / Fuera de Línea]**.
2. Alterne a **"Modo Fuera de Línea"** (o desconecte su cable de red/Wi-Fi).
3. Diríjase a la sección **"Personas"** o **"Eventos"** y cree un nuevo registro:
   - Complete los datos solicitados (nombre, cédula, estado, actividad).
   - Presione **"Guardar Registro"**.
   - Note que el registro se almacena en **menos de 1 milisegundo**, sin demoras de red.
4. Observe el indicador de la **Cola de Sincronización**:
   - Aparecerá una insignia naranja con el conteo de cambios pendientes (ej. `1 cambio pendiente`).
5. Vuelva a activar el botón **"Modo En Línea"**:
   - La cola se procesará automáticamente.
   - El estado del registro cambiará de *"Pendiente de Sincronización"* a *"Sincronizado"*.

---

## 4. Carga y Procesamiento de Documentos (.docx, .xlsx, .pdf)

1. Ingrese a la pestaña **"Documentos"**.
2. Haga clic en **"Subir Documento"** o arrastre un archivo oficial (acta, informe, lista de asistencia).
3. El motor local (WASM) procesará el archivo en su propio dispositivo:
   - Se extraerán metadatos (tamaño, tipo, fecha de creación, huella SHA-256).
   - Se extraerá el texto completo para indexación inmediata.
4. Pruebe la **Búsqueda全文 Local**:
   - Escriba en la barra de búsqueda una palabra que esté dentro del documento cargado.
   - El sistema filtrará instantáneamente los documentos que contengan dicho término, incluso sin conexión a internet.

---

## 5. Visualización del Tablero Ejecutivo Nacional

1. Ingrese al **"Dashboard Nacional"**.
2. Explore las métricas en tiempo real:
   - Total de personas registradas a nivel nacional.
   - Total de eventos ejecutados por programa (Deporte, Cultura, Formación, Prevención).
   - Volumen de documentos almacenados y tasa de sincronización territorial.
3. Utilice el selector de **Estado** para filtrar y auditar las estadísticas de cada región del país.
