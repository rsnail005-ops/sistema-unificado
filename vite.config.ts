import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import https from 'node:https';
import http from 'node:http';

function cedulaLookupPlugin() {
  return {
    name: 'cedula-lookup-proxy',
    configureServer(server: any) {
      server.middlewares.use(async (req: any, res: any, next: any) => {
        if (req.url && req.url.startsWith('/api/cedula')) {
          const parsedUrl = new URL(req.url, 'http://localhost');
          const cedulaRaw = parsedUrl.searchParams.get('cedula') || '';

          const clean = String(cedulaRaw).toUpperCase().replace(/[^VE0-9]/g, '');
          const prefix = clean.startsWith('E') ? 'E' : 'V';
          const numOnly = clean.replace(/[^0-9]/g, '');
          const cedulaFormato = `${prefix}${numOnly}`;

          res.setHeader('Content-Type', 'application/json');

          if (!numOnly || numOnly.length < 5) {
            res.statusCode = 400;
            res.end(JSON.stringify({ exito: false, mensaje: 'Cédula inválida' }));
            return;
          }

          function decodeHtml(str: string) {
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
              .replace(/&#(\d+);/g, (_, dec) => String.fromCharCode(Number(dec)))
              .replace(/&#x([0-9a-f]+);/gi, (_, hex) => String.fromCharCode(parseInt(hex, 16)))
              .replace(/&amp;/g, '&')
              .trim();
          }

          function parsearPartes(rawName: string, apellidosPrimero: boolean) {
            const parts = rawName.trim().split(/\s+/).map(p => p.charAt(0).toUpperCase() + p.slice(1).toLowerCase());
            let nombres = '';
            let apellidos = '';
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
            return { nombres, apellidos };
          }

          // 1. Consultar ArmandoData (Soporte verificado hasta 28M+)
          const consultarArmando = () => new Promise<any>((resolve) => {
            const url = `https://armandodata.com/Personas/Detalles?cedula=${cedulaFormato}`;
            const clientReq = https.get(url, {
              headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36'
              },
              timeout: 9000
            }, (apiRes) => {
              let body = '';
              apiRes.on('data', chunk => body += chunk);
              apiRes.on('end', () => {
                let rawName = '';
                const matchA = body.match(/<p class="info-card-text display-6">([^<]+)<\/p>/);
                if (matchA && matchA[1] && matchA[1].trim().length > 3) {
                  rawName = decodeHtml(matchA[1]);
                }

                if (!rawName) {
                  const matchB = body.match(/<title>Detalle de Persona:\s*([^<]+?)\s+CI\s*:/i);
                  if (matchB && matchB[1] && matchB[1].trim().length > 3) {
                    rawName = decodeHtml(matchB[1]);
                  }
                }

                if (!rawName) return resolve(null);

                const parsed = parsearPartes(rawName, false);

                let fechaNac = '';
                const birthMatch = body.match(/<p class="info-card-text">(\d{2}-\d{2}-\d{4})\s*\(/);
                if (birthMatch && birthMatch[1]) {
                  const dParts = birthMatch[1].split('-');
                  if (dParts.length === 3) {
                    fechaNac = `${dParts[2]}-${dParts[1]}-${dParts[0]}`;
                  }
                }

                return resolve({
                  exito: true,
                  cedula: `${prefix}-${numOnly}`,
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
            clientReq.on('error', () => resolve(null));
            clientReq.on('timeout', () => { clientReq.destroy(); resolve(null); });
          });

          // 2. Fallback al CNE
          const consultarCNE = () => new Promise<any>((resolve) => {
            const url = `http://www.cne.gob.ve/web/registro_electoral/ce.php?nacs=${prefix}&ced=${numOnly}`;
            const clientReq = http.get(url, {
              headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' },
              timeout: 6000
            }, (apiRes) => {
              let body = '';
              apiRes.on('data', chunk => body += chunk);
              apiRes.on('end', () => {
                let m = body.match(/<b>([A-Z\u00C1\u00C9\u00CD\u00D3\u00DA\u00D1][A-Z\u00C1\u00C9\u00CD\u00D3\u00DA\u00D1\s]{5,})<\/b>/i);
                if (!m) m = body.match(/class="[^"]*negrita[^"]*"[^>]*>([A-Z\u00C1\u00C9\u00CD\u00D3\u00DA\u00D1][A-Z\u00C1\u00C9\u00CD\u00D3\u00DA\u00D1\s]{5,})</i);
                if (m && m[1] && m[1].trim().length > 5) {
                  const parsed = parsearPartes(m[1].trim(), true);
                  return resolve({
                    exito: true,
                    cedula: `${prefix}-${numOnly}`,
                    nombres: parsed.nombres,
                    apellidos: parsed.apellidos,
                    fecha_nacimiento: '1990-01-01',
                    genero: 'Masculino',
                    estado_civil: 'Soltero(a)',
                    estado_nacimiento: 'Venezuela',
                    fuente: 'CNE Electoral'
                  });
                }
                resolve(null);
              });
            });
            clientReq.on('error', () => resolve(null));
            clientReq.on('timeout', () => { clientReq.destroy(); resolve(null); });
          });

          // 3. Fallback al IVSS
          const consultarIvss = () => new Promise<any>((resolve) => {
            const url = `http://www.ivss.gob.ve:28080/Pensionado/PensionadoCTRL?boton=Consultar&nacionalidad=${prefix}&cedula=${numOnly}`;
            const clientReq = http.get(url, {
              headers: { 'User-Agent': 'Mozilla/5.0' },
              timeout: 6000
            }, (apiRes) => {
              let body = '';
              apiRes.setEncoding('latin1');
              apiRes.on('data', chunk => body += chunk);
              apiRes.on('end', () => {
                const m = body.match(/Apellido y nombre:.*?<td[^>]*>(.*?)<\/td>/s);
                if (m && m[1] && m[1].trim()) {
                  const rawName = m[1].replace(/<[^>]+>/g, '').trim();
                  const parsed = parsearPartes(rawName, true);
                  return resolve({
                    exito: true,
                    cedula: `${prefix}-${numOnly}`,
                    nombres: parsed.nombres,
                    apellidos: parsed.apellidos,
                    fecha_nacimiento: '1965-01-01',
                    genero: 'Masculino',
                    estado_civil: 'Casado(a)',
                    estado_nacimiento: 'Venezuela',
                    fuente: 'IVSS'
                  });
                }
                resolve(null);
              });
            });
            clientReq.on('error', () => resolve(null));
            clientReq.on('timeout', () => { clientReq.destroy(); resolve(null); });
          });

          try {
            let resultado = await consultarArmando();
            if (!resultado) {
              resultado = await consultarCNE();
            }
            if (!resultado) {
              resultado = await consultarIvss();
            }

            if (resultado) {
              res.statusCode = 200;
              res.end(JSON.stringify(resultado));
            } else {
              res.statusCode = 200;
              res.end(JSON.stringify({
                exito: false,
                mensaje: 'Cédula no encontrada en los registros en línea.'
              }));
            }
          } catch (e: any) {
            res.statusCode = 500;
            res.end(JSON.stringify({ exito: false, mensaje: e.message }));
          }
          return;
        }
        next();
      });
    }
  };
}

export default defineConfig({
  plugins: [react(), cedulaLookupPlugin()],
  base: './',
  server: {
    port: 5173,
    strictPort: true
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true
  }
});
