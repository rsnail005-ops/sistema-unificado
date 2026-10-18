const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs');
let nodemailer;
try {
  nodemailer = require('nodemailer');
} catch (e) {
  nodemailer = null;
}

let mainWindow = null;

function createWindow() {
  const iconPath = fs.existsSync(path.join(__dirname, '../public/icon.ico'))
    ? path.join(__dirname, '../public/icon.ico')
    : path.join(__dirname, '../dist/icon.ico');

  mainWindow = new BrowserWindow({
    width: 1320,
    height: 860,
    minWidth: 1080,
    minHeight: 720,
    title: 'Movimiento por la Paz y la Vida — Sistema Nacional de Almacenamiento',
    backgroundColor: '#0a0f1d',
    icon: iconPath,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      webSecurity: false
    },
    autoHideMenuBar: true
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

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

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

// IPC Handler para Envío Real de Correos mediante SMTP
ipcMain.handle('mail:sendVerificationCode', async (event, { to, code, name, smtpConfig }) => {
  if (!nodemailer) {
    return { success: false, error: 'Módulo nodemailer no disponible.' };
  }

  if (!smtpConfig || !smtpConfig.host || !smtpConfig.user || !smtpConfig.pass) {
    return {
      success: false,
      error: 'Servidor de correo SMTP no configurado. Para recibir correos reales, ingrese sus credenciales SMTP en Configuración.'
    };
  }

  try {
    const transporter = nodemailer.createTransport({
      host: smtpConfig.host,
      port: Number(smtpConfig.port) || 587,
      secure: Number(smtpConfig.port) === 465,
      auth: {
        user: smtpConfig.user,
        pass: smtpConfig.pass
      },
      tls: {
        rejectUnauthorized: false
      }
    });

    const info = await transporter.sendMail({
      from: `"Movimiento por la Paz y la Vida" <${smtpConfig.user}>`,
      to,
      subject: `Código de Verificación: ${code} - Movimiento por la Paz y la Vida`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 580px; margin: 0 auto; padding: 24px; background: #0a0f1d; color: #ffffff; border-radius: 12px; border: 1px solid #1e2d4a;">
          <div style="text-align: center; margin-bottom: 20px;">
            <h2 style="color: #60a5fa; margin: 0;">MOVIMIENTO POR LA PAZ Y LA VIDA</h2>
            <p style="color: #f59e0b; font-size: 13px; margin: 4px 0 0 0;">Sistema Nacional de Almacenamiento Seguro</p>
          </div>
          <p style="font-size: 14px; color: #cbd5e1;">Estimado(a) <strong>${name || 'Operador'}</strong>,</p>
          <p style="font-size: 14px; color: #cbd5e1;">Su solicitud de registro ha sido recibida en el sistema. Utilice el siguiente código de seguridad oficial para verificar su cuenta:</p>
          <div style="text-align: center; margin: 28px 0;">
            <span style="font-size: 32px; font-weight: bold; letter-spacing: 0.25em; color: #38bdf8; background: #111a2e; padding: 12px 24px; border-radius: 8px; border: 1px solid #2563eb;">
              ${code}
            </span>
          </div>
          <p style="font-size: 12px; color: #94a3b8;">Este código expira en 15 minutos y es para uso estrictamente confidencial.</p>
          <hr style="border: 0; border-top: 1px solid #1e2d4a; margin: 20px 0;" />
          <p style="font-size: 11px; color: #64748b; text-align: center;">República Bolivariana de Venezuela • Movimiento por la Paz y la Vida</p>
        </div>
      `
    });

    return { success: true, messageId: info.messageId };
  } catch (err) {
    console.error('Error enviando correo SMTP:', err);
    return { success: false, error: err.message };
  }
});

// =============================================================================
// IPC Handler para Consulta Real de Cédula en Línea
//
// FUENTES (en orden de prioridad):
//   1. ArmandoData.com — Verificado en vivo: cubre cédulas desde 1M hasta 28M+
//      El nombre está en <p class="info-card-text display-6">NOMBRE</p>
//      Y también en el <title>: "Detalle de Persona: NOMBRE CI :VXXXXXXXX"
//   2. CNE Electoral — Registro Nacional de Electores (mayores de 18)
//   3. IVSS — Instituto Venezolano de Seguros Sociales (pensionados)
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
 * update:launch
 *   Abre el instalador descargado con el shell del sistema operativo y cierra
 *   la aplicación para que el instalador pueda reemplazar los archivos.
 */
ipcMain.handle('update:launch', async (event, { installerPath }) => {
  const { shell } = require('electron');
  try {
    await shell.openPath(installerPath);
    setTimeout(() => app.quit(), 1500);
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err.message };
  }
});

/**
 * updater:detectLatestExe
 *   Detecta automáticamente el instalador .exe más reciente generado en dist-electron/
 */
ipcMain.handle('updater:detectLatestExe', async () => {
  const candidateDirs = [
    path.join(__dirname, '../dist-electron'),
    path.join(process.cwd(), 'dist-electron')
  ];

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
        console.error('Error al detectar .exe en dist-electron:', err);
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

    // 3. Si ya existía un asset con el mismo nombre, eliminarlo primero para reemplazarlo limpiamente
    if (Array.isArray(release.assets)) {
      const existingAsset = release.assets.find(a => a.name === fileName);
      if (existingAsset) {
        notifyProgress('cleaning', 20, `Reemplazando binario anterior (${fileName})...`);
        await githubApiRequest({
          hostname: 'api.github.com',
          path: `/repos/${owner}/${repo}/releases/assets/${existingAsset.id}`,
          method: 'DELETE'
        });
      }
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

