import test from 'node:test';
import assert from 'node:assert/strict';
import rawWorker from '../cf_worker.js';
const worker=rawWorker?.fetch?rawWorker:rawWorker.default;

test('gateway keeps ambiguous paths and credentials on the configured upstream',async()=>{
  const original=globalThis.fetch;
  const forwarded=[];
  globalThis.fetch=async request=>{forwarded.push(request);return new Response('ok');};
  try {
    for(const path of ['//external.invalid/collect','///external.invalid/a','/%2f%2fexternal.invalid/a','/api/calendar?next=https://external.invalid']) {
      const response=await worker.fetch(new Request('https://site.example'+path,{headers:{Authorization:'Bearer fixture',Cookie:'fixture=1'}}),{UPSTREAM_ORIGIN:'https://upstream.example'},{});
      assert.equal(response.status,200);
      const request=forwarded.at(-1);
      assert.equal(new URL(request.url).origin,'https://upstream.example');
      assert.equal(new URL(request.url).pathname,new URL('https://site.example'+path).pathname);
      assert.equal(request.redirect,'manual');
    }
  } finally {globalThis.fetch=original;}
});
