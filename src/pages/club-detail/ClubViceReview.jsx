import { useEffect, useRef, useState } from 'react';
import api from '../../services/api.js';
import { useAuth } from '../../context/AuthContext.jsx';
import { isCTSV } from '../../utils/access.js';
import { useOperationQuery } from '../../hooks/useOperationQuery.js';
import { OperationState } from '../../components/operations/operation-state/OperationState.jsx';
import { Button, Panel, Modal } from '../../components/ui/index.js';
const date = (value) =>
    value
        ? new Date(value).toLocaleString('vi-VN', {
              timeZone: 'Asia/Ho_Chi_Minh',
          })
        : '—';
const statuses = {
    PENDING: 'Chờ duyệt',
    APPROVED: 'Đã duyệt',
    REJECTED: 'Đã từ chối',
    REVOKED: 'Đã thu hồi',
    SUPERSEDED: 'Đã kết thúc do chuyển giao',
};
export default function ClubViceReview({ clubId }) {
    const { user } = useAuth();
    return (
        <ViceReview key={`${user.id}:${clubId}`} clubId={clubId} user={user} />
    );
}
function ViceReview({ clubId, user }) {
    const [page, setPage] = useState(1),
        [dialog, setDialog] = useState(null),
        [reason, setReason] = useState(''),
        [from, setFrom] = useState(''),
        [until, setUntil] = useState(''),
        [busy, setBusy] = useState(false),
        [error, setError] = useState('');
    const lock = useRef(false),
        keys = useRef(new Map()),
        alive = useRef(true);
    useEffect(() => {
        alive.current = true;
        return () => {
            alive.current = false;
        };
    }, []);
    const root = `/api/clubs/${encodeURIComponent(clubId)}/governance/leadership-nominations`;
    const result = useOperationQuery(async () => {
        const data = await api.get(root, { page, pageSize: 20 });
        if (
            String(data?.clubId) !== String(clubId) ||
            !Array.isArray(data.items) ||
            data.page !== page ||
            data.totalPages !== Math.ceil(data.totalItems / data.pageSize) ||
            typeof data.capabilities?.canReview !== 'boolean'
        )
            throw new Error(
                'Danh sách bổ nhiệm không khớp CLB hoặc phân trang.',
            );
        return data;
    }, `${user.id}:${clubId}:${page}`);
    const canReview = isCTSV(user) && result.data?.capabilities.canReview;
    const open = (row, action) => {
        if (lock.current) return;
        setDialog({ row, action });
        setReason('');
        setFrom('');
        setUntil('');
        setError('');
    };
    const save = async (event) => {
        event.preventDefault();
        if (lock.current || !canReview || !reason.trim()) return;
        const body = {
            expectedVersion: dialog.row.version,
            reason: reason.trim(),
        };
        if (dialog.action === 'approve') {
            body.effectiveFromUtc = new Date(from + ':00+07:00').toISOString();
            body.effectiveUntilUtc = new Date(
                until + ':00+07:00',
            ).toISOString();
            if (
                Date.parse(body.effectiveUntilUtc) <=
                Date.parse(body.effectiveFromUtc)
            ) {
                setError('Ngày kết thúc phải sau ngày bắt đầu.');
                return;
            }
        }
        const fingerprint = JSON.stringify([
            dialog.row.id,
            dialog.action,
            body,
        ]);
        if (!keys.current.has(fingerprint))
            keys.current.set(fingerprint, crypto.randomUUID());
        lock.current = true;
        setBusy(true);
        setError('');
        try {
            const saved = await api.request(
                `${root}/${dialog.row.id}/${dialog.action}`,
                {
                    method: 'POST',
                    body,
                    headers: {
                        'Idempotency-Key': keys.current.get(fingerprint),
                    },
                },
            );
            if (
                String(saved?.clubId) !== String(clubId) ||
                saved.id !== dialog.row.id ||
                saved.status !==
                    {
                        approve: 'APPROVED',
                        reject: 'REJECTED',
                        revoke: 'REVOKED',
                    }[dialog.action]
            )
                throw new Error(
                    'Chưa xác nhận được quyết định. Tải lại trước khi tiếp tục.',
                );
            if (!alive.current) return;
            keys.current.delete(fingerprint);
            setDialog(null);
            result.retry();
        } catch (issue) {
            if (alive.current)
                setError(
                    issue.status === 409
                        ? 'Đề nghị đã thay đổi. Đóng và tải lại trước khi quyết định.'
                        : issue.message || 'Không lưu được quyết định.',
                );
        } finally {
            lock.current = false;
            if (alive.current) setBusy(false);
        }
    };
    return (
        <Panel title="Bổ nhiệm Phó chủ nhiệm">
            <p>
                Quyết định bổ nhiệm có hiệu lực riêng với báo cáo BQL. Thời gian
                dưới đây dùng giờ Việt Nam.
            </p>
            <Button onClick={result.retry} disabled={busy}>
                Tải lại bổ nhiệm
            </Button>
            <OperationState {...result} onRetry={result.retry}>
                {result.data?.items.map((row) => (
                    <article key={row.id} className="club-detail-context">
                        <div>
                            <strong>{row.memberName}</strong>
                            <p>
                                {statuses[row.status] || row.status} ·{' '}
                                {date(row.effectiveFromUtc)} →{' '}
                                {date(row.effectiveUntilUtc)}
                            </p>
                        </div>
                        {canReview &&
                            String(row.proposedBy) !== String(user.id) &&
                            String(row.userId) !== String(user.id) && (
                                <div>
                                    {row.status === 'PENDING' && (
                                        <>
                                            <Button
                                                onClick={() =>
                                                    open(row, 'approve')
                                                }
                                            >
                                                Duyệt bổ nhiệm
                                            </Button>
                                            <Button
                                                onClick={() =>
                                                    open(row, 'reject')
                                                }
                                            >
                                                Từ chối
                                            </Button>
                                        </>
                                    )}
                                    {row.status === 'APPROVED' && (
                                        <Button
                                            onClick={() => open(row, 'revoke')}
                                        >
                                            Thu hồi bổ nhiệm
                                        </Button>
                                    )}
                                </div>
                            )}
                    </article>
                ))}
            </OperationState>
            <div>
                <Button
                    disabled={page <= 1 || busy}
                    onClick={() => setPage(page - 1)}
                >
                    Trước
                </Button>{' '}
                Trang {page}/{Math.max(1, result.data?.totalPages || 1)}{' '}
                <Button
                    disabled={
                        !result.data || page >= result.data.totalPages || busy
                    }
                    onClick={() => setPage(page + 1)}
                >
                    Sau
                </Button>
            </div>
            {dialog && (
                <Modal
                    title={
                        {
                            approve: 'Duyệt bổ nhiệm',
                            reject: 'Từ chối bổ nhiệm',
                            revoke: 'Thu hồi bổ nhiệm',
                        }[dialog.action]
                    }
                    onClose={() => !busy && setDialog(null)}
                >
                    <form onSubmit={save}>
                        <fieldset disabled={busy}>
                            <p>{dialog.row.memberName}</p>
                            {dialog.action === 'approve' && (
                                <>
                                    <label>
                                        Hiệu lực từ (giờ Việt Nam)
                                        <input
                                            type="datetime-local"
                                            required
                                            value={from}
                                            onChange={(e) =>
                                                setFrom(e.target.value)
                                            }
                                        />
                                    </label>
                                    <label>
                                        Hiệu lực đến (giờ Việt Nam)
                                        <input
                                            type="datetime-local"
                                            required
                                            value={until}
                                            onChange={(e) =>
                                                setUntil(e.target.value)
                                            }
                                        />
                                    </label>
                                </>
                            )}
                            <label>
                                Lý do
                                <textarea
                                    required
                                    maxLength={500}
                                    value={reason}
                                    onChange={(e) => setReason(e.target.value)}
                                />
                            </label>
                        </fieldset>
                        {error && <p role="alert">{error}</p>}
                        <Button
                            type="button"
                            disabled={busy}
                            onClick={() => setDialog(null)}
                        >
                            Đóng
                        </Button>
                        <Button type="submit" disabled={busy}>
                            {busy ? 'Đang lưu…' : 'Xác nhận quyết định'}
                        </Button>
                    </form>
                </Modal>
            )}
        </Panel>
    );
}
