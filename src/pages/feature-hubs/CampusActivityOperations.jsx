import { useEffect, useRef, useState } from 'react';

const utc = (value) => new Date(`${value}:00+07:00`).toISOString();
const date = (value) => new Date(value).toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' });
const times = [['start', 'Bắt đầu phiên'], ['end', 'Kết thúc phiên'], ['opens', 'Mở điểm danh'], ['closes', 'Đóng điểm danh']];

export default function CampusActivityOperations({ api, activityId, encode = JSON.stringify, optional = false }) {
    const path = `/api/activities/campus/${activityId}`;
    const [data, setData] = useState(null);
    const [error, setError] = useState('');
    const [busy, setBusy] = useState(false);
    const [revision, setRevision] = useState(0);
    const request = useRef(null);
    const lock = useRef(false);
    useEffect(() => {
        let active = true;
        api.request(`${path}/operations`).then((value) => { if (active) setData(value); })
            .catch((issue) => { if (active && (!optional || issue.status !== 404)) setError(issue.message); });
        return () => { active = false; };
    }, [api, path, optional, revision]);
    const save = async (route, body, form) => {
        if (lock.current) return;
        const fingerprint = JSON.stringify([route, body]);
        if (request.current?.fingerprint !== fingerprint) request.current = { fingerprint, key: crypto.randomUUID() };
        lock.current = true;
        setBusy(true);
        setError('');
        try {
            await api.request(route, { method: 'POST', body: encode(body), headers: { 'Idempotency-Key': request.current.key } });
            form?.reset();
            setRevision((value) => value + 1);
        } catch (issue) {
            setError(issue.message);
            if (issue.status === 409) setRevision((value) => value + 1);
        } finally {
            lock.current = false;
            setBusy(false);
        }
    };
    if (!data && !error) return null;
    return (
        <section className="v2-activity-profile-panel">
            <h3>Phiên hoạt động và điểm danh</h3>
            {error && <p role="alert">{error}</p>}
            {data && (
                <section>
                    <h4>Phân công Staff và Host</h4>
                    {(data.duties || []).map((duty) => (
                        <div key={duty.id}>
                            <p>{duty.displayName} · {duty.role} · {duty.responsibility}</p>
                            {duty.confirmedAtUtc ? <p>Đã xác nhận hoàn thành</p> : <button type="button" className="v2-button" disabled={busy}
                                onClick={() => save(`${path}/duties/${duty.id}/confirm`, { expectedVersion: duty.version })}>
                                Xác nhận hoàn thành
                            </button>}
                        </div>
                    ))}
                    {data.status === 'Scheduled' && (
                        <form onSubmit={(event) => {
                            event.preventDefault();
                            const form = event.currentTarget;
                            const fields = new FormData(form);
                            save(`${path}/duties`, {
                                userId: Number(fields.get('student')), role: fields.get('role'), responsibility: fields.get('task'),
                            }, form);
                        }}>
                            <label>ID sinh viên<input name="student" type="number" min={1} required /></label>
                            <label>Vai trò<select name="role"><option value="STAFF">Staff</option><option value="HOST">Host</option></select></label>
                            <label>Nhiệm vụ<input name="task" maxLength={500} required /></label>
                            <button type="submit" className="v2-button" disabled={busy}>Phân công</button>
                        </form>
                    )}
                </section>
            )}
            {data?.sessions.map((session) => (
                <div key={session.id}>
                    <p>{date(session.startTimeUtc)} – {date(session.endTimeUtc)} · {session.location}</p>
                    <p>{data.verified.filter((item) => item.sessionId === session.id).length} người đã xác minh</p>
                    {data.publicationStatus === 'PUBLISHED' && session.status === 'SCHEDULED' && (
                        <form onSubmit={(event) => {
                            event.preventDefault();
                            const form = event.currentTarget;
                            save(`${path}/sessions/${session.id}/attendance`, { userId: Number(new FormData(form).get('user')) }, form);
                        }}>
                            <label>Sinh viên đã đăng ký<select name="user" required>
                                <option value="">Chọn sinh viên</option>
                                {data.participants.filter((student) => !data.verified.some((item) => item.sessionId === session.id && item.userId === student.userId))
                                    .map((student) => <option value={student.userId} key={student.userId}>{student.fullName}</option>)}
                            </select></label>
                            <button type="submit" className="v2-button" disabled={busy}>Xác minh có mặt</button>
                        </form>
                    )}
                </div>
            ))}
            {data?.status === 'Scheduled' && (
                <form className="v2-activity-recap-form" onSubmit={(event) => {
                    event.preventDefault();
                    const form = event.currentTarget;
                    const fields = new FormData(form);
                    save(`${path}/sessions`, {
                        expectedVersion: data.version, location: fields.get('location'),
                        startTimeUtc: utc(fields.get('start')), endTimeUtc: utc(fields.get('end')),
                        opensAt: utc(fields.get('opens')), closesAt: utc(fields.get('closes')),
                    }, form);
                }}>
                    <label>Địa điểm<input name="location" required maxLength={200} /></label>
                    {times.map(([name, label]) => <label key={name}>{label} (giờ Việt Nam)<input name={name} type="datetime-local" required /></label>)}
                    <button type="submit" className="v2-button" disabled={busy}>Thêm phiên</button>
                </form>
            )}
        </section>
    );
}
