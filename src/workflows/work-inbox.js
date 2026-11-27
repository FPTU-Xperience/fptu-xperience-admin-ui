import { reportTitle, reportType } from '../utils/report-workflow.js';

const rowsOf = (value) => {
  if (Array.isArray(value)) return value;
  if (Array.isArray(value?.items)) return value.items;
  throw new Error('Danh sách trả về không hợp lệ.');
};
const statusOf = (row) => String(row.status || '').toLowerCase();
const bucketOf = (status) =>
  ['approved', 'rejected', 'completed', 'accepted'].includes(status)
    ? 'completed'
    : [
          'revisionrequested',
          'need_clarification',
          'submitted',
          'awaiting finance',
          'revision',
        ].includes(status)
      ? 'waiting'
      : 'actionable';
export async function loadWorkInbox(client, reports, { bucket, semester }) {
  const reportStatus =
    bucket === 'completed' ? 'Approved' : bucket === 'waiting' ? 'Rejected' : 'Under Review';
  const sources = [
    {
      id: 'reports',
      label: 'Báo cáo CLB / hoạt động',
      path: '/ctsv/activities?view=club&source=api',
      period: true,
      load: () => reports.list({ page: 1, pageSize: 20, status: reportStatus, period: semester }),
      map: (row) => ({
        id: `api-report-${row.id}`,
        recordId: row.id,
        title: reportTitle(row),
        kind: reportType(row),
        status: row.status,
        path: `/ctsv/reports/${row.id}`,
        owner: row.clubName || 'CLB',
        deadline: row.dueDate || '',
        updated: row.updatedAtUtc,
        source: 'API',
        bucket: bucket === 'waiting' ? 'waiting' : bucketOf(statusOf(row)),
      }),
    },
    {
      id: 'declarations',
      label: 'Trải nghiệm tự khai',
      path: '/ctsv/declarations',
      load: () =>
        client.studentAffairs.declarations.list({
          page: 1,
          pageSize: 20,
          status:
            bucket === 'completed'
              ? 'Approved'
              : bucket === 'waiting'
                ? 'RevisionRequested'
                : 'Submitted',
        }),
      map: (row) => ({
        id: `api-declaration-${row.id}`,
        title: row.title || row.activityName || `Trải nghiệm tự khai #${row.id}`,
        status: row.status,
        path: '/ctsv/declarations',
        owner: row.studentName || row.fullName || 'Sinh viên',
        deadline: row.dueDate || '',
        source: 'API',
        bucket: statusOf(row) === 'submitted' ? 'actionable' : bucketOf(statusOf(row)),
      }),
    },
    {
      id: 'applications',
      label: 'Hồ sơ thành lập CLB',
      path: '/ctsv/clubs?view=registry&tab=applications',
      load: () => client.clubs.applications.list({ page: 1, pageSize: 20 }),
      map: (row) => ({
        id: `api-application-${row.id}`,
        title: row.clubName || row.name || `Hồ sơ CLB #${row.id}`,
        status: row.status,
        path: '/ctsv/clubs?view=registry&tab=applications',
        owner: row.applicantName || 'Người nộp',
        source: 'API',
        bucket: bucketOf(statusOf(row)),
      }),
    },
    ...['disband', 'transfer'].map((kind) => ({
      id: kind,
      label: kind === 'transfer' ? 'Chuyển chủ nhiệm' : 'Giải thể CLB',
      path: `/ctsv/clubs?view=requests&type=${kind}`,
      load: () => client.clubs[kind === 'transfer' ? 'transferRequests' : 'disbandRequests'].list(),
      map: (row) => ({
        id: `api-${kind}-${row.id}`,
        title: `${kind === 'transfer' ? 'Chuyển chủ nhiệm' : 'Giải thể'} · ${row.clubName || row.clubId}`,
        status: row.status,
        path: `/ctsv/clubs?view=requests&type=${kind}`,
        owner: row.requesterName || 'CLB',
        source: 'API',
        bucket: bucketOf(statusOf(row)),
      }),
    })),
  ];
  const results = await Promise.allSettled(
    sources.map(async (source) => {
      const result = await source.load(),
        rows = rowsOf(result);
      return {
        id: source.id,
        label: source.label,
        path: source.path,
        period: !!source.period,
        total: result?.total ?? result?.totalItems ?? rows.length,
        limited:
          rows.length >= 20 || Number(result?.total || result?.totalItems || 0) > rows.length,
        rows: rows.map(source.map).filter((row) => row.bucket === bucket),
      };
    }),
  );
  return results.map((result, index) =>
    result.status === 'fulfilled'
      ? result.value
      : {
          id: sources[index].id,
          label: sources[index].label,
          path: sources[index].path,
          error: result.reason.message,
          rows: [],
        },
  );
}
