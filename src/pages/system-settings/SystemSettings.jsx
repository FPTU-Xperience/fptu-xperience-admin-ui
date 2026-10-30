import './SystemSettings.css';
import { useEffect, useState } from 'react';
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
import api from '../../services/api.js';
import { useAction } from '../../hooks/useAction.js';
import { Badge, Button, Field, PageHeader, Panel, StatCard } from '../../components/ui/index.js';

function Toggle({ label, description, checked, onChange }) {
  return (
    <div className="system-settings-content">
      <div>
        <strong className="system-settings-value">{label}</strong>
        <p className="system-settings-description">{description}</p>
      </div>
      <button
        type="button"
        className={`system-settings-button ${checked ? 'system-settings-button-state-active' : 'system-settings-button-state-inactive'}`}
        role="switch"
        aria-checked={checked}
        aria-label={label}
        onClick={() => onChange(!checked)}
      >
        <span
          className={`system-settings-text ${checked ? 'system-settings-text-state-active' : 'system-settings-text-state-inactive'}`}
        />
      </button>
    </div>
  );
}

// Default settings
const DEFAULT_SETTINGS = {
  googleDomain: 'fpt.edu.vn',
  timetableUrl: '',
  inAppNotifications: true,
  emailNotifications: true,
  digest: 'weekly',
  rateLimit: 100,
  retention: 365,
};

export function SystemSettings({ type, integrationSection = 'all', healthSection = 'all' }) {
  const run = useAction();
  const [form, setForm] = useState(DEFAULT_SETTINGS);

  // Data stats
  const [stats, setStats] = useState({
    accounts: 0,
    ledger: 0,
    audit: 0,
    clubs: 0,
  });
  const [loading, setLoading] = useState(false);

  // Fetch stats or settings from API
  useEffect(() => {
    if (type === 'health') {
      async function fetchStats() {
        setLoading(true);
        try {
          const res = await api.admin.health.stats();
          setStats({
            accounts: res?.accounts || 0,
            ledger: res?.ledger || 0,
            audit: res?.audit || 0,
            clubs: res?.clubs || 0,
          });
        } catch (err) {
          console.error('Failed to fetch stats:', err);
        } finally {
          setLoading(false);
        }
      }
      fetchStats();
    } else {
      async function fetchSettings() {
        try {
          const s = await api.admin.settings.get();
          if (s) {
            setForm({
              googleDomain: s.googleDomain || 'fpt.edu.vn',
              timetableUrl: s.timetableUrl || '',
              inAppNotifications: s.inAppNotifications ?? true,
              emailNotifications: s.emailNotifications ?? true,
              digest: s.digest || 'weekly',
              rateLimit: s.rateLimit || 100,
              retention: s.retention || 365,
            });
          }
        } catch (err) {
          console.error('Failed to fetch settings:', err);
        }
      }
      fetchSettings();
    }
  }, [type]);

  async function submit(e) {
    e.preventDefault();
    await run(async () => {
      await api.admin.settings.update(form);
    }, 'Đã lưu cấu hình nền tảng.');
  }

  const titles = {
    settings: ['Cấu hình nền tảng', 'Thiết lập thông báo và các tham số vận hành của hệ thống.'],
    integrations: [
      'Tích hợp hệ thống',
      'Chuẩn bị kết nối định danh trường học và thời khóa biểu sinh viên.',
    ],
    health: ['Tình trạng hệ thống', 'Theo dõi dữ liệu và trạng thái tích hợp các dịch vụ.'],
  };

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
          {healthSection !== 'connections' && (
            <div className="system-settings-content-2">
              <StatCard
                label="Tài khoản trong hệ thống"
                value={loading ? '-' : stats.accounts}
                icon={Users}
                note="Tài khoản đã đăng ký"
                tone="blue"
              />
              <StatCard
                label="Câu lạc bộ"
                value={loading ? '-' : stats.clubs}
                icon={Database}
                note="Câu lạc bộ đang hoạt động"
                tone="green"
              />
              <StatCard
                label="Sự kiện nhật ký"
                value={loading ? '-' : stats.audit}
                icon={ScrollText}
                note="Các thay đổi đã ghi nhận"
              />
            </div>
          )}

          {/* Service List */}
          {healthSection !== 'overview' && (
            <Panel
              title="Trạng thái dịch vụ"
              description="Theo dõi kết nối các dịch vụ."
            >
              <div className="system-settings-content-3">
                {[
                  [Server, 'API Gateway', 'Cổng kết nối các microservice', '/api/health'],
                  [
                    KeyRound,
                    'Định danh trường học',
                    'Google / hệ thống SSO của trường',
                    '/api/auth/health',
                  ],
                  [
                    CalendarDays,
                    'Đồng bộ thời khóa biểu',
                    'Lọc hoạt động theo lịch học thực tế',
                    null,
                  ],
                  [
                    Activity,
                    'Tác vụ tính Xperience Point & chuyển học kỳ',
                    'Lịch chạy tác vụ và kết quả xử lý',
                    '/api/kpis/health',
                  ],
                  [
                    ShieldCheck,
                    'Kiểm tra toàn vẹn sổ cái',
                    'Kiểm chứng dữ liệu đóng góp',
                    '/api/reports/health',
                  ],
                ].map(([Icon, title, desc, healthEndpoint]) => (
                  <div key={title} className="system-settings-content-4">
                    <span className="system-settings-text-2">
                      <Icon size={22} />
                    </span>
                    <div className="system-settings-content-5">
                      <strong className="system-settings-value">{title}</strong>
                      <small className="system-settings-caption">{desc}</small>
                    </div>
                    <Badge tone={healthEndpoint ? 'green' : 'neutral'}>
                      {healthEndpoint ? 'Hoạt động' : 'Chưa kết nối'}
                    </Badge>
                  </div>
                ))}
              </div>
            </Panel>
          )}
        </>
      ) : (
        <form onSubmit={submit}>
          {type === 'integrations' ? (
            /* Integrations Grid */
            <div className="system-settings-content-6">
              {/* Identity Panel */}
              {integrationSection !== 'timetable' && (
                <Panel
                  title="Định danh sinh viên"
                  description="Đăng nhập qua tài khoản thuộc hệ thống của trường."
                >
                  <div className="system-settings-content-7">
                    <div className="system-settings-content-8">
                      <span className="system-settings-text-3">
                        <KeyRound size={28} />
                      </span>
                      <Badge>Cấu hình định danh</Badge>
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
                    <p className="system-settings-description-2">
                      Định danh qua Google Workspace for Education. Sinh viên đăng nhập bằng email
                      trường.
                    </p>
                  </div>
                </Panel>
              )}

              {/* Timetable Panel */}
              {integrationSection !== 'identity' && (
                <Panel
                  title="Thời khóa biểu"
                  description="Hỗ trợ gợi ý câu lạc bộ và hoạt động phù hợp lịch học."
                >
                  <div className="system-settings-content-7">
                    <div className="system-settings-content-8">
                      <span className="system-settings-text-4">
                        <CalendarDays size={28} />
                      </span>
                      <Badge>Chưa kết nối</Badge>
                    </div>
                    <Field
                      label="Địa chỉ API thời khóa biểu"
                      hint="Địa chỉ dịch vụ thời khóa biểu."
                    >
                      <input
                        type="url"
                        placeholder="https://…"
                        value={form.timetableUrl}
                        onChange={(e) => setForm({ ...form, timetableUrl: e.target.value })}
                      />
                    </Field>
                    <p className="system-settings-description-2">
                      Cần quyền truy cập từ nhà trường để kích hoạt đồng bộ.
                    </p>
                  </div>
                </Panel>
              )}
            </div>
          ) : (
            /* Settings Grid */
            <div className="system-settings-content-6">
              {/* Notifications Panel */}
              <Panel title="Thông báo" description="Chọn các kênh và tần suất cập nhật.">
                <div className="system-settings-content-9">
                  <Toggle
                    label="Thông báo trong ứng dụng"
                    description="Cập nhật trạng thái hồ sơ, nhiệm vụ và Xperience Point"
                    checked={form.inAppNotifications}
                    onChange={(v) => setForm({ ...form, inAppNotifications: v })}
                  />
                  <Toggle
                    label="Thông báo qua email"
                    description="Nhắc hạn và gửi các cập nhật cần thiết"
                    checked={form.emailNotifications}
                    onChange={(v) => setForm({ ...form, emailNotifications: v })}
                  />
                  <div className="system-settings-content-10">
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
                <div className="system-settings-content-11">
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
                    hint="Không áp dụng cho sổ cái Xperience Point và hồ sơ đóng góp vĩnh viễn."
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
                  <div className="system-settings-content-12">
                    Các thông số hiện chỉ dùng để xem thử, chưa có hiệu lực.
                  </div>
                </div>
              </Panel>
            </div>
          )}

          {/* Footer */}
          <div className="system-settings-content-13">
            <span className="system-settings-text-5">Thay đổi được ghi vào nhật ký quản trị.</span>
            <Button type="submit" variant="primary" icon={Save}>
              Lưu cấu hình
            </Button>
          </div>
        </form>
      )}
    </>
  );
}
