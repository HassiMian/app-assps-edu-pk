#!/usr/bin/env node
/**
 * Fail-closed Daily Diary source & built-graph preservation check.
 * Designed for frontend deployment only. No hard-coded release SHA.
 * This catches regression to legacy Diary despite successful builds.
 */
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const args=process.argv.slice(2);
const rootIndex=args.indexOf('--root');
const root=rootIndex>=0 ? path.resolve(args[rootIndex+1] || '') :
  path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const verifyDist=args.includes('--dist');
const frontend=path.join(root,'al-siddique-frontend');
const failures=[];
const read=(relative)=>{
  const file=path.join(frontend,relative);
  try{return fs.readFileSync(file,'utf8');}
  catch{failures.push('Missing required file: '+relative);return '';}
};
const requireFeatures=(label,contents,features)=>{
  for(const phrase of features){
    if(!contents.includes(phrase))failures.push(label+' missing protected feature '+JSON.stringify(phrase));
  }
};

const jsx=read('src/Modules/Paper-Generator/DailyDiaryWorkspace.jsx');
const css=read('src/Modules/Paper-Generator/DailyDiaryWorkspace.css');
const paper=read('src/Modules/Paper-Generator/PaperGenerator.jsx');
requireFeatures('Daily Diary source',jsx,[
  'STUDIO_COLORS','studioColorId','dd-card-studio','tableHeaderFontSize',
  'tableHeaderBold','dd-print-frame','rowHeightMm','fontStyleId','Save Diary',
  'Print / PDF',
]);
requireFeatures('Daily Diary CSS',css,[
  '.dd-card-studio','.dd-premium-calendar','.dd-studio-colors','.dd-table-head',
]);
requireFeatures('Paper Generator route',paper,['DailyDiaryWorkspace']);

if(verifyDist){
  const assets=path.join(frontend,'dist','assets');
  const files=fs.existsSync(assets)?fs.readdirSync(assets):[];
  const diaryJs=files.filter(f=>/^DailyDiaryWorkspace-.*\.js$/.test(f));
  const diaryCss=files.filter(f=>/^DailyDiaryWorkspace-.*\.css$/.test(f));
  if(diaryJs.length!==1)failures.push('Expected exactly one compiled DailyDiaryWorkspace JS module, got '+diaryJs.length);
  if(diaryCss.length<1)failures.push('No compiled DailyDiaryWorkspace CSS module');
  if(diaryJs.length===1){
    const js=fs.readFileSync(path.join(assets,diaryJs[0]),'utf8');
    requireFeatures('Built Daily Diary chunk',js,[
      'studioColorId','dd-card-studio','Table Headings','dd-print-frame',
      'Jameel Noori Nastaleeq',
    ]);
    const linked=files.filter(f=>f.endsWith('.js')&&f!==diaryJs[0]).some(f=>
      fs.readFileSync(path.join(assets,f),'utf8').includes(diaryJs[0]));
    if(!linked)failures.push('Daily Diary chunk exists but is not reachable from a parent JS chunk (stale orphan risk)');
  }
}
if(failures.length){
  console.error('[ASSPS DIARY GUARD] BLOCKED: '+failures.length+' missing protections');
  for(const item of failures)console.error('  - '+item);
  console.error('Deploy only after reconciliation with the live A195 Diary Controller & Print features.');
  process.exitCode=3;
} else {
  console.log('[ASSPS DIARY GUARD] PASS: '+(verifyDist?'built module & reachable chunk':'source control contract')+' preserved');
}
