'use strict'
const crypto=require('node:crypto')

const POSITIVE_ID=/^[1-9][0-9]{0,11}$/
const DB_LOGIN=/^[A-Za-z_][A-Za-z0-9_]*$/

function signedTenantEnvelope({tenantId,tenantKey='',actorId,loginRole,transactionId,secret,issuedAt=Math.floor(Date.now()/1000)}) {
  const tenant=String(tenantId ?? '')
  const key=String(tenantKey ?? '')
  const actor=String(actorId ?? '')
  const login=String(loginRole||'')
  const txid=String(transactionId||'')
  if(!POSITIVE_ID.test(tenant) || !POSITIVE_ID.test(actor) ||
     !DB_LOGIN.test(login) || key.length>200 || !POSITIVE_ID.test(txid) ||
     typeof secret!=='string'||secret.length<32) {
    const err=new Error('Signed tenant context requires trusted positive IDs and protected secret')
    err.code='CORE_SIGNED_CONTEXT_REQUIRED'
    throw err
  }
  const expires=String(issuedAt+60)
  const nonce=crypto.randomBytes(16).toString('hex')
  const payload=[tenant,key,login,actor,expires,nonce,txid].join('|')
  const signature=crypto.createHmac('sha256',secret).update(payload,'utf8').digest('hex')
  return {tenant,tenantKey:key,actor,expires,nonce,signature}
}

// To be called only inside an active transaction, with the application already
// validated JWT signature and its actual database user-school identity.
// Not a public request middleware; no role or school is accepted from headers.
async function applySignedTenantContext(client,{tenantId,tenantKey='',actorId,secret,expectedLogin}) {
  const context=await client.query('SELECT session_user AS login_name, txid_current()::text AS transaction_id')
  const {login_name:login,transaction_id:txid}=context.rows?.[0]||{}
  if(!login || login!==expectedLogin) {
    const err=new Error('Signed context database login mismatch')
    err.code='CORE_SIGNED_LOGIN_MISMATCH'
    throw err
  }
  const e=signedTenantEnvelope({tenantId,tenantKey,actorId,loginRole:login,transactionId:txid,secret})
  await client.query(
    "SELECT set_config('app.rls_enabled','true',true),set_config('app.is_super_admin','false',true),set_config('app.tenant_id',$1,true),set_config('app.tenant_key',$2,true),set_config('app.core_actor_id',$3,true),set_config('app.core_sig_exp',$4,true),set_config('app.core_sig_nonce',$5,true),set_config('app.core_sig',$6,true)",
    [e.tenant,e.tenantKey,e.actor,e.expires,e.nonce,e.signature]
  )
  return {tenantId:e.tenant,actorId:e.actor}
}
module.exports={signedTenantEnvelope,applySignedTenantContext}
