import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createServer } from 'vite';
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const html =
  '<!doctype html><html lang="vi"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><div id="root"></div><script type="module" src="/__list-qa.jsx"></script></html>';
const fixture = `import React from 'react';
import {createRoot} from 'react-dom/client';
import {HashRouter,Routes,Route} from 'react-router-dom';
import {Engagement} from '/src/pages/engagement/Engagement.jsx';
import Accounts from '/src/pages/accounts/Accounts.jsx';
import {Audit} from '/src/pages/audit/Audit.jsx';
import ClubDetail from '/src/pages/club-detail/ClubDetail.jsx';
import '/src/index.css';
const user={id:1,fullName:'UI reviewer',roles:['SYSTEM_ADMIN','STUDENT_AFFAIR'],campusCode:'HAN'};
window.__qaUser=user; window.__calls=[];
const users=Array.from({length:32},(_,i)=>({id:i+10,username:'SE'+String(i+1).padStart(3,'0'),fullName:'Student '+String(i+1).padStart(2,'0'),email:'s'+i+'@example.test',roles:['STUDENT'],isActive:true,campusCode:'HAN'}));
const clubs=Array.from({length:24},(_,i)=>({id:i+1,name:'Club '+(i+1),code:'CLB'+(i+1),category:'Công nghệ',isActive:true}));
const proxy=(parts=[])=>new Proxy(function(){},{get:(_,key)=>key==='then'?undefined:proxy([...parts,key]),apply:(_,self,args)=>{
const key=parts.join('.');window.__calls.push({key,args});
if(key==='users.list')return Promise.resolve({items:users,totalItems:users.length});
if(key==='clubs.list')return Promise.resolve(clubs);
if(key==='clubs.getById')return Promise.resolve(clubs.find(c=>c.id===Number(args[0])));
if(key==='clubs.members.list'){const page=args[1].page;return Promise.resolve({items:Array.from({length:20},(_,i)=>({id:page*20+i,userId:page*20+i,fullName:'Member '+page+'-'+i,email:'member@example.test',role:'MEMBER',status:'APPROVED'})),totalItems:60,totalPages:3,page});}
if(key==='get'&&args[0]==='/api/v1/student-affairs/campuses')return Promise.resolve({actorId:1,campusCode:'HAN',canSelectCampus:true,campuses:[{code:'HAN',name:'Hà Nội'},{code:'HCM',name:'Hồ Chí Minh'}]});
if(key==='get')return Promise.resolve(Array.from({length:32},(_,i)=>({id:i+1,actorName:'Student '+i,action:'Updated',detail:'Audit record',area:'admin'})));
if(key==='clubs.categories.list')return Promise.resolve([{id:1,name:'Công nghệ'}]);
return Promise.resolve([]);
}});window.__api=proxy();
createRoot(document.getElementById('root')).render(<HashRouter><Routes>
<Route path="/engagement" element={<Engagement/>}/><Route path="/accounts" element={<Accounts/>}/><Route path="/audit" element={<Audit/>}/><Route path="/ctsv/clubs/:clubId" element={<ClubDetail/>}/>
</Routes></HashRouter>);`;
const server = await createServer({
  server: { host: '127.0.0.1', port: 4180, strictPort: true },
  plugins: [
    {
      name: 'list-query-fixture',
      enforce: 'pre',
      resolveId(id) {
        if (id === '/__list-qa.jsx') return '/__list-virtual.jsx';
      },
      load(id) {
        if (id === '/__list-virtual.jsx') return fixture;
        const path = id.replaceAll('\\', '/');
        if (path.endsWith('/src/services/api.js'))
          return `export default new Proxy(function(){},{get:(_,key)=>window.__api?.[key]}); export const workflowRequest=(...a)=>window.__api.workflowRequest(...a);export const session={read:()=>({user:window.__qaUser,accessToken:'fixture'}),subscribe:()=>()=>{}};`;
        if (path.endsWith('/context/AuthContext.jsx'))
          return `export const useAuth=()=>({user:window.__qaUser});
            export const AuthProvider=({children})=>children;
            export const getCampusFromUser=(user)=>user?.campusCode??null;`;
        if (path.endsWith('/context/WorkspaceContext.jsx'))
          return `export const useWorkspace=()=>({season:'FA2026',setSeason:()=>{},state:{seasons:[{id:'FA2026'}]},semesterStatus:'ready',notify:()=>{}});export const WorkspaceProvider=({children})=>children;`;
        if (path.endsWith('/workflows/WorkflowContext.jsx'))
          return `export const useWorkflow=()=>({scope:{},state:{},semester:'FA2026',usesWorkspaceSemester:true,canWrite:false});export const WorkflowProvider=({children})=>children;`;
      },
      configureServer(vite) {
        vite.middlewares.use(async (req, res, next) => {
          if (req.url?.split('?')[0] === '/__list-qa') {
            res.setHeader('Content-Type', 'text/html');
            const setup = fixture.slice(
              fixture.indexOf('const user='),
              fixture.indexOf('createRoot('),
            );
            res.end(
              await vite.transformIndexHtml(
                '/__list-qa',
                html.replace(
                  '<script type="module"',
                  '<script>' + setup + '</script><script type="module"',
                ),
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
let browser;
try {
  await server.listen();
  browser = await chromium.launch();
  fs.mkdirSync('TestResults/list-state', { recursive: true });
  for (const width of [1440, 390]) {
    const page = await browser.newPage({ viewport: { width, height: 1000 } });
    page.setDefaultTimeout(60000);
    const errors = [];
    page.on('pageerror', (error) => errors.push(error.message));
    const open = (path) =>
      page.goto('http://127.0.0.1:4180/__list-qa#' + path, {
        waitUntil: 'domcontentloaded',
        timeout: 120000,
      });
    await open('/engagement?page=3&season=FA2026&keep=yes');
    await page.getByText('Trang 3 / 4', { exact: true }).waitFor();
    await page.reload();
    await page.getByText('Trang 3 / 4', { exact: true }).waitFor();
    assert.equal(await page.getByLabel('Ngành học', { exact: true }).isDisabled(), true);
    assert.equal(await page.getByLabel('Khóa sinh viên', { exact: true }).isDisabled(), true);
    await page.getByPlaceholder('Tìm tên, tài khoản, email…').fill('Student 1');
    await page.getByText('Trang 1 / 2', { exact: true }).waitFor();
    await page.getByRole('button', { name: 'Trang sau', exact: true }).click();
    await page.getByText('Trang 2 / 2', { exact: true }).waitFor();
    const saved = page.url();
    await page.getByPlaceholder('Tìm tên, tài khoản, email…').fill('missing');
    await page.getByText('Không có sinh viên phù hợp', { exact: true }).waitFor();
    assert.equal(new URLSearchParams(page.url().split('?').at(-1)).get('page'), null);
    await page.goBack();
    await page.getByText('Trang 2 / 2', { exact: true }).waitFor();
    assert.equal(page.url(), saved);
    await page.reload();
    await page.getByText('Trang 2 / 2', { exact: true }).waitFor();
    assert.equal(
      await page.getByPlaceholder('Tìm tên, tài khoản, email…').inputValue(),
      'Student 1',
    );
    assert.equal(await page.getByLabel('Campus', { exact: true }).inputValue(), 'HAN');
    assert.ok(page.url().includes('season=FA2026'));
    assert.ok(page.url().includes('keep=yes'));
    await page.screenshot({
      path: 'TestResults/list-state/engagement-' + width + '.png',
      fullPage: true,
    });
    await open('/accounts?page=3&status=active&query=Student');
    await page.getByText('Trang 3 / 4', { exact: true }).waitFor();
    await page.reload();
    await page.getByText('Trang 3 / 4', { exact: true }).waitFor();
    assert.equal(
      await page.getByRole('searchbox', { name: 'Tìm tài khoản' }).inputValue(),
      'Student',
    );
    await open('/audit?page=3&season=FA2026');
    await page.getByText('Trang 3 / 4', { exact: true }).waitFor();
    await page.getByPlaceholder('Tìm hoạt động, người thực hiện…').fill('Student');
    await page.getByText('Trang 1 / 4', { exact: true }).waitFor();
    assert.ok(
      page.url().includes('query=Student'),
      'same-event setQuery + setPage keeps both changes',
    );
    assert.ok(page.url().includes('season=FA2026'));
    await open('/ctsv/clubs/1?view=members&members_page=3&members_search=An&season=FA2026');
    await page.getByText('Member 3-0', { exact: true }).waitFor();
    await page.reload();
    await page.getByText('Member 3-0', { exact: true }).waitFor();
    assert.equal(await page.getByLabel('Tìm thành viên', { exact: true }).inputValue(), 'An');
    const href = await page
      .getByRole('link', { name: 'Tổng quan', exact: true })
      .getAttribute('href');
    assert.ok(href.includes('members_page=3'));
    assert.ok(href.includes('season=FA2026'));
    await page.getByLabel('Tìm thành viên', { exact: true }).fill('Bình');
    await page.getByText('Member 1-0', { exact: true }).waitFor();
    assert.ok(page.url().includes('members_search=B%C3%ACnh'));
    assert.deepEqual(errors, []);
    await page.close();
  }
  console.log(
    'LIST_STATE_BROWSER_OK: actual Engagement/accounts/audit/member components; reload, Back, filters, atomic updates, semester preservation, 1440/390px. API fixtures isolated.',
  );
} finally {
  await browser?.close();
  await server.close();
}
