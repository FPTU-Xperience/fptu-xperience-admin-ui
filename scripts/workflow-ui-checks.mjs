import assert from 'node:assert/strict';
import fs from 'node:fs/promises';

// Runs against the browser-only fixture installed by ui-smoke.mjs.
export async function checkWorkflows({ open, evaluate, delay, call, directory }) {
  const text = () =>
    evaluate('document.querySelector("main")?.textContent || document.body.textContent');
  const click = async (label) => {
    await evaluate(
      `(()=>{const e=[...document.querySelectorAll('main button, dialog button')].find(e=>e.textContent.trim().includes(${JSON.stringify(label)}));if(!e||e.disabled)throw Error('Unavailable button: '+${JSON.stringify(label)});e.click();})()`,
    );
    await delay(150);
  };
  const fill = async (label, value) => {
    await evaluate(
      `(()=>{const e=[...document.querySelectorAll('main label, dialog label')].find(e=>e.querySelector('.field-label')?.textContent.includes(${JSON.stringify(label)}))?.querySelector('input,textarea,select');if(!e)throw Error('Missing field: '+${JSON.stringify(label)});const proto=e.tagName==='TEXTAREA'?HTMLTextAreaElement.prototype:e.tagName==='SELECT'?HTMLSelectElement.prototype:HTMLInputElement.prototype;Object.getOwnPropertyDescriptor(proto,'value').set.call(e,${JSON.stringify(String(value))});e.dispatchEvent(new Event(e.tagName==='SELECT'?'change':'input',{bubbles:true}));})()`,
    );
    await delay(75);
  };
  const go = async (route) => {
    await evaluate(`location.hash=${JSON.stringify(route)}`);
    await delay(300);
  };
  const expect = async (value) =>
    assert.ok((await text()).includes(value), value + ' missing from ' + (await text()));
  const screenshot = async (name) => {
    const shot = await call('Page.captureScreenshot', {
      format: 'png',
      captureBeyondViewport: false,
    });
    await fs.writeFile(`${directory}/${name}.png`, Buffer.from(shot.data, 'base64'));
  };
  const responsive = async (name) => {
    for (const width of [320, 375, 768, 1280]) {
      await call('Emulation.setDeviceMetricsOverride', {
        width,
        height: 1000,
        deviceScaleFactor: 1,
        mobile: false,
      });
      await delay(100);
      if (name === 'xp-report-changes')
        await evaluate(
          `document.querySelector('table[aria-label="Lịch sử thay đổi Xperience Point"]').closest('.panel-root').scrollIntoView({block:'start'})`,
        );
      assert.ok(
        await evaluate('document.documentElement.scrollWidth <= innerWidth'),
        `${name} ${width} overflow`,
      );
      if (width === 375) await screenshot(`${name}-375`);
    }
  };
  const noApiWrites = async () =>
    assert.deepEqual(
      await evaluate(
        `window.__calls.filter(c=>/create|update|approve|reject|workflowRequest|resolve|remove|delete/i.test(c.key))`,
      ),
      [],
    );

  await open('/ctsv/clubs', 'staff', 1280);
  await evaluate(`document.querySelector('a.clubs-card').click()`);
  await delay(300);
  assert.equal(await evaluate('location.hash'), '#/ctsv/clubs/1');
  assert.equal(await evaluate('!!document.querySelector("dialog[open]")'), false);
  assert.equal(await evaluate('document.querySelectorAll(".feature-workspace-tabs a").length'), 7);
  await expect('Câu lạc bộ Công nghệ FPT');
  await screenshot('club-detail-overview-1280');
  await click('Chỉnh sửa thông tin');
  assert.ok(await evaluate(`!!document.querySelector('dialog input[aria-readonly="true"]')`));
  await click('Hủy');
  await go('/ctsv/clubs/1?view=members');
  await expect('Sinh viên kiểm thử');
  assert.equal(
    await evaluate(`window.__calls.filter(c=>c.key==='clubs.members.list').at(-1).args[0]`),
    '1',
  );
  await go('/ctsv/clubs/1?view=reports&clubId=2');
  assert.equal(
    await evaluate(`window.__calls.filter(c=>c.key==='reports.list').at(-1).args[0].clubId`),
    '1',
  );
  assert.equal(
    await evaluate(`document.querySelector('.club-reports-content-2 select').disabled`),
    true,
  );
  await evaluate(
    `data['reports.list']={items:[{id:91,clubId:1,clubName:'CLB 1',period:'FALL2026',status:'Under Review',reportType:'CLUB_TERM_START',version:1,createdByUserId:2}],total:1};data['reports.getById']=data['reports.list'].items[0]`,
  );
  await evaluate(
    `[...document.querySelectorAll('main button')].find(e=>e.textContent.trim()==='Tải lại').click()`,
  );
  await delay(250);
  await evaluate(`document.querySelector('a[href="#/ctsv/reports/91"]').click()`);
  await delay(200);
  assert.equal(await evaluate('location.hash'), '#/ctsv/reports/91');
  await evaluate(`document.querySelector('a.club-report-detail-link').click()`);
  await delay(250);
  assert.equal(await evaluate('location.hash'), '#/ctsv/clubs/1?view=reports&clubId=2');
  await evaluate(
    `data['clubs.disbandRequests.list']=[{id:61,clubId:1,clubName:'Yêu cầu CLB đang xem',status:'PENDING'},{id:62,clubId:2,clubName:'Yêu cầu CLB khác',status:'PENDING'}]`,
  );
  await go('/ctsv/clubs/1?view=requests&clubId=2');
  await expect('Yêu cầu CLB đang xem');
  assert.ok(!(await text()).includes('Yêu cầu CLB khác'));
  await go('/ctsv/clubs/1?view=activities&source=mock');
  await click('Khởi tạo mô phỏng CLB này');
  await expect('Chưa có hoạt động');
  await click('Mô phỏng CLB nộp kế hoạch');
  await fill('Tên hoạt động', 'Hoạt động riêng CLB 1');
  assert.equal(await evaluate(`document.querySelector('dialog select').disabled`), true);
  await evaluate(`document.querySelector('dialog form').requestSubmit()`);
  await delay(200);
  await expect('Hoạt động riêng CLB 1');
  await click('Mở hồ sơ');
  await fill('Tên action bổ sung', 'Hỗ trợ tổ chức');
  await fill('Điểm thô / lượt action bổ sung', '3');
  await fill('Lượt dự kiến action bổ sung', '2');
  await click('Thêm action vào kế hoạch');
  await fill('Nhận xét / lý do', 'Đủ điều kiện duyệt kế hoạch');
  await click('Duyệt kế hoạch · lần 1');
  await expect('Đã ghi sổ mô phỏng: 0');
  await click('Mô phỏng CLB công bố hoạt động');
  await fill('Minh chứng mô phỏng', 'Biên bản hoàn thành mẫu');
  await fill('Số lượt hoàn thành', '2');
  await click('Ghi nhận điểm chờ');
  await expect('Đã ghi sổ mô phỏng: 0');
  const secondAction = await evaluate(
    `document.querySelectorAll('select')[0] && [...document.querySelectorAll('label')].find(e=>e.textContent.includes('Action đã hoàn thành')).querySelector('select').options[1].value`,
  );
  await fill('Action đã hoàn thành', secondAction);
  await fill('Sinh viên trong roster', 'MOCK-SE002');
  await fill('Số lượt hoàn thành', '1');
  await fill('Minh chứng mô phỏng', 'Biên bản hỗ trợ tổ chức');
  await click('Ghi nhận điểm chờ');
  await fill('Nhận xét / lý do', 'Hoàn thành đủ minh chứng');
  await click('Tự điền Xperience Point từ minh chứng');
  await expect('Tổng đề xuất: 13');
  await click('Sửa dòng Xperience Point');
  await fill('Số lượt tính Xperience Point', '1');
  await fill('Lý do chỉnh sửa Xperience Point', 'Chỉ xác minh được một lượt tham gia');
  await screenshot('xp-report-edit-1280');
  await click('Lưu thay đổi Xperience Point');
  await click('Đóng');
  await expect('Tổng đề xuất: 8');
  await click('Tự điền Xperience Point từ minh chứng');
  await expect('Tổng đề xuất: 8');
  await click('Tổng hợp sinh viên');
  await expect('MOCK-SE002');
  await click('Tổng hợp action');
  await expect('Hỗ trợ tổ chức');
  await click('Danh sách thay đổi Xperience Point');
  await expect('Chỉ xác minh được một lượt tham gia');
  await fill('Lọc sinh viên Xperience Point', 'MOCK-SE001');
  await expect('Đang xem 1 dòng · 5 điểm thô đề xuất');
  await evaluate(
    `document.querySelector('table[aria-label="Lịch sử thay đổi Xperience Point"]').closest('.panel-root').scrollIntoView({block:'start'})`,
  );
  await screenshot('xp-report-changes-1280');
  await responsive('xp-report-changes');
  await fill('Lọc sinh viên Xperience Point', '');
  await click('Lập báo cáo kết thúc');
  await expect('Snapshot báo cáo v');
  assert.equal(
    await evaluate(
      `[...document.querySelectorAll('main button')].some(e=>e.textContent.includes('Tự điền Xperience Point'))`,
    ),
    false,
  );
  await click('Duyệt quyết toán · ghi sổ mô phỏng');
  await expect('Đã ghi sổ mô phỏng: 8');
  await screenshot('club-detail-activity-completed-1280');
  await responsive('club-detail-activity-completed');
  await go('/ctsv/clubs/1?view=bonus');
  await fill('Lý do cấp', 'Cấp điểm thô cho CLB thử nghiệm');
  await click('CTSV cấp bonus');
  await expect('Câu lạc bộ Công nghệ FPT · mô phỏng');
  await screenshot('club-detail-bonus-1280');
  await responsive('club-detail-bonus');
  await go('/ctsv/clubs/2?view=activities&source=mock');
  await click('Khởi tạo mô phỏng CLB này');
  assert.ok(!(await text()).includes('Hoạt động riêng CLB 1'));
  await go('/ctsv/clubs/1?view=activities&source=mock');
  await expect('Hoạt động riêng CLB 1');
  await noApiWrites();
  await open('/ctsv/clubs/1?view=bonus', 'staff', 375);
  await expect('Khởi tạo mô phỏng CLB này');
  await open('/ctsv/clubs/1', 'staff', 375, 'club');
  await expect('Lỗi API kiểm thử');
  assert.ok(!(await text()).includes('Khởi tạo mô phỏng'));
  console.log(
    'PASS club card navigation, scoped API queries, seven tabs, isolated club mocks and two approval gates',
  );

  await open('/ctsv/clubs?view=leadership', 'staff', 375);
  await fill('Lý do đề cử', 'Đề cử người kế nhiệm đủ điều kiện');
  await click('Gửi đề cử mô phỏng');
  await expect('Chờ ứng viên phản hồi');
  await click('Mô phỏng ứng viên chấp nhận');
  await expect('Đã chấp nhận');
  await noApiWrites();
  await go('/ctsv/semesters?view=rollover');
  await evaluate(`document.querySelector('.rollover-workflow input[type="checkbox"]').click()`);
  await delay(100);
  await click('Xem trước tác động');
  await fill('Lý do xác nhận', 'Xác nhận chuyển kỳ mô phỏng');
  await click('Xác nhận chạy mô phỏng');
  await delay(2400);
  await expect('Có bước lỗi');
  await click('Thử lại từ bước lỗi');
  await delay(2400);
  await expect('Hoàn tất mô phỏng');
  await screenshot('rollover-completed-375');
  await noApiWrites();
  await open('/ctsv/activities?view=club&source=api', 'staff', 375, 'reports');
  await expect('Lỗi API kiểm thử');
  assert.ok(!(await text()).includes('Workshop kỹ năng số'));
  await open('/ctsv/clubs/1?view=bonus', 'admin', 375);
  assert.equal(await evaluate('location.hash'), '#/admin/accounts');
  assert.equal(await evaluate(`!!document.querySelector('.mock-boundary')`), false);
  console.log(
    'PASS consent, rollover failure/retry, no mock API writes, reload reset and admin/CTSV route separation',
  );
}
