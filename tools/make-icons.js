// Genera los iconos PNG de la PWA a partir de un SVG dibujado a mano.
// Uso: node tools/make-icons.js   (no necesita dependencias: escribe el PNG a mano)

const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const OUT = path.join(__dirname, '..', 'icons');
const BG = [0x16, 0x28, 0x3a];
const LEAF = [0x3c, 0xc2, 0x83];
const LEAF_DARK = [0x1f, 0x6e, 0x4c];

// Distancia de un punto al segmento AB, para dibujar el tallo con grosor.
function distToSegment(px, py, ax, ay, bx, by) {
  const dx = bx - ax;
  const dy = by - ay;
  const t = Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / (dx * dx + dy * dy)));
  return Math.hypot(px - (ax + t * dx), py - (ay + t * dy));
}

// Hoja: dos arcos de círculo que se cruzan (forma de lente inclinada).
function inLeaf(x, y, s) {
  const cx = 0.5 * s;
  const cy = 0.5 * s;
  const a = (x - cx) * Math.SQRT1_2 + (y - cy) * Math.SQRT1_2;
  const b = -(x - cx) * Math.SQRT1_2 + (y - cy) * Math.SQRT1_2;
  const r = 0.30 * s;
  const d1 = Math.hypot(a - 0.11 * s, b);
  const d2 = Math.hypot(a + 0.11 * s, b);
  return d1 < r && d2 < r;
}

function pixels(size, maskable) {
  const pad = maskable ? 0.14 * size : 0;
  const s = size - pad * 2;
  const rows = [];
  const radius = maskable ? size / 2 : size * 0.22;
  for (let y = 0; y < size; y += 1) {
    const row = Buffer.alloc(size * 4);
    for (let x = 0; x < size; x += 1) {
      const i = x * 4;
      const inside = maskable ? true : roundedRect(x, y, size, radius);
      if (!inside) { row.writeUInt32BE(0, i); continue; }
      let color = BG;
      const lx = (x - pad) / s * size;
      const ly = (y - pad) / s * size;
      if (inLeaf(lx, ly, size)) color = LEAF;
      // Nervadura central de la hoja.
      const stem = distToSegment(lx, ly, size * 0.32, size * 0.68, size * 0.68, size * 0.32);
      if (stem < size * 0.018 && inLeaf(lx, ly, size)) color = LEAF_DARK;
      row[i] = color[0]; row[i + 1] = color[1]; row[i + 2] = color[2]; row[i + 3] = 255;
    }
    rows.push(row);
  }
  return rows;
}

function roundedRect(x, y, size, r) {
  const cx = Math.min(Math.max(x, r), size - r);
  const cy = Math.min(Math.max(y, r), size - r);
  return Math.hypot(x - cx, y - cy) <= r;
}

function png(size, rows) {
  const raw = Buffer.concat(rows.map((row) => Buffer.concat([Buffer.from([0]), row])));
  const idat = zlib.deflateSync(raw, { level: 9 });
  const chunks = [Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])];
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; ihdr[9] = 6; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;
  chunks.push(chunk('IHDR', ihdr), chunk('IDAT', idat), chunk('IEND', Buffer.alloc(0)));
  return Buffer.concat(chunks);
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body) >>> 0);
  return Buffer.concat([len, body, crc]);
}

let table = null;
function crc32(buf) {
  if (!table) {
    table = new Int32Array(256);
    for (let n = 0; n < 256; n += 1) {
      let c = n;
      for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
      table[n] = c;
    }
  }
  let c = -1;
  for (let i = 0; i < buf.length; i += 1) c = table[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return c ^ -1;
}

fs.mkdirSync(OUT, { recursive: true });
const targets = [
  { file: 'icon-192.png', size: 192, maskable: false },
  { file: 'icon-512.png', size: 512, maskable: false },
  { file: 'icon-maskable-512.png', size: 512, maskable: true },
];
for (const t of targets) {
  fs.writeFileSync(path.join(OUT, t.file), png(t.size, pixels(t.size, t.maskable)));
  console.log('escrito', t.file);
}
