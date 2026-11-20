/* ASSPS A334 canonical dual-format parser; unstructured content gets no speculative rendering */
const enLabels=['A','B','C','D'];
const urLabels=['الف','ب','ج','د'];
const txt=x=>String(x??'').trim();
const optionPairs=(raw,language)=>{
 const value=txt(raw),re=language==='en'?/\(([A-D])\)\s*/g:/\((الف|ب|ج|د)\)\s*/g;
 const a=[...value.matchAll(re)];
 return a.map((m,i)=>({label:m[1],text:value.slice(m.index+m[0].length,a[i+1]?.index??value.length).trim()}));
};
export const optionColumnCount=options=>{
 const v=options.map(x=>({en:txt(x.en),ur:txt(x.ur)}));
 if(v.every(x=>x.en.length<=11&&x.ur.length<=13&&x.en.length+x.ur.length<=23))return 4;
 return v.some(x=>x.en.length>80||x.ur.length>95)?1:2;
};
function parseTable(content){
 const rows=content.split(/\r?\n/).filter(x=>/^\s*\|/.test(x)&&!(/^\s*\|[\s:|-]+\|/.test(x)))
  .map(x=>x.slice(x.indexOf('|')+1,x.lastIndexOf('|')).split('|').map(txt));
 if(rows.length<4||rows[0].length!==2||rows[0][0].toUpperCase()!=='ENGLISH'||rows[0][1]!=='اردو')return null;
 const start=(rows.length-1)%3===0?1:((rows.length-2)%3===0?2:-1);
 if(start<0)return null;
 const items=[];
 for(let i=start;i<rows.length;i+=3){
  if(!rows[i]||!rows[i+1]||!rows[i+2])return null;
  const en=rows[i][0].match(/^(\d+)[.)]\s*(.+)$/),ur=rows[i][1].match(/^(\d+)[۔.)]\s*(.+)$/);
  if(!en||!ur||Number(en[1])!==Number(ur[1]))return null;
  const options=[];
  for(let j=1;j<=2;j++){
   const e=optionPairs(rows[i+j][0],'en'),u=optionPairs(rows[i+j][1],'ur');
   if(e.length!==2||u.length!==2)return null;
   for(let k=0;k<2;k++){
    const index=options.length;
    if(e[k].label!==enLabels[index]||u[k].label!==urLabels[index])return null;
    options.push({id:enLabels[index],en:e[k].text,ur:u[k].text});
   }
  }
  if(options.length!==4||options.some(o=>!o.en||!o.ur))return null;
  items.push({id:'q'+en[1],number:Number(en[1]),en:en[2],ur:ur[2],options});
 }
 return items.length?{kind:'mcq',items}:null;
}
function parseSubjective(content){
 const rows=content.split(/\r?\n/).map(txt).filter(Boolean);
 const matches=rows.map(x=>x.match(/^(\d+)[.)]\s+(.+?)\s+\/\s+(.+)$/));
 if(rows.length&&matches.every(Boolean))return {kind:'short',items:matches.map(m=>({id:'q'+m[1],number:Number(m[1]),en:m[2],ur:m[3]}))};
 if(rows.length===3&&/^\s*OR\s*\/\s*یا\s*$/i.test(rows[1])){
  const x=[rows[0],rows[2]].map(r=>r.match(/^\(([AB])\)\s+(.+?)\s+\/\s+(.+)$/));
  if(x.every(Boolean))return {kind:'long',items:x.map(m=>({id:m[1],number:m[1],en:m[2],ur:m[3]}))};
 }
 return null;
}
export function parseCompactDual(question){
 if(question?.medium!=='dual')return null;
 const content=txt(question?.content);
 if(!content)return null;
 return parseTable(content)||parseSubjective(content);
}
export function serializeCompactDual(doc){
 if(doc?.kind==='mcq'){
  const lines=['| English | اردو |','| --- | --- |'];
  doc.items.forEach(q=>{
   lines.push('| '+q.number+'. '+q.en+' | '+q.number+'۔ '+q.ur+' |');
   for(let i=0;i<4;i+=2){
    const a=q.options[i],b=q.options[i+1];
    if(!a||!b||a.id!==enLabels[i]||b.id!==enLabels[i+1])throw Error('Invalid A-D option identity');
    lines.push('| ('+a.id+') '+a.en+'    ('+b.id+') '+b.en+' | ('+urLabels[i]+') '+a.ur+'    ('+urLabels[i+1]+') '+b.ur+' |');
   }
  });
  return lines.join('\n');
 }
 if(doc?.kind==='short')return doc.items.map(q=>q.number+'. '+q.en+' / '+q.ur).join('\n');
 if(doc?.kind==='long')return doc.items.map(q=>'('+q.number+') '+q.en+' / '+q.ur).join('\nOR / یا\n');
 throw Error('Unsupported dual document');
}
