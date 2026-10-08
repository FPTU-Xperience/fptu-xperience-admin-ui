import { useEffect, useState } from 'react';
import { ExternalLink, FileCheck2, ShieldAlert, ShieldCheck, X } from 'lucide-react';
import api from '../services/api.js';
import { date } from '../utils/format.js';
import { useAction } from '../hooks/useAction.js';
import { Badge, Button, Empty, Field, Modal, PageHeader, Panel, StatCard, Tabs } from '../components/ui/index.js';

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

  async function fetchData() {
    setLoading(true);
    setError(null);
    try {
      const params = {};
      if (tab !== 'ALL') params.status = tab;
      const res = await api.studentAffairs.declarations.list(params);
      setDeclarations(Array.isArray(res) ? res : res?.items || []);
    } catch (err) {
      console.error('Failed to fetch declarations:', err);
      setError(err.message || 'Không thể tải danh sách hồ sơ');
      setDeclarations([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchData();
  }, [tab]);

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
      run(() => { throw new Error('Nhận xét phải từ 10 ký tự trở lên.'); });
      return;
    }
    setSubmitting(true);
    const ok = await run(
      async () => {
        await api.studentAffairs.declarations.review(review.id, {
          decision: reviewDecision,
          reviewNote: reviewNote.trim(),
        });
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
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <StatCard
          label="Chờ duyệt"
          value={pendingCount}
          icon={ShieldAlert}
          note="Hồ sơ tự khai báo"
          tone="orange"
        />
        <StatCard
          label="Đã duyệt"
          value={approvedCount}
          icon={ShieldCheck}
          note="Điểm được ghi nhận"
          tone="green"
        />
        <StatCard
          label="Từ chối / Cần làm rõ"
          value={rejectedCount}
          icon={FileCheck2}
          note="Cần bổ sung minh chứng"
          tone="neutral"
        />
      </div>

      {/* Tabs + Search */}
      <Panel className="mb-6">
        <div className="px-[22px] pt-[21px]">
          <div className="flex flex-wrap items-center gap-2 mb-[16px]">
            <Tabs
              active={tab}
              onChange={(t) => { setTab(t); setQuery(''); }}
              items={[
                { id: 'SUBMITTED', label: 'Chờ duyệt', count: pendingCount },
                { id: 'APPROVED', label: 'Đã duyệt', count: approvedCount },
                { id: 'REJECTED', label: 'Từ chối', count: rejectedCount },
                { id: 'NEED_CLARIFICATION', label: 'Cần làm rõ' },
                { id: 'ALL', label: 'Tất cả' },
              ]}
            />
            <input
              className="ml-auto h-[35px] px-3 border border-[#e1e4e9] rounded-[7px] text-[11px] text-[#718094] bg-white min-w-[200px]"
              placeholder="Tìm sinh viên, mã SV, hoạt động…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>

          {error && (
            <div className="mb-4 p-[14px] border border-[#f2dfdc] bg-[#fff3f2] text-[#bd7970] rounded-[7px] text-[11px]">
              <span className="mr-2">⚠️</span>
              {error}
              <button className="ml-2 underline hover:no-underline" onClick={fetchData}>Thử lại</button>
            </div>
          )}

          {loading ? (
            <div className="flex items-center justify-center py-8 text-[#9096a1]">
              <div className="w-5 h-5 border-2 border-[#e1e4e9] border-t-[#ed641c] rounded-full animate-spin mr-2" />
              Đang tải hồ sơ…
            </div>
          ) : filtered.length === 0 ? (
            <Empty
              title="Không có hồ sơ"
              description="Không có hồ sơ nào phù hợp với bộ lọc hiện tại."
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-left whitespace-nowrap">
                <thead>
                  <tr>
                    <th className="bg-[#fbfcfd] text-[#7b8797] font-medium text-[9.5px] tracking-[0.5px] px-5 py-[13px] border-y border-[#f0f2f5]">
                      SINH VIÊN
                    </th>
                    <th className="bg-[#fbfcfd] text-[#7b8797] font-medium text-[9.5px] tracking-[0.5px] px-5 py-[13px] border-y border-[#f0f2f5]">
                      HOẠT ĐỘNG
                    </th>
                    <th className="bg-[#fbfcfd] text-[#7b8797] font-medium text-[9.5px] tracking-[0.5px] px-5 py-[13px] border-y border-[#f0f2f5]">
                      CHIỀU NL
                    </th>
                    <th className="bg-[#fbfcfd] text-[#7b8797] font-medium text-[9.5px] tracking-[0.5px] px-5 py-[13px] border-y border-[#f0f2f5]">
                      ĐIỂM ĐỀ XUẤT
                    </th>
                    <th className="bg-[#fbfcfd] text-[#7b8797] font-medium text-[9.5px] tracking-[0.5px] px-5 py-[13px] border-y border-[#f0f2f5]">
                      MINH CHỨNG
                    </th>
                    <th className="bg-[#fbfcfd] text-[#7b8797] font-medium text-[9.5px] tracking-[0.5px] px-5 py-[13px] border-y border-[#f0f2f5]">
                      TRẠNG THÁI
                    </th>
                    <th className="bg-[#fbfcfd] text-[#7b8797] font-medium text-[9.5px] tracking-[0.5px] px-5 py-[13px] border-y border-[#f0f2f5]">
                      NGÀY NỘP
                    </th>
                    <th className="bg-[#fbfcfd] text-[#7b8797] font-medium text-[9.5px] tracking-[0.5px] px-5 py-[13px] border-y border-[#f0f2f5]" />
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((d) => (
                    <tr key={d.id} className="hover:bg-[#fafbfc] transition-colors">
                      <td className="px-5 py-[15px] border-b border-[#f0f2f5] last:border-b-0">
                        <strong className="block text-[11px] font-medium text-[#4a5462]">{d.studentName || '—'}</strong>
                        <small className="block text-[9.5px] text-[#b4b9c1] mt-[3px]">{d.studentCode || '—'}</small>
                      </td>
                      <td className="px-5 py-[15px] border-b border-[#f0f2f5] last:border-b-0">
                        <span className="text-[11px] text-[#4a5462]">{d.activityName || d.activity || '—'}</span>
                      </td>
                      <td className="px-5 py-[15px] border-b border-[#f0f2f5] last:border-b-0">
                        <span
                          className="inline-block text-[9px] font-semibold px-[7px] py-[3px] rounded-full text-white"
                          style={{ background: capabilityColor(d.capability) }}
                        >
                          {capabilityLabel(d.capability)}
                        </span>
                      </td>
                      <td className="px-5 py-[15px] border-b border-[#f0f2f5] last:border-b-0">
                        <span className="text-[12px] font-semibold text-[#ed641c]">
                          {typeof d.awardedScore === 'number' ? d.awardedScore : d.suggestedScore || '—'}
                        </span>
                        <span className="text-[9.5px] text-[#adb3bc] block mt-[2px]">
                          {d.proposedFormula || ''}
                        </span>
                      </td>
                      <td className="px-5 py-[15px] border-b border-[#f0f2f5] last:border-b-0">
                        {(d.evidenceUrls || []).length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {(d.evidenceUrls || []).slice(0, 2).map((url, i) => (
                              <a
                                key={i}
                                href={url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-[4px] text-[9.5px] text-[#5b8dd9] hover:underline"
                              >
                                <ExternalLink size={11} />
                                Minh chứng {i + 1}
                              </a>
                            ))}
                            {(d.evidenceUrls || []).length > 2 && (
                              <span className="text-[9.5px] text-[#adb3bc]">
                                +{(d.evidenceUrls || []).length - 2} khác
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-[10px] text-[#adb3bc]">Không có</span>
                        )}
                      </td>
                      <td className="px-5 py-[15px] border-b border-[#f0f2f5] last:border-b-0">
                        <Badge tone={STATUS_TONES[d.status] || 'neutral'}>
                          {STATUS_LABELS[d.status] || d.status}
                        </Badge>
                      </td>
                      <td className="px-5 py-[15px] border-b border-[#f0f2f5] last:border-b-0 text-[11px] text-[#727b89]">
                        {date(d.submittedAt || d.createdAt)}
                      </td>
                      <td className="px-5 py-[15px] border-b border-[#f0f2f5] last:border-b-0">
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
      {review && (
        <Modal
          title={review.studentName || 'Hồ sơ tự khai'}
          description={`${review.studentCode || ''} · ${review.activityName || review.activity || ''}`}
          wide
          onClose={() => setReview(null)}
        >
          <form onSubmit={submitDecision}>
            <div className="px-[26px] py-6">
              {/* Score details */}
              <div className="grid sm:grid-cols-3 gap-[18px] mb-[22px]">
                <div className="bg-[#fff6ec] rounded-[9px] p-[18px] text-center">
                  <p className="text-[10px] text-[#bd9b7e] mb-[8px]">ĐIỂM ĐỀ XUẤT</p>
                  <p className="text-[28px] font-semibold text-[#ed641c]">
                    {typeof review.awardedScore === 'number' ? review.awardedScore : review.suggestedScore || '—'}
                  </p>
                </div>
                <div className="bg-[#f4f7fb] rounded-[9px] p-[18px]">
                  <p className="text-[10px] text-[#9caab8] mb-[8px]">CHIỀU NĂNG LỰC</p>
                  <span
                    className="inline-block text-[11px] font-semibold px-[10px] py-[4px] rounded-full text-white"
                    style={{ background: capabilityColor(review.capability) }}
                  >
                    {capabilityLabel(review.capability)}
                  </span>
                </div>
                <div className="bg-[#f4f7fb] rounded-[9px] p-[18px]">
                  <p className="text-[10px] text-[#9caab8] mb-[8px]">CÔNG THỨC</p>
                  <p className="text-[11px] text-[#7a8799] font-mono">
                    {review.proposedFormula || 'P = B × min(R×Q, 8) × (1+K)'}
                  </p>
                </div>
              </div>

              {/* Evidence */}
              <h3 className="text-[12px] text-[#7a8799] font-semibold mb-[10px]">Minh chứng đính kèm</h3>
              {(review.evidenceUrls || []).length > 0 ? (
                <div className="flex flex-wrap gap-[10px] mb-[22px]">
                  {(review.evidenceUrls || []).map((url, i) => (
                    <a
                      key={i}
                      href={url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-[6px] px-[12px] py-[8px] bg-[#f4f7fb] border border-[#e4ebf3] rounded-[7px] text-[11px] text-[#5b8dd9] hover:bg-[#eef5fd] transition-colors"
                    >
                      <ExternalLink size={13} />
                      Minh chứng {i + 1}
                    </a>
                  ))}
                </div>
              ) : (
                <p className="text-[11px] text-[#adb3bc] mb-[22px]">Không có minh chứng đính kèm.</p>
              )}

              {/* Review form — only for SUBMITTED */}
              {review.status === 'SUBMITTED' ? (
                <>
                  <Field label="Quyết định" className="mb-[18px]">
                    <select
                      className="w-full h-[39px] px-[12px] border border-[#e1e4e9] rounded-[7px] text-[12px]"
                      value={reviewDecision}
                      onChange={(e) => setReviewDecision(e.target.value)}
                    >
                      <option value="APPROVED">Phê duyệt — ghi nhận điểm</option>
                      <option value="REJECTED">Từ chối — không ghi nhận điểm</option>
                      <option value="NEED_CLARIFICATION">Cần làm rõ — yêu cầu bổ sung</option>
                    </select>
                  </Field>
                  <Field label="Nhận xét phê duyệt *" className="mb-4">
                    <textarea
                      required
                      rows={3}
                      minLength={10}
                      maxLength={1500}
                      value={reviewNote}
                      onChange={(e) => setReviewNote(e.target.value)}
                      placeholder="Mô tả kết quả kiểm tra minh chứng, cơ sở quyết định…"
                    />
                  </Field>
                  <div className={`p-[14px] rounded-[7px] text-[11px] leading-[1.8] ${
                    reviewDecision === 'APPROVED'
                      ? 'border border-[#d0e8de] bg-[#f0faf5] text-[#5a9078]'
                      : reviewDecision === 'REJECTED'
                        ? 'border border-[#f2dfdc] bg-[#fff3f2] text-[#bd7970]'
                        : 'border border-[#e4ebf3] bg-[#f4f7fb] text-[#70869e]'
                  }`}>
                    {reviewDecision === 'APPROVED'
                      ? `Điểm ${typeof review.awardedScore === 'number' ? review.awardedScore : review.suggestedScore || 0} sẽ được ghi nhận vào hồ sơ sinh viên.`
                      : reviewDecision === 'REJECTED'
                        ? 'Hồ sơ sẽ bị từ chối, sinh viên có thể nộp lại với minh chứng bổ sung.'
                        : 'Sinh viên sẽ nhận được thông báo yêu cầu làm rõ cùng nhận xét của bạn.'}
                  </div>
                </>
              ) : (
                <div className="p-[14px] border border-[#e4ebf3] bg-[#f4f7fb] text-[#70869e] rounded-[7px] text-[11px] leading-[1.8] mb-4">
                  <b className="font-semibold">{STATUS_LABELS[review.status] || review.status}</b>
                  <p className="mt-[5px]">{review.reviewNote || review.review?.reviewNote || '—'}</p>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="sticky bottom-0 z-[1] border-t border-[#e9ebee] px-[26px] py-[17px] flex gap-[10px] justify-end bg-[#fdfdfe] rounded-b-[14px]">
              <Button type="button" onClick={() => setReview(null)}>Đóng</Button>
              {review.status === 'SUBMITTED' && (
                <>
                  <Button
                    type="button"
                    variant="danger-soft"
                    icon={X}
                    onClick={() => { setReviewDecision('REJECTED'); }}
                    disabled={submitting}
                  >
                    Từ chối
                  </Button>
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => { setReviewDecision('NEED_CLARIFICATION'); }}
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
                    Phê duyệt
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
