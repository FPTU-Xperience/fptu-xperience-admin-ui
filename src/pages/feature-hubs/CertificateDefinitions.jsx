import { useEffect, useRef, useState } from 'react';

const roles = { PARTICIPANT: 'Người tham gia', STAFF: 'Staff', HOST: 'Host', HOST_CLUB: 'CLB chủ trì' };
const png = (file) => new Promise((resolve, reject) => {
    if (!file?.size) return resolve(null);
    if (file.type !== 'image/png' || file.size > 92160) return reject(new Error('Chọn PNG nền trong suốt, tối đa 90 KiB.'));
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result).split(',')[1]);
    reader.onerror = () => reject(new Error('Không đọc được ảnh.'));
    reader.readAsDataURL(file);
});

export default function CertificateDefinitions({ api, activityId, organization = false, encode = JSON.stringify }) {
    const path = `/api/activities/${activityId}/certificate-definitions`;
    const [data, setData] = useState(null);
    const [error, setError] = useState('');
    const [busy, setBusy] = useState(false);
    const lock = useRef(false);
    const pending = useRef(null);
    useEffect(() => {
        let active = true;
        api.request(path).then((value) => { if (active) setData(value); })
            .catch((issue) => { if (active) setError(issue.message); });
        return () => { active = false; };
    }, [api, path]);

    const write = async (method, id, body, form) => {
        if (lock.current) return;
        lock.current = true;
        setBusy(true);
        setError('');
        try {
            const payload = body && await body();
            const fingerprint = JSON.stringify([method, id, payload]);
            if (pending.current?.fingerprint !== fingerprint) pending.current = { fingerprint, key: crypto.randomUUID() };
            const saved = await api.request(id ? `${path}/${id}` : path, {
                method, ...(payload ? { body: encode(payload) } : {}),
                headers: { 'Idempotency-Key': pending.current.key },
            });
            setData((current) => ({ ...current, items: id ? current.items.filter((item) => item.id !== id) : [...current.items, saved] }));
            form?.reset();
        } catch (issue) {
            setError(issue.message);
        } finally {
            lock.current = false;
            setBusy(false);
        }
    };

    return (
        <section className="v2-activity-profile-panel">
            <h3>Chứng chỉ và badge</h3>
            {error && <p role="alert">{error}</p>}
            {data?.items.map((item) => (
                <p key={item.id}>{item.title} · {roles[item.role]}
                    {!data.locked && (item.role !== 'HOST_CLUB' || organization) && (
                        <button type="button" disabled={busy} onClick={() => write('DELETE', item.id)}>Xóa cấu hình</button>
                    )}
                </p>
            ))}
            {data && !data.locked && (
                <form className="v2-activity-recap-form" onSubmit={(event) => {
                    event.preventDefault();
                    const form = event.currentTarget;
                    const fields = new FormData(form);
                    write('POST', null, async () => ({
                        title: fields.get('title'), role: fields.get('role'),
                        badgePng: await png(fields.get('badge')), framePng: await png(fields.get('frame')),
                    }), form);
                }}>
                    <label>Tiêu đề<input name="title" required maxLength={200} /></label>
                    <label>Vai trò<select name="role">
                        {Object.entries(roles).filter(([role]) => organization || role !== 'HOST_CLUB')
                            .map(([role, label]) => <option value={role} key={role}>{label}</option>)}
                    </select></label>
                    <label>Badge PNG<input type="file" accept="image/png" name="badge" required /></label>
                    <label>Khung avatar PNG (tùy chọn)<input type="file" accept="image/png" name="frame" /></label>
                    <button type="submit" className="v2-button" disabled={busy}>Thêm chứng chỉ</button>
                </form>
            )}
        </section>
    );
}
