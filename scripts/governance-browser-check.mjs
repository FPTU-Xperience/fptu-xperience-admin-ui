import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createServer } from 'vite';
const { chromium } = await import(
    process.env.PLAYWRIGHT_MODULE || 'playwright'
);
const nomination = '11111111-1111-4111-8111-111111111111';
const fixture = `import React from 'react';import{createRoot}from'react-dom/client';import Vice from '/src/pages/club-detail/ClubViceReview.jsx';import '/src/index.css';window.__qaUser={id:200,roles:['STUDENT_AFFAIR'],campusCode:'HAN'};window.__api={get:async(path,params)=>{const r=await fetch('/__vice'+path+'?'+new URLSearchParams(params));return r.json();},request:async(path,options)=>{const r=await fetch('/__vice'+path,{...options,body:JSON.stringify(options.body),headers:{...options.headers,'Content-Type':'application/json'}});const v=await r.json();if(!r.ok)throw Object.assign(new Error(v.message),{status:r.status});return v;}};createRoot(document.getElementById('root')).render(<main style={{padding:16,maxWidth:1100,margin:'auto'}}><Vice clubId={1}/></main>);`;
const server = await createServer({
    server: { host: '127.0.0.1', port: 4190, strictPort: true },
    plugins: [
        {
            name: 'vice-fixture',
            enforce: 'pre',
            resolveId(id) {
                if (id === '/__vice.jsx') return '/__vice-virtual.jsx';
            },
            load(id) {
                if (id === '/__vice-virtual.jsx') return fixture;
                const path = id.replaceAll('\\', '/');
                if (path.endsWith('/src/services/api.js'))
                    return 'export default new Proxy({}, {get:(_,key)=>window.__api?.[key]});';
                if (path.endsWith('/src/context/AuthContext.jsx'))
                    return 'export const useAuth=()=>({user:window.__qaUser});';
                if (path.endsWith('/src/context/WorkspaceContext.jsx'))
                    return 'export const useWorkspace=()=>({});';
            },
            configureServer(vite) {
                vite.middlewares.use(async (req, res, next) => {
                    if (req.url !== '/__vice') return next();
                    res.setHeader('Content-Type', 'text/html');
                    res.end(
                        await vite.transformIndexHtml(
                            '/__vice',
                            '<!doctype html><html lang="vi"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><div id="root"></div><script type="module" src="/__vice.jsx"></script></html>',
                        ),
                    );
                });
            },
        },
    ],
});
let browser;
try {
    await server.listen();
    browser = await chromium.launch();
    fs.mkdirSync('TestResults/governance', { recursive: true });
    for (const width of [1440, 390]) {
        const page = await browser.newPage({
            viewport: { width, height: 1000 },
        });
        page.setDefaultTimeout(25000);
        const errors = [];
        page.on('pageerror', (e) => {
            errors.push(e.message);
            console.error(e.message);
        });
        let status = 'PENDING',
            writes = 0,
            version = nomination;
        await page.route('**/__vice/api/**', async (route) => {
            const req = route.request(),
                path = new URL(req.url()).pathname;
            const ok = (value) =>
                route.fulfill({
                    status: 200,
                    contentType: 'application/json',
                    body: JSON.stringify(value),
                });
            if (req.method() === 'POST') {
                writes++;
                const body = req.postDataJSON();
                assert.equal(body.expectedVersion, version);
                assert.ok(req.headers()['idempotency-key']);
                if (path.endsWith('/approve')) {
                    assert.equal(
                        body.effectiveFromUtc,
                        '2026-11-05T01:00:00.000Z',
                    );
                    assert.equal(
                        body.effectiveUntilUtc,
                        '2027-01-05T01:00:00.000Z',
                    );
                    status = 'APPROVED';
                } else {
                    assert.ok(path.endsWith('/revoke'));
                    status = 'REVOKED';
                }
                version = '22222222-2222-4222-8222-222222222222';
                return ok({ clubId: 1, id: nomination, status, version });
            }
            return ok({
                clubId: 1,
                items: [
                    {
                        id: nomination,
                        version,
                        memberName: 'Phó chủ nhiệm QA',
                        userId: 104,
                        proposedBy: 100,
                        status,
                    },
                ],
                page: 1,
                pageSize: 20,
                totalItems: 1,
                totalPages: 1,
                capabilities: { canReview: true },
            });
        });
        await page.goto('http://127.0.0.1:4190/__vice', {
            waitUntil: 'domcontentloaded',
            timeout: 60000,
        });
        await page
            .getByRole('button', { name: 'Duyệt bổ nhiệm', exact: true })
            .click();
        await page
            .getByLabel('Hiệu lực từ (giờ Việt Nam)', { exact: true })
            .fill('2026-11-05T08:00');
        await page
            .getByLabel('Hiệu lực đến (giờ Việt Nam)', { exact: true })
            .fill('2027-01-05T08:00');
        await page
            .getByLabel('Lý do', { exact: true })
            .fill('Duyệt theo quyết định CTSV');
        await page
            .getByRole('button', { name: 'Xác nhận quyết định', exact: true })
            .click();
        await page
            .getByRole('button', { name: 'Thu hồi bổ nhiệm', exact: true })
            .click();
        await page
            .getByLabel('Lý do', { exact: true })
            .fill('Thu hồi quyết định');
        await page
            .getByRole('button', { name: 'Xác nhận quyết định', exact: true })
            .click();
        await page.getByText(/Đã thu hồi/).waitFor();
        assert.equal(writes, 2);
        assert.deepEqual(errors, []);
        assert.equal(
            await page.evaluate(
                () => document.documentElement.scrollWidth > innerWidth + 1,
            ),
            false,
        );
        await page.screenshot({
            path: `TestResults/governance/vice-review-${width}.png`,
            fullPage: true,
        });
        await page.close();
        console.log(
            `CTSV vice review ${width}: explicit Vietnam interval, approve and revoke passed`,
        );
    }
} catch (error) {
    console.error(error);
    process.exitCode = 1;
} finally {
    await browser?.close();
    await Promise.race([
        server.close(),
        new Promise((resolve) => setTimeout(resolve, 2000)),
    ]);
}
