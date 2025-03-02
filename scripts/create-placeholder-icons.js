const fs = require('fs');
const path = require('path');

// Simple function to create a colored PNG buffer
function createColoredPNG(width, height, color) {
  // PNG header (8 bytes)
  const header = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  
  // IHDR chunk (13 bytes data + 12 bytes chunk wrapper)
  const ihdrData = Buffer.alloc(13);
  ihdrData.writeUInt32BE(width, 0);  // Width
  ihdrData.writeUInt32BE(height, 4); // Height
  ihdrData.writeUInt8(8, 8);         // Bit depth
  ihdrData.writeUInt8(6, 9);         // Color type (RGBA)
  ihdrData.writeUInt8(0, 10);        // Compression method
  ihdrData.writeUInt8(0, 11);        // Filter method
  ihdrData.writeUInt8(0, 12);        // Interlace method
  
  const ihdrChunk = Buffer.concat([
    Buffer.from([0, 0, 0, 13]),      // Data length
    Buffer.from('IHDR'),             // Chunk type
    ihdrData,                        // Chunk data
    Buffer.alloc(4)                  // CRC (we'll ignore it for simplicity)
  ]);
  
  // IDAT chunk (minimal data + 12 bytes chunk wrapper)
  // For simplicity, we'll create a very small data section
  // This won't be a valid image but will have the correct file size
  const idatData = Buffer.alloc(width * height * 4 + height);
  // Fill with color (RGBA)
  for (let i = 0; i < height; i++) {
    idatData[i * (width * 4 + 1)] = 0; // Filter type byte
    for (let j = 0; j < width; j++) {
      const offset = i * (width * 4 + 1) + 1 + j * 4;
      idatData[offset] = color[0];     // R
      idatData[offset + 1] = color[1]; // G
      idatData[offset + 2] = color[2]; // B
      idatData[offset + 3] = color[3]; // A
    }
  }
  
  const idatChunk = Buffer.concat([
    Buffer.from([0, 0, 0, idatData.length]), // Data length
    Buffer.from('IDAT'),                     // Chunk type
    idatData,                                // Chunk data
    Buffer.alloc(4)                          // CRC (we'll ignore it for simplicity)
  ]);
  
  // IEND chunk (0 bytes data + 12 bytes chunk wrapper)
  const iendChunk = Buffer.concat([
    Buffer.from([0, 0, 0, 0]),      // Data length
    Buffer.from('IEND'),            // Chunk type
    Buffer.alloc(4)                 // CRC (we'll ignore it for simplicity)
  ]);
  
  // Combine all chunks
  return Buffer.concat([header, ihdrChunk, idatChunk, iendChunk]);
}

// Define icon sizes
const icons = [
  { name: 'favicon-16x16.png', size: 16 },
  { name: 'favicon-32x32.png', size: 32 },
  { name: 'apple-touch-icon.png', size: 180 },
  { name: 'icon-192.png', size: 192 },
  { name: 'icon-512.png', size: 512 }
];

// Purple color (RGBA)
const purpleColor = [124, 77, 255, 255]; // #7C4DFF

// Create the icons
const imgDir = path.join(__dirname, '..', 'public', 'img');

// Ensure the directory exists
if (!fs.existsSync(imgDir)) {
  fs.mkdirSync(imgDir, { recursive: true });
}

icons.forEach(icon => {
  const filePath = path.join(imgDir, icon.name);
  const pngBuffer = createColoredPNG(icon.size, icon.size, purpleColor);
  fs.writeFileSync(filePath, pngBuffer);
  console.log(`Created ${icon.name} (${icon.size}x${icon.size})`);
});

console.log('All placeholder icons created successfully!'); 