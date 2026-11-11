import { useEffect, useRef, useState } from 'react';
import { Button, Field } from '../../components/ui/index.js';

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
        <section className="activity-lifecycle-section">
            <h4>Chứng chỉ và badge</h4>
            {error && <p role="alert">{error}</p>}
            {data?.items.map((item) => (
                <div key={item.id} className="activity-lifecycle-actions">
                    <p>{item.title} · {roles[item.role]}</p>
                    {!data.locked && (item.role !== 'HOST_CLUB' || organization) && (
                        <Button type="button" variant="danger-soft" disabled={busy} onClick={() => write('DELETE', item.id)}>Xóa cấu hình</Button>
                    )}
                </div>
            ))}
            {data && !data.locked && (
                <form onSubmit={(event) => {
                    event.preventDefault();
                    const form = event.currentTarget;
                    const fields = new FormData(form);
                    write('POST', null, async () => ({
                        title: fields.get('title'), role: fields.get('role'),
                        badgePng: await png(fields.get('badge')), framePng: await png(fields.get('frame')),
                    }), form);
                }}>
                    <Field label="Tiêu đề"><input name="title" required maxLength={200} /></Field>
                    <Field label="Vai trò"><select name="role">
                        {Object.entries(roles).filter(([role]) => organization || role !== 'HOST_CLUB')
                            .map(([role, label]) => <option value={role} key={role}>{label}</option>)}
                    </select></Field>
                    <Field label="Badge PNG"><input type="file" accept="image/png" name="badge" required /></Field>
                    <Field label="Khung avatar PNG (tùy chọn)"><input type="file" accept="image/png" name="frame" /></Field>
                    <Button type="submit" disabled={busy}>Thêm chứng chỉ</Button>
                </form>
            )}
        </section>
    );
}
