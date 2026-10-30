const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
test('promotion signed endpoint routes to live identity backend, not stale 5091',()=>{
 const source=fs.readFileSync(path.resolve(__dirname,'assps-marks-only-locations.conf'),'utf8');
 const m=source.match(/location = \/api\/students\/bulk-class-assignment \{([\s\S]*?)\n\}/);
 assert.ok(m,'exact protected endpoint is declared');
 assert.match(m[1],/if \(\$request_method != POST\) \{ return 405;/);
 assert.match(m[1],/proxy_pass http:\/\/127\.0\.0\.1:5000;/);
 assert.doesNotMatch(m[1],/:5091/);
});
