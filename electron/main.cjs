const { app, BrowserWindow, ipcMain, dialog, Menu, screen } = require('electron');
const path = require('path');
const fs = require('fs');

Menu.setApplicationMenu(null);

let mainWindow = null;

function createWindow() {
  const iconPath = fs.existsSync(path.join(__dirname, '../public/icon.ico'))
    ? path.join(__dirname, '../public/icon.ico')
    : path.join(__dirname, '../dist/icon.ico');

  // Tamaño dinámico según el área de trabajo disponible
  const { width: screenW, height: screenH } = screen.getPrimaryDisplay().workAreaSize;
  const isCompact = screenW <= 1280 || screenH <= 768;
  const winWidth  = isCompact ? screenW  : Math.min(1320, screenW);
  const winHeight = isCompact ? screenH  : Math.min(860,  screenH);

  mainWindow = new BrowserWindow({
    width: winWidth,
    height: winHeight,
    minWidth: 960,
    minHeight: 560,
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

  // En pantallas compactas maximizar para aprovechar todo el espacio
  if (isCompact) {
    mainWindow.maximize();
  }

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


// IPC Handlers para Actualización Automática de la Aplicación
// =============================================================================

/**
 * updater:getDefaultDir
 *   Devuelve la carpeta actual de la aplicación (ejecutable portable o instalado),
 *   así como las carpetas estándar del sistema (Descargas, Escritorio, Temp).
 */
ipcMain.handle('updater:getDefaultDir', async () => {
  const os = require('os');
  const path = require('path');
  const currentExe = process.env.PORTABLE_EXECUTABLE_FILE || process.execPath;
  const currentDir = process.env.PORTABLE_EXECUTABLE_DIR || path.dirname(currentExe);
  return {
    currentDir,
    currentExe,
    downloadsDir: app.getPath('downloads'),
    desktopDir: app.getPath('desktop'),
    tempDir: os.tmpdir(),
  };
});

/**
 * updater:selectFolder
 *   Abre el diálogo nativo para que el usuario elija la carpeta donde desea guardar
 *   o aplicar la nueva versión de la aplicación.
 */
ipcMain.handle('updater:selectFolder', async (event, defaultPath) => {
  const fs = require('fs');
  const path = require('path');
  const currentExe = process.env.PORTABLE_EXECUTABLE_FILE || process.execPath;
  const initialDir = defaultPath && fs.existsSync(defaultPath)
    ? defaultPath
    : (process.env.PORTABLE_EXECUTABLE_DIR || path.dirname(currentExe));

  const result = await dialog.showOpenDialog(mainWindow, {
    title: 'Seleccionar carpeta de destino para la actualización',
    defaultPath: initialDir,
    properties: ['openDirectory', 'createDirectory']
  });

  if (result.canceled || !result.filePaths || result.filePaths.length === 0) {
    return { canceled: true };
  }
  return { canceled: false, folderPath: result.filePaths[0] };
});

/**
 * updater:openFolder
 *   Abre la carpeta en el Explorador de Windows o resalta un archivo específico.
 */
ipcMain.handle('updater:openFolder', async (event, targetPath) => {
  const fs = require('fs');
  const { shell } = require('electron');
  if (!targetPath) return { ok: false, error: 'Ruta no especificada.' };
  try {
    if (fs.existsSync(targetPath)) {
      const stat = fs.statSync(targetPath);
      if (stat.isDirectory()) {
        await shell.openPath(targetPath);
      } else {
        shell.showItemInFolder(targetPath);
      }
      return { ok: true };
    }
    return { ok: false, error: 'La ruta no existe en el disco.' };
  } catch (err) {
    return { ok: false, error: err.message };
  }
});

/**
 * update:download
 *   Descarga el instalador desde una URL remota (GitHub Releases) y guarda el
 *   .exe en la carpeta temporal del usuario. Emite eventos `update:progress`
 *   con el porcentaje de descarga para la barra de progreso en el frontend.
 */
ipcMain.handle('update:download', async (event, { downloadUrl, fileName, targetFolder }) => {
  const https = require('https');
  const http = require('http');
  const os = require('os');
  const fs = require('fs');
  const path = require('path');

  let cleanFileName = fileName;
  if (!cleanFileName) {
    try {
      const parsed = new URL(downloadUrl);
      cleanFileName = path.basename(parsed.pathname);
    } catch {}
  }
  if (!cleanFileName || !cleanFileName.endsWith('.exe')) {
    cleanFileName = 'MovimientoPazVida-Update.exe';
  }
  cleanFileName = cleanFileName.replace(/[\/\\:*?"<>|]/g, '_');

  const currentExe = process.env.PORTABLE_EXECUTABLE_FILE || process.execPath;
  const currentDir = process.env.PORTABLE_EXECUTABLE_DIR || path.dirname(currentExe);

  // Determinar carpeta base de destino
  let baseDir = os.tmpdir();
  if (targetFolder && fs.existsSync(targetFolder)) {
    baseDir = targetFolder;
  }

  // Si la carpeta destino es la misma donde se ejecuta la app actual
  // y el nombre del archivo coincide, descargar con sufijo para evitar bloqueo de Windows
  let downloadFileName = cleanFileName;
  if (
    baseDir.toLowerCase() === currentDir.toLowerCase() &&
    cleanFileName.toLowerCase() === path.basename(currentExe).toLowerCase()
  ) {
    downloadFileName = cleanFileName.replace(/\.exe$/i, '') + '-Update.exe';
  }

  const destPath = path.join(baseDir, downloadFileName);
  const isSetup = cleanFileName.toLowerCase().includes('setup') || downloadUrl.toLowerCase().includes('setup');

  // Si existe un archivo anterior incompleto, removerlo primero
  try {
    if (fs.existsSync(destPath)) {
      fs.unlinkSync(destPath);
    }
  } catch {}

  return new Promise((resolve) => {
    let redirectCount = 0;
    const maxRedirects = 10;

    const doDownload = (currentUrl) => {
      let urlObj;
      try {
        urlObj = new URL(currentUrl);
      } catch (err) {
        return resolve({ ok: false, error: `URL de descarga inválida: ${err.message}` });
      }

      const client = urlObj.protocol === 'https:' ? https : http;

      const req = client.get(currentUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) MovimientoPazVida/Updater',
          'Accept': '*/*'
        },
        timeout: 180000
      }, (res) => {
        // Seguir redireccionamientos (GitHub Releases usa 302 -> S3/CDN)
        if ([301, 302, 303, 307, 308].includes(res.statusCode)) {
          redirectCount++;
          if (redirectCount > maxRedirects) {
            return resolve({ ok: false, error: 'Demasiadas redirecciones durante la descarga.' });
          }
          const location = res.headers.location;
          if (!location) {
            return resolve({ ok: false, error: 'Redirección sin encabezado Location.' });
          }
          const nextUrl = new URL(location, currentUrl).toString();
          return doDownload(nextUrl);
        }

        if (res.statusCode !== 200) {
          return resolve({ ok: false, error: `Error del servidor: HTTP ${res.statusCode}` });
        }

        const totalBytes = parseInt(res.headers['content-length'] || '0', 10);
        let receivedBytes = 0;
        const writer = fs.createWriteStream(destPath);

        res.on('data', (chunk) => {
          receivedBytes += chunk.length;
          if (totalBytes > 0) {
            const pct = Math.min(100, Math.round((receivedBytes / totalBytes) * 100));
            if (mainWindow && !mainWindow.isDestroyed()) {
              mainWindow.webContents.send('update:progress', pct);
            }
          }
        });

        res.pipe(writer);

        writer.on('finish', () => {
          writer.close(() => {
            try {
              const stats = fs.statSync(destPath);
              if (stats.size < 50000) {
                return resolve({ ok: false, error: 'El archivo descargado está incompleto o corrupto (tamaño muy pequeño).' });
              }
              resolve({
                ok: true,
                path: destPath,
                fileName: downloadFileName,
                targetFolder: baseDir,
                isSetup,
                size: stats.size
              });
            } catch (err) {
              resolve({ ok: false, error: `Error al verificar archivo descargado: ${err.message}` });
            }
          });
        });

        writer.on('error', (err) => {
          try { fs.unlinkSync(destPath); } catch {}
          resolve({ ok: false, error: `Error escribiendo archivo: ${err.message}` });
        });
      });

      req.on('error', (err) => {
        try { fs.unlinkSync(destPath); } catch {}
        resolve({ ok: false, error: `Error de red: ${err.message}` });
      });

      req.on('timeout', () => {
        req.destroy();
        try { fs.unlinkSync(destPath); } catch {}
        resolve({ ok: false, error: 'Tiempo de espera agotado al descargar la actualización.' });
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
 *   Distingue automáticamente entre un instalador Setup (NSIS) y un ejecutable Portable.
 *   - Si es Setup: ejecuta el instalador formal y cierra la app para actualización limpia.
 *   - Si es Portable: actualiza el ejecutable en su misma carpeta, renombrándolo según
 *     la versión indicada, elimina el ejecutable anterior, actualiza accesos directos
 *     y reinicia la aplicación.
 */
ipcMain.handle('update:launch', async (event, { installerPath, newVersion, isSetup, assetName, targetFolder }) => {
  const { spawn } = require('child_process');
  const fs = require('fs');
  const path = require('path');
  const os = require('os');
  const { shell } = require('electron');

  try {
    if (!installerPath || !fs.existsSync(installerPath)) {
      return { ok: false, error: 'El archivo descargado no existe en el disco.' };
    }

    const downloadedFileName = path.basename(installerPath);
    const downloadedLower = downloadedFileName.toLowerCase();
    const isSetupInstaller = Boolean(
      isSetup ||
      downloadedLower.includes('setup') ||
      (assetName && String(assetName).toLowerCase().includes('setup'))
    );

    const currentPid = process.pid;

    // Helper para escapar cadenas de forma segura para PowerShell usando comillas simples literales
    const psQuote = (val) => `'${String(val || '').replace(/'/g, "''")}'`;

    // 1. Modo desarrollo (no empaquetado)
    if (!app.isPackaged) {
      await shell.openPath(installerPath);
      setTimeout(() => app.quit(), 1500);
      return { ok: true };
    }

    const cleanVer = String(newVersion || '').replace(/^v/, '');

    // 2. Si es instalador NSIS Setup
    if (isSetupInstaller) {
      const updaterPsPath = path.join(os.tmpdir(), `mpv-setup-runner-${Date.now()}.ps1`);
      const logFile = path.join(os.tmpdir(), 'mpv-update-setup.log');

      const psContent = `
$ErrorActionPreference = 'Continue'
$log = ${psQuote(logFile)}
function Log($msg) {
  $line = '[' + (Get-Date -Format 'yyyy-MM-dd HH:mm:ss') + '] ' + $msg
  Add-Content -Path $log -Value $line -Encoding UTF8
}

Write-Host "======================================================================" -ForegroundColor Cyan
Write-Host "          SISTEMA UNIFICADO DE USUARIOS - MOVIMIENTO PAZ Y VIDA       " -ForegroundColor Yellow
Write-Host "          Iniciando instalador formal v${cleanVer}...                 " -ForegroundColor Green
Write-Host "======================================================================" -ForegroundColor Cyan
Write-Host ""

Log 'Iniciando instalador Setup...'
Log ('PID a esperar: ' + ${currentPid})
Log ('Instalador: ' + ${psQuote(installerPath)})

try {
  $proc = Get-Process -Id ${currentPid} -ErrorAction SilentlyContinue
  if ($proc) {
    Log 'Esperando salida del proceso principal...'
    $proc.WaitForExit(15000)
  }
} catch {
  Log ('Proceso ya habia terminado o error: ' + $_.Exception.Message)
}

Start-Sleep -Seconds 2

Log 'Lanzando instalador formal...'
try {
  Start-Process -FilePath ${psQuote(installerPath)}
  Log 'Instalador lanzado exitosamente.'
} catch {
  Log ('Error al lanzar instalador: ' + $_.Exception.Message)
}

Start-Sleep -Seconds 2
try { Remove-Item -Path $MyInvocation.MyCommand.Path -Force -ErrorAction SilentlyContinue } catch {}
`;

      fs.writeFileSync(updaterPsPath, psContent, { encoding: 'utf8' });

      const psExe = process.env.SystemRoot
        ? path.join(process.env.SystemRoot, 'System32', 'WindowsPowerShell', 'v1.0', 'powershell.exe')
        : 'powershell.exe';

      // Iniciar a través del comando 'start' de cmd.exe directamente hacia powershell.exe
      // Esto desvincula totalmente el proceso del Job Object de Electron y no requiere archivos .cmd
      const child = spawn('cmd.exe', [
        '/c',
        'start',
        `Actualizando Movimiento Paz y Vida v${cleanVer}`,
        psExe,
        '-NoProfile',
        '-ExecutionPolicy', 'Bypass',
        '-File',
        updaterPsPath
      ], {
        detached: true,
        stdio: 'ignore'
      });
      child.unref();

      setTimeout(() => {
        app.exit(0);
      }, 1200);
      return { ok: true };
    }

    // 3. Auto-reemplazo en caliente de ejecutable Portable / Standalone
    const currentExe = process.env.PORTABLE_EXECUTABLE_FILE || process.execPath;
    const currentDir = process.env.PORTABLE_EXECUTABLE_DIR || path.dirname(currentExe);

    // Si el usuario especificó una carpeta de destino válida, usarla
    const destinationDir = targetFolder && fs.existsSync(targetFolder)
      ? targetFolder
      : currentDir;

    // Determinar destino final:
    // El usuario especificó no incluir números de versión en el nombre del ejecutable.
    // Nombre estándar limpio: MovimientoPazVida.exe (o MovimientoPazVida-Portable.exe si el actual lo tenía).
    const currentBaseName = path.basename(currentExe);
    let finalExeName = currentBaseName;
    if (/\bv?\d+\.\d+(\.\d+)?\b/i.test(currentBaseName)) {
      finalExeName = currentBaseName
        .replace(/[-._ ]v?\d+\.\d+(\.\d+)?[-._ ]?/i, '')
        .replace(/\.exe$/i, '') + '.exe';
      if (!finalExeName || finalExeName.toLowerCase() === '.exe') {
        finalExeName = currentBaseName.toLowerCase().includes('portable')
          ? 'MovimientoPazVida-Portable.exe'
          : 'MovimientoPazVida.exe';
      }
    }

    const finalTargetExe = path.join(destinationDir, finalExeName);
    const updaterPsPath = path.join(os.tmpdir(), `mpv-portable-runner-${Date.now()}.ps1`);
    const logFile = path.join(os.tmpdir(), 'mpv-update-portable.log');

    const psContent = `
$ErrorActionPreference = 'Continue'
$log = ${psQuote(logFile)}
function Log($msg) {
  $line = '[' + (Get-Date -Format 'yyyy-MM-dd HH:mm:ss') + '] ' + $msg
  Add-Content -Path $log -Value $line -Encoding UTF8
}

Write-Host "======================================================================" -ForegroundColor Cyan
Write-Host "          SISTEMA UNIFICADO DE USUARIOS - MOVIMIENTO PAZ Y VIDA       " -ForegroundColor Yellow
Write-Host "          Aplicando actualizacion a la version v${cleanVer}...        " -ForegroundColor Green
Write-Host "          Por favor espere unos segundos mientras se completa...      " -ForegroundColor Gray
Write-Host "======================================================================" -ForegroundColor Cyan
Write-Host ""

Log '=== INICIANDO ACTUALIZACION PORTABLE ==='
Log ('PID a esperar: ' + ${currentPid})
Log ('Origen descargado: ' + ${psQuote(installerPath)})
Log ('Ejecutable actual: ' + ${psQuote(currentExe)})
Log ('Destino final: ' + ${psQuote(finalTargetExe)})
Log ('Carpeta destino: ' + ${psQuote(destinationDir)})

# 1. Esperar liberacion de procesos (tanto el PID Electron como el wrapper portable)
Write-Host "Esperando cierre de procesos anteriores..." -ForegroundColor Gray
Log 'Esperando cierre de la aplicacion y liberacion de procesos...'
$maxWaitSec = 25
$startTime = Get-Date

while (((Get-Date) - $startTime).TotalSeconds -lt $maxWaitSec) {
  $hasRunning = $false

  try {
    $p = Get-Process -Id ${currentPid} -ErrorAction SilentlyContinue
    if ($p -and -not $p.HasExited) { $hasRunning = $true }
  } catch {}

  try {
    $targetName = [System.IO.Path]::GetFileNameWithoutExtension(${psQuote(currentExe)})
    $procs = Get-Process -Name $targetName -ErrorAction SilentlyContinue
    if ($procs) {
      foreach ($pr in $procs) {
        try {
          if ($pr.Path -and ($pr.Path.ToLower() -eq ${psQuote(currentExe)}.ToLower())) {
            $hasRunning = $true
          }
        } catch {}
      }
    }
  } catch {}

  if (-not $hasRunning) {
    break
  }
  Start-Sleep -Milliseconds 500
}

# Si despues de esperar aun hay procesos remanentes bloqueando el archivo, forzar cierre
try {
  $targetName = [System.IO.Path]::GetFileNameWithoutExtension(${psQuote(currentExe)})
  $procs = Get-Process -Name $targetName -ErrorAction SilentlyContinue
  foreach ($pr in $procs) {
    try {
      if ($pr.Path -and ($pr.Path.ToLower() -eq ${psQuote(currentExe)}.ToLower())) {
        Log ('Forzando cierre de proceso remanente: ' + $pr.Id)
        Stop-Process -Id $pr.Id -Force -ErrorAction SilentlyContinue
      }
    } catch {}
  }
} catch {}

Start-Sleep -Seconds 1

# 2. Copiar el nuevo ejecutable
Write-Host "Copiando nueva version a la carpeta de destino..." -ForegroundColor White
$copied = $false
for ($i = 1; $i -le 40; $i++) {
  try {
    Log ('Intento de copia #' + $i + '...')
    Copy-Item -Path ${psQuote(installerPath)} -Destination ${psQuote(finalTargetExe)} -Force -ErrorAction Stop
    $copied = $true
    Log ('Copia completada exitosamente en intento #' + $i)
    break
  } catch {
    Log ('Fallo intento #' + $i + ': ' + $_.Exception.Message)
    # Si falla por estar en uso, rotar el destino a un archivo temporal .old
    if (Test-Path ${psQuote(finalTargetExe)}) {
      try {
        $tempOld = ${psQuote(finalTargetExe)} + '.old.' + (Get-Random)
        Move-Item -Path ${psQuote(finalTargetExe)} -Destination $tempOld -Force -ErrorAction SilentlyContinue
        Copy-Item -Path ${psQuote(installerPath)} -Destination ${psQuote(finalTargetExe)} -Force -ErrorAction Stop
        $copied = $true
        Log 'Copia completada tras rotar ejecutable a temporal .old.'
        Remove-Item -Path $tempOld -Force -ErrorAction SilentlyContinue
        break
      } catch {}
    }
    Start-Sleep -Milliseconds 600
  }
}

# 3. Si el ejecutable original tenia un nombre o ruta distinta, eliminar la version vieja
if ($copied) {
  $origPath = ${psQuote(currentExe)}
  $destPath = ${psQuote(finalTargetExe)}
  if ($origPath.ToLower() -ne $destPath.ToLower()) {
    try {
      Log ('Eliminando version anterior: ' + $origPath)
      if (Test-Path $origPath) {
        Remove-Item -Path $origPath -Force -ErrorAction SilentlyContinue
      }
    } catch {
      Log ('Aviso al eliminar version anterior: ' + $_.Exception.Message)
    }
  }

  # 4. Actualizar accesos directos en el Escritorio
  try {
    $desktopDirs = @(
      [Environment]::GetFolderPath('Desktop'),
      "$env:USERPROFILE\\Desktop",
      "$env:USERPROFILE\\OneDrive\\Desktop",
      "$env:USERPROFILE\\OneDrive\\Escritorio",
      "$env:USERPROFILE\\Escritorio"
    ) | Where-Object { $_ -and (Test-Path $_) } | Select-Object -Unique

    foreach ($d in $desktopDirs) {
      try {
        $lnk = Join-Path $d "Sistema Unificado de Usuarios GNP.lnk"
        $wsh = New-Object -ComObject WScript.Shell
        $s = $wsh.CreateShortcut($lnk)
        $s.TargetPath = $destPath
        $s.WorkingDirectory = ${psQuote(destinationDir)}
        $s.IconLocation = "$destPath,0"
        $s.Description = "Sistema Unificado de Usuarios GNP"
        $s.Save()
        Log ('Acceso directo actualizado en: ' + $lnk)
      } catch {
        Log ('Error al actualizar acceso directo en ' + $d + ': ' + $_.Exception.Message)
      }
    }
  } catch {
    Log ('Error general en accesos directos: ' + $_.Exception.Message)
  }

  # 5. Relanzar la aplicacion actualizada
  Write-Host "Iniciando aplicacion actualizada..." -ForegroundColor Green
  Log ('Relanzando aplicacion actualizada: ' + $destPath)
  try {
    Start-Process -FilePath $destPath -WorkingDirectory ${psQuote(destinationDir)}
    Log 'Proceso relanzado con exito.'
  } catch {
    Log ('Error al relanzar la aplicacion: ' + $_.Exception.Message)
  }
} else {
  Write-Host "ERROR: No se pudo copiar el archivo tras varios intentos." -ForegroundColor Red
  Log 'ERROR CRITICO: No se pudo copiar el nuevo archivo tras 40 intentos.'
  Start-Sleep -Seconds 3
}

# 6. Limpieza de archivos temporales
Start-Sleep -Seconds 2
try {
  if ((${psQuote(installerPath)}).ToLower() -ne (${psQuote(finalTargetExe)}).ToLower()) {
    if (Test-Path ${psQuote(installerPath)}) {
      Remove-Item -Path ${psQuote(installerPath)} -Force -ErrorAction SilentlyContinue
    }
  }
  Remove-Item -Path $MyInvocation.MyCommand.Path -Force -ErrorAction SilentlyContinue
} catch {}

Log '=== FIN DEL PROCESO DE ACTUALIZACION ==='
`;

    fs.writeFileSync(updaterPsPath, psContent, { encoding: 'utf8' });

    const psExe = process.env.SystemRoot
      ? path.join(process.env.SystemRoot, 'System32', 'WindowsPowerShell', 'v1.0', 'powershell.exe')
      : 'powershell.exe';

    // Iniciar a través de 'start' de cmd.exe directamente hacia powershell.exe
    // Esto evita generar archivos .cmd intermedios que causan errores por lotes
    const child = spawn('cmd.exe', [
      '/c',
      'start',
      `Actualizando Movimiento Paz y Vida v${cleanVer}`,
      psExe,
      '-NoProfile',
      '-ExecutionPolicy', 'Bypass',
      '-File',
      updaterPsPath
    ], {
      detached: true,
      stdio: 'ignore'
    });
    child.unref();

    setTimeout(() => {
      app.exit(0);
    }, 1200);

    return { ok: true };
  } catch (err) {
    console.error('Error al ejecutar reemplazo de actualización:', err);
    return { ok: false, error: err.message };
  }
});

/**
 * updater:detectLatestExe
 *   Detecta automáticamente los binarios .exe generados en dist-electron/
 *   Distingue claramente entre instalador NSIS (Setup) y ejecutable Portable.
 */
ipcMain.handle('updater:detectLatestExe', async (event, params = {}) => {
  if (params.preferredPath && fs.existsSync(params.preferredPath)) {
    try {
      const stats = fs.statSync(params.preferredPath);
      if (stats.isFile() && params.preferredPath.endsWith('.exe')) {
        const isSetup = path.basename(params.preferredPath).toLowerCase().includes('setup');
        return {
          found: true,
          fileName: path.basename(params.preferredPath),
          filePath: params.preferredPath,
          sizeBytes: stats.size,
          sizeMB: (stats.size / (1024 * 1024)).toFixed(1),
          mtime: stats.mtime,
          isSetup
        };
      }
    } catch { /* noop */ }
  }

  const candidateDirs = [
    params.preferredPath ? (fs.existsSync(params.preferredPath) ? (fs.statSync(params.preferredPath).isDirectory() ? params.preferredPath : path.dirname(params.preferredPath)) : null) : null,
    path.join(app.getPath('documents'), 'movimiento-paz-vida-doc/movimiento-paz-vida-doc/movimiento-paz-vida-doc/movimiento-paz-vida-app/dist-electron'),
    path.join(app.getPath('documents'), 'movimiento-paz-vida-app/dist-electron'),
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
            const isSetup = f.toLowerCase().includes('setup');
            return {
              fileName: f,
              filePath: p,
              sizeBytes: stats.size,
              sizeMB: (stats.size / (1024 * 1024)).toFixed(1),
              mtime: stats.mtime,
              isSetup
            };
          })
          .sort((a, b) => {
            if (params.preferredType === 'portable') {
              if (a.isSetup !== b.isSetup) return a.isSetup ? 1 : -1;
            } else if (params.preferredType === 'setup') {
              if (a.isSetup !== b.isSetup) return a.isSetup ? -1 : 1;
            } else {
              if (a.isSetup !== b.isSetup) return a.isSetup ? -1 : 1;
            }
            return b.mtime - a.mtime;
          });

        if (files.length > 0) {
          return { found: true, ...files[0], allCandidates: files };
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

