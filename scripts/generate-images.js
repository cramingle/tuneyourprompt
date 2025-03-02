const fs = require('fs');
const path = require('path');
const { createCanvas, loadImage } = require('canvas');
const svg2img = require('svg2img');

const sizes = [
  { name: 'favicon-16x16.png', size: 16 },
  { name: 'favicon-32x32.png', size: 32 },
  { name: 'apple-touch-icon.png', size: 180 },
  { name: 'icon-192.png', size: 192 },
  { name: 'icon-512.png', size: 512 },
  { name: 'og-image.jpg', size: [1200, 630] }
];

const imgDir = path.join(__dirname, '..', 'public', 'img');

// Ensure the directory exists
if (!fs.existsSync(imgDir)) {
  fs.mkdirSync(imgDir, { recursive: true });
}

// Convert favicon SVG to various PNG sizes
const faviconSvg = fs.readFileSync(path.join(imgDir, 'favicon.svg'), 'utf8');

sizes.forEach(({ name, size }) => {
  if (name === 'og-image.jpg') {
    // Handle OG image separately
    const ogSvg = fs.readFileSync(path.join(imgDir, 'og-image.svg'), 'utf8');
    svg2img(ogSvg, { width: size[0], height: size[1] }, (error, buffer) => {
      if (error) {
        console.error(`Error generating ${name}:`, error);
        return;
      }
      fs.writeFileSync(path.join(imgDir, name), buffer);
      console.log(`Generated ${name}`);
    });
  } else {
    // Generate favicon in different sizes
    svg2img(faviconSvg, { width: size, height: size }, (error, buffer) => {
      if (error) {
        console.error(`Error generating ${name}:`, error);
        return;
      }
      fs.writeFileSync(path.join(imgDir, name), buffer);
      console.log(`Generated ${name}`);
    });
  }
});

console.log('Image generation script completed'); 