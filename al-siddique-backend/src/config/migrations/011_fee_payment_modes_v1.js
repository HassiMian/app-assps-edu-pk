'use strict'
const {pool}=require('../database')
const MODES=['cash','online','bank','jazzcash','easypaisa','card','other']
async function up() {
 const client=await pool.connect()
 try {
  await client.query('BEGIN')
  const result=await client.query(
   "SELECT pg_get_constraintdef(oid) AS definition FROM pg_constraint WHERE conrelid='public.fee_challans'::regclass AND conname='fee_challans_payment_mode_check' AND contype='c'"
  )
  if(result.rowCount!==1)throw Error('FEE_PAYMENT_MODE_CONSTRAINT_MISSING')
  const invalid=await client.query('SELECT DISTINCT payment_mode FROM fee_challans WHERE payment_mode IS NOT NULL AND NOT (payment_mode=ANY($1::text[])) LIMIT 1',[MODES])
  if(invalid.rowCount)throw Error('FEE_PAYMENT_MODE_EXISTING_VALUE_REQUIRES_REVIEW')
  const definition=result.rows[0].definition
  // Idempotent while refusing to modify an unrecognized constraint.
  if(!definition.includes("'bank'") || !definition.includes("'card'") || !definition.includes("'other'")) {
   if(!definition.includes("'cash'") || !definition.includes("'online'") ||
      !definition.includes("'jazzcash'") || !definition.includes("'easypaisa'"))
    throw Error('FEE_PAYMENT_MODE_PREVIOUS_CONTRACT_UNKNOWN')
   await client.query("ALTER TABLE fee_challans DROP CONSTRAINT fee_challans_payment_mode_check")
   await client.query(`ALTER TABLE fee_challans ADD CONSTRAINT fee_challans_payment_mode_check
     CHECK (payment_mode IS NULL OR payment_mode IN ('cash','online','bank','jazzcash','easypaisa','card','other'))`)
  }
  await client.query('COMMIT')
  console.log('FEE_PAYMENT_MODES_V1_READY')
 } catch(err) {
  await client.query('ROLLBACK').catch(()=>{})
  throw err
 } finally {
  client.release()
 }
}
module.exports={up,MODES}
