import { useState } from 'react';
import {
  Activity,
  CalendarDays,
  Database,
  KeyRound,
  Save,
  ScrollText,
  Server,
  ShieldCheck,
  Users,
} from 'lucide-react';
import { useWorkspace } from '../context/WorkspaceContext.jsx';
import { useAction } from '../hooks/useAction.js';
import { Badge, Button, Field, PageHeader, Panel, StatCard } from '../components/ui/index.js';

function Toggle({ label, description, checked, onChange }) {
  return (
    <div className="flex items-center justify-between py-[15px] border-b border-[#f1f2f4] last:border-b-0">
      <div>
        <strong className="block text-[12px] font-medium text-[#4a5462]">{label}</strong>
        <p className="text-[11px] text-[#818794] mt-[5px]">{description}</p>
      </div>
      <button
        type="button"
        className={`relative w-[40px] h-[23px] rounded-full transition-colors ${checked ? 'bg-[#ed641c]' : 'bg-[#d1d5db]'}`}
        role="switch"
        aria-checked={checked}
        aria-label={label}
        onClick={() => onChange(!checked)}
      >
        <span
          className={`absolute top-[3px] w-[17px] h-[17px] bg-white rounded-full shadow transition-transform ${checked ? 'left-[20px]' : 'left-[3px]'}`}
        />
      </button>
    </div>
  );
}

export function SystemSettings({ type }) {
  const { state, commit } = useWorkspace();
  const run = useAction();
  const [form, setForm] = useState({ ...state.settings });

  const titles = {
    settings: ['Cấu hình nền tảng', 'Thiết lập thông báo và các tham số vận hành của hệ thống.'],
    integrations: [
      'Tích hợp hệ thống',
      'Chuẩn bị kết nối định danh trường học và thời khóa biểu sinh viên.',
    ],
    health: [
      'Tình trạng hệ thống',
      'Theo dõi dữ liệu của bản mẫu và trạng thái tích hợp các dịch vụ.',
    ],
  };

  async function submit(e) {
    e.preventDefault();
    await run(
      () =>
        commit(
          type === 'integrations' ? 'Lưu cấu hình tích hợp' : 'Lưu tham số nền tảng',
          type === 'integrations'
            ? 'Cập nhật tên miền đăng nhập và địa chỉ dịch vụ thời khóa biểu'
            : 'Cập nhật thông báo, giới hạn yêu cầu và thời gian lưu nhật ký',
          'admin',
          (draft) => {
            draft.settings = {
              ...form,
              rateLimit: Number(form.rateLimit),
              retention: Number(form.retention),
            };
          },
        ),
      'Đã lưu cấu hình mẫu. Chưa áp dụng lên dịch vụ thực.',
    );
  }

  return (
    <>
      <PageHeader
        eyebrow="QUẢN TRỊ HỆ THỐNG"
        title={titles[type][0]}
        description={titles[type][1]}
      />

      {type === 'health' ? (
        <>
          {/* Stats Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
            <StatCard
              label="Tài khoản trong bản mẫu"
              value={state.accounts.length}
              icon={Users}
              note="Lưu trong trình duyệt hiện tại"
              tone="blue"
            />
            <StatCard
              label="Bút toán sổ cái"
              value={state.ledger.length}
              icon={Database}
              note={`${state.ledger.filter((e) => e.type === 'correction').length} bút toán điều chỉnh`}
              tone="green"
            />
            <StatCard
              label="Sự kiện nhật ký"
              value={state.audit.length}
              icon={ScrollText}
              note="Các thay đổi đã ghi nhận"
            />
          </div>

          {/* Service List */}
          <Panel
            title="Trạng thái dịch vụ"
            description="Bản thiết kế chưa thực hiện kiểm tra kết nối tới backend."
          >
            <div className="divide-y divide-[#e9ebee]">
              {[
                [Server, 'API Gateway', 'Cổng kết nối các microservice'],
                [KeyRound, 'Định danh trường học', 'Google / hệ thống SSO của trường'],
                [CalendarDays, 'Đồng bộ thời khóa biểu', 'Lọc hoạt động theo lịch học thực tế'],
                [Activity, 'Tác vụ tính XP & chuyển học kỳ', 'Lịch chạy tác vụ và kết quả xử lý'],
                [ShieldCheck, 'Kiểm tra toàn vẹn sổ cái', 'Kiểm chứng dữ liệu đóng góp trên máy chủ'],
              ].map(([Icon, title, desc]) => (
                <div key={title} className="flex items-center gap-[15px] py-[20px]">
                  <span className="w-[45px] h-[45px] rounded-[11px] bg-[#f8f5fa] grid place-items-center text-[#b49fc7] shrink-0">
                    <Icon size={22} />
                  </span>
                  <div className="flex-1 min-w-0">
                    <strong className="block text-[12px] font-medium text-[#4a5462]">{title}</strong>
                    <small className="block text-[11px] text-[#8d96a3] mt-[5px]">{desc}</small>
                  </div>
                  <Badge>Chưa kết nối</Badge>
                </div>
              ))}
            </div>
          </Panel>
        </>
      ) : (
        <form onSubmit={submit}>
          {type === 'integrations' ? (
            /* Integrations Grid */
            <div className="grid sm:grid-cols-2 gap-6 mb-6">
              {/* Identity Panel */}
              <Panel
                title="Định danh sinh viên"
                description="Đăng nhập qua tài khoản thuộc hệ thống của trường."
              >
                <div className="px-[22px] py-[25px] space-y-5">
                  <div className="flex items-center gap-[15px]">
                    <span className="w-[55px] h-[55px] rounded-[13px] bg-[#fcf3e8] grid place-items-center text-[#c99c67]">
                      <KeyRound size={28} />
                    </span>
                    <Badge>Chưa kết nối</Badge>
                  </div>
                  <Field
                    label="Tên miền email được phép"
                    hint="Chỉ nhập tên miền, ví dụ: fpt.edu.vn"
                  >
                    <input
                      placeholder="fpt.edu.vn"
                      pattern="[A-Za-z0-9.-]+\.[A-Za-z]{2,}"
                      maxLength={253}
                      value={form.googleDomain}
                      onChange={(e) => setForm({ ...form, googleDomain: e.target.value })}
                    />
                  </Field>
                  <p className="text-[10.5px] text-[#8d96a3] leading-relaxed">
                    Tên miền là cấu hình dự kiến. Kết nối và kiểm tra danh tính sẽ do dịch vụ xác thực thực hiện.
                  </p>
                </div>
              </Panel>

              {/* Timetable Panel */}
              <Panel
                title="Thời khóa biểu"
                description="Hỗ trợ gợi ý câu lạc bộ và hoạt động phù hợp lịch học."
              >
                <div className="px-[22px] py-[25px] space-y-5">
                  <div className="flex items-center gap-[15px]">
                    <span className="w-[55px] h-[55px] rounded-[13px] bg-[#edf3fb] grid place-items-center text-[#7fa3c9]">
                      <CalendarDays size={28} />
                    </span>
                    <Badge>Chưa kết nối</Badge>
                  </div>
                  <Field
                    label="Địa chỉ API thời khóa biểu"
                    hint="Địa chỉ dùng cho cấu hình tích hợp phía máy chủ."
                  >
                    <input
                      type="url"
                      placeholder="https://…"
                      value={form.timetableUrl}
                      onChange={(e) => setForm({ ...form, timetableUrl: e.target.value })}
                    />
                  </Field>
                  <p className="text-[10.5px] text-[#8d96a3] leading-relaxed">
                    Lưu địa chỉ chưa kích hoạt đồng bộ. Cần dịch vụ backend và quyền truy cập được cấp bởi trường.
                  </p>
                </div>
              </Panel>
            </div>
          ) : (
            /* Settings Grid */
            <div className="grid sm:grid-cols-2 gap-6 mb-6">
              {/* Notifications Panel */}
              <Panel title="Thông báo" description="Chọn các kênh và tần suất cập nhật.">
                <div className="px-[22px] py-[15px]">
                  <Toggle
                    label="Thông báo trong ứng dụng"
                    description="Cập nhật trạng thái hồ sơ, nhiệm vụ và XP"
                    checked={form.inAppNotifications}
                    onChange={(v) => setForm({ ...form, inAppNotifications: v })}
                  />
                  <Toggle
                    label="Thông báo qua email"
                    description="Nhắc hạn và gửi các cập nhật cần thiết"
                    checked={form.emailNotifications}
                    onChange={(v) => setForm({ ...form, emailNotifications: v })}
                  />
                  <div className="pt-[15px]">
                    <Field label="Tần suất tổng hợp">
                      <select
                        value={form.digest}
                        onChange={(e) => setForm({ ...form, digest: e.target.value })}
                      >
                        <option value="daily">Hằng ngày</option>
                        <option value="weekly">Hằng tuần</option>
                        <option value="off">Không gửi tổng hợp</option>
                      </select>
                    </Field>
                  </div>
                </div>
              </Panel>

              {/* Parameters Panel */}
              <Panel title="Tham số vận hành" description="Các giới hạn dự kiến cho nền tảng.">
                <div className="px-[22px] py-[15px] space-y-5">
                  <Field label="Số yêu cầu tối đa / phút / tài khoản">
                    <input
                      required
                      type="number"
                      min={10}
                      max={10000}
                      value={form.rateLimit}
                      onChange={(e) => setForm({ ...form, rateLimit: e.target.value })}
                    />
                  </Field>
                  <Field
                    label="Số ngày lưu nhật ký vận hành"
                    hint="Không áp dụng cho sổ cái XP và hồ sơ đóng góp vĩnh viễn."
                  >
                    <input
                      required
                      type="number"
                      min={30}
                      max={3650}
                      value={form.retention}
                      onChange={(e) => setForm({ ...form, retention: e.target.value })}
                    />
                  </Field>
                  <div className="p-[14px] border border-[#e4ebf3] bg-[#f4f7fb] text-[#70869e] rounded-[7px] text-[11px] leading-[1.8]">
                    Các thông số được lưu để xem thử. Thông báo và giới hạn truy cập sẽ hoạt động sau khi nối dịch vụ backend.
                  </div>
                </div>
              </Panel>
            </div>
          )}

          {/* Footer */}
          <div className="flex items-center justify-between py-[15px]">
            <span className="text-[11px] text-[#8d96a3]">Thay đổi được ghi vào nhật ký quản trị.</span>
            <Button type="submit" variant="primary" icon={Save}>
              Lưu cấu hình
            </Button>
          </div>
        </form>
      )}
    </>
  );
}
