import { useEffect, useState, useRef } from 'react';
import api from '../services/api.js';
import { Check, Plus, Trash2, X, GripVertical, SlidersHorizontal } from 'lucide-react';
import { useAction } from '../hooks/useAction.js';
import { Button, Field, Modal, Panel } from '../components/ui/index.js';

const AXIS_MIN = 0;
const AXIS_MAX = 200;
const AXIS_STEP = 5;

const DEFAULT_NODES = [
  { id: 'n1', position: 0, label: 'Ngưỡng cơ bản', multiplier: 100 },
  { id: 'n2', position: 50, label: 'Ngưỡng trung bình', multiplier: 80 },
  { id: 'n3', position: 100, label: 'Ngưỡng cao', multiplier: 60 },
  { id: 'n4', position: 150, label: 'Ngưỡng xuất sắc', multiplier: 40 },
];

function clamp(val, min, max) {
  return Math.min(max, Math.max(min, val));
}

function snapToStep(val, step) {
  return Math.round(val / step) * step;
}

function getMultiplierAt(nodes, position) {
  const sorted = [...nodes].sort((a, b) => a.position - b.position);
  let active = sorted[0];
  for (const node of sorted) {
    if (position >= node.position) {
      active = node;
    } else {
      break;
    }
  }
  return active ? active.multiplier : 100;
}

function getRanges(nodes) {
  const sorted = [...nodes].sort((a, b) => a.position - b.position);
  const ranges = [];
  for (let i = 0; i < sorted.length; i++) {
    const current = sorted[i];
    const next = sorted[i + 1];
    ranges.push({
      from: current.position,
      to: next ? next.position : AXIS_MAX,
      multiplier: current.multiplier,
      label: current.label,
    });
  }
  return ranges;
}

// Tier colors - earthy, professional palette
const TIER_COLORS = [
  { bg: '#fef3e8', border: '#f5c99d', text: '#c25a1a', accent: '#ed641c' },
  { bg: '#fef9e8', border: '#f5e49c', text: '#a68c1a', accent: '#d4a50a' },
  { bg: '#e8f5e8', border: '#a8d4a9', text: '#2d7a3a', accent: '#358b6c' },
  { bg: '#e8f0f5', border: '#a8c8da', text: '#2a5a7a', accent: '#3a7a9a' },
];

export function BonusMatrix() {
  const run = useAction();
  const [nodes, setNodes] = useState(DEFAULT_NODES);
  const [selected, setSelected] = useState(null);
  const [editing, setEditing] = useState(null);
  const [addOpen, setAddOpen] = useState(false);
  const [dragId, setDragId] = useState(null);
  const [dragStart, setDragStart] = useState(null);
  const [saving, setSaving] = useState(false);
  const axisRef = useRef(null);

  useEffect(() => {
    async function load() {
      try {
        const res = await api.studentAffairs.bonusMatrix.list();
        const list = Array.isArray(res) ? res : res?.items || [];
        if (list.length > 0) {
          setNodes(list.map(n => ({
            id: String(n.id),
            position: Number(n.position),
            label: String(n.label || `Ngưỡng ${n.position}`),
            multiplier: Number(n.multiplier)
          })));
        }
      } catch (err) {
        console.error('Failed to load bonus matrix nodes:', err);
      }
    }
    load();
  }, []);

  function handleMouseDown(e, nodeId) {
    e.preventDefault();
    setDragId(nodeId);
    setDragStart(e.clientX);
  }

  function handleMouseMove(e) {
    if (!dragId || !axisRef.current) return;
    const rect = axisRef.current.getBoundingClientRect();
    const totalWidth = rect.width;
    const ratio = (e.clientX - rect.left) / totalWidth;
    const newPos = clamp(snapToStep(AXIS_MIN + ratio * (AXIS_MAX - AXIS_MIN), AXIS_STEP), AXIS_MIN, AXIS_MAX);
    setNodes((prev) =>
      prev.map((n) => (n.id === dragId ? { ...n, position: newPos } : n)),
    );
  }

  async function handleMouseUp() {
    if (dragId) {
      const node = nodes.find(n => n.id === dragId);
      if (node && !node.id.startsWith('n')) {
        try {
          await api.studentAffairs.bonusMatrix.update(node.id, {
            position: node.position,
            label: node.label,
            multiplier: node.multiplier
          });
        } catch (err) {
          console.error('Failed to sync dragged position:', err);
        }
      }
      setDragId(null);
      setDragStart(null);
    }
  }

  async function addNode(e) {
    e.preventDefault();
    const form = e.target;
    const position = Number(form.position.value);
    const label = form.label.value.trim();
    const multiplier = Number(form.multiplier.value);

    await run(
      async () => {
        const payload = {
          position: clamp(snapToStep(position, AXIS_STEP), AXIS_MIN, AXIS_MAX),
          label: label || `Ngưỡng ${position}`,
          multiplier: clamp(multiplier, 0, 200),
        };
        const res = await api.studentAffairs.bonusMatrix.create(payload);
        const newNode = {
          id: String(res.id),
          position: res.position,
          label: res.label,
          multiplier: res.multiplier,
        };
        setNodes((prev) => [...prev, newNode]);
        setAddOpen(false);
      },
      'Đã thêm ngưỡng mới.',
    );
  }

  async function updateNode(e) {
    e.preventDefault();
    if (!editing) return;
    const form = e.target;
    setSaving(true);
    await run(
      async () => {
        const payload = {
          position: clamp(snapToStep(Number(form.position.value), AXIS_STEP), AXIS_MIN, AXIS_MAX),
          label: form.label.value.trim() || editing.label,
          multiplier: clamp(Number(form.multiplier.value), 0, 200),
        };
        const res = await api.studentAffairs.bonusMatrix.update(editing.id, payload);
        setNodes((prev) =>
          prev.map((n) =>
            n.id === editing.id
              ? {
                  ...n,
                  position: res.position,
                  label: res.label,
                  multiplier: res.multiplier,
                }
              : n,
          ),
        );
        setEditing(null);
      },
      'Đã cập nhật ngưỡng.',
    );
    setSaving(false);
  }

  async function deleteNode(nodeId) {
    if (nodes.length <= 1) return;
    await run(
      async () => {
        await api.studentAffairs.bonusMatrix.delete(nodeId);
        setNodes((prev) => prev.filter((n) => n.id !== nodeId));
        if (selected === nodeId) setSelected(null);
      },
      'Đã xóa ngưỡng.',
    );
  }

  const ranges = getRanges(nodes);
  const selectedNode = selected ? nodes.find((n) => n.id === selected) : null;

  return (
    <div className="px-8 py-10 max-w-5xl mx-auto">
      {/* Header - clean, no eyebrow */}
      <div className="mb-10">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-xl bg-[#fef3e8] flex items-center justify-center shrink-0">
            <SlidersHorizontal className="w-6 h-6 text-[#ed641c]" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold text-[#26303d] tracking-tight">
              Ma trận hệ số Bonus
            </h1>
            <p className="mt-1 text-sm text-[#818794] leading-relaxed">
              Thiết lập các ngưỡng và hệ số nhân để tính điểm cộng thêm cho sinh viên
            </p>
          </div>
        </div>
      </div>

      {/* Axis Visualizer - Hero element */}
      <Panel className="mb-6">
        <div className="p-6">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h2 className="text-base font-medium text-[#26303d]">Trục ngưỡng & hệ số</h2>
              <p className="text-xs text-[#818794] mt-0.5">Kéo các nút để điều chỉnh vị trí ngưỡng</p>
            </div>
            {selectedNode && (
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#fef3e8]">
                <span className="text-xs text-[#c25a1a] font-medium">{selectedNode.label}</span>
                <span className="text-sm font-semibold text-[#ed641c]">×{selectedNode.multiplier}%</span>
              </div>
            )}
          </div>

          {/* Axis track */}
          <div
            ref={axisRef}
            className="relative h-14 bg-[#f5f6f8] rounded-xl cursor-crosshair"
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
          >
            {/* Range segments */}
            {ranges.map((range, i) => {
              const left = (range.from / AXIS_MAX) * 100;
              const width = ((range.to - range.from) / AXIS_MAX) * 100;
              const color = TIER_COLORS[i % TIER_COLORS.length];
              return (
                <div
                  key={i}
                  className="absolute top-0 h-full flex items-center justify-center text-[10px] font-medium overflow-hidden"
                  style={{
                    left: `${left}%`,
                    width: `${width}%`,
                    backgroundColor: color.bg,
                    borderLeft: i === 0 ? 'none' : `2px solid ${color.border}`,
                  }}
                  title={`${range.from}–${range.to === AXIS_MAX ? '∞' : range.to}: ×${range.multiplier}%`}
                >
                  {width > 8 && (
                    <span className="text-[10px] font-semibold" style={{ color: color.text }}>
                      ×{range.multiplier}%
                    </span>
                  )}
                </div>
              );
            })}

            {/* Nodes */}
            {nodes.map((node) => {
              const left = (node.position / AXIS_MAX) * 100;
              const isSelected = selected === node.id;
              const isDragging = dragId === node.id;
              const color = TIER_COLORS[nodes.indexOf(node) % TIER_COLORS.length];
              return (
                <button
                  key={node.id}
                  draggable={false}
                  onMouseDown={(e) => handleMouseDown(e, node.id)}
                  onClick={() => setSelected(isSelected ? null : node.id)}
                  className={`
                    absolute top-1/2 -translate-y-1/2 -translate-x-1/2
                    w-8 h-8 rounded-full flex items-center justify-center
                    cursor-grab select-none transition-all duration-150 z-10
                    border-2
                    ${isDragging
                      ? 'cursor-grabbing scale-110 shadow-lg border-[#ed641c] bg-[#ed641c]'
                      : isSelected
                        ? `border-[${color.accent}] bg-white shadow-md scale-105`
                        : 'border-[#d1d5db] bg-white hover:border-[#ed641c] hover:shadow-sm'
                    }
                  `}
                  style={{
                    left: `${left}%`,
                    borderColor: isSelected ? color.accent : undefined,
                    color: isSelected ? color.accent : '#6b7280',
                  }}
                  title={`${node.label}: ${node.position} (×${node.multiplier}%)`}
                >
                  <GripVertical className="w-4 h-4" />
                </button>
              );
            })}
          </div>

          {/* Axis labels */}
          <div className="flex justify-between mt-3 px-1 text-[10px] text-[#9ca3af]">
            <span>0</span>
            <span>{AXIS_MAX / 4}</span>
            <span>{AXIS_MAX / 2}</span>
            <span>{(AXIS_MAX * 3) / 4}</span>
            <span>{AXIS_MAX}+</span>
          </div>
        </div>
      </Panel>

      {/* Tier Table */}
      <Panel>
        <div className="p-6">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h2 className="text-base font-medium text-[#26303d]">Danh sách ngưỡng</h2>
              <p className="text-xs text-[#818794] mt-0.5">{nodes.length} ngưỡng đang hoạt động</p>
            </div>
            <Button icon={Plus} size="sm" onClick={() => setAddOpen(true)}>
              Thêm ngưỡng
            </Button>
          </div>

          <div className="space-y-2">
            {ranges.map((range, i) => {
              const node = [...nodes].sort((a, b) => a.position - b.position)[i];
              const isSelected = selected === node?.id;
              const color = TIER_COLORS[i % TIER_COLORS.length];

              return (
                <div
                  key={i}
                  className={`
                    flex items-center gap-4 p-4 rounded-xl cursor-pointer
                    transition-all duration-150 border
                    ${isSelected
                      ? 'bg-white border-[#e5e7eb] shadow-sm'
                      : 'bg-[#fafbfc] border-transparent hover:bg-white hover:border-[#e5e7eb]'
                    }
                  `}
                  onClick={() => setSelected(isSelected ? null : node?.id)}
                >
                  {/* Tier indicator */}
                  <div
                    className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0 font-semibold text-sm"
                    style={{ backgroundColor: color.bg, color: color.text }}
                  >
                    {range.from}
                  </div>

                  {/* Label and range */}
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-[#26303d] truncate">{range.label}</div>
                    <div className="text-xs text-[#818794] mt-0.5">
                      Từ {range.from} → {range.to === AXIS_MAX ? `${AXIS_MAX}+` : range.to}
                    </div>
                  </div>

                  {/* Multiplier */}
                  <div
                    className="px-3 py-1.5 rounded-lg text-sm font-semibold shrink-0"
                    style={{ backgroundColor: color.bg, color: color.text }}
                  >
                    ×{range.multiplier}%
                  </div>

                  {/* Actions */}
                  <div className="flex gap-1 shrink-0">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setEditing(node);
                      }}
                      className="w-8 h-8 rounded-lg flex items-center justify-center text-[#818794] hover:text-[#ed641c] hover:bg-[#fef3e8] transition-colors"
                      title="Chỉnh sửa"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                    </button>
                    {nodes.length > 1 && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteNode(node.id);
                        }}
                        className="w-8 h-8 rounded-lg flex items-center justify-center text-[#818794] hover:text-red-500 hover:bg-red-50 transition-colors"
                        title="Xóa ngưỡng"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </Panel>

      {/* Help text */}
      <p className="text-xs text-[#9ca3af] mt-6 text-center">
        Kéo nút trên trục hoặc nhấn vào hàng để chọn ngưỡng. Hệ số áp dụng cho toàn bộ phạm vi.
      </p>

      {/* Add Node Modal */}
      {addOpen && (
        <Modal title="Thêm ngưỡng mới" onClose={() => setAddOpen(false)}>
          <form onSubmit={addNode}>
            <div className="px-6 py-5 grid sm:grid-cols-2 gap-5">
              <Field label="Vị trí trên trục *" className="sm:col-span-2">
                <input
                  required
                  name="position"
                  type="number"
                  min={AXIS_MIN}
                  max={AXIS_MAX}
                  step={AXIS_STEP}
                  defaultValue={50}
                />
                <span className="text-[10px] text-[#9ca3af] mt-1 block">
                  Bước nhảy: {AXIS_STEP}. Khoảng: {AXIS_MIN} – {AXIS_MAX}+
                </span>
              </Field>
              <Field label="Tên ngưỡng">
                <input name="label" type="text" maxLength={60} placeholder="VD: Ngưỡng xuất sắc" />
              </Field>
              <Field label="Hệ số nhân (%) *">
                <input
                  required
                  name="multiplier"
                  type="number"
                  min={0}
                  max={200}
                  step={5}
                  defaultValue={100}
                />
              </Field>
            </div>
            <div className="sticky bottom-0 z-[1] border-t border-[#e9ebee] px-6 py-4 flex gap-3 justify-end bg-[#fafbfc] rounded-b-xl">
              <Button type="button" icon={X} onClick={() => setAddOpen(false)}>Hủy</Button>
              <Button type="submit" variant="primary" icon={Plus}>Thêm ngưỡng</Button>
            </div>
          </form>
        </Modal>
      )}

      {/* Edit Node Modal */}
      {editing && (
        <Modal title={`Chỉnh sửa · ${editing.label}`} onClose={() => setEditing(null)}>
          <form onSubmit={updateNode}>
            <div className="px-6 py-5 grid sm:grid-cols-2 gap-5">
              <Field label="Vị trí trên trục *">
                <input
                  required
                  name="position"
                  type="number"
                  min={AXIS_MIN}
                  max={AXIS_MAX}
                  step={AXIS_STEP}
                  defaultValue={editing.position}
                />
              </Field>
              <Field label="Hệ số nhân (%) *">
                <input
                  required
                  name="multiplier"
                  type="number"
                  min={0}
                  max={200}
                  step={5}
                  defaultValue={editing.multiplier}
                />
              </Field>
              <Field label="Tên ngưỡng" className="sm:col-span-2">
                <input
                  name="label"
                  type="text"
                  maxLength={60}
                  defaultValue={editing.label}
                />
              </Field>
              <div className="sm:col-span-2 p-4 rounded-xl bg-[#f5f6f8] text-[11px] text-[#6b7280] leading-relaxed">
                Phạm vi áp dụng: từ vị trí này đến ngưỡng tiếp theo.
              </div>
            </div>
            <div className="sticky bottom-0 z-[1] border-t border-[#e9ebee] px-6 py-4 flex gap-3 justify-end bg-[#fafbfc] rounded-b-xl">
              <Button type="button" icon={X} onClick={() => setEditing(null)}>Hủy</Button>
              <Button type="submit" variant="primary" icon={Check} busy={saving}>Lưu thay đổi</Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
