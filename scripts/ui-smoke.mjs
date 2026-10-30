import { affairsNav, adminNav } from '../src/routes/navigation.js';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { spawn } from 'node:child_process';
import { createServer } from 'vite';

// Browser fixture only: never imported by the production entry point.
const directory = '.qa/baseline';
await fs.mkdir(directory, { recursive: true });
const html = `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head><body><div id="root"></div><script>
window.__fixtureToken=new URLSearchParams(location.search).get('run');
const actor=new URLSearchParams(location.search).get('actor')||'staff';
const failure=new URLSearchParams(location.search).get('fail')||'';
const user=actor==='guest'?null:{id:1,fullName:'Nguyễn Văn Kiểm Thử',email:'qa@example.test',campusCode:'HCM',roles:[actor==='admin'?'SYSTEM_ADMIN':actor==='student'?'STUDENT':'STUDENT_AFFAIR']};
window.__calls=[];sessionStorage.setItem('fptu-preview-role','SYSTEM_ADMIN');
localStorage.removeItem('fptu-xperience-demo-v1');
const semesters=[{semesterCode:'FALL2026',label:'Fall 2026',start:'2026-08-15',end:'2026-12-31',threshold:200,xpPerLevel:100,rankings:true,isActive:true},{semesterCode:'SPRING2027',label:'Spring 2027',start:'2027-01-01',end:'2027-04-30'}];
const clubs=[{id:1,name:'Câu lạc bộ Công nghệ FPT',code:'FPT-TECH',category:'Công nghệ',memberCount:12,isActive:true,isRecruiting:true}];
const users=[user||{id:1,fullName:'Khách',roles:[]},{id:2,username:'SE000002',fullName:'Sinh viên kiểm thử',email:'student@example.test',roles:['STUDENT'],clubIds:[],isActive:true}];
const radar={semesterCode:'FALL2026',academicYear:'2026-2027',averageERI:32,averageD:30,averageJ:0.4,averageM:1.1,pillars:['Học thuật','Kỹ năng','Cộng đồng','Thể chất','Toàn cầu','Đạo đức'].map((name,i)=>({pillarName:name,averageSaturatedScore:20+i*5})),profileTitlesDistribution:[],campusesComparison:[]};
const data={'auth.me':user,'auth.adminMe':user,'auth.ctsvMe':user,'seasons.list':semesters,'seasons.getActive':semesters[0],'users.list':{items:users,totalItems:users.length},'users.roles':['SYSTEM_ADMIN','STUDENT_AFFAIR','STUDENT'],'roles.list':[],'roles.stats':{ADMIN:1,STUDENT_AFFAIRS_ADMIN:1,CLUB_MANAGER:0,CLUB_MEMBER:1},'clubs.list':clubs,'clubs.getById':clubs[0],'clubs.members.list':{items:[{id:8,userId:2,fullName:'Sinh viên kiểm thử',email:'student@example.test',role:'STUDENT',status:'APPROVED'}],page:1,pageSize:20,totalItems:1,totalPages:1},'reports.list':{items:[],total:0},'clubs.categories.list':[{id:1,name:'Công nghệ'}],'clubs.applications.list':[],'studentAffairs.radar.overview':radar,'studentAffairs.benchmarks.getActive':null,'studentAffairs.students.radar':radar,'admin.health.stats':{accounts:2,clubs:1,audit:0},'admin.settings.get':{},'notifications.list':[{id:1,title:'Thông báo kiểm thử',message:'Nội dung từ API fixture',createdAtUtc:'2026-10-15T00:00:00Z',isRead:false}]};
const fixture=(parts=[])=>new Proxy(function(){},{get:(_,key)=>key==='then'?undefined:fixture([...parts,key]),apply:(_,self,args)=>{const key=parts.join('.');window.__calls.push({key,args});if(key==='getAccessToken')return user?'qa-token':null;if(key==='getRefreshToken')return null;if(['clearTokens','setToken','setRefreshToken'].includes(key))return;const fail=(failure==='semesters'&&key==='seasons.list')||(failure==='benchmark'&&key==='studentAffairs.benchmarks.getActive')||(failure==='save'&&key==='seasons.create')||(failure==='notifications'&&key==='notifications.list')||(failure==='reports'&&key==='reports.list')||(failure==='club'&&key==='clubs.getById')||(key==='users.create'&&window.__failAccountCreate);if(fail)return Promise.reject(Object.assign(Error('Lỗi API kiểm thử'),{status:503}));if(key==='clubs.getById')return Promise.resolve({...clubs[0],id:Number(args[0]),name:Number(args[0])===1?clubs[0].name:'CLB thứ hai kiểm thử'});if(key==='get')return Promise.resolve([]);return Promise.resolve(key in data?data[key]:[]);}});
window.__api=fixture();window.__qaUser=user;
</script><script type="module" src="/src/main.jsx"></script></body></html>`;
const server = await createServer({
  server: { host: '127.0.0.1', port: 5189, strictPort: true, open: false },
  plugins: [
    {
      name: 'admin-baseline-fixture',
      enforce: 'pre',
      load(id) {
        if (id.replaceAll('\\', '/').endsWith('/src/services/api.js'))
          return `export default window.__api;
            export const workflowRequest = (...args) => window.__api.workflowRequest(...args);
            export const session = {
              read: () => window.__api.getAccessToken() ? { id: 'fixture-session', accessToken: 'fixture', user: window.__qaUser } : null,
              subscribe: () => () => {},
            };`;
      },
      configureServer(vite) {
        vite.middlewares.use('/__qa', async (req, res) => {
          res.setHeader('Content-Type', 'text/html');
          res.end(await vite.transformIndexHtml('/__qa', html));
        });
      },
    },
  ],
});
let chrome, ws;
try {
  await server.listen();
  const profile = await fs.mkdtemp(path.join(os.tmpdir(), 'fptux-admin-baseline-'));
  chrome = spawn(
    process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe',
    [
      '--headless=new',
      '--disable-gpu',
      '--no-first-run',
      `--user-data-dir=${profile}`,
      '--remote-debugging-port=9341',
      'about:blank',
    ],
    { stdio: 'ignore', windowsHide: true },
  );
  let targets;
  for (let n = 0; n < 100; n++) {
    try {
      targets = await (await fetch('http://localhost:9341/json')).json();
      break;
    } catch {
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
  }
  assert.ok(targets);
  ws = new WebSocket(targets.find((item) => item.type === 'page').webSocketDebuggerUrl);
  await new Promise((resolve) => ws.addEventListener('open', resolve, { once: true }));
  let id = 0;
  const pending = new Map();
  const runtimeErrors = [];
  ws.addEventListener('message', (event) => {
    const item = JSON.parse(event.data);
    if (item.id) {
      const request = pending.get(item.id);
      pending.delete(item.id);
      item.error ? request.reject(item.error) : request.resolve(item.result);
    } else if (item.method === 'Runtime.exceptionThrown')
      runtimeErrors.push(
        item.params.exceptionDetails.exception?.description || item.params.exceptionDetails.text,
      );
  });
  const call = (method, params = {}) =>
    new Promise((resolve, reject) => {
      const next = ++id;
      pending.set(next, { resolve, reject });
      ws.send(JSON.stringify({ id: next, method, params }));
    });
  const evaluate = async (expression) => {
    const data = await call('Runtime.evaluate', {
      expression,
      returnByValue: true,
      awaitPromise: true,
    });
    if (data.exceptionDetails)
      throw new Error(data.exceptionDetails.exception?.description || data.exceptionDetails.text);
    return data.result.value;
  };
  const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
  await call('Page.enable');
  await call('Runtime.enable');
  let fixtureScenario, currentFixtureToken;
  const open = async (route, actor = 'staff', width = 1280, failure = '', reuseFixture = false) => {
    runtimeErrors.length = 0;
    await call('Emulation.setDeviceMetricsOverride', {
      width,
      height: 1000,
      deviceScaleFactor: 1,
      mobile: false,
    });
    const scenario = `${actor}:${failure}`;
    const reuse =
      reuseFixture &&
      fixtureScenario === scenario &&
      (await evaluate(`window.__fixtureToken===${JSON.stringify(currentFixtureToken)}`));
    const fixtureToken = reuse ? currentFixtureToken : crypto.randomUUID();
    if (reuse) {
      await evaluate(`location.hash=${JSON.stringify(route)}`);
    } else {
      await call('Page.navigate', {
        url: `http://127.0.0.1:5189/__qa?actor=${actor}&fail=${failure}&run=${fixtureToken}#${route}`,
      });
      fixtureScenario = scenario;
      currentFixtureToken = fixtureToken;
    }
    for (let n = 0; n < 400; n++) {
      await delay(100);
      if (
        await evaluate(
          `window.__fixtureToken===${JSON.stringify(fixtureToken)} && !!document.querySelector('h1')`,
        )
      )
        break;
    }
    await delay(200);
    assert.deepEqual(runtimeErrors, [], `${actor} ${route} ${width}`);
    assert.ok(
      await evaluate(`!!document.querySelector('h1')`),
      `${actor} ${route}: no heading ` +
        JSON.stringify(
          await evaluate(
            `({text:document.body.textContent,root:document.querySelector("#root")?.innerHTML,calls:window.__calls})`,
          ),
        ),
    );
  };
  if (!process.env.UI_SMOKE_ONLY_GUIDE) {
    const widths = [320, 375, 414, 768, 1280];
    const legacyStaffRoutes = [
      'overview',
      'clubs',
      'declarations',
      'engagement',
      'quests',
      'rubrics',
      'seasons',
      'anomalies',
      'reports',
      'activity-approvals',
      'activity-dossiers',
      'club-requests',
      'student-roster',
      'rollover',
      'leadership',
      'club-bonuses',
      'global-activities',
      'experience-audit',
    ].map((slug) => `/ctsv/${slug}`);
    const legacyAdminRoutes = [
      'accounts',
      'roles',
      'integrations',
      'settings',
      'health',
      'audit',
    ].map((slug) => `/admin/${slug}`);
    const routeTabs = (items) =>
      items.flatMap((item) =>
        item.tabs?.length ? item.tabs.map((tab) => `${item.path}?view=${tab.id}`) : [item.path],
      );
    const staffRoutes = [
      ...routeTabs(affairsNav),
      '/ctsv/activities?view=club&source=mock',
      '/ctsv/monitoring?view=anomalies&source=mock',
      '/ctsv/monitoring?view=reconciliation&source=mock',
      ...['overview', 'members', 'reports', 'activities', 'requests', 'leadership', 'bonus'].map(
        (view) => `/ctsv/clubs/1?view=${view}`,
      ),
      '/ctsv/clubs/1?view=activities&source=mock',
    ];
    const adminRoutes = [...routeTabs(adminNav), '/admin/operations?view=connections'];
    const metrics = [];
    const routeCases = [
      ['staff', process.env.UI_SMOKE_ONLY_FLOWS ? [] : staffRoutes],
      ['admin', process.env.UI_SMOKE_ONLY_FLOWS ? [] : adminRoutes],
    ].flatMap(([actor, routes]) =>
      routes.flatMap((route) => widths.map((width) => ({ actor, route, width }))),
    );
    const startIndex = process.env.UI_SMOKE_FROM_ROUTE
      ? routeCases.findIndex((item) => item.route === process.env.UI_SMOKE_FROM_ROUTE)
      : 0;
    assert.ok(startIndex >= 0, 'Unknown resume route');
    for (const { actor, route, width } of routeCases.slice(startIndex)) {
      await open(route, actor, width, '', true);
      const data = await evaluate(
        `(()=>{const sidebar=document.querySelector('#app-sidebar'),main=document.querySelector('main');if(!main||!sidebar)return {missing:true,text:document.body.textContent,calls:window.__calls};const r=main.getBoundingClientRect();return {viewport:document.documentElement.clientWidth,title:document.querySelector('h1').textContent,scroll:document.documentElement.scrollWidth,main:{left:r.left,right:r.right},sidebarVisible:getComputedStyle(sidebar).visibility,sidebarInert:sidebar.inert,overflow:[...document.querySelectorAll('main *')].filter(e=>e instanceof HTMLElement&&e.getClientRects().length&&getComputedStyle(e).visibility!=='hidden'&&!(()=>{for(let p=e;p&&p!==main.parentElement;p=p.parentElement){const s=getComputedStyle(p);if(['auto','scroll'].includes(s.overflowX)||s.pointerEvents==='none')return true;}return false;})()&&e.getBoundingClientRect().right>document.documentElement.clientWidth+1).slice(0,10).map(e=>({tag:e.tagName,cls:e.className,right:e.getBoundingClientRect().right}))}})()`,
      );
      metrics.push({ actor, route, width, ...data });
      assert.ok(!data.missing, JSON.stringify(data));
      assert.ok(
        data.main.right <= data.viewport && data.scroll <= data.viewport,
        JSON.stringify({ actor, route, width, data }),
      );
      assert.deepEqual(data.overflow, [], JSON.stringify({ actor, route, width, data }));
      if (width < 1024) {
        assert.equal(data.sidebarVisible, 'hidden');
        assert.ok(data.sidebarInert);
        assert.equal(data.main.left, 0);
      } else {
        assert.equal(data.sidebarVisible, 'visible');
        assert.equal(data.sidebarInert, false);
      }
      if (
        [320, 768, 1280].includes(width) &&
        [
          '/ctsv/work?view=actionable',
          '/ctsv/activities?view=club&source=mock',
          '/ctsv/clubs/1?view=overview',
          '/ctsv/clubs/1?view=bonus',
          '/admin/accounts?view=accounts',
        ].includes(route)
      ) {
        const shot = await call('Page.captureScreenshot', {
          format: 'png',
          captureBeyondViewport: false,
        });
        await fs.writeFile(
          `${directory}/${route.replaceAll(/[^a-z0-9]/gi, '-')}-${width}.png`,
          Buffer.from(shot.data, 'base64'),
        );
      }
      console.log(`PASS route ${actor} ${route} ${width}`);
    }
    if (metrics.length)
      await fs.writeFile(
        `${directory}/${process.env.UI_SMOKE_FROM_ROUTE ? 'metrics-resumed' : 'metrics'}.json`,
        JSON.stringify(metrics, null, 2),
      );
    if (!process.env.UI_SMOKE_ONLY_FLOWS) {
      for (const [actor, routes] of [
        ['staff', legacyStaffRoutes],
        ['admin', legacyAdminRoutes],
      ])
        for (const route of routes) {
          await open(route, actor, 1280, '', true);
          assert.ok(
            (await evaluate('location.hash')).includes('?') ||
              [
                '/ctsv/declarations',
                '/ctsv/clubs',
                '/admin/accounts',
                '/admin/audit',
                '/admin/health',
              ].includes(route),
          );
        }
    }
    await open('/admin/accounts', 'staff');
    assert.equal(await evaluate(`location.hash`), '#/ctsv/work');
    await open('/admin/accounts', 'student');
    assert.ok(
      await evaluate(`document.body.textContent.includes('Tài khoản chưa có quyền truy cập')`),
    );
    assert.equal(await evaluate(`!!document.querySelector('#app-sidebar')`), false);
    await open('/login', 'guest', 320);
    assert.ok(await evaluate(`document.body.textContent.includes('Đăng nhập')`));
    assert.ok(await evaluate(`document.documentElement.scrollWidth<=innerWidth`));
    const shot = await call('Page.captureScreenshot', { format: 'png' });
    await fs.writeFile(`${directory}/login-320.png`, Buffer.from(shot.data, 'base64'));

    await open('/ctsv/clubs', 'staff', 375);
    await evaluate(
      `document.querySelector('button[aria-label="Mở điều hướng"]').focus();document.querySelector('button[aria-label="Mở điều hướng"]').click()`,
    );
    await delay(100);
    assert.equal(await evaluate(`document.querySelector('#app-sidebar').inert`), false);
    assert.ok(
      await evaluate(`document.querySelector('#app-sidebar').contains(document.activeElement)`),
    );
    await call('Input.dispatchKeyEvent', {
      type: 'keyDown',
      key: 'Escape',
      code: 'Escape',
      windowsVirtualKeyCode: 27,
    });
    await delay(100);
    assert.ok(await evaluate(`document.querySelector('#app-sidebar').inert`));
    assert.equal(
      await evaluate(`document.activeElement.getAttribute('aria-label')`),
      'Mở điều hướng',
    );
    await evaluate(
      `document.querySelector('button[aria-label="Mở điều hướng"]').focus();document.querySelector('button[aria-label="Mở điều hướng"]').click()`,
    );
    await delay(100);
    await evaluate(`document.querySelector('#app-sidebar a[href="#/ctsv/semesters"]').click()`);
    await delay(200);
    assert.ok(await evaluate(`document.querySelector('#app-sidebar').inert`));
    console.log('PASS access guards and mobile drawer');

    await open('/ctsv/rubrics', 'staff', 375, 'benchmark');
    assert.ok(await evaluate(`document.body.textContent.includes('Lỗi API kiểm thử')`));
    assert.ok(
      await evaluate(
        `[...document.querySelectorAll('button')].find(e=>e.textContent.includes('Tạo Benchmark mới')).disabled`,
      ),
    );
    await open('/ctsv/clubs', 'staff', 375, 'semesters');
    assert.ok(await evaluate(`document.body.textContent.includes('Không thể tải học kỳ')`));
    await open('/ctsv/clubs', 'staff', 375);
    await evaluate(`document.querySelector('button[aria-label="Thông báo cần xử lý"]').click()`);
    await delay(200);
    assert.ok(
      await evaluate(
        `document.querySelector('dialog[open]')?.textContent.includes('Thông báo kiểm thử')`,
      ),
    );
    console.log('PASS API error states and notification modal');

    // CSS utilities must win over base rules after the Tailwind v4 migration.
    await open('/login', 'guest', 320);
    assert.equal(
      await evaluate(
        `getComputedStyle(document.querySelector('button[aria-pressed="true"]')).color`,
      ),
      'rgb(255, 255, 255)',
    );

    await open('/ctsv/rubrics', 'staff', 375);
    await evaluate(
      `[...document.querySelectorAll('button')].find(e=>e.textContent.includes('Tạo Benchmark mới')).click()`,
    );
    await delay(100);
    assert.ok(await evaluate(`!!document.querySelector('dialog[open] form')`));
    assert.deepEqual(runtimeErrors, []);
    const weights = await evaluate(
      `[...document.querySelectorAll('dialog input[type="number"]')].slice(0,6).map(e=>Number(e.value))`,
    );
    assert.equal(weights.length, 6);
    assert.equal(
      weights.reduce((sum, value) => sum + value, 0),
      100,
    );

    await open('/ctsv/seasons', 'staff', 375, 'save');
    await evaluate(
      `[...document.querySelectorAll('button')].find(e=>e.textContent.includes('Thêm học kỳ')).click()`,
    );
    await delay(100);
    for (const [selector, value] of [
      ['dialog input:not([type])', 'SPRING2028'],
      ['dialog input[type="date"]:first-of-type', '2028-01-01'],
    ]) {
      // Date fields live in separate labels; fill them by their index below.
      if (selector.includes('date')) continue;
      await evaluate(
        `(()=>{const e=document.querySelector('${selector}');Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(e,'${value}');e.dispatchEvent(new Event('input',{bubbles:true}));})()`,
      );
      await delay(50);
    }
    for (const [index, value] of [
      [0, '2028-01-01'],
      [1, '2028-04-30'],
    ]) {
      await evaluate(
        `(()=>{const e=document.querySelectorAll('dialog input[type="date"]')[${index}];Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(e,'${value}');e.dispatchEvent(new Event('input',{bubbles:true}));e.dispatchEvent(new Event('change',{bubbles:true}));})()`,
      );
      await delay(50);
    }
    await evaluate(`document.querySelector('dialog form').requestSubmit()`);
    await delay(150);
    assert.ok(await evaluate(`window.__calls.some(item=>item.key==='seasons.create')`));
    assert.ok(await evaluate(`!!document.querySelector('dialog[open]')`));
    assert.ok(
      await evaluate(
        `document.querySelector('dialog [role="alert"]')?.textContent.includes('Lỗi API kiểm thử')`,
      ),
    );
    assert.ok(
      await evaluate(
        `document.body.textContent.includes('Lỗi API kiểm thử')&&!document.body.textContent.includes('Đã lưu cấu hình học kỳ.')`,
      ),
    );

    await open('/ctsv/clubs', 'staff', 375);
    await evaluate(
      `document.querySelector('button[aria-label="Mở điều hướng"]').focus();document.querySelector('button[aria-label="Mở điều hướng"]').click()`,
    );
    await delay(100);
    await evaluate(
      `window.dispatchEvent(new KeyboardEvent('keydown', {key:'k',ctrlKey:true,bubbles:true}))`,
    );
    await delay(100);
    assert.ok(await evaluate(`!!document.querySelector('dialog[open]')`));
    await call('Input.dispatchKeyEvent', {
      type: 'keyDown',
      key: 'Escape',
      code: 'Escape',
      windowsVirtualKeyCode: 27,
    });
    await delay(150);
    assert.equal(await evaluate(`document.body.style.overflow`), '');
    assert.ok(await evaluate(`document.querySelector('#app-sidebar').inert`));
    console.log('PASS CSS cascade, benchmark draft, failed save and nested overlay cleanup');

    await (
      await import('./account-table-ui-checks.mjs')
    ).checkAccountTable({ open, evaluate, delay, call, directory });
    await (
      await import('./workflow-ui-checks.mjs')
    ).checkWorkflows({ open, evaluate, delay, call, directory });
    assert.deepEqual(runtimeErrors, []);
  }
  await (
    await import('./guided-help-ui-checks.mjs')
  ).checkGuidedHelp({ open, evaluate, delay, call });
  await call('Browser.close');
  ws.close();
} finally {
  ws?.close();
  chrome?.kill();
  await server.close();
}
