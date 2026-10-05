const {createHash}=require('node:crypto');const fs=require('node:fs');const path=require('node:path');
const ROOT=path.join(__dirname,'saasReviewedContract','shadow');
const PINS=Object.freeze({
 'core/PaperDocumentShadow.js':'313e55c097ee4ee8ed42fb831305abaa17527d8fbc0b6bb73fb00df403d128a8',
 'migration/classifyPaperDocument.js':'e44a340ee636eb7729dd35f72aa90c208de328c38e8ead14a71ca97400ac1c8b',
 'migration/hashUtils.js':'8986be17b259352ef05c2f0031c1ba7243de9b5c81dc6314315726690598ba89',
})
function assertNativePolicyPinned(){for(const [rel,expected] of Object.entries(PINS)){const actual=createHash('sha256').update(fs.readFileSync(path.join(ROOT,rel))).digest('hex');if(actual!==expected)throw Error(`Reviewed native presentation contract hash changed: ${rel}`)}return true}
async function reviewNativePresentation(source){assertNativePolicyPinned();const mod=await import(`file://${path.join(ROOT,'core','PaperDocumentShadow.js')}`);const shadow=mod.createPaperDocumentShadow(source);const check=mod.assertNativePresentationContract(source,shadow);return {supported:true,sourceFamily:shadow.sourceFamily||shadow.sourceType||null,renderPolicy:shadow.appearance?.renderPolicy||mod.SOURCE_NATIVE_RENDER_ONLY,renderer:check.renderer,sourceHashSha256:check.sourceHashSha256,unchanged:check.unchanged===true,cutoverReady:check.cutoverReady===true,appearanceHashSha256:shadow.appearanceHashSha256}}
module.exports={reviewNativePresentation,assertNativePolicyPinned,PINS}
