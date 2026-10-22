// Report drafts are derived only from recorded evidence in the isolated JS workflow.
export const xpRows = (activity) => activity.xpReport?.rows || [];
export const xpTotal = (rows) => rows.reduce((sum, row) => sum + row.rawPoints, 0);
export function xpSourceKey(activity) {
  return JSON.stringify([activity.actions, activity.awards]);
}
export function xpReportCurrent(activity) {
  return Boolean(activity.xpReport && activity.xpReport.sourceKey === xpSourceKey(activity));
}
export function autofillXp(activity) {
  const previous = new Map(xpRows(activity).map((row) => [row.sourceId, row]));
  return activity.awards.map((award) => {
    const rule = activity.actions.find((action) => action.id === award.actionId);
    const old = previous.get(award.id);
    // Re-running autofill preserves reviewed edits; new evidence adds new rows only.
    return old
      ? { ...old }
      : {
          sourceId: award.id,
          studentCode: award.studentCode,
          actionId: rule.id,
          quantity: award.quantity,
          points: rule.points,
          rawPoints: rule.points * award.quantity,
          evidence: award.evidence,
        };
  });
}
export function groupXp(rows, key) {
  const groups = new Map();
  for (const row of rows) {
    const group = groups.get(row[key]) || { id: row[key], quantity: 0, rawPoints: 0, count: 0 };
    group.quantity += row.quantity;
    group.rawPoints += row.rawPoints;
    group.count++;
    groups.set(group.id, group);
  }
  return [...groups.values()];
}
