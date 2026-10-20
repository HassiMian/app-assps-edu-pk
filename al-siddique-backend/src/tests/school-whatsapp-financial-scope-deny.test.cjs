'use strict'
// Pure offline school-channel regression; never connects to WhatsApp, MT5 or DB.
const test=require('node:test')
const assert=require('node:assert/strict')
const fs=require('node:fs')
const path=require('node:path')
const {isFinancialMarketRequest,formatSchoolScopeRestriction}=require('../services/whatsapp/schoolChannelGuard.cjs')
const source=fs.readFileSync(path.join(__dirname,'../routes/whatsappRoutes.js'),'utf8')

test('market execution and trading terms are rejected for every school sender',()=>{
 for(const prompt of ['MT5','ARGUS', 'forex analysis','XAUUSD','EURUSD',
  'trading account', 'trade','stop loss','take profit','lot size','broker position',
  'gold setup do','market signal','market intelligence','stock market','emergency close']){
  assert.equal(isFinancialMarketRequest(prompt),true,prompt)
 }
})
test('normal school operations and fee questions are not blocked by market guard',()=>{
 for(const message of ['Starter English diary','Grade Nine timetable','school fee ledger',
  'Nursery attendance','Please buy new school notebooks','School admission query']){
  assert.equal(isFinancialMarketRequest(message),false,message)
 }
})
test('whatsapp school channel checks before primary AND fallback cognitive handlers',()=>{
 const part=source.slice(source.indexOf('for (const { msgId, from, msg } of pendingMessages)'))
 const gate=part.indexOf('if (isFinancialMarketRequest(text))')
 const core=part.indexOf('jarvisCore.processMessage(from, text)')
 const fallback=part.indexOf('whatsappRouter.processMessage(from, text)')
 assert.ok(gate>=0 && gate<core && core<fallback)
 assert.ok(part.slice(gate,core).includes('continue'))
 assert.match(part.slice(gate,core),/formatSchoolScopeRestriction\(\)/)
})
test('mounted school route includes no legacy broker execution or scanner startup',()=>{
 for(const prohibited of [/argusMt5Orchestrator/,/argusContinuousScanner/,/\.executeTrade\s*\(/,/\.closeAllPositions\s*\(/,/MetaTrader5/]){
  assert.doesNotMatch(source,prohibited)
 }
})
test('rejection is explicit, without personalized trading recommendations',()=>{
 const msg=formatSchoolScopeRestriction('ENGLISH')
 assert.match(msg,/school operations/i)
 assert.match(msg,/trading intelligence is not available/i)
})
