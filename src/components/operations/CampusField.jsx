import { Button, Field } from '../ui/index.js';
export default function CampusField({ scope, value, onChange, busy = false }) {
  return <Field label="Campus">
    {scope.error ? <div role="alert">{scope.error} <Button onClick={scope.retry}>Tải lại phạm vi campus</Button></div>
      : !scope.data ? <p role="status">Đang xác nhận campus…</p>
      : <select aria-label="Campus" value={value} disabled={busy || !scope.data.canSelectCampus} onChange={(event) => onChange(event.target.value)}>
          <option value="">Chọn campus</option>
          {scope.data.campuses.map((item) => <option key={item.code} value={item.code}>{item.name}</option>)}
        </select>}
  </Field>;
}
