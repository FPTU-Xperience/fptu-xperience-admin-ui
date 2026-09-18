import { useState } from 'react';
import {
  Check,
  History,
  Pencil,
  Plus,
  Scale,
  ShieldCheck,
  SlidersHorizontal,
  Trash2,
} from 'lucide-react';
import { useWorkspace } from '../context/WorkspaceContext.jsx';
import { date, number } from '../utils/format.js';
import { validateRubric } from '../utils/governance.js';
import { useAction } from '../hooks/useAction.js';
import { Badge, Button, Field, IconButton, Modal, PageHeader, Panel } from '../components/ui/index.js';

export function Rubrics() {
  const { state } = useWorkspace();
  const [edit, setEdit] = useState(null);
  const [history, setHistory] = useState(null);
  return (
    <>
      <PageHeader
        eyebrow="CÔNG BẰNG TRONG TỪNG ĐÓNG GÓP"
        title="Thang điểm XP"
        description="Cấu hình tiêu chí phù hợp từng loại CLB, với lịch sử phiên bản rõ ràng."
      />
      <div className="rubric-note">
        <span>
          <Scale size={23} />
        </span>
        <div>
          <h3>Đo lường phù hợp, so sánh công bằng</h3>
          <p>
            Mỗi loại CLB có tiêu chí và trọng số riêng. Chỉ số gắn kết được chuẩn hóa về cùng một
            thang đo.
          </p>
        </div>
      </div>
      <div className="rubric-grid">
        {state.rubrics.map((rubric) => (
          <Panel key={rubric.id} className="rubric-card">
            <div className="rubric-top">
              <span className="rubric-symbol">
                <SlidersHorizontal size={22} />
              </span>
              <Badge tone={rubric.status === 'published' ? 'green' : 'neutral'}>
                {rubric.status === 'published' ? 'Đã công bố' : 'Bản nháp'}
              </Badge>
            </div>
            <div className="rubric-name">
              <h2>CLB {rubric.type.toLowerCase()}</h2>
              <Badge tone="orange">v{rubric.version}</Badge>
            </div>
            <p className="muted">Hiệu lực từ {date(rubric.effective)}</p>
            <div className="rubric-criteria">
              {rubric.criteria.map((criterion, i) => (
                <div key={i}>
                  <span>
                    <strong>{criterion.name}</strong>
                    <small>{criterion.xp} XP / đóng góp hợp lệ</small>
                  </span>
                  <b>{criterion.weight}%</b>
                </div>
              ))}
            </div>
            <div className="normalization-info">
              <Scale size={16} />
              <span>
                Chuẩn hóa: min(XP / {number(rubric.cap)}, 1) × {rubric.scale}
              </span>
            </div>
            <div className="rubric-actions">
              <Button icon={History} onClick={() => setHistory(rubric)}>
                Lịch sử
              </Button>
              <Button icon={Pencil} onClick={() => setEdit(rubric)}>
                Tạo phiên bản mới
              </Button>
            </div>
          </Panel>
        ))}
      </div>
      <div className="info-line">
        <ShieldCheck size={17} />
        Thay đổi thang điểm tạo phiên bản mới. Các đóng góp đã ghi nhận giữ nguyên tham chiếu phiên
        bản gốc.
      </div>
      {edit && <RubricForm rubric={edit} onClose={() => setEdit(null)} />}
      {history && (
        <Modal
          title={`Lịch sử thang điểm · ${history.type}`}
          description="Các phiên bản trước được giữ lại để đối soát."
          onClose={() => setHistory(null)}
        >
          <div className="modal-body">
            <div className="version-row">
              <Badge tone="orange">v{history.version}</Badge>
              <span>Phiên bản hiện tại · {date(history.effective)}</span>
            </div>
            {[...history.history].reverse().map((v) => (
              <details className="version-detail" key={v.version}>
                <summary>
                  Phiên bản {v.version} · {date(v.effective)}
                </summary>
                {v.criteria.map((c, i) => (
                  <p key={i}>
                    {c.name}: {c.xp} XP · {c.weight}%
                  </p>
                ))}
                <p>
                  Chuẩn hóa: ngưỡng {v.cap} XP / thang {v.scale}
                </p>
              </details>
            ))}
            {!history.history.length && (
              <p className="muted">Đây là phiên bản đầu tiên, chưa có thay đổi.</p>
            )}
          </div>
        </Modal>
      )}
    </>
  );
}
function RubricForm({ rubric, onClose }) {
  const { commit } = useWorkspace();
  const run = useAction();
  const [form, setForm] = useState(structuredClone(rubric));
  const sum = form.criteria.reduce((total, c) => total + Number(c.weight), 0);
  function updateCriterion(i, key, value) {
    setForm((old) => ({
      ...old,
      criteria: old.criteria.map((c, index) => (index === i ? { ...c, [key]: value } : c)),
    }));
  }
  async function submit(e) {
    e.preventDefault();
    const ok = await run(
      () =>
        commit(
          'Công bố phiên bản thang XP',
          `${rubric.type}: v${rubric.version} → v${rubric.version + 1}`,
          'affairs',
          (draft) => {
            validateRubric(form);
            const current = draft.rubrics.find((r) => r.id === rubric.id);
            if (current.version !== rubric.version)
              throw new Error('Thang điểm đã thay đổi. Hãy mở lại phiên bản mới nhất.');
            const { history, ...snapshot } = current;
            draft.rubrics = draft.rubrics.map((r) =>
              r.id === rubric.id
                ? {
                    ...form,
                    version: rubric.version + 1,
                    status: 'published',
                    cap: Number(form.cap),
                    scale: Number(form.scale),
                    criteria: form.criteria.map((c) => ({
                      ...c,
                      xp: Number(c.xp),
                      weight: Number(c.weight),
                    })),
                    history: [...history, snapshot],
                  }
                : r,
            );
          },
        ),
      `Đã lưu phiên bản ${rubric.version + 1} của thang điểm.`,
    );
    if (ok) onClose();
  }
  return (
    <Modal
      title={`Thang XP · ${rubric.type}`}
      description={`Tạo phiên bản ${rubric.version + 1} từ phiên bản ${rubric.version}.`}
      wide
      onClose={onClose}
    >
      <form onSubmit={submit}>
        <div className="modal-body">
          <div className="criteria-form-head">
            <span>TIÊU CHÍ ĐÓNG GÓP</span>
            <span>XP CƠ BẢN</span>
            <span>TRỌNG SỐ %</span>
            <span />
          </div>
          {form.criteria.map((c, i) => (
            <div className="criteria-form-row" key={i}>
              <input
                required
                maxLength={100}
                aria-label={`Tiêu chí ${i + 1}`}
                value={c.name}
                onChange={(e) => updateCriterion(i, 'name', e.target.value)}
              />
              <input
                required
                type="number"
                min={1}
                max={100000}
                aria-label={`XP tiêu chí ${i + 1}`}
                value={c.xp}
                onChange={(e) => updateCriterion(i, 'xp', e.target.value)}
              />
              <input
                required
                type="number"
                min={0}
                max={100}
                step="0.1"
                aria-label={`Trọng số tiêu chí ${i + 1}`}
                value={c.weight}
                onChange={(e) => updateCriterion(i, 'weight', e.target.value)}
              />
              <IconButton
                icon={Trash2}
                label={`Xóa tiêu chí ${i + 1}`}
                disabled={form.criteria.length === 1}
                onClick={() =>
                  setForm({ ...form, criteria: form.criteria.filter((_, index) => index !== i) })
                }
              />
            </div>
          ))}
          <div className="criteria-total">
            <Button
              type="button"
              icon={Plus}
              onClick={() =>
                setForm({ ...form, criteria: [...form.criteria, { name: '', xp: 20, weight: 0 }] })
              }
            >
              Thêm tiêu chí
            </Button>
            <Badge tone={sum === 100 ? 'green' : 'red'}>Tổng trọng số: {sum}% / 100%</Badge>
          </div>
          <h3 className="form-section-title">Chuẩn hóa và hiệu lực</h3>
          <div className="form-grid">
            <Field label="Ngưỡng XP đạt chỉ số tối đa">
              <input
                required
                type="number"
                min={1}
                max={1000000}
                value={form.cap}
                onChange={(e) => setForm({ ...form, cap: e.target.value })}
              />
            </Field>
            <Field label="Thang chỉ số gắn kết">
              <input
                required
                type="number"
                min={1}
                max={1000}
                value={form.scale}
                onChange={(e) => setForm({ ...form, scale: e.target.value })}
              />
            </Field>
            <Field label="Ngày hiệu lực">
              <input
                required
                type="date"
                value={form.effective}
                onChange={(e) => setForm({ ...form, effective: e.target.value })}
              />
            </Field>
          </div>
          <div className="info-box">
            Điểm đóng góp = XP cơ bản × trọng số của tiêu chí. Chỉ số gắn kết = min(tổng XP / ngưỡng
            chuẩn hóa, 1) × thang chỉ số. Đây là công thức minh họa có thể hiệu chỉnh cùng chủ nhiệm
            CLB.
          </div>
        </div>
        <div className="modal-footer">
          <Button type="button" onClick={onClose}>
            Hủy
          </Button>
          <Button type="submit" variant="primary" icon={Check} disabled={Math.abs(sum - 100) > 0.001}>
            Công bố phiên bản {rubric.version + 1}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
