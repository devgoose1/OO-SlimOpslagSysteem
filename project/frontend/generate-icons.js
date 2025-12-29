import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Eenvoudige SVG icoon generator voor PWA
const sizes = [96, 128, 192, 256, 512];

const createSvgIcon = (size) => {
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
  <rect width="${size}" height="${size}" fill="#3b82f6" rx="${size * 0.15}"/>
  <text x="50%" y="50%" font-size="${size * 0.5}" fill="white" text-anchor="middle" dy="${size * 0.18}" font-family="Arial, sans-serif" font-weight="bold">OS</text>
</svg>`;
};

const iconsDir = path.join(__dirname, 'public', 'icons');

// Zorg dat de icons directory bestaat
if (!fs.existsSync(iconsDir)) {
  fs.mkdirSync(iconsDir, { recursive: true });
}

// Genereer SVG iconen voor alle sizes
sizes.forEach(size => {
  const svgContent = createSvgIcon(size);
  const filename = path.join(iconsDir, `icon-${size}x${size}.png.svg`);
  fs.writeFileSync(filename, svgContent);
  console.log(`✓ Gegenereerd: icon-${size}x${size}.png.svg`);
});

console.log('\n✅ PWA iconen gegenereerd!');
console.log('💡 Voor productie: converteer deze SVGs naar PNG met een tool zoals ImageMagick of online converters.');
console.log('   Of gebruik https://realfavicongenerator.net/ voor professionele iconen.\n');
