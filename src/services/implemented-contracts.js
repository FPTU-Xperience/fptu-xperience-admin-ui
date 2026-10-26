export function createImplementedContracts(api) {
  const page = (value) => {
    if (
      !Array.isArray(value?.items) ||
      !Number.isInteger(value.page) ||
      !Number.isInteger(value.totalItems) ||
      !Number.isInteger(value.totalPages)
    )
      throw new Error('Máy chủ chưa trả danh sách có phân trang hợp lệ.');
    return value;
  };
  const semester = (identifier) => `/api/v1/semesters/${encodeURIComponent(identifier)}`;
  const mutation = (path, body, params, key = crypto.randomUUID()) =>
    api.request(path, {
      method: 'POST',
      body,
      params,
      headers: { 'Idempotency-Key': key },
    });
  return {
    roster: {
      get: async (id, params) => {
        const value = page(await api.get(`${semester(id)}/student-roster`, params));
        if (typeof value.version !== 'string') throw new Error('Máy chủ chưa trả version roster.');
        return value;
      },
      preview: (id, file, version, campusCode) => {
        if (!/\.csv$/i.test(file.name) || file.size > 5 * 1024 * 1024)
          throw new Error('Chọn CSV UTF-8 tối đa 5 MB.');
        const body = new FormData();
        body.set('file', file);
        body.set('mode', 'replace');
        body.set('expectedRosterVersion', version);
        return api.upload(`${semester(id)}/roster-imports/preview`, body, { campusCode });
      },
      commit: (id, preview, campusCode, key) =>
        mutation(
          `${semester(id)}/roster-imports/${encodeURIComponent(preview.importId)}/commit`,
          { expectedRosterVersion: preview.baseVersion },
          { campusCode },
          key,
        ),
    },
    applications: {
      list: async (params) => page(await api.get('/api/activity-applications', params)),
      get: (id) => api.get(`/api/activity-applications/${encodeURIComponent(id)}`),
      history: (id) => api.get(`/api/activity-applications/${encodeURIComponent(id)}/history`),
      review: (application, decision, reason, key) =>
        mutation(
          `/api/activity-applications/${application.id}/review`,
          { expectedVersion: application.version, decision, reason: reason.trim() || null },
          undefined,
          key,
        ),
    },
  };
}
