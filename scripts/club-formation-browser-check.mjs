import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createServer } from 'vite';
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const fixture = `import React,{useEffect,useState} from 'react';import {createRoot} from 'react-dom/client';import {HashRouter} from 'react-router-dom';import {Clubs} from '/src/pages/clubs/Clubs.jsx';import '/src/index.css';
window.__qaUser={id:900,fullName:'CTSV reviewer',roles:['STUDENT_AFFAIR'],campusCode:'HCM'};
const request=async(path,options={})=>{const r=await fetch('/__formation'+path,{...options,body:options.body?JSON.stringify(options.body):undefined,headers:{'Content-Type':'application/json',...options.headers}});const body=await r.json();if(!r.ok)throw Object.assign(new Error(body.message),{status:r.status});return body;};
window.__api={request,users:{list:()=>request('/api/users')},clubs:{list:()=>request('/api/clubs'),categories:{list:()=>request('/api/clubs/categories')},applications:{list:()=>request('/api/clubs/applications'),approve:(id,body,key)=>request('/api/clubs/applications/'+id+'/approve',{method:'POST',body,headers:{'Idempotency-Key':key}}),requestRevision:(id,body,key)=>request('/api/clubs/applications/'+id+'/request-revision',{method:'POST',body,headers:{'Idempotency-Key':key}}),reject:(id,body,key)=>request('/api/clubs/applications/'+id+'/reject',{method:'POST',body,headers:{'Idempotency-Key':key}})}}};
function Notice(){const[text,setText]=useState('');useEffect(()=>{const listener=e=>setText(e.detail);window.addEventListener('qa-notice',listener);return()=>window.removeEventListener('qa-notice',listener)},[]);return <p role="status">{text}</p>}createRoot(document.getElementById('root')).render(<HashRouter><main style={{padding:16}}><Clubs/><Notice/></main></HashRouter>);`;
const server = await createServer({
  server: { host: '127.0.0.1', port: 4186, strictPort: true },
  plugins: [
    {
      name: 'formation-admin-fixture',
      enforce: 'pre',
      resolveId(id) {
        if (id === '/__formation.jsx') return '/__formation-virtual.jsx';
      },
      load(id) {
        if (id === '/__formation-virtual.jsx') return fixture;
        const path = id.replaceAll('\\', '/');
        if (path.endsWith('/services/api.js'))
          return 'export default new Proxy(function(){},{get:(_,key)=>window.__api?.[key]});';
        if (path.endsWith('/context/AuthContext.jsx'))
          return 'export const useAuth=()=>({user:window.__qaUser});';
        if (path.endsWith('/context/WorkspaceContext.jsx'))
          return 'export const useWorkspace=()=>({notify:message=>window.dispatchEvent(new CustomEvent("qa-notice",{detail:message}))});';
      },
      configureServer(vite) {
        vite.middlewares.use(async (req, res, next) => {
          if (req.url?.split('?')[0] === '/__formation-qa') {
            res.setHeader('Content-Type', 'text/html');
            res.end(
              await vite.transformIndexHtml(
                '/__formation-qa',
                '<!doctype html><html lang="vi"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><div id="root"></div><script type="module" src="/__formation.jsx"></script></html>',
              ),
            );
            return;
          }
          next();
        });
      },
    },
  ],
});
const versions = ['11111111-1111-4111-8111-111111111111', '22222222-2222-4222-8222-222222222222'];
let browser;
try {
  await server.listen();
  browser = await chromium.launch();
  fs.mkdirSync('TestResults/formation', { recursive: true });
  for (const width of [1440, 390]) {
    const page = await browser.newPage({ viewport: { width, height: 1000 } });
    page.setDefaultTimeout(25000);
    const errors = [];
    page.on('pageerror', (e) => errors.push(e.message));
    let writes = 0,
      conflict = true;
    const app = {
      id: 1,
      name: 'Formation Club',
      code: 'FORM26',
      category: 'TECHNOLOGY',
      requesterUserId: 100,
      requesterName: 'Requester Full Name',
      foundingMemberCount: 15,
      purpose: 'Learn together',
      mainActivities: 'Workshops',
      activityFrequency: '2 lần mỗi tháng',
      contactEmail: 'requester@example.test',
      contactPhone: '0912345678',
      submittedAtUtc: '2026-11-04T00:00:00Z',
      campusCode: 'HCM',
      version: versions[0],
      status: 'Submitted',
    };
    await page.route('**/__formation/**', async (route) => {
      const req = route.request(),
        path = new URL(req.url()).pathname.replace('/__formation', '');
      const send = (body, status = 200) =>
        route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) });
      if (req.method() === 'GET') {
        if (path === '/api/clubs') return send([]);
        if (path === '/api/clubs/categories')
          return send([{ code: 'TECHNOLOGY', name: 'Công nghệ' }]);
        if (path === '/api/clubs/applications') return send([app]);
        if (path === '/api/users')
          return send({
            items: [
              {
                id: 100,
                fullName: 'Requester Full Name',
                email: 'requester@example.test',
                isActive: true,
                isLocked: false,
                campusCode: 'HCM',
              },
              {
                id: 200,
                fullName: 'Chosen President',
                email: 'president@example.test',
                isActive: true,
                isLocked: false,
                campusCode: 'HCM',
              },
              {
                id: 300,
                fullName: 'Wrong Campus',
                isActive: true,
                isLocked: false,
                campusCode: 'HAN',
              },
              { id: 400, fullName: 'Locked', isActive: true, isLocked: true, campusCode: 'HCM' },
            ],
            page: 1,
            pageSize: 500,
            total: 4,
          });
        throw new Error('Unexpected read ' + path);
      }
      writes++;
      assert.ok(req.headers()['idempotency-key']);
      const body = req.postDataJSON();
      assert.equal(body.expectedVersion, app.version);
      assert.equal(body.managerUserId, 200);
      assert.ok(body.note.length >= 5);
      if (conflict) {
        conflict = false;
        app.version = versions[1];
        return send({ message: 'Reload the pending application before reviewing.' }, 409);
      }
      app.status = 'Approved';
      app.approvedManagerUserId = 200;
      app.approvedManagerName = 'Chosen President';
      app.createdClubId = 1;
      app.version = versions[0];
      return send(app);
    });
    await page.goto('http://127.0.0.1:4186/__formation-qa#/ctsv/clubs?tab=applications', {
      waitUntil: 'domcontentloaded',
    });
    await page.getByText('Requester Full Name', { exact: true }).waitFor();
    await page.getByRole('button', { name: 'Xem xét', exact: true }).click();
    await page.getByLabel('Chủ nhiệm CLB', { exact: true }).selectOption('200');
    assert.equal(await page.getByRole('option', { name: 'Wrong Campus', exact: false }).count(), 0);
    assert.equal(await page.getByRole('option', { name: 'Locked', exact: false }).count(), 0);
    await page.getByRole('dialog').getByRole('textbox').fill('Approved campus formation');
    await page.getByRole('button', { name: 'Phê duyệt thành lập', exact: true }).click();
    await page.getByRole('status').filter({ hasText: 'Reload the pending' }).waitFor();
    await page.getByRole('button', { name: 'Đóng', exact: true }).click();
    await page.reload();
    await page.getByRole('button', { name: 'Xem xét', exact: true }).click();
    await page.getByLabel('Chủ nhiệm CLB', { exact: true }).selectOption('200');
    await page.getByRole('dialog').getByRole('textbox').fill('Approved campus formation');
    await page.getByRole('button', { name: 'Phê duyệt thành lập', exact: true }).evaluate((el) => {
      el.click();
      el.click();
    });
    await page.getByRole('dialog').waitFor({ state: 'hidden' });
    assert.equal(writes, 2);
    await page.reload();
    await page.getByRole('button', { name: 'Chi tiết', exact: true }).click();
    await page.getByText('Chủ nhiệm đã duyệt: Chosen President', { exact: true }).waitFor();
    assert.equal(
      await page.getByRole('button', { name: 'Phê duyệt thành lập', exact: true }).count(),
      0,
    );
    await page.screenshot({
      path: 'TestResults/formation/approval-' + width + '.png',
      fullPage: true,
    });
    assert.deepEqual(errors, []);
    await page.close();
  }
  console.log(
    'ADMIN_FORMATION_BROWSER_OK: real queue field/status mapping, same-campus unlocked account selection, stale version conflict/reload, duplicate guard and chosen president after reload at 1440/390. API isolated.',
  );
} finally {
  await browser?.close();
  await server.close();
}
