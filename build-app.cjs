// Disable Electron's ASAR interception so electron-builder can package app.asar cleanly
process.noAsar = true;

const path = require('path');
const { build, Platform } = require('electron-builder');

async function runBuild() {
  console.log('========================================================');
  console.log(' MOVIMIENTO POR LA PAZ Y LA VIDA - COMPILACIÓN EJECUTABLE');
  console.log('========================================================');

  // 1. Compilar Vite
  console.log('\n[1/2] Compilando frontend (Vite + TypeScript)...');
  const { build: viteBuild } = await import('vite');
  await viteBuild({
    root: __dirname,
    mode: 'production'
  });
  console.log('✓ Frontend compilado exitosamente en /dist');

  // 2. Compilar con electron-builder
  console.log('\n[2/2] Generando ejecutables de escritorio para Windows...');
  const result = await build({
    targets: Platform.WINDOWS.createTarget(),
    projectDir: __dirname
  });

  console.log('\n✓ Compilación exitosa!');
  console.log('Artefactos generados:');
  for (const artifact of result) {
    console.log(' -> ' + artifact);
  }
}

runBuild().catch(err => {
  console.error('\n✕ Error durante la compilación:', err);
  process.exit(1);
});
