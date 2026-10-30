const step = (element, title, description) => ({
  element,
  popover: { title, description, side: 'bottom', align: 'start' },
});

export function adminGuidePlan(pathname, role) {
  const staff = role === 'STUDENT_AFFAIR';
  const steps = [
    {
      popover: {
        title: staff ? 'Hướng dẫn Công tác sinh viên' : 'Hướng dẫn quản trị',
        description:
          'Khám phá các phần chính của màn hình. Dùng Tiếp theo, Quay lại hoặc Esc để đóng hướng dẫn.',
      },
    },
    step(
      '.topbar-text button[aria-label="Mở điều hướng"]',
      'Mở menu',
      'Nút này mở các mục quản lý trên màn hình nhỏ.',
    ),
    step(
      '#app-sidebar nav',
      'Các mục quản lý',
      'Chọn công việc phù hợp. Các mục hiển thị theo vai trò của tài khoản.',
    ),
    step('.topbar-button', 'Tìm nhanh', 'Tìm một chức năng từ thanh tìm kiếm hoặc dùng Ctrl + K.'),
  ];
  if (staff)
    steps.push(
      step(
        '.context-bar-field',
        'Học kỳ đang xem',
        'Kiểm tra học kỳ trước khi xem hoặc xử lý hồ sơ.',
      ),
    );
  steps.push(
    step(
      '.feature-workspace-tabs',
      'Các phần trong mục',
      'Chuyển tab để xem đúng loại hồ sơ hoặc bước xử lý.',
    ),
  );
  if (pathname.startsWith('/ctsv/work'))
    steps.push(
      step(
        '.work-inbox-filters',
        'Lọc công việc',
        'Tìm hồ sơ, chọn nguồn và loại công việc cần xử lý.',
      ),
      step(
        '.work-inbox table',
        'Mở hồ sơ',
        'Mở từng hồ sơ để kiểm tra chi tiết. Dữ liệu mô phỏng được đánh dấu riêng.',
      ),
    );
  else if (pathname.startsWith('/ctsv/semesters'))
    steps.push(
      step(
        '#main-content .panel-root',
        'Học kỳ và sinh viên',
        'Quản lý mốc học kỳ, danh sách sinh viên và hạn xử lý. Khi nhập danh sách, xem trước các thay đổi rồi mới xác nhận.',
      ),
    );
  else if (pathname.startsWith('/ctsv/declarations'))
    steps.push(
      step(
        '#main-content .panel-root',
        'Xét duyệt trải nghiệm',
        'Đọc thông tin, kiểm tra minh chứng và nhập nhận xét trước khi đưa ra quyết định.',
      ),
    );
  else if (pathname.startsWith('/ctsv/policies'))
    steps.push(
      step(
        '#main-content .panel-root',
        'Chính sách Xperience Point',
        'Kiểm tra học kỳ và phiên bản. Khóa benchmark và phê duyệt chính sách là hai thao tác riêng.',
      ),
    );
  else if (pathname.startsWith('/admin/accounts'))
    steps.push(
      step(
        '#main-content .panel-root',
        'Quản lý tài khoản',
        'Tìm tài khoản và kiểm tra vai trò, trạng thái trước khi cập nhật. Tài khoản mô phỏng không có quyền đăng nhập thật.',
      ),
    );
  else
    steps.push(
      step(
        '#main-content h1',
        'Mục đang mở',
        'Kiểm tra thông tin và các trạng thái của hồ sơ. Các thay đổi cần xác nhận được thực hiện trong màn chi tiết.',
      ),
    );
  return steps;
}
