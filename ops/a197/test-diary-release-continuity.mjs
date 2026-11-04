import assert from 'node:assert/strict';
import {test} from 'node:test';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';

const guard=path.join(path.dirname(fileURLToPath(import.meta.url)),'check-diary-release-continuity.mjs');
test('A197 fail-closed source and bundled Diary controller gate',()=>{
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'assps-diary-a197-'));
  try{
    const front=path.join(root,'al-siddique-frontend');
    const jsx=path.join(front,'src/Modules/Paper-Generator/DailyDiaryWorkspace.jsx');
    const css=path.join(front,'src/Modules/Paper-Generator/DailyDiaryWorkspace.css');
    const route=path.join(front,'src/Modules/Paper-Generator/PaperGenerator.jsx');
    const assets=path.join(front,'dist/assets');
    for(const file of [jsx,css,route])fs.mkdirSync(path.dirname(file),{recursive:true});
    fs.mkdirSync(assets,{recursive:true});
    fs.writeFileSync(jsx,'STUDIO_COLORS studioColorId dd-card-studio tableHeaderFontSize tableHeaderBold dd-print-frame rowHeightMm fontStyleId Save Diary Print / PDF');
    fs.writeFileSync(css,'.dd-card-studio .dd-premium-calendar .dd-studio-colors .dd-table-head');
    fs.writeFileSync(route,'DailyDiaryWorkspace');
    const diary='DailyDiaryWorkspace-A197.js';
    fs.writeFileSync(path.join(assets,diary),'studioColorId dd-card-studio Table Headings dd-print-frame Jameel Noori Nastaleeq');
    fs.writeFileSync(path.join(assets,'DailyDiaryWorkspace-A197.css'),'.dd-card-studio{}');
    fs.writeFileSync(path.join(assets,'PaperGenerator-A197.js'),'import("./'+diary+'")');
    const run=(extra=[])=>spawnSync(process.execPath,[guard,'--root',root,...extra],{encoding:'utf8'});
    assert.equal(run().status,0,'Source guard should pass');
    assert.equal(run(['--dist']).status,0,'Reachable compiled Diary guard should pass');
    fs.writeFileSync(route,'LegacyDailyDiaryFeature');
    assert.equal(run().status,3,'Legacy route should be blocked');
    fs.writeFileSync(route,'DailyDiaryWorkspace');
    fs.writeFileSync(path.join(assets,'PaperGenerator-A197.js'),'legacy-module');
    assert.equal(run(['--dist']).status,3,'Orphaned Diary chunk should be blocked');
  } finally {
    fs.rmSync(root,{recursive:true,force:true});
  }
});
