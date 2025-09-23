import { PNG } from 'pngjs';
import { createWriteStream } from 'node:fs';
import { resolve } from 'node:path';

const outDir = resolve('public', 'assets');

const palettes = {
  transparent: [0, 0, 0, 0],
};

function parseColor(color) {
  if (!color) return palettes.transparent;
  if (Array.isArray(color)) return color;
  const hex = color.replace('#', '').trim();
  const value = hex.length === 6 ? `${hex}ff` : hex.length === 8 ? hex : null;
  if (!value) throw new Error(`Unsupported color format: ${color}`);
  const r = parseInt(value.slice(0, 2), 16);
  const g = parseInt(value.slice(2, 4), 16);
  const b = parseInt(value.slice(4, 6), 16);
  const a = parseInt(value.slice(6, 8), 16);
  return [r, g, b, a];
}

function setPixel(png, x, y, color) {
  if (x < 0 || y < 0 || x >= png.width || y >= png.height) return;
  const [r, g, b, a] = parseColor(color);
  const idx = (png.width * y + x) << 2;
  png.data[idx] = r;
  png.data[idx + 1] = g;
  png.data[idx + 2] = b;
  png.data[idx + 3] = a;
}

function fillRect(png, x0, y0, x1, y1, color) {
  const [minX, maxX] = [Math.max(0, Math.floor(x0)), Math.min(png.width - 1, Math.floor(x1))];
  const [minY, maxY] = [Math.max(0, Math.floor(y0)), Math.min(png.height - 1, Math.floor(y1))];
  for (let y = minY; y <= maxY; y += 1) {
    for (let x = minX; x <= maxX; x += 1) {
      setPixel(png, x, y, color);
    }
  }
}

function drawCircle(png, cx, cy, radius, color) {
  const r2 = radius * radius;
  const xStart = Math.floor(cx - radius) - 1;
  const xEnd = Math.ceil(cx + radius) + 1;
  const yStart = Math.floor(cy - radius) - 1;
  const yEnd = Math.ceil(cy + radius) + 1;
  for (let y = yStart; y <= yEnd; y += 1) {
    for (let x = xStart; x <= xEnd; x += 1) {
      const dx = x + 0.5 - cx;
      const dy = y + 0.5 - cy;
      if (dx * dx + dy * dy <= r2) {
        setPixel(png, x, y, color);
      }
    }
  }
}

function drawDiamond(png, cx, cy, radius, color) {
  for (let y = Math.floor(cy - radius); y <= Math.ceil(cy + radius); y += 1) {
    const rowRadius = radius - Math.abs(y - cy);
    const xMin = Math.floor(cx - rowRadius);
    const xMax = Math.ceil(cx + rowRadius);
    for (let x = xMin; x <= xMax; x += 1) {
      setPixel(png, x, y, color);
    }
  }
}

function drawLine(png, x0, y0, x1, y1, color) {
  const dx = Math.abs(x1 - x0);
  const dy = Math.abs(y1 - y0);
  const sx = x0 < x1 ? 1 : -1;
  const sy = y0 < y1 ? 1 : -1;
  let err = dx - dy;
  let x = x0;
  let y = y0;
  while (true) {
    setPixel(png, x, y, color);
    if (x === x1 && y === y1) break;
    const e2 = err * 2;
    if (e2 > -dy) {
      err -= dy;
      x += sx;
    }
    if (e2 < dx) {
      err += dx;
      y += sy;
    }
  }
}

function createFloorWall() {
  const png = new PNG({ width: 32, height: 16 });

  // Floor tile on the left
  const floorPalette = ['#15343d', '#1d3d48', '#254550', '#1a2e34'];
  for (let y = 0; y < 16; y += 1) {
    for (let x = 0; x < 16; x += 1) {
      const idx = (x % 4 + y % 4) % floorPalette.length;
      setPixel(png, x, y, floorPalette[idx]);
    }
  }
  // Subtle highlights and cracks
  for (let y = 3; y < 16; y += 6) {
    for (let x = 1; x < 15; x += 1) {
      setPixel(png, x, y, '#2d5460');
    }
  }
  for (let y = 6; y < 16; y += 7) {
    for (let x = 0; x < 16; x += 1) {
      if ((x + y) % 5 === 0) setPixel(png, x, y, '#0a1c20');
    }
  }

  // Wall tile on the right
  for (let y = 0; y < 16; y += 1) {
    for (let x = 16; x < 32; x += 1) {
      setPixel(png, x, y, '#211b2d');
    }
  }
  const mortarColor = '#120c1d';
  for (let row = 0; row < 3; row += 1) {
    const top = row * 5 + 1;
    const bottom = top + 2;
    for (let y = top; y <= bottom; y += 1) {
      for (let x = 16; x < 32; x += 1) {
        const isMortar = y === top || y === bottom;
        if (isMortar) {
          setPixel(png, x, y, mortarColor);
        } else {
          const localX = x - 16;
          const offset = row % 2 === 0 ? 0 : 4;
          const brick = ((localX + offset) % 8) < 6;
          const shade = brick ? '#3a324b' : '#2c243b';
          setPixel(png, x, y, shade);
        }
      }
    }
  }
  for (let y = 0; y < 16; y += 1) {
    for (let x = 16; x < 32; x += 1) {
      if ((x + y) % 7 === 0) setPixel(png, x, y, '#463b5a');
    }
  }

  return png;
}

function drawPlayer(tile, offsetX) {
  const baseX = offsetX;
  drawCircle(tile, baseX + 8, 6, 5, '#3c6dd9');
  drawCircle(tile, baseX + 8, 6, 3.5, '#558aff');
  drawCircle(tile, baseX + 8, 6, 2, '#7fb0ff');
  fillRect(tile, baseX + 4, 8, baseX + 11, 13, '#1f2f4f');
  fillRect(tile, baseX + 6, 9, baseX + 9, 12, '#1b2641');
  setPixel(tile, baseX + 7, 6, '#ffe3c4');
  setPixel(tile, baseX + 9, 6, '#ffe3c4');
  setPixel(tile, baseX + 7, 7, '#1b2641');
  setPixel(tile, baseX + 9, 7, '#1b2641');
  drawLine(tile, baseX + 6, 12, baseX + 6, 15, '#14202f');
  drawLine(tile, baseX + 10, 12, baseX + 10, 15, '#14202f');
  setPixel(tile, baseX + 8, 10, '#213557');
  setPixel(tile, baseX + 8, 11, '#2d4673');
}

function drawKey(tile, offsetX) {
  const baseX = offsetX;
  drawCircle(tile, baseX + 4.5, 8, 3, '#f6d268');
  drawCircle(tile, baseX + 4.5, 8, 2, '#ffe8a2');
  fillRect(tile, baseX + 7, 7, baseX + 13, 9, '#e8c05a');
  fillRect(tile, baseX + 12, 7, baseX + 13, 12, '#c6942d');
  fillRect(tile, baseX + 11, 9, baseX + 12, 10, '#c6942d');
  setPixel(tile, baseX + 3, 6, '#9d6f21');
  setPixel(tile, baseX + 13, 11, '#6b4714');
}

function drawDoor(tile, offsetX) {
  const baseX = offsetX;
  fillRect(tile, baseX + 3, 2, baseX + 12, 13, '#7b4521');
  fillRect(tile, baseX + 4, 3, baseX + 11, 12, '#93582b');
  fillRect(tile, baseX + 4, 7, baseX + 11, 8, '#6a3716');
  setPixel(tile, baseX + 10, 8, '#6a3716');
  setPixel(tile, baseX + 11, 8, '#dca65b');
  drawLine(tile, baseX + 3, 2, baseX + 12, 2, '#53270f');
  drawLine(tile, baseX + 3, 13, baseX + 12, 13, '#53270f');
  drawLine(tile, baseX + 3, 2, baseX + 3, 13, '#35170a');
  drawLine(tile, baseX + 12, 2, baseX + 12, 13, '#35170a');
}

function drawStairsUp(tile, offsetX) {
  const baseX = offsetX;
  fillRect(tile, baseX + 2, 4, baseX + 13, 13, '#edf1f7');
  for (let step = 0; step < 5; step += 1) {
    const topY = 5 + step * 2;
    drawLine(tile, baseX + 3, topY, baseX + 12, topY, '#cdd2de');
  }
  for (let i = 0; i < 5; i += 1) {
    const x = baseX + 4 + i * 2;
    drawLine(tile, x, 5, x, 12, '#b5bbca');
  }
  fillRect(tile, baseX + 2, 12, baseX + 13, 13, '#c3c9d8');
}

function drawEnemy(tile, offsetX) {
  const baseX = offsetX;
  drawCircle(tile, baseX + 8, 8, 6, '#d84646');
  drawCircle(tile, baseX + 8, 8, 4.5, '#f05b5b');
  setPixel(tile, baseX + 5, 4, '#f9d8c6');
  setPixel(tile, baseX + 11, 4, '#f9d8c6');
  drawLine(tile, baseX + 4, 3, baseX + 5, 4, '#a32d2d');
  drawLine(tile, baseX + 11, 4, baseX + 12, 3, '#a32d2d');
  setPixel(tile, baseX + 6, 8, '#320909');
  setPixel(tile, baseX + 10, 8, '#320909');
  drawLine(tile, baseX + 6, 10, baseX + 10, 10, '#320909');
  setPixel(tile, baseX + 7, 6, '#ffe493');
  setPixel(tile, baseX + 9, 6, '#ffe493');
}

function drawSword(tile, offsetX) {
  const baseX = offsetX;
  drawLine(tile, baseX + 8, 2, baseX + 8, 11, '#e4ecf6');
  drawLine(tile, baseX + 7, 3, baseX + 7, 10, '#b9c4d8');
  drawLine(tile, baseX + 9, 3, baseX + 9, 10, '#ffffff');
  fillRect(tile, baseX + 6, 11, baseX + 10, 12, '#c9944f');
  fillRect(tile, baseX + 7, 12, baseX + 9, 14, '#5c4120');
  setPixel(tile, baseX + 8, 2, '#ffffff');
}

function drawShield(tile, offsetX) {
  const baseX = offsetX;
  drawCircle(tile, baseX + 8, 8, 6, '#4a6cbb');
  drawCircle(tile, baseX + 8, 8, 5, '#6f8fd6');
  drawDiamond(tile, baseX + 8, 8, 3, '#b9c9ef');
  setPixel(tile, baseX + 8, 8, '#e8eefc');
}

function drawGem(tile, offsetX) {
  const baseX = offsetX;
  drawDiamond(tile, baseX + 8, 8, 5, '#47c7a1');
  drawDiamond(tile, baseX + 8, 8, 4, '#6ae0bd');
  drawDiamond(tile, baseX + 8, 8, 3, '#9df5d9');
  drawLine(tile, baseX + 6, 8, baseX + 10, 8, '#34a783');
  drawLine(tile, baseX + 8, 6, baseX + 8, 10, '#34a783');
}

function drawPotion(tile, offsetX) {
  const baseX = offsetX;
  drawCircle(tile, baseX + 8, 9, 5, '#dcdff0');
  drawCircle(tile, baseX + 8, 9, 4, '#efeef7');
  fillRect(tile, baseX + 6, 3, baseX + 10, 5, '#dcdff0');
  fillRect(tile, baseX + 7, 2, baseX + 9, 3, '#c9cddd');
  fillRect(tile, baseX + 6, 9, baseX + 10, 12, '#b784ff');
  fillRect(tile, baseX + 6, 11, baseX + 10, 12, '#9d5df0');
  setPixel(tile, baseX + 7, 4, '#b3b8cc');
  setPixel(tile, baseX + 9, 4, '#b3b8cc');
}

function drawEvent(tile, offsetX) {
  const baseX = offsetX;
  fillRect(tile, baseX + 3, 3, baseX + 12, 12, '#f1dfbb');
  drawLine(tile, baseX + 4, 4, baseX + 11, 4, '#e3cfa0');
  drawLine(tile, baseX + 4, 11, baseX + 11, 11, '#e3cfa0');
  drawLine(tile, baseX + 3, 3, baseX + 3, 12, '#c9aa77');
  drawLine(tile, baseX + 12, 3, baseX + 12, 12, '#c9aa77');
  const q = [
    [baseX + 6, 6],
    [baseX + 7, 5],
    [baseX + 8, 5],
    [baseX + 9, 6],
    [baseX + 9, 7],
    [baseX + 8, 8],
    [baseX + 8, 9],
  ];
  for (const [x, y] of q) setPixel(tile, x, y, '#7c4adb');
  setPixel(tile, baseX + 8, 11, '#7c4adb');
  setPixel(tile, baseX + 8, 12, '#4c2e94');
}

function createSymbolTiles() {
  const png = new PNG({ width: 160, height: 16 });
  // transparent background
  for (let y = 0; y < png.height; y += 1) {
    for (let x = 0; x < png.width; x += 1) {
      setPixel(png, x, y, palettes.transparent);
    }
  }

  const drawers = [
    drawPlayer,
    drawKey,
    drawDoor,
    drawStairsUp,
    drawEnemy,
    drawSword,
    drawShield,
    drawGem,
    drawPotion,
    drawEvent,
  ];

  drawers.forEach((fn, idx) => fn(png, idx * 16));

  return png;
}

function writePng(png, targetPath) {
  return new Promise((resolvePromise, reject) => {
    const stream = createWriteStream(targetPath);
    stream.on('finish', resolvePromise);
    stream.on('error', reject);
    png.pack().pipe(stream);
  });
}

async function main() {
  const floorWall = createFloorWall();
  const symbolTiles = createSymbolTiles();
  await writePng(floorWall, resolve(outDir, 'floor_wall.png'));
  await writePng(symbolTiles, resolve(outDir, 'symbol_tiles.png'));
  console.log('Pixel art assets regenerated.');
}

main().catch(err => {
  console.error(err);
  process.exitCode = 1;
});
