import { useState } from 'react';
import {
  CalendarDays,
  Check,
  ChevronRight,
  CircleAlert,
  Clock3,
  History,
  Pencil,
  Plus,
  Scale,
  ShieldAlert,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  Trash2,
} from 'lucide-react';
import { useWorkspace } from '../lib/store.jsx';
import { date, number, seasonLabel } from '../lib/data.js';
import { resolveAnomaly, validateRubric } from '../lib/governance.js';
import {
  Badge,
  Button,
  Empty,
  Field,
  IconButton,
  Modal,
  PageHeader,
  Panel,
  StatCard,
  Tabs,
  useAction,
} from '../components/ui.jsx';

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

export function Seasons() {
  const { state, commit, season } = useWorkspace();
  const run = useAction();
  const [editing, setEditing] = useState(null);
  return (
    <>
      <PageHeader
        eyebrow="MỖI HỌC KỲ, MỘT KHỞI ĐẦU MỚI"
        title="Học kỳ & mùa giải"
        description="Thiết lập nhịp trải nghiệm, ngưỡng kết nối và cách hiển thị tiến bộ."
      >
        <Button variant="primary" icon={Plus} onClick={() => setEditing({})}>
          Thêm học kỳ
        </Button>
      </PageHeader>
      <div className="season-principle">
        <CalendarDays size={28} />
        <div>
          <h2>Tiến bộ theo mùa. Giá trị theo năm tháng.</h2>
          <p>
            XP cạnh tranh và xếp hạng được tính riêng mỗi học kỳ. Hồ sơ đóng góp và lịch sử xác thực
            được giữ lâu dài.
          </p>
        </div>
      </div>
      <div className="season-grid">
        {state.seasons.map((s) => (
          <Panel key={s.id} className="season-card">
            <div className="season-card-heading">
              <span className="season-icon">
                <CalendarDays size={24} />
              </span>
              <Badge tone={s.id === season ? 'orange' : 'neutral'}>
                {s.id === season ? 'Đang xem' : 'Học kỳ khác'}
              </Badge>
            </div>
            <h2>{seasonLabel(s.id)}</h2>
            <p>
              {date(s.start)} — {date(s.end)}
            </p>
            <dl>
              <dt>Ngưỡng cần kết nối</dt>
              <dd>{s.threshold} XP</dd>
              <dt>XP mỗi cấp độ</dt>
              <dd>{s.xpPerLevel} XP</dd>
              <dt>Hiển thị xếp hạng</dt>
              <dd>{s.rankings ? 'Bật' : 'Tắt · Ưu tiên tiến bộ cá nhân'}</dd>
            </dl>
            <Button icon={Pencil} onClick={() => setEditing(s)}>
              Chỉnh sửa cấu hình
            </Button>
          </Panel>
        ))}
      </div>
      {editing && <SeasonForm value={editing} onClose={() => setEditing(null)} />}
    </>
  );
}
function SeasonForm({ value, onClose }) {
  const { commit } = useWorkspace();
  const run = useAction();
  const [form, setForm] = useState({
    id: '',
    start: '',
    end: '',
    threshold: 200,
    xpPerLevel: 100,
    rankings: false,
    ...value,
  });
  async function submit(e) {
    e.preventDefault();
    const ok = await run(
      () =>
        commit(value.id ? 'Cập nhật học kỳ' : 'Thêm học kỳ', form.id, 'affairs', (draft) => {
          const id = form.id.trim().toUpperCase();
          if (!/^(SPRING|SUMMER|FALL)20\d{2}$/.test(id))
            throw new Error('Mã học kỳ theo định dạng FALL2026, SUMMER2026 hoặc SPRING2027.');
          if (form.start >= form.end) throw new Error('Ngày kết thúc phải sau ngày bắt đầu.');
          if (
            draft.seasons.some(
              (s) => s.id !== value.id && s.start <= form.end && s.end >= form.start,
            )
          )
            throw new Error('Khoảng thời gian bị trùng với một học kỳ khác.');
          if (!value.id && draft.seasons.some((s) => s.id === id))
            throw new Error('Mã học kỳ đã tồn tại.');
          const item = {
            ...form,
            id,
            threshold: Number(form.threshold),
            xpPerLevel: Number(form.xpPerLevel),
          };
          if (value.id) draft.seasons = draft.seasons.map((s) => (s.id === value.id ? item : s));
          else draft.seasons.unshift(item);
        }),
      'Đã lưu cấu hình học kỳ.',
    );
    if (ok) onClose();
  }
  return (
    <Modal
      title={value.id ? `Cấu hình ${seasonLabel(value.id)}` : 'Thêm học kỳ mới'}
      onClose={onClose}
    >
      <form onSubmit={submit}>
        <div className="modal-body form-grid">
          <Field className="full-width" label="Mã học kỳ *" hint="Ví dụ: SPRING2027">
            <input
              required
              disabled={!!value.id}
              value={form.id}
              onChange={(e) => setForm({ ...form, id: e.target.value })}
            />
          </Field>
          <Field label="Ngày bắt đầu *">
            <input
              required
              type="date"
              value={form.start}
              onChange={(e) => setForm({ ...form, start: e.target.value })}
            />
          </Field>
          <Field label="Ngày kết thúc *">
            <input
              required
              type="date"
              value={form.end}
              onChange={(e) => setForm({ ...form, end: e.target.value })}
            />
          </Field>
          <Field label="Ngưỡng cần kết nối (XP)">
            <input
              required
              type="number"
              min={1}
              max={100000}
              value={form.threshold}
              onChange={(e) => setForm({ ...form, threshold: e.target.value })}
            />
          </Field>
          <Field label="XP mỗi cấp độ">
            <input
              required
              type="number"
              min={1}
              max={100000}
              value={form.xpPerLevel}
              onChange={(e) => setForm({ ...form, xpPerLevel: e.target.value })}
            />
          </Field>
          <label className="checkbox-label full-width">
            <input
              type="checkbox"
              checked={form.rankings}
              onChange={(e) => setForm({ ...form, rankings: e.target.checked })}
            />
            Cho phép hiển thị xếp hạng theo học kỳ
          </label>
          <div className="info-box full-width">
            Mở học kỳ mới tạo phạm vi XP mới; hồ sơ đóng góp trọn đời và sổ cái hiện tại vẫn được
            giữ nguyên.
          </div>
        </div>
        <div className="modal-footer">
          <Button type="button" onClick={onClose}>
            Hủy
          </Button>
          <Button type="submit" variant="primary" icon={Check}>
            Lưu học kỳ
          </Button>
        </div>
      </form>
    </Modal>
  );
}

export function Anomalies() {
  const { state, commit, season } = useWorkspace();
  const run = useAction();
  const [tab, setTab] = useState('open');
  const [item, setItem] = useState(null);
  const [decision, setDecision] = useState('keep');
  const [reason, setReason] = useState('');
  const [adjustment, setAdjustment] = useState(0);
  const cases = state.anomalies.filter((a) => tab === 'all' || a.status === tab);
  async function submit(e) {
    e.preventDefault();
    const ok = await run(
      () =>
        commit(
          'Xử lý bất thường XP',
          `${item.title}: ${decision} · ${reason.trim()}`,
          'affairs',
          (draft) =>
            resolveAnomaly(
              draft,
              item.id,
              decision,
              reason,
              adjustment,
              season,
              'Nguyễn Hà Linh · CTSV',
            ),
        ),
      'Đã lưu quyết định và ghi nhật ký đối soát.',
    );
    if (ok) setItem(null);
  }
  return (
    <>
      <PageHeader
        eyebrow="MINH BẠCH TRONG TỪNG GHI NHẬN"
        title="Kiểm duyệt bất thường"
        description="Kiểm tra minh chứng, ghi nhận quyết định và bảo vệ tính toàn vẹn của XP."
      />
      <div className="stats-grid three">
        <StatCard
          label="Cần xem xét"
          value={state.anomalies.filter((a) => a.status === 'open').length}
          icon={ShieldAlert}
          note="Các trường hợp chưa có quyết định"
        />
        <StatCard
          label="Mức độ cao"
          value={state.anomalies.filter((a) => a.status === 'open' && a.severity === 'high').length}
          icon={CircleAlert}
          note="Ưu tiên kiểm tra minh chứng"
          tone="red"
        />
        <StatCard
          label="Đã xử lý"
          value={state.anomalies.filter((a) => a.status === 'resolved').length}
          icon={ShieldCheck}
          note="Có lý do và lịch sử đối soát"
          tone="green"
        />
      </div>
      <Panel>
        <Tabs
          active={tab}
          onChange={setTab}
          items={[
            { id: 'open', label: 'Cần xem xét' },
            { id: 'resolved', label: 'Đã xử lý' },
            { id: 'ledger', label: 'Sổ cái XP' },
          ]}
        />
        {tab === 'ledger' ? (
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>BÚT TOÁN</th>
                  <th>NGUỒN GHI NHẬN</th>
                  <th>XP</th>
                  <th>PHIÊN BẢN</th>
                  <th>LÝ DO</th>
                </tr>
              </thead>
              <tbody>
                {state.ledger.map((entry) => (
                  <tr key={entry.id}>
                    <td>
                      <Badge tone={entry.type === 'award' ? 'green' : 'orange'}>
                        {entry.type === 'award' ? 'Ghi nhận gốc' : 'Điều chỉnh'}
                      </Badge>
                      <small className="cell-sub">{entry.id.slice(0, 12)}</small>
                    </td>
                    <td>
                      {entry.source}
                      <small className="cell-sub">{entry.actor}</small>
                      {entry.originalId && (
                        <small className="cell-sub">Tham chiếu: {entry.originalId}</small>
                      )}
                    </td>
                    <td className={entry.amount < 0 ? 'orange-text' : 'green-text'}>
                      <b>
                        {entry.amount > 0 ? '+' : ''}
                        {entry.amount}
                      </b>
                    </td>
                    <td>v{entry.rubricVersion}</td>
                    <td className="wrap-cell">{entry.reason}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : cases.length ? (
          <div className="anomaly-list">
            {cases.map((a) => (
              <div className="anomaly-row" key={a.id}>
                <span className={`anomaly-icon ${a.severity}`}>
                  <ShieldAlert size={23} />
                </span>
                <div>
                  <div className="anomaly-title">
                    <h3>{a.title}</h3>
                    <Badge tone={a.severity === 'high' ? 'red' : 'orange'}>
                      {a.severity === 'high' ? 'Mức cao' : 'Cần kiểm tra'}
                    </Badge>
                  </div>
                  <p>
                    {a.club} · {a.count} lượt ghi nhận liên quan
                  </p>
                  <small>
                    {date(a.time)} · {a.amount} XP cần đối soát · Fall 2026
                  </small>
                </div>
                <Button
                  onClick={() => {
                    setItem(a);
                    setReason(a.reason || '');
                    setDecision('keep');
                    setAdjustment(0);
                  }}
                >
                  {a.status === 'open' ? 'Xem xét' : 'Xem quyết định'}
                  <ChevronRight size={15} />
                </Button>
              </div>
            ))}
          </div>
        ) : (
          <Empty
            title="Không có trường hợp trong nhóm này"
            description="Các quyết định xử lý được lưu cùng nhật ký và sổ cái XP."
          />
        )}
      </Panel>
      <div className="info-line">
        <ShieldCheck size={17} />
        Sổ cái chỉ ghi thêm: điều chỉnh hoặc thu hồi tạo bút toán đảo, giữ nguyên dữ liệu gốc.
      </div>
      {item && (
        <Modal
          title={item.title}
          description={`${item.club} · ${item.source}`}
          wide
          onClose={() => setItem(null)}
        >
          <form onSubmit={submit}>
            <div className="modal-body detail-content">
              <div className="evidence-box">
                <h3>Dữ liệu cần xác minh</h3>
                <p>{item.evidence}</p>
                <p>
                  <b>XP đang đối soát:</b> {item.amount} XP · Sinh viên:{' '}
                  {state.accounts.find((a) => a.id === item.student)?.username || item.student}
                </p>
                <small>
                  Đây là trường hợp minh họa. Quyết định chỉ áp dụng cho bút toán được liên kết
                  trong sổ cái.
                </small>
              </div>
              {item.status === 'open' ? (
                <>
                  <Field label="Quyết định xử lý">
                    <select value={decision} onChange={(e) => setDecision(e.target.value)}>
                      <option value="keep">Giữ nguyên — ghi nhận hợp lệ</option>
                      <option value="adjust">Điều chỉnh giảm XP</option>
                      <option value="revoke">Thu hồi toàn bộ XP của bút toán</option>
                    </select>
                  </Field>
                  {decision === 'adjust' && (
                    <Field label="XP hợp lệ sau điều chỉnh">
                      <input
                        type="number"
                        required
                        min={0}
                        max={item.amount - 1}
                        step={1}
                        value={adjustment}
                        onChange={(e) => setAdjustment(e.target.value)}
                      />
                    </Field>
                  )}
                  <Field label="Lý do và kết quả kiểm tra *">
                    <textarea
                      required
                      minLength={10}
                      maxLength={1500}
                      rows={3}
                      value={reason}
                      onChange={(e) => setReason(e.target.value)}
                      placeholder="Mô tả kết quả đối chiếu, minh chứng và cơ sở đưa ra quyết định…"
                    />
                  </Field>
                  {decision !== 'keep' && (
                    <div className="warning-box">
                      Sẽ ghi thêm một bút toán{' '}
                      {decision === 'revoke' ? -item.amount : Number(adjustment) - item.amount} XP
                      liên kết với bút toán gốc. Phần điều chỉnh thuộc học kỳ của đóng góp gốc.
                    </div>
                  )}
                </>
              ) : (
                <>
                  <h3>Kết quả xử lý</h3>
                  <Badge tone="green">
                    {item.decision === 'keep'
                      ? 'Giữ nguyên XP'
                      : item.decision === 'adjust'
                        ? 'Đã điều chỉnh XP'
                        : 'Đã thu hồi XP'}
                  </Badge>
                  <p>{item.reason}</p>
                  <small>Ngày xử lý: {date(item.resolvedAt)}</small>
                </>
              )}
            </div>
            <div className="modal-footer">
              <Button type="button" onClick={() => setItem(null)}>
                Đóng
              </Button>
              {item.status === 'open' && (
                <Button type="submit" variant="primary" icon={ShieldCheck}>
                  Xác nhận quyết định
                </Button>
              )}
            </div>
          </form>
        </Modal>
      )}
    </>
  );
}
