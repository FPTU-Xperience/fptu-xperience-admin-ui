import assert from 'node:assert/strict';

export async function checkGuidedHelp({ open, evaluate, delay, call }) {
  for (const width of [375, 1280]) {
    await open('/ctsv/work?view=actionable', 'staff', width);
    const before = await evaluate('window.__calls.length');
    await evaluate(`document.querySelector('[aria-label="Hướng dẫn sử dụng"]').click()`);
    for (let i = 0; i < 40 && !(await evaluate('!!document.querySelector(".driver-popover")')); i++)
      await delay(100);
    assert.ok(await evaluate('!!document.querySelector(".web-guide-popover")'));
    assert.ok(
      await evaluate(
        `document.querySelector('.driver-popover-title').textContent.includes('Hướng dẫn Công tác sinh viên')`,
      ),
    );
    assert.ok(
      await evaluate(
        `(()=>{const r=document.querySelector('.driver-popover').getBoundingClientRect();return r.left>=0&&r.right<=innerWidth+1})()`,
      ),
    );
    await evaluate(`document.querySelector('.driver-popover-next-btn').click()`);
    await delay(300);
    assert.ok(
      await evaluate(
        `!document.querySelector('.driver-popover-title').textContent.includes('Hướng dẫn Công tác sinh viên')`,
      ),
    );
    await call('Input.dispatchKeyEvent', {
      type: 'keyUp',
      key: 'Escape',
      code: 'Escape',
      windowsVirtualKeyCode: 27,
    });
    await delay(300);
    assert.equal(await evaluate('!!document.querySelector(".driver-overlay")'), false);
    assert.equal(
      await evaluate(`document.activeElement?.getAttribute('aria-label')`),
      'Hướng dẫn sử dụng',
      JSON.stringify(
        await evaluate(
          `(()=>{const b=document.querySelector('[aria-label="Hướng dẫn sử dụng"]');return {active:{tag:document.activeElement?.tagName,cls:document.activeElement?.className},button:{exists:!!b,disabled:b?.disabled,inert:!!b?.closest('[inert]'),rect:b?.getBoundingClientRect().toJSON()},body:document.body.className}})()`,
        ),
      ),
    );
    await evaluate(`document.querySelector('[aria-label="Hướng dẫn sử dụng"]').click()`);
    await delay(300);
    assert.ok(await evaluate('!!document.querySelector(".driver-overlay")'));
    await evaluate(`location.hash='#/ctsv/clubs?view=registry'`);
    await delay(500);
    assert.equal(await evaluate('!!document.querySelector(".driver-overlay")'), false);
    assert.ok(
      await evaluate(
        `window.__calls.slice(${before}).every(x=>!/(create|update|delete|approve|reject|submit|commit|save)/i.test(x.key))`,
      ),
    );
  }
  console.log(
    'PASS guided help open/next/Escape/focus/replay/route cleanup at mobile and desktop; no business writes',
  );
}
