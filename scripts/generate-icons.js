/**
 * GymBro Icon Generator
 * Converts assets/icon.svg → assets/icon.png + adaptive-icon.png + favicon.png
 * Converts assets/splash-icon.svg → assets/splash-icon.png
 *
 * Usage: node scripts/generate-icons.js
 * Requires: npm install --save-dev @resvg/resvg-js
 */

const path = require('path');
const fs = require('fs');

const ASSETS = path.join(__dirname, '../assets');

async function generate() {
  let Resvg;
  try {
    ({ Resvg } = require('@resvg/resvg-js'));
  } catch {
    console.error('❌  @resvg/resvg-js not found. Run: npm install --save-dev @resvg/resvg-js');
    process.exit(1);
  }

  const iconSvg = fs.readFileSync(path.join(ASSETS, 'icon.svg'), 'utf8');
  const splashSvg = fs.readFileSync(path.join(ASSETS, 'splash-icon.svg'), 'utf8');

  console.log('🎨  Generating GymBro icons...');

  // App icon — 1024×1024
  const icon1024 = new Resvg(iconSvg, { width: 1024, height: 1024 });
  const icon1024Buf = icon1024.render().asPng();
  fs.writeFileSync(path.join(ASSETS, 'icon.png'), icon1024Buf);
  console.log('  ✅  icon.png (1024×1024)');

  // Android adaptive icon — 1024×1024 (no rounded corners, Android does that)
  fs.writeFileSync(path.join(ASSETS, 'adaptive-icon.png'), icon1024Buf);
  console.log('  ✅  adaptive-icon.png (1024×1024)');

  // Favicon — 48×48
  const fav = new Resvg(iconSvg, { width: 48, height: 48 });
  fs.writeFileSync(path.join(ASSETS, 'favicon.png'), fav.render().asPng());
  console.log('  ✅  favicon.png (48×48)');

  // Splash icon — 200×200 (centered on dark bg by Expo)
  const splash = new Resvg(splashSvg, { width: 200, height: 200 });
  fs.writeFileSync(path.join(ASSETS, 'splash-icon.png'), splash.render().asPng());
  console.log('  ✅  splash-icon.png (200×200)');

  console.log('\n🚀  Done! All icons generated in assets/');
}

generate();
