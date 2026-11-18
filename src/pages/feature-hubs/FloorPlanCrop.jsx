import { useRef } from 'react';
import { Button, Field } from '../../components/ui/index.js';
import { wholeImage } from './floor-plan-crop.js';

const labels = { left: 'Trái', top: 'Trên', right: 'Phải', bottom: 'Dưới' };

export default function FloorPlanCrop({ imageUrl, crop, onChange, onAnalyze }) {
  const start = useRef(null);
  function point(event) {
    const bounds = event.currentTarget.getBoundingClientRect();
    const percent = (value, size) => Math.max(0, Math.min(100, Math.round(1000 * value / size) / 10));
    return { x: percent(event.clientX - bounds.left, bounds.width), y: percent(event.clientY - bounds.top, bounds.height) };
  }

  return (
    <div className="booking-admin-crop">
      <strong>Cắt ảnh sơ đồ</strong>
      <small>Kéo để chọn phần sơ đồ, bỏ khung trang và chú thích bên ngoài.</small>
      <div className="booking-admin-crop-stage"
        onPointerDown={(event) => {
          if (event.button !== 0) return;
          start.current = point(event);
          event.currentTarget.setPointerCapture(event.pointerId);
        }}
        onPointerMove={(event) => {
          if (!start.current) return;
          const end = point(event);
          if (Math.abs(end.x - start.current.x) < 2 || Math.abs(end.y - start.current.y) < 2) return;
          onChange({
            left: Math.min(start.current.x, end.x), right: Math.max(start.current.x, end.x),
            top: Math.min(start.current.y, end.y), bottom: Math.max(start.current.y, end.y),
          });
        }}
        onPointerUp={() => { start.current = null; }}
        onPointerCancel={() => { start.current = null; }}>
        <img src={imageUrl} alt="Ảnh sơ đồ để cắt" draggable={false} />
        <div className="booking-admin-crop-frame" aria-hidden="true" style={{
          left: `${crop.left}%`, top: `${crop.top}%`,
          width: `${crop.right - crop.left}%`, height: `${crop.bottom - crop.top}%`,
        }} />
      </div>
      <div className="booking-admin-fields-grid">
        {Object.entries(labels).map(([edge, label]) => (
          <Field key={edge} label={`${label} (%)`}>
            <input type="number" min="0" max="100" step="0.1" value={crop[edge]}
              onChange={(event) => onChange({ ...crop, [edge]: event.target.valueAsNumber || 0 })} />
          </Field>
        ))}
      </div>
      <div className="booking-admin-row">
        <Button type="button" onClick={() => onChange(wholeImage)}>Đặt lại</Button>
        <Button type="button" onClick={onAnalyze}>Cắt và phân tích sơ đồ</Button>
      </div>
    </div>
  );
}
