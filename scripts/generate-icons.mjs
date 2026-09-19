import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

async function getSharp() {
  try {
    const mod = await import('sharp');
    return mod.default || mod;
  } catch {
    const siblingPath = path.resolve(rootDir, '../nonograms/node_modules/sharp/lib/index.js');
    if (fs.existsSync(siblingPath)) {
      const mod = await import(siblingPath);
      return mod.default || mod;
    }
  }
  throw new Error('Could not locate sharp. Run: npm install -D sharp');
}

async function main() {
  const svgPath = path.resolve(rootDir, 'public/nano-ui.svg');
  const outPath512 = path.resolve(rootDir, 'public/nano-ui-512.png');

  if (!fs.existsSync(svgPath)) {
    throw new Error(`SVG source not found at: ${svgPath}`);
  }

  // Instant check: If PNG exists and is up to date with SVG, return immediately (<1ms)
  if (fs.existsSync(outPath512)) {
    const svgStat = fs.statSync(svgPath);
    const pngStat = fs.statSync(outPath512);
    if (pngStat.mtimeMs >= svgStat.mtimeMs) {
      console.log('⚡ Icons already up to date, skipping generation.');
      return;
    }
  }

  let sharp;
  try {
    sharp = await getSharp();
  } catch (err) {
    if (fs.existsSync(outPath512)) {
      console.warn(`⚠️ ${err.message}. Using existing ${outPath512}.`);
      return;
    }
    throw err;
  }

  console.log('Generating 512x512 Open Graph & app icon from public/nano-ui.svg...');
  await sharp(svgPath)
    .resize(512, 512)
    .png()
    .toFile(outPath512);

  console.log(`✅ Successfully generated: ${outPath512}`);
}

main().catch(err => {
  console.error('Error generating icons:', err.message);
  process.exit(1);
});
