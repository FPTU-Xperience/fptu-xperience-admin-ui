const status = 'SUBMITTED';
const pageSize = 100;
const batchSize = 4;

async function readClubSubmissions(applications, clubId, isCurrent) {
  const rows = [];
  const seenIds = new Set();
  let page = 1;
  let totalItems;
  let totalPages;
  do {
    try {
      const result = await applications.list({ clubId, status, page, pageSize });
      totalItems ??= result.totalItems;
      totalPages = Math.ceil(totalItems / pageSize);
      const pageIds = new Set(result.items.map(({ id }) => id));
      if (
        result.totalItems !== totalItems ||
        result.totalPages !== totalPages ||
        rows.length + result.items.length !== Math.min(page * pageSize, totalItems) ||
        pageIds.size !== result.items.length ||
        [...pageIds].some((id) => seenIds.has(id))
      ) {
        return { rows, changed: true };
      }
      rows.push(...result.items);
      for (const id of pageIds) seenIds.add(id);
      page += 1;
    } catch (error) {
      return { rows, error };
    }
  } while (isCurrent() && page <= totalPages);
  return { rows };
}

async function loadClubSubmissions(applications, clubId, isCurrent) {
  let result = await readClubSubmissions(applications, clubId, isCurrent);
  if (!result.changed || !isCurrent()) return result;

  result = await readClubSubmissions(applications, clubId, isCurrent);
  if (!result.changed) return result;
  return {
    rows: result.rows,
    error: new Error('Danh sách thay đổi trong lúc tải. Vui lòng tải lại hồ sơ.'),
  };
}

export async function loadSubmittedApplications(applications, clubs, isCurrent) {
  const rows = new Map();
  const failedClubs = [];

  for (let offset = 0; offset < clubs.length && isCurrent(); offset += batchSize) {
    const batch = clubs.slice(offset, offset + batchSize);
    const results = await Promise.all(
      batch.map((club) => loadClubSubmissions(applications, club.id, isCurrent)),
    );
    results.forEach(({ rows: submissions, error }, index) => {
      if (error) failedClubs.push({ name: batch[index].name, error });
      for (const row of submissions) rows.set(row.id, row);
    });
  }

  const items = [...rows.values()].sort(
    (a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt) || b.id - a.id,
  );
  return { items, failedClubs };
}
