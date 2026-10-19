import test from 'node:test';
import assert from 'node:assert/strict';
import {
  canDecideReport,
  reportDecision,
  reportPage,
  reportType,
  safeEvidenceUrl,
} from '../src/utils/report-workflow.js';
import { createReportWorkflows } from '../src/services/report-workflow-client.js';
import { clubRequestBody, clubRequestRows } from '../src/utils/club-request-workflow.js';
import { validateRosterDraft, readRosterDraft } from '../src/utils/roster-preview.js';

const report = { id: 12, status: 'Under Review', version: 4, createdByUserId: 3 };
const staff = { id: 9, roles: ['STUDENT_AFFAIRS_ADMIN'] };

test('only independent CTSV can decide forwarded reports, not admin-only, self, or other states', () => {
  assert.equal(canDecideReport(staff, report), true);
  assert.equal(canDecideReport({ id: 9, roles: ['ADMIN'] }, report), false);
  assert.equal(canDecideReport({ ...staff, id: 3 }, report), false);
  for (const status of ['Draft', 'Submitted', 'Awaiting Finance', 'Approved', 'Rejected'])
    assert.equal(canDecideReport(staff, { ...report, status }), false);
});

test('rejection requires feedback; current API receives feedback, not invented revision or raw-XP fields', () => {
  assert.throws(() => reportDecision(report, 'reject', '  '));
  assert.throws(() => reportDecision(report, 'request-revision', 'Sửa hồ sơ'));
  assert.deepEqual(reportDecision(report, 'reject', ' Sửa nội dung '), {
    feedback: 'Sửa nội dung',
  });
  assert.deepEqual(reportDecision(report, 'approve', ''), { feedback: '' });
  assert.throws(() => reportDecision({ ...report, status: 'Submitted' }, 'approve', ''));
});

test('stale report preflight prevents POST; failed write never becomes a success receipt', async () => {
  let writes = 0;
  const client = { reports: { getById: async () => ({ ...report, version: 5 }) } };
  const workflows = createReportWorkflows(client, async () => {
    writes++;
  });
  await assert.rejects(workflows.decide(report, 'approve', ''), { status: 409 });
  assert.equal(writes, 0);
  client.reports.getById = async () => report;
  const offline = createReportWorkflows(client, async () => {
    throw Object.assign(new Error('Dịch vụ chưa sẵn sàng'), { status: 503 });
  });
  await assert.rejects(offline.decide(report, 'approve', ''), { status: 503 });
});

test('decision uses the inspected endpoint and validates committed identity/status', async () => {
  let sent;
  const client = { reports: { getById: async () => report } };
  const workflows = createReportWorkflows(client, async (...args) => {
    sent = args;
    return { ...report, status: 'Approved', version: 5 };
  });
  assert.equal((await workflows.decide(report, 'approve', ' Đồng ý ')).status, 'Approved');
  assert.deepEqual(sent, ['/api/reports/12/approve', 'POST', { feedback: 'Đồng ý' }]);
  const invalid = createReportWorkflows(client, async () => ({ id: 99, status: 'Approved' }));
  await assert.rejects(invalid.decide(report, 'approve', ''));
});

test('report list preserves API total and server filters when no local type filter is selected', async () => {
  let query;
  const workflows = createReportWorkflows({
    reports: {
      list: async (params) => {
        query = params;
        return { items: [], total: 43 };
      },
    },
  });
  const result = await workflows.list({
    page: 2,
    pageSize: 20,
    period: 'FALL2026',
    status: 'Under Review',
  });
  assert.equal(result.totalPages, 3);
  assert.deepEqual(query, { page: 2, pageSize: 20, period: 'FALL2026', status: 'Under Review' });
});

test('activity report tags with IDs are filtered after traversing all server pages', async () => {
  const calls = [];
  const rows = Array.from({ length: 105 }, (_, index) => ({
    id: index + 1,
    reportType: index >= 95 ? 'CLUB_ACTIVITY' : 'CLUB_TERM_START',
    tag: `CLUB_ACTIVITY:${index}`,
  }));
  const workflows = createReportWorkflows({
    reports: {
      list: async (params) => {
        calls.push(params);
        return {
          items: rows.slice((params.page - 1) * 100, params.page * 100),
          total: rows.length,
        };
      },
    },
  });
  const result = await workflows.list({ type: 'CLUB_ACTIVITY', page: 1, pageSize: 20 });
  assert.equal(result.total, 10);
  assert.equal(result.items.at(-1).id, 105);
  assert.equal(calls.length, 2);
  assert.ok(calls.every((query) => !query.tag && !query.type));
});

test('malformed pages and unsafe evidence URLs are not rendered as valid data/links', () => {
  assert.throws(() => reportPage([]));
  assert.throws(() => reportPage({ items: [], total: '42' }));
  assert.equal(reportType({ tag: 'CLUB_ACTIVITY:52' }), 'CLUB_ACTIVITY');
  for (const value of [
    'javascript:alert(1)',
    'data:text/html,test',
    'file:///tmp/test',
    '/relative',
  ])
    assert.equal(safeEvidenceUrl(value), null);
  assert.equal(safeEvidenceUrl('https://example.test/evidence'), 'https://example.test/evidence');
});

test('club lifecycle requests require a pending source and the actual adminNote DTO', () => {
  assert.deepEqual(clubRequestBody({ status: 'Pending' }, ' Đã kiểm tra '), {
    adminNote: 'Đã kiểm tra',
  });
  assert.throws(() => clubRequestBody({ status: 'Approved' }, 'Đã kiểm tra'));
  assert.throws(() => clubRequestBody({ status: 'Pending' }, ' '));
  assert.throws(() => clubRequestRows({ items: [] }));
  assert.throws(() => clubRequestRows([{ id: 1, clubId: 1 }]));
});

test('roster draft detects normalized duplicate identity and invalid fields without claiming enrollment', () => {
  const rows = validateRosterDraft([
    { studentCode: ' se001 ', fullName: 'Sinh viên kiểm thử', email: 'QA@example.test' },
    { studentCode: 'SE001', fullName: '', email: 'qa@example.test' },
    { studentCode: 'SE002', fullName: 'Sinh viên khác', email: 'bad-email' },
  ]);
  assert.equal(rows[0].studentCode, 'SE001');
  assert.equal(rows[0].errors.length, 0);
  assert.equal(rows[1].errors.length, 3);
  assert.equal(rows[2].errors.length, 1);
  assert.equal(rows[0].row, 2);
  assert.equal('isActive' in rows[0], false);
});

test('roster file reader rejects wrong extension/size before parsing', async () => {
  await assert.rejects(readRosterDraft({ name: 'data.xls', size: 10 }));
  await assert.rejects(readRosterDraft({ name: 'data.xlsx', size: 6 * 1024 * 1024 }));
});

test('future-event type filter includes reports with a custom tag, not just exact FUTURE_EVENT tags', async () => {
  const client = {
    reports: {
      list: async (query) => {
        assert.equal('tag' in query, false);
        return {
          total: 2,
          items: [
            { id: 1, reportType: 'FUTURE_EVENT', tag: 'event-custom' },
            { id: 2, reportType: 'CLUB_ACTIVITY' },
          ],
        };
      },
    },
  };
  const result = await createReportWorkflows(client).list({
    type: 'FUTURE_EVENT',
    page: 1,
    pageSize: 20,
  });
  assert.deepEqual(
    result.items.map((row) => row.id),
    [1],
  );
});

test('changed totals while collecting a filtered inbox require reload instead of mixing snapshots', async () => {
  const workflows = createReportWorkflows({
    reports: {
      list: async ({ page }) => ({
        total: page === 1 ? 101 : 102,
        items: Array.from({ length: page === 1 ? 100 : 2 }, (_, i) => ({
          id: (page - 1) * 100 + i,
          reportType: 'CLUB_ACTIVITY',
        })),
      }),
    },
  });
  await assert.rejects(
    workflows.list({ type: 'CLUB_ACTIVITY', page: 1, pageSize: 20 }),
    /Danh sách đã thay đổi/,
  );
});

test('real roster XLSX preview preserves Vietnamese identity and rejects duplicate headers', async () => {
  const { default: ExcelJS } = await import('exceljs');
  const book = new ExcelJS.Workbook();
  const sheet = book.addWorksheet('DanhSachHocKy');
  sheet.addRows([
    ['studentCode', 'fullName', 'email'],
    ['se001', 'Nguyễn Kiểm Thử', 'QA@example.test'],
  ]);
  const file = async () => {
    const bytes = await book.xlsx.writeBuffer();
    return { name: 'roster.xlsx', size: bytes.length, arrayBuffer: async () => bytes };
  };
  const result = await readRosterDraft(await file());
  assert.equal(result[0].fullName, 'Nguyễn Kiểm Thử');
  assert.equal(result[0].studentCode, 'SE001');
  assert.equal(result[0].email, 'qa@example.test');
  assert.deepEqual(result[0].errors, []);
  sheet.getRow(1).getCell(4).value = 'email';
  await assert.rejects(readRosterDraft(await file()), /Trùng cột email/);
});
