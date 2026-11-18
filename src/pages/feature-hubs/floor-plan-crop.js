export const wholeImage = { left: 0, top: 0, right: 100, bottom: 100 };

export function remapRoomToCrop(room, crop) {
  const horizontal = (x) => 100 * (x - crop.left) / (crop.right - crop.left);
  const vertical = (y) => 100 * (y - crop.top) / (crop.bottom - crop.top);
  const remap = (area) => area?.split(' ').map((pair) => {
    const [x, y] = pair.split(',').map(Number);
    return `${horizontal(x).toFixed(2)},${vertical(y).toFixed(2)}`;
  }).join(' ');
  return {
    ...room,
    planX: Math.round(horizontal(room.planX)),
    planY: Math.round(vertical(room.planY)),
    planArea: remap(room.planArea),
    planAreasByFloor: room.planAreasByFloor && Object.fromEntries(
      Object.entries(room.planAreasByFloor).map(([floor, area]) => [floor, remap(area)]),
    ),
  };
}

export async function cropFloorPlan(file, crop) {
  if (Object.values(crop).some((edge) => !Number.isFinite(edge) || edge < 0 || edge > 100)) {
    throw new Error('Tọa độ cắt ảnh phải nằm trong khoảng 0–100%.');
  }
  const image = await createImageBitmap(file);
  try {
    const x = Math.round(image.width * crop.left / 100);
    const y = Math.round(image.height * crop.top / 100);
    const width = Math.round(image.width * crop.right / 100) - x;
    const height = Math.round(image.height * crop.bottom / 100) - y;
    if (width < 32 || height < 32) throw new Error('Vùng cắt quá nhỏ. Hãy chọn lại vùng chứa sơ đồ.');
    const scale = Math.min(1, 2400 / Math.max(width, height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(width * scale);
    canvas.height = Math.round(height * scale);
    const context = canvas.getContext('2d');
    context.fillStyle = '#fff';
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.drawImage(image, x, y, width, height, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.94));
    if (!blob) throw new Error('Không tạo được ảnh đã cắt.');
    return { blob, canvas };
  } finally {
    image.close();
  }
}
