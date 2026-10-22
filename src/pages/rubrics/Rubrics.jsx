import './Rubrics.css';
import { useWorkspace } from '../../context/WorkspaceContext.jsx';
import { useEffect, useState } from 'react';
import {
  Check,
  History,
  Lock,
  Pencil,
  Plus,
  Scale,
  ShieldCheck,
  SlidersHorizontal,
  Unlock,
} from 'lucide-react';
import api from '../../services/api.js';
import ExperiencePolicyPanel from '../../components/experience-policy-panel/ExperiencePolicyPanel.jsx';
import { date } from '../../utils/format.js';
import { useAction } from '../../hooks/useAction.js';
import {
  Badge,
  Button,
  Empty,
  Field,
  IconButton,
  Modal,
  PageHeader,
  Panel,
} from '../../components/ui/index.js';

const CAPABILITIES = [
  {
    key: 'ACAD',
    label: 'Học thuật',
    desc: 'Điểm tích lũy từ hoạt động học thuật',
    color: '#5b8dd9',
  },
  {
    key: 'PROF',
    label: 'Kỹ năng nghề nghiệp',
    desc: 'Điểm từ workshop, khóa học kỹ năng',
    color: '#7c6fcd',
  },
  {
    key: 'COMM',
    label: 'Cộng đồng',
    desc: 'Điểm từ hoạt động tình nguyện, cộng đồng',
    color: '#3fa87b',
  },
  { key: 'PHYS', label: 'Thể chất', desc: 'Điểm từ thể thao, sức khỏe', color: '#d97b3e' },
  {
    key: 'GLOB',
    label: 'Công dân toàn cầu',
    desc: 'Điểm từ giao lưu quốc tế, ngoại ngữ',
    color: '#c85fa8',
  },
  {
    key: 'ETHI',
    label: 'Đạo đức & Kỹ năng sống',
    desc: 'Điểm từ hoạt động đạo đức, kỹ năng sống',
    color: '#8a6f3f',
  },
];

function buildDefaultBenchmark(semesterCode = '') {
  return {
    id: null,
    semesterCode,
    capabilities: CAPABILITIES.map((c, index) => ({
      key: c.key,
      weight: Math.floor(100 / CAPABILITIES.length) + (index < 100 % CAPABILITIES.length ? 1 : 0),
    })),
    bonusCap: 500,
    status: 'draft',
    effectiveDate: new Date().toISOString().split('T')[0],
  };
}

function computeTotal(weights) {
  return weights.reduce((s, w) => s + Number(w.weight || 0), 0);
}

export function Rubrics({ showPolicy = true }) {
  const run = useAction();
  const { season } = useWorkspace();

  const [benchmark, setBenchmark] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [editing, setEditing] = useState(false);
  const [history, setHistory] = useState(null);
  const [saving, setSaving] = useState(false);
  const [locking, setLocking] = useState(false);
  const [form, setForm] = useState(null);

  async function fetchBenchmark() {
    setLoading(true);
    setError(null);
    try {
      const data = await api.studentAffairs.benchmarks.getActive();
      if (data && data.id) {
        setBenchmark(data);
      } else {
        setBenchmark(null);
      }
    } catch (err) {
      console.error('Failed to fetch benchmark:', err);
      setError(err.message || 'Không thể tải Benchmark.');
      setBenchmark(null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchBenchmark();
  }, []);

  function startEdit(value = benchmark) {
    setForm({
      semesterCode: value.semesterCode || season,
      capabilities: value.capabilities
        ? value.capabilities.map((c) => ({ key: c.key, weight: Number(c.weight || 0) }))
        : buildDefaultBenchmark(season).capabilities,
      bonusCap: Number(value.bonusCap || 500),
      effectiveDate: value.effectiveDate || new Date().toISOString().split('T')[0],
    });
    setEditing(true);
  }

  function updateCap(key, value) {
    setForm((f) => ({
      ...f,
      capabilities: f.capabilities.map((c) =>
        c.key === key ? { ...c, weight: Number(value) } : c,
      ),
    }));
  }

  async function save(e) {
    e.preventDefault();
    const total = computeTotal(form.capabilities);
    if (Math.abs(total - 100) > 0.01) {
      run(() => {
        throw new Error('Tổng trọng số phải bằng 100%.');
      });
      return;
    }
    setSaving(true);
    const ok = await run(async () => {
      const payload = {
        semesterCode: form.semesterCode,
        capabilities: form.capabilities.map((c) => ({ key: c.key, weight: c.weight })),
        bonusCap: Number(form.bonusCap),
        effectiveDate: form.effectiveDate,
      };
      let saved;
      if (benchmark.id) {
        saved = await api.studentAffairs.benchmarks.update(benchmark.id, payload);
      } else {
        saved = await api.studentAffairs.benchmarks.create(payload);
      }
      setBenchmark(saved);
      setEditing(false);
      setForm(null);
    }, 'Đã lưu cấu hình Benchmark.');
    setSaving(false);
    if (!ok) setForm(null);
  }

  async function lock() {
    if (!benchmark.id) {
      run(() => {
        throw new Error('Lưu Benchmark trước khi khóa.');
      });
      return;
    }
    setLocking(true);
    const ok = await run(async () => {
      const saved = await api.studentAffairs.benchmarks.lock(benchmark.id);
      setBenchmark(saved);
    }, 'Đã khóa bất biến cấu hình Benchmark.');
    setLocking(false);
  }

  const totalWeight = form
    ? computeTotal(form.capabilities)
    : benchmark
      ? computeTotal(benchmark.capabilities || [])
      : 0;
  const isLocked = benchmark?.status === 'LOCKED' || benchmark?.isLocked;

  return (
    <>
      <PageHeader
        eyebrow="CÔNG BẰNG TRONG TỪNG ĐÓNG GÓP"
        title="Benchmark 6+1 Chiều"
        description="Cấu hình trọng số 6 chiều năng lực và trần điểm thưởng cho học kỳ."
      />

      {/* Error Banner */}
      {error && (
        <div className="rubrics-content">
          <span className="rubrics-text">⚠️</span>
          {error}
          <button className="rubrics-button" onClick={fetchBenchmark}>
            Thử lại
          </button>
        </div>
      )}

      {/* Loading */}
      {loading ? (
        <div className="rubrics-content-2">
          <div className="rubrics-content-3" />
          Đang tải Benchmark…
        </div>
      ) : !benchmark ? (
        <Panel className="rubrics-panel">
          <Empty
            title="Chưa có Benchmark"
            description="Tạo Benchmark đầu tiên để bắt đầu cấu hình 6 chiều năng lực."
          />
          <Button
            className="rubrics-button-2"
            variant="primary"
            icon={Plus}
            disabled={Boolean(error) || !season}
            onClick={() => {
              const draft = buildDefaultBenchmark(season);
              setBenchmark(draft);
              startEdit(draft);
            }}
          >
            Tạo Benchmark mới
          </Button>
        </Panel>
      ) : (
        <>
          {/* Banner */}
          <div className="rubrics-content-4">
            <span className="rubrics-text-2">
              <Scale size={23} />
            </span>
            <div>
              <h3 className="rubrics-subheading">6 Chiều năng lực + Trần điểm thưởng</h3>
              <p className="rubrics-description">
                Mỗi chiều có trọng số riêng. Tổng trọng số phải bằng 100%. Sau khi khóa, cấu hình
                không thể sửa.
              </p>
            </div>
          </div>

          {/* Benchmark Panel */}
          <Panel className="rubrics-panel-2">
            {/* Header */}
            <div className="rubrics-content-5">
              <div className="rubrics-content-6">
                <div className="rubrics-content-7">
                  <span className="rubrics-text-3">
                    <SlidersHorizontal size={22} />
                  </span>
                  <div>
                    <h2 className="rubrics-heading">
                      Benchmark {benchmark.semesterCode || 'FALL2026'}
                    </h2>
                    <p className="rubrics-description-2">
                      Hiệu lực từ {date(benchmark.effectiveDate || benchmark.createdAt)}
                    </p>
                  </div>
                </div>
                <div className="rubrics-content-8">
                  {isLocked ? (
                    <Badge tone="green" className="rubrics-badge">
                      <ShieldCheck size={13} /> Đã khóa bất biến
                    </Badge>
                  ) : (
                    <Badge tone="orange">Đang chỉnh sửa</Badge>
                  )}
                </div>
              </div>
            </div>

            {/* Capabilities Grid */}
            <div className="rubrics-content-9">
              <div className="rubrics-content-10">
                {CAPABILITIES.map((cap) => {
                  const capData = (benchmark.capabilities || []).find((c) => c.key === cap.key);
                  const weight = capData
                    ? Number(capData.weight)
                    : Math.round(100 / CAPABILITIES.length);
                  const isEditing = editing && form && !isLocked;
                  return (
                    <div key={cap.key} className="rubrics-content-11">
                      <div className="rubrics-content-12">
                        <div className="rubrics-content-8">
                          <span className="rubrics-text-4" style={{ background: cap.color }} />
                          <div>
                            <strong className="rubrics-value">{cap.label}</strong>
                            <small className="rubrics-caption">{cap.desc}</small>
                          </div>
                        </div>
                        {isEditing ? (
                          <div className="rubrics-content-13">
                            <input
                              type="number"
                              min={0}
                              max={100}
                              step={1}
                              value={form.capabilities.find((c) => c.key === cap.key)?.weight ?? 0}
                              onChange={(e) => updateCap(cap.key, e.target.value)}
                              className="rubrics-input"
                            />
                            <span className="rubrics-text-5">%</span>
                          </div>
                        ) : (
                          <span className="rubrics-text-6" style={{ color: cap.color }}>
                            {weight}%
                          </span>
                        )}
                      </div>
                      {/* Weight bar */}
                      <div className="rubrics-content-14">
                        <div
                          className="rubrics-content-15"
                          style={{ width: `${weight}%`, background: cap.color }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Bonus Cap */}
              <div className="rubrics-content-16">
                <div className="rubrics-content-17">
                  <div>
                    <strong className="rubrics-value">
                      Trần điểm hoạt động thưởng (X<sub>+1</sub>)
                    </strong>
                    <small className="rubrics-caption-2">
                      Điểm cộng thêm tối đa cho các hoạt động vượt mức
                    </small>
                  </div>
                  {editing && !isLocked ? (
                    <div className="rubrics-content-13">
                      <input
                        type="number"
                        min={0}
                        max={10000}
                        value={form.bonusCap}
                        onChange={(e) =>
                          setForm((f) => ({ ...f, bonusCap: Number(e.target.value) }))
                        }
                        className="rubrics-input-2"
                      />
                      <span className="rubrics-text-5">Xperience Point</span>
                    </div>
                  ) : (
                    <span className="rubrics-text-7">
                      {benchmark.bonusCap || 0} <span className="rubrics-text-8">Xperience Point</span>
                    </span>
                  )}
                </div>
              </div>

              {/* Total Weight */}
              <div className="rubrics-content-18">
                <span className="rubrics-text-9">Tổng trọng số 6 chiều</span>
                <Badge tone={Math.abs(totalWeight - 100) < 0.01 ? 'green' : 'red'}>
                  {totalWeight}% / 100%
                </Badge>
              </div>
            </div>

            {/* Actions */}
            <div className="rubrics-content-19">
              {!isLocked && (
                <Button icon={History} onClick={() => setHistory(benchmark)} variant="ghost">
                  Lịch sử cấu hình
                </Button>
              )}
              <div className="rubrics-content-20">
                {isLocked ? (
                  <div className="rubrics-content-21">
                    <ShieldCheck size={16} />
                    <span>Cấu hình đã được khóa bất biến</span>
                  </div>
                ) : (
                  <>
                    <Button
                      icon={Lock}
                      variant="secondary"
                      busy={locking}
                      onClick={lock}
                      disabled={!benchmark.id}
                    >
                      Khóa bất biến
                    </Button>
                    <Button icon={Pencil} variant="primary" onClick={() => startEdit()}>
                      Chỉnh sửa
                    </Button>
                  </>
                )}
              </div>
            </div>
          </Panel>

          {/* Info */}
          <div className="rubrics-content-22">
            <ShieldCheck size={17} />
            <span>
              Thay đổi trọng số tạo phiên bản mới. Sau khi khóa, cấu hình không thể sửa để đảm bảo
              tính toàn vẹn điểm.
            </span>
          </div>
        </>
      )}

      {/* Edit Modal */}
      {editing && form && (
        <Modal
          title="Chỉnh sửa Benchmark"
          description={`Cấu hình cho học kỳ ${form.semesterCode}. Tổng trọng số phải bằng 100%.`}
          wide
          onClose={() => {
            setEditing(false);
            setForm(null);
          }}
        >
          <form onSubmit={save}>
            <div className="rubrics-content-23">
              <div className="rubrics-content-24">
                <Field label="Mã học kỳ *">
                  <input
                    required
                    value={form.semesterCode}
                    onChange={(e) => setForm((f) => ({ ...f, semesterCode: e.target.value }))}
                    disabled={!!benchmark.id}
                  />
                </Field>
                <Field label="Ngày hiệu lực *">
                  <input
                    required
                    type="date"
                    value={form.effectiveDate}
                    onChange={(e) => setForm((f) => ({ ...f, effectiveDate: e.target.value }))}
                  />
                </Field>
              </div>

              {/* Weight table */}
              <div className="rubrics-content-25">
                <span>CHIỀU NĂNG LỰC</span>
                <span className="rubrics-text-10">TRỌNG SỐ %</span>
                <span />
              </div>

              {CAPABILITIES.map((cap) => {
                const capForm = form.capabilities.find((c) => c.key === cap.key);
                return (
                  <div key={cap.key} className="rubrics-content-26">
                    <div className="rubrics-content-8">
                      <span className="rubrics-text-4" style={{ background: cap.color }} />
                      <span className="rubrics-text-11">{cap.label}</span>
                    </div>
                    <input
                      type="number"
                      required
                      min={0}
                      max={100}
                      step={1}
                      value={capForm?.weight ?? 0}
                      onChange={(e) => updateCap(cap.key, e.target.value)}
                      className="rubrics-input-3"
                    />
                    <span className="rubrics-text-12">%</span>
                  </div>
                );
              })}

              {/* Total */}
              <div className="rubrics-content-27">
                <span className="rubrics-text-13">Tổng trọng số</span>
                <Badge
                  tone={Math.abs(computeTotal(form.capabilities) - 100) < 0.01 ? 'green' : 'red'}
                >
                  {computeTotal(form.capabilities)}% / 100%
                </Badge>
              </div>

              {/* Bonus cap */}
              <h3 className="rubrics-subheading-2">Trần điểm hoạt động thưởng</h3>
              <div className="rubrics-content-28">
                <Field label="Trần Xperience Point thưởng (X+1)">
                  <input
                    type="number"
                    min={0}
                    max={10000}
                    value={form.bonusCap}
                    onChange={(e) => setForm((f) => ({ ...f, bonusCap: Number(e.target.value) }))}
                  />
                </Field>
              </div>

              <div className="rubrics-content-29">
                Mỗi chiều năng lực có trọng số đại diện cho tỷ trọng điểm. Tổng = 100%. Khóa
                Benchmark để cố định cấu hình.
              </div>
            </div>

            <div className="rubrics-content-30">
              <Button
                type="button"
                onClick={() => {
                  setEditing(false);
                  setForm(null);
                }}
              >
                Hủy
              </Button>
              <Button
                type="submit"
                variant="primary"
                icon={Check}
                busy={saving}
                disabled={Math.abs(computeTotal(form.capabilities) - 100) > 0.01}
              >
                Lưu Benchmark
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* History Modal */}
      {showPolicy && (
        <ExperiencePolicyPanel benchmarkId={benchmark?.id} onChanged={fetchBenchmark} />
      )}
      {history && (
        <Modal
          title={`Lịch sử Benchmark · ${history.semesterCode}`}
          description="Các phiên bản trước được giữ lại để đối soát."
          onClose={() => setHistory(null)}
        >
          <div className="rubrics-content-23">
            <div className="rubrics-content-31">
              <Badge tone="orange">{history.status || 'draft'}</Badge>
              <span className="rubrics-text-14">
                Phiên bản hiện tại · {date(history.effectiveDate || history.createdAt)}
              </span>
            </div>
            <p className="rubrics-description-3">Chưa có phiên bản cũ để đối soát.</p>
          </div>
        </Modal>
      )}
    </>
  );
}
