import assert from 'node:assert/strict';
import fs from 'node:fs/promises';

export async function checkAccountTable({ open, evaluate, delay, call, directory }) {
  await open('/admin/audit', 'admin');
  await evaluate(
    `data['users.list']={items:['Trang','Đức','Bình','An','Chi','Giang','Hà','Lan','Mai','Nam'].map((fullName,i)=>({id:100+i,username:'SE'+i,fullName,email:'student'+i+'@example.test',roles:[['SYSTEM_ADMIN','STUDENT','STUDENT_AFFAIR'][i%3]],isActive:i!==8,isLocked:i%2===1,createdAt:i===9?null:'2026-10-'+String(10-i).padStart(2,'0')+'T00:00:00Z'})),totalItems:10};location.hash='/admin/accounts'`,
  );
  await delay(350);
  const click = async (selector) => {
    await evaluate(`document.querySelector(${JSON.stringify(selector)}).click()`);
    await delay(100);
  };
  const rowNames = () =>
    evaluate(
      `[...document.querySelectorAll('.accounts-table tbody .accounts-value')].map(e=>e.textContent.trim())`,
    );
  const sort = async (column, direction) => {
    await click(`.accounts-table th:nth-child(${column}) button`);
    assert.equal(
      await evaluate(
        `document.querySelector('.accounts-table th:nth-child(${column})').getAttribute('aria-sort')`,
      ),
      direction,
    );
  };
  const allNames = async () => {
    const first = await rowNames();
    await click('button[aria-label="Trang sau"]');
    const second = await rowNames();
    await click('button[aria-label="Trang trước"]');
    return [...first, ...second];
  };
  assert.equal(
    await evaluate(`document.querySelectorAll('.accounts-status-filters button').length`),
    4,
  );
  assert.equal(
    await evaluate(`!!document.querySelector('select[aria-label="Lọc trạng thái tài khoản"]')`),
    false,
  );
  await sort(1, 'ascending');
  const alphabetical = ['An', 'Bình', 'Chi', 'Đức', 'Giang', 'Hà', 'Lan', 'Mai', 'Nam', 'Trang'];
  assert.deepEqual(await allNames(), alphabetical);
  await click('button[aria-label="Trang sau"]');
  await sort(1, 'descending');
  assert.deepEqual(await allNames(), [...alphabetical].reverse());
  assert.equal(
    await evaluate(`document.querySelectorAll('.accounts-table input:checked').length`),
    0,
  );
  await sort(2, 'ascending');
  assert.equal(
    await evaluate(
      `document.querySelector('.accounts-table tbody tr td:nth-child(2)').textContent.trim()`,
    ),
    'Công tác sinh viên',
  );
  await sort(2, 'descending');
  assert.equal(
    await evaluate(
      `document.querySelector('.accounts-table tbody tr td:nth-child(2)').textContent.trim()`,
    ),
    'Sinh viên',
  );
  await sort(3, 'ascending');
  assert.equal(
    await evaluate(
      `document.querySelector('.accounts-table tbody tr td:nth-child(3)').textContent.trim()`,
    ),
    'Đã khóa',
  );
  await sort(3, 'descending');
  assert.equal(
    await evaluate(
      `document.querySelector('.accounts-table tbody tr td:nth-child(3)').textContent.trim()`,
    ),
    'Ngừng hoạt động',
  );
  await sort(4, 'ascending');
  assert.deepEqual(await allNames(), [
    'Mai',
    'Lan',
    'Hà',
    'Giang',
    'Chi',
    'An',
    'Bình',
    'Đức',
    'Trang',
    'Nam',
  ]);
  await sort(4, 'descending');
  assert.deepEqual(await allNames(), [
    'Trang',
    'Đức',
    'Bình',
    'An',
    'Chi',
    'Giang',
    'Hà',
    'Lan',
    'Mai',
    'Nam',
  ]);
  await click('.accounts-status-filters button:nth-child(2)');
  assert.equal(
    await evaluate(
      `document.querySelector('.accounts-status-filters button:nth-child(2)').getAttribute('aria-pressed')`,
    ),
    'true',
  );
  assert.equal((await rowNames()).length, 4);
  assert.ok(
    await evaluate(
      `[...document.querySelectorAll('.accounts-table tbody tr td:nth-child(3)')].every(e=>e.textContent.trim()==='Hoạt động')`,
    ),
  );
  await click('.accounts-status-filters button:nth-child(3)');
  assert.equal((await rowNames()).length, 5);
  assert.ok(
    await evaluate(
      `[...document.querySelectorAll('.accounts-table tbody tr td:nth-child(3)')].every(e=>e.textContent.trim()==='Đã khóa')`,
    ),
  );
  await click('.accounts-status-filters button:nth-child(1)');
  await click('.accounts-status-filters button:nth-child(4)');
  assert.deepEqual(await rowNames(), ['Mai']);
  await click('.accounts-status-filters button:nth-child(1)');
  assert.equal(await evaluate(`document.querySelectorAll('.feature-workspace-tabs a').length`), 1);
  assert.equal(await evaluate(`!!document.querySelector('a[href*="view=verification"]')`), false);
  assert.equal(
    await evaluate(`!!document.querySelector('#app-sidebar a[href^="#/ctsv/"]')`),
    false,
  );
  assert.equal(
    await evaluate(`!!document.querySelector('.accounts-table input[type="checkbox"]')`),
    false,
  );
  assert.equal(
    await evaluate(
      `!![...document.querySelectorAll('main button')].find(e=>/Nhập|Xóa|Sửa|Khóa|Mở khóa/.test(e.getAttribute('aria-label') || ''))`,
    ),
    false,
  );
  await click('button[aria-label="Thông tin vai trò"]');
  assert.ok(
    await evaluate(
      `document.querySelector('dialog[open]')?.textContent.includes('Phạm vi của từng role')`,
    ),
  );
  assert.ok(
    await evaluate(
      `!document.querySelector('dialog[open]')?.textContent.includes('Phân công xác minh')`,
    ),
  );
  assert.deepEqual(
    await evaluate(
      `[...document.querySelectorAll('dialog thead th')].slice(1).map(e=>e.childNodes[0].textContent)`,
    ),
    ['SYSTEM_ADMIN', 'STUDENT_AFFAIR', 'STUDENT'],
  );
  for (const width of [375, 1280]) {
    await call('Emulation.setDeviceMetricsOverride', {
      width,
      height: 1000,
      deviceScaleFactor: 1,
      mobile: false,
    });
    await delay(100);
    assert.ok(await evaluate(`document.documentElement.scrollWidth <= innerWidth`));
    const shot = await call('Page.captureScreenshot', {
      format: 'png',
      captureBeyondViewport: false,
    });
    await fs.writeFile(`${directory}/roles-info-${width}.png`, Buffer.from(shot.data, 'base64'));
  }
  await call('Input.dispatchKeyEvent', {
    type: 'keyDown',
    key: 'Escape',
    code: 'Escape',
    windowsVirtualKeyCode: 27,
  });
  await delay(100);
  for (const width of [320, 375, 768, 1280]) {
    await call('Emulation.setDeviceMetricsOverride', {
      width,
      height: 1000,
      deviceScaleFactor: 1,
      mobile: false,
    });
    await delay(100);
    assert.ok(
      await evaluate('document.documentElement.scrollWidth <= innerWidth'),
      `accounts ${width} overflow`,
    );
    assert.ok(
      await evaluate(
        `[...document.querySelectorAll('.accounts-status-chip')].every(e=>e.getBoundingClientRect().right<=innerWidth)`,
      ),
    );
    if ([375, 1280].includes(width)) {
      const shot = await call('Page.captureScreenshot', {
        format: 'png',
        captureBeyondViewport: false,
      });
      await fs.writeFile(
        `${directory}/accounts-chips-sort-${width}.png`,
        Buffer.from(shot.data, 'base64'),
      );
    }
  }
  assert.deepEqual(
    await evaluate(
      `window.__calls.filter(c=>/^users\.(create|update|delete|lock|unlock)$/.test(c.key))`,
    ),
    [],
  );
  await evaluate(
    `data['users.create']={id:999,username:'ctsv-new',fullName:'CTSV mới',email:'ctsv-new@example.test',roles:['STUDENT_AFFAIR'],isActive:true,isLocked:false};window.__failAccountCreate=true;[...document.querySelectorAll('main button')].find(e=>e.textContent.includes('Tạo tài khoản CTSV')).click()`,
  );
  await delay(100);
  assert.equal(await evaluate(`document.querySelectorAll('dialog select').length`), 1);
  await evaluate(
    `(()=>{const select=document.querySelector('dialog select');Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype,'value').set.call(select,'api');select.dispatchEvent(new Event('change',{bubbles:true}));})()`,
  );
  await delay(100);
  for (const [index, value] of [
    [0, 'CTSV mới'],
    [1, 'ctsv-new'],
    [2, 'ctsv-new@example.test'],
  ]) {
    await evaluate(
      `(()=>{const e=document.querySelectorAll('dialog input')[${index}];Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(e,${JSON.stringify(value)});e.dispatchEvent(new Event('input',{bubbles:true}));})()`,
    );
    await delay(50);
  }
  await evaluate(`document.querySelector('dialog form').requestSubmit()`);
  await delay(150);
  assert.ok(
    await evaluate(
      `document.querySelector('dialog [role="alert"]')?.textContent.includes('Lỗi API kiểm thử')`,
    ),
  );
  assert.deepEqual(
    await evaluate(`window.__calls.filter(c=>c.key==='users.create').at(-1).args[0].roles`),
    ['STUDENT_AFFAIR'],
  );
  await evaluate(
    `window.__failAccountCreate=false;document.querySelector('dialog form').requestSubmit()`,
  );
  await delay(150);
  assert.equal(await evaluate(`!!document.querySelector('dialog[open]')`), false);
  assert.equal(
    await evaluate(
      `window.__calls.filter(c=>/^users[.](update|delete|lock|unlock)$/.test(c.key)).length`,
    ),
    0,
  );
  const beforeMock = await evaluate(`window.__calls.filter(c=>c.key==='users.create').length`);
  await evaluate(
    `[...document.querySelectorAll('main button')].find(e=>e.textContent.includes('Tạo tài khoản CTSV')).click()`,
  );
  await delay(100);
  assert.equal(await evaluate(`document.querySelector('dialog select').value`), 'mock');
  for (const [index, value] of [
    [0, 'CTSV thử mock'],
    [1, 'mock-ctsv'],
    [2, 'mock-ctsv@example.test'],
  ]) {
    await evaluate(
      `(()=>{const e=document.querySelectorAll('dialog input')[${index}];Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(e,${JSON.stringify(value)});e.dispatchEvent(new Event('input',{bubbles:true}));})()`,
    );
    await delay(50);
  }
  await evaluate(`document.querySelector('dialog form').requestSubmit()`);
  await delay(150);
  assert.equal(
    await evaluate(`window.__calls.filter(c=>c.key==='users.create').length`),
    beforeMock,
  );
  assert.ok(await evaluate(`document.querySelector('main').textContent.includes('Mock JS')`));
  await evaluate(
    `[...document.querySelectorAll('main button')].find(e=>e.textContent.trim()==='Tải lại').click()`,
  );
  await delay(150);
  assert.equal(
    await evaluate(`document.querySelector('main').textContent.includes('CTSV thử mock')`),
    false,
  );
  console.log(
    'PASS account status chips, all sortable columns in both directions, pagination, read-only access, missing dates and responsive layout',
  );
}
