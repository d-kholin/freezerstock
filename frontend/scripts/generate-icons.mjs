/**
 * Generates PWA icons from the SVG source at public/icon.svg.
 * Outputs: public/icon-{192,512}.png and public/icon-maskable-{192,512}.png
 */
import sharp from 'sharp';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const publicDir = path.join(__dirname, '..', 'public');
const svgPath = path.join(publicDir, 'icon.svg');

const svgContent = readFileSync(svgPath, 'utf8');
// Maskable: shift viewBox to add safe-area padding around the design
const maskableSvg = svgContent.replace(
  'viewBox="0 0 512 512"',
  'viewBox="-64 -64 640 640"'
);

const sizes = [192, 512];

for (const size of sizes) {
  await sharp(Buffer.from(svgContent))
    .resize(size, size)
    .png()
    .toFile(path.join(publicDir, `icon-${size}.png`));
  console.log(`Generated icon-${size}.png`);

  await sharp(Buffer.from(maskableSvg))
    .resize(size, size)
    .png()
    .toFile(path.join(publicDir, `icon-maskable-${size}.png`));
  console.log(`Generated icon-maskable-${size}.png`);
}
