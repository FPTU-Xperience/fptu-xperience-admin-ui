import { useEffect, useRef, useState } from 'react';
import { Map as MapIcon, Plus } from 'lucide-react';
import api from '../../services/api.js';
import { Button, Field, Modal } from '../../components/ui/index.js';
import { hcmCampusMaps, recognizeHcmPlan } from './hcm-campus-maps.js';
import { cropFloorPlan, remapRoomToCrop, wholeImage } from './floor-plan-crop.js';
import FloorPlanCrop from './FloorPlanCrop.jsx';

const imageTypes = ['image/jpeg', 'image/png', 'image/webp'];
const layoutKey = ({ building, floor }) => JSON.stringify([building, floor]);
const layoutLabel = ({ building, floor }) => !building ? 'Bản đồ campus'
  : floor ? `${building} · Tầng ${floor}` : `Ghim ${building}`;
const validText = (value, max) => typeof value === 'string' && value.trim().length > 0 && value.trim().length <= max;
const validPoint = (value) => Number.isInteger(value) && value >= 0 && value <= 100;
const hasMarker = ({ planX, planY }) => planX != null && planY != null;

function parseRooms(contents) {
  const rooms = JSON.parse(contents);
  if (!Array.isArray(rooms) || !rooms.length || rooms.length > 200 || rooms.some((room) =>
    !room || !validText(room.code, 40) || !validText(room.name, 160) || !validText(room.type, 40)
    || !validPoint(room.planX) || !validPoint(room.planY)
    || room.planArea != null && (typeof room.planArea !== 'string' || room.planArea.length > 256)
    || room.capacity != null && (!Number.isInteger(room.capacity) || room.capacity < 0 || room.capacity > 2147483647)
    || room.isBookable != null && typeof room.isBookable !== 'boolean')) {
    throw new Error('Tệp phải có 1–200 phòng với mã, tên, loại và tọa độ nguyên từ 0 đến 100.');
  }
  if (new Set(rooms.map(({ code }) => code.trim().toUpperCase())).size !== rooms.length) {
    throw new Error('Mỗi mã phòng chỉ được xuất hiện một lần.');
  }
  return rooms.map(({ code, name, type, planX, planY, planArea, capacity = 0, isBookable = false }) =>
    ({ code, name, type, planX, planY, planArea, capacity: capacity ?? 0, isBookable: isBookable ?? false }));
}

async function uploadPlan(file, userId) {
  if (!imageTypes.includes(file.type) || file.size === 0 || file.size > 5 * 1024 * 1024) {
    throw new Error('Chọn ảnh JPEG, PNG hoặc WebP tối đa 5 MB.');
  }
  const intent = await api.post('/api/media/upload-intents', {
    kind: 'campus-plan', ownerId: String(userId), contentType: file.type, sizeBytes: file.size,
  });
  const result = await fetch(intent.uploadUrl, {
    method: 'PUT', headers: { 'Content-Type': file.type }, body: file,
  });
  if (!result.ok) throw new Error('Tải ảnh lên thất bại. Vui lòng thử lại.');
  return intent.publicUrl;
}

export function FloorPlan({ imageUrl, rooms, onPosition, onRoom, draft = null }) {
  const [failed, setFailed] = useState(false);
  if (!imageUrl) return null;
  if (failed) return <p role="status">Không mở được ảnh sơ đồ.</p>;
  return (
    <div className="booking-admin-plan" data-editable={Boolean(onPosition)}>
      <img src={imageUrl} alt="Sơ đồ vị trí phòng" referrerPolicy="no-referrer" onError={() => setFailed(true)}
        onClick={onPosition && ((event) => {
          const bounds = event.currentTarget.getBoundingClientRect();
          onPosition({
            x: Number((100 * (event.clientX - bounds.left) / bounds.width).toFixed(2)),
            y: Number((100 * (event.clientY - bounds.top) / bounds.height).toFixed(2)),
          });
        })} />
      <svg className="booking-admin-plan-areas" viewBox="0 0 100 100" preserveAspectRatio="none"
        role={onRoom ? 'group' : undefined} aria-label={onRoom ? 'Phòng trên sơ đồ' : undefined} aria-hidden={!onRoom}>
        {rooms.filter((room) => room.planArea).map((room) => (
          <polygon key={room.candidateId ?? room.code} points={room.planArea} vectorEffect="non-scaling-stroke"
            role={onRoom ? 'button' : undefined} tabIndex={onRoom ? 0 : undefined}
            aria-label={onRoom ? `Chỉnh sửa ${room.name}` : undefined}
            onClick={onRoom && (() => onRoom(room))}
            onKeyDown={onRoom && ((event) => {
              if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); onRoom(room); }
            })}><title>{room.name}</title></polygon>
        ))}
        {draft && <>
          <polyline points={draft.map(({ x, y }) => `${x},${y}`).join(' ')} vectorEffect="non-scaling-stroke" />
          {draft.map(({ x, y }) => <circle key={`${x},${y}`} cx={x} cy={y} r=".5" fill="#a53b14" />)}
        </>}
      </svg>
      {rooms.filter((room) => room.candidateId).map((room) => (
        <span key={room.candidateId} className="booking-admin-plan-candidate" aria-hidden="true"
          style={{ left: `${room.planX}%`, top: `${room.planY}%` }}>{room.candidateId}</span>
      ))}
      {rooms.filter((room) => !room.planArea && hasMarker(room)).map((room) => (
        onRoom ? <button type="button" key={room.code} className="booking-admin-plan-pin" title={room.name}
          aria-label={`Chỉnh sửa ${room.name}`} style={{ left: `${room.planX}%`, top: `${room.planY}%` }}
          onClick={() => onRoom(room)} /> : <span key={room.code} className="booking-admin-plan-pin"
          aria-hidden="true" style={{ left: `${room.planX}%`, top: `${room.planY}%` }} />
      ))}
    </div>
  );
}

export function FloorPlanDialog({ path, editor, userId, describe, onClose, onSaved }) {
  const { item, preset } = editor;
  const [rooms, setRooms] = useState([]);
  const [file, setFile] = useState(null);
  const [prepared, setPrepared] = useState(null);
  const [crop, setCrop] = useState(wholeImage);
  const [candidates, setCandidates] = useState([]);
  const [analysisStatus, setAnalysisStatus] = useState('');
  const [preview, setPreview] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [reading, setReading] = useState(false);
  const [invalidRooms, setInvalidRooms] = useState(false);
  const lock = useRef(false);
  useEffect(() => {
    const image = prepared || file;
    if (!image) { setPreview(''); return undefined; }
    const url = URL.createObjectURL(image);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file, prepared]);

  useEffect(() => {
    if (!preset) return undefined;
    let active = true;
    (async () => {
      try {
        const response = await fetch(preset.imageUrl);
        if (!response.ok) throw new Error('Không tải được ảnh mẫu.');
        const { blob } = await cropFloorPlan(await response.blob(), preset.crop);
        if (!active) return;
        setPrepared(blob);
        setRooms(preset.rooms.map((room) => remapRoomToCrop(room, preset.crop)));
      } catch (issue) {
        if (active) setError(issue.message);
      }
    })();
    return () => { active = false; };
  }, [preset]);

  const changeFile = (image) => {
    setPrepared(null);
    setCandidates([]);
    setAnalysisStatus('');
    setCrop(wholeImage);
    setFile(image);
  };

  const prepareImage = async () => {
    if (lock.current) return;
    lock.current = true;
    setBusy(true);
    setError('');
    try {
      const { blob, canvas } = await cropFloorPlan(file, crop);
      const template = await recognizeHcmPlan(file);
      let result;
      if (template) {
        const matched = template.rooms.map((room) => remapRoomToCrop(room, crop)).filter((room) =>
          room.planArea.split(/[ ,]/).every((coordinate) => Number(coordinate) >= 0 && Number(coordinate) <= 100));
        result = { rooms: matched.map((room, index) => ({ ...room, candidateId: index + 1 })), textAvailable: true };
      } else {
        const { analyzeFloorPlan } = await import('./floor-plan-analysis.js');
        result = await analyzeFloorPlan(canvas);
      }
      setCandidates(result.rooms);
      setPrepared(blob);
      if (!result.rooms.length) setAnalysisStatus('Chưa tìm thấy vùng phòng khép kín. Sau khi lưu ảnh, bạn có thể vẽ vùng phòng trên sơ đồ.');
      else if (!result.textAvailable) setAnalysisStatus('Đã tìm vùng phòng. Hãy nhập mã phòng vì phần nhận diện chữ chưa khả dụng.');
      else setAnalysisStatus('Kiểm tra mã và vị trí. Bỏ trống mã của vùng không dùng.');
    } catch (issue) {
      setError(issue.message || 'Không phân tích được ảnh sơ đồ.');
    } finally {
      lock.current = false;
      setBusy(false);
    }
  };

  const readRooms = async (json) => {
    if (!json) return;
    setReading(true);
    setRooms([]);
    setInvalidRooms(false);
    setError('');
    try {
      if (json.size > 128 * 1024) throw new Error('Tệp danh sách phòng phải nhỏ hơn 128 KB.');
      setRooms(parseRooms(await json.text()));
    } catch (issue) {
      setInvalidRooms(true);
      setError(issue instanceof SyntaxError ? 'Tệp danh sách phòng phải là JSON hợp lệ.' : issue.message);
    } finally {
      setReading(false);
    }
  };

  const save = async (event) => {
    event.preventDefault();
    if (lock.current || busy || reading || invalidRooms || ((file || preset) && !prepared)) return;
    const fields = new FormData(event.currentTarget);
    const building = fields.get('building').trim();
    const floor = fields.get('floor').trim();
    if (!building || !floor) { setError('Nhập tên tòa nhà và tầng.'); return; }
    let imageUrl = fields.get('imageUrl')?.trim() || null;
    if (!file && !preset && !imageUrl) { setError('Chọn ảnh sơ đồ hoặc nhập URL HTTPS.'); return; }
    lock.current = true;
    setBusy(true);
    setError('');
    try {
      const detected = candidates.filter((room) => room.code.trim()).map(({ candidateId, ...room }) => ({
        ...room, code: room.code.trim().toUpperCase(), name: room.name.trim() || `Phòng ${room.code.trim().toUpperCase()}`,
      }));
      const byCode = new Map(detected.map((room) => [room.code, room]));
      if (byCode.size !== detected.length) throw new Error('Mỗi mã phòng chỉ được xuất hiện một lần.');
      for (const room of rooms) byCode.set(room.code.trim().toUpperCase(), room);
      const mappedRooms = [...byCode.values()];
      const uploadedImageUrl = prepared ? await uploadPlan(prepared, userId) : null;
      if (uploadedImageUrl) imageUrl = null;
      await api.put(`${path}/layout`, {
        building, floor, imageUrl, uploadedImageUrl, replaceGeometry: Boolean(item && file),
        rooms: mappedRooms.map((room) => ({ ...room, isBookable: preset ? fields.has('bookable') : room.isBookable })),
      });
      onSaved(`Đã lưu ${building} · Tầng ${floor}${mappedRooms.length ? ` và cập nhật ${mappedRooms.length} vị trí phòng` : ''}.`);
    } catch (issue) {
      setError(describe(issue));
    } finally {
      lock.current = false;
      setBusy(false);
    }
  };
  const visibleImage = preview || preset?.imageUrl || item?.imageUrl;
  return (
    <Modal wide title={preset ? 'Nhập sơ đồ HCM' : item ? 'Chỉnh sửa sơ đồ tầng' : 'Thêm sơ đồ tầng'}
      onClose={(event) => { if (busy) event?.preventDefault(); else onClose(); }}>
      <form className="booking-admin-dialog" onSubmit={save}>
        <fieldset disabled={busy || reading}>
          <div className="booking-admin-fields-grid">
            <Field label="Tòa nhà"><input name="building" required maxLength={80}
              defaultValue={item?.building ?? preset?.building} readOnly={Boolean(item)} /></Field>
            <Field label="Tầng"><input name="floor" required maxLength={40}
              defaultValue={item?.floor ?? preset?.floor} readOnly={Boolean(item)} /></Field>
          </div>
          {!preset && (
            <>
              <Field label="Tệp ảnh sơ đồ" hint="JPEG, PNG hoặc WebP, tối đa 5 MB.">
                <input type="file" accept={imageTypes.join(',')} onChange={(event) => changeFile(event.target.files[0] || null)} />
              </Field>
              {!file && <Field label="Hoặc URL ảnh HTTPS">
                <input type="url" name="imageUrl" maxLength={2048} defaultValue={item?.imageUrl} placeholder="https://…" />
              </Field>}
              <Field label="Tệp danh sách phòng (tùy chọn)"
                hint='Danh sách JSON, ví dụ [{"code":"001","name":"Phòng 001","type":"Phòng","planX":10,"planY":68}]. Có thể thêm capacity và isBookable.'>
                <input type="file" accept=".json,application/json" onChange={(event) => {
                  const json = event.target.files[0];
                  if (json) readRooms(json);
                  else { setRooms([]); setInvalidRooms(false); setError(''); }
                }} />
              </Field>
            </>
          )}
          {file && !prepared && preview ? (
            <FloorPlanCrop imageUrl={preview} crop={crop} onChange={setCrop} onAnalyze={prepareImage} />
          ) : visibleImage && <FloorPlan key={visibleImage} imageUrl={visibleImage} rooms={candidates.length ? candidates : rooms} />}
          {file && prepared && <Button type="button" onClick={() => { setPrepared(null); setCandidates([]); setAnalysisStatus(''); }}>Cắt lại ảnh</Button>}
          {item && file && prepared && <small>Chỉ những vùng có mã được giữ trên ảnh mới. Các phòng khác vẫn có trong danh mục.</small>}
          {file && !prepared && busy && <p role="status">Đang tìm vùng phòng và đọc mã trên ảnh đã cắt…</p>}
          {analysisStatus && <p role="status">{analysisStatus}</p>}
          {candidates.length > 0 && (
            <div className="booking-admin-candidates">
              {candidates.map((room, index) => (
                <Field key={room.candidateId} label={`Mã phòng vùng ${room.candidateId}`}>
                  <input maxLength={40} value={room.code} onChange={(event) => {
                    const code = event.target.value;
                    setCandidates((current) => current.map((candidate, position) =>
                      position === index ? { ...candidate, code, name: '' } : candidate));
                  }} />
                </Field>
              ))}
            </div>
          )}
          {rooms.length > 0 && <p>{rooms.length} phòng trong tệp. Nhập lại sơ đồ sẽ cập nhật vị trí và vùng chọn của phòng đã có.</p>}
          {preset && <label className="booking-admin-checkbox"><input type="checkbox" name="bookable" />
            Mở nhận booking cho các phòng mới trong sơ đồ này
          </label>}
        </fieldset>
        {error && <p role="alert" className="booking-admin-notice">{error}</p>}
        <div className="booking-admin-actions"><Button type="submit" variant="primary" busy={busy}
          disabled={reading || invalidRooms || Boolean((file || preset) && !prepared)}>Lưu sơ đồ</Button></div>
      </form>
    </Modal>
  );
}

export default function CampusBookingMaps({ campus, data, setEditor }) {
  const [choice, setChoice] = useState('');
  const plans = (data.layouts || []).filter((item) => item.imageUrl || item.planX != null);
  const active = plans.find((item) => layoutKey(item) === choice) || plans[0];
  const activeKey = active ? layoutKey(active) : '';
  const rooms = data.venues.filter((room) => active?.floor && room.building === active.building
    && (room.floor === active.floor || room.planAreasByFloor?.[active.floor]));
  const mapRooms = rooms.map((room) => room.floor === active.floor ? room : { ...room, planArea: room.planAreasByFloor[active.floor] });
  const editRoom = (room) => setEditor({ kind: 'venues', layout: active, item: rooms.find((item) => item.code === room.code) });
  const unmappedRooms = active?.imageUrl ? rooms.filter((room) => !room.planArea && !hasMarker(room)) : rooms;
  return (
    <div className="booking-admin-maps">
      <section>
        <header className="booking-admin-toolbar">
          <h3><MapIcon size={20} /> Sơ đồ campus</h3>
          <div className="booking-admin-row">
            <Button icon={Plus} onClick={() => setEditor({ kind: 'floor-plan' })}>Thêm sơ đồ tầng</Button>
            <Button onClick={() => setEditor({ kind: 'layout' })}>Cấu hình bản đồ campus</Button>
          </div>
        </header>
        {active ? (
          <>
            <div className="booking-admin-row">
              <Field label="Sơ đồ đã lưu"><select value={activeKey} onChange={(event) => setChoice(event.target.value)}>
                {plans.map((item) => <option key={layoutKey(item)} value={layoutKey(item)}>{layoutLabel(item)}</option>)}
              </select></Field>
              <Button onClick={() => setEditor({ kind: active.floor ? 'floor-plan' : 'layout', item: active })}>Chỉnh sửa sơ đồ</Button>
              {active.floor && <Button icon={Plus} onClick={() => setEditor({ kind: 'venues', layout: active })}>Thêm phòng trên tầng</Button>}
            </div>
            <FloorPlan key={active.imageUrl} imageUrl={active.imageUrl} rooms={mapRooms} onRoom={editRoom} />
            {active.floor && unmappedRooms.length > 0 && (
              <div className="booking-admin-room-list">
                {unmappedRooms.map((room) => <Button key={room.id} onClick={() => editRoom(room)}>
                  {room.name} · Chưa hiện trên sơ đồ
                </Button>)}
              </div>
            )}
            {active.floor && rooms.length === 0 && <p>Tầng này chưa có phòng được liên kết.</p>}
          </>
        ) : <p className="booking-admin-empty">Campus chưa có sơ đồ đã lưu.</p>}
      </section>
      {campus === 'HCM' && (
        <section>
          <h3>Sơ đồ HCM có sẵn</h3>
          <div className="booking-admin-room-list">
            {hcmCampusMaps.map((preset) => (
              <Button key={layoutKey(preset)} onClick={() => setEditor({ kind: 'floor-plan', preset })}>
                Nhập {layoutLabel(preset)}
              </Button>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
