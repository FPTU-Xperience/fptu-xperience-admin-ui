const status = 'SUBMITTED';
const pageSize = 100;
const batchSize = 4;

async function loadClubSubmissions(applications, clubId, isCurrent) {
  const rows = [];
  let page = 1;
  let totalPages;
  do {
    try {
      const result = await applications.list({ clubId, status, page, pageSize });
      rows.push(...result.items);
      totalPages = result.totalPages;
      page += 1;
    } catch (error) {
      return { rows, error };
    }
  } while (isCurrent() && page <= totalPages);
  return { rows };
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
