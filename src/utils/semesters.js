export function mapSemesterOptions(payload) {
  const rows = Array.isArray(payload) ? payload : payload?.items || [];
  const seen = new Set();
  return rows.flatMap((row) => {
    const id = String(row.semesterCode || row.code || row.id || '').trim();
    if (!id || seen.has(id)) return [];
    seen.add(id);
    return [{ ...row, id, label: row.label || row.name || id }];
  });
}

export function selectAvailableSemester(options, selected, active) {
  return (
    [selected, active, options[0]?.id].find((id) => options.some((item) => item.id === id)) || ''
  );
}
