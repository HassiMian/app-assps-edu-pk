import test from 'node:test'
import assert from 'node:assert/strict'
import { webcrypto } from 'node:crypto'
import { recoveryActorScope, recoverySourceKey, inspectPaperRecoverySources, encryptedLegacyPaperBackup, verifyEncryptedLegacyPaperBackup, sameAuthorizedRecoveryActor } from './legacyPaperRecovery.js'
class Store { constructor(){this.values=new Map()} getItem(k){return this.values.has(k)?this.values.get(k):null} setItem(k,v){this.values.set(k,String(v))} removeItem(k){this.values.delete(k)} }
const user={role:'principal',id:5,school_id:1}
function fixture(){const localStorage=new Store(),sessionStorage=new Store();localStorage.setItem('al_siddique_paper_store',JSON.stringify({savedPapers:[{id:'p1',name:'Urdu paper',questions:[{text:'original question'}]},{id:'p2',name:'English paper'}],paperSettings:{privateConfiguration:'DO_NOT_EXPORT'}}));return {localStorage,sessionStorage}}
const config=(storage,other={})=>({user,source:'legacy-local',passphrase:'correct-horse-battery-staple',confirmedOwner:true,storage,cryptography:webcrypto,now:'2026-11-06T02:20:00Z',...other})
const from64=s=>Uint8Array.from(atob(s),x=>x.charCodeAt(0))
async function decrypt(backup,password){const t=new TextEncoder();const material=await webcrypto.subtle.importKey('raw',t.encode(password),'PBKDF2',false,['deriveKey']);const key=await webcrypto.subtle.deriveKey({name:'PBKDF2',salt:from64(backup.saltBase64),iterations:backup.iterations,hash:'SHA-256'},material,{name:'AES-GCM',length:256},false,['decrypt']);const result=await webcrypto.subtle.decrypt({name:'AES-GCM',iv:from64(backup.ivBase64)},key,from64(backup.ciphertextBase64));return JSON.parse(new TextDecoder().decode(result))}
test('school principal scope and exact source paths',()=>{assert.equal(recoveryActorScope(user),'school-1');assert.equal(recoverySourceKey('legacy-local',user),'al_siddique_paper_store');assert.equal(recoverySourceKey('current-local',user),'al_siddique_paper_store__school-1')})
test('teachers and unassigned users cannot inspect',()=>{const s=fixture();for(const u of [{...user,role:'teacher'},{...user,school_id:null}])assert.equal(inspectPaperRecoverySources({user:u,storage:s}).authorized,false)})
test('inventory is read only, and never reveals paper text or secret settings',()=>{const s=fixture();const before=s.localStorage.getItem('al_siddique_paper_store');const result=inspectPaperRecoverySources({user,storage:s});assert.equal(result.sources[0].count,2);assert.equal(result.sources[1].state,'absent');assert.equal(result.sources[2].count,0);assert.ok(!JSON.stringify(result).includes('Urdu paper'));assert.equal(s.localStorage.getItem('al_siddique_paper_store'),before)})
test('corrupt legacy JSON is flagged, not mutated',()=>{const s=fixture();s.localStorage.setItem('al_siddique_paper_store','{broken');assert.equal(inspectPaperRecoverySources({user,storage:s}).sources[0].state,'unreadable-json');assert.equal(s.localStorage.getItem('al_siddique_paper_store'),'{broken')})
test('ownership confirmation is necessary',async()=>{await assert.rejects(encryptedLegacyPaperBackup(config(fixture(),{confirmedOwner:false})),/SCHOOL_OWNERSHIP/)})
test('export only accepts strong passphrases',async()=>{await assert.rejects(encryptedLegacyPaperBackup(config(fixture(),{passphrase:'small'})),/PASSPHRASE/)})
test('AES-GCM authenticated backup preserves paper text, excludes unrelated settings',async()=>{const s=fixture();const before=s.localStorage.getItem('al_siddique_paper_store');const backup=await encryptedLegacyPaperBackup(config(s));assert.equal(backup.count,2);assert.equal(backup.serverUploaded,false);assert.ok(!JSON.stringify(backup).includes('Urdu paper'));const clear=await decrypt(backup,'correct-horse-battery-staple');assert.equal(clear.papers[0].questions[0].text,'original question');assert.ok(!JSON.stringify(clear).includes('DO_NOT_EXPORT'));assert.equal(s.localStorage.getItem('al_siddique_paper_store'),before)})
test('incorrect decryption password cannot recover the backup',async()=>{const b=await encryptedLegacyPaperBackup(config(fixture()));await assert.rejects(decrypt(b,'different-strong-password'))})
test('fresh exports use independent random salt and IV',async()=>{const s=fixture();const a=await encryptedLegacyPaperBackup(config(s));const b=await encryptedLegacyPaperBackup(config(s));assert.notEqual(a.ivBase64,b.ivBase64);assert.notEqual(a.saltBase64,b.saltBase64)})
test('session-only recovery is separate from local recovery',async()=>{const s=fixture();s.sessionStorage.setItem('al_siddique_paper_store',JSON.stringify({savedPapers:[{id:'only-session'}]}));const b=await encryptedLegacyPaperBackup(config(s,{source:'legacy-session'}));assert.equal(b.count,1);const clear=await decrypt(b,'correct-horse-battery-staple');assert.equal(clear.papers[0].id,'only-session')})
test('unknown source cannot export another tenant key',async()=>{await assert.rejects(encryptedLegacyPaperBackup(config(fixture(),{source:'other-tenant'})),/PAPER_SOURCE_UNAVAILABLE/)})
test('no secure WebCrypto means no plaintext fallback',async()=>{await assert.rejects(encryptedLegacyPaperBackup(config(fixture(),{cryptography:null})),/SECURE_BROWSER_REQUIRED/)})
test('freshly server-verified actor identity must match user, school and tenant scope',()=>{
 assert.equal(sameAuthorizedRecoveryActor(user,{...user}),true)
 assert.equal(sameAuthorizedRecoveryActor(user,{...user,id:6}),false)
 assert.equal(sameAuthorizedRecoveryActor(user,{...user,school_id:2}),false)
 assert.equal(sameAuthorizedRecoveryActor(user,{...user,role:'teacher'}),false)
 assert.equal(sameAuthorizedRecoveryActor(user,{...user,tenant_id:'other'}),false)
})
test('offline verifier independently authenticates a valid encrypted paper backup',async()=>{
 const backup=await encryptedLegacyPaperBackup(config(fixture()))
 const result=await verifyEncryptedLegacyPaperBackup({user,backup,passphrase:config(fixture()).passphrase,cryptography:webcrypto})
 assert.equal(result.verified,true);assert.equal(result.paperCount,2)
 assert.equal(result.fileWasUploaded,false);assert.equal(result.papersWereImported,false)
})
test('offline verifier rejects incorrect passphrase and tampered ciphertext',async()=>{
 const backup=await encryptedLegacyPaperBackup(config(fixture()))
 const settings={user,backup,passphrase:'correct-horse-battery-staple',cryptography:webcrypto}
 await assert.rejects(verifyEncryptedLegacyPaperBackup({...settings,passphrase:'incorrect-long-password'}),/BACKUP_PASSPHRASE_OR_INTEGRITY_INVALID/)
 await assert.rejects(verifyEncryptedLegacyPaperBackup({...settings,backup:{...backup,ciphertextBase64:'AAAA'+backup.ciphertextBase64.slice(4)}}),/BACKUP_PASSPHRASE_OR_INTEGRITY_INVALID/)
})
test('offline verifier refuses other-school backups without exposing plaintext',async()=>{
 const backup=await encryptedLegacyPaperBackup(config(fixture()))
 await assert.rejects(verifyEncryptedLegacyPaperBackup({user:{...user,school_id:2},backup,passphrase:'correct-horse-battery-staple',cryptography:webcrypto}),/BACKUP_SCHOOL_SCOPE_MISMATCH/)
})
test('offline verifier rejects edited paper counts and unsupported KDF settings',async()=>{
 const b=await encryptedLegacyPaperBackup(config(fixture()))
 const settings={user,backup:b,passphrase:'correct-horse-battery-staple',cryptography:webcrypto}
 await assert.rejects(verifyEncryptedLegacyPaperBackup({...settings,backup:{...b,count:99}}),/BACKUP_CONTENT_SCOPE_OR_COUNT_MISMATCH/)
 await assert.rejects(verifyEncryptedLegacyPaperBackup({...settings,backup:{...b,iterations:1}}),/UNSUPPORTED_ENCRYPTED_BACKUP/)
})
