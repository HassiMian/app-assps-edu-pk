const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
test('growing signed catalog requires every FORCE-RLS table and exact school/tenant policy',()=>{
 const source=fs.readFileSync(path.resolve(__dirname,'../config/database.js'),'utf8');
 assert.match(source,/state\.forced < 77/);
 assert.match(source,/state\.enabled !== state\.forced/);
 assert.match(source,/state\.signed !== state\.forced/);
 assert.match(source,/state\.signed_school < 73/);
 assert.match(source,/state\.signed_tenant < 4/);
 assert.match(source,/state\.signed_school \+ state\.signed_tenant !== state\.signed/);
 assert.doesNotMatch(source,/state\.forced !== 77/);
});
