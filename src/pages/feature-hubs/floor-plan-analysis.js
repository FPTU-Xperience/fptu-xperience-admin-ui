import { createWorker, PSM } from 'tesseract.js';
import workerPath from 'tesseract.js/dist/worker.min.js?url';
import corePath from 'tesseract.js-core/tesseract-core-lstm.wasm.js?url';

function convexOutline(points) {
  const sorted = points.sort(([x, y], [otherX, otherY]) => x - otherX || y - otherY);
  const half = (ordered) => {
    const result = [];
    for (const point of ordered) {
      while (result.length >= 2) {
        const [a, b] = result.slice(-2);
        const turn = (b[0] - a[0]) * (point[1] - a[1]) - (b[1] - a[1]) * (point[0] - a[0]);
        if (turn > 0) break;
        result.pop();
      }
      result.push(point);
    }
    return result.slice(0, -1);
  };
  const outline = [...half(sorted), ...half(sorted.reverse())];
  while (outline.length > 12) {
    let smallest = Infinity;
    let remove = 0;
    for (let i = 0; i < outline.length; i++) {
      const [a, b, c] = [outline.at(i - 1), outline[i], outline[(i + 1) % outline.length]];
      const triangle = Math.abs((b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]));
      if (triangle < smallest) { smallest = triangle; remove = i; }
    }
    outline.splice(remove, 1);
  }
  return outline;
}

function findEnclosures(canvas) {
  const { width, height } = canvas;
  const { data } = canvas.getContext('2d').getImageData(0, 0, width, height);
  const total = width * height;
  const ink = new Uint8Array(total);
  for (let i = 0; i < total; i++) {
    const offset = i * 4;
    const red = data[offset];
    const green = data[offset + 1];
    const blue = data[offset + 2];
    ink[i] = green < 145 || (red - green > 30 && green - blue > 15 && green < 213) ? 1 : 0;
  }
  const seen = new Uint8Array(total);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = y * width + x;
      seen[i] = ink[i] || (x > 0 && ink[i - 1]) || (x + 1 < width && ink[i + 1])
        || ink[i - width] || ink[i + width] ? 1 : 0;
    }
  }
  const queue = new Int32Array(total);
  const regions = [];
  const visit = (index, tail) => {
    if (seen[index]) return tail;
    seen[index] = 1;
    queue[tail] = index;
    return tail + 1;
  };
  for (let start = 0; start < total; start++) {
    if (seen[start]) continue;
    const rows = new Map();
    let tail = visit(start, 0);
    let left = width, right = 0, top = height, bottom = 0;
    for (let head = 0; head < tail; head++) {
      const index = queue[head];
      const x = index % width;
      const y = Math.floor(index / width);
      left = Math.min(left, x); right = Math.max(right, x);
      top = Math.min(top, y); bottom = Math.max(bottom, y);
      const extent = rows.get(y);
      if (extent) {
        extent[0] = Math.min(extent[0], x);
        extent[1] = Math.max(extent[1], x);
      } else rows.set(y, [x, x]);
      if (x > 0) tail = visit(index - 1, tail);
      if (x + 1 < width) tail = visit(index + 1, tail);
      if (y > 0) tail = visit(index - width, tail);
      if (y + 1 < height) tail = visit(index + width, tail);
    }
    if (left === 0 || top === 0 || right === width - 1 || bottom === height - 1) continue;
    if (tail < Math.max(90, total * 0.00035) || tail > total * 0.25
      || right - left < 12 || bottom - top < 12 || tail < (right - left) * (bottom - top) * 0.26) continue;
    const polygon = convexOutline([...rows.entries()].flatMap(([y, [min, max]]) => [[min, y], [max, y]]));
    if (polygon.length >= 3) regions.push({ left, right, top, bottom, polygon });
  }
  return regions.sort((a, b) => a.top - b.top || a.left - b.left).slice(0, 200);
}

async function readRoomCodes(canvas, regions) {
  const image = canvas.toDataURL('image/png');
  const langPath = new URL('floor-plan-ocr', new URL(import.meta.env.BASE_URL, window.location.href)).href;
  const worker = await new Promise((resolve, reject) => {
    createWorker('eng+vie', 1, { workerPath, corePath, langPath, workerBlobURL: false, errorHandler: reject })
      .then(resolve, reject);
  });
  try {
    await worker.setParameters({ tessedit_pageseg_mode: PSM.SINGLE_BLOCK });
    const codes = [];
    for (const { left, top, right, bottom } of regions) {
      const rectangle = { left, top, width: right - left + 1, height: bottom - top + 1 };
      const { data } = await worker.recognize(image, { rectangle });
      codes.push(data.confidence >= 35 ? roomLabel(data.text) : '');
    }
    return codes;
  } finally {
    await worker.terminate();
  }
}

function roomLabel(label) {
  const text = label.toUpperCase().normalize('NFD').replace(/\p{M}/gu, '');
  const code = text.match(/\b(NVH|NUH|LB)[\s-]*(\d{2,4})\b/);
  if (code) return code[1] === 'LB' ? `LB${code[2]}` : `NVH-${code[2]}`;
  const auditorium = text.match(/\bHOI\s+TRUONG\s*([A-Z])?\b/);
  if (auditorium) return auditorium[1] ? `HT-${auditorium[1]}` : 'HOI-TRUONG';
  return text.match(/\b[A-Z]?\d{3,4}\b/)?.[0] || '';
}

export async function analyzeFloorPlan(canvas) {
  const regions = findEnclosures(canvas);
  if (!regions.length) return { rooms: [], textAvailable: true };
  let detectedCodes = [];
  let textAvailable = true;
  try { detectedCodes = await readRoomCodes(canvas, regions); }
  catch { textAvailable = false; }
  const codes = new Set();
  const rooms = regions.map((region, index) => {
    const detected = detectedCodes[index] || '';
    const code = codes.has(detected) ? '' : detected;
    if (code) codes.add(code);
    const hall = code.startsWith('HT-') || code === 'HOI-TRUONG';
    return {
      candidateId: index + 1, code, name: code ? (hall ? `Hội trường${code.startsWith('HT-') ? ` ${code.slice(3)}` : ''}` : `Phòng ${code}`) : '',
      type: hall ? 'Hội trường' : 'Phòng', capacity: 0, isBookable: false,
      planX: Math.round(50 * (region.left + region.right) / canvas.width),
      planY: Math.round(50 * (region.top + region.bottom) / canvas.height),
      planArea: region.polygon.map(([x, y]) => `${(100 * x / canvas.width).toFixed(2)},${(100 * y / canvas.height).toFixed(2)}`).join(' '),
    };
  });
  return { rooms, textAvailable };
}
