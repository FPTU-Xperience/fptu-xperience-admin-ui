import fs from 'node:fs';
import path from 'node:path';
import { affairsNav, adminNav } from '../src/routes/navigation.js';
import { readBackendRoutes } from '../../fptu-xperience-clubhub-ui/scripts/source-route-inventory.mjs';

const root = process.cwd();
const source = fs.readFileSync(path.join(root, 'src/routes/index.jsx'), 'utf8');
const pagePaths = [...source.matchAll(/'((?:\/ctsv|\/admin)\/[^']+)':/g)].map((match) => match[1]);
const nav = [...affairsNav, ...adminNav];
const missing = nav.filter((item) => !pagePaths.includes(item.path));
const orphan = pagePaths.filter((route) => !nav.some((item) => item.path === route));
const backend = path.resolve(root, '../fptu-xperience-clubhub-api');
const { routes, unresolvedGroups } = readBackendRoutes(backend);
const requirements = [
  ['GET', '/api/clubs'],
  ['GET', '/api/reports'],
  ['GET', '/api/reports/{}'],
  ['POST', '/api/reports/{}/approve'],
  ['POST', '/api/reports/{}/reject'],
  ['GET', '/api/reports/{}/file/preview'],
  ['GET', '/api/reports/{}/file/download'],
  ['GET', '/api/reports/{}/attachments/{}/download'],
  ['GET', '/api/clubs/disband-requests'],
  ['POST', '/api/clubs/disband-requests/{}/approve'],
  ['POST', '/api/clubs/disband-requests/{}/reject'],
  ['GET', '/api/clubs/transfer-requests'],
  ['POST', '/api/clubs/transfer-requests/{}/approve'],
  ['POST', '/api/clubs/transfer-requests/{}/reject'],
  ['GET', '/api/contributions/{}'],
];
const endpointChecks = requirements.map(([method, route]) => ({
  method,
  route,
  source: routes.find((row) => row.method === method && row.route === route),
}));
const unsupported = endpointChecks.filter((row) => !row.source);
const detailPresent = source.includes('path="/ctsv/reports/:reportId"');
const code = fs
  .readdirSync(path.join(root, 'src'), { recursive: true })
  .filter((file) => /\.(js|jsx)$/.test(file));
const removedReferences = code.filter((file) =>
  /BonusMatrix|bonus-matrix|bonusMatrix|Hệ số cộng điểm/.test(
    fs.readFileSync(path.join(root, 'src', file), 'utf8'),
  ),
);
const result = {
  navigationPages: nav.length,
  registeredPages: pagePaths.length,
  reportDetailRoute: detailPresent,
  missing: missing.map((item) => item.path),
  orphan,
  backendOperationChecks: endpointChecks.length,
  unsupported,
  unresolvedBackendReceiverDeclarations: unresolvedGroups.length,
  removedFeatureSourceReferences: removedReferences,
};
fs.mkdirSync(path.join(root, 'docs/qa'), { recursive: true });
fs.writeFileSync(
  path.join(root, 'docs/qa/admin-page-inventory-2026-10-19.json'),
  JSON.stringify(result, null, 2) + '\n',
);
fs.writeFileSync(
  path.join(root, 'docs/qa/admin-page-inventory-2026-10-19.md'),
  `# Admin route and API declaration audit — 2026-10-19\n\nSource-only inventory; not runtime/OpenAPI, DTO validation, authorization or live acceptance. Known dynamic method/path composition is checked explicitly below.\n\n## Navigation and registered pages\n\n| Route | Label | Registered |\n| --- | --- | --- |\n${nav.map((item) => `| \`${item.path}\` | ${item.label} | ${pagePaths.includes(item.path)} |`).join('\n')}\n\nDetail: \`/ctsv/reports/:reportId\` = ${detailPresent}.\n\n## API operations used by new connected screens\n\n| HTTP | Path | Declaration evidence |\n| --- | --- | --- |\n${endpointChecks.map((item) => `| ${item.method} | \`${item.route}\` | ${item.source ? `${item.source.file}:${item.source.line}` : 'MISSING'} |`).join('\n')}\n\n## Limits\n\n- Report type filtering traverses all matching server pages; current BE only has exact tag filtering.\n- Report/club decisions pre-read current state; current BE DTOs do not provide atomic expectedVersion/idempotency receipts. See the active contract.\n- Planned operation pages intentionally call no invented BE endpoints.\n- No source references remain for the removed Bonus Matrix feature: ${removedReferences.length === 0}. Historical audit documents may retain its removal history.\n`,
);
console.log(JSON.stringify(result, null, 2));
if (
  missing.length ||
  orphan.length ||
  unsupported.length ||
  !detailPresent ||
  removedReferences.length
)
  process.exitCode = 1;
