import { useEffect, useRef, useState } from 'react';
import { Building2, CalendarDays, ChevronLeft, ChevronRight, ClipboardList, Package, Plus, RefreshCw, Timer } from 'lucide-react';
import { useAuth } from '../../context/AuthContext.jsx';
import { useCampusScope } from '../../hooks/useCampusScope.js';
import { selectedCampus } from '../../services/campus-scope.js';
import api from '../../services/api.js';
import { Button, Field, Modal, Panel } from '../../components/ui/index.js';
import CampusBookingMaps, { FloorPlan, FloorPlanDialog } from './CampusBookingMaps.jsx';
import './ActivityBookingDesk.css';

const base = '/api/activity-bookings';
const timezone = 'Asia/Ho_Chi_Minh';
const statuses = {
  PENDING: 'Chờ xử lý', CONFIRMED: 'Đã xử lý', CANCELLED: 'Đã hủy',
  SESSION_CHANGED: 'Phiên đã thay đổi', EXPIRED: 'Hết hạn',
};
const venueStatuses = { ...statuses, CONFIRMED: 'Đã xác nhận', UNAVAILABLE: 'Không bố trí được', NOT_REQUESTED: 'Chỉ mượn thiết bị' };
const weekdays = ['Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy', 'Chủ nhật'];
const issues = {
  STALE_VERSION: 'Yêu cầu đã thay đổi. Mở lại từ danh sách để xem phiên bản mới.',
  VENUE_UNAVAILABLE: 'Địa điểm vừa được đặt trong khung giờ này. Tải lại khả dụng và chọn địa điểm khác.',
  EQUIPMENT_UNAVAILABLE: 'Số lượng khả dụng vừa thay đổi. Tải lại khả dụng và cập nhật phân bổ.',
  CONCURRENT_UPDATE: 'Có một thao tác khác đang cập nhật dữ liệu. Tải lại rồi thử lại.',
  EQUIPMENT_ALREADY_ALLOCATED: 'Tồn kho mới thấp hơn số thiết bị đang được giữ cho các phiên.',
  SESSION_CHANGED: 'Phiên đã thay đổi hoặc bắt đầu. Tải lại hàng đợi.',
  INVALID_VENUE: 'Kiểm tra mã, tên, loại, sức chứa và nhập đủ cả hai tọa độ khi đặt ghim.',
  INVALID_LAYOUT: 'Kiểm tra URL ảnh HTTPS hoặc nhập đủ hai tọa độ của ghim tòa nhà.',
  INVALID_ROOM_MAPPING: 'Kiểm tra mã phòng, tên, loại và tọa độ trong tệp danh sách.',
  MEDIA_ATTACHMENT_REJECTED: 'Không thể xác minh ảnh đã tải lên. Kiểm tra ảnh rồi thử lại.',
};
const describe = (issue) => issues[issue.code] || issue.message || 'Không thể xử lý dữ liệu đặt chỗ.';
const dateTime = (value) => new Intl.DateTimeFormat('vi-VN', {
  timeZone: timezone, dateStyle: 'short', timeStyle: 'short',
}).format(new Date(value));
const dayText = (value) => value.split('-').reverse().join('/');
const offsetDay = (value, days) => {
  const instant = new Date(`${value}T00:00:00Z`);
  instant.setUTCDate(instant.getUTCDate() + days);
  return instant.toISOString().slice(0, 10);
};
const monday = (value) => offsetDay(value, -((new Date(`${value}T00:00:00Z`).getUTCDay() + 6) % 7));
const thisWeek = () => monday(new Intl.DateTimeFormat('sv-SE', { timeZone: timezone }).format(new Date()));
const venueLabel = (venues, id) => venues.find((venue) => venue.id === id)?.name || `Địa điểm #${id}`;
const venueLabels = (venues, ids) => ids.map((id) => venueLabel(venues, id)).join(', ');
const confirmedRooms = (row) => row.confirmedVenueIds ?? (row.confirmedVenueId ? [row.confirmedVenueId] : []);
const equipmentLabel = (equipment, id) => equipment.find((item) => item.id === id)?.name || `Thiết bị #${id}`;

function Badge({ status, children }) {
  return <span className="booking-admin-badge" data-status={status}>{children || statuses[status]}</span>;
}

function ReviewDialog({ row, catalog, onClose, onSaved }) {
  const [stock, setStock] = useState(null);
  const [revision, setRevision] = useState(0);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [cancel, setCancel] = useState(false);
  const lock = useRef(false);
  const canReview = row.canManage && !['STALE_VERSION', 'SESSION_CHANGED'].includes(error.code);
  const requested = row.requestedVenueIds ?? (row.requestedVenueId ? [row.requestedVenueId] : []);
  const confirmed = confirmedRooms(row);
  const wantsVenue = requested.length > 0 || Boolean(row.requestedVenueType);
  const preferredVenues = confirmed.length ? confirmed : requested;
  const route = `${base}/${row.id}`;

  useEffect(() => {
    let active = true;
    setStock(null);
    if (row.canManage) api.request(`${route}/availability`)
      .then((data) => { if (active) setStock(data); })
      .catch((issue) => { if (active) setError(issue); });
    return () => { active = false; };
  }, [row.canManage, route, revision]);

  const decide = async (event) => {
    event.preventDefault();
    if (lock.current) return;
    const fields = new FormData(event.currentTarget);
    const equipment = row.equipment.map((line) => ({
      equipmentId: line.equipmentId, quantity: Number(fields.get(`equipment-${line.equipmentId}`)),
    }));
    lock.current = true;
    setBusy(true);
    setError('');
    try {
      const saved = await api.request(`${route}/decision`, {
        method: 'PUT',
        body: { version: row.version, venueIds: fields.getAll('venue').map(Number), equipment, cancel },
      });
      onSaved(saved.status === 'CANCELLED' ? 'Đã hủy yêu cầu và giải phóng tài nguyên.' : 'Đã lưu kết quả xử lý.');
    } catch (issue) {
      setError(issue);
    } finally {
      lock.current = false;
      setBusy(false);
    }
  };
  const isAvailable = (venue) => (venue.isBookable || confirmed.includes(venue.id)) && !stock?.reservedVenueIds.includes(venue.id);
  const venues = catalog.venues.filter((venue) => venue.isBookable || preferredVenues.includes(venue.id));

  return (
    <Modal wide title={`Yêu cầu #${row.id} · ${row.activityTitle}`}
      description={`${row.clubName} · Phiên #${row.sessionId} · ${dateTime(row.startsAtUtc)} – ${dateTime(row.endsAtUtc)}`}
      onClose={(event) => {
        if (busy) event?.preventDefault();
        else onClose();
      }}>
      <form className="booking-admin-dialog" onSubmit={decide}>
        <div className="booking-admin-row">
          <Badge status={row.status} />
          {row.isLate && <Badge status="PENDING">Gửi sau cutoff</Badge>}
          <small>Gửi {dateTime(row.requestedAtUtc)}{row.cutoffAtUtc && ` · Hạn nhận ${dateTime(row.cutoffAtUtc)}`}</small>
        </div>
        {error && <p role="alert" className="booking-admin-notice">{describe(error)}</p>}
        {canReview && !stock && !error && <p role="status">Đang kiểm tra phòng và tồn kho theo khung giờ…</p>}
        {canReview && !cancel && (
          <Button type="button" disabled={busy} icon={RefreshCw} onClick={() => {
            setError('');
            setRevision((value) => value + 1);
          }}>Kiểm tra lại khả dụng</Button>
        )}
        {!cancel && (
          <fieldset key={revision} disabled={!canReview || !stock || busy}>
            <legend>Phân bổ địa điểm</legend>
            <p><strong>Ưu tiên của CLB:</strong> {venueLabels(catalog.venues, requested) || row.requestedVenueType || 'Không yêu cầu địa điểm'}</p>
            {confirmed.length > 0 && <p><strong>Đã bố trí:</strong> {venueLabels(catalog.venues, confirmed)}</p>}
            {wantsVenue && stock && canReview && (
              <div className="booking-admin-venue-options" role="group" aria-label="Phòng xác nhận">
                  {venues.map((venue) => (
                    <label key={venue.id} className="booking-admin-checkbox">
                      <input type="checkbox" name="venue" value={venue.id} disabled={!isAvailable(venue)}
                        defaultChecked={preferredVenues.includes(venue.id) && isAvailable(venue)} />
                      {[venue.name, venue.code, venue.venueType, venue.building, venue.capacity > 0 && `${venue.capacity} chỗ`,
                        !venue.isBookable ? 'Ngừng nhận đặt' : !isAvailable(venue) && 'Đã có lịch'].filter(Boolean).join(' · ')}
                    </label>
                  ))}
              </div>
            )}
          </fieldset>
        )}
        {!cancel && row.equipment.length > 0 && (
          <fieldset key={`equipment-${revision}`} disabled={busy}>
            <legend>Phân bổ thiết bị</legend>
            <div className="booking-admin-table">
              <table>
                <thead><tr><th scope="col">Thiết bị</th><th scope="col">Đề nghị</th>
                  <th scope="col">{canReview ? 'Khả dụng' : 'Đã cấp'}</th><th scope="col">{canReview ? 'Số lượng cấp' : 'Còn thiếu'}</th></tr></thead>
                <tbody>
                  {row.equipment.map((line) => {
                    const name = equipmentLabel(catalog.equipment, line.equipmentId);
                    const available = stock?.availableEquipment[line.equipmentId] ?? 0;
                    const limit = Math.min(line.requestedQuantity, available);
                    return (
                      <tr key={line.equipmentId}><th scope="row">{name}</th><td>{line.requestedQuantity}</td>
                        <td>{canReview ? (stock ? available : '—') : row.status === 'CONFIRMED' ? line.confirmedQuantity : '—'}</td>
                        <td>{canReview && stock ? (
                          <input type="number" min={0} max={limit} step={1} required aria-label={`Số lượng cấp ${name}`}
                            name={`equipment-${line.equipmentId}`} defaultValue={Math.min(line.confirmedQuantity ?? limit, limit)} />
                        ) : line.missingQuantity ?? '—'}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            {canReview && <small>Nhập 0 nếu không cấp thiết bị. CLB sẽ thấy số lượng còn thiếu sau khi lưu.</small>}
          </fieldset>
        )}
        {cancel && <p className="booking-admin-notice">Xác nhận hủy yêu cầu #{row.id}? Địa điểm và thiết bị đã phân bổ sẽ được giải phóng.</p>}
        <div className="booking-admin-actions">
          {canReview && (cancel ? (
            <>
              <Button type="button" disabled={busy} onClick={() => setCancel(false)}>Quay lại</Button>
              <Button type="submit" variant="danger" busy={busy}>Xác nhận hủy</Button>
            </>
          ) : (
            <>
              <Button type="button" variant="danger-soft" disabled={busy} onClick={() => setCancel(true)}>Hủy yêu cầu</Button>
              <Button type="submit" variant="primary" disabled={!stock} busy={busy}>Lưu kết quả</Button>
            </>
          ))}
        </div>
      </form>
    </Modal>
  );
}

function CatalogDialog({ path, editor, onClose, onSaved }) {
  const { kind, item, layout } = editor;
  const isVenue = kind === 'venues';
  const isCutoff = kind === 'cutoff';
  const isLayout = kind === 'layout';
  const sharedFloor = item && layout && item.floor !== layout.floor ? layout.floor : null;
  const [layoutType, setLayoutType] = useState(item?.floor ? 'floor' : item?.building ? 'building' : 'campus');
  const [point, setPoint] = useState({ x: item?.planX ?? '', y: item?.planY ?? '' });
  const [area, setArea] = useState((sharedFloor ? item.planAreasByFloor?.[sharedFloor] : item?.planArea) || '');
  const [draft, setDraft] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const lock = useRef(false);
  const submit = async (event) => {
    event.preventDefault();
    if (lock.current || draft) return;
    const fields = new FormData(event.currentTarget);
    const int = (key) => fields.get(key) === '' ? null : Number(fields.get(key));
    const common = { code: fields.get('code')?.trim(), name: fields.get('name')?.trim(), isBookable: fields.has('bookable') };
    const sharedAreas = sharedFloor ? { ...item.planAreasByFloor, [sharedFloor]: area } : undefined;
    if (sharedFloor && !area) delete sharedAreas[sharedFloor];
    const body = isCutoff ? { day: int('day'), time: `${fields.get('time')}:00` }
      : isLayout ? { building: fields.get('building')?.trim(), floor: fields.get('floor')?.trim(),
        imageUrl: fields.get('imageUrl')?.trim(), planX: fields.has('planX') ? int('planX') : null,
        planY: fields.has('planY') ? int('planY') : null }
      : isVenue ? { ...common, type: fields.get('type').trim(), building: fields.get('building').trim() || null,
        floor: sharedFloor ? item.floor : fields.get('floor').trim() || null, capacity: int('capacity'),
        planX: sharedFloor ? item.planX : int('planX'), planY: sharedFloor ? item.planY : int('planY'),
        createOnly: Boolean(layout && !item), planArea: sharedFloor ? item.planArea : layout?.imageUrl ? area : undefined,
        planAreasByFloor: sharedAreas }
      : { ...common, quantity: int('quantity') };
    lock.current = true;
    setBusy(true);
    setError('');
    try {
      await api.request(`${path}/${kind}`, { method: 'PUT', body });
      onSaved(isCutoff ? 'Đã lưu hạn nhận theo tuần.' : isLayout ? 'Đã lưu sơ đồ.' : 'Đã lưu danh mục.');
    } catch (issue) {
      setError(describe(issue));
    } finally {
      lock.current = false;
      setBusy(false);
    }
  };
  const drawCorner = (corner) => {
    setDraft((points) => points.length < 12 && !points.some(({ x, y }) => x === corner.x && y === corner.y)
      ? [...points, corner] : points);
  };
  const finishArea = () => {
    setArea(draft.map(({ x, y }) => `${x},${y}`).join(' '));
    setPoint({
      x: Math.round(draft.reduce((sum, vertex) => sum + vertex.x, 0) / draft.length),
      y: Math.round(draft.reduce((sum, vertex) => sum + vertex.y, 0) / draft.length),
    });
    setDraft(null);
  };
  const resource = isVenue ? 'địa điểm' : 'thiết bị';
  return (
    <Modal wide={Boolean(layout?.imageUrl)} title={isCutoff ? 'Hạn nhận yêu cầu theo tuần' : isLayout ? 'Cấu hình bản đồ và sơ đồ' : item ? `Sửa ${resource}` : `Thêm ${resource}`}
      onClose={(event) => { if (busy) event?.preventDefault(); else onClose(); }}>
      <form className="booking-admin-dialog" onSubmit={submit}>
        <fieldset disabled={busy} className="booking-admin-fields">
          {isCutoff ? (
            <>
              <p>Hạn nhận nằm trong tuần liền trước tuần diễn ra phiên, theo giờ Việt Nam. Yêu cầu gửi sau hạn sẽ có nhãn để CTSV xem xét.</p>
              <Field label="Ngày trong tuần"><select name="day" defaultValue={item?.cutoffDay || 5}>
                {weekdays.map((name, index) => <option key={name} value={index + 1}>{name}</option>)}
              </select></Field>
              <Field label="Giờ Việt Nam"><input required type="time" name="time" defaultValue={item?.cutoffTime?.slice(0, 5) || '17:00'} /></Field>
            </>
          ) : isLayout ? (
            <>
              <Field label="Loại sơ đồ">
                <select value={layoutType} disabled={Boolean(item)} onChange={(event) => setLayoutType(event.target.value)}>
                  <option value="campus">Bản đồ campus</option><option value="building">Ghim tòa nhà trên bản đồ</option>
                </select>
              </Field>
              {layoutType !== 'campus' && <Field label="Tòa nhà" hint="Dùng cùng tên tòa như trong danh mục địa điểm.">
                <input name="building" required maxLength={80} defaultValue={item?.building} readOnly={Boolean(item)} /></Field>}
              {layoutType === 'building' ? (
                <div className="booking-admin-fields-grid">
                  <Field label="Vị trí ngang (%)"><input name="planX" type="number" min={0} max={100} defaultValue={item?.planX ?? ''} /></Field>
                  <Field label="Vị trí dọc (%)"><input name="planY" type="number" min={0} max={100} defaultValue={item?.planY ?? ''} /></Field>
                </div>
              ) : <Field label="URL ảnh HTTPS" hint="Dùng ảnh cơ sở hoặc sơ đồ tầng mà người dùng ClubHub có thể mở.">
                <input type="url" name="imageUrl" maxLength={2048} defaultValue={item?.imageUrl} placeholder="https://…" /></Field>}
            </>
          ) : (
            <>
              <div className="booking-admin-fields-grid">
                <Field label="Mã"><input name="code" required maxLength={40} defaultValue={item?.code} readOnly={Boolean(item)} /></Field>
                <Field label="Tên"><input name="name" required maxLength={160} defaultValue={item?.name} /></Field>
                {isVenue ? (
                  <>
                    <Field label="Loại địa điểm"><input name="type" required maxLength={40} defaultValue={item?.venueType} placeholder="Phòng học, hội trường…" /></Field>
                    <Field label="Sức chứa"><input name="capacity" type="number" min={0} max={2147483647} required defaultValue={item?.capacity ?? 0} /></Field>
                    <Field label="Tòa nhà"><input name="building" maxLength={80} defaultValue={layout?.building ?? item?.building} readOnly={Boolean(layout)} /></Field>
                    <Field label="Tầng"><input name="floor" maxLength={40} defaultValue={layout?.floor ?? item?.floor} readOnly={Boolean(layout)} /></Field>
                    <Field label="Vị trí ngang (%)"><input name="planX" type="number" min={0} max={100} value={point.x}
                      onChange={(event) => setPoint({ ...point, x: event.target.value })} /></Field>
                    <Field label="Vị trí dọc (%)"><input name="planY" type="number" min={0} max={100} value={point.y}
                      onChange={(event) => setPoint({ ...point, y: event.target.value })} /></Field>
                  </>
                ) : <Field label="Tổng số lượng trong kho"><input name="quantity" type="number" min={0} max={2147483647} required defaultValue={item?.quantity ?? 0} /></Field>}
              </div>
              {isVenue && (layout?.imageUrl ? (
                <>
                  <div className="booking-admin-row">
                    {draft ? (
                      <>
                        <Button type="button" onClick={() => setDraft(draft.slice(0, -1))} disabled={!draft.length}>Bỏ điểm cuối</Button>
                        <Button type="button" onClick={() => setDraft(null)}>Hủy vẽ</Button>
                        <Button type="button" onClick={finishArea} disabled={draft.length < 3}>Dùng vùng này</Button>
                      </>
                    ) : (
                      <>
                        <Button type="button" onClick={() => setDraft([])}>{area ? 'Vẽ lại vùng phòng' : 'Vẽ vùng phòng'}</Button>
                        {area && <Button type="button" onClick={() => setArea('')}>Bỏ vùng phòng</Button>}
                      </>
                    )}
                  </div>
                  <small role="status">{draft
                    ? `Bấm lần lượt vào các góc trên ảnh (3–12 điểm). Đã đặt ${draft.length} điểm.`
                    : area ? 'Phòng có vùng bấm trên sơ đồ.' : 'Vẽ vùng theo viền phòng hoặc bấm vào ảnh để đặt một ghim.'}</small>
                  <FloorPlan imageUrl={layout.imageUrl} draft={draft}
                    onPosition={draft ? drawCorner : area ? undefined : ({ x, y }) => setPoint({ x: Math.round(x), y: Math.round(y) })}
                    rooms={draft ? [] : [{ code: 'room', planArea: area, planX: point.x === '' ? null : point.x,
                      planY: point.y === '' ? null : point.y }]} />
                </>
              ) : <small>Để hiện ghim trên sơ đồ tầng, nhập tòa, tầng và cả hai tọa độ. Gốc tọa độ ở góc trên bên trái.</small>)}
              <label className="booking-admin-checkbox"><input type="checkbox" name="bookable" defaultChecked={item?.isBookable ?? true} /> Nhận yêu cầu từ CLB</label>
            </>
          )}
        </fieldset>
        {error && <p role="alert" className="booking-admin-notice">{error}</p>}
        <div className="booking-admin-actions"><Button type="submit" variant="primary" busy={busy} disabled={Boolean(draft)}>Lưu thay đổi</Button></div>
      </form>
    </Modal>
  );
}

function CampusDesk({ campus, userId, mapsOnly }) {
  const [view, setView] = useState('queue');
  const [week, setWeek] = useState(thisWeek);
  const [filter, setFilter] = useState('');
  const [revision, setRevision] = useState(0);
  const [catalog, setCatalog] = useState(null);
  const [queue, setQueue] = useState(null);
  const [open, setOpen] = useState(null);
  const [editor, setEditor] = useState(null);
  const [notice, setNotice] = useState('');
  const path = `${base}/campuses/${encodeURIComponent(campus)}`;
  const reload = () => setRevision((value) => value + 1);
  const saved = (message) => {
    setOpen(null);
    setEditor(null);
    setNotice(message);
    reload();
  };
  useEffect(() => {
    let active = true;
    api.request(`${path}/catalog`).then((data) => { if (active) setCatalog({ data }); })
      .catch((issue) => { if (active) setCatalog({ error: describe(issue) }); });
    return () => { active = false; };
  }, [path, revision]);
  useEffect(() => {
    if (mapsOnly) return undefined;
    let active = true;
    setQueue(null);
    api.request(`${path}/queue`, { params: { weekOf: week } })
      .then((data) => { if (active) setQueue({ week, data }); })
      .catch((issue) => { if (active) setQueue({ week, error: describe(issue) }); });
    return () => { active = false; };
  }, [mapsOnly, path, week, revision]);
  const current = queue?.week === week ? queue : null;
  const rows = current?.data || [];
  const data = catalog?.data;
  const visible = rows.filter((row) => !filter || (filter === 'LATE' ? row.isLate : row.status === filter));
  const cutoff = data?.policy;
  return (
    <div className="booking-admin">
      <div className="booking-admin-toolbar">
        {!mapsOnly && <div className="booking-admin-row" role="group" aria-label="Khu vực đặt chỗ">
          <Button icon={ClipboardList} aria-pressed={view === 'queue'} variant={view === 'queue' ? 'primary' : 'secondary'} onClick={() => setView('queue')}>Hàng đợi theo tuần</Button>
          <Button icon={Package} aria-pressed={view === 'catalog'} variant={view === 'catalog' ? 'primary' : 'secondary'} onClick={() => setView('catalog')}>Danh mục tài nguyên</Button>
        </div>}
        <Button icon={RefreshCw} onClick={reload}>Tải lại</Button>
      </div>
      {notice && <p className="booking-admin-notice booking-admin-success" role="status">{notice}</p>}
      {catalog?.error && <p className="booking-admin-notice" role="alert">{catalog.error}</p>}
      {!catalog && <p role="status">Đang tải danh mục cơ sở…</p>}
      {data && !mapsOnly && <div className="booking-admin-policy">
        <Timer size={23} aria-hidden="true" />
        <div><strong>Hạn nhận cho tuần diễn ra phiên</strong>
          <p>{cutoff ? `${weekdays[cutoff.cutoffDay - 1]}, ${cutoff.cutoffTime.slice(0, 5)} của tuần liền trước (giờ Việt Nam)` : 'Cơ sở chưa cấu hình hạn nhận.'}</p></div>
        <Button onClick={() => setEditor({ kind: 'cutoff', item: cutoff })}>Cấu hình hạn nhận</Button>
      </div>}
      {mapsOnly ? data && <CampusBookingMaps campus={campus} data={data} setEditor={setEditor} /> : view === 'queue' ? (
        <section className="booking-admin-queue" aria-label="Hàng đợi theo tuần">
          <div className="booking-admin-toolbar booking-admin-week">
            <div className="booking-admin-row">
              <Button icon={ChevronLeft} onClick={() => setWeek(offsetDay(week, -7))}>Tuần trước</Button>
              <strong>{dayText(week)} – {dayText(offsetDay(week, 6))}</strong>
              <Button icon={ChevronRight} onClick={() => setWeek(offsetDay(week, 7))}>Tuần sau</Button>
            </div>
            <div className="booking-admin-row">
              <Field label="Chọn ngày trong tuần">
                <input type="date" min="2000-01-03" max="9998-12-28" value={week}
                  onChange={(event) => { if (event.target.validity.valid && event.target.value) setWeek(monday(event.target.value)); }} />
              </Field>
              <Button icon={CalendarDays} onClick={() => setWeek(thisWeek())}>Tuần này</Button>
            </div>
          </div>
          {current?.error && <p className="booking-admin-notice" role="alert">{current.error}</p>}
          {!current && <p role="status">Đang tải hàng đợi tuần…</p>}
          {current?.data && (
            <>
              <div className="booking-admin-metrics">
                {[['Tổng yêu cầu', rows.length], ['Chờ xử lý', rows.filter((row) => row.status === 'PENDING').length],
                  ['Đã xử lý', rows.filter((row) => row.status === 'CONFIRMED').length], ['Gửi muộn', rows.filter((row) => row.isLate).length]]
                  .map(([label, count]) => <div key={label}><small>{label}</small><strong>{count}</strong></div>)}
              </div>
              <Field label="Lọc yêu cầu" className="booking-admin-filter"><select value={filter} onChange={(event) => setFilter(event.target.value)}>
                <option value="">Tất cả trạng thái</option>
                {Object.entries(statuses).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                <option value="LATE">Gửi sau cutoff</option>
              </select></Field>
              {visible.length === 0 ? <p className="booking-admin-empty">{rows.length ? 'Không có yêu cầu phù hợp bộ lọc.' : 'Chưa có yêu cầu trong tuần này.'}</p> : (
                <div className="booking-admin-requests">
                  {visible.map((row) => (
                    <article key={row.id}>
                      <div className="booking-admin-row"><Badge status={row.status} />{row.isLate && <Badge status="PENDING">Gửi muộn</Badge>}</div>
                      <h3>{row.activityTitle}</h3>
                      <p>{row.clubName} · Yêu cầu #{row.id} · Phiên #{row.sessionId}</p>
                      <p>{dateTime(row.startsAtUtc)} – {dateTime(row.endsAtUtc)}</p>
                      <p>{venueStatuses[row.venueStatus]}{confirmedRooms(row).length > 0 && data && ` · ${venueLabels(data.venues, confirmedRooms(row))}`} · {row.equipment.length} loại thiết bị</p>
                      <Button variant={row.canManage ? 'primary' : 'secondary'} disabled={!data} onClick={() => setOpen(row)}>{row.canManage ? 'Xử lý yêu cầu' : 'Xem kết quả'}</Button>
                    </article>
                  ))}
                </div>
              )}
            </>
          )}
        </section>
      ) : data && (
        <div className="booking-admin-catalog">
          {[['venues', 'Địa điểm', Building2], ['equipment', 'Thiết bị', Package]].map(([kind, title, Icon]) => (
            <section key={kind}>
              <header className="booking-admin-toolbar"><h3><Icon size={20} /> {title}</h3>
                <Button icon={Plus} onClick={() => setEditor({ kind })}>Thêm {title.toLowerCase()}</Button></header>
              {data[kind].length ? data[kind].map((item) => (
                <article key={item.id} className="booking-admin-toolbar">
                  <div><strong>{item.name}</strong><p>{[item.code, item.venueType, item.building, item.floor && `Tầng ${item.floor}`,
                    kind === 'venues' ? `${item.capacity} chỗ` : `${item.quantity} trong kho`].filter(Boolean).join(' · ')}</p></div>
                  <Badge status={item.isBookable ? 'CONFIRMED' : 'CANCELLED'}>{item.isBookable ? 'Đang nhận' : 'Ngừng nhận'}</Badge>
                  <Button onClick={() => setEditor({ kind, item })}>Chỉnh sửa</Button>
                </article>
              )) : <p className="booking-admin-empty">Danh mục {title.toLowerCase()} đang trống.</p>}
            </section>
          ))}
        </div>
      )}
      {open && data && <ReviewDialog key={open.version} row={open} catalog={data} onClose={() => {
        setOpen(null);
        reload();
      }} onSaved={saved} />}
      {editor?.kind === 'floor-plan'
        ? <FloorPlanDialog path={path} editor={editor} userId={userId} describe={describe} onClose={() => setEditor(null)} onSaved={saved} />
        : editor && <CatalogDialog path={path} editor={editor} onClose={() => setEditor(null)} onSaved={saved} />}
    </div>
  );
}

export default function ActivityBookingDesk({ mapsOnly = false }) {
  const { user } = useAuth();
  const scope = useCampusScope(user);
  const [choice, setChoice] = useState('');
  const campus = selectedCampus(scope.data, choice);
  return (
    <Panel title={mapsOnly ? 'Sơ đồ và phòng' : 'Đặt địa điểm và thiết bị'}
      description={mapsOnly ? 'Tải ảnh theo tầng và gắn vị trí phòng để CLB chọn khi tạo booking.'
        : 'Xử lý yêu cầu của CLB theo tuần diễn ra phiên, quản lý phòng và thiết bị theo cơ sở.'}>
      <div className="booking-admin booking-admin-body">
        {scope.error ? (
          <div className="booking-admin-row">
            <p className="booking-admin-notice" role="alert">{scope.error}</p>
            <Button onClick={scope.retry}>Thử lại</Button>
          </div>
        ) : !scope.data ? <p className="booking-admin-notice" role="status">Đang kiểm tra quyền quản lý cơ sở…</p> : (
          <>
            <Field label={mapsOnly ? 'Campus' : 'Cơ sở'} className="booking-admin-filter">
              <select value={campus} disabled={!scope.data.canSelectCampus} onChange={(event) => setChoice(event.target.value)}>
                <option value="">{mapsOnly ? 'Chọn campus' : 'Chọn cơ sở để xem yêu cầu'}</option>
                {scope.data.campuses.map((item) => <option key={item.code} value={item.code}>{item.name}</option>)}
              </select>
            </Field>
            {campus && <CampusDesk key={`${user.id}:${campus}:${mapsOnly}`} campus={campus} userId={user.id} mapsOnly={mapsOnly} />}
          </>
        )}
      </div>
    </Panel>
  );
}
