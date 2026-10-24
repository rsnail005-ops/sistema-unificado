const { app, BrowserWindow, ipcMain, dialog, Menu } = require('electron');
const path = require('path');
const fs = require('fs');

Menu.setApplicationMenu(null);

let mainWindow = null;

function createWindow() {
  const iconPath = fs.existsSync(path.join(__dirname, '../public/icon.ico'))
    ? path.join(__dirname, '../public/icon.ico')
    : path.join(__dirname, '../dist/icon.ico');

  mainWindow = new BrowserWindow({
    width: 1320,
    height: 860,
    minWidth: 1080,
    title: `Sistema Unificado de Usuarios GNP v${app.getVersion()}`,
    backgroundColor: '#0a0f1d',
    icon: iconPath,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      webSecurity: false
    },
    autoHideMenuBar: true
  });

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
    mainWindow.focus();
    mainWindow.webContents.focus();
  });

  const isDev = process.argv.includes('--dev');

  if (isDev) {
    mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(() => {
  createWindow();

  if (app.isPackaged) {
    crearAccesoDirectoEscritorio();
  }

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

/**
 * Crea o actualiza el acceso directo en el Escritorio (soporta estándar y OneDrive)
 */
function crearAccesoDirectoEscritorio(customExePath) {
  if (process.platform !== 'win32') return;
  try {
    const { spawn } = require('child_process');
    const targetExe = customExePath || process.env.PORTABLE_EXECUTABLE_FILE || process.execPath;
    if (!targetExe || !fs.existsSync(targetExe)) return;
    const targetDir = path.dirname(targetExe);

    const psCommand = `
      $targetExe = "${targetExe.replace(/\\/g, '\\\\').replace(/"/g, '`"')}"
      $targetDir = "${targetDir.replace(/\\/g, '\\\\').replace(/"/g, '`"')}"
      $desktopDirs = @(
        [Environment]::GetFolderPath('Desktop'),
        "$env:USERPROFILE\\OneDrive\\Desktop",
        "$env:USERPROFILE\\OneDrive\\Escritorio",
        "$env:USERPROFILE\\Escritorio"
      ) | Where-Object { $_ -and (Test-Path $_) } | Select-Object -Unique

      foreach ($d in $desktopDirs) {
        try {
          $old = Join-Path $d "Movimiento Paz y Vida.lnk"
          if (Test-Path $old) { Remove-Item $old -Force -ErrorAction SilentlyContinue }
          $lnk = Join-Path $d "Sistema Unificado de Usuarios GNP.lnk"
          $wsh = New-Object -ComObject WScript.Shell
          $s = $wsh.CreateShortcut($lnk)
          $s.TargetPath = $targetExe
          $s.WorkingDirectory = $targetDir
          $s.IconLocation = "$targetExe,0"
          $s.Description = "Sistema Unificado de Usuarios GNP"
          $s.Save()
        } catch {}
      }
    `;

    const child = spawn('powershell.exe', [
      '-NoProfile',
      '-NonInteractive',
      '-WindowStyle', 'Hidden',
      '-Command', psCommand
    ], {
      detached: true,
      stdio: 'ignore',
      windowsHide: true
    });
    child.unref();
  } catch (e) {
    console.error('No se pudo crear acceso directo:', e);
  }
}

// IPC Handler para Diálogo de Archivos
ipcMain.handle('dialog:openFile', async (event, options) => {
  const result = await dialog.showOpenDialog(mainWindow, options || {
    properties: ['openFile'],
    filters: [
      { name: 'Documentos Oficiales', extensions: ['docx', 'pdf', 'xlsx', 'xls', 'doc'] },
      { name: 'Todos los Archivos', extensions: ['*'] }
    ]
  });
  if (!result.canceled && result.filePaths.length > 0) {
    const filePath = result.filePaths[0];
    const buffer = fs.readFileSync(filePath);
    return {
      filePath,
      fileName: path.basename(filePath),
      size: fs.statSync(filePath).size,
      buffer: Array.from(buffer)
    };
  }
  return null;
});

// =============================================================================
// IPC Handler para Consulta de Cédula en Línea (ArmandoData / CNE / IVSS)
// =============================================================================
ipcMain.handle('saime:consultarCedulaReal', async (event, cedulaRaw) => {
  const https = require('https');
  const http = require('http');

  const clean = String(cedulaRaw).toUpperCase().replace(/[^VE0-9]/g, '');
  const prefix = clean.startsWith('E') ? 'E' : 'V';
  const numOnly = clean.replace(/[^0-9]/g, '');
  const cedulaFormato = prefix + numOnly;

  // Función helper: parsear nombre venezolano
  function parsearPartes(rawName, apellidosPrimero) {
    const parts = rawName.trim().split(/\s+/).map(function(p) {
      return p.charAt(0).toUpperCase() + p.slice(1).toLowerCase();
    });
    var nombres = '', apellidos = '';
    if (apellidosPrimero) {
      if (parts.length >= 4) { apellidos = parts.slice(0, 2).join(' '); nombres = parts.slice(2).join(' '); }
      else if (parts.length === 3) { apellidos = parts[0]; nombres = parts.slice(1).join(' '); }
      else if (parts.length === 2) { apellidos = parts[0]; nombres = parts[1]; }
      else { nombres = rawName.trim(); }
    } else {
      if (parts.length >= 4) { nombres = parts.slice(0, 2).join(' '); apellidos = parts.slice(2).join(' '); }
      else if (parts.length === 3) { nombres = parts[0]; apellidos = parts.slice(1).join(' '); }
      else if (parts.length === 2) { nombres = parts[0]; apellidos = parts[1]; }
      else { nombres = rawName.trim(); }
    }
    return { nombres: nombres, apellidos: apellidos };
  }

  function decodeHtml(str) {
    if (!str) return '';
    return str
      .replace(/&#xD1;/gi, 'Ñ')
      .replace(/&#xF1;/gi, 'ñ')
      .replace(/&#209;/g, 'Ñ')
      .replace(/&#241;/g, 'ñ')
      .replace(/&ntilde;/gi, 'ñ')
      .replace(/&Ntilde;/g, 'Ñ')
      .replace(/&#xE1;/gi, 'á')
      .replace(/&#xE9;/gi, 'é')
      .replace(/&#xED;/gi, 'í')
      .replace(/&#xF3;/gi, 'ó')
      .replace(/&#xFA;/gi, 'ú')
      .replace(/&#xC1;/gi, 'Á')
      .replace(/&#xC9;/gi, 'É')
      .replace(/&#xCD;/gi, 'Í')
      .replace(/&#xD3;/gi, 'Ó')
      .replace(/&#xDA;/gi, 'Ú')
      .replace(/&#(\d+);/g, function(m, dec) { return String.fromCharCode(dec); })
      .replace(/&#x([0-9a-f]+);/gi, function(m, hex) { return String.fromCharCode(parseInt(hex, 16)); })
      .replace(/&amp;/g, '&')
      .trim();
  }

  // ============================================================
  // FUENTE 1: ArmandoData — Confirmado hasta cédulas 28M+
  // ============================================================
  var armandoResult = await new Promise(function(resolve) {
    var url = 'https://armandodata.com/Personas/Detalles?cedula=' + cedulaFormato;
    var req = https.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36'
      },
      timeout: 10000
    }, function(res) {
      var data = '';
      res.on('data', function(chunk) { data += chunk; });
      res.on('end', function() {
        var rawName = '';

        // Método A: <p class="info-card-text display-6">NOMBRE</p>
        var matchA = data.match(/<p class="info-card-text display-6">([^<]+)<\/p>/);
        if (matchA && matchA[1] && matchA[1].trim().length > 3) {
          rawName = decodeHtml(matchA[1]);
        }

        // Método B: <title>Detalle de Persona: NOMBRE CI :VXXXXXXXX - ArmandoData</title>
        if (!rawName) {
          var matchB = data.match(/<title>Detalle de Persona:\s*([^<]+?)\s+CI\s*:/i);
          if (matchB && matchB[1] && matchB[1].trim().length > 3) {
            rawName = decodeHtml(matchB[1]);
          }
        }

        if (!rawName) return resolve(null);

        var parsed = parsearPartes(rawName, false);

        // Fecha de nacimiento: <p class="info-card-text">DD-MM-YYYY (edad)</p>
        var fechaNac = '';
        var matchFecha = data.match(/<p class="info-card-text">(\d{2}-\d{2}-\d{4})\s*\(/);
        if (matchFecha) {
          var dParts = matchFecha[1].split('-');
          fechaNac = dParts[2] + '-' + dParts[1] + '-' + dParts[0];
        }

        resolve({
          exito: true,
          cedula: prefix + '-' + numOnly,
          nombres: parsed.nombres,
          apellidos: parsed.apellidos,
          fecha_nacimiento: fechaNac || '1990-01-01',
          genero: 'Masculino',
          estado_civil: 'Soltero(a)',
          estado_nacimiento: 'Venezuela',
          fuente: 'ArmandoData'
        });
      });
    });
    req.on('error', function() { resolve(null); });
    req.on('timeout', function() { req.destroy(); resolve(null); });
  });

  if (armandoResult) return armandoResult;

  // ============================================================
  // FUENTE 2: CNE Electoral
  // ============================================================
  var cneResult = await new Promise(function(resolve) {
    var url = 'http://www.cne.gob.ve/web/registro_electoral/ce.php?nacs=' + prefix + '&ced=' + numOnly;
    var req = http.get(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' },
      timeout: 7000
    }, function(res) {
      var data = '';
      res.on('data', function(chunk) { data += chunk; });
      res.on('end', function() {
        var m = data.match(/<b>([A-Z\u00C1\u00C9\u00CD\u00D3\u00DA\u00D1][A-Z\u00C1\u00C9\u00CD\u00D3\u00DA\u00D1\s]{5,})<\/b>/i);
        if (!m) m = data.match(/class="[^"]*negrita[^"]*"[^>]*>([A-Z\u00C1\u00C9\u00CD\u00D3\u00DA\u00D1][A-Z\u00C1\u00C9\u00CD\u00D3\u00DA\u00D1\s]{5,})</i);
        if (m && m[1] && m[1].trim().length > 5) {
          var parsed = parsearPartes(m[1].trim(), true);
          return resolve({
            exito: true, cedula: prefix + '-' + numOnly,
            nombres: parsed.nombres, apellidos: parsed.apellidos,
            fecha_nacimiento: '1990-01-01', genero: 'Masculino',
            estado_civil: 'Soltero(a)', estado_nacimiento: 'Venezuela',
            fuente: 'CNE Electoral'
          });
        }
        resolve(null);
      });
    });
    req.on('error', function() { resolve(null); });
    req.on('timeout', function() { req.destroy(); resolve(null); });
  });

  if (cneResult) return cneResult;

  // ============================================================
  // FUENTE 3: IVSS — pensionados y trabajadores afiliados
  // ============================================================
  var ivssResult = await new Promise(function(resolve) {
    var url = 'http://www.ivss.gob.ve:28080/Pensionado/PensionadoCTRL?boton=Consultar&nacionalidad=' + prefix + '&cedula=' + numOnly;
    var req = http.get(url, {
      headers: { 'User-Agent': 'Mozilla/5.0' },
      timeout: 6000
    }, function(res) {
      var data = '';
      res.setEncoding('latin1');
      res.on('data', function(chunk) { data += chunk; });
      res.on('end', function() {
        var m = data.match(/Apellido y nombre:.*?<td[^>]*>(.*?)<\/td>/s);
        if (m && m[1] && m[1].trim()) {
          var rawName = m[1].replace(/<[^>]+>/g, '').trim();
          var parsed = parsearPartes(rawName, true);
          return resolve({
            exito: true, cedula: prefix + '-' + numOnly,
            nombres: parsed.nombres, apellidos: parsed.apellidos,
            fecha_nacimiento: '1965-01-01', genero: 'Masculino',
            estado_civil: 'Casado(a)', estado_nacimiento: 'Venezuela',
            fuente: 'IVSS'
          });
        }
        resolve(null);
      });
    });
    req.on('error', function() { resolve(null); });
    req.on('timeout', function() { req.destroy(); resolve(null); });
  });

  if (ivssResult) return ivssResult;

  return {
    exito: false,
    mensaje: 'Cédula no encontrada en los registros públicos en línea. Puede ingresar sus datos manualmente.'
  };
});

// =============================================================================
// IPC Handlers para Actualización Automática de la Aplicación
// =============================================================================

/**
 * update:download
 *   Descarga el instalador desde una URL remota (GitHub Releases) y guarda el
 *   .exe en la carpeta temporal del usuario. Emite eventos `update:progress`
 *   con el porcentaje de descarga para la barra de progreso en el frontend.
 */
ipcMain.handle('update:download', async (event, { downloadUrl }) => {
  const https = require('https');
  const http = require('http');
  const os = require('os');

  const tmpDir = os.tmpdir();
  const fileName = 'mpv-update-installer.exe';
  const destPath = path.join(tmpDir, fileName);

  return new Promise((resolve) => {
    const protocol = downloadUrl.startsWith('https') ? https : http;

    const doDownload = (url) => {
      const req = protocol.get(url, { timeout: 120000 }, (res) => {
        // Seguir redireccionamientos (GitHub Releases usa 302)
        if (res.statusCode === 301 || res.statusCode === 302 || res.statusCode === 307 || res.statusCode === 308) {
          const location = res.headers.location;
          if (location) {
            const newProtocol = location.startsWith('https') ? https : http;
            doDownload(location, newProtocol);
          } else {
            resolve({ ok: false, error: 'Redireccionamiento sin Location header.' });
          }
          return;
        }

        if (res.statusCode !== 200) {
          resolve({ ok: false, error: `HTTP ${res.statusCode} al descargar.` });
          return;
        }

        const totalBytes = parseInt(res.headers['content-length'] || '0', 10);
        let receivedBytes = 0;
        const writer = fs.createWriteStream(destPath);

        res.on('data', (chunk) => {
          receivedBytes += chunk.length;
          if (totalBytes > 0) {
            const pct = Math.round((receivedBytes / totalBytes) * 100);
            // Enviar progreso al renderer
            if (mainWindow && !mainWindow.isDestroyed()) {
              mainWindow.webContents.send('update:progress', pct);
            }
          }
        });

        res.pipe(writer);

        writer.on('finish', () => {
          resolve({ ok: true, path: destPath });
        });

        writer.on('error', (err) => {
          resolve({ ok: false, error: err.message });
        });
      });

      req.on('error', (err) => {
        resolve({ ok: false, error: err.message });
      });
      req.on('timeout', () => {
        req.destroy();
        resolve({ ok: false, error: 'Tiempo de espera agotado durante la descarga.' });
      });
    };

    doDownload(downloadUrl);
  });
});

/**
 * app:setVersion
 *   Actualiza dinámicamente el título de la ventana de la aplicación cuando
 *   cambia la versión instalada o se detecta una actualización.
 */
ipcMain.handle('app:setVersion', (event, { version }) => {
  if (mainWindow && !mainWindow.isDestroyed() && version) {
    const clean = String(version).replace(/^v/, '').trim();
    mainWindow.setTitle(`Sistema Unificado de Usuarios GNP v${clean}`);
  }
  return { ok: true };
});

ipcMain.handle('app:getVersion', () => {
  return app.getVersion();
});

/**
 * update:launch
 *   Reemplaza el ejecutable actual con la nueva versión descargada,
 *   elimina el ejecutable de la versión anterior, renombra el nuevo archivo
 *   con el nombre y número de versión reciente, actualiza los accesos directos
 *   y reinicia automáticamente la aplicación.
 */
ipcMain.handle('update:launch', async (event, { installerPath, newVersion }) => {
  const { spawn } = require('child_process');
  const fs = require('fs');
  const path = require('path');
  const os = require('os');
  const { shell } = require('electron');

  try {
    if (!installerPath || !fs.existsSync(installerPath)) {
      return { ok: false, error: 'El archivo descargado no existe en el disco.' };
    }

    const cleanVersion = newVersion ? String(newVersion).replace(/^v/, '').trim() : '';
    const isSetupInstaller = installerPath.toLowerCase().includes('setup');

    // 1. Si es un instalador formal NSIS (Setup.exe)
    if (isSetupInstaller) {
      const targetExe = process.env.PORTABLE_EXECUTABLE_FILE || process.execPath;
      if (app.isPackaged && targetExe && fs.existsSync(targetExe)) {
        const updaterPsPath = path.join(os.tmpdir(), `mpv-setup-runner-${Date.now()}.ps1`);
        const psContent = `
$pidToWait = ${process.pid}
$oldExe = "${targetExe.replace(/\\/g, '\\\\').replace(/"/g, '`"')}"
$setupExe = "${installerPath.replace(/\\/g, '\\\\').replace(/"/g, '`"')}"

try {
  $proc = Get-Process -Id $pidToWait -ErrorAction SilentlyContinue
  if ($proc) { $proc.WaitForExit(15000) }
} catch {}
Start-Sleep -Seconds 1

Start-Process -FilePath $setupExe
Start-Sleep -Seconds 4
if (Test-Path $oldExe) { Remove-Item -Path $oldExe -Force -ErrorAction SilentlyContinue }
Remove-Item -Path $MyInvocation.MyCommand.Path -Force -ErrorAction SilentlyContinue
`;
        fs.writeFileSync(updaterPsPath, psContent, { encoding: 'utf8' });
        const child = spawn('powershell.exe', [
          '-NoProfile',
          '-NonInteractive',
          '-WindowStyle', 'Hidden',
          '-ExecutionPolicy', 'Bypass',
          '-File', updaterPsPath
        ], {
          detached: true,
          stdio: 'ignore',
          windowsHide: true
        });
        child.unref();
        setTimeout(() => app.exit(0), 400);
        return { ok: true };
      }

      await shell.openPath(installerPath);
      setTimeout(() => app.quit(), 1500);
      return { ok: true };
    }

    // 2. Si estamos en modo desarrollo (no empaquetado)
    if (!app.isPackaged) {
      await shell.openPath(installerPath);
      setTimeout(() => app.quit(), 1500);
      return { ok: true };
    }

    // 3. Auto-reemplazo en caliente de ejecutable portable / standalone
    // PORTABLE_EXECUTABLE_FILE contiene la ruta del .exe que el usuario ejecutó originalmente
    const targetExe = process.env.PORTABLE_EXECUTABLE_FILE || process.execPath;
    const targetDir = path.dirname(targetExe);
    const currentPid = process.pid;

    // Calcular el nuevo nombre del ejecutable con la versión reciente: "MovimientoPazVida {version}.exe"
    let newExeName = '';
    if (cleanVersion) {
      newExeName = `MovimientoPazVida ${cleanVersion}.exe`;
    } else {
      const downloadedBase = path.basename(installerPath);
      newExeName = downloadedBase.startsWith('mpv-update') ? path.basename(targetExe) : downloadedBase;
    }

    const finalExePath = path.join(targetDir, newExeName);
    const updaterPsPath = path.join(os.tmpdir(), `mpv-update-runner-${Date.now()}.ps1`);

    // Script PowerShell 100% silencioso y nativo:
    // a) Espera a que el proceso actual muera limpiamente mediante WaitForExit
    // b) Copia el nuevo ejecutable con el nuevo nombre
    // c) Elimina la versión anterior
    // d) Actualiza el acceso directo en el Escritorio
    // e) Inicia el nuevo ejecutable sin ninguna consola visible
    // f) Limpia temporales
    const psContent = `
$pidToWait = ${currentPid}
$newExe = "${installerPath.replace(/\\/g, '\\\\').replace(/"/g, '`"')}"
$finalExe = "${finalExePath.replace(/\\/g, '\\\\').replace(/"/g, '`"')}"
$targetExe = "${targetExe.replace(/\\/g, '\\\\').replace(/"/g, '`"')}"
$targetDir = "${targetDir.replace(/\\/g, '\\\\').replace(/"/g, '`"')}"

try {
  $proc = Get-Process -Id $pidToWait -ErrorAction SilentlyContinue
  if ($proc) { $proc.WaitForExit(15000) }
} catch {}
Start-Sleep -Seconds 1

$copied = $false
for ($i = 0; $i -lt 30; $i++) {
  try {
    Copy-Item -Path $newExe -Destination $finalExe -Force -ErrorAction Stop
    $copied = $true
    break
  } catch {
    Start-Sleep -Milliseconds 600
  }
}

if ($targetExe -ne $finalExe -and (Test-Path $targetExe)) {
  Remove-Item -Path $targetExe -Force -ErrorAction SilentlyContinue
}

Get-ChildItem -Path $targetDir -Filter "MovimientoPazVida*.exe" -ErrorAction SilentlyContinue | ForEach-Object {
  if ($_.FullName -ne $finalExe) {
    Remove-Item -Path $_.FullName -Force -ErrorAction SilentlyContinue
  }
}

try {
  $desktopDirs = @(
    [Environment]::GetFolderPath('Desktop'),
    "$env:USERPROFILE\\OneDrive\\Desktop",
    "$env:USERPROFILE\\OneDrive\\Escritorio",
    "$env:USERPROFILE\\Escritorio"
  ) | Where-Object { $_ -and (Test-Path $_) } | Select-Object -Unique

  foreach ($d in $desktopDirs) {
    try {
      $old = Join-Path $d "Movimiento Paz y Vida.lnk"
      if (Test-Path $old) { Remove-Item $old -Force -ErrorAction SilentlyContinue }
      $lnk = Join-Path $d "Sistema Unificado de Usuarios GNP.lnk"
      $wsh = New-Object -ComObject WScript.Shell
      $s = $wsh.CreateShortcut($lnk)
      $s.TargetPath = $finalExe
      $s.WorkingDirectory = $targetDir
      $s.IconLocation = "$finalExe,0"
      $s.Description = "Sistema Unificado de Usuarios GNP"
      $s.Save()
    } catch {}
  }
} catch {}

if (Test-Path $finalExe) {
  Start-Process -FilePath $finalExe
}

Start-Sleep -Seconds 3
if (Test-Path $newExe) { Remove-Item -Path $newExe -Force -ErrorAction SilentlyContinue }
Remove-Item -Path $MyInvocation.MyCommand.Path -Force -ErrorAction SilentlyContinue
`;

    fs.writeFileSync(updaterPsPath, psContent, { encoding: 'utf8' });

    // Lanzar script PowerShell completamente desacoplado y sin ventana
    const child = spawn('powershell.exe', [
      '-NoProfile',
      '-NonInteractive',
      '-WindowStyle', 'Hidden',
      '-ExecutionPolicy', 'Bypass',
      '-File', updaterPsPath
    ], {
      detached: true,
      stdio: 'ignore',
      windowsHide: true
    });
    child.unref();

    // Salir inmediatamente para liberar el archivo .exe y permitir el sobreescrito
    setTimeout(() => {
      app.exit(0);
    }, 400);

    return { ok: true };
  } catch (err) {
    console.error('Error al ejecutar reemplazo de actualización:', err);
    return { ok: false, error: err.message };
  }
});

/**
 * updater:detectLatestExe
 *   Detecta automáticamente el instalador .exe más reciente generado en dist-electron/
 */
ipcMain.handle('updater:detectLatestExe', async (event, params = {}) => {
  // Si se envió un archivo específico que existe, usarlo directamente
  if (params.preferredPath && fs.existsSync(params.preferredPath)) {
    try {
      const stats = fs.statSync(params.preferredPath);
      if (stats.isFile() && params.preferredPath.endsWith('.exe')) {
        return {
          found: true,
          fileName: path.basename(params.preferredPath),
          filePath: params.preferredPath,
          sizeBytes: stats.size,
          sizeMB: (stats.size / (1024 * 1024)).toFixed(1),
          mtime: stats.mtime
        };
      }
    } catch { /* noop */ }
  }

  const candidateDirs = [
    // Si viene una carpeta preferida
    params.preferredPath ? (fs.existsSync(params.preferredPath) ? (fs.statSync(params.preferredPath).isDirectory() ? params.preferredPath : path.dirname(params.preferredPath)) : null) : null,
    // 1. Ruta absoluta en Documents del usuario
    path.join(app.getPath('documents'), 'movimiento-paz-vida-doc/movimiento-paz-vida-doc/movimiento-paz-vida-doc/movimiento-paz-vida-app/dist-electron'),
    path.join(app.getPath('documents'), 'movimiento-paz-vida-app/dist-electron'),
    // 2. Rutas relativas para modo desarrollo y carpetas padre
    path.join(__dirname, '../dist-electron'),
    path.join(__dirname, '../../dist-electron'),
    path.join(__dirname, '../../../dist-electron'),
    path.join(process.cwd(), 'dist-electron'),
    path.join(process.cwd(), '../dist-electron'),
    path.join(app.getAppPath(), '../dist-electron'),
    path.join(app.getAppPath(), '../../dist-electron'),
  ].filter(Boolean);

  for (const dir of candidateDirs) {
    if (fs.existsSync(dir)) {
      try {
        const files = fs.readdirSync(dir)
          .filter(f => f.endsWith('.exe'))
          .map(f => {
            const p = path.join(dir, f);
            const stats = fs.statSync(p);
            return {
              fileName: f,
              filePath: p,
              sizeBytes: stats.size,
              sizeMB: (stats.size / (1024 * 1024)).toFixed(1),
              mtime: stats.mtime
            };
          })
          .sort((a, b) => {
            // Priorizar instaladores con "Setup" en el nombre, luego por fecha más reciente
            const aSetup = a.fileName.toLowerCase().includes('setup') ? 1 : 0;
            const bSetup = b.fileName.toLowerCase().includes('setup') ? 1 : 0;
            if (aSetup !== bSetup) return bSetup - aSetup;
            return b.mtime - a.mtime;
          });

        if (files.length > 0) {
          return { found: true, ...files[0] };
        }
      } catch (err) {
        console.error('Error al detectar .exe en candidate dir:', dir, err);
      }
    }
  }

  return { found: false };
});

/**
 * updater:selectExe
 *   Abre el explorador de Windows para que el desarrollador elija manualmente un .exe
 */
ipcMain.handle('updater:selectExe', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    title: 'Seleccionar Instalador .exe para Publicar',
    properties: ['openFile'],
    filters: [
      { name: 'Instalador Ejecutable de Windows (*.exe)', extensions: ['exe'] }
    ]
  });

  if (!result.canceled && result.filePaths.length > 0) {
    const filePath = result.filePaths[0];
    const stats = fs.statSync(filePath);
    return {
      found: true,
      filePath,
      fileName: path.basename(filePath),
      sizeBytes: stats.size,
      sizeMB: (stats.size / (1024 * 1024)).toFixed(1),
      mtime: stats.mtime
    };
  }

  return { found: false };
});

/**
 * updater:publishToGitHub
 *   Crea el Release en GitHub con la API REST y sube el archivo binario .exe con
 *   seguimiento de porcentaje y progreso en tiempo real.
 */
ipcMain.handle('updater:publishToGitHub', async (event, params) => {
  const https = require('https');
  const {
    token,
    owner = 'rsnail005-ops',
    repo = 'sistema-unificado',
    tag: rawTag,
    title,
    notes = '',
    filePath
  } = params;

  if (!token) return { ok: false, error: 'Token de GitHub no proporcionado.' };
  if (!filePath || !fs.existsSync(filePath)) {
    return { ok: false, error: `El archivo ejecutable no existe en la ruta: ${filePath}` };
  }

  const tag = rawTag.startsWith('v') ? rawTag : `v${rawTag}`;
  const fileName = path.basename(filePath);
  const fileStats = fs.statSync(filePath);
  const totalBytes = fileStats.size;

  const notifyProgress = (phase, percent, message, extra = {}) => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('updater:uploadProgress', {
        phase,
        percent,
        message,
        totalBytes,
        fileName,
        ...extra
      });
    }
  };

  // 1. Helper para peticiones GitHub REST API
  const githubApiRequest = (options, postData) => {
    return new Promise((resolve, reject) => {
      const defaultHeaders = {
        'User-Agent': 'MovimientoPazVida-Desktop-App',
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28'
      };

      const reqOptions = {
        ...options,
        headers: { ...defaultHeaders, ...(options.headers || {}) }
      };

      const req = https.request(reqOptions, (res) => {
        let body = '';
        res.on('data', chunk => body += chunk);
        res.on('end', () => {
          let parsed;
          try {
            parsed = JSON.parse(body);
          } catch {
            parsed = body;
          }
          resolve({ status: res.statusCode, headers: res.headers, data: parsed });
        });
      });

      req.on('error', reject);
      if (postData) {
        req.write(typeof postData === 'string' ? postData : JSON.stringify(postData));
      }
      req.end();
    });
  };

  try {
    notifyProgress('creating_release', 10, `Creando release ${tag} en GitHub...`);

    // 2. Crear Release o buscar existente
    let release;
    const createRes = await githubApiRequest({
      hostname: 'api.github.com',
      path: `/repos/${owner}/${repo}/releases`,
      method: 'POST'
    }, {
      tag_name: tag,
      target_commitish: 'main',
      name: title || `Actualización ${tag}`,
      body: notes,
      draft: false,
      prerelease: false
    });

    if (createRes.status === 201) {
      release = createRes.data;
    } else if (createRes.status === 422) {
      // Ya existe el release con este tag, obtenerlo
      const getRes = await githubApiRequest({
        hostname: 'api.github.com',
        path: `/repos/${owner}/${repo}/releases/tags/${encodeURIComponent(tag)}`,
        method: 'GET'
      });
      if (getRes.status === 200) {
        release = getRes.data;
      } else {
        return { ok: false, error: `Error al obtener release existente: ${JSON.stringify(getRes.data)}` };
      }
    } else {
      return { ok: false, error: `Error de GitHub (${createRes.status}): ${createRes.data.message || JSON.stringify(createRes.data)}` };
    }

    if (!release || !release.id) {
      return { ok: false, error: 'No se pudo obtener la información del release en GitHub.' };
    }

    // 3. Obtener assets actuales del release y eliminar duplicados con el mismo nombre
    notifyProgress('cleaning', 15, `Verificando assets existentes...`);
    const assetsRes = await githubApiRequest({
      hostname: 'api.github.com',
      path: `/repos/${owner}/${repo}/releases/${release.id}/assets`,
      method: 'GET'
    });
    const existingAssets = Array.isArray(assetsRes.data) ? assetsRes.data : [];
    const existingAsset = existingAssets.find(a => a.name === fileName);
    if (existingAsset) {
      notifyProgress('cleaning', 20, `Eliminando binario anterior (${fileName})...`);
      await githubApiRequest({
        hostname: 'api.github.com',
        path: `/repos/${owner}/${repo}/releases/assets/${existingAsset.id}`,
        method: 'DELETE'
      });
      // Pequeña pausa para que GitHub procese el DELETE antes de subir
      await new Promise(r => setTimeout(r, 1500));
    }

    notifyProgress('uploading', 25, `Iniciando subida de ${fileName} (${(totalBytes / (1024 * 1024)).toFixed(1)} MB)...`);

    // 4. Subir el archivo binario a uploads.github.com
    const uploadUrlStr = release.upload_url.split('{')[0] + `?name=${encodeURIComponent(fileName)}`;
    const urlObj = new URL(uploadUrlStr);

    const uploadResult = await new Promise((resolve, reject) => {
      const uploadReq = https.request({
        hostname: urlObj.hostname,
        path: urlObj.pathname + urlObj.search,
        method: 'POST',
        headers: {
          'User-Agent': 'MovimientoPazVida-Desktop-App',
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/vnd.github+json',
          'Content-Type': 'application/octet-stream',
          'Content-Length': totalBytes
        }
      }, (res) => {
        let body = '';
        res.on('data', chunk => body += chunk);
        res.on('end', () => {
          try {
            const data = JSON.parse(body);
            resolve({ status: res.statusCode, data });
          } catch {
            resolve({ status: res.statusCode, data: body });
          }
        });
      });

      uploadReq.on('error', (err) => {
        reject(err);
      });

      // Stream con seguimiento de bytes
      let uploadedBytes = 0;
      const readStream = fs.createReadStream(filePath, { highWaterMark: 256 * 1024 });

      readStream.on('data', (chunk) => {
        uploadedBytes += chunk.length;
        const percent = Math.min(99, Math.round(25 + ((uploadedBytes / totalBytes) * 70)));
        notifyProgress('uploading', percent, `Subiendo ${fileName}...`, {
          loadedBytes: uploadedBytes,
          percentUpload: Math.round((uploadedBytes / totalBytes) * 100)
        });
      });

      readStream.on('error', (err) => {
        uploadReq.destroy(err);
        reject(err);
      });

      readStream.pipe(uploadReq);
    });

    if (uploadResult.status === 201 && uploadResult.data?.browser_download_url) {
      notifyProgress('completed', 100, '¡Archivo subido exitosamente a GitHub Releases!');
      return {
        ok: true,
        downloadUrl: uploadResult.data.browser_download_url,
        releaseId: release.id,
        tag: release.tag_name,
        fileName
      };
    } else {
      return {
        ok: false,
        error: `Error al subir binario (${uploadResult.status}): ${uploadResult.data?.message || JSON.stringify(uploadResult.data)}`
      };
    }

  } catch (err) {
    return { ok: false, error: err.message };
  }
});

