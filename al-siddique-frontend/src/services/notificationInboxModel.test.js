
import test from 'node:test'
import assert from 'node:assert/strict'
import {isNotificationRecent,notificationDismissKey,readDismissedIds,persistDismissedIds,presentInbox,sortNotificationEvents} from './notificationInboxModel.js'
const now=Date.parse('2026-09-30T15:00:00Z')
const rows=[
  {id:1,title:'Presidential Dispatch',sent_at:'2026-01-01T08:00:00Z',read_at:'2026-09-30T14:59:00Z'},
  {id:2,title:'New attendance entry',sent_at:'2026-09-30T13:00:00Z'},
  {id:3,title:'Yesterday fee notice',sent_at:'2026-09-29T11:00:00Z'},
]
test('recent Bell excludes old Presidential Dispatch, while preserving history',()=>{
 const original=JSON.stringify(rows)
 const {recent,history}=presentInbox(rows,new Set(),now)
 assert.deepEqual(recent.map(x=>x.id),[2,3])
 assert.deepEqual(history.map(x=>x.id),[1])
 assert.equal(isNotificationRecent(rows[0],30,now),false)
 assert.equal(JSON.stringify(rows),original,'never mutate or delete source records')
})
test('reading an old notification does not move it above newly-sent activity',()=>{
 assert.deepEqual(sortNotificationEvents(rows).map(x=>x.id),[2,3,1])
})
test('dismiss remains scoped to school and signed-in person, persists and never alters inbox data',()=>{
 const memory=new Map()
 const storage={getItem:key=>memory.get(key)||null,setItem:(key,value)=>memory.set(key,value)}
 const principal=notificationDismissKey({id:7,school_id:1})
 const other=notificationDismissKey({id:8,school_id:1})
 const schoolTwo=notificationDismissKey({id:7,school_id:2})
 persistDismissedIds(principal,new Set(['2']),storage)
 assert.deepEqual([...readDismissedIds(principal,storage)],['2'])
 assert.equal(readDismissedIds(other,storage).size,0)
 assert.equal(readDismissedIds(schoolTwo,storage).size,0)
 const visible=presentInbox(rows,readDismissedIds(principal,storage),now)
 assert.deepEqual(visible.recent.map(x=>x.id),[3])
 assert.equal(rows.length,3)
})
test('undated/invalid records are historical, not fabricated into new alerts',()=>{
 assert.equal(isNotificationRecent({id:99,title:'Legacy'},30,now),false)
 assert.equal(presentInbox([{id:99,title:'Legacy'}],new Set(),now).history.length,1)
})
