import { useEffect, useRef, useState } from 'react';
import { Button, Field } from '../../components/ui/index.js';

const labels = { PARTICIPANT: 'Người tham gia', STAFF: 'Staff', HOST: 'Host' };

export default function ActivityFinalRoles({ api, activityId }) {
    const path = `/api/activities/${activityId}/final-roles`;
    const [data, setData] = useState(null);
    const [page, setPage] = useState(1);
    const [revision, setRevision] = useState(0);
    const [error, setError] = useState('');
    const [busy, setBusy] = useState(false);
    const request = useRef(null);
    const lock = useRef(false);

    useEffect(() => {
        let active = true;
        api.request(`${path}?page=${page}`).then((value) => {
            if (active) setData(value);
        }).catch((issue) => {
            if (active) setError(issue.message);
        });
        return () => { active = false; };
    }, [api, path, page, revision]);

    const save = async (event, item) => {
        event.preventDefault();
        if (lock.current || !data.canConfirm) return;
        const role = new FormData(event.currentTarget).get('role');
        const body = JSON.stringify({ role, expectedVersion: item.version ?? null });
        const fingerprint = JSON.stringify([item.userId, body]);
        if (request.current?.fingerprint !== fingerprint)
            request.current = { fingerprint, key: crypto.randomUUID() };
        lock.current = true;
        setBusy(true);
        setError('');
        try {
            const saved = await api.request(`${path}/${item.userId}`, {
                method: 'PUT', body: JSON.parse(body), headers: { 'Idempotency-Key': request.current.key },
            });
            setData((previous) => ({
                ...previous, items: previous.items.map((row) => row.userId === item.userId ? { ...row, ...saved } : row),
            }));
        } catch (issue) {
            setError(issue.message);
            if (issue.status === 409) setRevision((value) => value + 1);
        } finally {
            lock.current = false;
            setBusy(false);
        }
    };

    return (
        <section className="activity-lifecycle-section">
            <h4>Vai trò cuối cùng</h4>
            {error && <p role="alert">{error}</p>}
            {data?.locked && <p>Vai trò và kết quả đã khóa.</p>}
            {data?.available && !data.items.length && <p>Chưa có kết quả để hiển thị.</p>}
            {data?.items.map((item) => (
                <div key={item.userId}>
                    <strong>{item.displayName || `Sinh viên ${item.userId}`}</strong>
                    {data.canConfirm && item.eligibleRoles.length ? (
                        <form key={item.version || 'new'} onSubmit={(event) => save(event, item)}>
                            <Field label="Vai trò đã xác nhận">
                                <select name="role" defaultValue={item.eligibleRoles.includes(item.role) ? item.role : ''} required disabled={busy}>
                                    <option value="">Chọn một vai trò</option>
                                    {item.eligibleRoles.map((role) => <option value={role} key={role}>{labels[role]}</option>)}
                                </select>
                            </Field>
                            <Button type="submit" disabled={busy}>Xác nhận</Button>
                        </form>
                    ) : <p>{labels[item.role] || 'Chưa đủ dữ liệu xác minh'}</p>}
                </div>
            ))}
            {page > 1 && <Button type="button" onClick={() => setPage(page - 1)}>Trang trước</Button>}
            {data?.hasMore && <Button type="button" onClick={() => setPage(page + 1)}>Trang sau</Button>}
        </section>
    );
}
