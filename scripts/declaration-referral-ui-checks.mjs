import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';

export async function checkDeclarationReferrals({ open, evaluate, delay, call, directory }) {
  await open('/ctsv/declarations', 'staff', 1280);
  await evaluate(`(()=>{
    const source={id:'11111111-1111-4111-8111-111111111111',userId:8,studentName:'Nguyễn An',title:'Chứng chỉ qua CLB',status:'SUBMITTED',version:'11111111-1111-4111-8111-111111111111',referringClubId:7,clubId:7,clubReviewStatus:'APPROVED',ctsvSubmissionStatus:'SUBMITTED',clubReviewReason:'CLB đã kiểm tra bản gốc',clubReviewedBy:20,ctsvSubmittedBy:21,evidenceRefs:['eeeeeeee-1111-4111-8111-111111111111'],rawPoints:0,proposedAttributes:{tier:'T1',role:'Participant',scale:'National',result:'None',pillarWeights:[{pillar:'Academic',weight:1}]},capabilities:{canFinalReview:true}};
    window.__referralRow=source;window.__failDetail=true;window.__failReview=true;
    window.__declarationsFixture={
      list:async params=>{const direct={...source,id:'22222222-2222-4222-8222-222222222222',title:'Gửi trực tiếp',referringClubId:null};const rows=params.viaClub===true?[source]:params.viaClub===false?[direct]:[source,direct];return {items:rows,pagination:{totalItems:rows.length,totalPages:1}};},
      get:async()=>{if(window.__failDetail)throw Error('Lỗi tải hồ sơ kiểm thử');return await new Promise(resolve=>{window.__resolveDetail=()=>resolve({contribution:{...source,version:'33333333-3333-4333-8333-333333333333'}});});},
      review:async(id,body)=>{if(window.__failReview)throw Error('Lỗi thẩm định kiểm thử');if(body.expectedVersion!=='33333333-3333-4333-8333-333333333333')throw Error('STALE VERSION');source.status='APPROVED';source.rawPoints=20;source.version='44444444-4444-4444-8444-444444444444';return source;}
    };
  })()`);
  const wait = async (expression) => {
    for (let i = 0; i < 100; i++) {
      if (await evaluate(expression)) return;
      await delay(70);
    }
    throw Error(
      'Referral UI timeout: ' + expression + ' ' + (await evaluate('document.body.textContent')),
    );
  };
  await evaluate(
    `[...document.querySelectorAll('main button')].find(e=>e.textContent.trim()==='Tất cả').click()`,
  );
  await wait(`document.querySelector('main').textContent.includes('Chứng chỉ qua CLB')`);
  await evaluate(
    `(()=>{const e=document.querySelector('select[aria-label="Hình thức gửi hồ sơ"]');Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype,'value').set.call(e,'CLUB');e.dispatchEvent(new Event('change',{bubbles:true}));})()`,
  );
  await wait(
    `window.__calls.some(c=>c.key==='studentAffairs.declarations.list'&&c.args[0].viaClub===true)`,
  );
  await evaluate(
    `[...document.querySelectorAll('main tbody tr')].find(row=>row.textContent.includes('Chứng chỉ qua CLB')).querySelector('button').click()`,
  );
  await wait(`document.body.textContent.includes('Lỗi tải hồ sơ kiểm thử')`);
  assert.equal(
    await evaluate(`document.querySelector('dialog button[type="submit"]').disabled`),
    true,
  );
  await evaluate(
    `window.__failDetail=false;[...document.querySelectorAll('dialog button')].find(e=>e.textContent.trim()==='Thử lại').click()`,
  );
  await wait(`typeof window.__resolveDetail==='function'`);
  assert.equal(
    await evaluate(`document.querySelector('dialog button[type="submit"]').disabled`),
    true,
  );
  await evaluate(`window.__resolveDetail()`);
  await wait(`document.querySelector('dialog').textContent.includes('CLB đã kiểm tra bản gốc')`);
  await evaluate(
    `(()=>{const e=document.querySelector('dialog textarea');Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype,'value').set.call(e,'CTSV kiểm tra độc lập, minh chứng và kết quả phù hợp.');e.dispatchEvent(new Event('input',{bubbles:true}));})()`,
  );
  await wait(`!document.querySelector('dialog button[type="submit"]').disabled`);
  await evaluate(
    `(()=>{const form=document.querySelector('dialog form');form.dispatchEvent(new Event('submit',{bubbles:true,cancelable:true}));form.dispatchEvent(new Event('submit',{bubbles:true,cancelable:true}));})()`,
  );
  await wait(`document.body.textContent.includes('Lỗi thẩm định kiểm thử')`);
  assert.equal(
    await evaluate(`window.__calls.filter(c=>c.key==='studentAffairs.declarations.review').length`),
    1,
  );
  await evaluate(
    `window.__failReview=false;document.querySelector('dialog button[type="submit"]').click()`,
  );
  await wait(`!document.querySelector('dialog[open]')`);
  const receipts = await evaluate(
    `window.__calls.filter(c=>c.key==='studentAffairs.declarations.review').map(c=>c.args[1])`,
  );
  assert.equal(receipts.length, 2);
  assert.ok(
    receipts.every(
      (body) =>
        body.expectedVersion === '33333333-3333-4333-8333-333333333333' &&
        body.verifiedAttributes &&
        !('rawPoints' in body),
    ),
  );
  assert.equal(await evaluate(`window.__referralRow.status`), 'APPROVED');
  for (const width of [1280, 375, 320]) {
    await call('Emulation.setDeviceMetricsOverride', {
      width,
      height: 1000,
      deviceScaleFactor: 1,
      mobile: false,
    });
    await delay(80);
    assert.ok(
      await evaluate('document.documentElement.scrollWidth<=innerWidth'),
      'Admin referral overflow ' + width,
    );
    if (width === 375 && directory) {
      const shot = await call('Page.captureScreenshot', { format: 'png' });
      await fs.writeFile(
        path.join(directory, 'declaration-referral-375.png'),
        Buffer.from(shot.data, 'base64'),
      );
    }
  }
  console.log(
    'PASS Admin referral filter, real detail version, private evidence context, detail failure/retry, duplicate guard, final review failure/retry and responsive layout',
  );
}
