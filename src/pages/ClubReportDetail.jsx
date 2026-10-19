import { useEffect, useRef, useState } from 'react';
import { Link, useLocation, useParams } from 'react-router-dom';
import { ArrowLeft, Check, Download, Eye, RefreshCw } from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';
import { useWorkspace } from '../context/WorkspaceContext.jsx';
import api from '../services/api.js';
import { reportWorkflows } from '../services/report-workflows.js';
import { useOperationQuery } from '../hooks/useOperationQuery.js';
import {
  canDecideReport,
  REPORT_STATUSES,
  REPORT_TYPES,
  reportStateMessage,
  reportTitle,
  reportType,
  safeEvidenceUrl,
} from '../utils/report-workflow.js';
import { date, number } from '../utils/format.js';
import { Badge, Button, Field, Modal, PageHeader, Panel } from '../components/ui/index.js';
import { OperationState } from '../components/operations/OperationState.jsx';

function UploadedPreview({ reportId }) {
  const [result, setResult] = useState(null);
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let active = true,
      url;
    setResult(null);
    api.reports.file.preview(reportId).then(
      (bytes) => {
        if (!active) return;
        url = URL.createObjectURL(new Blob([bytes], { type: 'application/pdf' }));
        setResult({ url });
      },
      (error) => {
        if (active) setResult({ error });
      },
    );
    return () => {
      active = false;
      if (url) URL.revokeObjectURL(url);
    };
  }, [reportId, attempt]);
  return (
    <OperationState
      loading={!result}
      error={result?.error}
      onRetry={() => setAttempt((value) => value + 1)}
    >
      {result?.url && (
        <iframe
          title="Bản xem trước báo cáo PDF"
          src={result.url}
          className="w-full h-[65dvh] border-0"
        />
      )}
    </OperationState>
  );
}

export function ClubReportDetail() {
  const { reportId } = useParams();
  return <ClubReportView key={reportId} reportId={reportId} />;
}

function ClubReportView({ reportId }) {
  const { user } = useAuth();
  const { notify } = useWorkspace();
  const location = useLocation();
  const result = useOperationQuery(() => reportWorkflows.get(reportId), `${user?.id}:${reportId}`);
  const report = result.data;
  const [tab, setTab] = useState('content'),
    [decision, setDecision] = useState(''),
    [feedback, setFeedback] = useState('');
  const [busy, setBusy] = useState(false),
    [error, setError] = useState(''),
    [preview, setPreview] = useState(false);
  const lock = useRef(false),
    alive = useRef(true);
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);
  const act = async (operation) => {
    if (lock.current) return;
    lock.current = true;
    setBusy(true);
    setError('');
    try {
      await operation();
    } catch (issue) {
      if (alive.current) setError(issue.message);
    } finally {
      lock.current = false;
      if (alive.current) setBusy(false);
    }
  };
  const confirm = async (event) => {
    event.preventDefault();
    if (!canDecideReport(user, report)) return;
    await act(async () => {
      await reportWorkflows.decide(report, decision, feedback);
      if (!alive.current) return;
      setDecision('');
      setFeedback('');
      result.retry();
      notify(
        decision === 'approve'
          ? 'Đã phê duyệt báo cáo.'
          : 'Đã gửi phản hồi để CLB chỉnh sửa và nộp lại.',
      );
    });
  };
  const back = location.state?.returnTo?.startsWith('/ctsv/')
    ? location.state.returnTo
    : '/ctsv/reports';
  return (
    <>
      <Link to={back} className="inline-flex items-center gap-2 text-xs text-muted mb-5">
        <ArrowLeft size={15} /> Danh sách báo cáo
      </Link>
      <PageHeader
        title={report ? reportTitle(report) : 'Chi tiết báo cáo'}
        description={
          report
            ? `${report.clubName} · ${report.period} · Báo cáo #${report.id}`
            : 'Đọc nội dung và lịch sử xử lý của câu lạc bộ.'
        }
      >
        <Button
          icon={RefreshCw}
          disabled={busy}
          onClick={() => {
            setError('');
            result.retry();
          }}
        >
          Tải lại
        </Button>
      </PageHeader>
      <OperationState {...result} onRetry={result.retry}>
        {report && (
          <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_280px]">
            <Panel>
              <div
                className="flex flex-wrap gap-2 p-4 border-b border-border"
                role="group"
                aria-label="Nội dung báo cáo"
              >
                {[
                  ['content', 'Nội dung'],
                  ['files', 'Tệp đính kèm'],
                  ['history', 'Lịch sử & phản hồi'],
                ].map(([value, label]) => (
                  <Button
                    key={value}
                    variant={tab === value ? 'primary' : 'secondary'}
                    aria-pressed={tab === value}
                    onClick={() => setTab(value)}
                  >
                    {label}
                  </Button>
                ))}
              </div>
              <div className="p-5 sm:p-6 space-y-6 break-words">
                {tab === 'content' && (
                  <>
                    {Object.entries({
                      executiveSummary: 'Tóm tắt báo cáo',
                      achievements: 'Kết quả đạt được',
                      challenges: 'Khó khăn',
                      recommendations: 'Kiến nghị',
                      nextPeriodPlan: 'Kế hoạch tiếp theo',
                    }).map(
                      ([key, label]) =>
                        report[key] && (
                          <section key={key}>
                            <h2>{label}</h2>
                            <p className="mt-2 whitespace-pre-wrap">{report[key]}</p>
                          </section>
                        ),
                    )}
                    {!report.details?.length && !report.executiveSummary && (
                      <p className="text-muted">
                        {report.uploadedFile
                          ? 'Nội dung báo cáo nằm trong tệp đã tải lên. Mở tab Tệp đính kèm để đọc.'
                          : 'Chưa có nội dung chi tiết.'}
                      </p>
                    )}
                    {report.details?.map((item) => (
                      <section key={item.id} className="border-t border-border pt-5 space-y-3">
                        <h2>{item.activityName}</h2>
                        <p className="text-xs text-muted">
                          {date(item.activityDate)}
                          {item.location ? ` · ${item.location}` : ''}
                        </p>
                        {Object.entries({
                          objective: 'Mục tiêu',
                          description: 'Nội dung',
                          partnerUnit: 'Đơn vị phối hợp',
                          outcome: 'Kết quả',
                        }).map(
                          ([key, label]) =>
                            item[key] && (
                              <div key={key}>
                                <h3>{label}</h3>
                                <p className="whitespace-pre-wrap mt-1">{item[key]}</p>
                              </div>
                            ),
                        )}
                        <p className="text-xs">
                          {item.participantCount} người tham gia
                          {item.targetParticipantCount != null
                            ? ` · Dự kiến ${item.targetParticipantCount}`
                            : ''}
                        </p>
                        {safeEvidenceUrl(item.evidenceUrl) && (
                          <a
                            href={safeEvidenceUrl(item.evidenceUrl)}
                            className="operation-link"
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            Xem minh chứng
                          </a>
                        )}
                      </section>
                    ))}
                  </>
                )}
                {tab === 'files' && (
                  <>
                    {report.uploadedFile && (
                      <div className="space-y-3">
                        <h2>Tệp báo cáo</h2>
                        <p>{report.uploadedFile.originalFileName}</p>
                        <div className="flex flex-wrap gap-2">
                          <Button
                            icon={Eye}
                            disabled={busy || report.uploadedFile.isPreviewAvailable === false}
                            onClick={() => setPreview((value) => !value)}
                          >
                            {preview ? 'Đóng xem trước' : 'Đọc tệp báo cáo'}
                          </Button>
                          <Button
                            icon={Download}
                            disabled={busy || report.uploadedFile.isDownloadAvailable === false}
                            onClick={() => act(() => reportWorkflows.download(report))}
                          >
                            Tải bản gốc
                          </Button>
                        </div>
                        {report.uploadedFile.isPreviewAvailable === false && (
                          <p role="status">
                            {report.uploadedFile.previewErrorMessage ||
                              'Bản xem trước chưa sẵn sàng. Bạn có thể tải bản gốc.'}
                          </p>
                        )}
                        {preview && <UploadedPreview key={report.id} reportId={report.id} />}
                      </div>
                    )}
                    {report.attachments?.map((row) => (
                      <div
                        key={row.id}
                        className="flex flex-wrap items-center justify-between gap-3 border-t border-border py-3"
                      >
                        <p className="break-all">{row.fileName}</p>
                        <Button
                          icon={Download}
                          disabled={busy}
                          onClick={() => act(() => reportWorkflows.attachment(report.id, row))}
                        >
                          Tải tệp
                        </Button>
                      </div>
                    ))}
                    {!report.uploadedFile && !report.attachments?.length && (
                      <p className="text-muted">Báo cáo không có tệp đính kèm.</p>
                    )}
                  </>
                )}
                {tab === 'history' && (
                  <>
                    <dl className="space-y-3 text-xs">
                      {[
                        ['Tạo báo cáo', report.createdAtUtc],
                        ['Nộp báo cáo', report.submittedAtUtc],
                        ['Xét duyệt', report.reviewedAtUtc],
                        ['Cập nhật gần nhất', report.updatedAtUtc],
                      ].map(([label, value]) => (
                        <div key={label} className="flex justify-between gap-4">
                          <dt>{label}</dt>
                          <dd>{date(value)}</dd>
                        </div>
                      ))}
                    </dl>
                    <h2>Phản hồi đã ghi nhận</h2>
                    {!report.feedback?.length && (
                      <p className="text-muted">Chưa có phản hồi xét duyệt.</p>
                    )}
                    {report.feedback?.map((item) => (
                      <article key={item.id} className="border-t border-border pt-4">
                        <h3>{item.reviewerName || `Người xử lý #${item.reviewerUserId}`}</h3>
                        <p className="text-xs text-muted mt-1">
                          {REPORT_STATUSES[item.decision] || item.decision} ·{' '}
                          {date(item.createdAtUtc)}
                        </p>
                        <p className="whitespace-pre-wrap mt-3">{item.message}</p>
                      </article>
                    ))}
                  </>
                )}
              </div>
            </Panel>
            <div className="space-y-5">
              <Panel title="Trạng thái xử lý">
                <div className="p-5 space-y-4">
                  <Badge tone={report.status === 'Approved' ? 'green' : 'orange'}>
                    {REPORT_STATUSES[report.status] || report.status}
                  </Badge>
                  <p className="text-xs text-muted">
                    {REPORT_TYPES[reportType(report)] || reportType(report)} · Phiên bản{' '}
                    {report.version}
                  </p>
                  {reportStateMessage(report) && (
                    <p className="text-xs">{reportStateMessage(report)}</p>
                  )}
                  {canDecideReport(user, report) ? (
                    <div className="grid gap-2">
                      <Button
                        icon={Check}
                        variant="primary"
                        disabled={busy}
                        onClick={() => {
                          setError('');
                          setDecision('approve');
                        }}
                      >
                        Phê duyệt{reportType(report) === 'FUTURE_EVENT' ? ' hoạt động' : ' báo cáo'}
                      </Button>
                      <Button
                        disabled={busy}
                        onClick={() => {
                          setError('');
                          setDecision('reject');
                        }}
                      >
                        Yêu cầu chỉnh sửa / từ chối
                      </Button>
                    </div>
                  ) : (
                    report.status === 'Under Review' && (
                      <p className="text-xs text-muted">
                        Cần vai trò CTSV để quyết định. Người nộp không tự xét duyệt hồ sơ của mình.
                      </p>
                    )
                  )}
                  {report.publishedActivityId && (
                    <p>Hoạt động đã tạo: #{report.publishedActivityId}</p>
                  )}
                </div>
              </Panel>
              {report.canViewFinance && report.budgetRequestedAmount != null && (
                <Panel title="Ngân sách tài chính">
                  <dl className="p-5 space-y-3 text-xs">
                    <div>
                      <dt>Đề xuất</dt>
                      <dd>{number(report.budgetRequestedAmount)} VNĐ</dd>
                    </div>
                    {report.budgetApprovedAmount != null && (
                      <div>
                        <dt>Đã duyệt</dt>
                        <dd>{number(report.budgetApprovedAmount)} VNĐ</dd>
                      </div>
                    )}
                    <p className="text-muted">
                      Khoản tiền của hồ sơ hiện hữu, không phải ngân sách điểm trải nghiệm.
                    </p>
                  </dl>
                </Panel>
              )}
              {error && !decision && (
                <p role="alert" className="operation-notice">
                  {error}
                </p>
              )}
            </div>
          </div>
        )}
      </OperationState>
      {decision && report && (
        <Modal
          title={decision === 'approve' ? 'Xác nhận phê duyệt' : 'Phản hồi cho câu lạc bộ'}
          onClose={() => {
            if (!busy) setDecision('');
          }}
        >
          <form onSubmit={confirm} className="p-5 space-y-4">
            <p>
              {reportTitle(report)} · {report.clubName}
            </p>
            {decision === 'approve' && reportType(report) === 'FUTURE_EVENT' && (
              <p className="operation-notice">
                Quyết định này phê duyệt hồ sơ cùng ngân sách tài chính liên kết và yêu cầu hệ thống
                tạo hoạt động. Kiểm tra nội dung và ngân sách trước khi xác nhận.
              </p>
            )}
            {decision === 'reject' && (
              <p>
                Hồ sơ chuyển sang trạng thái yêu cầu chỉnh sửa / từ chối. CLB có thể sửa theo phản
                hồi và nộp lại.
              </p>
            )}
            <Field
              label={
                decision === 'reject' ? 'Lý do / nội dung cần chỉnh sửa *' : 'Nhận xét phê duyệt'
              }
            >
              <textarea
                rows={4}
                required={decision === 'reject'}
                maxLength={2000}
                value={feedback}
                onChange={(event) => setFeedback(event.target.value)}
                disabled={busy}
              />
            </Field>
            {error && <p role="alert">{error}</p>}
            <div className="flex justify-end gap-2">
              <Button type="button" disabled={busy} onClick={() => setDecision('')}>
                Hủy
              </Button>
              <Button type="submit" variant="primary" busy={busy}>
                Xác nhận quyết định
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </>
  );
}
