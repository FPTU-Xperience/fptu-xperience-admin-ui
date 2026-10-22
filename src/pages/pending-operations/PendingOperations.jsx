import './PendingOperations.css';
import { useState } from 'react';
import { useWorkspace } from '../../context/WorkspaceContext.jsx';
import { Field, PageHeader, Panel } from '../../components/ui/index.js';
import PendingOperation from '../../components/operations/pending-operation/PendingOperation.jsx';

const operations = {
  dossiers: {
    title: 'Hồ sơ action & quyết toán Xperience Point',
    description:
      'Theo dõi hai lần xét duyệt: kế hoạch trước hoạt động và quyết toán điểm sau hoạt động.',
    unavailable: 'Chưa thể tiếp nhận hồ sơ action và quyết toán điểm',
    reason:
      'Hệ thống chưa cung cấp hàng chờ và bảng điểm chờ quyết toán của luồng này. Báo cáo CLB hiện hữu vẫn có thể được đọc và xét duyệt tại trang Báo cáo.',
    steps: [
      'Đọc kế hoạch, action, nhân sự dự kiến và ngân sách điểm thô đề xuất.',
      'Phê duyệt kế hoạch hoặc gửi yêu cầu chỉnh sửa; giữ phiên bản phương án được duyệt.',
      'Kiểm tra báo cáo kết thúc và bảng điểm thực tế từ nguồn tham gia đã xác minh.',
      'Phê duyệt quyết toán, theo dõi ghi điểm hoàn tất và xử lý lỗi mà không ghi trùng.',
    ],
    action: 'Mở hàng chờ action — chưa khả dụng',
    links: [
      ['/ctsv/activity-approvals', 'Duyệt đề xuất hoạt động hiện hữu'],
      ['/ctsv/reports', 'Đọc báo cáo từ CLB'],
    ],
  },
  rollover: {
    title: 'Chuyển học kỳ',
    description: 'Kiểm tra tác động và theo dõi chuyển kỳ, lịch sử thành viên và hoạt động.',
    unavailable: 'Chuyển học kỳ chưa khả dụng',
    reason:
      'Có thể cấu hình thông tin học kỳ, nhưng chưa thể chạy chuyển kỳ hoặc xem kết quả đối soát. Thêm một học kỳ không đồng nghĩa đã chuyển điểm và danh sách thành viên.',
    steps: [
      'Xác định kỳ nguồn, kỳ đích và danh sách sinh viên được nhập mới hoặc chuyển tiếp.',
      'Xem trước thành viên vắng mặt, quyền chủ nhiệm/phó chủ nhiệm và CLB cần tạm dừng.',
      'Chuyển phạm vi điểm và ngân sách kỳ mới, giữ lịch sử và xử lý kế nhiệm.',
      'Đối soát hoạt động Không tổ chức, hoàn bonus và kết quả từng bước; thử lại không tạo tác động trùng.',
    ],
    action: 'Xem trước chuyển kỳ — chưa khả dụng',
    links: [
      ['/ctsv/student-roster', 'Danh sách sinh viên'],
      ['/ctsv/seasons', 'Cấu hình học kỳ'],
    ],
  },
  leadership: {
    title: 'Kế nhiệm & khôi phục CLB',
    description: 'Theo dõi trường hợp lãnh đạo ngừng học và đề cử chủ nhiệm thay thế.',
    unavailable: 'Đề cử kế nhiệm khẩn cấp chưa khả dụng',
    reason:
      'Chưa có danh sách lãnh đạo bị ảnh hưởng theo học kỳ và danh sách sinh viên đủ điều kiện đề cử. Chuyển chủ nhiệm theo đơn thông thường được xử lý riêng.',
    steps: [
      'Xác định chủ nhiệm ngừng hoạt động và phó chủ nhiệm còn đủ điều kiện.',
      'Theo dõi quyền điều hành tạm thời, thăng nhiệm hoặc tạm dừng CLB khi chuyển kỳ.',
      'CTSV chọn người thay thế từ sinh viên đang học, kể cả người chưa là thành viên CLB.',
      'Người được đề cử chấp nhận trong hồ sơ cá nhân; sau đó mới cấp quyền và khôi phục CLB.',
    ],
    action: 'Đề cử chủ nhiệm — chưa khả dụng',
    links: [
      ['/ctsv/club-requests?type=transfer', 'Đơn chuyển chủ nhiệm'],
      ['/ctsv/student-roster', 'Sinh viên theo học kỳ'],
    ],
  },
  bonuses: {
    title: 'Ngân sách điểm CLB',
    description:
      'Quản lý khoản bonus điểm thô, phân bổ cho hoạt động đã duyệt và lịch sử hoàn trả.',
    unavailable: 'Cấp và đối soát bonus điểm chưa khả dụng',
    reason:
      'Chưa có số dư và giao dịch bonus điểm CLB để thực hiện phân bổ. Ngân sách tài chính là một nghiệp vụ riêng.',
    steps: [
      'CTSV cấp bonus điểm thô theo CLB, học kỳ và lý do.',
      'CLB phân bổ số dư còn lại vào hoạt động đã được phê duyệt.',
      'Theo dõi nguồn cấp, phân bổ, tiêu thụ và hoàn trả; không sử dụng điểm đã quy đổi để trừ ngân sách thô.',
      'Đối soát hoàn trả đúng một lần khi hoạt động không được tổ chức và khi chuyển kỳ.',
    ],
    action: 'Cấp bonus điểm — chưa khả dụng',
    links: [['/ctsv/reports', 'Báo cáo CLB']],
  },
  global: {
    title: 'Hoạt động cấp trường',
    description: 'Tạo và quản lý hoạt động do CTSV tổ chức cho sinh viên toàn trường.',
    unavailable: 'Tạo hoạt động cấp trường chưa khả dụng',
    reason:
      'Chưa thể tạo hoạt động không thuộc một CLB cùng ngân sách điểm riêng. Không dùng nhiệm vụ hoặc chọn một CLB thay thế cho đơn vị nhà trường.',
    steps: [
      'CTSV chuẩn bị nội dung, lịch, điều kiện tham gia, action và ngân sách điểm thô.',
      'Công bố trực tiếp theo quyền CTSV, không thêm một vòng duyệt CLB.',
      'Theo dõi đăng ký, điểm danh, phần việc và báo cáo kết quả.',
      'Đối soát điểm và lịch sử của sinh viên theo chính sách hiệu lực.',
    ],
    action: 'Tạo hoạt động cấp trường — chưa khả dụng',
    links: [['/ctsv/activity-approvals', 'Đề xuất hoạt động từ CLB']],
  },
};

export function PendingOperations({ operation }) {
  const config = operations[operation];
  const { season, state } = useWorkspace();
  const [target, setTarget] = useState('');
  return (
    <>
      <PageHeader title={config.title} description={config.description} />
      <PendingOperation
        title={config.unavailable}
        description={config.reason}
        steps={config.steps}
        action={config.action}
        links={config.links}
      >
        {operation === 'rollover' && (
          <Panel title="Phạm vi chuyển kỳ">
            <div className="pending-operations-content">
              <Field label="Học kỳ đang xem">
                <input readOnly value={season || 'Chưa chọn học kỳ'} />
              </Field>
              <Field label="Học kỳ đích dự kiến">
                <select value={target} onChange={(event) => setTarget(event.target.value)}>
                  <option value="">Chọn học kỳ để chuẩn bị</option>
                  {state.seasons
                    .filter((item) => item.id !== season)
                    .map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.label}
                      </option>
                    ))}
                </select>
              </Field>
              <p className="pending-operations-description">
                Lựa chọn chỉ phục vụ chuẩn bị; chưa có kết quả xem trước hoặc tác vụ chuyển kỳ được
                thực hiện.
              </p>
            </div>
          </Panel>
        )}
      </PendingOperation>
    </>
  );
}
