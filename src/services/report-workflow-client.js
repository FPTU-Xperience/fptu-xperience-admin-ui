import { reportDecision, reportPage, reportType } from '../utils/report-workflow.js';

export function createReportWorkflows(client, write) {
  return {
    async list(params) {
      const { type, ...query } = params;
      if (!type) return reportPage(await client.reports.list(query), params.pageSize);
      // The current API only filters an exact tag. CLUB_ACTIVITY tags contain an activity ID.
      // Traverse server pages before filtering so counts/paging do not hide matching reports.
      let items = [],
        page = 1,
        total;
      do {
        const response = reportPage(
          await client.reports.list({ ...query, page, pageSize: 100 }),
          100,
        );
        if (total !== undefined && total !== response.total)
          throw new Error('Danh sách đã thay đổi. Vui lòng tải lại.');
        total = response.total;
        items.push(...response.items);
        if (!response.items.length && items.length < total)
          throw new Error('Danh sách đã thay đổi. Vui lòng tải lại.');
        page++;
      } while ((page - 1) * 100 < total);
      if (new Set(items.map((row) => row.id)).size !== items.length)
        throw new Error('Danh sách đã thay đổi. Vui lòng tải lại.');
      items = items.filter((row) => reportType(row) === type);
      return reportPage(
        {
          items: items.slice((params.page - 1) * params.pageSize, params.page * params.pageSize),
          total: items.length,
        },
        params.pageSize,
      );
    },
    async get(id) {
      const row = await client.reports.getById(id);
      if (String(row?.id) !== String(id) || !row.status)
        throw new Error('Không đọc được chi tiết báo cáo. Vui lòng tải lại.');
      return row;
    },
    async decide(snapshot, decision, feedback) {
      const body = reportDecision(snapshot, decision, feedback);
      // The current BE review DTO has no expectedVersion. Re-read to catch known stale views;
      // this does not replace atomic server concurrency, tracked in the review contract.
      const current = await client.reports.getById(snapshot.id);
      if (current.version !== snapshot.version || current.status !== snapshot.status)
        throw Object.assign(new Error('Báo cáo đã thay đổi. Tải lại trước khi quyết định.'), {
          status: 409,
        });
      const result = await write(`/api/reports/${snapshot.id}/${decision}`, 'POST', body);
      if (
        String(result?.id) !== String(snapshot.id) ||
        result.status !== (decision === 'approve' ? 'Approved' : 'Rejected')
      )
        throw new Error(
          'Chưa xác nhận được kết quả quyết định. Tải lại báo cáo trước khi thử tiếp.',
        );
      return result;
    },
    download: (report) => client.reports.file.download(report.id),
    attachment: (reportId, row) => client.reports.attachments.download(reportId, row.id),
  };
}
