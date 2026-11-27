import { useEffect, useRef, useState } from 'react';

export default function ActivityPostponement({ api, activityId, onChanged }) {
    const path = `/api/activities/${activityId}/postponement`;
    const [data, setData] = useState(null), [error, setError] = useState(''), [busy, setBusy] = useState(false), [reload, setReload] = useState(0);
    const lock = useRef(false), pending = useRef(null);
    useEffect(() => {
        let active = true;
        setData(null); setError('');
        api.request(path).then((value) => { if (active) setData(value); }).catch((issue) => { if (active) setError(issue.message); });
        return () => { active = false; };
    }, [api, path, reload]);
    const save = async (event) => {
        event.preventDefault(); if (lock.current) return;
        const fields = new FormData(event.currentTarget), resume = data.canResume;
        const input = { expectedVersion: data.version, reason: String(fields.get('reason') || '').trim() };
        if (resume) {
            const start = new Date(`${fields.get('start')}:00+07:00`), end = new Date(`${fields.get('end')}:00+07:00`);
            if (!Number.isFinite(start.getTime()) || !(end > start)) { setError('Chọn giờ kết thúc sau giờ bắt đầu.'); return; }
            input.startTimeUtc = start.toISOString(); input.endTimeUtc = end.toISOString();
        }
        const body = JSON.stringify(input), route = resume ? `${path}/resume` : path;
        if (pending.current?.body !== body || pending.current?.route !== route) pending.current = { body, route, key: crypto.randomUUID() };
        lock.current = true; setBusy(true); setError('');
        try {
            const saved = await api.request(route, { method: 'POST', body, headers: { 'Idempotency-Key': pending.current.key } });
            pending.current = null; setReload((value) => value + 1); onChanged?.(saved);
        } catch (issue) {
            setError(issue.message);
            if (issue.status === 409) { try { setData(await api.request(path)); } catch { /* Keep the conflict visible. */ } }
        } finally { lock.current = false; setBusy(false); }
    };
    return <section className="activity-lifecycle-section v2-activity-profile-panel">
        <h3>Hoãn và tiếp tục hoạt động</h3>
        {error && <p role="alert">{error} {!data && <button type="button" onClick={() => setReload((value) => value + 1)}>Thử lại</button>}</p>}
        {data?.status?.toUpperCase() === 'POSTPONED' && <p>Hoạt động đang tạm hoãn, chưa có lịch mới. Điểm danh và đăng ký mới đang đóng; người đã đăng ký có thể hủy đăng ký.</p>}
        {(data?.canPostpone || data?.canResume) && <form key={data.version} onSubmit={save} className="v2-activity-recap-form">
            {data.canResume && <>
                <label>Giờ bắt đầu mới (GMT+7)<input name="start" type="datetime-local" required disabled={busy} /></label>
                <label>Giờ kết thúc mới (GMT+7)<input name="end" type="datetime-local" required disabled={busy} /></label>
            </>}
            <label>Lý do<textarea name="reason" minLength={5} maxLength={1000} required disabled={busy} /></label>
            <p>{data.canResume ? 'CTSV xác nhận lịch mới trong cùng học kỳ. Các phiên được dịch chuyển cùng khoảng thời gian; CLB cần đặt lại phòng và thiết bị.' : 'Người đã đăng ký sẽ được thông báo. Các đặt phòng và thiết bị hiện tại được giải phóng.'}</p>
            <button className="v2-button" type="submit" disabled={busy}>{data.canResume ? 'Xác nhận lịch tiếp tục' : 'Tạm hoãn hoạt động'}</button>
        </form>}
        {data?.history?.length > 0 && <ul>{data.history.map((row) => <li key={row.version}>{row.action === 'POSTPONE' ? 'Tạm hoãn' : 'Tiếp tục'} · {new Date(row.createdAtUtc).toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' })} · {row.reason}</li>)}</ul>}
    </section>;
}
