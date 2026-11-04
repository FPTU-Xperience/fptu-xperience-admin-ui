import assert from 'node:assert/strict';import fs from 'node:fs';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'playwright');
const base=process.env.ADMIN_BASE_URL||'https://fptux-admin-ui.pages.dev';const nomination='11111111-1111-4111-8111-111111111111';const browser=await chromium.launch();
try{fs.mkdirSync('TestResults/governance-online',{recursive:true});
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
        await page.route('**/*', async (route) => {
            const req = route.request(),
                path = new URL(req.url()).pathname;
            if (!path.startsWith('/api/')) return route.continue();
            const ok = (value) =>
                route.fulfill({
                    status: 200,
                    contentType: 'application/json',
                    body: JSON.stringify(value),
                });
            if (!path.includes('/governance/')) {
                if (req.method() !== 'GET') throw new Error('Unexpected production mutation blocked '+path);
                if (path === '/api/v1/me') return ok({id:200,fullName:'Isolated CTSV',email:'reviewer@example.invalid',roles:['STUDENT_AFFAIR'],isActive:true,campusCode:'HAN'});
                if (path === '/api/clubs/1') return ok({id:1,code:'TEST',name:'Isolated Club',category:'TECHNOLOGY',isActive:true,campusCode:'HAN',managers:[],members:[]});
                const semester={semesterCode:'FALL2026',label:'Fall 2026',start:'2026-08-15',end:'2026-12-31',isActive:true};
                if(path==='/api/v1/semesters')return ok([semester]);if(path==='/api/v1/semesters/active')return ok(semester);
                return ok({items:[],total:0,page:1,totalPages:0});
            }
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
        await page.addInitScript(()=>localStorage.setItem('fptux:session:v1',JSON.stringify({id:'isolated-vice-review',accessToken:'intercepted-not-a-real-token'})));
        await page.goto(base+'/#/ctsv/clubs/1?view=leadership', {
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
            path: `TestResults/governance-online/vice-review-${width}.png`,
            fullPage: true,
        });
        await page.close();
        console.log(
            `CTSV vice review ${width}: explicit Vietnam interval, approve and revoke passed`,
        );
    }
}finally{await browser.close();}
