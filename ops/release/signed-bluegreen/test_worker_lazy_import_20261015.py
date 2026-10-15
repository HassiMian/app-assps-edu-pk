#!/usr/bin/env python3
"""Signed global queue worker must not eagerly import broad tenant DB config.

Uses Node's module loader mock. No network, credentials or production DB access.
"""
import os
import subprocess
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[3]
CODE = r"""
const Module=require('module');
const original=Module._load;
let legacyLoads=0;
Module._load=function(request,parent,isMain){
 if(request==='pg')return {Pool:class MockPool{}};
 if(request==='../../config/database' &&
    parent && parent.filename.endsWith('/aiQueueWorkerDatabase.js')){
   legacyLoads++; return {query:async()=>({rows:[{legacy:true}]})};
 }
 return original.apply(this,arguments);
};
const mode=process.argv[1];
process.env.DB_SIGNED_TENANT_RLS_ENABLED=(mode==='green'?'true':'false');
for(const k of Object.keys(process.env))if(k.startsWith('DB_AI_WORKER_'))delete process.env[k];
const moduleUnderTest=require('./src/services/ai/aiQueueWorkerDatabase');
if(legacyLoads!==0)throw Error('EAGER_LEGACY_POOL_LOAD');
(async()=>{
 if(mode==='green'){
   let failClosed=false;
   try {await moduleUnderTest.query('SELECT 1');}
   catch(e){failClosed=e.message==='AI_QUEUE_WORKER_SEPARATE_IDENTITY_REQUIRED';}
   if(!failClosed||legacyLoads!==0)throw Error('GREEN_DEPENDENCY_NOT_ISOLATED');
 } else {
   const x=await moduleUnderTest.query('SELECT 1');
   if(legacyLoads!==1||!x.rows[0].legacy)throw Error('BLUE_LEGACY_REGRESSION');
 }
 console.log('PASS '+mode);
})().catch(e=>{console.error(e.message);process.exit(1)});
"""

class WorkerImportIsolation(unittest.TestCase):
    def test_signed_green_does_not_boot_legacy_pool(self):
        self.run_mode('green')

    def test_blue_still_delegates_to_legacy_pool(self):
        self.run_mode('blue')

    def run_mode(self, mode):
        env = {'PATH': os.environ.get('PATH', '/usr/bin:/bin')}
        outcome=subprocess.run(
            ['node', '-e', CODE, mode], cwd=ROOT/'al-siddique-backend',
            env=env, capture_output=True, text=True, timeout=12,
            check=False)
        self.assertEqual(outcome.returncode, 0,
                         outcome.stdout+'\n'+outcome.stderr)
        self.assertIn('PASS '+mode, outcome.stdout)

if __name__=='__main__':
    unittest.main()
