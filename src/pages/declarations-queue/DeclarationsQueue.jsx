import './DeclarationsQueue.css';
import { useEffect, useRef, useState } from 'react';
import { ExternalLink, FileCheck2, ShieldAlert, ShieldCheck, X } from 'lucide-react';
import api from '../../services/api.js';
import { mapDeclaration, declarationReview } from '../../utils/declaration-contract.js';
import { date } from '../../utils/format.js';
import { useAction } from '../../hooks/useAction.js';
import {
  Badge,
  Button,
  Empty,
  Field,
  Modal,
  PageHeader,
  Panel,
  StatCard,
  Tabs,
} from '../../components/ui/index.js';

const CAPABILITIES = [
  { code: 'ACAD', label: 'Học thuật', color: '#5b8dd9' },
  { code: 'PROF', label: 'Kỹ năng nghề nghiệp', color: '#7c6fcd' },
  { code: 'COMM', label: 'Cộng đồng', color: '#3fa87b' },
  { code: 'PHYS', label: 'Thể chất', color: '#d97b3e' },
  { code: 'GLOB', label: 'Công dân toàn cầu', color: '#c85fa8' },
  { code: 'ETHI', label: 'Đạo đức & Kỹ năng sống', color: '#8a6f3f' },
];

const STATUS_LABELS = {
  SUBMITTED: 'Chờ duyệt',
  APPROVED: 'Đã duyệt',
  REJECTED: 'Từ chối',
  NEED_CLARIFICATION: 'Cần làm rõ',
};

const STATUS_TONES = {
  SUBMITTED: 'orange',
  APPROVED: 'green',
  REJECTED: 'red',
  NEED_CLARIFICATION: 'neutral',
};

export function DeclarationsQueue() {
  const run = useAction();

  const [declarations, setDeclarations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filters
  const [tab, setTab] = useState('SUBMITTED');
  const [query, setQuery] = useState('');

  // Review modal
  const [review, setReview] = useState(null);
  const [reviewNote, setReviewNote] = useState('');
  const [reviewDecision, setReviewDecision] = useState('APPROVED');
  const [submitting, setSubmitting] = useState(false);
  const [reviewAttributes, setReviewAttributes] = useState(null);
  const [page, setPage] = useState(1),
    [totalPages, setTotalPages] = useState(1);
  const requestVersion = useRef(0);

  async function fetchData() {
    const ticket = ++requestVersion.current;
    setLoading(true);
    setError(null);
    try {
      const params = { page, pageSize: 20 };
      if (tab !== 'ALL')
        params.status = {
          SUBMITTED: 'Submitted',
          APPROVED: 'Approved',
          REJECTED: 'Rejected',
          NEED_CLARIFICATION: 'RevisionRequested',
        }[tab];
      const res = await api.studentAffairs.declarations.list(params);
      if (ticket !== requestVersion.current) return;
      setDeclarations((Array.isArray(res) ? res : res?.items || []).map(mapDeclaration));
      setTotalPages(res?.totalPages || 1);
    } catch (err) {
      if (ticket !== requestVersion.current) return;
      console.error('Failed to fetch declarations:', err);
      setError(err.message || 'Không thể tải danh sách hồ sơ');
      setDeclarations([]);
    } finally {
      if (ticket === requestVersion.current) setLoading(false);
    }
  }

  useEffect(() => {
    fetchData();
    return () => {
      requestVersion.current++;
    };
  }, [tab, page]);

  // Stats
  const pendingCount = declarations.filter((d) => d.status === 'SUBMITTED').length;
  const approvedCount = declarations.filter((d) => d.status === 'APPROVED').length;
  const rejectedCount = declarations.filter((d) => d.status === 'REJECTED').length;

  // Filter by query
  const filtered = declarations.filter((d) => {
    const q = query.toLowerCase();
    return (
      !q ||
      (d.studentName || '').toLowerCase().includes(q) ||
      (d.studentCode || '').toLowerCase().includes(q) ||
      (d.activityName || '').toLowerCase().includes(q)
    );
  });

  async function submitDecision(e) {
    e.preventDefault();
    if (reviewNote.trim().length < 10) {
      run(() => {
        throw new Error('Nhận xét phải từ 10 ký tự trở lên.');
      });
      return;
    }
    setSubmitting(true);
    const ok = await run(
      async () => {
        await api.studentAffairs.declarations.review(
          review.id,
          declarationReview(review, reviewDecision, reviewNote.trim(), reviewAttributes),
        );
        setReview(null);
        setReviewNote('');
        setReviewDecision('APPROVED');
        await fetchData();
      },
      `Đã ${reviewDecision === 'APPROVED' ? 'phê duyệt' : reviewDecision === 'REJECTED' ? 'từ chối' : 'yêu cầu làm rõ'} hồ sơ.`,
    );
    setSubmitting(false);
    if (ok) setReview(null);
  }

  function openReview(d) {
    setReview(d);
    setReviewAttributes(d.proposedAttributes ? structuredClone(d.proposedAttributes) : null);
    setReviewNote('');
    setReviewDecision('APPROVED');
  }

  function capabilityLabel(code) {
    const found = CAPABILITIES.find((c) => c.code === code);
    return found ? found.label : code || '—';
  }

  function capabilityColor(code) {
    const found = CAPABILITIES.find((c) => c.code === code);
    return found ? found.color : '#888';
  }

  return (
    <>
      <PageHeader
        eyebrow="HỒ SƠ TỰ KHAI BÁO"
        title="Duyệt hồ sơ tự khai"
        description="Xem xét minh chứng và phê duyệt điểm tự khai báo của sinh viên."
      />

      {/* Stats */}
      <div className="declarations-queue-content">
        <StatCard
          label="Chờ duyệt (trang này)"
          value={pendingCount}
          icon={ShieldAlert}
          note="Hồ sơ tự khai báo"
          tone="orange"
        />
        <StatCard
          label="Đã duyệt (trang này)"
          value={approvedCount}
          icon={ShieldCheck}
          note="Điểm được ghi nhận"
          tone="green"
        />
        <StatCard
          label="Từ chối / Cần làm rõ (trang này)"
          value={rejectedCount}
          icon={FileCheck2}
          note="Cần bổ sung minh chứng"
          tone="neutral"
        />
      </div>

      {/* Tabs + Search */}
      <Panel className="declarations-queue-panel">
        <div className="declarations-queue-content-2">
          <div className="declarations-queue-content-3">
            <Tabs
              active={tab}
              onChange={(t) => {
                setTab(t);
                setQuery('');
                setPage(1);
              }}
              items={[
                { id: 'SUBMITTED', label: 'Chờ duyệt', count: pendingCount },
                { id: 'APPROVED', label: 'Đã duyệt', count: approvedCount },
                { id: 'REJECTED', label: 'Từ chối', count: rejectedCount },
                { id: 'NEED_CLARIFICATION', label: 'Cần làm rõ' },
                { id: 'ALL', label: 'Tất cả' },
              ]}
            />
            <input
              className="declarations-queue-input"
              placeholder="Tìm sinh viên, mã SV, hoạt động…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>

          {error && (
            <div className="declarations-queue-content-4">
              <span className="declarations-queue-text">⚠️</span>
              {error}
              <button className="declarations-queue-button" onClick={fetchData}>
                Thử lại
              </button>
            </div>
          )}

          {loading ? (
            <div className="declarations-queue-content-5">
              <div className="declarations-queue-content-6" />
              Đang tải hồ sơ…
            </div>
          ) : filtered.length === 0 ? (
            <Empty
              title="Không có hồ sơ"
              description="Không có hồ sơ nào phù hợp với bộ lọc hiện tại."
            />
          ) : (
            <div className="declarations-queue-content-7">
              <table className="declarations-queue-table">
                <thead>
                  <tr>
                    <th className="declarations-queue-column">SINH VIÊN</th>
                    <th className="declarations-queue-column">HOẠT ĐỘNG</th>
                    <th className="declarations-queue-column">CHIỀU NL</th>
                    <th className="declarations-queue-column">ĐIỂM ĐỀ XUẤT</th>
                    <th className="declarations-queue-column">MINH CHỨNG</th>
                    <th className="declarations-queue-column">TRẠNG THÁI</th>
                    <th className="declarations-queue-column">NGÀY NỘP</th>
                    <th className="declarations-queue-column" />
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((d) => (
                    <tr key={d.id} className="declarations-queue-row">
                      <td className="declarations-queue-cell">
                        <strong className="declarations-queue-value">{d.studentName || '—'}</strong>
                        <small className="declarations-queue-caption">{d.studentCode || '—'}</small>
                      </td>
                      <td className="declarations-queue-cell">
                        <span className="declarations-queue-text-2">
                          {d.activityName || d.activity || '—'}
                        </span>
                      </td>
                      <td className="declarations-queue-cell">
                        <span
                          className="declarations-queue-text-3"
                          style={{ background: capabilityColor(d.capability) }}
                        >
                          {capabilityLabel(d.capability)}
                        </span>
                      </td>
                      <td className="declarations-queue-cell">
                        <span className="declarations-queue-text-4">
                          {typeof d.awardedScore === 'number'
                            ? d.awardedScore
                            : d.suggestedScore || '—'}
                        </span>
                        <span className="declarations-queue-text-5">{d.proposedFormula || ''}</span>
                      </td>
                      <td className="declarations-queue-cell">
                        {(d.evidenceUrls || []).length > 0 ? (
                          <div className="declarations-queue-content-8">
                            {(d.evidenceUrls || []).slice(0, 2).map((url, i) => (
                              <a
                                key={i}
                                href={url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="declarations-queue-link"
                              >
                                <ExternalLink size={11} />
                                Minh chứng {i + 1}
                              </a>
                            ))}
                            {(d.evidenceUrls || []).length > 2 && (
                              <span className="declarations-queue-text-6">
                                +{(d.evidenceUrls || []).length - 2} khác
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="declarations-queue-text-7">Không có</span>
                        )}
                      </td>
                      <td className="declarations-queue-cell">
                        <Badge tone={STATUS_TONES[d.status] || 'neutral'}>
                          {STATUS_LABELS[d.status] || d.status}
                        </Badge>
                      </td>
                      <td className="declarations-queue-cell-2">
                        {date(d.submittedAt || d.createdAt)}
                      </td>
                      <td className="declarations-queue-cell">
                        <Button size="sm" onClick={() => openReview(d)}>
                          {d.status === 'SUBMITTED' ? 'Xem xét' : 'Chi tiết'}
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </Panel>

      {/* Review Modal */}
      <nav aria-label="Trang hồ sơ" className="declarations-queue-navigation">
        <Button disabled={loading || page <= 1} onClick={() => setPage((value) => value - 1)}>
          Trước
        </Button>
        <span>
          Trang {page}/{totalPages}
        </span>
        <Button
          disabled={loading || page >= totalPages}
          onClick={() => setPage((value) => value + 1)}
        >
          Sau
        </Button>
      </nav>
      {review && (
        <Modal
          title={review.studentName || 'Hồ sơ tự khai'}
          description={`${review.studentCode || ''} · ${review.activityName || review.activity || ''}`}
          wide
          onClose={() => setReview(null)}
        >
          <form onSubmit={submitDecision}>
            <div className="declarations-queue-content-9">
              {/* Score details */}
              <div className="declarations-queue-content-10">
                <div className="declarations-queue-content-11">
                  <p className="declarations-queue-description">ĐIỂM ĐỀ XUẤT</p>
                  <p className="declarations-queue-description-2">
                    {typeof review.awardedScore === 'number'
                      ? review.awardedScore
                      : review.suggestedScore || '—'}
                  </p>
                </div>
                <div className="declarations-queue-content-12">
                  <p className="declarations-queue-description-3">CHIỀU NĂNG LỰC</p>
                  <span
                    className="declarations-queue-text-8"
                    style={{ background: capabilityColor(review.capability) }}
                  >
                    {capabilityLabel(review.capability)}
                  </span>
                </div>
                <div className="declarations-queue-content-12">
                  <p className="declarations-queue-description-3">CÔNG THỨC</p>
                  <p className="declarations-queue-description-4">
                    {review.proposedFormula || 'P = B × min(R×Q, 8) × (1+K)'}
                  </p>
                </div>
              </div>

              {/* Evidence */}
              <h3 className="declarations-queue-subheading">Minh chứng đính kèm</h3>
              {(review.evidenceUrls || []).length > 0 ? (
                <div className="declarations-queue-content-13">
                  {(review.evidenceUrls || []).map((url, i) => (
                    <a
                      key={i}
                      href={url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="declarations-queue-link-2"
                    >
                      <ExternalLink size={13} />
                      Minh chứng {i + 1}
                    </a>
                  ))}
                </div>
              ) : (
                <p className="declarations-queue-description-5">Không có minh chứng đính kèm.</p>
              )}

              {/* Review form — only for SUBMITTED */}
              {review.evidenceRefs?.map((id, index) => (
                <Button
                  type="button"
                  key={id}
                  onClick={() =>
                    run(() =>
                      api.downloadBlob(
                        `/api/contributions/evidence/${encodeURIComponent(id)}/download`,
                        `evidence-${id}`,
                      ),
                    )
                  }
                >
                  Tải minh chứng riêng tư {index + 1}
                </Button>
              ))}
              {review.version && reviewAttributes && (
                <fieldset
                  className="declarations-queue-fieldset"
                  disabled={submitting || review.status !== 'SUBMITTED'}
                >
                  <legend>Thuộc tính xác minh</legend>
                  {Object.entries({
                    tier: ['T1', 'T2', 'T3', 'T4', 'T5'],
                    role: ['Participant', 'Contributor', 'Product', 'Organizer', 'Leader'],
                    scale: ['Club', 'Campus', 'FptEducation', 'National', 'International'],
                    result: ['None', 'Finalist', 'Prize', 'RealWorldOutput'],
                  }).map(([field, values]) => (
                    <Field
                      key={field}
                      label={
                        {
                          tier: 'Mức công sức',
                          role: 'Vai trò đóng góp',
                          scale: 'Quy mô',
                          result: 'Kết quả',
                        }[field]
                      }
                    >
                      <select
                        value={reviewAttributes[field]}
                        onChange={(event) =>
                          setReviewAttributes((current) => ({
                            ...current,
                            [field]: event.target.value,
                          }))
                        }
                      >
                        {values.map((value) => (
                          <option key={value}>{value}</option>
                        ))}
                      </select>
                    </Field>
                  ))}
                  {reviewAttributes.pillarWeights.map((weight, index) => (
                    <div key={index} className="declarations-queue-content-14">
                      <Field label="Trụ cột">
                        <select
                          value={weight.pillar}
                          onChange={(event) =>
                            setReviewAttributes((current) => ({
                              ...current,
                              pillarWeights: current.pillarWeights.map((item, i) =>
                                i === index ? { ...item, pillar: event.target.value } : item,
                              ),
                            }))
                          }
                        >
                          {[
                            'Academic',
                            'Research',
                            'Global',
                            'CultureSports',
                            'Community',
                            'Entrepreneurship',
                            'RealWorldWork',
                          ].map((pillar) => (
                            <option key={pillar}>{pillar}</option>
                          ))}
                        </select>
                      </Field>
                      <Field label="Tỷ trọng">
                        <input
                          type="number"
                          min="0.0001"
                          max="1"
                          step="0.0001"
                          required
                          value={weight.weight}
                          onChange={(event) =>
                            setReviewAttributes((current) => ({
                              ...current,
                              pillarWeights: current.pillarWeights.map((item, i) =>
                                i === index
                                  ? { ...item, weight: Number(event.target.value) }
                                  : item,
                              ),
                            }))
                          }
                        />
                      </Field>
                    </div>
                  ))}
                  <p>
                    Kiểm tra từng thuộc tính và minh chứng; tổng tỷ trọng phải bằng 1. Điểm cuối do
                    máy chủ tính.
                  </p>
                </fieldset>
              )}
              {review.status === 'SUBMITTED' ? (
                <>
                  <Field label="Quyết định" className="declarations-queue-field">
                    <select
                      className="declarations-queue-select"
                      value={reviewDecision}
                      onChange={(e) => setReviewDecision(e.target.value)}
                    >
                      <option value="APPROVED">Phê duyệt — ghi nhận điểm</option>
                      <option value="REJECTED">Từ chối — không ghi nhận điểm</option>
                      <option value="NEED_CLARIFICATION">Cần làm rõ — yêu cầu bổ sung</option>
                    </select>
                  </Field>
                  <Field label="Nhận xét phê duyệt *" className="declarations-queue-fieldset">
                    <textarea
                      required
                      rows={3}
                      minLength={10}
                      maxLength={1000}
                      value={reviewNote}
                      onChange={(e) => setReviewNote(e.target.value)}
                      placeholder="Mô tả kết quả kiểm tra minh chứng, cơ sở quyết định…"
                    />
                  </Field>
                  <div
                    className={`declarations-queue-content-15 ${
                      reviewDecision === 'APPROVED'
                        ? 'declarations-queue-content-state-active'
                        : reviewDecision === 'REJECTED'
                          ? 'declarations-queue-content-state-inactive-active'
                          : 'declarations-queue-content-state-inactive-inactive'
                    }`}
                  >
                    {reviewDecision === 'APPROVED'
                      ? 'Máy chủ kiểm tra quyền xác minh, phiên bản và chính sách trước khi ghi điểm.'
                      : reviewDecision === 'REJECTED'
                        ? 'Hồ sơ sẽ bị từ chối, sinh viên có thể nộp lại với minh chứng bổ sung.'
                        : 'Sinh viên sẽ nhận được thông báo yêu cầu làm rõ cùng nhận xét của bạn.'}
                  </div>
                </>
              ) : (
                <div className="declarations-queue-content-16">
                  <b className="declarations-queue-b">
                    {STATUS_LABELS[review.status] || review.status}
                  </b>
                  <p className="declarations-queue-description-6">
                    {review.reviewNote || review.review?.reviewNote || '—'}
                  </p>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="declarations-queue-content-17">
              <Button type="button" onClick={() => setReview(null)}>
                Đóng
              </Button>
              {review.status === 'SUBMITTED' && (
                <>
                  <Button
                    type="button"
                    variant="danger-soft"
                    icon={X}
                    onClick={() => {
                      setReviewDecision('REJECTED');
                    }}
                    disabled={submitting}
                  >
                    Từ chối
                  </Button>
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => {
                      setReviewDecision('NEED_CLARIFICATION');
                    }}
                    disabled={submitting}
                  >
                    Cần làm rõ
                  </Button>
                  <Button
                    type="submit"
                    variant="primary"
                    icon={ShieldCheck}
                    busy={submitting}
                    disabled={submitting || reviewNote.trim().length < 10}
                  >
                    {reviewDecision === 'APPROVED'
                      ? 'Phê duyệt'
                      : reviewDecision === 'REJECTED'
                        ? 'Từ chối hồ sơ'
                        : 'Yêu cầu bổ sung'}
                  </Button>
                </>
              )}
            </div>
          </form>
        </Modal>
      )}
    </>
  );
}
