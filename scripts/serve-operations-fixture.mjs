// Local browser QA only. Does not import into production or contact the real API.
import { createServer } from 'vite';
const server = await createServer({
  server: { host: '127.0.0.1', port: 5189, strictPort: true, open: false },
  plugins: [
    {
      name: 'admin-operations-browser-fixture',
      enforce: 'pre',
      load(id) {
        if (id.replaceAll('\\', '/').endsWith('/src/services/api.js'))
          return "export { default, api, workflowRequest } from '/scripts/fixtures/operations-api.js';";
      },
    },
  ],
});
await server.listen();
console.log('Operations browser fixture: http://127.0.0.1:5189/#/ctsv/reports');
for (const event of ['SIGINT', 'SIGTERM'])
  process.on(event, async () => {
    await server.close();
    process.exit(0);
  });
