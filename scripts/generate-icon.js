const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const buildDir = path.join(__dirname, '../build');
if (!fs.existsSync(buildDir)) {
  fs.mkdirSync(buildDir, { recursive: true });
}

// 1. Create SVG Icon
const svg = `
<svg width="256" height="256" viewBox="0 0 256 256" xmlns="http://www.w3.org/2000/svg">
  <rect width="256" height="256" rx="48" fill="#1A1A1A"/>
  <rect x="24" y="24" width="208" height="208" rx="36" fill="#242424" stroke="#D8C8B2" stroke-width="4"/>
  <!-- Exposed Brick Block -->
  <rect x="56" y="56" width="68" height="68" rx="8" fill="#A64B36"/>
  <!-- Concrete Block -->
  <rect x="132" y="56" width="68" height="68" rx="8" fill="#A8A39B"/>
  <!-- Charcoal Block -->
  <rect x="56" y="132" width="68" height="68" rx="8" fill="#D8C8B2"/>
  <!-- Terracotta Block with BT Initial -->
  <rect x="132" y="132" width="68" height="68" rx="8" fill="#A64B36"/>
  <text x="128" y="234" font-family="monospace" font-size="20" font-weight="900" fill="#F4F0E8" text-anchor="middle" letter-spacing="4">BLOCK THEORY</text>
</svg>
`;
fs.writeFileSync(path.join(buildDir, 'icon.svg'), svg.trim());

// 2. Generate pure PNG (256x256 RGBA)
function createPng(width, height) {
  // Simple uncompressed PNG generator
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  // IHDR
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // color type RGBA
  ihdr[10] = 0; // compression
  ihdr[11] = 0; // filter
  ihdr[12] = 0; // interlace

  function makeChunk(type, data) {
    const len = data.length;
    const buf = Buffer.alloc(4 + 4 + len + 4);
    buf.writeUInt32BE(len, 0);
    buf.write(type, 4);
    data.copy(buf, 8);

    // CRC32
    const crc = crc32(Buffer.concat([Buffer.from(type), data]));
    buf.writeUInt32BE(crc, 8 + len);
    return buf;
  }

  // Generate pixels
  const rawData = Buffer.alloc(height * (width * 4 + 1));
  let offset = 0;

  for (let y = 0; y < height; y++) {
    rawData[offset++] = 0; // Filter type 0
    for (let x = 0; x < width; x++) {
      // Draw industrial icon pattern
      const margin = 20;
      const isBorder = x < margin || x >= width - margin || y < margin || y >= height - margin;

      let r = 26, g = 26, b = 26, a = 255; // #1A1A1A background

      if (!isBorder) {
        // Inner frame
        const mid = 128;
        const pad = 10;
        const boxSize = 70;

        if (x >= 50 && x <= 50 + boxSize && y >= 50 && y <= 50 + boxSize) {
          // Top Left: Terracotta Brick #A64B36
          r = 166; g = 75; b = 54;
        } else if (x >= 136 && x <= 136 + boxSize && y >= 50 && y <= 50 + boxSize) {
          // Top Right: Concrete #A8A39B
          r = 168; g = 163; b = 155;
        } else if (x >= 50 && x <= 50 + boxSize && y >= 136 && y <= 136 + boxSize) {
          // Bottom Left: Warm Beige #D8C8B2
          r = 216; g = 200; b = 178;
        } else if (x >= 136 && x <= 136 + boxSize && y >= 136 && y <= 136 + boxSize) {
          // Bottom Right: Brick Accent #A64B36
          r = 166; g = 75; b = 54;
        }
      }

      rawData[offset++] = r;
      rawData[offset++] = g;
      rawData[offset++] = b;
      rawData[offset++] = a;
    }
  }

  const compressed = zlib.deflateSync(rawData);
  const ihdrChunk = makeChunk('IHDR', ihdr);
  const idatChunk = makeChunk('IDAT', compressed);
  const iendChunk = makeChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([signature, ihdrChunk, idatChunk, iendChunk]);
}

// CRC32 table
const crcTable = [];
for (let n = 0; n < 256; n++) {
  let c = n;
  for (let k = 0; k < 8; k++) {
    c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  }
  crcTable[n] = c;
}

function crc32(buf) {
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    crc = crcTable[(crc ^ buf[i]) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

const pngBuffer = createPng(256, 256);
fs.writeFileSync(path.join(buildDir, 'icon.png'), pngBuffer);

// 3. Generate .ico wrapping the PNG buffer
const icoHeader = Buffer.alloc(6);
icoHeader.writeUInt16LE(0, 0); // reserved
icoHeader.writeUInt16LE(1, 2); // type 1 = ICO
icoHeader.writeUInt16LE(1, 4); // count 1

const icoEntry = Buffer.alloc(16);
icoEntry.writeUInt8(0, 0); // 256px = 0
icoEntry.writeUInt8(0, 1); // 256px = 0
icoEntry.writeUInt8(0, 2); // colors
icoEntry.writeUInt8(0, 3); // reserved
icoEntry.writeUInt16LE(1, 4); // planes
icoEntry.writeUInt16LE(32, 6); // bpp
icoEntry.writeUInt32LE(pngBuffer.length, 8); // size
icoEntry.writeUInt32LE(6 + 16, 12); // offset

const icoBuffer = Buffer.concat([icoHeader, icoEntry, pngBuffer]);
fs.writeFileSync(path.join(buildDir, 'icon.ico'), icoBuffer);

console.log('✓ Successfully generated build/icon.png, build/icon.ico, build/icon.svg');

