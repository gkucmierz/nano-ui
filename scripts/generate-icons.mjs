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
  const sharp = await getSharp();
  const svgPath = path.resolve(rootDir, 'public/logo.svg');
  const outPath512 = path.resolve(rootDir, 'public/logo-512.png');

  if (!fs.existsSync(svgPath)) {
    throw new Error(`SVG source not found at: ${svgPath}`);
  }

  console.log('Generating 512x512 Open Graph & app icon from public/logo.svg...');
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
