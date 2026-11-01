'use strict'
// Never put a legacy employee portal password in a JSON API response.
// Authentication credentials belong exclusively to the users password-hash store.
function employeePublicRecord(row){
 if(!row||typeof row!=='object')return row
 const {portal_password,...safe}=row
 return safe
}
module.exports={employeePublicRecord}
