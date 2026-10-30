import './ClubReportDetail.css';
import '../../components/operations/Operations.css';
import { useEffect, useRef, useState } from 'react';
import { Link, useLocation, useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Check, Download, Eye, RefreshCw } from 'lucide-react';
import { useAuth } from '../../context/AuthContext.jsx';
import { useWorkspace } from '../../context/WorkspaceContext.jsx';
import api from '../../services/api.js';
import { reportWorkflows } from '../../services/report-workflows.js';
import { useOperationQuery } from '../../hooks/useOperationQuery.js';
import {
  canDecideReport,
  REPORT_STATUSES,
  REPORT_TYPES,
  reportStateMessage,
  reportTitle,
  reportType,
  safeEvidenceUrl,
} from '../../utils/report-workflow.js';
import { date, number } from '../../utils/format.js';
import { Badge, Button, Field, Modal, PageHeader, Panel } from '../../components/ui/index.js';
import { OperationState } from '../../components/operations/operation-state/OperationState.jsx';

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
          className="club-report-detail-iframe"
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
  const navigate = useNavigate();
  const { user } = useAuth();
  const { notify } = useWorkspace();
  const location = useLocation();
  const result = useOperationQuery(() => reportWorkflows.get(reportId), `${user?.id}:${reportId}`);
  const report = result.data;
  const navigationOwner =
    report && ['CLUB_TERM_START', 'CLUB_TERM_END'].includes(reportType(report))
      ? 'clubs'
      : 'activities';
  useEffect(() => {
    if (report && location.state?.navigationOwner !== navigationOwner)
      navigate(`${location.pathname}${location.search}`, {
        replace: true,
        state: { ...location.state, navigationOwner },
      });
  }, [report?.id, navigationOwner, location.state?.navigationOwner]);
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
    : navigationOwner === 'clubs'
      ? '/ctsv/clubs?view=reports'
      : '/ctsv/activities?view=club&source=api';
  return (
    <>
      <Link to={back} className="club-report-detail-link">
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
          <div className="club-report-detail-content">
            <Panel>
              <div
                className="club-report-detail-content-2"
                role="group"
                aria-label="Nội dung báo cáo"
              >
                {[
                  ['content', 'Nội dung'],
                  ['xp', 'Điểm Xperience Point'],
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
              <div className="club-report-detail-content-3">
                {tab === 'xp' && (
                  <section>
                    <h2>Báo cáo điểm Xperience Point theo sinh viên / action</h2>
                    <p>
                      Báo cáo này chưa có bảng Xperience Point để xem hoặc chỉnh sửa.
                    </p>
                    <p>Phê duyệt báo cáo hiện tại chưa xác nhận việc ghi sổ Xperience Point theo action.</p>
                    <Link className="operation-link" to={`/ctsv/activities?view=club&source=mock`}>
                      Thử quy trình Xperience Point · Mô phỏng
                    </Link>
                  </section>
                )}
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
                            <p className="club-report-detail-description">{report[key]}</p>
                          </section>
                        ),
                    )}
                    {!report.details?.length && !report.executiveSummary && (
                      <p className="club-report-detail-description-2">
                        {report.uploadedFile
                          ? 'Nội dung báo cáo nằm trong tệp đã tải lên. Mở tab Tệp đính kèm để đọc.'
                          : 'Chưa có nội dung chi tiết.'}
                      </p>
                    )}
                    {report.details?.map((item) => (
                      <section key={item.id} className="club-report-detail-section">
                        <h2>{item.activityName}</h2>
                        <p className="club-report-detail-description-3">
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
                                <p className="club-report-detail-description-4">{item[key]}</p>
                              </div>
                            ),
                        )}
                        <p className="club-report-detail-description-5">
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
                      <div className="club-report-detail-content-4">
                        <h2>Tệp báo cáo</h2>
                        <p>{report.uploadedFile.originalFileName}</p>
                        <div className="club-report-detail-content-5">
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
                      <div key={row.id} className="club-report-detail-content-6">
                        <p className="club-report-detail-description-6">{row.fileName}</p>
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
                      <p className="club-report-detail-description-2">
                        Báo cáo không có tệp đính kèm.
                      </p>
                    )}
                  </>
                )}
                {tab === 'history' && (
                  <>
                    <dl className="club-report-detail-definition-list">
                      {[
                        ['Tạo báo cáo', report.createdAtUtc],
                        ['Nộp báo cáo', report.submittedAtUtc],
                        ['Xét duyệt', report.reviewedAtUtc],
                        ['Cập nhật gần nhất', report.updatedAtUtc],
                      ].map(([label, value]) => (
                        <div key={label} className="club-report-detail-content-7">
                          <dt>{label}</dt>
                          <dd>{date(value)}</dd>
                        </div>
                      ))}
                    </dl>
                    <h2>Phản hồi đã ghi nhận</h2>
                    {!report.feedback?.length && (
                      <p className="club-report-detail-description-2">
                        Chưa có phản hồi xét duyệt.
                      </p>
                    )}
                    {report.feedback?.map((item) => (
                      <article key={item.id} className="club-report-detail-card">
                        <h3>{item.reviewerName || `Người xử lý #${item.reviewerUserId}`}</h3>
                        <p className="club-report-detail-description-7">
                          {REPORT_STATUSES[item.decision] || item.decision} ·{' '}
                          {date(item.createdAtUtc)}
                        </p>
                        <p className="club-report-detail-description-8">{item.message}</p>
                      </article>
                    ))}
                  </>
                )}
              </div>
            </Panel>
            <div className="club-report-detail-content-8">
              <Panel title="Trạng thái xử lý">
                <div className="club-report-detail-content-9">
                  <Badge tone={report.status === 'Approved' ? 'green' : 'orange'}>
                    {REPORT_STATUSES[report.status] || report.status}
                  </Badge>
                  <p className="club-report-detail-description-3">
                    {REPORT_TYPES[reportType(report)] || reportType(report)} · Phiên bản{' '}
                    {report.version}
                  </p>
                  {reportStateMessage(report) && (
                    <p className="club-report-detail-description-5">{reportStateMessage(report)}</p>
                  )}
                  {canDecideReport(user, report) ? (
                    <div className="club-report-detail-content-10">
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
                      <p className="club-report-detail-description-3">
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
                  <dl className="club-report-detail-definition-list-2">
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
                    <p className="club-report-detail-description-2">
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
          <form onSubmit={confirm} className="club-report-detail-content-9">
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
            <div className="club-report-detail-content-11">
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
